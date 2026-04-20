import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentPatient, setCurrentPatient] = useState(() => {
    const saved = localStorage.getItem('currentPatient');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentStaffUser, setCurrentStaffUser] = useState(() => {
    const saved = localStorage.getItem('currentStaffUser');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (currentPatient) localStorage.setItem('currentPatient', JSON.stringify(currentPatient));
    else localStorage.removeItem('currentPatient');
  }, [currentPatient]);

  useEffect(() => {
    if (currentStaffUser) localStorage.setItem('currentStaffUser', JSON.stringify(currentStaffUser));
    else localStorage.removeItem('currentStaffUser');
  }, [currentStaffUser]);

  return (
    <AuthContext.Provider value={{ currentPatient, setCurrentPatient, currentStaffUser, setCurrentStaffUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
