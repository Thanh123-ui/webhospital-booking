import React from 'react';
import { Redirect } from 'expo-router';

import { useAuth } from '../src/context/AuthContext';

export default function IndexPage() {
  const { patient } = useAuth();
  return <Redirect href={patient ? '/home' : '/login'} />;
}
