import React from 'react';
import { HOSPITAL_STATS } from '../../utils/constants';
import { Award, Stethoscope, Users, Star } from 'lucide-react';

const ICONS = { Award, Stethoscope, Users, Star };

/**
 * HospitalStatsGrid — Stats card 2×2 dùng chung cho trang chủ & cổng đăng nhập.
 * Props:
 *   className  — thêm class tuỳ chỉnh cho wrapper ngoài cùng (tuỳ chọn)
 */
const HospitalStatsGrid = ({ className = '' }) => (
  <div className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 grid grid-cols-2 gap-4 ${className}`}>
    {HOSPITAL_STATS.map((s, i) => {
      const Icon = ICONS[s.icon];
      return (
        <div key={i} className="bg-white/10 rounded-2xl p-4 text-center hover:bg-white/20 transition cursor-default">
          <div className="flex justify-center mb-2">
            {Icon && <Icon size={22} className={s.iconClass} />}
          </div>
          <div className="text-2xl font-black text-white">{s.num}</div>
          <div className="text-[11px] text-blue-200 font-medium mt-1 leading-tight">{s.label}</div>
        </div>
      );
    })}
  </div>
);

export default HospitalStatsGrid;
