import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Camera, 
  Save, 
  CheckCircle, 
  Image as ImageIcon, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  FileText, 
  Trash2, 
  Search, 
  Plus, 
  Check, 
  X, 
  ChevronDown, 
  RefreshCw,
  FolderOpen,
  AlertCircle
} from 'lucide-react';
import { compressImage, generateStandardPhotoFileName, uploadPhotoResiliently } from '../utils/imageCompressor';
import { cloneWeeklyReport, calculateConsolidatedMetrics } from '../data/reportsWeekly';

// Quick action chips for field inspector log
const QUICK_LOG_TAGS = [
  'Excavación manual',
  'Demolición de pavimento',
  'Instalación de sardinel',
  'Instalación de adoquín',
  'Extensión carpeta asfáltica',
  'Fundida de concreto',
  'Retiro de escombros y limpieza',
  'Suspensión por lluvias',
  'Sin novedades relevantes'
];

export default function InspectorPortal({ 
  weeklyReports = [], 
  onSaveFrenteData,
  onUpdateReports
}) {
  // Sort reports descending so latest week is always first
  const sortedReports = useMemo(() => {
    return [...weeklyReports].sort((a, b) => b.numero_semana - a.numero_semana);
  }, [weeklyReports]);

  const [selectedReportId, setSelectedReportId] = useState(null);
  const [projectTypeFilter, setProjectTypeFilter] = useState('all'); // 'all', 'malla', 'espacio', 'hasToday', 'pendingToday'
  const [selectedFrenteId, setSelectedFrenteId] = useState('');
  const [activeDayIdx, setActiveDayIdx] = useState(0); // 0 = Saturday, ..., 6 = Friday
  const [dailyNote, setDailyNote] = useState('');
  const [fotos, setFotos] = useState([]);
  const [bitacoraNotes, setBitacoraNotes] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [photoFilterMode, setPhotoFilterMode] = useState('day'); // 'day' = solo día seleccionado, 'all' = toda la semana
  const [isFrenteDrawerOpen, setIsFrenteDrawerOpen] = useState(false);
  const [frenteSearchTerm, setFrenteSearchTerm] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState(null);

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Initialize selected week only if not selected yet or restore from localStorage
  useEffect(() => {
    if (sortedReports.length > 0 && selectedReportId === null) {
      try {
        const savedReportId = localStorage.getItem('geo_interventoria_inspector_report_id');
        if (savedReportId) {
          const matchingSaved = sortedReports.find(r => String(r.id_informe) === String(savedReportId));
          if (matchingSaved) {
            setSelectedReportId(matchingSaved.id_informe);
            return;
          }
        }
      } catch (e) {}

      const todayStr = new Date().toISOString().split('T')[0];
      const matchingReport = sortedReports.find(r => 
        todayStr >= r.fecha_inicial_corte && todayStr <= r.fecha_final_corte
      );
      if (matchingReport) {
        setSelectedReportId(matchingReport.id_informe);
      } else {
        // Default to newest week
        setSelectedReportId(sortedReports[0].id_informe);
      }
    }
  }, [sortedReports, selectedReportId]);

  const currentReport = sortedReports.find(r => String(r.id_informe) === String(selectedReportId)) || sortedReports[0] || null;
  const frentes = useMemo(() => currentReport ? currentReport.frentes || [] : [], [currentReport]);

  // Calculate week dates starting from report.fecha_inicial_corte
  const weekDates = useMemo(() => {
    const dates = [];
    if (currentReport?.fecha_inicial_corte) {
      const start = new Date(currentReport.fecha_inicial_corte + 'T12:00:00');
      for (let i = 0; i < 7; i++) {
        const current = new Date(start);
        current.setDate(start.getDate() + i);
        dates.push(current);
      }
    }
    return dates;
  }, [currentReport?.fecha_inicial_corte]);

  // Auto-detect and select TODAY if it falls within the current week dates
  useEffect(() => {
    if (weekDates.length > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      const foundIdx = weekDates.findIndex(d => d.toISOString().split('T')[0] === todayStr);
      if (foundIdx !== -1) {
        setActiveDayIdx(foundIdx);
      } else {
        setActiveDayIdx(0);
      }
    }
  }, [weekDates]);

  const activeDateStr = weekDates[activeDayIdx] 
    ? weekDates[activeDayIdx].toISOString().split('T')[0] 
    : '';

  // Filtered frentes list for navigation & drawer
  const filteredFrentes = useMemo(() => {
    return frentes.filter(f => {
      // Type filter
      if (projectTypeFilter === 'malla' && !f.id.startsWith('f_mv')) return false;
      if (projectTypeFilter === 'espacio' && !f.id.startsWith('f_ep')) return false;

      // Status filters
      const fFotosList = [...(f.fotos || []), ...(f.photos || [])];
      const fNotes = f.bitacora_notes || f.bitacora_notas || [];
      const hasActivityToday = fFotosList.some(p => p.date === activeDateStr) || 
                               fNotes.some(n => n.date === activeDateStr && n.note?.trim() !== '');

      if (projectTypeFilter === 'hasToday' && !hasActivityToday) return false;
      if (projectTypeFilter === 'pendingToday' && hasActivityToday) return false;

      // Text search
      if (frenteSearchTerm.trim() !== '') {
        const term = frenteSearchTerm.toLowerCase();
        const civMatch = String(f.civ || '').toLowerCase().includes(term);
        const frenteNumMatch = String(f.frente || '').includes(term);
        const ejeMatch = String(f.eje || '').toLowerCase().includes(term);
        const desdeMatch = String(f.desde || '').toLowerCase().includes(term);
        const hastaMatch = String(f.hasta || '').toLowerCase().includes(term);
        const contractMatch = String(f.contractNo || '').toLowerCase().includes(term);
        return civMatch || frenteNumMatch || ejeMatch || desdeMatch || hastaMatch || contractMatch;
      }

      return true;
    });
  }, [frentes, projectTypeFilter, activeDateStr, frenteSearchTerm]);

  // Auto-select first frente if none selected or if current not in frentes
  useEffect(() => {
    if (frentes.length > 0) {
      const exists = frentes.some(f => f.id === selectedFrenteId);
      if (!selectedFrenteId || !exists) {
        setSelectedFrenteId(frentes[0].id);
      }
    }
  }, [frentes, selectedFrenteId]);

  const activeFrente = frentes.find(f => f.id === selectedFrenteId) || null;
  const currentFrenteIndex = filteredFrentes.findIndex(f => f.id === selectedFrenteId);

  // Synchronize state when selected frente changes
  useEffect(() => {
    if (activeFrente) {
      const allPhotos = [...(activeFrente.fotos || []), ...(activeFrente.photos || [])];
      const photoMap = new Map();
      const currentWeekNum = currentReport ? Number(currentReport.numero_semana) : null;

      allPhotos.forEach(p => {
        const pWeek = p.semana !== undefined && p.semana !== null ? Number(p.semana) : null;
        if (pWeek === null || pWeek === currentWeekNum) {
          const key = p.id || p.url;
          if (key && !photoMap.has(key)) photoMap.set(key, p);
        }
      });
      setFotos(Array.from(photoMap.values()));
      setBitacoraNotes(activeFrente.bitacora_notes || activeFrente.bitacora_notas || []);
    } else {
      setFotos([]);
      setBitacoraNotes([]);
    }
    setDailyNote('');
  }, [selectedFrenteId, activeFrente, currentReport]);

  // Synchronize note when active day changes
  useEffect(() => {
    const currentNote = bitacoraNotes.find(n => n.date === activeDateStr)?.note || '';
    setDailyNote(currentNote);
  }, [activeDayIdx, bitacoraNotes, activeDateStr]);

  const getDayName = (date) => {
    if (!date) return '';
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[date.getDay()];
  };

  const getDayLabel = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  };

  // Configuración de Supabase para subidas resilientes
  let supabaseConfig = {
    supabaseUrl: 'https://rjghsenbsrprbajhkwxr.supabase.co',
    supabaseKey: 'sb_publishable_QQ_O2_zR4gy1jlJzoLc8uA_SIKzyZtS',
    supabaseBucket: 'frentes-fotos'
  };
  if (typeof window !== 'undefined') {
    try {
      const saved = JSON.parse(localStorage.getItem('geo_interventoria_supabase_config') || 'null');
      if (saved) {
        supabaseConfig = saved;
      }
    } catch {}
  }

  // Auto-save helper to preserve any pending inspector changes before changing frente, date/day or week
  const saveCurrentFrenteDataSilently = async (overrideFrenteId, overrideReportId) => {
    const frenteIdToSave = overrideFrenteId || selectedFrenteId;
    const reportIdToSave = overrideReportId || currentReport?.id_informe;

    if (!frenteIdToSave || !reportIdToSave || !onSaveFrenteData) return;

    let finalNotes = [...bitacoraNotes];
    if (activeDateStr && dailyNote.trim() !== '') {
      const noteExists = finalNotes.some(n => n.date === activeDateStr);
      if (noteExists) {
        finalNotes = finalNotes.map(n => n.date === activeDateStr ? { ...n, note: dailyNote } : n);
      } else {
        finalNotes = [
          { id: Date.now(), date: activeDateStr, note: dailyNote },
          ...finalNotes
        ];
      }
    }

    try {
      await onSaveFrenteData(reportIdToSave, frenteIdToSave, {
        fotos: fotos,
        photos: fotos,
        bitacora_notes: finalNotes,
        bitacora_notas: finalNotes
      });
      setIsSuccess(true);
      setSuccessMessage('Guardado automático');
      setTimeout(() => setIsSuccess(false), 2000);
    } catch (err) {
      console.error("Error al guardar automáticamente los cambios del frente:", err);
    }
  };

  const handlePhotoUpload = async (e) => {
    if (!selectedFrenteId) {
      alert("Por favor, selecciona un frente primero.");
      return;
    }
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsCompressing(true);
    
    const uploadedPhotos = [];
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        try {
          // Compresión de alta resolución en cliente (1600px, JPEG 0.82)
          const base64 = await compressImage(file, 1600, 1600, 0.82);

          const dateCode = activeDateStr || new Date().toISOString().split('T')[0];
          const semCode = currentReport ? currentReport.numero_semana : 'XX';
          const randomStr = Math.random().toString(36).substring(2, 6);

          const fileName = generateStandardPhotoFileName({
            frenteId: selectedFrenteId,
            semana: semCode,
            dateStr: dateCode,
            originalName: file.name
          });

          // Subida resiliente a Supabase Storage con fallback
          const uploadRes = await uploadPhotoResiliently({
            semana: semCode,
            frenteId: selectedFrenteId,
            fileName,
            base64,
            supabaseConfig,
            bucket: supabaseConfig.supabaseBucket || 'frentes-fotos'
          });

          uploadedPhotos.push({
            id: `photo_${Date.now()}_${randomStr}`,
            url: uploadRes.url || base64,
            caption: `Avance diario (${file.name.replace(/\.[^/.]+$/, '')})`,
            date: dateCode,
            semana: currentReport ? currentReport.numero_semana : null,
            category: 'avance'
          });
        } catch (err) {
          console.error("Error compressing or uploading photo:", err);
        }
      }
    }

    if (uploadedPhotos.length > 0) {
      const updatedFotos = [...fotos, ...uploadedPhotos];
      setFotos(updatedFotos);

      // Auto-save immediately after upload so photos are never lost
      if (onSaveFrenteData && currentReport && selectedFrenteId) {
        onSaveFrenteData(currentReport.id_informe, selectedFrenteId, {
          fotos: updatedFotos,
          photos: updatedFotos,
          bitacora_notes: bitacoraNotes,
          bitacora_notas: bitacoraNotes
        });
        setIsSuccess(true);
        setSuccessMessage(`${uploadedPhotos.length} foto(s) guardadas en la nube`);
        setTimeout(() => setIsSuccess(false), 2500);
      }
    }

    // Reset input values
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    setIsCompressing(false);
  };

  const handleUpdateCaption = (photoId, text) => {
    setFotos(prev => prev.map(f => f.id === photoId ? { ...f, caption: text } : f));
  };

  const handleDeletePhoto = (photoId) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta fotografía?")) return;
    const updated = fotos.filter(f => f.id !== photoId);
    setFotos(updated);
    if (onSaveFrenteData && currentReport && selectedFrenteId) {
      onSaveFrenteData(currentReport.id_informe, selectedFrenteId, {
        fotos: updated,
        photos: updated,
        bitacora_notes: bitacoraNotes,
        bitacora_notas: bitacoraNotes
      });
    }
  };

  const handleDeleteNote = (noteId) => {
    const updated = bitacoraNotes.filter(n => n.id !== noteId);
    setBitacoraNotes(updated);
    setDailyNote('');
    if (onSaveFrenteData && currentReport && selectedFrenteId) {
      onSaveFrenteData(currentReport.id_informe, selectedFrenteId, {
        fotos: fotos,
        photos: fotos,
        bitacora_notes: updated,
        bitacora_notas: updated
      });
    }
  };

  const handleReportChange = async (newReportId) => {
    if (String(newReportId) === String(selectedReportId)) return;
    await saveCurrentFrenteDataSilently();
    setSelectedReportId(newReportId);
    try {
      localStorage.setItem('geo_interventoria_inspector_report_id', String(newReportId));
    } catch (e) {}
  };

  const handleFrenteChange = async (newFrenteId) => {
    if (newFrenteId === selectedFrenteId) return;
    await saveCurrentFrenteDataSilently();
    setSelectedFrenteId(newFrenteId);
    setIsFrenteDrawerOpen(false);
  };

  const handlePrevFrente = async () => {
    if (filteredFrentes.length === 0) return;
    await saveCurrentFrenteDataSilently();
    let nextIndex = currentFrenteIndex - 1;
    if (nextIndex < 0) {
      nextIndex = filteredFrentes.length - 1;
    }
    setSelectedFrenteId(filteredFrentes[nextIndex].id);
  };

  const handleNextFrente = async () => {
    if (filteredFrentes.length === 0) return;
    await saveCurrentFrenteDataSilently();
    let nextIndex = currentFrenteIndex + 1;
    if (nextIndex >= filteredFrentes.length || currentFrenteIndex === -1) {
      nextIndex = 0;
    }
    setSelectedFrenteId(filteredFrentes[nextIndex].id);
  };

  const handleDayChange = async (newIdx) => {
    if (newIdx === activeDayIdx) return;
    await saveCurrentFrenteDataSilently();
    setActiveDayIdx(newIdx);
  };

  const handleActiveDayNoteChange = (text) => {
    setDailyNote(text);
    setBitacoraNotes(prev => {
      const exists = prev.some(n => n.date === activeDateStr);
      if (exists) {
        return prev.map(n => n.date === activeDateStr ? { ...n, note: text } : n);
      } else {
        return [
          { id: Date.now(), date: activeDateStr, note: text },
          ...prev
        ];
      }
    });
  };

  const handleAddQuickTag = (tag) => {
    const separator = dailyNote.trim() ? '. ' : '';
    const updated = `${dailyNote.trim()}${separator}${tag}`;
    handleActiveDayNoteChange(updated);
  };

  const handlePasteText = () => {
    navigator.clipboard.readText()
      .then(text => {
        if (text) {
          const updatedNote = dailyNote ? `${dailyNote}\n${text}` : text;
          handleActiveDayNoteChange(updatedNote);
        }
      })
      .catch(err => {
        console.error("Failed to read clipboard:", err);
        alert("Por favor mantén presionado el cuadro de texto para pegar.");
      });
  };

  const handleSave = async () => {
    if (!selectedFrenteId || !currentReport || !onSaveFrenteData) return;
    setIsSaving(true);

    let finalNotes = [...bitacoraNotes];
    if (activeDateStr && dailyNote.trim() !== '') {
      const noteExists = finalNotes.some(n => n.date === activeDateStr);
      if (noteExists) {
        finalNotes = finalNotes.map(n => n.date === activeDateStr ? { ...n, note: dailyNote } : n);
      } else {
        finalNotes.push({ id: Date.now(), date: activeDateStr, note: dailyNote });
      }
    }

    try {
      await onSaveFrenteData(currentReport.id_informe, selectedFrenteId, {
        fotos: fotos,
        photos: fotos,
        bitacora_notes: finalNotes,
        bitacora_notas: finalNotes
      });
      setIsSuccess(true);
      setSuccessMessage('¡Reporte guardado con éxito en la nube!');
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Error al guardar el reporte.");
    } finally {
      setIsSaving(false);
    }
  };

  // Create next weekly report (clone from latest report)
  const handleCreateNextWeek = () => {
    if (!onUpdateReports || sortedReports.length === 0) {
      alert("No hay soporte para actualizar informes.");
      return;
    }
    const latestReport = sortedReports[0];
    const nextDraft = cloneWeeklyReport(latestReport);
    const finalDraft = calculateConsolidatedMetrics(nextDraft.frentes, nextDraft);

    const updated = [finalDraft, ...weeklyReports];
    onUpdateReports(updated);
    setSelectedReportId(finalDraft.id_informe);
    setIsSuccess(true);
    setSuccessMessage(`¡Semana ${finalDraft.numero_semana} creada con éxito!`);
    setTimeout(() => setIsSuccess(false), 3000);
  };

  const activeDayPhotos = fotos.filter(f => f.date === activeDateStr);
  const displayPhotos = photoFilterMode === 'all' ? fotos : activeDayPhotos;

  // Check if today is beyond the current report date range
  const todayIso = new Date().toISOString().split('T')[0];
  const isTodayPastReport = currentReport && todayIso > currentReport.fecha_final_corte;
  const isTodayInReport = currentReport && todayIso >= currentReport.fecha_inicial_corte && todayIso <= currentReport.fecha_final_corte;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans pb-28">
      
      {/* 1. TOP APP HEADER */}
      <header className="bg-primary text-white px-4 py-3 shadow-md sticky top-0 z-30 flex items-center justify-between border-b border-primary/20">
        <div className="flex items-center gap-2.5">
          <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/10">
            <Camera className="text-white" size={20} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-sm tracking-wide uppercase">InterventorIA</h1>
              <span className="bg-amber-400 text-slate-950 font-black text-[9px] px-1.5 py-0.2 rounded uppercase">
                Móvil
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium">Usaquén • Control Diario en Obra</p>
          </div>
        </div>

        {/* Quick Week Switcher in Header */}
        <div className="flex items-center gap-1.5">
          {currentReport && (
            <div className="bg-white/15 px-2.5 py-1 rounded-lg border border-white/20 text-right">
              <span className="text-[9px] text-slate-300 block font-bold leading-tight">INFORME</span>
              <span className="text-xs font-black text-white leading-tight">
                Semana {currentReport.numero_semana}
              </span>
            </div>
          )}

          {onUpdateReports && (
            <button
              type="button"
              onClick={handleCreateNextWeek}
              className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg text-xs font-black shadow flex items-center gap-1 transition-all active:scale-95"
              title="Crear siguiente semana de corte"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">Nueva Semana</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. WEEK CONTROLS & NEW WEEK BANNER */}
      <section className="bg-white border-b border-slate-200 px-4 py-2.5 shadow-sm">
        <div className="flex items-center justify-between gap-2 max-w-lg mx-auto">
          <div className="flex-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-650 tracking-wider flex items-center gap-1 mb-1">
              <Calendar size={12} className="text-primary" />
              Semana de Obra
            </label>
            <div className="relative">
              <select
                value={selectedReportId !== null && selectedReportId !== undefined ? String(selectedReportId) : ''}
                onChange={(e) => handleReportChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 text-xs font-bold text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer pr-8"
              >
                {sortedReports.map(r => (
                  <option key={r.id_informe} value={String(r.id_informe)}>
                    Semana {r.numero_semana} ({r.fecha_inicial_corte} al {r.fecha_final_corte})
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {onUpdateReports && (
            <div className="shrink-0 pt-4">
              <button
                type="button"
                onClick={handleCreateNextWeek}
                className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-[11px] font-extrabold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Plus size={13} className="text-primary" />
                <span>+ Semana {sortedReports.length > 0 ? (sortedReports[0].numero_semana + 1) : ''}</span>
              </button>
            </div>
          )}
        </div>

        {/* Notice if current date is past report */}
        {isTodayPastReport && (
          <div className="max-w-lg mx-auto mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-800 text-[11px]">
              <AlertCircle size={15} className="shrink-0 text-amber-600" />
              <span>Hoy ({todayIso}) está fuera del rango de la Semana {currentReport.numero_semana}.</span>
            </div>
            {onUpdateReports && (
              <button
                type="button"
                onClick={handleCreateNextWeek}
                className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black px-2 py-1 rounded shadow-xs shrink-0"
              >
                Crear Semana {sortedReports[0].numero_semana + 1}
              </button>
            )}
          </div>
        )}
      </section>

      {/* 3. STICKY FRENTE NAVIGATION BAR */}
      <section className="sticky top-[57px] z-20 bg-slate-900 text-white px-3 py-2 shadow-lg border-b border-slate-800">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
          
          {/* Prev Button */}
          <button
            type="button"
            onClick={handlePrevFrente}
            disabled={filteredFrentes.length <= 1}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-650 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white border border-slate-700 transition-all shrink-0"
            title="Frente anterior"
            aria-label="Frente anterior"
          >
            <ChevronLeft size={22} />
          </button>

          {/* Current Frente Card Button (Opens Drawer on Click) */}
          <button
            type="button"
            onClick={() => setIsFrenteDrawerOpen(true)}
            className="flex-1 bg-slate-800/90 hover:bg-slate-750 active:bg-slate-700 border border-slate-700 rounded-xl px-3 py-1.5 flex items-center justify-between gap-2 text-left transition-all overflow-hidden"
          >
            <div className="truncate flex-1">
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded uppercase ${
                  activeFrente?.id.startsWith('f_mv') ? 'bg-amber-400 text-slate-950' : 'bg-teal-400 text-slate-950'
                }`}>
                  {activeFrente?.id.startsWith('f_mv') ? 'Malla Vial' : 'Espacio Púb.'}
                </span>
                <span className="text-[10px] text-slate-300 font-bold">
                  {currentFrenteIndex >= 0 ? `${currentFrenteIndex + 1} / ${filteredFrentes.length}` : ''}
                </span>
              </div>
              <div className="text-xs font-black text-white truncate mt-0.5 flex items-center gap-1">
                <span>Frente {activeFrente?.frente || 'S/N'}</span>
                <span className="text-slate-400">•</span>
                <span className="text-primary-container font-mono bg-white/10 px-1 rounded text-[10px]">
                  CIV {activeFrente?.civ || 'N/A'}
                </span>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-1 text-slate-300 bg-slate-700/80 px-2 py-1 rounded-lg text-[10px] font-bold">
              <Search size={12} />
              <span>Cambiar</span>
            </div>
          </button>

          {/* Next Button */}
          <button
            type="button"
            onClick={handleNextFrente}
            disabled={filteredFrentes.length <= 1}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-650 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white border border-slate-700 transition-all shrink-0"
            title="Siguiente frente"
            aria-label="Siguiente frente"
          >
            <ChevronRight size={22} />
          </button>

        </div>
      </section>

      {/* 4. MAIN CONTENT AREA */}
      <main className="flex-1 p-3.5 max-w-lg mx-auto w-full flex flex-col gap-3.5">

        {/* Frente Details Pill */}
        {activeFrente && (
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase text-slate-650 tracking-wider">
                Eje Vial / Ubicación
              </span>
              <span className="text-[10px] font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                Contrato: {activeFrente.contractNo || 'IDU Usaquén'}
              </span>
            </div>
            <p className="text-xs font-black text-slate-850 leading-snug">
              {activeFrente.eje || activeFrente.name || 'Sin especificar'}
            </p>
            <p className="text-[11px] text-slate-600">
              <span className="font-bold text-slate-700">Tramo:</span> {activeFrente.desde || 'Inicio'} <span className="text-slate-400">➔</span> {activeFrente.hasta || 'Fin'}
            </p>
          </div>
        )}

        {/* 5. SMART HORIZONTAL DAY SELECTOR */}
        <section className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={14} className="text-primary" />
              <span>Día de Inspección</span>
            </label>
            <span className="text-[11px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {getDayName(weekDates[activeDayIdx])} {getDayLabel(weekDates[activeDayIdx])}
            </span>
          </div>

          {/* Swipeable Day Chips */}
          <div className="grid grid-cols-7 gap-1 pt-1">
            {weekDates.map((date, idx) => {
              const isActive = activeDayIdx === idx;
              const dStr = date.toISOString().split('T')[0];
              const isToday = dStr === todayIso;
              
              // Activity markers
              const dayPhotosCount = fotos.filter(f => f.date === dStr).length;
              const hasNote = bitacoraNotes.some(n => n.date === dStr && n.note?.trim() !== '');

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDayChange(idx)}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-center transition-all relative ${
                    isActive
                      ? 'bg-primary text-white border-primary shadow-md scale-102 ring-2 ring-primary/30 z-10'
                      : isToday
                        ? 'bg-amber-50 border-amber-300 text-slate-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {isToday && (
                    <span className={`text-[7px] font-black uppercase px-1 rounded -top-1.5 absolute ${
                      isActive ? 'bg-amber-400 text-slate-900' : 'bg-amber-500 text-white'
                    }`}>
                      Hoy
                    </span>
                  )}
                  <span className="text-[9px] font-black uppercase tracking-wider">
                    {getDayName(date).substring(0, 3)}
                  </span>
                  <span className="text-xs font-extrabold mt-0.5">
                    {date.getDate()}
                  </span>

                  {/* Badges for photos / notes */}
                  <div className="flex items-center gap-0.5 mt-1">
                    {hasNote && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-emerald-500'}`} title="Tiene bitácora" />
                    )}
                    {dayPhotosCount > 0 && (
                      <span className={`text-[8px] font-black px-1 rounded-full ${
                        isActive ? 'bg-amber-300 text-slate-950' : 'bg-amber-500 text-white'
                      }`}>
                        {dayPhotosCount}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 6. PHOTO CAPTURE SECTION (DUAL TOUCH-FRIENDLY BUTTONS) */}
        <section className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Camera size={14} className="text-primary" />
                <span>Registro Fotográfico</span>
              </label>
              <p className="text-[11px] text-slate-500">
                {activeDayPhotos.length} foto(s) el {getDayName(weekDates[activeDayIdx])} • {fotos.length} en la semana
              </p>
            </div>

            {/* Photo filter mode tabs */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px]">
              <button
                type="button"
                onClick={() => setPhotoFilterMode('day')}
                className={`py-1 px-2 font-extrabold rounded-md transition-all ${
                  photoFilterMode === 'day' ? 'bg-white text-slate-850 shadow-xs' : 'text-slate-600'
                }`}
              >
                Hoy ({activeDayPhotos.length})
              </button>
              <button
                type="button"
                onClick={() => setPhotoFilterMode('all')}
                className={`py-1 px-2 font-extrabold rounded-md transition-all ${
                  photoFilterMode === 'all' ? 'bg-white text-slate-850 shadow-xs' : 'text-slate-600'
                }`}
              >
                Semana ({fotos.length})
              </button>
            </div>
          </div>

          {/* DUAL BIG TOUCH BUTTONS: CAMERA VS GALLERY */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Direct Camera Button */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isCompressing}
              className="bg-primary hover:bg-primary-container active:scale-98 text-white py-3 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all h-12 disabled:opacity-50"
            >
              <Camera size={18} />
              <span>{isCompressing ? 'Procesando...' : 'Tomar Foto'}</span>
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoUpload}
            />

            {/* Gallery Upload Button */}
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={isCompressing}
              className="bg-slate-800 hover:bg-slate-700 active:scale-98 text-white py-3 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all h-12 disabled:opacity-50"
            >
              <FolderOpen size={18} />
              <span>Subir Galería</span>
            </button>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>

          {/* Photo Grid Preview */}
          {displayPhotos.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center bg-slate-50 flex flex-col items-center justify-center min-h-[110px]">
              <ImageIcon size={26} className="text-slate-300 mb-1" />
              <p className="text-xs font-extrabold text-slate-600">
                {photoFilterMode === 'day' ? `No hay fotos para el ${activeDateStr}` : 'Sin fotos en este frente'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Toca 'Tomar Foto' con la cámara del celular.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              {displayPhotos.map((foto) => (
                <div 
                  key={foto.id} 
                  className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs flex flex-col relative group"
                >
                  <div 
                    className="aspect-square bg-slate-900 relative overflow-hidden flex items-center justify-center cursor-pointer"
                    onClick={() => setPreviewPhoto(foto)}
                  >
                    <img 
                      src={foto.url} 
                      alt="Avance de obra" 
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>';
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePhoto(foto.id);
                      }}
                      className="absolute top-1.5 right-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white p-1.5 rounded-full shadow-md z-10"
                      title="Eliminar"
                    >
                      <Trash2 size={12} />
                    </button>
                    <div className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur-xs text-white text-[8px] font-black px-1.5 py-0.5 rounded">
                      {foto.date || activeDateStr}
                    </div>
                  </div>

                  <div className="p-1.5 bg-white">
                    <input 
                      type="text"
                      placeholder="Nota de foto..."
                      value={foto.caption || ''}
                      onChange={(e) => handleUpdateCaption(foto.id, e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 7. DAILY LOG (BITÁCORA DIARIA WITH QUICK CHIPS) */}
        <section className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={14} className="text-primary" />
              <span>Bitácora Diaria ({getDayName(weekDates[activeDayIdx])})</span>
            </label>
            <button
              type="button"
              onClick={handlePasteText}
              className="text-[10px] font-extrabold text-primary bg-primary/10 hover:bg-primary/20 active:scale-95 px-2.5 py-1 rounded-lg border border-primary/20 flex items-center gap-1 transition-all"
            >
              <span className="material-symbols-outlined text-[13px]">content_paste</span>
              <span>Pegar</span>
            </button>
          </div>

          {/* Quick Log Action Chips */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-extrabold text-slate-650 uppercase tracking-wider">
              Novedades Rápidas (1-tap):
            </span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {QUICK_LOG_TAGS.map((tag, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddQuickTag(tag)}
                  className="whitespace-nowrap bg-slate-100 hover:bg-primary/10 active:bg-primary/20 border border-slate-200 hover:border-primary/30 text-slate-750 text-[10px] font-bold py-1 px-2.5 rounded-lg transition-all shrink-0"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={dailyNote}
            onChange={(e) => handleActiveDayNoteChange(e.target.value)}
            placeholder="Describe las actividades ejecutadas hoy: maquinaria en sitio, cuadrilla de personal, avance del tramo, clima o dificultades..."
            rows={3}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-primary/30 focus:outline-none leading-relaxed"
          />

          {/* History of notes for this frente */}
          {bitacoraNotes.length > 0 && (
            <div className="mt-1 border-t border-slate-100 pt-2 flex flex-col gap-2">
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                Historial de Notas del Frente ({bitacoraNotes.length})
              </span>
              <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                {bitacoraNotes.map((n) => (
                  <div 
                    key={n.id || n.date} 
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs flex flex-col gap-1"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded">
                        📅 {n.date}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(n.id)}
                        className="text-slate-400 hover:text-red-600 p-1"
                        title="Eliminar nota"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <p className="text-slate-750 text-[11px] whitespace-pre-wrap leading-relaxed">
                      {n.note}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

      </main>

      {/* 8. FIXED BOTTOM FLOATING ACTION BAR (MOBILE SAVE & NAV) */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2.5 shadow-2xl">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2.5">
          
          <button
            type="button"
            onClick={handlePrevFrente}
            disabled={filteredFrentes.length <= 1}
            className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-750 flex items-center justify-center border border-slate-300 shrink-0 disabled:opacity-40"
            title="Frente anterior"
          >
            <ChevronLeft size={22} />
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-98 text-white font-black text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>Guardando en Nube...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Guardar Reporte Diario</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleNextFrente}
            disabled={filteredFrentes.length <= 1}
            className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-750 flex items-center justify-center border border-slate-300 shrink-0 disabled:opacity-40"
            title="Siguiente frente"
          >
            <ChevronRight size={22} />
          </button>

        </div>
      </footer>

      {/* 9. SEARCH & QUICK FRENTE DRAWER / MODAL */}
      {isFrenteDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-lg w-full mx-auto max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
            
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                  Seleccionar Frente de Obra
                </h2>
                <p className="text-[11px] text-slate-500">
                  {filteredFrentes.length} frente(s) disponibles en Semana {currentReport?.numero_semana}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFrenteDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-650 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search Input & Filter Chips */}
            <div className="p-3 border-b border-slate-100 flex flex-col gap-2.5">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por CIV, Frente, Eje o Contrato..."
                  value={frenteSearchTerm}
                  onChange={(e) => setFrenteSearchTerm(e.target.value)}
                  className="w-full bg-slate-100 border border-slate-300 rounded-xl py-2 pl-9 pr-8 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  autoFocus
                />
                {frenteSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setFrenteSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Category Filter Chips */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[10px]">
                <button
                  type="button"
                  onClick={() => setProjectTypeFilter('all')}
                  className={`py-1 px-2.5 font-black rounded-lg border transition-all whitespace-nowrap ${
                    projectTypeFilter === 'all'
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'
                  }`}
                >
                  Todos ({frentes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setProjectTypeFilter('malla')}
                  className={`py-1 px-2.5 font-black rounded-lg border transition-all whitespace-nowrap ${
                    projectTypeFilter === 'malla'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'
                  }`}
                >
                  Malla Vial (22)
                </button>
                <button
                  type="button"
                  onClick={() => setProjectTypeFilter('espacio')}
                  className={`py-1 px-2.5 font-black rounded-lg border transition-all whitespace-nowrap ${
                    projectTypeFilter === 'espacio'
                      ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'
                  }`}
                >
                  Espacio Público (20)
                </button>
                <button
                  type="button"
                  onClick={() => setProjectTypeFilter('hasToday')}
                  className={`py-1 px-2.5 font-black rounded-lg border transition-all whitespace-nowrap ${
                    projectTypeFilter === 'hasToday'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'
                  }`}
                >
                  ✓ Con avance hoy
                </button>
                <button
                  type="button"
                  onClick={() => setProjectTypeFilter('pendingToday')}
                  className={`py-1 px-2.5 font-black rounded-lg border transition-all whitespace-nowrap ${
                    projectTypeFilter === 'pendingToday'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'
                  }`}
                >
                  ⚠️ Pendientes hoy
                </button>
              </div>
            </div>

            {/* Frentes List */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 divide-y divide-slate-100">
              {filteredFrentes.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <p className="text-xs font-extrabold">No se encontraron frentes con este filtro.</p>
                </div>
              ) : (
                filteredFrentes.map((f) => {
                  const isSelected = f.id === selectedFrenteId;
                  const fFotos = [...(f.fotos || []), ...(f.photos || [])];
                  const hasPhotosToday = fFotos.some(p => p.date === activeDateStr);
                  const fNotes = f.bitacora_notes || f.bitacora_notas || [];
                  const hasNoteToday = fNotes.some(n => n.date === activeDateStr && n.note?.trim() !== '');

                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleFrenteChange(f.id)}
                      className={`w-full text-left p-3 rounded-xl transition-all flex items-start justify-between gap-2.5 border ${
                        isSelected 
                          ? 'bg-primary/5 border-primary shadow-xs ring-1 ring-primary/30' 
                          : 'bg-white hover:bg-slate-50 border-transparent hover:border-slate-200'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                            f.id.startsWith('f_mv') ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-teal-100 text-teal-900 border border-teal-300'
                          }`}>
                            {f.id.startsWith('f_mv') ? 'Malla' : 'Espacio'}
                          </span>
                          <span className="text-xs font-black text-slate-850">
                            Frente {f.frente}
                          </span>
                          <span className="font-mono text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded">
                            CIV {f.civ}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-slate-700 truncate mt-1">
                          {f.eje || f.name}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {f.desde} ➔ {f.hasta}
                        </p>
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-1">
                        {hasPhotosToday || hasNoteToday ? (
                          <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                            <Check size={10} />
                            <span>Hoy listo</span>
                          </span>
                        ) : (
                          <span className="text-[9px] font-extrabold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            Pendiente hoy
                          </span>
                        )}
                        <span className="text-[9px] text-slate-400 font-semibold">
                          📷 {fFotos.length} fotos sem.
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

          </div>
        </div>
      )}

      {/* 10. PHOTO FULLSCREEN MODAL */}
      {previewPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewPhoto(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewPhoto(null)}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full z-10"
          >
            <X size={20} />
          </button>
          <div className="max-w-xl w-full flex flex-col items-center gap-3">
            <img 
              src={previewPhoto.url} 
              alt="Avance ampliado" 
              className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain shadow-2xl border border-white/10"
            />
            <div className="text-center text-white">
              <p className="text-sm font-bold">{previewPhoto.caption || 'Sin descripción'}</p>
              <p className="text-xs text-slate-400 mt-0.5">Fecha: {previewPhoto.date || 'Desconocida'}</p>
            </div>
          </div>
        </div>
      )}

      {/* 11. TOAST NOTIFICATION */}
      {isSuccess && (
        <div className="fixed bottom-20 left-4 right-4 max-w-sm mx-auto bg-emerald-600 text-white font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center justify-center gap-2 z-50 animate-bounce">
          <CheckCircle size={18} />
          <span className="text-xs">{successMessage || 'Operación realizada con éxito'}</span>
        </div>
      )}

    </div>
  );
}
