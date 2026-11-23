import React from 'react';

// Selector de semana: las 4 más recientes como botones y el resto en "Anteriores".
// weeks: [{ value, numero, desde, hasta }] (cualquier orden); value: el valor seleccionado.
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const day = (iso) => {
  if (!iso) return '';
  const [, m, d] = iso.split('-').map(Number);
  return { d, m: MONTHS[m - 1] };
};
export const weekRange = (desde, hasta) => {
  const a = day(desde);
  const b = day(hasta);
  if (!a) return '';
  if (!b) return `${a.d} ${a.m}`;
  return a.m === b.m ? `${a.d}–${b.d} ${b.m}` : `${a.d} ${a.m}–${b.d} ${b.m}`;
};

const TONES = {
  light: {
    chip: 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300',
    active: 'border border-primary bg-primary text-white',
    sub: 'text-slate-400',
    subActive: 'text-white/80',
    select: 'border-slate-200 bg-white text-slate-700',
    selectActive: 'border-primary bg-primary/10 text-primary'
  },
  dark: {
    chip: 'border border-white/15 bg-white/5 text-white hover:bg-white/10',
    active: 'border border-white bg-white text-slate-900',
    sub: 'text-white/60',
    subActive: 'text-slate-500',
    select: 'border-white/15 bg-white/5 text-white',
    selectActive: 'border-white bg-white text-slate-900'
  }
};

export default function WeekPicker({ weeks = [], value, onChange, tone = 'light', compact = false, label = 'Semana' }) {
  const t = TONES[tone];
  const sorted = [...weeks].sort((a, b) => Number(b.numero) - Number(a.numero));
  const recent = sorted.slice(0, 4);
  const older = sorted.slice(4);
  const selectedOlder = older.find(w => String(w.value) === String(value));

  return (
    <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label={label}>
      {recent.map((w) => {
        const active = String(w.value) === String(value);
        return (
          <button
            key={w.value}
            type="button"
            onClick={() => onChange(w.value)}
            aria-pressed={active}
            title={`Semana ${w.numero}: ${weekRange(w.desde, w.hasta)}`}
            className={`rounded-lg text-left leading-tight transition-colors ${compact ? 'px-2 py-1' : 'px-2.5 py-1.5'} ${active ? t.active : t.chip}`}
          >
            <span className="block text-xs font-bold">S{w.numero}</span>
            {!compact && <span className={`block text-[10px] ${active ? t.subActive : t.sub}`}>{weekRange(w.desde, w.hasta)}</span>}
          </button>
        );
      })}
      {older.length > 0 && (
        <select
          value={selectedOlder ? String(selectedOlder.value) : ''}
          onChange={(e) => {
            const w = older.find(x => String(x.value) === e.target.value);
            if (w) onChange(w.value);
          }}
          aria-label="Semanas anteriores"
          className={`rounded-lg text-xs font-semibold py-1.5 pl-2 pr-7 ${selectedOlder ? t.selectActive : t.select}`}
        >
          <option value="" disabled>Anteriores…</option>
          {older.map(w => (
            <option key={w.value} value={String(w.value)} className="text-slate-900">
              Semana {w.numero} ({weekRange(w.desde, w.hasta)})
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
