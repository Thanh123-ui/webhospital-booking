import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { authStorage } from '@/services/storage';
import type { Patient } from '@/types';

interface AuthContextValue {
  bootstrapping: boolean;
  patient: Patient | null;
  signIn: (nextPatient: Patient, accessToken: string, refreshToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  updatePatient: (nextPatient: Patient) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [patient, setPatient] = useState<Patient | null>(null);

  useEffect(() => {
    let active = true;

    authStorage.getPatient()
      .then((storedPatient) => {
        if (!active) return;
        setPatient(storedPatient);
      })
      .finally(() => {
        if (active) setBootstrapping(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    bootstrapping,
    patient,
    async signIn(nextPatient, accessToken, refreshToken) {
      await authStorage.setSession(nextPatient, accessToken, refreshToken);
      setPatient(nextPatient);
    },
    async signOut() {
      await authStorage.clear();
      setPatient(null);
    },
    async updatePatient(nextPatient) {
      await authStorage.updatePatient(nextPatient);
      setPatient(nextPatient);
    },
  }), [bootstrapping, patient]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
