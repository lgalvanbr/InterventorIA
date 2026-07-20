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

    const map = L.map(containerRef.current, {
      center: [lat, lng],
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

    L.marker([lat, lng], { icon: DefaultIcon }).addTo(map);

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

export default function Dashboard({ projects = [], onSelectProject, onAddProject, isContractorMode, weeklyReports = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'map'
  
  // Lightbox State
  const [lightboxPhotos, setLightboxPhotos] = useState(null); // stores all photos for active frente
  const [lightboxIndex, setLightboxIndex] = useState(0);      // index inside visiblePhotos
  const [selectedLightboxWeek, setSelectedLightboxWeek] = useState('all'); // 'all' or week number

  // Compile all active frentes across all projects
  const frentes = projects.flatMap(proj => {
    return (proj.frentes || []).map(f => {
      // Find latest weekly report physical progress for this frente
      const compiledWeeklyReports = (weeklyReports || [])
        .filter(r => r.frentes?.some(rf => rf.id === f.id))
        .sort((a, b) => b.numero_semana - a.numero_semana);
      
      const latestReportFrente = compiledWeeklyReports[0]?.frentes?.find(rf => rf.id === f.id);
      const currentProgress = latestReportFrente ? latestReportFrente.progress : f.progress;
      const currentStatus = latestReportFrente ? latestReportFrente.status : f.status;

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

  // Extract photos for a given frente across all weekly reports
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
    // Sort by week descending, then by date descending
    return photos.sort((a, b) => b.semana - a.semana || new Date(b.date) - new Date(a.date));
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
    const clickedPhoto = photosList[photoIndex];
    setLightboxPhotos(photosList);
    setSelectedLightboxWeek(clickedPhoto.semana); // filter lightbox to the week of the clicked photo
    
    // Find index of clicked photo within that week's photos
    const weekPhotos = photosList.filter(p => p.semana === clickedPhoto.semana);
    const indexInWeek = weekPhotos.findIndex(p => p.id === clickedPhoto.id);
    setLightboxIndex(indexInWeek >= 0 ? indexInWeek : 0);
  };

  // Get active photo list based on week filter
  const getVisiblePhotos = () => {
    if (!lightboxPhotos) return [];
    if (selectedLightboxWeek === 'all') return lightboxPhotos;
    return lightboxPhotos.filter(p => p.semana === Number(selectedLightboxWeek));
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

  // Unique weeks list with photos for active lightbox
  const getLightboxWeeks = () => {
    if (!lightboxPhotos) return [];
    return [...new Set(lightboxPhotos.map(p => p.semana))].sort((a, b) => b - a);
  };

  return (
    <div className="flex-1 p-gutter max-w-container-max mx-auto grid-bg min-h-screen pb-16 relative">
      
      {/* 1. Header Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-8 mb-8 shadow-md">
        <div className="relative z-10 max-w-3xl">
          <span className="bg-indigo-500/20 text-indigo-300 font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-indigo-500/30 inline-block mb-3.5">
            {isContractorMode ? 'CONSOLA DE CONSULTA DEL CONTRATISTA' : 'CONSOLA DE CONTROL GENERAL'}
          </span>
          <h1 className="text-3xl md:text-4xl font-black font-headline tracking-tight text-white mb-2 leading-tight">
            Control Visual de <span className="text-cyan-400">Frentes de Obra</span>
          </h1>
          <p className="text-slate-350 text-xs md:text-sm leading-relaxed mb-6 font-medium max-w-2xl">
            Tablero interactivo y didáctico consolidado de tramos viales. Consulta avances de obra, planos de suelo certificados y la bitácora fotográfica recolectada en campo por la interventoría.
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
        
        {/* Subtle decorative background graphic */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 pointer-events-none hidden md:block">
          <svg className="w-full h-full text-indigo-400" viewBox="0 0 100 100" fill="currentColor">
            <path d="M50 0 L100 25 L100 75 L50 100 L0 75 L0 25 Z" />
          </svg>
        </div>
      </section>

      {/* 2. Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
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
        <div className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg shrink-0 w-full md:w-auto text-center">
          Mostrando <strong className="text-slate-700 font-mono-numbers">{filteredFrentes.length}</strong> de <strong className="text-slate-700 font-mono-numbers">{frentes.length}</strong> frentes totales
        </div>
      </div>

      {/* 3. Main Views Layout */}
      {viewMode === 'map' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-[550px] flex flex-col">
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
            const photos = getFrentePhotos(frente.id);
            
            return (
              <div 
                key={frente.id} 
                className="bg-white border border-slate-200 rounded-xl p-6 shadow-premium flex flex-col justify-between hover:border-primary/20 transition-all duration-300 relative overflow-hidden"
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
                      <MiniFrenteMap lat={frente.lat} lng={frente.lng} frenteId={frente.id} />
                      
                      {/* Coordenadas Footer */}
                      <div className="text-[10px] font-black text-slate-700 text-center mt-3 uppercase tracking-wider font-mono">
                        COORDENADAS: {frente.lat?.toFixed(5) || '0.00000'}, {frente.lng?.toFixed(5) || '0.00000'}
                      </div>
                    </div>

                    {/* Right Card: Perfil de Estructura del Suelo */}
                    <div className="border border-slate-200 rounded-xl p-4 flex flex-col bg-white">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 text-center">
                        PERFIL DE ESTRUCTURA DEL SUELO
                      </h4>
                      
                      {/* Soil Image Container */}
                      {soilImgUrl ? (
                        <div className="w-full h-36 rounded-lg overflow-hidden border border-slate-150 relative bg-slate-50 group flex items-center justify-center">
                          <img 
                            src={soilImgUrl} 
                            alt="Perfil de Estructura del Suelo" 
                            className="w-full h-full object-contain group-hover:scale-102 transition-transform p-1" 
                          />
                          <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
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
                    <div className="flex justify-between items-center text-[10.5px] font-extrabold text-slate-750">
                      <span>Progreso Físico Real</span>
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

                {/* Latest weekly photos row */}
                <div className="mt-4 border-t border-slate-100 pt-4">
                  {photos.length > 0 ? (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                        <span>Galería Reciente</span>
                        <span>({photos.length} fotos)</span>
                      </div>
                      <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-300">
                        {photos.map((photo, pIdx) => (
                          <div 
                            key={photo.id}
                            onClick={() => handleOpenLightbox(photos, pIdx)}
                            className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 shadow-2xs shrink-0 cursor-pointer hover:border-primary transition-all relative group bg-slate-900"
                          >
                            <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5 text-white">
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
                      No hay registros fotográficos cargados.
                    </div>
                  )}
                </div>

                {/* Program Link tag at the bottom */}
                <div className="mt-4 border-t border-slate-100 pt-3 flex justify-between items-center text-[10.5px]">
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
        <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center p-4 select-none">
          {/* Top Info Header */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center text-white z-10">
            <div className="space-y-1">
              <h4 className="font-extrabold font-headline text-sm text-slate-100">
                Visualizador del Hub de Frentes
              </h4>
              <p className="text-[10px] text-slate-450 font-bold font-mono">
                Semana {activePhoto.semana} — Período: {activePhoto.fechaInicial || 'N/A'} al {activePhoto.fechaCorte || 'N/A'} — Registrada: {activePhoto.date}
              </p>
            </div>

            {/* Weekly Navigation Dropdown inside Lightbox */}
            <div className="flex items-center gap-3">
              {activePhoto.id !== 'design_soil' && (
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Cambiar Semana:</span>
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

      {/* Inline styles for Pavement patterns */}
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
      `}} />

    </div>
  );
}
