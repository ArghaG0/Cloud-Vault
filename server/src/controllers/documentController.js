const Document = require('../models/Document');
const User = require('../models/User');
const Activity = require('../models/Activity');
const s3Service = require('../services/s3Service');

// AWS S3 Free Tier Cap: 5 GB total storage, max 50 MB per single file
const AWS_S3_FREE_TIER_MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB
const AWS_S3_FREE_TIER_MAX_TOTAL_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

// POST /api/documents/upload-url (Step 1 of direct S3 upload: Quota reservation + Presigned URL)
exports.requestUploadUrl = async (req, res) => {
  try {
    const { filename, category, mimeType, fileSize } = req.body;
    const userId = req.user._id;

    if (!filename || !fileSize) {
      return res.status(400).json({
        success: false,
        error: 'Filename and file size are required to request an upload URL.',
      });
    }

    const numBytes = Number(fileSize);
    if (isNaN(numBytes) || numBytes <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid file size specified.' });
    }

    // Free Tier single file safety check (50 MB limit)
    if (numBytes > AWS_S3_FREE_TIER_MAX_FILE_BYTES) {
      return res.status(400).json({
        success: false,
        error: `File size exceeds the 50 MB limit to preserve AWS S3 Free Tier tiering.`,
        code: 'FILE_TOO_LARGE',
      });
    }

    // Atomic Quota Check & Reservation:
    // Ensure (storageUsedBytes + reservedBytes + fileSize) <= storageQuotaBytes
    // and also does not exceed AWS Free Tier 5GB absolute ceiling
    const user = await User.findById(userId);
    const effectiveQuota = Math.min(
      user?.storageQuotaBytes || AWS_S3_FREE_TIER_MAX_TOTAL_BYTES,
      AWS_S3_FREE_TIER_MAX_TOTAL_BYTES
    );

    const updatedUser = await User.findOneAndUpdate(
      {
        _id: userId,
        $expr: {
          $lte: [
            { $add: ['$storageUsedBytes', '$reservedBytes', numBytes] },
            effectiveQuota,
          ],
        },
      },
      { $inc: { reservedBytes: numBytes } },
      { returnDocument: 'after' }
    );

    if (!updatedUser) {
      return res.status(403).json({
        success: false,
        error: 'Storage quota exceeded. Free Tier limit is 5 GB. Please delete files before uploading.',
        code: 'QUOTA_EXCEEDED',
      });
    }

    // Generate S3 presigned PUT URL
    const docCategory = category || 'Other Documents';
    const uploadDetails = await s3Service.generatePresignedUploadUrl(
      userId.toString(),
      docCategory,
      filename,
      mimeType,
      numBytes
    );

    const extension = filename.split('.').pop().toLowerCase();

    // Create a temporary RESERVED document record (15-minute TTL)
    const reservedDoc = await Document.create({
      userId,
      originalFilename: filename,
      displayName: filename,
      category: docCategory,
      s3ObjectKey: uploadDetails.s3ObjectKey,
      fileSize: numBytes,
      mimeType: mimeType || 'application/octet-stream',
      extension,
      status: 'RESERVED',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
    });

    res.json({
      success: true,
      data: {
        uploadUrl: uploadDetails.uploadUrl,
        s3ObjectKey: uploadDetails.s3ObjectKey,
        documentId: reservedDoc._id,
        expiresInSeconds: uploadDetails.expiresInSeconds,
        isSimulated: uploadDetails.isSimulated,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/documents/finalize (Step 2 of upload: S3 HeadObject verification + DB commit)
exports.finalizeUpload = async (req, res) => {
  try {
    const { documentId, displayName, category, sha256Checksum, tags } = req.body;
    const userId = req.user._id;

    const doc = await Document.findOne({ _id: documentId, userId });
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Upload reservation not found.' });
    }

    if (doc.status === 'COMPLETED') {
      return res.json({ success: true, data: doc });
    }

    // Verify presence and size on S3 via HeadObject
    let verification;
    try {
      verification = await s3Service.verifyUploadedObject(doc.s3ObjectKey, doc.fileSize);
    } catch (err) {
      // S3 verification failed — rollback reserved quota
      await User.findByIdAndUpdate(userId, { $inc: { reservedBytes: -doc.fileSize } });
      doc.status = 'FAILED';
      await doc.save();
      return res.status(400).json({
        success: false,
        error: `Cloud verification failed: ${err.message}`,
      });
    }

    const actualSize = verification.actualSizeBytes || doc.fileSize;

    // Atomically transfer quota from reserved to used
    await User.findByIdAndUpdate(userId, {
      $inc: {
        reservedBytes: -doc.fileSize,
        storageUsedBytes: actualSize,
      },
    });

    // Commit document metadata
    doc.displayName = displayName || doc.displayName;
    if (category) doc.category = category;
    doc.fileSize = actualSize;
    doc.status = 'COMPLETED';
    doc.s3Status = 'synced';
    doc.kmsEncrypted = true;
    doc.sha256Checksum = sha256Checksum || '';
    if (tags && Array.isArray(tags)) doc.tags = tags;
    doc.expiresAt = null;
    await doc.save();

    // Log Activity
    await Activity.create({
      userId,
      action: 'UPLOAD',
      documentId: doc._id,
      documentName: doc.displayName,
      details: `Uploaded ${doc.displayName} (${(actualSize / (1024 * 1024)).toFixed(1)} MB) to ${doc.category}`,
      ipAddress: req.ip || '',
    });

    res.status(201).json({
      success: true,
      data: doc,
      message: 'Document uploaded and verified in cloud storage successfully.',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/documents/abort-upload (Rollback quota reservation on cancelled/failed upload)
exports.abortUpload = async (req, res) => {
  try {
    const { documentId } = req.body;
    const doc = await Document.findOne({ _id: documentId, userId: req.user._id });

    if (doc && doc.status === 'RESERVED') {
      await User.findByIdAndUpdate(req.user._id, { $inc: { reservedBytes: -doc.fileSize } });
      doc.status = 'FAILED';
      await doc.save();
    }

    res.json({ success: true, message: 'Upload aborted and reserved quota released.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/documents (Paginated search and category filtering)
exports.getDocuments = async (req, res) => {
  try {
    const { q, category, extension, s3Status, sortBy = '-createdAt', page = 1, limit = 10, isTrash = 'false' } = req.query;

    const filter = {
      userId: req.user._id,
      isTrash: isTrash === 'true',
      status: 'COMPLETED',
    };

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (extension && extension !== 'all') {
      filter.extension = extension.toLowerCase();
    }

    if (s3Status) {
      filter.s3Status = s3Status;
    }

    if (q && q.trim()) {
      const term = q.trim();
      filter.$or = [
        { displayName: { $regex: term, $options: 'i' } },
        { originalFilename: { $regex: term, $options: 'i' } },
        { tags: { $regex: term, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [documents, total] = await Promise.all([
      Document.find(filter).sort(sortBy).skip(skip).limit(limitNum),
      Document.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: documents,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
        hasNextPage: skip + documents.length < total,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/documents/:id (Fetch single document)
exports.getDocumentById = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found.' });
    }
    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/documents/:id/download-url (Presigned download URL)
exports.getDownloadUrl = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found.' });
    }

    const downloadDetails = await s3Service.generatePresignedDownloadUrl(
      doc.s3ObjectKey,
      doc.originalFilename
    );

    await Activity.create({
      userId: req.user._id,
      action: 'DOWNLOAD',
      documentId: doc._id,
      documentName: doc.displayName,
      details: `Retrieved download link for ${doc.displayName}`,
      ipAddress: req.ip || '',
    });

    res.json({
      success: true,
      data: {
        downloadUrl: downloadDetails.downloadUrl,
        expiresInSeconds: downloadDetails.expiresInSeconds,
        isSimulated: downloadDetails.isSimulated,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/documents/:id/preview-url (Presigned inline preview URL)
exports.getPreviewUrl = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found.' });
    }

    const previewDetails = await s3Service.generatePresignedPreviewUrl(
      doc.s3ObjectKey,
      doc.mimeType
    );

    res.json({
      success: true,
      data: {
        previewUrl: previewDetails.previewUrl,
        expiresInSeconds: previewDetails.expiresInSeconds,
        isSimulated: previewDetails.isSimulated,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// PATCH /api/documents/:id (Rename display name, change category, update tags)
exports.updateDocument = async (req, res) => {
  try {
    const { displayName, category, tags } = req.body;
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found.' });
    }

    let action = 'RENAME';
    let details = `Renamed to ${displayName}`;

    if (category && category !== doc.category) {
      action = 'RECATEGORIZE';
      details = `Moved from ${doc.category} to ${category}`;
      doc.category = category;
    }

    if (displayName) doc.displayName = displayName;
    if (tags && Array.isArray(tags)) doc.tags = tags;
    doc.lastModified = new Date();

    await doc.save();

    await Activity.create({
      userId: req.user._id,
      action,
      documentId: doc._id,
      documentName: doc.displayName,
      details,
      ipAddress: req.ip || '',
    });

    res.json({ success: true, data: doc, message: 'Document updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// DELETE /api/documents/:id (Soft delete: move to trash)
exports.deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found.' });
    }

    // Decrement active user storage quota
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { storageUsedBytes: -doc.fileSize },
    });

    doc.isTrash = true;
    doc.deletedAt = new Date();
    await doc.save();

    await Activity.create({
      userId: req.user._id,
      action: 'DELETE',
      documentId: doc._id,
      documentName: doc.displayName,
      details: `Moved ${doc.displayName} to Trash`,
      ipAddress: req.ip || '',
    });

    res.json({ success: true, message: 'Document moved to trash successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// DELETE /api/documents/:id/purge (Permanent purge from S3 and MongoDB)
exports.purgeDocument = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found.' });
    }

    // Delete physical file from Amazon S3
    await s3Service.deleteS3Object(doc.s3ObjectKey);

    // If it wasn't already in trash, decrement user storage quota
    if (!doc.isTrash) {
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { storageUsedBytes: -doc.fileSize },
      });
    }

    await Document.deleteOne({ _id: doc._id });

    res.json({ success: true, message: 'Document permanently deleted from cloud storage.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/documents/batch-delete (Batch soft deletion)
exports.batchDelete = async (req, res) => {
  try {
    const { documentIds } = req.body;
    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Document IDs array is required.' });
    }

    const docs = await Document.find({
      _id: { $in: documentIds },
      userId: req.user._id,
      isTrash: false,
    });

    const totalBytesToFree = docs.reduce((acc, d) => acc + d.fileSize, 0);

    await Promise.all([
      User.findByIdAndUpdate(req.user._id, { $inc: { storageUsedBytes: -totalBytesToFree } }),
      Document.updateMany(
        { _id: { $in: documentIds }, userId: req.user._id },
        { $set: { isTrash: true, deletedAt: new Date() } }
      ),
    ]);

    res.json({
      success: true,
      message: `${docs.length} documents moved to trash.`,
      freedBytes: totalBytesToFree,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/documents/batch-move (Batch category reassignment)
exports.batchMove = async (req, res) => {
  try {
    const { documentIds, targetCategory } = req.body;
    if (!Array.isArray(documentIds) || !targetCategory) {
      return res.status(400).json({ success: false, error: 'Document IDs and target category are required.' });
    }

    await Document.updateMany(
      { _id: { $in: documentIds }, userId: req.user._id },
      { $set: { category: targetCategory, lastModified: new Date() } }
    );

    res.json({ success: true, message: `${documentIds.length} documents moved to ${targetCategory}.` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
