import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Patient } from '@/types';

const KEYS = {
  accessToken: 'patientAccessToken',
  refreshToken: 'patientRefreshToken',
  patient: 'currentPatient',
};

export const authStorage = {
  async getAccessToken() {
    return AsyncStorage.getItem(KEYS.accessToken);
  },
  async getRefreshToken() {
    return AsyncStorage.getItem(KEYS.refreshToken);
  },
  async getPatient() {
    const raw = await AsyncStorage.getItem(KEYS.patient);
    return raw ? (JSON.parse(raw) as Patient) : null;
  },
  async setSession(patient: Patient, accessToken: string, refreshToken: string) {
    await AsyncStorage.multiSet([
      [KEYS.patient, JSON.stringify(patient)],
      [KEYS.accessToken, accessToken],
      [KEYS.refreshToken, refreshToken],
    ]);
  },
  async updatePatient(patient: Patient) {
    await AsyncStorage.setItem(KEYS.patient, JSON.stringify(patient));
  },
  async clear() {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  },
};
