import { apiClient, buildQuery, ApiError } from './apiClient';

export { ApiError };

const DOCS_PREFIX = '/api/documents';

/**
 * Step 1 of direct upload: requests S3 presigned PUT URL and reserves quota.
 * Route: POST /api/documents/upload-url
 *
 * @param {Object} payload
 * @param {string} payload.filename
 * @param {number} payload.fileSize
 * @param {string} [payload.category]
 * @param {string} [payload.mimeType]
 * @returns {Promise<{ uploadUrl: string, s3ObjectKey: string, documentId: string, expiresInSeconds: number, isSimulated: boolean }>}
 */
export async function requestUploadUrl(payload) {
  const response = await apiClient(`${DOCS_PREFIX}/upload-url`, {
    method: 'POST',
    body: payload,
  });
  return response.data;
}

/**
 * Step 2 of upload: verifies S3 upload and commits document metadata.
 * Route: POST /api/documents/finalize
 *
 * @param {Object} payload
 * @param {string} payload.documentId
 * @param {string} [payload.displayName]
 * @param {string} [payload.category]
 * @param {string} [payload.sha256Checksum]
 * @param {string[]} [payload.tags]
 * @returns {Promise<Object>} Finalized document record
 */
export async function finalizeUpload(payload) {
  const response = await apiClient(`${DOCS_PREFIX}/finalize`, {
    method: 'POST',
    body: payload,
  });
  return response.data;
}

/**
 * Aborts an incomplete upload reservation and rolls back reserved quota.
 * Route: POST /api/documents/abort-upload
 *
 * @param {string} documentId
 * @returns {Promise<Object>}
 */
export async function abortUpload(documentId) {
  return apiClient(`${DOCS_PREFIX}/abort-upload`, {
    method: 'POST',
    body: { documentId },
  });
}

/**
 * Fetches filtered, paginated list of documents.
 * Route: GET /api/documents?category=...&search=...&page=...&limit=...
 *
 * @param {Object} [params]
 * @param {string} [params.category]
 * @param {string} [params.search]
 * @param {string} [params.extension]
 * @param {number} [params.page=1]
 * @param {number} [params.limit=50]
 * @param {string} [params.sortBy='createdAt']
 * @param {string} [params.order='desc']
 * @returns {Promise<{ documents: Array, pagination: Object }>}
 */
export async function getDocuments(params = {}) {
  const query = buildQuery(params);
  const response = await apiClient(`${DOCS_PREFIX}${query}`, {
    method: 'GET',
  });
  return {
    documents: response.data || [],
    pagination: response.pagination || {
      total: 0,
      page: Number(params.page) || 1,
      limit: Number(params.limit) || 50,
      totalPages: 1,
    },
  };
}

/**
 * Fetches a single document by ID.
 * Route: GET /api/documents/:id
 *
 * @param {string} id
 * @returns {Promise<Object>} Document object
 */
export async function getDocumentById(id) {
  const response = await apiClient(`${DOCS_PREFIX}/${encodeURIComponent(id)}`, {
    method: 'GET',
  });
  return response.data;
}

/**
 * Fetches presigned download URL for a document.
 * Route: GET /api/documents/:id/download-url
 *
 * @param {string} id
 * @returns {Promise<{ downloadUrl: string, filename: string, mimeType: string, expiresInSeconds: number }>}
 */
export async function getDownloadUrl(id) {
  const response = await apiClient(`${DOCS_PREFIX}/${encodeURIComponent(id)}/download-url`, {
    method: 'GET',
  });
  return response.data;
}

/**
 * Fetches presigned preview URL for in-browser streaming.
 * Route: GET /api/documents/:id/preview-url
 *
 * @param {string} id
 * @returns {Promise<{ previewUrl: string, filename: string, mimeType: string, expiresInSeconds: number }>}
 */
export async function getPreviewUrl(id) {
  const response = await apiClient(`${DOCS_PREFIX}/${encodeURIComponent(id)}/preview-url`, {
    method: 'GET',
  });
  return response.data;
}

/**
 * Updates document displayName, category, or tags.
 * Route: PATCH /api/documents/:id
 *
 * @param {string} id
 * @param {Object} payload
 * @param {string} [payload.displayName]
 * @param {string} [payload.category]
 * @param {string[]} [payload.tags]
 * @returns {Promise<Object>} Updated document
 */
export async function updateDocument(id, payload) {
  const response = await apiClient(`${DOCS_PREFIX}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: payload,
  });
  return response.data;
}

/**
 * Soft deletes a document (moves to trash and updates quota).
 * Route: DELETE /api/documents/:id
 *
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function deleteDocument(id) {
  return apiClient(`${DOCS_PREFIX}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

/**
 * Restores a soft-deleted document from Trash.
 * Route: POST /api/documents/:id/restore
 *
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function restoreDocument(id) {
  return apiClient(`${DOCS_PREFIX}/${encodeURIComponent(id)}/restore`, {
    method: 'POST',
  });
}

/**
 * Permanently purges a document from S3 and MongoDB.
 * Route: DELETE /api/documents/:id/purge
 *
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function purgeDocument(id) {
  return apiClient(`${DOCS_PREFIX}/${encodeURIComponent(id)}/purge`, {
    method: 'DELETE',
  });
}

/**
 * Batch soft deletes multiple documents (moves to Trash).
 * Route: POST /api/documents/batch-delete
 *
 * @param {string[]} documentIds
 * @returns {Promise<Object>}
 */
export async function batchDelete(documentIds) {
  return apiClient(`${DOCS_PREFIX}/batch-delete`, {
    method: 'POST',
    body: { documentIds },
  });
}

/**
 * Batch restores multiple documents from Trash.
 * Route: POST /api/documents/batch-restore
 *
 * @param {string[]} documentIds
 * @returns {Promise<Object>}
 */
export async function batchRestore(documentIds) {
  return apiClient(`${DOCS_PREFIX}/batch-restore`, {
    method: 'POST',
    body: { documentIds },
  });
}

/**
 * Batch permanently purges multiple documents from S3 and MongoDB.
 * Route: POST /api/documents/batch-purge
 *
 * @param {string[]} documentIds
 * @returns {Promise<Object>}
 */
export async function batchPurge(documentIds) {
  return apiClient(`${DOCS_PREFIX}/batch-purge`, {
    method: 'POST',
    body: { documentIds },
  });
}

/**
 * Batch recategorizes multiple documents.
 * Route: POST /api/documents/batch-move
 *
 * @param {string[]} documentIds
 * @param {string} targetCategory
 * @returns {Promise<Object>}
 */
export async function batchMove(documentIds, targetCategory) {
  return apiClient(`${DOCS_PREFIX}/batch-move`, {
    method: 'POST',
    body: { documentIds, targetCategory },
  });
}

/**
 * Helper to upload binary file directly to S3 via presigned PUT URL.
 *
 * @param {string} uploadUrl - Presigned PUT URL
 * @param {Blob|File|ArrayBuffer} body - File content
 * @param {string} [mimeType='application/octet-stream']
 */
export async function uploadToPresignedUrl(
  uploadUrl,
  body,
  mimeType = 'application/octet-stream'
) {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': mimeType,
    },
    body,
  });

  if (!res.ok) {
    throw new ApiError(`S3 direct upload failed with status ${res.status}`, res.status);
  }
}
