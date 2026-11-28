const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    originalFilename: {
      type: String,
      required: true,
      trim: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'Lecture Notes',
        'Assignments',
        'Question Papers',
        'Project Reports',
        'Study Materials',
        'Other Documents',
      ],
      default: 'Other Documents',
      index: true,
    },
    s3ObjectKey: {
      type: String,
      required: true,
      unique: true,
    },
    fileSize: {
      type: Number,
      required: true,
      min: 0,
    },
    mimeType: {
      type: String,
      required: true,
    },
    extension: {
      type: String,
      required: true,
      lowercase: true,
    },
    sha256Checksum: {
      type: String,
      default: '',
    },
    s3Status: {
      type: String,
      enum: ['synced', 'pending', 'failed'],
      default: 'synced',
    },
    status: {
      type: String,
      enum: [
        'RESERVED',
        'VERIFYING',
        'UPLOADED',
        'VERIFIED',
        'COMPLETED',
        'FAILED',
        'PURGING',
        'CLEANUP_PENDING',
      ],
      default: 'RESERVED',
      index: true,
    },
    verifyingAt: {
      type: Date,
      default: null,
    },
    purgingAt: {
      type: Date,
      default: null,
    },
    wasTrashBeforePurge: {
      type: Boolean,
      default: false,
    },
    kmsEncrypted: {
      type: Boolean,
      default: true,
    },
    versionCount: {
      type: Number,
      default: 1,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    isTrash: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null, // Used for 15-minute reservation TTL
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for high-frequency queries
documentSchema.index({ userId: 1, isTrash: 1, category: 1 });
documentSchema.index({ userId: 1, isTrash: 1, createdAt: -1 });
documentSchema.index({ displayName: 'text', originalFilename: 'text', tags: 'text' });

module.exports = mongoose.model('Document', documentSchema);
