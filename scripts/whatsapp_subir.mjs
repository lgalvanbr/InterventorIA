// Sube al portal las notas (whatsapp_import.mjs) y las fotos asignadas (whatsapp_fotos.mjs).
//
// 1. Cada foto comprimida se sube con POST /api/upload-photo (nombre fijo por foto: reintentar no duplica).
// 2. Las notas y las fotos se guardan con POST /api/weekly-reports en formato { changes }, que solo
//    agrega/actualiza por id y nunca borra lo que ya está en el portal.
// Guarda un registro de URLs (<base>_subidas.json) para poder reanudar si algo falla.
//
// Uso: node scripts/whatsapp_subir.mjs <propuesta.json> <fotos.json> <map_comprimidas.json>
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const API = process.env.PORTAL_URL || 'https://interventoria.luisgalvan.me';
const [propFile, fotosFile, mapFile] = process.argv.slice(2);
if (!propFile || !fotosFile || !mapFile) {
  console.error('Uso: node scripts/whatsapp_subir.mjs <propuesta.json> <fotos.json> <map_comprimidas.json>');
  process.exit(1);
}
const prop = JSON.parse(fs.readFileSync(propFile, 'utf8'));
const fotos = JSON.parse(fs.readFileSync(fotosFile, 'utf8'));
const comprimidas = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
const logFile = propFile.replace('_propuesta.json', '_subidas.json');
const subidas = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile, 'utf8')) : {};

const notaPorId = new Map(prop.notas.map(n => [n.nota.id, n]));
const hash = (s) => crypto.createHash('md5').update(s).digest('hex').slice(0, 8);
const hhmmss = (hora) => { // "4.46.12 PM" -> "164612"
  const m = hora.match(/(\d{1,2})\.(\d{2})\.(\d{2}) ([AP])M/i);
  let h = +m[1] % 12; if (m[4].toUpperCase() === 'P') h += 12;
  return `${String(h).padStart(2, '0')}${m[2]}${m[3]}`;
};

// ---------- 1. subir fotos (una vez por archivo; la URL se reutiliza si la foto va a dos frentes) ----------
const porArchivo = new Map();
for (const a of fotos.asignadas) {
  if (!notaPorId.has(a.notaId) || notaPorId.get(a.notaId).yaExiste) continue;
  if (!porArchivo.has(a.file)) porArchivo.set(a.file, []);
  porArchivo.get(a.file).push(a);
}

// Igual que el Portal de Inspectores: subida directa a Supabase Storage con la llave pública del proyecto
// (la misma que usa src/components/InspectorPortal.jsx); si falla, se intenta el endpoint del servidor.
const portalSrc = fs.readFileSync(new URL('../src/components/InspectorPortal.jsx', import.meta.url), 'utf8');
const SUPABASE_URL = process.env.SUPABASE_URL || (portalSrc.match(/supabaseUrl:\s*'([^']+)'/) || [])[1] || 'https://rjghsenbsrprbajhkwxr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || (portalSrc.match(/supabaseKey:\s*'([^']+)'/) || [])[1];
const BUCKET = 'frentes-fotos';

async function subirDirecto(filePath, buffer) {
  if (!SUPABASE_KEY) throw new Error('sin llave pública de Supabase');
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filePath}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' },
    body: buffer
  });
  if (!res.ok) throw new Error(`Storage HTTP ${res.status} ${(await res.text()).slice(0, 120)}`);
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filePath}`;
}

async function subirFoto(file, asignaciones) {
  if (subidas[file]) return subidas[file];
  const a = asignaciones[0];
  const fileName = `FECHA_${a.fechaNota}_SEM${a.semana}_FRENTE_${a.frente}_${hhmmss(a.hora)}_${hash(path.basename(file))}.jpeg`;
  const buffer = fs.readFileSync(comprimidas[file]);
  try {
    const url = await subirDirecto(`semana_${a.semana}/frente_${a.frente}/${fileName}`, buffer);
    subidas[file] = { url, fileName };
    return subidas[file];
  } catch (e) {
    if (process.env.DEBUG_SUBIDA) console.log('  directo falló:', e.message);
  }
  const base64 = 'data:image/jpeg;base64,' + buffer.toString('base64');
  for (let intento = 1; intento <= 3; intento++) {
    try {
      const res = await fetch(`${API}/api/upload-photo`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ semana: a.semana, frenteId: a.frente, fileName, base64 })
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.url && body.url.startsWith('http')) {
        subidas[file] = { url: body.url, fileName };
        return subidas[file];
      }
      throw new Error(`HTTP ${res.status} ${body.error || ''} ${body.details || ''}`);
    } catch (e) {
      if (intento === 3) throw e;
      await new Promise(r => setTimeout(r, 1500 * intento));
    }
  }
}

const pendientes = [...porArchivo.entries()];
if (process.argv.includes('--probar')) {
  const [file, asig] = pendientes[0];
  process.env.DEBUG_SUBIDA = '1';
  try { const r = await subirFoto(file, asig); console.log('Prueba OK:', r.url); } catch (e) { console.log('Prueba falló:', e.message); }
  fs.writeFileSync(logFile, JSON.stringify(subidas, null, 1));
  process.exit(0);
}
let hechas = 0, errores = [];
const t0 = Date.now();
async function trabajador() {
  while (pendientes.length) {
    const [file, asig] = pendientes.shift();
    try { await subirFoto(file, asig); } catch (e) { errores.push(`${path.basename(file)}: ${e.message}`); }
    hechas++;
    if (hechas % 25 === 0) {
      fs.writeFileSync(logFile, JSON.stringify(subidas, null, 1));
      console.log(`  fotos ${hechas}/${porArchivo.size} (${Math.round((Date.now() - t0) / 1000)} s)`);
    }
  }
}
console.log(`Subiendo ${porArchivo.size} fotos...`);
await Promise.all([1, 2, 3, 4].map(trabajador));
fs.writeFileSync(logFile, JSON.stringify(subidas, null, 1));
console.log(`Fotos subidas: ${Object.keys(subidas).length} | errores: ${errores.length}`);
if (errores.length) { console.log(errores.slice(0, 10).join('\n')); console.log('Se detiene antes de guardar las notas. Vuelve a ejecutar para reintentar.'); process.exit(1); }

// ---------- 2. guardar notas + fotos por semana y frente ----------
const cambios = new Map(); // semana -> frente -> {notas:[], fotos:[]}
const slot = (sem, fid) => {
  if (!cambios.has(sem)) cambios.set(sem, new Map());
  const m = cambios.get(sem);
  if (!m.has(fid)) m.set(fid, { notas: [], fotos: [] });
  return m.get(fid);
};
for (const n of prop.notas) {
  if (n.yaExiste || !n.semana) continue;
  slot(n.semana, n.frente).notas.push(n.nota);
}
for (const [file, asig] of porArchivo) {
  const s = subidas[file];
  for (const a of asig) {
    const nota = notaPorId.get(a.notaId);
    const horaTxt = a.hora.replace(/\.(\d{2}) /, ' ').replace('.', ':');
    slot(a.semana, a.frente).fotos.push({
      id: `wa_foto_${a.frente}_${hash(path.basename(file))}`,
      url: s.url,
      caption: `Reporte WhatsApp ${a.fechaNota} ${horaTxt}${nota?.autor && nota.autor !== 'Inspector' ? ' · ' + nota.autor : ''}`,
      date: a.fechaNota,
      semana: a.semana,
      category: 'avance'
    });
  }
}
const changes = [...cambios.entries()].sort((a, b) => a[0] - b[0]).map(([semana, frentes]) => ({
  semana: Number(semana),
  meta: {},
  frentes: [...frentes.entries()].map(([id, v]) => ({
    id,
    notas: { upsert: v.notas, remove: [] },
    fotos: { upsert: v.fotos, remove: [] }
  }))
}));

const res = await fetch(`${API}/api/weekly-reports`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ changes })
});
const body = await res.json().catch(() => ({}));
console.log(`Guardado: HTTP ${res.status} · semanas: ${(body.reports || []).map(r => r.numero_semana).join(', ') || '-'} · conflictos: ${JSON.stringify(body.conflicts || [])}`);
for (const c of changes) {
  console.log(`  semana ${c.semana}: ${c.frentes.reduce((s, f) => s + f.notas.upsert.length, 0)} notas, ${c.frentes.reduce((s, f) => s + f.fotos.upsert.length, 0)} fotos en ${c.frentes.length} frentes`);
}
if (!res.ok || (body.conflicts || []).length) process.exit(1);
