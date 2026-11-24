const jwt = require('jsonwebtoken');
const User = require('../models/User');

const COOKIE_NAME = 'cloudvault_token';

/**
 * Authentication middleware verifying JWT from HttpOnly cookie or Bearer header.
 */
async function protect(req, res, next) {
  try {
    let token = null;

    // 1. Check HttpOnly cookie
    if (req.cookies && req.cookies[COOKIE_NAME]) {
      token = req.cookies[COOKIE_NAME];
    }
    // 2. Fallback to Authorization: Bearer header
    else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token || typeof token !== 'string' || token.trim() === '') {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Access token missing. Please log in first via POST /api/auth/login or POST /api/auth/register.',
        code: 'AUTH_REQUIRED',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_for_local_dev');

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User account not found.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Session expired. Please log in again.',
        code: 'TOKEN_EXPIRED',
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid token signature.',
    });
  }
}

/**
 * Role-based authorization middleware.
 */
function restrictTo(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have permission to perform this action.',
      });
    }
    next();
  };
}

/**
 * Sets the secure HttpOnly authentication cookie.
 */
function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction, // HTTPS in production
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

/**
 * Clears the authentication cookie.
 */
function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
}

module.exports = {
  protect,
  restrictTo,
  setAuthCookie,
  clearAuthCookie,
};
