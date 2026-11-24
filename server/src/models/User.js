const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
    },
    studentId: {
      type: String,
      trim: true,
      default: '',
    },
    department: {
      type: String,
      default: 'Computer Science & Engineering',
    },
    semester: {
      type: String,
      default: 'Semester 6',
    },
    role: {
      type: String,
      enum: ['Student', 'Administrator'],
      default: 'Student',
    },
    storageQuotaBytes: {
      type: Number,
      default: 10737418240, // 10 GB
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
    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving if modified (Mongoose 9 async hook - no next callback)
userSchema.pre('save', async function () {
  if (!this.isModified('passwordHash')) return;
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

// Compare plaintext password with hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Safe profile view omitting sensitive fields
userSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    fullName: this.fullName,
    email: this.email,
    studentId: this.studentId,
    department: this.department,
    semester: this.semester,
    role: this.role,
    storageQuotaBytes: this.storageQuotaBytes,
    storageUsedBytes: this.storageUsedBytes,
    reservedBytes: this.reservedBytes,
    storagePercentage: Number(
      ((this.storageUsedBytes / this.storageQuotaBytes) * 100).toFixed(2)
    ),
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
