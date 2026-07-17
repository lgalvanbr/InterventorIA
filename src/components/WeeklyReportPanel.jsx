import React, { useState, useEffect } from 'react';
import { 
  FileText, Calendar, Layers, Download, CheckCircle, 
  ArrowLeft, Users, ChevronRight, MessageSquare, Image as ImageIcon,
  DollarSign, TrendingUp, AlertTriangle
} from 'lucide-react';
import WeeklyFrenteDetail from './WeeklyFrenteDetail';
import { getDisenoForCiv } from '../data/frentesDisenos';

const getShortMaterialName = (fullName) => {
  const name = fullName.toLowerCase();
  if (name.includes('mezcla asfáltica') || name.includes('mezcla asfaltica')) return 'Mezcla Asfáltica';
  if (name.includes('losa de concreto') || name.includes('concreto hidráulico') || name.includes('concreto hidraulico')) return 'Concreto Hidráulico MR-45';
  if (name.includes('base granular') || name.includes('bg38')) return 'Base Granular BG-38';
  if (name.includes('subbase granular') || name.includes('sbg50')) return 'Subbase Granular SBG-50';
  if (name.includes('geocelda')) return 'Geocelda h=15cm';
  if (name.includes('geomalla')) return 'Geomalla Multiaxial';
  if (name.includes('geotextil')) return 'Geotextil de Separación';
  if (name.includes('imprimación') || name.includes('imprimacion')) return 'Imprimación CRL-1';
  if (name.includes('barrenos')) return 'Barrenos de Cal';
  if (name.includes('loseta') || name.includes('adoquín') || name.includes('adoquin')) return 'Losetas / Adoquines';
  if (name.includes('asiento') || name.includes('arena')) return 'Capa de Asiento de Arena';
  return fullName;
};

const getLayerCSSStyle = (type) => {
  switch (type) {
    case 'asfalto':
      return {
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        color: '#f8fafc',
        borderColor: '#020617',
        borderStyle: 'solid',
        borderWidth: '1px 0'
      };
    case 'concreto':
      return {
        background: 'linear-gradient(to bottom, #f1f5f9 0%, #cbd5e1 100%)',
        color: '#0f172a',
        borderColor: '#64748b',
        borderStyle: 'solid',
        borderWidth: '1px 0'
      };
    case 'base_cemento':
    case 'subbase_cemento':
      return {
        background: 'repeating-linear-gradient(45deg, #cbd5e1, #cbd5e1 5px, #94a3b8 5px, #94a3b8 10px)',
        color: '#0f172a',
        borderColor: '#475569',
        borderStyle: 'dashed',
        borderWidth: '1px 0'
      };
    case 'subbase':
      return {
        background: '#fef08a',
        backgroundImage: 'radial-gradient(#ca8a04 15%, transparent 16%)',
        backgroundSize: '4px 4px',
        color: '#713f12',
        borderColor: '#ca8a04',
        borderStyle: 'dashed',
        borderWidth: '1px 0'
      };
    case 'geomalla':
      return {
        background: '#1e1b4b',
        backgroundImage: 'linear-gradient(to right, #4f46e5 1px, transparent 1px), linear-gradient(to bottom, #4f46e5 1px, transparent 1px)',
        backgroundSize: '5px 5px',
        color: '#e0e7ff',
        borderColor: '#312e81',
        borderWidth: '1.5px 0'
      };
    case 'geocelda':
      return {
        background: '#ffedd5',
        backgroundImage: 'repeating-linear-gradient(90deg, #ea580c 0px, #ea580c 2px, transparent 2px, transparent 8px)',
        color: '#c2410c',
        borderColor: '#ea580c',
        borderWidth: '1px 0'
      };
    case 'geotextil':
    case 'geotextil_nt':
      return {
        background: 'repeating-linear-gradient(90deg, #3b82f6, #3b82f6 4px, transparent 4px, transparent 8px)',
        color: '#1e3a8a',
        borderColor: '#2563eb',
        borderWidth: '1px 0'
      };
    case 'imprimacion':
      return {
        background: '#3f3f46',
        color: '#e4e4e7',
        borderColor: '#18181b',
        borderWidth: '1px 0'
      };
    case 'arena':
      return {
        background: '#fef08a',
        color: '#713f12',
        borderColor: '#ca8a04',
        borderWidth: '1px 0'
      };
    default:
      return {
        background: '#e2e8f0',
        color: '#334155',
        borderColor: '#cbd5e1',
        borderWidth: '1px 0'
      };
  }
};

const subrasanteStyle = {
  background: 'linear-gradient(135deg, #78350f 0%, #451a03 100%)',
  color: '#fef3c7',
  borderColor: '#451a03',
  borderWidth: '1px 0'
};

const getIaCommentForFrente = (consolidadoIa, frenteNumber) => {
  if (!consolidadoIa) return '';
  const regex = new RegExp(`FRENTE\\s+${frenteNumber}\\s*[:•\\-\\s]([\\s\\S]*?)(?=(?:FRENTE\\s+\\d+\\s*[:•\\-\\s])|$)`, 'i');
  const match = consolidadoIa.match(regex);
  return match ? match[1].trim() : '';
};

const PrintFrenteCard = ({ frente, printMode, allFrentes, consolidadoIa, getDayName }) => {
  const isMv = frente.id.startsWith('f_mv');
  const activeNotes = frente.bitacora_notes?.filter(n => n.note.trim() !== '') || [];
  const activePhotos = frente.fotos || [];
  
  const originalFrente = allFrentes?.find(o => o.id === frente.id);
  const lat = originalFrente?.latitude || '4.6097';
  const lng = originalFrente?.longitude || '-74.0817';

  const frenteIaComment = getIaCommentForFrente(consolidadoIa, frente.frente);

  const photosByDay = activePhotos.reduce((groups, photo) => {
    const dateKey = photo.date || 'Sin fecha';
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(photo);
    return groups;
  }, {});

  return (
    <div className="border border-slate-300 rounded-lg p-4 space-y-3 page-break-inside bg-white shadow-2xs text-left">
      
      {/* Ficha Header */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1 rounded text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[16px] font-black">construction</span>
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5 leading-none">
              FRENTE {frente.frente} <span className="text-[10px] text-slate-400">•</span> CIV {frente.civ}
            </h4>
            <p className="text-[9px] text-slate-500 flex items-center gap-1 mt-1 leading-none font-semibold">
              <span className="material-symbols-outlined text-[11px] text-slate-400">map</span>
              <strong>Ubicación:</strong> {frente.desde} al {frente.hasta} ({frente.eje})
            </p>
          </div>
        </div>
        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
          isMv ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-teal-100 text-teal-800 border border-teal-200'
        }`}>
          {isMv ? 'MALLA VIAL' : 'ESPACIO PÚBLICO'}
        </span>
      </div>

      {/* Comentario de Interventoría del Frente */}
      {frenteIaComment && (
        <div className="bg-slate-50 border-l-2 border-primary/50 p-2.5 rounded-r text-[9px] text-slate-800 leading-relaxed italic font-semibold shadow-2xs">
          <div className="flex items-center gap-1 text-primary text-[8px] font-black uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-[11px]">rate_review</span>
            Análisis de Interventoría
          </div>
          "{frenteIaComment}"
        </div>
      )}

      {/* Mapa y Perfil de Estructura de Suelo */}
      {printMode === 'full' && (
        <div className="grid grid-cols-2 gap-4 text-[9px] print:flex print:gap-4 print:w-full">
          {/* Mapa de Ubicación */}
          <div className="bg-slate-50 p-2 rounded border border-slate-200 flex flex-col gap-1.5 justify-between print:w-1/2">
            <p className="font-black text-slate-750 uppercase tracking-wider text-[8px] flex items-center gap-1">
              <span className="material-symbols-outlined text-[10px] text-slate-400">location_on</span>
              Ubicación Georreferenciada
            </p>
            <div className="w-full h-[140px] overflow-hidden rounded border border-slate-250 relative bg-slate-100">
              <img 
                src={`https://static-maps.yandex.ru/1.x/?lang=es_ES&ll=${lng},${lat}&z=15&l=map&size=300,300`} 
                alt="Ubicación en mapa"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=300x300&maptype=mapnik`;
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative flex items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-red-400 opacity-75"></span>
                  <svg className="w-8 h-8 text-red-500 drop-shadow-md" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z"/>
                  </svg>
                </div>
              </div>
            </div>
            <div className="text-[8px] font-bold text-slate-500 text-center font-mono">
              COORDENADAS: {parseFloat(lat).toFixed(5)}, {parseFloat(lng).toFixed(5)}
            </div>
          </div>

          {/* Perfil de Suelo/Pavimento */}
          <div className="bg-slate-50 p-2 rounded border border-slate-200 flex flex-col gap-1.5 justify-between print:w-1/2">
            <p className="font-black text-slate-755 uppercase tracking-wider text-[8px] flex items-center gap-1">
              <span className="material-symbols-outlined text-[10px] text-slate-400">layers</span>
              Perfil de Estructura del Suelo
            </p>
            {frente.perfil_suelo_img_url ? (
              <div className="w-full h-[140px] overflow-hidden rounded border border-slate-200 relative bg-white flex items-center justify-center p-1 shadow-2xs">
                <img 
                  src={frente.perfil_suelo_img_url} 
                  alt="Perfil de estructura del suelo" 
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="flex flex-col border border-slate-200 border-dashed rounded overflow-hidden flex-1 min-h-[140px] text-[8px] font-bold bg-slate-100 items-center justify-center text-slate-450 p-4 text-center leading-normal">
                <span className="material-symbols-outlined text-slate-400 text-[20px] mb-1">image</span>
                <span>Sin perfil de estructura de suelo</span>
                <span className="text-[6.5px] font-normal opacity-75 mt-0.5">Sube el plano o esquema desde el detalle del frente</span>
              </div>
            )}
            <div className="text-[8px] font-bold text-slate-500 text-center uppercase tracking-wide">
              Estructura de Pavimento Aprobada
            </div>
          </div>
        </div>
      )}

      {/* Bitacora Consolidada Semanal */}
      {printMode === 'full' && (
        <div className="space-y-2">
          <p className="font-black text-slate-750 uppercase tracking-wider text-[8px] flex items-center gap-1">
            <span className="material-symbols-outlined text-[10px] text-slate-400">notes</span>
            Bitácora Diaria del Periodo
          </p>
          {activeNotes.length === 0 ? (
            <p className="text-[9px] text-slate-400 italic">No se reportaron bitácoras en este frente durante la semana.</p>
          ) : (
            <div className="grid grid-cols-1 gap-1.5 text-[9px]">
              {activeNotes.map((noteItem) => {
                const noteDate = new Date(noteItem.date + 'T12:00:00');
                return (
                  <div key={noteItem.id} className="bg-slate-50/50 p-2 rounded border border-slate-100 flex gap-2">
                    <div className="min-w-[65px] font-black text-slate-500 border-r border-slate-200 pr-2 uppercase text-[8px] flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[9px] text-slate-400">event</span>
                      {getDayName(noteDate)} {noteDate.getDate()}
                    </div>
                    <div className="text-slate-700 leading-relaxed font-semibold">{noteItem.note}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Photos Consolidada */}
      {activePhotos.length > 0 && (
        <div className="space-y-2">
          <p className="font-black text-slate-750 uppercase tracking-wider text-[8px] flex items-center gap-1">
            <span className="material-symbols-outlined text-[10px] text-slate-400">photo_library</span>
            Evidencia Fotográfica Semanal ({activePhotos.length})
          </p>
          
          {printMode === 'simplified' ? (
            /* Grouped by day */
            <div className="space-y-3">
              {Object.keys(photosByDay).sort().map(dateStr => {
                const dateObj = new Date(dateStr + 'T12:00:00');
                const formattedDate = dateStr !== 'Sin fecha' 
                  ? `${getDayName(dateObj)} ${dateObj.getDate()} de ${dateObj.toLocaleDateString('es-CO', { month: 'long' })}`
                  : 'Otros avances';
                
                return (
                  <div key={dateStr} className="space-y-1.5">
                    <p className="font-bold text-slate-700 text-[8px] uppercase tracking-wide border-b border-slate-100 pb-0.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[10px] text-slate-400">calendar_month</span>
                      {formattedDate}
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {photosByDay[dateStr].map((photo) => (
                        <div key={photo.id} className="border border-slate-200 rounded overflow-hidden shadow-2xs bg-white text-[8px] flex flex-col relative">
                          <div className="aspect-square bg-slate-100 overflow-hidden relative">
                            <img src={photo.url} alt="Avance" className="w-full h-full object-cover" />
                            {/* Date overlay badge */}
                            {photo.date && (
                              <span className="absolute top-1 left-1 bg-black/60 text-white font-black px-1.5 py-0.5 rounded text-[7px] uppercase tracking-wide">
                                {photo.date}
                              </span>
                            )}
                          </div>
                          <div className="p-1 text-slate-650 font-semibold border-t border-slate-150 break-words whitespace-normal leading-tight">
                            {photo.caption || 'Avance de obra'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Standard Grid for Full Mode */
            <div className="grid grid-cols-4 gap-2">
              {activePhotos.map((photo) => (
                <div key={photo.id} className="border border-slate-200 rounded overflow-hidden shadow-2xs bg-white text-[8px] flex flex-col relative">
                  <div className="aspect-square bg-slate-100 overflow-hidden relative">
                    <img src={photo.url} alt="Avance" className="w-full h-full object-cover" />
                    {/* Date overlay badge */}
                    {photo.date && (
                      <span className="absolute top-1 left-1 bg-black/60 text-white font-black px-1.5 py-0.5 rounded text-[7px] uppercase tracking-wide">
                        {photo.date}
                      </span>
                    )}
                  </div>
                  <div className="p-1 text-slate-655 font-semibold border-t border-slate-150 break-words whitespace-normal leading-tight">
                    {photo.caption || 'Avance de obra'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default function WeeklyReportPanel({ 
  report, 
  weeklyReports,
  initialEditingFrenteId = null,
  allFrentes = [],
  onClose, 
  onSaveFrente,
  onSaveReport
}) {
  const [activeTab, setActiveTab] = useState('comite'); // 'comite', 'pdf', 'frentes'
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [editingFrenteId, setEditingFrenteId] = useState(null);
  const [iaText, setIaText] = useState(report?.consolidado_ia || '');
  const [printMode, setPrintMode] = useState('full'); // 'full' or 'simplified'

  useEffect(() => {
    if (report) {
      setIaText(report.consolidado_ia || '');
    }
  }, [report?.id_informe, report?.consolidado_ia]);

  const handleSaveIAConsolidated = () => {
    if (onSaveReport) {
      onSaveReport({
        ...report,
        consolidado_ia: iaText
      });
      alert('¡Texto consolidado de interventoría guardado con éxito!');
    }
  };

  const handleBlur = () => {
    if (iaText !== report.consolidado_ia && onSaveReport) {
      onSaveReport({
        ...report,
        consolidado_ia: iaText
      });
    }
  };

  const handleCopyInfo = () => {
    let text = `INFORME SEMANAL DE BITÁCORAS Y FRENTES\n`;
    text += `EMPRESA: INCOLTA SAS\n`;
    text += `SEMANA: ${report.numero_semana}\n`;
    text += `PERÍODO: ${report.fecha_inicial_corte} AL ${report.fecha_final_corte}\n\n`;
    
    text += `=== RESUMEN GENERAL DE FRENTES ===\n`;
    report.frentes.forEach(f => {
      const isMv = f.id.startsWith('f_mv');
      text += `- Frente ${f.frente} (CIV ${f.civ}): ${f.eje} [${isMv ? 'Malla Vial' : 'Espacio Público'}] | Progreso: ${f.progress}% | Estado: ${f.status}\n`;
    });
    text += `\n`;

    text += `=== DETALLES POR FRENTE ===\n\n`;
    const activeFrentes = report.frentes.filter(f => f.fotos && f.fotos.length > 0);
    activeFrentes.forEach(f => {
      const isMv = f.id.startsWith('f_mv');
      text += `FRENTE ${f.frente} - CIV ${f.civ}\n`;
      text += `Ubicación: ${f.desde} al ${f.hasta} (${f.eje})\n`;
      text += `Progreso: ${f.progress}%\n`;
      
      const design = getDisenoForCiv(f.civ);
      if (design?.paquete_estructural_capas) {
        text += `Diseño de Pavimento Aprobado:\n`;
        design.paquete_estructural_capas.forEach(l => {
          text += `  - Capa: ${l.nombre} (${l.espesor_cm} cm)\n`;
        });
      }
      
      text += `Notas de Bitácora:\n`;
      const activeNotes = f.bitacora_notes?.filter(n => n.note.trim() !== '') || [];
      if (activeNotes.length === 0) {
        text += `  (Sin notas de bitácora esta semana)\n`;
      } else {
        activeNotes.forEach(n => {
          text += `  * ${n.date}: ${n.note}\n`;
        });
      }

      text += `Anotaciones de Fotos:\n`;
      const activePhotos = f.fotos || [];
      if (activePhotos.length === 0) {
        text += `  (Sin fotos cargadas)\n`;
      } else {
        activePhotos.forEach((ph, idx) => {
          text += `  * Foto ${idx + 1} (${ph.date || 'Semanal'}): ${ph.caption || 'Sin anotación'}\n`;
        });
      }
      text += `--------------------------------------------------\n\n`;
    });

    text += `INSTRUCCIÓN PARA LA REDACCIÓN:\n`;
    text += `Actúa como un Ingeniero Senior de Interventoría Técnica. Genera un análisis técnico formal y profesional estructurado FRENTE POR FRENTE para cada frente activo. Usa estrictamente el siguiente formato para cada frente:\n\n`;
    text += `FRENTE [Número de Frente]: [Tu análisis técnico de la semana, avances, bitácoras y fotos en un párrafo conciso pero completo en tono directivo para el cliente IDU]\n\n`;
    text += `Ejemplo:\n`;
    text += `FRENTE 1: Se realizaron actividades de excavación mecánica y colocación de base granular...\n`;
    text += `FRENTE 2: Se avanzó con la colocación del concreto hidráulico...`;

    navigator.clipboard.writeText(text)
      .then(() => {
        alert('¡Datos de frentes copiados con éxito! Pégalos en tu asistente de redacción.');
      })
      .catch(err => {
        console.error('Error al copiar:', err);
        alert('No se pudo copiar automáticamente.');
      });
  };

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
        onSaveWithoutClose={(updatedFrente) => {
          onSaveFrente(updatedFrente);
        }}
        onNavigateFrente={(direction) => {
          const currentIndex = report.frentes.findIndex(f => f.id === editingFrenteId);
          if (currentIndex === -1) return;
          let nextIndex = currentIndex;
          if (direction === 'prev') {
            nextIndex = currentIndex - 1;
            if (nextIndex < 0) nextIndex = report.frentes.length - 1;
          } else {
            nextIndex = currentIndex + 1;
            if (nextIndex >= report.frentes.length) nextIndex = 0;
          }
          setEditingFrenteId(report.frentes[nextIndex].id);
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
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {dailyPhotos.map((photo) => (
                                  <div key={photo.id} className="border border-slate-200 rounded-lg overflow-hidden bg-slate-100 shadow-xs flex flex-col">
                                    <div className="aspect-square relative bg-slate-200 overflow-hidden">
                                      <img 
                                        src={photo.url} 
                                        alt={photo.caption || 'Foto de avance'} 
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    {photo.caption && (
                                      <div className="p-1.5 bg-white text-[9px] font-semibold text-slate-650 border-t border-slate-100 leading-tight break-words whitespace-normal flex-1">
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
          <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
            
            {/* Left Sidebar: Editor Panel (Hidden in Print) */}
            <div className="w-full lg:w-[320px] flex flex-col gap-5 shrink-0 no-print bg-white p-5 rounded-xl border border-slate-200 shadow-sm sticky top-[95px]">
              <div>
                <div className="flex items-center gap-2 text-primary">
                  <span className="material-symbols-outlined text-[20px] font-bold">psychology</span>
                  <h3 className="font-extrabold text-sm text-slate-800">Asistente de Redacción</h3>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                  Copia las bitácoras de frentes, procésalas con tu asistente y pega la respuesta consolidada aquí para incluirla en el reporte.
                </p>
              </div>

              {/* Action 1: Copy Data */}
              <button
                onClick={handleCopyInfo}
                className="w-full bg-primary hover:bg-primary/95 text-white text-xs font-bold py-2.5 px-3 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">content_copy</span>
                Copiar Datos de Frentes
              </button>

              <hr className="border-slate-100" />

              {/* Action 2: Input Text */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-700">
                  <span>Consolidado de Interventoría</span>
                  {iaText !== report.consolidado_ia && (
                    <span className="text-[9px] text-amber-600 font-extrabold animate-pulse">Sin guardar</span>
                  )}
                </div>
                <textarea
                  rows={9}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-[11px] leading-relaxed font-semibold focus:bg-white focus:outline-none resize-none focus:ring-1 focus:ring-primary/20"
                  placeholder="Pega el resumen consolidado de interventoría aquí..."
                  value={iaText}
                  onChange={(e) => setIaText(e.target.value)}
                  onBlur={handleBlur}
                />
              </div>

              <button
                onClick={handleSaveIAConsolidated}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">save</span>
                Guardar Consolidado
              </button>

              <hr className="border-slate-100" />

              {/* Action 3: Printing Modes */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Modo de Impresión PDF</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setPrintMode('full');
                      setTimeout(() => { window.print(); }, 150);
                    }}
                    className={`flex-1 text-[10.5px] font-extrabold py-2 px-1 rounded-lg border shadow-2xs transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      printMode === 'full' 
                        ? 'bg-slate-900 border-slate-900 text-white' 
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">print</span>
                    Completo
                  </button>
                  <button
                    onClick={() => {
                      setPrintMode('simplified');
                      setTimeout(() => { window.print(); }, 150);
                    }}
                    className={`flex-1 text-[10.5px] font-extrabold py-2 px-1 rounded-lg border shadow-2xs transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      printMode === 'simplified' 
                        ? 'bg-slate-900 border-slate-900 text-white' 
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">description</span>
                    Simplificado
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: PDF Preview Column */}
            <div className="flex-1 w-full space-y-4">
              
              {/* Info Banner */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex items-center justify-between no-print">
                <div>
                  <h3 className="font-bold text-xs text-slate-800">
                    Vista Previa ({printMode === 'full' ? 'Completo con todo' : 'Simplificado: Análisis + Fotos'})
                  </h3>
                  <p className="text-[10px] text-slate-500">Muestra el diseño exacto que se exportará al PDF.</p>
                </div>
                <button
                  onClick={() => setPrintMode(printMode === 'full' ? 'simplified' : 'full')}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-extrabold py-1.5 px-3 rounded-lg border border-slate-250 transition-all cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
                  Cambiar a {printMode === 'full' ? 'Simplificado' : 'Completo'}
                </button>
              </div>

              {/* A4 Simulator Preview */}
              <div className="bg-white border border-slate-350 shadow-xl rounded-xl p-8 max-w-4xl mx-auto A4-preview font-sans text-slate-800 leading-normal">
              
              {/* PDF Header */}
              <div className="border-b-2 border-slate-800 pb-4 flex justify-between items-center">
                <div>
                  <h1 className="text-sm font-black tracking-tight text-slate-900 uppercase">
                    INFORME SEMANAL DE INTERVENTORÍA TÉCNICA
                  </h1>
                  <p className="text-[10px] font-black text-primary uppercase leading-tight mb-0.5">INCOLTA SAS</p>
                  <p className="text-[9px] font-bold text-slate-500">Consorcio Interventoría Usaquén • Contrato IDU-19-620-18</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black bg-slate-900 text-white px-2.5 py-1 rounded">
                    SEMANA {report.numero_semana}
                  </span>
                  <p className="text-[9px] text-slate-400 mt-1">{report.fecha_inicial_corte} al {report.fecha_final_corte}</p>
                </div>
              </div>

              {/* PDF Meta */}
              <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 text-[10px]">
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Entidad Contratante</p>
                  <p className="font-extrabold text-slate-800">Instituto de Desarrollo Urbano (IDU)</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Avance Físico del Período</p>
                  <p className="font-extrabold text-slate-800">+{weeklyProgress}% en la semana</p>
                </div>
              </div>

              {/* PDF Resumen Frentes Table */}
              {printMode === 'full' && (
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
                        <th className="py-2 px-1 text-center">Progreso</th>
                        <th className="py-2 px-1 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.frentes.filter(f => f.fotos && f.fotos.length > 0).map(f => {
                        const isMv = f.id.startsWith('f_mv');
                        return (
                          <tr key={f.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                            <td className="py-2 px-1 font-bold">{f.frente}</td>
                            <td className="py-2 px-1 font-bold text-slate-650">{f.civ}</td>
                            <td className="py-2 px-1 text-[9px] uppercase font-bold text-slate-500">
                              {isMv ? 'Malla Vial' : 'Espacio Público'}
                            </td>
                            <td className="py-2 px-1 text-slate-600 truncate max-w-xs">{f.eje}</td>
                            <td className="py-2 px-1 text-center font-bold">{f.progress}%</td>
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
              )}

              {/* PDF AI Consolidated Section */}
              {report.consolidado_ia && (
                <div className="py-4 border-b border-slate-200 text-left">
                  <h3 className="text-xs font-black text-slate-950 uppercase mb-2 pb-1 border-b border-slate-300 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[14px]">rate_review</span>
                    {printMode === 'full' ? 'II.' : 'I.'} Consolidado de Interventoría
                  </h3>
                  <div className="bg-slate-50 border border-slate-200 rounded p-3 text-[10px] text-slate-850 leading-relaxed whitespace-pre-line italic font-semibold shadow-2xs">
                    {report.consolidado_ia}
                  </div>
                </div>
              )}

              {/* PDF Fichas Técnicas Individuales (Frente por Frente) */}
              <div className="py-4 space-y-8 page-break-before">
                <h3 className="text-xs font-black text-slate-950 uppercase mb-4 border-b border-slate-300 pb-1 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[14px]">engineering</span>
                  {printMode === 'full' 
                    ? report.consolidado_ia ? 'III. Fichas Técnicas de Frentes Activos' : 'II. Fichas Técnicas de Frentes Activos'
                    : report.consolidado_ia ? 'II. Evidencia Fotográfica por Frente' : 'I. Evidencia Fotográfica por Frente'}
                </h3>

                {report.frentes.filter(f => f.fotos && f.fotos.length > 0).map((frente) => (
                  <PrintFrenteCard 
                    key={frente.id} 
                    frente={frente} 
                    printMode={printMode} 
                    allFrentes={allFrentes} 
                    consolidadoIa={iaText} 
                    getDayName={getDayName} 
                  />
                ))}
              </div>

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
        <div className="border-b-2 border-slate-800 pb-4 flex justify-between items-center text-left">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px] font-black">assignment</span>
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-slate-900 uppercase leading-none">
                INFORME SEMANAL DE INTERVENTORÍA TÉCNICA
              </h1>
              <p className="text-xs font-black text-primary uppercase leading-tight mt-1 mb-0.5">INCOLTA SAS</p>
              <p className="text-[10px] font-bold text-slate-500">Consorcio Interventoría Usaquén • Contrato IDU-19-620-18</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm font-black bg-slate-900 text-white px-2.5 py-1 rounded">
              SEMANA {report.numero_semana}
            </span>
            <p className="text-[10px] text-slate-450 mt-1 font-semibold flex items-center justify-end gap-1">
              <span className="material-symbols-outlined text-[11px] text-slate-455">calendar_today</span>
              {report.fecha_inicial_corte} al {report.fecha_final_corte}
            </p>
          </div>
        </div>

        {/* PDF Meta */}
        <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs text-left">
          <div>
            <p className="text-slate-450 font-bold uppercase tracking-wider text-[8px] flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[9px] text-slate-400">domain</span>
              Entidad Contratante
            </p>
            <p className="font-extrabold text-slate-800">Instituto de Desarrollo Urbano (IDU)</p>
          </div>
          <div>
            <p className="text-slate-450 font-bold uppercase tracking-wider text-[8px] flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[9px] text-slate-400">trending_up</span>
              Avance Físico del Período
            </p>
            <p className="font-extrabold text-slate-800">+{weeklyProgress}% en la semana</p>
          </div>
        </div>

        {/* PDF Resumen Frentes Table */}
        {printMode === 'full' && (
          <div className="py-4 text-left">
            <h3 className="text-xs font-black text-slate-950 uppercase mb-3 border-b border-slate-350 pb-1 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[14px]">view_list</span>
              I. Resumen General de Frentes
            </h3>
            <table className="w-full text-left border-collapse text-[10px]">
              <thead>
                <tr className="bg-slate-100 text-slate-650 border-b border-slate-200 font-bold">
                  <th className="py-2 px-1">Frente</th>
                  <th className="py-2 px-1">CIV</th>
                  <th className="py-2 px-1">Tipo</th>
                  <th className="py-2 px-1">Tramo / Eje</th>
                  <th className="py-2 px-1 text-center">Progreso</th>
                  <th className="py-2 px-1 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {report.frentes.filter(f => f.fotos && f.fotos.length > 0).map(f => {
                  const isMv = f.id.startsWith('f_mv');
                  return (
                    <tr key={f.id} className="border-b border-slate-150">
                      <td className="py-2 px-1 font-bold">{f.frente}</td>
                      <td className="py-2 px-1 font-bold text-slate-650">{f.civ}</td>
                      <td className="py-2 px-1 text-[9px] uppercase font-bold text-slate-500">
                        {isMv ? 'Malla Vial' : 'Espacio Público'}
                      </td>
                      <td className="py-2 px-1 text-slate-600">{f.eje}</td>
                      <td className="py-2 px-1 text-center font-bold">{f.progress}%</td>
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
        )}

        {/* PDF AI Consolidated Section */}
        {report.consolidado_ia && (
          <div className="py-4 border-b border-slate-200 text-left">
            <h3 className="text-xs font-black text-slate-950 uppercase mb-2 pb-1 border-b border-slate-355 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[14px]">rate_review</span>
              {printMode === 'full' ? 'II.' : 'I.'} Consolidado de Interventoría
            </h3>
            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-[10px] text-slate-850 leading-relaxed whitespace-pre-line italic font-semibold">
              {report.consolidado_ia}
            </div>
          </div>
        )}

        {/* PDF Fichas Técnicas Individuales (Frente por Frente) */}
        <div className="py-4 space-y-6">
          <h3 className="text-xs font-black text-slate-950 uppercase mb-4 border-b border-slate-350 pb-1 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[14px]">engineering</span>
            {printMode === 'full' 
              ? report.consolidado_ia ? 'III. Fichas Técnicas de Frentes Activos' : 'II. Fichas Técnicas de Frentes Activos'
              : report.consolidado_ia ? 'II. Evidencia Fotográfica por Frente' : 'I. Evidencia Fotográfica por Frente'}
          </h3>

          {report.frentes.filter(f => f.fotos && f.fotos.length > 0).map((frente) => (
            <PrintFrenteCard 
              key={frente.id} 
              frente={frente} 
              printMode={printMode} 
              allFrentes={allFrentes} 
              consolidadoIa={iaText} 
              getDayName={getDayName} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}
