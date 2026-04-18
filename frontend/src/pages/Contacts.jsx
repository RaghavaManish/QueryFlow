import { useState, useEffect } from 'react';
import api from '../utils/api';
import Sidebar from '../components/Sidebar';
import StatusBadge from '../components/StatusBadge';
import { Search, Plus, X, Mail, Phone, Building, User } from 'lucide-react';
import './Contacts.css';

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  
  // NEW: State for Add Contact Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    tag: 'Lead'
  });

  const tags = ['All', 'Customer', 'Lead', 'Director', 'Partner', 'VIP', 'Inactive'];

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    filterContacts();
  }, [searchTerm, selectedTag, contacts]);

  const loadContacts = async () => {
    try {
      const response = await api.get('/contacts');
      setContacts(response.data.data || []);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Failed to load contacts:', error);
      // Mock data for demo
      setContacts([
        { id: 1, name: 'John Doe', email: 'john@example.com', phone: '+1234567890', company: 'Tech Corp', tag: 'Customer' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', phone: '+1234567891', company: 'StartupHub', tag: 'Lead' }
      ]);
      setStats({ total: 2, added_this_month: 2, customer_count: 1, lead_count: 1 });
    } finally {
      setLoading(false);
    }
  };

  const filterContacts = () => {
    let filtered = contacts;
    
    if (searchTerm) {
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedTag !== 'All') {
      filtered = filtered.filter(contact => contact.tag === selectedTag);
    }
    
    setFilteredContacts(filtered);
  };

  const loadContactDetails = (contact) => {
    setSelectedContact(contact);
    setShowDetailPanel(true);
  };

  // NEW: Handle Add Contact Modal
  const handleAddContactClick = () => {
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setNewContact({
      name: '',
      email: '',
      phone: '',
      company: '',
      tag: 'Lead'
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewContact(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitContact = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!newContact.name || !newContact.email) {
      alert('Please fill in name and email fields');
      return;
    }

    try {
      // Try to submit to API
      const response = await api.post('/contacts', newContact);
      const addedContact = response.data;
      
      // Update contacts list
      setContacts(prev => [...prev, addedContact]);
      
      // Update stats
      setStats(prev => ({
        ...prev,
        total: (prev?.total || 0) + 1,
        added_this_month: (prev?.added_this_month || 0) + 1,
        customer_count: prev?.customer_count + (newContact.tag === 'Customer' ? 1 : 0),
        lead_count: prev?.lead_count + (newContact.tag === 'Lead' ? 1 : 0)
      }));
      
      handleCloseAddModal();
    } catch (error) {
      console.error('Failed to add contact:', error);
      
      // Fallback: Add locally if API fails
      const localContact = {
        id: Date.now(), // Generate temporary ID
        ...newContact
      };
      
      setContacts(prev => [...prev, localContact]);
      
      // Update stats
      setStats(prev => ({
        total: (prev?.total || 0) + 1,
        added_this_month: (prev?.added_this_month || 0) + 1,
        customer_count: (prev?.customer_count || 0) + (newContact.tag === 'Customer' ? 1 : 0),
        lead_count: (prev?.lead_count || 0) + (newContact.tag === 'Lead' ? 1 : 0)
      }));
      
      handleCloseAddModal();
    }
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <main className="dashboard-main">
          <div className="loading-container">
            <div className="spinner spinner-lg"></div>
            <p>Loading contacts...</p>
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
              <h1 className="dashboard-title">Contacts</h1>
              <p className="dashboard-subtitle">Manage your contacts and relationships</p>
            </div>
            <button className="btn btn-primary" onClick={handleAddContactClick}>
              <Plus size={20} />
              Add Contact
            </button>
          </div>

          {/* Stats Cards */}
          <div className="contact-stats">
            <div className="stat-mini">
              <div className="stat-mini-value">{stats?.total || 0}</div>
              <div className="stat-mini-label">Total Contacts</div>
            </div>
            <div className="stat-mini">
              <div className="stat-mini-value">{stats?.added_this_month || 0}</div>
              <div className="stat-mini-label">Added This Month</div>
            </div>
            <div className="stat-mini">
              <div className="stat-mini-value">{stats?.customer_count || 0}</div>
              <div className="stat-mini-label">Customers</div>
            </div>
            <div className="stat-mini">
              <div className="stat-mini-value">{stats?.lead_count || 0}</div>
              <div className="stat-mini-label">Leads</div>
            </div>
          </div>

          {/* Filters */}
          <div className="contacts-filters">
            <div className="search-box">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            
            <div className="tag-filters">
              {tags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`tag-filter ${selectedTag === tag ? 'tag-filter-active' : ''}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Contacts Table */}
          <div className="contacts-table-container">
            <table className="contacts-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Company</th>
                  <th>Tag</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact) => (
                  <tr key={contact.id}>
                    <td>
                      <div className="contact-name-cell">
                        <div className="contact-avatar">
                          {getInitials(contact.name)}
                        </div>
                        <span className="contact-name">{contact.name}</span>
                      </div>
                    </td>
                    <td>{contact.email}</td>
                    <td>{contact.phone || '-'}</td>
                    <td>{contact.company || '-'}</td>
                    <td><StatusBadge tag={contact.tag} type="tag" /></td>
                    <td>
                      <button 
                        onClick={() => loadContactDetails(contact)}
                        className="btn-view"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredContacts.length === 0 && (
              <div className="empty-state">
                <User size={48} />
                <p>No contacts found</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Contact Modal */}
      {showAddModal && (
        <>
          <div className="modal-overlay" onClick={handleCloseAddModal}></div>
          <div className="modal animate-scale-up">
            <div className="modal-header">
              <h2 className="modal-title">Add New Contact</h2>
              <button onClick={handleCloseAddModal} className="modal-close">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitContact} className="modal-form">
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={newContact.name}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email <span className="text-danger">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={newContact.email}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="email@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone" className="form-label">Phone</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={newContact.phone}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="+1234567890"
                />
              </div>

              <div className="form-group">
                <label htmlFor="company" className="form-label">Company</label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={newContact.company}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Company name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="tag" className="form-label">Tag</label>
                <select
                  id="tag"
                  name="tag"
                  value={newContact.tag}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  {tags.filter(tag => tag !== 'All').map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={handleCloseAddModal}
                  className="btn-btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Plus size={18} />
                  Add Contact
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Detail Panel */}
      {showDetailPanel && selectedContact && (
        <div className="detail-panel animate-slide-left">
          <div className="detail-panel-header">
            <h2 className="detail-panel-title">Contact Details</h2>
            <button 
              onClick={() => setShowDetailPanel(false)}
              className="detail-panel-close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="detail-panel-content">
            <div className="contact-profile">
              <div className="contact-avatar-large">
                {getInitials(selectedContact.name)}
              </div>
              <h3 className="contact-detail-name">{selectedContact.name}</h3>
              <StatusBadge tag={selectedContact.tag} type="tag" />
            </div>

            <div className="contact-info">
              <div className="contact-info-item">
                <Mail size={18} />
                <span>{selectedContact.email}</span>
              </div>
              {selectedContact.phone && (
                <div className="contact-info-item">
                  <Phone size={18} />
                  <span>{selectedContact.phone}</span>
                </div>
              )}
              {selectedContact.company && (
                <div className="contact-info-item">
                  <Building size={18} />
                  <span>{selectedContact.company}</span>
                </div>
              )}
            </div>
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

export default Contacts;