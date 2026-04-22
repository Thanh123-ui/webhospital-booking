import React from 'react';

export const normalizeDateValue = (dateValue) => {
  if (!dateValue) return '';

  const raw = String(dateValue).trim();
  if (!raw) return '';

  const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDateDisplay = (
  dateValue,
  options = { day: '2-digit', month: '2-digit', year: 'numeric' }
) => {
  const normalizedDate = normalizeDateValue(dateValue);
  if (!normalizedDate) return '---';

  const [year, month, day] = normalizedDate.split('-').map(Number);
  if ([year, month, day].some(Number.isNaN)) return normalizedDate;

  return new Intl.DateTimeFormat('vi-VN', options).format(
    new Date(year, month - 1, day, 12)
  );
};

export const calculateAge = (dob) => {
  const normalizedDob = normalizeDateValue(dob);
  if (!normalizedDob) return '---';

  const birthDate = new Date(normalizedDob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

export const getStatusBadge = (status) => {
  const badges = {
    EMERGENCY: { color: 'bg-red-600 text-white border-red-700 animate-pulse', text: 'C\u1ea5p c\u1ee9u' },
    EMERGENCY_TRANSFER: { color: 'bg-orange-500 text-white border-orange-600 animate-pulse', text: 'Chuy\u1ec3n khoa' },
    PENDING: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', text: 'Ch\u1edd l\u1ec5 t\u00e2n ti\u1ebfp nh\u1eadn' },
    CONFIRMED: { color: 'bg-blue-100 text-blue-800 border-blue-200', text: '\u0110\u00e3 x\u00e1c nh\u1eadn l\u1ecbch' },
    ARRIVED: { color: 'bg-indigo-100 text-indigo-800 border-indigo-200', text: '\u0110\u00e3 v\u00e0o khoa ch\u1edd \u0111i\u1ec1u d\u01b0\u1ee1ng' },
    READY: { color: 'bg-teal-100 text-teal-800 border-teal-200', text: 'S\u1eb5n s\u00e0ng cho b\u00e1c s\u0129 kh\u00e1m' },
    COMPLETED: { color: 'bg-green-100 text-green-800 border-green-200', text: 'Ho\u00e0n th\u00e0nh' },
    NO_SHOW: { color: 'bg-rose-100 text-rose-800 border-rose-200', text: 'V\u1eafng m\u1eb7t' },
    CANCELED: { color: 'bg-gray-100 text-gray-600 border-gray-200', text: '\u0110\u00e3 h\u1ee7y' },
  };

  const b = badges[status] || badges.PENDING;
  return <span className={`px-2.5 py-1 text-xs font-bold rounded-md border ${b.color}`}>{b.text}</span>;
};

export const getRoleConfig = (role) => {
  switch (role) {
    case 'BOD':
      return { label: 'Ban Gi\u00e1m \u0110\u1ed1c', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' };
    case 'ADMIN':
      return { label: 'IT Admin', bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' };
    case 'DOCTOR':
      return { label: 'B\u00e1c s\u0129', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' };
    case 'NURSE':
      return { label: '\u0110i\u1ec1u d\u01b0\u1ee1ng', bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' };
    case 'RECEPTIONIST':
      return { label: 'L\u1ec5 t\u00e2n', bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200' };
    default:
      return { label: role, bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' };
  }
};
