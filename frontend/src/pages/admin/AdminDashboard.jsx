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
import { formatDateDisplay, getStatusBadge, getRoleConfig, normalizeDateValue } from '../../utils/helpers';

// â”€â”€â”€ Permission Matrix â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ADMIN        : Full access
// BOD          : GiÃ¡m sÃ¡t toÃ n viá»‡n + nhÃ¢n sá»± váº­n hÃ nh, khÃ´ng lÃ m thay luá»“ng khÃ¡m
// DOCTOR       : Appointments + patients of own dept + exam
// NURSE        : Appointments + patients cá»§a khoa mÃ¬nh â€” no medical records
// RECEPTIONIST : Appointments only (view/confirm/arrived)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PERMS = {
  canViewPatients:  (r) => ['ADMIN','BOD','DOCTOR','NURSE','RECEPTIONIST'].includes(r),
  canViewMedical:   (r) => ['ADMIN','BOD','DOCTOR'].includes(r),
  canViewStaff:     (r) => ['ADMIN','BOD'].includes(r),
  canAddStaff:      (r) => ['ADMIN'].includes(r),
  canChangeRole:    (r) => r === 'ADMIN',           // BOD KHÃ”NG Ä‘Æ°á»£c phÃ¢n quyá»n
  canToggleActive:  (r) => ['ADMIN', 'BOD'].includes(r),
  canViewLogs:      (r) => ['ADMIN'].includes(r),
  canExam:          (r) => r === 'DOCTOR',
  canUpdateStatus:  (r) => ['ADMIN','DOCTOR','NURSE','RECEPTIONIST'].includes(r),
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
    { id: 'list',     label: 'Lá»‹ch háº¹n & KhÃ¡m',   icon: <Calendar size={17}/>,     show: true },
    { id: 'patients', label: 'Bá»‡nh nhÃ¢n',           icon: <Users size={17}/>,        show: PERMS.canViewPatients(role) },
    { id: 'staff',    label: 'Quáº£n lÃ½ NhÃ¢n sá»±',     icon: <Settings size={17}/>,     show: PERMS.canViewStaff(role) },
    { id: 'logs',     label: 'Nháº­t kÃ½ Há»‡ thá»‘ng',    icon: <ServerCrash size={17}/>,  show: PERMS.canViewLogs(role) },
  ].filter(t => t.show);

  const [activeTab, setActiveTab] = useState('list');

  const [appointments, setAppointments] = useState([]);
  const [emergencyRequests, setEmergencyRequests] = useState([]);
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

  // Vitals modal â€” Äiá»u dÆ°á»¡ng Ä‘o sinh hiá»‡u
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

  const getEffectiveDeptId = (appt) => {
    if (appt.current_department) return parseInt(appt.current_department);
    if (appt.deptId) return parseInt(appt.deptId);
    const assignedDoctor = appt.doctorId ? staffList.find(s => s.id === appt.doctorId) : null;
    return assignedDoctor?.deptId ? parseInt(assignedDoctor.deptId) : null;
  };

  const fetchAppointments = () => api.getAllAppointments(currentStaffUser.role, currentStaffUser.deptId).then(res => setAppointments(res.data)).catch(console.error);
  const fetchEmergencyRequests = () => api.getEmergencyRequests().then(res => setEmergencyRequests(res.data)).catch(console.error);
  const fetchPatients    = () => api.getAllPatients(currentStaffUser.role, currentStaffUser.deptId).then(res => setPatients(res.data)).catch(console.error);
  const fetchStaff       = () => api.getAllStaff().then(res => setStaffList(res.data)).catch(console.error);
  const fetchLogs        = () => api.getSystemLogs().then(res => setLogsList(res.data)).catch(console.error);

  const currentDept = departments.find(d => d.id === currentStaffUser?.deptId);
  const isEmergencyDept = currentDept?.isEmergency;
  const canAccessEmergencyAlerts = role === 'RECEPTIONIST' || (['DOCTOR', 'NURSE'].includes(role) && isEmergencyDept);
  const openEmergencyRequests = emergencyRequests.filter((request) => ['PENDING', 'IN_PROGRESS'].includes(request.status));

  useEffect(() => {
    if (!currentStaffUser) {
      setEmergencyRequests([]);
      return;
    }

    socket.auth = { token: localStorage.getItem('staffAccessToken') || '' };
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [currentStaffUser?.id]);

  useEffect(() => {
    if (!currentStaffUser) {
      setEmergencyRequests([]);
      return;
    }

    fetchAppointments();
    api.getDepartments().then(res => setDepartments(res.data)).catch(console.error);
    if (PERMS.canViewPatients(role)) fetchPatients();
    if (PERMS.canViewStaff(role)) fetchStaff();
    if (PERMS.canViewLogs(role)) fetchLogs();
    if (canAccessEmergencyAlerts) fetchEmergencyRequests();
    else setEmergencyRequests([]);
  }, [currentStaffUser?.id, role, canAccessEmergencyAlerts]);

  useEffect(() => {
    if (!currentStaffUser) return;

    const refreshAppointmentsAndPatients = () => {
      fetchAppointments();
      if (canAccessEmergencyAlerts) {
        fetchEmergencyRequests();
      }
      if (PERMS.canViewPatients(role)) fetchPatients();
    };

    const handleNewAppt = (appt) => {
      showToast(`ðŸ”” Lá»‹ch khÃ¡m má»›i: ${appt.patientName} â€” ${formatDateDisplay(appt.date)} ${appt.time}`, 'info');
      refreshAppointmentsAndPatients();
    };
    const handleAppointmentUpdate = () => {
      refreshAppointmentsAndPatients();
    };
    const handleEmergencyTransfer = ({ transfer }) => {
      showToast(`ðŸš¨ Chuyển khoa cáº¥p cá»©u: ${transfer.patientName} â†’ ${transfer.toDeptName}`, 'emergency');
      refreshAppointmentsAndPatients();
    };
    const handleEmergencyRequest = (request) => {
      if (!canAccessEmergencyAlerts) return;
      showToast(`ðŸš¨ YÃªu cáº§u cáº¥p cá»©u má»›i: ${request.requesterName} â€” ${request.phone}`, 'emergency');
      fetchEmergencyRequests();
    };
    const handleEmergencyRequestUpdate = () => {
      if (!canAccessEmergencyAlerts) return;
      fetchEmergencyRequests();
    };

    socket.on('new_appointment', handleNewAppt);
    socket.on('update_appointment', handleAppointmentUpdate);
    socket.on('emergency_transfer', handleEmergencyTransfer);
    socket.on('new_emergency_request', handleEmergencyRequest);
    socket.on('update_emergency_request', handleEmergencyRequestUpdate);

    return () => {
      socket.off('new_appointment', handleNewAppt);
      socket.off('update_appointment', handleAppointmentUpdate);
      socket.off('emergency_transfer', handleEmergencyTransfer);
      socket.off('new_emergency_request', handleEmergencyRequest);
      socket.off('update_emergency_request', handleEmergencyRequestUpdate);
    };
  }, [currentStaffUser?.id, role, canAccessEmergencyAlerts]);

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.updateAppointmentStatus(id, { status, role });
      fetchAppointments();
    } catch { alert('Lá»—i khi cáº­p nháº­t!'); }
  };

  const handleCancelAppointment = async (id) => {
    if (!window.confirm('Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n há»§y lá»‹ch háº¹n nÃ y?')) return;
    try {
      await api.cancelAppointment(id, { role, reason: 'Hủy bá»Ÿi nhÃ¢n viÃªn bá»‡nh viá»‡n' }, 'staff');
      fetchAppointments();
    } catch { alert('Lá»—i khi há»§y lá»‹ch!'); }
  };

  const handleMarkNoShow = async (id) => {
    if (!window.confirm('ÄÃ¡nh dáº¥u lá»‹ch háº¹n nÃ y lÃ  váº¯ng máº·t?')) return;
    try {
      await api.markAppointmentNoShow(id, { reason: 'Bá»‡nh nhÃ¢n khÃ´ng Ä‘áº¿n theo giá» háº¹n' });
      fetchAppointments();
      showToast('âœ… ÄÃ£ Ä‘Ã¡nh dáº¥u bá»‡nh nhÃ¢n váº¯ng máº·t.');
    } catch (err) {
      alert(err.response?.data?.message || 'Lá»—i khi Ä‘Ã¡nh dáº¥u váº¯ng máº·t!');
    }
  };

  const handleEmergencyRequestStatus = async (id, status) => {
    if (!canAccessEmergencyAlerts) {
      alert('Báº¡n khÃ´ng cÃ³ quyá»n xá»­ lÃ½ yÃªu cáº§u cáº¥p cá»©u.');
      return;
    }
    try {
      await api.updateEmergencyRequestStatus(id, status);
      fetchEmergencyRequests();
      showToast(
        status === 'RESOLVED'
          ? 'âœ… ÄÃ£ hoÃ n táº¥t yÃªu cáº§u cáº¥p cá»©u.'
          : 'ðŸš¨ ÄÃ£ tiáº¿p nháº­n yÃªu cáº§u cáº¥p cá»©u.',
        'emergency'
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Lá»—i khi cáº­p nháº­t yÃªu cáº§u cáº¥p cá»©u!');
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!newStaff.password || newStaff.password.length < 3) { alert('Máº­t kháº©u pháº£i cÃ³ Ã­t nháº¥t 3 kÃ½ tá»±!'); return; }
    try {
      await api.addStaff(newStaff);
      showToast('âœ… Táº¡o tÃ i khoáº£n thÃ nh cÃ´ng!');
      setNewStaff({ name: '', username: '', password: '', role: 'DOCTOR', title: '', deptId: '', exp: '' });
      fetchStaff();
    } catch (err) { alert(err.response?.data?.message || 'Lá»—i khi thÃªm nhÃ¢n sá»±'); }
  };

  const handleSaveVitals = async (e) => {
    e.preventDefault();
    if (!vitalsModal) return;
    try {
      await api.saveVitals(vitalsModal.id, { vitals: vitalsData, role, staffId: currentStaffUser.id });
      setVitalsModal(null);
      setVitalsData({ bloodPressure: '', heartRate: '', temperature: '', weight: '', height: '', spO2: '', notes: '' });
      fetchAppointments();
      showToast('âœ… ÄÃ£ lÆ°u sinh hiá»‡u! Bá»‡nh nhÃ¢n sáºµn sÃ ng khÃ¡m.');
    } catch (err) { alert(err.response?.data?.message || 'Lá»—i khi lÆ°u sinh hiá»‡u!'); }
  };

  const handleToggleStaff = async (id) => {
    try {
      await api.toggleStaffActive(id);
      fetchStaff();
    } catch (err) { alert(err.response?.data?.message || 'Lá»—i khi thay Ä‘á»•i tráº¡ng thÃ¡i!'); }
  };

  const handleChangeRole = async (id, newRole) => {
    if (!window.confirm(`Äá»•i vai trÃ² sang "${newRole}"?`)) return;
    try {
      await api.updateStaffRole(id, newRole);
      fetchStaff();
      showToast('âœ… ÄÃ£ cáº­p nháº­t vai trÃ²!');
    } catch (err) { alert(err.response?.data?.message || 'Lá»—i khi Ä‘á»•i quyá»n!'); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (resetPassValue.length < 3) return alert('Máº­t kháº©u quÃ¡ ngáº¯n');
    try {
      await api.resetStaffPassword(resetPassModal, resetPassValue);
      showToast('âœ… ÄÃ£ cáº¥p láº¡i máº­t kháº©u thÃ nh cÃ´ng!');
      setResetPassModal(null);
      setResetPassValue('');
    } catch (err) { alert(err.response?.data?.message || 'Lá»—i reset pass!'); }
  };

  const handleCompleteExam = async (e) => {
    e.preventDefault();
    if (!examModal) return;
    try {
      await api.completeMedicalRecord(examModal.id, { record: recordData, role, doctorName: currentStaffUser.name, deptId: currentStaffUser.deptId });
      setExamModal(null);
      setRecordData({ diagnosis: '', prescription: '', notes: '' });
      fetchAppointments();
      showToast('âœ… KhÃ¡m bá»‡nh thÃ nh cÃ´ng! Há»“ sÆ¡ Ä‘Ã£ Ä‘Æ°á»£c lÆ°u.');
    } catch { alert('Lá»—i khi lÆ°u bá»‡nh Ã¡n!'); }
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
      showToast(`âœ… ÄÃ£ chuyá»ƒn há»“ sÆ¡ cáº¥p cá»©u sang ${deptName}!`, 'emergency');
    } catch (err) { alert(err.response?.data?.message || 'Lá»—i khi chuyá»ƒn khoa!'); }
  };

  const logout = () => {
    localStorage.removeItem('staffAccessToken');
    localStorage.removeItem('staffRefreshToken');
    setCurrentStaffUser(null);
    navigate('/admin');
  };

  const roleConfig = getRoleConfig(role);

  const canMarkNoShow = (appt) => {
    if (!appt?.date || !appt?.time) return false;
    if (['COMPLETED', 'CANCELED', 'NO_SHOW'].includes(appt.status)) return false;
    const appointmentTime = new Date(`${normalizeDateValue(appt.date)}T${appt.time}:00`);
    return Date.now() >= appointmentTime.getTime() + 30 * 60 * 1000;
  };

  const getEmergencyRequestBadge = (status) => {
    const map = {
      PENDING: 'bg-red-100 text-red-700 border-red-200',
      IN_PROGRESS: 'bg-amber-100 text-amber-700 border-amber-200',
      RESOLVED: 'bg-green-100 text-green-700 border-green-200',
      CANCELED: 'bg-slate-100 text-slate-600 border-slate-200',
    };
    const text = {
      PENDING: 'Chá» tiáº¿p nháº­n',
      IN_PROGRESS: 'Äang xá»­ lÃ½',
      RESOLVED: 'ÄÃ£ hoÃ n táº¥t',
      CANCELED: 'ÄÃ£ há»§y',
    };
    return (
      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${map[status] || map.PENDING}`}>
        {text[status] || status}
      </span>
    );
  };

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
    done: visibleAppointments.filter(a => a.status === 'COMPLETED').length,
    emergency: canAccessEmergencyAlerts ? openEmergencyRequests.length : 0
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

  // Khoa cáº¥p cá»©u khÃ´ng thá»ƒ chuyá»ƒn vÃ o (Ä‘á»ƒ loáº¡i khá»i target)
  // const nonEmergencyDepts = departments.filter(d => !d.isEmergency);

  return (
    <div className="flex min-h-screen bg-[linear-gradient(180deg,#f8f9fa_0%,#eef3f6_100%)] font-body text-on-surface">

      {/* â”€â”€ SIDEBAR â”€â”€ */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-white/10 bg-[linear-gradient(180deg,#0f5778_0%,#0b4462_48%,#072c41_100%)] shadow-[0_24px_48px_rgba(4,24,36,0.24)] lg:flex">
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/16 shadow-lg backdrop-blur-sm">
            <span className="text-white font-black text-lg">+</span>
          </div>
          <div>
            <div className="font-headline text-base font-extrabold tracking-[0.18em] text-white">HOSPITAL</div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-50/90">Báº£ng Ä‘iá»u hÃ nh ná»™i bá»™</div>
          </div>
        </div>

        {/* User info */}
        <div className="border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-3 rounded-[1.75rem] border border-white/12 bg-white/10 px-4 py-4 backdrop-blur-sm">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-white/20 to-cyan-200/10 text-sm font-black text-white shadow">
              {currentStaffUser?.avatar || currentStaffUser?.name?.trim()?.charAt(0)?.toUpperCase() || 'N'}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold leading-tight text-white">{currentStaffUser?.name}</div>
              <div className="mt-1.5">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${roleConfig.bg} ${roleConfig.text}`}>
                  {roleConfig.label}
                </span>
              </div>
              {currentDept && <div className="mt-1.5 truncate text-[10px] font-semibold text-cyan-50/90">Khoa: {currentDept.name}</div>}
            </div>
          </div>
        </div>

        {/* Nav label */}
        <div className="px-6 pb-2 pt-5">
          <span className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-50/70">Äiá»u hÆ°á»›ng</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 pb-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'text-white shadow-[0_16px_32px_rgba(0,0,0,0.18)]'
                  : 'text-cyan-50/90 hover:bg-white/10 hover:text-white'
              }`}
              style={activeTab === tab.id ? {background:'linear-gradient(90deg,#0f79ac,#006592)'} : {background:'transparent'}}
            >
              {activeTab === tab.id && <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-cyan-200"/>}
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t border-white/10 p-4">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-rose-200 transition-all hover:bg-rose-400/10 hover:text-white"
          >
            <LogOut size={17} /> ÄÄƒng xuáº¥t
          </button>
        </div>
      </aside>

      {/* â”€â”€ MAIN â”€â”€ */}
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-20 border-b border-white/60 bg-white/80 px-5 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="flex items-center gap-2 font-headline text-xl font-extrabold tracking-tight text-on-surface">
                {tabs.find(t => t.id === activeTab)?.label}
                {currentDept && activeTab === 'list' && (
                  <span className="rounded-full border border-primary/10 bg-primary-container/55 px-3 py-1 text-xs font-bold text-primary">{currentDept.name}</span>
                )}
              </h1>
              <p className="mt-1 flex items-center gap-1 text-xs text-on-surface-variant">
                <span>ðŸ—“</span> {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isEmergencyDept && (
              <div className="flex items-center gap-2 rounded-2xl bg-red-600 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-red-200 animate-pulse">
                <AlertTriangle size={13}/> ðŸš¨ Khoa Cáº¥p cá»©u
              </div>
            )}
            {role === 'NURSE' && !isEmergencyDept && (
              <div className="flex items-center gap-2 rounded-2xl bg-teal-500 px-3 py-2 text-xs font-bold text-white shadow-sm">
                <Shield size={13}/> Äiá»u dÆ°á»¡ng Â· {currentDept?.name}
              </div>
            )}
            {role === 'RECEPTIONIST' && (
              <div className="flex items-center gap-2 rounded-2xl bg-indigo-500 px-3 py-2 text-xs font-bold text-white shadow-sm">
                <Shield size={13}/> Lá»… tÃ¢n
              </div>
            )}
            {role === 'BOD' && (
              <div className="flex items-center gap-2 rounded-2xl bg-amber-500 px-3 py-2 text-xs font-bold text-white shadow-sm">
                <Shield size={13}/> Ban GiÃ¡m Äá»‘c
              </div>
            )}
          </div>
        </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-primary text-on-primary shadow-md'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={logout}
              className="flex shrink-0 items-center gap-2 rounded-full bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600"
            >
              <LogOut size={16} />
              <span>ÄÄƒng xuáº¥t</span>
            </button>
          </div>
        </div>

        <div className="p-5 md:p-8">

          {/* â”€â”€ TAB: Appointments â”€â”€ */}
          {activeTab === 'list' && (
            <div className="animate-in fade-in">
              {/* Stats cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Tá»•ng lá»‹ch háº¹n', value: stats.total,     color: 'from-blue-600 to-blue-500',   icon: <Calendar size={22} className="text-white/80"/> },
                  { label: 'Äang chá» khÃ¡m', value: stats.waiting,   color: 'from-orange-500 to-amber-500', icon: <Activity size={22} className="text-white/80"/> },
                  { label: 'ÄÃ£ hoÃ n táº¥t',    value: stats.done,     color: 'from-green-600 to-teal-500',  icon: <Check size={22} className="text-white/80"/> },
                  { label: 'Cáº¥p cá»©u',        value: stats.emergency, color: 'from-red-600 to-rose-500',    icon: <AlertTriangle size={22} className="text-white/80"/> },
                ].filter((s) => canAccessEmergencyAlerts || s.label !== 'Cáº¥p cá»©u').map((s, i) => (
                  <div key={i} className={`rounded-[1.75rem] bg-gradient-to-br ${s.color} p-5 text-white shadow-[0_18px_36px_rgba(0,0,0,0.08)]`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">{s.icon}</div>
                      {s.label === 'Cáº¥p cá»©u' && s.value > 0 && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold animate-pulse">ðŸš¨ Hoáº¡t Ä‘á»™ng</span>}
                    </div>
                    <div className="text-3xl font-black">{s.value}</div>
                    <div className="text-white/70 text-xs font-semibold mt-1 uppercase tracking-wider">{s.label}</div>
                  </div>
                ))}
              </div>

              {canAccessEmergencyAlerts && openEmergencyRequests.length > 0 && (
                <div className="mb-6 overflow-hidden rounded-[2rem] border border-red-100 bg-white shadow-[0_12px_32px_rgba(0,0,0,0.05)]">
                  <div className="flex items-center justify-between border-b border-red-100 bg-red-50 px-6 py-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-red-700">
                      <Bell size={16} />
                      YÃªu cáº§u há»— trá»£ cáº¥p cá»©u Ä‘ang chá» xá»­ lÃ½
                    </div>
                    <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
                      {openEmergencyRequests.length} yÃªu cáº§u
                    </span>
                  </div>
                  <div className="divide-y divide-red-50">
                    {openEmergencyRequests.map((request) => (
                      <div key={request.id} className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="font-mono text-xs font-bold text-red-600">{request.code}</span>
                            {getEmergencyRequestBadge(request.status)}
                          </div>
                          <div className="mt-2 font-bold text-slate-800">{request.requesterName} â€¢ {request.phone}</div>
                          <div className="mt-1 text-sm text-slate-600">{request.symptoms}</div>
                          {request.location ? (
                            <div className="mt-1 text-xs text-slate-400">Vá»‹ trÃ­: {request.location}</div>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 md:justify-end">
                          {request.status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => handleEmergencyRequestStatus(request.id, 'IN_PROGRESS')}
                              className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700"
                            >
                              Tiếp nhận
                            </button>
                          )}
                          {request.status !== 'RESOLVED' && (
                            <button
                              type="button"
                              onClick={() => handleEmergencyRequestStatus(request.id, 'RESOLVED')}
                              className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                            >
                              HoÃ n táº¥t
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-surface-container-lowest shadow-[0_12px_32px_rgba(0,0,0,0.05)]">
                {/* Filter bar */}
                <div className="flex flex-col items-start justify-between gap-3 border-b border-surface-variant/30 bg-surface-container-low/70 px-6 py-5 md:flex-row md:items-center">
                  <div className="text-sm font-bold text-on-surface-variant">ðŸ“… Danh sÃ¡ch lá»‹ch khÃ¡m hÃ´m nay</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="date" className="rounded-2xl border border-surface-variant/50 bg-white px-3 py-2.5 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20" value={apptDateFilter} onChange={e=>setApptDateFilter(e.target.value)} />
                    <select className="rounded-2xl border border-surface-variant/50 bg-white px-3 py-2.5 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20" value={apptTimeFilter} onChange={e=>setApptTimeFilter(e.target.value)}>
                      <option value="">Táº¥t cáº£ giá»</option>
                      {[...new Set(visibleAppointments.map(a => a.time).filter(Boolean))].sort().map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                    {!currentDept && (
                      <select className="rounded-2xl border border-surface-variant/50 bg-white px-3 py-2.5 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20" value={apptDeptFilter} onChange={e=>setApptDeptFilter(e.target.value)}>
                        <option value="">Táº¥t cáº£ chuyÃªn khoa</option>
                        {departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    )}
                    {(apptDateFilter || apptTimeFilter || apptDeptFilter) && (
                      <button onClick={() => { setApptDateFilter(''); setApptTimeFilter(''); setApptDeptFilter(''); }} className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-100">XÃ³a bá»™ lá»c</button>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-container-low text-xs uppercase tracking-wider text-on-surface-variant">
                      <tr>
                        <th className="px-5 py-4 font-bold">MÃ£</th>
                        <th className="px-5 py-4 font-bold">Bá»‡nh nhÃ¢n</th>
                        <th className="px-5 py-4 font-bold">BÃ¡c sÄ© / Khoa</th>
                        <th className="px-5 py-4 font-bold">Thá»i gian</th>
                        <th className="px-5 py-4 font-bold">Tráº¡ng thÃ¡i</th>
                        <th className="px-5 py-4 font-bold text-right">Thao tÃ¡c</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleAppointments.map(appt => {
                        const doc = appt.doctorId ? staffList.find(s => s.id === appt.doctorId) : null;
                        const dept = appt.deptId ? departments.find(d => d.id === appt.deptId) : null;
                        return (
                          <tr
                            key={appt.id}
                            className={`transition hover:bg-sky-50/40 ${
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
                                {appt.patientDob && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">{calcAge(appt.patientDob)} tuá»•i</span>}
                                {appt.patientGender && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">{appt.patientGender}</span>}
                              </div>
                              <div className="text-xs text-slate-400">{appt.phone}</div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="font-semibold text-slate-700 text-xs">{doc?.name || '---'}</div>
                              {dept && <div className="text-[11px] text-blue-500 font-medium mt-0.5">{dept.name}</div>}
                            </td>
                            <td className="px-5 py-4">
                              <div className="font-semibold text-slate-700">{formatDateDisplay(appt.date)}</div>
                              <div className="text-xs text-blue-500 font-bold mt-0.5">{appt.time}</div>
                            </td>
                            <td className="px-5 py-4">{getStatusBadge(appt.status)}</td>
                            <td className="px-5 py-4">
                              <div className="flex items-center justify-end gap-2 flex-wrap">
                                {PERMS.canUpdateStatus(role) && (
                                  <>
                                    {appt.status === 'PENDING' && ['ADMIN', 'RECEPTIONIST'].includes(role) && (
                                      <button onClick={() => handleUpdateStatus(appt.id, 'ARRIVED')} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-blue-700 transition">Tiếp nhận</button>
                                    )}
                                    {appt.status === 'CONFIRMED' && ['ADMIN', 'RECEPTIONIST'].includes(role) && (
                                      <button onClick={() => handleUpdateStatus(appt.id, 'ARRIVED')} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-700 transition">Chuyển vào khoa</button>
                                    )}
                                    {appt.status === 'ARRIVED' && role === 'NURSE' && (
                                      <button onClick={() => { setVitalsModal(appt); setVitalsData({ bloodPressure: '', heartRate: '', temperature: '', weight: '', height: '', spO2: '', notes: '' }); }} className="text-xs bg-teal-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-teal-700 transition">Đo sinh hiệu</button>
                                    )}
                                    {appt.status === 'READY' && PERMS.canExam(role) && (
                                      <button onClick={() => setExamModal(appt)} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-green-700 transition">Khám ngay</button>
                                    )}
                                    {(appt.is_emergency || appt.status === 'EMERGENCY') && role !== 'RECEPTIONIST' && appt.status !== 'TRANSFER_PENDING' && (
                                      <button onClick={() => handleUpdateStatus(appt.id, 'ARRIVED')} className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-red-700 transition">Tiếp nhận CC</button>
                                    )}
                                    {appt.status === 'TRANSFER_PENDING' && ['ADMIN', 'DOCTOR', 'NURSE'].includes(role) && (
                                      <button onClick={() => handleUpdateStatus(appt.id, 'READY')} className="text-xs bg-orange-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-orange-700 transition animate-pulse">Tiếp nhận ca chuyá»ƒn</button>
                                    )}
                                    {role === 'DOCTOR' && appt.status !== 'CANCELED' && appt.status !== 'COMPLETED' && appt.status !== 'TRANSFER_PENDING' && appt.status !== 'NO_SHOW' && (
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
                                    {canMarkNoShow(appt) && (
                                      <button onClick={() => handleMarkNoShow(appt.id)} className="text-xs border border-rose-200 bg-rose-50 px-3 py-1.5 rounded-lg font-bold text-rose-700 hover:bg-rose-100 transition">No-show</button>
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
                          <div className="text-slate-400 font-semibold">KhÃ´ng cÃ³ lá»‹ch háº¹n nÃ o phÃ¹ há»£p</div>
                          <div className="text-slate-300 text-xs mt-1">Thá»­ thay Ä‘á»•i bá»™ lá»c hoáº·c kiá»ƒm tra láº¡i ngÃ y khÃ¡m</div>
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* â”€â”€ TAB: Patients â”€â”€ */}
          {activeTab === 'patients' && PERMS.canViewPatients(role) && (
            <div className="animate-in fade-in">
              <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-surface-container-lowest shadow-[0_12px_32px_rgba(0,0,0,0.05)]">
                <div className="flex flex-col justify-between gap-4 border-b border-surface-variant/30 px-6 py-5 md:flex-row md:items-center">
                  <span className="font-bold text-on-surface">
                    {searchTerm ? `${filteredPatients.length}/${patients.length}` : patients.length} bá»‡nh nhÃ¢n
                  </span>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full rounded-2xl border border-surface-variant/50 bg-surface-container-low py-3 pl-10 pr-4 text-base outline-none focus:ring-2 focus:ring-primary/20 md:w-72"
                      placeholder="TÃ¬m theo mÃ£ BN, tÃªn hoáº·c SÄT..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-container-low text-xs uppercase tracking-wider text-on-surface-variant">
                      <tr>
                        <th className="px-6 py-4 font-bold">MÃ£ BN</th>
                        <th className="px-6 py-4 font-bold">ThÃ´ng tin</th>
                        <th className="px-6 py-4 font-bold">CCCD</th>
                        <th className="px-6 py-4 font-bold">Tuá»•i / NgÃ y sinh</th>
                        <th className="px-6 py-4 font-bold">Giá»›i tÃ­nh</th>
                        <th className="px-6 py-4 font-bold">Bá»‡nh Ã¡n</th>
                        {PERMS.canViewMedical(role) && <th className="px-6 py-4 font-bold text-right">Chi tiáº¿t</th>}
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
                            {patient.dob && <div className="text-xs text-blue-600 font-bold mt-0.5">{calcAge(patient.dob)} tuá»•i</div>}
                          </td>
                          <td className="px-6 py-4 text-slate-600">{patient.gender || '--'}</td>
                          <td className="px-6 py-4">
                            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
                              {patient.medicalHistory?.length || 0} há»“ sÆ¡
                            </span>
                          </td>
                          {PERMS.canViewMedical(role) && (
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => { setSelectedPatient(patient); setPatientDetailModal(true); }}
                                className="text-xs bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-bold hover:bg-blue-600 hover:text-white transition"
                              >
                                Xem há»“ sÆ¡
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {filteredPatients.length === 0 && (
                        <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                          <Users size={32} className="mx-auto mb-3 opacity-30"/>
                          {patients.length === 0 ? 'ChÆ°a cÃ³ dá»¯ liá»‡u bá»‡nh nhÃ¢n.' : 'KhÃ´ng tÃ¬m tháº¥y bá»‡nh nhÃ¢n phÃ¹ há»£p.'}
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* â”€â”€ TAB: Staff â”€â”€ */}
          {activeTab === 'staff' && PERMS.canViewStaff(role) && (
            <div className="animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Add form â€” ADMIN + BOD */}
                {PERMS.canAddStaff(role) && (
                  <div className="md:col-span-1">
                    <div className="rounded-[2rem] border border-white/80 bg-surface-container-lowest p-6 shadow-[0_12px_32px_rgba(0,0,0,0.05)]">
                      <h3 className="mb-5 flex items-center gap-2 border-b border-surface-variant/30 pb-4 font-headline text-lg font-bold text-on-surface">
                        <UserPlus size={18} className="text-primary" /> ThÃªm tÃ i khoáº£n má»›i
                      </h3>
                      {role === 'BOD' && (
                        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-2">
                          <Shield size={13}/> Ban GiÃ¡m Äá»‘c cÃ³ thá»ƒ thÃªm nhÃ¢n sá»± nhÆ°ng khÃ´ng Ä‘Æ°á»£c phÃ¢n quyá»n
                        </div>
                      )}
                      <form onSubmit={handleAddStaff} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Há» vÃ  TÃªn</label>
                          <input required type="text" className="w-full rounded-2xl border border-surface-variant/50 bg-surface-container-low p-3 text-base outline-none focus:ring-2 focus:ring-primary/20" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} placeholder="VD: BS. Nguyá»…n VÄƒn A" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Chá»©c danh</label>
                          <input required type="text" className="w-full rounded-2xl border border-surface-variant/50 bg-surface-container-low p-3 text-base outline-none focus:ring-2 focus:ring-primary/20" value={newStaff.title} onChange={e => setNewStaff({...newStaff, title: e.target.value})} placeholder="VD: Tháº¡c sÄ©, BÃ¡c sÄ© CKI" />
                        </div>
                        {(newStaff.role === 'DOCTOR') && (
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Kinh nghiá»‡m</label>
                            <input type="text" className="w-full rounded-2xl border border-surface-variant/50 bg-surface-container-low p-3 text-base outline-none focus:ring-2 focus:ring-primary/20" value={newStaff.exp} onChange={e => setNewStaff({...newStaff, exp: e.target.value})} placeholder="VD: 10 nÄƒm" />
                          </div>
                        )}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Vai trÃ²</label>
                          <select className="w-full rounded-2xl border border-surface-variant/50 bg-surface-container-low p-3 text-base outline-none focus:ring-2 focus:ring-primary/20" value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value, deptId: ''})}>
                            <option value="DOCTOR">BÃ¡c sÄ©</option>
                            <option value="NURSE">Äiá»u dÆ°á»¡ng</option>
                            <option value="RECEPTIONIST">Lá»… tÃ¢n</option>
                            {role === 'ADMIN' && <option value="ADMIN">Admin IT</option>}
                          </select>
                        </div>
                        {(newStaff.role === 'DOCTOR' || newStaff.role === 'NURSE') && (
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">ChuyÃªn khoa / PhÃ²ng ban</label>
                            <select required className="w-full rounded-2xl border border-surface-variant/50 bg-surface-container-low p-3 text-base outline-none focus:ring-2 focus:ring-primary/20" value={newStaff.deptId} onChange={e => setNewStaff({...newStaff, deptId: e.target.value})}>
                              <option value="">-- Chá»n Khoa --</option>
                              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                          </div>
                        )}
                        <div className="space-y-3 rounded-[1.5rem] border border-surface-variant/30 bg-surface-container-low p-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">TÃªn Ä‘Äƒng nháº­p</label>
                            <input required type="text" className="w-full rounded-2xl border border-surface-variant/50 bg-white p-3 text-base outline-none focus:ring-2 focus:ring-primary/20" value={newStaff.username} onChange={e => setNewStaff({...newStaff, username: e.target.value})} placeholder="username" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Máº­t kháº©u</label>
                            <div className="relative">
                              <input required type={showNewPass ? 'text' : 'password'} className="w-full rounded-2xl border border-surface-variant/50 bg-white p-3 pr-10 text-base outline-none focus:ring-2 focus:ring-primary/20" value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})} placeholder="Äáº·t máº­t kháº©u riÃªng..." />
                              <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                {showNewPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                              </button>
                            </div>
                          </div>
                        </div>
                        <button type="submit" className="w-full rounded-2xl bg-gradient-to-r from-primary to-primary-dim py-3.5 text-base font-bold text-on-primary shadow-[0_12px_24px_rgba(0,101,146,0.18)] transition hover:brightness-110">
                          Táº¡o tÃ i khoáº£n
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
                        <Shield size={15}/> Ban GiÃ¡m Äá»‘c xem danh sÃ¡ch nhÃ¢n sá»± váº­n hÃ nh trong bá»‡nh viá»‡n vÃ  cÃ³ thá»ƒ vÃ´ hiá»‡u hÃ³a tÃ i khoáº£n khi cáº§n.
                      </div>
                    ) : (
                      <div className="w-full relative">
                        <input type="text" placeholder="TÃ¬m kiáº¿m theo tÃªn hoáº·c tÃ i khoáº£n..." className="w-full rounded-2xl border border-surface-variant/50 bg-surface-container-low py-3 pl-10 pr-4 text-base outline-none focus:ring-2 focus:ring-primary/20" value={staffSearchQuery} onChange={e=>setStaffSearchQuery(e.target.value)} />
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-surface-container-lowest shadow-[0_12px_32px_rgba(0,0,0,0.05)]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-surface-container-low text-xs uppercase tracking-wider text-on-surface-variant">
                          <tr>
                            {role !== 'BOD' && <th className="px-6 py-4 font-bold">TÃ i khoáº£n</th>}
                            <th className="px-6 py-4 font-bold">Há» vÃ  TÃªn</th>
                            <th className="px-6 py-4 font-bold">{role === 'BOD' ? 'Vai trÃ²' : 'Vai trÃ² / Khoa'}</th>
                            <th className="px-6 py-4 font-bold">Tráº¡ng thÃ¡i</th>
                            <th className="px-6 py-4 font-bold text-right">Thao tÃ¡c</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {visibleStaff.length === 0 ? (
                            <tr><td colSpan={role === 'BOD' ? '4' : '5'} className="text-center py-6 text-slate-400 font-semibold">KhÃ´ng tÃ¬m tháº¥y tÃ i khoáº£n nhÃ¢n sá»±.</td></tr>
                          ) : visibleStaff.map(staff => {
                            const rc = getRoleConfig(staff.role);
                            return (
                              <tr key={staff.id} className={`transition hover:bg-slate-50 ${!staff.isActive ? 'opacity-50' : ''}`}>
                                {role !== 'BOD' && (
                                  <td className="px-6 py-4">
                                    <div className="font-mono font-bold text-blue-700 text-sm">{staff.username}</div>
                                  </td>
                                )}
                                <td className="px-6 py-4">
                                  <div className="font-bold text-slate-800">{staff.name}</div>
                                  {role !== 'BOD' && <div className="text-xs text-slate-400 mt-0.5">{staff.title}</div>}
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${rc.bg} ${rc.text}`}>{rc.label}</span>
                                  {role !== 'BOD' && staff.deptId && (
                                    <div className="text-xs text-slate-400 mt-1">{departments.find(d => d.id === staff.deptId)?.name}</div>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  {staff.isActive
                                    ? <span className="flex items-center gap-1.5 text-xs text-green-700 font-bold bg-green-50 px-2.5 py-1 rounded-lg w-fit border border-green-100">â— Hoáº¡t Ä‘á»™ng</span>
                                    : <span className="flex items-center gap-1.5 text-xs text-red-600 font-bold bg-red-50 px-2.5 py-1 rounded-lg w-fit border border-red-100">â— KhÃ´ng hoáº¡t Ä‘á»™ng</span>
                                  }
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {/* Reset MK â€” CHá»ˆ ADMIN */}
                                    {role === 'ADMIN' && (
                                      <button title="Cáº¥p láº¡i máº­t kháº©u" onClick={() => setResetPassModal(staff.id)} className="px-2 py-1.5 rounded-lg text-slate-500 border border-slate-200 hover:bg-blue-50 transition hover:border-blue-200 hover:text-blue-600">
                                        <Key size={14}/>
                                      </button>
                                    )}
                                    {/* KÃ­ch hoáº¡t/VÃ´ hiá»‡u â€” ADMIN + BOD */}
                                    {PERMS.canToggleActive(role) && (
                                      <button
                                        onClick={() => handleToggleStaff(staff.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                                          staff.isActive
                                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                                            : 'border-green-200 text-green-600 hover:bg-green-50'
                                        }`}
                                      >
                                        {staff.isActive ? 'VÃ´ hiá»‡u hÃ³a' : 'KÃ­ch hoáº¡t'}
                                      </button>
                                    )}
                                    {/* PhÃ¢n quyá»n â€” CHá»ˆ ADMIN */}
                                    {PERMS.canChangeRole(role) && (
                                      <select
                                        value={staff.role}
                                        onChange={e => handleChangeRole(staff.id, e.target.value)}
                                        className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-400 outline-none"
                                      >
                                        <option value="DOCTOR">BÃ¡c sÄ©</option>
                                        <option value="NURSE">Äiá»u dÆ°á»¡ng</option>
                                        <option value="RECEPTIONIST">Lá»… tÃ¢n</option>
                                        <option value="ADMIN">Admin IT</option>
                                        <option value="BOD">Ban GiÃ¡m Äá»‘c</option>
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

          {/* â”€â”€ TAB: Logs â”€â”€ */}
          {activeTab === 'logs' && PERMS.canViewLogs(role) && (
            <div className="animate-in fade-in">
              <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-surface-container-lowest shadow-[0_12px_32px_rgba(0,0,0,0.05)]">
                <div className="border-b border-surface-variant/30 px-6 py-5">
                  <span className="font-bold text-on-surface">{logsList.length} báº£n ghi</span>
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container-low text-xs uppercase tracking-wider text-on-surface-variant">
                    <tr>
                      <th className="px-6 py-4 font-bold w-1/4">Thá»i gian</th>
                      <th className="px-6 py-4 font-bold">HÃ nh Ä‘á»™ng</th>
                      <th className="px-6 py-4 font-bold w-1/5">Thá»±c hiá»‡n bá»Ÿi</th>
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
                        ChÆ°a cÃ³ báº£n ghi hoáº¡t Ä‘á»™ng.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* â”€â”€ VITALS MODAL (Äiá»u dÆ°á»¡ng Ä‘o sinh hiá»‡u) â”€â”€ */}
      {vitalsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-teal-700 to-teal-600 text-white flex justify-between items-center shrink-0">
              <h2 className="text-lg font-black flex items-center gap-2">ðŸ©º Đo sinh hiệu Bá»‡nh NhÃ¢n</h2>
              <button onClick={() => setVitalsModal(null)} className="text-white/70 hover:text-white font-bold text-2xl leading-none">&times;</button>
            </div>
            <div className="px-6 py-3 bg-teal-50 border-b border-teal-100 text-sm shrink-0">
              <div className="font-bold text-teal-800">ðŸ‘¤ {vitalsModal.patientName}</div>
              <div className="text-teal-600 text-xs mt-0.5">MÃ£: {vitalsModal.code} â€” {vitalsModal.phone}</div>
            </div>
            <form onSubmit={handleSaveVitals} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Huyáº¿t Ã¡p (mmHg)</label>
                  <input type="text" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    value={vitalsData.bloodPressure} onChange={e => setVitalsData({...vitalsData, bloodPressure: e.target.value})} placeholder="VD: 120/80" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Nhá»‹p tim (láº§n/phÃºt)</label>
                  <input type="number" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    value={vitalsData.heartRate} onChange={e => setVitalsData({...vitalsData, heartRate: e.target.value})} placeholder="VD: 72" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Nhiá»‡t Ä‘á»™ (Â°C)</label>
                  <input type="number" step="0.1" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    value={vitalsData.temperature} onChange={e => setVitalsData({...vitalsData, temperature: e.target.value})} placeholder="VD: 37.0" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">SpO2 (%)</label>
                  <input type="number" step="0.1" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    value={vitalsData.spO2} onChange={e => setVitalsData({...vitalsData, spO2: e.target.value})} placeholder="VD: 98.5" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">CÃ¢n náº·ng (kg)</label>
                  <input type="number" step="0.1" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    value={vitalsData.weight} onChange={e => setVitalsData({...vitalsData, weight: e.target.value})} placeholder="VD: 65.0" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Chiá»u cao (cm)</label>
                  <input type="number" step="0.1" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    value={vitalsData.height} onChange={e => setVitalsData({...vitalsData, height: e.target.value})} placeholder="VD: 170" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Ghi chÃº thÃªm</label>
                <textarea rows="2" className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  value={vitalsData.notes} onChange={e => setVitalsData({...vitalsData, notes: e.target.value})} placeholder="Ghi chÃº thÃªm cho bÃ¡c sÄ©..."></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setVitalsModal(null)} className="px-5 py-2.5 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition text-sm">Hủy bá»</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl font-bold bg-teal-600 text-white hover:bg-teal-700 transition flex items-center gap-2 text-sm">
                  <Check size={16}/> LÆ°u & Chuyá»ƒn BÃ¡c sÄ©
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* â”€â”€ EXAM MODAL â”€â”€ */}
      {examModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-green-700 to-green-600 text-white flex justify-between items-center shrink-0">
              <h2 className="text-lg font-black flex items-center gap-2"><Stethoscope size={22}/> KhÃ¡m & KÃª ÄÆ¡n</h2>
              <button onClick={() => setExamModal(null)} className="text-white/70 hover:text-white font-bold text-2xl leading-none">&times;</button>
            </div>
            <div className="grid grid-cols-3 gap-0 bg-slate-50 border-b text-sm px-6 py-3">
              <div><span className="text-slate-400 text-xs block">MÃ£ lá»‹ch</span><b className="text-blue-600">{examModal.code}</b></div>
              <div><span className="text-slate-400 text-xs block">Bá»‡nh nhÃ¢n</span><b>{examModal.patientName}</b></div>
              <div><span className="text-slate-400 text-xs block">Äiá»‡n thoáº¡i</span><b>{examModal.phone}</b></div>
            </div>
            {(() => {
              const matchedPatient = patients.find(p => p.phone === examModal.phone || p.id === examModal.patientId);
              const history = matchedPatient?.medicalHistory || [];
              if (history.length > 0) {
                return (
                  <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex flex-col gap-2 max-h-40 overflow-y-auto shrink-0">
                    <div className="font-bold text-xs text-amber-800 uppercase flex items-center gap-1.5">Há»“ sÆ¡ bá»‡nh Ã¡n cÅ© ({history.length})</div>
                    {history.map((h, i) => (
                      <div key={i} className="bg-white p-2.5 text-xs rounded-xl border border-amber-200/60 shadow-sm leading-relaxed">
                        <div className="font-bold text-slate-700 mb-1">{h.date} - {h.doctor}:</div>
                        <div><span className="font-semibold">CÄ:</span> <span className="text-slate-600">{h.diagnosis}</span></div>
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
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Cháº©n Ä‘oÃ¡n bá»‡nh <span className="text-red-500">*</span></label>
                <input required type="text" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  value={recordData.diagnosis} onChange={e => setRecordData({...recordData, diagnosis: e.target.value})} placeholder="VD: ViÃªm pháº¿ quáº£n cáº¥p..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">ÄÆ¡n thuá»‘c (KÃª toa) <span className="text-red-500">*</span></label>
                <textarea required rows="4" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 resize-none text-sm"
                  value={recordData.prescription} onChange={e => setRecordData({...recordData, prescription: e.target.value})} placeholder="- Thuá»‘c A: NgÃ y 2 viÃªn...&#10;- Thuá»‘c B: Uá»‘ng sau Äƒn..."></textarea>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Lá»i dáº·n dÃ² / TÃ¡i khÃ¡m</label>
                <textarea rows="2" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 resize-none text-sm"
                  value={recordData.notes} onChange={e => setRecordData({...recordData, notes: e.target.value})} placeholder="Háº¹n tÃ¡i khÃ¡m sau X ngÃ y. Ä‚n uá»‘ng, nghá»‰ ngÆ¡i..."></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setExamModal(null)} className="px-5 py-2.5 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition text-sm">Hủy bá»</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl font-bold bg-green-600 text-white hover:bg-green-700 transition flex items-center gap-2 text-sm">
                  <Check size={16}/> LÆ°u & ÄÃ³ng ca khÃ¡m
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* â”€â”€ TRANSFER MODAL (Cáº¥p cá»©u chuyá»ƒn khoa) â”€â”€ */}
      {transferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-red-700 to-orange-600 text-white flex justify-between items-center">
              <h2 className="text-lg font-black flex items-center gap-2">
                <ArrowRightLeft size={22}/> LuÃ¢n Chuyá»ƒn Bá»‡nh NhÃ¢n
              </h2>
              <button onClick={() => setTransferModal(null)} className="text-white/70 hover:text-white font-bold text-2xl leading-none">&times;</button>
            </div>
            <div className="px-6 py-4 bg-red-50 border-b border-red-100 text-sm shrink-0">
              <div className="font-bold text-red-800">ðŸš¨ Bá»‡nh nhÃ¢n: {transferModal.patientName}</div>
              <div className="text-red-600 text-xs mt-1">MÃ£ há»“ sÆ¡: {transferModal.code} â€” {transferModal.phone}</div>
            </div>

            {(() => {
              const transfers = (transferModal.history || []).filter(h => h.action.startsWith('Chuyển khoa'));
              if (transfers.length > 0) {
                return (
                  <div className="px-6 py-3 bg-white border-b border-slate-100 flex flex-col gap-2 max-h-32 overflow-y-auto shrink-0">
                    <div className="font-bold text-xs text-slate-800 uppercase">Lá»‹ch sá»­ luÃ¢n chuyá»ƒn</div>
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
                âš ï¸ Sau khi chuyá»ƒn, há»“ sÆ¡ sáº½ Ä‘Æ°á»£c Æ°u tiÃªn lÃªn Ä‘áº§u danh sÃ¡ch chá» cá»§a khoa tiáº¿p nháº­n vÃ  bÃ¡c sÄ© sáº½ Ä‘Æ°á»£c thÃ´ng bÃ¡o realtime.
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Khoa tiáº¿p nháº­n <span className="text-red-500">*</span></label>
                <select
                  required
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                  value={transferTargetDept}
                  onChange={e => setTransferTargetDept(e.target.value)}
                >
                  <option value="">-- Chá»n khoa tiáº¿p nháº­n --</option>
                  {departments
                    .filter(d => d.id !== transferModal.deptId && d.id !== transferModal.current_department)
                    .map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">LÃ½ do chuyá»ƒn khoa <span className="text-red-500">*</span></label>
                <textarea
                  required
                  rows="3"
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  value={transferReason}
                  onChange={e => setTransferReason(e.target.value)}
                  placeholder="VD: Bá»‡nh nhÃ¢n nhá»“i mÃ¡u cÆ¡ tim cáº¥p, cáº§n can thiá»‡p tim máº¡ch kháº©n..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setTransferModal(null)} className="px-5 py-2.5 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition text-sm">
                  Hủy
                </button>
                <button type="submit" className="px-5 py-2.5 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition flex items-center gap-2 text-sm shadow">
                  <ArrowRightLeft size={16}/> XÃ¡c nháº­n chuyá»ƒn khoa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* â”€â”€ PATIENT DETAIL MODAL â”€â”€ */}
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
                  ['Sá»‘ Ä‘iá»‡n thoáº¡i', selectedPatient.phone],
                  ['CCCD', selectedPatient.cccd || '---'],
                  ['NgÃ y sinh', selectedPatient.dob ? `${formatDateDisplay(selectedPatient.dob)} (${calcAge(selectedPatient.dob)} tuá»•i)` : '---'],
                  ['Giá»›i tÃ­nh', selectedPatient.gender || '---'],
                ].map(([label, val]) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-4">
                    <span className="text-slate-400 text-xs block mb-1 font-semibold">{label}</span>
                    <b className="text-slate-800 text-sm">{val}</b>
                  </div>
                ))}
              </div>
              <h3 className="font-black text-base text-slate-800 mb-4">Lá»‹ch sá»­ bá»‡nh Ã¡n</h3>
              <div className="space-y-4">
                {(selectedPatient.medicalHistory || []).map((h, i) => (
                  <div key={i} className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-start mb-3">
                      <div className="text-sm font-black text-blue-600">{formatDateDisplay(h.date)}</div>
                      <div className="text-xs text-slate-400 font-medium">{h.doctor}</div>
                    </div>
                    <div className="font-bold text-slate-800 mb-3 text-base">{h.diagnosis}</div>
                    {h.prescription && (
                      <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-sm">
                        <div className="font-bold text-orange-800 mb-2 text-xs uppercase tracking-wider">ðŸ’Š Toa thuá»‘c</div>
                        <div className="text-orange-900 whitespace-pre-line leading-relaxed">{h.prescription}</div>
                      </div>
                    )}
                    {h.notes && <div className="text-xs text-slate-500 mt-3 italic">{h.notes}</div>}
                  </div>
                ))}
                {(!selectedPatient.medicalHistory || selectedPatient.medicalHistory.length === 0) && (
                  <div className="text-center py-8 text-slate-400 italic">ChÆ°a cÃ³ dá»¯ liá»‡u bá»‡nh Ã¡n.</div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-slate-50 text-right shrink-0">
              <button onClick={() => setPatientDetailModal(false)} className="px-6 py-2.5 rounded-xl font-bold bg-slate-800 text-white hover:bg-slate-900 transition text-sm">ÄÃ³ng</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Reset Máº­t Kháº©u Staff Modal */}
      {resetPassModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <form onSubmit={handleResetPassword} className="w-full max-w-sm animate-in zoom-in-95 rounded-[2rem] border border-white/80 bg-surface-container-lowest p-6 shadow-[0_24px_48px_rgba(0,0,0,0.16)]">
            <h3 className="mb-2 flex items-center gap-2 border-b border-surface-variant/30 pb-4 font-headline text-xl font-bold text-on-surface">
              <Key size={18} className="text-primary"/> Cáº¥p láº¡i máº­t kháº©u
            </h3>
            <div className="mb-6 mt-4">
               <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">Máº­t kháº©u cáº¥p má»›i</label>
               <input required type="text" className="w-full rounded-2xl border border-surface-variant/50 bg-surface-container-low p-3 text-base outline-none focus:ring-2 focus:ring-primary/20" value={resetPassValue} onChange={e=>setResetPassValue(e.target.value)} placeholder="Nháº­p máº­t kháº©u má»›i..." />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setResetPassModal(null); setResetPassValue(''); }} className="flex-1 rounded-2xl bg-slate-100 py-3 text-base font-bold text-slate-600 transition hover:bg-slate-200">Hủy bá»</button>
              <button type="submit" className="flex-1 rounded-2xl bg-gradient-to-r from-primary to-primary-dim py-3 text-base font-bold text-on-primary transition hover:brightness-110">LÆ°u cáº­p nháº­t</button>
            </div>
          </form>
        </div>
      )}

      {/* â”€â”€ TOAST (To hÆ¡n, cÃ³ loáº¡i emergency) â”€â”€ */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-start gap-4 rounded-[1.75rem] px-5 py-4 shadow-2xl animate-in slide-in-from-bottom-4 sm:bottom-6 sm:right-6 sm:max-w-md ${
          toastType === 'emergency'
            ? 'bg-red-700 text-white'
            : 'bg-slate-900 text-white'
        }`}>
          <div className={`w-3 h-3 rounded-full shrink-0 animate-pulse ${toastType === 'emergency' ? 'bg-yellow-300' : 'bg-green-400'}`}></div>
          <span className="min-w-0 break-words text-sm font-bold leading-6 sm:text-base">{toast}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-white/60 hover:text-white transition shrink-0">
            <X size={16}/>
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

