// Cobertura de reportes por semana: qué semanas, días y frentes faltan por reportar.
//
// No todos los 43 frentes trabajan cada semana, así que "pendiente" se mide contra los
// frentes ACTIVOS: los que tuvieron algún reporte (foto o nota) en las semanas recientes.
import { frentePhotoList, frenteNoteList } from './reportsMerge.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const LOOKBACK_WEEKS = 4; // semanas previas para decidir si un frente está activo
const WORK_DAYS_PER_WEEK = 6; // lunes a sábado

const isoToDate = (iso) => new Date(`${iso}T12:00:00`);
const dateToIso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Días con algún reporte (foto o nota) de un frente
export function frenteReportDays(frente) {
  const days = new Set();
  frentePhotoList(frente).forEach(p => p.date && days.add(p.date));
  frenteNoteList(frente).forEach(n => n.date && n.note?.trim() && days.add(n.date));
  return days;
}

// Días laborables (lun–sáb) de la semana que ya pasaron o son hoy
export function workDaysUntil(report, todayIso) {
  const days = [];
  const start = isoToDate(report.fecha_inicial_corte);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start.getTime() + i * DAY_MS);
    const iso = dateToIso(d);
    if (iso > todayIso) break;
    if (d.getDay() !== 0) days.push(iso);
  }
  return days;
}

/**
 * @returns {{
 *   weeks: Array<{ report, numero: number, status: 'completa'|'parcial'|'sin-reportes'|'en-curso',
 *                  reportedDays: string[], missingDays: string[], workDays: number,
 *                  activeCount: number, reportedFrentes: object[], missingFrentes: object[] }>,
 *   missingWeekNumbers: number[]
 * }}
 */
export function computeReportCoverage(reports = [], todayIso, { maxWeeks = 8 } = {}) {
  const sorted = [...reports].sort((a, b) => Number(a.numero_semana) - Number(b.numero_semana));
  const daysByWeekFrente = sorted.map(r => new Map((r.frentes || []).map(f => [f.id, frenteReportDays(f)])));

  const weeks = [];
  sorted.forEach((report, idx) => {
    if (report.fecha_inicial_corte > todayIso) return; // semanas futuras
    const isCurrent = todayIso >= report.fecha_inicial_corte && todayIso <= report.fecha_final_corte;
    const thisWeek = daysByWeekFrente[idx];

    // Frentes activos: con reporte en esta semana o en las LOOKBACK_WEEKS anteriores
    const active = new Set();
    for (let j = Math.max(0, idx - LOOKBACK_WEEKS); j <= idx; j++) {
      daysByWeekFrente[j].forEach((days, id) => { if (days.size > 0) active.add(id); });
    }

    const frentes = report.frentes || [];
    const reportedFrentes = frentes.filter(f => (thisWeek.get(f.id)?.size || 0) > 0);
    const missingFrentes = frentes.filter(f => active.has(f.id) && !(thisWeek.get(f.id)?.size));

    const workDays = workDaysUntil(report, todayIso);
    const allDays = new Set();
    thisWeek.forEach(days => days.forEach(d => allDays.add(d)));
    const reportedDays = workDays.filter(d => allDays.has(d));
    const missingDays = workDays.filter(d => !allDays.has(d) && d < todayIso); // hoy aún no cuenta

    let status;
    if (isCurrent) status = 'en-curso';
    else if (reportedDays.length === 0) status = 'sin-reportes';
    // Se admite un día sin reporte (festivo, lluvia); los frentes faltantes son solo informativos
    else if (reportedDays.length >= WORK_DAYS_PER_WEEK - 1) status = 'completa';
    else status = 'parcial';

    weeks.push({
      report,
      numero: Number(report.numero_semana),
      status,
      reportedDays,
      missingDays,
      workDays: workDays.length,
      activeCount: active.size,
      reportedFrentes,
      missingFrentes
    });
  });

  // Semanas que nunca se crearon entre la primera y la última
  const numbers = new Set(sorted.map(r => Number(r.numero_semana)));
  const missingWeekNumbers = [];
  if (sorted.length > 1) {
    for (let n = Number(sorted[0].numero_semana) + 1; n < Number(sorted[sorted.length - 1].numero_semana); n++) {
      if (!numbers.has(n)) missingWeekNumbers.push(n);
    }
  }

  return {
    weeks: weeks.reverse().slice(0, maxWeeks),
    missingWeekNumbers
  };
}

// Semanas cerradas que necesitan atención (para el contador del encabezado)
export function countPendingWeeks(coverage) {
  return coverage.weeks.filter(w => w.status === 'sin-reportes' || w.status === 'parcial').length;
}
