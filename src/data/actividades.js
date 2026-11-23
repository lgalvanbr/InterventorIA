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

const sentence = (s) => {
  const t = s.trim().replace(/\s*[.;,]+$/, '');
  return t ? `${t.charAt(0).toUpperCase()}${t.slice(1)}.` : '';
};

// Texto del área técnica a partir de una lista de actividades
export const linesToText = (lines) => lines.map(l => `-${sentence(l)}`).join('\n');

/**
 * Bloques para el informe. Cada elemento de `items`:
 *   { frente, civ, sufijo, texto }  (sufijo: " (Espacio público) PK ID 7021", etc.)
 * Agrupa los frentes consecutivos con el mismo texto ("FRENTES: 2 - 3 - 4").
 */
export function buildBlocks(items) {
  const blocks = [];
  for (const it of items) {
    const prev = blocks[blocks.length - 1];
    if (prev && prev.texto.trim() === it.texto.trim() && prev.sufijo === it.sufijo) {
      prev.frentes.push(it.frente);
      prev.civs.push(it.civ);
    } else {
      blocks.push({ frentes: [it.frente], civs: [it.civ], sufijo: it.sufijo, texto: it.texto });
    }
  }
  return blocks.map(b => {
    const many = b.frentes.length > 1;
    const head = many
      ? `FRENTES: ${b.frentes.join(' - ')}\nCIV´S: ${b.civs.filter(Boolean).join(' - ')}${b.sufijo}`
      : `FRENTE: ${b.frentes[0]}\nCIV: ${b.civs[0] || ''}${b.sufijo}`;
    return `${head}\n\nAREA TECNICA:\n${b.texto.trim()}`;
  });
}

export const BLOCKS_TITLE = 'ACTIVIDADES EN EJECUCION';

// Para pegar en Excel: cada bloque en una celda (comillas y saltos de línea dentro de la celda)
export const blocksToExcel = (blocks) =>
  [BLOCKS_TITLE, ...blocks.map(b => `"${b.replace(/"/g, '""')}"`)].join('\n');

// Para pegar en Word: bloques separados por una línea en blanco
export const blocksToText = (blocks) => [BLOCKS_TITLE, ...blocks].join('\n\n');
