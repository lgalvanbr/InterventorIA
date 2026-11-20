import React, { useEffect, useMemo, useState } from 'react';
import { Layers, MapPin, FileText } from 'lucide-react';
import { frenteReportDays } from '../data/reportCoverage';

// Encabezado del tablero: los frentes dibujados como tramos (CIV) de vía.
// Altura de cada barra = avance físico; marca amarilla = sin reporte en la semana.

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
                  className={`landing-bar-fill ${reported ? 'is-reported' : ''}`}
                  style={{ height: grown ? `${Math.max(progress, 3)}%` : '0%' }}
                />
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
  onCopyMonth
}) {
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

  const malla = frentes.filter(f => f.id?.startsWith('f_mv'));
  const espacio = frentes.filter(f => !f.id?.startsWith('f_mv'));
  const reportedCount = frentes.filter(f => reportedIds.has(f.id)).length;

  return (
    <section className="landing-hero no-print" aria-labelledby="landing-title">
      <div className="landing-hero-head">
        <div className="max-w-xl">
          <p className="text-sm text-slate-300">
            {isContractorMode ? 'Portal del contratista' : 'Interventoría'} de INCOLTA S.A.S.
          </p>
          <h1 id="landing-title" className="landing-title">Frentes de obra en Usaquén</h1>
          <p className="text-sm sm:text-base text-slate-300 mt-2 leading-relaxed">
            Malla vial y espacio público, contratos IDU.
            {weekReport && ` Semana ${weekReport.numero_semana}, del ${shortDate(weekReport.fecha_inicial_corte)} al ${shortDate(weekReport.fecha_final_corte)}.`}
          </p>
        </div>

        <dl className="landing-figures">
          <div>
            <dt>avance físico promedio</dt>
            <dd>{avgProgress}<span>%</span></dd>
          </div>
          <div>
            <dt>frentes con reporte esta semana</dt>
            <dd>{reportedCount}<span>/{frentes.length}</span></dd>
          </div>
        </dl>
      </div>

      <div className="landing-lanes">
        <Lane title="Malla vial" frentes={malla} reportedIds={reportedIds} grown={grown} />
        <Lane title="Espacio público" frentes={espacio} reportedIds={reportedIds} grown={grown} />
      </div>

      <div className="landing-hero-foot">
        <p className="landing-legend">
          <span className="legend-bar" aria-hidden="true" /> Cada barra es un tramo (CIV); su altura es el avance físico.
          <span className="legend-mark" aria-hidden="true" /> Sin reporte en la semana.
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
