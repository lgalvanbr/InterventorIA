import React, { useState, useEffect } from 'react';
import { Trash2, X } from 'lucide-react';
import MapView from './MapView';
import ComplianceTabs from './ComplianceTabs';
import PhotoGallery from './PhotoGallery';

// Helper to initialize compliance list of checks for Colombian regulations
const getDefaultCompliance = () => {
  return {
    tecnico: {
      checklist: [
        { id: 't1', label: 'Verificar planos de construcción aprobados para el frente', checked: false },
        { id: 't2', label: 'Controlar ensayos de calidad de materiales (concreto, acero, etc.)', checked: false },
        { id: 't3', label: 'Revisar bitácora diaria de obra de este frente', checked: false },
        { id: 't4', label: 'Comprobar rendimiento y avance físico vs programación contractual', checked: false }
      ],
      notes: ''
    },
    financiero: {
      checklist: [
        { id: 'f1', label: 'Verificar actas de medición de cantidades de obra ejecutada', checked: false },
        { id: 'f2', label: 'Revisar amortización del anticipo asignado al frente', checked: false },
        { id: 'f3', label: 'Controlar balance de presupuesto y costos extras del frente', checked: false },
        { id: 'f4', label: 'Verificar aprobación de facturas por interventoría', checked: false }
      ],
      notes: ''
    },
    administrativo: {
      checklist: [
        { id: 'a1', label: 'Verificar registro de asistencia del personal asignado', checked: false },
        { id: 'a2', label: 'Revisar diario de obra / Bitácora firmado por residentes', checked: false },
        { id: 'a3', label: 'Controlar listado de maquinaria activa en el frente', checked: false },
        { id: 'a4', label: 'Revisar cumplimiento del cronograma detallado', checked: false }
      ],
      notes: ''
    },
    legal: {
      checklist: [
        { id: 'l1', label: 'Verificar vigencia y cobertura de las pólizas de seguro del contrato', checked: false },
        { id: 'l2', label: 'Revisar otrosíes o actas de suspensión/modificación aplicables', checked: false },
        { id: 'l3', label: 'Verificar pago de aportes parafiscales y seguridad social del personal', checked: false },
        { id: 'l4', label: 'Inspeccionar cumplimiento del objeto contractual en este frente', checked: false }
      ],
      notes: ''
    },
    ambiental: {
      checklist: [
        { id: 'am1', label: 'Inspeccionar el Plan de Manejo Ambiental (PMA)', checked: false },
        { id: 'am2', label: 'Verificar manejo de escombros y disposición final (certificados de botadero)', checked: false },
        { id: 'am3', label: 'Revisar control de emisiones de polvo y ruido', checked: false },
        { id: 'am4', label: 'Comprobar limpieza y orden ambiental en el frente', checked: false }
      ],
      notes: ''
    },
    social: {
      checklist: [
        { id: 's1', label: 'Verificar actas de socialización previas con la vecindad/comunidad', checked: false },
        { id: 's2', label: 'Atender y registrar PQRS (Peticiones, Quejas, Reclamos) del sector', checked: false },
        { id: 's3', label: 'Verificar porcentaje de mano de obra local contratada', checked: false },
        { id: 's4', label: 'Revisar actas de vecindad levantadas antes del inicio', checked: false }
      ],
      notes: ''
    },
    sst: {
      checklist: [
        { id: 'sst1', label: 'Inspeccionar uso obligatorio de EPP completo por el personal', checked: false },
        { id: 'sst2', label: 'Verificar planillas de afiliación a ARL, EPS y Pensión al día', checked: false },
        { id: 'sst3', label: 'Revisar realización de la charla diaria de seguridad (5 minutos)', checked: false },
        { id: 'sst4', label: 'Monitorear señalización de peligro y cerramientos de seguridad activos', checked: false }
      ],
      notes: ''
    }
  };
};

export default function ProjectDetail({ 
  project, 
  onBack, 
  onUpdateProject, 
  isUnified = false,
  activeFrenteId: controlledActiveFrenteId = null,
  onFrenteSelect: controlledOnFrenteSelect = null,
  onResetToUnified = null
}) {
  const [localActiveFrenteId, setLocalActiveFrenteId] = useState(
    project.frentes && project.frentes.length > 0 ? project.frentes[0].id : null
  );

  const [frentesFilter, setFrentesFilter] = useState('all'); // 'all', 'vial', 'espacio'

  const activeFrenteId = controlledActiveFrenteId !== null
    ? controlledActiveFrenteId 
    : localActiveFrenteId;

  const setActiveFrenteId = (id) => {
    if (controlledOnFrenteSelect) {
      controlledOnFrenteSelect(id);
    } else {
      setLocalActiveFrenteId(id);
    }
  };

  useEffect(() => {
    if (project.frentes && project.frentes.length > 0) {
      const exists = project.frentes.some(f => f.id === activeFrenteId);
      if (!exists) {
        setLocalActiveFrenteId(project.frentes[0].id);
      }
    } else {
      setLocalActiveFrenteId(null);
    }
  }, [project]);

  // Filter frentes by type in unified mode
  const filteredFrentes = (project.frentes || []).filter(f => {
    if (frentesFilter === 'vial') return f.id.includes('mv');
    if (frentesFilter === 'espacio') return f.id.includes('ep');
    return true;
  });

  const [showFrenteModal, setShowFrenteModal] = useState(false);
  const [isMapLocatingMode, setIsMapLocatingMode] = useState(false);

  // Frente Form State
  const [frenteName, setFrenteName] = useState('');
  const [frenteDesc, setFrenteDesc] = useState('');
  const [frenteLat, setFrenteLat] = useState('4.6097');
  const [frenteLng, setFrenteLng] = useState('-74.0817');
  const [frenteSupervisor, setFrenteSupervisor] = useState('');
  const [frenteProgress, setFrenteProgress] = useState('0');
  const [frenteStatus, setFrenteStatus] = useState('al-dia');
  const [frentePlannedProgress, setFrentePlannedProgress] = useState('0');

  const activeFrente = project.frentes?.find(f => f.id === activeFrenteId) || null;

  const formatCOP = (num) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(num);
  };

  const handleCreateFrente = (e) => {
    e.preventDefault();

    const newFrente = {
      id: 'frente_' + Date.now(),
      name: frenteName,
      description: frenteDesc,
      latitude: frenteLat || '4.6097',
      longitude: frenteLng || '-74.0817',
      supervisor: frenteSupervisor || 'Residente de Interventoría',
      progress: parseInt(frenteProgress) || 0,
      plannedProgress: parseInt(frentePlannedProgress) || 0,
      status: frenteStatus,
      concreteTests: [],
      pagaMetrics: {
        co2Emissions: 1.2,
        localLabor: 80,
        femaleLabor: 25,
        machineryHours: 15
      },
      financialMetrics: {
        totalBudget: 450000000,
        executedBudget: 0,
        advanceAmortized: 20
      },
      compliance: getDefaultCompliance(),
      photos: []
    };

    const updatedFrentes = [...(project.frentes || []), newFrente];
    onUpdateProject({
      ...project,
      frentes: updatedFrentes
    });

    setActiveFrenteId(newFrente.id);
    resetFrenteForm();
  };

  const resetFrenteForm = () => {
    setFrenteName('');
    setFrenteDesc('');
    setFrenteLat('4.6097');
    setFrenteLng('-74.0817');
    setFrenteSupervisor('');
    setFrenteProgress('0');
    setFrentePlannedProgress('0');
    setFrenteStatus('al-dia');
    setShowFrenteModal(false);
    setIsMapLocatingMode(false);
  };

  const handleDeleteFrente = (frenteId) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este frente de obra? Se perderán todos sus datos y fotos documentales.')) return;

    const updatedFrentes = project.frentes.filter(f => f.id !== frenteId);
    onUpdateProject({
      ...project,
      frentes: updatedFrentes
    });

    if (activeFrenteId === frenteId) {
      setActiveFrenteId(updatedFrentes.length > 0 ? updatedFrentes[0].id : null);
    }
  };

  // Callback from Map click to set coordinates
  const handleLocationFromMap = (lat, lng) => {
    setFrenteLat(lat);
    setFrenteLng(lng);
    setIsMapLocatingMode(false);
    setShowFrenteModal(true); // Re-open the modal with the lat/lng updated
  };

  // Update compliance check/notes
  const handleUpdateCompliance = (frenteId, componentKey, updatedComponentData) => {
    const updatedFrentes = project.frentes.map(f => {
      if (f.id === frenteId) {
        return {
          ...f,
          compliance: {
            ...f.compliance,
            [componentKey]: updatedComponentData
          }
        };
      }
      return f;
    });

    onUpdateProject({
      ...project,
      frentes: updatedFrentes
    });
  };

  // Update specific frente data fields (concreteTests, pagaMetrics, etc.)
  const handleUpdateFrenteData = (frenteId, updatedData) => {
    const updatedFrentes = project.frentes.map(f => {
      if (f.id === frenteId) {
        return {
          ...f,
          ...updatedData
        };
      }
      return f;
    });

    onUpdateProject({
      ...project,
      frentes: updatedFrentes
    });
  };

  // Add photographic evidence
  const handleAddPhoto = (frenteId, newPhoto) => {
    const updatedFrentes = project.frentes.map(f => {
      if (f.id === frenteId) {
        return {
          ...f,
          photos: [newPhoto, ...(f.photos || [])]
        };
      }
      return f;
    });

    onUpdateProject({
      ...project,
      frentes: updatedFrentes
    });
  };

  // Delete photographic evidence
  const handleDeletePhoto = (frenteId, photoId) => {
    const updatedFrentes = project.frentes.map(f => {
      if (f.id === frenteId) {
        return {
          ...f,
          photos: (f.photos || []).filter(p => p.id !== photoId)
        };
      }
      return f;
    });

    onUpdateProject({
      ...project,
      frentes: updatedFrentes
    });
  };

  return (
    <div className="flex-1 p-gutter max-w-container-max mx-auto grid-bg min-h-screen pb-16">
      
      {/* Back Button & Header */}
      <div className="mb-6 flex items-center justify-between">
        <button 
          onClick={onBack} 
          className="bg-white border border-slate-300 text-slate-700 font-bold text-xs px-4 py-2 rounded transition-colors hover:bg-slate-50 flex items-center gap-1.5 shadow-sm"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Volver a Proyectos
        </button>

        {!isUnified && (
          <button 
            onClick={() => {
              if(confirm('¿Estás seguro de eliminar este proyecto de interventoría? Esta acción es irreversible.')) {
                onBack();
                onUpdateProject(null, true);
              }
            }}
            className="bg-red-50 border border-red-200 text-red-600 font-bold text-xs px-4 py-2 rounded transition-all hover:bg-red-100 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
            Eliminar Proyecto
          </button>
        )}
      </div>

      {/* Contract Details Header (Ingenieril Limpio) */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 mb-8">
        <div className="border-b border-slate-100 pb-4 mb-4">
          <span className="text-[10px] font-bold text-primary bg-blue-50 border border-blue-100 rounded px-2 py-0.5 uppercase tracking-wider">
            Expediente de Interventoría Activo
          </span>
          <h2 className="font-headline-lg text-2xl font-extrabold text-slate-800 mt-2 leading-tight">
            {project.name}
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-xs text-slate-600">
          <div>
            <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px] mb-0.5">Contrato de Obra</span>
            <span className="text-slate-800 font-bold font-mono-numbers text-sm">{project.contractNo}</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px] mb-0.5">Contratista Ejecutor</span>
            <span className="text-slate-800 font-bold text-sm">{project.contractor}</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px] mb-0.5">Plazo Contractual</span>
            <span className="text-slate-800 font-bold text-sm">{project.duration} Meses</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px] mb-0.5">Presupuesto Obra</span>
            <span className="text-green-600 font-extrabold font-mono-numbers text-sm">{formatCOP(project.constructionBudget)}</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px] mb-0.5">Presupuesto Interventoría</span>
            <span className="text-primary font-extrabold font-mono-numbers text-sm">{formatCOP(project.interventoriaBudget)}</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px] mb-0.5">Avance Físico Promedio</span>
            <span className="text-slate-800 font-bold text-sm flex items-center gap-1">
              {project.frentes?.length > 0 
                ? `${Math.round(project.frentes.reduce((acc, curr) => acc + curr.progress, 0) / project.frentes.length)}%` 
                : '0%'
              }
              <span className="font-medium text-slate-400">({project.frentes?.length || 0} frentes)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left/Middle: Map + Compliance + Photos (2 Cols span) */}
        <div className="xl:col-span-2 space-y-6">
          {/* Leaflet Map */}
          <MapView 
            frentes={filteredFrentes}
            activeFrenteId={activeFrenteId}
            onFrenteSelect={setActiveFrenteId}
            isAddingMode={isMapLocatingMode}
            onLocationSelected={handleLocationFromMap}
            isUnified={isUnified}
            onResetToUnified={onResetToUnified}
          />
          
          {/* Instructions banner when locating coordinates */}
          {isMapLocatingMode && (
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800 font-bold flex items-center gap-2 animate-pulse">
              <span className="material-symbols-outlined">explore</span>
              <span>Modo Posicionamiento: Haz clic sobre el mapa para fijar las coordenadas del frente.</span>
            </div>
          )}

          {/* Compliance & Photo Gallery for selected front */}
          {activeFrente ? (
            <>
              {/* Compliance Tabs (Technical, Legal, PAGA, Financial) */}
              <ComplianceTabs 
                frente={activeFrente} 
                onUpdateCompliance={handleUpdateCompliance}
                onUpdateFrenteData={handleUpdateFrenteData}
              />
              
              {/* Image logs photo gallery */}
              <PhotoGallery 
                frente={activeFrente}
                onAddPhoto={handleAddPhoto}
                onDeletePhoto={handleDeletePhoto}
              />
            </>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg p-16 text-center text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2">engineering</span>
              <h4 className="font-bold text-slate-700 mb-1">Sin Frente Seleccionado</h4>
              <p className="text-xs">Agrega un frente de obra o selecciona uno de la lista lateral para auditar el expediente.</p>
            </div>
          )}
        </div>

        {/* Right Side: Workfronts List Panel (1 Col span) */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col max-h-[850px]">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4 flex-wrap gap-2">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Ubicaciones</span>
              <h3 className="font-bold text-slate-800 text-sm uppercase">Frentes de Obra</h3>
            </div>
            
            {isUnified && (
              <div className="flex bg-slate-100 p-0.5 rounded text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <button 
                  type="button"
                  onClick={() => setFrentesFilter('all')}
                  className={`px-2.5 py-1 rounded transition-all ${frentesFilter === 'all' ? 'bg-white text-primary shadow-sm' : 'hover:text-slate-800'}`}
                >
                  Todos
                </button>
                <button 
                  type="button"
                  onClick={() => setFrentesFilter('vial')}
                  className={`px-2.5 py-1 rounded transition-all ${frentesFilter === 'vial' ? 'bg-white text-[#1e3a8a] shadow-sm' : 'hover:text-slate-800'}`}
                >
                  Vial
                </button>
                <button 
                  type="button"
                  onClick={() => setFrentesFilter('espacio')}
                  className={`px-2.5 py-1 rounded transition-all ${frentesFilter === 'espacio' ? 'bg-white text-[#d97706] shadow-sm' : 'hover:text-slate-800'}`}
                >
                  Público
                </button>
              </div>
            )}

            {!isUnified && (
              <button 
                onClick={() => setShowFrenteModal(true)}
                className="bg-primary text-on-primary font-bold text-[11px] px-3 py-1.5 rounded hover:bg-primary-container transition-all flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Nuevo Frente
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
            {(!filteredFrentes || filteredFrentes.length === 0) ? (
              <div className="text-center py-16 text-slate-400 italic text-xs">
                <span className="material-symbols-outlined text-3xl mb-1.5 block">traffic</span>
                No hay frentes registrados.
              </div>
            ) : (
              filteredFrentes.map((f) => {
                const isActive = f.id === activeFrenteId;
                
                // Calculate compliance check totals across all 7 components
                let totalChecked = 0;
                let totalItems = 0;
                if (f.compliance) {
                  Object.values(f.compliance).forEach(comp => {
                    totalItems += comp.checklist?.length || 0;
                    totalChecked += comp.checklist?.filter(item => item.checked).length || 0;
                  });
                }
                const compliancePercent = totalItems > 0 ? Math.round((totalChecked / totalItems) * 100) : 0;

                return (
                  <div 
                    key={f.id} 
                    onClick={() => setActiveFrenteId(f.id)}
                    className={`p-4 border rounded cursor-pointer relative transition-all hover:bg-slate-50/50 ${
                      isActive 
                        ? 'border-primary bg-blue-50/10' 
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Dynamic status pill */}
                    <div className="absolute top-4 right-4 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        f.status === 'al-dia' ? 'bg-green-500' : f.status === 'alerta' ? 'bg-amber-500' : 'bg-red-500'
                      }`}></span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {f.status === 'al-dia' ? 'Al día' : f.status === 'alerta' ? 'Alerta' : 'Crítico'}
                      </span>
                    </div>
                    
                    <h4 className="font-bold text-slate-800 text-sm leading-snug mb-1 pr-16">{f.name}</h4>
                    <p className="text-slate-500 text-xs line-clamp-1 mb-3">{f.description}</p>
                    
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-bold border-t border-slate-100/50 pt-3 mb-3">
                      <div>
                        <span className="block uppercase tracking-widest text-[8px]">Coordenadas</span>
                        <span className="font-mono-numbers text-slate-600">
                          {parseFloat(f.latitude).toFixed(4)}, {parseFloat(f.longitude).toFixed(4)}
                        </span>
                      </div>
                      <div>
                        <span className="block uppercase tracking-widest text-[8px]">Supervisor</span>
                        <span className="text-slate-600 truncate block">{f.supervisor}</span>
                      </div>
                      <div className="mt-1">
                        <span className="block uppercase tracking-widest text-[8px]">Requisitos Legal</span>
                        <span className="text-slate-800 font-bold">{compliancePercent}% OK</span>
                      </div>
                      <div className="mt-1">
                        <span className="block uppercase tracking-widest text-[8px]">Avance Físico</span>
                        <span className="text-slate-800 font-bold font-mono-numbers">{f.progress}%</span>
                      </div>
                    </div>

                    <div className="relative w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          f.status === 'critico' ? 'bg-red-500' : 'bg-primary'
                        }`} 
                        style={{ width: `${f.progress}%` }}
                      ></div>
                    </div>

                    {isActive && (
                      <div className="flex justify-end mt-3 border-t border-slate-100 pt-2">
                        <button 
                          className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFrente(f.id);
                          }}
                        >
                          <Trash2 size={12} /> Eliminar Frente
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Modal - Create Frente de Obra */}
      {showFrenteModal && (
        <div className="modal-overlay" onClick={resetFrenteForm}>
          <div className="modal-content !max-w-xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-bold text-slate-800 text-base uppercase tracking-wider">
                Agregar Frente de Obra
              </h3>
              <button className="btn btn-secondary btn-icon" onClick={resetFrenteForm}>
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            
            <form onSubmit={handleCreateFrente}>
              <div className="modal-body space-y-4">
                <div>
                  <label className="form-label !mb-1">Nombre Descriptivo del Frente *</label>
                  <input 
                    type="text" 
                    className="form-input !py-2 !rounded" 
                    required 
                    placeholder="Ej. Frente 3: Cruce Colector Calle 134" 
                    value={frenteName}
                    onChange={(e) => setFrenteName(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="form-label !mb-1">Localización Específica del Frente (Tramo / Hitos)</label>
                  <textarea 
                    className="form-input !py-2 !rounded" 
                    placeholder="Ej. Tramo comprendido entre la Autopista Norte y la Carrera 19, excavación para tubería de alcantarillado..." 
                    value={frenteDesc}
                    onChange={(e) => setFrenteDesc(e.target.value)}
                    rows="2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label !mb-1">Latitud (WGS84) *</label>
                    <input 
                      type="text" 
                      className="form-input !py-2 !rounded font-mono-numbers" 
                      required 
                      value={frenteLat}
                      onChange={(e) => setFrenteLat(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label !mb-1">Longitud (WGS84) *</label>
                    <input 
                      type="text" 
                      className="form-input !py-2 !rounded font-mono-numbers" 
                      required 
                      value={frenteLng}
                      onChange={(e) => setFrenteLng(e.target.value)}
                    />
                  </div>
                </div>

                {/* Coordinate Map Picker Trigger */}
                <div>
                  <button 
                    type="button" 
                    className="w-full bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs py-2 rounded flex items-center justify-center gap-1.5 transition-all hover:bg-slate-100" 
                    onClick={() => {
                      setIsMapLocatingMode(true);
                      setShowFrenteModal(false); // Hide modal so map click can occur
                    }}
                  >
                    <span className="material-symbols-outlined text-[16px] text-slate-500">my_location</span>
                    Ubicar haciendo clic en el Mapa de Obra
                  </button>
                </div>

                <div>
                  <label className="form-label !mb-1">Ingeniero Residente Encargado *</label>
                  <input 
                    type="text" 
                    className="form-input !py-2 !rounded" 
                    required 
                    placeholder="Ej. Ing. Juan Carlos Mendoza" 
                    value={frenteSupervisor}
                    onChange={(e) => setFrenteSupervisor(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="form-label !mb-1">Avance Real (%)</label>
                    <input 
                      type="number" 
                      className="form-input !py-2 !rounded font-mono-numbers" 
                      min="0"
                      max="100"
                      value={frenteProgress}
                      onChange={(e) => setFrenteProgress(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label !mb-1">Avance Programado (%)</label>
                    <input 
                      type="number" 
                      className="form-input !py-2 !rounded font-mono-numbers" 
                      min="0"
                      max="100"
                      value={frentePlannedProgress}
                      onChange={(e) => setFrentePlannedProgress(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label !mb-1">Estado de Control</label>
                    <select 
                      className="form-input !py-2 !rounded" 
                      value={frenteStatus}
                      onChange={(e) => setFrenteStatus(e.target.value)}
                      style={{ height: '38px' }}
                    >
                      <option value="al-dia">🟢 Al día (En plazo)</option>
                      <option value="alerta">🟡 Alerta (Retraso leve)</option>
                      <option value="critico">🔴 Crítico (Parado / Sanción)</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer border-t border-slate-100 bg-slate-50/50">
                <button type="button" className="bg-white border border-slate-300 text-slate-700 font-bold text-sm px-4 py-2 rounded hover:bg-slate-50" onClick={resetFrenteForm}>
                  Cancelar
                </button>
                <button type="submit" className="bg-primary text-on-primary font-bold text-sm px-4 py-2 rounded hover:bg-primary-container transition-all">
                  Agregar Frente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating notification for map clicking mode */}
      {isMapLocatingMode && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: '3000', maxWidth: '320px' }} className="bg-white border border-primary p-4 rounded-lg shadow-lg animate-fade-in">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 text-primary mb-1">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>my_location</span>
            Ubicación del Frente de Obra
          </h4>
          <p className="text-slate-500 text-xs leading-relaxed mb-3">
            Haz clic en el mapa sobre el punto geográfico donde se encuentra el frente de obra para capturar las coordenadas.
          </p>
          <button 
            className="w-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs py-1.5 rounded hover:bg-slate-200"
            onClick={() => {
              setIsMapLocatingMode(false);
              setShowFrenteModal(true); // Return to modal
            }}
          >
            Cancelar y volver
          </button>
        </div>
      )}
    </div>
  );
}
