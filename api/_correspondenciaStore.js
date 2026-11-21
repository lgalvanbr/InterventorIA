// Correspondencia por proyecto: una fila en weekly_reports ("correspondencia" para Usaquén,
// "correspondencia__<proyecto>" para los demás) con { rev, items, sincronizacion }.
// Cada guardado es condicional a la versión leída (si otro guardó en medio, se reintenta).
// Local (sin SUPABASE_KEY): archivo src/data/correspondencia.<proyecto>.json.
import fs from 'fs';
import { fileURLToPath } from 'url';
import { mergeCorrespondencia } from '../src/data/correspondencia.js';

const MAX_RETRIES = 5;
const rowIdFor = (projectId) => (!projectId || projectId === 'usaquen' ? 'correspondencia' : `correspondencia__${projectId}`);
const emptyDoc = () => ({ rev: 0, items: [], sincronizacion: null });

export function createCorrespondenciaStore({ supabaseUrl, supabaseKey, projectId }) {
  const rowId = rowIdFor(projectId);
  if (!supabaseKey) return fileStore(fileURLToPath(new URL(`../src/data/correspondencia.${projectId || 'usaquen'}.json`, import.meta.url)));

  const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };
  const rest = `${supabaseUrl}/rest/v1/weekly_reports`;
  async function request(target, options = {}) {
    const res = await fetch(target, { ...options, headers: { ...headers, ...options.headers }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) {
      const err = new Error(`Supabase HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      err.status = res.status;
      throw err;
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }
  async function read() {
    const rows = await request(`${rest}?id=eq.${rowId}&select=data`);
    return rows[0]?.data ? { exists: true, doc: { ...emptyDoc(), ...rows[0].data } } : { exists: false, doc: emptyDoc() };
  }
  async function write(doc, { exists, rev }) {
    if (!exists) {
      try {
        await request(rest, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ id: rowId, data: doc })
        });
        return true;
      } catch (err) {
        if (err.status === 409) return false;
        throw err;
      }
    }
    const rows = await request(`${rest}?id=eq.${rowId}&data->>rev=eq.${rev}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ data: doc })
    });
    return Array.isArray(rows) && rows.length > 0;
  }

  return {
    async get() {
      return (await read()).doc;
    },
    async upsert(items, { origen, sincronizacion } = {}) {
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const { exists, doc } = await read();
        const merged = mergeCorrespondencia(doc.items, items, { origen });
        const next = {
          rev: (doc.rev || 0) + 1,
          items: merged.items,
          sincronizacion: sincronizacion || doc.sincronizacion
        };
        if (await write(next, { exists, rev: doc.rev || 0 })) {
          return { doc: next, added: merged.added, updated: merged.updated };
        }
      }
      throw new Error('La correspondencia cambió varias veces seguidas; inténtalo de nuevo.');
    }
  };
}

function fileStore(filePath) {
  const read = () => {
    try {
      return { ...emptyDoc(), ...JSON.parse(fs.readFileSync(filePath, 'utf8')) };
    } catch {
      return emptyDoc();
    }
  };
  return {
    async get() {
      return read();
    },
    async upsert(items, { origen, sincronizacion } = {}) {
      const doc = read();
      const merged = mergeCorrespondencia(doc.items, items, { origen });
      const next = { rev: (doc.rev || 0) + 1, items: merged.items, sincronizacion: sincronizacion || doc.sincronizacion };
      try {
        fs.writeFileSync(filePath, JSON.stringify(next, null, 2), 'utf8');
      } catch (err) {
        console.warn('No se pudo escribir la correspondencia local:', err.message);
      }
      return { doc: next, added: merged.added, updated: merged.updated };
    }
  };
}
