import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

import { authStorage } from '@/services/storage';
import type {
  Appointment,
  Department,
  Doctor,
  LoginResponse,
  Patient,
  Schedule,
} from '@/types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

const refreshClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

const normalizeSuccessPayload = <T,>(response: AxiosResponse<T>) => {
  const payload = response?.data as any;
  if (!payload || payload.success !== true || !Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return response;
  }

  const normalizedData = payload.data;
  if (Array.isArray(normalizedData)) {
    (response as any).data = normalizedData;
    return response;
  }

  if (normalizedData && typeof normalizedData === 'object') {
    (response as any).data = {
      success: true,
      ...(payload.message ? { message: payload.message } : {}),
      ...normalizedData,
    };
    return response;
  }

  (response as any).data = {
    success: true,
    ...(payload.message ? { message: payload.message } : {}),
    data: normalizedData,
  };

  return response;
};

apiClient.interceptors.response.use(normalizeSuccessPayload);
refreshClient.interceptors.response.use(normalizeSuccessPayload);

let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = async () => {
  const refreshToken = await authStorage.getRefreshToken();
  if (!refreshToken) {
    await authStorage.clear();
    throw new Error('Missing refresh token');
  }

  const res = await refreshClient.post('/auth/refresh', { token: refreshToken });
  const { accessToken, refreshToken: nextRefreshToken } = res.data as any;
  const patient = await authStorage.getPatient();

  if (!accessToken || !patient) {
    await authStorage.clear();
    throw new Error('Invalid refresh response');
  }

  await authStorage.setSession(patient, accessToken, nextRefreshToken || refreshToken);
  return accessToken;
};

const patientRequest = async <T = any>(config: AxiosRequestConfig, retry = true): Promise<AxiosResponse<T>> => {
  const token = await authStorage.getAccessToken();
  const headers = {
    ...(config.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    return await apiClient.request<T>({
      ...config,
      headers,
    });
  } catch (error) {
    const err = error as AxiosError<any>;
    const status = err.response?.status;
    const message = err.response?.data?.message || '';
    const tokenExpired = status === 401 || (status === 403 && /token/i.test(message));

    if (!retry || !tokenExpired) {
      throw err;
    }

    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }

    const nextToken = await refreshPromise;
    return apiClient.request<T>({
      ...config,
      headers: {
        ...(config.headers || {}),
        Authorization: `Bearer ${nextToken}`,
      },
    });
  }
};

export const mobileApi = {
  loginPatient(phone: string, password: string) {
    return apiClient.post<LoginResponse>('/auth/patient/login', { phone, password });
  },
  registerPatient(data: {
    name: string;
    phone: string;
    email: string;
    password: string;
    dob?: string;
    address?: string;
  }) {
    return apiClient.post('/patients/register', data);
  },
  requestPatientPasswordResetOtp(phone: string) {
    return apiClient.post('/auth/patient/forgot-password/request-otp', { phone });
  },
  resetPatientPasswordWithOtp(phone: string, otp: string, newPassword: string) {
    return apiClient.post('/auth/patient/forgot-password/reset', { phone, otp, newPassword });
  },
  getDepartments() {
    return apiClient.get<Department[]>('/data/departments');
  },
  getDoctors() {
    return apiClient.get<Doctor[]>('/data/doctors');
  },
  getSchedules() {
    return apiClient.get<Schedule[]>('/data/schedules');
  },
  getTopDoctors() {
    return apiClient.get<Doctor[]>('/data/ratings');
  },
  createAppointment(data: Record<string, unknown>) {
    return patientRequest<Appointment>({ method: 'post', url: '/appointments', data });
  },
  getPatientAppointments() {
    return patientRequest<Appointment[]>({ method: 'get', url: '/appointments' });
  },
  getPatientById(id: number) {
    return patientRequest<{ user: Patient }>({ method: 'get', url: `/patients/${id}` });
  },
  updatePatientProfile(id: number, data: Record<string, unknown>) {
    return patientRequest<{ user: Patient }>({ method: 'put', url: `/patients/${id}`, data });
  },
  cancelAppointment(id: number, data: Record<string, unknown>) {
    return patientRequest<Appointment>({ method: 'put', url: `/appointments/${id}/cancel`, data });
  },
  submitRating(data: Record<string, unknown>) {
    return apiClient.post('/data/rate', data);
  },
};
