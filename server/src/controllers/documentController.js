const Document = require('../models/Document');
const User = require('../models/User');
const SystemStorage = require('../models/SystemStorage');
const Activity = require('../models/Activity');
const s3Service = require('../services/s3Service');
const { runWithOptionalTransaction } = require('../utils/dbTransaction');

const { PER_ACCOUNT_MAX_BYTES } = SystemStorage;
const MAX_SINGLE_FILE_BYTES = 50 * 1024 * 1024; // 50 MB per single file

// Helper to clamp decrements safely at >= 0 (Mongoose 9 requires updatePipeline: true)
function safeSubtract(field, amount) {
  return [{ $set: { [field]: { $max: [0, { $subtract: [`$${field}`, amount] }] } } }];
}

function pipelineOpts(session) {
  return { updatePipeline: true, ...(session ? { session } : {}) };
}

// POST /api/documents/upload-url (Step 1: Global + Personal atomic quota reservation + Presigned URL)
exports.requestUploadUrl = async (req, res) => {
  try {
    const { filename, category, mimeType, fileSize } = req.body;
    const userId = req.user._id;

    if (!filename || !fileSize) {
      return res.status(400).json({
        success: false,
        error: 'Filename and file size are required to request an upload URL.',
      });
    }

    const numBytes = Number(fileSize);
    if (isNaN(numBytes) || numBytes <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid file size specified.' });
    }

    if (numBytes > MAX_SINGLE_FILE_BYTES) {
      return res.status(400).json({
        success: false,
        error: 'File size exceeds the 50 MB per-file limit.',
        code: 'FILE_TOO_LARGE',
      });
    }

    const docCategory = category || 'Other Documents';
    const extension = filename.split('.').pop().toLowerCase();

    // Generate presigned S3 PUT URL (validates extension/size locally without network I/O)
    const uploadDetails = await s3Service.generatePresignedUploadUrl(
      userId.toString(),
      docCategory,
      filename,
      mimeType,
      numBytes
    );

    const reservedDoc = await runWithOptionalTransaction(async (session) => {
      const opts = session ? { session } : {};
      await SystemStorage.getOrInitGlobal(session);

      // 1. Atomic Global 5 GB Cap Reservation
      const globalCounter = await SystemStorage.findOneAndUpdate(
        {
          _id: 'global',
          $expr: {
            $lte: [
              { $add: ['$storageUsedBytes', '$reservedBytes', numBytes] },
              '$storageQuotaBytes',
            ],
          },
        },
        { $inc: { reservedBytes: numBytes } },
        { returnDocument: 'after', ...opts }
      );

      if (!globalCounter) {
        const err = new Error(
          'Global cloud storage capacity (5 GB) has run out. No further uploads are allowed.'
        );
        err.status = 403;
        err.code = 'GLOBAL_STORAGE_FULL';
        throw err;
      }

      // 2. Atomic Personal 200 MB Cap Reservation
      const user = await User.findById(userId).session(session || null);
      const rawQuota = user?.storageQuotaBytes ?? PER_ACCOUNT_MAX_BYTES;
      const effectiveQuota = Math.min(rawQuota, PER_ACCOUNT_MAX_BYTES);

      const updatedUser = await User.findOneAndUpdate(
        {
          _id: userId,
          $expr: {
            $lte: [
              { $add: ['$storageUsedBytes', '$reservedBytes', numBytes] },
              effectiveQuota,
            ],
          },
        },
        { $inc: { reservedBytes: numBytes } },
        { returnDocument: 'after', ...opts }
      );

      if (!updatedUser) {
        if (!session) {
          await SystemStorage.updateOne(
            { _id: 'global' },
            safeSubtract('reservedBytes', numBytes),
            pipelineOpts(null)
          );
        }
        const err = new Error(
          'Personal storage quota exceeded (200 MB limit). Please delete files before uploading.'
        );
        err.status = 403;
        err.code = 'QUOTA_EXCEEDED';
        throw err;
      }

      // 3. Create RESERVED document record (15-minute TTL)
      try {
        const [created] = await Document.create(
          [
            {
              userId,
              originalFilename: filename,
              displayName: filename,
              category: docCategory,
              s3ObjectKey: uploadDetails.s3ObjectKey,
              fileSize: numBytes,
              mimeType: mimeType || 'application/octet-stream',
              extension,
              status: 'RESERVED',
              expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            },
          ],
          opts
        );
        return created;
      } catch (createErr) {
        if (!session) {
          await Promise.all([
            User.updateOne({ _id: userId }, safeSubtract('reservedBytes', numBytes), pipelineOpts(null)),
            SystemStorage.updateOne({ _id: 'global' }, safeSubtract('reservedBytes', numBytes), pipelineOpts(null)),
          ]);
        }
        throw createErr;
      }
    });

    res.json({
      success: true,
      data: {
        uploadUrl: uploadDetails.uploadUrl,
        s3ObjectKey: uploadDetails.s3ObjectKey,
        documentId: reservedDoc._id,
        expiresInSeconds: uploadDetails.expiresInSeconds,
        isSimulated: uploadDetails.isSimulated,
      },
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
      ...(error.code ? { code: error.code } : {}),
    });
  }
};

// POST /api/documents/finalize (Step 2: S3 HeadObject verification + idempotent DB commit)
exports.finalizeUpload = async (req, res) => {
  try {
    const { documentId, displayName, category, sha256Checksum, tags } = req.body;
    const userId = req.user._id;

    const existing = await Document.findOne({ _id: documentId, userId });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Upload reservation not found.' });
    }

    // Idempotent return if already finalized
    if (existing.status === 'COMPLETED') {
      return res.json({ success: true, data: existing });
    }

    if (existing.status === 'FAILED') {
      return res.status(400).json({
        success: false,
        error: 'Upload reservation has expired or already failed.',
      });
    }

    // Atomically claim RESERVED (or stale VERIFYING > 60s) -> VERIFYING
    const staleThreshold = new Date(Date.now() - 60 * 1000);
    const claimed = await Document.findOneAndUpdate(
      {
        _id: documentId,
        userId,
        $or: [
          { status: 'RESERVED' },
          { status: 'VERIFYING', verifyingAt: { $lt: staleThreshold } },
        ],
      },
      { $set: { status: 'VERIFYING', verifyingAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!claimed) {
      const latest = await Document.findOne({ _id: documentId, userId });
      if (latest?.status === 'COMPLETED') {
        return res.json({ success: true, data: latest });
      }
      return res.status(409).json({
        success: false,
        error: 'Upload is currently being verified or has already failed.',
      });
    }

    // Verify presence and size on S3 via HeadObject (outside DB transaction)
    let verification;
    try {
      verification = await s3Service.verifyUploadedObject(claimed.s3ObjectKey, claimed.fileSize);
    } catch (err) {
      // Verification failed — release both personal and global reservations
      await runWithOptionalTransaction(async (session) => {
        const opts = session ? { session } : {};
        const failedDoc = await Document.findOneAndUpdate(
          { _id: claimed._id, status: 'VERIFYING' },
          { $set: { status: 'FAILED', expiresAt: null, verifyingAt: null } },
          { returnDocument: 'after', ...opts }
        );
        if (failedDoc) {
          await User.updateOne({ _id: userId }, safeSubtract('reservedBytes', claimed.fileSize), pipelineOpts(session));
          await SystemStorage.updateOne({ _id: 'global' }, safeSubtract('reservedBytes', claimed.fileSize), pipelineOpts(session));
        }
      });

      return res.status(400).json({
        success: false,
        error: `Cloud verification failed: ${err.message}`,
      });
    }

    const reservedSize = claimed.fileSize;
    const actualSize = verification.actualSizeBytes ?? reservedSize;

    // Prevent quota bypass via mismatched S3 PUT size
    if (actualSize > MAX_SINGLE_FILE_BYTES || actualSize > reservedSize) {
      let s3Cleaned = false;
      try {
        await s3Service.deleteS3Object(claimed.s3ObjectKey);
        s3Cleaned = true;
      } catch {
        // Will be retried by cleanup sweep if marked CLEANUP_PENDING
      }

      await runWithOptionalTransaction(async (session) => {
        const opts = session ? { session } : {};
        await Document.findOneAndUpdate(
          { _id: claimed._id, status: 'VERIFYING' },
          {
            $set: {
              status: s3Cleaned ? 'FAILED' : 'CLEANUP_PENDING',
              expiresAt: null,
              verifyingAt: null,
            },
          },
          opts
        );
        if (s3Cleaned) {
          await User.updateOne({ _id: userId }, safeSubtract('reservedBytes', reservedSize), pipelineOpts(session));
          await SystemStorage.updateOne({ _id: 'global' }, safeSubtract('reservedBytes', reservedSize), pipelineOpts(session));
        }
      });

      return res.status(400).json({
        success: false,
        error: `Uploaded file size (${actualSize} bytes) exceeds reserved quota (${reservedSize} bytes).`,
        code: 'SIZE_MISMATCH',
      });
    }

    const finalizedDoc = await runWithOptionalTransaction(async (session) => {
      const opts = session ? { session } : {};
      await SystemStorage.getOrInitGlobal(session);

      const updateFields = {
        displayName: displayName || claimed.displayName,
        fileSize: actualSize,
        status: 'COMPLETED',
        s3Status: 'synced',
        kmsEncrypted: true,
        sha256Checksum: sha256Checksum || '',
        expiresAt: null,
        verifyingAt: null,
      };
      if (category) updateFields.category = category;
      if (tags && Array.isArray(tags)) updateFields.tags = tags;

      const updated = await Document.findOneAndUpdate(
        { _id: claimed._id, status: 'VERIFYING' },
        { $set: updateFields },
        { returnDocument: 'after', ...opts }
      );

      if (!updated) return null;

      await User.updateOne(
        { _id: userId },
        [
          {
            $set: {
              reservedBytes: { $max: [0, { $subtract: ['$reservedBytes', reservedSize] }] },
              storageUsedBytes: { $add: ['$storageUsedBytes', actualSize] },
            },
          },
        ],
        pipelineOpts(session)
      );

      await SystemStorage.updateOne(
        { _id: 'global' },
        [
          {
            $set: {
              reservedBytes: { $max: [0, { $subtract: ['$reservedBytes', reservedSize] }] },
              storageUsedBytes: { $add: ['$storageUsedBytes', actualSize] },
            },
          },
        ],
        pipelineOpts(session)
      );

      await Activity.create(
        [
          {
            userId,
            action: 'UPLOAD',
            documentId: updated._id,
            documentName: updated.displayName,
            details: `Uploaded ${updated.displayName} (${(actualSize / (1024 * 1024)).toFixed(1)} MB) to ${updated.category}`,
            ipAddress: req.ip || '',
          },
        ],
        opts
      );

      return updated;
    });

    if (!finalizedDoc) {
      return res.status(409).json({
        success: false,
        error: 'Upload finalization conflicted with another request.',
      });
    }

    res.status(201).json({
      success: true,
      data: finalizedDoc,
      message: 'Document uploaded and verified in cloud storage successfully.',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/documents/abort-upload (Idempotent rollback of personal & global reservations)
exports.abortUpload = async (req, res) => {
  try {
    const { documentId } = req.body;
    const userId = req.user._id;

    await runWithOptionalTransaction(async (session) => {
      const opts = session ? { session } : {};
      const abortedDoc = await Document.findOneAndUpdate(
        { _id: documentId, userId, status: 'RESERVED' },
        { $set: { status: 'FAILED', expiresAt: null } },
        { returnDocument: 'after', ...opts }
      );

      if (abortedDoc) {
        await User.updateOne({ _id: userId }, safeSubtract('reservedBytes', abortedDoc.fileSize), pipelineOpts(session));
        await SystemStorage.updateOne({ _id: 'global' }, safeSubtract('reservedBytes', abortedDoc.fileSize), pipelineOpts(session));
      }
    });

    res.json({ success: true, message: 'Upload aborted and reserved quota released.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/documents (Paginated search and category filtering)
exports.getDocuments = async (req, res) => {
  try {
    const { q, category, extension, s3Status, sortBy = '-createdAt', page = 1, limit = 10, isTrash = 'false' } = req.query;

    const filter = {
      userId: req.user._id,
      isTrash: isTrash === 'true',
      status: 'COMPLETED',
    };

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (extension && extension !== 'all') {
      filter.extension = extension.toLowerCase();
    }

    if (s3Status) {
      filter.s3Status = s3Status;
    }

    if (q && q.trim()) {
      const term = q.trim();
      filter.$or = [
        { displayName: { $regex: term, $options: 'i' } },
        { originalFilename: { $regex: term, $options: 'i' } },
        { tags: { $regex: term, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [documents, total] = await Promise.all([
      Document.find(filter).sort(sortBy).skip(skip).limit(limitNum),
      Document.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: documents,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
        hasNextPage: skip + documents.length < total,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/documents/:id (Fetch single document)
exports.getDocumentById = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found.' });
    }
    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/documents/:id/download-url (Presigned download URL)
exports.getDownloadUrl = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found.' });
    }

    const downloadDetails = await s3Service.generatePresignedDownloadUrl(
      doc.s3ObjectKey,
      doc.originalFilename
    );

    await Activity.create({
      userId: req.user._id,
      action: 'DOWNLOAD',
      documentId: doc._id,
      documentName: doc.displayName,
      details: `Retrieved download link for ${doc.displayName}`,
      ipAddress: req.ip || '',
    });

    res.json({
      success: true,
      data: {
        downloadUrl: downloadDetails.downloadUrl,
        expiresInSeconds: downloadDetails.expiresInSeconds,
        isSimulated: downloadDetails.isSimulated,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/documents/:id/preview-url (Presigned inline preview URL)
exports.getPreviewUrl = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found.' });
    }

    const previewDetails = await s3Service.generatePresignedPreviewUrl(
      doc.s3ObjectKey,
      doc.mimeType
    );

    res.json({
      success: true,
      data: {
        previewUrl: previewDetails.previewUrl,
        expiresInSeconds: previewDetails.expiresInSeconds,
        isSimulated: previewDetails.isSimulated,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// PATCH /api/documents/:id (Rename display name, change category, update tags)
exports.updateDocument = async (req, res) => {
  try {
    const { displayName, category, tags } = req.body;
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found.' });
    }

    let action = 'RENAME';
    let details = `Renamed to ${displayName}`;

    if (category && category !== doc.category) {
      action = 'RECATEGORIZE';
      details = `Moved from ${doc.category} to ${category}`;
      doc.category = category;
    }

    if (displayName) doc.displayName = displayName;
    if (tags && Array.isArray(tags)) doc.tags = tags;
    doc.lastModified = new Date();

    await doc.save();

    await Activity.create({
      userId: req.user._id,
      action,
      documentId: doc._id,
      documentName: doc.displayName,
      details,
      ipAddress: req.ip || '',
    });

    res.json({ success: true, data: doc, message: 'Document updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// DELETE /api/documents/:id (Soft delete: frees personal quota; global S3 usage remains until purge)
exports.deleteDocument = async (req, res) => {
  try {
    const userId = req.user._id;
    const existing = await Document.findOne({ _id: req.params.id, userId });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Document not found.' });
    }

    if (existing.isTrash) {
      return res.json({ success: true, message: 'Document is already in trash.' });
    }

    await runWithOptionalTransaction(async (session) => {
      const opts = session ? { session } : {};
      const trashed = await Document.findOneAndUpdate(
        { _id: req.params.id, userId, isTrash: false, status: 'COMPLETED' },
        { $set: { isTrash: true, deletedAt: new Date() } },
        { returnDocument: 'after', ...opts }
      );

      if (trashed) {
        await User.updateOne({ _id: userId }, safeSubtract('storageUsedBytes', trashed.fileSize), pipelineOpts(session));
        await Activity.create(
          [
            {
              userId,
              action: 'DELETE',
              documentId: trashed._id,
              documentName: trashed.displayName,
              details: `Moved ${trashed.displayName} to Trash`,
              ipAddress: req.ip || '',
            },
          ],
          opts
        );
      }
    });

    res.json({ success: true, message: 'Document moved to trash successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// DELETE /api/documents/:id/purge (Permanent purge from S3 and MongoDB — reclaims global S3 capacity)
exports.purgeDocument = async (req, res) => {
  try {
    const userId = req.user._id;
    const existing = await Document.findOne({ _id: req.params.id, userId });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Document not found.' });
    }

    const wasCompleted = existing.status === 'COMPLETED';
    const wasReserved = existing.status === 'RESERVED' || existing.status === 'VERIFYING';

    // Atomically mark PURGING before S3 deletion so partial failures are recoverable
    const purgingDoc = await Document.findOneAndUpdate(
      { _id: existing._id, userId, status: { $ne: 'PURGING' } },
      { $set: { status: 'PURGING', wasTrashBeforePurge: existing.isTrash } },
      { returnDocument: 'after' }
    );

    if (!purgingDoc && existing.status !== 'PURGING') {
      return res.status(409).json({ success: false, error: 'Document purge is already in progress.' });
    }

    const targetDoc = purgingDoc || existing;

    // Delete physical file from Amazon S3 first; only reclaim global capacity if S3 delete succeeds
    await s3Service.deleteS3Object(targetDoc.s3ObjectKey);

    await runWithOptionalTransaction(async (session) => {
      const opts = session ? { session } : {};
      const deletedDoc = await Document.findOneAndDelete({ _id: targetDoc._id, userId }, opts);
      if (!deletedDoc) return;

      if (wasCompleted || deletedDoc.status === 'PURGING') {
        if (!deletedDoc.wasTrashBeforePurge) {
          await User.updateOne({ _id: userId }, safeSubtract('storageUsedBytes', deletedDoc.fileSize), pipelineOpts(session));
        }
        await SystemStorage.updateOne({ _id: 'global' }, safeSubtract('storageUsedBytes', deletedDoc.fileSize), pipelineOpts(session));
      } else if (wasReserved) {
        await User.updateOne({ _id: userId }, safeSubtract('reservedBytes', deletedDoc.fileSize), pipelineOpts(session));
        await SystemStorage.updateOne({ _id: 'global' }, safeSubtract('reservedBytes', deletedDoc.fileSize), pipelineOpts(session));
      }
    });

    res.json({ success: true, message: 'Document permanently deleted from cloud storage.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/documents/batch-delete (Batch soft deletion — frees personal quota; global S3 remains until purge)
exports.batchDelete = async (req, res) => {
  try {
    const { documentIds } = req.body;
    const userId = req.user._id;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Document IDs array is required.' });
    }

    let freedBytes = 0;
    let count = 0;

    await runWithOptionalTransaction(async (session) => {
      const docs = await Document.find({
        _id: { $in: documentIds },
        userId,
        isTrash: false,
        status: 'COMPLETED',
      }).session(session || null);

      if (docs.length === 0) return;

      const matchedIds = docs.map((d) => d._id);
      freedBytes = docs.reduce((acc, d) => acc + d.fileSize, 0);
      count = docs.length;

      const opts = session ? { session } : {};
      await Document.updateMany(
        { _id: { $in: matchedIds }, userId, isTrash: false },
        { $set: { isTrash: true, deletedAt: new Date() } },
        opts
      );
      await User.updateOne({ _id: userId }, safeSubtract('storageUsedBytes', freedBytes), pipelineOpts(session));
    });

    res.json({
      success: true,
      message: `${count} documents moved to trash.`,
      freedBytes,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/documents/batch-move (Batch category reassignment)
exports.batchMove = async (req, res) => {
  try {
    const { documentIds, targetCategory } = req.body;
    if (!Array.isArray(documentIds) || !targetCategory) {
      return res.status(400).json({ success: false, error: 'Document IDs and target category are required.' });
    }

    await Document.updateMany(
      { _id: { $in: documentIds }, userId: req.user._id },
      { $set: { category: targetCategory, lastModified: new Date() } }
    );

    res.json({ success: true, message: `${documentIds.length} documents moved to ${targetCategory}.` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
