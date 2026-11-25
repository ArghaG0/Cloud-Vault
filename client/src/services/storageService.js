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

export const storageService = {
  // GET /api/dashboard/stats
  async getDashboardStats() {
    return await getDashboardStats();
  },

  // GET /api/storage/telemetry
  async getStorageStats() {
    return await getStorageTelemetry();
  },

  // GET /api/storage/logs?page=1&limit=10
  async getBackupLogs({ page = 1, limit = 10 } = {}) {
    return await getStorageLogs({ page, limit });
  },

  // Keeps existing UI actions working until dedicated backend endpoints are added
  async verifyChecksum(logId) {
    const { logs } = await this.getBackupLogs({ page: 1, limit: 50 });
    const target = logs.find((l) => l._id === logId || l.id === logId);
    return target
      ? { ...target, verified: Boolean(target.sha256Checksum) }
      : null;
  },

  async retryBackup(logId) {
    return this.verifyChecksum(logId);
  },

  async syncAllPending() {
    return this.getDashboardStats();
  },

  async getBackupRules() {
    return { ...backupRules };
  },

  async updateBackupRule(key, value) {
    backupRules = { ...backupRules, [key]: value };
    return { ...backupRules };
  },
};
