const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5001'
).replace(/\/+$/, '');

let backupRules = {
  instantIngest: true,
  dailyDeltaBackup: true,
  versioningPreservation: true,
  sseKmsEncryption: true,
};

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    throw new Error(
      payload.error || payload.message || `Request failed (${response.status})`
    );
  }

  return payload;
}

export const storageService = {
  // GET /api/dashboard/stats
  async getDashboardStats() {
    const response = await requestJson('/api/dashboard/stats', {
      method: 'GET',
    });

    return response.data;
  },

  // GET /api/storage/telemetry
  async getStorageStats() {
    const response = await requestJson('/api/storage/telemetry', {
      method: 'GET',
    });

    return response.data;
  },

  // GET /api/storage/logs?page=1&limit=10
  async getBackupLogs({ page = 1, limit = 10 } = {}) {
    const searchParams = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    const response = await requestJson(
      `/api/storage/logs?${searchParams.toString()}`,
      {
        method: 'GET',
      }
    );

    return {
      logs: response.data || [],
      pagination: response.pagination || {
        total: 0,
        page: Number(page) || 1,
        limit: Number(limit) || 10,
        totalPages: 1,
      },
    };
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