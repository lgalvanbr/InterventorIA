// Configuración de proyectos (contratos, frentes, marca, calendario).
//
// Supabase: fila "proyecto__<id>" en weekly_reports. El proyecto Usaquén tiene además una
// configuración por defecto en el código (src/data/proyectos/usaquen.js) que se usa mientras
// no se haya guardado una versión editada.
// Local (sin SUPABASE_KEY): archivo src/data/proyectos.local.json.
import fs from 'fs';
import { fileURLToPath } from 'url';
import { USAQUEN_CONFIG } from '../src/data/proyectos/usaquen.js';
import { validateProjectConfig } from '../src/data/projectConfig.js';

const BUILT_IN = { [USAQUEN_CONFIG.id]: USAQUEN_CONFIG };
const LOCAL_FILE = fileURLToPath(new URL('../src/data/proyectos.local.json', import.meta.url));
const rowId = (id) => `proyecto__${id}`;

export const summarizeProject = (config) => ({
  id: config.id,
  nombre: config.nombre,
  ubicacion: config.ubicacion || '',
  contratante: config.contratante || '',
  marca: config.marca || {},
  contratos: (config.contratos || []).length,
  frentes: (config.contratos || []).reduce((n, c) => n + (c.frentes || []).length, 0)
});

export function createProjectsStore({ supabaseUrl, supabaseKey }) {
  if (!supabaseKey) return fileProjectsStore();
  const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };
  const rest = `${supabaseUrl}/rest/v1/weekly_reports`;

  async function request(target, options = {}) {
    const res = await fetch(target, { ...options, headers: { ...headers, ...options.headers }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      const err = new Error(`Supabase HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      err.status = res.status;
      throw err;
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  return {
    async list() {
      const rows = await request(`${rest}?id=like.proyecto__*&select=data`);
      const byId = { ...BUILT_IN };
      rows.forEach(r => { if (r.data?.id) byId[r.data.id] = r.data; });
      return Object.values(byId);
    },
    async get(id) {
      const rows = await request(`${rest}?id=eq.${encodeURIComponent(rowId(id))}&select=data`);
      return rows[0]?.data || BUILT_IN[id] || null;
    },
    async save(config, { create = false } = {}) {
      if (create && (BUILT_IN[config.id] || (await this.get(config.id)))) {
        const err = new Error(`Ya existe un proyecto con el identificador "${config.id}".`);
        err.status = 409;
        throw err;
      }
      await request(rest, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ id: rowId(config.id), data: config })
      });
      return config;
    }
  };
}

function fileProjectsStore() {
  const read = () => {
    try {
      return JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8'));
    } catch {
      return {};
    }
  };
  return {
    async list() {
      return Object.values({ ...BUILT_IN, ...read() });
    },
    async get(id) {
      return read()[id] || BUILT_IN[id] || null;
    },
    async save(config, { create = false } = {}) {
      const all = read();
      if (create && (BUILT_IN[config.id] || all[config.id])) {
        const err = new Error(`Ya existe un proyecto con el identificador "${config.id}".`);
        err.status = 409;
        throw err;
      }
      all[config.id] = config;
      try {
        fs.writeFileSync(LOCAL_FILE, JSON.stringify(all, null, 2), 'utf8');
      } catch (err) {
        console.warn('No se pudo escribir el archivo local de proyectos:', err.message);
      }
      return config;
    }
  };
}

export { validateProjectConfig };
