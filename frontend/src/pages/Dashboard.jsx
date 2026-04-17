import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import StatusBadge from '../components/StatusBadge';
import { 
  Users, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  TrendingUp, 
  AlertTriangle 
} from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentQueries, setRecentQueries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const res = await axios.get('/api/analytics/dashboard');
      const data = res.data.data;
      setStats({
        totalQueries: data.kpis.open_queries + data.kpis.resolved_today, // or use another field if needed
        totalContacts: data.kpis.total_contacts,
        pendingQueries: data.kpis.open_queries,
        resolvedToday: data.kpis.resolved_today
      });
      setRecentQueries(data.recentQueries || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      icon: <MessageSquare size={24} />,
      label: 'Total Queries',
      value: stats?.totalQueries || 0,
      color: 'blue',
      trend: '+12%'
    },
    {
      icon: <Users size={24} />,
      label: 'Total Contacts',
      value: stats?.totalContacts || 0,
      color: 'purple',
      trend: '+8%'
    },
    {
      icon: <Clock size={24} />,
      label: 'Pending Queries',
      value: stats?.pendingQueries || 0,
      color: 'yellow',
      trend: '-3%'
    },
    {
      icon: <CheckCircle size={24} />,
      label: 'Resolved Today',
      value: stats?.resolvedToday || 0,
      color: 'green',
      trend: '+15%'
    }
  ];

  if (loading) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <main className="dashboard-main">
          <div className="loading-container">
            <div className="spinner spinner-lg"></div>
            <p>Loading dashboard...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />
      
      <main className="dashboard-main">
        <div className="dashboard-container">
          <div className="dashboard-header animate-slide-up">
            <div>
              <h1 className="dashboard-title">Dashboard</h1>
              <p className="dashboard-subtitle">Welcome back! Here's what's happening today.</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            {statCards.map((stat, index) => (
              <div 
                key={index} 
                className={`stat-card stat-card-${stat.color} animate-slide-up`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="stat-card-content">
                  <div className="stat-card-header">
                    <div className={`stat-icon stat-icon-${stat.color}`}>
                      {stat.icon}
                    </div>
                    <span className={`stat-trend stat-trend-${stat.trend.startsWith('+') ? 'positive' : 'negative'}`}>
                      {stat.trend}
                    </span>
                  </div>
                  <div className="stat-card-body">
                    <div className="stat-value">{stat.value}</div>
                    <div className="stat-label">{stat.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Queries */}
          <div className="dashboard-section animate-slide-up" style={{ animationDelay: '200ms' }}>
            <div className="section-header">
              <h2 className="section-title">Recent Queries</h2>
              <Link to="/queries" className="section-link">
                View all
              </Link>
            </div>

            <div className="queries-list">
              {recentQueries.length > 0 ? (
                recentQueries.map((query) => (
                  <div key={query.id} className="query-item">
                    <div className="query-item-main">
                      <div className="query-item-header">
                        <span className="query-id">#{query.id}</span>
                        <StatusBadge status={query.status} type="status" />
                      </div>
                      <h3 className="query-title">{query.subject}</h3>
                      <p className="query-meta">
                        {query.contact_name} • {new Date(query.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="query-item-side">
                      <StatusBadge priority={query.priority} type="priority" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <MessageSquare size={48} />
                  <p>No recent queries</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="quick-actions animate-slide-up" style={{ animationDelay: '300ms' }}>
            <h2 className="section-title">Quick Actions</h2>
            <div className="quick-actions-grid">
              <Link to="/contacts" className="quick-action-card">
                <Users size={24} />
                <span>Manage Contacts</span>
              </Link>
              <Link to="/queries" className="quick-action-card">
                <MessageSquare size={24} />
                <span>View Queries</span>
              </Link>
              <button className="quick-action-card">
                <AlertTriangle size={24} />
                <span>Overdue Items</span>
              </button>
              <button className="quick-action-card">
                <TrendingUp size={24} />
                <span>Analytics</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
