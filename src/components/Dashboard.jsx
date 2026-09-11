import React, { useState } from 'react';
import { 
  Search, Calendar, MapPin, 
  ChevronLeft, ChevronRight, X, Eye, Image as ImageIcon, ArrowRight, Layers,
  FileText, Copy, Check, Sparkles, Table,
  SlidersHorizontal, ArrowUpDown, CheckCircle2, AlertTriangle, Zap,
  Building2, Route, Footprints, ShieldAlert, Clock3
} from 'lucide-react';
import { getDisenoForCiv } from '../data/frentesDisenos';
import { 
  getAvailableMonths, 
  generateMonthlyFullOfficialReport, 
  generateMonthlyAIPrompt, 
  generateMonthlyExcelTSV, 
  generateMonthlyPhotosTSV 
} from '../data/reportsWeekly';
import MapView from './MapView';
import StaticMapThumbnail from './StaticMapThumbnail';
import L from 'leaflet';


// Leaflet default icon SVG fallback (eliminates 404 asset errors in Vite)
const defaultIconSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41"><path fill="%232563eb" stroke="%231d4ed8" stroke-width="1.5" d="M12.5 0C5.6 0 0 5.6 0 12.5C0 21.9 12.5 41 12.5 41C12.5 41 25 21.9 25 12.5C25 5.6 19.4 0 12.5 0Z"/><circle cx="12.5" cy="12.5" r="5.5" fill="%23ffffff"/></svg>`;

let DefaultIcon = L.icon({
  iconUrl: defaultIconSvg,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;


// Mini Static Map component for each frente card (High fidelity with Esri & Web Mercator)
function MiniFrenteMap({ lat, lng, frenteId }) {
  return (
    <div className="w-full h-36 rounded-lg border border-slate-200 overflow-hidden shadow-2xs bg-slate-100 relative group cursor-pointer">
      <StaticMapThumbnail 
        lat={lat} 
        lng={lng} 
        zoom={15} 
        width={340} 
        height={144} 
        className="group-hover:scale-105 transition-transform duration-300"
        alt={`Mapa Frente ${frenteId}`} 
      />
      <div className="absolute inset-0 bg-slate-900/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center no-print pointer-events-none">
        <span className="bg-white/95 text-slate-900 text-[10px] font-black px-2.5 py-1 rounded-md shadow-sm border border-slate-200">
          Ubicación Georreferenciada
        </span>
      </div>
    </div>
  );
}

const getLayerColor = (type) => {
  switch (type) {
    case 'asfalto':
      return 'bg-slate-900 text-white font-bold';
    case 'concreto':
      return 'bg-slate-200 text-slate-800 font-bold border border-slate-350';
    case 'imprimacion':
      return 'bg-slate-50 text-slate-455 border border-slate-200';
    case 'base_cemento':
    case 'subbase_cemento':
      return 'bg-stone-200 text-stone-850 font-bold border border-stone-300';
    case 'subbase':
      return 'bg-amber-100 text-amber-900 font-bold border border-amber-200';
    case 'geomalla':
      return 'bg-indigo-100 text-indigo-900 font-bold border border-indigo-200';
    case 'geocelda':
      return 'bg-orange-100 text-orange-950 font-bold border border-orange-200';
    case 'geotextil':
    case 'geotextil_nt':
      return 'bg-blue-50 text-blue-900 border border-blue-200';
    case 'arena':
      return 'bg-yellow-100 text-yellow-800 font-bold border border-yellow-250';
    case 'subrasante':
      return 'bg-amber-700 text-white font-bold';
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200';
  }
};

export default function Dashboard({ projects = [], onSelectProject, onAddProject: _onAddProject, isContractorMode, weeklyReports = [], onNavigateToReports }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'map'
  const [contractFilter, setContractFilter] = useState('all'); // 'all', 'malla_vial', 'espacio_publico'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'al-dia', 'alerta', 'emergencia'
  const [sortBy, setSortBy] = useState('frente_asc'); // 'frente_asc', 'progress_desc', 'progress_asc', 'budget_desc', 'photos_desc'
  
  // Extract all unique weeks available from weeklyReports
  const availableWeeks = [...new Set((weeklyReports || []).map(r => r.numero_semana))].sort((a, b) => b - a);
  
  // Selected global week state
  const [selectedWeek, setSelectedWeek] = useState(availableWeeks[0] || 29);

  // Month Filtering & Grouping State
  const [photoFilterMode, setPhotoFilterMode] = useState('month'); // 'month' or 'week'
  const [selectedMonth, setSelectedMonth] = useState('all'); // 'all' or month key like '2026-07'
  
  // Quick Monthly Copy Modal State on Landing Page
  const [showMonthlyCopyModal, setShowMonthlyCopyModal] = useState(false);
  const [modalCopiedKey, setModalCopiedKey] = useState(null);
  const [modalContractFilter, setModalContractFilter] = useState('all');
  const [modalOnlyWithActivity, setModalOnlyWithActivity] = useState(true);
  const availableMonthsList = React.useMemo(() => getAvailableMonths(weeklyReports), [weeklyReports]);
  const [modalSelectedMonth, setModalSelectedMonth] = useState(() => availableMonthsList[0]?.key || '');

  React.useEffect(() => {
    if (availableMonthsList.length > 0 && (!modalSelectedMonth || !availableMonthsList.some(m => m.key === modalSelectedMonth))) {
      setModalSelectedMonth(availableMonthsList[0].key);
    }
  }, [availableMonthsList, modalSelectedMonth]);

  const handleModalCopy = (text, keyName) => {
    if (!text) return;
    navigator.clipboard.writeText(text)
      .then(() => {
        setModalCopiedKey(keyName);
        setTimeout(() => setModalCopiedKey(null), 2500);
      })
      .catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setModalCopiedKey(keyName);
        setTimeout(() => setModalCopiedKey(null), 2500);
      });
  };

  // Lightbox State
  const [lightboxPhotos, setLightboxPhotos] = useState(null); // stores all photos for active frente
  const [lightboxIndex, setLightboxIndex] = useState(0);      // index inside visiblePhotos
  const [selectedLightboxWeek, setSelectedLightboxWeek] = useState('all'); // 'all' or week number
  const [selectedLightboxMonth, setSelectedLightboxMonth] = useState('all'); // 'all' or month key


  // Helper to extract month and year from a photo or date string
  const getPhotoMonthYear = (photo) => {
    const dateStr = photo.date || photo.fechaCorte || photo.fechaInicial;
    if (!dateStr || dateStr === 'Sin fecha') {
      if (photo.semana) {
        const label = photo.semana >= 28 ? 'Julio 2026' : photo.semana >= 24 ? 'Junio 2026' : photo.semana >= 20 ? 'Mayo 2026' : 'Abril 2026';
        const key = photo.semana >= 28 ? '2026-07' : photo.semana >= 24 ? '2026-06' : photo.semana >= 20 ? '2026-05' : '2026-04';
        return { key, label };
      }
      return { key: 'sin_fecha', label: 'Sin fecha' };
    }

    try {
      let d;
      if (typeof dateStr === 'string' && dateStr.includes('-')) {
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length === 3) {
          d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
      } else if (typeof dateStr === 'string' && dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
      }
      if (!d || isNaN(d.getTime())) {
        d = new Date(dateStr);
      }
      if (isNaN(d.getTime())) return { key: 'sin_fecha', label: 'Sin fecha' };

      const year = d.getFullYear();
      const monthName = d.toLocaleDateString('es-CO', { month: 'long' });
      const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      const label = `${capitalizedMonth} ${year}`;
      const key = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return { key, label };
    } catch {
      return { key: 'sin_fecha', label: 'Sin fecha' };
    }
  };

  // Build available months list across all reports
  const availableMonthsMap = new Map();
  (weeklyReports || []).forEach(report => {
    (report.frentes || []).forEach(f => {
      (f.fotos || []).forEach(photo => {
        const { key, label } = getPhotoMonthYear({
          ...photo,
          semana: report.numero_semana,
          fechaCorte: report.fecha_final_corte
        });
        if (key !== 'sin_fecha') {
          availableMonthsMap.set(key, label);
        }
      });
    });
  });

  if (availableMonthsMap.size === 0) {
    (weeklyReports || []).forEach(report => {
      if (report.fecha_inicial_corte) {
        const { key, label } = getPhotoMonthYear({ date: report.fecha_inicial_corte });
        if (key !== 'sin_fecha') availableMonthsMap.set(key, label);
      }
    });
  }
  const availableMonths = Array.from(availableMonthsMap.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => b.key.localeCompare(a.key));

  // Compile frentes with stats representing the selected week
  const frentes = projects.flatMap(proj => {
    return (proj.frentes || []).map(f => {
      // Find report corresponding to the selected week
      const reportForWeek = (weeklyReports || []).find(r => r.numero_semana === Number(selectedWeek));
      const reportFrente = reportForWeek?.frentes?.find(rf => rf.id === f.id);
      
      // Fallback to the project base stats if selectedWeek has no report
      const currentProgress = reportFrente ? reportFrente.progress : f.progress;
      const currentStatus = reportFrente ? reportFrente.status : f.status;

      return {
        ...f,
        progress: currentProgress,
        status: currentStatus,
        projectId: proj.id,
        projectName: proj.name,
        contractNo: proj.contractNo,
        contractor: proj.contractor
      };
    });
  });

  // Selected daily report status filter: 'all', 'pending' (missing today's upload), 'reported'
  const [dailyReportFilter, setDailyReportFilter] = useState('all');

  // Active Frentes overrides state (maps frente.id -> boolean)
  const [activeFrentesOverrides, setActiveFrentesOverrides] = useState(() => {
    try {
      const saved = localStorage.getItem('geo_interventoria_active_frentes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [isManageActiveModalOpen, setIsManageActiveModalOpen] = useState(false);

  const toggleFrenteActive = (frenteId) => {
    setActiveFrentesOverrides(prev => {
      const current = prev[frenteId] !== undefined ? prev[frenteId] : true;
      const updated = { ...prev, [frenteId]: !current };
      try {
        localStorage.setItem('geo_interventoria_active_frentes', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Helper to extract timestamp from photo for strict chronological ordering (oldest -> newest)
  const getPhotoTimestamp = (photo) => {
    const dateStr = photo.date || photo.fechaCorte || photo.fechaInicial;
    if (!dateStr || dateStr === 'Sin fecha') return 0;
    try {
      let d;
      if (typeof dateStr === 'string' && dateStr.includes('-')) {
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length === 3) {
          d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
      } else if (typeof dateStr === 'string' && dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
      }
      if (!d || isNaN(d.getTime())) {
        d = new Date(dateStr);
      }
      return !isNaN(d.getTime()) ? d.getTime() : 0;
    } catch {
      return 0;
    }
  };

  // Helper to check if an active frente has uploaded daily photos/notes for today or current corte date
  const getFrenteDailyUploadStatus = (frente) => {
    // Determine active status: user override if set, else check status != Cerrado/Inactivo
    const isOverrideDefined = activeFrentesOverrides[frente.id] !== undefined;
    const isActive = isOverrideDefined 
      ? activeFrentesOverrides[frente.id] 
      : (frente.status !== 'Cerrado' && frente.status !== 'Inactivo' && (frente.progress === undefined || frente.progress < 100));

    if (!isActive) {
      return {
        isActive: false,
        hasUploadToday: false,
        isMissingUpload: false
      };
    }

    const reportForWeek = (weeklyReports || []).find(r => r.numero_semana === Number(selectedWeek));
    const reportFrente = reportForWeek?.frentes?.find(rf => rf.id === frente.id);
    
    const photos = reportFrente?.fotos || frente.fotos || [];
    const notes = reportFrente?.bitacora_notes || reportFrente?.bitacora_notas || frente.bitacora_notes || frente.bitacora_notas || [];
    
    const todayStr = new Date().toISOString().split('T')[0];
    const corteDate = reportForWeek?.fecha_final_corte || todayStr;

    // Has notes or photos registered for today or for the current week corte
    const hasPhotoToday = photos.some(p => p.date === todayStr || p.date === corteDate || p.semana === Number(selectedWeek));
    const hasNoteToday = notes.some(n => (n.date === todayStr || n.date === corteDate) && n.note?.trim() !== '');

    const hasUploadToday = hasPhotoToday || hasNoteToday;

    // Active frente without daily upload is flagged as missing report
    const isMissingUpload = !hasUploadToday;

    return {
      isActive: true,
      hasUploadToday,
      isMissingUpload
    };
  };

  // Extract photos for a given frente across all weekly reports AND projects sorted strictly chronologically
  const getFrentePhotos = (frenteId) => {
    const photosMap = new Map();

    // 1. Extract from all weekly reports (Supabase data)
    (weeklyReports || []).forEach(report => {
      const reportFrente = report.frentes?.find(rf => rf.id === frenteId);
      if (reportFrente) {
        const list = [...(reportFrente.fotos || []), ...(reportFrente.photos || [])];
        list.forEach(photo => {
          const key = photo.id || photo.url;
          if (key && !photosMap.has(key)) {
            photosMap.set(key, {
              ...photo,
              semana: photo.semana || report.numero_semana,
              fechaCorte: report.fecha_final_corte,
              fechaInicial: report.fecha_inicial_corte
            });
          }
        });
      }
    });

    // 2. Extract from project frentes (PhotoGallery data)
    (projects || []).forEach(proj => {
      const prjFrente = proj.frentes?.find(pf => pf.id === frenteId);
      if (prjFrente) {
        const list = [...(prjFrente.photos || []), ...(prjFrente.fotos || [])];
        list.forEach(photo => {
          const key = photo.id || photo.url;
          if (key && !photosMap.has(key)) {
            photosMap.set(key, {
              ...photo,
              semana: photo.semana || 20,
              date: photo.date || new Date().toISOString().split('T')[0]
            });
          }
        });
      }
    });

    const photos = Array.from(photosMap.values());
    return photos.sort((a, b) => getPhotoTimestamp(a) - getPhotoTimestamp(b));
  };

  // Group photos of a frente by month (sorted chronologically)
  const getFrentePhotosGroupedByMonth = (frenteId) => {
    const allPhotos = getFrentePhotos(frenteId);
    const groupsMap = new Map();

    allPhotos.forEach(photo => {
      const { key, label } = getPhotoMonthYear(photo);
      if (!groupsMap.has(key)) {
        groupsMap.set(key, { key, label, photos: [] });
      }
      groupsMap.get(key).photos.push(photo);
    });

    const groups = Array.from(groupsMap.values());
    // Sort groups chronologically (ascending month key)
    groups.sort((a, b) => a.key.localeCompare(b.key));

    // Sort photos inside each group chronologically
    groups.forEach(g => {
      g.photos.sort((a, b) => getPhotoTimestamp(a) - getPhotoTimestamp(b));
    });

    return groups;
  };

  // Get photos specifically uploaded during the selected week (sorted chronologically)
  const getFrentePhotosForWeek = (frenteId, weekNum) => {
    const photosMap = new Map();
    const report = (weeklyReports || []).find(r => r.numero_semana === Number(weekNum));
    const reportFrente = report?.frentes?.find(rf => rf.id === frenteId);
    if (reportFrente) {
      const list = [...(reportFrente.fotos || []), ...(reportFrente.photos || [])];
      list.forEach(photo => {
        const key = photo.id || photo.url;
        if (key && !photosMap.has(key)) {
          photosMap.set(key, {
            ...photo,
            semana: report.numero_semana,
            fechaCorte: report.fecha_final_corte,
            fechaInicial: report.fecha_inicial_corte
          });
        }
      });
    }

    // Also include photos assigned to this week number from projects state
    (projects || []).forEach(proj => {
      const prjFrente = proj.frentes?.find(pf => pf.id === frenteId);
      if (prjFrente) {
        const list = [...(prjFrente.photos || []), ...(prjFrente.fotos || [])];
        list.forEach(photo => {
          if (Number(photo.semana) === Number(weekNum)) {
            const key = photo.id || photo.url;
            if (key && !photosMap.has(key)) {
              photosMap.set(key, photo);
            }
          }
        });
      }
    });

    const photos = Array.from(photosMap.values());
    return photos.sort((a, b) => getPhotoTimestamp(a) - getPhotoTimestamp(b));
  };

  // Option to show/hide inactive frentes on the main screen (Default: false = show ONLY active frentes)
  const [showInactiveFrentes, setShowInactiveFrentes] = useState(false);

  // Filter frentes by text search, active state, contract, status, daily report status & sorting
  const filteredFrentes = frentes.filter(f => {
    const { isActive, isMissingUpload, hasUploadToday } = getFrenteDailyUploadStatus(f);

    // By default, hide inactive/paused frentes from the main Dashboard screen
    if (!showInactiveFrentes && !isActive) return false;

    // Filter by Contract (Malla Vial vs Espacio Público)
    if (contractFilter === 'malla_vial' && !f.id.startsWith('f_mv')) return false;
    if (contractFilter === 'espacio_publico' && !f.id.startsWith('f_ep')) return false;

    // Filter by Status
    if (statusFilter === 'al-dia' && f.status !== 'al-dia') return false;
    if (statusFilter === 'alerta' && f.status !== 'alerta') return false;
    if (statusFilter === 'emergencia' && f.prioridad !== 'Emergencia') return false;

    // Filter by Daily Report
    if (dailyReportFilter === 'pending' && !isMissingUpload) return false;
    if (dailyReportFilter === 'reported' && !hasUploadToday) return false;

    // Universal Search
    if (searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase().trim();
      const frenteVal = String(f.frente || '').toLowerCase();
      const aliasVal = String(f.alias || '').toLowerCase();
      const ejeVal = String(f.eje || '').toLowerCase();
      const civVal = String(f.civ || '');
      const barrioVal = String(f.barrio || '').toLowerCase();
      const projNameVal = String(f.projectName || '').toLowerCase();
      const contractNoVal = String(f.contractNo || '').toLowerCase();
      const priorityVal = String(f.prioridad || '').toLowerCase();

      const matchesSearch = (
        frenteVal.includes(searchLower) ||
        aliasVal.includes(searchLower) ||
        ejeVal.includes(searchLower) ||
        civVal.includes(searchLower) ||
        barrioVal.includes(searchLower) ||
        projNameVal.includes(searchLower) ||
        contractNoVal.includes(searchLower) ||
        priorityVal.includes(searchLower)
      );

      if (!matchesSearch) return false;
    }

    return true;
  }).sort((a, b) => {
    if (sortBy === 'progress_desc') return (b.progress || 0) - (a.progress || 0);
    if (sortBy === 'progress_asc') return (a.progress || 0) - (b.progress || 0);
    if (sortBy === 'budget_desc') return (b.financialMetrics?.totalBudget || 0) - (a.financialMetrics?.totalBudget || 0);
    if (sortBy === 'photos_desc') return getFrentePhotos(b.id).length - getFrentePhotos(a.id).length;
    // Default: Sort by frente number
    return (Number(a.frente) || 0) - (Number(b.frente) || 0);
  });

  // Calculate dynamic KPI metric counts
  const totalCount = frentes.length;
  const mvCount = frentes.filter(f => f.id.startsWith('f_mv')).length;
  const epCount = frentes.filter(f => f.id.startsWith('f_ep')).length;
  const pendingCount = frentes.filter(f => getFrenteDailyUploadStatus(f).isMissingUpload).length;
  const reportedCount = frentes.filter(f => getFrenteDailyUploadStatus(f).hasUploadToday).length;
  const emergencyCount = frentes.filter(f => f.prioridad === 'Emergencia').length;
  const avgProgress = totalCount > 0 ? Math.round(frentes.reduce((acc, f) => acc + (f.progress || 0), 0) / totalCount) : 0;

  const hasActiveFilters = (
    searchTerm.trim() !== '' ||
    contractFilter !== 'all' ||
    statusFilter !== 'all' ||
    dailyReportFilter !== 'all' ||
    sortBy !== 'frente_asc'
  );

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setContractFilter('all');
    setStatusFilter('all');
    setDailyReportFilter('all');
    setSortBy('frente_asc');
  };

  // Lightbox opening handler
  const handleOpenLightbox = (photosList, photoIndex) => {
    const clickedPhoto = photosList[photoIndex] || photosList[0];
    setLightboxPhotos(photosList);
    
    const { key: photoMonth } = getPhotoMonthYear(clickedPhoto);
    setSelectedLightboxMonth(photoMonth);
    setSelectedLightboxWeek('all');
    
    const monthPhotos = photosList.filter(p => getPhotoMonthYear(p).key === photoMonth);
    const indexInMonth = monthPhotos.findIndex(p => p.id === clickedPhoto.id);
    setLightboxIndex(indexInMonth >= 0 ? indexInMonth : 0);
  };

  // Get active photo list based on month/week filter in Lightbox
  const getVisiblePhotos = () => {
    if (!lightboxPhotos) return [];
    let list = lightboxPhotos;

    if (selectedLightboxMonth !== 'all') {
      list = list.filter(p => getPhotoMonthYear(p).key === selectedLightboxMonth);
    }
    if (selectedLightboxWeek !== 'all') {
      list = list.filter(p => p.semana === Number(selectedLightboxWeek));
    }
    return list;
  };

  const visiblePhotos = getVisiblePhotos();
  const activePhoto = visiblePhotos[lightboxIndex] || visiblePhotos[0] || null;

  // Lightbox handlers
  const handlePrevPhoto = () => {
    if (visiblePhotos.length <= 1) return;
    setLightboxIndex(prev => (prev === 0 ? visiblePhotos.length - 1 : prev - 1));
  };

  const handleNextPhoto = () => {
    if (visiblePhotos.length <= 1) return;
    setLightboxIndex(prev => (prev === visiblePhotos.length - 1 ? 0 : prev + 1));
  };

  const handleWeekChange = (weekVal) => {
    setSelectedLightboxWeek(weekVal);
    setLightboxIndex(0); // reset page index on week change
  };

  const handleMonthChange = (monthKey) => {
    setSelectedLightboxMonth(monthKey);
    setLightboxIndex(0);
  };

  // Unique weeks list with photos for active lightbox
  const getLightboxWeeks = () => {
    if (!lightboxPhotos) return [];
    return [...new Set(lightboxPhotos.map(p => p.semana))].sort((a, b) => b - a);
  };

  // Unique months list with photos for active lightbox
  const getLightboxMonths = () => {
    if (!lightboxPhotos) return [];
    const monthMap = new Map();
    lightboxPhotos.forEach(p => {
      const { key, label } = getPhotoMonthYear(p);
      if (key !== 'sin_fecha') monthMap.set(key, label);
    });
    return Array.from(monthMap.entries()).map(([key, label]) => ({ key, label })).sort((a, b) => b.key.localeCompare(a.key));
  };

  // Find active week report for dates display
  const activeReport = (weeklyReports || []).find(r => r.numero_semana === Number(selectedWeek));

  return (
    <div className="flex-1 px-3 py-4 sm:px-6 sm:py-6 max-w-container-max mx-auto grid-bg min-h-screen pb-16 relative">
      
      {/* 1. Header Hero Banner with INCOLTA SAS and Radar Telemetry */}
      <section className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-xl sm:rounded-2xl p-5 sm:p-8 mb-5 sm:mb-6 shadow-md no-print">
        <div className="relative z-10 max-w-2xl">
          <span className="bg-indigo-500/20 text-indigo-300 font-extrabold text-[9.5px] sm:text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-indigo-500/30 inline-block mb-3">
            {isContractorMode ? 'INCOLTA SAS • PORTAL DEL CONTRATISTA' : 'INCOLTA SAS • CONSOLA DE AUDITORÍA'}
          </span>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black font-headline tracking-tight text-white mb-2 leading-tight">
            INCOLTA <span className="text-cyan-400">SAS</span> — Control de Frentes
          </h1>
          <p className="text-slate-350 text-xs sm:text-sm leading-relaxed mb-4 sm:mb-6 font-medium max-w-xl">
            Plataforma didáctica de interventoría y control. Navega por semanas de avance físico, visualiza las estructuras de suelo certificadas y consulta registros fotográficos de campo.
          </p>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => setViewMode('grid')}
              className={`text-xs font-bold px-3.5 sm:px-4 py-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5 flex-1 sm:flex-initial ${
                viewMode === 'grid' 
                  ? 'bg-white text-slate-900 border-white shadow-sm' 
                  : 'bg-white/10 text-white border-white/10 hover:bg-white/15'
              }`}
            >
              <Layers size={14} />
              <span>Cuadrícula</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`text-xs font-bold px-3.5 sm:px-4 py-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5 flex-1 sm:flex-initial ${
                viewMode === 'map' 
                  ? 'bg-white text-slate-900 border-white shadow-sm' 
                  : 'bg-white/10 text-white border-white/10 hover:bg-white/15'
              }`}
            >
              <MapPin size={14} />
              <span>Mapa Unificado</span>
            </button>
            <button
              onClick={() => setShowMonthlyCopyModal(true)}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black px-3.5 sm:px-4 py-2 rounded-lg transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border border-amber-300 active:scale-95 w-full sm:w-auto"
            >
              <FileText size={14} />
              <span>Copiar Datos del Mes (Word / IA)</span>
            </button>
          </div>
        </div>
        
        {/* Animated Telemetry Hologram */}
        <div className="absolute right-6 top-6 bottom-6 w-1/3 pointer-events-none hidden lg:block overflow-hidden rounded-xl border border-white/5 bg-white/5 shadow-inner z-0">
          <div className="absolute inset-0 opacity-15 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:16px_16px]" />
          
          {/* Pulse Radar Rings */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-cyan-400/25 rounded-full animate-ping opacity-25" style={{ animationDuration: '3s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-indigo-400/35 rounded-full animate-ping opacity-40" style={{ animationDuration: '2s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border border-cyan-400/50 rounded-full animate-pulse opacity-60" />
          
          {/* Animated Nodes (Frentes telemetry simulation) */}
          <div className="absolute top-1/4 left-1/3 w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_8px_#22d3ee] animate-pulse" />
          <div className="absolute top-2/3 left-1/4 w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-[0_0_8px_#34d399] animate-pulse" style={{ animationDelay: '0.4s' }} />
          <div className="absolute top-1/2 left-3/4 w-3.5 h-3.5 bg-indigo-400 rounded-full shadow-[0_0_8px_#818cf8] animate-pulse" style={{ animationDelay: '0.8s' }} />
          <div className="absolute top-3/4 left-2/3 w-2 h-2 bg-amber-400 rounded-full shadow-[0_0_8px_#fbbf24] animate-pulse" style={{ animationDelay: '1.2s' }} />

          {/* Laser scanning line */}
          <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent top-0 animate-scan" />
        </div>
      </section>

      {/* 1.5 Interactive KPI Telemetry Strip */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-5 sm:mb-6 no-print">
        {/* Total Frentes */}
        <button
          type="button"
          onClick={handleClearAllFilters}
          className={`p-3 sm:p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden group ${
            contractFilter === 'all' && statusFilter === 'all' && dailyReportFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:shadow-xs'
          }`}
          title="Ver todos los frentes sin filtros"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider opacity-75">Total Frentes</span>
            <Building2 size={14} className="opacity-70 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono-numbers tracking-tight">{totalCount}</div>
          <div className="text-[9.5px] sm:text-[10px] font-medium opacity-65 truncate mt-0.5">22 MV • 21 EP ({avgProgress}% av.)</div>
        </button>

        {/* Malla Vial */}
        <button
          type="button"
          onClick={() => setContractFilter(prev => prev === 'malla_vial' ? 'all' : 'malla_vial')}
          className={`p-3 sm:p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden group ${
            contractFilter === 'malla_vial'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/30'
              : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300 hover:shadow-xs'
          }`}
          title="Filtrar frentes del contrato de Malla Vial"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider opacity-75">Malla Vial</span>
            <Route size={14} className={contractFilter === 'malla_vial' ? 'text-white' : 'text-blue-500'} />
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono-numbers tracking-tight ${contractFilter === 'malla_vial' ? 'text-white' : 'text-blue-600'}`}>{mvCount}</div>
          <div className="text-[9.5px] sm:text-[10px] font-medium opacity-65 truncate mt-0.5">IDU-Usaquén-CONS</div>
        </button>

        {/* Espacio Público */}
        <button
          type="button"
          onClick={() => setContractFilter(prev => prev === 'espacio_publico' ? 'all' : 'espacio_publico')}
          className={`p-3 sm:p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden group ${
            contractFilter === 'espacio_publico'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-500/30'
              : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-300 hover:shadow-xs'
          }`}
          title="Filtrar frentes del contrato de Espacio Público"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider opacity-75">Espacio Público</span>
            <Footprints size={14} className={contractFilter === 'espacio_publico' ? 'text-white' : 'text-indigo-500'} />
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono-numbers tracking-tight ${contractFilter === 'espacio_publico' ? 'text-white' : 'text-indigo-600'}`}>{epCount}</div>
          <div className="text-[9.5px] sm:text-[10px] font-medium opacity-65 truncate mt-0.5">IDU-ESP-2026-042</div>
        </button>

        {/* Al Día */}
        <button
          type="button"
          onClick={() => setDailyReportFilter(prev => prev === 'reported' ? 'all' : 'reported')}
          className={`p-3 sm:p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden group ${
            dailyReportFilter === 'reported'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/30'
              : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-300 hover:shadow-xs'
          }`}
          title="Filtrar frentes con reporte diario cargado hoy"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider opacity-75">Reportes Al Día</span>
            <CheckCircle2 size={14} className={dailyReportFilter === 'reported' ? 'text-white' : 'text-emerald-500'} />
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono-numbers tracking-tight ${dailyReportFilter === 'reported' ? 'text-white' : 'text-emerald-600'}`}>{reportedCount}</div>
          <div className="text-[9.5px] sm:text-[10px] font-medium opacity-65 truncate mt-0.5">Control diario al día</div>
        </button>

        {/* Pendientes Hoy */}
        <button
          type="button"
          onClick={() => setDailyReportFilter(prev => prev === 'pending' ? 'all' : 'pending')}
          className={`p-3 sm:p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden group ${
            dailyReportFilter === 'pending'
              ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-400/30'
              : 'bg-white text-slate-800 border-slate-200 hover:border-amber-300 hover:shadow-xs'
          }`}
          title="Filtrar frentes activos pendientes por reporte diario"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider opacity-75">Pendientes Hoy</span>
            <Clock3 size={14} className={dailyReportFilter === 'pending' ? 'text-white' : 'text-amber-500'} />
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono-numbers tracking-tight ${dailyReportFilter === 'pending' ? 'text-white' : 'text-amber-600'}`}>{pendingCount}</div>
          <div className="text-[9.5px] sm:text-[10px] font-medium opacity-65 truncate mt-0.5">Requieren reporte</div>
        </button>

        {/* Emergencia */}
        <button
          type="button"
          onClick={() => setStatusFilter(prev => prev === 'emergencia' ? 'all' : 'emergencia')}
          className={`p-3 sm:p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden group ${
            statusFilter === 'emergencia'
              ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-400/30'
              : 'bg-white text-slate-800 border-slate-200 hover:border-rose-300 hover:shadow-xs'
          }`}
          title="Filtrar frentes con prioridad de Emergencia"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider opacity-75">Emergencia</span>
            <ShieldAlert size={14} className={statusFilter === 'emergencia' ? 'text-white' : 'text-rose-500'} />
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono-numbers tracking-tight ${statusFilter === 'emergencia' ? 'text-white' : 'text-rose-600'}`}>{emergencyCount}</div>
          <div className="text-[9.5px] sm:text-[10px] font-medium opacity-65 truncate mt-0.5">Frente 201 • COI 33</div>
        </button>
      </section>

      {/* 2. Unified Smart Filter Bar */}
      <section className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm mb-5 sm:mb-6 no-print space-y-3">
        {/* Row 1: Search + Contract Tabs + View Modes */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 sm:gap-3">
          {/* Universal Search with Quick Clear Button */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por frente (ej: 201), CIV (1005243), eje vial, barrio (Santa Ana) o contrato..."
              className="w-full bg-slate-50 border border-slate-250 hover:border-slate-300 focus:border-primary rounded-xl pl-9 pr-9 py-2 sm:py-2.5 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
                title="Borrar búsqueda"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Contract Segmented Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setContractFilter('all')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 text-[11px] sm:text-xs font-extrabold rounded-lg transition-all cursor-pointer text-center ${
                contractFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setContractFilter('malla_vial')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 text-[11px] sm:text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                contractFilter === 'malla_vial'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Route size={13} />
              <span>Malla Vial ({mvCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setContractFilter('espacio_publico')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 text-[11px] sm:text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                contractFilter === 'espacio_publico'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Footprints size={13} />
              <span>Espacio Público ({epCount})</span>
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex items-center justify-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 self-center w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex-1 sm:flex-initial p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold ${
                viewMode === 'grid' ? 'bg-white text-primary shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Vista en Cuadrícula"
            >
              <Layers size={14} />
              <span>Tarjetas</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`flex-1 sm:flex-initial p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold ${
                viewMode === 'map' ? 'bg-white text-primary shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Vista en Mapa"
            >
              <MapPin size={14} />
              <span>Mapa</span>
            </button>
          </div>
        </div>

        {/* Row 2: Status Chips, Sort, Period Selector, Actions */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          {/* Status & Daily Verification Chips (Horizontal touch scrollable on mobile) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 xl:pb-0 scrollbar-none w-full xl:w-auto">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1 shrink-0">
              <SlidersHorizontal size={11} /> Estado:
            </span>
            <button
              type="button"
              onClick={() => { setDailyReportFilter('all'); setStatusFilter('all'); }}
              className={`shrink-0 px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                dailyReportFilter === 'all' && statusFilter === 'all'
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setDailyReportFilter(prev => prev === 'reported' ? 'all' : 'reported')}
              className={`shrink-0 px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                dailyReportFilter === 'reported'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 size={12} />
              Al Día ({reportedCount})
            </button>
            <button
              type="button"
              onClick={() => setDailyReportFilter(prev => prev === 'pending' ? 'all' : 'pending')}
              className={`shrink-0 px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                dailyReportFilter === 'pending'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
              }`}
            >
              <Clock3 size={12} />
              Pendientes Hoy ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter(prev => prev === 'emergencia' ? 'all' : 'emergencia')}
              className={`shrink-0 px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'emergencia'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
              }`}
            >
              <ShieldAlert size={12} />
              Emergencias ({emergencyCount})
            </button>
          </div>

          {/* Sorting & Period Selection & Tool Actions */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
              <ArrowUpDown size={12} className="text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-[11px] font-bold text-slate-700 focus:outline-none cursor-pointer border-none py-0.5 pr-1"
              >
                <option value="frente_asc">Orden: N° Frente</option>
                <option value="progress_desc">Mayor Avance (%)</option>
                <option value="progress_asc">Menor Avance (%)</option>
                <option value="budget_desc">Mayor Presupuesto</option>
                <option value="photos_desc">Más Fotografías</option>
              </select>
            </div>

            {/* Period Selector (Month / Week) */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
              <Calendar size={12} className="text-primary" />
              {photoFilterMode === 'month' ? (
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-[11px] font-bold text-slate-800 focus:outline-none cursor-pointer border-none py-0.5 pr-1"
                >
                  <option value="all">Todos los Meses</option>
                  {availableMonths.map(m => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>
              ) : (
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                  className="bg-transparent text-[11px] font-bold text-slate-800 focus:outline-none cursor-pointer border-none py-0.5 pr-1"
                >
                  {availableWeeks.map(wNum => (
                    <option key={wNum} value={wNum}>Semana {wNum}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Quick Actions Menu */}
            <button
              type="button"
              onClick={() => setShowInactiveFrentes(prev => !prev)}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                showInactiveFrentes
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
              title="Mostrar u ocultar los frentes inactivos"
            >
              <Eye size={12} />
              <span className="hidden sm:inline">{showInactiveFrentes ? 'Inactivos visibles' : 'Sin inactivos'}</span>
              <span className="sm:hidden">Inactivos</span>
            </button>

            <button
              type="button"
              onClick={() => setIsManageActiveModalOpen(true)}
              className="bg-indigo-50 hover:bg-indigo-100 text-primary border border-indigo-200 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
              title="Configurar qué frentes están actualmente activos"
            >
              <span className="material-symbols-outlined text-[13px]">tune</span>
              <span>Gestionar</span>
            </button>

            <button
              type="button"
              onClick={() => setShowMonthlyCopyModal(true)}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-black px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer border border-amber-400 active:scale-95 shadow-2xs"
              title="Copiar datos consolidados del mes seleccionado"
            >
              <FileText size={13} />
              <span>Copiar Mes</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="bg-[#00236f] hover:bg-slate-800 text-white text-[11px] font-black px-3 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
            >
              <span className="material-symbols-outlined text-[13px]">print</span>
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        {/* Row 3: Active Filter Tags & Result Counter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mostrando:</span>
            <span className="bg-slate-100 text-slate-800 font-extrabold text-[11px] px-2 py-0.5 rounded font-mono-numbers">
              {filteredFrentes.length} de {frentes.length} frentes
            </span>

            {/* Active filter badges with 1-click removal */}
            {searchTerm && (
              <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                Búsqueda: "{searchTerm}"
                <button type="button" onClick={() => setSearchTerm('')} className="hover:text-primary cursor-pointer"><X size={10} /></button>
              </span>
            )}
            {contractFilter !== 'all' && (
              <span className="bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                {contractFilter === 'malla_vial' ? 'Malla Vial' : 'Espacio Público'}
                <button type="button" onClick={() => setContractFilter('all')} className="hover:text-blue-950 cursor-pointer"><X size={10} /></button>
              </span>
            )}
            {dailyReportFilter !== 'all' && (
              <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                {dailyReportFilter === 'pending' ? 'Pendientes Hoy' : 'Al Día'}
                <button type="button" onClick={() => setDailyReportFilter('all')} className="hover:text-amber-950 cursor-pointer"><X size={10} /></button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                {statusFilter === 'emergencia' ? 'Emergencias' : statusFilter}
                <button type="button" onClick={() => setStatusFilter('all')} className="hover:text-rose-950 cursor-pointer"><X size={10} /></button>
              </span>
            )}
            {sortBy !== 'frente_asc' && (
              <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                Ordenado
                <button type="button" onClick={() => setSortBy('frente_asc')} className="hover:text-slate-900 cursor-pointer"><X size={10} /></button>
              </span>
            )}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="text-[10px] font-extrabold text-rose-600 hover:text-rose-800 hover:underline ml-1 cursor-pointer"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {activeReport && (
            <div className="text-[10px] font-bold text-slate-500 font-mono">
              Semana {selectedWeek} • Corte: {activeReport.fecha_inicial_corte} al {activeReport.fecha_final_corte}
            </div>
          )}
        </div>
      </section>

      {/* Print-only Report Header */}
      <div className="hidden print-report-header mb-6 pb-4 border-b-2 border-slate-800">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">INCOLTA SAS</h1>
            <p className="text-xs text-slate-550 font-bold uppercase tracking-wider mt-0.5">INFORME DE SUPERVISIÓN Y CONTROL DE FRENTES DE OBRA</p>
          </div>
          <div className="text-right">
            <span className="bg-slate-100 border border-slate-250 text-slate-800 font-black px-3 py-1 rounded text-xs">
              SEMANA {selectedWeek}
            </span>
            {activeReport && (
              <p className="text-[10px] text-slate-500 font-mono font-bold mt-1.5">
                Corte: {activeReport.fecha_inicial_corte} al {activeReport.fecha_final_corte}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 3. Main Views Layout */}
      {viewMode === 'map' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-[550px] flex flex-col no-print">
          <MapView 
            frentes={filteredFrentes}
            isUnified={true}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {filteredFrentes.map((frente) => {
            const design = getDisenoForCiv(frente.civ);
            const soilImgUrl = design?.perfil_suelo_img_url || frente.perfil_suelo_img_url;
            const photos = getFrentePhotosForWeek(frente.id, selectedWeek);
            const allPhotosHistory = getFrentePhotos(frente.id);
            const { isActive, isMissingUpload, hasUploadToday } = getFrenteDailyUploadStatus(frente);
            
            return (
              <div 
                key={frente.id} 
                className={`rounded-xl p-6 shadow-premium flex flex-col justify-between transition-all duration-300 relative overflow-hidden print-card-break ${
                  isMissingUpload
                    ? 'bg-gradient-to-b from-amber-50/80 via-amber-50/30 to-white border-2 border-amber-500 shadow-md shadow-amber-300/30 ring-2 ring-amber-400/20'
                    : 'bg-white border border-slate-200 hover:border-primary/20'
                }`}
              >
                
                {/* Warning Banner at Top of Box if Daily Report is Missing */}
                {isMissingUpload && (
                  <div className="bg-amber-500 text-white font-extrabold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg mb-3 flex items-center justify-between shadow-xs no-print">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm animate-bounce">warning</span>
                      ALERTA DE CONTROL: FRENTE ACTIVO SIN REPORTE REGISTRADO HOY
                    </span>
                    <span className="bg-amber-700/60 px-2 py-0.5 rounded text-[8.5px] font-mono">
                      Reporte Faltante
                    </span>
                  </div>
                )}

                {/* Frente Header */}
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-headline font-black text-slate-900 text-lg leading-tight uppercase">
                          {frente.alias ? frente.alias : `FRENTE ${frente.frente}`} — CIV {frente.civ}
                        </h3>
                        {frente.prioridad === 'Emergencia' && (
                          <span className="bg-rose-600 text-white text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                            <ShieldAlert size={11} />
                            Emergencia (COI 33)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-550 font-bold leading-normal mt-1">
                        Ubicación: <span className="text-slate-700 font-semibold">{frente.eje}</span>
                        {frente.barrio && (
                          <span className="ml-2 text-slate-500 font-normal">
                            • Sector: <strong className="text-slate-700">{frente.barrio}</strong>
                          </span>
                        )}
                        {frente.tipoIntervencion && (
                          <span className="ml-2 text-slate-500 font-normal">
                            • Tipo: <strong className="text-slate-700">{frente.tipoIntervencion}</strong>
                          </span>
                        )}
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
                        {frente.projectName?.toUpperCase() || 'MALLA VIAL'}
                      </span>

                      {/* Active Frente Toggle Button */}
                      <button
                        type="button"
                        onClick={() => toggleFrenteActive(frente.id)}
                        className={`no-print px-2.5 py-1 rounded-md text-[9.5px] font-black uppercase border transition-all cursor-pointer flex items-center gap-1 shadow-2xs ${
                          isActive 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-250 hover:bg-emerald-100' 
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Haz clic para definir si este frente está activo o inactivo"
                      >
                        <span className="material-symbols-outlined text-[13px]">{isActive ? 'toggle_on' : 'toggle_off'}</span>
                        {isActive ? 'Frente Activo' : 'Frente Inactivo'}
                      </button>
                    </div>
                  </div>

                  <hr className="border-slate-100 mb-5" />

                  {/* Side-by-Side Cards Grid (mockup style) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    {/* Left Card: Ubicación Georreferenciada */}
                    <div className="border border-slate-200 rounded-xl p-4 flex flex-col bg-white">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 text-center">
                        UBICACIÓN GEORREFERENCIADA
                      </h4>
                      
                      {/* Map Container */}
                      <MiniFrenteMap lat={frente.latitude} lng={frente.longitude} frenteId={frente.id} />
                      
                      {/* Coordenadas Footer */}
                      <div className="text-[10px] font-black text-slate-700 text-center mt-3 uppercase tracking-wider font-mono">
                        COORDENADAS: {parseFloat(frente.latitude || 0).toFixed(5)}, {parseFloat(frente.longitude || 0).toFixed(5)}
                      </div>
                    </div>

                    {/* Right Card: Perfil de Estructura del Suelo */}
                    <div className="border border-slate-200 rounded-xl p-4 flex flex-col bg-white">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 text-center">
                        PERFIL DE ESTRUCTURA DEL SUELO
                      </h4>
                      
                      {/* Soil Image / Dynamic Layer Table Container */}
                      {soilImgUrl ? (
                        <div className="w-full h-36 rounded-lg overflow-hidden border border-slate-150 relative bg-slate-50 group flex items-center justify-center">
                          <img 
                            src={soilImgUrl} 
                            alt="Perfil de Estructura del Suelo" 
                            className="w-full h-full object-contain group-hover:scale-102 transition-transform p-1" 
                          />
                          <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 no-print">
                            <button
                              onClick={() => {
                                setLightboxPhotos([{ id: 'design_soil', url: soilImgUrl, caption: 'Diseño de Estructura de Suelo Aprobado', semana: 'Diseño', date: 'Plano Contractual' }]);
                                setLightboxIndex(0);
                                setSelectedLightboxWeek('all');
                              }}
                              className="bg-white/95 text-slate-800 text-[9px] font-black px-2.5 py-1.5 rounded-md shadow-sm border border-slate-200 cursor-pointer hover:bg-white transition-all active:scale-95"
                            >
                              Ampliar Plano
                            </button>
                          </div>
                        </div>
                      ) : design ? (
                        <div className="w-full h-36 rounded-lg border border-slate-200 overflow-y-auto bg-white scrollbar-thin">
                          <table className="w-full text-[8px] text-slate-750 border-collapse leading-tight">
                            <thead>
                              <tr className="bg-[#00236f] text-white font-bold sticky top-0 z-10">
                                <th className="py-1 px-1.5 text-left border-r border-[#00236f]/10">Material</th>
                                <th className="py-1 px-1 text-center border-r border-[#00236f]/10">Espesor (cm)</th>
                                <th className="py-1 px-1 text-center border-r border-[#00236f]/10">Especif. IDU</th>
                                <th className="py-1 px-1 text-center">Módulo (psi)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {design.paquete_estructural_capas?.map((layer, idx) => (
                                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                                  <td className="py-1 px-1.5 font-semibold text-slate-700 truncate max-w-[110px]" title={layer.nombre}>
                                    {layer.nombre}
                                  </td>
                                  <td className="py-1 px-1 text-center">
                                    {layer.espesor_cm > 0 ? (
                                      <span className={`inline-block px-1 py-0.5 rounded text-[7px] font-extrabold min-w-[16px] ${getLayerColor(layer.tipo_material)}`}>
                                        {layer.espesor_cm}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">-</span>
                                    )}
                                  </td>
                                  <td className="py-1 px-1 text-center font-mono font-bold text-slate-450">
                                    {layer.especificacion_idu || '-'}
                                  </td>
                                  <td className="py-1 px-1 text-center font-mono font-semibold text-slate-500">
                                    {layer.modulo_psi ? layer.modulo_psi.toLocaleString() : '-'}
                                  </td>
                                </tr>
                              ))}
                              {design.datos_geotecnicos?.modulo_resiliente_saturado_psi && (
                                <tr className="bg-amber-50/30 border-b border-slate-150 font-bold">
                                  <td className="py-1 px-1.5 text-slate-800">Subrasante</td>
                                  <td className="py-1 px-1 text-center">
                                    <span className="inline-block px-1 py-0.5 rounded text-[7px] min-w-[16px] bg-amber-700 text-white">
                                      -
                                    </span>
                                  </td>
                                  <td className="py-1 px-1 text-center text-slate-400 font-mono">-</td>
                                  <td className="py-1 px-1 text-center font-mono text-amber-800">
                                    {design.datos_geotecnicos.modulo_resiliente_saturado_psi.toLocaleString()}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="w-full h-36 rounded-lg border border-slate-200 border-dashed bg-slate-50 flex items-center justify-center text-[10px] text-slate-400 italic text-center px-4">
                          Sin plano de estructura de suelo vinculado.
                        </div>
                      )}

                      {/* Footer Text */}
                      <div className="text-[10px] font-black text-slate-700 text-center mt-3 uppercase tracking-wider">
                        ESTRUCTURA DE PAVIMENTO APROBADA
                      </div>
                    </div>
                  </div>

                  {/* Physical Progress indicator */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between items-center text-[10.5px] font-extrabold text-slate-755">
                      <span>Progreso Físico Real en Semana {selectedWeek}</span>
                      <span className="text-emerald-700 font-mono-numbers">{frente.progress}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="gradient-progress h-full rounded-full transition-all duration-500" 
                        style={{ width: `${frente.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Latest visual photos row (Grouped by Month or Filtered by Week) */}
                <div className="mt-4 border-t border-slate-100 pt-4">
                  {photoFilterMode === 'month' ? (
                    (() => {
                      const allMonthGroups = getFrentePhotosGroupedByMonth(frente.id);
                      const displayGroups = selectedMonth === 'all' 
                        ? allMonthGroups 
                        : allMonthGroups.filter(g => g.key === selectedMonth);
                      
                      const totalPhotosCount = displayGroups.reduce((acc, g) => acc + g.photos.length, 0);

                      if (totalPhotosCount === 0) {
                        return (
                          <div className="text-[9.5px] text-slate-455 italic bg-slate-50/50 p-2.5 rounded-lg border border-slate-150 border-dashed text-center">
                            {selectedMonth === 'all' 
                              ? 'No hay fotos de campo registradas en este frente.' 
                              : `No hay fotos de campo registradas en ${availableMonths.find(m => m.key === selectedMonth)?.label || 'el mes seleccionado'}.`
                            }
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1">
                            <span className="flex items-center gap-1 text-primary">
                              <Calendar size={12} />
                              Fotos Agrupadas por Mes ({totalPhotosCount} en total, Orden Cronológico)
                            </span>
                            <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded font-black">
                              {selectedMonth === 'all' ? 'Todos los Meses' : availableMonths.find(m => m.key === selectedMonth)?.label}
                            </span>
                          </div>

                          {displayGroups.map(group => (
                            <div key={group.key} className="space-y-1.5 bg-slate-50/40 p-2.5 rounded-lg border border-slate-150/70">
                              <div className="flex justify-between items-center text-[9.5px] font-black text-slate-700 uppercase tracking-wide">
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
                                  {group.label}
                                </span>
                                <span className="text-[8.5px] text-slate-400 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                  {group.photos.length} {group.photos.length === 1 ? 'foto' : 'fotos'}
                                </span>
                              </div>

                              <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-300">
                                {group.photos.map((photo) => {
                                  const allPhotosHist = getFrentePhotos(frente.id);
                                  const photoIndexInAll = allPhotosHist.findIndex(p => p.id === photo.id);
                                  return (
                                    <div 
                                      key={photo.id}
                                      onClick={() => handleOpenLightbox(allPhotosHist, photoIndexInAll >= 0 ? photoIndexInAll : 0)}
                                      className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 shadow-2xs shrink-0 cursor-pointer hover:border-primary transition-all relative group bg-slate-900"
                                    >
                                      <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5 text-white no-print">
                                        <Eye size={12} />
                                        <span className="text-[7.5px] font-black uppercase tracking-wider">Ver</span>
                                      </div>
                                      <div className="absolute bottom-0 inset-x-0 bg-slate-900/75 text-[7px] text-white text-center font-bold font-mono py-0.5">
                                        Sem {photo.semana}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  ) : (
                    /* Week view filter */
                    photos.length > 0 ? (
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                          <span>Avances Visuales Registrados (Semana {selectedWeek})</span>
                          <span>({photos.length} fotos)</span>
                        </div>
                        <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-300">
                          {photos.map((photo) => (
                            <div 
                              key={photo.id}
                              onClick={() => handleOpenLightbox(allPhotosHistory, allPhotosHistory.findIndex(p => p.id === photo.id))}
                              className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 shadow-2xs shrink-0 cursor-pointer hover:border-primary transition-all relative group bg-slate-900"
                            >
                              <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5 text-white no-print">
                                <Eye size={12} />
                                <span className="text-[7.5px] font-black uppercase tracking-wider">Ver Foto</span>
                              </div>
                              <div className="absolute bottom-0 inset-x-0 bg-slate-900/65 text-[7.5px] text-white text-center font-bold font-mono">
                                Sem {photo.semana}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[9.5px] text-slate-450 italic bg-slate-50/50 p-2.5 rounded-lg border border-slate-150 border-dashed text-center">
                        No hay fotos de campo registradas en la Semana {selectedWeek}.
                      </div>
                    )
                  )}
                </div>

                {/* Program Link tag and Daily Upload Status at the bottom */}
                <div className="mt-4 border-t border-slate-100 pt-3 flex justify-between items-center text-[10.5px] no-print flex-wrap gap-2">
                  <button
                    onClick={() => onSelectProject(frente.projectId)}
                    className="text-primary hover:underline font-extrabold flex items-center gap-0.5 border-none bg-transparent cursor-pointer"
                  >
                    <span>Ver Detalles Contractuales ({frente.contractNo})</span>
                    <ArrowRight size={11} />
                  </button>

                  <div className="flex items-center gap-2">
                    {isMissingUpload ? (
                      <span className="px-2.5 py-1 rounded-full font-black text-[9px] uppercase border bg-amber-500 text-white border-amber-600 shadow-xs flex items-center gap-1 animate-pulse">
                        <span className="material-symbols-outlined text-[12px]">schedule</span>
                        REPORTE PENDIENTE HOY
                      </span>
                    ) : hasUploadToday ? (
                      <span className="px-2.5 py-1 rounded-full font-black text-[9px] uppercase border bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">check_circle</span>
                        REPORTE AL DÍA HOY
                      </span>
                    ) : null}

                    <span className={`px-2 py-0.5 rounded-full font-black text-[9px] uppercase border ${
                      frente.status === 'critico' ? 'bg-red-50 text-red-700 border-red-100' :
                      frente.status === 'alerta' ? 'bg-amber-50 text-amber-800 border-amber-100' :
                      'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {frente.status || 'Al día'}
                    </span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 4. LIGHTBOX Carousel Modal */}
      {lightboxPhotos && lightboxPhotos.length > 0 && activePhoto && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center p-4 select-none no-print">
          {/* Top Info Header */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center text-white z-10">
            <div className="space-y-1">
              <h4 className="font-extrabold font-headline text-sm text-slate-100">
                Visualizador del Hub de Frentes
              </h4>
              <p className="text-[10px] text-slate-450 font-bold font-mono">
                {getPhotoMonthYear(activePhoto).label} — Semana {activePhoto.semana} — Período: {activePhoto.fechaInicial || 'N/A'} al {activePhoto.fechaCorte || 'N/A'} — Registrada: {activePhoto.date}
              </p>
            </div>

            {/* Navigation & Filter Dropdowns inside Lightbox */}
            <div className="flex items-center gap-3">
              {activePhoto.id !== 'design_soil' && (
                <>
                  {/* Month Filter Selector in Lightbox */}
                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Mes:</span>
                    <select
                      value={selectedLightboxMonth}
                      onChange={(e) => handleMonthChange(e.target.value)}
                      className="bg-transparent text-white text-xs font-black focus:outline-none cursor-pointer border-none py-0.5 pr-2"
                    >
                      <option value="all" className="bg-slate-900 text-white">Todos los Meses</option>
                      {getLightboxMonths().map(m => (
                        <option key={m.key} value={m.key} className="bg-slate-900 text-white">{m.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Weekly Navigation Dropdown inside Lightbox */}
                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Semana:</span>
                    <select
                      value={selectedLightboxWeek}
                      onChange={(e) => handleWeekChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                      className="bg-transparent text-white text-xs font-black focus:outline-none cursor-pointer border-none py-0.5 pr-2"
                    >
                      <option value="all" className="bg-slate-900 text-white">Todas las semanas</option>
                      {getLightboxWeeks().map(wNum => (
                        <option key={wNum} value={wNum} className="bg-slate-900 text-white">Semana {wNum}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <button 
                onClick={() => setLightboxPhotos(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-all text-slate-300 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Left Arrow */}
          {visiblePhotos.length > 1 && (
            <button 
              onClick={handlePrevPhoto}
              className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-slate-900/60 hover:bg-slate-850 text-white rounded-full transition-all border border-slate-800 shadow cursor-pointer z-10"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          {/* Right Arrow */}
          {visiblePhotos.length > 1 && (
            <button 
              onClick={handleNextPhoto}
              className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-slate-900/60 hover:bg-slate-850 text-white rounded-full transition-all border border-slate-800 shadow cursor-pointer z-10"
            >
              <ChevronRight size={24} />
            </button>
          )}

          {/* Large Image container */}
          <div className="max-w-4xl max-h-[70vh] flex flex-col items-center justify-center p-2 mt-8">
            <img 
              src={activePhoto.url} 
              alt="Ampliada" 
              className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-2xl border border-slate-800"
            />
          </div>

          {/* Caption Overlay */}
          <div className="mt-6 max-w-2xl text-center px-4 space-y-2">
            <p className="text-white text-xs font-semibold leading-relaxed">
              {activePhoto.caption || <span className="text-slate-550 italic">Sin descripción registrada</span>}
            </p>
            {activePhoto.id !== 'design_soil' && (
              <div className="flex justify-center items-center gap-2 text-[10px] text-slate-400 font-bold font-mono">
                <span>Foto {lightboxIndex + 1} de {visiblePhotos.length}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Manage Active Frentes Configuration Modal */}
      {isManageActiveModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">tune</span>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wide">Configuración de Frentes Activos</h3>
                  <p className="text-[10px] text-slate-500 font-semibold">Define cuáles frentes requieren reporte diario obligatorio</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsManageActiveModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg border-none bg-transparent cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-2.5 scrollbar-thin">
              {frentes.map(f => {
                const isAct = activeFrentesOverrides[f.id] !== undefined 
                  ? activeFrentesOverrides[f.id] 
                  : (f.status !== 'Cerrado' && f.status !== 'Inactivo');
                return (
                  <div key={f.id} className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    isAct ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200 opacity-75'
                  }`}>
                    <div>
                      <span className="text-xs font-black text-slate-800">Frente {f.frente} • CIV {f.civ}</span>
                      <p className="text-[10px] text-slate-500 font-semibold truncate max-w-[280px]">{f.eje}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleFrenteActive(f.id)}
                      className={`px-3 py-1.5 rounded-lg font-black text-xs border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isAct 
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs' 
                          : 'bg-slate-200 text-slate-700 border-slate-300'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">{isAct ? 'toggle_on' : 'toggle_off'}</span>
                      {isAct ? 'ACTIVO' : 'INACTIVO'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsManageActiveModalOpen(false)}
                className="bg-primary text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-md cursor-pointer"
              >
                Guardar y Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Monthly Copy Modal on Landing Page */}
      {showMonthlyCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in no-print">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-950 via-[#00236f] to-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Copiar Datos del Mes para Informe Mensual
                  </h3>
                  <p className="text-xs text-slate-300">
                    Capas de pavimento, hitos semanales, bitácoras y fotos listos para tu informe o IA.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMonthlyCopyModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5">
              
              {/* Month Selector Pills */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  1. Selecciona el Mes a Copiar:
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableMonthsList.map(m => (
                    <button
                      key={m.key}
                      onClick={() => setModalSelectedMonth(m.key)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        modalSelectedMonth === m.key
                          ? 'bg-amber-400 text-slate-950 shadow-md font-black ring-2 ring-amber-400/30 scale-105'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Calendar size={14} />
                      <span>{m.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        modalSelectedMonth === m.key ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-200 text-slate-600'
                      }`}>
                        S{m.weekNumbers.join(',')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Alcance:</span>
                  <div className="flex gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                    <button
                      onClick={() => setModalContractFilter('all')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                        modalContractFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setModalContractFilter('malla_vial')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                        modalContractFilter === 'malla_vial' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Malla Vial
                    </button>
                    <button
                      onClick={() => setModalContractFilter('espacio_publico')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                        modalContractFilter === 'espacio_publico' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Espacio Público
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modalOnlyWithActivity}
                    onChange={(e) => setModalOnlyWithActivity(e.target.checked)}
                    className="rounded accent-amber-500 cursor-pointer"
                  />
                  <span>Solo frentes con registros</span>
                </label>
              </div>

              {/* 4 Action Cards */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  2. Copia al Portapapeles (1 Clic):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Card 1: Texto Limpio */}
                  <button
                    onClick={() => handleModalCopy(
                      generateMonthlyFullOfficialReport(weeklyReports, projects, modalSelectedMonth, modalContractFilter, modalOnlyWithActivity),
                      'modal_clean'
                    )}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      modalCopiedKey === 'modal_clean'
                        ? 'bg-green-600 text-white border-green-600 shadow-md scale-[1.02]'
                        : 'bg-gradient-to-br from-primary to-[#00174a] text-white border-primary hover:shadow-md'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-white/20">
                          Word / Docs
                        </span>
                        {modalCopiedKey === 'modal_clean' ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold bg-green-800 px-2 py-0.5 rounded-full">
                            <Check size={12} /> ¡Copiado!
                          </span>
                        ) : (
                          <Copy size={15} className="text-white/80" />
                        )}
                      </div>
                      <h4 className="font-black text-xs text-white mb-0.5 flex items-center gap-1.5">
                        <FileText size={14} />
                        <span>Copiar Datos Consolidados</span>
                      </h4>
                      <p className="text-[10px] text-slate-200 leading-tight">
                        Capas de pavimento, hitos semanales, bitácoras y fotos frente por frente.
                      </p>
                    </div>
                  </button>

                  {/* Card 2: IA Prompt */}
                  <button
                    onClick={() => handleModalCopy(
                      generateMonthlyAIPrompt(weeklyReports, projects, modalSelectedMonth, modalContractFilter, modalOnlyWithActivity),
                      'modal_ai'
                    )}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      modalCopiedKey === 'modal_ai'
                        ? 'bg-green-600 text-white border-green-600 shadow-md scale-[1.02]'
                        : 'bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 border-amber-400 hover:shadow-md'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-black/20 text-slate-950">
                          -70% Tokens
                        </span>
                        {modalCopiedKey === 'modal_ai' ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold bg-green-800 text-white px-2 py-0.5 rounded-full">
                            <Check size={12} /> ¡Copiado!
                          </span>
                        ) : (
                          <Sparkles size={15} className="text-slate-950" />
                        )}
                      </div>
                      <h4 className="font-black text-xs text-slate-950 mb-0.5 flex items-center gap-1.5">
                        <Sparkles size={14} />
                        <span>Generar Prompt para IA</span>
                      </h4>
                      <p className="text-[10px] text-slate-900 leading-tight font-medium">
                        Instrucción ultra-compacta para redactar el informe en ChatGPT / Claude.
                      </p>
                    </div>
                  </button>

                  {/* Card 3: Excel TSV */}
                  <button
                    onClick={() => handleModalCopy(
                      generateMonthlyExcelTSV(weeklyReports, projects, modalSelectedMonth, modalContractFilter, modalOnlyWithActivity),
                      'modal_excel'
                    )}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      modalCopiedKey === 'modal_excel'
                        ? 'bg-green-600 text-white border-green-600 shadow-md scale-[1.02]'
                        : 'bg-gradient-to-br from-emerald-700 to-teal-900 text-white border-emerald-700 hover:shadow-md'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-white/20">
                          Excel
                        </span>
                        {modalCopiedKey === 'modal_excel' ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold bg-green-800 px-2 py-0.5 rounded-full">
                            <Check size={12} /> ¡Copiado!
                          </span>
                        ) : (
                          <Table size={15} className="text-white/80" />
                        )}
                      </div>
                      <h4 className="font-black text-xs text-white mb-0.5 flex items-center gap-1.5">
                        <Table size={14} />
                        <span>Exportar Tabla Excel (TSV)</span>
                      </h4>
                      <p className="text-[10px] text-emerald-100 leading-tight">
                        Columnas tabuladas para pegar directamente en celdas de Excel.
                      </p>
                    </div>
                  </button>

                  {/* Card 4: Fotos */}
                  <button
                    onClick={() => handleModalCopy(
                      generateMonthlyPhotosTSV(weeklyReports, modalSelectedMonth, modalContractFilter),
                      'modal_photos'
                    )}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      modalCopiedKey === 'modal_photos'
                        ? 'bg-green-600 text-white border-green-600 shadow-md scale-[1.02]'
                        : 'bg-gradient-to-br from-purple-700 to-indigo-900 text-white border-purple-700 hover:shadow-md'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-white/20">
                          Fotos Supabase
                        </span>
                        {modalCopiedKey === 'modal_photos' ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold bg-green-800 px-2 py-0.5 rounded-full">
                            <Check size={12} /> ¡Copiado!
                          </span>
                        ) : (
                          <ImageIcon size={15} className="text-white/80" />
                        )}
                      </div>
                      <h4 className="font-black text-xs text-white mb-0.5 flex items-center gap-1.5">
                        <ImageIcon size={14} />
                        <span>Exportar Registro Fotográfico</span>
                      </h4>
                      <p className="text-[10px] text-purple-100 leading-tight">
                        Listado con fechas, anotaciones y enlaces públicos de fotos.
                      </p>
                    </div>
                  </button>

                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              {onNavigateToReports ? (
                <button
                  onClick={() => {
                    setShowMonthlyCopyModal(false);
                    onNavigateToReports();
                  }}
                  className="text-xs font-bold text-primary hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <Eye size={14} />
                  Ver Compilador Completo con Previsualización ↗
                </button>
              ) : <div />}
              
              <button
                onClick={() => setShowMonthlyCopyModal(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Inline styles for Pavement patterns and Keyframes */}
      <style dangerouslySetInnerHTML={{__html: `
        .pattern-concrete {
          background-image: radial-gradient(rgba(0, 0, 0, 0.15) 1px, transparent 0);
          background-size: 6px 6px;
        }
        .pattern-asphalt {
          background-image: radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 0);
          background-size: 4px 4px;
        }
        .pattern-sand {
          background-image: radial-gradient(rgba(217, 119, 6, 0.25) 1px, transparent 0);
          background-size: 5px 5px;
        }
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan {
          animation: scan 4.5s linear infinite;
        }

        /* PRINT MEDIA STYLES FOR PDF GENERATION */
        @media print {
          body, .flex-1, .grid-bg {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            color: #0f172a !important;
          }
          .p-gutter {
            padding: 0 !important;
          }
          aside, .sidebar, header, .no-print, button, select, input {
            display: none !important;
          }
          .print-report-header {
            display: block !important;
          }
          .grid {
            grid-template-columns: 1fr !important;
            gap: 0 !important;
          }
          .print-card-break {
            border: 2px solid #e2e8f0 !important;
            box-shadow: none !important;
            page-break-after: always;
            margin-bottom: 3rem !important;
            padding: 2rem !important;
          }
          /* Keep cards side-by-side inside print */
          .grid-cols-2 {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 1.5rem !important;
          }
          .w-full.h-36 {
            height: 160px !important;
          }
        }
      `}} />

    </div>
  );
}
