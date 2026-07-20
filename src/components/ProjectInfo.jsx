import React, { useState, useEffect } from 'react';
import { 
  Info, FileText, ShieldAlert, Award, Calendar, DollarSign, 
  MapPin, UserCheck, Link as LinkIcon, Edit2, Save, CloudLightning, Loader2
} from 'lucide-react';

export default function ProjectInfo({ isContractorMode }) {
  const [activeTab, setActiveTab] = useState('technical'); // 'technical' or 'legal'
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Initial State Data matching Colombian IDU public works structure
  const [projectData, setProjectData] = useState({
    // Technical Data
    objeto: 'Conservación, rehabilitación, mantenimiento y reconstrucción de la malla vial local, intermedia y espacio público en la localidad de Usaquén, Bogotá D.C.',
    localizacion: 'Localidad de Usaquén (Usaquén, San Cristóbal Uribe, Toberín, Los Cedros, Country Club, Santa Bárbara)',
    fechaInicio: '2025-10-15',
    plazoMeses: '18',
    fechaFinEstimada: '2027-04-15',
    especificacionesTecnicas: 'Rehabilitación con mezcla asfáltica en caliente MDC-2, losas de concreto hidráulico MR-45, mejoramiento de subrasante con geoceldas y geomallas multiaxiales, y losetas táctiles de alerta/guía en espacio público.',
    avanceFisicoProgramado: '68',
    avanceFisicoReal: '63',
    residenteObra: 'Ing. Alejandro Bermúdez (M.P. 25489-STD)',
    directorInterventoria: 'Ing. Luis Carlos Galvan (M.P. 25345-CND)',

    // Legal & Financial Data
    numeroContrato: 'IDU-19-620-18',
    contratistaObra: 'Consorcio Malla Vial Bogotá 2026',
    interventoriaEmpresa: 'INCOLTA SAS',
    presupuestoObra: 22800000000,
    presupuestoInterventoria: 1720000000,
    enlaceSecop: 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?opportunityUID=VAL-19-620',
    estadoContrato: 'Activo / En Ejecución',
    polizaResponsabilidad: 'Póliza Seguros del Estado No. 9845721 - Cobertura: $5.000.000.000 - Vigencia hasta: 2027-10-15',
    polizaCumplimiento: 'Póliza Seguros del Estado No. 9845722 - Cobertura: $2.280.000.000 - Vigencia hasta: 2028-04-15',
    polizaSalarios: 'Póliza Seguros del Estado No. 9845723 - Cobertura: $1.140.000.000 - Vigencia hasta: 2030-04-15',
    adicionesTiempo: 'Sin adiciones a la fecha',
    adicionesPresupuesto: 'Sin adiciones presupuestales a la fecha',
  });

  // Load from local storage and try to sync from Supabase
  useEffect(() => {
    async function loadData() {
      // 1. Check local storage
      const saved = localStorage.getItem('geo_interventoria_project_info_v1');
      if (saved) {
        try {
          setProjectData(JSON.parse(saved));
        } catch (e) {
          console.error("Error reading project info from localStorage", e);
        }
      }

      // 2. Fetch from Supabase via API
      try {
        const response = await fetch('/api/weekly-reports?path=weekly-reports'); // Or separate project-info endpoint
        // Let's call our special design-overrides or project-info endpoint
        const infoRes = await fetch('/api/weekly-reports'); // fallback if no specific endpoint yet
        const cloudRes = await fetch('/api/project-info');
        if (cloudRes.ok) {
          const data = await cloudRes.json();
          if (data && data.objeto) {
            setProjectData(data);
            localStorage.setItem('geo_interventoria_project_info_v1', JSON.stringify(data));
          }
        }
      } catch (err) {
        console.warn("Could not sync project info from Supabase:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProjectData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    // 1. Save to local storage
    localStorage.setItem('geo_interventoria_project_info_v1', JSON.stringify(projectData));

    // 2. Save to Supabase Cloud
    try {
      const response = await fetch('/api/project-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(projectData)
      });
      if (response.ok) {
        alert("Ficha de Proyecto guardada y sincronizada correctamente en la base de datos.");
        setIsEditing(false);
      } else {
        alert("Guardado localmente. Error al sincronizar con la base de datos de Supabase.");
      }
    } catch (err) {
      console.error(err);
      alert("Error al sincronizar con la nube. Guardado en caché del navegador.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatCOP = (num) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(num);
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8 flex flex-col items-center justify-center min-h-[500px]">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-500">Cargando Ficha de Proyecto...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-gutter max-w-container-max mx-auto min-h-screen pb-16">
      
      {/* Title Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-8 mb-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="bg-indigo-500/20 text-indigo-300 font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-indigo-500/30 inline-block mb-3">
            Especificaciones Contractuales
          </span>
          <h2 className="text-2xl md:text-3xl font-black font-headline tracking-tight text-white mb-1">
            Ficha de Proyecto IDU
          </h2>
          <p className="text-slate-350 text-xs font-semibold leading-relaxed">
            Consolidado de parámetros técnicos, pólizas de garantía, presupuestos y marco legal de la interventoría.
          </p>
        </div>

        {!isContractorMode && (
          <div className="flex items-center gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  Guardar Cambios
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-primary hover:bg-primary/90 text-white text-xs font-bold px-5 py-2.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Edit2 size={15} />
                Editar Ficha Técnica
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Tab selector bar */}
      <div className="flex border-b border-slate-200 mb-6 gap-2">
        <button
          onClick={() => setActiveTab('technical')}
          className={`pb-3 px-4 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'technical'
              ? 'border-primary text-primary font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Info size={16} />
          Especificaciones Técnicas
        </button>
        <button
          onClick={() => setActiveTab('legal')}
          className={`pb-3 px-4 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'legal'
              ? 'border-primary text-primary font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award size={16} />
          Marco Legal y Financiero
        </button>
      </div>

      {/* Tab Contents: Technical */}
      {activeTab === 'technical' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Objeto Card (Col 8/12) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs text-left">
              <h3 className="font-extrabold text-slate-850 text-sm uppercase tracking-wider mb-4 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <FileText size={18} className="text-primary" />
                Objeto y Alcance del Contrato
              </h3>
              
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Objeto Contractual</label>
                    <textarea
                      name="objeto"
                      rows={4}
                      value={projectData.objeto}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs leading-relaxed font-semibold focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Localización del Proyecto</label>
                    <input
                      type="text"
                      name="localizacion"
                      value={projectData.localizacion}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Objeto</span>
                    <p className="text-xs font-bold text-slate-700 leading-relaxed mt-1">{projectData.objeto}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Localización</span>
                    <p className="text-xs font-bold text-slate-700 mt-1 flex items-center gap-1">
                      <MapPin size={14} className="text-slate-400" />
                      {projectData.localizacion}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Ficha de Especificaciones Técnicas */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs text-left">
              <h3 className="font-extrabold text-slate-850 text-sm uppercase tracking-wider mb-4 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <UserCheck size={18} className="text-primary" />
                Especificaciones Técnicas y Materiales
              </h3>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Descripción de Especificaciones y Materiales</label>
                    <textarea
                      name="especificacionesTecnicas"
                      rows={5}
                      value={projectData.especificacionesTecnicas}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs leading-relaxed font-semibold focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Materiales y Normas Aprobados</span>
                  <p className="text-xs font-bold text-slate-700 leading-relaxed mt-1.5 whitespace-pre-line">
                    {projectData.especificacionesTecnicas}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Plazos y Responsables (Col 4/12) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs text-left">
              <h3 className="font-extrabold text-slate-850 text-sm uppercase tracking-wider mb-4 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <Calendar size={18} className="text-primary" />
                Plazos y Programación
              </h3>

              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fecha de Acta de Inicio</span>
                  {isEditing ? (
                    <input
                      type="date"
                      name="fechaInicio"
                      value={projectData.fechaInicio}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:bg-white mt-1"
                    />
                  ) : (
                    <p className="font-bold text-slate-700 mt-1">{projectData.fechaInicio}</p>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Plazo Contractual</span>
                  {isEditing ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        name="plazoMeses"
                        value={projectData.plazoMeses}
                        onChange={handleChange}
                        className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:bg-white"
                      />
                      <span className="font-bold text-slate-600">meses</span>
                    </div>
                  ) : (
                    <p className="font-bold text-slate-700 mt-1">{projectData.plazoMeses} meses</p>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fecha Estimada de Terminación</span>
                  {isEditing ? (
                    <input
                      type="date"
                      name="fechaFinEstimada"
                      value={projectData.fechaFinEstimada}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:bg-white mt-1"
                    />
                  ) : (
                    <p className="font-bold text-slate-700 mt-1">{projectData.fechaFinEstimada}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs text-left">
              <h3 className="font-extrabold text-slate-850 text-sm uppercase tracking-wider mb-4 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <UserCheck size={18} className="text-primary" />
                Responsables Técnicos
              </h3>

              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Director de Interventoría (INCOLTA SAS)</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="directorInterventoria"
                      value={projectData.directorInterventoria}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:bg-white mt-1"
                    />
                  ) : (
                    <p className="font-bold text-indigo-700 mt-1">{projectData.directorInterventoria}</p>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Residente de Obra (Contratista)</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="residenteObra"
                      value={projectData.residenteObra}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:bg-white mt-1"
                    />
                  ) : (
                    <p className="font-bold text-slate-700 mt-1">{projectData.residenteObra}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Contents: Legal & Financial */}
      {activeTab === 'legal' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Presupuesto y Pólizas (Col 8/12) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Pólizas de Garantía */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs text-left">
              <h3 className="font-extrabold text-slate-850 text-sm uppercase tracking-wider mb-4 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <ShieldAlert size={18} className="text-primary" />
                Pólizas y Amparos de Garantía (IDU)
              </h3>

              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Responsabilidad Civil Extracontractual</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="polizaResponsabilidad"
                      value={projectData.polizaResponsabilidad}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:bg-white mt-1"
                    />
                  ) : (
                    <p className="font-bold text-slate-700 mt-1 bg-slate-50 border border-slate-150 p-2.5 rounded">{projectData.polizaResponsabilidad}</p>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Buen Manejo y Correcta Inversión del Anticipo</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="polizaCumplimiento"
                      value={projectData.polizaCumplimiento}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:bg-white mt-1"
                    />
                  ) : (
                    <p className="font-bold text-slate-700 mt-1 bg-slate-50 border border-slate-150 p-2.5 rounded">{projectData.polizaCumplimiento}</p>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pago de Salarios e Indemnizaciones Laborales</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="polizaSalarios"
                      value={projectData.polizaSalarios}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:bg-white mt-1"
                    />
                  ) : (
                    <p className="font-bold text-slate-700 mt-1 bg-slate-50 border border-slate-150 p-2.5 rounded">{projectData.polizaSalarios}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Adiciones y Modificaciones */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs text-left">
              <h3 className="font-extrabold text-slate-850 text-sm uppercase tracking-wider mb-4 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <FileText size={18} className="text-primary" />
                Modificaciones Contractuales (Otrosí)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Adición en Tiempo</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="adicionesTiempo"
                      value={projectData.adicionesTiempo}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:bg-white mt-1"
                    />
                  ) : (
                    <p className="font-bold text-slate-700 mt-1">{projectData.adicionesTiempo}</p>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Adición en Presupuesto</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="adicionesPresupuesto"
                      value={projectData.adicionesPresupuesto}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:bg-white mt-1"
                    />
                  ) : (
                    <p className="font-bold text-slate-700 mt-1">{projectData.adicionesPresupuesto}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Información de Presupuestos (Col 4/12) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs text-left">
              <h3 className="font-extrabold text-slate-850 text-sm uppercase tracking-wider mb-4 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <DollarSign size={18} className="text-primary" />
                Presupuestos Generales
              </h3>

              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Valor Contrato de Obra</span>
                  {isEditing ? (
                    <input
                      type="number"
                      name="presupuestoObra"
                      value={projectData.presupuestoObra}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:bg-white mt-1"
                    />
                  ) : (
                    <p className="font-black text-slate-800 text-sm font-mono-numbers mt-1">{formatCOP(projectData.presupuestoObra)}</p>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Valor Contrato Interventoría</span>
                  {isEditing ? (
                    <input
                      type="number"
                      name="presupuestoInterventoria"
                      value={projectData.presupuestoInterventoria}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:bg-white mt-1"
                    />
                  ) : (
                    <p className="font-black text-indigo-700 text-sm font-mono-numbers mt-1">{formatCOP(projectData.presupuestoInterventoria)}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs text-left">
              <h3 className="font-extrabold text-slate-850 text-sm uppercase tracking-wider mb-4 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <LinkIcon size={18} className="text-primary" />
                Vínculos de Contrato
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contrato No.</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="numeroContrato"
                      value={projectData.numeroContrato}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:bg-white mt-1"
                    />
                  ) : (
                    <p className="font-bold text-slate-700 mt-1">{projectData.numeroContrato}</p>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estado Contractual</span>
                  {isEditing ? (
                    <select
                      name="estadoContrato"
                      value={projectData.estadoContrato}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:bg-white mt-1"
                    >
                      <option value="Activo / En Ejecución">Activo / En Ejecución</option>
                      <option value="Suspendido">Suspendido</option>
                      <option value="Terminado">Terminado</option>
                      <option value="En Liquidación">En Liquidación</option>
                    </select>
                  ) : (
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block mt-1.5">
                      {projectData.estadoContrato}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Enlace Oficial SECOP II</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="enlaceSecop"
                      value={projectData.enlaceSecop}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:bg-white mt-1"
                    />
                  ) : (
                    <a
                      href={projectData.enlaceSecop}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-primary hover:underline flex items-center gap-1 mt-1 truncate"
                    >
                      <LinkIcon size={12} className="shrink-0" />
                      Ir a SECOP II
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
