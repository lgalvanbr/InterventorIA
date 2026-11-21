// Empareja las fotos descargadas de WhatsApp Web con las notas propuestas por whatsapp_import.mjs.
//
// Las fotos del .zip se llaman "WhatsApp Image 2026-11-05 at 4.46.12 PM.jpeg": la hora es la de envío.
// Cada foto se asocia al mensaje con fotos enviado en ese mismo minuto (±2 min) y, por él, a la nota
// (frente y día). Las que no quedan cerca de ningún reporte (fotos sociales, etc.) quedan sin asignar.
//
// Uso: node scripts/whatsapp_fotos.mjs <raw.json> <propuesta.json> <carpeta_fotos> [--desde AAAA-MM-DD]
import fs from 'fs';
import path from 'path';

const [rawFile, propFile, fotosDir] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const di = process.argv.indexOf('--desde');
const desde = di > -1 ? process.argv[di + 1] : null;
if (!rawFile || !propFile || !fotosDir) {
  console.error('Uso: node scripts/whatsapp_fotos.mjs <raw.json> <propuesta.json> <carpeta_fotos> [--desde AAAA-MM-DD]');
  process.exit(1);
}

const mensajes = JSON.parse(fs.readFileSync(rawFile, 'utf8'));
const prop = JSON.parse(fs.readFileSync(propFile, 'utf8'));

const isoDate = (dmy) => { const [d, m, y] = dmy.split('/'); return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`; };
const toMin = (t) => { const m = (t || '').match(/(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s?([ap])/i); if (!m) return null; let h = +m[1] % 12; if (m[4].toLowerCase() === 'p') h += 12; return h * 60 + +m[2] + (m[3] ? +m[3] / 60 : 0); };

function listar(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? listar(p) : [p];
  });
}

// Fotos (se ignoran videos y duplicados exactos de nombre+tamaño entre lotes)
const vistos = new Set();
const fotos = [];
const videos = [];
for (const file of listar(fotosDir)) {
  const name = path.basename(file);
  const m = name.match(/(\d{4}-\d{2}-\d{2}) at (\d{1,2}\.\d{2}\.\d{2} [AP]M)/i);
  if (!m) continue;
  const key = `${name}|${fs.statSync(file).size}`;
  if (vistos.has(key)) continue;
  vistos.add(key);
  const rec = { file, name, date: m[1], min: toMin(m[2]), hora: m[2] };
  if (/\.(mp4|mov|3gp)$/i.test(name)) videos.push(rec); else if (/\.(jpe?g|png|webp)$/i.test(name)) fotos.push(rec);
}

// Mensajes con fotos = anclas
const anclas = mensajes.filter(m => m.fecha && (m.fotos || 0) > 0)
  .map(m => ({ n: m.n, date: isoDate(m.fecha), min: toMin(m.hora), texto: m.texto || '' }));

// Notas por mensaje
const notaPorMsg = new Map();
for (const nota of prop.notas) for (const n of nota.msgs) {
  if (!notaPorMsg.has(n)) notaPorMsg.set(n, []);
  notaPorMsg.get(n).push(nota);
}
const msgPorN = new Map(mensajes.map(m => [m.n, { ...m, date: m.fecha ? isoDate(m.fecha) : null, min: toMin(m.hora) }]));

// Ancla -> notas: la del propio mensaje o, si es un álbum sin texto, el reporte más cercano (±5 min)
function notasDeAncla(a) {
  if (notaPorMsg.has(a.n)) return notaPorMsg.get(a.n);
  let mejor = null;
  for (const nota of prop.notas) {
    if (nota.date !== a.date && !nota.msgs.some(n => msgPorN.get(n)?.date === a.date)) continue;
    for (const n of nota.msgs) {
      const mm = msgPorN.get(n);
      if (!mm || mm.date !== a.date || mm.min == null) continue;
      const d = Math.abs(mm.min - a.min);
      // un mensaje de texto entre medio que no es del reporte rompe la relación
      const entre = mensajes.filter(x => x.n > Math.min(n, a.n) && x.n < Math.max(n, a.n) && x.texto && !nota.msgs.includes(x.n));
      if (d <= 5 && entre.length === 0 && (!mejor || d < mejor.d)) mejor = { d, n };
    }
  }
  return mejor ? notaPorMsg.get(mejor.n) : [];
}

const asignadas = [];
const sinAsignar = [];
for (const f of fotos) {
  if (desde && f.date < desde) continue;
  const cands = anclas.filter(a => a.date === f.date && a.min != null && Math.abs(a.min - Math.floor(f.min)) <= 2)
    .sort((a, b) => Math.abs(a.min - Math.floor(f.min)) - Math.abs(b.min - Math.floor(f.min)) || b.n - a.n);
  const ancla = cands[0];
  const notas = ancla ? notasDeAncla(ancla) : [];
  if (!notas.length) { sinAsignar.push({ ...f, ancla: ancla?.n ?? null }); continue; }
  for (const nota of notas) {
    asignadas.push({ ...f, ancla: ancla.n, notaId: nota.nota.id, frente: nota.frente, semana: nota.semana, fechaNota: nota.date });
  }
}

const out = path.join(path.dirname(propFile), path.basename(propFile).replace('_propuesta.json', '_fotos.json'));
fs.writeFileSync(out, JSON.stringify({ asignadas, sinAsignar, videos: videos.filter(v => !desde || v.date >= desde) }, null, 2));

const porFrente = {};
for (const a of asignadas) porFrente[`${a.semana}|${a.frente}`] = (porFrente[`${a.semana}|${a.frente}`] || 0) + 1;
console.log(`Fotos leídas: ${fotos.length} (videos: ${videos.length})`);
console.log(`Asignadas: ${new Set(asignadas.map(a => a.file)).size} fotos -> ${asignadas.length} registros | sin asignar: ${sinAsignar.length}`);
console.log(Object.entries(porFrente).sort().map(([k, v]) => `${k}: ${v}`).join('\n'));
console.log(`Resultado: ${out}`);
