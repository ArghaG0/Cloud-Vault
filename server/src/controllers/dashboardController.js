const Document = require('../models/Document');
const User = require('../models/User');
const s3Service = require('../services/s3Service');

// GET /api/dashboard/stats
exports.getStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const [totalDocs, recentDocs, categoryAgg, s3Telemetry] = await Promise.all([
      Document.countDocuments({ userId, isTrash: false, status: 'COMPLETED' }),
      Document.find({ userId, isTrash: false, status: 'COMPLETED' })
        .sort({ createdAt: -1 })
        .limit(5),
      Document.aggregate([
        { $match: { userId, isTrash: false, status: 'COMPLETED' } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalBytes: { $sum: '$fileSize' },
          },
        },
      ]),
      s3Service.getBucketTelemetry(),
    ]);

    const user = req.user;
    const storageUsedBytes = user.storageUsedBytes || 0;
    const storageQuotaBytes = user.storageQuotaBytes || 10737418240;

    const categoryDistribution = categoryAgg.map(item => ({
      category: item._id,
      count: item.count,
      totalBytes: item.totalBytes,
    }));

    res.json({
      success: true,
      data: {
        totalDocuments: totalDocs,
        storageUsedBytes,
        storageQuotaBytes,
        storagePercentage: Number(((storageUsedBytes / storageQuotaBytes) * 100).toFixed(2)),
        activeCategoriesCount: categoryAgg.length,
        s3Health: s3Telemetry,
        categoryDistribution,
        recentDocuments: recentDocs,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/storage/telemetry
exports.getStorageTelemetry = async (req, res) => {
  try {
    const userId = req.user._id;

    const [s3Telemetry, verifiedCount, totalDocs] = await Promise.all([
      s3Service.getBucketTelemetry(),
      Document.countDocuments({
        userId,
        isTrash: false,
        status: 'COMPLETED',
        sha256Checksum: { $ne: '' },
      }),
      Document.countDocuments({ userId, isTrash: false, status: 'COMPLETED' }),
    ]);

    res.json({
      success: true,
      data: {
        ...s3Telemetry,
        verifiedChecksumsCount: verifiedCount,
        totalDocuments: totalDocs,
        storageUsedBytes: req.user.storageUsedBytes,
        storageQuotaBytes: req.user.storageQuotaBytes,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/storage/logs (Paginated S3 Sync & Hash Logs)
exports.getStorageLogs = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const filter = { userId: req.user._id, isTrash: false, status: 'COMPLETED' };

    const [docs, total] = await Promise.all([
      Document.find(filter)
        .select('displayName s3ObjectKey fileSize sha256Checksum s3Status kmsEncrypted createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Document.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: docs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
