import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, User, Phone, Mail, ArrowRight, Stethoscope, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../services/AuthContext';
import { api } from '../../services/api';

const PatientAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentPatient } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const redirectTo = location.state?.from || '/';

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [regData, setRegData] = useState({ name: '', phone: '', email: '', password: '', dob: '', address: '' });

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (isLogin) {
        const res = await api.loginPatient(phone, password);
        localStorage.setItem('patientAccessToken', res.data.accessToken);
        setCurrentPatient(res.data.user);
        navigate(redirectTo, { replace: true });
      } else {
        await api.registerPatient(regData);
        const loginRes = await api.loginPatient(regData.phone, regData.password);
        localStorage.setItem('patientAccessToken', loginRes.data.accessToken);
        setCurrentPatient(loginRes.data.user);
        navigate(redirectTo, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute right-[-8%] top-[-8%] h-[40vw] w-[40vw] rounded-full bg-primary-container/35 blur-[120px]" />
      <div className="absolute bottom-[-15%] left-[-10%] h-[50vw] w-[50vw] rounded-full bg-secondary-container/25 blur-[150px]" />

      <main className="relative z-10 w-full max-w-[440px] rounded-3xl border border-white/80 bg-surface-container-lowest p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.06)] backdrop-blur-3xl sm:p-10">
        <header className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-primary-container">
            <Stethoscope size={24} className="text-primary" />
          </div>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-on-surface">
            {isLogin ? 'Chào mừng trở lại' : 'Tạo hồ sơ bệnh nhân'}
          </h1>
          <p className="text-sm leading-relaxed text-on-surface-variant">
            {isLogin
              ? 'Đăng nhập để tiếp tục hành trình chăm sóc sức khỏe của bạn tại Hospital.'
              : 'Đăng ký hồ sơ để đặt lịch khám, theo dõi lịch hẹn và quản lý thông tin y tế dễ dàng hơn.'}
          </p>
        </header>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleAuth} className="flex flex-col gap-6">
          {!isLogin ? (
            <>
              <div className="group">
                <label className="mb-1 block px-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Họ và tên
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant transition-colors group-focus-within:text-primary" size={18} />
                  <input
                    required
                    type="text"
                    className="w-full rounded-t-xl border-0 border-b border-outline-variant/20 bg-surface-container-low py-3 pl-10 pr-3 text-on-surface outline-none transition-all focus:border-b-2 focus:border-primary focus:bg-surface-container-lowest"
                    value={regData.name}
                    onChange={(e) => setRegData({ ...regData, name: e.target.value })}
                    placeholder="Nhập họ và tên"
                  />
                </div>
              </div>

              <div className="group">
                <label className="mb-1 block px-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant transition-colors group-focus-within:text-primary" size={18} />
                  <input
                    required
                    type="email"
                    className="w-full rounded-t-xl border-0 border-b border-outline-variant/20 bg-surface-container-low py-3 pl-10 pr-3 text-on-surface outline-none transition-all focus:border-b-2 focus:border-primary focus:bg-surface-container-lowest"
                    value={regData.email}
                    onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                    placeholder="email@hospital.vn"
                  />
                </div>
              </div>
            </>
          ) : null}

          <div className="group">
            <label className="mb-1 block px-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Số điện thoại
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant transition-colors group-focus-within:text-primary" size={18} />
              <input
                required
                type="tel"
                className="w-full rounded-t-xl border-0 border-b border-outline-variant/20 bg-surface-container-low py-3 pl-10 pr-3 text-on-surface outline-none transition-all focus:border-b-2 focus:border-primary focus:bg-surface-container-lowest"
                value={isLogin ? phone : regData.phone}
                onChange={(e) => (isLogin ? setPhone(e.target.value) : setRegData({ ...regData, phone: e.target.value }))}
                placeholder="Nhập số điện thoại"
              />
            </div>
          </div>

          <div className="group">
            <div className="mb-1 flex items-end justify-between px-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Mật khẩu
              </label>
              {isLogin ? (
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:text-primary-dim"
                  onClick={() => setError('Vui lòng liên hệ bệnh viện để được hỗ trợ cấp lại mật khẩu.')}
                >
                  Quên mật khẩu?
                </button>
              ) : null}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant transition-colors group-focus-within:text-primary" size={18} />
              <input
                required
                type={showPassword ? 'text' : 'password'}
                className="w-full rounded-t-xl border-0 border-b border-outline-variant/20 bg-surface-container-low py-3 pl-10 pr-10 text-on-surface outline-none transition-all focus:border-b-2 focus:border-primary focus:bg-surface-container-lowest"
                value={isLogin ? password : regData.password}
                onChange={(e) => (isLogin ? setPassword(e.target.value) : setRegData({ ...regData, password: e.target.value }))}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="mt-2 flex flex-col gap-4">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-3xl bg-gradient-to-r from-primary to-primary-dim px-6 py-4 font-headline text-base font-semibold text-on-primary shadow-[0_4px_20px_-10px_rgba(36,104,107,0.4)] transition-all hover:brightness-110 hover:shadow-[0_8px_25px_-10px_rgba(36,104,107,0.6)]"
            >
              {isLogin ? 'Đăng nhập' : 'Hoàn tất đăng ký'}
              <ArrowRight size={16} />
            </button>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-outline-variant/15" />
              <span className="mx-4 flex-shrink-0 bg-surface-container-lowest px-2 text-xs font-medium uppercase tracking-widest text-outline">
                Hoặc
              </span>
              <div className="flex-grow border-t border-outline-variant/15" />
            </div>

            <div className="text-center text-sm text-on-surface-variant">
              {isLogin ? 'Chưa có hồ sơ tại Hospital?' : 'Đã có tài khoản?'}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="ml-1 font-semibold text-primary underline-offset-4 hover:underline"
              >
                {isLogin ? 'Đăng ký tài khoản mới' : 'Đăng nhập ngay'}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};

export default PatientAuth;
