// Fusión de cambios de informes semanales (compartido por api/index.js, vite.config.js y server.js).
//
// El cliente ya no envía el arreglo completo de semanas: envía solo los cambios
// (semanas nuevas, campos de semana modificados y frentes modificados). El servidor
// aplica esos cambios sobre la versión más reciente guardada, de modo que un navegador
// con datos viejos nunca puede borrar semanas ni pisar frentes que no tocó.
import { calculateConsolidatedMetrics } from './reportsWeekly.js';

const sameWeek = (a, b) => Number(a.numero_semana) === Number(b.numero_semana);

export function normalizeReports(reports) {
  if (!Array.isArray(reports)) return [];
  return reports.map(r => (r && r._rev ? r : { ...r, _rev: 1 }));
}

/**
 * Calcula los cambios entre dos listas de informes del cliente.
 * Usa igualdad por referencia (los handlers de React conservan los objetos no modificados).
 */
export function diffReports(prevReports = [], nextReports = []) {
  const changes = [];
  for (const next of nextReports) {
    const prev = prevReports.find(p => String(p.id_informe) === String(next.id_informe)) ||
      prevReports.find(p => sameWeek(p, next));
    if (prev === next) continue;

    if (!prev) {
      const { _rev, ...report } = next;
      changes.push({ semana: Number(next.numero_semana), isNew: true, report });
      continue;
    }

    const meta = {};
    for (const key of Object.keys(next)) {
      if (key === 'frentes' || key === '_rev') continue;
      if (JSON.stringify(next[key]) !== JSON.stringify(prev[key])) meta[key] = next[key];
    }
    const prevFrentes = new Map((prev.frentes || []).map(f => [f.id, f]));
    const frentes = (next.frentes || []).filter(f => {
      const old = prevFrentes.get(f.id);
      return old !== f && JSON.stringify(old) !== JSON.stringify(f);
    });

    if (Object.keys(meta).length > 0 || frentes.length > 0) {
      changes.push({ semana: Number(next.numero_semana), meta, frentes });
    }
  }
  return changes;
}

/**
 * Aplica los cambios sobre la versión guardada.
 * Devuelve { reports, affected, conflicts }. Nunca elimina semanas.
 */
export function applyChanges(storedReports = [], changes = []) {
  const reports = normalizeReports(storedReports);
  const affected = new Set();
  const conflicts = [];

  for (const change of changes) {
    const semana = Number(change.semana ?? change.report?.numero_semana);
    if (!Number.isFinite(semana)) continue;
    const idx = reports.findIndex(r => Number(r.numero_semana) === semana);

    if (change.isNew) {
      if (idx !== -1) {
        // Otra persona ya creó esta semana: se conserva la existente.
        conflicts.push({ semana, reason: 'exists' });
        affected.add(semana);
        continue;
      }
      reports.push({ ...change.report, numero_semana: semana, _rev: 1 });
      affected.add(semana);
      continue;
    }

    if (idx === -1) {
      conflicts.push({ semana, reason: 'missing' });
      continue;
    }

    const current = reports[idx];
    const { numero_semana: _ignored, id_informe: _id, _rev: _r, ...meta } = change.meta || {};
    const incoming = new Map((change.frentes || []).map(f => [f.id, f]));
    const frentes = (current.frentes || []).map(f => (incoming.has(f.id) ? incoming.get(f.id) : f));
    for (const [id, f] of incoming) {
      if (!frentes.some(x => x.id === id)) frentes.push(f);
    }

    const merged = calculateConsolidatedMetrics(frentes, { ...current, ...meta });
    reports[idx] = { ...merged, _rev: (current._rev || 1) + 1 };
    affected.add(semana);
  }

  return {
    reports,
    affected: reports.filter(r => affected.has(Number(r.numero_semana))),
    conflicts
  };
}

/**
 * Compatibilidad con clientes antiguos que envían el arreglo completo:
 * solo se aceptan semanas que aún no existen; las existentes se ignoran.
 */
export function legacyArrayToChanges(storedReports = [], incoming = []) {
  return incoming
    .filter(r => r && !storedReports.some(s => sameWeek(s, r)))
    .map(r => {
      const { _rev, ...report } = r;
      return { semana: Number(r.numero_semana), isNew: true, report };
    });
}
