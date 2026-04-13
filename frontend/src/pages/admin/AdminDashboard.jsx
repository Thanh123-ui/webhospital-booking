import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Calendar, Users, Settings, LogOut, Stethoscope,
  UserPlus, Check, ServerCrash, Bell, Shield, Eye, EyeOff
} from 'lucide-react';
import { api } from '../../services/api';
import { socket } from '../../services/socket';
import { useAuth } from '../../services/AuthContext';
import { getStatusBadge, getRoleConfig } from '../../utils/helpers';

// ─── Permission Matrix ────────────────────────────────────────────────────────
// ADMIN        : Full access
// BOD          : Appointments + Patients + Staff view/toggle — NO logs, NO add/role
// DOCTOR       : Appointments + patients of own dept + exam
// NURSE        : Appointments of own dept only — no medical records, no patients
// RECEPTIONIST : Appointments only (view/confirm/arrived)
// ─────────────────────────────────────────────────────────────────────────────
const PERMS = {
  canViewPatients:  (r) => r === 'ADMIN' || r === 'BOD' || r === 'DOCTOR',
  canViewMedical:   (r) => r === 'ADMIN' || r === 'DOCTOR',
  canViewStaff:     (r) => r === 'ADMIN' || r === 'BOD',
  canAddStaff:      (r) => r === 'ADMIN',
  canChangeRole:    (r) => r === 'ADMIN',
  canToggleActive:  (r) => r === 'ADMIN' || r === 'BOD',
  canViewLogs:      (r) => r === 'ADMIN',
  canExam:          (r) => r === 'DOCTOR',
  canUpdateStatus:  (r) => ['ADMIN','BOD','DOCTOR','NURSE','RECEPTIONIST'].includes(r),
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { currentStaffUser, setCurrentStaffUser } = useAuth();
  const role = currentStaffUser?.role;

  // Which tabs are visible for this role
  const tabs = [
    { id: 'list',     label: 'Lịch hẹn & Khám',   icon: <Calendar size={17}/>,     show: true },
    { id: 'patients', label: 'Bệnh nhân',           icon: <Users size={17}/>,        show: PERMS.canViewPatients(role) },
    { id: 'staff',    label: 'Quản lý Nhân sự',     icon: <Settings size={17}/>,     show: PERMS.canViewStaff(role) },
    { id: 'logs',     label: 'Nhật ký Hệ thống',    icon: <ServerCrash size={17}/>,  show: PERMS.canViewLogs(role) },
  ].filter(t => t.show);

  const [activeTab, setActiveTab] = useState('list');

  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [logsList, setLogsList] = useState([]);

  const [newStaff, setNewStaff] = useState({ name: '', username: '', password: '', role: 'DOCTOR', title: '', deptId: '' });
  const [examModal, setExamModal] = useState(null);
  const [recordData, setRecordData] = useState({ diagnosis: '', prescription: '', notes: '' });
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientDetailModal, setPatientDetailModal] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  const calcAge = (dob) => {
    if (!dob) return null;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const fetchAppointments = () => api.getAllAppointments(currentStaffUser.role, currentStaffUser.deptId).then(res => setAppointments(res.data)).catch(console.error);
  const fetchPatients = () => api.getAllPatients(currentStaffUser.role, currentStaffUser.deptId).then(res => setPatients(res.data)).catch(console.error);
  const fetchStaff = () => api.getAllStaff().then(res => setStaffList(res.data)).catch(console.error);
  const fetchLogs = () => api.getSystemLogs().then(res => setLogsList(res.data)).catch(console.error);

  useEffect(() => {
    if (!currentStaffUser) return;
    socket.connect();
    fetchAppointments();
    api.getDepartments().then(res => setDepartments(res.data)).catch(console.error);
    if (PERMS.canViewPatients(role)) fetchPatients();
    if (PERMS.canViewStaff(role)) fetchStaff();
    if (PERMS.canViewLogs(role)) fetchLogs();

    const handleNewAppt = (appt) => {
      showToast(`🔔 Lịch khám mới từ ${appt.patientName}!`);
      fetchAppointments();
    };
    socket.on('new_appointment', handleNewAppt);
    socket.on('update_appointment', fetchAppointments);
    return () => {
      socket.off('new_appointment', handleNewAppt);
      socket.off('update_appointment', fetchAppointments);
      socket.disconnect();
    };
  }, [currentStaffUser]);

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
      setNewStaff({ name: '', username: '', password: '', role: 'DOCTOR', title: '', deptId: '' });
      fetchStaff();
    } catch (err) { alert(err.response?.data?.message || 'Lỗi khi thêm nhân sự'); }
  };

  const handleToggleStaff = async (id) => {
    try {
      await api.toggleStaffActive(id);
      fetchStaff();
    } catch { alert('Lỗi khi thay đổi trạng thái!'); }
  };

  const handleChangeRole = async (id, newRole) => {
    if (!window.confirm(`Đổi vai trò sang "${newRole}"?`)) return;
    try {
      await api.updateStaffRole(id, newRole);
      fetchStaff();
      showToast('✅ Đã cập nhật vai trò!');
    } catch { alert('Lỗi khi đổi quyền!'); }
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

  const logout = () => { setCurrentStaffUser(null); navigate('/admin'); };

  const roleConfig = getRoleConfig(role);
  const currentDept = departments.find(d => d.id === currentStaffUser?.deptId);

  // Filter appointments for NURSE: only own dept
  const visibleAppointments = role === 'NURSE'
    ? appointments.filter(a => {
        // find doctor's dept
        const docDept = a.deptId || null;
        return !currentStaffUser.deptId || docDept === currentStaffUser.deptId;
      })
    : appointments;

  return (
    <div className="flex h-screen bg-[#F0F4FA] text-slate-800 font-['Inter',sans-serif]">

      {/* ── SIDEBAR ── */}
      <aside className="w-64 bg-blue-950 text-slate-300 flex flex-col shadow-2xl shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-blue-900 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow">
            <span className="text-white font-black text-base">+</span>
          </div>
          <div>
            <div className="text-white font-black text-sm tracking-widest">HOSPITAL</div>
            <div className="text-blue-400 text-[10px] font-semibold tracking-wider">Cổng Nội Bộ</div>
          </div>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-blue-900/60">
          <div className="flex items-center gap-3 bg-blue-900/50 rounded-2xl px-3 py-3">
            <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center text-xl shrink-0">
              {currentStaffUser?.avatar || '👤'}
            </div>
            <div className="min-w-0">
              <div className="text-white font-bold text-sm leading-tight truncate">{currentStaffUser?.name}</div>
              <div className="mt-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${roleConfig.bg} ${roleConfig.text}`}>
                  {roleConfig.label}
                </span>
              </div>
              {currentDept && <div className="text-[10px] text-blue-300 mt-1 font-medium truncate">{currentDept.name}</div>}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-blue-900/60'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-blue-900">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-all"
          >
            <LogOut size={17} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <div className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-20 shadow-sm">
          <div>
            <h1 className="text-lg font-black text-slate-800">
              {tabs.find(t => t.id === activeTab)?.label}
              {currentDept && activeTab === 'list' && <span className="text-blue-600 ml-2">— {currentDept.name}</span>}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {role === 'NURSE' && (
              <div className="flex items-center gap-2 bg-teal-50 text-teal-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-teal-200">
                <Shield size={13}/> Chế độ Điều dưỡng — {currentDept?.name}
              </div>
            )}
            {role === 'RECEPTIONIST' && (
              <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-indigo-200">
                <Shield size={13}/> Chế độ Lễ tân
              </div>
            )}
            {role === 'BOD' && (
              <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-200">
                <Shield size={13}/> Ban Giám Đốc
              </div>
            )}
          </div>
        </div>

        <div className="p-8">

          {/* ── TAB: Appointments ── */}
          {activeTab === 'list' && (
            <div className="animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                  <span className="font-bold text-slate-700">{appointments.length} lịch hẹn</span>
                  {role === 'NURSE' && (
                    <span className="text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg font-bold border border-amber-200">
                      ⚠ Chỉ hiển thị khoa {currentDept?.name}
                    </span>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4 font-bold">Mã</th>
                        <th className="px-6 py-4 font-bold">Bệnh nhân</th>
                        <th className="px-6 py-4 font-bold">Thời gian</th>
                        <th className="px-6 py-4 font-bold">Trạng thái</th>
                        <th className="px-6 py-4 font-bold text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {appointments.map(appt => (
                        <tr
                          key={appt.id}
                          className={`transition hover:bg-slate-50 ${
                            appt.status === 'EMERGENCY'
                              ? 'bg-red-50 border-l-4 border-red-500 font-bold'
                              : ''
                          }`}
                        >
                          <td className="px-6 py-4 font-mono text-sm text-slate-500 font-semibold">{appt.code}</td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-800">{appt.patientName}</div>
                            <div className="text-xs text-slate-400">{appt.phone}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold">{appt.date}</div>
                            <div className="text-xs text-slate-400">{appt.time}</div>
                          </td>
                          <td className="px-6 py-4">{getStatusBadge(appt.status)}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2 flex-wrap">
                              {PERMS.canUpdateStatus(role) && (
                                <>
                                  {appt.status === 'PENDING' && (
                                    <button onClick={() => handleUpdateStatus(appt.id, 'CONFIRMED')} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-blue-700 transition">
                                      Xác nhận
                                    </button>
                                  )}
                                  {appt.status === 'CONFIRMED' && (
                                    <button onClick={() => handleUpdateStatus(appt.id, 'ARRIVED')} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-700 transition">
                                      Đã đến
                                    </button>
                                  )}
                                  {appt.status === 'ARRIVED' && role !== 'RECEPTIONIST' && (
                                    <button onClick={() => handleUpdateStatus(appt.id, 'READY')} className="text-xs bg-teal-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-teal-700 transition">
                                      Đo sinh hiệu
                                    </button>
                                  )}
                                  {appt.status === 'READY' && PERMS.canExam(role) && (
                                    <button onClick={() => setExamModal(appt)} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-green-700 transition">
                                      Khám ngay
                                    </button>
                                  )}
                                  {(appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
                                    <button onClick={() => handleCancelAppointment(appt.id)} className="text-xs text-red-600 border border-red-200 px-3 py-1.5 rounded-lg font-bold hover:bg-red-50 transition">
                                      Hủy
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {appointments.length === 0 && (
                        <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                          <Calendar size={32} className="mx-auto mb-3 opacity-30"/>
                          Chưa có lịch hẹn nào.
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
                  <span className="font-bold text-slate-700">{patients.length} bệnh nhân</span>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-64 pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                      placeholder="Tìm kiếm Mã BN..."
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
                      {patients
                        .filter(p => !searchTerm || (p.patientCode || '').toLowerCase().includes(searchTerm.toLowerCase()))
                        .map(patient => (
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
                      {patients.length === 0 && (
                        <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                          <Users size={32} className="mx-auto mb-3 opacity-30"/>
                          Chưa có dữ liệu bệnh nhân.
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
                {/* Add form — ADMIN only */}
                {PERMS.canAddStaff(role) && (
                  <div className="md:col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                      <h3 className="font-bold text-base mb-5 flex items-center gap-2 pb-4 border-b border-slate-100">
                        <UserPlus size={18} className="text-blue-600" /> Thêm tài khoản mới
                      </h3>
                      <form onSubmit={handleAddStaff} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Họ và Tên</label>
                          <input required type="text" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} placeholder="VD: BS. Nguyễn Văn A" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Chức danh</label>
                          <input required type="text" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newStaff.title} onChange={e => setNewStaff({...newStaff, title: e.target.value})} placeholder="VD: Thạc sĩ, Bác sĩ CKI" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Vai trò</label>
                          <select className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value, deptId: ''})}>
                            <option value="DOCTOR">Bác sĩ</option>
                            <option value="NURSE">Điều dưỡng</option>
                            <option value="RECEPTIONIST">Lễ tân</option>
                            <option value="ADMIN">Admin IT</option>
                          </select>
                        </div>
                        {(newStaff.role === 'DOCTOR' || newStaff.role === 'NURSE') && (
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Chuyên khoa</label>
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
                  {role === 'BOD' && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-5 py-3 text-sm font-semibold mb-4 flex items-center gap-2">
                      <Shield size={15}/> Chế độ Xem — Ban Giám Đốc không có quyền thêm/xóa tài khoản
                    </div>
                  )}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                          <tr>
                            <th className="px-6 py-4 font-bold">Tài khoản</th>
                            <th className="px-6 py-4 font-bold">Họ và Tên</th>
                            <th className="px-6 py-4 font-bold">Vai trò / Khoa</th>
                            <th className="px-6 py-4 font-bold">Trạng thái</th>
                            {PERMS.canAddStaff(role) && <th className="px-6 py-4 font-bold text-right">Thao tác</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {staffList.map(staff => {
                            const rc = getRoleConfig(staff.role);
                            return (
                              <tr key={staff.id} className={`transition hover:bg-slate-50 ${!staff.isActive ? 'opacity-50' : ''}`}>
                                <td className="px-6 py-4">
                                  <div className="font-mono font-bold text-blue-700 text-sm">{staff.username}</div>
                                  {PERMS.canAddStaff(role) && (
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                      <span className="text-[10px] text-slate-400">Mật khẩu:</span>
                                      <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded tracking-widest">{staff.password}</span>
                                    </div>
                                  )}
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
                                {PERMS.canAddStaff(role) && (
                                  <td className="px-6 py-4 text-right">
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
                                  </td>
                                )}
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
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Lời dặn dò</label>
                <textarea rows="2" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 resize-none text-sm"
                  value={recordData.notes} onChange={e => setRecordData({...recordData, notes: e.target.value})} placeholder="Ăn uống, nghỉ ngơi..."></textarea>
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

      {/* ── TOAST ── */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50 animate-in slide-in-from-bottom-4">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0"></div>
          <span className="font-semibold text-sm">{toast}</span>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
