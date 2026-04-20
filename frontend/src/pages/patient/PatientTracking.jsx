import React, { useState, useEffect } from 'react';
import {
  Search,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Phone,
  User,
  Stethoscope,
  RefreshCw,
  Download,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../services/api';
import { getStatusBadge } from '../../utils/helpers';

const STATUS_GUIDE = [
  { icon: <Clock size={16} />, color: 'text-yellow-700 bg-yellow-50 border-yellow-200', label: 'Chờ xác nhận', desc: 'Lịch hẹn vừa được tạo và đang chờ bệnh viện duyệt.' },
  { icon: <CheckCircle size={16} />, color: 'text-sky-700 bg-sky-50 border-sky-200', label: 'Đã xác nhận', desc: 'Bệnh viện đã xác nhận lịch hẹn của bạn.' },
  { icon: <AlertCircle size={16} />, color: 'text-emerald-700 bg-emerald-50 border-emerald-200', label: 'Sẵn sàng khám', desc: 'Điều dưỡng đã ghi nhận sinh hiệu và chuẩn bị khám.' },
  { icon: <CheckCircle size={16} />, color: 'text-teal-700 bg-teal-50 border-teal-200', label: 'Hoàn thành', desc: 'Bạn có thể xem lại kết quả hoặc đơn thuốc đã lưu.' },
  { icon: <XCircle size={16} />, color: 'text-rose-700 bg-rose-50 border-rose-200', label: 'Đã hủy', desc: 'Lịch hẹn đã bị hủy và không còn hiệu lực.' },
];

const PatientTracking = () => {
  const [searchCode, setSearchCode] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    api.getDoctors().then((res) => setDoctors(res.data)).catch(console.error);
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError('');

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const res = await api.searchAppointment(searchCode, searchPhone);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Không tìm thấy lịch hẹn phù hợp với thông tin đã nhập.');
    } finally {
      setLoading(false);
    }
  };

  const doctor = result ? doctors.find((item) => item.id === result?.doctorId) : null;

  const getStepIndex = (status) => {
    const steps = ['PENDING', 'CONFIRMED', 'ARRIVED', 'READY', 'COMPLETED'];
    return steps.indexOf(status);
  };

  return (
    <div className="min-h-screen pb-16 pt-6">
      <section className="relative overflow-hidden pb-10 pt-20">
        <div className="absolute inset-0 -z-10">
          <div className="absolute right-[-5%] top-[-10%] h-[24rem] w-[24rem] rounded-full bg-primary-container/35 blur-[120px]" />
          <div className="absolute bottom-[-20%] left-[-10%] h-[26rem] w-[26rem] rounded-full bg-secondary-container/25 blur-[150px]" />
        </div>

        <div className="page-shell flex flex-col gap-10">
          <header className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-surface-container px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-primary">
              <ShieldCheck size={14} />
              Tra cứu hồ sơ sức khỏe
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">
              Tra cứu hồ sơ sức khỏe
            </h1>
            <p className="mt-4 text-lg leading-8 text-on-surface-variant">
              Nhập mã lịch hẹn và số điện thoại để xem trạng thái, bác sĩ phụ trách và thông tin thăm khám của bạn.
            </p>
          </header>

          <section className="soft-card p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <form onSubmit={handleSearch} className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                <input
                  required
                  type="text"
                  className="w-full rounded-full border-0 bg-surface-container-low py-4 pl-12 pr-4 text-on-surface outline-none transition-all placeholder:text-outline focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest"
                  placeholder="Nhập mã hồ sơ hoặc mã lịch hẹn"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                />
              </div>

              <div className="relative flex-1">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                <input
                  required
                  type="tel"
                  className="w-full rounded-full border-0 bg-surface-container-low py-4 pl-12 pr-4 text-on-surface outline-none transition-all placeholder:text-outline focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest"
                  placeholder="Nhập số điện thoại đăng ký"
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-dim px-6 py-4 text-sm font-bold text-on-primary shadow-[0_4px_20px_-10px_rgba(36,104,107,0.4)] hover:brightness-110 disabled:opacity-70 lg:min-w-[160px]"
              >
                {loading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                {loading ? 'Đang tra cứu' : 'Tra cứu'}
              </button>
            </form>
          </section>
        </div>
      </section>

      <section className="page-shell">
        {error ? (
          <div className="mb-8 rounded-[1.5rem] border border-red-200 bg-red-50 p-5 text-red-700">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100">
                <XCircle size={20} className="text-red-500" />
              </div>
              <div>
                <p className="text-sm font-bold">Không tìm thấy kết quả</p>
                <p className="mt-1 text-sm">{error}</p>
              </div>
            </div>
          </div>
        ) : null}

        {result ? (
          <div className="space-y-8">
            <section className="soft-card overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <div className="border-b border-surface-variant/40 bg-gradient-to-r from-surface-container-low to-white px-8 py-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-container text-primary text-lg font-black">
                      #
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Mã lịch hẹn</div>
                      <div className="mt-1 font-headline text-2xl font-bold text-on-surface">{result.code}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(result.status)}
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-low text-primary hover:bg-surface-container"
                      onClick={() => window.print()}
                      title="In hoặc lưu lại kết quả"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {result.status !== 'CANCELED' && result.status !== 'EMERGENCY' ? (
                <div className="border-b border-surface-variant/30 px-8 py-6">
                  <div className="flex items-center gap-0 overflow-x-auto">
                    {['Chờ duyệt', 'Đã xác nhận', 'Đến viện', 'Chuẩn bị khám', 'Hoàn thành'].map((step, index) => {
                      const current = getStepIndex(result.status);
                      const done = index <= current;
                      const active = index === current;
                      return (
                        <React.Fragment key={step}>
                          <div className="flex min-w-[72px] flex-col items-center gap-2">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-black ${
                              done ? 'bg-primary text-on-primary' : 'bg-surface-container text-outline'
                            } ${active ? 'ring-4 ring-primary/10' : ''}`}>
                              {done && !active ? '✓' : index + 1}
                            </div>
                            <span className={`whitespace-nowrap text-[10px] font-semibold ${done ? 'text-primary' : 'text-on-surface-variant'}`}>
                              {step}
                            </span>
                          </div>
                          {index < 4 ? (
                            <div className={`mb-5 h-0.5 min-w-[32px] flex-1 ${index < current ? 'bg-primary' : 'bg-surface-variant'}`} />
                          ) : null}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-6 p-8 md:grid-cols-2">
                <div className="rounded-[1.5rem] bg-surface-container-low p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-container text-primary">
                      <User size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Bệnh nhân</div>
                      <div className="mt-1 font-bold text-on-surface">{result.patientName}</div>
                      <div className="text-sm text-on-surface-variant">{result.phone}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.5rem] bg-surface-container-low p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary-container text-on-secondary-container">
                      <Stethoscope size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Bác sĩ phụ trách</div>
                      <div className="mt-1 font-bold text-on-surface">{doctor?.name || 'Đội cấp cứu'}</div>
                      <div className="text-sm text-on-surface-variant">{doctor?.title || 'Bệnh viện Hospital'}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.5rem] bg-surface-container-low p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-container text-primary">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Ngày khám</div>
                      <div className="mt-1 font-bold text-on-surface">{result.date}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.5rem] bg-surface-container-low p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-tertiary-container text-on-tertiary-container">
                      <Clock size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Giờ khám</div>
                      <div className="mt-1 text-2xl font-bold text-primary">{result.time}</div>
                    </div>
                  </div>
                </div>

                {result.symptoms ? (
                  <div className="md:col-span-2 rounded-[1.5rem] bg-surface-container-low p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-container text-primary">
                        <FileText size={18} />
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Triệu chứng / ghi chú</div>
                        <p className="mt-2 text-sm leading-7 text-on-surface">{result.symptoms}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}

        {!result && !error ? (
          <section className="pt-8">
            <h2 className="mb-6 text-center text-sm font-black uppercase tracking-[0.22em] text-on-surface-variant">
              Hướng dẫn trạng thái hồ sơ
            </h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {STATUS_GUIDE.map((item) => (
                <div key={item.label} className={`rounded-[1.5rem] border px-4 py-5 text-center ${item.color}`}>
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70">
                    {item.icon}
                  </div>
                  <div className="text-sm font-bold">{item.label}</div>
                  <div className="mt-2 text-[12px] leading-6 opacity-80">{item.desc}</div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </div>
  );
};

export default PatientTracking;
