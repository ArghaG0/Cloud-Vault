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

// Batch operations (registered before /:id routes)
router.post('/batch-delete', documentController.batchDelete);
router.post('/batch-restore', documentController.batchRestore);
router.post('/batch-purge', documentController.batchPurge);
router.post('/batch-move', documentController.batchMove);

// Document CRUD & Querying
router.get('/', documentController.getDocuments);
router.get('/:id', documentController.getDocumentById);
router.get('/:id/download-url', documentController.getDownloadUrl);
router.get('/:id/preview-url', documentController.getPreviewUrl);
router.patch('/:id', documentController.updateDocument);
router.delete('/:id', documentController.deleteDocument);
router.post('/:id/restore', documentController.restoreDocument);
router.delete('/:id/purge', documentController.purgeDocument);

module.exports = router;
