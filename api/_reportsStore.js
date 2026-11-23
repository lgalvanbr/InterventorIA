// Almacenamiento de informes semanales.
//
// Supabase: una fila por semana en la tabla weekly_reports (id = "semana_<N>", data = informe).
// Cada guardado es condicional a la versión (_rev) que se leyó: si otro dispositivo guardó
// en medio, la escritura no afecta filas y se reintenta sobre la versión nueva.
// La fila antigua "main_reports" (todas las semanas juntas) se conserva como respaldo y
// solo se usa una vez para migrar.
//
// Local (sin SUPABASE_KEY): archivo src/data/saved_weekly_reports.json.
import fs from 'fs';
import { fileURLToPath } from 'url';
import { applyChangeToWeek, normalizeReports } from '../src/data/reportsMerge.js';

const MAX_RETRIES = 5;
// Relativo a este archivo (no al directorio desde donde se lanza el proceso)
const DEFAULT_SEED_FILE = fileURLToPath(new URL('../src/data/saved_weekly_reports.json', import.meta.url));

// Proyecto por defecto (Usaquén): filas semana_<N>. Otros proyectos: <proyecto>__semana_<N>.
export const weekRowPrefix = (projectId) =>
  !projectId || projectId === 'usaquen' ? 'semana_' : `${projectId}__semana_`;

export function createReportsStore({ supabaseUrl, supabaseKey, seedFile, projectId }) {
  const prefix = weekRowPrefix(projectId);
  if (supabaseKey) return supabaseStore(supabaseUrl, supabaseKey, prefix);
  const file = prefix === 'semana_'
    ? (seedFile || DEFAULT_SEED_FILE)
    : DEFAULT_SEED_FILE.replace(/\.json$/, `.${projectId}.json`);
  return fileStore(file);
}

function supabaseStore(url, key, prefix) {
  const weekRowId = (semana) => `${prefix}${Number(semana)}`;
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const rest = `${url}/rest/v1/weekly_reports`;

  async function request(target, options = {}, timeout = 15000) {
    const res = await fetch(target, { ...options, headers: { ...headers, ...options.headers }, signal: AbortSignal.timeout(timeout) });
    if (!res.ok) {
      const err = new Error(`Supabase HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      err.status = res.status;
      throw err;
    }
    // return=minimal responde sin cuerpo (201/204)
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  async function migrateFromLegacyRow() {
    if (prefix !== 'semana_') return []; // solo el proyecto original tenía la fila única
    const rows = await request(`${rest}?id=eq.main_reports&select=data`);
    const legacy = normalizeReports(rows?.[0]?.data || []);
    if (legacy.length === 0) return [];
    // Insertar sin sobrescribir: si otra instancia migró primero, se respetan sus filas
    await request(rest, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify(legacy.map(r => ({ id: weekRowId(r.numero_semana), data: r })))
    }, 30000);
    return listWeeksRaw();
  }

  async function listWeeksRaw() {
    const rows = await request(`${rest}?id=like.${prefix}*&select=data`);
    return normalizeReports(rows.map(r => r.data));
  }

  async function getWeek(semana) {
    const rows = await request(`${rest}?id=eq.${weekRowId(semana)}&select=data`);
    return rows.length ? normalizeReports([rows[0].data])[0] : null;
  }

  async function insertWeek(report) {
    try {
      await request(rest, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ id: weekRowId(report.numero_semana), data: report })
      });
      return true;
    } catch (err) {
      if (err.status === 409) return false; // ya existe
      throw err;
    }
  }

  async function updateWeek(report, expectedRev) {
    // Las filas migradas pueden no tener _rev guardado (equivale a 1)
    const revFilter = expectedRev === 1
      ? `or=(data->>_rev.eq.1,data->>_rev.is.null)`
      : `data->>_rev=eq.${expectedRev}`;
    const rows = await request(`${rest}?id=eq.${weekRowId(report.numero_semana)}&${revFilter}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ data: report })
    }, 20000);
    return Array.isArray(rows) && rows.length > 0;
  }

  return {
    async listWeeks() {
      const weeks = await listWeeksRaw();
      return weeks.length > 0 ? weeks : migrateFromLegacyRow();
    },
    async applyChange(change) {
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const current = await getWeek(change.semana ?? change.report?.numero_semana);
        const result = applyChangeToWeek(current, change);
        if (result.conflict) return { conflict: result.conflict, report: current };
        const ok = current
          ? await updateWeek(result.report, current._rev || 1)
          : await insertWeek(result.report);
        if (ok) return { report: result.report };
        // Otro dispositivo guardó en medio: reintentar sobre su versión
      }
      throw new Error('La semana cambió varias veces seguidas; inténtalo de nuevo.');
    },
    async replaceWeek(report) {
      const current = await getWeek(report.numero_semana);
      const next = { ...report, _rev: (current?._rev || 1) + 1 };
      if (!current) return insertWeek(next);
      return updateWeek(next, current._rev || 1);
    }
  };
}

function fileStore(filePath) {
  let memory = null;
  const read = () => {
    if (memory) return memory;
    try {
      memory = normalizeReports(JSON.parse(fs.readFileSync(filePath, 'utf8')));
    } catch {
      memory = [];
    }
    return memory;
  };
  const write = (reports) => {
    memory = reports;
    try {
      fs.writeFileSync(filePath, JSON.stringify(reports, null, 2), 'utf8');
    } catch (err) {
      console.warn('No se pudo escribir el archivo local de informes:', err.message);
    }
  };
  return {
    async listWeeks() {
      return read();
    },
    async applyChange(change) {
      const reports = read();
      const semana = Number(change.semana ?? change.report?.numero_semana);
      const idx = reports.findIndex(r => Number(r.numero_semana) === semana);
      const current = idx === -1 ? null : reports[idx];
      const result = applyChangeToWeek(current, change);
      if (result.conflict) return { conflict: result.conflict, report: current };
      const next = [...reports];
      if (idx === -1) next.push(result.report);
      else next[idx] = result.report;
      write(next);
      return { report: result.report };
    },
    async replaceWeek(report) {
      const reports = read();
      const idx = reports.findIndex(r => Number(r.numero_semana) === Number(report.numero_semana));
      const next = [...reports];
      const value = { ...report, _rev: ((idx === -1 ? 0 : reports[idx]._rev) || 1) + 1 };
      if (idx === -1) next.push(value);
      else next[idx] = value;
      write(next);
      return true;
    }
  };
}
