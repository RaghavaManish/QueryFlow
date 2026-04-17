const express = require('express');
const router = express.Router();
const { 
  getContacts, 
  getContact, 
  createContact, 
  updateContact, 
  deleteContact,
  addContactNote
} = require('../controllers/contactController');
const { protect, authorize } = require('../middleware/auth');
const { validateContact } = require('../middleware/validation');

router.use(protect); // All routes require authentication

router.route('/')
  .get(getContacts)
  .post(validateContact, createContact);

router.route('/:id')
  .get(getContact)
  .put(authorize('admin'), validateContact, updateContact)
  .delete(authorize('admin'), deleteContact);

router.post('/:id/notes', addContactNote);

module.exports = router;