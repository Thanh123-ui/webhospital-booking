import axios from 'axios';

// Nếu chạy local (DEV) thì trỏ thẳng vào backend port 5000
// Nếu chạy trên AWS (Production) thì dùng đường dẫn tương đối '/api'
const API_URL = import.meta.env.VITE_API_URL
  || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

const ACCESS_TOKEN_KEYS = {
  patient: 'patientAccessToken',
  staff: 'staffAccessToken',
};

const REFRESH_TOKEN_KEYS = {
  patient: 'patientRefreshToken',
  staff: 'staffRefreshToken',
};

const getPatientAuthHeader = () => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEYS.patient);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const getStaffAuthHeader = () => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEYS.staff);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const getAuthHeader = (authType = 'staff') => {
  if (authType === 'patient') return getPatientAuthHeader();
  if (authType === 'staff') return getStaffAuthHeader();

  const staffHeader = getStaffAuthHeader();
  if (staffHeader.Authorization) return staffHeader;

  return getPatientAuthHeader();
};

const refreshClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

const clearAuthStorage = (authType) => {
  if (!authType) return;
  localStorage.removeItem(ACCESS_TOKEN_KEYS[authType]);
  localStorage.removeItem(REFRESH_TOKEN_KEYS[authType]);
};

const resolveAuthTypeFromRequest = (config) => {
  const authHeader = config?.headers?.Authorization || config?.headers?.authorization;
  const bearerToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : '';

  const patientToken = localStorage.getItem(ACCESS_TOKEN_KEYS.patient);
  const staffToken = localStorage.getItem(ACCESS_TOKEN_KEYS.staff);

  if (bearerToken && bearerToken === patientToken) return 'patient';
  if (bearerToken && bearerToken === staffToken) return 'staff';

  if (patientToken && !staffToken) return 'patient';
  if (staffToken && !patientToken) return 'staff';

  return null;
};

let refreshPromise = null;

const refreshAccessToken = async (authType) => {
  const refreshTokenKey = REFRESH_TOKEN_KEYS[authType];
  const accessTokenKey = ACCESS_TOKEN_KEYS[authType];
  const refreshToken = localStorage.getItem(refreshTokenKey);

  if (!refreshToken) {
    clearAuthStorage(authType);
    throw new Error('Missing refresh token');
  }

  const res = await refreshClient.post('/auth/refresh', { token: refreshToken });
  const { accessToken, refreshToken: nextRefreshToken } = res.data || {};

  if (!accessToken) {
    clearAuthStorage(authType);
    throw new Error('Refresh response missing access token');
  }

  localStorage.setItem(accessTokenKey, accessToken);
  if (nextRefreshToken) {
    localStorage.setItem(refreshTokenKey, nextRefreshToken);
  }

  return accessToken;
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;
    const message = error?.response?.data?.message || '';

    if (!originalRequest || originalRequest._retry || originalRequest.url === '/auth/refresh') {
      return Promise.reject(error);
    }

    const tokenExpired = status === 401 || (status === 403 && /token/i.test(message));
    if (!tokenExpired) {
      return Promise.reject(error);
    }

    const authType = resolveAuthTypeFromRequest(originalRequest);
    if (!authType) {
      return Promise.reject(error);
    }

    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken(authType).finally(() => {
          refreshPromise = null;
        });
      }

      const newAccessToken = await refreshPromise;
      originalRequest._retry = true;
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      clearAuthStorage(authType);
      return Promise.reject(refreshError);
    }
  }
);

export const api = {
  getDepartments: () => apiClient.get('/data/departments'),
  getDoctors: () => apiClient.get('/data/doctors'),
  getSchedules: () => apiClient.get('/data/schedules'),
  submitRating: (data) => apiClient.post('/data/rate', data),
  getTopDoctors: () => apiClient.get('/data/ratings'),
  getSystemLogs: () => apiClient.get('/data/logs', { headers: getAuthHeader('staff') }),

  loginPatient: (phone, password) => apiClient.post('/auth/patient/login', { phone, password }),
  loginStaff: (username, password) => apiClient.post('/auth/staff/login', { username, password }),

  getAllAppointments: (role, deptId, authType = 'staff') => apiClient.get('/appointments', {
    params: { role, deptId },
    headers: getAuthHeader(authType)
  }),
  // Tra cứu bảo mật: chỉ tìm theo code + phone của chính mình (không lộ ID)
  searchAppointment: (code, phone) => apiClient.get('/appointments/search', { params: { code, phone } }),
  createAppointment: (data) => apiClient.post('/appointments', data, { headers: getPatientAuthHeader() }),
  updateAppointmentStatus: (id, statusData) => apiClient.put(`/appointments/${id}/status`, statusData, { headers: getAuthHeader('staff') }),
  addVitals: (id, vitalsData) => apiClient.put(`/appointments/${id}/vitals`, vitalsData, { headers: getAuthHeader('staff') }),
  saveVitals: (id, vitalsData) => apiClient.put(`/appointments/${id}/vitals`, vitalsData, { headers: getAuthHeader('staff') }),
  completeMedicalRecord: (id, recordData) => apiClient.put(`/appointments/${id}/complete`, recordData, { headers: getAuthHeader('staff') }),
  rescheduleAppointment: (id, data) => apiClient.put(`/appointments/${id}/reschedule`, data, { headers: getAuthHeader('staff') }),
  markAppointmentNoShow: (id, data) => apiClient.put(`/appointments/${id}/no-show`, data, { headers: getAuthHeader('staff') }),
  cancelAppointment: (id, data, authType = 'either') => apiClient.put(`/appointments/${id}/cancel`, data, { headers: getAuthHeader(authType) }),
  transferPatient: (id, data) => apiClient.put(`/appointments/${id}/transfer`, data, { headers: getAuthHeader('staff') }),
  getEmergencyTransfers: () => apiClient.get('/appointments/emergency-transfers', { headers: getAuthHeader('staff') }),

  createEmergencyRequest: (data) => apiClient.post('/emergency-requests', data),
  getEmergencyRequests: () => apiClient.get('/emergency-requests', { headers: getAuthHeader('staff') }),
  updateEmergencyRequestStatus: (id, status) => apiClient.put(`/emergency-requests/${id}/status`, { status }, { headers: getAuthHeader('staff') }),

  getAllPatients: (role, deptId) => apiClient.get('/patients', { params: { role, deptId }, headers: getAuthHeader('staff') }),
  getPatientById: (id, authType = 'patient') => apiClient.get(`/patients/${id}`, { headers: getAuthHeader(authType) }),
  registerPatient: (data) => apiClient.post('/patients/register', data),
  updatePatientProfile: (id, data, authType = 'patient') => apiClient.put(`/patients/${id}`, data, { headers: getAuthHeader(authType) }),

  getAllStaff: () => apiClient.get('/staff', { headers: getAuthHeader('staff') }),
  addStaff: (data) => apiClient.post('/staff', data, { headers: getAuthHeader('staff') }),
  updateStaffRole: (id, role) => apiClient.put(`/staff/${id}/role`, { role }, { headers: getAuthHeader('staff') }),
  toggleStaffActive: (id) => apiClient.put(`/staff/${id}/toggle-active`, {}, { headers: getAuthHeader('staff') }),
  resetStaffPassword: (id, newPassword) => apiClient.put(`/staff/${id}/password`, { newPassword }, { headers: getAuthHeader('staff') }),
};

