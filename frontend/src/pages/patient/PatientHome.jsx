import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Baby,
  Brain,
  Building2,
  CalendarCheck,
  Clock3,
  HeartPulse,
  MapPin,
  Phone,
  ShieldCheck,
  Smile,
  Star,
  Stethoscope,
} from 'lucide-react';
import { api } from '../../services/api';

const DEPT_ICONS = {
  'Tim mạch': HeartPulse,
  'Nhi khoa': Baby,
  'Nha khoa': Smile,
  'Thần kinh': Brain,
};

const DEPT_TONES = {
  'Tim mạch': 'from-rose-100 via-white to-red-100 text-rose-700 border-rose-200',
  'Nhi khoa': 'from-sky-100 via-white to-cyan-100 text-sky-700 border-sky-200',
  'Nha khoa': 'from-teal-100 via-white to-emerald-100 text-teal-700 border-teal-200',
  'Thần kinh': 'from-violet-100 via-white to-purple-100 text-violet-700 border-violet-200',
};

const getDoctorInitials = (name = '') =>
  name
    .replace(/^BS\.\s*/i, '')
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

const DoctorAvatar = ({ doctor, className = '' }) => {
  const tone = DEPT_TONES[doctor?.departmentName] || 'from-primary-container via-white to-secondary-container text-primary-dim border-primary/10';

  return (
    <div className={`flex items-center justify-center overflow-hidden rounded-[2rem] border bg-gradient-to-br ${tone} ${className}`}>
      <div className="text-center">
        <div className="text-4xl font-black tracking-tight">{getDoctorInitials(doctor?.name)}</div>
        <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.24em] opacity-70">Bác sĩ</div>
      </div>
    </div>
  );
};

const PatientHome = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    api.getDepartments().then((res) => setDepartments(res.data)).catch(console.error);
    api.getTopDoctors().then((res) => setDoctors(res.data)).catch(console.error);
  }, []);

  const featuredDoctors = doctors
    .map((doc) => ({
      ...doc,
      departmentName: departments.find((item) => item.id === doc.deptId)?.name,
    }))
    .filter((doc) => doc.departmentName && !departments.find((item) => item.id === doc.deptId)?.isEmergency)
    .slice(0, 3);

  return (
    <div className="pb-12 pt-4">
      <section className="relative overflow-hidden pb-24 pt-28 sm:pt-32">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -right-12 top-10 h-72 w-72 rounded-full bg-primary-container/70 blur-3xl" />
          <div className="absolute left-0 top-32 h-64 w-64 rounded-full bg-secondary-container/70 blur-3xl" />
        </div>

        <div className="page-shell grid items-center gap-14 md:grid-cols-2">
          <div>
            <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-surface-container px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-primary">
              <ShieldCheck size={14} />
              Chăm sóc sức khỏe tinh tế
            </span>

            <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.05] text-on-surface sm:text-6xl">
              Đặt lịch khám dễ dàng,
              <span className="block text-primary-dim">chăm sóc sức khỏe</span>
              <span className="block">chủ động mỗi ngày</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-on-surface-variant">
              Bệnh viện Hospital mang đến trải nghiệm y tế hiện đại, nơi quy trình được tinh gọn,
              không gian được chăm chút và mỗi lần thăm khám đều bắt đầu bằng sự an tâm.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <button
                onClick={() => navigate('/book')}
                className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-primary to-primary-dim px-8 py-4 text-base font-bold text-on-primary shadow-soft hover:-translate-y-0.5"
              >
                <CalendarCheck size={20} />
                Đặt lịch ngay
              </button>
              <button
                onClick={() => navigate('/departments')}
                className="rounded-2xl bg-surface-container-highest px-8 py-4 text-base font-bold text-on-secondary-container hover:bg-surface-variant"
              >
                Xem chuyên khoa
              </button>
            </div>

            <div className="mt-10 flex flex-wrap gap-6 text-sm font-medium text-on-surface-variant">
              <div className="flex items-center gap-2"><Clock3 size={16} className="text-primary" /> 07:00 - 20:00 mỗi ngày</div>
              <div className="flex items-center gap-2"><MapPin size={16} className="text-primary" /> 123 Nguyễn Văn Linh, Quận 7</div>
              <div className="flex items-center gap-2"><Phone size={16} className="text-primary" /> Hotline 1900 1234</div>
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-[2.75rem] bg-secondary-container shadow-soft rotate-2">
              <img
                className="h-full min-h-[480px] w-full object-cover"
                src="https://images.unsplash.com/photo-1666214280391-8ff5bd3c0bf0?auto=format&fit=crop&w=1200&q=80"
                alt="Bac si than thien trong khong gian phong kham hien dai"
              />
            </div>
            <div className="soft-card absolute -bottom-8 -left-3 max-w-xs p-5 sm:-left-8">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-container text-primary-dim">
                  <BadgeCheck size={22} />
                </div>
                <div>
                  <p className="font-bold text-on-surface">100% bác sĩ chuyên khoa</p>
                  <p className="text-sm text-on-surface-variant">Hệ thống thăm khám tinh gọn, rõ ràng và riêng tư.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="page-shell grid gap-6 md:grid-cols-4">
          {[
            {
              icon: <Stethoscope size={24} className="text-primary" />,
              title: 'Bác sĩ giỏi',
              desc: 'Đội ngũ chuyên gia đầu ngành với nhiều năm kinh nghiệm lâm sàng.',
              tone: 'bg-primary-container',
            },
            {
              icon: <CalendarCheck size={24} className="text-secondary" />,
              title: 'Quy trình rõ ràng',
              desc: 'Đặt lịch, xác nhận và theo dõi hồ sơ trên cùng một hành trình trực tuyến.',
              tone: 'bg-secondary-container',
            },
            {
              icon: <HeartPulse size={24} className="text-tertiary" />,
              title: 'Tận tâm',
              desc: 'Lắng nghe kỹ hơn, tư vấn dễ hiểu hơn và luôn ưu tiên cảm giác an tâm.',
              tone: 'bg-tertiary-container',
            },
            {
              icon: <Building2 size={24} className="text-on-primary-container" />,
              title: 'Hiện đại',
              desc: 'Không gian khám chữa bệnh sáng, thoáng và tối ưu cho trải nghiệm bệnh nhân.',
              tone: 'bg-primary-container',
            },
          ].map((item, index) => (
            <div key={index} className="soft-card p-8 hover:-translate-y-1">
              <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone}`}>
                {item.icon}
              </div>
              <h3 className="text-xl font-bold text-on-surface">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-on-surface-variant">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="departments" className="bg-surface-bright py-24">
        <div className="page-shell">
          <div className="mb-14 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-4xl font-bold text-on-surface">Chuyên khoa nổi bật</h2>
              <p className="mt-4 max-w-2xl text-on-surface-variant">
                Đa dạng chuyên khoa khám chữa bệnh với quy trình tiếp nhận gọn gàng và đội ngũ bác sĩ giàu kinh nghiệm.
              </p>
            </div>
            <button
              onClick={() => navigate('/departments')}
              className="flex items-center gap-2 text-sm font-bold text-primary hover:gap-3"
            >
              Xem tất cả
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {departments.filter((dept) => !dept.isEmergency).map((dept) => {
              const Icon = DEPT_ICONS[dept.name] || Stethoscope;
              return (
                <button
                  key={dept.id}
                  onClick={() => navigate(`/book?dept=${dept.id}`)}
                  className="soft-card group p-8 text-left hover:border-primary/20 hover:bg-surface-container-low"
                >
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container text-primary transition-colors group-hover:bg-primary-container">
                    <Icon size={28} />
                  </div>
                  <h3 className="text-2xl font-bold text-on-surface">{dept.name}</h3>
                  <p className="mt-3 min-h-[4.5rem] text-sm leading-7 text-on-surface-variant">{dept.desc}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary">
                    Đặt lịch nhanh
                    <ArrowRight size={15} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="page-shell">
          <div className="mb-16 text-center">
            <h2 className="text-4xl font-bold text-on-surface">Đội ngũ bác sĩ tâm huyết</h2>
            <p className="mx-auto mt-4 max-w-2xl text-on-surface-variant">
              Hội tụ những bác sĩ đầu ngành, giàu kinh nghiệm và luôn ưu tiên sự rõ ràng trong mỗi lần thăm khám.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {featuredDoctors.map((doc) => (
              <div key={doc.id} className="soft-card overflow-hidden p-4 hover:-translate-y-1">
                <DoctorAvatar doctor={doc} className="mb-6 aspect-[4/5] text-[6rem]" />
                <div className="px-3 pb-4">
                  <span className="block text-xs font-bold uppercase tracking-[0.22em] text-primary">
                    {doc.title}
                  </span>
                  <h3 className="mt-2 text-2xl font-bold text-on-surface">{doc.name}</h3>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Chuyên khoa: {departments.find((dept) => dept.id === doc.deptId)?.name || 'Đang cập nhật'}
                  </p>
                  <div className="mt-5 flex items-center gap-2 rounded-2xl bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
                    <Clock3 size={16} className="text-primary" />
                    <span>Lịch khám linh hoạt theo khung giờ đặt trước</span>
                  </div>
                  {doc.avgRating ? (
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-secondary-container px-3 py-1 text-xs font-bold text-on-secondary-container">
                      <Star size={12} fill="currentColor" />
                      {doc.avgRating} diem danh gia
                    </div>
                  ) : null}
                  <button
                    onClick={() => navigate('/book')}
                    className="mt-6 w-full rounded-2xl bg-primary-container px-5 py-3 text-sm font-bold text-on-primary-container hover:bg-primary hover:text-on-primary"
                  >
                    Đặt lịch với bác sĩ này
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface-container py-24">
        <div className="page-shell">
          <div className="mb-16 text-center">
            <h2 className="text-4xl font-bold text-on-surface">Quy trình đặt lịch trực tuyến</h2>
            <p className="mt-4 text-on-surface-variant">Đơn giản, nhanh chóng và rõ ràng chỉ với vài thao tác.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-4">
            {[
              ['1', 'Chọn chuyên khoa', 'Tìm đúng chuyên khoa phù hợp với nhu cầu thăm khám.'],
              ['2', 'Chọn bác sĩ và giờ', 'Xem lịch trống và ưu tiên khung giờ thuận tiện nhất.'],
              ['3', 'Điền thông tin', 'Bổ sung hồ sơ cơ bản và mô tả triệu chứng ban đầu.'],
              ['4', 'Xác nhận lịch', 'Nhận mã lịch hẹn và theo dõi trạng thái trực tuyến.'],
            ].map(([num, title, desc], index) => (
              <div key={index} className="text-center">
                <div className={`mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full border-4 border-surface-container text-3xl font-bold shadow-md ${
                  index === 3 ? 'bg-primary text-on-primary' : 'bg-primary-container text-primary-dim'
                }`}>
                  {num}
                </div>
                <h3 className="text-lg font-bold text-on-surface">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-on-surface-variant">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="page-shell">
          <div className="overflow-hidden rounded-[2.75rem] bg-primary px-8 py-14 text-center shadow-soft sm:px-14 sm:py-20">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-4xl font-bold text-on-primary sm:text-5xl">
                Sẵn sàng chăm sóc sức khỏe của bạn?
              </h2>
              <p className="mt-6 text-lg leading-8 text-on-primary/80">
                Hãy để Bệnh viện Hospital đồng hành cùng bạn trên hành trình duy trì một cuộc sống khỏe mạnh và chủ động hơn mỗi ngày.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <button
                  onClick={() => navigate('/book')}
                  className="rounded-2xl bg-white px-8 py-4 text-lg font-bold text-primary shadow-md hover:bg-primary-container"
                >
                  Đặt lịch khám ngay
                </button>
                <a
                  href="tel:19001234"
                  className="rounded-2xl border-2 border-white/70 px-8 py-4 text-lg font-bold text-white hover:bg-white hover:text-primary"
                >
                  Liên hệ tư vấn
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#f1f2eb] pb-10 pt-20 text-sm text-on-surface-variant">
        <div className="page-shell grid gap-12 md:grid-cols-4">
          <div>
            <div className="mb-6 font-headline text-2xl font-bold text-primary-dim">Hospital</div>
            <p className="max-w-sm leading-7">
              Bệnh viện Hospital mang đến hành trình thăm khám tinh gọn, sáng rõ và dễ tiếp cận hơn cho từng bệnh nhân.
            </p>
            <div className="mt-6 font-bold text-primary">1900 1234</div>
          </div>
          <div>
            <h4 className="mb-6 font-bold text-on-surface">Dịch vụ</h4>
            <ul className="space-y-4">
              <li>Khám tổng quát</li>
              <li>Đặt lịch trực tuyến</li>
              <li>Khám chuyên khoa</li>
              <li>Theo dõi hồ sơ</li>
            </ul>
          </div>
          <div>
            <h4 className="mb-6 font-bold text-on-surface">Thông tin</h4>
            <ul className="space-y-4">
              <li>Về chúng tôi</li>
              <li>Chính sách bảo mật</li>
              <li>Điều khoản sử dụng</li>
              <li>Câu hỏi thường gặp</li>
            </ul>
          </div>
          <div>
            <h4 className="mb-6 font-bold text-on-surface">Địa chỉ</h4>
            <p className="leading-7">
              123 Nguyễn Văn Linh, Quận 7
              <br />
              Thành phố Hồ Chí Minh
            </p>
            <div className="mt-4 text-primary">support@hospital.vn</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PatientHome;
