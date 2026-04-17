import './StatusBadge.css';

const StatusBadge = ({ status, priority, category, tag, type }) => {
  const getBadgeConfig = () => {
    if (type === 'status' && status) {
      const statusMap = {
        'Open': { className: 'badge-status-open', label: 'Open' },
        'Pending': { className: 'badge-status-pending', label: 'Pending' },
        'In Progress': { className: 'badge-status-progress', label: 'In Progress' },
        'Resolved': { className: 'badge-status-resolved', label: 'Resolved' },
        'Closed': { className: 'badge-status-closed', label: 'Closed' },
        'Overdue': { className: 'badge-status-overdue', label: 'Overdue' },
        'Escalated': { className: 'badge-status-escalated', label: 'Escalated' }
      };
      return statusMap[status] || { className: 'badge-gray', label: status };
    }
    
    if (type === 'priority' && priority) {
      const priorityMap = {
        'Low': { className: 'badge-priority-low', label: 'Low' },
        'Medium': { className: 'badge-priority-medium', label: 'Medium' },
        'High': { className: 'badge-priority-high', label: 'High' },
        'Urgent': { className: 'badge-priority-urgent', label: 'Urgent' }
      };
      return priorityMap[priority] || { className: 'badge-gray', label: priority };
    }
    
    if (type === 'category' && category) {
      const categoryMap = {
        'Technical': { className: 'badge-category-technical', label: 'Technical' },
        'Billing': { className: 'badge-category-billing', label: 'Billing' },
        'General': { className: 'badge-category-general', label: 'General' },
        'Support': { className: 'badge-category-support', label: 'Support' },
        'Feature Request': { className: 'badge-category-feature', label: 'Feature' },
        'Bug': { className: 'badge-category-bug', label: 'Bug' }
      };
      return categoryMap[category] || { className: 'badge-gray', label: category };
    }
    
    if (type === 'tag' && tag) {
      const tagMap = {
        'Customer': { className: 'badge-tag-customer', label: 'Customer' },
        'Lead': { className: 'badge-tag-lead', label: 'Lead' },
        'VIP': { className: 'badge-tag-vip', label: 'VIP' },
        'Partner': { className: 'badge-tag-partner', label: 'Partner' },
        'Inactive': { className: 'badge-tag-inactive', label: 'Inactive' }
      };
      return tagMap[tag] || { className: 'badge-gray', label: tag };
    }
    
    return { className: 'badge-gray', label: 'Unknown' };
  };

  const config = getBadgeConfig();

  return (
    <span className={`badge ${config.className}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;