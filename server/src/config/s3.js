const { S3Client } = require('@aws-sdk/client-s3');

const isOffline = process.env.OFFLINE_MODE === 'true';

let rawRegion = process.env.AWS_REGION || 'ap-south-1';
// Extract standard region identifier (e.g., "ap-southeast-2") if full name was pasted
const regionMatch = rawRegion.match(/[a-z]{2}-[a-z]+-\d+/i);
const region = regionMatch ? regionMatch[0].toLowerCase() : rawRegion.trim();

let s3Client = null;

if (!isOffline && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  console.log(`[AWS S3] Initialized S3 Client for region: ${region}`);
} else {
  console.log('[AWS S3] Running in OFFLINE / MOCK storage mode. Real AWS requests will be simulated.');
}

module.exports = {
  s3Client,
  isOffline,
  bucketName: process.env.AWS_BUCKET_NAME,
};
