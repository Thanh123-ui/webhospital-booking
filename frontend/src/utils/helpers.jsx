import React from 'react';

export const calculateAge = (dob) => {
  if (!dob) return '---';
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

export const getStatusBadge = (status) => {
  const badges = {
    EMERGENCY: { color: 'bg-red-600 text-white border-red-700 animate-pulse', text: '🚨 CẤP CỨU' },
    PENDING: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', text: 'Chờ xác nhận' },
    CONFIRMED: { color: 'bg-blue-100 text-blue-800 border-blue-200', text: 'Đã xác nhận' },
    ARRIVED: { color: 'bg-indigo-100 text-indigo-800 border-indigo-200', text: 'Đã tiếp nhận' },
    READY: { color: 'bg-teal-100 text-teal-800 border-teal-200', text: 'Chờ khám' },
    COMPLETED: { color: 'bg-green-100 text-green-800 border-green-200', text: 'Hoàn thành' },
    CANCELED: { color: 'bg-gray-100 text-gray-800 border-gray-200', text: 'Đã hủy' },
  };
  const b = badges[status] || badges.PENDING;
  return <span className={`px-2 py-1 text-xs font-bold rounded border ${b.color}`}>{b.text}</span>;
};

export const getRoleConfig = (role) => {
  switch(role) {
    case 'BOD': return { label: 'Ban Giám Đốc', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' };
    case 'ADMIN': return { label: 'IT Admin', bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' };
    case 'DOCTOR': return { label: 'Bác sĩ', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' };
    case 'NURSE': return { label: 'Điều dưỡng', bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' };
    case 'RECEPTIONIST': return { label: 'Lễ tân', bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200' };
    default: return { label: role, bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' };
  }
};
