import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowLeft, ShieldCheck, Activity } from 'lucide-react';
import { useAuth } from '../../services/AuthContext';
import { api } from '../../services/api';

const ROLE_INFO = [
  { role: 'ADMIN', label: 'Admin IT', color: 'bg-purple-100 text-purple-700' },
  { role: 'BOD', label: 'Ban Giám Đốc', color: 'bg-amber-100 text-amber-700' },
  { role: 'DOCTOR', label: 'Bác sĩ', color: 'bg-blue-100 text-blue-700' },
  { role: 'NURSE', label: 'Điều dưỡng', color: 'bg-teal-100 text-teal-700' },
  { role: 'RECEPTIONIST', label: 'Lễ tân', color: 'bg-indigo-100 text-indigo-700' },
];

const AdminLogin = () => {
  const navigate = useNavigate();
  const { setCurrentStaffUser } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.loginStaff(username, password);
      if (res.data.success) {
        setCurrentStaffUser(res.data.user);
        navigate('/admin/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Lỗi kết nối đến máy chủ. Vui lòng kiểm tra Backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-['Inter',sans-serif]">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-teal-300 blur-2xl"></div>
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 text-white/5 font-black" style={{fontSize: '300px', lineHeight:1}}>+</div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-blue-800 font-black text-xl">+</span>
            </div>
            <span className="text-white font-black text-2xl tracking-tight">HOSPITAL</span>
          </div>
          <h1 className="text-4xl font-black text-white leading-tight mb-4">
            Cổng Quản lý<br />Nội Bộ Bệnh Viện
          </h1>
          <p className="text-blue-200 text-lg leading-relaxed max-w-sm">
            Hệ thống quản lý tập trung dành cho toàn thể cán bộ, nhân viên y tế.
          </p>
        </div>

      </div>


      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 bg-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-black">+</span>
            </div>
            <span className="text-blue-900 font-black text-xl">HOSPITAL</span>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-10 border border-slate-100">
            <div className="mb-8 text-center">
              <div className="w-16 h-16 bg-blue-900 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
                <Lock size={28} className="text-white" />
              </div>
              <h2 className="text-2xl font-black text-slate-800">Đăng nhập Nội Bộ</h2>
              <p className="text-slate-400 text-sm mt-1">Vui lòng sử dụng tài khoản được cấp</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm mb-6 flex items-start gap-3 font-medium">
                <ShieldCheck size={18} className="shrink-0 mt-0.5 text-red-500" />
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Tên đăng nhập</label>
                <input
                  required
                  type="text"
                  className="w-full p-4 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 focus:bg-white transition text-slate-800 font-medium"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Nhập username..."
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Mật khẩu</label>
                <div className="relative">
                  <input
                    required
                    type={showPass ? 'text' : 'password'}
                    className="w-full p-4 pr-12 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 focus:bg-white transition text-slate-800 font-medium"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mật khẩu cá nhân..."
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">* Tài khoản test dùng mật khẩu: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">123</code></p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-800 hover:bg-blue-900 text-white py-4 rounded-xl font-black shadow-lg shadow-blue-900/20 transition-all mt-2 text-base flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Lock size={18} /> ĐĂNG NHẬP
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <button
                onClick={() => navigate('/')}
                className="text-sm text-slate-400 hover:text-blue-600 font-semibold flex items-center justify-center gap-2 w-full transition"
              >
                <ArrowLeft size={14} /> Về trang chủ bệnh nhân
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            © 2024 Hospital Management System v2.1
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
