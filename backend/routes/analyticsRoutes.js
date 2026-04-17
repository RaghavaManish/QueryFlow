const express = require('express');
const router = express.Router();
const { 
  getDashboardStats, 
  getQueryTrends, 
  getPerformanceMetrics 
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

router.use(protect); // All routes require authentication

router.get('/dashboard', getDashboardStats);
router.get('/trends', getQueryTrends);
router.get('/performance', getPerformanceMetrics);

module.exports = router;