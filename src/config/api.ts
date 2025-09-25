// API Configuration
const getApiBaseUrl = () => {
  // If running in production, use relative path since frontend and backend are served from same domain
  if (import.meta.env.PROD) {
    return '/api';
  }
  
  // If VITE_API_URL is set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // For local development, try to detect if we're on mobile
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8080/api';
  } else {
    // We're probably accessing via IP address (mobile device)
    return `http://${hostname}:8080/api`;
  }
};

export const API_BASE_URL = getApiBaseUrl();

export const API_CONFIG = {
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
};
