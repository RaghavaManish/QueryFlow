import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { validateEmail, validatePassword, validateName } from '../utils/validation';
import { Mail, Lock, User, AlertCircle, Sun, Moon, MessageSquare, UserPlus } from 'lucide-react';
import './Auth.css';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
    setServerError('');
  };

  const validateForm = () => {
    const newErrors = {};
    
    const nameError = validateName(formData.name);
    if (nameError) newErrors.name = nameError;
    
    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;
    
    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    setServerError('');

    const result = await register(formData.name, formData.email, formData.password);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setServerError(result.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <button 
        className="auth-theme-toggle" 
        onClick={toggleTheme}
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="auth-container">
        <div className="auth-card animate-slide-up">
          <div className="auth-header">
            <div className="auth-logo">
              <MessageSquare size={32} />
            </div>
            <h1 className="auth-title">Create Account</h1>
            <p className="auth-subtitle">Get started with QueryFlow today</p>
          </div>

          {serverError && (
            <div className="auth-error-banner">
              <AlertCircle size={18} />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label htmlFor="name" className="label">
                Full Name
              </label>
              <div className="input-wrapper">
                <User className="input-icon" size={20} />
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`input input-with-icon ${errors.name ? 'input-error' : ''}`}
                  placeholder="John Doe"
                  autoComplete="name"
                />
              </div>
              {errors.name && (
                <div className="error-message">
                  <AlertCircle size={14} />
                  {errors.name}
                </div>
              )}
            </div>

            <div className="input-group">
              <label htmlFor="email" className="label">
                Email Address
              </label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={20} />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`input input-with-icon ${errors.email ? 'input-error' : ''}`}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <div className="error-message">
                  <AlertCircle size={14} />
                  {errors.email}
                </div>
              )}
            </div>

            <div className="input-group">
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={20} />
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`input input-with-icon ${errors.password ? 'input-error' : ''}`}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
              {errors.password && (
                <div className="error-message">
                  <AlertCircle size={14} />
                  {errors.password}
                </div>
              )}
            </div>

            <div className="input-group">
              <label htmlFor="confirmPassword" className="label">
                Confirm Password
              </label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={20} />
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`input input-with-icon ${errors.confirmPassword ? 'input-error' : ''}`}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
              {errors.confirmPassword && (
                <div className="error-message">
                  <AlertCircle size={14} />
                  {errors.confirmPassword}
                </div>
              )}
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-lg w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner spinner-sm"></span>
                  Creating account...
                </>
              ) : (
                <>
                  <UserPlus size={20} />
                  Create Account
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p className="auth-footer-text">
              Already have an account?{' '}
              <Link to="/login" className="auth-link">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="auth-back-link">
          <Link to="/" className="auth-link">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
