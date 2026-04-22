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
          <div className="flex items-center justify-between gap-4 xl:gap-6">
            <Link to="/" className="flex min-w-0 shrink-0 items-center gap-3 pr-1 xl:basis-[17%]">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dim text-on-primary shadow-md">
                <Cross size={20} strokeWidth={2.4} />
              </div>
              <div className="min-w-0">
                <div className="truncate font-headline text-lg font-extrabold tracking-tight text-primary-dim">HOSPITAL</div>
                <div className="truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Bệnh viện đa khoa</div>
              </div>
            </Link>

            <nav className="hidden min-w-0 flex-1 items-center justify-center md:flex xl:basis-[38%]">
              <div className="flex w-full items-center justify-center rounded-full border border-white/70 bg-surface-container-low/80 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`relative min-w-0 flex-1 overflow-hidden rounded-full px-3 py-2.5 text-center text-sm font-semibold transition-all duration-300 ease-out xl:px-4 ${
                    isActive(item.to)
                      ? 'bg-white text-primary shadow-[0_8px_20px_rgba(32,86,103,0.14)]'
                      : 'text-on-surface-variant hover:-translate-y-0.5 hover:bg-white/70 hover:text-primary'
                  }`}
                >
                  <span className="relative z-10">{item.label}</span>
                  {isActive(item.to) && (
                    <span className="absolute inset-x-5 bottom-1.5 h-0.5 rounded-full bg-primary/70" />
                  )}
                </Link>
              ))}
              </div>
            </nav>

            <div className="hidden shrink-0 items-center justify-end gap-2 lg:flex xl:basis-[45%]">
              <div className="hidden items-center gap-4 rounded-full bg-surface-container-low px-4 py-2 text-xs font-medium text-on-surface-variant 2xl:flex">
                <span className="flex items-center gap-1.5"><Phone size={13} /> 1900 1234</span>
                <span className="flex items-center gap-1.5"><Clock size={13} /> 07:00 - 20:00</span>
                <span className="flex items-center gap-1.5"><MapPin size={13} /> Q.7, TP.HCM</span>
              </div>

              {currentPatient ? (
                <div className="flex min-w-0 items-center gap-2">
                  <Link to="/profile" className="flex min-w-0 items-center gap-2 rounded-full bg-primary-container px-4 py-2 text-sm font-bold text-on-primary-container">
                    <User size={16} />
                    <span className="max-w-32 truncate">{currentPatient.name}</span>
                  </Link>
                  <button
                    onClick={() => {
                      localStorage.removeItem('patientAccessToken');
                      localStorage.removeItem('patientRefreshToken');
                      setCurrentPatient(null);
                      navigate('/');
                    }}
                    className="rounded-full px-4 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-error"
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <Link to="/auth" className="rounded-full px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-surface-container">
                  Đăng nhập
                </Link>
              )}

              <button
                onClick={() => setEmergencyModal(true)}
                className="rounded-full bg-error px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-md transition-transform hover:-translate-y-0.5 hover:opacity-90 xl:px-5"
              >
                Cấp cứu 24/7
              </button>

              <Link to="/admin" className="rounded-full bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-md transition-colors hover:bg-slate-800 xl:px-5">
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
              <button
                type="button"
                className="rounded-full bg-surface-container px-3 py-2 text-on-surface-variant md:hidden"
                onClick={() => navigate('/departments')}
              >
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
