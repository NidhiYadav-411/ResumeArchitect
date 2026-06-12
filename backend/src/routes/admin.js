const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { getDashboardStats } = require('../controllers/adminController');

const router = express.Router();

// Combine auth tracking and admin role validation
router.get('/stats', authMiddleware, adminMiddleware, getDashboardStats);

module.exports = router;
