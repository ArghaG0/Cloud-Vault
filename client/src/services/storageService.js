import {
  getDashboardStats,
  getStorageTelemetry,
  getStorageLogs,
} from '../api/dashboard';

let backupRules = {
  instantIngest: true,
  dailyDeltaBackup: true,
  versioningPreservation: true,
  sseKmsEncryption: true,
};

function normalizeStorageLog(doc) {
  return {
    id: doc._id || doc.id,
    documentTitle: doc.displayName || 'Untitled',
    objectKey: doc.s3ObjectKey || '',
    storageClass: 'S3 Standard',
    sizeBytes: doc.fileSize ?? 0,
    timestamp: doc.createdAt || new Date().toISOString(),
    status: doc.s3Status || 'synced',
    verified: Boolean(doc.sha256Checksum),
    sha256Checksum: doc.sha256Checksum || '',
  };
}

export const storageService = {
  // GET /api/dashboard/stats
  async getDashboardStats() {
    return await getDashboardStats();
  },

  // GET /api/storage/telemetry
  async getStorageStats() {
    const data = await getStorageTelemetry();
    return {
      ...data,
      usedBytes: data.storageUsedBytes ?? data.usedBytes ?? 0,
      totalBytes: data.storageQuotaBytes ?? data.totalBytes ?? 5368709120,
    };
  },

  // GET /api/storage/logs?page=1&limit=10
  async getBackupLogs({ page = 1, limit = 10 } = {}) {
    const { logs } = await getStorageLogs({ page, limit });
    return (Array.isArray(logs) ? logs : []).map(normalizeStorageLog);
  },

  // Keeps existing UI actions working until dedicated backend endpoints are added
  async verifyChecksum(logId) {
    const logs = await this.getBackupLogs({ page: 1, limit: 50 });
    const target = logs.find((l) => l.id === logId);
    return target ? { ...target, verified: Boolean(target.sha256Checksum) } : null;
  },

  async retryBackup(logId) {
    return this.verifyChecksum(logId);
  },

  async syncAllPending() {
    return this.getBackupLogs({ page: 1, limit: 50 });
  },

  async getBackupRules() {
    return { ...backupRules };
  },

  async updateBackupRule(key, value) {
    backupRules = { ...backupRules, [key]: value };
    return { ...backupRules };
  },
};
