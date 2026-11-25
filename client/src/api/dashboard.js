import { apiClient } from './apiClient';

/**
 * Fetches aggregated dashboard metrics, quota usage, S3 health,
 * category distribution, and recent documents.
 * Route: GET /api/dashboard/stats
 */
export async function getDashboardStats() {
  const response = await apiClient('/api/dashboard/stats', {
    method: 'GET',
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to load dashboard stats');
  }

  return response.data;
}

/**
 * Fetches S3 bucket telemetry, verified SHA-256 checksum count,
 * document count, and user quota usage.
 * Route: GET /api/storage/telemetry
 */
export async function getStorageTelemetry() {
  const response = await apiClient('/api/storage/telemetry', {
    method: 'GET',
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to load storage telemetry');
  }

  return response.data;
}

/**
 * Fetches paginated S3 sync & SHA-256 hash logs for the current user.
 * Route: GET /api/storage/logs?page=1&limit=10
 *
 * @param {Object} [params]
 * @param {number} [params.page=1]
 * @param {number} [params.limit=10]
 * @returns {Promise<{ logs: Array, pagination: { total: number, page: number, limit: number, totalPages: number } }>}
 */
export async function getStorageLogs({ page = 1, limit = 10 } = {}) {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const response = await apiClient(`/api/storage/logs?${searchParams.toString()}`, {
    method: 'GET',
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to load storage logs');
  }

  return {
    logs: response.data || [],
    pagination: response.pagination || {
      total: 0,
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      totalPages: 1,
    },
  };
}

export const dashboardService = {
  getStats: getDashboardStats,
  getStorageTelemetry,
  getStorageLogs,
};