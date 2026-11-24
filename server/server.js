const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const connectDB = require('./src/config/db');

// Route imports
const authRoutes = require('./src/routes/authRoutes');
const documentRoutes = require('./src/routes/documentRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const activityRoutes = require('./src/routes/activityRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Global Middleware
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5173',
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS policy: Access denied from this origin.'));
      }
    },
    credentials: true, // Allow cookies across origins
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'CloudVault API operational',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    offlineMode: process.env.OFFLINE_MODE === 'true',
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/storage', dashboardRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/activities', activityRoutes);

// Fallback Offline Simulation routes for local browser testing
app.put('/api/offline-upload', (req, res) => {
  res.status(200).send('Offline upload simulated successfully.');
});
app.use('/api/offline-upload', (req, res) => {
  res.status(200).send('Offline upload simulated successfully.');
});

app.use('/api/offline-download', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send('CloudVault Academic Document — Offline simulation content.');
});

app.use('/api/offline-preview', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send('CloudVault Academic Document — Offline preview content.');
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint ${req.method} ${req.originalUrl} not found on this server.`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Error]', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`CloudVault Server running on http://localhost:${PORT}`);
    console.log(`Health Check: http://localhost:${PORT}/api/health`);
    console.log(`===============================================`);
  });
}

module.exports = app;
