import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, CalendarCheck, Star, ChevronRight,
  Phone, Stethoscope, HeartPulse, Baby, Brain, Smile,
  ArrowRight, Clock, MapPin, Ambulance, Award, Users, Activity
} from 'lucide-react';
import { api } from '../../services/api';
import HospitalStatsGrid from '../../components/shared/HospitalStatsGrid';
import EmergencyCard from '../../components/shared/EmergencyCard';

const DEPT_ICONS = {
  'Tim mạch': <HeartPulse size={28} className="text-red-500" />,
  'Nhi khoa': <Baby size={28} className="text-blue-400" />,
  'Nha khoa': <Smile size={28} className="text-teal-500" />,
  'Thần kinh': <Brain size={28} className="text-purple-500" />,
};

const PatientHome = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    api.getDepartments().then(res => setDepartments(res.data)).catch(console.error);
    api.getTopDoctors().then(res => setDoctors(res.data)).catch(console.error);
  }, []);

  return (
    <div className="bg-[#F4F7FB] font-['Inter',sans-serif]">

      {/* ===== HERO SECTION ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white blur-3xl"></div>
          <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-teal-300 blur-2xl"></div>
        </div>

        {/* Cross watermark */}
        <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-5 text-white" style={{fontSize: '400px', fontWeight: 900, lineHeight: 1}}>+</div>

        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Left: Text */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-blue-100 px-4 py-2 rounded-full text-xs font-bold mb-6 uppercase tracking-widest">
                <ShieldCheck size={14} className="text-green-400" /> Tiêu chuẩn Quốc tế JCI 2024
              </div>

              <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
                Chăm Sóc Sức Khỏe<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-teal-300">
                  Tận Tâm & Chuyên Nghiệp
                </span>
              </h1>

              <p className="text-blue-100 text-lg mb-8 max-w-lg leading-relaxed font-light">
                Bệnh viện Đa khoa Quốc tế ClinicCare — nơi hội tụ đội ngũ bác sĩ đầu ngành từ các chuyên khoa Tim mạch, Thần kinh, Nhi khoa và Nha khoa. Đặt lịch online, nhận kết quả nhanh — không cần xếp hàng chờ đợi.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button
                  onClick={() => navigate('/book')}
                  className="bg-white text-blue-800 hover:bg-blue-50 px-8 py-4 rounded-xl font-black shadow-2xl transition-all flex items-center justify-center gap-3 text-base hover:scale-105"
                >
                  <CalendarCheck size={20} className="text-blue-600" />
                  Đặt lịch khám ngay
                </button>
                <button
                  onClick={() => navigate('/track')}
                  className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border border-white/30 px-8 py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <Phone size={18} /> Gọi tư vấn miễn phí
                </button>
              </div>

              {/* Quick info */}
              <div className="mt-10 flex flex-wrap gap-6 justify-center lg:justify-start text-sm text-blue-200">
                <div className="flex items-center gap-2"><Clock size={15} className="text-teal-300" /> Mở cửa 07:00 - 20:00</div>
                <div className="flex items-center gap-2"><MapPin size={15} className="text-teal-300" /> 123 Nguyễn Văn Linh, Q.7</div>
                <div className="flex items-center gap-2"><Ambulance size={15} className="text-red-400" /> Cấp cứu 24/7: <b className="text-white">1900 1234</b></div>
              </div>
            </div>

            {/* Right: Stats card */}
            <div className="lg:w-80 w-full">
              <HospitalStatsGrid />
              <EmergencyCard />
            </div>
          </div>
        </div>
      </section>

      {/* ===== QUICK ACTIONS BAR ===== */}
      <section className="bg-white shadow-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-0 flex flex-wrap justify-center md:justify-between">
          {[
            { icon: <CalendarCheck size={20} className="text-blue-600" />, label: 'Đặt lịch khám', sub: 'Nhanh chóng - 3 bước', action: () => navigate('/book'), primary: true },
            { icon: <Activity size={20} className="text-teal-600" />, label: 'Tra cứu kết quả', sub: 'Xem hồ sơ bệnh nhân', action: () => navigate('/track'), primary: false },
            { icon: <Phone size={20} className="text-green-600" />, label: 'Tư vấn miễn phí', sub: 'Gọi: 1900 1234', action: () => {}, primary: false },
            { icon: <MapPin size={20} className="text-orange-500" />, label: 'Chỉ đường', sub: '123 Nguyễn Văn Linh', action: () => {}, primary: false },
          ].map((item, i) => (
            <button
              key={i}
              onClick={item.action}
              className={`flex items-center gap-4 px-8 py-5 border-r last:border-r-0 border-slate-100 hover:bg-slate-50 transition flex-1 min-w-[180px] ${item.primary ? 'bg-blue-700 hover:bg-blue-800 text-white border-transparent' : ''}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.primary ? 'bg-white/20' : 'bg-slate-100'}`}>
                {item.icon}
              </div>
              <div className="text-left">
                <div className={`font-bold text-sm ${item.primary ? 'text-white' : 'text-slate-800'}`}>{item.label}</div>
                <div className={`text-xs ${item.primary ? 'text-blue-200' : 'text-slate-400'}`}>{item.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ===== DEPARTMENTS ===== */}
      <section id="departments" className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <div className="text-blue-600 font-bold tracking-widest uppercase text-xs mb-3">Chuyên khoa</div>
          <h2 className="text-4xl font-black text-slate-800 mb-4">Các Khoa Điều Trị</h2>
          <p className="text-slate-500 max-w-xl mx-auto">Đội ngũ bác sĩ chuyên môn cao với trang thiết bị hiện đại, đảm bảo chẩn đoán và điều trị chính xác nhất.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {departments.map(dept => (
                <div key={dept.id} className="group bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer" onClick={() => navigate(`/book?dept=${dept.id}`)}>
                  <div className="h-2 bg-gradient-to-r from-blue-600 to-teal-500 group-hover:from-teal-500 group-hover:to-blue-600 transition-all"></div>
                  <div className="p-7">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-blue-50 transition">
                      {DEPT_ICONS[dept.name] || <Stethoscope size={28} className="text-blue-500" />}
                    </div>
                    <h3 className="text-lg font-black text-slate-800 mb-2">{dept.name}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-6">{dept.desc}</p>
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/book?dept=${dept.id}`); }}
                      className="w-full text-blue-700 font-bold flex items-center justify-center gap-2 bg-blue-50 py-3 px-4 rounded-xl text-sm hover:bg-blue-700 hover:text-white transition-all group-hover:gap-3"
                    >
                      Đặt lịch nhanh <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
          ))}
        </div>
      </section>

      {/* ===== WHY CHOOSE US ===== */}
      <section className="bg-blue-900 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-blue-300 font-bold tracking-widest uppercase text-xs mb-3">Lý do chọn chúng tôi</div>
            <h2 className="text-4xl font-black text-white mb-4">Vì Sao Chọn Hospital?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <ShieldCheck size={32} className="text-green-400" />,
                title: 'Tiêu chuẩn JCI Quốc tế',
                desc: 'Được công nhận đạt chuẩn chất lượng y tế quốc tế JCI, đảm bảo an toàn và chất lượng dịch vụ.'
              },
              {
                icon: <Stethoscope size={32} className="text-blue-300" />,
                title: 'Bác sĩ Chuyên gia Hàng đầu',
                desc: 'Đội ngũ hơn 50 bác sĩ chuyên khoa với nhiều năm kinh nghiệm trong và ngoài nước.'
              },
              {
                icon: <Clock size={32} className="text-yellow-400" />,
                title: 'Phục vụ 24/7',
                desc: 'Luôn sẵn sàng phục vụ bệnh nhân bất kể ngày đêm, kể cả dịch vụ cấp cứu khẩn cấp.'
              },
            ].map((item, i) => (
              <div key={i} className="bg-white/10 border border-white/10 rounded-2xl p-8 text-center hover:bg-white/15 transition">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  {item.icon}
                </div>
                <h3 className="text-lg font-black text-white mb-3">{item.title}</h3>
                <p className="text-blue-200 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== DOCTORS ===== */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-blue-600 font-bold tracking-widest uppercase text-xs mb-3">Đội ngũ Y tế</div>
            <h2 className="text-4xl font-black text-slate-800 mb-4">Đội Ngũ Bác Sĩ</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Các chuyên gia nhiều năm kinh nghiệm lâm sàng, được đào tạo tại các cơ sở y tế uy tín trong và ngoài nước.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {doctors.filter(doc => {
              const dept = departments.find(d => d.id === doc.deptId);
              return dept && !dept.isEmergency;
            }).map(doc => (
              <div key={doc.id} className="group text-center">
                <div className="relative w-36 h-36 mx-auto mb-5">
                  <div className="w-full h-full rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 border-4 border-white shadow-xl flex items-center justify-center text-5xl overflow-hidden group-hover:shadow-2xl transition-all group-hover:scale-105">
                    {doc.avatar}
                  </div>
                  {doc.avgRating && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-black px-3 py-1 rounded-full shadow-md flex items-center gap-1 border-2 border-white whitespace-nowrap">
                      <Star size={10} fill="currentColor" /> {doc.avgRating}
                    </div>
                  )}
                </div>
                <h4 className="text-base font-black text-slate-800 leading-tight">{doc.name}</h4>
                <p className="text-blue-600 font-semibold text-sm mt-1">{doc.title}</p>
                <p className="text-slate-400 text-xs mt-1">{departments.find(d => d.id === doc.deptId)?.name}</p>
                {doc.reviewCount > 0 && (
                  <p className="text-[11px] text-slate-300 mt-1">({doc.reviewCount} đánh giá)</p>
                )}
                <button
                  onClick={() => navigate('/book')}
                  className="mt-4 w-full text-xs text-blue-700 font-bold bg-blue-50 hover:bg-blue-600 hover:text-white py-2 rounded-lg transition"
                >
                  Đặt lịch
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA BOTTOM ===== */}
      <section className="bg-gradient-to-r from-teal-600 to-blue-700 py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Đặt lịch ngay hôm nay</h2>
          <p className="text-blue-100 mb-8 text-lg">Chủ động thời gian thăm khám — Xác nhận lịch hẹn trong vòng 30 phút làm việc. Không phí chờ đợi.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/book')}
              className="bg-white text-blue-800 font-black px-10 py-4 rounded-xl hover:bg-blue-50 transition-all hover:scale-105 flex items-center justify-center gap-3 shadow-xl text-lg"
            >
              <CalendarCheck size={22} /> Đặt lịch khám ngay
            </button>
            <a
              href="tel:19001234"
              className="bg-white/10 border border-white/30 text-white font-semibold px-10 py-4 rounded-xl hover:bg-white/20 transition flex items-center justify-center gap-3"
            >
              <Phone size={20} /> Gọi 1900 1234
            </a>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-base">+</span>
              </div>
              <span className="text-white font-black text-lg">HOSPITAL</span>
            </div>
            <p className="text-sm leading-relaxed">Thành lập năm 2001, Bệnh viện Đa khoa Quốc tế ClinicCare là địa chỉ y tế tin cậy của hơn 128.000 bệnh nhân tại TP.HCM và các tỉnh lân cận.</p>
          </div>
          <div>
            <div className="text-white font-bold mb-4">Chuyên khoa</div>
            <ul className="space-y-2 text-sm">
              {departments.map(d => <li key={d.id} className="hover:text-white cursor-pointer transition">{d.name}</li>)}
            </ul>
          </div>
          <div>
            <div className="text-white font-bold mb-4">Dịch vụ</div>
            <ul className="space-y-2 text-sm">
              {['Đặt lịch khám online', 'Tư vấn sức khỏe', 'Cấp cứu 24/7', 'Khám sức khỏe định kỳ', 'Tiêm chủng'].map(s => (
                <li key={s} className="hover:text-white cursor-pointer transition">{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-white font-bold mb-4">Liên hệ</div>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2"><MapPin size={14} className="shrink-0 mt-0.5 text-blue-400" /> 123 Nguyễn Văn Linh, Q.7, TP.HCM</li>
              <li className="flex items-center gap-2"><Phone size={14} className="text-blue-400" /> 1900 1234 (Miễn phí)</li>
              <li className="flex items-center gap-2"><Clock size={14} className="text-blue-400" /> T2-T7: 07:00 - 20:00</li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
          © 2001–2024 Bệnh viện Đa khoa Quốc tế ClinicCare. Giấy phép HĐKD số 0312345678 — Sở Y tế TP.HCM cấp phép.</div>
      </footer>
    </div>
  );
};

export default PatientHome;
