import React from 'react';
import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/context/AuthContext';

export default function AuthLayout() {
  const { patient } = useAuth();

  if (patient) {
    return <Redirect href="/home" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
