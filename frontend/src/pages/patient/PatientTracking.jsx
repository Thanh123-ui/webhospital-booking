import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { api } from '../../services/api';
import { getStatusBadge } from '../../utils/helpers';

const PatientTracking = () => {
  const [searchCode, setSearchCode] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    api.getAllAppointments().then(res => setAppointments(res.data)).catch(console.error);
    api.getDoctors().then(res => setDoctors(res.data)).catch(console.error);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const appt = appointments.find(a => a.code === searchCode.trim().toUpperCase() && a.phone === searchPhone.trim());
    if (appt) { setResult(appt); setError(''); } else { setResult(null); setError('Không tìm thấy lịch hẹn phù hợp.'); }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h2 className="text-2xl font-bold mb-6 text-slate-800 text-center">Tra cứu lịch hẹn</h2>
      <form onSubmit={handleSearch} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 mb-8">
        <input required type="text" placeholder="Mã lịch hẹn (VD: BK-1001)" className="flex-1 p-3 border rounded-lg outline-none focus:ring-2" value={searchCode} onChange={e => setSearchCode(e.target.value)} />
        <input required type="tel" placeholder="Số điện thoại" className="flex-1 p-3 border rounded-lg outline-none focus:ring-2" value={searchPhone} onChange={e => setSearchPhone(e.target.value)} />
        <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-blue-700"><Search size={18}/> Tra cứu</button>
      </form>
      {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg text-center">{error}</div>}
      
      {result && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in">
          <div className="bg-slate-50 p-4 border-b flex justify-between items-center">
            <div><span className="text-slate-500 text-sm">Mã lịch:</span><span className="font-bold text-lg ml-2">{result.code}</span></div>
            {getStatusBadge(result.status)}
          </div>
          <div className="p-6 grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-500 block">Bệnh nhân:</span><span className="font-semibold text-base">{result.patientName}</span></div>
            <div><span className="text-slate-500 block">Bác sĩ:</span><span className="font-semibold text-base">{doctors.find(d=>d.id===result.doctorId)?.name || 'Cấp cứu'}</span></div>
            <div><span className="text-slate-500 block">Ngày khám:</span><span className="font-semibold text-base">{result.date}</span></div>
            <div><span className="text-slate-500 block">Giờ khám:</span><span className="font-semibold text-base text-blue-600">{result.time}</span></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientTracking;