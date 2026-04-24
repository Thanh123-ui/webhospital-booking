export type Role = 'PATIENT';

export interface Department {
  id: number;
  name: string;
  isEmergency?: boolean;
}

export interface Doctor {
  id: number;
  name: string;
  deptId: number;
  title?: string;
  exp?: string;
  avgRating?: string | number;
  reviewCount?: number;
}

export interface Schedule {
  id?: number;
  doctorId: number;
  date: string;
  time: string;
  booked: number;
  maxPatients: number;
}

export interface MedicalHistoryItem {
  apptId?: number;
  date: string;
  diagnosis?: string;
  doctor?: string;
  deptId?: number;
  prescription?: string;
  notes?: string;
}

export interface AppointmentHistoryItem {
  date?: string;
  action?: string;
  by?: string;
}

export interface Patient {
  id: number;
  name: string;
  phone: string;
  email?: string;
  dob?: string;
  cccd?: string;
  gender?: string;
  address?: string;
  medicalHistory?: MedicalHistoryItem[];
}

export interface Appointment {
  id: number;
  code: string;
  patientId: number;
  patientName: string;
  phone: string;
  doctorId: number;
  deptId: number;
  date: string;
  time: string;
  status: string;
  symptoms?: string;
  createdAt?: string;
  current_department?: number | string | null;
  history?: AppointmentHistoryItem[];
}

export interface LoginResponse {
  user: Patient;
  accessToken: string;
  refreshToken: string;
  success?: boolean;
  message?: string;
}
