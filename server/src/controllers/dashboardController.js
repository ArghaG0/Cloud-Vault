const Document = require('../models/Document');
const SystemStorage = require('../models/SystemStorage');
const s3Service = require('../services/s3Service');

const { PER_ACCOUNT_MAX_BYTES, GLOBAL_BUCKET_MAX_BYTES } = SystemStorage;

function buildQuotaTelemetry(user, globalCounter) {
  const storageUsedBytes = user.storageUsedBytes || 0;
  const reservedBytes = user.reservedBytes || 0;
  const rawQuota = user.storageQuotaBytes ?? PER_ACCOUNT_MAX_BYTES;
  const storageQuotaBytes = Math.min(rawQuota, PER_ACCOUNT_MAX_BYTES);

  const globalStorageUsedBytes = globalCounter?.storageUsedBytes || 0;
  const globalStorageReservedBytes = globalCounter?.reservedBytes || 0;
  const globalStorageQuotaBytes = globalCounter?.storageQuotaBytes ?? GLOBAL_BUCKET_MAX_BYTES;

  return {
    storageUsedBytes,
    reservedBytes,
    storageQuotaBytes,
    storagePercentage:
      storageQuotaBytes > 0
        ? Number(((storageUsedBytes / storageQuotaBytes) * 100).toFixed(2))
        : 0,
    isPersonalStorageFull: storageUsedBytes + reservedBytes >= storageQuotaBytes,
    globalStorageUsedBytes,
    globalStorageReservedBytes,
    globalStorageQuotaBytes,
    isGlobalStorageFull:
      globalStorageUsedBytes + globalStorageReservedBytes >= globalStorageQuotaBytes,
  };
}

// GET /api/dashboard/stats
exports.getStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const [totalDocs, recentDocs, categoryAgg, s3Telemetry, globalCounter] = await Promise.all([
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
      SystemStorage.getOrInitGlobal(),
    ]);

    const quota = buildQuotaTelemetry(req.user, globalCounter);

    const categoryDistribution = categoryAgg.map((item) => ({
      category: item._id,
      count: item.count,
      totalBytes: item.totalBytes,
    }));

    res.json({
      success: true,
      data: {
        totalDocuments: totalDocs,
        ...quota,
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

    const [s3Telemetry, verifiedCount, totalDocs, globalCounter] = await Promise.all([
      s3Service.getBucketTelemetry(),
      Document.countDocuments({
        userId,
        isTrash: false,
        status: 'COMPLETED',
        sha256Checksum: { $ne: '' },
      }),
      Document.countDocuments({ userId, isTrash: false, status: 'COMPLETED' }),
      SystemStorage.getOrInitGlobal(),
    ]);

    const quota = buildQuotaTelemetry(req.user, globalCounter);

    res.json({
      success: true,
      data: {
        ...s3Telemetry,
        verifiedChecksumsCount: verifiedCount,
        totalDocuments: totalDocs,
        ...quota,
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
