const db = require('../config/database');

// Calculate SLA deadline based on priority (Postgres version)
const calculateSLADeadline = async (priority) => {
  const result = await db.query(
    'SELECT resolution_time_hours FROM sla_configs WHERE priority = $1',
    [priority]
  );
  if (result.rows.length === 0) {
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
  const hours = result.rows[0].resolution_time_hours;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
};

// @desc    Get all queries with filters and pagination
// @route   GET /api/queries
// @access  Private
exports.getQueries = async (req, res, next) => {
  try {
    const { search, status, category, priority, assigned_to, page = 1, limit = 10, sortBy = 'created_at', order = 'DESC' } = req.query;
    let query = `
      SELECT q.*, 
             c.name as contact_name, 
             c.email as contact_email,
             u.name as assigned_to_name,
             EXTRACT(EPOCH FROM (q.sla_deadline - NOW()))/3600 as hours_remaining
      FROM queries q
      JOIN contacts c ON q.contact_id = c.id
      LEFT JOIN users u ON q.assigned_to = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIdx = 1;
    // Apply search filter
    if (search) {
      query += ` AND (q.subject ILIKE $${paramIdx} OR q.description ILIKE $${paramIdx+1} OR c.name ILIKE $${paramIdx+2})`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      paramIdx += 3;
    }

    // Apply status filter
    if (status && status !== 'All') {
      if (status === 'Overdue') {
        query += ' AND q.is_overdue = TRUE';
      } else {
        query += ` AND q.status = $${paramIdx}`;
        params.push(status);
        paramIdx++;
      }
    }

    // Apply category filter
    if (category) {
      query += ` AND q.category = $${paramIdx}`;
      params.push(category);
      paramIdx++;
    }

    // Apply priority filter
    if (priority) {
      query += ` AND q.priority = $${paramIdx}`;
      params.push(priority);
      paramIdx++;
    }

    // Apply assigned_to filter
    if (assigned_to) {
      if (assigned_to === 'unassigned') {
        query += ' AND q.assigned_to IS NULL';
      } else {
        query += ` AND q.assigned_to = $${paramIdx}`;
        params.push(assigned_to);
        paramIdx++;
      }
    }
    // Get total count
    const countQuery = query.replace(
      /SELECT[\s\S]*?FROM/,
      'SELECT COUNT(*) as total FROM'
    );
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);
    // Apply sorting and pagination
    query += ` ORDER BY q.${sortBy} ${order} LIMIT $${paramIdx} OFFSET $${paramIdx+1}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    paramIdx += 2;
    const queriesResult = await db.query(query, params);
    const queries = queriesResult.rows;
    // Get query stats
    const statsResult = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status IN ('Open', 'Pending', 'In Progress') THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN is_overdue = TRUE THEN 1 ELSE 0 END) as overdue,
        SUM(CASE WHEN status = 'Escalated' THEN 1 ELSE 0 END) as escalated,
        SUM(CASE WHEN status = 'Resolved' AND DATE(resolved_at) = CURRENT_DATE THEN 1 ELSE 0 END) as resolved_today
      FROM queries
    `);
    const stats = statsResult.rows[0];
    res.json({
      success: true,
      data: queries,
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

// @desc    Get single query by ID
// @route   GET /api/queries/:id
// @access  Private
exports.getQuery = async (req, res, next) => {
  try {
    const { id } = req.params;

    const queriesResult = await db.query(
      `SELECT q.*, 
              c.name as contact_name, 
              c.email as contact_email, 
              c.phone as contact_phone,
              u.name as assigned_to_name,
              creator.name as created_by_name,
              EXTRACT(EPOCH FROM (q.sla_deadline - NOW()))/3600 as hours_remaining
       FROM queries q
       JOIN contacts c ON q.contact_id = c.id
       LEFT JOIN users u ON q.assigned_to = u.id
       LEFT JOIN users creator ON q.created_by = creator.id
       WHERE q.id = $1`,
      [id]
    );
    const queries = queriesResult.rows;

    if (queries.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Query not found'
      });
    }

    // Get activity logs
    const activitiesResult = await db.query(
      `SELECT a.*, u.name as user_name 
       FROM activity_logs a 
       LEFT JOIN users u ON a.user_id = u.id 
       WHERE a.query_id = $1 
       ORDER BY a.created_at DESC`,
      [id]
    );
    const activities = activitiesResult.rows;

    // Get notes
    const notesResult = await db.query(
      `SELECT n.*, u.name as user_name 
       FROM internal_notes n 
       JOIN users u ON n.user_id = u.id 
       WHERE n.query_id = $1 
       ORDER BY n.created_at DESC`,
      [id]
    );
    const notes = notesResult.rows;

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

    const result = await db.query(
      `INSERT INTO queries 
       (contact_id, subject, description, category, priority, assigned_to, sla_deadline, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
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
        id: result.rows[0].id,
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
    const currentQueryResult = await db.query('SELECT * FROM queries WHERE id = $1', [id]);
    const currentQuery = currentQueryResult.rows;

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
       SET subject = $1, description = $2, category = $3, priority = $4, status = $5, sla_deadline = $6
       WHERE id = $7`,
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

    const result = await db.query(
      'UPDATE queries SET assigned_to = $1 WHERE id = $2 RETURNING id',
      [assigned_to, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Query not found'
      });
    }

    // Log the assignment
    await db.query(
      `INSERT INTO activity_logs (query_id, user_id, action_type, description, new_value) 
       VALUES ($1, $2, 'assigned', 'Query reassigned', $3)`,
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

    const result = await db.query(
      `UPDATE queries 
       SET status = 'Resolved', resolved_at = NOW(), resolution_notes = $1
       WHERE id = $2 RETURNING id`,
      [resolution_notes, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Query not found'
      });
    }

    // Log the resolution
    await db.query(
      `INSERT INTO activity_logs (query_id, user_id, action_type, description, new_value) 
       VALUES ($1, $2, 'resolved', 'Query marked as resolved', 'Resolved')`,
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

    const result = await db.query(
      'INSERT INTO internal_notes (query_id, user_id, note) VALUES ($1, $2, $3) RETURNING *',
      [id, req.user.id, note]
    );

    // Log the note
    await db.query(
      `INSERT INTO activity_logs (query_id, user_id, action_type, description) 
       VALUES ($1, $2, 'note_added', 'Internal note added')`,
      [id, req.user.id]
    );

    res.status(201).json({
      success: true,
      message: 'Note added successfully',
      data: {
        id: result.rows[0].id,
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
    // You may need to implement this as a PostgreSQL function or use raw SQL for batch updates
    await db.query('SELECT update_sla_status()');

    res.json({
      success: true,
      message: 'SLA status updated successfully'
    });
  } catch (error) {
    next(error);
  }
};