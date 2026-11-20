import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Camera,
  Images,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  X,
  Trash2,
  RefreshCw,
  AlertCircle,
  CloudOff,
  Loader2,
  ClipboardPaste,
  ClipboardList,
  Plus
} from 'lucide-react';
import {
  compressImageToBlob,
  uploadPhotoBlob,
  runWithConcurrency,
  generateStandardPhotoFileName
} from '../utils/imageCompressor';
import { cloneWeeklyReport, calculateConsolidatedMetrics } from '../data/reportsWeekly';
import { frentePhotoList, frenteNoteList, mergeEditedList, photoKey, noteKey } from '../data/reportsMerge';
import { computeReportCoverage, countPendingWeeks } from '../data/reportCoverage';

// Novedades frecuentes para la bitácora (un toque)
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

const UPLOAD_CONCURRENCY = 3;
const NOTE_AUTOSAVE_MS = 1500;

const SUPABASE_DEFAULT_CONFIG = {
  supabaseUrl: 'https://rjghsenbsrprbajhkwxr.supabase.co',
  supabaseKey: 'sb_publishable_QQ_O2_zR4gy1jlJzoLc8uA_SIKzyZtS',
  supabaseBucket: 'frentes-fotos'
};

// Fecha local YYYY-MM-DD. (toISOString usa UTC: en Colombia después de las 7 p. m. daba el día siguiente)
const toLocalIso = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const shortDate = (iso) => {
  if (!iso) return '';
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
};

const isMallaVial = (f) => f?.id?.startsWith('f_mv');
const frentePhotos = frentePhotoList;
const frenteNotes = frenteNoteList;
const addDaysIso = (iso, days) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toLocalIso(d);
};
const hasActivityOn = (f, dateStr) =>
  frentePhotos(f).some(p => p.date === dateStr) ||
  frenteNotes(f).some(n => n.date === dateStr && n.note?.trim());

const getSupabaseConfig = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('geo_interventoria_supabase_config') || 'null');
    if (saved?.supabaseUrl && saved?.supabaseKey) return saved;
  } catch { /* usar valores por defecto */ }
  return SUPABASE_DEFAULT_CONFIG;
};

export default function InspectorPortal({
  weeklyReports = [],
  onSaveFrenteData,
  onUpdateReports,
  isDataFresh = true,
  pendingSyncCount = 0
}) {
  const sortedReports = useMemo(
    () => [...weeklyReports].sort((a, b) => b.numero_semana - a.numero_semana),
    [weeklyReports]
  );
  const todayIso = toLocalIso(new Date());

  const [selectedReportId, setSelectedReportId] = useState(null);
  const [selectedFrenteId, setSelectedFrenteId] = useState('');
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [dailyNote, setDailyNote] = useState('');
  const [fotos, setFotos] = useState([]);
  const [bitacoraNotes, setBitacoraNotes] = useState([]);
  const [uploads, setUploads] = useState([]); // fotos en proceso o con error
  const [saveState, setSaveState] = useState('idle'); // idle | dirty | saving | saved | error
  const [toast, setToast] = useState(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerStatus, setPickerStatus] = useState('all'); // all | pending | done
  const [pickerContract, setPickerContract] = useState('all'); // all | malla | espacio
  const [pickerSearch, setPickerSearch] = useState('');
  const [showWeekPhotos, setShowWeekPhotos] = useState(false);
  const [viewerPhotoId, setViewerPhotoId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isPendingOpen, setIsPendingOpen] = useState(false);
  const pendingDayRef = useRef(null); // día a seleccionar al saltar desde "Pendientes"

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const reportsRef = useRef(weeklyReports);
  const fotosRef = useRef(fotos);
  const notesRef = useRef(bitacoraNotes);
  const selectionRef = useRef({ reportId: null, frenteId: '' });
  const noteTimerRef = useRef(null);
  const toastTimerRef = useRef(null);
  // Lo que había en la nube cuando se cargó el frente: los cambios locales se calculan contra
  // esto y se aplican sobre la versión más reciente (no se pisan fotos/notas de otros celulares)
  const baseFotosRef = useRef([]);
  const baseNotesRef = useRef([]);
  const seedKeyRef = useRef('');
  const saveStateRef = useRef('idle');
  const editVersionRef = useRef(0);
  const pendingWeekSelectRef = useRef(null);
  // Funciones del padre por ref: cambian en cada render y no deben re-disparar efectos
  const onSaveRef = useRef(onSaveFrenteData);
  onSaveRef.current = onSaveFrenteData;
  const autoCreatedRef = useRef(false);

  reportsRef.current = weeklyReports;
  fotosRef.current = fotos;
  notesRef.current = bitacoraNotes;
  saveStateRef.current = saveState;

  const showToast = useCallback((message, tone = 'ok') => {
    clearTimeout(toastTimerRef.current);
    setToast({ message, tone });
    toastTimerRef.current = setTimeout(() => setToast(null), tone === 'error' ? 5000 : 2500);
  }, []);

  // Semana por defecto: la que contiene hoy; si no existe, la última guardada o la más reciente
  useEffect(() => {
    if (sortedReports.length === 0 || selectedReportId !== null) return;
    const containsToday = sortedReports.find(r => todayIso >= r.fecha_inicial_corte && todayIso <= r.fecha_final_corte);
    let savedId = null;
    try { savedId = localStorage.getItem('geo_interventoria_inspector_report_id'); } catch { /* sin almacenamiento */ }
    const saved = sortedReports.find(r => String(r.id_informe) === String(savedId));
    setSelectedReportId((containsToday || saved || sortedReports[0]).id_informe);
  }, [sortedReports, selectedReportId, todayIso]);

  // Tras crear una semana se selecciona por número (el servidor puede devolver otra id si ya existía)
  useEffect(() => {
    const wanted = pendingWeekSelectRef.current;
    if (wanted == null) return;
    const match = sortedReports.find(r => Number(r.numero_semana) === wanted);
    if (match) {
      pendingWeekSelectRef.current = null;
      setSelectedReportId(match.id_informe);
    }
  }, [sortedReports]);

  const currentReport =
    sortedReports.find(r => String(r.id_informe) === String(selectedReportId)) || sortedReports[0] || null;
  const latestReport = sortedReports[0] || null;
  const frentes = useMemo(() => currentReport?.frentes || [], [currentReport]);

  const weekDates = useMemo(() => {
    if (!currentReport?.fecha_inicial_corte) return [];
    const start = new Date(`${currentReport.fecha_inicial_corte}T12:00:00`);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { date: d, iso: toLocalIso(d) };
    });
  }, [currentReport?.fecha_inicial_corte]);

  // Al cambiar de semana: el día pedido desde "Pendientes", o hoy si está dentro de ella
  useEffect(() => {
    if (weekDates.length === 0) return;
    const wanted = pendingDayRef.current;
    const wantedIdx = wanted ? weekDates.findIndex(d => d.iso === wanted) : -1;
    if (wantedIdx !== -1) {
      pendingDayRef.current = null;
      setActiveDayIdx(wantedIdx);
      return;
    }
    const idx = weekDates.findIndex(d => d.iso === todayIso);
    setActiveDayIdx(idx !== -1 ? idx : 0);
  }, [weekDates, todayIso]);

  // Cobertura de reportes: semanas, días y frentes activos que faltan
  const coverage = useMemo(() => computeReportCoverage(weeklyReports, todayIso), [weeklyReports, todayIso]);
  const pendingWeeksCount = countPendingWeeks(coverage);
  const currentWeekCoverage = coverage.weeks.find(w => w.status === 'en-curso') || null;

  const activeDateStr = weekDates[activeDayIdx]?.iso || '';
  const activeDayName = weekDates[activeDayIdx] ? DAY_NAMES[weekDates[activeDayIdx].date.getDay()] : '';

  useEffect(() => {
    if (frentes.length > 0 && !frentes.some(f => f.id === selectedFrenteId)) {
      setSelectedFrenteId(frentes[0].id);
    }
  }, [frentes, selectedFrenteId]);

  const activeFrente = frentes.find(f => f.id === selectedFrenteId) || null;
  const frenteIndex = frentes.findIndex(f => f.id === selectedFrenteId);
  selectionRef.current = { reportId: currentReport?.id_informe ?? null, frenteId: selectedFrenteId };

  // Cargar fotos y notas del frente. Al cambiar de frente/semana siempre; si llegan datos nuevos
  // de la nube (otro celular, o la carga inicial) solo cuando no hay ediciones sin guardar.
  useEffect(() => {
    const key = `${currentReport?.id_informe}:${selectedFrenteId}`;
    const switched = key !== seedKeyRef.current;
    if (!switched && (saveStateRef.current === 'dirty' || saveStateRef.current === 'saving')) return;
    seedKeyRef.current = key;
    const list = activeFrente ? frentePhotos(activeFrente) : [];
    const notes = activeFrente ? frenteNotes(activeFrente) : [];
    baseFotosRef.current = list;
    baseNotesRef.current = notes;
    fotosRef.current = list;
    notesRef.current = notes;
    setFotos(list);
    setBitacoraNotes(notes);
    if (switched) setSaveState(s => (s === 'error' ? s : 'idle'));
  }, [activeFrente, selectedFrenteId, currentReport?.id_informe]);

  useEffect(() => {
    if (saveStateRef.current === 'dirty') return; // no reemplazar lo que se está escribiendo
    setDailyNote(bitacoraNotes.find(n => n.date === activeDateStr)?.note || '');
  }, [activeDateStr, bitacoraNotes]);

  // ---------- Guardado ----------
  const persistFrente = useCallback(async (reportId, frenteId, data, { silent = false } = {}) => {
    if (!onSaveRef.current || !reportId || !frenteId) return;
    const version = editVersionRef.current;
    setSaveState('saving');
    try {
      await onSaveRef.current(reportId, frenteId, data);
      // Si se editó algo mientras guardaba, sigue pendiente
      setSaveState(editVersionRef.current === version ? 'saved' : 'dirty');
      if (!silent) showToast('Reporte guardado en la nube');
    } catch (err) {
      console.error('Error guardando el frente:', err);
      setSaveState('error');
      showToast('Sin conexión: el cambio queda en este celular y se enviará al reconectar.', 'error');
      throw err;
    }
  }, [showToast]);

  const latestFrente = (reportId, frenteId) =>
    reportsRef.current.find(r => String(r.id_informe) === String(reportId))?.frentes?.find(f => f.id === frenteId);

  const saveCurrent = useCallback((opts) => {
    clearTimeout(noteTimerRef.current);
    const { reportId, frenteId } = selectionRef.current;
    const latest = latestFrente(reportId, frenteId);
    const editedNotes = notesRef.current.filter(n => n.note?.trim());
    const fotosMerged = mergeEditedList(baseFotosRef.current, fotosRef.current, frentePhotos(latest), photoKey);
    const notesMerged = mergeEditedList(baseNotesRef.current, editedNotes, frenteNotes(latest), noteKey);
    // La nueva base es lo que se envía: el siguiente guardado solo manda lo que cambie después
    baseFotosRef.current = fotosMerged;
    baseNotesRef.current = notesMerged;
    return persistFrente(reportId, frenteId, {
      fotos: fotosMerged,
      photos: fotosMerged,
      bitacora_notes: notesMerged,
      bitacora_notas: notesMerged
    }, opts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistFrente]);

  const saveIfDirty = useCallback(async () => {
    if (saveStateRef.current === 'dirty' || saveStateRef.current === 'error') {
      try { await saveCurrent({ silent: true }); } catch { /* queda en cola y se reintenta */ }
    }
  }, [saveCurrent]);

  // Cuando la app logra reenviar la cola pendiente, el error de este portal ya no aplica
  const prevPendingRef = useRef(pendingSyncCount);
  useEffect(() => {
    if (prevPendingRef.current > 0 && pendingSyncCount === 0 && saveStateRef.current === 'error') {
      setSaveState('saved');
    }
    prevPendingRef.current = pendingSyncCount;
  }, [pendingSyncCount]);

  const markDirty = () => {
    editVersionRef.current += 1;
    saveStateRef.current = 'dirty';
    setSaveState('dirty');
  };

  const scheduleAutosave = () => {
    clearTimeout(noteTimerRef.current);
    noteTimerRef.current = setTimeout(() => {
      saveCurrent({ silent: true }).catch(() => {});
    }, NOTE_AUTOSAVE_MS);
  };

  // Autoguardado de la bitácora mientras se escribe
  const handleNoteChange = (text) => {
    setDailyNote(text);
    const prev = notesRef.current;
    const exists = prev.some(n => n.date === activeDateStr);
    const next = exists
      ? prev.map(n => (n.date === activeDateStr ? { ...n, note: text } : n))
      : [{ id: Date.now(), date: activeDateStr, note: text }, ...prev];
    notesRef.current = next;
    setBitacoraNotes(next);
    markDirty();
    scheduleAutosave();
  };

  // Guardar lo pendiente si la app se cierra, se minimiza o se sale del portal
  const uploadsRef = useRef(uploads);
  uploadsRef.current = uploads;
  useEffect(() => {
    const flush = () => {
      if (saveStateRef.current === 'dirty' || saveStateRef.current === 'error') {
        saveCurrent({ silent: true }).catch(() => {});
      }
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    const onBeforeUnload = (e) => {
      flush();
      if (uploadsRef.current.some(u => u.status !== 'error')) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', onBeforeUnload);
      flush();
      clearTimeout(noteTimerRef.current);
      clearTimeout(toastTimerRef.current);
    };
  }, [saveCurrent]);

  const handleAddQuickTag = (tag) => {
    const base = dailyNote.trim();
    handleNoteChange(base ? `${base}. ${tag}` : tag);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) handleNoteChange(dailyNote ? `${dailyNote}\n${text}` : text);
    } catch {
      showToast('Mantén presionado el cuadro de texto para pegar.', 'error');
    }
  };

  // ---------- Fotos: compresión y subida en paralelo, sin bloquear la pantalla ----------
  const attachUploadedPhoto = useCallback(async (ctx, photo) => {
    const { reportId, frenteId } = selectionRef.current;
    if (String(reportId) === String(ctx.reportId) && frenteId === ctx.frenteId) {
      const next = [...fotosRef.current, photo];
      fotosRef.current = next;
      setFotos(next);
      await saveCurrent({ silent: true });
    } else {
      // El inspector cambió de frente mientras subía: se agrega al frente original
      const list = [...frentePhotos(latestFrente(ctx.reportId, ctx.frenteId)), photo];
      await persistFrente(ctx.reportId, ctx.frenteId, { fotos: list, photos: list }, { silent: true });
    }
  }, [saveCurrent, persistFrente]);

  const processUpload = useCallback(async (item) => {
    const update = (patch) => setUploads(prev => prev.map(u => (u.id === item.id ? { ...u, ...patch } : u)));
    try {
      update({ status: 'compressing', error: null });
      const { blob, thumbBlob } = await compressImageToBlob(item.file, { maxDimension: 1600, quality: 0.8, thumbDimension: 400 });
      update({ status: 'uploading' });
      const fileName = generateStandardPhotoFileName({
        frenteId: item.frenteId,
        semana: item.semana,
        dateStr: item.date,
        originalName: 'foto.jpg'
      });
      const url = await uploadPhotoBlob({
        blob,
        semana: item.semana,
        frenteId: item.frenteId,
        fileName,
        supabaseConfig: getSupabaseConfig()
      });
      // La miniatura es opcional: si falla, la cuadrícula usa la foto completa
      const thumb = thumbBlob
        ? await uploadPhotoBlob({
          blob: thumbBlob,
          semana: item.semana,
          frenteId: `${item.frenteId}/miniaturas`,
          fileName,
          supabaseConfig: getSupabaseConfig()
        }).catch(() => null)
        : null;
      await attachUploadedPhoto(item, {
        id: `photo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        url,
        ...(thumb ? { thumb } : {}),
        caption: '',
        date: item.date,
        semana: item.semana,
        category: 'avance'
      });
      URL.revokeObjectURL(item.previewUrl);
      setUploads(prev => prev.filter(u => u.id !== item.id));
    } catch (err) {
      console.error('Error subiendo foto:', err);
      update({ status: 'error', error: err.message || 'Error al subir' });
    }
  }, [attachUploadedPhoto]);

  const handleFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    e.target.value = '';
    if (files.length === 0 || !currentReport || !selectedFrenteId) return;

    const items = files.map((file, i) => ({
      id: `up_${Date.now()}_${i}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'queued',
      reportId: currentReport.id_informe,
      frenteId: selectedFrenteId,
      semana: currentReport.numero_semana,
      date: activeDateStr || todayIso
    }));
    setUploads(prev => [...prev, ...items]);
    await runWithConcurrency(items, UPLOAD_CONCURRENCY, processUpload);
  };

  const retryUpload = (item) => processUpload(item);
  const discardUpload = (item) => {
    URL.revokeObjectURL(item.previewUrl);
    setUploads(prev => prev.filter(u => u.id !== item.id));
  };

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm('¿Eliminar esta fotografía del reporte?')) return;
    const next = fotosRef.current.filter(f => f.id !== photoId);
    fotosRef.current = next;
    setFotos(next);
    setViewerPhotoId(null);
    markDirty();
    try { await saveCurrent({ silent: true }); } catch { /* queda en cola */ }
  };

  const handleCaptionChange = (photoId, caption) => {
    const next = fotosRef.current.map(f => (f.id === photoId ? { ...f, caption } : f));
    fotosRef.current = next;
    setFotos(next);
    markDirty();
    scheduleAutosave();
  };

  const closeViewer = async () => {
    setViewerPhotoId(null);
    await saveIfDirty();
  };

  // ---------- Navegación ----------
  const goToFrente = async (frenteId) => {
    if (!frenteId || frenteId === selectedFrenteId) {
      setIsPickerOpen(false);
      return;
    }
    await saveIfDirty();
    setSelectedFrenteId(frenteId);
    setIsPickerOpen(false);
    setShowWeekPhotos(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const stepFrente = (delta) => {
    if (frentes.length === 0) return;
    const idx = frenteIndex === -1 ? 0 : (frenteIndex + delta + frentes.length) % frentes.length;
    goToFrente(frentes[idx].id);
  };

  const handleDayChange = async (idx) => {
    if (idx === activeDayIdx) return;
    await saveIfDirty();
    setActiveDayIdx(idx);
  };

  const handleReportChange = async (reportId) => {
    if (String(reportId) === String(selectedReportId)) return;
    await saveIfDirty();
    setSelectedReportId(reportId);
    try { localStorage.setItem('geo_interventoria_inspector_report_id', String(reportId)); } catch { /* sin almacenamiento */ }
  };

  const [isCreatingWeek, setIsCreatingWeek] = useState(false);
  const handleCreateNextWeek = useCallback(async ({ silent = false } = {}) => {
    if (!onUpdateReports || !latestReport || isCreatingWeek) return;
    setIsCreatingWeek(true);
    await saveIfDirty();
    const draft = cloneWeeklyReport(latestReport);
    const finalDraft = calculateConsolidatedMetrics(draft.frentes, draft);
    pendingWeekSelectRef.current = Number(finalDraft.numero_semana);
    try {
      await onUpdateReports([finalDraft, ...reportsRef.current]);
      if (!silent) showToast(`Semana ${finalDraft.numero_semana} lista`);
    } catch {
      showToast('No se pudo crear la semana en la nube; se reintentará al reconectar.', 'error');
    } finally {
      setIsCreatingWeek(false);
    }
  }, [onUpdateReports, latestReport, isCreatingWeek, saveIfDirty, showToast]);

  // Si hoy cae en la semana siguiente a la última creada, se crea sola (con datos ya sincronizados)
  useEffect(() => {
    if (autoCreatedRef.current || !isDataFresh || !latestReport) return;
    if (todayIso > latestReport.fecha_final_corte && todayIso <= addDaysIso(latestReport.fecha_final_corte, 7)) {
      autoCreatedRef.current = true;
      handleCreateNextWeek({ silent: true });
    }
  }, [isDataFresh, latestReport, todayIso, handleCreateNextWeek]);

  // ---------- Datos derivados ----------
  // La lista completa del frente se conserva; aquí solo se muestran las fotos de esta semana
  const weekNumber = currentReport ? Number(currentReport.numero_semana) : null;
  const weekFotos = fotos.filter(p => p.semana == null || Number(p.semana) === weekNumber);
  const dayPhotos = weekFotos.filter(f => f.date === activeDateStr);
  const visiblePhotos = showWeekPhotos ? weekFotos : dayPhotos;
  const visibleUploads = uploads.filter(u =>
    String(u.reportId) === String(currentReport?.id_informe) &&
    u.frenteId === selectedFrenteId &&
    (showWeekPhotos || u.date === activeDateStr)
  );
  const activeUploads = uploads.filter(u => u.status !== 'error').length;
  const failedUploads = uploads.filter(u => u.status === 'error').length;
  const viewerPhoto = fotos.find(f => f.id === viewerPhotoId) || null;
  const otherDayNotes = bitacoraNotes
    .filter(n => n.date !== activeDateStr && n.note?.trim())
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const doneToday = useMemo(
    () => frentes.filter(f => hasActivityOn(f, activeDateStr)).length,
    [frentes, activeDateStr]
  );
  const isTodayAfterLatest = latestReport && todayIso > latestReport.fecha_final_corte;
  const isViewingOldWeek = currentReport && latestReport && currentReport.id_informe !== latestReport.id_informe;

  const pickerFrentes = useMemo(() => {
    const term = pickerSearch.trim().toLowerCase();
    return frentes.filter(f => {
      if (pickerContract === 'malla' && !isMallaVial(f)) return false;
      if (pickerContract === 'espacio' && isMallaVial(f)) return false;
      const done = hasActivityOn(f, activeDateStr);
      if (pickerStatus === 'pending' && done) return false;
      if (pickerStatus === 'done' && !done) return false;
      if (!term) return true;
      return [f.frente, f.civ, f.eje, f.desde, f.hasta].some(v => String(v || '').toLowerCase().includes(term));
    });
  }, [frentes, pickerContract, pickerStatus, pickerSearch, activeDateStr]);

  const mallaCount = frentes.filter(isMallaVial).length;

  if (!currentReport) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6 text-center">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="animate-spin text-primary" size={28} />
          <p className="text-sm font-semibold">Cargando semanas de obra…</p>
        </div>
      </div>
    );
  }

  const saveLabel = {
    idle: 'Guardar reporte',
    dirty: 'Guardar cambios',
    saving: 'Guardando…',
    saved: 'Guardado',
    error: 'Reintentar guardado'
  }[saveState];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col pb-28 text-slate-900">

      {/* ENCABEZADO: semana + estado de guardado */}
      <header className="sticky top-0 z-30 bg-primary text-white shadow-md">
        <div className="max-w-lg mx-auto px-4 pt-3 pb-2 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-blue-200 uppercase tracking-wider">Inspección de obra · Usaquén</p>
            <label className="relative flex items-center mt-0.5 w-full">
              <span className="sr-only">Semana de obra</span>
              <select
                value={String(currentReport.id_informe)}
                onChange={(e) => {
                  const match = sortedReports.find(r => String(r.id_informe) === e.target.value);
                  if (match) handleReportChange(match.id_informe);
                }}
                className="w-full min-w-0 appearance-none bg-none bg-transparent border-0 p-0 pr-6 text-base font-bold text-white focus:ring-0 cursor-pointer truncate"
              >
                {sortedReports.map(r => (
                  <option key={r.id_informe} value={String(r.id_informe)} className="text-slate-900">
                    Semana {r.numero_semana} · {shortDate(r.fecha_inicial_corte)} – {shortDate(r.fecha_final_corte)}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-0 pointer-events-none text-blue-200" />
            </label>
          </div>
          <SaveStatusPill saveState={saveState} activeUploads={activeUploads} failedUploads={failedUploads} pendingSync={pendingSyncCount} />
        </div>

        {/* Frente actual: toca para cambiar */}
        <div className="max-w-lg mx-auto px-3 pb-3">
          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            className="w-full flex items-center gap-3 bg-white/10 hover:bg-white/15 active:bg-white/20 rounded-xl px-3 py-2.5 text-left transition-colors"
          >
            <span className={`shrink-0 w-11 h-11 rounded-lg flex flex-col items-center justify-center font-bold leading-none ${
              isMallaVial(activeFrente) ? 'bg-amber-400 text-slate-900' : 'bg-teal-300 text-slate-900'
            }`}>
              <span className="text-[10px] uppercase">{isMallaVial(activeFrente) ? 'MV' : 'EP'}</span>
              <span className="text-base">{activeFrente?.frente || '–'}</span>
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold truncate">{activeFrente?.eje || activeFrente?.name || 'Sin eje'}</span>
              <span className="block text-xs text-blue-100 truncate">
                CIV {activeFrente?.civ || 'N/A'} · {activeFrente?.desde || 'Inicio'} → {activeFrente?.hasta || 'Fin'}
              </span>
            </span>
            <span className="shrink-0 flex items-center gap-1 text-xs font-semibold text-blue-100">
              {frenteIndex + 1}/{frentes.length}
              <ChevronDown size={16} />
            </span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto px-3 py-3 flex flex-col gap-3">

        {/* Reportes pendientes */}
        {(pendingWeeksCount > 0 || (currentWeekCoverage?.missingDays.length ?? 0) > 0) && (
          <button
            type="button"
            onClick={() => setIsPendingOpen(true)}
            className="w-full flex items-center gap-3 bg-white rounded-2xl px-3 py-2.5 shadow-sm text-left active:bg-slate-50"
          >
            <span className="shrink-0 w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ClipboardList size={20} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-900">Reportes pendientes</span>
              <span className="block text-xs text-slate-500 truncate">
                {[
                  pendingWeeksCount > 0 && `${pendingWeeksCount} semana${pendingWeeksCount === 1 ? '' : 's'} incompleta${pendingWeeksCount === 1 ? '' : 's'}`,
                  currentWeekCoverage?.missingDays.length > 0 &&
                    `${currentWeekCoverage.missingDays.length} día${currentWeekCoverage.missingDays.length === 1 ? '' : 's'} sin reporte esta semana`
                ].filter(Boolean).join(' · ')}
              </span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-400" />
          </button>
        )}

        {/* Avisos de semana */}
        {isViewingOldWeek && (
          <div className="flex items-center gap-3 bg-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700">
            <AlertCircle size={18} className="shrink-0" />
            <span className="flex-1">Estás viendo una semana anterior.</span>
            <button
              type="button"
              onClick={() => handleReportChange(latestReport.id_informe)}
              className="font-bold text-primary"
            >
              Ir a la Semana {latestReport.numero_semana}
            </button>
          </div>
        )}
        {isTodayAfterLatest && onUpdateReports && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            <AlertCircle size={18} className="shrink-0 text-amber-600" />
            <p className="flex-1 text-sm text-amber-900">
              Hoy ({shortDate(todayIso)}) no pertenece a ninguna semana creada.
            </p>
            <button
              type="button"
              onClick={() => handleCreateNextWeek()}
              disabled={isCreatingWeek}
              className="shrink-0 inline-flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold px-3 py-2 rounded-lg disabled:opacity-60"
            >
              {isCreatingWeek ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Semana {latestReport.numero_semana + 1}
            </button>
          </div>
        )}

        {/* Día */}
        <section className="bg-white rounded-2xl p-3 shadow-sm">
          <div className="grid grid-cols-7 gap-1">
            {weekDates.map(({ date, iso }, idx) => {
              const isActive = idx === activeDayIdx;
              const isToday = iso === todayIso;
              const hasPhotos = weekFotos.some(f => f.date === iso);
              const hasNote = bitacoraNotes.some(n => n.date === iso && n.note?.trim());
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => handleDayChange(idx)}
                  aria-pressed={isActive}
                  className={`relative flex flex-col items-center rounded-xl py-2 transition-colors ${
                    isActive ? 'bg-primary text-white' : isToday ? 'bg-amber-50 text-slate-900 ring-1 ring-amber-300' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-[11px] font-semibold uppercase">{DAY_NAMES[date.getDay()].slice(0, 3)}</span>
                  <span className="text-lg font-bold leading-tight">{date.getDate()}</span>
                  <span className="h-1.5 flex gap-0.5 mt-0.5">
                    {(hasPhotos || hasNote) && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-emerald-500'}`} />
                    )}
                  </span>
                  {isToday && !isActive && <span className="sr-only">(hoy)</span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* Fotos */}
        <section className="bg-white rounded-2xl p-3 shadow-sm flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-bold">Fotos del {activeDayName.toLowerCase()} {weekDates[activeDayIdx]?.date.getDate()}</h2>
            <button
              type="button"
              onClick={() => setShowWeekPhotos(v => !v)}
              className="text-sm font-semibold text-primary"
            >
              {showWeekPhotos ? 'Solo este día' : `Ver semana (${weekFotos.length})`}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="h-14 rounded-xl bg-primary hover:bg-primary-container active:scale-[0.98] text-white font-bold flex items-center justify-center gap-2 transition"
            >
              <Camera size={20} /> Tomar foto
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="h-14 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-800 font-bold flex items-center justify-center gap-2 transition"
            >
              <Images size={20} /> Galería
            </button>
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFilesSelected} />
            <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFilesSelected} />
          </div>

          {visiblePhotos.length === 0 && visibleUploads.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
              Aún no hay fotos {showWeekPhotos ? 'esta semana' : 'este día'}.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {visibleUploads.map(u => (
                <div key={u.id} className="relative aspect-square rounded-lg overflow-hidden bg-slate-200">
                  <img src={u.previewUrl} alt="" className="w-full h-full object-cover opacity-60" />
                  {u.status === 'error' ? (
                    <div className="absolute inset-0 bg-red-900/70 text-white flex flex-col items-center justify-center gap-1 p-1 text-center">
                      <CloudOff size={18} />
                      <span className="text-[11px] font-semibold leading-tight">No se subió</span>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => retryUpload(u)} className="bg-white text-red-800 rounded-md px-2 py-1 text-[11px] font-bold" aria-label="Reintentar subida">
                          <RefreshCw size={12} />
                        </button>
                        <button type="button" onClick={() => discardUpload(u)} className="bg-white/20 rounded-md px-2 py-1 text-[11px] font-bold" aria-label="Descartar foto">
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-white bg-slate-900/40">
                      <Loader2 size={20} className="animate-spin" />
                      <span className="text-[11px] font-semibold">
                        {u.status === 'uploading' ? 'Subiendo…' : u.status === 'compressing' ? 'Comprimiendo…' : 'En cola'}
                      </span>
                    </div>
                  )}
                </div>
              ))}
              {visiblePhotos.map(foto => (
                <button
                  key={foto.id}
                  type="button"
                  onClick={() => setViewerPhotoId(foto.id)}
                  className="relative aspect-square rounded-lg overflow-hidden bg-slate-200"
                >
                  <img
                    src={foto.thumb || foto.url}
                    alt={foto.caption || 'Foto de avance'}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                  />
                  {showWeekPhotos && (
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] font-semibold px-1.5 rounded">
                      {shortDate(foto.date)}
                    </span>
                  )}
                  {foto.caption && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white shadow" title="Tiene descripción" />
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Bitácora */}
        <section className="bg-white rounded-2xl p-3 shadow-sm flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">Bitácora del día</h2>
            <button type="button" onClick={handlePaste} className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
              <ClipboardPaste size={16} /> Pegar
            </button>
          </div>

          <textarea
            value={dailyNote}
            onChange={(e) => handleNoteChange(e.target.value)}
            placeholder="Actividades del día, personal y maquinaria en sitio, clima, novedades…"
            rows={4}
            className="w-full rounded-xl border-slate-300 bg-slate-50 text-sm leading-relaxed focus:border-primary focus:ring-primary"
          />

          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {QUICK_LOG_TAGS.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => handleAddQuickTag(tag)}
                className="shrink-0 whitespace-nowrap rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 active:bg-slate-100"
              >
                + {tag}
              </button>
            ))}
          </div>

          {otherDayNotes.length > 0 && (
            <div className="border-t border-slate-100 pt-2">
              <button
                type="button"
                onClick={() => setShowHistory(v => !v)}
                className="w-full flex items-center justify-between text-sm font-semibold text-slate-600 py-1"
              >
                Notas de otros días ({otherDayNotes.length})
                <ChevronDown size={16} className={`transition-transform ${showHistory ? 'rotate-180' : ''}`} />
              </button>
              {showHistory && (
                <ul className="mt-2 flex flex-col gap-2">
                  {otherDayNotes.map(n => (
                    <li key={n.id || n.date} className="rounded-lg bg-slate-50 p-2.5">
                      <p className="text-xs font-bold text-primary">{shortDate(n.date)}</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap mt-0.5">{n.note}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </main>

      {/* BARRA INFERIOR */}
      <footer className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="max-w-lg mx-auto px-3 py-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => stepFrente(-1)}
            className="w-12 h-12 shrink-0 rounded-xl bg-slate-100 active:bg-slate-200 flex items-center justify-center"
            aria-label="Frente anterior"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            onClick={() => saveCurrent().catch(() => {})}
            disabled={saveState === 'saving'}
            className={`flex-1 h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-70 ${
              saveState === 'error' ? 'bg-red-600 text-white' :
              saveState === 'saved' || saveState === 'idle' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
              'bg-emerald-600 text-white'
            }`}
          >
            {saveState === 'saving' ? <Loader2 size={18} className="animate-spin" /> :
              saveState === 'saved' ? <CheckCircle2 size={18} /> :
              saveState === 'error' ? <RefreshCw size={18} /> : <Check size={18} />}
            {saveLabel}
          </button>
          <button
            type="button"
            onClick={() => stepFrente(1)}
            className="w-12 h-12 shrink-0 rounded-xl bg-slate-100 active:bg-slate-200 flex items-center justify-center"
            aria-label="Siguiente frente"
          >
            <ChevronRight size={22} />
          </button>
        </div>
      </footer>

      {/* SELECTOR DE FRENTES */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex flex-col justify-end" onClick={() => setIsPickerOpen(false)}>
          <div
            className="bg-white rounded-t-2xl w-full max-w-lg mx-auto max-h-[88vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Elegir frente"
          >
            <div className="px-4 pt-3 pb-2">
              <div className="mx-auto w-10 h-1 rounded-full bg-slate-300 mb-3" />
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Elegir frente</h2>
                  <p className="text-sm text-slate-500">
                    {shortDate(activeDateStr)}: <strong className="text-emerald-700">{doneToday}</strong> de {frentes.length} con reporte
                  </p>
                </div>
                <button type="button" onClick={() => setIsPickerOpen(false)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center" aria-label="Cerrar">
                  <X size={18} />
                </button>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${frentes.length ? (doneToday / frentes.length) * 100 : 0}%` }} />
              </div>
            </div>

            <div className="px-4 pb-3 flex flex-col gap-2 border-b border-slate-100">
              <div className="grid grid-cols-3 gap-1 bg-slate-100 rounded-xl p-1 text-sm font-semibold">
                {[
                  ['all', `Todos (${frentes.length})`],
                  ['pending', `Pendientes (${frentes.length - doneToday})`],
                  ['done', `Listos (${doneToday})`]
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPickerStatus(key)}
                    className={`rounded-lg py-2 ${pickerStatus === key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    enterKeyHint="search"
                    placeholder="Frente, CIV o calle"
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    className="w-full rounded-xl border-slate-200 bg-slate-50 pl-9 text-sm focus:border-primary focus:ring-primary"
                  />
                </div>
                <select
                  value={pickerContract}
                  onChange={(e) => setPickerContract(e.target.value)}
                  className="w-32 shrink-0 rounded-xl border-slate-200 bg-slate-50 text-sm font-semibold focus:border-primary focus:ring-primary"
                  aria-label="Contrato"
                >
                  <option value="all">Contrato</option>
                  <option value="malla">Malla vial ({mallaCount})</option>
                  <option value="espacio">Espacio público ({frentes.length - mallaCount})</option>
                </select>
              </div>
            </div>

            <ul className="flex-1 overflow-y-auto px-2 py-2">
              {pickerFrentes.length === 0 && (
                <li className="py-10 text-center text-sm text-slate-500">
                  {pickerStatus === 'pending' ? '¡Todos los frentes tienen reporte este día!' : 'No hay frentes con ese filtro.'}
                </li>
              )}
              {pickerFrentes.map(f => {
                const done = hasActivityOn(f, activeDateStr);
                const isSelected = f.id === selectedFrenteId;
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => goToFrente(f.id)}
                      className={`w-full flex items-center gap-3 rounded-xl px-2 py-2.5 text-left ${isSelected ? 'bg-primary/5 ring-1 ring-primary/30' : 'active:bg-slate-50'}`}
                    >
                      <span className={`shrink-0 w-10 h-10 rounded-lg flex flex-col items-center justify-center leading-none font-bold ${
                        isMallaVial(f) ? 'bg-amber-100 text-amber-900' : 'bg-teal-100 text-teal-900'
                      }`}>
                        <span className="text-[9px]">{isMallaVial(f) ? 'MV' : 'EP'}</span>
                        <span className="text-sm">{f.frente}</span>
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold truncate">{f.eje || f.name}</span>
                        <span className="block text-xs text-slate-500 truncate">CIV {f.civ} · {f.desde} → {f.hasta}</span>
                      </span>
                      {done ? (
                        <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                          <CheckCircle2 size={16} /> Listo
                        </span>
                      ) : (
                        <span className="shrink-0 text-xs font-semibold text-slate-400">Pendiente</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* REPORTES PENDIENTES */}
      {isPendingOpen && (
        <PendingReportsSheet
          coverage={coverage}
          todayIso={todayIso}
          onClose={() => setIsPendingOpen(false)}
          onGoToDay={async (report, dayIso) => {
            setIsPendingOpen(false);
            setShowWeekPhotos(false);
            if (String(report.id_informe) === String(currentReport?.id_informe)) {
              const idx = weekDates.findIndex(d => d.iso === dayIso);
              if (idx !== -1) handleDayChange(idx);
            } else {
              pendingDayRef.current = dayIso;
              await handleReportChange(report.id_informe);
            }
          }}
          onGoToFrente={async (report, frenteId) => {
            setIsPendingOpen(false);
            if (String(report.id_informe) !== String(currentReport?.id_informe)) {
              await handleReportChange(report.id_informe);
            }
            goToFrente(frenteId);
          }}
        />
      )}

      {/* VISOR DE FOTO: descripción y eliminar */}
      {viewerPhoto && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col" role="dialog" aria-label="Foto">
          <div className="flex items-center justify-between px-3 py-3 text-white">
            <span className="text-sm font-semibold">{shortDate(viewerPhoto.date)}</span>
            <button type="button" onClick={closeViewer} className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center" aria-label="Cerrar">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center px-2">
            <img src={viewerPhoto.url} alt={viewerPhoto.caption || 'Foto de avance'} className="max-h-full max-w-full object-contain rounded-lg" />
          </div>
          <div className="p-3 flex flex-col gap-2 bg-black" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
            <input
              type="text"
              value={viewerPhoto.caption || ''}
              onChange={(e) => handleCaptionChange(viewerPhoto.id, e.target.value)}
              placeholder="Agregar descripción…"
              className="w-full rounded-xl border-0 bg-white/10 text-white placeholder:text-white/50 text-sm focus:ring-2 focus:ring-white/40"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleDeletePhoto(viewerPhoto.id)}
                className="h-11 px-4 rounded-xl bg-red-600/90 text-white text-sm font-bold inline-flex items-center gap-1.5"
              >
                <Trash2 size={16} /> Eliminar
              </button>
              <button type="button" onClick={closeViewer} className="flex-1 h-11 rounded-xl bg-white text-slate-900 text-sm font-bold">
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className={`fixed left-4 right-4 bottom-24 z-50 max-w-sm mx-auto rounded-xl px-4 py-3 text-sm font-semibold shadow-xl flex items-center gap-2 ${
            toast.tone === 'error' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'
          }`}
        >
          {toast.tone === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} className="text-emerald-400" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}

function SaveStatusPill({ saveState, activeUploads, failedUploads, pendingSync }) {
  let icon = <CheckCircle2 size={14} />;
  let text = 'Al día';
  let tone = 'bg-white/15 text-white';
  if (failedUploads > 0) {
    icon = <CloudOff size={14} />;
    text = `${failedUploads} sin subir`;
    tone = 'bg-red-500 text-white';
  } else if (activeUploads > 0) {
    icon = <Loader2 size={14} className="animate-spin" />;
    text = `Subiendo ${activeUploads}`;
  } else if (saveState === 'saving') {
    icon = <Loader2 size={14} className="animate-spin" />;
    text = 'Guardando';
  } else if (saveState === 'dirty') {
    icon = <span className="w-2 h-2 rounded-full bg-amber-300" />;
    text = 'Sin guardar';
  } else if (saveState === 'error' || pendingSync > 0) {
    icon = <CloudOff size={14} />;
    text = 'Sin conexión';
    tone = 'bg-red-500 text-white';
  }
  return (
    <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`} aria-live="polite">
      {icon}
      {text}
    </span>
  );
}

const STATUS_STYLE = {
  'sin-reportes': { label: 'Sin reportes', cls: 'bg-rose-100 text-rose-800' },
  parcial: { label: 'Incompleta', cls: 'bg-amber-100 text-amber-900' },
  completa: { label: 'Completa', cls: 'bg-emerald-100 text-emerald-800' },
  'en-curso': { label: 'En curso', cls: 'bg-blue-100 text-blue-800' }
};

const frenteLabel = (f) => `${isMallaVial(f) ? 'MV' : 'EP'} ${f.frente || ''}`.trim();
const dayLabel = (iso) => {
  const d = new Date(`${iso}T12:00:00`);
  return `${DAY_NAMES[d.getDay()].slice(0, 3)} ${d.getDate()}`;
};

// Rangos compactos: [22,23,24,27] -> "22–24, 27"
const compactRanges = (nums) => {
  const out = [];
  for (let i = 0; i < nums.length; i++) {
    let j = i;
    while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
    out.push(i === j ? `${nums[i]}` : `${nums[i]}–${nums[j]}`);
    i = j;
  }
  return out.join(', ');
};

function PendingReportsSheet({ coverage, onClose, onGoToDay, onGoToFrente }) {
  const current = coverage.weeks.find(w => w.status === 'en-curso');
  const previous = coverage.weeks.filter(w => w.status !== 'en-curso');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex flex-col justify-end" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl w-full max-w-lg mx-auto max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Reportes pendientes"
      >
        <div className="px-4 pt-3 pb-3 border-b border-slate-100">
          <div className="mx-auto w-10 h-1 rounded-full bg-slate-300 mb-3" />
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Reportes pendientes</h2>
              <p className="text-sm text-slate-500">Frentes activos = con reportes en las últimas 4 semanas</p>
            </div>
            <button type="button" onClick={onClose} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center" aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-5">
          {current && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Esta semana · Semana {current.numero}
              </h3>
              <div className="rounded-xl border border-slate-200 p-3 flex flex-col gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    {current.reportedDays.length} de {current.workDays} días con reporte
                  </p>
                  {current.missingDays.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {current.missingDays.map(day => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => onGoToDay(current.report, day)}
                          className="rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 text-xs font-bold"
                        >
                          {dayLabel(day)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-700 mt-1">Todos los días anteriores tienen reporte.</p>
                  )}
                </div>
                {current.missingFrentes.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1.5">
                      Frentes activos sin reporte esta semana ({current.missingFrentes.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {current.missingFrentes.map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => onGoToFrente(current.report, f.id)}
                          className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700"
                          title={f.eje}
                        >
                          {frenteLabel(f)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Semanas anteriores</h3>
            <ul className="flex flex-col gap-2">
              {previous.map(w => {
                const st = STATUS_STYLE[w.status];
                const firstMissing = w.missingDays[0] || w.report.fecha_inicial_corte;
                return (
                  <li key={w.numero}>
                    <button
                      type="button"
                      onClick={() => onGoToDay(w.report, firstMissing)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-left active:bg-slate-50"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold">
                          Semana {w.numero}
                          <span className="font-normal text-slate-500"> · {shortDate(w.report.fecha_inicial_corte)} – {shortDate(w.report.fecha_final_corte)}</span>
                        </span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                      </span>
                      <span className="block text-xs text-slate-500 mt-0.5">
                        {w.reportedDays.length} de {w.workDays} días · {w.reportedFrentes.length} frente{w.reportedFrentes.length === 1 ? '' : 's'} con reporte
                        {w.missingFrentes.length > 0 && w.status !== 'completa' &&
                          ` · faltan ${w.missingFrentes.slice(0, 4).map(frenteLabel).join(', ')}${w.missingFrentes.length > 4 ? '…' : ''}`}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {coverage.missingWeekNumbers.length > 0 && (
            <p className="text-xs text-slate-500 pb-2">
              Semanas que nunca se crearon: <strong>{compactRanges(coverage.missingWeekNumbers)}</strong>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
