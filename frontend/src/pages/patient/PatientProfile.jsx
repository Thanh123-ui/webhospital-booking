import React, { useState, useEffect } from 'react';
import { useAuth } from '../../services/AuthContext';
import { User, Calendar, FileText, Activity, Clock, Printer, Star } from 'lucide-react';
import { api } from '../../services/api';
import { getStatusBadge } from '../../utils/helpers';

const PatientProfile = () => {
  const { currentPatient, setCurrentPatient } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [printData, setPrintData] = useState(null);
  
  const [ratingModal, setRatingModal] = useState(null);
  const [ratingVal, setRatingVal] = useState(5);
  const [ratingComment, setRatingComment] = useState('');

  const [editProfileModal, setEditProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({ cccd: '', dob: '', gender: '' });

  const handleOpenEdit = () => {
    setProfileData({ cccd: currentPatient.cccd || '', dob: currentPatient.dob || '', gender: currentPatient.gender || '' });
    setEditProfileModal(true);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
       const res = await api.updatePatientProfile(currentPatient.id, profileData);
       setCurrentPatient(res.data.user);
       setEditProfileModal(false);
    } catch(err) {
       alert("Lỗi cập nhật thông tin.");
    }
  };

  const fetchAppts = () => {
    if (currentPatient) {
      api.getAllAppointments().then(res => {
        const myAppts = res.data.filter(a => a.phone === currentPatient.phone);
        setAppointments(myAppts);
      }).catch(console.error);
    }
  }

  useEffect(() => {
    fetchAppts();
  }, [currentPatient]);

  const handleSubmitRating = async (e) => {
     e.preventDefault();
     if (!ratingModal) return;
     try {
       await api.submitRating({ apptId: ratingModal.id, doctorName: ratingModal.doctor, rating: ratingVal, comment: ratingComment });
       alert("Cảm ơn bạn đã đánh giá!");
       setRatingModal(null);
       setRatingVal(5);
       setRatingComment('');
     } catch (err) {
       alert("Lỗi Gửi đánh giá.");
     }
  }

  const handleCancelAppt = async (id) => {
    if(!window.confirm("Bạn có chắc chắn muốn hủy lịch khám này không?")) return;
    try {
      await api.cancelAppointment(id, { role: 'PATIENT', reason: 'Bệnh nhân tự hủy qua cổng thông tin' });
      fetchAppts();
      alert("Đã gửi yêu cầu hủy lịch.");
    } catch(err) {
      alert("Lỗi khi hủy lịch.");
    }
  }

  if (!currentPatient) return null;

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 animate-in fade-in">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Info */}
        <div className="w-full md:w-80 shrink-0">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 sticky top-24">
            <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl shadow-inner">
              <User />
            </div>
            <h2 className="text-xl font-bold text-center text-slate-800 mb-1">{currentPatient.name}</h2>
            <p className="text-center text-slate-500 text-sm mb-6 pb-6 border-b">{currentPatient.phone}</p>
            
            <div className="space-y-4 text-sm mb-6">
              <div className="flex justify-between items-center"><span className="text-slate-500">Ngày sinh:</span> <span className="font-semibold text-slate-700">{currentPatient.dob || '---'}</span></div>
              <div className="flex justify-between items-center"><span className="text-slate-500">Giới tính:</span> <span className="font-semibold text-slate-700">{currentPatient.gender || '---'}</span></div>
              <div className="flex justify-between items-center"><span className="text-slate-500">CCCD:</span> <span className="font-semibold text-slate-700">{currentPatient.cccd || '---'}</span></div>
              <div className="flex justify-between items-center"><span className="text-slate-500">Email:</span> <span className="font-semibold text-slate-700 break-all">{currentPatient.email || '---'}</span></div>
            </div>
            <button onClick={handleOpenEdit} className="w-full py-2.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 font-bold rounded-xl transition">Chỉnh sửa hồ sơ</button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-8">
          
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
             <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 pb-4 border-b">
               <Activity className="text-teal-500"/> Lịch hẹn Chờ khám
             </h3>
             <div className="space-y-4">
                {appointments.filter(a => a.status !== 'COMPLETED' && a.status !== 'CANCELED').map(appt => (
                  <div key={appt.id} className="p-4 border rounded-2xl flex flex-col md:flex-row justify-between md:items-center gap-4 bg-slate-50 hover:bg-white transition hover:shadow-md hover:border-blue-200">
                     <div>
                       <div className="text-xs text-blue-600 font-bold mb-1 uppercase tracking-wider">{appt.code}</div>
                       <div className="font-semibold text-slate-800 flex items-center gap-2"><Calendar size={16}/> {appt.date} <span className="text-slate-300">|</span> <Clock size={16}/> {appt.time}</div>
                     </div>
                      <div>{getStatusBadge(appt.status)}</div>
                      {(appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
                         <button onClick={() => handleCancelAppt(appt.id)} className="text-xs text-red-500 hover:text-red-700 font-bold border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition">Hủy lịch</button>
                      )}
                   </div>
                ))}
                {appointments.filter(a => a.status !== 'COMPLETED' && a.status !== 'CANCELED').length === 0 && (
                   <div className="text-slate-500 text-sm p-4 bg-slate-50 rounded-lg">Bạn không có lịch trình khám nào đang chờ.</div>
                )}
             </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
             <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 pb-4 border-b">
               <FileText className="text-blue-500"/> Lịch sử Khám bệnh & Đơn thuốc
             </h3>
             <div className="space-y-6">
               {(currentPatient.medicalHistory || []).map((history, idx) => (
                 <div key={idx} className="border-l-4 border-blue-500 pl-6 py-2 relative">
                   <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[8px] top-4 border-2 border-white"></div>
                   <div className="text-sm font-semibold text-blue-600 mb-1">{history.date}</div>
                   <div className="font-bold text-slate-800 text-lg mb-2">{history.diagnosis || 'Không có chẩn đoán'}</div>
                   <div className="flex items-center justify-between mb-3">
                      <div className="text-sm text-slate-600"><span className="text-slate-400">Bác sĩ khám:</span> {history.doctor || '---'}</div>
                      <button onClick={()=>setRatingModal(history)} className="text-xs bg-yellow-50 text-yellow-600 hover:bg-yellow-400 hover:text-white px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold border border-yellow-200 hover:border-yellow-400 transition">
                        <Star size={12} fill="currentColor"/> Đánh giá Bác sĩ
                      </button>
                   </div>
                   
                   {history.prescription && (
                     <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-sm">
                       <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-orange-800">💊 Đơn thuốc:</span>
                          <button onClick={() => setPrintData(history)} className="text-orange-700 bg-orange-200 hover:bg-orange-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold transition">
                             <Printer size={14}/> Xuất / In Toa
                          </button>
                       </div>
                       <div className="text-orange-900 whitespace-pre-line leading-relaxed">{history.prescription}</div>
                     </div>
                   )}
                   {history.notes && (
                     <div className="text-sm text-slate-500 mt-3 italic">Lưu ý: {history.notes}</div>
                   )}
                 </div>
               ))}
               {(!currentPatient.medicalHistory || currentPatient.medicalHistory.length === 0) && (
                 <div className="text-slate-500 text-center py-8">Chưa có dữ liệu khám bệnh.</div>
               )}
             </div>
          </div>

        </div>
      </div>

      {/* E-Prescription Print Modal */}
      {printData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 border-b flex justify-between items-center bg-slate-50 no-print">
                 <h2 className="font-bold text-lg text-slate-800">Xem trước Toa Thuốc</h2>
                 <button onClick={()=>setPrintData(null)} className="text-slate-500 hover:text-red-500 font-bold text-xl">&times;</button>
              </div>

              {/* Phần được in */}
              <div id="print-section" className="p-8 bg-white overflow-y-auto print:p-0 print:absolute print:top-0 print:left-0 print:w-[A5] print:h-screen print:m-0 print:shadow-none">
                 <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
                    <h1 className="text-2xl font-black text-blue-800 uppercase tracking-widest mb-1">ClinicCare</h1>
                    <p className="text-sm text-slate-600 font-semibold">Phòng Khám Đa Khoa Quốc Tế</p>
                    <p className="text-xs text-slate-500">123 Nguyễn Văn Linh, Quận 7, TP.HCM | Hotline: 1900 1234</p>
                 </div>
                 
                 <h2 className="text-2xl font-bold text-center uppercase mb-8 tracking-wide">Toa Thuốc</h2>

                 <div className="space-y-2 text-sm mb-6 pb-6 border-b border-slate-200">
                    <div className="grid grid-cols-2 gap-4">
                       <div><b>Bệnh nhân:</b> {currentPatient.name}</div>
                       <div><b>Mã BN:</b> UID-{currentPatient.id}</div>
                       <div><b>Năm sinh:</b> {currentPatient.dob?.split('-')[0] || '---'}</div>
                       <div><b>SĐT:</b> {currentPatient.phone}</div>
                    </div>
                    <div className="mt-4 pt-2 border-t border-slate-50">
                       <b>Chẩn đoán:</b> <span className="font-bold text-base text-red-600">{printData.diagnosis}</span>
                    </div>
                 </div>

                 <div className="min-h-[200px]">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">Rp.</h3>
                    <div className="text-base whitespace-pre-line leading-loose text-slate-800 pl-4">{printData.prescription}</div>
                 </div>

                 <div className="mt-8 pt-4">
                    {printData.notes && (
                      <div className="italic text-sm text-slate-600 mb-8"><b>Lời dặn:</b> {printData.notes}</div>
                    )}
                    <div className="flex justify-end text-center">
                       <div>
                          <div className="text-sm mb-16">Ngày {new Date(printData.date).getDate()} tháng {new Date(printData.date).getMonth()+1} năm {new Date(printData.date).getFullYear()}<br/><b>Bác sĩ điều trị</b></div>
                          <div className="font-bold text-lg">{printData.doctor}</div>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="p-4 border-t bg-slate-50 flex justify-end gap-3 no-print">
                 <button onClick={()=>setPrintData(null)} className="px-5 py-2.5 rounded-xl font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 transition">Đóng</button>
                 <button onClick={()=>window.print()} className="px-5 py-2.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-2"><Printer size={18}/> In Toa Thuốc</button>
              </div>
           </div>
        </div>
      )}

      {/* Rating Modal */}
      {ratingModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <form onSubmit={handleSubmitRating} className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-6 animate-in zoom-in-95">
              <h3 className="text-xl font-bold text-center text-slate-800 mb-2">Đánh giá Trải nghiệm</h3>
              <p className="text-sm text-slate-500 text-center mb-6">Bạn cảm thấy dịch vụ của <b className="text-slate-700">{ratingModal.doctor}</b> như thế nào?</p>
              
              <div className="flex justify-center gap-2 mb-6">
                 {[1,2,3,4,5].map(star => (
                    <button key={star} type="button" onClick={()=>setRatingVal(star)} className="focus:outline-none transition-transform hover:scale-110">
                       <Star size={36} fill={star <= ratingVal ? "#FBBF24" : "none"} className={star <= ratingVal ? "text-yellow-400" : "text-slate-200"} />
                    </button>
                 ))}
              </div>

              <textarea rows="3" className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none mb-6 text-sm resize-none"
                placeholder="Chia sẻ thêm ý kiến của bạn (không bắt buộc)..." value={ratingComment} onChange={e=>setRatingComment(e.target.value)}></textarea>
              
              <div className="flex gap-3">
                 <button type="button" onClick={()=>setRatingModal(null)} className="flex-1 py-3 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition">Bỏ qua</button>
                 <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition">Gửi Đánh giá</button>
              </div>
           </form>
        </div>
      )}

      {/* Edit Profile Modal */}
      {editProfileModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <form onSubmit={handleUpdateProfile} className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-6 animate-in zoom-in-95">
              <h3 className="text-xl font-bold text-slate-800 mb-6 text-center border-b pb-4">Cập nhật Hồ Sơ</h3>
              <div className="space-y-4 mb-6">
                 <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Căn cước công dân <span className="text-red-500">*</span></label>
                    <input required type="number" className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={profileData.cccd} onChange={e=>setProfileData({...profileData, cccd: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Giới tính <span className="text-red-500">*</span></label>
                    <select required className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={profileData.gender} onChange={e=>setProfileData({...profileData, gender: e.target.value})}>
                       <option value="">- Chọn -</option>
                       <option value="Nam">Nam</option>
                       <option value="Nữ">Nữ</option>
                       <option value="Khác">Khác</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Ngày sinh <span className="text-red-500">*</span></label>
                    <input required type="date" className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={profileData.dob} onChange={e=>setProfileData({...profileData, dob: e.target.value})} />
                 </div>
              </div>
              <div className="flex gap-3">
                 <button type="button" onClick={()=>setEditProfileModal(false)} className="flex-1 py-3 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition">Hủy</button>
                 <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition">Lưu thay đổi</button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};

export default PatientProfile;