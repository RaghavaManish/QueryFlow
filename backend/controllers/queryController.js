const db = require('../config/database');

// Calculate SLA deadline based on priority
const calculateSLADeadline = async (priority) => {
  const [slaConfig] = await db.query(
    'SELECT resolution_time_hours FROM sla_configs WHERE priority = ?',
    [priority]
  );

  if (slaConfig.length === 0) {
    // Default to 24 hours if not configured
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  const hours = slaConfig[0].resolution_time_hours;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
};

// @desc    Get all queries with filters and pagination
// @route   GET /api/queries
// @access  Private
exports.getQueries = async (req, res, next) => {
  try {
    const { 
      search, 
      status, 
      category, 
      priority, 
      assigned_to, 
      page = 1, 
      limit = 10, 
      sortBy = 'created_at', 
      order = 'DESC' 
    } = req.query;

    let query = `
      SELECT q.*, 
             c.name as contact_name, 
             c.email as contact_email,
             u.name as assigned_to_name,
             TIMESTAMPDIFF(HOUR, NOW(), q.sla_deadline) as hours_remaining
      FROM queries q
      JOIN contacts c ON q.contact_id = c.id
      LEFT JOIN users u ON q.assigned_to = u.id
      WHERE 1=1
    `;
    const params = [];

    // Apply search filter
    if (search) {
      query += ' AND (q.subject LIKE ? OR q.description LIKE ? OR c.name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Apply status filter
    if (status && status !== 'All') {
      if (status === 'Overdue') {
        query += ' AND q.is_overdue = TRUE';
      } else {
        query += ' AND q.status = ?';
        params.push(status);
      }
    }

    // Apply category filter
    if (category) {
      query += ' AND q.category = ?';
      params.push(category);
    }

    // Apply priority filter
    if (priority) {
      query += ' AND q.priority = ?';
      params.push(priority);
    }

    // Apply assigned_to filter
    if (assigned_to) {
      if (assigned_to === 'unassigned') {
        query += ' AND q.assigned_to IS NULL';
      } else {
        query += ' AND q.assigned_to = ?';
        params.push(assigned_to);
      }
    }

    // Get total count
    const countQuery = query.replace(
      /SELECT q\.\*, .*? FROM/,
      'SELECT COUNT(*) as total FROM'
    );
    const [countResult] = await db.query(countQuery, params);
    const total = countResult[0].total;

    // Apply sorting and pagination
    query += ` ORDER BY q.${sortBy} ${order} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [queries] = await db.query(query, params);

    // Get query stats
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status IN ('Open', 'Pending', 'In Progress') THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN is_overdue = TRUE THEN 1 ELSE 0 END) as overdue,
        SUM(CASE WHEN status = 'Escalated' THEN 1 ELSE 0 END) as escalated,
        SUM(CASE WHEN status = 'Resolved' AND DATE(resolved_at) = CURDATE() THEN 1 ELSE 0 END) as resolved_today
      FROM queries
    `);

    res.json({
      success: true,
      data: queries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      stats: stats[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single query by ID
// @route   GET /api/queries/:id
// @access  Private
exports.getQuery = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [queries] = await db.query(
      `SELECT q.*, 
              c.name as contact_name, 
              c.email as contact_email, 
              c.phone as contact_phone,
              u.name as assigned_to_name,
              creator.name as created_by_name,
              TIMESTAMPDIFF(HOUR, NOW(), q.sla_deadline) as hours_remaining
       FROM queries q
       JOIN contacts c ON q.contact_id = c.id
       LEFT JOIN users u ON q.assigned_to = u.id
       LEFT JOIN users creator ON q.created_by = creator.id
       WHERE q.id = ?`,
      [id]
    );

    if (queries.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Query not found'
      });
    }

    // Get activity logs
    const [activities] = await db.query(
      `SELECT a.*, u.name as user_name 
       FROM activity_logs a 
       LEFT JOIN users u ON a.user_id = u.id 
       WHERE a.query_id = ? 
       ORDER BY a.created_at DESC`,
      [id]
    );

    // Get notes
    const [notes] = await db.query(
      `SELECT n.*, u.name as user_name 
       FROM internal_notes n 
       JOIN users u ON n.user_id = u.id 
       WHERE n.query_id = ? 
       ORDER BY n.created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...queries[0],
        activities,
        notes
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new query
// @route   POST /api/queries
// @access  Private
exports.createQuery = async (req, res, next) => {
  try {
    const { 
      contact_id, 
      subject, 
      description, 
      category, 
      priority, 
      assigned_to 
    } = req.body;

    // Calculate SLA deadline
    const slaDeadline = await calculateSLADeadline(priority || 'Medium');

    const [result] = await db.query(
      `INSERT INTO queries 
       (contact_id, subject, description, category, priority, assigned_to, sla_deadline, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        contact_id, 
        subject, 
        description, 
        category || 'General', 
        priority || 'Medium', 
        assigned_to || null, 
        slaDeadline,
        req.user.id
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Query created successfully',
      data: {
        id: result.insertId,
        subject,
        status: 'Open',
        sla_deadline: slaDeadline
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update query
// @route   PUT /api/queries/:id
// @access  Private
exports.updateQuery = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { subject, description, category, priority, status } = req.body;

    // Get current query
    const [currentQuery] = await db.query('SELECT * FROM queries WHERE id = ?', [id]);

    if (currentQuery.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Query not found'
      });
    }

    // If priority changed, recalculate SLA
    let slaDeadline = currentQuery[0].sla_deadline;
    if (priority && priority !== currentQuery[0].priority) {
      slaDeadline = await calculateSLADeadline(priority);
    }

    await db.query(
      `UPDATE queries 
       SET subject = ?, description = ?, category = ?, priority = ?, status = ?, sla_deadline = ?
       WHERE id = ?`,
      [subject, description, category, priority, status, slaDeadline, id]
    );

    res.json({
      success: true,
      message: 'Query updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign query to agent
// @route   PUT /api/queries/:id/assign
// @access  Private
exports.assignQuery = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { assigned_to } = req.body;

    const [result] = await db.query(
      'UPDATE queries SET assigned_to = ? WHERE id = ?',
      [assigned_to, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Query not found'
      });
    }

    // Log the assignment
    await db.query(
      `INSERT INTO activity_logs (query_id, user_id, action_type, description, new_value) 
       VALUES (?, ?, 'assigned', 'Query reassigned', ?)`,
      [id, req.user.id, assigned_to]
    );

    res.json({
      success: true,
      message: 'Query assigned successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resolve query
// @route   PUT /api/queries/:id/resolve
// @access  Private
exports.resolveQuery = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resolution_notes } = req.body;

    const [result] = await db.query(
      `UPDATE queries 
       SET status = 'Resolved', resolved_at = NOW(), resolution_notes = ?
       WHERE id = ?`,
      [resolution_notes, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Query not found'
      });
    }

    // Log the resolution
    await db.query(
      `INSERT INTO activity_logs (query_id, user_id, action_type, description, new_value) 
       VALUES (?, ?, 'resolved', 'Query marked as resolved', 'Resolved')`,
      [id, req.user.id]
    );

    res.json({
      success: true,
      message: 'Query resolved successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add note to query
// @route   POST /api/queries/:id/notes
// @access  Private
exports.addQueryNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!note) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required'
      });
    }

    const [result] = await db.query(
      'INSERT INTO internal_notes (query_id, user_id, note) VALUES (?, ?, ?)',
      [id, req.user.id, note]
    );

    // Log the note
    await db.query(
      `INSERT INTO activity_logs (query_id, user_id, action_type, description) 
       VALUES (?, ?, 'note_added', 'Internal note added')`,
      [id, req.user.id]
    );

    res.status(201).json({
      success: true,
      message: 'Note added successfully',
      data: {
        id: result.insertId,
        note,
        user_name: req.user.name
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update SLA status (check for overdue/breached)
// @route   GET /api/queries/update-sla
// @access  Private
exports.updateSLAStatus = async (req, res, next) => {
  try {
    await db.query('CALL update_sla_status()');

    res.json({
      success: true,
      message: 'SLA status updated successfully'
    });
  } catch (error) {
    next(error);
  }
};