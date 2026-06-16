/**
 * k8sApi.js
 *
 * Các hàm gọi REST API tới Backend.
 * VITE_API_URL được inject từ file .env lúc build/dev.
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({ baseURL: BASE_URL });

// Lấy danh sách Node từ cluster
export const fetchNodes = () => api.get('/api/nodes').then((r) => r.data.data);

// Lấy danh sách Pod từ tất cả namespace
export const fetchPods = () => api.get('/api/pods').then((r) => r.data.data);

// Lấy danh sách Service từ tất cả namespace
export const fetchServices = () => api.get('/api/services').then((r) => r.data.data);

// Health check
export const fetchHealth = () => api.get('/api/health').then((r) => r.data);
