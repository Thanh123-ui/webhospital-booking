import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { User, Lock, Siren, Phone, Clock, MapPin, Cross, Menu } from 'lucide-react';
import { useAuth } from '../../services/AuthContext';

const PatientNavbar = ({ setEmergencyModal }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentPatient, setCurrentPatient } = useAuth();
  const navItems = [
    { label: 'Trang chủ', to: '/' },
    { label: 'Đặt lịch khám', to: '/book' },
    { label: 'Chuyên khoa', to: '/departments' },
    { label: 'Tra cứu hồ sơ', to: '/track' },
  ];

  const isActive = (to) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  return (
    <header className="sticky top-4 z-50 px-4 sm:px-6 lg:px-8">
      <div className="page-shell">
        <div className="glass-panel rounded-full px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dim text-on-primary shadow-md">
                <Cross size={20} strokeWidth={2.4} />
              </div>
              <div className="min-w-0">
                <div className="truncate font-headline text-lg font-extrabold tracking-tight text-primary-dim">HOSPITAL</div>
                <div className="truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Bệnh viện đa khoa</div>
              </div>
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    isActive(item.to)
                      ? 'bg-surface-container text-primary shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="hidden items-center gap-2 lg:flex">
              <div className="hidden items-center gap-4 rounded-full bg-surface-container-low px-4 py-2 text-xs font-medium text-on-surface-variant xl:flex">
                <span className="flex items-center gap-1.5"><Phone size={13} /> 1900 1234</span>
                <span className="flex items-center gap-1.5"><Clock size={13} /> 07:00 - 20:00</span>
                <span className="flex items-center gap-1.5"><MapPin size={13} /> Q.7, TP.HCM</span>
              </div>

              {currentPatient ? (
                <div className="flex items-center gap-2">
                  <Link to="/profile" className="flex items-center gap-2 rounded-full bg-primary-container px-4 py-2 text-sm font-bold text-on-primary-container">
                    <User size={16} />
                    <span className="max-w-32 truncate">{currentPatient.name}</span>
                  </Link>
                  <button
                    onClick={() => {
                      localStorage.removeItem('patientAccessToken');
                      setCurrentPatient(null);
                      navigate('/');
                    }}
                    className="rounded-full px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container hover:text-error"
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <Link to="/auth" className="rounded-full px-4 py-2 text-sm font-semibold text-primary hover:bg-surface-container">
                  Đăng nhập
                </Link>
              )}

              <button
                onClick={() => setEmergencyModal(true)}
                className="rounded-full bg-error px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-md hover:opacity-90"
              >
                Cấp cứu 24/7
              </button>

              <Link to="/admin" className="rounded-full bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-slate-800">
                <span className="flex items-center gap-1.5">
                  <Lock size={12} /> Cổng nội bộ
                </span>
              </Link>
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              {currentPatient ? (
                <Link to="/profile" className="flex items-center gap-2 rounded-full bg-primary-container px-3 py-2 text-sm font-bold text-on-primary-container">
                  <User size={15} />
                </Link>
              ) : (
                <Link to="/auth" className="rounded-full bg-surface-container px-4 py-2 text-sm font-semibold text-primary">
                  Đăng nhập
                </Link>
              )}
              <button onClick={() => setEmergencyModal(true)} className="rounded-full bg-error px-3 py-2 text-white">
                <Siren size={15} />
              </button>
              <button type="button" className="rounded-full bg-surface-container px-3 py-2 text-on-surface-variant md:hidden" onClick={() => navigate('/departments')}>
                <Menu size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default PatientNavbar;
