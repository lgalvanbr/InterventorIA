import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, FileText, X, Loader2, AlertCircle, Download, ArrowLeft } from 'lucide-react';
import { InterventorIAWordmark } from './InterventorIAMark';
import { validateProjectConfig } from '../data/projectConfig';
import { projectHomeUrl } from '../data/projectSession';

const MAX_TOTAL_BYTES = 3.2 * 1024 * 1024; // el servidor acepta ~4,5 MB y el PDF viaja en Base64
const headingStyle = { fontFamily: "'Archivo', sans-serif", fontStretch: '80%', fontWeight: 700 };

const slugify = (text) => String(text || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

const readAsBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
  reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}`));
  reader.readAsDataURL(file);
});

// Convierte cada archivo a lo que el asistente puede leer: texto (Excel/CSV) o PDF en Base64
async function prepareFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) {
    return { nombre: file.name, tipo: 'pdf', contenido: await readAsBase64(file), bytes: Math.ceil(file.size * 1.37) };
  }
  if (name.endsWith('.xlsx')) {
    const { default: readExcelFile } = await import('read-excel-file/browser');
    const sheets = await readExcelFile(file);
    const text = sheets.map(({ sheet, data }) =>
      `Hoja "${sheet}":\n${data.map(row => row.map(v => (v instanceof Date ? v.toISOString().slice(0, 10) : v ?? '')).join('\t')).join('\n')}`
    ).join('\n\n');
    return { nombre: file.name, tipo: 'texto', contenido: text, bytes: text.length };
  }
  if (/\.(csv|tsv|txt|md|json)$/.test(name)) {
    const text = await file.text();
    return { nombre: file.name, tipo: 'texto', contenido: text, bytes: text.length };
  }
  throw new Error(`${file.name}: formato no admitido. Usa Excel (.xlsx), CSV, texto o PDF.`);
}

function Field({ label, children, hint }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-semibold text-slate-700">{label}</span>
      {children}
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

const inputCls = 'rounded-lg border-slate-300 bg-white text-sm focus:border-[#2b3138] focus:ring-[#2b3138]';

export default function ProjectAssistant() {
  const [step, setStep] = useState('compartir'); // compartir | revisar
  const [files, setFiles] = useState([]); // { nombre, tipo, contenido, bytes }
  const [texto, setTexto] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [proyecto, setProyecto] = useState(null);
  const [notas, setNotas] = useState([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  useEffect(() => { document.title = 'InterventorIA – Nuevo proyecto'; }, []);
  const jsonInputRef = useRef(null);

  const totalBytes = files.reduce((n, f) => n + f.bytes, 0);
  const errores = useMemo(() => (proyecto ? validateProjectConfig(proyecto) : []), [proyecto]);

  const addFiles = async (list) => {
    setError('');
    try {
      const prepared = await Promise.all(Array.from(list).map(prepareFile));
      setFiles(prev => [...prev, ...prepared]);
    } catch (err) {
      setError(err.message);
    }
  };

  const generate = async () => {
    if (totalBytes > MAX_TOTAL_BYTES) {
      setError('Los archivos superan 3 MB en total. Comparte el listado de frentes en Excel y deja fuera los PDF más pesados.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/proyectos/asistente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto, archivos: files.map(({ nombre, tipo, contenido }) => ({ nombre, tipo, contenido })) })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `El asistente respondió HTTP ${res.status}.`);
      setProyecto({ ...data.proyecto, id: slugify(data.proyecto.id || data.proyecto.nombre) });
      setNotas(data.notas || []);
      setStep('revisar');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const importJson = async (file) => {
    setError('');
    try {
      const parsed = JSON.parse(await file.text());
      setProyecto(parsed);
      setNotas(['Proyecto importado desde archivo; revisa los datos antes de crearlo.']);
      setStep('revisar');
    } catch {
      setError('El archivo no es un proyecto válido de InterventorIA (JSON).');
    }
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(proyecto, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${proyecto.id || 'proyecto'}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const update = (path, value) => {
    setProyecto(prev => {
      const next = structuredClone(prev);
      let target = next;
      path.slice(0, -1).forEach(k => { target[k] = target[k] ?? {}; target = target[k]; });
      target[path[path.length - 1]] = value;
      return next;
    });
  };

  const create = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/proyectos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crear: true, proyecto })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.errores?.join(' ') || data.error || `HTTP ${res.status}`);
      window.location.href = projectHomeUrl(proyecto.id);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eef0f2] text-[#2b3138]">
      <header className="max-w-3xl mx-auto px-5 pt-8 pb-4 flex items-center justify-between gap-4">
        <InterventorIAWordmark size={26} />
        <a href="/?mode=proyectos" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 no-underline hover:text-[#2b3138]">
          <ArrowLeft size={16} /> Proyectos
        </a>
      </header>

      <main className="max-w-3xl mx-auto px-5 pb-20">
        <h1 className="text-3xl sm:text-4xl leading-tight" style={headingStyle}>Nuevo proyecto</h1>

        {step === 'compartir' && (
          <>
            <p className="mt-2 text-slate-600 max-w-xl">
              Comparte los documentos del proyecto y el asistente arma un borrador con la interventoría, los contratos y sus frentes.
              Lo revisas antes de crearlo.
            </p>

            <section className="mt-8 bg-white rounded-xl p-5 flex flex-col gap-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
                className="rounded-xl border-2 border-dashed border-slate-300 p-6 text-center"
              >
                <Upload className="mx-auto text-slate-400" size={28} />
                <p className="mt-2 text-sm text-slate-600">
                  Arrastra aquí el listado de frentes (Excel o CSV), actas o contratos (PDF).
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 rounded-lg bg-[#2b3138] text-white px-4 py-2 text-sm font-semibold hover:bg-[#3a424b]"
                >
                  Elegir archivos
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".xlsx,.csv,.tsv,.txt,.md,.json,.pdf"
                  className="hidden"
                  onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
                />
              </div>

              {files.length > 0 && (
                <ul className="flex flex-col gap-1.5">
                  {files.map((f, i) => (
                    <li key={`${f.nombre}-${i}`} className="flex items-center gap-2 text-sm">
                      <FileText size={16} className="text-slate-400 shrink-0" />
                      <span className="flex-1 truncate">{f.nombre}</span>
                      <span className="text-xs text-slate-500">{(f.bytes / 1024).toFixed(0)} KB</span>
                      <button type="button" onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} aria-label={`Quitar ${f.nombre}`} className="p-1 text-slate-400 hover:text-red-600">
                        <X size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <Field label="Indicaciones para el asistente" hint="Opcional. Ej.: “Interventoría ABC S.A.S., color #0b5d3b, contratos del IDU; la semana 1 empieza el sábado 7 de marzo de 2026.”">
                <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} className={inputCls} />
              </Field>

              {error && <p role="alert" className="text-sm font-semibold text-red-700 flex gap-1.5"><AlertCircle size={16} className="shrink-0 mt-0.5" />{error}</p>}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button type="button" onClick={() => jsonInputRef.current?.click()} className="text-sm font-semibold text-slate-600 underline">
                  Importar un proyecto (archivo .json)
                </button>
                <input ref={jsonInputRef} type="file" accept=".json" className="hidden" onChange={(e) => { if (e.target.files[0]) importJson(e.target.files[0]); e.target.value = ''; }} />
                <button
                  type="button"
                  onClick={generate}
                  disabled={busy || (!files.length && !texto.trim())}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2b3138] text-white px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
                >
                  {busy && <Loader2 size={16} className="animate-spin" />}
                  {busy ? 'Armando el borrador… (puede tardar un minuto)' : 'Armar borrador'}
                </button>
              </div>
            </section>
          </>
        )}

        {step === 'revisar' && proyecto && (
          <>
            <p className="mt-2 text-slate-600 max-w-xl">Revisa y corrige el borrador. Nada se guarda hasta que pulses “Crear proyecto”.</p>

            {notas.length > 0 && (
              <section className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
                <h2 className="text-sm font-bold text-amber-900">Para revisar</h2>
                <ul className="mt-2 list-disc pl-5 text-sm text-amber-900 flex flex-col gap-1">
                  {notas.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              </section>
            )}

            <section className="mt-6 bg-white rounded-xl p-5 grid gap-4 sm:grid-cols-2">
              <Field label="Nombre del proyecto"><input className={inputCls} value={proyecto.nombre || ''} onChange={(e) => update(['nombre'], e.target.value)} /></Field>
              <Field label="Identificador en la dirección" hint={`Quedará en /?p=${proyecto.id || '…'}`}>
                <input className={inputCls} value={proyecto.id || ''} onChange={(e) => update(['id'], slugify(e.target.value))} />
              </Field>
              <Field label="Interventoría"><input className={inputCls} value={proyecto.marca?.nombre || ''} onChange={(e) => update(['marca', 'nombre'], e.target.value)} /></Field>
              <Field label="Color de la marca">
                <span className="flex items-center gap-2">
                  <input type="color" value={/^#[0-9a-f]{6}$/i.test(proyecto.marca?.color || '') ? proyecto.marca.color : '#1f3a5f'} onChange={(e) => update(['marca', 'color'], e.target.value)} className="h-10 w-14 rounded border border-slate-300" />
                  <input className={`${inputCls} flex-1`} value={proyecto.marca?.color || ''} onChange={(e) => update(['marca', 'color'], e.target.value)} />
                </span>
              </Field>
              <Field label="URL del logo" hint="Opcional; si se deja vacío se usan las iniciales."><input className={inputCls} value={proyecto.marca?.logoUrl || ''} onChange={(e) => update(['marca', 'logoUrl'], e.target.value)} /></Field>
              <Field label="Contratante"><input className={inputCls} value={proyecto.contratante || ''} onChange={(e) => update(['contratante'], e.target.value)} /></Field>
              <Field label="Ubicación"><input className={inputCls} value={proyecto.ubicacion || ''} onChange={(e) => update(['ubicacion'], e.target.value)} /></Field>
              <Field label="Contrato de interventoría"><input className={inputCls} value={proyecto.interventoria?.contrato || ''} onChange={(e) => update(['interventoria', 'contrato'], e.target.value)} /></Field>
              <Field label="Primera semana: número"><input type="number" className={inputCls} value={proyecto.calendario?.numeroPrimeraSemana ?? 1} onChange={(e) => update(['calendario', 'numeroPrimeraSemana'], Number(e.target.value))} /></Field>
              <Field label="Primera semana: fecha de inicio"><input type="date" className={inputCls} value={proyecto.calendario?.fechaInicioPrimeraSemana || ''} onChange={(e) => update(['calendario', 'fechaInicioPrimeraSemana'], e.target.value)} /></Field>
            </section>

            <section className="mt-6 flex flex-col gap-4">
              {(proyecto.contratos || []).map((c, i) => {
                const sinCoordenadas = (c.frentes || []).filter(f => !f.lat || !f.lng).length;
                return (
                  <div key={i} className="bg-white rounded-xl p-5">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Field label={`Contrato ${i + 1}`}><input className={inputCls} value={c.nombreCorto || ''} onChange={(e) => update(['contratos', i, 'nombreCorto'], e.target.value)} /></Field>
                      <Field label="Número"><input className={inputCls} value={c.numero || ''} onChange={(e) => update(['contratos', i, 'numero'], e.target.value)} /></Field>
                      <Field label="Contratista"><input className={inputCls} value={c.contratista || ''} onChange={(e) => update(['contratos', i, 'contratista'], e.target.value)} /></Field>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                      {(c.frentes || []).length} frentes{sinCoordenadas > 0 && <span className="text-amber-700"> · {sinCoordenadas} sin coordenadas (no aparecerán en el mapa)</span>}
                    </p>
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="text-left text-slate-500">
                          <tr><th className="py-1 pr-3 font-semibold">CIV</th><th className="pr-3 font-semibold">Eje</th><th className="pr-3 font-semibold">Tramo</th><th className="font-semibold">Coordenadas</th></tr>
                        </thead>
                        <tbody>
                          {(c.frentes || []).slice(0, 8).map((f, j) => (
                            <tr key={j} className="border-t border-slate-100">
                              <td className="py-1 pr-3">{f.civ || '—'}</td>
                              <td className="pr-3">{f.eje}</td>
                              <td className="pr-3">{f.desde} – {f.hasta}</td>
                              <td>{f.lat && f.lng ? `${f.lat}, ${f.lng}` : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {(c.frentes || []).length > 8 && <p className="mt-1 text-xs text-slate-500">y {(c.frentes || []).length - 8} frentes más</p>}
                    </div>
                  </div>
                );
              })}
            </section>

            {errores.length > 0 && (
              <ul role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 list-disc pl-8">
                {errores.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
            {error && <p role="alert" className="mt-4 text-sm font-semibold text-red-700">{error}</p>}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep('compartir')} className="text-sm font-semibold text-slate-600 underline">Volver a compartir</button>
                <button type="button" onClick={downloadJson} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 underline"><Download size={14} /> Descargar borrador</button>
              </div>
              <button
                type="button"
                onClick={create}
                disabled={saving || errores.length > 0}
                className="inline-flex items-center gap-2 rounded-lg bg-[#2b3138] text-white px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                Crear proyecto
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
