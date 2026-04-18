import axios from 'axios';

// Use /api as prefix for all API calls
const API_BASE_URL = (import.meta.env.VITE_API_URL || '') + '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

export default api;
