import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Baby,
  Brain,
  CalendarCheck,
  HeartPulse,
  Smile,
  Stethoscope,
  Clock3,
  ShieldCheck,
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

const DoctorAvatar = ({ doctor, departmentName }) => {
  const tone = DEPT_TONES[departmentName] || 'from-primary-container via-white to-secondary-container text-primary-dim border-primary/10';

  return (
    <div className={`mb-5 flex aspect-[4/3] items-center justify-center rounded-[1.5rem] border bg-gradient-to-br ${tone}`}>
      <div className="text-center">
        <div className="text-5xl font-black tracking-tight">{getDoctorInitials(doctor?.name)}</div>
        <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.24em] opacity-70">Bác sĩ</div>
      </div>
    </div>
  );
};

const DepartmentsPage = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    api.getDepartments().then((res) => setDepartments(res.data)).catch(console.error);
    api.getDoctors().then((res) => setDoctors(res.data)).catch(console.error);
  }, []);

  const visibleDepartments = useMemo(
    () => departments.filter((dept) => !dept.isEmergency),
    [departments]
  );

  const doctorsByDepartment = useMemo(() => {
    return visibleDepartments.map((dept) => ({
      ...dept,
      doctors: doctors.filter((doctor) => doctor.deptId === dept.id),
    }));
  }, [visibleDepartments, doctors]);

  return (
    <div className="pb-16 pt-6">
      <section className="relative overflow-hidden pb-20 pt-24">
        <div className="absolute inset-0 -z-10">
          <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-primary-container/60 blur-3xl" />
          <div className="absolute left-0 top-24 h-72 w-72 rounded-full bg-secondary-container/60 blur-3xl" />
        </div>

        <div className="page-shell">
          <div className="max-w-3xl">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-surface-container px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-primary">
              <ShieldCheck size={14} />
              Khám theo chuyên khoa
            </span>
            <h1 className="text-5xl font-extrabold leading-[1.05] text-on-surface sm:text-6xl">
              Chuyên khoa và
              <span className="block text-primary-dim">đội ngũ bác sĩ</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-on-surface-variant">
              Chọn đúng chuyên khoa, xem bác sĩ đang phụ trách và đi thẳng đến bước đặt lịch với khoa phù hợp.
            </p>
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="page-shell">
          <div className="mb-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {visibleDepartments.map((dept) => {
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
                  <h2 className="text-2xl font-bold text-on-surface">{dept.name}</h2>
                  <p className="mt-3 min-h-[4.5rem] text-sm leading-7 text-on-surface-variant">{dept.desc}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary">
                    Đặt lịch theo khoa
                    <ArrowRight size={15} />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="space-y-16">
            {doctorsByDepartment.map((dept) => {
              const Icon = DEPT_ICONS[dept.name] || Stethoscope;
              return (
                <section key={dept.id} className="soft-card overflow-hidden p-8 sm:p-10">
                  <div className="mb-8 flex flex-col gap-5 border-b border-surface-container pb-8 md:flex-row md:items-end md:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-container text-primary-dim">
                        <Icon size={30} />
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold text-on-surface">{dept.name}</h2>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-on-surface-variant">{dept.desc}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/book?dept=${dept.id}`)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-on-primary hover:bg-primary-dim"
                    >
                      <CalendarCheck size={16} />
                      Đặt lịch khoa này
                    </button>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {dept.doctors.map((doctor) => (
                      <div key={doctor.id} className="rounded-[1.75rem] bg-surface-container-low p-5">
                        <DoctorAvatar doctor={doctor} departmentName={dept.name} />
                        <div className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{doctor.title}</div>
                        <h3 className="mt-2 text-2xl font-bold text-on-surface">{doctor.name}</h3>
                        <div className="mt-3 flex items-center gap-2 text-sm text-on-surface-variant">
                          <Clock3 size={15} className="text-primary" />
                          <span>Kinh nghiệm: {doctor.exp}</span>
                        </div>
                        <button
                          onClick={() => navigate(`/book?dept=${dept.id}`)}
                          className="mt-6 w-full rounded-2xl bg-primary-container px-5 py-3 text-sm font-bold text-on-primary-container hover:bg-primary hover:text-on-primary"
                        >
                          Chọn khoa và đặt lịch
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default DepartmentsPage;
