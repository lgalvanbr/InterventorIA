import React, { useState, useEffect } from 'react';
import { 
  FileText, Calendar, Layers, CheckCircle, 
  ArrowLeft, Users, MessageSquare,
  DollarSign, TrendingUp, Printer, RefreshCw, Zap
} from 'lucide-react';
import WeeklyFrenteDetail from './WeeklyFrenteDetail';
import { getDisenoForCiv } from '../data/frentesDisenos';
import { generateMonthlyBitacoraText, getReportMonthKey, getReportMonthLabel } from '../data/reportsWeekly';
import { optimizePhotoListForPrint } from '../utils/printOptimizer';
import StaticMapThumbnail from './StaticMapThumbnail';

const getIaCommentForFrente = (consolidadoIa, frenteNumber) => {
  if (!consolidadoIa) return '';
  const regex = new RegExp(`FRENTE\\s+${frenteNumber}\\s*[:•\\-\\s]([\\s\\S]*?)(?=(?:FRENTE\\s+\\d+\\s*[:•\\-\\s])|$)`, 'i');
  const match = consolidadoIa.match(regex);
  return match ? match[1].trim() : '';
};

const PrintFrenteCard = ({ 
  frente, 
  printMode, 
  allFrentes, 
  designOverrides, 
  consolidadoIa, 
  getDayName, 
  report, 
  isContractorMode,
  maxPhotos = 'all',
  optimizedImagesMap = null,
  pageBreakBefore = false
}) => {
  const isMv = frente.id.startsWith('f_mv');
  const activeNotes = frente.bitacora_notes?.filter(n => n.note && n.note.trim() !== '') || [];
  
  // Safe dual photo resolution with deduplication
  const allPhotosRaw = [...(frente.fotos || []), ...(frente.photos || [])];
  const photoMap = new Map();
  allPhotosRaw.forEach(p => {
    const key = p.id || p.url;
    if (key && !photoMap.has(key)) photoMap.set(key, p);
  });
  let activePhotos = Array.from(photoMap.values());
  if (maxPhotos !== 'all' && typeof maxPhotos === 'number' && activePhotos.length > maxPhotos) {
    activePhotos = activePhotos.slice(0, maxPhotos);
  }
  
  const originalFrente = allFrentes?.find(o => o.id === frente.id);
  const lat = originalFrente?.latitude || frente?.latitude || '4.76902';
  const lng = originalFrente?.longitude || frente?.longitude || '-74.02863';

  const frenteIaComment = getIaCommentForFrente(consolidadoIa, frente.frente);

  const parseSafeDate = (dateStr) => {
    if (!dateStr || dateStr === 'Sin fecha') return null;
    if (/^\d+$/.test(String(dateStr))) {
      const d = new Date(Number(dateStr));
      if (!isNaN(d.getTime())) return d;
    }
    const ymdMatch = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
      const d = new Date(`${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}T12:00:00`);
      if (!isNaN(d.getTime())) return d;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
    return null;
  };

  const getMappedDateStr = (photoDateStr) => {
    if (!photoDateStr || photoDateStr === 'Sin fecha' || !report?.fecha_inicial_corte) return 'Sin fecha';
    try {
      const photoDate = parseSafeDate(photoDateStr);
      if (!photoDate) return photoDateStr;
      const start = parseSafeDate(report.fecha_inicial_corte);
      if (!start) return photoDateStr;

      const jsDay = photoDate.getDay();
      const dayIndex = jsDay === 6 ? 0 : jsDay + 1; // 6 (Saturday) -> 0, 0 (Sunday) -> 1, ..., 5 (Friday) -> 6

      const mappedDate = new Date(start);
      mappedDate.setDate(start.getDate() + dayIndex);

      return mappedDate.toISOString().split('T')[0];
    } catch {
      return photoDateStr;
    }
  };

  const getFriendlyPhotoDate = (photoDateStr) => {
    const mappedStr = getMappedDateStr(photoDateStr);
    if (mappedStr === 'Sin fecha') return '';
    try {
      const mappedDate = parseSafeDate(mappedStr);
      if (!mappedDate) return photoDateStr;
      const dayName = getDayName(mappedDate);
      const dayNum = mappedDate.getDate();
      const monthNum = String(mappedDate.getMonth() + 1).padStart(2, '0');
      return `${dayName} ${dayNum}/${monthNum}`;
    } catch {
      return photoDateStr;
    }
  };

  const photosByDay = activePhotos.reduce((groups, photo) => {
    const rawDate = photo.date || 'Sin fecha';
    const dateKey = getMappedDateStr(rawDate);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(photo);
    return groups;
  }, {});

  return (
    <div className={`border border-slate-300 rounded-lg p-3.5 space-y-2.5 bg-white shadow-2xs text-left print-frente-card ${
      pageBreakBefore ? 'print-break-before-frente' : ''
    }`}>
      
      {/* Block 1: Header, Analysis, Location Map and Soil Profile (Kept together to avoid breaking) */}
      <div className="print-frente-header-block space-y-2.5">
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
        {!isContractorMode && frenteIaComment && (
          <div className="bg-slate-50 border-l-2 border-primary/50 p-2 rounded-r text-[9px] text-slate-800 leading-relaxed italic font-semibold shadow-2xs">
            <div className="flex items-center gap-1 text-primary text-[8px] font-black uppercase tracking-wider mb-0.5">
              <span className="material-symbols-outlined text-[11px]">rate_review</span>
              Análisis de Interventoría
            </div>
            "{frenteIaComment}"
          </div>
        )}

        {/* Mapa y Perfil de Estructura de Suelo */}
        {printMode === 'full' && (
          <div className="grid grid-cols-2 gap-3 text-[9px] print:flex print:gap-3 print:w-full">
            {/* Mapa de Ubicación */}
            <div className="bg-slate-50 p-2 rounded border border-slate-200 flex flex-col gap-1 justify-between print:w-1/2">
              <p className="font-black text-slate-750 uppercase tracking-wider text-[8px] flex items-center gap-1">
                <span className="material-symbols-outlined text-[10px] text-slate-400">location_on</span>
                Ubicación Georreferenciada
              </p>
              <div className="w-full h-[130px] overflow-hidden rounded border border-slate-250 relative bg-slate-100">
                <StaticMapThumbnail lat={lat} lng={lng} zoom={15} width={320} height={130} />
              </div>
              <div className="text-[8px] font-bold text-slate-500 text-center font-mono">
                COORDENADAS: {parseFloat(lat).toFixed(5)}, {parseFloat(lng).toFixed(5)}
              </div>
            </div>

            {/* Perfil de Suelo/Pavimento */}
            <div className="bg-slate-50 p-2 rounded border border-slate-200 flex flex-col gap-1 justify-between print:w-1/2">
              <p className="font-black text-slate-755 uppercase tracking-wider text-[8px] flex items-center gap-1">
                <span className="material-symbols-outlined text-[10px] text-slate-400">layers</span>
                Perfil de Estructura del Suelo
              </p>
              {(() => {
                const design = designOverrides?.[frente.civ] || getDisenoForCiv(frente.civ);
                const imgUrl = design?.perfil_suelo_img_url || frente.perfil_suelo_img_url;
                return imgUrl ? (
                  <div className="w-full h-[130px] overflow-hidden rounded border border-slate-200 relative bg-white flex items-center justify-center p-1 shadow-2xs">
                    <img 
                      src={imgUrl} 
                      alt="Perfil de estructura del suelo" 
                      className="w-full h-full object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col border border-slate-200 border-dashed rounded overflow-hidden flex-1 min-h-[130px] text-[8px] font-bold bg-slate-100 items-center justify-center text-slate-450 p-3 text-center leading-normal">
                    <span className="material-symbols-outlined text-slate-400 text-[18px] mb-0.5">image</span>
                    <span>Sin perfil de estructura de suelo</span>
                    <span className="text-[6.5px] font-normal opacity-75 mt-0.5">Sube el plano o esquema desde el detalle del frente</span>
                  </div>
                );
              })()}
              <div className="text-[8px] font-bold text-slate-500 text-center uppercase tracking-wide">
                Estructura de Pavimento Aprobada
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Block 2: Bitácora Consolidada Semanal */}
      {printMode === 'full' && (
        <div className="space-y-1.5 print-frente-header-block">
          <p className="font-black text-slate-750 uppercase tracking-wider text-[8px] flex items-center gap-1">
            <span className="material-symbols-outlined text-[10px] text-slate-400">notes</span>
            Bitácora Diaria del Periodo
          </p>
          {activeNotes.length === 0 ? (
            <p className="text-[9px] text-slate-400 italic">No se reportaron bitácoras en este frente durante la semana.</p>
          ) : (
            <div className="grid grid-cols-1 gap-1 text-[9px]">
              {activeNotes.map((noteItem) => {
                const noteDate = new Date(noteItem.date + 'T12:00:00');
                return (
                  <div key={noteItem.id} className="bg-slate-50/70 p-1.5 rounded border border-slate-100 flex gap-2">
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

      {/* Block 3: Evidencia Fotográfica Semanal (Cada foto con break-inside: avoid) */}
      {activePhotos.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center">
            <p className="font-black text-slate-750 uppercase tracking-wider text-[8px] flex items-center gap-1">
              <span className="material-symbols-outlined text-[10px] text-slate-400">photo_library</span>
              Evidencia Fotográfica Semanal ({activePhotos.length})
            </p>
            {maxPhotos !== 'all' && (
              <span className="text-[7.5px] font-bold text-slate-400 uppercase">
                Mostrando {activePhotos.length} fotos
              </span>
            )}
          </div>
          
          {printMode === 'simplified' ? (
            /* Grouped by day */
            <div className="space-y-2.5">
              {Object.keys(photosByDay).sort().map(dateStr => {
                const dateObj = new Date(dateStr + 'T12:00:00');
                const formattedDate = dateStr !== 'Sin fecha' 
                  ? `${getDayName(dateObj)} ${dateObj.getDate()} de ${dateObj.toLocaleDateString('es-CO', { month: 'long' })}`
                  : 'Otros avances';
                
                return (
                  <div key={dateStr} className="space-y-1">
                    <p className="font-bold text-slate-700 text-[8px] uppercase tracking-wide border-b border-slate-100 pb-0.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[10px] text-slate-400">calendar_month</span>
                      {formattedDate}
                    </p>
                    <div className="print-photos-grid grid grid-cols-4 gap-2">
                      {photosByDay[dateStr].map((photo) => {
                        const displayUrl = (optimizedImagesMap && optimizedImagesMap.get(photo.url)) || photo.url;
                        return (
                          <div key={photo.id} className="print-photo-item border border-slate-200 rounded overflow-hidden shadow-2xs bg-white text-[8px] flex flex-col relative">
                            <div className="aspect-square bg-slate-100 overflow-hidden relative">
                              <img 
                                src={displayUrl} 
                                alt="Avance" 
                                className="w-full h-full object-cover" 
                                onError={(e) => { 
                                  e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>'; 
                                }} 
                              />
                              {photo.date && (
                                <span className="absolute top-1 left-1 bg-black/60 text-white font-black px-1.5 py-0.5 rounded text-[7px] uppercase tracking-wide">
                                  {getFriendlyPhotoDate(photo.date)}
                                </span>
                              )}
                            </div>
                            <div className="p-1 text-slate-655 font-semibold border-t border-slate-150 break-words whitespace-normal leading-tight">
                              {photo.caption || 'Avance de obra'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Standard Grid for Full Mode */
            <div className="print-photos-grid grid grid-cols-4 gap-2">
              {activePhotos.map((photo) => {
                const displayUrl = (optimizedImagesMap && optimizedImagesMap.get(photo.url)) || photo.url;
                return (
                  <div key={photo.id} className="print-photo-item border border-slate-200 rounded overflow-hidden shadow-2xs bg-white text-[8px] flex flex-col relative">
                    <div className="aspect-square bg-slate-100 overflow-hidden relative">
                      <img 
                        src={displayUrl} 
                        alt="Avance" 
                        className="w-full h-full object-cover" 
                        onError={(e) => { 
                          e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>'; 
                        }} 
                      />
                      {photo.date && (
                        <span className="absolute top-1 left-1 bg-black/60 text-white font-black px-1.5 py-0.5 rounded text-[7px] uppercase tracking-wide">
                          {getFriendlyPhotoDate(photo.date)}
                        </span>
                      )}
                    </div>
                    <div className="p-1 text-slate-655 font-semibold border-t border-slate-150 break-words whitespace-normal leading-tight">
                      {photo.caption || 'Avance de obra'}
                    </div>
                  </div>
                );
              })}
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
  designOverrides,
  onUpdateDesignOverrides,
  onClose, 
  onSaveFrente,
  onSaveReport,
  isContractorMode
}) {
  const [activeTab, setActiveTab] = useState('comite'); // 'comite', 'pdf', 'frentes'
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [editingFrenteId, setEditingFrenteId] = useState(initialEditingFrenteId);
  const [iaText, setIaText] = useState(report?.consolidado_ia || '');
  const [printMode, setPrintMode] = useState('full'); // 'full' or 'simplified'
  const [pdfQuality, setPdfQuality] = useState('light'); // 'light' (downscaled) or 'original'
  const [maxPhotosPerFrente, setMaxPhotosPerFrente] = useState(8); // 4, 8, 'all'
  const [pageBreakPerFrente, setPageBreakPerFrente] = useState(false);
  const [isOptimizingForPrint, setIsOptimizingForPrint] = useState(false);
  const [optimizedImagesMap, setOptimizedImagesMap] = useState(null);

  useEffect(() => {
    if (initialEditingFrenteId) {
      setEditingFrenteId(initialEditingFrenteId);
    }
  }, [initialEditingFrenteId]);

  const handleTriggerPrint = async () => {
    if (pdfQuality === 'light') {
      setIsOptimizingForPrint(true);
      try {
        const activeFrentes = (report?.frentes || []).filter(f => 
          (f.fotos && f.fotos.length > 0) || (f.photos && f.photos.length > 0)
        );
        const allPrintPhotos = [];
        activeFrentes.forEach(f => {
          const raw = [...(f.fotos || []), ...(f.photos || [])];
          const map = new Map();
          raw.forEach(p => {
            const key = p.id || p.url;
            if (key && !map.has(key)) map.set(key, p);
          });
          let list = Array.from(map.values());
          if (maxPhotosPerFrente !== 'all' && typeof maxPhotosPerFrente === 'number') {
            list = list.slice(0, maxPhotosPerFrente);
          }
          allPrintPhotos.push(...list);
        });

        if (allPrintPhotos.length > 0) {
          const map = await optimizePhotoListForPrint(allPrintPhotos, 640, 0.70);
          setOptimizedImagesMap(map);
        }
      } catch (err) {
        console.warn("Print optimization fallback to original:", err);
      } finally {
        setIsOptimizingForPrint(false);
      }
    }

    // Give DOM brief moment to update img elements with optimized data
    setTimeout(() => {
      window.print();
    }, 250);
  };

  useEffect(() => {
    if (report) {
      setIaText(report.consolidado_ia || '');
    }
  }, [report]);

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
      const progress = f.porcentaje_avance_semana ?? f.progress ?? 0;
      const status = f.pmt_estado || f.status || 'Al día';
      text += `- Frente ${f.frente} (CIV ${f.civ}): ${f.eje} [${isMv ? 'Malla Vial' : 'Espacio Público'}] | Progreso: ${progress}% | Estado: ${status}\n`;
    });
    text += `\n`;

    text += `=== DETALLES POR FRENTE ===\n\n`;
    const activeFrentes = report.frentes.filter(f => (f.fotos && f.fotos.length > 0) || (f.photos && f.photos.length > 0));
    activeFrentes.forEach(f => {
      const progress = f.porcentaje_avance_semana ?? f.progress ?? 0;
      text += `FRENTE ${f.frente} - CIV ${f.civ}\n`;
      text += `Ubicación: ${f.desde} al ${f.hasta} (${f.eje})\n`;
      text += `Progreso: ${progress}%\n`;
      
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

  const handleCopyMonthlyInfo = () => {
    const reportsList = weeklyReports && weeklyReports.length > 0 ? weeklyReports : [report];
    const monthKey = getReportMonthKey(report);
    const monthLabel = getReportMonthLabel(monthKey);
    const text = generateMonthlyBitacoraText(reportsList, monthKey);

    navigator.clipboard.writeText(text)
      .then(() => {
        alert(`¡Bitácora del mes (${monthLabel}) copiada con éxito para IA!\n\nPégala en tu asistente de redacción para generar el informe mensual.`);
      })
      .catch(err => {
        console.error('Error al copiar bitácora mensual:', err);
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

  // Tab 1: Filter frentes that had activity on the selected day (checking both properties!)
  const activeDayFrentes = (report?.frentes || []).filter(f => {
    const hasNote = f.bitacora_notes?.some(n => n.date === activeDateStr && n.note && n.note.trim() !== '') ||
                    f.bitacora_notas?.some(n => n.date === activeDateStr && n.note && n.note.trim() !== '');
    const hasPhotos = f.fotos?.some(ph => ph.date === activeDateStr) ||
                      f.photos?.some(ph => ph.date === activeDateStr);
    return hasNote || hasPhotos;
  });

  // Calculate totals resiliently across property variations
  const totalFrentes = report?.frentes?.length || 0;
  const frentesInExecution = (report?.frentes || []).filter(f => 
    (f.porcentaje_avance_semana !== undefined ? f.porcentaje_avance_semana < 100 : true) &&
    f.pmt_estado !== 'Suspendido' &&
    f.status !== 'Suspendido'
  ).length;

  const weeklyProgress = report?.avance_meta_porcentaje ?? 
    report?.avance_semanal_fisico ?? 
    (report?.malla_vial_ejecutado && report?.espacio_publico_ejecutado 
      ? Math.round(((report.malla_vial_ejecutado + report.espacio_publico_ejecutado) / 2) * 100) 
      : 0);

  const weeklyBudget = (report?.frentes || []).reduce((acc, curr) => 
    acc + (curr.ejecucion_presupuestal_semana || curr.presupuesto_semana || 0), 0
  );

  // Render inline editor if editing a frente
  if (editingFrenteId) {
    return (
      <WeeklyFrenteDetail
        report={report}
        frenteId={editingFrenteId}
        designOverrides={designOverrides}
        onUpdateDesignOverrides={onUpdateDesignOverrides}
        isContractorMode={isContractorMode}
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
                  // Calculate frentes with activity on this day (dual property check)
                  const activityCount = (report.frentes || []).filter(f => {
                    const hasNote = f.bitacora_notes?.some(n => n.date === dStr && n.note && n.note.trim() !== '') ||
                                    f.bitacora_notas?.some(n => n.date === dStr && n.note && n.note.trim() !== '');
                    const hasPhotos = f.fotos?.some(ph => ph.date === dStr) ||
                                      f.photos?.some(ph => ph.date === dStr);
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
                <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-12 text-center text-slate-400 shadow-sm flex flex-col items-center justify-center gap-3">
                  <MessageSquare size={36} className="text-slate-300" />
                  <div>
                    <p className="text-xs font-bold text-slate-650">No hay novedades registradas para este día específico.</p>
                    <p className="text-[10px] text-slate-400 mt-1">Los inspectores no reportaron fotos o notas en esta fecha ({getDayLabel(weekDates[activeDayIdx])}).</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('frentes')}
                      className="bg-primary hover:bg-primary/95 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Layers size={14} />
                      <span>Ver Frentes de la Semana ({totalFrentes})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('pdf')}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-4 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText size={14} />
                      <span>Ver Resumen General (PDF)</span>
                    </button>
                  </div>
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
                                        loading="lazy"
                                        decoding="async"
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
            
            {/* Left Sidebar: Editor/Print Panel (Hidden in Print) */}
            <div className="w-full lg:w-[320px] flex flex-col gap-5 shrink-0 no-print bg-white p-5 rounded-xl border border-slate-200 shadow-sm sticky top-[95px]">
              {!isContractorMode ? (
                <>
                  <div>
                    <div className="flex items-center gap-2 text-primary">
                      <span className="material-symbols-outlined text-[20px] font-bold">psychology</span>
                      <h3 className="font-extrabold text-sm text-slate-800">Asistente de Redacción</h3>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                      Copia las bitácoras de frentes, procésalas con tu asistente y pega la respuesta consolidada aquí para incluirla en el reporte.
                    </p>
                  </div>

                  {/* Action 1: Copy Data (Semanal y Mensual) */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleCopyInfo}
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-2.5 px-3 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Copia los datos e hitos de la semana actual"
                    >
                      <span className="material-symbols-outlined text-[15px]">content_copy</span>
                      Copiar Bitácora Semanal
                    </button>

                    <button
                      onClick={handleCopyMonthlyInfo}
                      className="w-full bg-primary hover:bg-primary/95 text-white text-xs font-bold py-2.5 px-3 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Agrupa y copia todas las bitácoras y actividades del mes actual para la IA"
                    >
                      <span className="material-symbols-outlined text-[15px]">date_range</span>
                      Copiar Bitácora Mensual (IA)
                    </button>
                  </div>

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
                </>
              ) : (
                <div>
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <span className="material-symbols-outlined text-[20px] font-bold">print</span>
                    <h3 className="font-extrabold text-sm text-slate-800">Opciones de Exportación</h3>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Selecciona el formato de impresión del informe semanal para exportar a PDF.
                  </p>
                </div>
              )}

              {/* Action 3: Printing Modes & PDF Controls */}
              <div className="flex flex-col gap-3">
                
                {/* 1. Format Mode */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    Formato de Fichas
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPrintMode('full')}
                      className={`flex-1 text-[10px] font-black py-2 px-1 rounded-lg border transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                        printMode === 'full' 
                          ? 'bg-slate-900 border-slate-900 text-white shadow-xs' 
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">print</span>
                      Completo
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintMode('simplified')}
                      className={`flex-1 text-[10px] font-black py-2 px-1 rounded-lg border transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                        printMode === 'simplified' 
                          ? 'bg-slate-900 border-slate-900 text-white shadow-xs' 
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">description</span>
                      Simplificado
                    </button>
                  </div>
                </div>

                {/* 2. PDF Quality & File Size Optimizer */}
                <div className="flex flex-col gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                      <Zap size={12} className="text-amber-500" />
                      Peso del PDF
                    </span>
                    <span className="text-[8px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded uppercase">
                      {pdfQuality === 'light' ? 'Ligero (<10MB)' : 'Alta Res.'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[9.5px]">
                    <button
                      type="button"
                      onClick={() => setPdfQuality('light')}
                      className={`py-1.5 px-2 rounded-lg font-black border transition-all text-center ${
                        pdfQuality === 'light'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                      title="Comprime imágenes en canvas para que el archivo PDF pese menos de 10MB (ideal correo/WhatsApp)"
                    >
                      🚀 Ligero (-85%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPdfQuality('original')}
                      className={`py-1.5 px-2 rounded-lg font-black border transition-all text-center ${
                        pdfQuality === 'original'
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                      title="Resolución máxima de archivo original (puede generar un PDF de más de 50MB)"
                    >
                      💎 Original
                    </button>
                  </div>
                  <p className="text-[8.5px] text-slate-500 leading-tight">
                    {pdfQuality === 'light' 
                      ? 'Recomendado: comprime fotos para envío ágil sin perder nitidez de impresión.' 
                      : 'Descarga las fotos a su tamaño nativo de cámara.'}
                  </p>
                </div>

                {/* 3. Photos per frente limit */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    Fotos por Frente
                  </span>
                  <div className="flex gap-1 text-[9.5px]">
                    {[4, 8, 'all'].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setMaxPhotosPerFrente(val)}
                        className={`flex-1 py-1.5 rounded-lg font-black border transition-all text-center ${
                          maxPhotosPerFrente === val
                            ? 'bg-primary text-white border-primary shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {val === 'all' ? 'Todas' : `Máx. ${val}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Page Break Option */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    Distribución de Hojas
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 text-[9.5px]">
                    <button
                      type="button"
                      onClick={() => setPageBreakPerFrente(false)}
                      className={`py-1.5 px-1 rounded-lg font-black border transition-all text-center ${
                        !pageBreakPerFrente
                          ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Continuo
                    </button>
                    <button
                      type="button"
                      onClick={() => setPageBreakPerFrente(true)}
                      className={`py-1.5 px-1 rounded-lg font-black border transition-all text-center ${
                        pageBreakPerFrente
                          ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      1 Frente / Hoja
                    </button>
                  </div>
                </div>

                {/* 5. Main Print / PDF Button */}
                <button
                  type="button"
                  onClick={handleTriggerPrint}
                  disabled={isOptimizingForPrint}
                  className="w-full bg-primary hover:bg-primary-container active:scale-98 text-white font-black text-xs py-3 px-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
                >
                  {isOptimizingForPrint ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Optimizando PDF...</span>
                    </>
                  ) : (
                    <>
                      <Printer size={16} />
                      <span>Descargar PDF / Imprimir</span>
                    </>
                  )}
                </button>

              </div>
            </div>

            {/* Right Column: PDF Preview Column */}
            <div className="flex-1 w-full space-y-4">
              
              {/* Info Banner */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex items-center justify-between no-print flex-wrap gap-3">
                <div>
                  <h3 className="font-bold text-xs text-slate-800 flex items-center gap-2">
                    <span>Vista Previa ({printMode === 'full' ? 'Completo' : 'Simplificado'})</span>
                    <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {pdfQuality === 'light' ? '🚀 PDF Ligero Activado' : '💎 Máxima Calidad'}
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-500">Muestra el diseño exacto anti-corte que se exportará al PDF.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPrintMode(printMode === 'full' ? 'simplified' : 'full')}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-extrabold py-2 px-3 rounded-lg border border-slate-250 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
                    {printMode === 'full' ? 'Simplificado' : 'Completo'}
                  </button>
                  <button
                    onClick={handleTriggerPrint}
                    disabled={isOptimizingForPrint}
                    className="bg-primary hover:bg-primary-container active:scale-98 text-white text-[10px] font-black py-2 px-4 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {isOptimizingForPrint ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Preparando...</span>
                      </>
                    ) : (
                      <>
                        <Printer size={14} />
                        <span>Descargar PDF / Imprimir</span>
                      </>
                    )}
                  </button>
                </div>
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
                      {report.frentes.map(f => {
                        const isMv = f.id.startsWith('f_mv');
                        const progress = f.porcentaje_avance_semana ?? f.progress ?? 0;
                        const status = f.pmt_estado || f.status || 'Al día';
                        return (
                          <tr key={f.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                            <td className="py-2 px-1 font-bold">{f.frente}</td>
                            <td className="py-2 px-1 font-bold text-slate-650">{f.civ}</td>
                            <td className="py-2 px-1 text-[9px] uppercase font-bold text-slate-500">
                              {isMv ? 'Malla Vial' : 'Espacio Público'}
                            </td>
                            <td className="py-2 px-1 text-slate-600 truncate max-w-xs">{f.eje}</td>
                            <td className="py-2 px-1 text-center font-bold">{progress}%</td>
                            <td className="py-2 px-1 text-center">
                              <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                {status}
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
              {!isContractorMode && report.consolidado_ia && (
                <div className="py-4 border-b border-slate-200 text-left">
                  <h3 className="text-xs font-black text-slate-955 uppercase mb-2 pb-1 border-b border-slate-300 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[14px]">rate_review</span>
                    {printMode === 'full' ? 'II.' : 'I.'} Consolidado de Interventoría
                  </h3>
                  <div className="bg-slate-50 border border-slate-200 rounded p-3 text-[10px] text-slate-855 leading-relaxed whitespace-pre-line italic font-semibold shadow-2xs">
                    {report.consolidado_ia}
                  </div>
                </div>
              )}

              {/* PDF Fichas Técnicas Individuales (Frente por Frente) */}
              <div className="py-4 space-y-6">
                <h3 className="text-xs font-black text-slate-955 uppercase mb-4 border-b border-slate-300 pb-1 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[14px]">engineering</span>
                  {printMode === 'full' 
                    ? (!isContractorMode && report.consolidado_ia) ? 'III. Fichas Técnicas de Frentes Activos' : 'II. Fichas Técnicas de Frentes Activos'
                    : (!isContractorMode && report.consolidado_ia) ? 'II. Evidencia Fotográfica por Frente' : 'I. Evidencia Fotográfica por Frente'}
                </h3>

                {(() => {
                  const frentesWithEvidence = report.frentes.filter(f => 
                    (f.fotos && f.fotos.length > 0) || 
                    (f.photos && f.photos.length > 0) ||
                    (f.bitacora_notes && f.bitacora_notes.some(n => n.note && n.note.trim() !== '')) ||
                    (f.bitacora_notas && f.bitacora_notas.some(n => n.nota && n.nota.trim() !== ''))
                  );

                  if (frentesWithEvidence.length === 0) {
                    return (
                      <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center no-print">
                        <p className="text-xs font-bold text-slate-600">
                          Esta semana no cuenta con fichas fotográficas individuales registradas aún.
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Consulte la tabla de resumen general arriba o agregue fotos desde el Portal de Inspector.
                        </p>
                      </div>
                    );
                  }

                  return frentesWithEvidence.map((frente) => (
                    <PrintFrenteCard 
                      key={frente.id} 
                      frente={frente} 
                      printMode={printMode} 
                      allFrentes={allFrentes} 
                      designOverrides={designOverrides}
                      consolidadoIa={iaText} 
                      getDayName={getDayName} 
                      report={report}
                      isContractorMode={isContractorMode}
                      maxPhotos={maxPhotosPerFrente}
                      optimizedImagesMap={optimizedImagesMap}
                      pageBreakBefore={pageBreakPerFrente}
                    />
                  ));
                })()}
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
                    const progress = frente.porcentaje_avance_semana ?? frente.progress ?? 0;
                    const status = frente.pmt_estado || frente.status || 'Al día';
                    const budgetM = frente.ejecucion_presupuestal_semana 
                      ? Math.round(frente.ejecucion_presupuestal_semana / 1000000) 
                      : (frente.presupuesto_semana || 0);

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
                            <span className="font-bold">{progress}%</span>
                            <div className="w-12 bg-slate-150 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-primary h-full" style={{ width: `${progress}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-800">
                          ${budgetM}M
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                            status === 'Ejecución' || status === 'Activo' || status === 'Aprobado' || status === 'Al día'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-850'
                          }`}>
                            {status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setEditingFrenteId(frente.id)}
                            className="bg-primary/5 hover:bg-primary/10 text-primary font-bold text-[10px] py-1.5 px-3 rounded-lg border border-primary/10 transition-all cursor-pointer"
                          >
                            {isContractorMode ? 'Ver Bitácora' : 'Editar Reporte'}
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
                {report.frentes.map(f => {
                  const isMv = f.id.startsWith('f_mv');
                  const progress = f.porcentaje_avance_semana ?? f.progress ?? 0;
                  const status = f.pmt_estado || f.status || 'Al día';
                  return (
                    <tr key={f.id} className="border-b border-slate-150">
                      <td className="py-2 px-1 font-bold">{f.frente}</td>
                      <td className="py-2 px-1 font-bold text-slate-650">{f.civ}</td>
                      <td className="py-2 px-1 text-[9px] uppercase font-bold text-slate-500">
                        {isMv ? 'Malla Vial' : 'Espacio Público'}
                      </td>
                      <td className="py-2 px-1 text-slate-600">{f.eje}</td>
                      <td className="py-2 px-1 text-center font-bold">{progress}%</td>
                      <td className="py-2 px-1 text-center">
                        <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {status}
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
        {!isContractorMode && report.consolidado_ia && (
          <div className="py-4 border-b border-slate-200 text-left">
            <h3 className="text-xs font-black text-slate-955 uppercase mb-2 pb-1 border-b border-slate-355 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[14px]">rate_review</span>
              {printMode === 'full' ? 'II.' : 'I.'} Consolidado de Interventoría
            </h3>
            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-[10px] text-slate-855 leading-relaxed whitespace-pre-line italic font-semibold">
              {report.consolidado_ia}
            </div>
          </div>
        )}

        {/* PDF Fichas Técnicas Individuales (Frente por Frente) */}
        <div className="py-4 space-y-6">
          <h3 className="text-xs font-black text-slate-955 uppercase mb-4 border-b border-slate-350 pb-1 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[14px]">engineering</span>
            {printMode === 'full' 
              ? (!isContractorMode && report.consolidado_ia) ? 'III. Fichas Técnicas de Frentes Activos' : 'II. Fichas Técnicas de Frentes Activos'
              : (!isContractorMode && report.consolidado_ia) ? 'II. Evidencia Fotográfica por Frente' : 'I. Evidencia Fotográfica por Frente'}
          </h3>

          {(() => {
            const frentesWithEvidence = report.frentes.filter(f => 
              (f.fotos && f.fotos.length > 0) || 
              (f.photos && f.photos.length > 0) ||
              (f.bitacora_notes && f.bitacora_notes.some(n => n.note && n.note.trim() !== '')) ||
              (f.bitacora_notas && f.bitacora_notas.some(n => n.nota && n.nota.trim() !== ''))
            );

            return frentesWithEvidence.map((frente) => (
              <PrintFrenteCard 
                key={frente.id} 
                frente={frente} 
                printMode={printMode} 
                allFrentes={allFrentes} 
                designOverrides={designOverrides}
                consolidadoIa={iaText} 
                getDayName={getDayName} 
                report={report}
                isContractorMode={isContractorMode}
                maxPhotos={maxPhotosPerFrente}
                optimizedImagesMap={optimizedImagesMap}
                pageBreakBefore={pageBreakPerFrente}
              />
            ));
          })()}
        </div>
      </div>
    </div>
  );
}
