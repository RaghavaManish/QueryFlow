const db = require('../config/database');

// @desc    Get dashboard KPIs and stats
// @route   GET /api/analytics/dashboard
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
  try {
    // KPI Cards
    const kpisResult = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM contacts) as total_contacts,
        (SELECT COUNT(*) FROM queries WHERE status IN ('Open', 'Pending', 'In Progress')) as open_queries,
        (SELECT COUNT(*) FROM queries WHERE status = 'Resolved' AND DATE(resolved_at) = CURRENT_DATE) as resolved_today,
        (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600), 1) 
         FROM queries WHERE status = 'Resolved' AND resolved_at >= NOW() - INTERVAL '30 days') as avg_response_time_hours
    `);
    const kpis = kpisResult.rows;

    // Query by category
    const queryByCategoryResult = await db.query(`
      SELECT category, COUNT(*) as count
      FROM queries
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY category
      ORDER BY count DESC
    `);
    const queryByCategory = queryByCategoryResult.rows;

    // Query by status
    const queryByStatusResult = await db.query(`
      SELECT status, COUNT(*) as count
      FROM queries
      GROUP BY status
    `);
    const queryByStatus = queryByStatusResult.rows;

    // Recent queries
    const recentQueriesResult = await db.query(`
      SELECT q.id, q.subject, q.priority, q.status, q.created_at,
             c.name as contact_name,
             u.name as assigned_to_name
      FROM queries q
      JOIN contacts c ON q.contact_id = c.id
      LEFT JOIN users u ON q.assigned_to = u.id
      ORDER BY q.created_at DESC
      LIMIT 10
    `);
    const recentQueries = recentQueriesResult.rows;

    // Recent activity
    const recentActivityResult = await db.query(`
      SELECT a.*, u.name as user_name, q.subject as query_subject
      FROM activity_logs a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN queries q ON a.query_id = q.id
      ORDER BY a.created_at DESC
      LIMIT 15
    `);
    const recentActivity = recentActivityResult.rows;

    // Team performance
    const teamPerformanceResult = await db.query(`
      SELECT 
        u.id,
        u.name,
        COUNT(q.id) as total_assigned,
        SUM(CASE WHEN q.status = 'Resolved' THEN 1 ELSE 0 END) as resolved_count,
        SUM(CASE WHEN q.status IN ('Open', 'Pending', 'In Progress') THEN 1 ELSE 0 END) as open_count,
        ROUND(AVG(CASE 
          WHEN q.status = 'Resolved' AND q.resolved_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (q.resolved_at - q.created_at))/3600
          ELSE NULL 
        END), 1) as avg_resolution_hours
      FROM users u
      LEFT JOIN queries q ON u.id = q.assigned_to
      WHERE u.role IN ('agent', 'manager')
      GROUP BY u.id, u.name
      ORDER BY resolved_count DESC
    `);
    const teamPerformance = teamPerformanceResult.rows;

    // Add unassigned queries
    const unassignedResult = await db.query(`
      SELECT 
        'Unassigned' as name,
        COUNT(*) as total_assigned,
        0 as resolved_count,
        COUNT(*) as open_count,
        NULL::float as avg_resolution_hours
      FROM queries
      WHERE assigned_to IS NULL
    `);
    const unassigned = unassignedResult.rows;

    // Quick stats
    const quickStatsResult = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM queries WHERE is_overdue = TRUE) as overdue,
        (SELECT COUNT(*) FROM queries WHERE status = 'Escalated') as escalated,
        (SELECT COUNT(*) FROM queries WHERE sla_breached = TRUE) as sla_breached,
        (SELECT COUNT(*) FROM queries WHERE status = 'Resolved' AND resolved_at >= NOW() - INTERVAL '7 days') as resolved_this_week
    `);
    const quickStats = quickStatsResult.rows;

    res.json({
      success: true,
      data: {
        kpis: kpis[0],
        queryByCategory,
        queryByStatus,
        recentQueries,
        recentActivity,
        teamPerformance: [...teamPerformance, ...unassigned],
        quickStats: quickStats[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get query trends (for charts)
// @route   GET /api/analytics/trends
// @access  Private
exports.getQueryTrends = async (req, res, next) => {
  try {
    const { period = '7days' } = req.query;

    let interval;
    switch (period) {
      case '24hours':
        interval = "'24 hours'";
        break;
      case '7days':
        interval = "'7 days'";
        break;
      case '30days':
        interval = "'30 days'";
        break;
      case '90days':
        interval = "'90 days'";
        break;
      default:
        interval = "'7 days'";
    }

    const trendsResult = await db.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN status IN ('Open', 'Pending', 'In Progress') THEN 1 ELSE 0 END) as active
      FROM queries
      WHERE created_at >= NOW() - INTERVAL ${interval}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    const trends = trendsResult.rows;

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get performance metrics
// @route   GET /api/analytics/performance
// @access  Private
exports.getPerformanceMetrics = async (req, res, next) => {
  try {
    const metricsResult = await db.query(`
      SELECT 
        ROUND(AVG(CASE 
          WHEN status = 'Resolved' AND resolved_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (resolved_at - created_at))/3600
          ELSE NULL 
        END), 1) as avg_resolution_time,
        ROUND(AVG(CASE 
          WHEN status = 'Resolved' AND resolved_at IS NOT NULL AND sla_breached = FALSE
          THEN EXTRACT(EPOCH FROM (resolved_at - created_at))/3600
          ELSE NULL 
        END), 1) as avg_resolution_time_within_sla,
        ROUND((SUM(CASE WHEN sla_breached = FALSE THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*),0)) * 100, 1) as sla_compliance_rate,
        ROUND((SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*),0)) * 100, 1) as resolution_rate
      FROM queries
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);
    const metrics = metricsResult.rows;

    res.json({
      success: true,
      data: metrics[0]
    });
  } catch (error) {
    next(error);
  }
};