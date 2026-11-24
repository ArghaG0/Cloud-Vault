const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    color: {
      type: String,
      default: '#10B981',
    },
    icon: {
      type: String,
      default: 'folder',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null indicates global system default category
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.index({ userId: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
