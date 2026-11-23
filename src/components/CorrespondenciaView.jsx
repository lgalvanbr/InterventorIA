import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Upload, Link2, ExternalLink, Loader2, AlertCircle, Plus, Copy, Check } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { apiPath, CURRENT_PROJECT_ID } from '../data/projectSession';
import { todayLocalIso } from '../utils/dates';
import {
  withComputedStatus,
  rowsToRecords,
  DEFAULT_PLAZO_DIAS_HABILES,
  safeUrl
} from '../data/correspondencia';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const shortDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}${y !== new Date().getFullYear() ? ` ${y}` : ''}`;
};

const SITUACION = {
  vencido: { label: 'Vencido', cls: 'bg-red-100 text-red-800' },
  'por-vencer': { label: 'Por vencer', cls: 'bg-amber-100 text-amber-900' },
  pendiente: { label: 'Por responder', cls: 'bg-blue-100 text-blue-800' },
  respondido: { label: 'Respondido', cls: 'bg-emerald-100 text-emerald-800' },
  informativo: { label: 'Informativo', cls: 'bg-slate-100 text-slate-600' },
  enviado: { label: 'Enviado', cls: 'bg-slate-100 text-slate-600' }
};
const PARTES = { contratista: 'Contratista', entidad: 'Entidad', otro: 'Otro' };

const FILTROS = [
  { id: 'abiertos', label: 'Por responder', match: i => ['vencido', 'por-vencer', 'pendiente'].includes(i.situacion) },
  { id: 'vencido', label: 'Vencidos', match: i => i.situacion === 'vencido' },
  { id: 'respondido', label: 'Respondidos', match: i => i.situacion === 'respondido' },
  { id: 'informativo', label: 'Informativos', match: i => i.situacion === 'informativo' },
  { id: 'enviado', label: 'Enviados', match: i => i.situacion === 'enviado' },
  { id: 'todos', label: 'Todos', match: () => true }
];

function plazoText(item) {
  if (item.diasRestantes == null) return '';
  if (item.situacion === 'vencido') {
    const d = Math.abs(item.diasRestantes);
    return d === 0 ? 'Venció el ' + shortDate(item.plazo) : `Vencido hace ${d} día${d === 1 ? '' : 's'} hábil${d === 1 ? '' : 'es'}`;
  }
  if (item.diasRestantes === 0) return 'Vence hoy';
  return `${item.diasRestantes} día${item.diasRestantes === 1 ? '' : 's'} hábil${item.diasRestantes === 1 ? '' : 'es'}`;
}

const timeAgo = (iso) => {
  if (!iso) return '';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} días`;
};

export default function CorrespondenciaView({ projects = [], isContractorMode }) {
  const project = useProject();
  const plazoDias = project?.correspondencia?.plazoDiasHabiles || DEFAULT_PLAZO_DIAS_HABILES;
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('abiertos');
  const [parte, setParte] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [modal, setModal] = useState(null); // 'importar' | 'conectar' | 'nuevo'
  const hoy = todayLocalIso();

  const load = useCallback(async () => {
    try {
      const res = await fetch(apiPath('/api/correspondencia'));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setDoc(data);
      setError('');
    } catch (err) {
      setError(`No se pudo cargar la correspondencia (${err.message}).`);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const items = useMemo(
    () => withComputedStatus(doc?.items || [], { hoy, plazoDias })
      .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')),
    [doc, hoy, plazoDias]
  );

  const counts = useMemo(() => ({
    vencido: items.filter(i => i.situacion === 'vencido').length,
    porVencer: items.filter(i => i.situacion === 'por-vencer').length,
    abiertos: items.filter(i => ['vencido', 'por-vencer', 'pendiente'].includes(i.situacion)).length,
    respondidosMes: items.filter(i => i.situacion === 'respondido' && (i.respuesta?.fecha || i.respuestaAuto?.fecha || '').slice(0, 7) === hoy.slice(0, 7)).length
  }), [items, hoy]);

  const visible = useMemo(() => {
    const f = FILTROS.find(x => x.id === filtro) || FILTROS[0];
    const term = busqueda.trim().toLowerCase();
    return items.filter(i =>
      f.match(i) &&
      (parte === 'todas' || i.parte === parte) &&
      (!term || [i.asunto, i.remitente, i.destinatario, i.radicado, i.resumen].some(v => (v || '').toLowerCase().includes(term)))
    );
  }, [items, filtro, parte, busqueda]);

  const allFrentes = useMemo(() => projects.flatMap(p => p.frentes || []), [projects]);
  const frenteLabel = (id) => {
    const f = allFrentes.find(x => x.id === id);
    return f ? `Frente ${f.frente}` : id;
  };

  const save = async (payload, { fuente } = {}) => {
    const res = await fetch(apiPath('/api/correspondencia'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: payload, ...(fuente ? { fuente } : {}) })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    setDoc(prev => ({ ...prev, items: data.items, sincronizacion: data.sincronizacion ?? prev?.sincronizacion }));
    return data;
  };

  const selected = items.find(i => i.id === selectedId) || null;

  return (
    <div className="flex-1 px-4 py-6 sm:px-8 max-w-6xl mx-auto w-full">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: "'Archivo', sans-serif", fontStretch: '80%' }}>Correspondencia</h1>
          <p className="text-sm text-slate-500 mt-1">
            Oficios y correos con el contratista y la entidad. Plazo de respuesta: {plazoDias} días hábiles.
          </p>
          {doc?.sincronizacion && (
            <p className="text-xs text-slate-400 mt-1">
              Última sincronización {timeAgo(doc.sincronizacion.fecha)} desde {doc.sincronizacion.fuente === 'apps-script' ? 'la hoja de Google' : doc.sincronizacion.fuente} ({doc.sincronizacion.recibidos} registros).
            </p>
          )}
        </div>
        {!isContractorMode && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setModal('nuevo')} className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-white px-3 py-2 text-sm font-semibold"><Plus size={16} /> Registrar oficio</button>
            <button type="button" onClick={() => setModal('importar')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><Upload size={16} /> Importar Excel</button>
            <button type="button" onClick={() => setModal('conectar')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><Link2 size={16} /> Conectar hoja de Google</button>
          </div>
        )}
      </header>

      {error && <p role="alert" className="mb-4 text-sm font-semibold text-red-700 flex gap-1.5"><AlertCircle size={16} className="mt-0.5" />{error}</p>}

      {/* Resumen: lo que exige acción primero */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { key: 'vencido', n: counts.vencido, label: 'vencidos sin respuesta', tone: 'text-red-700', filter: 'vencido' },
          { key: 'por-vencer', n: counts.porVencer, label: 'vencen hoy o mañana', tone: 'text-amber-700', filter: 'abiertos' },
          { key: 'abiertos', n: counts.abiertos, label: 'por responder en total', tone: 'text-slate-900', filter: 'abiertos' },
          { key: 'mes', n: counts.respondidosMes, label: 'respondidos este mes', tone: 'text-emerald-700', filter: 'respondido' }
        ].map(c => (
          <button
            key={c.key}
            type="button"
            onClick={() => setFiltro(c.filter)}
            className="text-left rounded-xl bg-white border border-slate-200 px-4 py-3 hover:border-slate-300"
          >
            <span className={`block text-3xl font-bold tabular-nums ${c.tone}`} style={{ fontFamily: "'Archivo', sans-serif", fontStretch: '80%' }}>{c.n}</span>
            <span className="block text-xs text-slate-500">{c.label}</span>
          </button>
        ))}
      </section>

      <section className="bg-white rounded-xl border border-slate-200">
        <div className="p-3 border-b border-slate-100 flex flex-col lg:flex-row gap-2 lg:items-center">
          <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {FILTROS.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltro(f.id)}
                aria-pressed={filtro === f.id}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold ${filtro === f.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 lg:ml-auto">
            <select value={parte} onChange={(e) => setParte(e.target.value)} className="rounded-lg border-slate-300 text-sm" aria-label="Parte">
              <option value="todas">Contratista y entidad</option>
              <option value="contratista">Contratista</option>
              <option value="entidad">Entidad</option>
              <option value="otro">Otros</option>
            </select>
            <div className="relative flex-1 lg:w-64">
              <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Asunto, remitente o radicado" className="w-full rounded-lg border-slate-300 pl-8 text-sm" />
            </div>
          </div>
        </div>

        {!doc && !error && <p className="p-6 text-sm text-slate-500">Cargando…</p>}
        {doc && visible.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-500">
            {items.length === 0
              ? <>Aún no hay correspondencia. Conecta tu hoja de Google o importa el Excel para empezar.</>
              : <>No hay registros con este filtro.</>}
          </div>
        )}

        <ul className="divide-y divide-slate-100">
          {visible.map(i => {
            const st = SITUACION[i.situacion];
            return (
              <li key={i.id}>
                <button type="button" onClick={() => setSelectedId(i.id)} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4">
                  <span className="sm:w-36 shrink-0 flex sm:flex-col gap-2 sm:gap-0.5 items-center sm:items-start">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                    <span className="text-xs text-slate-500">{plazoText(i)}</span>
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-slate-900 truncate">{i.asunto || '(sin asunto)'}</span>
                    <span className="block text-xs text-slate-500 truncate">
                      {i.tipo === 'enviado' ? `Para ${i.destinatario}` : i.remitente}
                      {i.radicado && ` · Rad. ${i.radicado}`}
                      {i.frentes?.length > 0 && ` · ${i.frentes.map(frenteLabel).join(', ')}`}
                    </span>
                  </span>
                  <span className="shrink-0 flex items-center gap-3 text-xs text-slate-500">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5">{PARTES[i.parte]}</span>
                    <span className="w-14 text-right">{shortDate(i.fecha)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {selected && (
        <DetailPanel
          item={selected}
          frentes={allFrentes}
          readOnly={isContractorMode}
          onClose={() => setSelectedId(null)}
          onSave={async (changes) => {
            const { situacion: _s, diasRestantes: _d, plazo: _p, respuestaAuto: _r, ...stored } = selected;
            await save([{ ...stored, ...changes }]);
          }}
        />
      )}
      {modal === 'importar' && <ImportModal onClose={() => setModal(null)} onImport={(rows) => save(rows, { fuente: 'excel' })} />}
      {modal === 'conectar' && <ConnectModal onClose={() => setModal(null)} projectName={project?.nombre} />}
      {modal === 'nuevo' && (
        <NewItemModal
          onClose={() => setModal(null)}
          onCreate={async (raw) => {
            const data = await save([raw]);
            setModal(null);
            const created = data.items.find(i => i.asunto === raw.asunto && i.fecha === raw.fecha);
            if (created) setSelectedId(created.id);
          }}
        />
      )}
    </div>
  );
}

function Overlay({ children, onClose, side = false, label }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex" onClick={onClose}>
      <div
        role="dialog"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className={side
          ? 'ml-auto h-full w-full max-w-lg bg-white shadow-2xl flex flex-col'
          : 'm-auto w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col mx-4'}
      >
        {children}
      </div>
    </div>
  );
}

function PanelHeader({ title, subtitle, onClose }) {
  return (
    <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      <button type="button" onClick={onClose} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0" aria-label="Cerrar"><X size={18} /></button>
    </div>
  );
}

const fieldCls = 'w-full rounded-lg border-slate-300 text-sm';

function DetailPanel({ item, frentes, readOnly, onClose, onSave }) {
  const [form, setForm] = useState({
    parte: item.parte,
    requiereRespuesta: item.requiereRespuesta,
    fechaLimite: item.fechaLimite || '',
    frentes: item.frentes || [],
    notas: item.notas || '',
    respuestaFecha: item.respuesta?.fecha || '',
    respuestaRadicado: item.respuesta?.radicado || ''
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (extra = {}) => {
    setSaving(true);
    setMsg('');
    try {
      const respuesta = form.respuestaFecha || form.respuestaRadicado
        ? { fecha: form.respuestaFecha, radicado: form.respuestaRadicado }
        : null;
      await onSave({
        parte: form.parte,
        requiereRespuesta: form.requiereRespuesta,
        fechaLimite: form.fechaLimite,
        frentes: form.frentes,
        notas: form.notas,
        respuesta,
        estado: respuesta?.fecha ? 'respondido' : (form.requiereRespuesta ? 'pendiente' : 'informativo'),
        ...extra
      });
      setMsg('Guardado');
    } catch (err) {
      setMsg(`No se pudo guardar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Overlay onClose={onClose} side label="Detalle de correspondencia">
      <PanelHeader title={item.asunto || '(sin asunto)'} subtitle={`${item.tipo === 'enviado' ? 'Enviado' : 'Recibido'} el ${shortDate(item.fecha)}${item.radicado ? `, radicado ${item.radicado}` : ''}`} onClose={onClose} />
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4 text-sm">
        <dl className="grid grid-cols-[7rem_1fr] gap-y-1.5">
          <dt className="text-slate-500">De</dt><dd className="break-words">{item.remitente || '—'}</dd>
          <dt className="text-slate-500">Para</dt><dd className="break-words">{item.destinatario || '—'}</dd>
          <dt className="text-slate-500">Plazo</dt><dd>{item.plazo ? `${shortDate(item.plazo)} (${plazoText(item) || SITUACION[item.situacion].label})` : '—'}</dd>
          <dt className="text-slate-500">Origen</dt><dd>{item.origen === 'apps-script' ? 'Hoja de Google' : item.origen === 'excel' ? 'Importación de Excel' : 'Registrado en la app'}</dd>
        </dl>
        {item.resumen && <p className="rounded-lg bg-slate-50 p-3 text-slate-700 whitespace-pre-wrap">{item.resumen}</p>}
        {safeUrl(item.enlace) && (
          <a href={safeUrl(item.enlace)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary font-semibold">
            <ExternalLink size={14} /> Abrir el correo original
          </a>
        )}
        {item.respuestaAuto && !item.respuesta && (
          <p className="rounded-lg bg-emerald-50 p-3 text-emerald-800">
            Respondido automáticamente: en el mismo hilo salió “{item.respuestaAuto.asunto}” el {shortDate(item.respuestaAuto.fecha)}.
          </p>
        )}

        {item.tipo === 'recibido' && (
          <fieldset disabled={readOnly} className="flex flex-col gap-3 border-t border-slate-100 pt-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.requiereRespuesta} onChange={(e) => set('requiereRespuesta', e.target.checked)} className="rounded" />
              Requiere respuesta
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1"><span className="text-slate-600">Parte</span>
                <select value={form.parte} onChange={(e) => set('parte', e.target.value)} className={fieldCls}>
                  {Object.entries(PARTES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1"><span className="text-slate-600">Fecha límite</span>
                <input type="date" value={form.fechaLimite || item.plazo || ''} onChange={(e) => set('fechaLimite', e.target.value)} className={fieldCls} />
              </label>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 flex flex-col gap-2">
              <p className="font-semibold text-slate-700">Respuesta</p>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1"><span className="text-slate-600">Fecha</span>
                  <input type="date" value={form.respuestaFecha} onChange={(e) => set('respuestaFecha', e.target.value)} className={fieldCls} />
                </label>
                <label className="flex flex-col gap-1"><span className="text-slate-600">Radicado de salida</span>
                  <input value={form.respuestaRadicado} onChange={(e) => set('respuestaRadicado', e.target.value)} className={fieldCls} placeholder="Ej. INC-310" />
                </label>
              </div>
            </div>
          </fieldset>
        )}

        <fieldset disabled={readOnly} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1"><span className="text-slate-600">Frentes relacionados</span>
            <select
              multiple
              value={form.frentes}
              onChange={(e) => set('frentes', [...e.target.selectedOptions].map(o => o.value))}
              className={`${fieldCls} h-28`}
            >
              {frentes.map(f => <option key={f.id} value={f.id}>Frente {f.frente} – {f.eje || f.civ}</option>)}
            </select>
            <span className="text-xs text-slate-400">Ctrl/Cmd + clic para elegir varios.</span>
          </label>
          <label className="flex flex-col gap-1"><span className="text-slate-600">Notas</span>
            <textarea value={form.notas} onChange={(e) => set('notas', e.target.value)} rows={3} className={fieldCls} />
          </label>
        </fieldset>
      </div>
      {!readOnly && (
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <span className={`text-sm ${msg.startsWith('No') ? 'text-red-700' : 'text-emerald-700'}`}>{msg}</span>
          <div className="flex gap-2">
            {item.tipo === 'recibido' && !form.respuestaFecha && (
              <button type="button" disabled={saving} onClick={() => { const t = todayLocalIso(); set('respuestaFecha', t); submit({ estado: 'respondido', respuesta: { fecha: t, radicado: form.respuestaRadicado } }); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">
                Marcar respondido hoy
              </button>
            )}
            <button type="button" disabled={saving} onClick={() => submit()} className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-white px-4 py-2 text-sm font-semibold disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin" />} Guardar
            </button>
          </div>
        </div>
      )}
    </Overlay>
  );
}

function ImportModal({ onClose, onImport }) {
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const inputRef = useRef(null);

  const read = async (file) => {
    setMsg('');
    try {
      let rows;
      if (file.name.toLowerCase().endsWith('.xlsx')) {
        const { default: readExcelFile } = await import('read-excel-file/browser');
        rows = (await readExcelFile(file))[0].data.map(r => r.map(v => (v instanceof Date ? v.toISOString().slice(0, 10) : v)));
      } else {
        const text = await file.text();
        const sep = text.includes('\t') ? '\t' : (text.split('\n')[0].split(';').length > text.split('\n')[0].split(',').length ? ';' : ',');
        rows = text.split(/\r?\n/).filter(Boolean).map(l => l.split(sep).map(c => c.replace(/^"|"$/g, '')));
      }
      const header = rows[0];
      const objects = rows.slice(1).filter(r => r.some(v => String(v ?? '').trim())).map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])));
      setPreview({ name: file.name, objects, ...rowsToRecords(rows) });
    } catch (err) {
      setMsg(`No se pudo leer el archivo: ${err.message}`);
    }
  };

  const FIELD_LABELS = { fecha: 'Fecha', remitente: 'Remitente', destinatario: 'Destinatario', asunto: 'Asunto', radicado: 'Radicado', tipo: 'Recibido/enviado', parte: 'Parte', resumen: 'Resumen', enlace: 'Enlace', hilo: 'Hilo de Gmail', id: 'Id del correo', estado: 'Estado', fechaLimite: 'Fecha límite', frentes: 'Frentes', notas: 'Notas' };

  return (
    <Overlay onClose={onClose} label="Importar correspondencia">
      <PanelHeader title="Importar Excel o CSV" subtitle="La primera fila debe tener los encabezados. Reimportar el mismo archivo no duplica registros." onClose={onClose} />
      <div className="flex-1 overflow-y-auto px-5 py-4 text-sm flex flex-col gap-4">
        <button type="button" onClick={() => inputRef.current?.click()} className="self-start inline-flex items-center gap-1.5 rounded-lg bg-primary text-white px-4 py-2 font-semibold"><Upload size={16} /> Elegir archivo</button>
        <input ref={inputRef} type="file" accept=".xlsx,.csv,.tsv,.txt" className="hidden" onChange={(e) => { if (e.target.files[0]) read(e.target.files[0]); e.target.value = ''; }} />
        {preview && (
          <>
            <p><strong>{preview.name}</strong>: {preview.objects.length} filas.</p>
            <div>
              <p className="font-semibold text-slate-700">Columnas reconocidas</p>
              <p className="text-slate-600">{Object.keys(preview.mapped).map(k => FIELD_LABELS[k] || k).join(', ') || 'Ninguna'}</p>
              {preview.ignored.length > 0 && <p className="text-xs text-slate-400 mt-1">Sin usar: {preview.ignored.join(', ')}</p>}
              {!preview.mapped.fecha && <p className="text-xs text-red-700 mt-1">Falta una columna de fecha (ej. “Fecha”).</p>}
            </div>
          </>
        )}
        {msg && <p className={`text-sm ${msg.startsWith('No') ? 'text-red-700' : 'text-emerald-700'}`}>{msg}</p>}
      </div>
      <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
        <button
          type="button"
          disabled={!preview || busy || !preview.mapped.fecha}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await onImport(preview.objects);
              setMsg(`Listo: ${r.nuevos} nuevos y ${r.actualizados} actualizados.`);
            } catch (err) {
              setMsg(`No se pudo importar: ${err.message}`);
            } finally {
              setBusy(false);
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {busy && <Loader2 size={14} className="animate-spin" />} Importar {preview ? preview.objects.length : ''} registros
        </button>
      </div>
    </Overlay>
  );
}

function CopyBlock({ text, label }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-white/90 border border-slate-200 px-2 py-1 text-xs font-semibold"
        aria-label={`Copiar ${label}`}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copiado' : 'Copiar'}
      </button>
      <pre className="rounded-lg bg-slate-900 text-slate-100 text-xs p-3 pr-20 overflow-x-auto whitespace-pre">{text}</pre>
    </div>
  );
}

function ConnectModal({ onClose, projectName }) {
  const endpoint = `${window.location.origin}/api/correspondencia/ingesta?proyecto=${CURRENT_PROJECT_ID}`;
  const script = `// InterventorIA: envía la correspondencia de esta hoja al proyecto "${projectName}".
// Pega esto en Extensiones > Apps Script de la hoja donde tu script guarda los correos.
const URL_INTERVENTORIA = '${endpoint}';
const CLAVE = '';          // solo si configuraste INTEGRACION_TOKEN en Vercel
const PESTANA = '';        // nombre de la pestaña; vacío = la primera

function enviarCorrespondencia() {
  const libro = SpreadsheetApp.getActive();
  const hoja = PESTANA ? libro.getSheetByName(PESTANA) : libro.getSheets()[0];
  const filas = hoja.getDataRange().getValues();
  const encabezados = filas.shift();
  const items = filas
    .filter(f => f.some(v => String(v).trim()))
    .map(f => Object.fromEntries(encabezados.map((h, i) => [h,
      f[i] instanceof Date ? Utilities.formatDate(f[i], 'America/Bogota', 'yyyy-MM-dd') : f[i]])));
  for (let i = 0; i < items.length; i += 300) {
    const res = UrlFetchApp.fetch(URL_INTERVENTORIA, {
      method: 'post',
      contentType: 'application/json',
      headers: CLAVE ? { 'x-integracion-token': CLAVE } : {},
      payload: JSON.stringify({ fuente: 'apps-script', items: items.slice(i, i + 300) }),
      muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) throw new Error(res.getContentText());
    Logger.log(res.getContentText());
  }
}

// Ejecútala una vez: deja la sincronización corriendo cada 15 minutos
function programarCada15Minutos() {
  ScriptApp.newTrigger('enviarCorrespondencia').timeBased().everyMinutes(15).create();
}`;

  return (
    <Overlay onClose={onClose} label="Conectar hoja de Google">
      <PanelHeader title="Conectar la hoja de Google" subtitle="Tu Apps Script ya vuelca los correos en una hoja; este código envía esa hoja a InterventorIA." onClose={onClose} />
      <div className="flex-1 overflow-y-auto px-5 py-4 text-sm flex flex-col gap-4 text-slate-700">
        <ol className="list-decimal pl-5 flex flex-col gap-1.5">
          <li>Abre la hoja y entra a <strong>Extensiones → Apps Script</strong>.</li>
          <li>Crea un archivo nuevo, pega el código y guárdalo.</li>
          <li>Ejecuta <code>enviarCorrespondencia</code> una vez y acepta los permisos.</li>
          <li>Ejecuta <code>programarCada15Minutos</code> para que se sincronice sola.</li>
        </ol>
        <p>
          Los encabezados de tu hoja se reconocen solos: Fecha, De/Remitente, Para, Asunto, Radicado, Id del mensaje, Thread ID, Link, Estado, Fecha límite, Frente, Notas…
          Reenviar las mismas filas no crea duplicados y no cambia lo que hayas editado aquí.
        </p>
        <CopyBlock label="código de Apps Script" text={script} />
        <div>
          <p className="font-semibold">Dirección de envío</p>
          <CopyBlock label="dirección" text={endpoint} />
        </div>
      </div>
    </Overlay>
  );
}

function NewItemModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ tipo: 'recibido', fecha: todayLocalIso(), remitente: '', destinatario: '', asunto: '', radicado: '', parte: 'contratista', resumen: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <Overlay onClose={onClose} label="Registrar oficio">
      <PanelHeader title="Registrar oficio o comunicación" onClose={onClose} />
      <div className="flex-1 overflow-y-auto px-5 py-4 text-sm grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1"><span className="text-slate-600">Tipo</span>
          <select value={form.tipo} onChange={(e) => set('tipo', e.target.value)} className={fieldCls}><option value="recibido">Recibido</option><option value="enviado">Enviado</option></select>
        </label>
        <label className="flex flex-col gap-1"><span className="text-slate-600">Fecha</span><input type="date" value={form.fecha} onChange={(e) => set('fecha', e.target.value)} className={fieldCls} /></label>
        <label className="flex flex-col gap-1"><span className="text-slate-600">{form.tipo === 'recibido' ? 'Remitente' : 'Destinatario'}</span>
          <input value={form.tipo === 'recibido' ? form.remitente : form.destinatario} onChange={(e) => set(form.tipo === 'recibido' ? 'remitente' : 'destinatario', e.target.value)} className={fieldCls} />
        </label>
        <label className="flex flex-col gap-1"><span className="text-slate-600">Parte</span>
          <select value={form.parte} onChange={(e) => set('parte', e.target.value)} className={fieldCls}>{Object.entries(PARTES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </label>
        <label className="flex flex-col gap-1 col-span-2"><span className="text-slate-600">Asunto</span><input value={form.asunto} onChange={(e) => set('asunto', e.target.value)} className={fieldCls} /></label>
        <label className="flex flex-col gap-1"><span className="text-slate-600">Radicado</span><input value={form.radicado} onChange={(e) => set('radicado', e.target.value)} className={fieldCls} /></label>
        <label className="flex flex-col gap-1 col-span-2"><span className="text-slate-600">Resumen</span><textarea value={form.resumen} onChange={(e) => set('resumen', e.target.value)} rows={3} className={fieldCls} /></label>
        {msg && <p className="col-span-2 text-red-700">{msg}</p>}
      </div>
      <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
        <button
          type="button"
          disabled={busy || !form.asunto.trim() || !form.fecha}
          onClick={async () => { setBusy(true); try { await onCreate({ ...form, canal: 'oficio' }); } catch (err) { setMsg(`No se pudo registrar: ${err.message}`); setBusy(false); } }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {busy && <Loader2 size={14} className="animate-spin" />} Registrar
        </button>
      </div>
    </Overlay>
  );
}
