import axios from 'axios';
import { useBranchStore } from '../store/useBranchStore';

// Use Vite proxy in dev (vite.config.ts routes /api/* → localhost:4000)
// In production, set VITE_API_URL to the actual API endpoint
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach access token and branch (for sessionRequired on orders)
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const branchId = useBranchStore.getState().selectedBranchId;
  if (branchId) {
    config.headers['X-Branch-Id'] = branchId;
  }
  return config;
});

// Response interceptor — auto-refresh on 401
let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};


api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    const status = error.response?.status;
    const url = String(originalRequest.url || '');

    // Retry once after token refresh on any 401 from non-auth endpoints.
    // This covers:
    //  - Expired access tokens (TOKEN_EXPIRED)
    //  - Invalid/stale tokens (UNAUTHORIZED)
    //  - Missing token entirely (sessionStorage cleared on page refresh / new tab)
    //    → the httpOnly refresh cookie may still be valid, so we try fetching a new access token.
    const shouldTryRefresh =
      status === 401 &&
      !originalRequest._retry &&
      !url.includes('/auth/login') &&
      !url.includes('/auth/refresh');

    if (shouldTryRefresh) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true });
        sessionStorage.setItem('accessToken', data.accessToken);
        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        sessionStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
