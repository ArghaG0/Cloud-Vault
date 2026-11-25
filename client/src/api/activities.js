import { apiClient, buildQuery } from './apiClient';

/**
 * Fetches paginated activity log records for the current user.
 * Route: GET /api/activities?action=...&page=1&limit=20
 *
 * @param {Object} [params]
 * @param {string} [params.action] - Optional filter by action (e.g. 'UPLOAD', 'LOGIN', 'DELETE', 'RENAME', 'RECATEGORIZE', 'ALL')
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @returns {Promise<{ data: Array, pagination: { total: number, page: number, limit: number, totalPages: number } }>}
 */
export async function getActivities(params = {}) {
  const query = buildQuery(params);
  const response = await apiClient(`/api/activities${query}`, {
    method: 'GET',
  });

  return {
    data: response.data || [],
    pagination: response.pagination || {
      total: 0,
      page: Number(params.page) || 1,
      limit: Number(params.limit) || 20,
      totalPages: 1,
    },
  };
}

export const activityApiService = {
  getActivities,
};
