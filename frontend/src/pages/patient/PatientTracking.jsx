import React, { useState, useEffect } from 'react';
import { Search, FileText, Clock, CheckCircle, XCircle, AlertCircle, Calendar, Phone, User, Stethoscope, MapPin, ArrowRight, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { getStatusBadge } from '../../utils/helpers';

const STATUS_GUIDE = [
  { icon: <Clock size={15}/>, color: 'text-yellow-500 bg-yellow-50 border-yellow-200', label: 'Chờ xác nhận', desc: 'Lịch hẹn vừa được tạo' },
  { icon: <CheckCircle size={15}/>, color: 'text-blue-500 bg-blue-50 border-blue-200', label: 'Đã xác nhận', desc: 'Bệnh viện đã duyệt lịch' },
  { icon: <AlertCircle size={15}/>, color: 'text-green-500 bg-green-50 border-green-200', label: 'Sẵn sàng khám', desc: 'Đã điều dưỡng ghi sinh hiệu' },
  { icon: <CheckCircle size={15}/>, color: 'text-emerald-500 bg-emerald-50 border-emerald-200', label: 'Đã khám xong', desc: 'Có thể xem kết quả' },
  { icon: <XCircle size={15}/>, color: 'text-red-500 bg-red-50 border-red-200', label: 'Đã hủy', desc: 'Lịch hẹn bị hủy' },
];

const PatientTracking = () => {
  const [searchCode, setSearchCode] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    api.getAllAppointments().then(res => setAppointments(res.data)).catch(console.error);
    api.getDoctors().then(res => setDoctors(res.data)).catch(console.error);
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError('');
    await new Promise(r => setTimeout(r, 600)); // UX delay
    const appt = appointments.find(a => a.code === searchCode.trim().toUpperCase() && a.phone === searchPhone.trim());
    if (appt) { setResult(appt); } else { setError('Không tìm thấy lịch hẹn phù hợp với thông tin đã nhập.'); }
    setLoading(false);
  };

  const doctor = result ? doctors.find(d => d.id === result?.doctorId) : null;

  const getStepIndex = (status) => {
    const steps = ['PENDING','CONFIRMED','ARRIVED','READY','DONE'];
    return steps.indexOf(status);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/40 font-['Inter',sans-serif]">
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-white">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur border border-white/20">
              <FileText size={20}/>
            </div>
            <span className="text-blue-200 font-semibold text-sm uppercase tracking-widest">Tra cứu lịch hẹn</span>
          </div>
          <h1 className="text-4xl font-black mb-3">Kiểm tra Tình trạng Lịch Khám</h1>
          <p className="text-blue-200 text-base max-w-xl">Nhập mã lịch hẹn và số điện thoại để xem trạng thái, thông tin bác sĩ và thời gian khám của bạn.</p>

          {/* Search Form */}
          <form onSubmit={handleSearch}
            className="mt-8 bg-white/10 backdrop-blur border border-white/20 rounded-3xl p-2 flex flex-col md:flex-row gap-2">
            <div className="flex-1 relative">
              <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300"/>
              <input required type="text"
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/10 text-white placeholder-blue-300 outline-none focus:bg-white/20 transition text-sm font-medium border border-transparent focus:border-white/30"
                placeholder="Mã lịch hẹn (VD: BK-1001)"
                value={searchCode} onChange={e => setSearchCode(e.target.value)} />
            </div>
            <div className="flex-1 relative">
              <Phone size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300"/>
              <input required type="tel"
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/10 text-white placeholder-blue-300 outline-none focus:bg-white/20 transition text-sm font-medium border border-transparent focus:border-white/30"
                placeholder="Số điện thoại đăng ký"
                value={searchPhone} onChange={e => setSearchPhone(e.target.value)} />
            </div>
            <button type="submit" disabled={loading}
              className="px-8 py-3.5 rounded-2xl bg-white text-blue-900 font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-50 transition shadow-lg disabled:opacity-70 shrink-0">
              {loading
                ? <RefreshCw size={16} className="animate-spin"/>
                : <><Search size={16}/> Tra cứu</>
              }
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center gap-4 mb-8 animate-in fade-in slide-in-from-top-2">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
              <XCircle size={20} className="text-red-500"/>
            </div>
            <div>
              <p className="font-bold text-red-800 text-sm">Không tìm thấy kết quả</p>
              <p className="text-red-600 text-sm mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-4 mb-10">
            {/* Header Card */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden mb-4">
              <div className="px-8 py-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-50"
                style={{background:'linear-gradient(90deg, #f8fafc, #eff6ff)'}}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-lg">#</div>
                  <div>
                    <div className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-0.5">Mã lịch hẹn</div>
                    <div className="font-black text-xl text-slate-800 font-mono">{result.code}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(result.status)}
                  {result.is_emergency && (
                    <span className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-xl font-bold animate-pulse">🚨 CẤP CỨU</span>
                  )}
                </div>
              </div>

              {/* Progress Steps (không show cho CANCELED) */}
              {result.status !== 'CANCELED' && result.status !== 'EMERGENCY' && (
                <div className="px-8 py-6 border-b border-slate-50">
                  <div className="flex items-center gap-0">
                    {['Chờ duyệt','Đã xác nhận','Đến viện','Chuẩn bị khám','Hoàn thành'].map((step, i) => {
                      const current = getStepIndex(result.status);
                      const done = i <= current;
                      const active = i === current;
                      return (
                        <React.Fragment key={i}>
                          <div className="flex flex-col items-center gap-1.5 relative">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${
                              done ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-400'
                            } ${active ? 'ring-4 ring-blue-100' : ''}`}>
                              {done && !active ? '✓' : i+1}
                            </div>
                            <span className={`text-[10px] font-semibold whitespace-nowrap ${done ? 'text-blue-600' : 'text-slate-400'}`}>{step}</span>
                          </div>
                          {i < 4 && <div className={`flex-1 h-0.5 mb-5 mx-1 ${i < current ? 'bg-blue-600' : 'bg-slate-100'}`}/>}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Info Grid */}
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0">
                    <User size={18} className="text-blue-600"/>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Bệnh nhân</div>
                    <div className="font-bold text-slate-800 text-base">{result.patientName}</div>
                    <div className="text-xs text-slate-400">{result.phone}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-teal-50 rounded-2xl flex items-center justify-center shrink-0">
                    <Stethoscope size={18} className="text-teal-600"/>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Bác sĩ phụ trách</div>
                    <div className="font-bold text-slate-800 text-base">{doctor?.name || 'Đội cấp cứu'}</div>
                    <div className="text-xs text-slate-400">{doctor?.title || 'Bệnh viện'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0">
                    <Calendar size={18} className="text-indigo-600"/>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Ngày khám</div>
                    <div className="font-bold text-slate-800 text-base">{result.date}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0">
                    <Clock size={18} className="text-amber-600"/>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Giờ khám</div>
                    <div className="font-bold text-blue-600 text-2xl">{result.time}</div>
                  </div>
                </div>

                {result.symptoms && (
                  <div className="md:col-span-2 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Triệu chứng / Ghi chú</div>
                    <p className="text-slate-700 text-sm leading-relaxed">{result.symptoms}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Status Guide */}
        {!result && !error && (
          <div>
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-5 text-center">Hướng dẫn tra cứu trạng thái</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {STATUS_GUIDE.map((s, i) => (
                <div key={i} className={`border rounded-2xl px-4 py-4 flex flex-col items-center text-center gap-2 ${s.color}`}>
                  <div className="text-current">{s.icon}</div>
                  <div className="font-bold text-xs">{s.label}</div>
                  <div className="text-[11px] opacity-70">{s.desc}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-start gap-4">
              <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0 text-blue-600">
                <AlertCircle size={18}/>
              </div>
              <div>
                <p className="font-bold text-blue-800 text-sm mb-1">Lưu ý khi tra cứu</p>
                <ul className="text-blue-700 text-xs space-y-1 list-disc ml-4">
                  <li>Mã lịch hẹn được gửi qua SMS sau khi đặt thành công (VD: <code className="bg-blue-100 px-1 rounded font-mono">BK-1001</code>)</li>
                  <li>Số điện thoại phải khớp với số đã đăng ký lúc đặt lịch</li>
                  <li>Nếu không tìm thấy, hãy liên hệ lễ tân: <strong>1800-xxxx</strong></li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientTracking;