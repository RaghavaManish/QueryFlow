const db = require('../config/database');

// @desc    Get all users/agents
// @route   GET /api/users
// @access  Private
exports.getUsers = async (req, res, next) => {
  try {
    const { role } = req.query;

    let query = 'SELECT id, name, email, role, is_active, created_at FROM users WHERE 1=1';
    const params = [];
    let paramIdx = 1;

    if (role) {
      query += ` AND role = $${paramIdx}`;
      params.push(role);
      paramIdx++;
    }

    query += ' ORDER BY name ASC';

    const usersResult = await db.query(query, params);

    res.json({
      success: true,
      data: usersResult.rows
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user by ID
// @route   GET /api/users/:id
// @access  Private
exports.getUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const usersResult = await db.query(
      'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = $1',
      [id]
    );
    const users = usersResult.rows;

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's query stats
    const statsResult = await db.query(`
      SELECT 
        COUNT(*) as total_assigned,
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved_count,
        SUM(CASE WHEN status IN ('Open', 'Pending', 'In Progress') THEN 1 ELSE 0 END) as open_count
      FROM queries
      WHERE assigned_to = $1
    `, [id]);

    res.json({
      success: true,
      data: {
        ...users[0],
        stats: statsResult.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin only)
exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, is_active } = req.body;

    const result = await db.query(
      'UPDATE users SET name = $1, email = $2, role = $3, is_active = $4 WHERE id = $5',
      [name, email, role, is_active, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error) {
    next(error);
  }
};