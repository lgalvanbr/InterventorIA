import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Save, RotateCcw, Sparkles } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { contractForFrente } from '../data/projectConfig';
import { apiPath } from '../data/projectSession';
import { weekActivities, consolidateActivities, linesToText, groupBlocks, blocksToExcel, blocksToText } from '../data/actividades';

const FINISHED_TEXT = '-Este frente ya finalizó.';
const excelCell = (text) => `"${text.replace(/"/g, '""')}"`;

// "(Espacio público) PK ID 7021" para los contratos que no son el primero
function frenteSuffix(project, frenteId) {
  const contratos = project?.contratos || [];
  const c = contractForFrente(project, frenteId);
  if (!c || contratos.indexOf(c) === 0) return '';
  const index = Number(String(frenteId).slice(c.prefijo.length + 1)) - 1;
  const pk = c.frentes?.[index]?.pk;
  return ` (${c.nombreCorto || c.nombre})${pk ? ` PK ID ${pk}` : ''}`;
}

function CopyButton({ block, copied, onCopy }) {
  if (!block) return null;
  const key = block.ids.join(',');
  const done = copied === key;
  return (
    <button type="button" onClick={() => onCopy(block)}
      title={block.ids.length > 1 ? 'Copiar el bloque de estos frentes' : 'Copiar este frente'}
      className={`text-[11px] font-bold px-2 py-1 rounded flex items-center gap-1 border ${done ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>
      {done ? <Check size={12} /> : <Copy size={12} />} {done ? 'Copiado' : 'Copiar'}
    </button>
  );
}

// Pestaña "Actividades": área técnica concisa por frente, a partir de las bitácoras de la semana
export default function ActividadesSemana({ report, weeklyReports, onUpdateReports, readOnly }) {
  const project = useProject();
  const [drafts, setDrafts] = useState({});
  const [includeFinished, setIncludeFinished] = useState(true);
  const [copyFormat, setCopyFormat] = useState('excel'); // 'excel' | 'texto'
  const [status, setStatus] = useState({ saving: false, ai: false, msg: '', error: '' });
  const [copied, setCopied] = useState('');

  useEffect(() => { setDrafts({}); }, [report.id_informe]);

  // Orden del informe: por contrato y número de frente (MV 1, 2, ... luego EP 101, ...)
  const rows = useMemo(() => [...(report.frentes || [])].sort((a, b) => {
    const ca = (project?.contratos || []).indexOf(contractForFrente(project, a.id));
    const cb = (project?.contratos || []).indexOf(contractForFrente(project, b.id));
    return ca - cb || (parseInt(a.frente, 10) || 0) - (parseInt(b.frente, 10) || 0);
  }).map(f => {
    const all = weekActivities(f);
    return {
      f,
      all,
      auto: linesToText(consolidateActivities(all)),
      saved: String(f.actividades_ejecutadas_hitos || '').trim(),
      finished: (parseFloat(f.porcentaje_avance_semana) || 0) >= 100,
      suffix: frenteSuffix(project, f.id)
    };
  }), [report, project]);

  const textOf = (r) => drafts[r.f.id] ?? (r.saved || r.auto || (r.finished && includeFinished ? FINISHED_TEXT : ''));
  const blocks = groupBlocks(rows
    .map(r => ({ id: r.f.id, frente: r.f.frente, civ: r.f.civ, sufijo: r.suffix, texto: textOf(r) }))
    .filter(it => it.texto.trim()));
  const blockOf = (id) => blocks.find(b => b.ids.includes(id));
  const visible = rows.filter(r => textOf(r).trim() || r.all.length);
  const withoutActivity = rows.filter(r => !textOf(r).trim() && !r.all.length);
  const dirty = Object.keys(drafts).length > 0;

  const copy = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(c => (c === key ? '' : c)), 2000);
    } catch {
      setStatus(s => ({ ...s, error: 'No se pudo copiar. Selecciona el texto de la vista previa y cópialo a mano.' }));
    }
  };
  const copyAll = () => {
    const texts = blocks.map(b => b.text);
    copy('all', copyFormat === 'excel' ? blocksToExcel(texts) : blocksToText(texts));
  };
  const copyBlock = (block) => copy(block.ids.join(','), copyFormat === 'excel' ? excelCell(block.text) : block.text);

  const summarizeWithAI = async () => {
    const frentes = rows.filter(r => r.all.length).map(r => ({ id: r.f.id, frente: r.f.frente, lineas: r.all }));
    if (!frentes.length) return;
    setStatus({ saving: false, ai: true, msg: '', error: '' });
    try {
      const res = await fetch(apiPath('/api/actividades/resumir'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frentes })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const next = {};
      for (const item of data.frentes || []) {
        if (rows.some(r => r.f.id === item.id) && item.texto?.trim()) next[item.id] = item.texto.trim();
      }
      setDrafts(d => ({ ...d, ...next }));
      setStatus({ saving: false, ai: false, msg: `Resumen con IA listo en ${Object.keys(next).length} frentes. Revísalo y guarda.`, error: '' });
    } catch (err) {
      setStatus({ saving: false, ai: false, msg: '', error: err.message || 'La IA no respondió.' });
    }
  };

  const save = async () => {
    setStatus({ saving: true, ai: false, msg: '', error: '' });
    const frentes = report.frentes.map(f => (f.id in drafts ? { ...f, actividades_ejecutadas_hitos: drafts[f.id].trim() } : f));
    const updated = weeklyReports.map(r => (String(r.id_informe) === String(report.id_informe) ? { ...r, frentes } : r));
    try {
      await onUpdateReports(updated);
      setDrafts({});
      setStatus({ saving: false, ai: false, msg: 'Actividades guardadas en la nube.', error: '' });
      setTimeout(() => setStatus(s => ({ ...s, msg: '' })), 3000);
    } catch {
      setStatus({ saving: false, ai: false, msg: '', error: 'No se pudo guardar en la nube. Los cambios quedan en este equipo y se reenviarán al reconectar.' });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="text-sm text-slate-600">
          <p className="font-bold text-slate-800">Actividades en ejecución · Semana {report.numero_semana}</p>
          <p className="text-xs mt-0.5 max-w-2xl">
            Consolidado de lo más relevante de las bitácoras de cada frente (sin conversación, personal, aseo ni acopios).
            Ajusta el texto si hace falta y guarda: queda en los hitos del frente y en el informe mensual.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div role="group" aria-label="Formato de copiado" className="flex rounded border border-slate-200 overflow-hidden text-[11px] font-bold">
            {[['excel', 'Excel'], ['texto', 'Word / texto']].map(([key, label]) => (
              <button key={key} type="button" aria-pressed={copyFormat === key} onClick={() => setCopyFormat(key)}
                className={`px-2.5 py-1.5 ${copyFormat === key ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>
                {label}
              </button>
            ))}
          </div>
          <button type="button" onClick={copyAll} disabled={!blocks.length}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded flex items-center gap-1.5">
            {copied === 'all' ? <Check size={14} /> : <Copy size={14} />} {copied === 'all' ? 'Copiado' : 'Copiar todo'}
          </button>
          {!readOnly && (
            <>
              <button type="button" onClick={summarizeWithAI} disabled={status.ai || !rows.some(r => r.all.length)}
                title="Redacta cada frente en estilo de informe con Claude"
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold px-3 py-2 rounded flex items-center gap-1.5">
                <Sparkles size={14} /> {status.ai ? 'Resumiendo…' : 'Resumir con IA'}
              </button>
              <button type="button" onClick={save} disabled={!dirty || status.saving}
                className="bg-slate-900 hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-bold px-3 py-2 rounded flex items-center gap-1.5">
                <Save size={14} /> {status.saving ? 'Guardando…' : 'Guardar'}
              </button>
            </>
          )}
        </div>
      </div>

      {status.error && <div role="alert" className="bg-red-50 border border-red-200 text-red-800 text-xs font-bold px-4 py-3 rounded-lg">{status.error}</div>}
      {status.msg && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-4 py-3 rounded-lg">{status.msg}</div>}

      <label className="flex items-center gap-2 text-xs text-slate-600 select-none">
        <input type="checkbox" checked={includeFinished} onChange={e => setIncludeFinished(e.target.checked)} />
        Incluir “Este frente ya finalizó.” en frentes al 100 % sin actividad
      </label>

      <ul className="flex flex-col gap-3">
        {visible.map(r => {
          const text = textOf(r);
          const edited = r.f.id in drafts || (r.saved && r.saved !== r.auto);
          return (
            <li key={r.f.id} className="bg-white border border-slate-200 rounded-lg p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <p className="text-xs font-bold text-slate-800">
                  Frente {r.f.frente} <span className="font-normal text-slate-500">· CIV {r.f.civ}{r.suffix}</span>
                </p>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${edited ? 'text-amber-600' : 'text-slate-400'}`}>
                    {edited ? 'Editado' : 'Consolidado'}
                  </span>
                  {!readOnly && edited && r.auto && (
                    <button type="button" onClick={() => setDrafts(d => ({ ...d, [r.f.id]: r.auto }))}
                      title="Volver al consolidado automático de las bitácoras"
                      className="text-slate-500 hover:text-slate-800 text-[11px] font-semibold flex items-center gap-1">
                      <RotateCcw size={12} /> Regenerar
                    </button>
                  )}
                  <CopyButton block={blockOf(r.f.id)} copied={copied} onCopy={copyBlock} />
                </div>
              </div>
              <textarea
                value={text}
                readOnly={readOnly}
                onChange={e => setDrafts(d => ({ ...d, [r.f.id]: e.target.value }))}
                rows={Math.min(10, Math.max(2, text.split('\n').length + 1))}
                aria-label={`Área técnica del frente ${r.f.frente}`}
                className="w-full text-xs font-mono leading-relaxed border border-slate-200 rounded p-2 focus:outline-none focus:border-primary"
              />
              {r.all.length > 0 && (
                <details className="mt-1.5">
                  <summary className="text-[11px] text-slate-500 cursor-pointer select-none">
                    Ver todo lo registrado en la bitácora ({r.all.length} líneas)
                  </summary>
                  <ul className="mt-1.5 text-[11px] text-slate-600 leading-relaxed list-disc pl-5">
                    {r.all.map((line, i) => <li key={i}>{line}</li>)}
                  </ul>
                </details>
              )}
            </li>
          );
        })}
        {withoutActivity.length > 0 && (
          <li className="text-xs text-slate-500 px-1">
            Sin registros esta semana: {withoutActivity.map(r => `Frente ${r.f.frente}`).join(', ')}.
          </li>
        )}
      </ul>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Vista previa del informe</p>
        <pre className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs whitespace-pre-wrap leading-relaxed max-h-[60vh] overflow-auto">
          {blocks.length ? blocksToText(blocks.map(b => b.text)) : 'No hay actividades registradas en las bitácoras de esta semana.'}
        </pre>
      </div>
    </div>
  );
}
