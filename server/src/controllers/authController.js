const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { setAuthCookie, clearAuthCookie } = require('../middleware/auth');

function generateToken(userId) {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'fallback_secret_for_local_dev',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// In-memory password reset token cache for simplicity
const resetTokenCache = new Map();

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { fullName, email, password, studentId, department, semester } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide full name, institutional email, and password.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long.',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'An account with this institutional email is already registered.',
      });
    }

    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      passwordHash: password, // Will be hashed by pre-save hook
      studentId: studentId || '',
      department: department || 'Computer Science & Engineering',
      semester: semester || 'Semester 6',
      role: 'Student', // Prevent self-elevation to Administrator
    });

    const token = generateToken(user._id);
    setAuthCookie(res, token);

    await Activity.create({
      userId: user._id,
      action: 'LOGIN',
      details: 'Account registered and first session initialized.',
      ipAddress: req.ip || '',
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: user.toSafeObject(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both institutional email and passcode.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password credentials.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password credentials.',
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);
    setAuthCookie(res, token);

    await Activity.create({
      userId: user._id,
      action: 'LOGIN',
      details: 'Logged in successfully via institutional credentials.',
      ipAddress: req.ip || '',
    });

    res.json({
      success: true,
      data: {
        token,
        user: user.toSafeObject(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/auth/logout
exports.logout = (req, res) => {
  clearAuthCookie(res);
  res.json({
    success: true,
    message: 'Logged out successfully.',
  });
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({
    success: true,
    data: req.user.toSafeObject(),
  });
};

// PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, department, semester, studentId } = req.body;
    const user = req.user;

    if (fullName) user.fullName = fullName;
    if (department) user.department = department;
    if (semester) user.semester = semester;
    if (studentId !== undefined) user.studentId = studentId;

    await user.save();

    res.json({
      success: true,
      data: user.toSafeObject(),
      message: 'Student academic profile updated successfully.',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// PUT /api/auth/password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Please provide current and new passwords.',
      });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: 'Current password provided is incorrect.',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters long.',
      });
    }

    user.passwordHash = newPassword; // Pre-save hook will hash it
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email address is required.' });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  // Always respond with success to prevent user enumeration
  if (user) {
    const resetToken = crypto.randomBytes(24).toString('hex');
    resetTokenCache.set(resetToken, {
      userId: user._id,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins
    });
    console.log(`[Password Reset] Reset token generated for ${user.email}: ${resetToken}`);
  }

  res.json({
    success: true,
    message: 'If an account matches this email, a recovery reset token has been dispatched.',
  });
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) {
    return res.status(400).json({ success: false, error: 'Reset token and new password are required.' });
  }

  const session = resetTokenCache.get(resetToken);
  if (!session || session.expiresAt < Date.now()) {
    resetTokenCache.delete(resetToken);
    return res.status(400).json({ success: false, error: 'Reset token is invalid or has expired.' });
  }

  const user = await User.findById(session.userId);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }

  user.passwordHash = newPassword;
  await user.save();
  resetTokenCache.delete(resetToken);

  res.json({
    success: true,
    message: 'Password reset successfully. Please log in with your new password.',
  });
};
