const Document = require('../models/Document');
const User = require('../models/User');
const SystemStorage = require('../models/SystemStorage');
const SystemLock = require('../models/SystemLock');
const s3Service = require('./s3Service');
const { runWithOptionalTransaction } = require('../utils/dbTransaction');

const GRACE_PERIOD_MS = 2 * 60 * 1000; // 2-minute buffer past expiry/verifying lease

function safeSubtract(field, amount) {
  return [{ $set: { [field]: { $max: [0, { $subtract: [`$${field}`, amount] }] } } }];
}

function pipelineOpts(session) {
  return { updatePipeline: true, ...(session ? { session } : {}) };
}

/**
 * Cleans up:
 * 1. Expired RESERVED uploads (past 2-min grace period) and stale VERIFYING uploads
 * 2. CLEANUP_PENDING documents whose previous S3 delete failed
 * 3. PURGING documents whose MongoDB deletion failed after S3 delete
 */
async function cleanupExpiredReservations() {
  const cutoff = new Date(Date.now() - GRACE_PERIOD_MS);

  const staleDocs = await Document.find({
    $or: [
      { status: 'RESERVED', expiresAt: { $ne: null, $lt: cutoff } },
      { status: 'VERIFYING', verifyingAt: { $ne: null, $lt: cutoff } },
      { status: 'CLEANUP_PENDING' },
    ],
  }).select('_id userId fileSize s3ObjectKey status');

  let cleanedCount = 0;

  for (const doc of staleDocs) {
    const claimed = await Document.findOneAndUpdate(
      { _id: doc._id, status: doc.status },
      { $set: { status: 'CLEANUP_PENDING', expiresAt: null, verifyingAt: null } },
      { returnDocument: 'after' }
    );

    if (!claimed) continue;

    // Best-effort S3 delete; only mark FAILED & release reservedBytes if S3 cleanup succeeds
    // or if the object does not exist in S3.
    let s3Removed = false;
    try {
      await s3Service.deleteS3Object(claimed.s3ObjectKey);
      s3Removed = true;
    } catch {
      s3Removed = false;
    }

    if (!s3Removed) {
      // Keep as CLEANUP_PENDING so next sweep retries S3 delete without losing track
      continue;
    }

    await runWithOptionalTransaction(async (session) => {
      const opts = session ? { session } : {};
      const finalized = await Document.findOneAndUpdate(
        { _id: claimed._id, status: 'CLEANUP_PENDING' },
        { $set: { status: 'FAILED' } },
        { returnDocument: 'after', ...opts }
      );
      if (finalized) {
        await User.updateOne({ _id: claimed.userId }, safeSubtract('reservedBytes', claimed.fileSize), pipelineOpts(session));
        await SystemStorage.updateOne({ _id: 'global' }, safeSubtract('reservedBytes', claimed.fileSize), pipelineOpts(session));
      }
    });

    cleanedCount += 1;
  }

  // Retry any stale PURGING documents (e.g., S3 deleted, DB failed or server crashed mid-purge)
  const purgingDocs = await Document.find({
    status: 'PURGING',
    $or: [{ purgingAt: null }, { purgingAt: { $lt: cutoff } }],
  }).select('_id userId fileSize s3ObjectKey purgingAt');

  for (const pDoc of purgingDocs) {
    const claimedPurge = await Document.findOneAndUpdate(
      {
        _id: pDoc._id,
        status: 'PURGING',
        $or: [{ purgingAt: null }, { purgingAt: { $lt: cutoff } }],
      },
      { $set: { purgingAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!claimedPurge) continue;

    try {
      await s3Service.deleteS3Object(claimedPurge.s3ObjectKey);
    } catch {
      await Document.updateOne(
        { _id: claimedPurge._id, status: 'PURGING', purgingAt: claimedPurge.purgingAt },
        { $set: { purgingAt: null } }
      ).catch(() => {});
      continue; // Retry on next sweep
    }

    await runWithOptionalTransaction(async (session) => {
      const opts = session ? { session } : {};
      const deleted = await Document.findOneAndDelete(
        { _id: claimedPurge._id, status: 'PURGING', purgingAt: claimedPurge.purgingAt },
        opts
      );
      if (!deleted) return;
      await User.updateOne({ _id: deleted.userId }, safeSubtract('storageUsedBytes', deleted.fileSize), pipelineOpts(session));
      await SystemStorage.updateOne({ _id: 'global' }, safeSubtract('storageUsedBytes', deleted.fileSize), pipelineOpts(session));
    });

    cleanedCount += 1;
  }

  return cleanedCount;
}

/**
 * Acquires a distributed lock and reconciles User and SystemStorage counters
 * from actual Document records.
 * - Personal storageUsedBytes: all COMPLETED + PURGING (including trashed docs until permanently purged)
 * - Global storageUsedBytes: all COMPLETED + PURGING (still occupying S3 until purge finishes)
 * - Reserved bytes: RESERVED, VERIFYING, or CLEANUP_PENDING
 */
async function reconcileAllStorage() {
  const lock = await SystemLock.acquireLock('reconcile_storage', 30000);
  if (!lock) {
    return { skipped: true, reason: 'Reconciliation lock held by another instance.' };
  }

  try {
    await SystemStorage.getOrInitGlobal();

    const [personalUsedAgg, reservedAgg, globalUsedAgg] = await Promise.all([
      Document.aggregate([
        { $match: { status: { $in: ['COMPLETED', 'PURGING'] } } },
        { $group: { _id: '$userId', totalBytes: { $sum: '$fileSize' } } },
      ]),
      Document.aggregate([
        { $match: { status: { $in: ['RESERVED', 'VERIFYING', 'CLEANUP_PENDING'] } } },
        { $group: { _id: '$userId', totalBytes: { $sum: '$fileSize' } } },
      ]),
      Document.aggregate([
        { $match: { status: { $in: ['COMPLETED', 'PURGING'] } } },
        { $group: { _id: null, totalBytes: { $sum: '$fileSize' } } },
      ]),
    ]);

    const usedByUser = new Map(personalUsedAgg.map((r) => [String(r._id), r.totalBytes]));
    const reservedByUser = new Map(reservedAgg.map((r) => [String(r._id), r.totalBytes]));

    const users = await User.find({}).select('_id');
    const bulkOps = users.map((u) => ({
      updateOne: {
        filter: { _id: u._id },
        update: {
          $set: {
            storageUsedBytes: usedByUser.get(String(u._id)) || 0,
            reservedBytes: reservedByUser.get(String(u._id)) || 0,
          },
        },
      },
    }));

    if (bulkOps.length > 0) {
      await User.bulkWrite(bulkOps);
    }

    const globalUsedBytes = globalUsedAgg[0]?.totalBytes || 0;
    const globalReservedBytes = reservedAgg.reduce((sum, r) => sum + r.totalBytes, 0);

    await SystemStorage.updateOne(
      { _id: 'global' },
      {
        $set: {
          storageUsedBytes: globalUsedBytes,
          reservedBytes: globalReservedBytes,
        },
      }
    );

    return {
      skipped: false,
      usersReconciled: bulkOps.length,
      globalUsedBytes,
      globalReservedBytes,
    };
  } finally {
    await SystemLock.releaseLock('reconcile_storage', lock.ownerId).catch(() => {});
  }
}

module.exports = {
  cleanupExpiredReservations,
  reconcileAllStorage,
};
