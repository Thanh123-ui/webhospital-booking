import React, { useState } from 'react';
import { PhoneCall, MapPin, Siren, AlertTriangle, ArrowRight, Save } from 'lucide-react';
import { api } from '../../services/api';

const EmergencyModal = ({ onClose }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', symptoms: 'Cấp cứu khẩn cấp' });

  const handleRequestAmbulance = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Gửi yêu cầu cấp cứu về Backend dưới dạng 1 Appointment trạng thái EMERGENCY
      await api.createAppointment({
         ...formData,
         date: new Date().toISOString().split('T')[0],
         time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
         status: 'EMERGENCY',
         doctorId: 1, // Mặc định chuyển về khoa trực (Khoa Tim/Cấp cứu 1)
         code: `SOS-${Math.floor(1000 + Math.random() * 9000)}`
      });
      setStep(2);
    } catch (err) {
      alert("Lỗi khi phát tín hiệu cấp cứu. Vui lòng gọi 115 ngay!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-red-100">
         <div className="bg-red-600 p-6 text-white text-center relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10"><Siren size={120}/></div>
             <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white bg-red-700/50 hover:bg-red-700 rounded-full w-8 h-8 flex items-center justify-center font-bold transition">&times;</button>
             <div className="w-20 h-20 bg-white text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-900/20">
                <AlertTriangle size={40} className="animate-pulse"/>
             </div>
             <h2 className="text-2xl font-black tracking-tight uppercase">Báo động Đỏ Cấp cứu</h2>
             <p className="text-red-100 mt-2 font-medium">Trung tâm Điều phối Cấp cứu 24/7</p>
         </div>
         
         <div className="p-8 pb-10">
            {step === 1 && (
              <form onSubmit={handleRequestAmbulance} className="space-y-4">
                 <p className="text-slate-600 text-center mb-4 text-sm font-medium">Trung tâm sẽ điều động xe cấp cứu gần bạn nhất ngay lập tức.</p>
                 
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Họ tên Bệnh nhân / Người báo</label>
                    <input required type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none" 
                      placeholder="VD: Nguyễn Văn A..." value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} />
                 </div>
                 
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Số điện thoại liên hệ</label>
                    <input required type="tel" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none font-bold text-lg" 
                      placeholder="Số điện thoại cấp cứu..." value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} />
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tình trạng khẩn cấp</label>
                    <textarea rows="2" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none resize-none"
                      placeholder="VD: Khó thở, hôn mê, tai nạn..." value={formData.symptoms} onChange={e=>setFormData({...formData, symptoms: e.target.value})}></textarea>
                 </div>

                 <button type="submit" disabled={loading} className="w-full bg-red-600 text-white font-black p-5 rounded-2xl transition hover:bg-red-700 flex items-center justify-center gap-3 shadow-xl shadow-red-200">
                    {loading ? (
                       <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                       <><Siren size={24}/> PHÁT TÍN HIỆU CẤP CỨU</>
                    )}
                 </button>

                 <div className="text-center pt-2">
                    <span className="text-slate-400 text-xs">HOẶC GỌI NGAY: </span>
                    <a href="tel:115" className="text-xl font-black text-red-600 ml-2">115</a>
                 </div>
              </form>
            )}

           {step === 2 && (
             <div className="text-center animate-in fade-in slide-in-from-bottom-4">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                   <PhoneCall size={40} className="animate-pulse"/>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Đã phát tín hiệu!</h3>
                <p className="text-slate-600 mb-6">
                  Tín hiệu của bạn đã được chuyển thẳng đến khoa Cấp cứu & Hệ thống trực. Vui lòng giữ máy, tổng đài viên sẽ gọi lại cho bạn trong <b className="text-red-600">30 giây</b> để xác nhận vị trí.
                </p>
                <div className="bg-orange-50 text-orange-800 p-4 rounded-xl border border-orange-100 text-sm font-medium">
                  Hãy giữ bình tĩnh, đặt bệnh nhân ở tư thế an toàn và theo dõi nhịp thở.
                </div>
                <button onClick={onClose} className="mt-8 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition">Đã hiểu đóng lại</button>
             </div>
           )}
         </div>
      </div>
    </div>
  );
};

export default EmergencyModal;
