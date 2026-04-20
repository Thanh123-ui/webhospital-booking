import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, User, Phone, Mail, FileText, ArrowRight, Activity } from 'lucide-react';
import { useAuth } from '../../services/AuthContext';
import { api } from '../../services/api';

const PatientAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentPatient } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const redirectTo = location.state?.from || '/';
  
  // Login state
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  // Register state
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
      setError(err.response?.data?.message || 'Có lỗi xảy ra. Hãy thử lại!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl w-full max-w-md border border-slate-100 relative overflow-hidden">
        
        <div className="text-center mb-8">
           <div className="bg-blue-600 text-white w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/30">
               <Activity size={32}/>
           </div>
           <h2 className="text-2xl font-bold text-slate-800">{isLogin ? 'Đăng nhập Bệnh nhân' : 'Tạo hồ sơ Y tế mới'}</h2>
           <p className="text-slate-500 mt-2 text-sm">Quản lý lịch khám và xem đơn thuốc dễ dàng</p>
        </div>

        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm mb-6 border border-red-100">{error}</div>}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                 <label className="block text-sm font-bold text-slate-700 mb-1">Họ và Tên</label>
                 <div className="relative">
                   <User className="absolute left-3 top-3 text-slate-400" size={18}/>
                   <input required type="text" className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" 
                     value={regData.name} onChange={e=>setRegData({...regData, name: e.target.value})} placeholder="Nguyễn Văn A" />
                 </div>
              </div>
              <div>
                 <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                 <div className="relative">
                   <Mail className="absolute left-3 top-3 text-slate-400" size={18}/>
                   <input required type="email" className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" 
                     value={regData.email} onChange={e=>setRegData({...regData, email: e.target.value})} placeholder="email@gmail.com" />
                 </div>
              </div>
            </>
          )}

          <div>
             <label className="block text-sm font-bold text-slate-700 mb-1">Số điện thoại</label>
             <div className="relative">
               <Phone className="absolute left-3 top-3 text-slate-400" size={18}/>
               <input required type="tel" className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" 
                 value={isLogin ? phone : regData.phone} onChange={e => isLogin ? setPhone(e.target.value) : setRegData({...regData, phone: e.target.value})} placeholder="090..." />
             </div>
          </div>
          
          <div>
             <label className="block text-sm font-bold text-slate-700 mb-1">Mật khẩu</label>
             <div className="relative">
               <Lock className="absolute left-3 top-3 text-slate-400" size={18}/>
               <input required type="password" className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" 
                 value={isLogin ? password : regData.password} onChange={e => isLogin ? setPassword(e.target.value) : setRegData({...regData, password: e.target.value})} placeholder="••••••" />
             </div>
          </div>

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 mt-6">
            {isLogin ? 'Đăng nhập' : 'Hoàn tất đăng ký'} <ArrowRight size={18}/>
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-500">
           {isLogin ? "Chưa có hồ sơ y tế?" : "Đã có tài khoản?"}{' '}
           <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-blue-600 font-bold hover:underline">
             {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default PatientAuth;
