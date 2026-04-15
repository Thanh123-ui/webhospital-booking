import React from 'react';
import { Ambulance } from 'lucide-react';
import { HOSPITAL_HOTLINE } from '../../utils/constants';

/**
 * EmergencyCard — Thẻ cấp cứu màu đỏ dùng chung cho trang chủ & cổng đăng nhập.
 * Props:
 *   className  — thêm class tuỳ chỉnh (tuỳ chọn)
 */
const EmergencyCard = ({ className = '' }) => (
  <div className={`mt-4 bg-red-600/90 backdrop-blur-sm border border-red-400/30 rounded-2xl p-4 flex items-center gap-4 text-white ${className}`}>
    <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shrink-0">
      <Ambulance size={24} />
    </div>
    <div>
      <div className="font-black text-sm">Cấp cứu 24/7</div>
      <div className="text-red-200 text-xs mt-0.5">Đội cấp cứu luôn sẵn sàng</div>
      <div className="text-xl font-black mt-1">{HOSPITAL_HOTLINE}</div>
    </div>
  </div>
);

export default EmergencyCard;
