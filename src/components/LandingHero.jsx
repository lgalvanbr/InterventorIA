import React, { useEffect, useMemo, useState } from 'react';
import { Layers, MapPin, FileText } from 'lucide-react';
import { frenteReportDays } from '../data/reportCoverage';
import { useProject } from '../context/ProjectContext';
import WeekPicker from './WeekPicker';

// Encabezado del tablero: los frentes dibujados como tramos (CIV) de vía.
// Altura y color de cada barra = avance físico (con su %); marca amarilla = sin reporte en la semana.

// Escala de avance (también se usa en la leyenda)
export const PROGRESS_BANDS = [
  { min: 75, color: '#2fa36b', label: '75 % o más' },
  { min: 50, color: '#8cc46a', label: '50–74 %' },
  { min: 25, color: '#f0a33a', label: '25–49 %' },
  { min: 0, color: '#e5675b', label: 'Menos de 25 %' }
];
export const progressColor = (p) => (PROGRESS_BANDS.find(b => p >= b.min) || PROGRESS_BANDS[3]).color;

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const shortDate = (iso) => {
  if (!iso) return '';
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
};

function Lane({ title, frentes, reportedIds, grown }) {
  return (
    <div className="landing-lane">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="landing-lane-title">{title}</h3>
        <span className="text-xs text-slate-400">
          {frentes.filter(f => reportedIds.has(f.id)).length} de {frentes.length} con reporte
        </span>
      </div>
      <div className="landing-bars" role="list">
        {frentes.map(f => {
          const progress = Math.max(0, Math.min(100, Number(f.progress) || 0));
          const reported = reportedIds.has(f.id);
          return (
            <div
              key={f.id}
              role="listitem"
              className="landing-bar"
              title={`Frente ${f.frente || ''} · CIV ${f.civ || 'N/A'} · ${f.eje || f.name || ''}\nAvance ${progress}%${reported ? '' : ' · sin reporte esta semana'}`}
              aria-label={`Frente ${f.frente}, avance ${progress} por ciento${reported ? '' : ', sin reporte esta semana'}`}
            >
              <span className="landing-bar-track">
                <span
                  className="landing-bar-fill"
                  style={{ height: grown ? `${Math.max(progress, 3)}%` : '0%', background: progressColor(progress) }}
                />
                <span
                  className={`landing-bar-label ${progress >= 82 ? 'is-inside' : ''}`}
                  style={{ bottom: progress >= 82 ? 'auto' : `calc(${Math.max(progress, 3)}% + 3px)` }}
                >
                  {Math.round(progress)}
                </span>
              </span>
              <span className={`landing-bar-mark ${reported ? '' : 'is-missing'}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LandingHero({
  frentes = [],
  weekReport,
  avgProgress,
  isContractorMode,
  viewMode,
  onViewModeChange,
  onCopyMonth,
  weeks = [],
  selectedWeek,
  onWeekChange
}) {
  const project = useProject();
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Frentes con algún reporte (foto o nota) en la semana mostrada
  const reportedIds = useMemo(() => {
    const ids = new Set();
    (weekReport?.frentes || []).forEach(f => {
      if (frenteReportDays(f).size > 0) ids.add(f.id);
    });
    return ids;
  }, [weekReport]);

  // Un carril por contrato del proyecto
  const lanes = (project?.contratos || []).map(c => ({
    key: c.id,
    title: c.nombreCorto || c.nombre,
    frentes: frentes.filter(f => String(f.id).startsWith(`${c.prefijo}_`))
  })).filter(l => l.frentes.length > 0);
  const contratante = project?.contratante ? `, contratos ${project.contratante}` : '';
  const reportedCount = frentes.filter(f => reportedIds.has(f.id)).length;

  return (
    <section className="landing-hero no-print" aria-labelledby="landing-title">
      <div className="landing-hero-head">
        <div className="max-w-xl">
          <p className="text-sm text-slate-300">
            {isContractorMode ? `Portal del contratista, ${project?.marca?.nombre}` : project?.marca?.nombre}
          </p>
          <h1 id="landing-title" className="landing-title">{project?.nombre}</h1>
          <p className="text-sm sm:text-base text-slate-300 mt-2 leading-relaxed">
            {lanes.map(l => l.title).join(' y ')}{contratante}.
            {weekReport && ` Semana ${weekReport.numero_semana}, del ${shortDate(weekReport.fecha_inicial_corte)} al ${shortDate(weekReport.fecha_final_corte)}.`}
          </p>
        </div>

        <dl className="landing-figures">
          <div>
            <dt>avance físico promedio</dt>
            <dd style={{ color: progressColor(avgProgress) }}>{avgProgress}<span>%</span></dd>
          </div>
          <div>
            <dt>frentes con reporte esta semana</dt>
            <dd>{reportedCount}<span>/{frentes.length}</span></dd>
          </div>
        </dl>
      </div>

      {weeks.length > 0 && onWeekChange && (
        <div className="mt-6">
          <WeekPicker tone="dark" weeks={weeks} value={selectedWeek} onChange={onWeekChange} />
        </div>
      )}

      <div className="landing-lanes">
        {lanes.map(l => (
          <Lane key={l.key} title={l.title} frentes={l.frentes} reportedIds={reportedIds} grown={grown} />
        ))}
      </div>

      <div className="landing-hero-foot">
        <p className="landing-legend">
          Cada barra es un tramo (CIV) con su % de avance físico:
          {[...PROGRESS_BANDS].reverse().map(b => (
            <span key={b.min} className="legend-band"><span className="legend-swatch" style={{ background: b.color }} aria-hidden="true" />{b.label}</span>
          ))}
          <span className="legend-band"><span className="legend-mark" aria-hidden="true" />Sin reporte en la semana</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <div className="landing-toggle" role="group" aria-label="Vista de frentes">
            <button type="button" aria-pressed={viewMode === 'grid'} onClick={() => onViewModeChange('grid')}>
              <Layers size={15} /> Tarjetas
            </button>
            <button type="button" aria-pressed={viewMode === 'map'} onClick={() => onViewModeChange('map')}>
              <MapPin size={15} /> Mapa
            </button>
          </div>
          <button type="button" className="landing-secondary" onClick={onCopyMonth}>
            <FileText size={15} /> Copiar datos del mes
          </button>
        </div>
      </div>
    </section>
  );
}
