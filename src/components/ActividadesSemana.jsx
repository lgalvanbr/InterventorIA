import React, { useEffect, useMemo, useState } from 'react';
import { Check, Save, RotateCcw, Table, FileText } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { contractForFrente } from '../data/projectConfig';
import { weekActivities, linesToText, buildBlocks, blocksToExcel, blocksToText } from '../data/actividades';

const FINISHED_TEXT = '-Este frente ya finalizó.';

// "(Espacio público) PK ID 7021" para los contratos que no son el primero
function frenteSuffix(project, frenteId) {
  const contratos = project?.contratos || [];
  const c = contractForFrente(project, frenteId);
  if (!c || contratos.indexOf(c) === 0) return '';
  const index = Number(String(frenteId).slice(c.prefijo.length + 1)) - 1;
  const pk = c.frentes?.[index]?.pk;
  return ` (${c.nombreCorto || c.nombre})${pk ? ` PK ID ${pk}` : ''}`;
}

// Pestaña "Actividades": área técnica por frente, sacada de las bitácoras de la semana
export default function ActividadesSemana({ report, weeklyReports, onUpdateReports, readOnly }) {
  const project = useProject();
  const [drafts, setDrafts] = useState({});
  const [includeFinished, setIncludeFinished] = useState(true);
  const [status, setStatus] = useState({ saving: false, msg: '', error: '' });
  const [copied, setCopied] = useState('');

  useEffect(() => { setDrafts({}); }, [report.id_informe]);

  // Orden del informe: por contrato y número de frente (MV 1, 2, ... luego EP 101, ...)
  const rows = useMemo(() => [...(report.frentes || [])].sort((a, b) => {
    const ca = (project?.contratos || []).indexOf(contractForFrente(project, a.id));
    const cb = (project?.contratos || []).indexOf(contractForFrente(project, b.id));
    return ca - cb || (parseInt(a.frente, 10) || 0) - (parseInt(b.frente, 10) || 0);
  }).map(f => {
    const auto = linesToText(weekActivities(f));
    const saved = String(f.actividades_ejecutadas_hitos || '').trim();
    const finished = (parseFloat(f.porcentaje_avance_semana) || 0) >= 100;
    return { f, auto, saved, finished, suffix: frenteSuffix(project, f.id) };
  }), [report, project]);

  const textOf = (r) => drafts[r.f.id] ?? (r.saved || r.auto || (r.finished && includeFinished ? FINISHED_TEXT : ''));
  const items = rows
    .map(r => ({ frente: r.f.frente, civ: r.f.civ, sufijo: r.suffix, texto: textOf(r) }))
    .filter(it => it.texto.trim());
  const blocks = buildBlocks(items);
  const withoutActivity = rows.filter(r => !textOf(r).trim());
  const dirty = Object.keys(drafts).length > 0;

  const copy = async (kind) => {
    const text = kind === 'excel' ? blocksToExcel(blocks) : blocksToText(blocks);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      setStatus(s => ({ ...s, error: 'No se pudo copiar. Selecciona el texto de la vista previa y cópialo a mano.' }));
    }
  };

  const save = async () => {
    setStatus({ saving: true, msg: '', error: '' });
    const frentes = report.frentes.map(f => (f.id in drafts ? { ...f, actividades_ejecutadas_hitos: drafts[f.id].trim() } : f));
    const updated = weeklyReports.map(r => (String(r.id_informe) === String(report.id_informe) ? { ...r, frentes } : r));
    try {
      await onUpdateReports(updated);
      setDrafts({});
      setStatus({ saving: false, msg: 'Actividades guardadas en la nube.', error: '' });
      setTimeout(() => setStatus(s => ({ ...s, msg: '' })), 3000);
    } catch {
      setStatus({ saving: false, msg: '', error: 'No se pudo guardar en la nube. Los cambios quedan en este equipo y se reenviarán al reconectar.' });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="text-sm text-slate-600">
          <p className="font-bold text-slate-800">Actividades en ejecución · Semana {report.numero_semana}</p>
          <p className="text-xs mt-0.5">
            Se arman con las líneas de <b>actividades técnicas</b> de las bitácoras de cada frente (sin clima, personal, maquinaria ni SST).
            Revisa y ajusta el texto; lo guardado queda en los hitos del frente y en el informe mensual.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button type="button" onClick={() => copy('excel')} disabled={!blocks.length}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded flex items-center gap-1.5">
            {copied === 'excel' ? <Check size={14} /> : <Table size={14} />} {copied === 'excel' ? 'Copiado' : 'Copiar para Excel'}
          </button>
          <button type="button" onClick={() => copy('word')} disabled={!blocks.length}
            className="bg-primary hover:bg-primary-container disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded flex items-center gap-1.5">
            {copied === 'word' ? <Check size={14} /> : <FileText size={14} />} {copied === 'word' ? 'Copiado' : 'Copiar texto (Word)'}
          </button>
          {!readOnly && (
            <button type="button" onClick={save} disabled={!dirty || status.saving}
              className="bg-slate-900 hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-bold px-3 py-2 rounded flex items-center gap-1.5">
              <Save size={14} /> {status.saving ? 'Guardando…' : 'Guardar'}
            </button>
          )}
        </div>
      </div>

      {status.error && <div role="alert" className="bg-red-50 border border-red-200 text-red-800 text-xs font-bold px-4 py-3 rounded-lg">{status.error}</div>}
      {status.msg && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-4 py-3 rounded-lg">{status.msg}</div>}

      <label className="flex items-center gap-2 text-xs text-slate-600 select-none">
        <input type="checkbox" checked={includeFinished} onChange={e => setIncludeFinished(e.target.checked)} />
        Incluir “Este frente ya finalizó.” en frentes al 100 % sin actividad
      </label>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
        <ul className="flex flex-col gap-3">
          {rows.filter(r => textOf(r).trim() || r.auto || r.saved).map(r => {
            const edited = r.f.id in drafts || (r.saved && r.saved !== r.auto);
            return (
              <li key={r.f.id} className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-xs font-bold text-slate-800">
                    Frente {r.f.frente} <span className="font-normal text-slate-500">· CIV {r.f.civ}{r.suffix}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wide ${edited ? 'text-amber-600' : 'text-slate-400'}`}>
                      {edited ? 'Editado' : 'Desde bitácora'}
                    </span>
                    {!readOnly && edited && r.auto && (
                      <button type="button" onClick={() => setDrafts(d => ({ ...d, [r.f.id]: r.auto }))}
                        title="Volver a armar el texto desde las bitácoras"
                        className="text-slate-500 hover:text-slate-800 text-[11px] font-semibold flex items-center gap-1">
                        <RotateCcw size={12} /> Regenerar
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  value={textOf(r)}
                  readOnly={readOnly}
                  onChange={e => setDrafts(d => ({ ...d, [r.f.id]: e.target.value }))}
                  rows={Math.min(14, Math.max(3, textOf(r).split('\n').length + 1))}
                  aria-label={`Área técnica del frente ${r.f.frente}`}
                  className="w-full text-xs font-mono leading-relaxed border border-slate-200 rounded p-2 focus:outline-none focus:border-primary"
                />
              </li>
            );
          })}
          {withoutActivity.length > 0 && (
            <li className="text-xs text-slate-500 px-1">
              Sin actividades esta semana: {withoutActivity.map(r => `Frente ${r.f.frente}`).join(', ')}.
            </li>
          )}
        </ul>

        <div className="xl:sticky xl:top-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Vista previa</p>
          <pre className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs whitespace-pre-wrap leading-relaxed max-h-[75vh] overflow-auto">
            {blocks.length ? blocksToText(blocks) : 'No hay actividades registradas en las bitácoras de esta semana.'}
          </pre>
        </div>
      </div>
    </div>
  );
}
