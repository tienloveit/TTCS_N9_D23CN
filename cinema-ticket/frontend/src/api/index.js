import axiosClient, { API_BASE_URL } from './axiosClient';

// ==================== AUTH ====================
export const authApi = {
  login: (data) => axiosClient.post('/auth/login', data, { skipAuth: true }),
  logout: () => {
    const token = localStorage.getItem('accessToken');
    return axiosClient.post('/auth/logout', null, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  refresh: (refreshToken) => axiosClient.post('/auth/refresh', { refreshToken }, { skipAuth: true }),
  changePassword: (data) => axiosClient.post('/auth/change-password', data),
  forgotPassword: (email) => axiosClient.post('/auth/forgot-password', { email }, { skipAuth: true }),
  resetPassword: (data) => axiosClient.post('/auth/reset-password', data, { skipAuth: true }),
  getGoogleLoginUrl: () => `${API_BASE_URL}/oauth2/authorization/google`,
};

// ==================== USER ====================
export const userApi = {
  register: (data) => axiosClient.post('/sign-up', data, { skipAuth: true }),
  create: (data) => axiosClient.post('/users', data),
  getAll: (params) => axiosClient.get('/users', { params: { size: 1000, ...params } }),
  getById: (id) => axiosClient.get(`/users/${id}`),
  update: (id, data) => axiosClient.put(`/users/${id}`, data),
  delete: (id) => axiosClient.delete(`/users/${id}`),
  getMyInfo: () => axiosClient.get('/my-info'),
  updateMyInfo: (data) => axiosClient.put('/my-info', data),
  updateStatus: (id, status) => axiosClient.put(`/users/${id}/status`, null, { params: { status } }),
};

// ==================== MOVIE ====================
export const movieApi = {
  create: (data) => axiosClient.post('/movie', data),
  getAll: (params) => axiosClient.get('/movie', { params }),
  getNowShowing: () => axiosClient.get('/movie/now-showing'),
  getUpcoming: () => axiosClient.get('/movie/upcoming'),
  getById: (id) => axiosClient.get(`/movie/${id}`),
  getMyRating: (id) => axiosClient.get(`/movie/${id}/rating/my`),
  getRatings: (id) => axiosClient.get(`/movie/${id}/ratings`),
  rate: (id, score, comment) => axiosClient.post(`/movie/${id}/rating`, { score, comment }),
  update: (id, data) => axiosClient.put(`/movie/${id}`, data),
  delete: (id) => axiosClient.delete(`/movie/${id}`),
};

// ==================== GENRE ====================
export const genreApi = {
  create: (data) => axiosClient.post('/genre', data),
  getAll: () => axiosClient.get('/genre'),
  update: (id, data) => axiosClient.put(`/genre/${id}`, data),
  delete: (id) => axiosClient.delete(`/genre/${id}`),
};

// ==================== DIRECTOR ====================
export const directorApi = {
  create: (data) => axiosClient.post('/director', data),
  getAll: () => axiosClient.get('/director'),
  getById: (id) => axiosClient.get(`/director/${id}`),
  update: (id, data) => axiosClient.put(`/director/${id}`, data),
  delete: (id) => axiosClient.delete(`/director/${id}`),
};

// ==================== BRANCH ====================
export const branchApi = {
  create: (data) => axiosClient.post('/branch', data),
  getAll: () => axiosClient.get('/branch'),
  getById: (id) => axiosClient.get(`/branch/${id}`),
  update: (id, data) => axiosClient.put(`/branch/${id}`, data),
  delete: (id) => axiosClient.delete(`/branch/${id}`),
};

// ==================== ROOM ====================
export const roomApi = {
  create: (data) => axiosClient.post('/room', data),
  getAll: () => axiosClient.get('/room'),
  getById: (id) => axiosClient.get(`/room/${id}`),
  update: (id, data) => axiosClient.put(`/room/${id}`, data),
  delete: (id) => axiosClient.delete(`/room/${id}`),
};

// ==================== SHOWTIME ====================
export const showtimeApi = {
  getAll: () => axiosClient.get('/showtime'),
  getToday: () => axiosClient.get('/showtime/today'),
  create: (data) => axiosClient.post('/showtime', data),
  getById: (id) => axiosClient.get(`/showtime/${id}`),
  getByMovie: (movieId) => axiosClient.get(`/showtime/movie/${movieId}`),
  getByRoom: (roomId) => axiosClient.get(`/showtime/room/${roomId}`),
  getByBranch: (branchId, date) => axiosClient.get(`/showtime/branch/${branchId}`, { params: { date } }),
  update: (id, data) => axiosClient.put(`/showtime/${id}`, data),
  delete: (id) => axiosClient.delete(`/showtime/${id}`),
};

// ==================== TICKET ====================
export const ticketApi = {
  getAll: () => axiosClient.get('/ticket'),
  getById: (id) => axiosClient.get(`/ticket/${id}`),
  getByShowtimeId: (showtimeId) => axiosClient.get(`/ticket/showtime/${showtimeId}`),
  update: (id, data) => axiosClient.put(`/ticket/${id}`, data),
  checkIn: (data) => axiosClient.post('/ticket/check-in', data),
  checkInByQRImage: (file) => {
    const formData = new FormData();
    formData.append('qrImage', file);
    return axiosClient.post('/ticket/check-in/qr-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ==================== FOOD ====================
export const foodApi = {
  getAll: () => axiosClient.get('/food'),
  getAllAdmin: () => axiosClient.get('/food/all'),
  getById: (id) => axiosClient.get(`/food/${id}`),
  create: (data) => axiosClient.post('/food', data),
  update: (id, data) => axiosClient.put(`/food/${id}`, data),
  delete: (id) => axiosClient.delete(`/food/${id}`),
};

// ==================== BOOKING ====================
export const bookingApi = {
  create: (data) => axiosClient.post('/booking', data),
  staffCreate: (data) => axiosClient.post('/booking/staff', data),
  getAll: () => axiosClient.get('/booking'),
  getById: (id) => axiosClient.get(`/booking/${id}`),
  getMyBookings: () => axiosClient.get('/booking/my-bookings/list'),
  getMyBookingById: (id) => axiosClient.get(`/booking/my-bookings/${id}`),
  update: (id, data) => axiosClient.put(`/booking/${id}`, data),
  cancel: (id) => axiosClient.delete(`/booking/${id}`),
  applyPromotion: (id, promotionCode) =>
    axiosClient.patch(`/booking/${id}/apply-promotion`, { promotionCode }),
  requestRefund: (id, reason) =>
    axiosClient.post(`/booking/${id}/refund-request`, { reason }),
  processRefund: (id, approved) =>
    axiosClient.post(`/booking/${id}/refund-process`, { approved }),
};

// ==================== ADMIN ANALYTICS ====================
export const analyticsApi = {
  getDashboard: (params) => axiosClient.get('/admin/analytics/dashboard', { params }),
};

// ==================== PROMOTION ====================
export const promotionApi = {
  getAll: () => axiosClient.get('/promotion'),
  getAvailable: () => axiosClient.get('/promotion/available'),
  create: (data) => axiosClient.post('/promotion', data),
  update: (id, data) => axiosClient.put(`/promotion/${id}`, data),
  delete: (id) => axiosClient.delete(`/promotion/${id}`),
  validate: (data) => axiosClient.post('/promotion/validate', data),
};

// ==================== AI CHAT ====================
export const chatApi = {
  send: (data) => axiosClient.post('/chat', data),
};

// ==================== VNPAY ====================
export const vnpayApi = {
  createPaymentUrl: (data) => axiosClient.post('/v1/vnpay/payment-url', data),
  handleReturn: (params) => axiosClient.get('/v1/vnpay/return', { params }),
  queryTransaction: (data) => axiosClient.post('/v1/vnpay/querydr', data),
  refund: (data) => axiosClient.post('/v1/vnpay/refund', data),
};

export default axiosClient;
