import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, Siren, Phone, Clock, MapPin, Cross } from 'lucide-react';
import { useAuth } from '../../services/AuthContext';

const PatientNavbar = ({ setEmergencyModal }) => {
  const navigate = useNavigate();
  const { currentPatient, setCurrentPatient } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Top Info Bar */}
      <div className="bg-blue-900 text-blue-100 text-xs py-2 px-6 hidden md:flex justify-between items-center">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5"><Phone size={11} /> Đường dây nóng: <b className="text-white">1900 1234</b></span>
          <span className="flex items-center gap-1.5"><Clock size={11} /> Thứ 2 - Thứ 7: 07:00 - 20:00 | CN: 07:00 - 12:00</span>
          <span className="flex items-center gap-1.5"><MapPin size={11} /> 123 Nguyễn Văn Linh, Quận 7, TP.HCM</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setEmergencyModal(true)}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded font-bold transition text-xs animate-pulse"
          >
            <Siren size={11} /> CẤP CỨU 24/7
          </button>
        </div>
      </div>

      {/* Main Navbar */}
      <nav className="bg-white shadow-md border-b border-slate-100 px-6 py-0 flex justify-between items-stretch">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 py-3 group">
          <div className="w-10 h-10 bg-blue-700 rounded-lg flex items-center justify-center shadow">
            <Cross size={22} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-black text-xl text-blue-900 leading-none tracking-tight">HOSPITAL</div>
            <div className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase leading-none mt-0.5">Bệnh viện Đa khoa</div>
          </div>
        </Link>

        {/* Navigation */}
        <div className="hidden md:flex items-stretch">
          {[
            { label: 'Trang chủ', to: '/' },
            { label: 'Chuyên khoa', to: '/#departments' },
            { label: 'Đặt lịch khám', to: '/book' },
            { label: 'Tra cứu hồ sơ', to: '/track' },
          ].map(item => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center px-5 text-sm font-semibold text-slate-600 hover:text-blue-700 hover:bg-blue-50 border-b-2 border-transparent hover:border-blue-600 transition-all"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {currentPatient ? (
            <div className="flex items-center gap-3">
              <Link to="/profile" className="flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-900 bg-blue-50 px-4 py-2 rounded-lg transition">
                <User size={16} /> {currentPatient.name}
              </Link>
              <button
                onClick={() => {
                  localStorage.removeItem('patientAccessToken');
                  setCurrentPatient(null);
                  navigate('/');
                }}
                className="text-xs text-slate-400 hover:text-red-500 transition"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <Link to="/auth" className="text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 px-5 py-2 rounded-lg font-bold transition">
              Đăng nhập
            </Link>
          )}

          <button
            onClick={() => setEmergencyModal(true)}
            className="md:hidden text-sm bg-red-600 text-white px-3 py-2 rounded-lg font-bold transition flex items-center gap-1.5"
          >
            <Siren size={14} /> Cấp cứu
          </button>

          <Link
            to="/admin"
            className="text-xs bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg transition flex items-center gap-1.5 font-semibold shadow"
          >
            <Lock size={12} /> Cổng Nội Bộ
          </Link>
        </div>
      </nav>
    </header>
  );
};

export default PatientNavbar;
