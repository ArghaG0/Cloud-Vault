const mongoose = require('mongoose');

/**
 * Middleware to check if MongoDB is connected before attempting queries.
 * Prevents requests from freezing for 10,000ms in Mongoose buffer queue.
 */
function checkDbConnection(req, res, next) {
  // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      error: 'Database unavailable: MongoDB is not connected. Please verify database connection or network connectivity.',
      code: 'DATABASE_DISCONNECTED',
    });
  }
  next();
}

module.exports = checkDbConnection;
