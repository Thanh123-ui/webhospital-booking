import axios from 'axios';

// Nếu chạy local (DEV) thì trỏ thẳng vào backend port 5000
// Nếu chạy trên AWS (Production) thì dùng đường dẫn tương đối '/api'
const API_URL = import.meta.env.DEV ? 'http://localhost:5000/api' : '/api';

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
  saveVitals: (id, vitalsData) => apiClient.put(`/appointments/${id}/vitals`, vitalsData),
  completeMedicalRecord: (id, recordData) => apiClient.put(`/appointments/${id}/complete`, recordData),
  rescheduleAppointment: (id, data) => apiClient.put(`/appointments/${id}/reschedule`, data),
  cancelAppointment: (id, data) => apiClient.put(`/appointments/${id}/cancel`, data),
  transferPatient: (id, data) => apiClient.put(`/appointments/${id}/transfer`, data),
  getEmergencyTransfers: () => apiClient.get('/appointments/emergency-transfers'),

  getAllPatients: (role, deptId) => apiClient.get('/patients', { params: { role, deptId } }),
  registerPatient: (data) => apiClient.post('/patients/register', data),
  updatePatientProfile: (id, data) => apiClient.put(`/patients/${id}`, data),

  getAllStaff: (role) => apiClient.get('/staff', { params: role ? { role } : {} }),
  addStaff: (data) => apiClient.post('/staff', data),
  updateStaffRole: (id, role, requesterRole) => apiClient.put(`/staff/${id}/role`, { role, requesterRole }),
  toggleStaffActive: (id, requesterRole) => apiClient.put(`/staff/${id}/toggle-active`, { requesterRole }),
  resetStaffPassword: (id, newPassword, requesterRole) => apiClient.put(`/staff/${id}/password`, { newPassword, requesterRole }),
};

