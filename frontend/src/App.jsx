import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './services/AuthContext';
import PatientNavbar from './components/layout/PatientNavbar';
import PatientHome from './pages/patient/PatientHome';
import BookingWizard from './pages/patient/BookingWizard';
import PatientTracking from './pages/patient/PatientTracking';
import PatientAuth from './pages/patient/PatientAuth';
import PatientProfile from './pages/patient/PatientProfile';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminLogin from './pages/admin/AdminLogin';
import EmergencyModal from './components/layout/EmergencyModal';

function App() {
  const { currentStaffUser, currentPatient } = useAuth();
  const [emergencyModal, setEmergencyModal] = useState(false);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white font-sans text-slate-900 flex flex-col relative w-full overflow-x-hidden">
        <Routes>
          <Route path="/admin" element={!currentStaffUser ? <AdminLogin /> : <Navigate to="/admin/dashboard" />} />
          <Route path="/admin/*" element={currentStaffUser ? <AdminDashboard /> : <Navigate to="/admin" />} />
          
          <Route path="*" element={
            <>
              <PatientNavbar setEmergencyModal={setEmergencyModal} />
              <main className="flex-1 relative w-full">
                <Routes>
                  <Route path="/" element={<PatientHome />} />
                  <Route
                    path="/book"
                    element={
                      currentPatient
                        ? <BookingWizard />
                        : <Navigate to="/auth" state={{ from: '/book' }} replace />
                    }
                  />
                  <Route path="/track" element={<PatientTracking />} />
                  <Route path="/auth" element={!currentPatient ? <PatientAuth /> : <Navigate to="/" />} />
                  <Route path="/profile" element={currentPatient ? <PatientProfile /> : <Navigate to="/auth" />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </main>
            </>
          } />
        </Routes>
        {emergencyModal && <EmergencyModal onClose={() => setEmergencyModal(false)} />}
      </div>
    </BrowserRouter>
  );
}

export default App;
