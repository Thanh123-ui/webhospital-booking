import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowRight, ShieldAlert, Mail, Cross } from 'lucide-react';
import { useAuth } from '../../services/AuthContext';
import { api } from '../../services/api';

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
        localStorage.setItem('staffAccessToken', res.data.accessToken);
        setCurrentStaffUser(res.data.user);
        navigate('/admin/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Lỗi kết nối đến máy chủ. Vui lòng kiểm tra backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-background md:flex-row">
      <div className="relative hidden w-1/2 overflow-hidden bg-primary md:flex md:flex-col">
        <div className="absolute inset-0 z-10 bg-primary/20 mix-blend-multiply" />
        <img
          alt="Không gian bệnh viện hiện đại"
          className="absolute inset-0 z-0 h-full w-full object-cover opacity-80"
          src="https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=1600&q=80"
        />

        <div className="relative z-20 flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/16 text-on-primary backdrop-blur-sm">
              <Cross size={26} strokeWidth={2.4} />
            </div>
            <div>
              <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-primary">Hospital Admin</h1>
              <p className="mt-1 text-sm uppercase tracking-[0.22em] text-on-primary/80">Hệ thống quản trị thông minh</p>
            </div>
          </div>

          <div className="max-w-md">
            <h2 className="mb-6 font-headline text-5xl font-semibold leading-tight text-on-primary">
              Kiến tạo sự an tâm trong từng thao tác.
            </h2>
            <div className="mb-8 h-1 w-16 rounded-full bg-on-primary/30" />
            <p className="text-lg font-light leading-relaxed text-on-primary/90">
              Hệ thống nội bộ bảo mật cao, thiết kế tối giản dành riêng cho quy trình làm việc chặt chẽ của đội ngũ y tế và quản trị.
            </p>
          </div>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col justify-between overflow-y-auto bg-surface-container-lowest">
        <div className="flex items-center justify-between border-b border-surface-variant/30 p-6 md:hidden">
          <div className="flex items-center gap-2">
            <Cross size={24} className="text-primary" strokeWidth={2.4} />
            <span className="font-headline text-lg font-extrabold tracking-tight text-primary">Hospital Admin</span>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center p-8 md:p-16 lg:p-24">
          <div className="w-full max-w-md space-y-10">
            <div className="space-y-3">
              <h2 className="font-headline text-3xl font-semibold tracking-tight text-on-surface">Đăng nhập hệ thống</h2>
              <p className="text-base text-on-surface-variant">Hệ thống quản trị nội bộ dành cho nhân viên y tế.</p>
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                  <label className="block text-sm font-medium text-on-surface" htmlFor="email">
                    Tên đăng nhập / Email
                  </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Mail size={18} className="text-on-surface-variant/70" />
                  </div>
                  <input
                    id="email"
                    type="text"
                    required
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="nhanvien@hospital.vn"
                    className="block w-full rounded-2xl border-none bg-surface-container-low py-3.5 pl-11 pr-4 text-base text-on-surface placeholder:text-on-surface-variant/50 transition-all duration-200 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                  <label className="block text-sm font-medium text-on-surface" htmlFor="password">
                    Mật khẩu
                  </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Lock size={18} className="text-on-surface-variant/70" />
                  </div>
                  <input
                    id="password"
                    required
                    autoComplete="current-password"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full rounded-2xl border-none bg-surface-container-low py-3.5 pl-11 pr-12 text-base text-on-surface placeholder:text-on-surface-variant/50 transition-all duration-200 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-on-surface-variant hover:text-on-surface"
                    onClick={() => setShowPass(!showPass)}
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-outline-variant bg-surface-container-low text-primary focus:ring-primary"
                  />
                  <label htmlFor="remember-me" className="ml-2 cursor-pointer text-base text-on-surface-variant">
                    Ghi nhớ đăng nhập
                  </label>
                </div>
                <button
                  type="button"
                  className="text-base font-medium text-primary transition-colors hover:text-primary-dim"
                  onClick={() => setError('Vui lòng liên hệ quản trị viên hệ thống để được cấp lại mật khẩu.')}
                >
                  Quên mật khẩu?
                </button>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-dim px-6 py-4 font-semibold text-on-primary shadow-sm transition-all duration-300 hover:from-primary-dim hover:to-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-70"
                >
                  <span>{loading ? 'Đang đăng nhập' : 'Đăng nhập'}</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </form>

            <div className="mt-8 border-t border-surface-variant/30 pt-8 text-center">
              <p className="flex items-center justify-center gap-1 text-xs text-on-surface-variant/70">
                <ShieldAlert size={14} />
                <span>Được bảo vệ bằng tiêu chuẩn bảo mật nội bộ dành cho hệ thống y tế.</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-surface-container-low bg-surface-container-lowest px-8 py-6 text-xs tracking-wide text-on-surface-variant md:flex-row">
          <p>© 2026 Hospital.</p>
          <p>Hệ thống nội bộ - Bảo mật theo tiêu chuẩn quản trị y tế.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
