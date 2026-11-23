// Correspondencia del proyecto: oficios y correos con el contratista y la entidad.
//
// Los registros llegan de otra implementación (Apps Script que vuelca Gmail en una hoja de
// cálculo), de una importación de Excel/CSV o se crean en la app. Cada registro tiene un id
// estable para que reenviarlo no lo duplique. Los campos que se gestionan en la app (estado,
// respuesta, frentes, notas, plazo) no se pisan cuando la fuente vuelve a enviar el registro.

export const DEFAULT_PLAZO_DIAS_HABILES = 5;

// Campos que vienen de la fuente (se actualizan en cada sincronización)
const SOURCE_FIELDS = ['radicado', 'radicados', 'tipo', 'canal', 'fecha', 'hora', 'remitente', 'destinatario', 'parte', 'asunto', 'resumen', 'cuerpo', 'enlace', 'adjuntos', 'hilo', 'enRespuestaA', 'respuestaFuente'];
// Campos que se gestionan en InterventorIA (una vez editados, la fuente no los cambia)
export const APP_FIELDS = ['estado', 'requiereRespuesta', 'fechaLimite', 'respuesta', 'frentes', 'notas', 'parte', 'componente'];

const clean = (v) => (v == null ? '' : String(v).trim());
// Solo enlaces web (evita javascript: u otros esquemas en datos que vienen de correos)
export const safeUrl = (v) => (/^https?:\/\//i.test(clean(v)) ? clean(v) : '');

// Fecha a AAAA-MM-DD (acepta Date, ISO, "dd/mm/aaaa" y números de serie de Excel)
export function toIsoDate(value) {
  if (!value && value !== 0) return '';
  if (value instanceof Date && !isNaN(value)) return value.toISOString().slice(0, 10);
  if (typeof value === 'number' && value > 20000 && value < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  const d = new Date(s);
  return isNaN(d) ? '' : d.toISOString().slice(0, 10);
}

// Clasifica la parte a partir del remitente/destinatario si la fuente no la trae
export function guessParte(text, hints = {}) {
  const t = clean(text).toLowerCase();
  if (!t) return 'otro';
  if ((hints.entidad || []).some(h => h && t.includes(h.toLowerCase()))) return 'entidad';
  if ((hints.contratista || []).some(h => h && t.includes(h.toLowerCase()))) return 'contratista';
  if (/\.gov\.co\b/.test(t)) return 'entidad'; // entidades públicas colombianas
  return 'otro';
}

// Id estable: el de la fuente, o el radicado, o una huella de fecha+remitente+asunto
export function stableId(raw) {
  const given = clean(raw.id || raw.idMensaje || raw.messageId);
  if (given) return given;
  const radicado = clean(raw.radicado);
  if (radicado) return `rad:${radicado.toLowerCase()}`;
  const base = `${toIsoDate(raw.fecha)}|${clean(raw.remitente).toLowerCase()}|${clean(raw.asunto).toLowerCase()}`;
  let h = 0;
  for (let i = 0; i < base.length; i++) h = (Math.imul(31, h) + base.charCodeAt(i)) | 0;
  return `h:${(h >>> 0).toString(36)}`;
}

// ---------- Clasificación (mismas reglas del Apps Script de INCOLTA) ----------
const has = (text, words) => words.some(w => text.includes(w));
const COMPONENT_RULES = [
  ['Ambiental', ['ambiental', 'rcd', 'forestal', 'residuos']],
  ['Financiero', ['cuenta de cobro', 'acta de cobro', ' apu', 'apus', 'adición contractual', 'adicion contractual', 'prórroga', 'prorroga']],
  ['SST', ['seguridad social', 'sst', 'salud', 'ingreso', 'cuadrilla', 'hoja de vida profesional sst']],
  ['Social', ['gestion social', 'gestión social', 'vecindad', 'veeduria', 'veeduría', ' cdi', 'mano de obra', 'comunidad']]
];
const TRANSITO_WORDS = ['tránsito', 'transito', ' pmt', 'pmt ', 'movilidad', ' sdm', 'sdm '];

// Componente: Técnico por defecto; "/ Tránsito" si el correo trata de PMT o movilidad
export function classifyComponente(asunto = '', cuerpo = '') {
  const text = ` ${`${asunto} ${cuerpo}`.toLowerCase()} `;
  const base = (COMPONENT_RULES.find(([, words]) => has(text, words)) || ['Técnico'])[0];
  return has(text, TRANSITO_WORDS) ? `${base} / Tránsito` : base;
}

// Radicados citados en el asunto: INC-…, CON-COP-…, consecutivos numéricos de 13 a 18 dígitos (SDM, IDU)
export function extractRadicados(text = '') {
  const found = [];
  const add = (r) => { const v = r.toUpperCase(); if (!found.includes(v)) found.push(v); };
  (String(text).match(/\b(?:CON-COP-\d+(?:-\d+)*|INC-\d+(?:-\d+)*)\b/gi) || []).forEach(add);
  (String(text).match(/\b20\d{11,16}\b/g) || []).forEach(add);
  return found;
}

// Columna "Respuesta" del informe: oficio cruzado, respuesta a comunicado o sin oficio
export function respuestaLabel(asunto = '') {
  const cruzado = String(asunto).match(/\b(?:CON-COP-\d+(?:-\d+)*|INC-\d+(?:-\d+)*)\b/i);
  if (cruzado) return cruzado[0].toUpperCase();
  if (/^\s*(re|rv|fwd?|reenv(i|í)ado)\s*:/i.test(asunto) || /\b(re|fwd?):/i.test(asunto)) return 'Respuesta a comunicado anterior';
  return 'Sin oficio cruzado';
}

// "Vence 09/12/2026" en el asunto o el cuerpo -> fecha límite
export function extractVencimiento(text = '') {
  const m = String(text).match(/vence(?:n|r)?(?:\s+el)?\s*:?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i);
  return m ? toIsoDate(m[1]) : '';
}

// Los ids de mensaje de Gmail (16 hex) no son radicados
const isGmailId = (v) => /^[0-9a-f]{15,18}$/i.test(clean(v));

export function normalizeItem(raw, { origen = 'app', hints } = {}) {
  const tipo = /env|sal|out|sent/i.test(clean(raw.tipo)) ? 'enviado' : 'recibido';
  const contraparte = tipo === 'recibido' ? raw.remitente : raw.destinatario;
  const parteRaw = clean(raw.parte).toLowerCase();
  const parte = ['contratista', 'entidad', 'otro'].includes(parteRaw) ? parteRaw : guessParte(contraparte, hints);
  const asunto = clean(raw.asunto);
  const cuerpo = clean(raw.cuerpo).slice(0, 5000);
  // La hoja actual guarda el id de Gmail en "No. RADICADO": se usa como id, no como radicado
  const radicadoCol = clean(raw.radicado);
  const idFromRadicado = isGmailId(radicadoCol) ? radicadoCol : '';
  const radicados = extractRadicados(asunto);
  const estadoRaw = clean(raw.estado).toLowerCase();
  return {
    id: stableId({ ...raw, id: raw.id || raw.idMensaje || raw.messageId || idFromRadicado, radicado: idFromRadicado ? '' : radicadoCol }),
    radicado: (idFromRadicado ? '' : radicadoCol) || radicados.join('-'),
    radicados,
    tipo,
    canal: /ofic/i.test(clean(raw.canal)) ? 'oficio' : (clean(raw.canal) ? clean(raw.canal).toLowerCase() : 'correo'),
    fecha: toIsoDate(raw.fecha),
    remitente: clean(raw.remitente),
    destinatario: clean(raw.destinatario),
    parte,
    asunto,
    resumen: clean(raw.resumen).slice(0, 2000) || cuerpo.replace(/\s+/g, ' ').slice(0, 280),
    cuerpo,
    componente: clean(raw.componente) || classifyComponente(asunto, cuerpo),
    respuestaFuente: clean(raw.respuestaFuente) || respuestaLabel(asunto),
    hora: clean(raw.hora),
    enlace: safeUrl(raw.enlace),
    adjuntos: Array.isArray(raw.adjuntos) ? raw.adjuntos.map(clean).filter(Boolean) : clean(raw.adjuntos).split(/[\s,;]+/).filter(u => /^https?:\/\//.test(u)),
    hilo: clean(raw.hilo || raw.threadId),
    enRespuestaA: clean(raw.enRespuestaA),
    requiereRespuesta: raw.requiereRespuesta === undefined || raw.requiereRespuesta === ''
      ? tipo === 'recibido'
      : !/^(no|false|0)$/i.test(String(raw.requiereRespuesta)),
    fechaLimite: toIsoDate(raw.fechaLimite) || extractVencimiento(`${asunto} ${cuerpo}`),
    // TRAMITADO/PENDIENTE de la hoja son estimaciones por palabras: el estado real se calcula aquí
    estado: ['respondido', 'pendiente', 'informativo'].includes(estadoRaw) ? estadoRaw : '',
    respuesta: raw.respuesta && typeof raw.respuesta === 'object' ? raw.respuesta : null,
    frentes: Array.isArray(raw.frentes) ? raw.frentes.map(String) : clean(raw.frentes).split(/[\s,;]+/).filter(Boolean),
    notas: clean(raw.notas),
    origen,
    editadoEnApp: Array.isArray(raw.editadoEnApp) ? raw.editadoEnApp : []
  };
}

/**
 * Combina registros entrantes con los guardados.
 * - Desde la fuente: actualiza campos de origen; los de la app solo si nunca se editaron en la app.
 * - Desde la app: actualiza lo enviado y marca esos campos como "editados en la app".
 */
export function mergeCorrespondencia(existing = [], incoming = [], { origen = 'app' } = {}) {
  const byId = new Map(existing.map(i => [i.id, i]));
  let added = 0;
  let updated = 0;
  for (const item of incoming) {
    const prev = byId.get(item.id);
    if (!prev) {
      byId.set(item.id, { ...item, recibidoEn: new Date().toISOString() });
      added++;
      continue;
    }
    const next = { ...prev };
    if (origen === 'app') {
      const edited = new Set(prev.editadoEnApp || []);
      for (const [k, v] of Object.entries(item)) {
        if (k === 'id' || k === 'editadoEnApp' || k === 'origen' || k === 'recibidoEn') continue;
        if (JSON.stringify(prev[k]) !== JSON.stringify(v)) {
          next[k] = v;
          if (APP_FIELDS.includes(k)) edited.add(k);
        }
      }
      next.editadoEnApp = [...edited];
      next.enlace = safeUrl(next.enlace);
    } else {
      const edited = new Set(prev.editadoEnApp || []);
      SOURCE_FIELDS.forEach(k => {
        if (edited.has(k)) return; // p. ej. la parte corregida a mano
        if (item[k] !== undefined && item[k] !== '' && JSON.stringify(item[k]) !== JSON.stringify(prev[k])) next[k] = item[k];
      });
      APP_FIELDS.forEach(k => {
        if (!edited.has(k) && item[k] !== undefined && item[k] !== '' && item[k] !== null &&
            !(Array.isArray(item[k]) && item[k].length === 0)) next[k] = item[k];
      });
    }
    if (JSON.stringify(next) !== JSON.stringify(prev)) {
      next.actualizado = new Date().toISOString();
      byId.set(item.id, next);
      updated++;
    }
  }
  return { items: [...byId.values()], added, updated };
}

// Suma días hábiles (lunes a viernes; los festivos no se descuentan)
export function addBusinessDays(isoDate, days) {
  const d = new Date(`${isoDate}T12:00:00`);
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return d.toISOString().slice(0, 10);
}

export function businessDaysBetween(fromIso, toIso) {
  if (!fromIso || !toIso) return 0;
  const sign = toIso >= fromIso ? 1 : -1;
  const [a, b] = sign > 0 ? [fromIso, toIso] : [toIso, fromIso];
  const d = new Date(`${a}T12:00:00`);
  const end = new Date(`${b}T12:00:00`);
  let n = 0;
  while (d < end) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) n++;
  }
  return n * sign;
}

/**
 * Estado calculado de cada registro:
 *  - respondido: tiene respuesta registrada, o hay un enviado en el mismo hilo / que lo cita
 *  - informativo: no requiere respuesta (o es enviado)
 *  - vencido / por-vencer / pendiente según el plazo
 */
export function withComputedStatus(items, { hoy, plazoDias = DEFAULT_PLAZO_DIAS_HABILES } = {}) {
  const sent = items.filter(i => i.tipo === 'enviado');
  return items.map(item => {
    const plazo = item.fechaLimite || (item.fecha ? addBusinessDays(item.fecha, plazoDias) : '');
    if (item.tipo === 'enviado') return { ...item, plazo, situacion: 'enviado' };
    const autoRespuesta = sent.find(s =>
      (item.hilo && s.hilo === item.hilo && s.fecha >= item.fecha) ||
      (item.radicado && s.enRespuestaA && s.enRespuestaA.toLowerCase() === item.radicado.toLowerCase())
    );
    const respondido = item.estado === 'respondido' || !!item.respuesta?.fecha || (!!autoRespuesta && item.estado !== 'pendiente');
    let situacion;
    if (respondido) situacion = 'respondido';
    else if (!item.requiereRespuesta || item.estado === 'informativo') situacion = 'informativo';
    else {
      const restantes = businessDaysBetween(hoy, plazo);
      // Vencido si la fecha límite ya pasó (aunque entre medio solo haya fin de semana)
      situacion = plazo && hoy > plazo ? 'vencido' : restantes <= 1 ? 'por-vencer' : 'pendiente';
    }
    return {
      ...item,
      plazo,
      situacion,
      diasRestantes: situacion === 'respondido' || situacion === 'informativo' ? null : businessDaysBetween(hoy, plazo),
      respuestaAuto: !item.respuesta && autoRespuesta
        ? { fecha: autoRespuesta.fecha, radicado: autoRespuesta.radicado, asunto: autoRespuesta.asunto, destinatario: autoRespuesta.destinatario }
        : null
    };
  });
}

// Encabezados reconocidos al importar una hoja (Excel/CSV/Apps Script)
export const HEADER_SYNONYMS = {
  id: ['id', 'id mensaje', 'message id', 'idmensaje', 'messageid'],
  radicado: ['radicado', 'no. radicado', 'numero radicado', 'número radicado', 'consecutivo', 'oficio', 'no oficio', 'n° oficio'],
  tipo: ['tipo', 'entrada/salida', 'sentido', 'recibido/enviado'],
  canal: ['canal', 'medio'],
  fecha: ['fecha', 'fecha recibido', 'fecha de recibo', 'fecha radicado', 'date', 'fecha correo'],
  remitente: ['remitente', 'de', 'from', 'enviado por', 'origen', 'entidad / remitente', 'entidad genera email', 'entidad/remitente'],
  destinatario: ['destinatario', 'para', 'to', 'dirigido a'],
  parte: ['parte', 'entidad/contratista', 'tipo remitente', 'actor'],
  asunto: ['asunto', 'subject', 'referencia', 'tema'],
  resumen: ['resumen', 'descripcion', 'descripción', 'snippet'],
  cuerpo: ['cuerpo', 'contenido', 'contenido del correo', 'body', 'mensaje'],
  componente: ['componente', 'area', 'área'],
  respuestaFuente: ['respuesta', 'oficio cruzado'],
  enlace: ['enlace', 'link', 'url', 'enlace gmail', 'link correo'],
  adjuntos: ['adjuntos', 'archivos', 'attachments'],
  hilo: ['hilo', 'thread', 'thread id', 'threadid', 'id hilo'],
  enRespuestaA: ['en respuesta a', 'responde a', 'respuesta a radicado'],
  requiereRespuesta: ['requiere respuesta', 'requiere_respuesta', 'responder'],
  fechaLimite: ['fecha limite', 'fecha límite', 'plazo', 'vence', 'vencimiento'],
  estado: ['estado'],
  frentes: ['frente', 'frentes', 'civ'],
  notas: ['notas', 'observaciones', 'comentarios']
};

const normHeader = (h) => clean(h).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Filas (con encabezado en la primera) -> objetos con los campos reconocidos
export function rowsToRecords(rows) {
  if (!rows?.length) return { records: [], mapped: {}, ignored: [] };
  const header = rows[0].map(normHeader);
  const mapped = {};
  header.forEach((h, idx) => {
    for (const [field, names] of Object.entries(HEADER_SYNONYMS)) {
      if (mapped[field] === undefined && names.map(normHeader).includes(h)) {
        mapped[field] = idx;
        break;
      }
    }
  });
  const usedIdx = new Set(Object.values(mapped));
  const ignored = rows[0].filter((_, i) => !usedIdx.has(i)).map(clean).filter(Boolean);
  const records = rows.slice(1)
    .filter(r => r.some(v => clean(v)))
    .map(r => Object.fromEntries(Object.entries(mapped).map(([f, i]) => [f, r[i]])));
  return { records, mapped, ignored };
}

// Objeto con encabezados de la hoja ({ "Fecha": ..., "De": ... }) -> campos del modelo.
// Los nombres de campo propios (fecha, remitente, idMensaje...) también se aceptan tal cual.
export function mapRecordKeys(obj) {
  const out = {};
  for (const [key, value] of Object.entries(obj || {})) {
    const h = normHeader(key);
    let field = Object.keys(HEADER_SYNONYMS).find(f => normHeader(f) === h);
    if (!field) field = Object.entries(HEADER_SYNONYMS).find(([, names]) => names.map(normHeader).includes(h))?.[0];
    if (!field && ['idmensaje', 'messageid', 'threadid'].includes(h)) field = h === 'threadid' ? 'hilo' : 'id';
    if (field && out[field] === undefined) out[field] = value;
  }
  return out;
}

// Nombre visible de una dirección: "Consorcio Malla Vial <obra@x.co>" -> "Consorcio Malla Vial"
export const displayName = (address = '') => {
  const first = String(address).split(',')[0].trim();
  const name = first.replace(/<[^>]*>/, '').replace(/"/g, '').trim();
  return name || first.replace(/[<>]/g, '');
};

// Texto de la columna RESPUESTA cuando la respuesta se detectó en el hilo (como en el informe)
export const autoRespuestaLabel = (auto, fmtDate = (d) => d) => {
  if (!auto) return '';
  const fwd = /^\s*(fwd?|rv|reenv)/i.test(auto.asunto || '');
  return fwd
    ? `Fwd a ${displayName(auto.destinatario)} ${fmtDate(auto.fecha)}`
    : `Respondido ${auto.radicado ? `con ${auto.radicado} ` : ''}${fmtDate(auto.fecha)}`;
};
