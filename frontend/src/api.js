import axios from 'axios';

// Base URL: use env variable in production, fallback to localhost for dev
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Configure axios globally
axios.defaults.withCredentials = true;
axios.defaults.baseURL = API_BASE_URL;

export default axios;
