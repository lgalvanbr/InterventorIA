import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, SlidersHorizontal, Lock, Plus, Calendar, MapPin, 
  Activity, ChevronLeft, ChevronRight, X, Eye, Image as ImageIcon, ArrowRight, Layers
} from 'lucide-react';
import { getDisenoForCiv } from '../data/frentesDisenos';
import MapView from './MapView';
import L from 'leaflet';

// Import Leaflet icons fixes for Vite bundling
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadowUrl from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});


// Mini Interactive Map component for each frente card
function MiniFrenteMap({ lat, lng, frenteId }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !lat || !lng) return;
    if (mapRef.current) return; // already initialized

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (isNaN(parsedLat) || isNaN(parsedLng)) return;

    const map = L.map(containerRef.current, {
      center: [parsedLat, parsedLng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      touchZoom: false,
      keyboard: false
    });

    mapRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20
    }).addTo(map);

    L.marker([parsedLat, parsedLng], { icon: DefaultIcon }).addTo(map);

    // Fix grey screen issue by invalidating map sizes after DOM rendering is fully calculated
    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [lat, lng]);

  if (!lat || !lng) {
    return (
      <div className="w-full h-36 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-[10px] text-slate-400 italic">
        Sin georreferenciación asignada
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="w-full h-36 rounded-lg border border-slate-200 overflow-hidden shadow-2xs bg-slate-50 relative z-0" 
    />
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

export default function Dashboard({ projects = [], onSelectProject, onAddProject, isContractorMode, weeklyReports = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'map'
  
  // Extract all unique weeks available from weeklyReports
  const availableWeeks = [...new Set((weeklyReports || []).map(r => r.numero_semana))].sort((a, b) => b - a);
  
  // Selected global week state
  const [selectedWeek, setSelectedWeek] = useState(availableWeeks[0] || 29);

  // Month Filtering & Grouping State
  const [photoFilterMode, setPhotoFilterMode] = useState('month'); // 'month' or 'week'
  const [selectedMonth, setSelectedMonth] = useState('all'); // 'all' or month key like '2026-07'
  
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
    } catch (e) {
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

  // Extract photos for a given frente across all weekly reports (for the lightbox history)
  const getFrentePhotos = (frenteId) => {
    const photos = [];
    (weeklyReports || []).forEach(report => {
      const reportFrente = report.frentes?.find(rf => rf.id === frenteId);
      if (reportFrente && reportFrente.fotos) {
        reportFrente.fotos.forEach(photo => {
          photos.push({
            ...photo,
            semana: report.numero_semana,
            fechaCorte: report.fecha_final_corte,
            fechaInicial: report.fecha_inicial_corte
          });
        });
      }
    });
    return photos.sort((a, b) => b.semana - a.semana || new Date(b.date) - new Date(a.date));
  };

  // Group photos of a frente by month
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
    // Sort groups descending by month key
    groups.sort((a, b) => b.key.localeCompare(a.key));
    return groups;
  };

  // Get photos specifically uploaded during the selected week
  const getFrentePhotosForWeek = (frenteId, weekNum) => {
    const photos = [];
    const report = (weeklyReports || []).find(r => r.numero_semana === Number(weekNum));
    const reportFrente = report?.frentes?.find(rf => rf.id === frenteId);
    if (reportFrente && reportFrente.fotos) {
      reportFrente.fotos.forEach(photo => {
        photos.push({
          ...photo,
          semana: report.numero_semana,
          fechaCorte: report.fecha_final_corte,
          fechaInicial: report.fecha_inicial_corte
        });
      });
    }
    return photos;
  };

  // Filter frentes by text search
  const filteredFrentes = frentes.filter(f => {
    const searchLower = searchTerm.toLowerCase();
    const frenteVal = String(f.frente || '').toLowerCase();
    const ejeVal = String(f.eje || '').toLowerCase();
    const civVal = String(f.civ || '');
    const projNameVal = String(f.projectName || '').toLowerCase();
    
    return (
      frenteVal.includes(searchLower) ||
      ejeVal.includes(searchLower) ||
      civVal.includes(searchLower) ||
      projNameVal.includes(searchLower)
    );
  });

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
    <div className="flex-1 p-gutter max-w-container-max mx-auto grid-bg min-h-screen pb-16 relative">
      
      {/* 1. Header Hero Banner with INCOLTA SAS and Radar Telemetry */}
      <section className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-8 mb-8 shadow-md no-print">
        <div className="relative z-10 max-w-2xl">
          <span className="bg-indigo-500/20 text-indigo-300 font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-indigo-500/30 inline-block mb-3.5">
            {isContractorMode ? 'INCOLTA SAS • PORTAL DEL CONTRATISTA' : 'INCOLTA SAS • CONSOLA DE AUDITORÍA'}
          </span>
          <h1 className="text-3xl md:text-4xl font-black font-headline tracking-tight text-white mb-2 leading-tight">
            INCOLTA <span className="text-cyan-400">SAS</span> — Control de Frentes
          </h1>
          <p className="text-slate-350 text-xs md:text-sm leading-relaxed mb-6 font-medium max-w-xl">
            Plataforma didáctica de interventoría y control. Navega por semanas de avance físico, visualiza las estructuras de suelo certificadas y consulta registros fotográficos de campo.
          </p>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('grid')}
              className={`text-xs font-bold px-4 py-2 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'grid' 
                  ? 'bg-white text-slate-900 border-white shadow-sm' 
                  : 'bg-white/10 text-white border-white/10 hover:bg-white/15'
              }`}
            >
              <Layers size={14} />
              Ver Cuadrícula de Frentes
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`text-xs font-bold px-4 py-2 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'map' 
                  ? 'bg-white text-slate-900 border-white shadow-sm' 
                  : 'bg-white/10 text-white border-white/10 hover:bg-white/15'
              }`}
            >
              <MapPin size={14} />
              Ver Mapa Unificado
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

      {/* 2. Search, Month/Week Filter & Print Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-center gap-3 mb-6 no-print">
        
        {/* Search Input */}
        <div className="flex-1 w-full relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por frente, eje vial, número de CIV o contrato..."
            className="w-full bg-slate-50 border border-slate-250 rounded-lg pl-9 pr-4 py-2 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter Mode Selector (Por Mes vs Por Semana) */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0 w-full md:w-auto justify-center">
          <button
            onClick={() => setPhotoFilterMode('month')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              photoFilterMode === 'month' ? 'bg-white text-primary shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar size={13} className="text-primary" />
            Fotos por Mes
          </button>
          <button
            onClick={() => setPhotoFilterMode('week')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              photoFilterMode === 'week' ? 'bg-white text-primary shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon size={13} className="text-slate-500" />
            Fotos por Semana
          </button>
        </div>

        {/* Global Month Selector */}
        {photoFilterMode === 'month' ? (
          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto bg-indigo-50/60 border border-indigo-150 rounded-lg px-3 py-1.5 justify-between md:justify-start">
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-primary" />
              <span className="text-[10px] text-primary font-extrabold uppercase tracking-wider">Mes:</span>
            </div>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-slate-900 text-xs font-black focus:outline-none cursor-pointer border-none py-0.5 pr-2"
            >
              <option value="all">Todos los Meses</option>
              {availableMonths.map(m => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>
        ) : (
          /* Global Week Selector */
          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 justify-between md:justify-start">
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-primary" />
              <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider">Semana:</span>
            </div>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              className="bg-transparent text-slate-900 text-xs font-black focus:outline-none cursor-pointer border-none py-0.5 pr-2"
            >
              {availableWeeks.map(wNum => (
                <option key={wNum} value={wNum}>Semana {wNum}</option>
              ))}
            </select>
          </div>
        )}

        {/* Dates Range Label */}
        {activeReport && (
          <div className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg shrink-0 w-full md:w-auto text-center font-mono">
            Período: {activeReport.fecha_inicial_corte} al {activeReport.fecha_final_corte}
          </div>
        )}

        {/* Print Report Button */}
        <button
          onClick={() => window.print()}
          className="bg-[#00236f] hover:bg-slate-800 text-white text-xs font-black px-4 py-2 rounded-lg transition-all active:scale-95 duration-100 flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0 w-full md:w-auto justify-center"
        >
          <span className="material-symbols-outlined text-sm font-bold">print</span>
          Imprimir Informe
        </button>

        <div className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg shrink-0 w-full md:w-auto text-center">
          Frentes: <strong className="text-slate-700 font-mono-numbers">{filteredFrentes.length}</strong> de <strong className="text-slate-700 font-mono-numbers">{frentes.length}</strong>
        </div>

      </div>

      {/* Print-only Report Header */}
      <div className="hidden print-report-header mb-6 pb-4 border-b-2 border-slate-800">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">INCOLTA SAS</h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">INFORME DE SUPERVISIÓN Y CONTROL DE FRENTES DE OBRA</p>
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
            
            return (
              <div 
                key={frente.id} 
                className="bg-white border border-slate-200 rounded-xl p-6 shadow-premium flex flex-col justify-between hover:border-primary/20 transition-all duration-300 relative overflow-hidden print-card-break"
              >
                
                {/* Frente Header */}
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-headline font-black text-slate-900 text-lg leading-tight uppercase">
                        FRENTE {frente.frente} — CIV {frente.civ}
                      </h3>
                      <p className="text-xs text-slate-550 font-bold leading-normal mt-1">
                        Ubicación: <span className="text-slate-700 font-semibold">{frente.eje}</span>
                      </p>
                    </div>
                    
                    <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
                      {frente.projectName?.toUpperCase() || 'MALLA VIAL'}
                    </span>
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
                          <div className="text-[9.5px] text-slate-450 italic bg-slate-50/50 p-2.5 rounded-lg border border-slate-150 border-dashed text-center">
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
                              Fotos Agrupadas por Mes ({totalPhotosCount} en total)
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
                          {photos.map((photo, pIdx) => (
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

                {/* Program Link tag at the bottom */}
                <div className="mt-4 border-t border-slate-100 pt-3 flex justify-between items-center text-[10.5px] no-print">
                  <button
                    onClick={() => onSelectProject(frente.projectId)}
                    className="text-primary hover:underline font-extrabold flex items-center gap-0.5 border-none bg-transparent cursor-pointer"
                  >
                    <span>Ver Detalles Contractuales ({frente.contractNo})</span>
                    <ArrowRight size={11} />
                  </button>
                  <span className={`px-2 py-0.5 rounded-full font-black text-[9px] uppercase border ${
                    frente.status === 'critico' ? 'bg-red-50 text-red-700 border-red-100' :
                    frente.status === 'alerta' ? 'bg-amber-50 text-amber-800 border-amber-100' :
                    'bg-emerald-50 text-emerald-800 border-emerald-100'
                  }`}>
                    Estado: {frente.status || 'Al día'}
                  </span>
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
          .grid-cols-1.md\\:grid-cols-2 {
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
