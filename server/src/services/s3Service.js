const {
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  ListObjectVersionsCommand,
  CopyObjectCommand,
  GetBucketVersioningCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const { s3Client, isOffline, bucketName } = require('../config/s3');

// Allowed academic document extensions and MIME types
const ALLOWED_MIME_TYPES = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ppt: 'application/vnd.ms-powerpoint',
  zip: 'application/zip',
  '7z': 'application/x-7z-compressed',
  tar: 'application/x-tar',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  txt: 'text/plain',
};

const MAX_FILE_SIZE_BYTES = 52428800; // 50 MB

/**
 * Sanitizes filename to prevent directory traversal and special character corruption.
 */
function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 150);
}

/**
 * Generates an unguessable, scoped S3 object key.
 */
function generateS3Key(userId, category, filename) {
  const categorySlug = category.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const cleanName = sanitizeFilename(filename);
  const uniquePrefix = crypto.randomBytes(8).toString('hex');
  return `users/${userId}/${categorySlug}/${Date.now()}_${uniquePrefix}_${cleanName}`;
}

/**
 * Generates a presigned S3 PUT URL for direct browser uploads.
 */
async function generatePresignedUploadUrl(userId, category, filename, mimeType, fileSize) {
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size exceeds permitted maximum of 50 MB.`);
  }

  const extension = filename.split('.').pop().toLowerCase();
  const validMime = ALLOWED_MIME_TYPES[extension];
  if (!validMime) {
    throw new Error(`File format .${extension} is not supported. Please upload academic documents (PDF, DOCX, PPTX, ZIP, PNG, etc.).`);
  }

  const s3ObjectKey = generateS3Key(userId, category, filename);

  if (isOffline || !s3Client) {
    // Offline simulation mode
    return {
      uploadUrl: `http://localhost:${process.env.PORT || 5000}/api/offline-upload/${s3ObjectKey}`,
      s3ObjectKey,
      expiresInSeconds: 900,
      isSimulated: true,
    };
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: s3ObjectKey,
    ContentType: mimeType || validMime,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

  return {
    uploadUrl,
    s3ObjectKey,
    expiresInSeconds: 900,
    isSimulated: false,
  };
}

/**
 * Verifies object presence, actual byte size, and Content-Type in S3 via HeadObject.
 */
async function verifyUploadedObject(s3ObjectKey, expectedSize) {
  if (isOffline || !s3Client) {
    return {
      verified: true,
      actualSizeBytes: expectedSize,
      contentType: 'application/pdf',
      serverSideEncryption: 'AES256',
      versionId: 'simulated-v1',
      etag: `simulated-${Date.now()}`,
    };
  }

  try {
    const head = await s3Client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: s3ObjectKey,
      })
    );

    return {
      verified: true,
      actualSizeBytes: head.ContentLength,
      contentType: head.ContentType,
      serverSideEncryption: head.ServerSideEncryption || 'None',
      sseKmsKeyId: head.SSEKMSKeyId || null,
      versionId: head.VersionId || null,
      etag: head.ETag ? head.ETag.replace(/"/g, '') : null,
    };
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      throw new Error(`S3 object not found. The file was not successfully uploaded to cloud storage.`);
    }
    throw error;
  }
}

/**
 * Generates a presigned S3 GET URL for downloading files.
 */
async function generatePresignedDownloadUrl(s3ObjectKey, originalFilename) {
  const cleanName = sanitizeFilename(originalFilename || 'document');

  if (isOffline || !s3Client) {
    return {
      downloadUrl: `http://localhost:${process.env.PORT || 5000}/api/offline-download/${s3ObjectKey}`,
      expiresInSeconds: 300,
      isSimulated: true,
    };
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: s3ObjectKey,
    ResponseContentDisposition: `attachment; filename="${cleanName}"`,
  });

  const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

  return {
    downloadUrl,
    expiresInSeconds: 300,
    isSimulated: false,
  };
}

/**
 * Generates a presigned S3 GET URL for inline browser preview (e.g. PDF viewer).
 */
async function generatePresignedPreviewUrl(s3ObjectKey, mimeType) {
  if (isOffline || !s3Client) {
    return {
      previewUrl: `http://localhost:${process.env.PORT || 5000}/api/offline-preview/${s3ObjectKey}`,
      expiresInSeconds: 900,
      isSimulated: true,
    };
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: s3ObjectKey,
    ResponseContentDisposition: 'inline',
    ResponseContentType: mimeType || 'application/pdf',
  });

  const previewUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

  return {
    previewUrl,
    expiresInSeconds: 900,
    isSimulated: false,
  };
}

/**
 * Permanently deletes an object from Amazon S3.
 */
async function deleteS3Object(s3ObjectKey) {
  if (isOffline || !s3Client) {
    return { deleted: true, isSimulated: true };
  }

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: s3ObjectKey,
    })
  );

  return { deleted: true, isSimulated: false };
}

/**
 * Retrieves S3 Bucket Health & Telemetry.
 */
async function getBucketTelemetry() {
  if (isOffline || !s3Client) {
    return {
      status: 'Offline Simulation Mode',
      region: process.env.AWS_REGION || 'local',
      bucketName,
      versioningEnabled: true,
      encryption: 'Simulated SSE-S3 AES-256',
    };
  }

  try {
    const versioning = await s3Client.send(
      new GetBucketVersioningCommand({
        Bucket: bucketName,
      })
    );

    return {
      status: 'Operational',
      region: process.env.AWS_REGION || 'ap-south-1',
      bucketName,
      versioningEnabled: versioning.Status === 'Enabled',
      encryption: 'Amazon S3 Managed Encryption (SSE-S3 / SSE-KMS)',
    };
  } catch (error) {
    return {
      status: 'Degraded / Unreachable',
      error: error.message,
      region: process.env.AWS_REGION || 'ap-south-1',
      bucketName,
    };
  }
}

module.exports = {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  generatePresignedUploadUrl,
  verifyUploadedObject,
  generatePresignedDownloadUrl,
  generatePresignedPreviewUrl,
  deleteS3Object,
  getBucketTelemetry,
};
