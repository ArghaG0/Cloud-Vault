const mongoose = require('mongoose');
const crypto = require('crypto');

const systemLockSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  lockedUntil: { type: Date, default: null },
  ownerId: { type: String, default: '' },
});

/**
 * Attempts to acquire a distributed lease lock in MongoDB.
 * Returns the lock document if acquired, or null if held by another instance.
 */
systemLockSchema.statics.acquireLock = async function (lockId, ttlMs = 30000) {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + ttlMs);
  const ownerId = crypto.randomBytes(8).toString('hex');

  try {
    return await this.findOneAndUpdate(
      {
        _id: lockId,
        $or: [{ lockedUntil: { $lt: now } }, { lockedUntil: null }],
      },
      { $set: { lockedUntil, ownerId } },
      { upsert: true, returnDocument: 'after' }
    );
  } catch (err) {
    if (err.code === 11000) return null; // Lost upsert race to another instance
    throw err;
  }
};

systemLockSchema.statics.releaseLock = async function (lockId, ownerId) {
  await this.updateOne(
    { _id: lockId, ownerId },
    { $set: { lockedUntil: null, ownerId: '' } }
  );
};

module.exports = mongoose.model('SystemLock', systemLockSchema);
