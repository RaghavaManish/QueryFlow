const express = require('express');
const router = express.Router();
const { 
  getQueries, 
  getQuery, 
  createQuery, 
  updateQuery,
  assignQuery,
  resolveQuery,
  addQueryNote,
  updateSLAStatus
} = require('../controllers/queryController');
const { protect, authorize } = require('../middleware/auth');
const { validateQuery } = require('../middleware/validation');

router.use(protect); // All routes require authentication

router.get('/update-sla', authorize('admin'), updateSLAStatus);

router.route('/')
  .get(getQueries)
  .post(validateQuery, createQuery);

router.route('/:id')
  .get(getQuery)
  .put(authorize('admin'), updateQuery)
  .delete(authorize('admin'), (req, res) => res.status(501).json({ success: false, message: 'Delete not implemented' }));

router.put('/:id/assign', authorize('admin'), assignQuery);
router.put('/:id/resolve', authorize('admin'), resolveQuery);
router.post('/:id/notes', addQueryNote);

module.exports = router;