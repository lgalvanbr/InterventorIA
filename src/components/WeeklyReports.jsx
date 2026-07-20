import React, { useState, useEffect } from 'react';
import { calculateConsolidatedMetrics, cloneWeeklyReport } from '../data/reportsWeekly';
import { Calendar, Unlock, Save, PlusCircle, CheckCircle2, Search, TrendingUp, HelpCircle, DollarSign, Activity, Image as ImageIcon, FileText, ChevronRight } from 'lucide-react';

export default function WeeklyReports({ weeklyReports = [], onUpdateReports, onNavigateToDetail, isContractorMode }) {
  const [activeReportId, setActiveReportId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editedFrentes, setEditedFrentes] = useState([]);
  const [editedStartDate, setEditedStartDate] = useState('');
  const [editedEndDate, setEditedEndDate] = useState('');
  const [editedMvProg, setEditedMvProg] = useState('');
  const [editedEpProg, setEditedEpProg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  


  // Set default active report to the latest week
  useEffect(() => {
    if (weeklyReports.length > 0) {
      const exists = weeklyReports.some(r => r.id_informe === activeReportId);
      if (!exists) {
        // Sort reports by week number descending to find latest
        const sorted = [...weeklyReports].sort((a, b) => b.numero_semana - a.numero_semana);
        setActiveReportId(sorted[0].id_informe);
      }
    }
  }, [weeklyReports, activeReportId]);

  // Load report data into local edit state when active report changes
  const activeReport = weeklyReports.find(r => r.id_informe === activeReportId) || null;

  useEffect(() => {
    if (activeReport) {
      setEditedFrentes(activeReport.frentes || []);
      setEditedStartDate(activeReport.fecha_inicial_corte || '');
      setEditedEndDate(activeReport.fecha_final_corte || '');
      setEditedMvProg(String(activeReport.malla_vial_programado || 0));
      setEditedEpProg(String(activeReport.espacio_publico_programado || 0));
    }
  }, [activeReportId, activeReport]);

  if (weeklyReports.length === 0) {
    return (
      <div className="flex-1 p-gutter flex flex-col items-center justify-center min-h-screen text-slate-400">
        <Activity size={48} className="mb-2 text-slate-300" />
        <p className="text-sm font-semibold">Cargando informes históricos...</p>
      </div>
    );
  }

  // Handle local change of a frente field
  const handleFrenteFieldChange = (frenteId, field, value) => {
    setEditedFrentes(prev => 
      prev.map(f => {
        if (f.id === frenteId) {
          let typedValue = value;
          if (field === 'porcentaje_avance_semana') {
            typedValue = Math.max(0, Math.min(100, parseFloat(value) || 0));
          } else if (field === 'ejecucion_presupuestal_semana') {
            typedValue = Math.max(0, parseInt(value) || 0);
          }
          return { ...f, [field]: typedValue };
        }
        return f;
      })
    );
  };

  // Save current open week as a draft
  const handleSaveDraft = () => {
    if (!activeReport) return;

    setIsSaving(true);

    // Build updated report structure and recalculate execution indicators
    const currentReport = {
      ...activeReport,
      fecha_inicial_corte: editedStartDate,
      fecha_final_corte: editedEndDate,
      malla_vial_programado: parseFloat(editedMvProg) || 0,
      espacio_publico_programado: parseFloat(editedEpProg) || 0,
      frentes: editedFrentes
    };

    const recalculatedReport = calculateConsolidatedMetrics(editedFrentes, currentReport);

    const updatedReports = weeklyReports.map(r => 
      r.id_informe === activeReport.id_informe ? recalculatedReport : r
    );

    onUpdateReports(updatedReports);
    
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccessMsg('Avances guardados correctamente.');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    }, 500);
  };

  // Create next weekly report (clone from latest report)
  const handleCreateNextWeek = () => {
    const sorted = [...weeklyReports].sort((a, b) => b.numero_semana - a.numero_semana);
    const latestReport = sorted[0];

    const nextWeekDraft = cloneWeeklyReport(latestReport);
    const finalDraft = calculateConsolidatedMetrics(nextWeekDraft.frentes, nextWeekDraft);

    const updatedReports = [finalDraft, ...weeklyReports];
    onUpdateReports(updatedReports);
    setActiveReportId(finalDraft.id_informe);
    setSaveSuccessMsg(`Semana ${finalDraft.numero_semana} creada con éxito.`);
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };



  // Filter frentes on grid
  const filteredFrentes = editedFrentes.filter(f => 
    f.civ.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(f.frente).includes(searchTerm) ||
    f.eje.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.projectName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Quick stats calculations for display card
  const mvFrentesList = editedFrentes.filter(f => f.id.startsWith('f_mv'));
  const epFrentesList = editedFrentes.filter(f => f.id.startsWith('f_ep'));

  const currentMvAvg = mvFrentesList.length > 0 
    ? mvFrentesList.reduce((acc, f) => acc + (parseFloat(f.porcentaje_avance_semana) || 0), 0) / mvFrentesList.length
    : 0;

  const currentEpAvg = epFrentesList.length > 0
    ? epFrentesList.reduce((acc, f) => acc + (parseFloat(f.porcentaje_avance_semana) || 0), 0) / epFrentesList.length
    : 0;

  // Recalculated values on current edit state for previews
  const previewMvExec = Math.max(0, Math.min(1, (currentMvAvg - 16.8) / 100));
  const previewEpExec = Math.max(0, Math.min(1, (currentEpAvg - 58.7) / 100));

  const diffMv = previewMvExec - (parseFloat(editedMvProg) || 0);
  const diffEp = previewEpExec - (parseFloat(editedEpProg) || 0);



  return (
    <div className="flex-1 p-gutter max-w-container-max mx-auto min-h-screen pb-16">
      
      {/* View Header */}
      <section className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-gutter border-b border-slate-200 pb-6">
        <div>
          <h2 className="font-headline-lg text-3xl font-extrabold text-primary mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-3xl">history</span>
            Historial e Informes Semanales
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            Registro cronológico del avance del proyecto. Registra novedades, bitácoras y fotos semanales detalladas por cada frente.
          </p>
        </div>

        {/* Toolbar: Dropdown & Create Button */}
        <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0 shrink-0">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded px-3 py-1.5">
            <span className="text-slate-400 text-xs font-bold font-mono">Semana:</span>
            <select
              value={activeReportId}
              onChange={(e) => setActiveReportId(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              {[...weeklyReports]
                .sort((a, b) => b.numero_semana - a.numero_semana)
                .map(r => (
                  <option key={r.id_informe} value={r.id_informe}>
                    Semana {r.numero_semana} ({r.fecha_inicial_corte} a {r.fecha_final_corte})
                  </option>
                ))
              }
            </select>
          </div>

          {!isContractorMode && (
            <button
              onClick={handleCreateNextWeek}
              className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold px-4 py-2 rounded transition-all flex items-center gap-1.5"
            >
              <PlusCircle size={14} />
              Crear Semana Siguiente
            </button>
          )}

          <button
            onClick={() => onNavigateToDetail(activeReportId, null)}
            className="bg-primary hover:bg-primary-container text-white text-xs font-bold px-4 py-2 rounded transition-all flex items-center gap-1.5 shadow"
          >
            <FileText size={14} />
            Ver Informe
            <ChevronRight size={13} />
          </button>
        </div>
      </section>

      {/* Success Notification Bar */}
      {saveSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600" />
          {saveSuccessMsg}
        </div>
      )}

      {activeReport && (
        <div className="flex flex-col gap-6">

          {/* Consolidado Stats and Meta Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Meta Semana Card */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col gap-4">
              <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Calendar size={16} className="text-primary" />
                Fechas de Corte y Estado
              </h4>

              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-500">Estado del Informe:</span>
                  <span className={`${
                    isContractorMode ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  } text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1`}>
                    <Unlock size={10} className={isContractorMode ? 'text-amber-600' : 'text-emerald-600'} />
                    {isContractorMode ? 'SOLO LECTURA' : 'ACTIVO (Editable)'}
                  </span>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Fecha Inicial</label>
                  <input
                    type="date"
                    disabled={isContractorMode}
                    value={editedStartDate}
                    onChange={(e) => setEditedStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-primary focus:outline-none disabled:opacity-75 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Fecha Final</label>
                  <input
                    type="date"
                    disabled={isContractorMode}
                    value={editedEndDate}
                    onChange={(e) => setEditedEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-primary focus:outline-none disabled:opacity-75 disabled:bg-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Malla Vial Progress Card */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2.5">
                  <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp size={16} className="text-primary" />
                    Malla Vial (Consolidado)
                  </h4>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-primary">Contrato 01</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 my-2 text-center">
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Programado</span>
                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        max="1.0"
                        disabled={isContractorMode}
                        value={editedMvProg}
                        onChange={(e) => setEditedMvProg(e.target.value)}
                        className="w-16 bg-white border border-slate-200 text-center font-mono-numbers text-sm font-bold p-1 rounded focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                      />
                      <span className="text-[10px] text-slate-400">x100</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Ejecutado</span>
                    <span className="font-mono-numbers text-xl font-extrabold text-primary">
                      {(previewMvExec * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-400">Diferencia Acumulada:</span>
                <span className={`font-extrabold font-mono-numbers px-2 py-0.5 rounded ${
                  diffMv >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}>
                  {diffMv >= 0 ? '+' : ''}{(diffMv * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Espacio Público Progress Card */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2.5">
                  <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp size={16} className="text-amber-600" />
                    Espacio Público (Consolidado)
                  </h4>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800">Contrato 02</span>
                </div>

                <div className="grid grid-cols-2 gap-4 my-2 text-center">
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Programado</span>
                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        max="1.0"
                        disabled={isContractorMode}
                        value={editedEpProg}
                        onChange={(e) => setEditedEpProg(e.target.value)}
                        className="w-16 bg-white border border-slate-200 text-center font-mono-numbers text-sm font-bold p-1 rounded focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                      />
                      <span className="text-[10px] text-slate-400">x100</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Ejecutado</span>
                    <span className="font-mono-numbers text-xl font-extrabold text-amber-600">
                      {(previewEpExec * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-400">Diferencia Acumulada:</span>
                <span className={`font-extrabold font-mono-numbers px-2 py-0.5 rounded ${
                  diffEp >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}>
                  {diffEp >= 0 ? '+' : ''}{(diffEp * 100).toFixed(1)}%
                </span>
              </div>
            </div>

          </div>

          {/* Form / DataGrid Table Container */}
          <div className="bg-white border border-slate-200 rounded-lg flex flex-col overflow-hidden">
            
            {/* Table Header Controls */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-700 text-sm">Avances de Obra por Frente</h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  {isContractorMode ? '📋 Consola de Consulta del Contratista (Solo Lectura).' : activeReport.estado_informe === 'cerrado' ? '🔒 Registros archivados de solo lectura. Habilita edición arriba para cambiar.' : '✍️ Edita los hitos de avance o haz clic en "Ver Detalle" para subir fotos y bitácoras'}
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar CIV o Frente..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded bg-white text-xs focus:outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Interactive Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 w-20">Frente</th>
                    <th className="py-3 px-4 w-28">CIV ID</th>
                    <th className="py-3 px-4 min-w-[200px]">Nomenclatura / Eje</th>
                    <th className="py-3 px-4 w-28 text-center">% Avance Físico</th>
                    <th className="py-3 px-4 w-36">Inversión Semana ($)</th>
                    <th className="py-3 px-4 min-w-[280px]">Novedad (Hitos)</th>
                    <th className="py-3 px-4 w-24 text-center">Fotos</th>
                    <th className="py-3 px-4 w-28">Estado PMT</th>
                    <th className="py-3 px-4 w-32 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredFrentes.length > 0 ? (
                    filteredFrentes.map((f) => {
                      const isClosed = isContractorMode;
                      const fotoCount = f.fotos?.length || 0;
                      const notaCount = f.bitacora_notas?.length || 0;
                      
                      return (
                        <tr key={f.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="py-3 px-4 font-bold text-slate-400">Fr. {f.frente}</td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-800 bg-slate-50/30">CIV {f.civ}</td>
                          <td className="py-3 px-4">
                            <span className="font-semibold block">{f.eje}</span>
                            <span className="text-[10px] text-slate-400 block">{f.desde} - {f.hasta}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isClosed ? (
                              <span className="font-mono-numbers font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded">
                                {f.porcentaje_avance_semana}%
                              </span>
                            ) : (
                              <div className="inline-flex items-center gap-1 justify-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  className="w-16 border border-slate-200 rounded p-1 font-mono-numbers font-bold text-center text-primary"
                                  value={f.porcentaje_avance_semana}
                                  onChange={(e) => handleFrenteFieldChange(f.id, 'porcentaje_avance_semana', e.target.value)}
                                />
                                <span className="font-bold text-slate-400">%</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {isClosed ? (
                              <span className="font-mono-numbers text-slate-600 font-semibold pl-2">
                                ${f.ejecucion_presupuestal_semana.toLocaleString()}
                              </span>
                            ) : (
                              <div className="relative">
                                <DollarSign size={10} className="absolute left-2 top-2.5 text-slate-400" />
                                <input
                                  type="number"
                                  className="w-28 pl-5 pr-2 py-1 border border-slate-200 rounded font-mono-numbers font-medium"
                                  placeholder="Inversión"
                                  value={f.ejecucion_presupuestal_semana}
                                  onChange={(e) => handleFrenteFieldChange(f.id, 'ejecucion_presupuestal_semana', e.target.value)}
                                />
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {isClosed ? (
                              <p className="text-slate-500 italic max-w-sm whitespace-pre-wrap leading-relaxed">
                                {f.actividades_ejecutadas_hitos || 'Sin novedades registradas.'}
                              </p>
                            ) : (
                              <textarea
                                rows={1}
                                className="w-full bg-slate-50/50 border border-slate-200 rounded px-2 py-1 text-[11px] leading-snug focus:bg-white resize-y"
                                placeholder="Actividades ejecutadas..."
                                value={f.actividades_ejecutadas_hitos || ''}
                                onChange={(e) => handleFrenteFieldChange(f.id, 'actividades_ejecutadas_hitos', e.target.value)}
                              />
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex flex-col gap-1 items-center justify-center">
                              <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                fotoCount > 0 ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-100 text-slate-400'
                              }`} title={`${fotoCount} fotos`}>
                                <ImageIcon size={8} />
                                {fotoCount}
                              </span>
                              {notaCount > 0 && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100" title={`${notaCount} notas`}>
                                  <FileText size={8} />
                                  {notaCount}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {isClosed ? (
                              <span className={`font-semibold px-2 py-0.5 rounded text-[10px] inline-block ${
                                f.pmt_estado === 'Aprobado' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                f.pmt_estado === 'Suspendido' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}>
                                {f.pmt_estado || 'N/A'}
                              </span>
                            ) : (
                              <select
                                value={f.pmt_estado || 'N/A'}
                                onChange={(e) => handleFrenteFieldChange(f.id, 'pmt_estado', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded p-1 font-semibold text-[11px] cursor-pointer"
                              >
                                <option value="Aprobado">Aprobado</option>
                                <option value="En revisión">En revisión</option>
                                <option value="Suspendido">Suspendido</option>
                                <option value="No requerido">No requerido</option>
                              </select>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => onNavigateToDetail(activeReport.id_informe, null)}
                              className="text-primary hover:text-primary-container font-bold text-[10px] bg-primary/5 hover:bg-primary/10 px-2 py-1 rounded-md border border-primary/15 transition-all inline-flex items-center gap-1"
                            >
                              <FileText size={11} />
                              Ver Informe
                              <ChevronRight size={10} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                        No se encontraron frentes.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Table Footer Controls (Always Visible) */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap justify-between items-center gap-4">
              <div className="flex gap-1.5 items-center text-[11px] text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 max-w-md">
                <HelpCircle size={16} className="shrink-0" />
                <span>
                  {isContractorMode 
                    ? <strong>Modo de Consulta: Estás visualizando los informes semanales validados por la Interventoría. Haz clic en "Ver Informe" para previsualizar o descargar el PDF oficial.</strong>
                    : <strong>Información de Edición: Las modificaciones se aplican en tiempo real al hacer clic en Guardar Cambios.</strong>
                  }
                </span>
              </div>

              {!isContractorMode && (
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveDraft}
                    disabled={isSaving}
                    className="bg-primary hover:bg-primary-container text-white text-xs font-bold px-5 py-2 rounded transition-all flex items-center gap-1.5 shadow"
                  >
                    <Save size={14} />
                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      )}



    </div>
  );
}
