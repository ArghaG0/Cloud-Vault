import { apiClient } from './apiClient';

/**
 * Fetches all academic document categories with live document counts
 * and aggregated S3 storage metrics.
 * Route: GET /api/categories
 *
 * @returns {Promise<Array<{ name: string, slug: string, color: string, icon: string, description: string, documentCount: number, totalBytes: number, sizeFormatted: string }>>}
 */
export async function getCategories() {
  const response = await apiClient('/api/categories', {
    method: 'GET',
  });

  return response.data || [];
}

export const categoryService = {
  getCategories,
};
