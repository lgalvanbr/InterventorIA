import React, { useState, useEffect } from 'react';
import { Camera, Save, CheckCircle, Image as ImageIcon, ChevronLeft, ChevronRight, Calendar, FileText, Trash2, ArrowRight } from 'lucide-react';

export default function InspectorPortal({ 
  weeklyReports, 
  onSaveFrenteData 
}) {
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [projectTypeFilter, setProjectTypeFilter] = useState('all'); // 'all', 'malla', 'espacio'
  const [selectedFrenteId, setSelectedFrenteId] = useState('');
  const [activeDayIdx, setActiveDayIdx] = useState(0); // 0 = Saturday, ..., 6 = Friday
  const [dailyNote, setDailyNote] = useState('');
  const [fotos, setFotos] = useState([]);
  const [bitacoraNotes, setBitacoraNotes] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  // Initialize selected week based on current date
  useEffect(() => {
    if (weeklyReports.length > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      const matchingReport = weeklyReports.find(r => 
        todayStr >= r.fecha_inicial_corte && todayStr <= r.fecha_final_corte
      );
      if (matchingReport) {
        setSelectedReportId(matchingReport.id_informe);
      } else {
        setSelectedReportId(weeklyReports[weeklyReports.length - 1].id_informe);
      }
    }
  }, [weeklyReports]);

  const currentReport = weeklyReports.find(r => r.id_informe === selectedReportId) || null;
  const frentes = currentReport ? currentReport.frentes : [];
  
  const filteredFrentes = frentes.filter(f => {
    if (projectTypeFilter === 'malla') return f.id.startsWith('f_mv');
    if (projectTypeFilter === 'espacio') return f.id.startsWith('f_ep');
    return true;
  });

  const activeFrente = frentes.find(f => f.id === selectedFrenteId) || null;

  // Calculate week dates starting from report.fecha_inicial_corte
  const weekDates = [];
  if (currentReport?.fecha_inicial_corte) {
    const start = new Date(currentReport.fecha_inicial_corte + 'T12:00:00');
    for (let i = 0; i < 7; i++) {
      const current = new Date(start);
      current.setDate(start.getDate() + i);
      weekDates.push(current);
    }
  }

  const activeDateStr = weekDates[activeDayIdx] 
    ? weekDates[activeDayIdx].toISOString().split('T')[0] 
    : '';

  // Synchronize state when selected frente changes
  useEffect(() => {
    if (activeFrente) {
      setFotos(activeFrente.fotos || []);
      setBitacoraNotes(activeFrente.bitacora_notes || []);
    } else {
      setFotos([]);
      setBitacoraNotes([]);
    }
    setDailyNote('');
  }, [selectedFrenteId, activeFrente]);

  // Synchronize note when active day changes
  useEffect(() => {
    const currentNote = bitacoraNotes.find(n => n.date === activeDateStr)?.note || '';
    setDailyNote(currentNote);
  }, [activeDayIdx, bitacoraNotes, activeDateStr]);

  const getDayName = (date) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[date.getDay()];
  };

  const getDayLabel = (date) => {
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  };

  // Image compressor helper
  const compressImage = (file, maxWidth = 1024, maxHeight = 768, quality = 0.8) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Preserve ratio
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
      };
    });
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // Get Supabase config from localStorage with defaults
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
    if (!selectedFrenteId) {
      alert("Por favor, selecciona un frente primero.");
      return;
    }
    const files = Array.from(e.target.files);
    setIsCompressing(true);
    
    const uploadedPhotos = [];
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        try {
          // Compress local photo before sending to API
          const base64 = await compressImage(file);
          const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
          const fileName = `${Date.now()}_${cleanName}`;
          
          let previewUrl = base64; // Default to compressed base64
          
          let uploadedToSupabase = false;
          if (supabaseConfig && supabaseConfig.supabaseUrl && supabaseConfig.supabaseKey) {
            try {
              const cloudUrl = await uploadToSupabase(
                supabaseConfig.supabaseUrl,
                supabaseConfig.supabaseKey,
                supabaseConfig.supabaseBucket || 'frentes-fotos',
                `semana_${currentReport.numero_semana}/frente_${selectedFrenteId}/${fileName}`,
                base64
              );
              previewUrl = cloudUrl;
              uploadedToSupabase = true;
            } catch (sErr) {
              console.error("Error uploading to Supabase from portal, falling back:", sErr);
            }
          }

          if (!uploadedToSupabase) {
            try {
              const response = await fetch('/api/upload-photo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  semana: currentReport.numero_semana,
                  frenteId: selectedFrenteId,
                  fileName: fileName,
                  base64: base64,
                  bucket: supabaseConfig.supabaseBucket || 'frentes-fotos'
                })
              });
              if (response.ok) {
                const result = await response.json();
                if (result.url) {
                  previewUrl = result.url;
                }
              } else {
                const errResult = await response.json().catch(() => ({}));
                alert(`Error al subir la foto al servidor: ${errResult.details || errResult.error || 'Error desconocido'}`);
              }
            } catch (netErr) {
              console.warn("API offline, using base64 preview:", netErr);
            }
          }

          uploadedPhotos.push({
            id: Date.now() + Math.random().toString(36).substring(2, 11),
            url: previewUrl,
            caption: '',
            date: activeDateStr
          });
        } catch (err) {
          console.error("Error compressing or uploading photo:", err);
        }
      }
    }
    setFotos(prev => [...prev, ...uploadedPhotos]);
    setIsCompressing(false);
  };

  const handleUpdateCaption = (photoId, text) => {
    setFotos(prev => prev.map(f => f.id === photoId ? { ...f, caption: text } : f));
  };

  const handleDeletePhoto = (photoId) => {
    setFotos(prev => prev.filter(f => f.id !== photoId));
  };

  // Auto-save helper to preserve any pending inspector changes before changing frente, date/day or week
  const saveCurrentFrenteDataSilently = async (overrideFrenteId, overrideReportId) => {
    const frenteIdToSave = overrideFrenteId || selectedFrenteId;
    const reportIdToSave = overrideReportId || currentReport?.id_informe;

    if (!frenteIdToSave || !reportIdToSave) return;

    let finalNotes = [...bitacoraNotes];
    if (activeDateStr) {
      const noteExists = finalNotes.some(n => n.date === activeDateStr);
      if (noteExists) {
        finalNotes = finalNotes.map(n => n.date === activeDateStr ? { ...n, note: dailyNote } : n);
      } else if (dailyNote.trim() !== '') {
        finalNotes = [
          { id: Date.now(), date: activeDateStr, note: dailyNote },
          ...finalNotes
        ];
      }
    }

    try {
      await onSaveFrenteData(reportIdToSave, frenteIdToSave, {
        fotos: fotos,
        bitacora_notes: finalNotes,
        bitacora_notas: finalNotes
      });
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 2000);
    } catch (err) {
      console.error("Error al guardar automáticamente los cambios del frente:", err);
    }
  };

  const handleReportChange = async (newReportId) => {
    if (newReportId === selectedReportId) return;
    await saveCurrentFrenteDataSilently();
    setSelectedReportId(newReportId);
    setSelectedFrenteId('');
  };

  const handleFilterChange = async (newFilter) => {
    if (newFilter === projectTypeFilter) return;
    await saveCurrentFrenteDataSilently();
    setProjectTypeFilter(newFilter);
  };

  const handleFrenteChange = async (newFrenteId) => {
    if (newFrenteId === selectedFrenteId) return;
    await saveCurrentFrenteDataSilently();
    setSelectedFrenteId(newFrenteId);
  };

  const handlePrevFrente = async () => {
    if (filteredFrentes.length === 0) return;
    await saveCurrentFrenteDataSilently();
    const currentIndex = filteredFrentes.findIndex(f => f.id === selectedFrenteId);
    let nextIndex = currentIndex - 1;
    if (nextIndex < 0) {
      nextIndex = filteredFrentes.length - 1; // wrap around
    }
    setSelectedFrenteId(filteredFrentes[nextIndex].id);
  };

  const handleNextFrente = async () => {
    if (filteredFrentes.length === 0) return;
    await saveCurrentFrenteDataSilently();
    const currentIndex = filteredFrentes.findIndex(f => f.id === selectedFrenteId);
    let nextIndex = currentIndex + 1;
    if (nextIndex >= filteredFrentes.length || currentIndex === -1) {
      nextIndex = 0; // wrap around
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
        alert("No se pudo acceder al portapapeles automáticamente. Por favor, mantén presionado el cuadro de texto para pegar manualmente.");
      });
  };

  const handleSave = async () => {
    if (!selectedFrenteId) return;
    setIsSaving(true);

    // Merge notes
    const noteExists = bitacoraNotes.some(n => n.date === activeDateStr);
    let finalNotes = [...bitacoraNotes];
    if (noteExists) {
      finalNotes = finalNotes.map(n => n.date === activeDateStr ? { ...n, note: dailyNote } : n);
    } else if (dailyNote.trim() !== '') {
      finalNotes.push({ id: Date.now(), date: activeDateStr, note: dailyNote });
    }

    try {
      await onSaveFrenteData(currentReport.id_informe, selectedFrenteId, {
        fotos: fotos,
        bitacora_notes: finalNotes,
        bitacora_notas: finalNotes
      });
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Error al guardar el reporte.");
    } finally {
      setIsSaving(false);
    }
  };

  const activeDayPhotos = fotos.filter(f => f.date === activeDateStr);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Portal Header */}
      <header className="bg-primary text-white px-4 py-3 shadow-md flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Camera className="text-white" size={20} />
          <div>
            <h1 className="font-extrabold text-sm tracking-wide uppercase">Portal de Inspectores</h1>
            <p className="text-[10px] opacity-75">Usaquén • Control Diario de Frentes</p>
          </div>
        </div>
        {currentReport && (
          <span className="bg-white/20 text-[10px] font-black uppercase px-2 py-0.5 rounded border border-white/10">
            Semana {currentReport.numero_semana}
          </span>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 p-4 max-w-lg mx-auto w-full flex flex-col gap-4">
        
        {/* Week Selector Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Seleccionar Semana de Reporte
          </label>
          <select
            value={selectedReportId || ''}
            onChange={(e) => handleReportChange(Number(e.target.value))}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            {weeklyReports.map(r => (
              <option key={r.id_informe} value={r.id_informe}>
                Semana {r.numero_semana} ({r.fecha_inicial_corte} al {r.fecha_final_corte})
              </option>
            ))}
          </select>
        </div>

        {/* Step 1: Select Frente */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
            1. Seleccionar Frente de Obra
          </label>
          
          {/* Project Type Filter Buttons */}
          <div className="flex gap-1.5 mb-3">
            <button
              type="button"
              onClick={() => handleFilterChange('all')}
              className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded-lg border transition-all text-center ${
                projectTypeFilter === 'all'
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => handleFilterChange('malla')}
              className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded-lg border transition-all text-center ${
                projectTypeFilter === 'malla'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'
              }`}
            >
              Malla Vial
            </button>
            <button
              type="button"
              onClick={() => handleFilterChange('espacio')}
              className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded-lg border transition-all text-center ${
                projectTypeFilter === 'espacio'
                  ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'
              }`}
            >
              Espacio Público
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevFrente}
              disabled={filteredFrentes.length <= 1}
              className="bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed p-2.5 rounded-lg border border-slate-200 text-slate-700 flex items-center justify-center shrink-0"
              title="Frente anterior"
            >
              <ChevronLeft size={20} />
            </button>

            <select 
              value={selectedFrenteId}
              onChange={(e) => handleFrenteChange(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-800 font-bold focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
            >
              <option value="" disabled>-- Selecciona un frente ({filteredFrentes.length}) --</option>
              {filteredFrentes.map(f => (
                <option key={f.id} value={f.id}>
                  Frente {f.frente} • CIV {f.civ} — {f.eje}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleNextFrente}
              disabled={filteredFrentes.length <= 1}
              className="bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed p-2.5 rounded-lg border border-slate-200 text-slate-700 flex items-center justify-center shrink-0"
              title="Siguiente frente"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {activeFrente && (
            <div className="mt-3 p-3 bg-primary/5 border border-primary/10 rounded-lg text-[11px] text-slate-600 space-y-1">
              <p><strong>Contrato:</strong> {activeFrente.contractNo}</p>
              <p><strong>Tramo:</strong> {activeFrente.desde} hasta {activeFrente.hasta}</p>
            </div>
          )}
        </div>

        {selectedFrenteId ? (
          <>
            {/* Step 2: Select Day */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                2. Seleccionar Día del Reporte
              </label>
              
              {/* Horizontal Day Picker (Swipeable/Scrollable) */}
              <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                {weekDates.map((date, idx) => {
                  const isActive = activeDayIdx === idx;
                  const dayName = getDayName(date);
                  const dayLabel = getDayLabel(date);
                  
                  // Check if day already has notes or photos
                  const dStr = date.toISOString().split('T')[0];
                  const hasNote = bitacoraNotes.some(n => n.date === dStr && n.note.trim() !== '');
                  const hasPhotos = fotos.some(f => f.date === dStr);

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleDayChange(idx)}
                      className={`flex flex-col items-center justify-center min-w-[62px] py-2 px-1.5 rounded-lg border text-center transition-all relative shrink-0 ${
                        isActive 
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-[9px] font-black uppercase tracking-wider opacity-85">
                        {dayName.substring(0, 3)}
                      </span>
                      <span className="text-xs font-extrabold mt-0.5">
                        {dayLabel}
                      </span>
                      
                      {/* Dots indicating content */}
                      <div className="flex gap-0.5 absolute bottom-1">
                        {hasNote && <span className={`w-1 h-1 rounded-full ${isActive ? 'bg-white' : 'bg-primary'}`}></span>}
                        {hasPhotos && <span className={`w-1 h-1 rounded-full ${isActive ? 'bg-amber-300' : 'bg-amber-500'}`}></span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Daily Log text */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-2">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  3. Bitácora Diaria ({getDayName(weekDates[activeDayIdx])})
                </label>
                <button
                  type="button"
                  onClick={handlePasteText}
                  className="text-[9px] font-black text-primary bg-primary/5 hover:bg-primary/10 px-2 py-1 rounded border border-primary/10 flex items-center gap-1 transition-all"
                  title="Pegar del portapapeles"
                >
                  <span className="material-symbols-outlined text-[12px]">content_paste</span>
                  Pegar
                </button>
              </div>
              <textarea
                value={dailyNote}
                onChange={(e) => handleActiveDayNoteChange(e.target.value)}
                placeholder="Escribe aquí los trabajos realizados hoy, maquinaria activa, personal, clima o cualquier novedad..."
                rows={4}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 focus:ring-1 focus:ring-primary focus:outline-none leading-relaxed"
              />
            </div>

            {/* Step 4: Photo uploads */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  4. Registro Fotográfico ({activeDayPhotos.length})
                </label>
                
                <label className={`bg-primary hover:bg-primary-container text-white text-[11px] font-black px-3.5 py-2 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 shadow-sm ${
                  isCompressing ? 'opacity-50 cursor-not-allowed' : ''
                }`}>
                  <Camera size={14} />
                  {isCompressing ? 'Procesando...' : 'Tomar / Subir Foto'}
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handlePhotoUpload}
                    disabled={isCompressing}
                  />
                </label>
              </div>

              {activeDayPhotos.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 bg-slate-50/50 flex flex-col items-center justify-center min-h-[140px]">
                  <ImageIcon size={24} className="text-slate-300 mb-1.5" />
                  <p className="text-[10px] font-bold text-slate-650">No hay fotos subidas hoy.</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Usa el botón de arriba para registrar avances visuales.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {activeDayPhotos.map((foto) => (
                    <div 
                      key={foto.id} 
                      className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 shadow-sm flex flex-col relative"
                    >
                      <div className="aspect-square bg-slate-900 relative overflow-hidden flex items-center justify-center">
                        <img 
                          src={foto.url} 
                          alt="Avance de obra diario" 
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => handleDeletePhoto(foto.id)}
                          className="absolute top-1.5 right-1.5 bg-red-600 hover:bg-red-750 text-white p-1.5 rounded-full shadow transition-all"
                          title="Eliminar"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                      <div className="p-2 bg-white flex-1 flex flex-col">
                        <input 
                          type="text"
                          placeholder="Descripción..."
                          value={foto.caption || ''}
                          onChange={(e) => handleUpdateCaption(foto.id, e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[9px] font-semibold text-slate-700 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary mt-auto"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sticky/Big Save Button */}
            <div className="mt-2 mb-6">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <Save size={18} />
                {isSaving ? 'Guardando cambios...' : 'Guardar Reporte Diario'}
              </button>
            </div>
          </>
        ) : (
          <div className="bg-slate-100 border border-slate-200 rounded-xl p-8 text-center text-slate-400 mt-4 flex flex-col items-center justify-center min-h-[220px]">
            <FileText size={32} className="text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-650">Selecciona un frente para comenzar a reportar.</p>
            <p className="text-[10px] text-slate-400 mt-1">Podrás cargar fotos y rellenar la bitácora diaria del frente elegido.</p>
          </div>
        )}
      </main>

      {/* Success Modal Toast */}
      {isSuccess && (
        <div className="fixed bottom-6 left-4 right-4 bg-emerald-600 text-white font-bold px-4 py-3 rounded-lg shadow-2xl flex items-center justify-center gap-2 z-50 animate-bounce">
          <CheckCircle size={18} />
          <span className="text-xs">Reporte guardado de forma permanente.</span>
        </div>
      )}
    </div>
  );
}
