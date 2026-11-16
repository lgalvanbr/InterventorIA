// Fusión de cambios de informes semanales (compartido por el cliente y api/index.js).
//
// El cliente no envía el arreglo completo de semanas: envía solo operaciones
//   - semanas nuevas,
//   - campos de semana modificados,
//   - por frente: campos modificados y altas/cambios/bajas de fotos y notas por id.
// El servidor aplica esas operaciones sobre la versión más reciente guardada. Así un
// dispositivo desactualizado no puede borrar semanas, ni fotos o notas que no conocía.
import { calculateConsolidatedMetrics } from './reportsWeekly.js';

const LIST_FIELDS = ['fotos', 'photos', 'bitacora_notes', 'bitacora_notas'];
const sameWeek = (a, b) => Number(a.numero_semana) === Number(b.numero_semana);
const same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);

export const photoKey = (p) => p?.id || p?.url;
export const noteKey = (n) => (n?.id != null ? String(n.id) : n?.date);

// Fotos de un frente (fotos/photos son la misma lista con dos nombres heredados)
export function frentePhotoList(f) {
  return uniqueBy([...(f?.fotos || []), ...(f?.photos || [])], photoKey);
}
export function frenteNoteList(f) {
  const notes = f?.bitacora_notes?.length ? f.bitacora_notes : (f?.bitacora_notas || []);
  return uniqueBy(notes, noteKey);
}

function uniqueBy(list, keyFn) {
  const map = new Map();
  for (const item of list) {
    const key = keyFn(item);
    if (key != null && !map.has(key)) map.set(key, item);
  }
  return Array.from(map.values());
}

// Operaciones para pasar de `before` a `after`
export function diffList(before = [], after = [], keyFn) {
  const prev = new Map(before.map(i => [keyFn(i), i]));
  const next = new Map(after.map(i => [keyFn(i), i]));
  const upsert = [];
  for (const [key, item] of next) {
    if (key == null) continue;
    if (!prev.has(key) || !same(prev.get(key), item)) upsert.push(item);
  }
  const remove = [];
  for (const key of prev.keys()) {
    if (key != null && !next.has(key)) remove.push(key);
  }
  return { upsert, remove };
}

export function applyListOps(list = [], ops, keyFn) {
  if (!ops) return list;
  const removed = new Set((ops.remove || []).map(String));
  const map = new Map();
  for (const item of list) {
    const key = keyFn(item);
    if (key != null && !removed.has(String(key))) map.set(key, item);
  }
  for (const item of ops.upsert || []) {
    const key = keyFn(item);
    if (key != null) map.set(key, item);
  }
  return Array.from(map.values());
}

/**
 * Aplica los cambios locales (de `base` a `edited`) sobre la versión más reciente (`latest`).
 * Lo usa el portal: conserva las fotos/notas que otro dispositivo agregó mientras tanto.
 */
export function mergeEditedList(base, edited, latest, keyFn) {
  return applyListOps(latest, diffList(base, edited, keyFn), keyFn);
}

function diffFrente(prev, next) {
  const set = {};
  for (const key of Object.keys(next)) {
    if (LIST_FIELDS.includes(key) || key === 'id') continue;
    if (!same(prev[key], next[key])) set[key] = next[key];
  }
  const fotos = diffList(frentePhotoList(prev), frentePhotoList(next), photoKey);
  const notas = diffList(frenteNoteList(prev), frenteNoteList(next), noteKey);
  const patch = { id: next.id };
  if (Object.keys(set).length) patch.set = set;
  if (fotos.upsert.length || fotos.remove.length) patch.fotos = fotos;
  if (notas.upsert.length || notas.remove.length) patch.notas = notas;
  return Object.keys(patch).length > 1 ? patch : null;
}

/**
 * Calcula las operaciones entre dos listas de informes del cliente.
 * Usa igualdad por referencia para descartar rápido lo que no cambió.
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
      if (!same(next[key], prev[key])) meta[key] = next[key];
    }
    const prevFrentes = new Map((prev.frentes || []).map(f => [f.id, f]));
    const frentes = [];
    for (const f of next.frentes || []) {
      const old = prevFrentes.get(f.id);
      if (old === f) continue;
      if (!old) {
        frentes.push({ id: f.id, set: f, fotos: { upsert: frentePhotoList(f), remove: [] }, notas: { upsert: frenteNoteList(f), remove: [] } });
        continue;
      }
      const patch = diffFrente(old, f);
      if (patch) frentes.push(patch);
    }

    if (Object.keys(meta).length > 0 || frentes.length > 0) {
      changes.push({ semana: Number(next.numero_semana), meta, frentes });
    }
  }
  return changes;
}

function applyFrentePatch(frente, patch) {
  // Formato antiguo (frente completo): se trata como reemplazo de campos, sin borrar fotos/notas
  if (!patch.set && !patch.fotos && !patch.notas) {
    const { id: _id, ...fields } = patch;
    const setFields = Object.fromEntries(Object.entries(fields).filter(([k]) => !LIST_FIELDS.includes(k)));
    return applyFrentePatch(frente, {
      id: patch.id,
      set: setFields,
      fotos: { upsert: frentePhotoList(patch), remove: [] },
      notas: { upsert: frenteNoteList(patch), remove: [] }
    });
  }
  const { fotos: _f, photos: _p, bitacora_notes: _n, bitacora_notas: _m, id: _i, ...set } = patch.set || {};
  const fotos = applyListOps(frentePhotoList(frente), patch.fotos, photoKey);
  const notas = applyListOps(frenteNoteList(frente), patch.notas, noteKey);
  return {
    ...frente,
    ...set,
    fotos,
    photos: fotos,
    bitacora_notes: notas,
    bitacora_notas: notas
  };
}

/**
 * Aplica un cambio a UNA semana. Devuelve { report } o { conflict }.
 * `current` es la versión guardada de esa semana (o null si no existe).
 */
export function applyChangeToWeek(current, change) {
  const semana = Number(change.semana ?? change.report?.numero_semana);
  if (!Number.isFinite(semana) || semana <= 0) return { conflict: { semana, reason: 'invalid' } };

  if (change.isNew) {
    if (current) return { conflict: { semana, reason: 'exists' } };
    const report = change.report || {};
    if (!Array.isArray(report.frentes)) return { conflict: { semana, reason: 'invalid' } };
    return { report: { ...report, numero_semana: semana, _rev: 1 } };
  }

  if (!current) return { conflict: { semana, reason: 'missing' } };

  const { numero_semana: _n, id_informe: _id, _rev: _r, ...meta } = change.meta || {};
  const patches = new Map((change.frentes || []).filter(p => p && p.id).map(p => [p.id, p]));
  const frentes = (current.frentes || []).map(f => (patches.has(f.id) ? applyFrentePatch(f, patches.get(f.id)) : f));
  for (const [id, patch] of patches) {
    if (!frentes.some(f => f.id === id)) frentes.push(applyFrentePatch({ id }, patch));
  }

  const progressChanged = [...patches.values()].some(p =>
    p.set && Object.prototype.hasOwnProperty.call(p.set, 'porcentaje_avance_semana'));
  const merged = { ...current, ...meta, frentes };
  const report = progressChanged ? calculateConsolidatedMetrics(frentes, merged) : merged;
  return { report: { ...report, _rev: (current._rev || 1) + 1 } };
}

/**
 * Aplica cambios a la lista completa (modo local con archivo). Nunca elimina semanas.
 */
export function applyChanges(storedReports = [], changes = []) {
  const reports = normalizeReports(storedReports);
  const affected = new Set();
  const conflicts = [];
  for (const change of changes) {
    const semana = Number(change?.semana ?? change?.report?.numero_semana);
    const idx = reports.findIndex(r => Number(r.numero_semana) === semana);
    const result = applyChangeToWeek(idx === -1 ? null : reports[idx], change || {});
    if (result.conflict) {
      conflicts.push(result.conflict);
      if (result.conflict.reason === 'exists') affected.add(semana);
      continue;
    }
    if (idx === -1) reports.push(result.report);
    else reports[idx] = result.report;
    affected.add(semana);
  }
  return {
    reports,
    affected: reports.filter(r => affected.has(Number(r.numero_semana))),
    conflicts
  };
}

export function normalizeReports(reports) {
  if (!Array.isArray(reports)) return [];
  return reports.map(r => (r && r._rev ? r : { ...r, _rev: 1 }));
}

/**
 * Compatibilidad con clientes antiguos que envían el arreglo completo:
 * solo se aceptan semanas que aún no existen.
 */
export function legacyArrayToChanges(storedReports = [], incoming = []) {
  return incoming
    .filter(r => r && !storedReports.some(s => sameWeek(s, r)))
    .map(r => {
      const { _rev, ...report } = r;
      return { semana: Number(r.numero_semana), isNew: true, report };
    });
}
