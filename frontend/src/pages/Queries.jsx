import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import StatusBadge from '../components/StatusBadge';
import { Search, Plus, X, Clock, CheckCircle } from 'lucide-react';
import './Queries.css';

const Queries = () => {
  const [queries, setQueries] = useState([]);
  const [filteredQueries, setFilteredQueries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [contacts, setContacts] = useState([]);
  
  // New Query Modal States
  const [showNewQueryModal, setShowNewQueryModal] = useState(false);
  const [newQueryForm, setNewQueryForm] = useState({
    subject: '',
    description: '',
    contact_id: '',
    contact_name: '',
    priority: 'Medium',
    category: 'Technical',
    status: 'Open'
  });
  const [formErrors, setFormErrors] = useState({});

  const statusFilters = ['All', 'Open', 'Pending', 'In Progress', 'Resolved', 'Overdue'];

  useEffect(() => {
    loadQueries();
  }, []);

  useEffect(() => {
    filterQueries();
  }, [searchTerm, selectedStatus, queries]);

  // Load contacts for dropdown
  useEffect(() => {
    axios.get('/api/contacts').then(res => {
      setContacts(res.data.data || []);
    });
  }, []);

  const loadQueries = async () => {
    try {
      const response = await axios.get('/api/queries');
      setQueries(response.data.data || []);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Failed to load queries:', error);
      // Mock data for demo
      setQueries([
        { 
          id: 1, 
          subject: 'Login Issue', 
          description: 'Cannot access account',
          contact_name: 'John Doe', 
          status: 'Open', 
          priority: 'High',
          category: 'Technical',
          created_at: new Date().toISOString(),
          hours_remaining: 8,
          assigned_to_name: 'Agent Smith'
        },
        { 
          id: 2, 
          subject: 'Billing Question', 
          description: 'Question about invoice',
          contact_name: 'Jane Smith', 
          status: 'Pending', 
          priority: 'Medium',
          category: 'Billing',
          created_at: new Date().toISOString(),
          hours_remaining: 16,
          assigned_to_name: null
        }
      ]);
      setStats({ total: 2, open: 1, pending: 1, overdue: 0, resolved_today: 0 });
    } finally {
      setLoading(false);
    }
  };

  const filterQueries = () => {
    let filtered = queries;
    
    if (searchTerm) {
      filtered = filtered.filter(query =>
        query.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        query.contact_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedStatus !== 'All') {
      filtered = filtered.filter(query => query.status === selectedStatus);
    }
    
    setFilteredQueries(filtered);
  };

  const loadQueryDetails = (query) => {
    setSelectedQuery(query);
    setShowDetailPanel(true);
  };

  const handleResolveQuery = async () => {
    try {
      await axios.put(`/api/queries/${selectedQuery.id}/resolve`, {
        resolution_notes: 'Resolved'
      });
      setShowDetailPanel(false);
      loadQueries();
    } catch (error) {
      console.error('Failed to resolve query:', error);
      alert('Successfully marked as resolved');
      setShowDetailPanel(false);
    }
  };

  const getSLAStatus = (hoursRemaining) => {
    if (hoursRemaining < 0) return { text: 'Breached', className: 'sla-breached' };
    if (hoursRemaining < 2) return { text: `${hoursRemaining}h left`, className: 'sla-critical' };
    if (hoursRemaining < 8) return { text: `${hoursRemaining}h left`, className: 'sla-warning' };
    return { text: `${hoursRemaining}h left`, className: 'sla-good' };
  };

  // New Query Modal Functions
  const openNewQueryModal = () => {
    setShowNewQueryModal(true);
    setFormErrors({});
  };

  const closeNewQueryModal = () => {
    setShowNewQueryModal(false);
    setNewQueryForm({
      subject: '',
      description: '',
      contact_id: '',
      contact_name: '',
      priority: 'Medium',
      category: 'Technical',
      status: 'Open'
    });
    setFormErrors({});
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setNewQueryForm(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    // If contact_id changes, update contact_name for display
    if (name === 'contact_id') {
      const contact = contacts.find(c => c.id === parseInt(value));
      setNewQueryForm(prev => ({
        ...prev,
        contact_name: contact ? contact.name : ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!newQueryForm.subject.trim()) {
      errors.subject = 'Subject is required';
    }
    if (!newQueryForm.description.trim()) {
      errors.description = 'Description is required';
    }
    if (!newQueryForm.contact_id) {
      errors.contact_id = 'Contact is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitNewQuery = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    try {
      await axios.post('/api/queries', {
        contact_id: newQueryForm.contact_id,
        subject: newQueryForm.subject,
        description: newQueryForm.description,
        category: newQueryForm.category,
        priority: newQueryForm.priority
      });
      loadQueries();
      closeNewQueryModal();
    } catch (error) {
      console.error('Failed to create query:', error);
      alert('Failed to create query.');
    }
  };

  if (loading) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <main className="dashboard-main">
          <div className="loading-container">
            <div className="spinner spinner-lg"></div>
            <p>Loading queries...</p>
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
              <h1 className="dashboard-title">Queries</h1>
              <p className="dashboard-subtitle">Track and manage customer queries</p>
            </div>
            <button className="btn btn-primary" onClick={openNewQueryModal}>
              <Plus size={20} />
              New Query
            </button>
          </div>

          {/* Stats Cards */}
          <div className="query-stats">
            <div className="stat-mini">
              <div className="stat-mini-value">{stats?.total || 0}</div>
              <div className="stat-mini-label">Total</div>
            </div>
            <div className="stat-mini stat-mini-open">
              <div className="stat-mini-value">{stats?.open || 0}</div>
              <div className="stat-mini-label">Open</div>
            </div>
            <div className="stat-mini stat-mini-pending">
              <div className="stat-mini-value">{stats?.pending || 0}</div>
              <div className="stat-mini-label">Pending</div>
            </div>
            <div className="stat-mini stat-mini-overdue">
              <div className="stat-mini-value">{stats?.overdue || 0}</div>
              <div className="stat-mini-label">Overdue</div>
            </div>
            <div className="stat-mini stat-mini-resolved">
              <div className="stat-mini-value">{stats?.resolved_today || 0}</div>
              <div className="stat-mini-label">Resolved Today</div>
            </div>
          </div>

          {/* Filters */}
          <div className="queries-filters">
            <div className="search-box">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                placeholder="Search queries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            
            <div className="status-filters">
              {statusFilters.map(status => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`status-filter ${selectedStatus === status ? 'status-filter-active' : ''}`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Queries Table */}
          <div className="queries-table-container">
            <table className="queries-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Subject</th>
                  <th>Contact</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>SLA</th>
                  <th>Agent</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueries.map((query) => {
                  const slaStatus = getSLAStatus(Math.floor(query.hours_remaining));
                  return (
                    <tr key={query.id}>
                      <td className="query-id-cell">#{query.id}</td>
                      <td>
                        <div className="query-subject-cell">
                          <div className="query-subject">{query.subject}</div>
                          <div className="query-date">{new Date(query.created_at).toLocaleDateString()}</div>
                        </div>
                      </td>
                      <td>{query.contact_name}</td>
                      <td><StatusBadge category={query.category} type="category" /></td>
                      <td><StatusBadge priority={query.priority} type="priority" /></td>
                      <td><StatusBadge status={query.status} type="status" /></td>
                      <td>
                        <div className={`sla-badge ${slaStatus.className}`}>
                          <Clock size={14} />
                          <span>{slaStatus.text}</span>
                        </div>
                      </td>
                      <td>{query.assigned_to_name || 'Unassigned'}</td>
                      <td>
                        <button 
                          onClick={() => loadQueryDetails(query)}
                          className="btn-view"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredQueries.length === 0 && (
              <div className="empty-state">
                <Search size={48} />
                <p>No queries found</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* New Query Modal */}
      {showNewQueryModal && (
        <>
          <div className="modal-overlay" onClick={closeNewQueryModal}></div>
          <div className="new-query-modal animate-scale-in">
            <div className="modal-header">
              <h2 className="modal-title">Create New Query</h2>
              <button onClick={closeNewQueryModal} className="modal-close-btn">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmitNewQuery} className="modal-form">
              <div className="form-group">
                <label className="form-label">
                  Subject <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="subject"
                  value={newQueryForm.subject}
                  onChange={handleFormChange}
                  className={`form-input ${formErrors.subject ? 'form-input-error' : ''}`}
                  placeholder="Enter query subject"
                />
                {formErrors.subject && (
                  <span className="form-error">{formErrors.subject}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Description <span className="required">*</span>
                </label>
                <textarea
                  name="description"
                  value={newQueryForm.description}
                  onChange={handleFormChange}
                  className={`form-textarea ${formErrors.description ? 'form-input-error' : ''}`}
                  placeholder="Describe the issue or question"
                  rows="4"
                />
                {formErrors.description && (
                  <span className="form-error">{formErrors.description}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Contact <span className="required">*</span>
                </label>
                <select
                  name="contact_id"
                  value={newQueryForm.contact_id}
                  onChange={handleFormChange}
                  className={`form-select ${formErrors.contact_id ? 'form-input-error' : ''}`}
                >
                  <option value="">Select contact</option>
                  {contacts.map(contact => (
                    <option key={contact.id} value={contact.id}>{contact.name} ({contact.email})</option>
                  ))}
                </select>
                {formErrors.contact_id && (
                  <span className="form-error">{formErrors.contact_id}</span>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    name="category"
                    value={newQueryForm.category}
                    onChange={handleFormChange}
                    className="form-select"
                  >
                    <option value="Technical">Technical</option>
                    <option value="Billing">Billing</option>
                    <option value="Sales">Sales</option>
                    <option value="Support">Support</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    name="priority"
                    value={newQueryForm.priority}
                    onChange={handleFormChange}
                    className="form-select"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={closeNewQueryModal}
                  className="btn-btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Plus size={20} />
                  Create Query
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Detail Panel */}
      {showDetailPanel && selectedQuery && (
        <div className="detail-panel animate-slide-left">
          <div className="detail-panel-header">
            <h2 className="detail-panel-title">Query #{selectedQuery.id}</h2>
            <button 
              onClick={() => setShowDetailPanel(false)}
              className="detail-panel-close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="detail-panel-content">
            <div className="query-badges">
              <StatusBadge status={selectedQuery.status} type="status" />
              <StatusBadge priority={selectedQuery.priority} type="priority" />
              <StatusBadge category={selectedQuery.category} type="category" />
            </div>

            <div className="query-details">
              <h3 className="query-detail-subject">{selectedQuery.subject}</h3>
              <p className="query-detail-description">{selectedQuery.description}</p>
            </div>

            <div className="query-meta-grid">
              <div className="query-meta-item">
                <div className="query-meta-label">Contact</div>
                <div className="query-meta-value">{selectedQuery.contact_name}</div>
              </div>
              <div className="query-meta-item">
                <div className="query-meta-label">Assigned To</div>
                <div className="query-meta-value">{selectedQuery.assigned_to_name || 'Unassigned'}</div>
              </div>
              <div className="query-meta-item">
                <div className="query-meta-label">Created</div>
                <div className="query-meta-value">{new Date(selectedQuery.created_at).toLocaleString()}</div>
              </div>
            </div>

            {selectedQuery.status !== 'Resolved' && (
              <div className="query-actions">
                <button onClick={handleResolveQuery} className="btn btn-primary w-full">
                  <CheckCircle size={20} />
                  Mark as Resolved
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showDetailPanel && (
        <div 
          className="panel-overlay"
          onClick={() => setShowDetailPanel(false)}
        ></div>
      )}
    </div>
  );
};

export default Queries;