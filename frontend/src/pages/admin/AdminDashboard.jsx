import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Calendar, Users, Settings, LogOut, Stethoscope,
  UserPlus, Check, ServerCrash, Bell, Shield, Eye, EyeOff,
  AlertTriangle, ArrowRightLeft, X, Key, Search
} from 'lucide-react';
import { api } from '../../services/api';
import { socket } from '../../services/socket';
import { useAuth } from '../../services/AuthContext';
import { getStatusBadge, getRoleConfig } from '../../utils/helpers';

// ─── Permission Matrix ────────────────────────────────────────────────────────
// ADMIN        : Full access
// BOD          : Full access — chỉ KHÔNG được phân quyền user
// DOCTOR       : Appointments + patients of own dept + exam
// NURSE        : Appointments + patients của khoa mình — no medical records
// RECEPTIONIST : Appointments only (view/confirm/arrived)
// ─────────────────────────────────────────────────────────────────────────────
const PERMS = {
  canViewPatients:  (r) => ['ADMIN','BOD','DOCTOR','NURSE','RECEPTIONIST'].includes(r),
  canViewMedical:   (r) => ['ADMIN','BOD','DOCTOR'].includes(r),
  canViewStaff:     (r) => ['ADMIN','BOD'].includes(r),
  canAddStaff:      (r) => ['ADMIN'].includes(r),
  canChangeRole:    (r) => r === 'ADMIN',           // BOD KHÔNG được phân quyền
  canToggleActive:  (r) => ['ADMIN','BOD'].includes(r),
  canViewLogs:      (r) => ['ADMIN'].includes(r),
  canExam:          (r) => r === 'DOCTOR',
  canUpdateStatus:  (r) => ['ADMIN','BOD','DOCTOR','NURSE','RECEPTIONIST'].includes(r),
  canTransferEmergency: (r, deptId, departments) => {
    if (!deptId || !departments) return false;
    const dept = departments.find(d => d.id === deptId);
    return r === 'DOCTOR' && dept?.isEmergency;
  },
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { currentStaffUser, setCurrentStaffUser } = useAuth();
  const role = currentStaffUser?.role;

  const [departments, setDepartments] = useState([]);

  const tabs = [
    { id: 'list',     label: 'Lịch hẹn & Khám',   icon: <Calendar size={17}/>,     show: true },
    { id: 'patients', label: 'Bệnh nhân',           icon: <Users size={17}/>,        show: PERMS.canViewPatients(role) },
    { id: 'staff',    label: 'Quản lý Nhân sự',     icon: <Settings size={17}/>,     show: PERMS.canViewStaff(role) },
    { id: 'logs',     label: 'Nhật ký Hệ thống',    icon: <ServerCrash size={17}/>,  show: PERMS.canViewLogs(role) },
  ].filter(t => t.show);

  const [activeTab, setActiveTab] = useState('list');

  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [logsList, setLogsList] = useState([]);

  const [newStaff, setNewStaff] = useState({ name: '', username: '', password: '', role: 'DOCTOR', title: '', deptId: '', exp: '' });
  const [examModal, setExamModal] = useState(null);
  const [recordData, setRecordData] = useState({ diagnosis: '', prescription: '', notes: '' });
  const [transferModal, setTransferModal] = useState(null); // { appt }
  const [transferTargetDept, setTransferTargetDept] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('info'); // 'info' | 'emergency'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientDetailModal, setPatientDetailModal] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Vitals modal — Điều dưỡng đo sinh hiệu
  const [vitalsModal, setVitalsModal] = useState(null); // appt object
  const [vitalsData, setVitalsData] = useState({ bloodPressure: '', heartRate: '', temperature: '', weight: '', height: '', spO2: '', notes: '' });

  // New features state
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [resetPassModal, setResetPassModal] = useState(null);
  const [resetPassValue, setResetPassValue] = useState('');
  
  const [apptDateFilter, setApptDateFilter] = useState('');
  const [apptTimeFilter, setApptTimeFilter] = useState('');
  const [apptDeptFilter, setApptDeptFilter] = useState('');

  const showToast = (msg, type = 'info') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), 5000);
  };

  const calcAge = (dob) => {
    if (!dob) return null;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const normalizeDateValue = (dateValue) => {
    if (!dateValue) return '';
    const match = String(dateValue).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;

    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return String(dateValue);

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getEffectiveDeptId = (appt) => {
    if (appt.current_department) return parseInt(appt.current_department);
    if (appt.deptId) return parseInt(appt.deptId);
    const assignedDoctor = appt.doctorId ? staffList.find(s => s.id === appt.doctorId) : null;
    return assignedDoctor?.deptId ? parseInt(assignedDoctor.deptId) : null;
  };

  const fetchAppointments = () => api.getAllAppointments(currentStaffUser.role, currentStaffUser.deptId).then(res => setAppointments(res.data)).catch(console.error);
  const fetchPatients    = () => api.getAllPatients(currentStaffUser.role, currentStaffUser.deptId).then(res => setPatients(res.data)).catch(console.error);
  const fetchStaff       = () => api.getAllStaff(role === 'BOD' ? 'BOD' : undefined).then(res => setStaffList(res.data)).catch(console.error);
  const fetchLogs        = () => api.getSystemLogs().then(res => setLogsList(res.data)).catch(console.error);

  useEffect(() => {
    if (!currentStaffUser) return;
    socket.connect();
    fetchAppointments();
    api.getDepartments().then(res => setDepartments(res.data)).catch(console.error);
    if (PERMS.canViewPatients(role)) fetchPatients();
    if (PERMS.canViewStaff(role)) fetchStaff();
    if (PERMS.canViewLogs(role)) fetchLogs();

    const refreshAppointmentsAndPatients = () => {
      fetchAppointments();
      if (PERMS.canViewPatients(role)) fetchPatients();
    };

    const handleNewAppt = (appt) => {
      showToast(`🔔 Lịch khám mới: ${appt.patientName} — ${appt.date} ${appt.time}`, 'info');
      refreshAppointmentsAndPatients();
    };
    const handleAppointmentUpdate = () => {
      refreshAppointmentsAndPatients();
    };
    const handleEmergencyTransfer = ({ transfer }) => {
      showToast(`🚨 Chuyển khoa cấp cứu: ${transfer.patientName} → ${transfer.toDeptName}`, 'emergency');
      refreshAppointmentsAndPatients();
    };
    socket.on('new_appointment', handleNewAppt);
    socket.on('update_appointment', handleAppointmentUpdate);
    socket.on('emergency_transfer', handleEmergencyTransfer);
    return () => {
      socket.off('new_appointment', handleNewAppt);
      socket.off('update_appointment', handleAppointmentUpdate);
      socket.off('emergency_transfer', handleEmergencyTransfer);
      socket.disconnect();
    };
  }, [currentStaffUser, role]);

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.updateAppointmentStatus(id, { status, role });
      fetchAppointments();
    } catch { alert('Lỗi khi cập nhật!'); }
  };

  const handleCancelAppointment = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy lịch hẹn này?')) return;
    try {
      await api.cancelAppointment(id, { role, reason: 'Hủy bởi nhân viên bệnh viện' });
      fetchAppointments();
    } catch { alert('Lỗi khi hủy lịch!'); }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!newStaff.password || newStaff.password.length < 3) { alert('Mật khẩu phải có ít nhất 3 ký tự!'); return; }
    try {
      await api.addStaff(newStaff);
      showToast('✅ Tạo tài khoản thành công!');
      setNewStaff({ name: '', username: '', password: '', role: 'DOCTOR', title: '', deptId: '', exp: '' });
      fetchStaff();
    } catch (err) { alert(err.response?.data?.message || 'Lỗi khi thêm nhân sự'); }
  };

  const handleSaveVitals = async (e) => {
    e.preventDefault();
    if (!vitalsModal) return;
    try {
      await api.saveVitals(vitalsModal.id, { vitals: vitalsData, role, staffId: currentStaffUser.id });
      setVitalsModal(null);
      setVitalsData({ bloodPressure: '', heartRate: '', temperature: '', weight: '', height: '', spO2: '', notes: '' });
      fetchAppointments();
      showToast('✅ Đã lưu sinh hiệu! Bệnh nhân sẵn sàng khám.');
    } catch (err) { alert(err.response?.data?.message || 'Lỗi khi lưu sinh hiệu!'); }
  };

  const handleToggleStaff = async (id) => {
    try {
      await api.toggleStaffActive(id, role);
      fetchStaff();
    } catch (err) { alert(err.response?.data?.message || 'Lỗi khi thay đổi trạng thái!'); }
  };

  const handleChangeRole = async (id, newRole) => {
    if (!window.confirm(`Đổi vai trò sang "${newRole}"?`)) return;
    try {
      await api.updateStaffRole(id, newRole, role);
      fetchStaff();
      showToast('✅ Đã cập nhật vai trò!');
    } catch (err) { alert(err.response?.data?.message || 'Lỗi khi đổi quyền!'); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (resetPassValue.length < 3) return alert('Mật khẩu quá ngắn');
    try {
      await api.resetStaffPassword(resetPassModal, resetPassValue, role);
      showToast('✅ Đã cấp lại mật khẩu thành công!');
      setResetPassModal(null);
      setResetPassValue('');
    } catch (err) { alert(err.response?.data?.message || 'Lỗi reset pass!'); }
  };

  const handleCompleteExam = async (e) => {
    e.preventDefault();
    if (!examModal) return;
    try {
      await api.completeMedicalRecord(examModal.id, { record: recordData, role, doctorName: currentStaffUser.name, deptId: currentStaffUser.deptId });
      setExamModal(null);
      setRecordData({ diagnosis: '', prescription: '', notes: '' });
      fetchAppointments();
      showToast('✅ Khám bệnh thành công! Hồ sơ đã được lưu.');
    } catch { alert('Lỗi khi lưu bệnh án!'); }
  };

  const handleTransferPatient = async (e) => {
    e.preventDefault();
    if (!transferModal || !transferTargetDept) return;
    try {
      await api.transferPatient(transferModal.id, {
        targetDeptId: transferTargetDept,
        reason: transferReason,
        transferredBy: currentStaffUser.id,
        transferredByName: currentStaffUser.name,
      });
      setTransferModal(null);
      setTransferTargetDept('');
      setTransferReason('');
      fetchAppointments();
      const deptName = departments.find(d => d.id === parseInt(transferTargetDept))?.name;
      showToast(`✅ Đã chuyển hồ sơ cấp cứu sang ${deptName}!`, 'emergency');
    } catch (err) { alert(err.response?.data?.message || 'Lỗi khi chuyển khoa!'); }
  };

  const logout = () => { setCurrentStaffUser(null); navigate('/admin'); };

  const roleConfig = getRoleConfig(role);
  const currentDept = departments.find(d => d.id === currentStaffUser?.deptId);
  const isEmergencyDept = currentDept?.isEmergency;

  let visibleAppointments = appointments;

  if (apptDateFilter) {
    const normalizedFilterDate = normalizeDateValue(apptDateFilter);
    visibleAppointments = visibleAppointments.filter(a => normalizeDateValue(a.date) === normalizedFilterDate);
  }
  if (apptTimeFilter) visibleAppointments = visibleAppointments.filter(a => a.time === apptTimeFilter);
  if (apptDeptFilter) visibleAppointments = visibleAppointments.filter(a => getEffectiveDeptId(a) === parseInt(apptDeptFilter));

  const stats = {
    total: visibleAppointments.length,
    waiting: visibleAppointments.filter(a => ['READY', 'ARRIVED', 'TRANSFER_PENDING'].includes(a.status)).length,
    done: visibleAppointments.filter(a => a.status === 'DONE').length,
    emergency: visibleAppointments.filter(a => a.is_emergency).length
  };

  const visibleStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(staffSearchQuery.toLowerCase()) || 
    s.username.toLowerCase().includes(staffSearchQuery.toLowerCase())
  );

  const normalizedPatientSearch = searchTerm.trim().toLowerCase();
  const filteredPatients = patients.filter(patient => {
    if (!normalizedPatientSearch) return true;
    return [
      patient.patientCode || `BN-${patient.id}`,
      patient.name,
      patient.phone,
    ].some(value => (value || '').toLowerCase().includes(normalizedPatientSearch));
  });

  // Khoa cấp cứu không thể chuyển vào (để loại khỏi target)
  // const nonEmergencyDepts = departments.filter(d => !d.isEmergency);

  return (
    <div className="flex h-screen text-slate-800 font-['Inter',sans-serif]" style={{background:'#f0f4fa'}}>

      {/* ── SIDEBAR ── */}
      <aside className="w-64 flex flex-col shrink-0 shadow-2xl" style={{background:'linear-gradient(180deg,#0f1f3d 0%,#0d1b35 60%,#0a1628 100%)'}}>
        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-3" style={{borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg" style={{background:'linear-gradient(135deg,#2563eb,#0ea5e9)'}}>
            <span className="text-white font-black text-lg">+</span>
          </div>
          <div>
            <div className="text-white font-black text-sm tracking-widest">HOSPITAL</div>
            <div className="text-sky-400 text-[10px] font-semibold tracking-widest uppercase">Nội Bộ</div>
          </div>
        </div>

        {/* User info */}
        <div className="px-4 py-4" style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <div className="flex items-center gap-3 rounded-2xl px-3 py-3" style={{background:'rgba(255,255,255,0.06)'}}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 shadow" style={{background:'linear-gradient(135deg,#1e40af,#2563eb)'}}>
              {currentStaffUser?.avatar || '👤'}
            </div>
            <div className="min-w-0">
              <div className="text-white font-bold text-sm leading-tight truncate">{currentStaffUser?.name}</div>
              <div className="mt-1.5">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${roleConfig.bg} ${roleConfig.text}`}>
                  {roleConfig.label}
                </span>
              </div>
              {currentDept && <div className="text-[10px] text-sky-400 mt-1.5 font-semibold truncate">📍 {currentDept.name}</div>}
            </div>
          </div>
        </div>

        {/* Nav label */}
        <div className="px-5 pt-5 pb-2">
          <span className="text-[9px] font-black uppercase tracking-widest" style={{color:'rgba(148,163,184,0.5)'}}>Menu chính</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto pb-3">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all relative ${
                activeTab === tab.id
                  ? 'text-white shadow-lg'
                  : 'text-slate-500 hover:text-white'
              }`}
              style={activeTab === tab.id ? {background:'linear-gradient(90deg,#2563eb,#1d4ed8)'} : {background:'transparent'}}
            >
              {activeTab === tab.id && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sky-400 rounded-r-full"/>}
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3" style={{borderTop:'1px solid rgba(255,255,255,0.06)'}}>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{color:'#f87171'}}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,0.1)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}
          >
            <LogOut size={17} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="flex-1 overflow-auto bg-slate-50">
        {/* Top bar */}
        <div className="bg-white border-b border-slate-100 px-8 py-4 flex justify-between items-center sticky top-0 z-20" style={{boxShadow:'0 1px 12px rgba(0,0,0,0.06)'}}>
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-black text-slate-800 flex items-center gap-2">
                {tabs.find(t => t.id === activeTab)?.label}
                {currentDept && activeTab === 'list' && (
                  <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">{currentDept.name}</span>
                )}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <span>🗓</span> {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEmergencyDept && (
              <div className="flex items-center gap-2 bg-red-600 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-lg shadow-red-200 animate-pulse">
                <AlertTriangle size={13}/> 🚨 Khoa Cấp cứu
              </div>
            )}
            {role === 'NURSE' && !isEmergencyDept && (
              <div className="flex items-center gap-2 bg-teal-500 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-sm">
                <Shield size={13}/> Điều dưỡng · {currentDept?.name}
              </div>
            )}
            {role === 'RECEPTIONIST' && (
              <div className="flex items-center gap-2 bg-indigo-500 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-sm">
                <Shield size={13}/> Lễ tân
              </div>
            )}
            {role === 'BOD' && (
              <div className="flex items-center gap-2 bg-amber-500 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-sm">
                <Shield size={13}/> Ban Giám Đốc
              </div>
            )}
          </div>
        </div>

        <div className="p-8">

          {/* ── TAB: Appointments ── */}
          {activeTab === 'list' && (
            <div className="animate-in fade-in">
              {/* Stats cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Tổng lịch hẹn', value: stats.total,     color: 'from-blue-600 to-blue-500',   icon: <Calendar size={22} className="text-white/80"/> },
                  { label: 'Đang chờ khám', value: stats.waiting,   color: 'from-orange-500 to-amber-500', icon: <Activity size={22} className="text-white/80"/> },
                  { label: 'Đã hoàn tất',    value: stats.done,     color: 'from-green-600 to-teal-500',  icon: <Check size={22} className="text-white/80"/> },
                  { label: 'Cấp cứu',        value: stats.emergency, color: 'from-red-600 to-rose-500',    icon: <AlertTriangle size={22} className="text-white/80"/> },
                ].map((s, i) => (
                  <div key={i} className={`bg-gradient-to-br ${s.color} rounded-2xl p-5 text-white shadow-lg`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">{s.icon}</div>
                      {s.value > 0 && i === 3 && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold animate-pulse">🚨 Hoạt động</span>}
                    </div>
                    <div className="text-3xl font-black">{s.value}</div>
                    <div className="text-white/70 text-xs font-semibold mt-1 uppercase tracking-wider">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Filter bar */}
                <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center bg-slate-50/80 gap-3">
                  <div className="text-sm font-bold text-slate-600">📅 Danh sách lịch khám hôm nay</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="date" className="text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-600 bg-white focus:ring-2 focus:ring-blue-400" value={apptDateFilter} onChange={e=>setApptDateFilter(e.target.value)} />
                    <select className="text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-600 bg-white focus:ring-2 focus:ring-blue-400" value={apptTimeFilter} onChange={e=>setApptTimeFilter(e.target.value)}>
                      <option value="">Tất cả giờ</option>
                      {[...new Set(visibleAppointments.map(a => a.time).filter(Boolean))].sort().map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                    {!currentDept && (
                      <select className="text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-600 bg-white focus:ring-2 focus:ring-blue-400" value={apptDeptFilter} onChange={e=>setApptDeptFilter(e.target.value)}>
                        <option value="">Tất cả chuyên khoa</option>
                        {departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    )}
                    {(apptDateFilter || apptTimeFilter || apptDeptFilter) && (
                      <button onClick={() => { setApptDateFilter(''); setApptTimeFilter(''); setApptDeptFilter(''); }} className="text-xs px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold hover:bg-red-100 transition">Xóa bộ lọc</button>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-5 py-4 font-bold">Mã</th>
                        <th className="px-5 py-4 font-bold">Bệnh nhân</th>
                        <th className="px-5 py-4 font-bold">Bác sĩ / Khoa</th>
                        <th className="px-5 py-4 font-bold">Thời gian</th>
                        <th className="px-5 py-4 font-bold">Trạng thái</th>
                        <th className="px-5 py-4 font-bold text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleAppointments.map(appt => {
                        const doc = appt.doctorId ? staffList.find(s => s.id === appt.doctorId) : null;
                        const dept = appt.deptId ? departments.find(d => d.id === appt.deptId) : null;
                        return (
                          <tr
                            key={appt.id}
                            className={`transition hover:bg-blue-50/30 ${
                              appt.is_emergency || appt.status === 'EMERGENCY'
                                ? 'bg-red-50 border-l-4 border-red-500'
                                : appt.status === 'TRANSFER_PENDING'
                                ? 'bg-orange-50 border-l-4 border-orange-400'
                                : ''
                            }`}
                          >
                            <td className="px-5 py-4 font-mono text-xs text-slate-500 font-semibold">
                              {appt.code}
                              {appt.is_emergency && <span className="ml-1.5 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">CC</span>}
                            </td>
                            <td className="px-5 py-4">
                              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                {appt.patientName}
                                {appt.patientDob && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">{calcAge(appt.patientDob)} tuổi</span>}
                                {appt.patientGender && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">{appt.patientGender}</span>}
                              </div>
                              <div className="text-xs text-slate-400">{appt.phone}</div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="font-semibold text-slate-700 text-xs">{doc?.name || '---'}</div>
                              {dept && <div className="text-[11px] text-blue-500 font-medium mt-0.5">{dept.name}</div>}
                            </td>
                            <td className="px-5 py-4">
                              <div className="font-semibold text-slate-700">{appt.date}</div>
                              <div className="text-xs text-blue-500 font-bold mt-0.5">{appt.time}</div>
                            </td>
                            <td className="px-5 py-4">{getStatusBadge(appt.status)}</td>
                            <td className="px-5 py-4">
                              <div className="flex items-center justify-end gap-2 flex-wrap">
                                {PERMS.canUpdateStatus(role) && (
                                  <>
                                    {appt.status === 'PENDING' && (
                                      <button onClick={() => handleUpdateStatus(appt.id, 'CONFIRMED')} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-blue-700 transition">Xác nhận</button>
                                    )}
                                    {appt.status === 'CONFIRMED' && (
                                      <button onClick={() => handleUpdateStatus(appt.id, 'ARRIVED')} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-700 transition">Đã đến viện</button>
                                    )}
                                    {appt.status === 'ARRIVED' && role === 'NURSE' && (
                                      <button onClick={() => { setVitalsModal(appt); setVitalsData({ bloodPressure: '', heartRate: '', temperature: '', weight: '', height: '', spO2: '', notes: '' }); }} className="text-xs bg-teal-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-teal-700 transition">Đo Sinh Hiệu</button>
                                    )}
                                    {appt.status === 'READY' && PERMS.canExam(role) && (
                                      <button onClick={() => setExamModal(appt)} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-green-700 transition">Khám ngay</button>
                                    )}
                                    {(appt.is_emergency || appt.status === 'EMERGENCY') && role !== 'RECEPTIONIST' && appt.status !== 'TRANSFER_PENDING' && (
                                      <button onClick={() => handleUpdateStatus(appt.id, 'ARRIVED')} className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-red-700 transition">Tiếp nhận CC</button>
                                    )}
                                    {appt.status === 'TRANSFER_PENDING' && role !== 'RECEPTIONIST' && (
                                      <button onClick={() => handleUpdateStatus(appt.id, 'READY')} className="text-xs bg-orange-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-orange-700 transition animate-pulse">Tiếp nhận ca chuyển</button>
                                    )}
                                    {role === 'DOCTOR' && appt.status !== 'CANCELED' && appt.status !== 'COMPLETED' && appt.status !== 'TRANSFER_PENDING' && (
                                      <button
                                        onClick={() => { setTransferModal(appt); setTransferTargetDept(''); setTransferReason(''); }}
                                        className="text-xs bg-orange-500 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-orange-600 transition flex items-center gap-1"
                                      >
                                        <ArrowRightLeft size={12}/> Chuyển khoa
                                      </button>
                                    )}
                                    {appt.status === 'PENDING' && (
                                      <button onClick={() => handleCancelAppointment(appt.id)} className="text-xs text-red-600 border border-red-200 px-3 py-1.5 rounded-lg font-bold hover:bg-red-50 transition">Hủy</button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {visibleAppointments.length === 0 && (
                        <tr><td colSpan="6" className="px-6 py-16 text-center">
                          <Calendar size={40} className="mx-auto mb-4 text-slate-200"/>
                          <div className="text-slate-400 font-semibold">Không có lịch hẹn nào phù hợp</div>
                          <div className="text-slate-300 text-xs mt-1">Thử thay đổi bộ lọc hoặc kiểm tra lại ngày khám</div>
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: Patients ── */}
          {activeTab === 'patients' && PERMS.canViewPatients(role) && (
            <div className="animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center gap-4">
                  <span className="font-bold text-slate-700">
                    {searchTerm ? `${filteredPatients.length}/${patients.length}` : patients.length} bệnh nhân
                  </span>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-64 pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                      placeholder="Tìm theo mã BN, tên hoặc SĐT..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4 font-bold">Mã BN</th>
                        <th className="px-6 py-4 font-bold">Thông tin</th>
                        <th className="px-6 py-4 font-bold">CCCD</th>
                        <th className="px-6 py-4 font-bold">Tuổi / Ngày sinh</th>
                        <th className="px-6 py-4 font-bold">Giới tính</th>
                        <th className="px-6 py-4 font-bold">Bệnh án</th>
                        {PERMS.canViewMedical(role) && <th className="px-6 py-4 font-bold text-right">Chi tiết</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredPatients.map(patient => (
                        <tr key={patient.id} className="hover:bg-slate-50 transition">
                          <td className="px-6 py-4 font-mono font-bold text-blue-600 text-sm">{patient.patientCode || `BN-${patient.id}`}</td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-800">{patient.name}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{patient.phone}</div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-600">{patient.cccd || '---'}</td>
                          <td className="px-6 py-4">
                            <div className="text-sm">{patient.dob || '--'}</div>
                            {patient.dob && <div className="text-xs text-blue-600 font-bold mt-0.5">{calcAge(patient.dob)} tuổi</div>}
                          </td>
                          <td className="px-6 py-4 text-slate-600">{patient.gender || '--'}</td>
                          <td className="px-6 py-4">
                            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
                              {patient.medicalHistory?.length || 0} hồ sơ
                            </span>
                          </td>
                          {PERMS.canViewMedical(role) && (
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => { setSelectedPatient(patient); setPatientDetailModal(true); }}
                                className="text-xs bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-bold hover:bg-blue-600 hover:text-white transition"
                              >
                                Xem hồ sơ
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {filteredPatients.length === 0 && (
                        <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                          <Users size={32} className="mx-auto mb-3 opacity-30"/>
                          {patients.length === 0 ? 'Chưa có dữ liệu bệnh nhân.' : 'Không tìm thấy bệnh nhân phù hợp.'}
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: Staff ── */}
          {activeTab === 'staff' && PERMS.canViewStaff(role) && (
            <div className="animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Add form — ADMIN + BOD */}
                {PERMS.canAddStaff(role) && (
                  <div className="md:col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                      <h3 className="font-bold text-base mb-5 flex items-center gap-2 pb-4 border-b border-slate-100">
                        <UserPlus size={18} className="text-blue-600" /> Thêm tài khoản mới
                      </h3>
                      {role === 'BOD' && (
                        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-2">
                          <Shield size={13}/> Ban Giám Đốc có thể thêm nhân sự nhưng không được phân quyền
                        </div>
                      )}
                      <form onSubmit={handleAddStaff} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Họ và Tên</label>
                          <input required type="text" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} placeholder="VD: BS. Nguyễn Văn A" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Chức danh</label>
                          <input required type="text" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newStaff.title} onChange={e => setNewStaff({...newStaff, title: e.target.value})} placeholder="VD: Thạc sĩ, Bác sĩ CKI" />
                        </div>
                        {(newStaff.role === 'DOCTOR') && (
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Kinh nghiệm</label>
                            <input type="text" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newStaff.exp} onChange={e => setNewStaff({...newStaff, exp: e.target.value})} placeholder="VD: 10 năm" />
                          </div>
                        )}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Vai trò</label>
                          <select className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value, deptId: ''})}>
                            <option value="DOCTOR">Bác sĩ</option>
                            <option value="NURSE">Điều dưỡng</option>
                            <option value="RECEPTIONIST">Lễ tân</option>
                            {role === 'ADMIN' && <option value="ADMIN">Admin IT</option>}
                          </select>
                        </div>
                        {(newStaff.role === 'DOCTOR' || newStaff.role === 'NURSE') && (
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Chuyên khoa / Phòng ban</label>
                            <select required className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newStaff.deptId} onChange={e => setNewStaff({...newStaff, deptId: e.target.value})}>
                              <option value="">-- Chọn Khoa --</option>
                              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                          </div>
                        )}
                        <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Tên đăng nhập</label>
                            <input required type="text" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" value={newStaff.username} onChange={e => setNewStaff({...newStaff, username: e.target.value})} placeholder="username" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Mật khẩu</label>
                            <div className="relative">
                              <input required type={showNewPass ? 'text' : 'password'} className="w-full p-3 pr-10 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})} placeholder="Đặt mật khẩu riêng..." />
                              <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                {showNewPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                              </button>
                            </div>
                          </div>
                        </div>
                        <button type="submit" className="w-full bg-blue-700 text-white font-bold py-3 rounded-xl hover:bg-blue-800 transition text-sm shadow">
                          Tạo tài khoản
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* Staff list */}
                <div className={PERMS.canAddStaff(role) ? 'md:col-span-2' : 'md:col-span-3'}>
                  <div className="flex items-center justify-between mb-4">
                    {role === 'BOD' ? (
                      <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-5 py-3 text-sm font-semibold mb-4 flex items-center gap-2 w-full">
                        <Shield size={15}/> Bạn đang xem danh sách toàn bộ bác sĩ — Phân quyền tài khoản do Admin IT quản lý
                      </div>
                    ) : (
                      <div className="w-full relative">
                        <input type="text" placeholder="Tìm kiếm theo Tên hoặc Tài khoản..." className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" value={staffSearchQuery} onChange={e=>setStaffSearchQuery(e.target.value)} />
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                          <tr>
                            <th className="px-6 py-4 font-bold">Tài khoản</th>
                            <th className="px-6 py-4 font-bold">Họ và Tên</th>
                            <th className="px-6 py-4 font-bold">Vai trò / Khoa</th>
                            <th className="px-6 py-4 font-bold">Trạng thái</th>
                            <th className="px-6 py-4 font-bold text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {visibleStaff.length === 0 ? (
                            <tr><td colSpan="5" className="text-center py-6 text-slate-400 font-semibold">Không tìm thấy tài khoản nhân sự.</td></tr>
                          ) : visibleStaff.map(staff => {
                            const rc = getRoleConfig(staff.role);
                            return (
                              <tr key={staff.id} className={`transition hover:bg-slate-50 ${!staff.isActive ? 'opacity-50' : ''}`}>
                                <td className="px-6 py-4">
                                  <div className="font-mono font-bold text-blue-700 text-sm">{staff.username}</div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="font-bold text-slate-800">{staff.name}</div>
                                  <div className="text-xs text-slate-400 mt-0.5">{staff.title}</div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${rc.bg} ${rc.text}`}>{rc.label}</span>
                                  {staff.deptId && (
                                    <div className="text-xs text-slate-400 mt-1">{departments.find(d => d.id === staff.deptId)?.name}</div>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  {staff.isActive
                                    ? <span className="flex items-center gap-1.5 text-xs text-green-700 font-bold bg-green-50 px-2.5 py-1 rounded-lg w-fit border border-green-100">● Hoạt động</span>
                                    : <span className="flex items-center gap-1.5 text-xs text-red-600 font-bold bg-red-50 px-2.5 py-1 rounded-lg w-fit border border-red-100">● Không hoạt động</span>
                                  }
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {/* Reset MK — CHỈ ADMIN */}
                                    {role === 'ADMIN' && (
                                      <button title="Cấp lại mật khẩu" onClick={() => setResetPassModal(staff.id)} className="px-2 py-1.5 rounded-lg text-slate-500 border border-slate-200 hover:bg-blue-50 transition hover:border-blue-200 hover:text-blue-600">
                                        <Key size={14}/>
                                      </button>
                                    )}
                                    {/* Kích hoạt/Vô hiệu — ADMIN + BOD */}
                                    {PERMS.canToggleActive(role) && (
                                      <button
                                        onClick={() => handleToggleStaff(staff.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                                          staff.isActive
                                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                                            : 'border-green-200 text-green-600 hover:bg-green-50'
                                        }`}
                                      >
                                        {staff.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                                      </button>
                                    )}
                                    {/* Phân quyền — CHỈ ADMIN */}
                                    {PERMS.canChangeRole(role) && (
                                      <select
                                        value={staff.role}
                                        onChange={e => handleChangeRole(staff.id, e.target.value)}
                                        className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-400 outline-none"
                                      >
                                        <option value="DOCTOR">Bác sĩ</option>
                                        <option value="NURSE">Điều dưỡng</option>
                                        <option value="RECEPTIONIST">Lễ tân</option>
                                        <option value="ADMIN">Admin IT</option>
                                        <option value="BOD">Ban Giám Đốc</option>
                                      </select>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: Logs ── */}
          {activeTab === 'logs' && PERMS.canViewLogs(role) && (
            <div className="animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <span className="font-bold text-slate-700">{logsList.length} bản ghi</span>
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-bold w-1/4">Thời gian</th>
                      <th className="px-6 py-4 font-bold">Hành động</th>
                      <th className="px-6 py-4 font-bold w-1/5">Thực hiện bởi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {logsList.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4 font-mono text-xs text-slate-400">{new Date(log.date).toLocaleString('vi-VN')}</td>
                        <td className="px-6 py-4 font-semibold text-slate-800">{log.action}</td>
                        <td className="px-6 py-4">
                          <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-blue-100">{log.user}</span>
                        </td>
                      </tr>
                    ))}
                    {logsList.length === 0 && (
                      <tr><td colSpan="3" className="px-6 py-12 text-center text-slate-400">
                        <ServerCrash size={32} className="mx-auto mb-3 opacity-30"/>
                        Chưa có bản ghi hoạt động.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ── VITALS MODAL (Điều dưỡng đo sinh hiệu) ── */}
      {vitalsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-teal-700 to-teal-600 text-white flex justify-between items-center shrink-0">
              <h2 className="text-lg font-black flex items-center gap-2">🩺 Đo Sinh Hiệu Bệnh Nhân</h2>
              <button onClick={() => setVitalsModal(null)} className="text-white/70 hover:text-white font-bold text-2xl leading-none">&times;</button>
            </div>
            <div className="px-6 py-3 bg-teal-50 border-b border-teal-100 text-sm shrink-0">
              <div className="font-bold text-teal-800">👤 {vitalsModal.patientName}</div>
              <div className="text-teal-600 text-xs mt-0.5">Mã: {vitalsModal.code} — {vitalsModal.phone}</div>
            </div>
            <form onSubmit={handleSaveVitals} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Huyết áp (mmHg)</label>
                  <input type="text" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    value={vitalsData.bloodPressure} onChange={e => setVitalsData({...vitalsData, bloodPressure: e.target.value})} placeholder="VD: 120/80" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Nhịp tim (lần/phút)</label>
                  <input type="number" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    value={vitalsData.heartRate} onChange={e => setVitalsData({...vitalsData, heartRate: e.target.value})} placeholder="VD: 72" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Nhiệt độ (°C)</label>
                  <input type="number" step="0.1" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    value={vitalsData.temperature} onChange={e => setVitalsData({...vitalsData, temperature: e.target.value})} placeholder="VD: 37.0" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">SpO2 (%)</label>
                  <input type="number" step="0.1" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    value={vitalsData.spO2} onChange={e => setVitalsData({...vitalsData, spO2: e.target.value})} placeholder="VD: 98.5" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Cân nặng (kg)</label>
                  <input type="number" step="0.1" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    value={vitalsData.weight} onChange={e => setVitalsData({...vitalsData, weight: e.target.value})} placeholder="VD: 65.0" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Chiều cao (cm)</label>
                  <input type="number" step="0.1" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    value={vitalsData.height} onChange={e => setVitalsData({...vitalsData, height: e.target.value})} placeholder="VD: 170" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Ghi chú thêm</label>
                <textarea rows="2" className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  value={vitalsData.notes} onChange={e => setVitalsData({...vitalsData, notes: e.target.value})} placeholder="Ghi chú thêm cho bác sĩ..."></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setVitalsModal(null)} className="px-5 py-2.5 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition text-sm">Hủy bỏ</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl font-bold bg-teal-600 text-white hover:bg-teal-700 transition flex items-center gap-2 text-sm">
                  <Check size={16}/> Lưu & Chuyển Bác sĩ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EXAM MODAL ── */}
      {examModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-green-700 to-green-600 text-white flex justify-between items-center shrink-0">
              <h2 className="text-lg font-black flex items-center gap-2"><Stethoscope size={22}/> Khám & Kê Đơn</h2>
              <button onClick={() => setExamModal(null)} className="text-white/70 hover:text-white font-bold text-2xl leading-none">&times;</button>
            </div>
            <div className="grid grid-cols-3 gap-0 bg-slate-50 border-b text-sm px-6 py-3">
              <div><span className="text-slate-400 text-xs block">Mã lịch</span><b className="text-blue-600">{examModal.code}</b></div>
              <div><span className="text-slate-400 text-xs block">Bệnh nhân</span><b>{examModal.patientName}</b></div>
              <div><span className="text-slate-400 text-xs block">Điện thoại</span><b>{examModal.phone}</b></div>
            </div>
            {(() => {
              const matchedPatient = patients.find(p => p.phone === examModal.phone || p.id === examModal.patientId);
              const history = matchedPatient?.medicalHistory || [];
              if (history.length > 0) {
                return (
                  <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex flex-col gap-2 max-h-40 overflow-y-auto shrink-0">
                    <div className="font-bold text-xs text-amber-800 uppercase flex items-center gap-1.5">Hồ sơ bệnh án cũ ({history.length})</div>
                    {history.map((h, i) => (
                      <div key={i} className="bg-white p-2.5 text-xs rounded-xl border border-amber-200/60 shadow-sm leading-relaxed">
                        <div className="font-bold text-slate-700 mb-1">{h.date} - {h.doctor}:</div>
                        <div><span className="font-semibold">CĐ:</span> <span className="text-slate-600">{h.diagnosis}</span></div>
                        <div className="mt-0.5"><span className="font-semibold">Toa:</span> <span className="text-amber-700">{h.prescription}</span></div>
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            })()}
            <form onSubmit={handleCompleteExam} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Chẩn đoán bệnh <span className="text-red-500">*</span></label>
                <input required type="text" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  value={recordData.diagnosis} onChange={e => setRecordData({...recordData, diagnosis: e.target.value})} placeholder="VD: Viêm phế quản cấp..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Đơn thuốc (Kê toa) <span className="text-red-500">*</span></label>
                <textarea required rows="4" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 resize-none text-sm"
                  value={recordData.prescription} onChange={e => setRecordData({...recordData, prescription: e.target.value})} placeholder="- Thuốc A: Ngày 2 viên...&#10;- Thuốc B: Uống sau ăn..."></textarea>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Lời dặn dò / Tái khám</label>
                <textarea rows="2" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 resize-none text-sm"
                  value={recordData.notes} onChange={e => setRecordData({...recordData, notes: e.target.value})} placeholder="Hẹn tái khám sau X ngày. Ăn uống, nghỉ ngơi..."></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setExamModal(null)} className="px-5 py-2.5 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition text-sm">Hủy bỏ</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl font-bold bg-green-600 text-white hover:bg-green-700 transition flex items-center gap-2 text-sm">
                  <Check size={16}/> Lưu & Đóng ca khám
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TRANSFER MODAL (Cấp cứu chuyển khoa) ── */}
      {transferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-red-700 to-orange-600 text-white flex justify-between items-center">
              <h2 className="text-lg font-black flex items-center gap-2">
                <ArrowRightLeft size={22}/> Luân Chuyển Bệnh Nhân
              </h2>
              <button onClick={() => setTransferModal(null)} className="text-white/70 hover:text-white font-bold text-2xl leading-none">&times;</button>
            </div>
            <div className="px-6 py-4 bg-red-50 border-b border-red-100 text-sm shrink-0">
              <div className="font-bold text-red-800">🚨 Bệnh nhân: {transferModal.patientName}</div>
              <div className="text-red-600 text-xs mt-1">Mã hồ sơ: {transferModal.code} — {transferModal.phone}</div>
            </div>

            {(() => {
              const transfers = (transferModal.history || []).filter(h => h.action.startsWith('Chuyển khoa'));
              if (transfers.length > 0) {
                return (
                  <div className="px-6 py-3 bg-white border-b border-slate-100 flex flex-col gap-2 max-h-32 overflow-y-auto shrink-0">
                    <div className="font-bold text-xs text-slate-800 uppercase">Lịch sử luân chuyển</div>
                    {transfers.map((t, i) => (
                      <div key={i} className="text-xs text-slate-600 border-l-2 border-orange-400 pl-2 py-1 bg-orange-50">
                        <span className="font-bold text-slate-800">{new Date(t.date).toLocaleTimeString('vi-VN')}</span>: {t.action}
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            })()}

            <form onSubmit={handleTransferPatient} className="p-6 overflow-y-auto flex-1 space-y-5">
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-xs text-orange-800 font-semibold">
                ⚠️ Sau khi chuyển, hồ sơ sẽ được ưu tiên lên đầu danh sách chờ của khoa tiếp nhận và bác sĩ sẽ được thông báo realtime.
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Khoa tiếp nhận <span className="text-red-500">*</span></label>
                <select
                  required
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                  value={transferTargetDept}
                  onChange={e => setTransferTargetDept(e.target.value)}
                >
                  <option value="">-- Chọn khoa tiếp nhận --</option>
                  {departments
                    .filter(d => d.id !== transferModal.deptId && d.id !== transferModal.current_department)
                    .map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Lý do chuyển khoa <span className="text-red-500">*</span></label>
                <textarea
                  required
                  rows="3"
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  value={transferReason}
                  onChange={e => setTransferReason(e.target.value)}
                  placeholder="VD: Bệnh nhân nhồi máu cơ tim cấp, cần can thiệp tim mạch khẩn..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setTransferModal(null)} className="px-5 py-2.5 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition text-sm">
                  Hủy
                </button>
                <button type="submit" className="px-5 py-2.5 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition flex items-center gap-2 text-sm shadow">
                  <ArrowRightLeft size={16}/> Xác nhận chuyển khoa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PATIENT DETAIL MODAL ── */}
      {patientDetailModal && selectedPatient && PERMS.canViewMedical(role) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-6 py-5 border-b flex justify-between items-center bg-slate-50 shrink-0">
              <div>
                <h2 className="text-xl font-black text-slate-800">{selectedPatient.name}</h2>
                <p className="text-sm text-blue-600 font-bold">{selectedPatient.patientCode || `BN-${selectedPatient.id}`}</p>
              </div>
              <button onClick={() => setPatientDetailModal(false)} className="text-slate-400 hover:text-red-500 font-bold text-2xl">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4 mb-8 pb-6 border-b border-slate-100">
                {[
                  ['Số điện thoại', selectedPatient.phone],
                  ['CCCD', selectedPatient.cccd || '---'],
                  ['Ngày sinh', selectedPatient.dob ? `${selectedPatient.dob} (${calcAge(selectedPatient.dob)} tuổi)` : '---'],
                  ['Giới tính', selectedPatient.gender || '---'],
                ].map(([label, val]) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-4">
                    <span className="text-slate-400 text-xs block mb-1 font-semibold">{label}</span>
                    <b className="text-slate-800 text-sm">{val}</b>
                  </div>
                ))}
              </div>
              <h3 className="font-black text-base text-slate-800 mb-4">Lịch sử bệnh án</h3>
              <div className="space-y-4">
                {(selectedPatient.medicalHistory || []).map((h, i) => (
                  <div key={i} className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-start mb-3">
                      <div className="text-sm font-black text-blue-600">{h.date}</div>
                      <div className="text-xs text-slate-400 font-medium">{h.doctor}</div>
                    </div>
                    <div className="font-bold text-slate-800 mb-3 text-base">{h.diagnosis}</div>
                    {h.prescription && (
                      <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-sm">
                        <div className="font-bold text-orange-800 mb-2 text-xs uppercase tracking-wider">💊 Toa thuốc</div>
                        <div className="text-orange-900 whitespace-pre-line leading-relaxed">{h.prescription}</div>
                      </div>
                    )}
                    {h.notes && <div className="text-xs text-slate-500 mt-3 italic">{h.notes}</div>}
                  </div>
                ))}
                {(!selectedPatient.medicalHistory || selectedPatient.medicalHistory.length === 0) && (
                  <div className="text-center py-8 text-slate-400 italic">Chưa có dữ liệu bệnh án.</div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-slate-50 text-right shrink-0">
              <button onClick={() => setPatientDetailModal(false)} className="px-6 py-2.5 rounded-xl font-bold bg-slate-800 text-white hover:bg-slate-900 transition text-sm">Đóng</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Reset Mật Khẩu Staff Modal */}
      {resetPassModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <form onSubmit={handleResetPassword} className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2 border-b pb-4">
              <Key size={18} className="text-blue-600"/> Cấp lại Mật khẩu
            </h3>
            <div className="mb-6 mt-4">
               <label className="block text-xs font-bold text-slate-700 mb-2">Mật khẩu cấp mới</label>
               <input required type="text" className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={resetPassValue} onChange={e=>setResetPassValue(e.target.value)} placeholder="Nhập vào mật khẩu mới..." />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setResetPassModal(null); setResetPassValue(''); }} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition">Hủy bỏ</button>
              <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition">Lưu cập nhật</button>
            </div>
          </form>
        </div>
      )}

      {/* ── TOAST (To hơn, có loại emergency) ── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-7 py-5 rounded-2xl shadow-2xl flex items-center gap-4 z-50 animate-in slide-in-from-bottom-4 max-w-sm ${
          toastType === 'emergency'
            ? 'bg-red-700 text-white'
            : 'bg-slate-900 text-white'
        }`}>
          <div className={`w-3 h-3 rounded-full shrink-0 animate-pulse ${toastType === 'emergency' ? 'bg-yellow-300' : 'bg-green-400'}`}></div>
          <span className="font-bold text-base leading-snug">{toast}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-white/60 hover:text-white transition shrink-0">
            <X size={16}/>
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
