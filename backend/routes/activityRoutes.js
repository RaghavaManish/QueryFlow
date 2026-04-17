const express = require('express');
const router = express.Router();
const { getActivities } = require('../controllers/activityController');
const { protect } = require('../middleware/auth');

router.use(protect); // All routes require authentication

router.get('/', getActivities);

module.exports = router;