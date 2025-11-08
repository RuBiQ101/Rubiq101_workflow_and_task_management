// Re-export the API client with axios-like interface
import { api as apiClient } from './apiClient.js';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Create axios instance with better logging
const axiosInstance = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Enhanced request interceptor with logging
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.group(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    console.log('Full URL:', config.baseURL + config.url);
    console.log('Headers:', config.headers);
    console.log('Data:', config.data);
    console.log('Token exists:', !!token);
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ Authorization header added');
    } else {
      console.warn('⚠️ No token found in localStorage');
      // Don't add Authorization header if no token
      delete config.headers.Authorization;
    }
    
    console.groupEnd();
    return config;
  },
  (error) => {
    console.error('❌ Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

// Enhanced response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    console.group(`✅ API Response: ${response.status} ${response.config.url}`);
    console.log('Status:', response.status);
    console.log('Data:', response.data);
    console.log('Headers:', response.headers);
    console.groupEnd();
    return response;
  },
  (error) => {
    console.group(`❌ API Error: ${error.config?.url}`);
    console.log('Error Message:', error.message);
    console.log('Status Code:', error.response?.status);
    console.log('Response Data:', error.response?.data);
    console.log('Request Config:', error.config);
    console.groupEnd();
    
    if (error.response?.status === 401) {
      console.log('🛡️ Unauthorized - redirecting to login');
      localStorage.removeItem('token');
      // Use window.location instead of navigate for reliability
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/debug')) {
        window.location.href = '/login';
      }
    }
    
    // Handle 500 errors specifically
    if (error.response?.status === 500) {
      console.error('🔥 Server Error - check backend logs');
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
