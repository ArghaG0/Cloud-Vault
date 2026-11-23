import { mockBackupLogs } from '../data/mockBackupLogs';

let backupLogs = [...mockBackupLogs];

let backupRules = {
  instantIngest: true,
  dailyDeltaBackup: true,
  versioningPreservation: true,
  sseKmsEncryption: true,
};

export const storageService = {
  async getStorageStats() {
    await new Promise(r => setTimeout(r, 100));
    return {
      usedBytes: 2472000000, // 2.47 GB
      totalBytes: 10737418240, // 10 GB
      totalDocuments: 48,
      syncedDocuments: 46,
      pendingDocuments: 1,
      failedDocuments: 1,
      bucketRegion: 'us-east-1',
      kmsKeyAlias: 'alias/cloudvault-student-kms',
    };
  },

  async getBackupLogs() {
    await new Promise(r => setTimeout(r, 100));
    return [...backupLogs];
  },

  async verifyChecksum(logId) {
    await new Promise(r => setTimeout(r, 400));
    backupLogs = backupLogs.map(l => (l.id === logId ? { ...l, verified: true } : l));
    return backupLogs.find(l => l.id === logId);
  },

  async retryBackup(logId) {
    await new Promise(r => setTimeout(r, 500));
    backupLogs = backupLogs.map(l => (l.id === logId ? { ...l, status: 'synced', errorReason: null, verified: true } : l));
    return backupLogs.find(l => l.id === logId);
  },

  async syncAllPending() {
    await new Promise(r => setTimeout(r, 700));
    backupLogs = backupLogs.map(l => ({ ...l, status: 'synced', errorReason: null, verified: true }));
    return [...backupLogs];
  },

  async getBackupRules() {
    return { ...backupRules };
  },

  async updateBackupRule(key, value) {
    backupRules = { ...backupRules, [key]: value };
    return { ...backupRules };
  },
};
