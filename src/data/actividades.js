// Actividades en ejecución por frente (área técnica) a partir de las bitácoras de la semana.
//
// Las notas diarias de los inspectores tienen secciones (CLIMA, MAQUINARIA, PERSONAL...,
// ACTIVIDADES / ACTIVIDADES TÉCNICAS, ACTIVIDADES SST, OBSERVACIONES). De cada nota se toman las
// líneas de las secciones de actividades técnicas; las notas sin secciones se toman completas.

const strip = (s) => String(s || '')
  .replace(/[*_~]/g, '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toUpperCase()
  .replace(/[:.\s]+$/g, '')
  .trim();

// Encabezados de sección reconocidos (sin tildes, sin asteriscos, en mayúsculas)
const TECH_HEADERS = /^(ACTIVIDADES?|ACTIVIDADDES|ACTIVIDADES (TECNICAS?|DE OBRA|EJECUTADAS|REALIZADAS)|AREA TECNICA)$/;
const OTHER_HEADERS = /^(CLIMA|MAQUINARIA|PERSONAL( CONTRATISTA| INTERVENTORIA| DE OBRA)?|ACTIVIDADD?ES (SST|SOCIALES?|AMBIENTALES?)|ACTIVIDADES? (SST|SOCIAL|AMBIENTAL)|OBSERVACIONES|NOVEDADES|SST|SOCIAL|AMBIENTAL|REGISTRO FOTOGRAFICO|FOTOS|MATERIALES|EQUIPOS)$/;
// Líneas que no son actividad: fecha, frente, CIV, firma de WhatsApp, clima suelto
const NOISE = [
  /^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}$/,
  /^\d{1,2}\s+\w{3,}\s+\d{4}$/,
  /^FRENTES?\b/i,
  /^\*?CIV\b/i,
  /^WhatsApp\b/i,
  /^(mañana|tarde|noche)\s*:/i,
  /^(clima|personal|maquinaria|equipos?|hora)\b[^:]{0,25}:/i,
  /^(buen[oa]s?\s+(d[ií]as|tardes|noches)|hola|gracias)\b/i,
  /^(espacio p[uú]blico|malla vial)\.?$/i
];
const NO_ACTIVITY = /^sin (actividad|actividades|novedad(es)?)\.?$/i;

const cleanLine = (line) => line
  .replace(/^[\s*•·\-–—>]+/, '')
  .replace(/^actividad(es)?\s*:\s*/i, '')
  .replace(/[*_]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

export function extractTechnicalLines(note) {
  const lines = String(note || '').split(/\r?\n/);
  const hasSections = lines.some(l => TECH_HEADERS.test(strip(l)) || OTHER_HEADERS.test(strip(l)));
  const out = [];
  let inTech = !hasSections; // sin secciones: toda la nota cuenta
  for (const raw of lines) {
    const header = strip(raw);
    if (!header) continue;
    if (TECH_HEADERS.test(header)) { inTech = true; continue; }
    if (OTHER_HEADERS.test(header)) { inTech = false; continue; }
    if (!inTech) continue;
    const line = cleanLine(raw);
    if (!line || NOISE.some(rx => rx.test(line))) continue;
    out.push(line);
  }
  return out;
}

const keyOf = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Actividades de la semana de un frente: líneas únicas, en orden de fecha
export function weekActivities(frente) {
  const notes = [...(frente.bitacora_notes || frente.bitacora_notas || [])]
    .filter(n => n.note?.trim())
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const seen = new Set();
  const lines = [];
  for (const n of notes) {
    for (const line of extractTechnicalLines(n.note)) {
      const k = keyOf(line);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      lines.push(line);
    }
  }
  // "Sin actividad" solo cuenta si no hubo ninguna otra actividad en la semana
  const real = lines.filter(l => !NO_ACTIVITY.test(l));
  return real.length ? real : lines.slice(0, 1);
}

// ---------- Consolidado para el informe: pocas líneas, solo lo relevante ----------

// Mensajes de conversación (primera persona, avisos de llegada, horas) que no van al informe
const CHATTER = /(?<!\p{L})(yo|me|mi|estoy|voy|vamos|pasar[eé]|coment[oó]|dijeron|nos|les|ustedes|qui[eé]n|por favor|a esta hora|en un momento|m[aá]s tarde)(?!\p{L})|\?/iu;
// Listas de personal sueltas: "1 boal, 1 inspector, 1 operador"
const STAFF = /\d+\s*(boal|oficial(es)?|ayudantes?|inspector(es)?|operador(es)?|ing\.?|residente|obreros?|auxiliar(es)?)\b/gi;
// Actividades menores: solo se dejan si el frente no tuvo nada más
const LOW_RELEVANCE = /\b(orden y aseo|aseo|mantenimiento (de|a)l? cerramiento|cerramiento|descargue|acopi[ao]|se acopia)\b/i;
// Hitos y novedades que siempre conviene conservar
const MILESTONE = /\b(finaliz|termin|culmin|inici|pendiente|espera|da[ñn]o|incidente|suspend|vaciado|fundi|pavimen|concreto|base|subbase|sudbase|geomalla|sardinel|bordillo|tuber[ií]a|pozo|sumidero|caja)/i;
const RCD = /\bRCD\b/i;
const STOP = new Set(['para', 'desde', 'hasta', 'como', 'entre', 'sobre', 'esta', 'este', 'costado', 'derecho', 'izquierdo', 'material', 'obra', 'realiza', 'continua', 'continúa', 'procede', 'actividad']);

const tidy = (s) => s
  .replace(/\s*CIV\s*\d+(\s*-\s*CIV\s*\d+)*/gi, ' ')
  .replace(/\.(?=[a-záéíóúñ])/g, ' ')   // "tubería.de" -> "tubería de"
  .replace(/\.(?=\p{Lu})/gu, '. ')       // "vanti.Llegó" -> "vanti. Llegó"
  .replace(/\s+([,.;])/g, '$1')
  .replace(/\s{2,}/g, ' ')
  .trim();

const tokens = (s) => new Set(keyOf(s).split(' ')
  .filter(w => w.length >= 4 && !/\d/.test(w) && !STOP.has(w))
  .map(w => w.slice(0, 5)));

const similar = (a, b) => {
  if (!a.size || !b.size) return false;
  let common = 0;
  for (const t of a) if (b.has(t)) common++;
  return common / Math.min(a.size, b.size) >= 0.6;
};

// Más informativa: con abscisas, cantidades o medidas, y luego la más larga
const score = (s) => (/(absc|k\d\+|\d+\s*(m³|m3|ml|m2|m²|m\b))/i.test(s) ? 1000 : 0) + s.length;

const sumVolume = (lines) => lines.reduce((acc, l) => {
  const m = l.match(/(\d+(?:[.,]\d+)?)\s*m(?:³|3)\b/i);
  return acc + (m ? parseFloat(m[1].replace(',', '.')) : 0);
}, 0);

/**
 * Resume las actividades de la semana de un frente para el informe:
 * quita la conversación, junta las líneas que hablan de lo mismo (deja la más completa),
 * suma el RCD retirado y se queda con las `max` más relevantes en orden cronológico.
 */
export function consolidateActivities(lines, { max = 5 } = {}) {
  const clean = lines.map(tidy).filter(l => l && !CHATTER.test(l) && (l.match(STAFF) || []).length < 2);
  if (!clean.length) return lines.length ? [tidy(lines[0])] : [];

  const rcd = clean.filter(l => RCD.test(l));
  const groups = [];
  clean.forEach((line, order) => {
    if (RCD.test(line)) return;
    const tk = tokens(line);
    const g = groups.find(x => x.tokens.some(t => similar(t, tk)));
    if (g) {
      g.lines.push(line);
      g.tokens.push(tk);
      if (score(line) > score(g.best)) g.best = line;
    } else {
      groups.push({ order, tokens: [tk], lines: [line], best: line });
    }
  });
  if (rcd.length) {
    const vol = sumVolume(rcd);
    const fmt = Number.isInteger(vol) ? vol : vol.toFixed(1);
    groups.push({ order: clean.indexOf(rcd[0]), lines: rcd, best: `Retiro de material RCD${vol ? ` (${fmt} m³)` : ''}`, low: true });
  }

  let items = groups.map(g => ({ ...g, best: g.best, tk: tokens(g.best), low: g.low || LOW_RELEVANCE.test(g.best) }));
  // Una línea contenida en otra más completa sobra
  items = items.filter(g => !items.some(o => o !== g && o.tk.size > g.tk.size && similar(g.tk, o.tk)));
  // Con suficientes actividades principales, lo menor (aseo, acopios, una sola palabra) sale
  const main = items.filter(g => !g.low && g.tk.size >= 2);
  if (main.length >= 3) items = main;
  else items = [...items.filter(g => !g.low), ...items.filter(g => g.low)].slice(0, max);
  // Prioridad: hitos > más repetidas en la semana > más detalladas
  if (items.length > max) {
    items = [...items]
      .sort((a, b) => (MILESTONE.test(b.best) - MILESTONE.test(a.best)) || (b.lines.length - a.lines.length) || (score(b.best) - score(a.best)))
      .slice(0, max);
  }
  return items.sort((a, b) => a.order - b.order).map(g => g.best);
}

const sentence = (s) => {
  const t = s.trim().replace(/\s*[.;,]+$/, '');
  return t ? `${t.charAt(0).toUpperCase()}${t.slice(1)}.` : '';
};

// Texto del área técnica a partir de una lista de actividades
export const linesToText = (lines) => lines.map(l => `-${sentence(l)}`).join('\n');

/**
 * Bloques para el informe. Cada elemento de `items`:
 *   { id, frente, civ, sufijo, texto }  (sufijo: " (Espacio público) PK ID 7021", etc.)
 * Agrupa los frentes consecutivos con el mismo texto ("FRENTES: 2 - 3 - 4").
 */
export const buildBlocks = (items) => groupBlocks(items).map(b => b.text);

// Igual que buildBlocks, pero con los ids de los frentes de cada bloque: [{ ids, text }]
export function groupBlocks(items) {
  const blocks = [];
  for (const it of items) {
    const prev = blocks[blocks.length - 1];
    if (prev && prev.texto.trim() === it.texto.trim() && prev.sufijo === it.sufijo) {
      prev.frentes.push(it.frente);
      prev.civs.push(it.civ);
      prev.ids.push(it.id);
    } else {
      blocks.push({ ids: [it.id], frentes: [it.frente], civs: [it.civ], sufijo: it.sufijo, texto: it.texto });
    }
  }
  return blocks.map(b => {
    const many = b.frentes.length > 1;
    const head = many
      ? `FRENTES: ${b.frentes.join(' - ')}\nCIV´S: ${b.civs.filter(Boolean).join(' - ')}${b.sufijo}`
      : `FRENTE: ${b.frentes[0]}\nCIV: ${b.civs[0] || ''}${b.sufijo}`;
    return { ids: b.ids, text: `${head}\n\nAREA TECNICA:\n${b.texto.trim()}` };
  });
}

export const BLOCKS_TITLE = 'ACTIVIDADES EN EJECUCION';

// Para pegar en Excel: cada bloque en una celda (comillas y saltos de línea dentro de la celda)
export const blocksToExcel = (blocks) =>
  [BLOCKS_TITLE, ...blocks.map(b => `"${b.replace(/"/g, '""')}"`)].join('\n');

// Para pegar en Word: bloques separados por una línea en blanco
export const blocksToText = (blocks) => [BLOCKS_TITLE, ...blocks].join('\n\n');
