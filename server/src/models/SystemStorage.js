const mongoose = require('mongoose');

const PER_ACCOUNT_MAX_BYTES = 200 * 1024 * 1024; // 200 MB per account
const GLOBAL_BUCKET_MAX_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB across all users

const systemStorageSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: 'global',
    },
    storageUsedBytes: {
      type: Number,
      default: 0,
      min: 0,
    },
    reservedBytes: {
      type: Number,
      default: 0,
      min: 0,
    },
    storageQuotaBytes: {
      type: Number,
      default: GLOBAL_BUCKET_MAX_BYTES,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Ensures the singleton global storage counter document exists and returns it.
 */
systemStorageSchema.statics.getOrInitGlobal = async function (session = null) {
  return this.findOneAndUpdate(
    { _id: 'global' },
    {
      $setOnInsert: {
        _id: 'global',
        storageUsedBytes: 0,
        reservedBytes: 0,
        storageQuotaBytes: GLOBAL_BUCKET_MAX_BYTES,
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
      ...(session ? { session } : {}),
    }
  );
};

const SystemStorage = mongoose.model('SystemStorage', systemStorageSchema);

module.exports = SystemStorage;
module.exports.PER_ACCOUNT_MAX_BYTES = PER_ACCOUNT_MAX_BYTES;
module.exports.GLOBAL_BUCKET_MAX_BYTES = GLOBAL_BUCKET_MAX_BYTES;
