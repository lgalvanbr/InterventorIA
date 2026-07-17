import React, { useState, useEffect } from 'react';
import { Calendar, Activity, FileText, CheckCircle2, Trash2, ArrowLeft, Image as ImageIcon, Plus, ChevronLeft, ChevronRight, X, Eye } from 'lucide-react';

export default function WeeklyFrenteDetail({ 
  report, 
  frenteId, 
  onClose, 
  onSave 
}) {
  const frente = report?.frentes?.find(f => f.id === frenteId) || null;

  // Form State (called unconditionally)
  const [porcentajeAvance, setPorcentajeAvance] = useState(0);
  const [ejecucionPresupuestal, setEjecucionPresupuestal] = useState(0);
  const [pmtEstado, setPmtEstado] = useState('N/A');
  const [hitos, setHitos] = useState('');
  const [fotos, setFotos] = useState([]);
  const [bitacoraNotas, setBitacoraNotas] = useState([]);
  const [perfilSueloImgUrl, setPerfilSueloImgUrl] = useState('');

  // Active Day Index (0 = Saturday, ..., 6 = Friday)
  const [activeDayIdx, setActiveDayIdx] = useState(0);

  // Lightbox State
  const [lightboxIndex, setLightboxIndex] = useState(null); // null means closed

  // Synchronize state when frente loads or changes
  useEffect(() => {
    if (frente) {
      setPorcentajeAvance(frente.porcentaje_avance_semana || 0);
      setEjecucionPresupuestal(frente.ejecucion_presupuestal_semana || 0);
      setPmtEstado(frente.pmt_estado || 'N/A');
      setHitos(frente.actividades_ejecutadas_hitos || '');
      setFotos(frente.fotos || []);
      setBitacoraNotas(frente.bitacora_notas || []);
      setPerfilSueloImgUrl(frente.perfil_suelo_img_url || '');
      setActiveDayIdx(0); // Reset to Saturday (Day 0)
    }
  }, [frente]);

  // Calculate week dates starting from report.fecha_inicial_corte
  const weekDates = [];
  if (report?.fecha_inicial_corte) {
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

  const activeDayNote = bitacoraNotas.find(n => n.date === activeDateStr)?.note || '';
  const activeDayPhotos = fotos.filter(f => f.date === activeDateStr);

  // Handle active day note modification
  const handleActiveDayNoteChange = (text) => {
    setBitacoraNotas(prev => {
      const exists = prev.some(n => n.date === activeDateStr);
      if (exists) {
        return prev.map(n => n.date === activeDateStr ? { ...n, note: text } : n);
      } else {
        return [
          {
            id: Date.now(),
            date: activeDateStr,
            note: text
          },
          ...prev
        ];
      }
    });
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (lightboxIndex === null) return;
      if (e.key === 'ArrowRight') {
        handleNextPhoto();
      } else if (e.key === 'ArrowLeft') {
        handlePrevPhoto();
      } else if (e.key === 'Escape') {
        setLightboxIndex(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, activeDayPhotos]);

  if (!frente) {
    return (
      <div className="flex-1 p-gutter flex flex-col items-center justify-center min-h-screen text-slate-400">
        <Activity size={48} className="mb-2 text-slate-300 animate-pulse" />
        <p className="text-sm font-semibold">No se encontró el frente de obra especificado.</p>
        <button onClick={onClose} className="mt-4 bg-primary text-white text-xs font-bold px-4 py-2 rounded">
          Volver a Informes
        </button>
      </div>
    );
  }

  const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.7) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Get Supabase config from localStorage
  let supabaseConfig = null;
  if (typeof window !== 'undefined') {
    try {
      supabaseConfig = JSON.parse(localStorage.getItem('geo_interventoria_supabase_config') || 'null');
    } catch (e) {}
  }

  const uploadToSupabase = async (supabaseUrl, supabaseKey, bucketName, filePath, base64Data) => {
    const base64Response = await fetch(base64Data);
    const blob = await base64Response.blob();

    const cleanPath = filePath.replace(/^\//, '');
    const url = `${supabaseUrl}/storage/v1/object/${bucketName}/${cleanPath}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': blob.type || 'image/jpeg'
      },
      body: blob
    });

    if (!response.ok) {
      const err = await response.json();
      if (response.status !== 409) {
        throw new Error(err.message || 'Error al subir a Supabase Storage');
      }
    }

    return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${cleanPath}`;
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    const uploadedPhotos = [];
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        try {
          const base64 = await compressImage(file);
          const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
          const fileName = `${Date.now()}_${cleanName}`;
          
          let previewUrl = base64; // Fallback to base64 data URL
          
          let uploadedToSupabase = false;
          if (supabaseConfig && supabaseConfig.supabaseUrl && supabaseConfig.supabaseKey) {
            try {
              const cloudUrl = await uploadToSupabase(
                supabaseConfig.supabaseUrl,
                supabaseConfig.supabaseKey,
                supabaseConfig.supabaseBucket || 'frentes-fotos',
                `semana_${report.numero_semana}/frente_${frente.id}/${fileName}`,
                base64
              );
              previewUrl = cloudUrl;
              uploadedToSupabase = true;
            } catch (sErr) {
              console.error("Error uploading to Supabase, falling back:", sErr);
            }
          }

          if (!uploadedToSupabase) {
            try {
              const response = await fetch('/api/upload-photo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  semana: report.numero_semana,
                  frenteId: frente.id,
                  fileName: fileName,
                  base64: base64
                })
              });
              if (response.ok) {
                const result = await response.json();
                const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                if (result.url && isLocal) {
                  previewUrl = result.url;
                }
              }
            } catch (apiErr) {
              console.warn("Could not save to backend server, using base64 preview:", apiErr);
            }
          }

          uploadedPhotos.push({
            id: Date.now() + Math.random().toString(36).substring(2, 11),
            url: previewUrl,
            caption: '',
            date: activeDateStr // Statically bound to the active day
          });
        } catch (err) {
          console.error("Error processing photo:", err);
        }
      }
    }
    setFotos(prev => [...prev, ...uploadedPhotos]);
  };

  const handleUpdateCaption = (photoId, caption) => {
    setFotos(prev => prev.map(f => f.id === photoId ? { ...f, caption } : f));
  };

  const handleDeletePhoto = (photoId) => {
    setFotos(prev => prev.filter(f => f.id !== photoId));
  };

  const handleSave = () => {
    const updatedFrente = {
      ...frente,
      porcentaje_avance_semana: porcentajeAvance,
      ejecucion_presupuestal_semana: ejecucionPresupuestal,
      pmt_estado: pmtEstado,
      actividades_ejecutadas_hitos: hitos,
      fotos,
      bitacora_notas: bitacoraNotas,
      perfil_suelo_img_url: perfilSueloImgUrl
    };
    onSave(updatedFrente);
  };

  const handlePrevPhoto = () => {
    if (activeDayPhotos.length === 0) return;
    setLightboxIndex(prev => (prev === 0 ? activeDayPhotos.length - 1 : prev - 1));
  };

  const handleNextPhoto = () => {
    if (activeDayPhotos.length === 0) return;
    setLightboxIndex(prev => (prev === activeDayPhotos.length - 1 ? 0 : prev + 1));
  };

  const formatCOP = (num) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(num);
  };

  const getDayName = (date) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[date.getDay()];
  };

  const getDayLabel = (date) => {
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="flex-1 p-gutter max-w-container-max mx-auto grid-bg min-h-screen pb-24">
      
      {/* Header View */}
      <section className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-lg shadow-sm transition-all"
            title="Volver"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-primary/10 text-primary text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wide border border-primary/15">
                Semana {report.numero_semana}
              </span>
              <span className="text-slate-400 text-xs font-semibold">
                ({report.fecha_inicial_corte} al {report.fecha_final_corte})
              </span>
            </div>
            <h2 className="font-headline-lg text-2xl font-extrabold text-primary">
              Frente {frente.frente}: CIV {frente.civ} — {frente.eje}
            </h2>
            <p className="text-slate-400 text-xs font-medium">
              {frente.projectName} (Contrato: {frente.contractNo})
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold px-4 py-2.5 rounded transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            className="bg-primary hover:bg-primary-container text-white text-xs font-bold px-5 py-2.5 rounded shadow transition-all flex items-center gap-1.5"
          >
            <CheckCircle2 size={15} />
            Guardar Cambios
          </button>
        </div>
      </section>

      {/* Main Grid content */}
      <div className="flex flex-col gap-6">
        
        {/* Top Panel: Avances e Indicadores */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Activity size={16} className="text-primary" />
            Avances e Indicadores Semanales (Consolidado)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Avance Físico % */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-650">Porcentaje de Avance Físico</label>
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs font-extrabold px-2.5 py-0.5 rounded-full font-mono">
                  {porcentajeAvance}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="1"
                  value={porcentajeAvance}
                  onChange={(e) => setPorcentajeAvance(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <input 
                  type="number" 
                  min="0" 
                  max="100"
                  value={porcentajeAvance}
                  onChange={(e) => setPorcentajeAvance(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                  className="w-16 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-center font-bold font-mono text-slate-700 focus:outline-none focus:bg-white"
                />
              </div>
            </div>

            {/* Inversión Financiera */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-650">Inversión en la Semana (COP)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">$</span>
                <input 
                  type="number"
                  min="0"
                  value={ejecucionPresupuestal}
                  onChange={(e) => setEjecucionPresupuestal(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-50 border border-slate-200 rounded pl-7 pr-3 py-1.5 text-xs font-bold font-mono text-slate-700 focus:bg-white focus:outline-none"
                  placeholder="Monto de inversión"
                />
              </div>
              <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                Valor: <strong className="text-slate-650 font-mono-numbers">{formatCOP(ejecucionPresupuestal)}</strong>
              </span>
            </div>

            {/* PMT Dropdown */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-650">Estado del PMT</label>
              <select 
                value={pmtEstado}
                onChange={(e) => setPmtEstado(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer focus:bg-white focus:outline-none"
              >
                <option value="Aprobado">Aprobado</option>
                <option value="En revisión">En revisión</option>
                <option value="Suspendido">Suspendido</option>
                <option value="No requerido">No requerido</option>
              </select>
            </div>

            {/* Perfil de Estructura de Suelo Upload */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-650">Diseño Estructura Suelo</label>
              {perfilSueloImgUrl ? (
                <div className="relative border border-slate-200 rounded p-1 flex items-center gap-2 bg-slate-50 h-[34px]">
                  <img src={perfilSueloImgUrl} alt="Perfil" className="w-8 h-8 object-cover rounded" />
                  <span className="text-[9px] font-bold text-slate-500 truncate flex-1">Imagen cargada</span>
                  <button 
                    type="button"
                    onClick={() => setPerfilSueloImgUrl('')}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                    title="Eliminar imagen"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border border-dashed border-slate-300 hover:bg-slate-50 rounded p-1 text-center cursor-pointer min-h-[34px] bg-slate-50/50">
                  <div className="flex items-center gap-1">
                    <Plus size={12} className="text-slate-400" />
                    <span className="text-[9.5px] font-bold text-slate-500">Subir Plano/Diseño</span>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const base64 = await compressImage(file);
                          const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
                          const fileName = `perfil_${Date.now()}_${cleanName}`;
                          
                          let finalUrl = base64;
                          
                          let uploadedToSupabase = false;
                          if (supabaseConfig && supabaseConfig.supabaseUrl && supabaseConfig.supabaseKey) {
                            try {
                              const cloudUrl = await uploadToSupabase(
                                supabaseConfig.supabaseUrl,
                                supabaseConfig.supabaseKey,
                                supabaseConfig.supabaseBucket || 'frentes-fotos',
                                `semana_${report.numero_semana}/frente_${frente.id}/${fileName}`,
                                base64
                              );
                              finalUrl = cloudUrl;
                              uploadedToSupabase = true;
                            } catch (sErr) {
                              console.error("Error uploading soil profile to Supabase:", sErr);
                            }
                          }

                          if (!uploadedToSupabase) {
                            try {
                              const response = await fetch('/api/upload-photo', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  semana: report.numero_semana,
                                  frenteId: frente.id,
                                  fileName: fileName,
                                  base64: base64
                                })
                              });
                              if (response.ok) {
                                const result = await response.json();
                                const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                                if (result.url && isLocal) {
                                  finalUrl = result.url;
                                }
                              }
                            } catch (apiErr) {
                              console.warn("Could not save to server, using base64:", apiErr);
                            }
                          }
                          setPerfilSueloImgUrl(finalUrl);
                        } catch (err) {
                          console.error("Error uploading soil profile:", err);
                        }
                      }
                    }}
                    className="hidden" 
                  />
                </label>
              )}
            </div>

            {/* Tramo / Ubicación Info */}
            <div className="flex flex-col gap-1 justify-center bg-slate-50 border border-slate-150 rounded px-4 py-2 text-xs">
              <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Límites del Tramo</span>
              <p className="text-slate-750 font-bold leading-tight">
                Desde: <strong className="text-slate-900">{frente.desde || 'N/A'}</strong> <br/> Hasta: <strong className="text-slate-900">{frente.hasta || 'N/A'}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Consolidado Semanal Textarea */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <FileText size={16} className="text-primary" />
            Consolidado Semanal de Actividades (Hitos)
          </h3>
          <textarea
            rows={2}
            className="w-full bg-slate-50/50 border border-slate-200 rounded px-3 py-2 text-xs leading-relaxed font-semibold focus:bg-white focus:outline-none resize-y"
            placeholder="Resumen general de hitos logrados en la semana completa..."
            value={hitos}
            onChange={(e) => setHitos(e.target.value)}
          />
        </div>

        {/* DAY-BY-DAY BITACORA AND PHOTO GALLERY (The requested feature) */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
            <Calendar size={18} className="text-primary" />
            Bitácora Diaria y Registro Fotográfico por Día
          </h3>

          {/* Days Tabs (Saturday to Friday) */}
          <div className="flex flex-wrap border-b border-slate-200 mb-6 bg-slate-50/50 p-1.5 rounded-lg gap-1.5 shadow-inner">
            {weekDates.map((date, idx) => {
              const dateStr = date.toISOString().split('T')[0];
              const name = getDayName(date);
              const label = getDayLabel(date);
              
              // Group indicators
              const hasNote = bitacoraNotas.some(n => n.date === dateStr && n.note.trim() !== '');
              const photoCount = fotos.filter(f => f.date === dateStr).length;
              const isSunday = date.getDay() === 0;

              return (
                <button
                  key={idx}
                  onClick={() => setActiveDayIdx(idx)}
                  className={`flex-1 min-w-[100px] flex flex-col items-center justify-center py-2 px-3 rounded transition-all text-center relative border border-transparent ${
                    activeDayIdx === idx
                      ? 'bg-primary text-white font-extrabold shadow border-primary/20 scale-[1.02]'
                      : isSunday 
                        ? 'bg-red-50 hover:bg-red-100/70 text-red-700' 
                        : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 border-slate-150 hover:border-slate-200'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold tracking-wide">
                    {name}
                  </span>
                  <span className={`text-[11px] font-bold mt-0.5 ${activeDayIdx === idx ? 'text-white' : 'text-slate-400'}`}>
                    {label}
                  </span>

                  {/* Badges indicators */}
                  <div className="flex gap-1 mt-1.5">
                    {hasNote && (
                      <span className={`w-3.5 h-3.5 flex items-center justify-center rounded-full text-[8px] font-bold border ${
                        activeDayIdx === idx ? 'bg-white text-primary border-white' : 'bg-blue-50 text-blue-700 border-blue-100'
                      }`} title="Con novedades escritas">
                        📝
                      </span>
                    )}
                    {photoCount > 0 && (
                      <span className={`h-3.5 px-1 flex items-center justify-center rounded-full text-[8px] font-bold border ${
                        activeDayIdx === idx ? 'bg-white text-primary border-white' : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                      }`} title={`${photoCount} fotos`}>
                        📷 {photoCount}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Day Content Panel */}
          {weekDates[activeDayIdx] && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/20 p-5 border border-slate-150 rounded-lg animate-fade-in">
              
              {/* Left Side: Daily Log Notes (7/12 width) */}
              <div className="lg:col-span-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={15} className="text-primary" />
                    Bitácora Diaria — {getDayName(weekDates[activeDayIdx])} {getDayLabel(weekDates[activeDayIdx])}
                  </h4>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">
                    {activeDateStr}
                  </span>
                </div>

                <textarea
                  rows={8}
                  className="w-full bg-white border border-slate-200 rounded-lg p-3 text-xs leading-relaxed font-semibold focus:outline-none focus:ring-1 focus:ring-primary shadow-sm resize-none"
                  placeholder={`Describa detalladamente el avance técnico, el clima, maquinaria, ensayos y personal de este día en la obra...`}
                  value={activeDayNote}
                  onChange={(e) => handleActiveDayNoteChange(e.target.value)}
                />

                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                  <HelpCircle size={14} className="text-slate-350" />
                  <span>Los apuntes diarios se asocian automáticamente a la fecha y se guardan al guardar el informe.</span>
                </div>
              </div>

              {/* Right Side: Upload and Photos Grid (5/12 width) */}
              <div className="lg:col-span-6 border-t lg:border-t-0 lg:border-l border-slate-200 pt-6 lg:pt-0 lg:pl-6 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon size={15} className="text-primary" />
                    Registro Fotográfico ({activeDayPhotos.length})
                  </h4>

                  <label className="bg-primary/5 hover:bg-primary/10 text-primary border border-primary/15 font-bold text-[10px] px-2.5 py-1 rounded-md cursor-pointer transition-all inline-flex items-center gap-1">
                    <Plus size={12} />
                    Subir Fotos
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handlePhotoUpload}
                    />
                  </label>
                </div>

                {activeDayPhotos.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center text-slate-400 bg-white flex-1 flex flex-col items-center justify-center min-h-[220px]">
                    <ImageIcon size={28} className="text-slate-300 mb-1.5" />
                    <p className="text-[11px] font-bold text-slate-650">No hay fotos para el {getDayName(weekDates[activeDayIdx])}.</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Las fotos subidas aquí quedarán ordenadas en la carpeta de este día.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[350px] pr-1">
                    {activeDayPhotos.map((foto, index) => (
                      <div 
                        key={foto.id} 
                        className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col group relative"
                      >
                        <div className="aspect-square bg-slate-955 relative overflow-hidden flex items-center justify-center">
                          <img 
                            src={foto.url} 
                            alt="Diaria de obra" 
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-350"
                          />
                          <button
                            onClick={() => setLightboxIndex(index)}
                            className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-0.5"
                          >
                            <Eye size={12} /> Ampliar
                          </button>
                          <button
                            onClick={() => handleDeletePhoto(foto.id)}
                            className="absolute top-1.5 right-1.5 bg-red-600 hover:bg-red-750 text-white p-1 rounded-full shadow transition-all opacity-0 group-hover:opacity-100"
                            title="Eliminar"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>

                        <div className="p-2 bg-slate-50/50 flex-1 flex flex-col">
                          <input 
                            type="text"
                            placeholder="Descripción..."
                            value={foto.caption || ''}
                            onChange={(e) => handleUpdateCaption(foto.id, e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-[9px] font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary mt-auto"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

      </div>

      {/* LIGHTBOX Carousel Modal */}
      {lightboxIndex !== null && activeDayPhotos.length > 0 && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center p-4 select-none">
          {/* Top Info */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center text-white z-10">
            <div>
              <h4 className="font-extrabold font-headline-lg text-sm text-slate-100">
                Visualizador de Obra — {getDayName(weekDates[activeDayIdx])}
              </h4>
              <p className="text-[10px] text-slate-400 font-medium">
                CIV {frente.civ} — Fecha: {activeDateStr}
              </p>
            </div>
            
            <button 
              onClick={() => setLightboxIndex(null)}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-all text-slate-300 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Left Arrow */}
          <button 
            onClick={handlePrevPhoto}
            className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-slate-900/60 hover:bg-slate-850 text-white rounded-full transition-all border border-slate-800 shadow z-10"
          >
            <ChevronLeft size={24} />
          </button>

          {/* Right Arrow */}
          <button 
            onClick={handleNextPhoto}
            className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-slate-900/60 hover:bg-slate-850 text-white rounded-full transition-all border border-slate-800 shadow z-10"
          >
            <ChevronRight size={24} />
          </button>

          {/* Large Image */}
          <div className="max-w-4xl max-h-[70vh] flex flex-col items-center justify-center p-2">
            <img 
              src={activeDayPhotos[lightboxIndex].url} 
              alt="Ampliada" 
              className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-2xl border border-slate-800"
            />
          </div>

          {/* Caption Overlay */}
          <div className="mt-6 max-w-2xl text-center px-4 space-y-2">
            <p className="text-white text-sm font-semibold leading-relaxed">
              {activeDayPhotos[lightboxIndex].caption || <span className="text-slate-500 italic">Sin descripción asignada</span>}
            </p>
            <div className="flex justify-center items-center gap-2 text-[10px] text-slate-400 font-bold font-mono">
              <span>Foto {lightboxIndex + 1} de {activeDayPhotos.length}</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Inline help icon sub-component
function HelpCircle({ size = 14, className = "" }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
