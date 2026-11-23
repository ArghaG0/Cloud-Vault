import { mockDocuments } from '../data/mockDocuments';

let documents = [...mockDocuments];

export const documentService = {
  async getDocuments() {
    // Simulated network delay
    await new Promise(r => setTimeout(r, 100));
    return [...documents];
  },

  async getDocumentById(id) {
    await new Promise(r => setTimeout(r, 80));
    const doc = documents.find(d => d.id === id);
    if (!doc) throw new Error(`Document with ID ${id} not found.`);
    return { ...doc };
  },

  async createDocument(docData) {
    await new Promise(r => setTimeout(r, 200));
    const newDoc = {
      id: `doc-${Date.now().toString(36)}`,
      uploadDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      s3Status: 'synced',
      kmsEncrypted: true,
      versionCount: 1,
      ...docData,
    };
    documents = [newDoc, ...documents];
    return newDoc;
  },

  async updateDocument(id, updates) {
    await new Promise(r => setTimeout(r, 150));
    documents = documents.map(d => (d.id === id ? { ...d, ...updates, lastModified: new Date().toISOString() } : d));
    return documents.find(d => d.id === id);
  },

  async deleteDocument(id) {
    await new Promise(r => setTimeout(r, 150));
    documents = documents.filter(d => d.id !== id);
    return true;
  },

  async searchDocuments(query = '', filters = {}) {
    await new Promise(r => setTimeout(r, 120));
    const q = query.toLowerCase().trim();
    return documents.filter(doc => {
      const matchQuery = !q || 
        doc.name.toLowerCase().includes(q) ||
        doc.title.toLowerCase().includes(q) ||
        doc.category.toLowerCase().includes(q) ||
        (doc.tags && doc.tags.some(t => t.toLowerCase().includes(q)));

      const matchCategory = !filters.category || filters.category === 'All' || doc.category === filters.category;
      const matchType = !filters.extension || filters.extension === 'all' || doc.extension === filters.extension;
      const matchStatus = !filters.s3Status || doc.s3Status === filters.s3Status;

      return matchQuery && matchCategory && matchType && matchStatus;
    });
  },

  async requestPresignedUploadUrl(fileMetadata) {
    // Simulates Flask backend endpoint POST /api/documents/upload-url
    await new Promise(r => setTimeout(r, 150));
    return {
      uploadUrl: `https://cloudvault-s3-prod.s3.amazonaws.com/uploads/${fileMetadata.name}?X-Amz-Security-Token=SIMULATED`,
      s3Key: `users/stu-84920/${fileMetadata.category || 'general'}/${fileMetadata.name}`,
    };
  },

  async requestPresignedDownloadUrl(id) {
    // Simulates Flask backend endpoint GET /api/documents/:id/download-url
    await new Promise(r => setTimeout(r, 100));
    const doc = documents.find(d => d.id === id);
    return {
      downloadUrl: `https://cloudvault-s3-prod.s3.amazonaws.com/${doc?.s3Key}?X-Amz-Signature=SIMULATED`,
      expiresInSeconds: 300,
    };
  },
};
