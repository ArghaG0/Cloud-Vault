const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', categoryController.getCategories);

module.exports = router;
