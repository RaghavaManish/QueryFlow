import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { 
  Menu, 
  X, 
  Sun, 
  Moon, 
  Users, 
  MessageSquare, 
  Clock, 
  BarChart3, 
  CheckCircle, 
  Star,
  ChevronRight,
  Zap
} from 'lucide-react';
import { useState } from 'react';
import './Home.css';

const Home = () => {
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      icon: <Users size={24} />,
      title: 'Contact Management',
      description: 'Centralize all your contacts with tags, notes, and complete interaction history.'
    },
    {
      icon: <MessageSquare size={24} />,
      title: 'Query Tracking',
      description: 'Track every customer query with priority levels, categories, and real-time status updates.'
    },
    {
      icon: <Clock size={24} />,
      title: 'SLA Monitoring',
      description: 'Never miss a deadline with automated SLA tracking and breach alerts for timely responses.'
    },
    {
      icon: <BarChart3 size={24} />,
      title: 'Advanced Analytics',
      description: 'Gain insights with powerful analytics, trend charts, and performance metrics.'
    },
    {
      icon: <CheckCircle size={24} />,
      title: 'Team Collaboration',
      description: 'Intelligently assign queries to team members and monitor workload distribution.'
    },
    {
      icon: <Zap size={24} />,
      title: 'Real-time Updates',
      description: 'Stay informed with instant notifications and activity timeline for every interaction.'
    }
  ];

  const stats = [
    { value: '10K+', label: 'Active Users' },
    { value: '<2h', label: 'Avg Response Time' },
    { value: '98%', label: 'Resolution Rate' },
    { value: '24/7', label: 'Support Available' }
  ];

  return (
    <div className="home-page">
      {/* Navigation */}
      <nav className="home-nav">
        <div className="home-nav-container">
          <div className="home-nav-brand">
            <div className="home-logo">
              <MessageSquare size={28} />
            </div>
            <span className="home-brand-text gradient-text">QueryFlow</span>
          </div>

          {/* Desktop Menu */}
          <div className="home-nav-menu">
            <a href="#features" className="home-nav-link">Features</a>
            <a href="#stats" className="home-nav-link">Why Us</a>
            <button onClick={toggleTheme} className="home-theme-btn" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <Link to="/login" className="btn btn-primary btn-sm">
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="home-mobile-toggle" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="home-mobile-menu">
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#stats" onClick={() => setMobileMenuOpen(false)}>Why Us</a>
            <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
              Get Started
            </Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="home-hero">
        <div className="container">
          <div className="home-hero-content animate-slide-up">
            <div className="home-hero-badge">
              <Zap size={16} />
              <span>Modern Contact & Query Management</span>
            </div>
            
            <h1 className="home-hero-title">
              Manage Queries Like
              <span className="gradient-text"> Never Before</span>
            </h1>
            
            <p className="home-hero-description">
              Streamline your customer support workflow with intelligent query routing,
              real-time tracking, and powerful analytics. Everything you need in one place.
            </p>
            
            <div className="home-hero-actions">
              <Link to="/register" className="btn btn-primary btn-lg">
                Start Free Trial
                <ChevronRight size={20} />
              </Link>
              <Link to="/login" className="btn btn-outline btn-lg">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="home-stats">
        <div className="container">
          <div className="home-stats-grid">
            {stats.map((stat, index) => (
              <div key={index} className="home-stat-card animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="home-stat-value">{stat.value}</div>
                <div className="home-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="home-features">
        <div className="container">
          <div className="home-section-header">
            <h2 className="home-section-title">Powerful Features</h2>
            <p className="home-section-description">
              Everything you need to deliver exceptional customer support
            </p>
          </div>

          <div className="home-features-grid">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="home-feature-card animate-slide-up" 
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="home-feature-icon">
                  {feature.icon}
                </div>
                <h3 className="home-feature-title">{feature.title}</h3>
                <p className="home-feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="home-cta">
        <div className="container">
          <div className="home-cta-content">
            <h2 className="home-cta-title">Ready to Transform Your Support?</h2>
            <p className="home-cta-description">
              Join thousands of teams managing queries more efficiently
            </p>
            <Link to="/register" className="btn btn-primary btn-lg">
              Start Free Trial
              <ChevronRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="container">
          <div className="home-footer-content">
            <div className="home-footer-brand">
              <div className="home-logo">
                <MessageSquare size={24} />
              </div>
              <span className="home-brand-text">QueryFlow</span>
            </div>
            <p className="home-footer-text">
              © {new Date().getFullYear()} QueryFlow. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
