const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { protect } = require('../middleware/auth');

// All document routes require authentication
router.use(protect);

// Upload Lifecycle
router.post('/upload-url', documentController.requestUploadUrl);
router.post('/finalize', documentController.finalizeUpload);
router.post('/abort-upload', documentController.abortUpload);

// Document CRUD & Querying
router.get('/', documentController.getDocuments);
router.get('/:id', documentController.getDocumentById);
router.get('/:id/download-url', documentController.getDownloadUrl);
router.get('/:id/preview-url', documentController.getPreviewUrl);
router.patch('/:id', documentController.updateDocument);
router.delete('/:id', documentController.deleteDocument);
router.delete('/:id/purge', documentController.purgeDocument);

// Batch operations
router.post('/batch-delete', documentController.batchDelete);
router.post('/batch-move', documentController.batchMove);

module.exports = router;
