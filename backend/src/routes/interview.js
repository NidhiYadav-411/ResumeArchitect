const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { startInterview, sendInterviewMessage, finishInterview } = require('../controllers/interviewController');

const router = express.Router();

router.post('/start', authMiddleware, startInterview);
router.post('/message', authMiddleware, sendInterviewMessage);
router.post('/finish', authMiddleware, finishInterview);

module.exports = router;
