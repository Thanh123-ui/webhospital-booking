import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowLeft, ShieldCheck, Award, Stethoscope, Users, Star, Ambulance } from 'lucide-react';
import { useAuth } from '../../services/AuthContext';
import { api } from '../../services/api';

const HOSPITAL_STATS = [
  { num: '20+', label: 'Năm kinh nghiệm', icon: <Award size={22} className="text-yellow-400" /> },
  { num: '50+', label: 'Chuyên gia Y tế', icon: <Stethoscope size={22} className="text-sky-300" /> },
  { num: '100k+', label: 'Bệnh nhân tin tưởng', icon: <Users size={22} className="text-green-400" /> },
  { num: '4.9★', label: 'Điểm hài lòng', icon: <Star size={22} className="text-yellow-300" /> },
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
    <div className="min-h-screen flex font-['Inter',sans-serif] bg-slate-950">
      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-14 overflow-hidden"
        style={{background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0c4a6e 100%)'}}>

        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20"
            style={{background:'radial-gradient(circle, #38bdf8, transparent)'}}/>
          <div className="absolute top-1/3 -left-24 w-80 h-80 rounded-full opacity-10"
            style={{background:'radial-gradient(circle, #818cf8, transparent)'}}/>
          <div className="absolute -bottom-20 right-20 w-72 h-72 rounded-full opacity-15"
            style={{background:'radial-gradient(circle, #34d399, transparent)'}}/>
          {/* Grid lines */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{backgroundImage:'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',backgroundSize:'60px 60px'}}/>
        </div>

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 bg-white/10 rounded-2xl border border-white/20 backdrop-blur flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-2xl">+</span>
            </div>
            <div>
              <span className="text-white font-black text-xl tracking-widest">HOSPITAL</span>
              <div className="text-sky-400 text-[10px] font-semibold tracking-widest uppercase">Management System</div>
            </div>
          </div>

          <h1 className="text-5xl font-black text-white leading-tight mb-6">
            Cổng Quản lý<br />
            <span className="text-transparent bg-clip-text"
              style={{backgroundImage:'linear-gradient(90deg, #38bdf8, #818cf8)'}}>
              Nội Bộ
            </span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-sm mb-12">
            Hệ thống quản lý tập trung, phân quyền chặt chẽ dành cho toàn thể cán bộ, nhân viên y tế.
          </p>

          {/* Stats grid — đồng bộ với trang chủ bệnh nhân */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-5 grid grid-cols-2 gap-4">
            {HOSPITAL_STATS.map((s, i) => (
              <div key={i} className="bg-white/10 rounded-2xl p-4 text-center hover:bg-white/20 transition cursor-default">
                <div className="flex justify-center mb-2">{s.icon}</div>
                <div className="text-2xl font-black text-white">{s.num}</div>
                <div className="text-[11px] text-blue-200 font-medium mt-1 leading-tight">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Emergency card */}
          <div className="mt-4 bg-red-600/90 backdrop-blur-sm border border-red-400/30 rounded-2xl p-4 flex items-center gap-4 text-white">
            <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shrink-0">
              <Ambulance size={24}/>
            </div>
            <div>
              <div className="font-black text-sm">Cấp cứu 24/7</div>
              <div className="text-red-200 text-xs mt-0.5">Đội cấp cứu luôn sẵn sàng</div>
              <div className="text-xl font-black mt-1">1900 1234</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-slate-600 text-xs">
          © 2024 Hospital Management System v2.1 — Bảo hành bảo mật ISO 27001
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex items-center justify-center p-8" style={{background:'#0f172a'}}>
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl border border-white/20 flex items-center justify-center">
              <span className="text-white font-black text-lg">+</span>
            </div>
            <span className="text-white font-black text-xl tracking-widest">HOSPITAL</span>
          </div>

          {/* Card */}
          <div className="rounded-3xl border border-white/10 p-10 shadow-2xl"
            style={{background:'linear-gradient(150deg, #1e293b 0%, #0f172a 100%)'}}>

            {/* Header */}
            <div className="mb-8 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl"
                style={{background:'linear-gradient(135deg, #2563eb, #0ea5e9)'}}>
                <Lock size={26} className="text-white" />
              </div>
              <h2 className="text-2xl font-black text-white">Đăng nhập Nội Bộ</h2>
              <p className="text-slate-500 text-sm mt-1.5">Vui lòng sử dụng tài khoản được cấp</p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-950/60 border border-red-800/60 text-red-400 p-4 rounded-2xl text-sm mb-6 flex items-center gap-3 font-medium">
                <ShieldCheck size={18} className="shrink-0 text-red-500" />
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider text-xs">Tên đăng nhập</label>
                <input
                  required type="text"
                  className="w-full p-4 rounded-xl outline-none transition text-white font-medium placeholder-slate-600 border border-white/10 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  style={{background:'rgba(255,255,255,0.05)'}}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Nhập username..."
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider text-xs">Mật khẩu</label>
                <div className="relative">
                  <input
                    required
                    type={showPass ? 'text' : 'password'}
                    className="w-full p-4 pr-12 rounded-xl outline-none transition text-white font-medium placeholder-slate-600 border border-white/10 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    style={{background:'rgba(255,255,255,0.05)'}}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mật khẩu cá nhân..."
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-sky-400 transition">
                    {showPass ? <EyeOff size={20}/> : <Eye size={20}/>}
                  </button>
                </div>
                <p className="text-xs text-slate-600 mt-1.5">* Tài khoản test dùng mật khẩu: <code className="text-sky-400 font-mono bg-white/5 px-1.5 py-0.5 rounded">123</code></p>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-4 rounded-xl font-black text-white text-base shadow-xl transition-all mt-2 flex items-center justify-center gap-2 disabled:opacity-60"
                style={{background:'linear-gradient(135deg, #2563eb, #0ea5e9)', boxShadow:'0 8px 30px rgba(37,99,235,0.35)'}}>
                {loading
                  ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                  : <><Lock size={17}/> ĐĂNG NHẬP HỆ THỐNG</>
                }
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-white/5 text-center">
              <button onClick={() => navigate('/')}
                className="text-sm text-slate-600 hover:text-sky-400 font-semibold flex items-center justify-center gap-2 w-full transition">
                <ArrowLeft size={14}/> Về trang chủ bệnh nhân
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
