import React, { useState } from 'react';
import { X, Search } from 'lucide-react';

export default function Dashboard({ projects = [], onSelectProject, onAddProject }) {
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [contractNo, setContractNo] = useState('');
  const [contractor, setContractor] = useState('');
  const [constructionBudget, setConstructionBudget] = useState('');
  const [interventoriaBudget, setInterventoriaBudget] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');

  // Calculations for KPI Cards
  const totalProjects = projects.length;
  const frentesList = projects.flatMap(p => p.frentes || []);
  const totalFrentes = frentesList.length;
  
  const activeAlerts = frentesList.filter(f => f.status === 'alerta' || f.status === 'critico').length;
  
  const averageProgress = totalFrentes > 0
    ? Math.round(frentesList.reduce((acc, curr) => acc + curr.progress, 0) / totalFrentes)
    : 0;

  // Compile Dynamic Red Flags (Colombian Legal & Technical Auditor Checks)
  const redFlags = [];
  projects.forEach(project => {
    project.frentes?.forEach(frente => {
      // 1. Check Parafiscales (Legal obligation: Ley 80 / Ley 1474)
      const legalTab = frente.compliance?.legal;
      const parafiscalesChecked = legalTab?.checklist?.find(item => item.id === 'l3')?.checked;
      if (parafiscalesChecked === false) {
        redFlags.push({
          type: 'legal',
          project: project.name,
          frente: frente.name,
          message: `Seguridad Social / Parafiscales de nómina sin validar por la interventoría. Requisito obligatorio para aprobación de pagos.`,
          severity: 'high'
        });
      }

      // 2. Check Laboratory Failures (Technical: NSR-10)
      const concreteTests = frente.concreteTests || [];
      const failedTests = concreteTests.filter(t => t.strengthResult < t.strengthRequired && t.status === 'failed');
      if (failedTests.length > 0) {
        redFlags.push({
          type: 'tecnico',
          project: project.name,
          frente: frente.name,
          message: `Falla técnica registrada en ensayos de cilindro de concreto (${failedTests[0].strengthResult} MPa vs ${failedTests[0].strengthRequired} MPa requeridos). Riesgo estructural NSR-10.`,
          severity: 'critical'
        });
      }

      // 3. Physical progress delay vs schedule
      const plannedProg = frente.plannedProgress || 0;
      const actualProg = frente.progress || 0;
      if (plannedProg - actualProg > 15) {
        redFlags.push({
          type: 'financiero',
          project: project.name,
          frente: frente.name,
          message: `Desviación crítica en cronograma físico: Avance Real (${actualProg}%) rezagado más de 15% respecto a Programado (${plannedProg}%).`,
          severity: 'warning'
        });
      }
      
      // 4. Critical Suspension Status
      if (frente.status === 'critico') {
        redFlags.push({
          type: 'suspenso',
          project: project.name,
          frente: frente.name,
          message: `Frente reportado en estado CRÍTICO / PARADO. Requiere citar a comité técnico urgente.`,
          severity: 'critical'
        });
      }
    });
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newProject = {
      id: 'project_' + Date.now(),
      name,
      contractNo,
      contractor,
      constructionBudget: parseFloat(constructionBudget) || 0,
      interventoriaBudget: parseFloat(interventoriaBudget) || 0,
      duration: parseInt(duration) || 0,
      description,
      plannedProgress: 10, // Initial planned progress
      frentes: []
    };

    onAddProject(newProject);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setContractNo('');
    setContractor('');
    setConstructionBudget('');
    setInterventoriaBudget('');
    setDuration('');
    setDescription('');
    setShowModal(false);
  };

  const formatCOP = (num) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(num);
  };

  return (
    <div className="flex-1 p-gutter max-w-container-max mx-auto grid-bg min-h-screen pb-16">
      
      {/* Header bar */}
      <section className="mb-stack-lg flex flex-col md:flex-row md:items-end justify-between gap-gutter border-b border-slate-200 pb-6">
        <div>
          <h2 className="font-headline-lg text-3xl font-extrabold text-primary mb-1">
            Proyectos de Infraestructura
          </h2>
          <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> {totalProjects} Contratos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1e3a8a]"></span> {totalFrentes} Frentes Activos
            </span>
          </div>
        </div>
        
        <button 
          onClick={() => setShowModal(true)}
          className="bg-primary text-on-primary font-bold text-sm px-5 py-2.5 rounded hover:bg-primary-container transition-transform active:scale-95 duration-100 flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Crear Proyecto de Interventoría
        </button>
      </section>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-primary rounded flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">folder_shared</span>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contratos</p>
            <p className="text-2xl font-bold text-slate-900 font-mono-numbers mt-1">{totalProjects}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-cyan-50 text-[#06b6d4] rounded flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">signpost</span>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Frentes de Obra</p>
            <p className="text-2xl font-bold text-slate-900 font-mono-numbers mt-1">{totalFrentes}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">trending_up</span>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avance Físico Prom.</p>
            <p className="text-2xl font-bold text-slate-900 font-mono-numbers mt-1">{averageProgress}%</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 flex items-center gap-4">
          <div className={`w-12 h-12 rounded flex items-center justify-center ${activeAlerts > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'}`}>
            <span className="material-symbols-outlined text-2xl">gavel</span>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alertas Críticas</p>
            <p className={`text-2xl font-bold font-mono-numbers mt-1 ${activeAlerts > 0 ? 'text-red-600' : 'text-slate-900'}`}>{activeAlerts}</p>
          </div>
        </div>
      </div>

      {/* Red Flags / Control Legal Panel */}
      {redFlags.length > 0 && (
        <div className="bg-white border border-red-200 rounded-lg p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-red-600" style={{ fontVariationSettings: "'FILL' 1" }}>
              warning
            </span>
            <h3 className="font-bold text-slate-800 text-base uppercase tracking-wider">
              Panel de Control Legal y Banderas Rojas (Red Flags)
            </h3>
          </div>
          <div className="space-y-3.5 max-h-72 overflow-y-auto pr-2">
            {redFlags.map((flag, idx) => (
              <div 
                key={idx} 
                className="flex items-start gap-3 p-3.5 rounded border text-sm transition-all hover:bg-red-50/20"
                style={{
                  borderColor: flag.severity === 'critical' ? '#fecaca' : '#fef08a',
                  backgroundColor: flag.severity === 'critical' ? '#fffafb' : '#fffdf5'
                }}
              >
                <span className={`material-symbols-outlined text-lg mt-0.5 ${flag.severity === 'critical' ? 'text-red-600' : 'text-amber-500'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                  {flag.severity === 'critical' ? 'error' : 'warning'}
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-extrabold text-slate-800 text-xs uppercase bg-white border px-1.5 py-0.5 rounded shadow-sm">
                      {flag.project.split(' ')[0]} ...
                    </span>
                    <span className="font-bold text-slate-700 text-xs">
                      {flag.frente}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-auto">
                      Control {flag.type.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-slate-600 font-medium text-xs leading-relaxed">
                    {flag.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-16 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">
            receipt_long
          </span>
          <h3 className="text-lg font-bold text-slate-700 mb-1">No hay contratos activos</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
            Comienza dando de alta un proyecto de interventoría completando la información contractual requerida por ley.
          </p>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-primary text-on-primary font-bold text-sm px-4 py-2 rounded hover:bg-primary-container"
          >
            Dar de alta primer proyecto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {projects.map((project) => {
            const projectFrentesCount = project.frentes?.length || 0;
            const projectProgress = projectFrentesCount > 0
              ? Math.round(project.frentes.reduce((acc, curr) => acc + curr.progress, 0) / projectFrentesCount)
              : 0;
            const plannedProg = project.plannedProgress || 50;

            return (
              <div 
                key={project.id} 
                onClick={() => onSelectProject(project.id)}
                className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between hover:border-primary transition-all duration-200 cursor-pointer hover:shadow-sm"
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <span className="text-[10px] font-bold text-primary bg-blue-50 border border-blue-100 rounded px-2 py-0.5 uppercase tracking-wider">
                      CONTRATO PÚBLICO
                    </span>
                    <span className="font-mono-numbers text-xs text-slate-400 font-bold">
                      {project.contractNo}
                    </span>
                  </div>
                  
                  <h3 className="font-headline-md text-lg font-bold text-slate-800 mb-2 leading-snug hover:text-primary transition-colors">
                    {project.name}
                  </h3>
                  
                  <p className="text-slate-500 text-xs mb-5 line-clamp-2 leading-relaxed">
                    {project.description || 'Sin descripción o alcance registrado.'}
                  </p>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs border-t border-slate-100 pt-4 mb-5">
                    <div>
                      <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Contratista</span>
                      <span className="text-slate-700 font-semibold">{project.contractor}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Frentes de Obra</span>
                      <span className="text-slate-700 font-semibold">{projectFrentesCount} frentes activos</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Presupuesto Obra</span>
                      <span className="text-slate-800 font-bold font-mono-numbers">{formatCOP(project.constructionBudget)}</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Presupuesto Interventoría</span>
                      <span className="text-slate-800 font-bold font-mono-numbers">{formatCOP(project.interventoriaBudget)}</span>
                    </div>
                  </div>
                </div>

                {/* Progress bar and planned marker (curva S comparison) */}
                <div className="border-t border-slate-100 pt-4 mt-auto">
                  <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                    <span>Avance Físico Ejecutado</span>
                    <span className="font-mono-numbers">{projectProgress}%</span>
                  </div>
                  <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-visible">
                    {/* Planned progress marker notch */}
                    <div 
                      className="absolute top-0 bottom-0 border-l-2 border-dashed border-[#00236f] h-4.5 -mt-1.25 z-10" 
                      style={{ left: `${plannedProg}%` }}
                      title={`Programado contractualmente: ${plannedProg}%`}
                    >
                      <span className="absolute -top-4 -translate-x-1/2 text-[8px] font-extrabold text-[#00236f] bg-slate-100 px-1 border border-blue-200 rounded scale-90">
                        {plannedProg}%
                      </span>
                    </div>
                    {/* Actual executed progress bar */}
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500" 
                      style={{ width: `${projectProgress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">
                    <span>Programado: {plannedProg}%</span>
                    <span className={projectProgress >= plannedProg ? 'text-green-600' : 'text-red-500'}>
                      {projectProgress >= plannedProg ? 'Al día con cronograma' : `Retraso de ${plannedProg - projectProgress}%`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal - Create Project */}
      {showModal && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content !max-w-xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-bold text-slate-800 text-base uppercase tracking-wider">
                Dar de Alta Proyecto de Interventoría
              </h3>
              <button className="btn btn-secondary btn-icon" onClick={resetForm}>
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body space-y-4">
                <div>
                  <label className="form-label !mb-1">Nombre Oficial del Contrato de Obra *</label>
                  <input 
                    type="text" 
                    className="form-input !py-2 !rounded" 
                    required 
                    placeholder="Ej. Interventoría Troncal Transmilenio Av. 68 - Tramo 1" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label !mb-1">Número de Contrato *</label>
                    <input 
                      type="text" 
                      className="form-input !py-2 !rounded" 
                      required 
                      placeholder="Ej. IDU-1456-2025" 
                      value={contractNo}
                      onChange={(e) => setContractNo(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label !mb-1">Contratista de Obra *</label>
                    <input 
                      type="text" 
                      className="form-input !py-2 !rounded" 
                      required 
                      placeholder="Ej. Consorcio Vial Usaquén" 
                      value={contractor}
                      onChange={(e) => setContractor(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label !mb-1">Presupuesto Ejecución Obra ($ COP) *</label>
                    <input 
                      type="number" 
                      className="form-input !py-2 !rounded font-mono-numbers" 
                      required 
                      placeholder="Ej. 12500000000" 
                      value={constructionBudget}
                      onChange={(e) => setConstructionBudget(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label !mb-1">Presupuesto Interventoría ($ COP) *</label>
                    <input 
                      type="number" 
                      className="form-input !py-2 !rounded font-mono-numbers" 
                      required 
                      placeholder="Ej. 980000000" 
                      value={interventoriaBudget}
                      onChange={(e) => setInterventoriaBudget(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label !mb-1">Plazo de Ejecución (Meses) *</label>
                    <input 
                      type="number" 
                      className="form-input !py-2 !rounded font-mono-numbers" 
                      required 
                      placeholder="Ej. 18" 
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label !mb-1">Avance Programado Inicial (%)</label>
                    <input 
                      type="number" 
                      className="form-input !py-2 !rounded font-mono-numbers" 
                      placeholder="Ej. 50" 
                      defaultValue="30"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label !mb-1">Alcance y Ubicación General de la Obra</label>
                  <textarea 
                    className="form-input !py-2 !rounded" 
                    rows="3" 
                    placeholder="Escribe el alcance contractual, localización general del contrato y fines principales de la interventoría..." 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="modal-footer border-t border-slate-100 bg-slate-50/50">
                <button type="button" className="bg-white border border-slate-300 text-slate-700 font-bold text-sm px-4 py-2 rounded transition-colors hover:bg-slate-50" onClick={resetForm}>
                  Cancelar
                </button>
                <button type="submit" className="bg-primary text-on-primary font-bold text-sm px-4 py-2 rounded hover:bg-primary-container transition-all">
                  Dar de Alta Contrato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
