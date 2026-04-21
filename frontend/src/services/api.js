import axios from 'axios';

// Nếu chạy local (DEV) thì trỏ thẳng vào backend port 5000
// Nếu chạy trên AWS (Production) thì dùng đường dẫn tương đối '/api'
const API_URL = import.meta.env.DEV ? 'http://localhost:5000/api' : '/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

const getPatientAuthHeader = () => {
  const token = localStorage.getItem('patientAccessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const getStaffAuthHeader = () => {
  const token = localStorage.getItem('staffAccessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const getAuthHeader = (authType = 'staff') => {
  if (authType === 'patient') return getPatientAuthHeader();
  if (authType === 'staff') return getStaffAuthHeader();

  const staffHeader = getStaffAuthHeader();
  if (staffHeader.Authorization) return staffHeader;

  return getPatientAuthHeader();
};

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

