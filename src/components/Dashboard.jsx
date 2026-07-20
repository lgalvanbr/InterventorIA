import React, { useState } from 'react';
import { 
  X, Search, SlidersHorizontal, ArrowUpDown, 
  Folder, Signpost, TrendingUp, Gavel, 
  Plus, Calendar, MapPin, Users, DollarSign, Clock,
  Briefcase, CheckCircle2, AlertTriangle, AlertOctagon, Info, ArrowRight, Map
} from 'lucide-react';
import MapView from './MapView';

export default function Dashboard({ projects = [], onSelectProject, onAddProject, isContractorMode }) {
  const [showModal, setShowModal] = useState(false);
  const [selectedQuickViewProj, setSelectedQuickViewProj] = useState(null);
  
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [projectType, setProjectType] = useState('all'); // 'all', 'vial', 'espacio'
  const [complianceStatus, setComplianceStatus] = useState('all'); // 'all', 'al-dia', 'alerta', 'critico'
  const [delayStatus, setDelayStatus] = useState('all'); // 'all', 'on-track', 'delayed'
  const [sortBy, setSortBy] = useState('name'); // 'name', 'progress-desc', 'progress-asc', 'budget-desc'
  const [activeFlagTab, setActiveFlagTab] = useState('todos'); // 'todos', 'legal', 'tecnico', 'financiero', 'suspenso'

  // Form State for creating project
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

  const getProjectType = (project) => {
    const pName = project.name.toLowerCase();
    if (pName.includes('vial') || pName.includes('malla') || project.id === 'project_1') return 'vial';
    if (pName.includes('espacio') || pName.includes('andenes') || project.id === 'project_2') return 'espacio';
    return 'other';
  };

  // Filtered red flags based on active tab
  const filteredRedFlags = redFlags.filter(flag => {
    if (activeFlagTab === 'todos') return true;
    return flag.type === activeFlagTab;
  });

  // Filter and sort projects
  const filteredProjects = projects
    .filter(project => {
      // 1. Text Search
      const matchesSearch = 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.contractNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.contractor.toLowerCase().includes(searchTerm.toLowerCase());
      
      // 2. Project Type
      const type = getProjectType(project);
      const matchesType = projectType === 'all' || type === projectType;
      
      // 3. Compliance Status
      const matchesCompliance = complianceStatus === 'all' || 
        (project.frentes && project.frentes.some(f => f.status === complianceStatus));
      
      // 4. Delay Status
      const projectFrentesCount = project.frentes?.length || 0;
      const projectProgress = projectFrentesCount > 0
        ? Math.round(project.frentes.reduce((acc, curr) => acc + curr.progress, 0) / projectFrentesCount)
        : 0;
      const plannedProg = project.plannedProgress || 50;
      const isDelayed = (plannedProg - projectProgress) > 10;
      
      const matchesDelay = delayStatus === 'all' ||
        (delayStatus === 'delayed' && isDelayed) ||
        (delayStatus === 'on-track' && !isDelayed);
      
      return matchesSearch && matchesType && matchesCompliance && matchesDelay;
    })
    .sort((a, b) => {
      const aFrentesCount = a.frentes?.length || 0;
      const aProgress = aFrentesCount > 0 ? a.frentes.reduce((acc, curr) => acc + curr.progress, 0) / aFrentesCount : 0;
      const bFrentesCount = b.frentes?.length || 0;
      const bProgress = bFrentesCount > 0 ? b.frentes.reduce((acc, curr) => acc + curr.progress, 0) / bFrentesCount : 0;
      
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'progress-desc') {
        return bProgress - aProgress;
      } else if (sortBy === 'progress-asc') {
        return aProgress - bProgress;
      } else if (sortBy === 'budget-desc') {
        return b.constructionBudget - a.constructionBudget;
      }
      return 0;
    });

  return (
    <div className="flex-1 p-gutter max-w-container-max mx-auto grid-bg min-h-screen pb-16 relative">
      
      {/* 1. Hero Landing Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-8 mb-8 shadow-md hero-banner">
        <div className="relative z-10 max-w-3xl">
          <span className="bg-indigo-500/20 text-indigo-300 font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-indigo-500/30 inline-block mb-3.5">
            CONSOLA CENTRAL DE INTERVENTORÍA
          </span>
          <h1 className="text-3xl md:text-4xl font-black font-headline tracking-tight text-white mb-2 leading-tight">
            INCOLTA <span className="text-cyan-400">SAS</span>
          </h1>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-6 font-medium">
            Supervisión contractual, técnica, jurídica y financiera en tiempo real para las obras viales y adecuaciones de espacio público en la localidad de Usaquén.
          </p>
          
          <div className="flex flex-wrap gap-3">
            {!isContractorMode && (
              <button 
                onClick={() => setShowModal(true)}
                className="bg-primary hover:bg-primary-container text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-all active:scale-95 duration-100 flex items-center gap-1.5 shadow"
              >
                <Plus size={15} />
                Crear Proyecto de Interventoría
              </button>
            )}
            <a 
              href="#navegador-proyectos"
              className="bg-white/10 hover:bg-white/15 text-slate-100 text-xs font-bold px-4 py-2.5 rounded-lg transition-all flex items-center gap-1.5 border border-white/10"
            >
              <Search size={15} />
              Explorar Contratos
            </a>
          </div>
        </div>
        
        {/* Subtle decorative background graphic */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 pointer-events-none hidden md:block">
          <svg className="w-full h-full text-indigo-400" viewBox="0 0 100 100" fill="currentColor">
            <path d="M50 0 L100 25 L100 75 L50 100 L0 75 L0 25 Z" />
          </svg>
        </div>
      </section>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4 hover:shadow-xs transition-shadow duration-200 kpi-card">
          <div className="w-12 h-12 bg-blue-50 text-primary rounded-lg flex items-center justify-center shrink-0">
            <Folder className="h-6.5 w-6.5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider">Contratos Activos</p>
            <p className="text-2xl font-black text-slate-900 font-mono-numbers mt-0.5">{totalProjects}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4 hover:shadow-xs transition-shadow duration-200 kpi-card">
          <div className="w-12 h-12 bg-cyan-50 text-cyan-600 rounded-lg flex items-center justify-center shrink-0">
            <Signpost className="h-6.5 w-6.5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider">Frentes de Obra</p>
            <p className="text-2xl font-black text-slate-900 font-mono-numbers mt-0.5">{totalFrentes}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4 hover:shadow-xs transition-shadow duration-200 kpi-card">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
            <TrendingUp className="h-6.5 w-6.5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider">Progreso Promedio</p>
            <p className="text-2xl font-black text-slate-900 font-mono-numbers mt-0.5">{averageProgress}%</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4 hover:shadow-xs transition-shadow duration-200 kpi-card">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${activeAlerts > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'}`}>
            <Gavel className="h-6.5 w-6.5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider">Alertas de Auditoría</p>
            <p className={`text-2xl font-black font-mono-numbers mt-0.5 ${activeAlerts > 0 ? 'text-red-600' : 'text-slate-900'}`}>{activeAlerts}</p>
          </div>
        </div>
      </div>

      {/* 3. Control Central Grid: Red Flags + Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        
        {/* Red Flags Panel (Left Col: 5/12 on large screens) */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col lg:col-span-5">
          <div className="p-4 bg-slate-50/70 border-b border-slate-150 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4.5 w-4.5 text-red-600 shrink-0" />
              <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                Control Legal & Técnico (Banderas Rojas)
              </h3>
            </div>
            <span className="font-mono-numbers text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
              {redFlags.length} activas
            </span>
          </div>

          {/* Alert Categories Tabs */}
          <div className="flex border-b border-slate-100 bg-slate-50/20 text-[9px] font-bold uppercase tracking-wider">
            <button 
              onClick={() => setActiveFlagTab('todos')}
              className={`flex-1 py-2 text-center border-b-2 transition-all flag-tab-btn ${activeFlagTab === 'todos' ? 'border-primary text-primary font-black bg-white' : 'border-transparent text-slate-400 hover:text-slate-650'}`}
            >
              Todos
            </button>
            <button 
              onClick={() => setActiveFlagTab('tecnico')}
              className={`flex-1 py-2 text-center border-b-2 transition-all flag-tab-btn ${activeFlagTab === 'tecnico' ? 'border-primary text-primary font-black bg-white' : 'border-transparent text-slate-400 hover:text-slate-650'}`}
            >
              Técnico
            </button>
            <button 
              onClick={() => setActiveFlagTab('legal')}
              className={`flex-1 py-2 text-center border-b-2 transition-all flag-tab-btn ${activeFlagTab === 'legal' ? 'border-primary text-primary font-black bg-white' : 'border-transparent text-slate-400 hover:text-slate-650'}`}
            >
              Legal
            </button>
            <button 
              onClick={() => setActiveFlagTab('financiero')}
              className={`flex-1 py-2 text-center border-b-2 transition-all flag-tab-btn ${activeFlagTab === 'financiero' ? 'border-primary text-primary font-black bg-white' : 'border-transparent text-slate-400 hover:text-slate-650'}`}
            >
              Financiero
            </button>
          </div>

          {/* Feed Container */}
          <div className="p-4 flex-1 overflow-y-auto max-h-[300px] space-y-3 custom-scrollbar">
            {filteredRedFlags.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <CheckCircle2 className="h-8 w-8 text-slate-355 mb-2" />
                <p className="text-xs font-semibold">No se registran alertas en esta sección</p>
              </div>
            ) : (
              filteredRedFlags.map((flag, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-all hover:bg-slate-50/50 ${
                    flag.severity === 'critical' ? 'bg-red-50/20 border-red-200' : 'bg-amber-50/20 border-amber-200'
                  }`}
                >
                  <AlertOctagon className={`h-4.5 w-4.5 mt-0.5 shrink-0 ${flag.severity === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[8px] font-black text-slate-700 uppercase bg-white border border-slate-200 px-1.5 py-0.25 rounded">
                        {flag.project.split(' ')[0]}...
                      </span>
                      <span className="text-[9px] font-extrabold text-slate-900">
                        {flag.frente}
                      </span>
                      <span className={`text-[8px] font-black uppercase px-1 rounded-full ml-auto ${
                        flag.type === 'tecnico' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                        flag.type === 'legal' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                        flag.type === 'financiero' ? 'bg-cyan-50 text-cyan-600 border border-cyan-100' :
                        'bg-rose-50 text-rose-600 border border-rose-100'
                      }`}>
                        {flag.type}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-655 leading-normal font-semibold">
                      {flag.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Map View Column (Right Col: 7/12 on large screens) */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden lg:col-span-7 flex flex-col">
          <MapView 
            frentes={frentesList}
            isUnified={true}
          />
        </div>
      </div>

      {/* 4. Interactive Project Browser (Navegador de Proyectos) */}
      <div id="navegador-proyectos" className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 mb-8">
        
        {/* Browser Header & Toolbar */}
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
              <SlidersHorizontal size={16} className="text-primary" />
              Navegador de Contratos y Proyectos
            </h3>
            <p className="text-[10.5px] text-slate-500 font-medium">
              Filtra y ordena la información para realizar auditorías específicas sobre los contratos públicos de Usaquén.
            </p>
          </div>
          
          {/* Quick Clear Filters indicator */}
          {(searchTerm || projectType !== 'all' || complianceStatus !== 'all' || delayStatus !== 'all' || sortBy !== 'name') && (
            <button 
              onClick={() => {
                setSearchTerm('');
                setProjectType('all');
                setComplianceStatus('all');
                setDelayStatus('all');
                setSortBy('name');
              }}
              className="text-[10px] font-bold text-primary hover:underline self-start lg:self-center bg-blue-50 px-2.5 py-1 rounded-md"
            >
              Restablecer Filtros
            </button>
          )}
        </div>

        {/* Filters Controls Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs mb-4">
          {/* 1. Search input */}
          <div className="relative flex flex-col gap-1">
            <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wide">Buscar por nombre o número</span>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Ej: Malla Vial, IDU..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* 2. Filter by Type */}
          <div className="flex flex-col gap-1">
            <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wide">Tipo de Proyecto</span>
            <select
              value={projectType}
              onChange={(e) => setProjectType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="all">Todos los tipos</option>
              <option value="vial">Malla Vial Local (Contrato 01)</option>
              <option value="espacio">Espacio Público (Contrato 02)</option>
            </select>
          </div>

          {/* 3. Filter by Compliance */}
          <div className="flex flex-col gap-1">
            <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wide">Estado de Alertas</span>
            <select
              value={complianceStatus}
              onChange={(e) => setComplianceStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="all">Todas las alertas</option>
              <option value="al-dia">Frentes Al Día</option>
              <option value="alerta">Frentes en Alerta</option>
              <option value="critico">Frentes Críticos</option>
            </select>
          </div>

          {/* 4. Filter by Delay */}
          <div className="flex flex-col gap-1">
            <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wide">Cronograma (Curva S)</span>
            <select
              value={delayStatus}
              onChange={(e) => setDelayStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="all">Todos los cronogramas</option>
              <option value="on-track">Al día con planificación</option>
              <option value="delayed">Con retraso contractual (&gt;10%)</option>
            </select>
          </div>

          {/* 5. Sort By */}
          <div className="flex flex-col gap-1">
            <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wide">Ordenar resultados por</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold focus:bg-white focus:outline-none cursor-pointer"
              >
                <option value="name">Nombre Oficial (A-Z)</option>
                <option value="progress-desc">Progreso Real (Mayor a Menor)</option>
                <option value="progress-asc">Progreso Real (Menor a Mayor)</option>
                <option value="budget-desc">Presupuesto Ejecución (Mayor a Menor)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results grid counter */}
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-5">
          Mostrando {filteredProjects.length} de {projects.length} contratos
        </div>

        {/* Grid displaying the filtered projects */}
        {filteredProjects.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-12 text-center text-slate-400">
            <Briefcase size={36} className="mx-auto text-slate-350 mb-2" />
            <p className="text-xs font-bold leading-normal">No se encontraron contratos que coincidan con los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredProjects.map((project) => {
              const projectFrentesCount = project.frentes?.length || 0;
              const projectProgress = projectFrentesCount > 0
                ? Math.round(project.frentes.reduce((acc, curr) => acc + curr.progress, 0) / projectFrentesCount)
                : 0;
              const plannedProg = project.plannedProgress || 50;
              const isDelayed = (plannedProg - projectProgress) > 10;
              const pType = getProjectType(project);

              return (
                <div 
                  key={project.id} 
                  className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between hover:border-primary transition-all duration-200 hover:shadow-sm cursor-default relative overflow-hidden project-hub-card group"
                >
                  {/* Subtle color stripe on top for project type identification */}
                  <div className={`absolute top-0 left-0 right-0 h-1 ${
                    pType === 'vial' ? 'bg-primary' : 'bg-amber-500'
                  }`}></div>

                  <div className="pt-1.5">
                    <div className="flex justify-between items-start gap-2 mb-2.5">
                      <span className={`text-[8.5px] font-black border rounded-full px-2 py-0.5 uppercase tracking-wide ${
                        pType === 'vial' 
                          ? 'bg-blue-50 text-primary border-blue-100' 
                          : 'bg-amber-50 text-amber-800 border-amber-100'
                      }`}>
                        {pType === 'vial' ? 'Malla Vial Local' : 'Espacio Público'}
                      </span>
                      <span className="font-mono-numbers text-[10.5px] text-slate-400 font-bold">
                        {project.contractNo}
                      </span>
                    </div>
                    
                    <h3 className="font-headline font-bold text-sm text-slate-800 mb-2 leading-snug group-hover:text-primary transition-colors text-left">
                      {project.name}
                    </h3>
                    
                    <p className="text-slate-550 text-[11px] mb-4.5 line-clamp-2 leading-relaxed text-left">
                      {project.description || 'Sin alcance registrado.'}
                    </p>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] border-t border-slate-100 pt-3 mb-4.5 text-left">
                      <div>
                        <span className="text-slate-400 font-bold block uppercase tracking-wider text-[8px]">Contratista de Obra</span>
                        <span className="text-slate-700 font-semibold">{project.contractor}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold block uppercase tracking-wider text-[8px]">Frentes de Obra</span>
                        <span className="text-slate-700 font-semibold">{projectFrentesCount} tramos activos</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold block uppercase tracking-wider text-[8px]">Presupuesto Obra</span>
                        <span className="text-slate-800 font-bold font-mono-numbers">{formatCOP(project.constructionBudget)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold block uppercase tracking-wider text-[8px]">Presupuesto Interventoría</span>
                        <span className="text-slate-800 font-bold font-mono-numbers">{formatCOP(project.interventoriaBudget)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Dual progress bars (Actual vs Planned) */}
                  <div className="border-t border-slate-100 pt-3 mt-auto">
                    <div className="flex justify-between text-[11px] font-bold text-slate-650 mb-1.5">
                      <span>Avance Físico Consolidado</span>
                      <span className="font-mono-numbers">{projectProgress}%</span>
                    </div>
                    
                    <div className="relative w-full h-1.75 bg-slate-100 rounded-full">
                      {/* Planned progress marker flag */}
                      <div 
                        className="absolute top-0 bottom-0 border-l-2 border-dashed border-[#00236f] h-4 -mt-1 z-10" 
                        style={{ left: `${plannedProg}%` }}
                        title={`Programado contractualmente: ${plannedProg}%`}
                      >
                        <span className="absolute -top-3.5 -translate-x-1/2 text-[7px] font-black text-[#00236f] bg-slate-100 px-1 border border-blue-200 rounded scale-90">
                          {plannedProg}%
                        </span>
                      </div>
                      
                      {/* Actual executed progress bar */}
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isDelayed ? 'bg-amber-500' : 'bg-primary'
                        }`} 
                        style={{ width: `${projectProgress}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between items-center text-[8.5px] text-slate-400 font-bold uppercase tracking-wider mt-2.5">
                      <span>Programado: {plannedProg}%</span>
                      <span className={isDelayed ? 'text-amber-600' : 'text-emerald-600'}>
                        {isDelayed ? `Retraso de ${plannedProg - projectProgress}%` : 'Cumple Cronograma'}
                      </span>
                    </div>

                    {/* Card Actions */}
                    <div className="flex gap-2 mt-4 pt-3 border-t border-slate-50">
                      <button 
                        type="button"
                        onClick={() => setSelectedQuickViewProj(project)}
                        className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10.5px] font-bold py-1.75 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Info size={13} />
                        Vista Rápida
                      </button>
                      <button 
                        type="button"
                        onClick={() => onSelectProject(project.id)}
                        className="flex-1 bg-primary hover:bg-primary/95 text-white text-[10.5px] font-bold py-1.75 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                      >
                        Entrar a Supervisión
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Quick-View Slide-Over Drawer */}
      {selectedQuickViewProj && (
        <>
          {/* Backdrop Blur */}
          <div 
            className="fixed inset-0 bg-slate-900/35 backdrop-blur-xs z-[9999] transition-opacity duration-300"
            onClick={() => setSelectedQuickViewProj(null)}
          ></div>

          {/* Drawer container */}
          <div className="fixed top-0 right-0 bottom-0 w-full sm:w-[480px] bg-white shadow-2xl z-[10000] flex flex-col justify-between transition-transform duration-300 border-l border-slate-200 quickview-drawer">
            <div>
              {/* Header */}
              <div className="p-4 bg-slate-50/70 border-b border-slate-150 flex justify-between items-center">
                <div className="space-y-0.5 text-left">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block font-mono">CONTRATO {selectedQuickViewProj.contractNo}</span>
                  <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider leading-none">Vista Rápida de Proyecto</h3>
                </div>
                <button 
                  onClick={() => setSelectedQuickViewProj(null)}
                  className="p-1 rounded-full hover:bg-slate-200 border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Body Content */}
              <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(100vh-140px)] text-left">
                
                {/* Meta details */}
                <div className="space-y-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                  <h4 className="font-headline font-black text-xs text-slate-800 mb-2 leading-snug">
                    {selectedQuickViewProj.name}
                  </h4>
                  <p className="text-[11px] text-slate-550 leading-normal font-semibold">
                    {selectedQuickViewProj.description || 'Sin alcance o descripción adicional.'}
                  </p>
                </div>

                {/* Contract specifics */}
                <div className="grid grid-cols-2 gap-4 text-[10.5px]">
                  <div className="bg-slate-50/20 p-2.5 border border-slate-150 rounded-lg">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Contratista Principal</span>
                    <span className="font-extrabold text-slate-700 mt-0.5 block">{selectedQuickViewProj.contractor}</span>
                  </div>
                  <div className="bg-slate-50/20 p-2.5 border border-slate-150 rounded-lg">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Plazo de Ejecución</span>
                    <span className="font-extrabold text-slate-700 mt-0.5 block">{selectedQuickViewProj.duration} Meses</span>
                  </div>
                  <div className="bg-slate-50/20 p-2.5 border border-slate-150 rounded-lg">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Presupuesto Obra</span>
                    <span className="font-extrabold text-slate-800 mt-0.5 block font-mono-numbers">{formatCOP(selectedQuickViewProj.constructionBudget)}</span>
                  </div>
                  <div className="bg-slate-50/20 p-2.5 border border-slate-150 rounded-lg">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Presupuesto Interventoría</span>
                    <span className="font-extrabold text-slate-800 mt-0.5 block font-mono-numbers">{formatCOP(selectedQuickViewProj.interventoriaBudget)}</span>
                  </div>
                </div>

                {/* Frentes Table Inside Drawer */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-slate-450 uppercase tracking-widest flex items-center gap-1 border-b border-slate-100 pb-1">
                    <Signpost size={12} />
                    Frentes de Obra Asociados ({selectedQuickViewProj.frentes?.length || 0})
                  </h4>
                  
                  {(!selectedQuickViewProj.frentes || selectedQuickViewProj.frentes.length === 0) ? (
                    <p className="text-[10px] text-slate-400 italic">No hay frentes de obra dados de alta en este contrato.</p>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
                      <table className="w-full text-left border-collapse text-[10px] drawer-table">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 border-b border-slate-150 font-bold uppercase text-[8px]">
                            <th className="py-2.5 px-3">Frente</th>
                            <th className="py-2.5 px-3">CIV ID</th>
                            <th className="py-2.5 px-3">Eje Vial / Tramo</th>
                            <th className="py-2.5 px-3 text-center">Avance</th>
                            <th className="py-2.5 px-3 text-center">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                          {selectedQuickViewProj.frentes.map(f => (
                            <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2 px-3 font-bold text-slate-400">Fr. {f.frente}</td>
                              <td className="py-2 px-3 font-mono font-bold text-slate-650">CIV {f.civ}</td>
                              <td className="py-2 px-3 font-medium truncate max-w-[120px]">{f.eje}</td>
                              <td className="py-2 px-3 text-center font-bold font-mono-numbers">{f.progress}%</td>
                              <td className="py-2 px-3 text-center">
                                <span className={`text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                                  f.status === 'al-dia' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                  f.status === 'alerta' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                  'bg-rose-50 text-rose-700 border border-rose-100'
                                }`}>
                                  {f.status === 'al-dia' ? 'Al día' : f.status === 'alerta' ? 'Alerta' : 'Crítico'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-150 bg-slate-50/50 flex gap-2">
              <button 
                onClick={() => setSelectedQuickViewProj(null)}
                className="flex-1 bg-white hover:bg-slate-50 border border-slate-350 text-slate-700 text-[11px] font-bold py-2 rounded-lg transition-colors cursor-pointer"
              >
                Cerrar Panel
              </button>
              <button 
                onClick={() => {
                  onSelectProject(selectedQuickViewProj.id);
                  setSelectedQuickViewProj(null);
                }}
                className="flex-1 bg-primary hover:bg-primary/95 text-white text-[11px] font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
              >
                Entrar a Supervisión
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* 6. Modal - Create Project */}
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

      {/* Premium Styling for Encapsulated Hub Overrides */}
      <style dangerouslySetInnerHTML={{ __html: `
        .hero-banner {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #312e81 100%) !important;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .kpi-card {
          box-shadow: 0 1px 3px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.04);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
          border-color: rgba(99, 102, 241, 0.15);
        }
        
        .project-hub-card {
          box-shadow: 0 1px 3px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.04);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .project-hub-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.02);
          border-color: var(--primary);
        }
        
        .quickview-drawer {
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: -10px 0 25px -5px rgba(0,0,0,0.1), -4px 0 10px -5px rgba(0,0,0,0.04);
          animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        
        .flag-tab-btn {
          position: relative;
        }
        .flag-tab-btn:hover {
          background-color: rgba(241, 245, 249, 0.4);
        }
      `}} />

    </div>
  );
}
