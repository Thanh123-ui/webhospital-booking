import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarCheck, Check, Activity, Award, ArrowRight, ChevronRight, User, Clock, FileText } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../services/AuthContext';

const BookingWizard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentPatient } = useAuth();
  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState({ dept: '', doctorId: '', date: '', time: '', name: '', phone: '', email: '', dob: '', symptoms: '' });
  const [bookedCode, setBookedCode] = useState('');
  
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [schedules, setSchedules] = useState([]);

  useEffect(() => {
    api.getDepartments().then(res => setDepartments(res.data)).catch(console.error);
    api.getDoctors().then(res => setDoctors(res.data)).catch(console.error);
    api.getSchedules().then(res => setSchedules(res.data)).catch(console.error);
    // Pre-select dept from URL param (e.g. /book?dept=1)
    const deptParam = searchParams.get('dept');
    if (deptParam) {
      setBookingData(prev => ({ ...prev, dept: parseInt(deptParam) }));
    }
  }, []);

  useEffect(() => {
    if (currentPatient) {
      setBookingData(prev => ({ 
        ...prev, name: currentPatient.name, phone: currentPatient.phone, email: currentPatient.email || '', dob: currentPatient.dob || ''
      }));
    }
  }, [currentPatient]);

  const now = new Date();
  const currentDateStr = now.toISOString().split('T')[0];
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const nonEmergencyDepts = departments.filter(d => !d.isEmergency);
  const availableDocs = doctors.filter(d => {
    const isEmergencyDoc = departments.find(dept => dept.id === d.deptId)?.isEmergency;
    if (isEmergencyDoc) return false;
    return !bookingData.dept || d.deptId === parseInt(bookingData.dept);
  });
  const docSchedules = schedules.filter(s => s.doctorId === bookingData.doctorId && s.booked < s.maxPatients);
  
  const availableDates = [...new Set(docSchedules.map(s => s.date))].filter(d => d >= currentDateStr).sort();
  const availableTimesRaw = docSchedules.filter(s => s.date === bookingData.date).map(s => s.time).sort();
  const availableTimes = availableTimesRaw.filter(time => {
    if (bookingData.date > currentDateStr) return true;
    const [h, m] = time.split(':').map(Number);
    return h > currentHour || (h === currentHour && m > currentMinute);
  });

  const morningTimes = availableTimes.filter(t => parseInt(t.split(':')[0]) < 12);
  const afternoonTimes = availableTimes.filter(t => parseInt(t.split(':')[0]) >= 12);

  const handleBooking = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: bookingData.name, phone: bookingData.phone, doctorId: bookingData.doctorId, date: bookingData.date, time: bookingData.time, symptoms: bookingData.symptoms, patientId: currentPatient ? currentPatient.id : null
      };
      const res = await api.createAppointment(payload);
      setBookedCode(res.data.code);
      setStep(4);
    } catch(err) {
      alert("Lỗi khi đặt lịch!");
    }
  };

  const selectedDoctor = doctors.find(d => d.id === bookingData.doctorId);
  const selectedDept = departments.find(d => d.id === parseInt(bookingData.dept));

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold mb-8 text-slate-800 border-b pb-4 flex items-center gap-2">
              <CalendarCheck className="text-blue-600"/> Đặt lịch khám bệnh
            </h2>
            
            <div className="flex items-center justify-between mb-10 relative px-2">
              <div className="absolute left-0 top-1/2 w-full h-1 bg-slate-100 -z-10"></div>
              <div className="absolute left-0 top-1/2 h-1 bg-blue-600 -z-10 transition-all duration-500" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 transition-colors ${step >= i ? 'bg-blue-600 text-white border-blue-100 shadow-md' : 'bg-white text-slate-400 border-slate-200'}`}>
                  {step > i ? <Check size={20} /> : i}
                </div>
              ))}
            </div>

            {step === 1 && (
              <div className="space-y-6 animate-in slide-in-from-right-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4">1. Chọn Chuyên khoa</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <button onClick={() => setBookingData({...bookingData, dept: '', doctorId: ''})} className={`p-4 border rounded-xl flex flex-col items-center justify-center gap-2 transition-all ${bookingData.dept === '' ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm ring-1 ring-blue-600' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'}`}>
                       <Activity size={28} className={bookingData.dept === '' ? "text-blue-600" : "text-slate-400"}/>
                       <span className="font-semibold text-sm text-center">Tất cả</span>
                    </button>
                    {nonEmergencyDepts.map(d => (
                      <button key={d.id} onClick={() => setBookingData({...bookingData, dept: d.id, doctorId: ''})} className={`p-4 border rounded-xl flex flex-col items-center justify-center gap-2 transition-all ${bookingData.dept === d.id ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm ring-1 ring-blue-600' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'}`}>
                        <Activity size={28} className={bookingData.dept === d.id ? "text-blue-600" : "text-slate-400"}/>
                        <span className="font-semibold text-sm text-center">{d.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 mt-8">2. Chọn Bác sĩ</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableDocs.map(doc => (
                      <div key={doc.id} onClick={() => setBookingData({...bookingData, doctorId: doc.id})} className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-4 ${bookingData.doctorId === doc.id ? 'border-blue-600 bg-blue-50 shadow-md ring-1 ring-blue-600' : 'border-slate-100 hover:border-blue-300 hover:shadow-sm'}`}>
                        <div className="text-5xl bg-white rounded-full p-2 shadow-sm border border-slate-100">{doc.avatar}</div>
                        <div className="flex-1">
                          <div className="font-bold text-slate-800 text-lg">{doc.name}</div>
                          <div className="text-sm text-blue-700 font-semibold">{doc.title}</div>
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Award size={12}/> {doc.exp}</div>
                        </div>
                        {bookingData.doctorId === doc.id && <Check className="text-blue-600" size={24}/>}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="pt-6 border-t mt-8 flex justify-end">
                  <button disabled={!bookingData.doctorId} onClick={() => setStep(2)} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors flex items-center gap-2">
                    Tiếp tục <ArrowRight size={18}/>
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-in slide-in-from-right-4">
                <div className="flex items-center gap-2 mb-6 text-blue-600 hover:text-blue-800 cursor-pointer font-semibold" onClick={() => setStep(1)}>
                  <ChevronRight size={20} className="rotate-180" /> Quay lại chọn bác sĩ
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex justify-between items-end">
                    Ngày khám <span className="text-xs font-normal text-slate-500">* Lịch trong quá khứ đã được ẩn</span>
                  </h3>
                  {availableDates.length === 0 ? (
                     <div className="p-4 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg">Bác sĩ này hiện không còn lịch trống trong thời gian tới. Vui lòng chọn bác sĩ khác.</div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {availableDates.map(date => {
                        const dObj = new Date(date);
                        const dayStr = dObj.toLocaleDateString('vi-VN', { weekday: 'short' });
                        const dateStr = dObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                        return (
                          <button key={date} onClick={() => setBookingData({...bookingData, date, time: ''})} className={`py-3 px-2 border rounded-xl flex flex-col items-center gap-1 transition-all ${bookingData.date === date ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-200' : 'bg-white hover:border-blue-300 text-slate-700'}`}>
                            <span className="text-xs font-semibold uppercase opacity-80">{dayStr}</span>
                            <span className="font-bold text-lg">{dateStr}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {bookingData.date && (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 mt-8">Khung giờ khám</h3>
                    {availableTimes.length === 0 ? (
                       <div className="p-4 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg">Ngày này đã hết giờ làm việc. Vui lòng chọn ngày khác.</div>
                    ) : (
                      <>
                        {morningTimes.length > 0 && (
                          <div className="mb-6">
                            <div className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-400"></div> Buổi sáng</div>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                              {morningTimes.map(time => (
                                <button key={time} onClick={() => setBookingData({...bookingData, time})} className={`py-2 px-4 border rounded-xl flex items-center justify-center gap-2 transition-all font-semibold ${bookingData.time === time ? 'bg-blue-50 border-blue-600 text-blue-700 ring-1 ring-blue-600 shadow-sm' : 'bg-white hover:border-blue-300 text-slate-700'}`}>{time}</button>
                              ))}
                            </div>
                          </div>
                        )}
                        {afternoonTimes.length > 0 && (
                          <div>
                            <div className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-400"></div> Buổi chiều</div>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                              {afternoonTimes.map(time => (
                                <button key={time} onClick={() => setBookingData({...bookingData, time})} className={`py-2 px-4 border rounded-xl flex items-center justify-center gap-2 transition-all font-semibold ${bookingData.time === time ? 'bg-blue-50 border-blue-600 text-blue-700 ring-1 ring-blue-600 shadow-sm' : 'bg-white hover:border-blue-300 text-slate-700'}`}>{time}</button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
                <div className="pt-6 border-t mt-8 flex justify-end gap-3">
                  <button disabled={!bookingData.time} onClick={() => setStep(3)} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors flex items-center gap-2">
                    Tiếp tục <ArrowRight size={18}/>
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <form onSubmit={handleBooking} className="space-y-6 animate-in slide-in-from-right-4">
                 <div className="flex items-center gap-2 mb-6 text-blue-600 hover:text-blue-800 cursor-pointer font-semibold" onClick={() => setStep(2)}>
                  <ChevronRight size={20} className="rotate-180" /> Quay lại chọn giờ
                </div>

                <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 mb-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Thông tin bệnh nhân</h3>
                  {currentPatient && (
                    <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-6 border border-green-200 flex items-center gap-2">
                       <User size={16}/> Đang đặt lịch bằng hồ sơ: <b className="text-base">{currentPatient.name}</b>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Họ và tên <span className="text-red-500">*</span></label>
                      <input required type="text" className={`w-full p-3 border rounded-xl outline-none transition-all ${currentPatient ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`} 
                        value={bookingData.name} onChange={e => setBookingData({...bookingData, name: e.target.value})} placeholder="VD: Nguyễn Văn A" readOnly={!!currentPatient} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Số điện thoại <span className="text-red-500">*</span></label>
                      <input required type="tel" className={`w-full p-3 border rounded-xl outline-none transition-all ${currentPatient ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                        value={bookingData.phone} onChange={e => setBookingData({...bookingData, phone: e.target.value})} placeholder="VD: 0901234567" readOnly={!!currentPatient} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 mb-1">Triệu chứng / Ghi chú cho bác sĩ</label>
                      <textarea rows="3" className="w-full p-3 border border-slate-300 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none" 
                        value={bookingData.symptoms} onChange={e => setBookingData({...bookingData, symptoms: e.target.value})} placeholder="Mô tả sơ bộ..." />
                    </div>
                  </div>
                </div>
                
                <div className="pt-2 flex justify-end">
                  <button type="submit" className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white px-10 py-4 rounded-xl font-bold text-lg shadow-lg shadow-green-600/30 transition-colors flex items-center justify-center gap-2">
                    <Check size={24}/> Hoàn tất đặt lịch
                  </button>
                </div>
              </form>
            )}

            {step === 4 && (
              <div className="text-center py-12 animate-in zoom-in-95">
                <div className="relative w-24 h-24 mx-auto mb-6">
                   <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-50"></div>
                   <div className="relative w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center shadow-xl">
                     <Check size={48} strokeWidth={3} />
                   </div>
                </div>
                <h3 className="text-3xl font-extrabold text-slate-800 mb-3">Đặt lịch thành công!</h3>
                <p className="text-slate-600 mb-8 max-w-md mx-auto">Cảm ơn bạn đã tin tưởng ClinicCare. Hãy tới phòng khám đúng giờ nhé.</p>
                
                <div className="bg-white border-2 border-dashed border-blue-200 rounded-2xl p-8 max-w-md mx-auto text-left relative overflow-hidden shadow-sm mb-10">
                  <div className="absolute top-0 left-0 w-full h-2 bg-blue-500"></div>
                  <div className="text-center mb-6">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Mã Phiếu Khám</div>
                    <div className="text-4xl font-black text-blue-600 tracking-widest">{bookedCode}</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <button onClick={() => navigate('/track')} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-blue-700 transition">Tra cứu lịch hẹn</button>
                  <button onClick={() => navigate('/')} className="bg-white text-slate-600 border border-slate-300 px-8 py-3 rounded-xl font-bold hover:bg-slate-50 transition">Về trang chủ</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {step < 4 && (
          <div className="w-full lg:w-80 shrink-0">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 sticky top-24">
              <h3 className="font-bold text-lg text-slate-800 border-b border-slate-100 pb-4 mb-4 flex items-center gap-2">
                <FileText size={20} className="text-blue-600"/> Tóm tắt lịch hẹn
              </h3>
              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-50 p-2 rounded-lg text-blue-600 mt-1"><User size={18}/></div>
                  <div>
                    <div className="text-xs text-slate-500 font-semibold uppercase">Bác sĩ phụ trách</div>
                    <div className="font-bold text-slate-800 mt-0.5">{selectedDoctor ? selectedDoctor.name : '---'}</div>
                    {selectedDept && <div className="text-xs text-blue-600 font-medium">{selectedDept.name}</div>}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-blue-50 p-2 rounded-lg text-blue-600 mt-1"><Clock size={18}/></div>
                  <div>
                    <div className="text-xs text-slate-500 font-semibold uppercase">Thời gian khám</div>
                    <div className="font-bold text-slate-800 mt-0.5">{bookingData.time || '---'}</div>
                    <div className="text-sm text-slate-600">{bookingData.date || '---'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingWizard;