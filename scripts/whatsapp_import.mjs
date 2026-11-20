// Importador de reportes de obra desde el chat de WhatsApp "INT - VÍAS USAQUEN".
//
// Entrada: JSON extraído de WhatsApp Web (lista de mensajes {n, fecha, hora, autor, texto, fotos}).
// Salida:  propuesta de notas de bitácora por semana y frente + vista previa en Markdown.
//
// Uso:
//   node scripts/whatsapp_import.mjs <raw.json> [--desde 2026-11-05] [--overrides overrides.json]
//   node scripts/whatsapp_import.mjs <raw.json> ... --subir      (envía las notas al portal)
//
// Solo se conservan mensajes que describen un frente (reportes diarios, novedades de obra).
// Saludos, reuniones, oficios, cumpleaños, etc. se descartan.
// Cada nota tiene un id fijo (wa_<fecha>_<frente>_<n>) para que reimportar no duplique.
import fs from 'fs';
import path from 'path';

const API = process.env.PORTAL_URL || 'https://interventoria.luisgalvan.me';

const args = process.argv.slice(2);
const rawFile = args.find(a => !a.startsWith('--') && a.endsWith('.json') && !isFlagValue(a));
const flag = (name) => { const i = args.indexOf(name); return i === -1 ? null : args[i + 1]; };
function isFlagValue(a) { const i = args.indexOf(a); return i > 0 && ['--desde', '--overrides'].includes(args[i - 1]); }
const desde = flag('--desde');
const overridesFile = flag('--overrides');
const subir = args.includes('--subir');

if (!rawFile) {
  console.error('Uso: node scripts/whatsapp_import.mjs <raw.json> [--desde AAAA-MM-DD] [--overrides archivo.json] [--subir]');
  process.exit(1);
}

const mensajes = JSON.parse(fs.readFileSync(rawFile, 'utf8'));
// overrides: { "160": "f_mv_6", "38": null }  -> n de mensaje a frente (null = descartar)
const overrides = overridesFile ? JSON.parse(fs.readFileSync(overridesFile, 'utf8')) : {};

// ---------- utilidades ----------
const isoDate = (dmy) => { const [d, m, y] = dmy.split('/'); return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`; };
const toMin = (t) => { const m = (t || '').match(/(\d{1,2}):(\d{2})\s?([ap])/); if (!m) return null; let h = +m[1] % 12; if (m[3] === 'p') h += 12; return h * 60 + +m[2]; };
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Número de frente del chat -> id del portal
function frenteId(num) {
  const n = Number(num);
  if (n >= 1 && n <= 22) return `f_mv_${n}`;
  if (n >= 101 && n <= 120) return `f_ep_${n - 100}`;
  if (n === 201) return 'f_ep_21';
  return null;
}
const NOMBRES = [[/palmet+o/, 'f_mv_6'], [/margarita/, 'f_mv_7']];

// Detecta a qué frente(s) se refiere un texto (en sus primeras líneas)
function detectarFrentes(texto) {
  const cabeza = norm(texto.split('\n').slice(0, 6).join(' '));
  const ids = new Set();
  const m = cabeza.match(/\b(?:frentes?|tramos?)\s+(\d{1,3})(?:\s*(?:y|-|,)\s*(\d{1,3}))?/);
  if (m) { [m[1], m[2]].filter(Boolean).map(frenteId).filter(Boolean).forEach(id => ids.add(id)); }
  if (!ids.size && /\b(?:frentes?|tramos?)\b/.test(cabeza)) {
    for (const [re, id] of NOMBRES) if (re.test(cabeza)) ids.add(id);
  }
  return [...ids];
}
// Mensaje que es solo un encabezado ("Frente 8", "Tramo 101", "Frente 6 palmetto")
const esEncabezado = (t) => t.length < 45 && t.split('\n').length <= 2 && detectarFrentes(t).length > 0;
const esReporte = (t) => /clima|actividad|personal|maquinaria|tiempo/i.test(t) || t.length > 30;

// ---------- clasificación ----------
const lista = mensajes
  .filter(m => m.fecha)
  .map(m => ({ ...m, iso: isoDate(m.fecha), min: toMin(m.hora), texto: (m.texto || '').trim() }))
  .filter(m => !desde || m.iso >= desde);

const asignados = new Map(); // n -> [frenteIds]
const bloques = [];           // {frentes, mensajes:[...]}

for (let i = 0; i < lista.length; i++) {
  const m = lista[i];
  if (Object.prototype.hasOwnProperty.call(overrides, String(m.n))) continue;
  if (!m.texto) continue;
  const frentes = detectarFrentes(m.texto);
  if (!frentes.length) continue;

  // Mensajes siguientes del mismo autor sin frente propio (reportes enviados por partes)
  const grupo = [m];
  for (let j = i + 1; j < lista.length; j++) {
    const s = lista[j];
    if (s.iso !== m.iso || (s.min - m.min) > 15) break;
    if (!s.texto) continue; // fotos intercaladas
    if (s.autor !== m.autor || detectarFrentes(s.texto).length) break;
    if (Object.prototype.hasOwnProperty.call(overrides, String(s.n))) break;
    grupo.push(s);
  }

  if (esEncabezado(m.texto)) {
    // Encabezado escrito después de la observación ("No se ve del mismo grosor..." + "Frente 104")
    const prev = lista[i - 1];
    if (grupo.length === 1 && prev && prev.autor === m.autor && prev.texto && !asignados.has(prev.n) &&
        !detectarFrentes(prev.texto).length && prev.iso === m.iso && (m.min - prev.min) <= 3) {
      grupo.unshift(prev);
    }
    if (grupo.length > 1) {
      grupo.forEach(g => asignados.set(g.n, frentes));
      bloques.push({ frentes, mensajes: grupo });
    }
    continue;
  }

  if (esReporte(m.texto) || grupo.length > 1) {
    grupo.forEach(g => asignados.set(g.n, frentes));
    bloques.push({ frentes, mensajes: grupo });
  }
}

// Asignaciones manuales
for (const [n, id] of Object.entries(overrides)) {
  if (!id) continue;
  const m = lista.find(x => String(x.n) === String(n));
  if (!m || !m.texto) continue;
  const ids = Array.isArray(id) ? id : [id];
  // agrupa overrides consecutivos al mismo frente y autor
  const ultimo = bloques[bloques.length - 1];
  if (ultimo && ultimo.manual && ultimo.frentes.join() === ids.join() && ultimo.mensajes.at(-1).autor === m.autor &&
      ultimo.mensajes.at(-1).iso === m.iso) {
    ultimo.mensajes.push(m);
  } else {
    bloques.push({ frentes: ids, mensajes: [m], manual: true });
  }
  asignados.set(m.n, ids);
}

// ---------- notas ----------
const notas = [];
for (const b of bloques) {
  const primero = b.mensajes[0];
  const texto = b.mensajes.map(x => x.texto).join('\n');
  const fotos = b.mensajes.reduce((s, x) => s + (x.fotos || 0), 0) +
    // fotos que vienen en mensajes sin texto justo después (álbum del reporte)
    lista.filter(x => !x.texto && x.n > b.mensajes.at(-1).n && x.n <= b.mensajes.at(-1).n + 3 &&
      x.iso === primero.iso && !lista.slice(lista.indexOf(b.mensajes.at(-1)) + 1, lista.indexOf(x)).some(y => y.texto))
      .reduce((s, x) => s + (x.fotos || 0), 0);
  for (const fid of b.frentes) {
    notas.push({
      frente: fid,
      date: primero.iso,
      hora: primero.hora,
      autor: primero.autor || 'Inspector',
      msgs: b.mensajes.map(x => x.n),
      fotos,
      nota: {
        id: `wa_${primero.iso}_${fid}_${primero.n}`,
        date: primero.iso,
        note: `${texto}\n\n— WhatsApp INT - VÍAS USAQUEN (${primero.hora}${primero.autor ? ', ' + primero.autor : ''})`
      }
    });
  }
}
notas.sort((a, b) => a.date.localeCompare(b.date) || a.frente.localeCompare(b.frente, 'es', { numeric: true }));

// Mensajes con texto que podrían ser de obra pero no se asignaron
const pendientes = lista.filter(m => m.texto && !asignados.has(m.n) &&
  !Object.prototype.hasOwnProperty.call(overrides, String(m.n)) &&
  /frente|tramo|civ|anden|andén|sardinel|excava|demoli|pmt|fisur|tuber|recorrido|reconocimiento|contraloria|contraloría/i.test(m.texto));

// ---------- semanas del portal ----------
const semanas = await (await fetch(`${API}/api/weekly-reports`)).json();
const semanaDe = (iso) => semanas.find(r => iso >= r.fecha_inicial_corte && iso <= r.fecha_final_corte);

const porSemana = new Map();
const existentes = [];
for (const n of notas) {
  const sem = semanaDe(n.date);
  n.semana = sem ? sem.numero_semana : null;
  const frente = sem?.frentes?.find(f => f.id === n.frente);
  const previas = [...(frente?.bitacora_notas || []), ...(frente?.bitacora_notes || [])];
  n.yaExiste = previas.some(p => String(p.id) === n.nota.id) ||
    previas.some(p => p.date === n.date && norm(p.note || '').slice(0, 80).replace(/\W/g, '') === norm(n.nota.note).slice(0, 80).replace(/\W/g, ''));
  if (n.yaExiste) { existentes.push(n); continue; }
  if (!sem) continue;
  if (!porSemana.has(sem.numero_semana)) porSemana.set(sem.numero_semana, new Map());
  const m = porSemana.get(sem.numero_semana);
  if (!m.has(n.frente)) m.set(n.frente, []);
  m.get(n.frente).push(n.nota);
}

const changes = [...porSemana.entries()].map(([semana, frentes]) => ({
  semana: Number(semana),
  meta: {},
  frentes: [...frentes.entries()].map(([id, upsert]) => ({ id, notas: { upsert, remove: [] } }))
}));

// ---------- salida ----------
const outDir = path.dirname(rawFile);
const base = path.basename(rawFile).replace(/_raw\.json$|\.json$/, '');
fs.writeFileSync(path.join(outDir, `${base}_propuesta.json`), JSON.stringify({ changes, notas, pendientes }, null, 2));

const nombreFrente = (id) => {
  const f = semanas.at(-1)?.frentes?.find(x => x.id === id) || semanas[0]?.frentes?.find(x => x.id === id);
  return f ? `Frente ${f.frente} · ${f.eje} (${id})` : id;
};
let md = `# Propuesta de carga desde WhatsApp\n\n`;
md += `Fuente: \`${path.basename(rawFile)}\`${desde ? ` · desde ${desde}` : ''} · generado ${new Date().toISOString().slice(0, 16).replace('T', ' ')}\n\n`;
md += `- Mensajes leídos: ${lista.length}\n- Notas de bitácora nuevas: ${notas.filter(n => !n.yaExiste && n.semana).length}\n- Ya estaban en el portal (se omiten): ${existentes.length}\n- Mensajes de obra sin frente claro (revisar): ${pendientes.length}\n\n`;
md += `## Resumen por semana y frente\n\n| Semana | Frente | Notas | Fotos en el chat | Días |\n|---|---|---|---|---|\n`;
const resumen = new Map();
for (const n of notas.filter(x => !x.yaExiste && x.semana)) {
  const k = `${n.semana}|${n.frente}`;
  const r = resumen.get(k) || { semana: n.semana, frente: n.frente, notas: 0, fotos: 0, dias: new Set() };
  r.notas++; r.fotos += n.fotos; r.dias.add(n.date.slice(8) + '/' + n.date.slice(5, 7));
  resumen.set(k, r);
}
for (const r of [...resumen.values()].sort((a, b) => a.semana - b.semana || a.frente.localeCompare(b.frente, 'es', { numeric: true }))) {
  md += `| ${r.semana} | ${nombreFrente(r.frente)} | ${r.notas} | ${r.fotos} | ${[...r.dias].join(', ')} |\n`;
}
md += `\n## Notas propuestas\n`;
let semActual = null;
for (const n of notas.filter(x => !x.yaExiste && x.semana)) {
  if (n.semana !== semActual) { semActual = n.semana; md += `\n### Semana ${n.semana}\n`; }
  md += `\n**${n.date} · ${nombreFrente(n.frente)}** — mensajes #${n.msgs.join(', #')}${n.fotos ? ` · ${n.fotos} fotos en el chat` : ''}\n\n`;
  md += '```\n' + n.nota.note.replace(/```/g, "'''") + '\n```\n';
}
md += `\n## Mensajes de obra sin frente asignado\n\nAsígnalos en un archivo de overrides (\`{"<n>": "f_mv_6"}\`) o se quedan fuera.\n\n`;
for (const p of pendientes) md += `- #${p.n} ${p.fecha} ${p.hora} · ${p.autor || '?'}: ${p.texto.replace(/\s*\n+\s*/g, ' / ').slice(0, 220)}\n`;
fs.writeFileSync(path.join(outDir, `${base}_propuesta.md`), md);

console.log(`Notas nuevas: ${notas.filter(n => !n.yaExiste && n.semana).length} | ya existentes: ${existentes.length} | sin frente: ${pendientes.length}`);
console.log(`Semanas: ${changes.map(c => `${c.semana} (${c.frentes.reduce((s, f) => s + f.notas.upsert.length, 0)} notas en ${c.frentes.length} frentes)`).join(', ')}`);
console.log(`Vista previa: ${path.join(outDir, `${base}_propuesta.md`)}`);

if (subir) {
  if (!changes.length) { console.log('Nada que subir.'); process.exit(0); }
  const res = await fetch(`${API}/api/weekly-reports`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ changes })
  });
  const body = await res.json().catch(() => ({}));
  console.log(`Subida: HTTP ${res.status} · semanas guardadas: ${(body.reports || []).map(r => r.numero_semana).join(', ') || '-'} · conflictos: ${JSON.stringify(body.conflicts || [])}`);
  if (!res.ok) process.exit(1);
}
