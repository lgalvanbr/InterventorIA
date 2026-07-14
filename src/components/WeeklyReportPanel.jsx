import React, { useState, useEffect } from 'react';
import { 
  FileText, Calendar, Layers, Download, CheckCircle, 
  ArrowLeft, Users, ChevronRight, MessageSquare, Image as ImageIcon,
  DollarSign, TrendingUp, AlertTriangle
} from 'lucide-react';
import WeeklyFrenteDetail from './WeeklyFrenteDetail';

export default function WeeklyReportPanel({ 
  report, 
  weeklyReports,
  initialEditingFrenteId = null,
  onClose, 
  onSaveFrente 
}) {
  const [activeTab, setActiveTab] = useState('comite'); // 'comite', 'pdf', 'frentes'
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [editingFrenteId, setEditingFrenteId] = useState(null);

  // Only auto-open frente editor when a specific frenteId was passed in
  useEffect(() => {
    if (initialEditingFrenteId) {
      setEditingFrenteId(initialEditingFrenteId);
      setActiveTab('frentes');
    }
  }, [initialEditingFrenteId]);

  if (!report) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 font-bold">Reporte no encontrado.</p>
        <button onClick={onClose} className="mt-4 bg-primary text-white px-4 py-2 rounded">
          Volver
        </button>
      </div>
    );
  }

  // Calculate week dates starting from report.fecha_inicial_corte
  const weekDates = [];
  if (report.fecha_inicial_corte) {
    const start = new Date(report.fecha_inicial_corte + 'T12:00:00');
    for (let i = 0; i < 7; i++) {
      const current = new Date(start);
      current.setDate(start.getDate() + i);
      weekDates.push(current);
    }
  }

  const activeDateStr = weekDates[activeDayIdx] 
    ? weekDates[activeDayIdx].toISOString().split('T')[0] 
    : '';

  const getDayName = (date) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[date.getDay()];
  };

  const getDayLabel = (date) => {
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  };

  const handlePrint = () => {
    window.print();
  };

  // Tab 1: Filter frentes that had activity on the selected day
  const activeDayFrentes = report.frentes.filter(f => {
    const hasNote = f.bitacora_notes?.some(n => n.date === activeDateStr && n.note.trim() !== '');
    const hasPhotos = f.fotos?.some(ph => ph.date === activeDateStr);
    return hasNote || hasPhotos;
  });

  // Calculate totals
  const totalFrentes = report.frentes.length;
  const frentesInExecution = report.frentes.filter(f => f.status === 'Ejecución' || f.status === 'Activo').length;
  const weeklyProgress = report.avance_semanal_fisico || 0;
  const weeklyBudget = report.frentes.reduce((acc, curr) => acc + (curr.presupuesto_semana || 0), 0);

  // Render inline editor if editing a frente
  if (editingFrenteId) {
    return (
      <WeeklyFrenteDetail
        report={report}
        frenteId={editingFrenteId}
        onClose={() => setEditingFrenteId(null)}
        onSave={(updatedFrente) => {
          onSaveFrente(updatedFrente);
          setEditingFrenteId(null);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans printable-area-container">
      
      {/* Top Banner (Hidden in Print) */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30 shadow-sm no-print">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-all"
            title="Volver a Informes Semanales"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg text-slate-800">
                Informe Semana {report.numero_semana}
              </h1>
              <span className="bg-primary/10 text-primary text-[11px] font-black uppercase px-2 py-0.5 rounded">
                Corte: {report.fecha_inicial_corte} al {report.fecha_final_corte}
              </span>
            </div>
            <p className="text-xs text-slate-500">Consolidado general de avances, comités e interventoría técnica</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('comite')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'comite'
                ? 'bg-white text-primary shadow'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users size={14} />
            Hub de Comité
          </button>
          <button
            onClick={() => setActiveTab('pdf')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'pdf'
                ? 'bg-white text-primary shadow'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText size={14} />
            Reporte PDF
          </button>
          <button
            onClick={() => setActiveTab('frentes')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'frentes'
                ? 'bg-white text-primary shadow'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers size={14} />
            Frentes ({totalFrentes})
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full no-print">
        
        {/* TAB 1: HUB DE COMITE */}
        {activeTab === 'comite' && (
          <div className="space-y-6">
            
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg text-primary">
                  <Layers size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Frentes Activos</p>
                  <p className="text-lg font-black text-slate-800">{frentesInExecution} / {totalFrentes}</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
                <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avance Físico Semanal</p>
                  <p className="text-lg font-black text-emerald-600">+{weeklyProgress}%</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
                <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
                  <DollarSign size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inversión Semana</p>
                  <p className="text-lg font-black text-slate-800">${weeklyBudget.toLocaleString()} M</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
                <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
                  <CheckCircle size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado de Informe</p>
                  <span className={`inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                    report.estado_informe === 'abierto' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {report.estado_informe}
                  </span>
                </div>
              </div>
            </div>

            {/* Day Timeline Picker */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">
                Línea de Tiempo del Comité (Filtrar Actividades por Día)
              </h2>
              
              <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
                {weekDates.map((date, idx) => {
                  const isActive = activeDayIdx === idx;
                  const dayName = getDayName(date);
                  const dayLabel = getDayLabel(date);
                  
                  const dStr = date.toISOString().split('T')[0];
                  // Calculate frentes with activity on this day
                  const activityCount = report.frentes.filter(f => {
                    const hasNote = f.bitacora_notes?.some(n => n.date === dStr && n.note.trim() !== '');
                    const hasPhotos = f.fotos?.some(ph => ph.date === dStr);
                    return hasNote || hasPhotos;
                  }).length;

                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveDayIdx(idx)}
                      className={`flex flex-col items-center justify-center min-w-[90px] py-3.5 px-2 rounded-xl border text-center transition-all shrink-0 cursor-pointer ${
                        isActive 
                          ? 'bg-primary text-white border-primary shadow-md scale-105'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-wider opacity-85">
                        {dayName}
                      </span>
                      <span className="text-sm font-extrabold mt-0.5">
                        {dayLabel}
                      </span>
                      <span className={`text-[9px] font-black uppercase mt-2 px-1.5 py-0.5 rounded ${
                        isActive 
                          ? 'bg-white/25 text-white' 
                          : activityCount > 0 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-slate-200 text-slate-500'
                      }`}>
                        {activityCount} {activityCount === 1 ? 'frente' : 'frentes'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Day Feed Grid */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Calendar size={16} className="text-primary" />
                  Reportes del {getDayName(weekDates[activeDayIdx])} ({getDayLabel(weekDates[activeDayIdx])})
                </h3>
              </div>

              {activeDayFrentes.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 shadow-sm flex flex-col items-center justify-center">
                  <MessageSquare size={36} className="text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-650">No hay novedades registradas hoy.</p>
                  <p className="text-[10px] text-slate-400 mt-1">Los inspectores no cargaron fotos ni notas para esta fecha.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activeDayFrentes.map((frente) => {
                    const dailyNote = frente.bitacora_notes?.find(n => n.date === activeDateStr)?.note || '';
                    const dailyPhotos = frente.fotos?.filter(ph => ph.date === activeDateStr) || [];
                    const isMallaVial = frente.id.startsWith('f_mv');

                    return (
                      <div 
                        key={frente.id}
                        className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all"
                      >
                        {/* Frente Header Info */}
                        <div className="p-4 border-b border-slate-100 bg-[#f7f9fb]/50 flex justify-between items-start gap-2">
                          <div>
                            <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded mb-1.5 ${
                              isMallaVial ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800'
                            }`}>
                              {isMallaVial ? 'Malla Vial' : 'Espacio Público'}
                            </span>
                            <h4 className="font-extrabold text-slate-800 text-xs">
                              Frente {frente.frente} • CIV {frente.civ}
                            </h4>
                            <p className="text-[10px] text-slate-500 mt-0.5 font-bold">Eje: {frente.eje}</p>
                          </div>
                          
                          <button 
                            onClick={() => setEditingFrenteId(frente.id)}
                            className="text-[10px] font-bold text-primary hover:text-primary-container px-2 py-1 rounded bg-primary/5 border border-primary/10 transition-all cursor-pointer"
                          >
                            Ir a Detalles
                          </button>
                        </div>

                        {/* Notes Area */}
                        <div className="p-4 flex-1 flex flex-col gap-3">
                          {dailyNote ? (
                            <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-[11px] text-slate-700 leading-relaxed italic">
                              "{dailyNote}"
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 italic">
                              Sin notas textuales registradas.
                            </div>
                          )}

                          {/* Photos Grid */}
                          {dailyPhotos.length > 0 && (
                            <div className="space-y-3">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Avances Visuales ({dailyPhotos.length})</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {dailyPhotos.map((photo) => (
                                  <div key={photo.id} className="border border-slate-200 rounded-lg overflow-hidden bg-slate-100 shadow-xs">
                                    <div className="h-28 relative">
                                      <img 
                                        src={photo.url} 
                                        alt={photo.caption || 'Foto de avance'} 
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    {photo.caption && (
                                      <div className="p-1.5 bg-white text-[9px] font-semibold text-slate-650 truncate border-t border-slate-100">
                                        {photo.caption}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: PDF PREVIEW */}
        {activeTab === 'pdf' && (
          <div className="space-y-6">
            
            {/* Download controls */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800">Vista de Impresión Oficial</h3>
                <p className="text-[11px] text-slate-500">Este visor simula exactamente el formato de exportación final en tamaño Carta/A4.</p>
              </div>
              <button
                onClick={handlePrint}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-lg shadow transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Download size={14} />
                Descargar / Imprimir PDF
              </button>
            </div>

            {/* A4 Simulator Preview */}
            <div className="bg-white border border-slate-300 shadow-xl rounded-xl p-8 max-w-4xl mx-auto A4-preview font-sans text-slate-800 leading-normal">
              
              {/* PDF Header */}
              <div className="border-b-2 border-slate-800 pb-4 flex justify-between items-center">
                <div>
                  <h1 className="text-sm font-black tracking-tight text-slate-900 uppercase">
                    INFORME SEMANAL DE INTERVENTORÍA TÉCNICA
                  </h1>
                  <p className="text-[10px] font-bold text-slate-500">Consorcio Interventoría Usaquén • Contrato IDU-19-620-18</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black bg-slate-900 text-white px-2.5 py-1 rounded">
                    SEMANA {report.numero_semana}
                  </span>
                  <p className="text-[9px] text-slate-400 mt-1">{report.fecha_inicial_corte} al {report.fecha_final_corte}</p>
                </div>
              </div>

              {/* PDF Meta */}
              <div className="grid grid-cols-3 gap-4 py-4 border-b border-slate-200 text-[10px]">
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Entidad Contratante</p>
                  <p className="font-extrabold text-slate-800">Instituto de Desarrollo Urbano (IDU)</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Avance Físico del Período</p>
                  <p className="font-extrabold text-slate-800">+{weeklyProgress}% en la semana</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Presupuesto Ejecutado (Semana)</p>
                  <p className="font-extrabold text-slate-800">${weeklyBudget.toLocaleString()} M COP</p>
                </div>
              </div>

              {/* PDF Resumen Frentes Table */}
              <div className="py-6">
                <h3 className="text-xs font-black text-slate-950 uppercase mb-3 border-b border-slate-300 pb-1">
                  I. Resumen General de Frentes
                </h3>
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-650 border-b border-slate-200 font-bold">
                      <th className="py-2 px-1">Frente</th>
                      <th className="py-2 px-1">CIV</th>
                      <th className="py-2 px-1">Tipo</th>
                      <th className="py-2 px-1">Tramo / Eje</th>
                      <th className="py-2 px-1 text-right">Progreso</th>
                      <th className="py-2 px-1 text-right">Presupuesto</th>
                      <th className="py-2 px-1 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.frentes.map(f => {
                      const isMv = f.id.startsWith('f_mv');
                      return (
                        <tr key={f.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="py-2 px-1 font-bold">{f.frente}</td>
                          <td className="py-2 px-1 font-bold text-slate-650">{f.civ}</td>
                          <td className="py-2 px-1 text-[9px] uppercase font-bold text-slate-500">
                            {isMv ? 'Malla Vial' : 'Espacio Público'}
                          </td>
                          <td className="py-2 px-1 text-slate-600 truncate max-w-xs">{f.eje}</td>
                          <td className="py-2 px-1 text-right font-bold">{f.progress}%</td>
                          <td className="py-2 px-1 text-right">${f.presupuesto_semana || 0}M</td>
                          <td className="py-2 px-1 text-center">
                            <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              {f.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* PDF Fichas Técnicas Individuales (Frente por Frente) */}
              <div className="py-4 space-y-8 page-break-before">
                <h3 className="text-xs font-black text-slate-950 uppercase mb-4 border-b border-slate-300 pb-1">
                  II. Fichas Técnicas de Frentes Activos
                </h3>

                {report.frentes.map((frente) => {
                  const isMv = frente.id.startsWith('f_mv');
                  // Filter out active notes
                  const activeNotes = frente.bitacora_notes?.filter(n => n.note.trim() !== '') || [];
                  const activePhotos = frente.fotos || [];

                  return (
                    <div key={frente.id} className="border border-slate-300 rounded-lg p-4 space-y-3 page-break-inside">
                      
                      {/* Ficha Header */}
                      <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-900">
                            FRENTE {frente.frente} — CIV {frente.civ}
                          </h4>
                          <p className="text-[9px] text-slate-500"><strong>Ubicación:</strong> {frente.desde} al {frente.hasta} ({frente.eje})</p>
                        </div>
                        <span className="text-[9px] font-black uppercase bg-slate-900 text-white px-2 py-0.5 rounded">
                          {isMv ? 'MALLA VIAL' : 'ESPACIO PÚBLICO'}
                        </span>
                      </div>

                      {/* Technical Layer info */}
                      {frente.layers && frente.layers.length > 0 && (
                        <div className="text-[9px] bg-slate-50 p-2.5 rounded border border-slate-200">
                          <p className="font-black text-slate-700 uppercase tracking-wider text-[8px] mb-1">Estructura de Pavimento Aprobada</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {frente.layers.map((layer, idx) => (
                              <div key={idx} className="border-l-2 border-primary pl-2">
                                <p className="font-bold text-slate-800 text-[8px] truncate">{layer.material}</p>
                                <p className="text-slate-500 text-[8px]">Espesor: {layer.espesor_propuesto_cm}cm • Mod: {layer.modulo_psi?.toLocaleString()} psi</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Bitacora Consolidada Semanal */}
                      <div className="space-y-2">
                        <p className="font-black text-slate-750 uppercase tracking-wider text-[8px]">Bitácora Diaria del Periodo</p>
                        {activeNotes.length === 0 ? (
                          <p className="text-[9px] text-slate-450 italic">No se reportaron bitácoras en este frente durante la semana.</p>
                        ) : (
                          <div className="grid grid-cols-1 gap-2 text-[9px]">
                            {activeNotes.map((noteItem) => {
                              const noteDate = new Date(noteItem.date + 'T12:00:00');
                              return (
                                <div key={noteItem.id} className="bg-slate-50/50 p-2 rounded border border-slate-100 flex gap-2">
                                  <div className="min-w-[65px] font-black text-slate-550 border-r border-slate-200 pr-2 uppercase text-[8px] flex items-center">
                                    {getDayName(noteDate)} {noteDate.getDate()}
                                  </div>
                                  <div className="text-slate-700 leading-relaxed">{noteItem.note}</div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Photos Consolidada */}
                      {activePhotos.length > 0 && (
                        <div className="space-y-2">
                          <p className="font-black text-slate-750 uppercase tracking-wider text-[8px]">Evidencia Fotográfica Semanal ({activePhotos.length})</p>
                          <div className="grid grid-cols-3 gap-2.5">
                            {activePhotos.map((photo) => (
                              <div key={photo.id} className="border border-slate-200 rounded overflow-hidden shadow-2xs bg-white text-[8px]">
                                <div className="h-16 bg-slate-100 overflow-hidden">
                                  <img src={photo.url} alt="Avance" className="w-full h-full object-cover" />
                                </div>
                                <div className="p-1 text-slate-600 truncate font-semibold border-t border-slate-150">
                                  {photo.caption || 'Avance de obra'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: FRENTES LIST */}
        {activeTab === 'frentes' && (
          <div className="space-y-4">
            
            {/* Header info */}
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-800">Listado de Frentes de Obra en la Semana</h2>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-650 border-b border-slate-200 font-bold">
                    <th className="py-3.5 px-4">Frente</th>
                    <th className="py-3.5 px-4">CIV</th>
                    <th className="py-3.5 px-4">Eje / Tramo</th>
                    <th className="py-3.5 px-4 text-center">Avance</th>
                    <th className="py-3.5 px-4 text-right">Presupuesto</th>
                    <th className="py-3.5 px-4 text-center">Estado</th>
                    <th className="py-3.5 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {report.frentes.map((frente) => {
                    const isMv = frente.id.startsWith('f_mv');
                    return (
                      <tr key={frente.id} className="border-b border-slate-150 hover:bg-slate-50/50">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {frente.frente}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-600">
                          {frente.civ}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded mr-2 ${
                            isMv ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800'
                          }`}>
                            {isMv ? 'Malla' : 'Espacio'}
                          </span>
                          {frente.eje}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="font-bold">{frente.progress}%</span>
                            <div className="w-12 bg-slate-150 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-primary h-full" style={{ width: `${frente.progress}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-800">
                          ${frente.presupuesto_semana || 0}M
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                            frente.status === 'Ejecución' || frente.status === 'Activo'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-850'
                          }`}>
                            {frente.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setEditingFrenteId(frente.id)}
                            className="bg-primary/5 hover:bg-primary/10 text-primary font-bold text-[10px] py-1.5 px-3 rounded-lg border border-primary/10 transition-all cursor-pointer"
                          >
                            Editar Reporte
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </main>

      {/* RENDER IN VISIBLE PRINTER CONTAINER FOR PRINTING ONLY */}
      <div className="print-only font-sans p-6 text-slate-900 bg-white space-y-6">
        {/* PDF Header */}
        <div className="border-b-2 border-slate-800 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-base font-black tracking-tight text-slate-900 uppercase">
              INFORME SEMANAL DE INTERVENTORÍA TÉCNICA
            </h1>
            <p className="text-xs font-bold text-slate-500">Consorcio Interventoría Usaquén • Contrato IDU-19-620-18</p>
          </div>
          <div className="text-right">
            <span className="text-sm font-black bg-slate-900 text-white px-2.5 py-1 rounded">
              SEMANA {report.numero_semana}
            </span>
            <p className="text-[10px] text-slate-400 mt-1">{report.fecha_inicial_corte} al {report.fecha_final_corte}</p>
          </div>
        </div>

        {/* PDF Meta */}
        <div className="grid grid-cols-3 gap-4 py-4 border-b border-slate-200 text-xs">
          <div>
            <p className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Entidad Contratante</p>
            <p className="font-extrabold text-slate-800">Instituto de Desarrollo Urbano (IDU)</p>
          </div>
          <div>
            <p className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Avance Físico del Período</p>
            <p className="font-extrabold text-slate-800">+{weeklyProgress}% en la semana</p>
          </div>
          <div>
            <p className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Presupuesto Ejecutado (Semana)</p>
            <p className="font-extrabold text-slate-800">${weeklyBudget.toLocaleString()} M COP</p>
          </div>
        </div>

        {/* PDF Resumen Frentes Table */}
        <div className="py-4">
          <h3 className="text-xs font-black text-slate-950 uppercase mb-3 border-b border-slate-350 pb-1">
            I. Resumen General de Frentes
          </h3>
          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className="bg-slate-100 text-slate-650 border-b border-slate-200 font-bold">
                <th className="py-2 px-1">Frente</th>
                <th className="py-2 px-1">CIV</th>
                <th className="py-2 px-1">Tipo</th>
                <th className="py-2 px-1">Tramo / Eje</th>
                <th className="py-2 px-1 text-right">Progreso</th>
                <th className="py-2 px-1 text-right">Presupuesto</th>
                <th className="py-2 px-1 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {report.frentes.map(f => {
                const isMv = f.id.startsWith('f_mv');
                return (
                  <tr key={f.id} className="border-b border-slate-150">
                    <td className="py-2 px-1 font-bold">{f.frente}</td>
                    <td className="py-2 px-1 font-bold text-slate-650">{f.civ}</td>
                    <td className="py-2 px-1 text-[9px] uppercase font-bold text-slate-500">
                      {isMv ? 'Malla Vial' : 'Espacio Público'}
                    </td>
                    <td className="py-2 px-1 text-slate-600">{f.eje}</td>
                    <td className="py-2 px-1 text-right font-bold">{f.progress}%</td>
                    <td className="py-2 px-1 text-right">${f.presupuesto_semana || 0}M</td>
                    <td className="py-2 px-1 text-center">
                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {f.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* PDF Fichas Técnicas Individuales (Frente por Frente) */}
        <div className="py-4 space-y-6">
          <h3 className="text-xs font-black text-slate-950 uppercase mb-4 border-b border-slate-350 pb-1">
            II. Fichas Técnicas de Frentes Activos
          </h3>

          {report.frentes.map((frente) => {
            const isMv = frente.id.startsWith('f_mv');
            const activeNotes = frente.bitacora_notes?.filter(n => n.note.trim() !== '') || [];
            const activePhotos = frente.fotos || [];

            return (
              <div key={frente.id} className="border border-slate-350 rounded-lg p-4 space-y-3 page-break-inside bg-white">
                
                {/* Ficha Header */}
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">
                      FRENTE {frente.frente} — CIV {frente.civ}
                    </h4>
                    <p className="text-[9px] text-slate-500"><strong>Ubicación:</strong> {frente.desde} al {frente.hasta} ({frente.eje})</p>
                  </div>
                  <span className="text-[9px] font-black uppercase bg-slate-900 text-white px-2 py-0.5 rounded">
                    {isMv ? 'MALLA VIAL' : 'ESPACIO PÚBLICO'}
                  </span>
                </div>

                {/* Technical Layer info */}
                {frente.layers && frente.layers.length > 0 && (
                  <div className="text-[9px] bg-slate-50 p-2.5 rounded border border-slate-200">
                    <p className="font-black text-slate-700 uppercase tracking-wider text-[8px] mb-1">Estructura de Pavimento Aprobada</p>
                    <div className="grid grid-cols-4 gap-2">
                      {frente.layers.map((layer, idx) => (
                        <div key={idx} className="border-l-2 border-primary pl-2">
                          <p className="font-bold text-slate-800 text-[8px] truncate">{layer.material}</p>
                          <p className="text-slate-500 text-[8px]">Espesor: {layer.espesor_propuesto_cm}cm • Mod: {layer.modulo_psi?.toLocaleString()} psi</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bitacora Consolidada Semanal */}
                <div className="space-y-2">
                  <p className="font-black text-slate-750 uppercase tracking-wider text-[8px]">Bitácora Diaria del Periodo</p>
                  {activeNotes.length === 0 ? (
                    <p className="text-[9px] text-slate-450 italic">No se reportaron bitácoras en este frente durante la semana.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-1.5 text-[9px]">
                      {activeNotes.map((noteItem) => {
                        const noteDate = new Date(noteItem.date + 'T12:00:00');
                        return (
                          <div key={noteItem.id} className="bg-slate-50/50 p-2 rounded border border-slate-100 flex gap-2">
                            <div className="min-w-[65px] font-black text-slate-550 border-r border-slate-250 pr-2 uppercase text-[8px] flex items-center">
                              {getDayName(noteDate)} {noteDate.getDate()}
                            </div>
                            <div className="text-slate-700 leading-relaxed">{noteItem.note}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Photos Consolidada */}
                {activePhotos.length > 0 && (
                  <div className="space-y-2">
                    <p className="font-black text-slate-750 uppercase tracking-wider text-[8px]">Evidencia Fotográfica Semanal ({activePhotos.length})</p>
                    <div className="grid grid-cols-3 gap-2.5">
                      {activePhotos.map((photo) => (
                        <div key={photo.id} className="border border-slate-200 rounded overflow-hidden shadow-2xs bg-white text-[8px]">
                          <div className="h-16 bg-slate-100 overflow-hidden">
                            <img src={photo.url} alt="Avance" className="w-full h-full object-cover" />
                          </div>
                          <div className="p-1 text-slate-650 truncate font-semibold border-t border-slate-150">
                            {photo.caption || 'Avance de obra'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
