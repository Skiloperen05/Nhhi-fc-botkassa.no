import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { monthAtOffset } from '../services/dateService';

export const MonthNavigator: React.FC<{
  offset: number;
  onChange: (offset: number) => void;
}> = ({ offset, onChange }) => {
  const date = monthAtOffset(offset);
  const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl p-1.5">
      <button type="button" aria-label="Forrige måned" onClick={() => onChange(offset - 1)} className="p-2 rounded-lg text-slate-600 hover:bg-blue-50 hover:text-blue-600">
        <ChevronLeft size={16} />
      </button>
      <input
        type="month"
        aria-label="Velg måned"
        value={value}
        onChange={event => {
          if (!/^\d{4}-\d{2}$/.test(event.target.value)) return;
          const [year, month] = event.target.value.split('-').map(Number);
          const now = new Date();
          onChange((year - now.getFullYear()) * 12 + month - 1 - now.getMonth());
        }}
        className="min-w-0 w-44 bg-transparent text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 rounded px-1 py-1"
      />
      <button type="button" aria-label="Neste måned" onClick={() => onChange(offset + 1)} className="p-2 rounded-lg text-slate-600 hover:bg-blue-50 hover:text-blue-600">
        <ChevronRight size={16} />
      </button>
    </div>
  );
};
