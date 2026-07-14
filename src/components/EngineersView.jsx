import React, { useState, useMemo } from 'react';
import { Mail, Phone, Award, Shield, FileText, CheckCircle, AlertTriangle, XCircle, Search, Filter, ChevronDown, ChevronUp, MapPin, UserPlus, X, Check, Plus, Edit } from 'lucide-react';

const ROLE_PERMISSIONS = {
  'Director de Interventoría': {
    badge: 'Acceso Total',
    color: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/30',
    description: 'Control administrativo total, aprobación de actas finales, y asignación de personal.',
    perms: ['Administrar Personal', 'Aprobar Actas', 'Modificar Frentes', 'Firmar Informes', 'Configurar APIs']
  },
  'Residente de Interventoría (Malla Vial)': {
    badge: 'Edición Limitada (Vías)',
    color: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/30',
    description: 'Supervisión en campo, carga de ensayos de calidad y registro de diarios de obra de Malla Vial.',
    perms: ['Reportar Avances', 'Subir Ensayos de Calidad', 'Cargar Registro Fotográfico', 'Firmar Diarios']
  },
  'Residente de Interventoría (Espacio Público)': {
    badge: 'Edición Limitada (Espacio P.)',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800/30',
    description: 'Supervisión en campo, carga de ensayos de calidad y registro de diarios de obra de Espacio Público.',
    perms: ['Reportar Avances', 'Subir Ensayos de Calidad', 'Cargar Registro Fotográfico', 'Firmar Diarios']
  },
  'Especialista Ambiental y Social (PAGA)': {
    badge: 'Auditoría Ambiental/SST',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/30',
    description: 'Control y auditoría del plan de manejo ambiental (PAGA) y seguridad en el trabajo.',
    perms: ['Auditar PMA', 'Firmar Listas de SST', 'Registrar PQRS', 'Control de Emisiones CO2']
  },
  'Supervisor IDU (Cliente)': {
    badge: 'Solo Lectura / Firma',
    color: 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/30',
    description: 'Representante de la entidad contratante. Auditoría visual y firma digital de hitos.',
    perms: ['Auditoría General', 'Firma de Recibido de Actas', 'Consultar Métricas SECOP']
  }
};

const ENGINEERS_METADATA = [
  {
    name: 'Ing. Luis Carlos Galvan',
    role: 'Director de Interventoría',
    specialty: 'Gerencia de Proyectos de Infraestructura y Vías',
    tp: '25345-CND',
    email: 'luis.galvan@interventor-ia.gov.co',
    phone: '+57 315 789 4512',
    status: 'En Oficina Principal',
    statusColor: 'bg-blue-500',
    initials: 'LG',
    bgClass: 'bg-primary',
    textColor: 'text-white',
    avatarUrl: null
  },
  {
    name: 'Ing. Carolina Rojas',
    role: 'Residente de Interventoría (Malla Vial)',
    specialty: 'Control de Obra y Geotecnia',
    tp: '31204-CND',
    email: 'carolina.rojas@interventor-ia.gov.co',
    phone: '+57 318 245 9081',
    status: 'En Campo',
    statusColor: 'bg-green-500',
    initials: 'CR',
    bgClass: 'bg-indigo-600',
    textColor: 'text-white',
    avatarUrl: null
  },
  {
    name: 'Ing. Juan Mendoza',
    role: 'Residente de Interventoría (Malla Vial)',
    specialty: 'Pavimentos y Mezclas Asfálticas',
    tp: '28945-CND',
    email: 'juan.mendoza@interventor-ia.gov.co',
    phone: '+57 300 456 7812',
    status: 'En Campo',
    statusColor: 'bg-green-500',
    initials: 'JM',
    bgClass: 'bg-emerald-600',
    textColor: 'text-white',
    avatarUrl: null
  },
  {
    name: 'Ing. Diana Guerrero',
    role: 'Especialista Ambiental y Social (PAGA)',
    specialty: 'Gestión Ambiental y Relaciones Comunitarias',
    tp: '40212-CND',
    email: 'diana.guerrero@interventor-ia.gov.co',
    phone: '+57 310 987 6543',
    status: 'En Campo (Visitas)',
    statusColor: 'bg-green-500',
    initials: 'DG',
    bgClass: 'bg-teal-600',
    textColor: 'text-white',
    avatarUrl: null
  },
  {
    name: 'Ing. Carlos Ortiz',
    role: 'Residente de Interventoría (Malla Vial)',
    specialty: 'Topografía e Hidráulica',
    tp: '35124-CND',
    email: 'carlos.ortiz@interventor-ia.gov.co',
    phone: '+57 312 876 5432',
    status: 'En Campo',
    statusColor: 'bg-green-500',
    initials: 'CO',
    bgClass: 'bg-cyan-600',
    textColor: 'text-white',
    avatarUrl: null
  },
  {
    name: 'Ing. Diego Pardo',
    role: 'Residente de Interventoría (Malla Vial)',
    specialty: 'Estructuras y Obras de Drenaje',
    tp: '36712-CND',
    email: 'diego.pardo@interventor-ia.gov.co',
    phone: '+57 314 345 6789',
    status: 'En Oficina de Campo',
    statusColor: 'bg-amber-500',
    initials: 'DP',
    bgClass: 'bg-violet-600',
    textColor: 'text-white',
    avatarUrl: null
  },
  {
    name: 'Ing. Andrés Castro',
    role: 'Residente de Interventoría (Espacio Público)',
    specialty: 'Urbanismo y Movilidad Peatonal',
    tp: '33412-CND',
    email: 'andres.castro@interventor-ia.gov.co',
    phone: '+57 316 789 0123',
    status: 'En Campo',
    statusColor: 'bg-green-500',
    initials: 'AC',
    bgClass: 'bg-sky-600',
    textColor: 'text-white',
    avatarUrl: null
  },
  {
    name: 'Ing. Javier Ruiz',
    role: 'Residente de Interventoría (Espacio Público)',
    specialty: 'Redes Secundarias y Espacio Urbano',
    tp: '32987-CND',
    email: 'javier.ruiz@interventor-ia.gov.co',
    phone: '+57 321 456 7890',
    status: 'En Campo',
    statusColor: 'bg-green-500',
    initials: 'JR',
    bgClass: 'bg-purple-600',
    textColor: 'text-white',
    avatarUrl: null
  }
];

// Helper to determine if a frente is supervised by an engineer
const isSupervisorOf = (frente, eng) => {
  if (!frente.supervisor || !eng.name) return false;
  const fSup = frente.supervisor.trim().toLowerCase().replace('ing.', '').trim();
  const eName = eng.name.trim().toLowerCase().replace('ing.', '').trim();
  return fSup === eName || fSup.includes(eName) || eName.includes(fSup);
};

export default function EngineersView({ projects = [], onUpdateProjects }) {
  // State for search and filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [expandedEngineer, setExpandedEngineer] = useState(null);

  // Persistence of Engineers
  const [engineers, setEngineers] = useState(() => {
    const saved = localStorage.getItem('interventoria_engineers_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error al leer ingenieros de localStorage:", e);
      }
    }
    return ENGINEERS_METADATA;
  });

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingEngineer, setEditingEngineer] = useState(null); // If null, we are creating
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedEngineerForAssign, setSelectedEngineerForAssign] = useState(null);

  // Form State for engineer form (Create/Edit)
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('Residente de Interventoría (Malla Vial)');
  const [formSpecialty, setFormSpecialty] = useState('');
  const [formTp, setFormTp] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formStatus, setFormStatus] = useState('En Campo');

  // Temporary assignments state (frente IDs)
  const [tempFrenteAssignments, setTempFrenteAssignments] = useState([]);

  // Flatten all frentes from all projects
  const allFrentes = useMemo(() => {
    return projects.flatMap(p => 
      (p.frentes || []).map(f => ({
        ...f,
        projectName: p.name,
        contractNo: p.contractNo,
        projectId: p.id
      }))
    );
  }, [projects]);

  // Aggregate stats per engineer
  const engineersData = useMemo(() => {
    return engineers.map(eng => {
      const isDirector = eng.role === 'Director de Interventoría';
      const frentesSupervised = isDirector 
        ? allFrentes 
        : allFrentes.filter(f => isSupervisorOf(f, eng));

      const count = frentesSupervised.length;
      
      const avgProgress = count > 0 
        ? Math.round(frentesSupervised.reduce((acc, f) => acc + (f.progress || 0), 0) / count)
        : 0;

      const alDia = frentesSupervised.filter(f => f.status === 'al-dia').length;
      const alerta = frentesSupervised.filter(f => f.status === 'alerta').length;
      const critico = frentesSupervised.filter(f => f.status === 'critico').length;

      const totalBudget = frentesSupervised.reduce((acc, f) => acc + (f.financialMetrics?.totalBudget || 0), 0);

      // Get role configurations
      const roleConfig = ROLE_PERMISSIONS[eng.role] || {
        badge: 'Acceso Estándar',
        color: 'bg-slate-50 text-slate-700 border-slate-100',
        description: 'Perfil del sistema general',
        perms: ['Reportar Avances']
      };

      return {
        ...eng,
        frentes: frentesSupervised,
        roleConfig,
        stats: {
          count,
          avgProgress,
          alDia,
          alerta,
          critico,
          totalBudget
        }
      };
    });
  }, [engineers, allFrentes]);

  // Filters and search logic
  const filteredEngineers = useMemo(() => {
    return engineersData.filter(eng => {
      const matchesSearch = eng.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            eng.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            eng.role.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter === 'todos' || 
                          (roleFilter === 'director' && eng.role.includes('Director')) ||
                          (roleFilter === 'residente_mv' && eng.role.includes('Malla Vial')) ||
                          (roleFilter === 'residente_ep' && eng.role.includes('Espacio Público')) ||
                          (roleFilter === 'especialista' && eng.role.includes('Especialista')) ||
                          (roleFilter === 'supervisor_idu' && eng.role.includes('IDU'));

      const matchesStatus = statusFilter === 'todos' || 
                            (statusFilter === 'campo' && eng.status.includes('Campo')) ||
                            (statusFilter === 'oficina' && eng.status.includes('Oficina'));

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [engineersData, searchTerm, roleFilter, statusFilter]);

  const directorProfile = useMemo(() => {
    return engineersData.find(e => e.role === 'Director de Interventoría');
  }, [engineersData]);

  const residentsProfiles = useMemo(() => {
    return filteredEngineers.filter(e => e.role !== 'Director de Interventoría');
  }, [filteredEngineers]);

  const toggleExpand = (engName) => {
    if (expandedEngineer === engName) {
      setExpandedEngineer(null);
    } else {
      setExpandedEngineer(engName);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
  };

  // Open form modal for Creation
  const openCreateModal = () => {
    setEditingEngineer(null);
    setFormName('');
    setFormRole('Residente de Interventoría (Malla Vial)');
    setFormSpecialty('');
    setFormTp('');
    setFormEmail('');
    setFormPhone('');
    setFormStatus('En Campo');
    setIsFormModalOpen(true);
  };

  // Open form modal for Editing
  const openEditModal = (eng) => {
    setEditingEngineer(eng);
    setFormName(eng.name);
    setFormRole(eng.role);
    setFormSpecialty(eng.specialty);
    setFormTp(eng.tp);
    setFormEmail(eng.email);
    setFormPhone(eng.phone);
    setFormStatus(eng.status);
    setIsFormModalOpen(true);
  };

  // Save / Submit Engineer Form (Handles both create & edit)
  const handleSaveEngineer = (e) => {
    e.preventDefault();
    if (!formName) return;

    let formattedName = formName.trim();
    if (!formattedName.toLowerCase().startsWith('ing.')) {
      formattedName = 'Ing. ' + formattedName;
    }

    const initials = formattedName.replace('Ing.', '').trim().split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    let statusColor = 'bg-green-500';
    if (formStatus.toLowerCase().includes('oficina')) statusColor = 'bg-amber-500';
    if (formStatus.toLowerCase().includes('licencia')) statusColor = 'bg-rose-500';

    if (editingEngineer) {
      // EDIT MODE
      // If name has changed, update supervisor field in frentes dynamically
      if (editingEngineer.name !== formattedName && onUpdateProjects) {
        const updatedProjects = projects.map(proj => {
          const updatedFrentes = (proj.frentes || []).map(f => {
            if (isSupervisorOf(f, editingEngineer)) {
              return { ...f, supervisor: formattedName };
            }
            return f;
          });
          return { ...proj, frentes: updatedFrentes };
        });
        onUpdateProjects(updatedProjects);
      }

      // Update engineers array
      const updatedList = engineers.map(eng => {
        if (eng.name === editingEngineer.name) {
          return {
            ...eng,
            name: formattedName,
            role: formRole,
            specialty: formSpecialty || eng.specialty,
            tp: formTp || eng.tp,
            email: formEmail || eng.email,
            phone: formPhone || eng.phone,
            status: formStatus,
            statusColor,
            initials
          };
        }
        return eng;
      });

      setEngineers(updatedList);
      localStorage.setItem('interventoria_engineers_v1', JSON.stringify(updatedList));
    } else {
      // CREATE MODE
      const bgClasses = ['bg-indigo-600', 'bg-emerald-600', 'bg-teal-600', 'bg-cyan-600', 'bg-violet-600', 'bg-sky-600', 'bg-purple-600', 'bg-rose-600'];
      const randomBg = bgClasses[Math.floor(Math.random() * bgClasses.length)];

      const newEng = {
        name: formattedName,
        role: formRole,
        specialty: formSpecialty || 'Residente de Obra',
        tp: formTp || 'N/A',
        email: formEmail || `${formattedName.toLowerCase().replace('ing.', '').trim().replace(/\s+/g, '.')}@interventor-ia.gov.co`,
        phone: formPhone || '+57 300 000 0000',
        status: formStatus,
        statusColor,
        initials,
        bgClass: randomBg,
        textColor: 'text-white',
        avatarUrl: null
      };

      const updatedList = [...engineers, newEng];
      setEngineers(updatedList);
      localStorage.setItem('interventoria_engineers_v1', JSON.stringify(updatedList));
    }

    setIsFormModalOpen(false);
    setEditingEngineer(null);
  };

  // Open Assignment Modal
  const openAssignModal = (eng) => {
    setSelectedEngineerForAssign(eng);
    const currentlyAssignedIds = allFrentes
      .filter(f => isSupervisorOf(f, eng))
      .map(f => f.id);

    setTempFrenteAssignments(currentlyAssignedIds);
    setIsAssignModalOpen(true);
  };

  // Toggle frente in temporary list
  const handleToggleFrenteTemp = (frenteId) => {
    setTempFrenteAssignments(prev => {
      if (prev.includes(frenteId)) {
        return prev.filter(id => id !== frenteId);
      } else {
        return [...prev, frenteId];
      }
    });
  };

  // Save frentes assignments
  const handleSaveAssignments = () => {
    if (!selectedEngineerForAssign || !onUpdateProjects) return;

    const engName = selectedEngineerForAssign.name;

    const updatedProjects = projects.map(proj => {
      const updatedFrentes = (proj.frentes || []).map(frente => {
        const isCurrentlyAssignedInModal = tempFrenteAssignments.includes(frente.id);
        const wasPreviouslyAssignedToThisEng = isSupervisorOf(frente, selectedEngineerForAssign);

        if (isCurrentlyAssignedInModal) {
          return { ...frente, supervisor: engName };
        } else if (wasPreviouslyAssignedToThisEng) {
          return { ...frente, supervisor: 'Sin Asignar' };
        }
        return frente;
      });

      return { ...proj, frentes: updatedFrentes };
    });

    onUpdateProjects(updatedProjects);
    setIsAssignModalOpen(false);
    setSelectedEngineerForAssign(null);
  };

  // Active form role permissions display
  const activeFormRoleConfig = useMemo(() => {
    return ROLE_PERMISSIONS[formRole] || { perms: [], description: '' };
  }, [formRole]);

  return (
    <div className="flex-1 p-gutter max-w-container-max mx-auto grid-bg min-h-screen pb-24">
      {/* Page Header */}
      <section className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-gutter border-b border-slate-200 pb-6">
        <div>
          <h2 className="font-headline-lg text-3xl font-extrabold text-primary mb-1">
            Gestión de Ingenieros y Roles
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            Administración de perfiles, sistema de permisos de roles institucionales y asignaciones de frentes de obra.
          </p>
        </div>

        <div>
          <button 
            onClick={openCreateModal}
            className="bg-[#00236f] text-white font-bold text-xs px-4 py-2.5 rounded shadow hover:bg-primary-container transition-colors flex items-center gap-1.5 active:scale-95 duration-100 animate-fade-in"
          >
            <UserPlus size={16} />
            Crear Ingeniero
          </button>
        </div>
      </section>

      {/* 1. SECCIÓN DESTACADA: MI PERFIL (Luis Carlos Galvan) */}
      {directorProfile && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
              Mi Perfil de Interventor Líder
            </h3>
            
            <button 
              onClick={() => openEditModal(directorProfile)}
              className="text-xs font-bold text-white bg-white/10 border border-white/20 hover:bg-white/20 px-3 py-1.5 rounded transition-all flex items-center gap-1 shrink-0"
              style={{ background: 'rgba(255, 255, 255, 0.15)' }}
            >
              <Edit size={12} />
              Editar Mi Perfil
            </button>
          </div>
          
          <div className="bg-gradient-to-br from-primary to-[#1e3a8a] text-white rounded-xl shadow-lg overflow-hidden border border-primary/20 relative">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-20 -mt-20 pointer-events-none"></div>
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-white/5 rounded-full -mb-32 pointer-events-none"></div>

            <div className="p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
              <div className="w-24 h-24 rounded-full bg-white/15 backdrop-blur-sm border-2 border-white/30 text-white flex items-center justify-center font-extrabold text-3xl shadow-md shrink-0">
                {directorProfile.initials}
              </div>

              <div className="flex-1 text-center md:text-left space-y-4">
                <div>
                  <div className="flex flex-col md:flex-row md:items-center gap-2.5 justify-center md:justify-start">
                    <h4 className="font-headline-md text-2xl font-bold">{directorProfile.name}</h4>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white border border-white/20 w-fit mx-auto md:mx-0">
                      <Shield size={12} />
                      {directorProfile.role}
                    </span>
                    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded border ${directorProfile.roleConfig.color} bg-white/10 border-white/20 text-white shadow-2xs`}>
                      {directorProfile.roleConfig.badge}
                    </span>
                  </div>
                  <p className="text-on-primary-container text-sm mt-1">{directorProfile.specialty}</p>
                </div>

                {/* Permissions tag display */}
                <div className="flex flex-wrap items-center gap-1.5 justify-center md:justify-start pt-1">
                  <span className="text-[10px] font-bold text-on-primary-container uppercase tracking-wider mr-1">Permisos:</span>
                  {directorProfile.roleConfig.perms.map(p => (
                    <span key={p} className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-100 font-medium">
                      ✓ {p}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 text-sm border-t border-white/10">
                  <div className="flex items-center gap-2.5 justify-center md:justify-start">
                    <Award size={16} className="text-on-primary-container" />
                    <span>T. Professional: <strong>{directorProfile.tp}</strong></span>
                  </div>
                  <div className="flex items-center gap-2.5 justify-center md:justify-start">
                    <Mail size={16} className="text-on-primary-container" />
                    <span className="truncate">{directorProfile.email}</span>
                  </div>
                  <div className="flex items-center gap-2.5 justify-center md:justify-start">
                    <Phone size={16} className="text-on-primary-container" />
                    <span>{directorProfile.phone}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/10">
                  <div className="bg-white/10 rounded-lg p-3 text-center backdrop-blur-sm">
                    <p className="text-[10px] font-bold text-on-primary-container uppercase tracking-wider">Supervisión Total</p>
                    <p className="text-2xl font-bold mt-1 font-mono-numbers">{directorProfile.stats.count} Frentes</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 text-center backdrop-blur-sm">
                    <p className="text-[10px] font-bold text-on-primary-container uppercase tracking-wider">Avance Consolidado</p>
                    <p className="text-2xl font-bold mt-1 font-mono-numbers">{directorProfile.stats.avgProgress}%</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 text-center backdrop-blur-sm">
                    <p className="text-[10px] font-bold text-on-primary-container uppercase tracking-wider">Presupuesto Auditado</p>
                    <p className="text-base font-bold mt-2 font-mono-numbers truncate">{formatCurrency(directorProfile.stats.totalBudget)}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 text-center backdrop-blur-sm">
                    <p className="text-[10px] font-bold text-on-primary-container uppercase tracking-wider">Estado Operativo</p>
                    <div className="flex items-center justify-center gap-1.5 mt-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="text-xs font-bold">{directorProfile.status}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. BUSCADOR Y FILTROS */}
      <section className="mb-6 bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative w-full md:flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por nombre, especialidad, rol o permisos..." 
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded bg-slate-50 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filtros:</span>
          </div>

          <select 
            className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-primary"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ height: '32px' }}
          >
            <option value="todos">Todos los Roles</option>
            <option value="director">Director</option>
            <option value="residente_mv">Residente Malla Vial</option>
            <option value="residente_ep">Residente Espacio Público</option>
            <option value="especialista">Especialistas PAGA</option>
            <option value="supervisor_idu">Supervisor IDU</option>
          </select>

          <select 
            className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-primary"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ height: '32px' }}
          >
            <option value="todos">Todos los Estados</option>
            <option value="campo">En Campo</option>
            <option value="oficina">En Oficina / Campo</option>
          </select>
        </div>
      </section>

      {/* 3. LISTADO DE INGENIEROS */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
          Equipo de Supervisores y Residentes de Campo
        </h3>

        {residentsProfiles.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
            <p className="text-slate-500 text-sm">No se encontraron ingenieros que coincidan con los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {residentsProfiles.map(eng => {
              const isExpanded = expandedEngineer === eng.name;
              
              return (
                <div 
                  key={eng.name} 
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="p-5">
                    {/* Header profile info */}
                    <div className="flex items-start gap-4 justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-full ${eng.bgClass} ${eng.textColor} flex items-center justify-center font-bold text-base shadow-inner shrink-0`}>
                          {eng.initials}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-bold text-slate-800 text-base truncate">{eng.name}</h4>
                            <span className={`w-2 h-2 rounded-full ${eng.statusColor}`} title={eng.status}></span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <p className="text-primary text-[10px] font-bold uppercase tracking-wider">{eng.role}</p>
                            <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded border ${eng.roleConfig.color}`}>
                              {eng.roleConfig.badge}
                            </span>
                          </div>
                          <p className="text-slate-500 text-xs mt-1 truncate">{eng.specialty}</p>
                        </div>
                      </div>

                      {/* Edit Button */}
                      <button 
                        onClick={() => openEditModal(eng)}
                        className="text-slate-400 hover:text-primary rounded p-1 hover:bg-slate-50 transition-colors"
                        title="Editar Perfil"
                      >
                        <Edit size={14} />
                      </button>
                    </div>

                    {/* Permissions list */}
                    <div className="mt-3 flex flex-wrap gap-1 items-center">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mr-1">Permisos:</span>
                      {eng.roleConfig.perms.slice(0, 3).map(p => (
                        <span key={p} className="text-[8px] bg-slate-100 border border-slate-200/50 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                          ✓ {p}
                        </span>
                      ))}
                      {eng.roleConfig.perms.length > 3 && (
                        <span className="text-[8px] text-slate-400 font-medium italic">
                          +{eng.roleConfig.perms.length - 3} más
                        </span>
                      )}
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-lg p-3 mt-4 text-center">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Frentes</p>
                        <p className="text-sm font-extrabold text-slate-700 font-mono-numbers mt-0.5">{eng.stats.count}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Avance Promedio</p>
                        <p className="text-sm font-extrabold text-primary font-mono-numbers mt-0.5">{eng.stats.avgProgress}%</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Alertas / Críticos</p>
                        <div className="flex items-center justify-center gap-1 mt-0.5">
                          {eng.stats.alerta > 0 && (
                            <span className="flex items-center text-amber-600 font-bold text-xs" title="Frentes en Alerta">
                              <AlertTriangle size={12} className="mr-0.5" />
                              {eng.stats.alerta}
                            </span>
                          )}
                          {eng.stats.critico > 0 && (
                            <span className="flex items-center text-rose-600 font-bold text-xs" title="Frentes Críticos">
                              <XCircle size={12} className="mr-0.5" />
                              {eng.stats.critico}
                            </span>
                          )}
                          {eng.stats.alerta === 0 && eng.stats.critico === 0 && (
                            <span className="flex items-center text-emerald-600 font-bold text-xs" title="Todo al día">
                              <CheckCircle size={12} className="mr-0.5" />
                              OK
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 text-xs space-y-2 text-slate-600">
                      <div className="flex items-center gap-2">
                        <Award size={13} className="text-slate-400" />
                        <span>Matrícula Profesional: <strong className="font-mono-numbers">{eng.tp}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail size={13} className="text-slate-400" />
                        <span className="truncate">{eng.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone size={13} className="text-slate-400" />
                        <span>{eng.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="border-t border-slate-100 bg-slate-50/30 flex divide-x divide-slate-100">
                    <button 
                      onClick={() => toggleExpand(eng.name)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    >
                      <FileText size={14} className="text-slate-400" />
                      Ver Frentes ({eng.stats.count})
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    
                    <button 
                      onClick={() => openAssignModal(eng)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-primary hover:bg-blue-50/50 transition-colors"
                    >
                      <Plus size={14} />
                      Asignar Frentes
                    </button>
                  </div>

                  {/* Expandable list of frentes */}
                  {isExpanded && (
                    <div className="bg-slate-50 px-5 pb-5 pt-3 space-y-2 border-t border-slate-100 max-h-60 overflow-y-auto">
                      {eng.frentes.length === 0 ? (
                        <p className="text-slate-400 text-xs italic py-2">No tiene frentes de obra asignados actualmente. Haz clic en "Asignar Frentes" para agregar.</p>
                      ) : (
                        eng.frentes.map(f => (
                          <div 
                            key={f.id} 
                            className="bg-white border border-slate-200 rounded p-3 text-xs flex items-center justify-between hover:border-slate-300 transition-colors shadow-2xs"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-extrabold text-slate-700">Frente {f.frente}</span>
                                <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono-numbers">CIV {f.civ}</span>
                              </div>
                              <p className="text-slate-600 font-medium truncate mt-1 flex items-center gap-1">
                                <MapPin size={11} className="text-slate-400 shrink-0" />
                                {f.eje} ({f.desde} - {f.hasta})
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5 truncate">{f.projectName}</p>
                            </div>

                            <div className="text-right shrink-0 flex flex-col items-end gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono-numbers font-bold text-slate-700">{f.progress}%</span>
                                <div className="w-12 bg-slate-100 rounded-full h-1.5">
                                  <div 
                                    className="bg-primary h-1.5 rounded-full" 
                                    style={{ width: `${f.progress}%` }}
                                  ></div>
                                </div>
                              </div>
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                f.status === 'al-dia' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                  : f.status === 'alerta'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                    : 'bg-rose-50 text-rose-700 border border-rose-100'
                              }`}>
                                {f.status === 'al-dia' ? 'Al día' : f.status === 'alerta' ? 'Alerta' : 'Crítico'}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. MODAL: CREAR O EDITAR INGENIERO */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
          <div className="bg-white border border-slate-200 shadow-xl rounded-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-headline-md text-lg font-bold text-primary flex items-center gap-1.5">
                {editingEngineer ? <Edit size={18} /> : <UserPlus size={18} />}
                {editingEngineer ? 'Editar Perfil de Ingeniero' : 'Crear Perfil de Ingeniero'}
              </h3>
              <button 
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded p-1 transition-colors hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEngineer} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nombre Completo *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej. Ing. Pedro Perez" 
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Rol / Cargo del Sistema</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    style={{ height: '34px' }}
                  >
                    <option value="Director de Interventoría">Director de Interventoría</option>
                    <option value="Residente de Interventoría (Malla Vial)">Residente Malla Vial</option>
                    <option value="Residente de Interventoría (Espacio Público)">Residente Espacio Público</option>
                    <option value="Especialista Ambiental y Social (PAGA)">Especialista Ambiental/Social/SST</option>
                    <option value="Supervisor IDU (Cliente)">Supervisor IDU (Cliente)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Especialidad / Area</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Pavimentos y Suelos" 
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    value={formSpecialty}
                    onChange={(e) => setFormSpecialty(e.target.value)}
                  />
                </div>
              </div>

              {/* Dynamic Roles & Permissions Visualizer */}
              <div className="bg-slate-50 border border-slate-150 rounded-lg p-3 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 uppercase text-[9px] tracking-wider">Nivel de Acceso:</span>
                  <span className="font-extrabold text-[9px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800">
                    {activeFormRoleConfig.badge}
                  </span>
                </div>
                <p className="text-slate-500 text-[10px] leading-normal">{activeFormRoleConfig.description}</p>
                <div className="flex flex-wrap gap-1 pt-1.5 border-t border-slate-100">
                  {activeFormRoleConfig.perms.map(p => (
                    <span key={p} className="text-[9px] bg-slate-200/50 text-slate-700 px-2 py-0.5 rounded font-medium">
                      ✓ {p}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tarjeta Profesional (T.P.)</label>
                  <input 
                    type="text" 
                    placeholder="Ej. 12345-CND" 
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono-numbers focus:ring-1 focus:ring-primary focus:outline-none"
                    value={formTp}
                    onChange={(e) => setFormTp(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Estado de Disponibilidad</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    style={{ height: '34px' }}
                  >
                    <option value="En Campo">En Campo</option>
                    <option value="En Oficina Principal">En Oficina Principal</option>
                    <option value="En Oficina de Campo">En Oficina de Campo</option>
                    <option value="Licencia Temporal">Licencia Temporal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">E-mail Corporativo</label>
                  <input 
                    type="email" 
                    placeholder="correo@interventor-ia.gov.co" 
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Teléfono Móvil</label>
                  <input 
                    type="text" 
                    placeholder="Ej. +57 300 123 4567" 
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono-numbers focus:ring-1 focus:ring-primary focus:outline-none"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="bg-[#00236f] text-white font-bold text-xs px-5 py-2.5 rounded shadow hover:bg-primary-container transition-colors flex items-center gap-1 active:scale-95 duration-100"
                >
                  <Check size={14} />
                  {editingEngineer ? 'Guardar Cambios' : 'Crear Perfil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: ASIGNACIÓN DE FRENTES */}
      {isAssignModalOpen && selectedEngineerForAssign && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
          <div className="bg-white border border-slate-200 shadow-xl rounded-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-headline-md text-lg font-bold text-primary">
                  Asignar Frentes de Obra
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  Gestiona los frentes bajo la supervisión de <strong>{selectedEngineerForAssign.name}</strong>
                </p>
              </div>
              <button 
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setSelectedEngineerForAssign(null);
                }}
                className="text-slate-400 hover:text-slate-600 rounded p-1 transition-colors hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
              {projects.map(proj => {
                const projFrentes = proj.frentes || [];
                return (
                  <div key={proj.id} className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
                    <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100">
                      <h4 className="font-bold text-xs text-primary uppercase tracking-wider">{proj.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono-numbers mt-0.5">Contrato: {proj.contractNo}</p>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {projFrentes.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-xs italic">
                          No hay frentes disponibles en este contrato.
                        </div>
                      ) : (
                        projFrentes.map(f => {
                          const isCurrentlySelected = tempFrenteAssignments.includes(f.id);
                          const isAssignedToOther = f.supervisor && f.supervisor !== 'Sin Asignar' && !isSupervisorOf(f, selectedEngineerForAssign);

                          return (
                            <label 
                              key={f.id} 
                              className={`flex items-start gap-3 p-3.5 hover:bg-slate-50/40 transition-colors cursor-pointer text-xs ${
                                isCurrentlySelected ? 'bg-blue-50/15' : ''
                              }`}
                            >
                              <input 
                                type="checkbox" 
                                className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                                checked={isCurrentlySelected}
                                onChange={() => handleToggleFrenteTemp(f.id)}
                              />
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-slate-700">Frente {f.frente}</span>
                                  <span className="text-[9px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.2 rounded">CIV {f.civ}</span>
                                  
                                  {isAssignedToOther && (
                                    <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-100/50">
                                      Asignado a: {f.supervisor}
                                    </span>
                                  )}
                                </div>
                                <p className="text-slate-500 font-medium mt-1 truncate">
                                  {f.eje} ({f.desde} - {f.hasta})
                                </p>
                              </div>

                              <div className="text-right shrink-0">
                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded font-sans ${
                                  f.status === 'al-dia' 
                                    ? 'bg-emerald-50 text-emerald-700' 
                                    : f.status === 'alerta'
                                      ? 'bg-amber-50 text-amber-700'
                                      : 'bg-rose-50 text-rose-700'
                                }`}>
                                  {f.status === 'al-dia' ? 'Al día' : f.status === 'alerta' ? 'Alerta' : 'Crítico'}
                                </span>
                                <p className="text-[10px] font-mono-numbers text-slate-400 mt-1">Avance: {f.progress}%</p>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <div className="text-xs font-bold text-slate-500">
                Seleccionados: <span className="text-primary font-mono-numbers">{tempFrenteAssignments.length}</span> frentes
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsAssignModalOpen(false);
                    setSelectedEngineerForAssign(null);
                  }}
                  className="px-4 py-2 border border-slate-200 bg-white rounded text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveAssignments}
                  className="bg-[#00236f] text-white font-bold text-xs px-5 py-2 rounded shadow hover:bg-primary-container transition-colors flex items-center gap-1 active:scale-95 duration-100"
                >
                  <Check size={14} />
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
