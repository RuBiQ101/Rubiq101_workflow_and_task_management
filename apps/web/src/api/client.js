// Re-export the API client with axios-like interface
import { api as apiClient } from './apiClient.js';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Request with auth token to:', config.url);
    } else {
      console.warn('No token found in localStorage for request:', config.url);
      // Don't add Authorization header if no token
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    if (error.response?.status === 401) {
      console.log('Unauthorized - clearing token and redirecting to login');
      localStorage.removeItem('token');
      // Use window.location instead of navigate for reliability
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    // Handle 500 errors specifically
    if (error.response?.status === 500) {
      console.error('Server error details:', error.response.data);
    }
    
    return Promise.reject(error);
  }
);

// Export both the fetch-based API and axios instance
export const api = apiClient;
export default axiosInstance;

// Health check function
export const checkAPIHealth = async () => {
  try {
    console.log('Checking API health at:', `${API_BASE}/health`);
    const response = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const isHealthy = response.ok;
    console.log('API health check result:', isHealthy, 'Status:', response.status);
    return isHealthy;
  } catch (error) {
    console.error('API health check failed:', error.message);
    return false;
  }
};
