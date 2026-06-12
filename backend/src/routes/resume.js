const express = require('express');
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const { uploadAndAnalyze, getUserResumes } = require('../controllers/resumeController');

const router = express.Router();

// Multer config targeting a local temp directory
const upload = multer({ dest: 'uploads/' });

router.post('/upload', authMiddleware, upload.single('resume'), uploadAndAnalyze);
router.get('/', authMiddleware, getUserResumes);

module.exports = router;
