import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { getDisenoForCiv, DESIGN_TEMPLATES } from '../data/frentesDisenos';
import { Layers, AlertTriangle, FileText, Info, Search, Upload, ExternalLink, HelpCircle } from 'lucide-react';

function MiniMap({ latitude, longitude, status }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (!latitude || !longitude) return;

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) return;

    // Initialize map if not done yet
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      
      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView([lat, lng], 16);
    }

    const map = mapInstanceRef.current;

    // Update marker
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const pinColorClass = status === 'al-dia' ? 'al-dia' : status === 'alerta' ? 'alerta' : 'critico';
      const pinIcon = L.divIcon({
        className: 'custom-mini-marker',
        html: `<div class="marker-pin ${pinColorClass} active-pin" style="transform: rotate(-45deg) scale(0.85); width:20px; height:20px; margin:-10px 0 0 -10px;"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 20]
      });

      markerRef.current = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
    }
  }, [latitude, longitude, status]);

  // Full cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-2">
        <span className="material-symbols-outlined text-primary text-lg">map</span>
        Ubicación Georreferenciada
      </h4>
      <div 
        ref={mapContainerRef} 
        className="w-full h-36 rounded bg-slate-100 border border-slate-200 relative z-0"
        style={{ minHeight: '144px' }}
      />
      <div className="text-[10px] text-slate-400 font-bold flex justify-between mt-2 font-mono-numbers">
        <span>LATITUD: {latitude}</span>
        <span>LONGITUD: {longitude}</span>
      </div>
    </div>
  );
}

export default function FrentesControl({ projects }) {
  const [selectedCiv, setSelectedCiv] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [localPdfFile, setLocalPdfFile] = useState(null);
  const [localPdfUrl, setLocalPdfUrl] = useState(null);
  const [uploadedPdfs, setUploadedPdfs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('geo_interventoria_uploaded_pdfs') || '{}');
    } catch (e) {
      return {};
    }
  });
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('diseño'); // 'diseño' o 'pdf'
  const [isListCollapsed, setIsListCollapsed] = useState(false);

  // Extract all unique frentes across projects
  const allFrentes = projects.flatMap(p => 
    (p.frentes || []).map(f => {
      const civMatch = f.civ || (f.name?.match(/CIV\s+(\d+)/i)?.[1] || '');
      const ejeMatch = f.eje || (f.name?.match(/\(([^)]+)\)/)?.[1] || f.name || '');
      const desdeMatch = f.desde || (f.description?.match(/Tramo:\s*(.*?)\s*hasta/i)?.[1] || '');
      const hastaMatch = f.hasta || (f.description?.match(/hasta\s*(.*?)\s*-/i)?.[1] || '');
      
      // Fallback for Frente Number (extract from id split)
      let frenteNum = f.frente;
      if (!frenteNum && f.id) {
        const parts = f.id.split('_');
        if (parts.length >= 3) {
          const num = parseInt(parts[2]);
          if (parts[1] === 'mv') {
            frenteNum = num;
          } else if (parts[1] === 'ep') {
            frenteNum = num + 100;
          }
        }
      }
      
      return {
        ...f,
        frente: frenteNum || '',
        civ: civMatch,
        eje: ejeMatch,
        desde: desdeMatch,
        hasta: hastaMatch,
        projectName: p.name,
        contractNo: p.contractNo
      };
    })
  );

  // Set initial selected CIV when component loads or frentes change
  useEffect(() => {
    if (allFrentes.length > 0 && !selectedCiv) {
      // Find a CIV from Malla Vial first as they have the main design groups
      const firstMv = allFrentes.find(f => f.id.startsWith('f_mv'));
      setSelectedCiv(firstMv ? firstMv.civ : allFrentes[0].civ);
    }
  }, [allFrentes, selectedCiv]);

  // Clean up object URL when file changes
  useEffect(() => {
    return () => {
      if (localPdfUrl) {
        URL.revokeObjectURL(localPdfUrl);
      }
    };
  }, [localPdfUrl]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result;
          const response = await fetch('/api/upload-design', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              civId: selectedCiv,
              fileName: file.name,
              base64: base64
            })
          });

          if (!response.ok) {
            throw new Error('Error al subir el diseño PDF');
          }

          const result = await response.json();
          if (result.url) {
            const nextPdfs = { ...uploadedPdfs, [selectedCiv]: result.url };
            setUploadedPdfs(nextPdfs);
            localStorage.setItem('geo_interventoria_uploaded_pdfs', JSON.stringify(nextPdfs));
            
            setLocalPdfFile(file);
            if (localPdfUrl) {
              URL.revokeObjectURL(localPdfUrl);
            }
            setLocalPdfUrl(result.url);
            setActiveTab('pdf');
            alert("Diseño PDF subido y guardado exitosamente en el servidor.");
          }
        } catch (error) {
          console.error(error);
          alert("Error al subir el diseño PDF al servidor.");
        } finally {
          setIsUploading(false);
        }
      };
      reader.onerror = () => {
        alert("Error al leer el archivo PDF.");
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } else {
      alert("Por favor, selecciona un archivo PDF válido.");
    }
  };

  const handleClearLocalPdf = () => {
    setLocalPdfFile(null);
    if (localPdfUrl) {
      // If it's a blob url we revoke it, but it might be a server url now
      if (localPdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(localPdfUrl);
      }
      setLocalPdfUrl(null);
    }
  };

  // Get current active frente details
  const activeFrente = allFrentes.find(f => f.civ === selectedCiv);
  // Get technical design specifications
  const activeDesign = selectedCiv ? getDisenoForCiv(selectedCiv) : null;

  const [isEditingModules, setIsEditingModules] = useState(false);
  const [editedDesign, setEditedDesign] = useState(null);

  // Load and copy activeDesign when selected CIV changes
  useEffect(() => {
    if (activeDesign) {
      setEditedDesign(JSON.parse(JSON.stringify(activeDesign)));
    } else {
      setEditedDesign(null);
    }
    setIsEditingModules(false);
  }, [selectedCiv, activeDesign]);

  const handleModuleChange = (posicion, field, value) => {
    if (!editedDesign) return;
    const val = value === '' ? null : parseFloat(value);
    const updatedCapas = editedDesign.paquete_estructural_capas.map(layer => {
      if (layer.posicion === posicion) {
        return { ...layer, [field]: val };
      }
      return layer;
    });
    setEditedDesign({ ...editedDesign, paquete_estructural_capas: updatedCapas });
  };

  const handleGeotechChange = (field, value) => {
    if (!editedDesign) return;
    const val = value === '' ? 0 : parseFloat(value);
    setEditedDesign({
      ...editedDesign,
      datos_geotecnicos: {
        ...editedDesign.datos_geotecnicos,
        [field]: val
      }
    });
  };

  const handleSaveModules = () => {
    if (!editedDesign) return;
    const overrides = JSON.parse(localStorage.getItem('geo_interventoria_design_overrides') || '{}');
    overrides[selectedCiv] = editedDesign;
    localStorage.setItem('geo_interventoria_design_overrides', JSON.stringify(overrides));
    setIsEditingModules(false);
    window.location.reload();
  };

  const handleApplyTemplate = (templateKey) => {
    if (!templateKey) return;
    const template = DESIGN_TEMPLATES[templateKey];
    if (!template) return;
    
    const newDesign = {
      ...JSON.parse(JSON.stringify(template)),
      civ_id: selectedCiv,
      nombre_grupo: `Frente Personalizado (CIV ${selectedCiv})`
    };
    
    const overrides = JSON.parse(localStorage.getItem('geo_interventoria_design_overrides') || '{}');
    overrides[selectedCiv] = newDesign;
    localStorage.setItem('geo_interventoria_design_overrides', JSON.stringify(overrides));
    window.location.reload();
  };

  // Filter frentes list by search term
  const filteredFrentes = allFrentes.filter(f => 
    f.civ.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.eje.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(f.frente).includes(searchTerm) ||
    f.projectName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Navigation Logic between fronts
  const currentIndex = filteredFrentes.findIndex(f => f.civ === selectedCiv);
  const prevDisabled = currentIndex <= 0;
  const nextDisabled = currentIndex === -1 || currentIndex >= filteredFrentes.length - 1;

  const handlePrevFrente = () => {
    if (!prevDisabled) {
      const prevF = filteredFrentes[currentIndex - 1];
      setSelectedCiv(prevF.civ);
      handleClearLocalPdf();
    }
  };

  const handleNextFrente = () => {
    if (!nextDisabled) {
      const nextF = filteredFrentes[currentIndex + 1];
      setSelectedCiv(nextF.civ);
      handleClearLocalPdf();
    }
  };

  // PDF URL configuration (Uploaded path or fallback path)
  const publicPdfUrl = selectedCiv ? `/frentes/${selectedCiv}/diseno.pdf` : '';
  const uploadedPdfUrl = (selectedCiv && uploadedPdfs[selectedCiv]) ? uploadedPdfs[selectedCiv] : '';
  const finalPdfUrl = localPdfUrl || uploadedPdfUrl || publicPdfUrl;

  // Render layer background styles based on material type
  const getLayerStyle = (type) => {
    switch (type) {
      case 'concreto':
        return 'bg-slate-200 border-slate-400 text-slate-700 pattern-concrete';
      case 'asfalto':
        return 'bg-slate-800 border-slate-900 text-slate-200 pattern-asphalt';
      case 'base_cemento':
      case 'subbase_cemento':
        return 'bg-stone-300 border-stone-400 text-stone-700';
      case 'subbase':
        return 'bg-amber-100 border-amber-200 text-amber-800';
      case 'geomalla':
        return 'bg-yellow-50 border-yellow-300 text-yellow-900 border-dashed border-2';
      case 'geocelda':
        return 'bg-orange-50 border-orange-300 text-orange-900 border-double border-4';
      case 'geotextil':
      case 'geotextil_nt':
        return 'bg-blue-50 border-blue-300 text-blue-900 border-dotted border-2';
      case 'imprimacion':
        return 'bg-zinc-700 border-zinc-800 text-zinc-300 h-2 min-h-0 py-0 text-[8px] flex items-center justify-center';
      case 'arena':
        return 'bg-yellow-100 border-yellow-200 text-yellow-700 pattern-sand';
      default:
        return 'bg-slate-100 border-slate-300 text-slate-700';
    }
  };

  const getVisualLayerStyle = (type) => {
    switch (type) {
      case 'asfalto':
        return {
          background: 'linear-gradient(135deg, #1e293b 25%, #334155 100%)',
          color: '#f8fafc',
          borderColor: '#0f172a'
        };
      case 'concreto':
        return {
          background: 'linear-gradient(to bottom, #e2e8f0 0%, #cbd5e1 100%)',
          color: '#0f172a',
          borderColor: '#94a3b8',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)'
        };
      case 'base_cemento':
        return {
          background: 'repeating-linear-gradient(45deg, #fef08a, #fef08a 8px, #fde68a 8px, #fde68a 16px)',
          color: '#713f12',
          borderColor: '#d97706',
          borderStyle: 'dashed'
        };
      case 'subbase':
      case 'subbase_cemento':
        return {
          background: '#fef08a',
          backgroundImage: 'radial-gradient(#eab308 15%, transparent 16%)',
          backgroundSize: '5px 5px',
          color: '#713f12',
          borderColor: '#ca8a04',
          borderStyle: 'dashed'
        };
      case 'geomalla':
        return {
          background: '#1e1b4b',
          backgroundImage: 'linear-gradient(to right, #4f46e5 1px, transparent 1px), linear-gradient(to bottom, #4f46e5 1px, transparent 1px)',
          backgroundSize: '3.5px 3.5px',
          color: '#e0e7ff',
          borderColor: '#312e81'
        };
      case 'geocelda':
        return {
          background: '#ffedd5',
          backgroundImage: 'repeating-linear-gradient(90deg, #ea580c 0px, #ea580c 1.5px, transparent 1.5px, transparent 10px)',
          color: '#c2410c',
          borderColor: '#ea580c'
        };
      case 'geotextil':
      case 'geotextil_nt':
        return {
          background: 'repeating-linear-gradient(90deg, #3b82f6, #3b82f6 5px, transparent 5px, transparent 10px)',
          color: '#1e3a8a',
          borderColor: '#2563eb'
        };
      default:
        return {
          background: '#cbd5e1',
          color: '#334155',
          borderColor: '#cbd5e1'
        };
    }
  };

  return (
    <div className="flex-1 p-gutter max-w-container-max mx-auto min-h-screen pb-16">
      
      {/* View Header */}
      <section className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-gutter border-b border-slate-200 pb-6">
        <div>
          <h2 className="font-headline-lg text-3xl font-extrabold text-primary mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-3xl">engineering</span>
            Control de Frentes y Diseños
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            Consulta las especificaciones de diseño estructural aprobadas (INCOLTA S.A.S.) y planos geométricos de cada CIV.
          </p>
        </div>
      </section>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: CIV Selection list (4/12 width) */}
        <div className={`lg:col-span-4 bg-white border border-slate-200 rounded-lg flex flex-col h-[calc(100vh-210px)] min-h-[500px] transition-all duration-300 ${
          isListCollapsed ? 'hidden lg:hidden' : 'block'
        }`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Frentes de Obra</h3>
            <button
              onClick={() => setIsListCollapsed(true)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200/50 flex items-center justify-center transition-colors"
              title="Ocultar panel de búsqueda"
            >
              <span className="material-symbols-outlined text-base">menu_open</span>
            </button>
          </div>
          <div className="p-4 border-b border-slate-100 bg-slate-50/20">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por CIV o Vía..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded bg-white text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredFrentes.length > 0 ? (
              filteredFrentes.map((f) => {
                const isSelected = selectedCiv === f.civ;
                const design = getDisenoForCiv(f.civ);
                
                // Color badges for quick status
                const getStatusBadge = (status) => {
                  switch (status) {
                    case 'al-dia': return 'bg-emerald-100 text-emerald-800';
                    case 'alerta': return 'bg-amber-100 text-amber-800';
                    case 'critico': return 'bg-rose-100 text-rose-800';
                    default: return 'bg-slate-100 text-slate-700';
                  }
                };

                return (
                  <button
                    key={`${f.id}-${f.civ}`}
                    onClick={() => {
                      setSelectedCiv(f.civ);
                      handleClearLocalPdf();
                    }}
                    className={`w-full p-4 text-left transition-all hover:bg-slate-50 flex flex-col gap-1.5 ${
                      isSelected ? 'bg-slate-50 border-l-4 border-primary' : 'border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <div className="flex gap-1.5 items-center">
                        <span className="font-bold text-[10px] text-white bg-slate-500 px-1.5 py-0.5 rounded shrink-0">
                          Fr. {f.frente}
                        </span>
                        <span className="font-bold font-mono text-xs text-primary bg-primary/5 px-2 py-0.5 rounded">
                          CIV {f.civ}
                        </span>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${getStatusBadge(f.status)}`}>
                        {f.progress}%
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-800">
                      {f.eje} ({f.desde} - {f.hasta})
                    </div>

                    <div className="text-[10px] text-slate-400 font-medium truncate flex items-center justify-between">
                      <span>{design.tecnologia_aprobada}</span>
                      <span className="font-bold text-slate-500">Gpo: {design.grupo}</span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                No se encontraron frentes con los criterios de búsqueda.
              </div>
            )}
          </div>
        </div>

        {/* Right column: CIV details and PDF viewer (8/12 width) */}
        <div className={`flex flex-col gap-6 transition-all duration-300 ${
          isListCollapsed ? 'lg:col-span-12' : 'lg:col-span-8'
        }`}>
          
          {isListCollapsed && (
            <button
              onClick={() => setIsListCollapsed(false)}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs px-3.5 py-2 rounded flex items-center gap-1.5 self-start shadow-sm transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">menu</span>
              Mostrar Listado de Frentes
            </button>
          )}

          {/* Active Frente Banner */}
          {activeFrente && activeDesign && (
            <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-primary text-white rounded">
                    {activeFrente.projectName.includes('Malla') ? 'Malla Vial' : 'Espacio Público'}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">
                    Contrato: {activeFrente.contractNo}
                  </span>
                </div>
                
                <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                  <button
                    onClick={handlePrevFrente}
                    disabled={prevDisabled}
                    className="w-7 h-7 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-650 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm shrink-0"
                    title="Frente anterior"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  <h3 className="font-headline-md text-xl font-bold text-slate-800 leading-tight">
                    Frente {activeFrente.frente} — CIV {activeFrente.civ} — {activeFrente.eje}
                  </h3>
                  <button
                    onClick={handleNextFrente}
                    disabled={nextDisabled}
                    className="w-7 h-7 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-650 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm shrink-0"
                    title="Frente siguiente"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
                <p className="text-slate-500 text-xs mt-2 pl-0.5">
                  Tramo: {activeFrente.desde} hasta {activeFrente.hasta} | Área: {activeFrente.area} m² | Supervisor: {activeFrente.supervisor}
                </p>
              </div>

              {/* Tab Navigation */}
              <div className="flex bg-slate-100 p-1 rounded-md self-start md:self-center shrink-0">
                <button
                  onClick={() => setActiveTab('diseño')}
                  className={`px-3 py-1.5 text-xs font-bold rounded transition-all flex items-center gap-1.5 ${
                    activeTab === 'diseño' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers size={14} />
                  Ficha Técnica
                </button>
                <button
                  onClick={() => setActiveTab('pdf')}
                  className={`px-3 py-1.5 text-xs font-bold rounded transition-all flex items-center gap-1.5 ${
                    activeTab === 'pdf' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText size={14} />
                  Diseños PDF
                </button>
              </div>
            </div>
          )}

          {/* Tab Content 1: Diseño Estructural & Capas */}
          {activeTab === 'diseño' && activeDesign && (
            <div className="flex flex-col gap-6">
              
              {/* Plantilla Selector Dropdown */}
              <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div>
                  <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-lg">category</span>
                    Asignar Plantilla de Pavimento Aprobada
                  </h4>
                  <p className="text-slate-400 text-[10px]">
                    Si este frente corresponde a una de las estructuras típicas de los frentes (3, 4, 5, 9, 10), selecciónala para cargarla.
                  </p>
                </div>
                <select 
                  onChange={(e) => handleApplyTemplate(e.target.value)}
                  defaultValue=""
                  className="bg-slate-50 border border-slate-200 hover:border-slate-350 text-xs font-bold text-slate-700 px-3.5 py-2.5 rounded focus:ring-1 focus:ring-primary focus:outline-none transition-all cursor-pointer min-w-[260px]"
                >
                  <option value="" disabled>-- Seleccionar Plantilla --</option>
                  <option value="template_1_flexible">Flexible: Asfalto 12cm / Base Cemento / Geocelda (Imagen 1)</option>
                  <option value="template_2_rigido">Rígido: Concreto 18cm / Geocelda / Barrenos (Imagen 2)</option>
                  <option value="template_3_rigido_alt">Rígido: Concreto 20cm / Geomalla / Micropilotos (Imagen 3)</option>
                  <option value="template_4_rigido_geo">Rígido: Concreto 18cm / Geocelda / Geotextil (Imagen 4)</option>
                  <option value="template_5_flexible_alt">Flexible: Asfalto 12cm (390k) / Geocelda / Barrenos (Imagen 5)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Geotechnical & Design details */}
              <div className="flex flex-col gap-6">
                
                {/* Parámetros de Diseño Card */}
                <div className="bg-white border border-slate-200 rounded-lg p-6">
                  <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-3">
                    <Info size={16} className="text-primary" />
                    Parámetros de Diseño Estructural
                  </h4>

                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Grupo de CIVs</span>
                      <span className="font-bold text-slate-700">{activeDesign.nombre_grupo}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tecnología Aprobada</span>
                      <span className="font-bold text-slate-700">{activeDesign.tecnologia_aprobada}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Alternativa Aprobada</span>
                      <span className="font-bold text-slate-800 text-xs bg-slate-50 p-2 rounded block border border-slate-100 mt-1">
                        {activeDesign.alternativa_aprobada}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Periodo de Diseño</span>
                      <span className="font-bold text-slate-700">{activeDesign.periodo_diseno_anos} años</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tránsito Solicitado</span>
                      <span className="font-bold text-slate-700 font-mono-numbers">
                        {activeDesign.transito_ejes_equivalentes.toLocaleString()} Ejes Eq.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Georeferenced Location Card */}
                {activeFrente && activeFrente.latitude && activeFrente.longitude && (
                  <MiniMap 
                    latitude={activeFrente.latitude}
                    longitude={activeFrente.longitude}
                    status={activeFrente.status}
                    civ={activeFrente.civ}
                  />
                )}

                {/* Datos de Subrasante Card */}
                <div className="bg-white border border-slate-200 rounded-lg p-6">
                  <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-3">
                    <span className="material-symbols-outlined text-primary text-lg">landscape</span>
                    Subrasante Crítica de Fundación
                  </h4>

                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs">
                    <div className="col-span-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Clasificación de Suelo (USCS)</span>
                      <span className="font-bold text-slate-700">{activeDesign.datos_geotecnicos.clasificacion_uscs}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CBR Saturado</span>
                      <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded inline-block mt-0.5">
                        {activeDesign.datos_geotecnicos.cbr_saturado_promedio_porcentaje}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Módulo Resiliente (Mr)</span>
                      <span className="font-bold text-slate-700 font-mono-numbers">
                        {activeDesign.datos_geotecnicos.modulo_resiliente_saturado_psi.toLocaleString()} PSI
                      </span>
                    </div>
                    {activeDesign.datos_geotecnicos.presion_lambe_mpa > 0 && (
                      <div className="col-span-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Presión de Expansión Lambe</span>
                        <span className="font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded inline-block mt-0.5 font-mono-numbers">
                          {activeDesign.datos_geotecnicos.presion_lambe_mpa} MPa
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Elementos de Estabilización Card */}
                {activeDesign.elementos_estabilizacion_subrasante && (
                  <div className="bg-white border border-slate-200 rounded-lg p-6">
                    <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-3">
                      <span className="material-symbols-outlined text-primary text-lg">border_all</span>
                      Estabilización de Subrasante Aprobada
                    </h4>

                    <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs">
                      <div className="col-span-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tratamiento / Elemento</span>
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded block mt-1">
                          {activeDesign.elementos_estabilizacion_subrasante.tipo}
                        </span>
                      </div>
                      
                      {activeDesign.elementos_estabilizacion_subrasante.diametro_m > 0 && (
                        <>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Diámetro</span>
                            <span className="font-bold text-slate-700 font-mono-numbers">
                              {activeDesign.elementos_estabilizacion_subrasante.diametro_m * 100} cm
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Profundidad</span>
                            <span className="font-bold text-slate-700 font-mono-numbers">
                              {activeDesign.elementos_estabilizacion_subrasante.profundidad_m} metros
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Distribución en Subrasante</span>
                            <span className="font-bold text-slate-700">
                              {activeDesign.elementos_estabilizacion_subrasante.distribucion}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Espaciamiento</span>
                            <span className="font-bold text-slate-700 font-mono-numbers">
                              Cada {activeDesign.elementos_estabilizacion_subrasante.espaciamiento_m} metros
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Vertical Layer Package Diagram */}
              <div className="flex flex-col gap-6">
                
                {/* Capas Card */}
                <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col flex-1">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                    <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-lg">layers</span>
                      Paquete Estructural de Capas
                    </h4>
                    <button
                      onClick={() => {
                        if (isEditingModules) {
                          handleSaveModules();
                        } else {
                          setIsEditingModules(true);
                        }
                      }}
                      className={`text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1 transition-all ${
                        isEditingModules 
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-sm'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {isEditingModules ? 'save' : 'edit'}
                      </span>
                      {isEditingModules ? 'Guardar' : 'Editar Módulos'}
                    </button>
                  </div>

                  <p className="text-slate-400 text-[10px] mb-4 italic">
                    Representación vertical de capas aprobadas por interventoría (desde superficie hasta suelo de fundación).
                  </p>

                  <div className="flex-1 overflow-x-auto mt-2 select-none">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px] bg-slate-50/50">
                          <th className="py-2.5 px-3 text-center w-28 min-w-[110px]">Perfil Estructural</th>
                          <th className="py-2.5 px-3">Material / Capa</th>
                          <th className="py-2.5 px-2 text-center">Espesor</th>
                          <th className="py-2.5 px-2 text-center">Especificación IDU</th>
                          <th className="py-2.5 px-2 text-right">Valor Módulo</th>
                          <th className="py-2.5 px-3 text-right">Módulo Combinado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold">
                        {((isEditingModules && editedDesign) ? editedDesign : activeDesign).paquete_estructural_capas.map((layer) => {
                          const layerHeight = layer.espesor_cm > 0 
                            ? Math.max(38, Math.min(54, layer.espesor_cm * 2.2)) 
                            : (layer.espesor_label === 'Geomalla' ? 18 : 26);

                          const visualStyle = getVisualLayerStyle(layer.tipo_material);

                          return (
                            <tr 
                              key={`${layer.posicion}-${layer.nombre}`} 
                              style={{ height: `${layerHeight}px` }}
                              className="hover:bg-slate-50/30"
                            >
                              {/* 1. Visual Block Column */}
                              <td className="p-0 border-y-0 h-full w-28 min-w-[110px] vertical-align-middle">
                                <div 
                                  style={{ ...visualStyle, height: `${layerHeight}px` }}
                                  className="w-full flex items-center justify-center text-[9px] font-black uppercase tracking-wider px-1 text-center select-none shadow-inner border-b border-r"
                                  title={`${layer.nombre} - ${layer.espesor_cm > 0 ? `${layer.espesor_cm} cm` : layer.espesor_label || ''}`}
                                >
                                  {layer.espesor_cm > 0 ? `${layer.espesor_cm} cm` : layer.espesor_label || '-'}
                                </div>
                              </td>

                              {/* 2. Material with colored badge */}
                              <td className="py-2.5 px-3 flex items-center gap-2 min-w-[200px] h-full">
                                <span 
                                  style={visualStyle} 
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 shadow-sm border"
                                >
                                  {layer.posicion}
                                </span>
                                <span className="text-slate-800 text-xs leading-normal font-bold pl-1">{layer.nombre}</span>
                              </td>

                              {/* 3. Espesor */}
                              <td className="py-2.5 px-2 text-center font-mono-numbers text-slate-700 text-xs whitespace-nowrap">
                                {layer.espesor_cm > 0 ? `${layer.espesor_cm} cm` : layer.espesor_label || '-'}
                              </td>

                              {/* 4. Especificación */}
                              <td className="py-2.5 px-2 text-center font-mono text-slate-650">
                                {layer.especificacion_idu || '-'}
                              </td>

                              {/* 5. Valor Módulo */}
                              <td className="py-2.5 px-2 text-right font-mono-numbers text-slate-750">
                                {isEditingModules ? (
                                  <input 
                                    type="number"
                                    value={layer.modulo_psi === null || layer.modulo_psi === undefined ? '' : layer.modulo_psi}
                                    onChange={(e) => handleModuleChange(layer.posicion, 'modulo_psi', e.target.value)}
                                    className="w-20 text-right p-0.5 border rounded border-slate-300 focus:ring-1 focus:ring-primary focus:outline-none bg-white font-mono-numbers text-xs"
                                    placeholder="N/A"
                                  />
                                ) : (
                                  layer.modulo_psi ? `${layer.modulo_psi.toLocaleString()} psi` : '-'
                                )}
                              </td>

                              {/* 6. Módulo Combinado */}
                              <td className="py-2.5 px-3 text-right font-mono-numbers text-slate-700">
                                {isEditingModules ? (
                                  <input 
                                    type="number"
                                    value={layer.modulo_combinado_pci === null || layer.modulo_combinado_pci === undefined ? '' : layer.modulo_combinado_pci}
                                    onChange={(e) => handleModuleChange(layer.posicion, 'modulo_combinado_pci', e.target.value)}
                                    className="w-20 text-right p-0.5 border rounded border-slate-300 focus:ring-1 focus:ring-primary focus:outline-none bg-white font-mono-numbers text-xs"
                                    placeholder="N/A"
                                  />
                                ) : (
                                  layer.modulo_combinado_pci ? `${layer.modulo_combinado_pci} PCI` : '-'
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        
                        {/* Subrasante Foundation representation */}
                        <tr style={{ height: '42px' }} className="bg-slate-50 border-t border-slate-200">
                          {/* Visual dirt block for subrasante */}
                          <td className="p-0 border-y-0 h-full w-28 min-w-[110px]">
                            <div
                              style={{
                                background: 'linear-gradient(135deg, #78350f 25%, #451a03 100%)',
                                backgroundImage: 'repeating-linear-gradient(-45deg, rgba(255,255,255,0.03), rgba(255,255,255,0.03) 4px, transparent 4px, transparent 8px)',
                                borderRight: '1px solid #451a03',
                                height: '42px'
                              }}
                              className="w-full flex flex-col items-center justify-center text-[7px] text-[#fed7aa] font-black uppercase tracking-widest px-1 text-center select-none shadow-inner"
                              title="Subrasante de cimentación"
                            >
                              <span>Subrasante</span>
                            </div>
                          </td>

                          <td className="py-2.5 px-3 font-bold text-slate-700 flex items-center gap-2 h-full">
                            <span 
                              style={{
                                background: 'linear-gradient(135deg, #78350f 25%, #451a03 100%)',
                                color: '#fed7aa',
                                borderColor: '#451a03'
                              }} 
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black shrink-0 shadow-sm border"
                            >
                              SR
                            </span>
                            <span className="text-slate-800 text-xs font-extrabold pl-1">Subrasante (Cimiento)</span>
                          </td>
                          <td className="py-2.5 px-2 text-center text-slate-400 font-mono-numbers">-</td>
                          <td className="py-2.5 px-2 text-center text-slate-400 font-mono">-</td>
                          <td className="py-2.5 px-2 text-right font-bold text-slate-700 font-mono-numbers">
                            {isEditingModules ? (
                              <input 
                                type="number"
                                value={(editedDesign || activeDesign).datos_geotecnicos.modulo_resiliente_saturado_psi || ''}
                                onChange={(e) => handleGeotechChange('modulo_resiliente_saturado_psi', e.target.value)}
                                className="w-20 text-right p-0.5 border rounded border-slate-350 focus:ring-1 focus:ring-primary focus:outline-none bg-white font-mono-numbers text-xs"
                                placeholder="0"
                              />
                            ) : (
                              `${(editedDesign || activeDesign).datos_geotecnicos.modulo_resiliente_saturado_psi.toLocaleString()} psi`
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-400 font-mono-numbers">-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Alertas de Calidad / Interventoría */}
                {activeDesign.alertas_interventoria && activeDesign.alertas_interventoria.length > 0 && (
                  <div className="bg-rose-50/50 border border-rose-100 rounded-lg p-5">
                    <h5 className="text-rose-900 font-bold text-xs flex items-center gap-1.5 mb-2.5">
                      <AlertTriangle className="text-rose-600" size={16} />
                      Alertas de Calidad & Control de Interventoría
                    </h5>
                    <div className="space-y-3">
                      {activeDesign.alertas_interventoria.map((al) => (
                        <div key={al.id} className="text-xs text-rose-800 border-l-2 border-rose-400 pl-3">
                          <strong className="block text-rose-950 font-bold">{al.titulo}</strong>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-rose-900/80">{al.mensaje}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}

          {/* Tab Content 2: PDF Viewer / Planos */}
          {activeTab === 'pdf' && activeDesign && (
            <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col h-[calc(100vh-210px)] min-h-[500px]">
              
              {/* PDF Header Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="text-primary" size={20} />
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">
                      Diseño Geométrico & Planos de Detalle
                    </h4>
                    <p className="text-slate-400 text-[10px] font-medium">
                      {localPdfFile ? `Mostrando diseño cargado: "${localPdfFile.name}"` : `Ruta de diseño: ${finalPdfUrl}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* File Upload Input for fallbacks */}
                  <label className={`bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded cursor-pointer transition-all flex items-center gap-1.5 shadow-sm border border-slate-200 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <Upload size={14} />
                    {isUploading ? 'Subiendo...' : 'Subir Diseño PDF'}
                    <input 
                      type="file" 
                      accept="application/pdf" 
                      className="hidden" 
                      onChange={handleFileChange}
                      disabled={isUploading}
                    />
                  </label>

                  {localPdfFile && (
                    <button 
                      onClick={handleClearLocalPdf}
                      className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline"
                    >
                      Limpiar
                    </button>
                  )}

                  <a 
                    href={finalPdfUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-primary hover:bg-primary-container text-white text-xs font-bold px-3 py-1.5 rounded transition-all flex items-center gap-1.5 shadow"
                  >
                    Abrir en Nueva Pestaña
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>

              {/* Folder instructions for project management */}
              {!localPdfFile && (
                <div className="bg-blue-50 border border-blue-100 rounded p-3 mb-4 flex gap-2.5 items-start">
                  <HelpCircle className="text-blue-600 shrink-0 mt-0.5" size={16} />
                  <div className="text-[11px] text-blue-900 leading-normal">
                    <span className="font-bold block mb-0.5">📂 Instrucciones de Estructura de Carpetas del Proyecto:</span>
                    Para visualizar de forma permanente los planos de este frente de obra, coloca su archivo PDF de diseño geométrico en la siguiente ruta física de tu proyecto:
                    <code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-[10px] font-bold mx-1 select-all block mt-1 w-fit">
                      public/frentes/{selectedCiv}/diseno.pdf
                    </code>
                  </div>
                </div>
              )}

              {/* Real Iframe Viewport */}
              <div className="flex-1 bg-slate-100 rounded border border-slate-200 overflow-hidden relative flex flex-col justify-center items-center">
                
                {/* Embed PDF inside Iframe */}
                <iframe
                  title={`Diseño Geométrico CIV ${selectedCiv}`}
                  src={`${finalPdfUrl}#view=FitH`}
                  className="w-full h-full border-none z-10"
                />

                {/* Fallback Help Message behind iframe */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-slate-50 pointer-events-none select-none">
                  <FileText size={48} className="text-slate-300 mb-2" />
                  <h5 className="font-bold text-slate-700 text-sm">Buscando Documento Técnico de CIV {selectedCiv}</h5>
                  <p className="text-slate-400 text-xs mt-1 max-w-sm">
                    Si el visor está en blanco, es porque el archivo aún no ha sido colocado en la carpeta local <code className="bg-slate-100 text-[10px] px-1 py-0.5 font-mono">public/frentes/{selectedCiv}/diseno.pdf</code>.
                  </p>
                  <p className="text-primary text-xs font-bold mt-4">
                    💡 ¡Puedes arrastrar o subir un PDF local usando el botón de arriba para probar la visualización!
                  </p>
                </div>
                
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
