import {
  getDocuments,
  getDocumentById,
  requestUploadUrl,
  finalizeUpload,
  abortUpload,
  getDownloadUrl,
  getPreviewUrl,
  updateDocument,
  deleteDocument,
  restoreDocument,
  purgeDocument,
  batchDelete,
  batchRestore,
  batchPurge,
  batchMove,
  uploadToPresignedUrl,
} from '../api/documents';

function normalizeDoc(doc) {
  if (!doc) return null;
  const id = doc.id || doc._id;
  return {
    ...doc,
    id,
    _id: id,
    name: doc.displayName || doc.name || doc.originalFilename || 'Document',
    title: doc.displayName || doc.title || doc.originalFilename || 'Document',
    displayName: doc.displayName || doc.name || doc.originalFilename || 'Document',
    originalFilename: doc.originalFilename || doc.name || doc.displayName || 'Document',
    sizeBytes: doc.fileSize ?? doc.sizeBytes ?? 0,
    fileSize: doc.fileSize ?? doc.sizeBytes ?? 0,
    s3Key: doc.s3ObjectKey || doc.s3Key || '',
    s3ObjectKey: doc.s3ObjectKey || doc.s3Key || '',
    uploadDate: doc.createdAt || doc.uploadDate || new Date().toISOString(),
    lastModified: doc.lastModified || doc.updatedAt || doc.createdAt || new Date().toISOString(),
    deletedAt: doc.deletedAt || null,
  };
}

export const documentService = {
  /**
   * Fetches document list with optional filtering and pagination
   */
  async getDocuments(params = {}) {
    const apiParams = {
      ...params,
      q: params.search || params.q,
      isTrash: params.isTrash ? 'true' : 'false',
      limit: params.limit || 50,
    };
    const res = await getDocuments(apiParams);
    const docs = Array.isArray(res.documents) ? res.documents : [];
    return docs.map(normalizeDoc);
  },

  /**
   * Fetches single document by ID
   */
  async getDocumentById(id) {
    const doc = await getDocumentById(id);
    return normalizeDoc(doc);
  },

  /**
   * Updates document name, category, or tags
   */
  async updateDocument(id, updates) {
    const payload = {
      displayName: updates.displayName || updates.name,
      category: updates.category,
      tags: updates.tags,
    };
    const updated = await updateDocument(id, payload);
    return normalizeDoc(updated);
  },

  /**
   * Soft deletes a document (moves to trash)
   */
  async deleteDocument(id) {
    return await deleteDocument(id);
  },

  /**
   * Restores a soft-deleted document from Trash
   */
  async restoreDocument(id) {
    return await restoreDocument(id);
  },

  /**
   * Permanently purges document from S3 and database
   */
  async purgeDocument(id) {
    return await purgeDocument(id);
  },

  /**
   * Batch deletes documents (moves to Trash)
   */
  async batchDelete(documentIds) {
    return await batchDelete(documentIds);
  },

  /**
   * Batch restores documents from Trash
   */
  async batchRestore(documentIds) {
    return await batchRestore(documentIds);
  },

  /**
   * Batch permanently purges documents from S3 and database
   */
  async batchPurge(documentIds) {
    return await batchPurge(documentIds);
  },

  /**
   * Batch moves documents to category
   */
  async batchMove(documentIds, targetCategory) {
    return await batchMove(documentIds, targetCategory);
  },

  /**
   * Searches documents with text query and filters
   */
  async searchDocuments(query = '', filters = {}) {
    const params = {
      q: query || undefined,
      category: filters.category && filters.category !== 'All' ? filters.category : undefined,
      extension: filters.extension && filters.extension !== 'all' ? filters.extension : undefined,
      limit: 50,
    };
    const res = await getDocuments(params);
    const docs = Array.isArray(res.documents) ? res.documents : [];
    return docs.map(normalizeDoc);
  },

  /**
   * Direct S3 Upload Orchestrator:
   * 1. Requests S3 Presigned Upload URL & reserves quota
   * 2. Uploads binary data directly to AWS S3 bucket via PUT
   * 3. Finalizes upload with HeadObject verification & DB record commit
   */
  async uploadFile(file, options = {}, onProgress = null) {
    const filename = file.name;
    const fileSize = file.size;
    const mimeType = file.type || 'application/octet-stream';
    const category = options.category || 'Other Documents';
    const tags = options.tag ? [options.tag] : (options.tags || []);

    // Step 1: Request presigned URL from server
    if (onProgress) onProgress(15);
    const presigned = await requestUploadUrl({
      filename,
      fileSize,
      mimeType,
      category,
    });

    try {
      // Step 2: Upload directly to S3 PUT URL
      if (onProgress) onProgress(40);
      await uploadToPresignedUrl(presigned.uploadUrl, file, mimeType);
      if (onProgress) onProgress(85);

      // Step 3: Finalize upload with backend verification
      const finalized = await finalizeUpload({
        documentId: presigned.documentId,
        displayName: filename,
        category,
        tags,
      });

      if (onProgress) onProgress(100);
      return normalizeDoc(finalized);
    } catch (err) {
      // Rollback reservation if upload aborted/failed
      if (presigned?.documentId) {
        try {
          await abortUpload(presigned.documentId);
        } catch {
          // ignore rollback error
        }
      }
      throw err;
    }
  },

  async requestPresignedUploadUrl(fileMetadata) {
    return await requestUploadUrl(fileMetadata);
  },

  async requestPresignedDownloadUrl(id) {
    return await getDownloadUrl(id);
  },

  async requestPresignedPreviewUrl(id) {
    return await getPreviewUrl(id);
  },
};
