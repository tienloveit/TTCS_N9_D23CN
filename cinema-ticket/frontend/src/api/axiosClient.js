import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api';

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

let refreshRequest = null;

// Request interceptor — tự gắn JWT vào header
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token && !config.skipAuth) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — xử lý 401 (token hết hạn)
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest && !originalRequest.skipAuth && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        let accessToken = localStorage.getItem('accessToken');
        // A late 401 may belong to a request sent before another request refreshed the token.
        if (!accessToken || originalRequest.headers?.Authorization === `Bearer ${accessToken}`) {
          if (!refreshRequest) {
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) throw new Error('No refresh token');
            refreshRequest = axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken })
              .then((res) => {
                const tokens = res.data.result;
                localStorage.setItem('accessToken', tokens.accessToken);
                localStorage.setItem('refreshToken', tokens.refreshToken);
                return tokens.accessToken;
              })
              .finally(() => { refreshRequest = null; });
          }
          accessToken = await refreshRequest;
        }

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return axiosClient(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
