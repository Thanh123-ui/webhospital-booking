export const normalizeDateValue = (dateValue?: string | null) => {
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
  dateValue?: string | null,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' },
) => {
  const normalizedDate = normalizeDateValue(dateValue);
  if (!normalizedDate) return '---';

  const [year, month, day] = normalizedDate.split('-').map(Number);
  if ([year, month, day].some(Number.isNaN)) return normalizedDate;

  return new Intl.DateTimeFormat('vi-VN', options).format(
    new Date(year, month - 1, day, 12),
  );
};

export const toLocalDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDoctorInitials = (name = '') =>
  name
    .replace(/^BS\.\s*/i, '')
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

export const canCancelAppointment = (date?: string, time?: string) => {
  if (!date || !time) return false;
  const appointmentDT = new Date(`${normalizeDateValue(date)}T${time}:00`);
  const diffHours = (appointmentDT.getTime() - Date.now()) / (1000 * 60 * 60);
  return diffHours >= 24;
};
