const db = require('../config/database');

// @desc    Get activity logs with filters
// @route   GET /api/activities
// @access  Private
exports.getActivities = async (req, res, next) => {
  try {
    const { query_id, user_id, action_type, limit = 50 } = req.query;

    let query = `
      SELECT a.*, 
             u.name as user_name,
             q.subject as query_subject
      FROM activity_logs a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN queries q ON a.query_id = q.id
      WHERE 1=1
    `;
    const params = [];

    if (query_id) {
      query += ' AND a.query_id = ?';
      params.push(query_id);
    }

    if (user_id) {
      query += ' AND a.user_id = ?';
      params.push(user_id);
    }

    if (action_type) {
      query += ' AND a.action_type = ?';
      params.push(action_type);
    }

    query += ' ORDER BY a.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const [activities] = await db.query(query, params);

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    next(error);
  }
};