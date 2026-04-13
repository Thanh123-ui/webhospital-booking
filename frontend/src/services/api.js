import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

export const api = {
  getDepartments: () => apiClient.get('/data/departments'),
  getDoctors: () => apiClient.get('/data/doctors'),
  getSchedules: () => apiClient.get('/data/schedules'),
  submitRating: (data) => apiClient.post('/data/rate', data),
  getTopDoctors: () => apiClient.get('/data/ratings'),
  getSystemLogs: () => apiClient.get('/data/logs'),

  loginPatient: (phone, password) => apiClient.post('/auth/patient/login', { phone, password }),
  loginStaff: (username, password) => apiClient.post('/auth/staff/login', { username, password }),

  getAllAppointments: (role, deptId) => apiClient.get('/appointments', { params: { role, deptId } }),
  // Tra cứu bảo mật: chỉ tìm theo code + phone của chính mình (không lộ ID)
  searchAppointment: (code, phone) => apiClient.get('/appointments/search', { params: { code, phone } }),
  createAppointment: (data) => apiClient.post('/appointments', data),
  updateAppointmentStatus: (id, statusData) => apiClient.put(`/appointments/${id}/status`, statusData),
  addVitals: (id, vitalsData) => apiClient.put(`/appointments/${id}/vitals`, vitalsData),
  completeMedicalRecord: (id, recordData) => apiClient.put(`/appointments/${id}/complete`, recordData),
  rescheduleAppointment: (id, data) => apiClient.put(`/appointments/${id}/reschedule`, data),
  cancelAppointment: (id, data) => apiClient.put(`/appointments/${id}/cancel`, data),

  getAllPatients: (role, deptId) => apiClient.get('/patients', { params: { role, deptId } }),
  registerPatient: (data) => apiClient.post('/patients/register', data),

  getAllStaff: () => apiClient.get('/staff'),
  addStaff: (data) => apiClient.post('/staff', data),
  updateStaffRole: (id, role) => apiClient.put(`/staff/${id}/role`, { role }),
  toggleStaffActive: (id) => apiClient.put(`/staff/${id}/toggle-active`)
};
