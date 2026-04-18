const db = require('../config/database');

// @desc    Get all contacts with filters and pagination
// @route   GET /api/contacts
// @access  Private
exports.getContacts = async (req, res, next) => {
  try {
    const { search, tag, page = 1, limit = 10, sortBy = 'created_at', order = 'DESC' } = req.query;

    let query = 'SELECT * FROM contacts WHERE 1=1';
    const params = [];
    let paramIdx = 1;

    // Apply search filter
    if (search) {
      query += ` AND (name ILIKE $${paramIdx} OR email ILIKE $${paramIdx+1} OR phone ILIKE $${paramIdx+2} OR company ILIKE $${paramIdx+3})`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      paramIdx += 4;
    }

    // Apply tag filter
    if (tag && tag !== 'All') {
      query += ` AND tag = $${paramIdx}`;
      params.push(tag);
      paramIdx++;
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = await db.query(countQuery, params);
    const total = countResult.rows[0].total;

    // Apply sorting and pagination
    query += ` ORDER BY ${sortBy} ${order} LIMIT $${paramIdx} OFFSET $${paramIdx+1}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    paramIdx += 2;

    const contactsResult = await db.query(query, params);
    const contacts = contactsResult.rows;

    // Get contact stats (Postgres version)
    const statsResult = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN tag = 'Customer' THEN 1 ELSE 0 END) as customer_count,
        SUM(CASE WHEN tag = 'Lead' THEN 1 ELSE 0 END) as lead_count,
        SUM(CASE WHEN tag = 'VIP' THEN 1 ELSE 0 END) as vip_count,
        SUM(CASE WHEN tag = 'Inactive' THEN 1 ELSE 0 END) as inactive_count,
        SUM(CASE WHEN tag = 'Partner' THEN 1 ELSE 0 END) as partner_count,
        SUM(CASE WHEN EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE) 
            AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE) THEN 1 ELSE 0 END) as added_this_month
      FROM contacts
    `);
    const stats = statsResult.rows[0];

    res.json({
      success: true,
      data: contacts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      stats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single contact by ID
// @route   GET /api/contacts/:id
// @access  Private
exports.getContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const contactResult = await db.query('SELECT * FROM contacts WHERE id = $1', [id]);
    const contacts = contactResult.rows;
    if (contacts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }
    // Get queries for this contact
    const queriesResult = await db.query(
      `SELECT q.*, u.name as assigned_to_name 
       FROM queries q 
       LEFT JOIN users u ON q.assigned_to = u.id 
       WHERE q.contact_id = $1 
       ORDER BY q.created_at DESC`,
      [id]
    );
    // Get notes for this contact
    const notesResult = await db.query(
      `SELECT n.*, u.name as user_name 
       FROM internal_notes n 
       JOIN users u ON n.user_id = u.id 
       WHERE n.contact_id = $1 
       ORDER BY n.created_at DESC`,
      [id]
    );
    res.json({
      success: true,
      data: {
        ...contacts[0],
        queries: queriesResult.rows,
        notes: notesResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new contact
// @route   POST /api/contacts
// @access  Private
exports.createContact = async (req, res, next) => {
  try {
    const { name, email, phone, company, tag, address, notes } = req.body;
    // Check if contact with email already exists
    const existingResult = await db.query('SELECT id FROM contacts WHERE email = $1', [email]);
    if (existingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Contact with this email already exists'
      });
    }
    const insertResult = await db.query(
      `INSERT INTO contacts (name, email, phone, company, tag, address, notes, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [name, email, phone || null, company || null, tag || 'Lead', address || null, notes || null, req.user.id]
    );
    res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      data: {
        id: insertResult.rows[0].id,
        name,
        email,
        phone,
        company,
        tag: tag || 'Lead'
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update contact
// @route   PUT /api/contacts/:id
// @access  Private
exports.updateContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, phone, company, tag, address, notes } = req.body;
    // Check if contact exists
    const existingResult = await db.query('SELECT id FROM contacts WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }
    await db.query(
      `UPDATE contacts 
       SET name = $1, email = $2, phone = $3, company = $4, tag = $5, address = $6, notes = $7 
       WHERE id = $8`,
      [name, email, phone, company, tag, address, notes, id]
    );
    res.json({
      success: true,
      message: 'Contact updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete contact
// @route   DELETE /api/contacts/:id
// @access  Private
exports.deleteContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM contacts WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }
    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add note to contact
// @route   POST /api/contacts/:id/notes
// @access  Private
exports.addContactNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    if (!note) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required'
      });
    }
    const insertResult = await db.query(
      'INSERT INTO internal_notes (contact_id, user_id, note) VALUES ($1, $2, $3) RETURNING id',
      [id, req.user.id, note]
    );
    res.status(201).json({
      success: true,
      message: 'Note added successfully',
      data: {
        id: insertResult.rows[0].id,
        note,
        user_name: req.user.name
      }
    });
  } catch (error) {
    next(error);
  }
};