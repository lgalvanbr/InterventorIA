import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Sidebar from './components/Sidebar';
import { initializeWeeklyReports, initialWeekForProject, calculateConsolidatedMetrics, addMissingFrentes } from './data/reportsWeekly';
import { diffReports } from './data/reportsMerge';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { storageKey, apiPath, isDefaultProject } from './data/projectSession';
import { configToProjects } from './data/projectConfig';
import { useProject } from './context/ProjectContext';

// Contratos generados desde la configuración del proyecto, conservando lo editado en este
// navegador (estado, cumplimiento, fotos de galería...) y actualizando los datos del proyecto
// (CIV, eje, tramo, coordenadas, nombres).
const CONFIG_FRENTE_FIELDS = ['frente', 'alias', 'civ', 'eje', 'desde', 'hasta', 'barrio', 'tipoIntervencion', 'prioridad', 'name', 'latitude', 'longitude', 'adicion', 'pk'];
const CONFIG_CONTRACT_FIELDS = ['name', 'shortName', 'contractNo', 'contractor', 'constructionBudget', 'interventoriaBudget', 'duration', 'description', 'frentePrefix'];
function mergeProjectsWithConfig(saved, config) {
  const fresh = configToProjects(config);
  if (!Array.isArray(saved) || saved.length === 0) return fresh;
  return fresh.map(contract => {
    const old = saved.find(p => p.id === contract.id);
    if (!old) return contract;
    const merged = { ...old };
    CONFIG_CONTRACT_FIELDS.forEach(k => { merged[k] = contract[k]; });
    merged.frentes = contract.frentes.map(f => {
      const prev = (old.frentes || []).find(of => of.id === f.id);
      if (!prev) return f;
      const next = { ...prev };
      CONFIG_FRENTE_FIELDS.forEach(k => { next[k] = f[k]; });
      return next;
    });
    return merged;
  });
}

// Vistas con carga perezosa resiliente a nuevos despliegues (auto-recuperación de chunks obsoletos)
const Dashboard = lazyWithRetry(() => import('./components/Dashboard'));
const ProjectDetail = lazyWithRetry(() => import('./components/ProjectDetail'));
const ReportsView = lazyWithRetry(() => import('./components/ReportsView'));
const ConfigView = lazyWithRetry(() => import('./components/ConfigView'));
const FrentesControl = lazyWithRetry(() => import('./components/FrentesControl'));
const WeeklyReports = lazyWithRetry(() => import('./components/WeeklyReports'));
const WeeklyReportPanel = lazyWithRetry(() => import('./components/WeeklyReportPanel'));
const EngineersView = lazyWithRetry(() => import('./components/EngineersView'));
const CorrespondenciaView = lazyWithRetry(() => import('./components/CorrespondenciaView'));
const InspectorPortal = lazyWithRetry(() => import('./components/InspectorPortal'));
const MapView = lazyWithRetry(() => import('./components/MapView'));
const ProjectInfo = lazyWithRetry(() => import('./components/ProjectInfo'));

// Componente visual elegante de carga para transiciones entre módulos
function ViewLoadingFallback() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-fade-in">
      <div className="relative flex items-center justify-center mb-4">
        <div className="w-12 h-12 rounded-full border-3 border-primary/20 border-t-primary animate-spin" />
        <span className="material-symbols-outlined text-primary text-xl absolute">construction</span>
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cargando módulo de interventoría...</p>
    </div>
  );
}

// Copia local para abrir rápido y sin conexión. Se escribe agrupada (1,5 MB de JSON por
// escritura): antes se escribía en cada tecla del autoguardado y trababa los celulares.
let pendingLocalReports = null;
let localWriteTimer = null;
const flushWeeklyReportsToStorage = () => {
  clearTimeout(localWriteTimer);
  if (!pendingLocalReports) return;
  try {
    localStorage.setItem(storageKey('geo_interventoria_weekly_reports'), JSON.stringify(pendingLocalReports));
  } catch (err) {
    console.warn("No se pudo guardar la copia local de informes:", err);
  }
  pendingLocalReports = null;
};
const saveWeeklyReportsToStorage = (reports) => {
  pendingLocalReports = reports;
  clearTimeout(localWriteTimer);
  localWriteTimer = setTimeout(flushWeeklyReportsToStorage, 2000);
};
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushWeeklyReportsToStorage);
}

export default function App() {
  const projectConfig = useProject();
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeFrenteId, setActiveFrenteId] = useState(null);
  const [view, setView] = useState('dashboard'); // 'dashboard', 'project-detail', 'reports', 'config', 'weekly-detail'
  const [weeklyReports, setWeeklyReportsState] = useState([]);
  // Copia síncrona del estado: evita que guardados consecutivos partan de una versión vieja
  const weeklyReportsRef = useRef([]);
  const saveQueueRef = useRef(Promise.resolve());
  const failedChangesRef = useRef([]); // cambios que no llegaron a la nube; se reenvían
  const pendingWeeksRef = useRef(new Map()); // semana -> guardados en curso
  const [syncError, setSyncError] = useState('');
  const [failedCount, setFailedCount] = useState(0);
  const [isDataFresh, setIsDataFresh] = useState(false); // true cuando ya llegaron los datos de la nube
  const setWeeklyReports = useCallback((next) => {
    const value = typeof next === 'function' ? next(weeklyReportsRef.current) : next;
    weeklyReportsRef.current = value;
    setWeeklyReportsState(value);
  }, []);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [selectedDetailFrenteId, setSelectedDetailFrenteId] = useState(null);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isInspectorMode, setIsInspectorMode] = useState(false);
  const [isContractorMode, setIsContractorMode] = useState(false);
  const [isLandingOnlyMode, setIsLandingOnlyMode] = useState(false);
  const [designOverrides, setDesignOverrides] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey('geo_interventoria_design_overrides')) || '{}');
    } catch (e) {
      return {};
    }
  });

  const handleUpdateDesignOverrides = (newOverrides) => {
    setDesignOverrides(newOverrides);
    localStorage.setItem(storageKey('geo_interventoria_design_overrides'), JSON.stringify(newOverrides));
    fetch(apiPath('/api/design-overrides'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOverrides)
    }).catch(err => console.error("Error syncing design overrides to Supabase:", err));
  };

  const mergeSupabasePhotosIntoProjects = (weeklyData, currentProjects) => {
    if (!Array.isArray(weeklyData) || weeklyData.length === 0 || !Array.isArray(currentProjects)) return currentProjects;
    
    // Map of frenteId -> all photos from Supabase weeklyReports
    const photosByFrente = new Map();
    weeklyData.forEach(r => {
      (r.frentes || []).forEach(wf => {
        const photosList = [...(wf.fotos || []), ...(wf.photos || [])];
        if (photosList.length > 0) {
          if (!photosByFrente.has(wf.id)) {
            photosByFrente.set(wf.id, new Map());
          }
          const fMap = photosByFrente.get(wf.id);
          photosList.forEach(p => {
            const key = p.id || p.url;
            if (key && !fMap.has(key)) {
              fMap.set(key, p);
            }
          });
        }
      });
    });

    return currentProjects.map(p => ({
      ...p,
      frentes: (p.frentes || []).map(pf => {
        const cloudPhotosMap = photosByFrente.get(pf.id);
        if (cloudPhotosMap) {
          const mergedMap = new Map();
          // Keep existing local photos
          [...(pf.photos || []), ...(pf.fotos || [])].forEach(p => {
            const key = p.id || p.url;
            if (key) mergedMap.set(key, p);
          });
          // Add Supabase cloud photos
          cloudPhotosMap.forEach((photo, key) => {
            if (!mergedMap.has(key)) {
              mergedMap.set(key, photo);
            }
          });
          const mergedList = Array.from(mergedMap.values());
          return {
            ...pf,
            photos: mergedList,
            fotos: mergedList
          };
        }
        return pf;
      })
    }));
  };

  // Load from localStorage or set defaults
  useEffect(() => {
    let savedProjects = null;
    try {
      savedProjects = JSON.parse(localStorage.getItem(storageKey('geo_interventoria_projects_v7')) || 'null');
    } catch (e) {
      console.error("Copia local de proyectos ilegible; se usa la configuración del proyecto:", e);
    }
    const loadedProjects = mergeProjectsWithConfig(savedProjects, projectConfig);
    setProjects(loadedProjects);
    // Frentes del proyecto en el formato de las semanas (para sembrar o completar semanas)
    const allFrentes = loadedProjects.flatMap(p =>
      (p.frentes || []).map(f => {
        const civMatch = f.civ || (f.name?.match(/CIV\s+(\d+)/i)?.[1] || '');
        const ejeMatch = f.eje || (f.name?.match(/\(([^)]+)\)/)?.[1] || f.name || '');
        let frenteNum = f.frente;
        if (!frenteNum && f.id) {
          const parts = f.id.split('_');
          if (parts.length >= 3) {
            const num = parseInt(parts[2]);
            if (parts[1] === 'mv') frenteNum = num;
            else if (parts[1] === 'ep') frenteNum = num + 100;
          }
        }
        return {
          ...f,
          frente: frenteNum || '',
          civ: civMatch,
          eje: ejeMatch,
          projectName: p.name,
          contractNo: p.contractNo
        };
      })
    );
    const viewParam = new URLSearchParams(window.location.search);
    const isReadOnlyView = ['contractor', 'landing', 'dashboard', 'landing-only', 'map', 'map-only'].includes(viewParam.get('mode') || viewParam.get('view') || viewParam.get('share') || '');
    try {
      localStorage.setItem(storageKey('geo_interventoria_projects_v7'), JSON.stringify(loadedProjects));
    } catch { /* sin almacenamiento */ }

    // Fetch design overrides from Supabase and save to local storage
    fetch(apiPath('/api/design-overrides'))
      .then(res => res.json())
      .then(data => {
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          localStorage.setItem(storageKey('geo_interventoria_design_overrides'), JSON.stringify(data));
          setDesignOverrides(data);
        }
      })
      .catch(err => console.warn("Error loading design overrides from cloud:", err));

    // Fetch project info from Supabase and save to local storage
    fetch(apiPath('/api/project-info'))
      .then(res => res.json())
      .then(data => {
        if (data && data.objeto) {
          localStorage.setItem(storageKey('geo_interventoria_project_info_v1'), JSON.stringify(data));
        }
      })
      .catch(err => console.warn("Error loading project info from cloud:", err));

    // Load weekly reports from local server API database / Supabase
    let localWeekly = null;
    try {
      const raw = localStorage.getItem(storageKey('geo_interventoria_weekly_reports'));
      if (raw) localWeekly = JSON.parse(raw);
    } catch (e) {}

    if (localWeekly && Array.isArray(localWeekly)) {
      setWeeklyReports(localWeekly);
    }

    fetch(apiPath('/api/weekly-reports'))
      .then(async res => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        setSyncError('');
        setIsDataFresh(true);
        if (Array.isArray(data) && data.length > 0) {
          // Frentes nuevos del proyecto (p. ej. una adición) entran en la semana más reciente;
          // las siguientes semanas los heredan al clonarse
          const latest = data.reduce((max, r) => (Number(r.numero_semana) > Number(max.numero_semana) ? r : max), data[0]);
          const completed = addMissingFrentes(latest, allFrentes);
          if (completed !== latest) {
            const withNew = data.map(r => (r === latest ? calculateConsolidatedMetrics(completed.frentes, completed) : r));
            if (!isReadOnlyView) {
              weeklyReportsRef.current = data; // los cambios se calculan contra lo que hay en la nube
              handleUpdateWeeklyReports(withNew).catch(() => {});
            }
            data = withNew;
          }
          setWeeklyReports(data);
          saveWeeklyReportsToStorage(data);

          // Synchronize Supabase photos into projects state so PhotoGallery & ProjectDetail render them immediately
          setProjects(prevProjects => {
            const updated = mergeSupabasePhotosIntoProjects(data, prevProjects);
            saveProjects(updated);
            return updated;
          });
        } else if (!localWeekly) {
          // Usaquén conserva su semana base histórica; un proyecto nuevo arranca en la semana de hoy
          const seededWeekly = isDefaultProject
            ? initializeWeeklyReports(allFrentes)
            : [initialWeekForProject(allFrentes, projectConfig.calendario)];
          handleUpdateWeeklyReports(seededWeekly).catch(() => {});
        }
      })
      .catch(err => {
        console.error("Error loading weekly reports from API:", err);
        setSyncError(`No se pudieron cargar las semanas desde la base de datos (${err.message}). Se muestra la copia guardada en este dispositivo; los cambios no se guardarán en la nube hasta que vuelva la conexión.`);
      });

    // Default active project
    const savedActiveId = localStorage.getItem(storageKey('geo_interventoria_active_id'));
    if (savedActiveId) {
      setActiveProjectId(savedActiveId);
    }

    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode') || params.get('view') || params.get('share');
    if (modeParam === 'inspector') {
      setIsInspectorMode(true);
      setView('inspector-portal');
    } else if (modeParam === 'contractor') {
      setIsContractorMode(true);
      setView('dashboard');
    } else if (modeParam === 'landing' || modeParam === 'dashboard' || modeParam === 'landing-only') {
      setIsContractorMode(true);
      setIsLandingOnlyMode(true);
      setView('dashboard');
    } else if (modeParam === 'map' || modeParam === 'map-only') {
      setView('map-only');
    }
  }, []);

  // Si llega una versión editada de la configuración del proyecto, actualizar los contratos
  const configAppliedRef = useRef(projectConfig);
  useEffect(() => {
    if (configAppliedRef.current === projectConfig) return;
    configAppliedRef.current = projectConfig;
    setProjects(prev => {
      const next = mergeProjectsWithConfig(prev, projectConfig);
      try {
        localStorage.setItem(storageKey('geo_interventoria_projects_v7'), JSON.stringify(next));
      } catch { /* sin almacenamiento */ }
      return next;
    });
  }, [projectConfig]);

  const saveProjects = (updatedProjects) => {
    setProjects(updatedProjects);
    try {
      localStorage.setItem(storageKey('geo_interventoria_projects_v7'), JSON.stringify(updatedProjects));
    } catch (err) {
      console.warn("localStorage saveProjects warning:", err);
    }
  };

  // Envía a la nube operaciones (semanas nuevas, campos y fotos/notas por id). El servidor las
  // aplica sobre la última versión de cada semana, así no se pisan los cambios de otros celulares.
  // Si falla, los cambios quedan en cola y se reenvían con el siguiente guardado o al volver la red.
  // Devuelve una promesa que falla si la nube no confirmó el guardado.
  const sendChanges = useCallback((changes) => {
    const weeks = [...new Set(changes.map(c => Number(c.semana)))];
    weeks.forEach(w => pendingWeeksRef.current.set(w, (pendingWeeksRef.current.get(w) || 0) + 1));

    const run = saveQueueRef.current.then(async () => {
      const retried = failedChangesRef.current;
      failedChangesRef.current = [];
      const toSend = [...retried, ...changes];
      try {
        const res = await fetch(apiPath('/api/weekly-reports'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ changes: toSend }),
          signal: AbortSignal.timeout(45000)
        });
        const result = await res.json().catch(() => ({}));
        if (!res.ok || !result.persisted) {
          throw new Error(result.error || `HTTP ${res.status}`);
        }
        setSyncError('');
        setFailedCount(0);
        return result;
      } catch (err) {
        failedChangesRef.current = [...toSend, ...failedChangesRef.current];
        setFailedCount(failedChangesRef.current.length);
        throw err;
      }
    }).then(result => {
      weeks.forEach(w => pendingWeeksRef.current.set(w, pendingWeeksRef.current.get(w) - 1));
      const saved = (result.reports || []).filter(r => !(pendingWeeksRef.current.get(Number(r.numero_semana)) > 0));
      if (saved.length > 0) {
        // Versión confirmada por el servidor (incluye lo que otros guardaron), salvo semanas
        // con otro guardado en camino: esa respuesta llegará después
        setWeeklyReports(prev => {
          const byWeek = new Map(saved.map(r => [Number(r.numero_semana), r]));
          const next = prev.map(r => {
            const fresh = byWeek.get(Number(r.numero_semana));
            if (fresh) byWeek.delete(Number(r.numero_semana));
            return fresh || r;
          });
          const merged = [...byWeek.values(), ...next];
          saveWeeklyReportsToStorage(merged);
          return merged;
        });
      }
      // Semana ya creada por otro dispositivo: se usa la existente (viene en result.reports)
      return result;
    }, err => {
      weeks.forEach(w => pendingWeeksRef.current.set(w, pendingWeeksRef.current.get(w) - 1));
      throw err;
    });

    saveQueueRef.current = run.catch(() => {});
    run.catch(err => {
      console.error("Error guardando informes semanales:", err);
      setSyncError(`Sin conexión con la nube (${err.message}). Los cambios quedan en este dispositivo y se enviarán al reconectar.`);
    });
    return run;
  }, [setWeeklyReports]);

  function handleUpdateWeeklyReports(updatedReports) {
    const changes = diffReports(weeklyReportsRef.current, updatedReports);
    setWeeklyReports(updatedReports);
    saveWeeklyReportsToStorage(updatedReports);
    if (changes.length === 0) {
      // Nada nuevo, pero si hay cambios en cola sin enviar, el guardado aún no está completo
      return failedChangesRef.current.length > 0 ? sendChanges([]) : Promise.resolve();
    }
    return sendChanges(changes);
  }

  const retryFailedChanges = useCallback(() => {
    if (failedChangesRef.current.length === 0) return Promise.resolve();
    return sendChanges([]).catch(() => {});
  }, [sendChanges]);

  // Reintento automático al recuperar la conexión
  useEffect(() => {
    const onOnline = () => { retryFailedChanges(); };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [retryFailedChanges]);

  const handleSaveFrenteData = (reportId, frenteId, updatedData) => {
    const updatedReports = weeklyReportsRef.current.map(r => {
      if (String(r.id_informe) === String(reportId)) {
        const newFrentes = r.frentes.map(f => {
          if (f.id === frenteId) {
            return {
              ...f,
              ...updatedData
            };
          }
          return f;
        });
        return calculateConsolidatedMetrics(newFrentes, r);
      }
      return r;
    });
    return handleUpdateWeeklyReports(updatedReports);
  };

  const handleAddProject = (newProject) => {
    const updated = [newProject, ...projects];
    saveProjects(updated);
  };

  const handleSelectProject = (projectId) => {
    setActiveProjectId(projectId);
    localStorage.setItem(storageKey('geo_interventoria_active_id'), projectId);
    
    // Auto-focus first frente
    const proj = projects.find(p => p.id === projectId);
    if (proj && proj.frentes?.length > 0) {
      setActiveFrenteId(proj.frentes[0].id);
    } else {
      setActiveFrenteId(null);
    }
    
    setView('project-detail');
  };

  const syncFrentesPhotosToWeeklyReports = (updatedFrentes) => {
    if (!weeklyReportsRef.current || weeklyReportsRef.current.length === 0 || !updatedFrentes) return;
    const sorted = [...weeklyReportsRef.current].sort((a, b) => b.numero_semana - a.numero_semana);
    const latestReportId = sorted[0].id_informe;
    
    let hasChanges = false;
    const nextWeekly = weeklyReportsRef.current.map(r => {
      if (String(r.id_informe) === String(latestReportId)) {
        const newFrentes = (r.frentes || []).map(wf => {
          const matchingUpdated = updatedFrentes.find(uf => uf.id === wf.id);
          if (matchingUpdated && (matchingUpdated.photos || matchingUpdated.fotos)) {
            const allNewPhotos = [...(matchingUpdated.photos || []), ...(matchingUpdated.fotos || [])];
            const existingPhotosMap = new Map((wf.fotos || []).map(p => [p.id || p.url, p]));
            let added = false;
            allNewPhotos.forEach(p => {
              const key = p.id || p.url;
              if (key && !existingPhotosMap.has(key)) {
                existingPhotosMap.set(key, p);
                added = true;
              }
            });
            if (added) {
              hasChanges = true;
              return {
                ...wf,
                fotos: Array.from(existingPhotosMap.values()),
                photos: Array.from(existingPhotosMap.values())
              };
            }
          }
          return wf;
        });
        return calculateConsolidatedMetrics(newFrentes, r);
      }
      return r;
    });

    if (hasChanges) {
      handleUpdateWeeklyReports(nextWeekly);
    }
  };

  const handleUpdateProject = (updatedProject, shouldDelete = false) => {
    if (shouldDelete) {
      const updated = projects.filter(p => p.id !== activeProjectId);
      saveProjects(updated);
      setView('dashboard');
      setActiveProjectId(null);
      localStorage.removeItem(storageKey('geo_interventoria_active_id'));
      setActiveFrenteId(null);
      return;
    }

    const updated = projects.map(p => p.id === updatedProject.id ? updatedProject : p);
    saveProjects(updated);
    if (updatedProject.frentes) {
      syncFrentesPhotosToWeeklyReports(updatedProject.frentes);
    }
  };

  const handleViewChange = (newView) => {
    if (newView === 'project-detail') {
      // If navigating directly from sidebar to map view, reset active project to show unified map
      setActiveProjectId(null);
      localStorage.removeItem(storageKey('geo_interventoria_active_id'));
      setActiveFrenteId(null);
    }
    setView(newView);
  };

  const activeProject = projects.find(p => p.id === activeProjectId) || null;

  // Build a virtual consolidated project to show all 42 frentes of both contracts
  const getUnifiedProject = () => {
    return {
      id: 'unified_project',
      name: `Consolidado general – ${projectConfig.nombre}`,
      contractNo: (projectConfig.contratos || []).map(c => c.numero).filter(Boolean).join(' / ') || 'Consolidado',
      contractor: (projectConfig.contratos || []).map(c => c.contratista).filter(Boolean).join(' / '),
      constructionBudget: projects.reduce((acc, curr) => acc + (curr.constructionBudget || 0), 0),
      interventoriaBudget: projects.reduce((acc, curr) => acc + (curr.interventoriaBudget || 0), 0),
      duration: 18,
      plannedProgress: 63,
      description: `Vista integrada de los frentes de ${(projectConfig.contratos || []).map(c => c.nombreCorto).join(' y ')} en ${projectConfig.ubicacion || 'el proyecto'}.`,
      frentes: projects.flatMap(p => p.frentes || [])
    };
  };

  const handleUpdateProjectOrUnified = (updatedProject, shouldDelete = false) => {
    if (activeProjectId) {
      handleUpdateProject(updatedProject, shouldDelete);
    } else {
      // Propagate edits to the sub-projects containing the frentes
      const updatedFrentes = updatedProject.frentes;
      const newProjects = projects.map(p => {
        const subFrentes = updatedFrentes.filter(uf => {
          // Cada contrato conserva los frentes con su prefijo (f_mv, f_ep, ...)
          return Boolean(p.frentePrefix) && String(uf.id).startsWith(`${p.frentePrefix}_`);
        });
        return {
          ...p,
          frentes: subFrentes
        };
      });
      saveProjects(newProjects);
      if (updatedFrentes) {
        syncFrentesPhotosToWeeklyReports(updatedFrentes);
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f7f9fb] text-on-surface">
      {/* Sidebar Navigation */}
      {!isInspectorMode && !isLandingOnlyMode && view !== 'map-only' && (
        <Sidebar 
          currentView={view} 
          onViewChange={handleViewChange} 
          activeProjectId={activeProjectId}
          isExpanded={isSidebarHovered}
          onMouseEnter={() => setIsSidebarHovered(true)}
          onMouseLeave={() => setIsSidebarHovered(false)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          isContractorMode={isContractorMode}
        />
      )}

      {/* Main Content routing with dynamic padding-left for sidebar offset */}
      <div className={`flex-1 transition-all duration-300 min-w-0 ${(isInspectorMode || isLandingOnlyMode || view === 'map-only') ? 'pl-0' : (isSidebarHovered ? 'md:pl-64 pl-0' : 'md:pl-16 pl-0')}`}>
        {syncError && (
          <div role="alert" className="sticky top-0 z-50 flex items-start gap-2 bg-red-50 border-b border-red-200 px-4 py-2.5 text-xs font-semibold text-red-700">
            <span className="material-symbols-outlined text-base">cloud_off</span>
            <span className="flex-1">{syncError}</span>
            {failedCount > 0 && (
              <button onClick={retryFailedChanges} className="bg-red-600 text-white rounded px-2 py-0.5 font-bold border-none cursor-pointer">
                Reintentar
              </button>
            )}
            <button onClick={() => setSyncError('')} className="bg-transparent border-none text-red-700 cursor-pointer font-bold" aria-label="Cerrar aviso">×</button>
          </div>
        )}
        {/* Landing Only Top Bar */}
        {isLandingOnlyMode && (
          <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-2.5 sticky top-0 z-30 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-sm shadow-xs">
                <span className="material-symbols-outlined text-lg">construction</span>
              </div>
              <div>
                <span className="font-headline-md text-sm sm:text-base font-extrabold text-primary tracking-tight block leading-tight">
                  {projectConfig.marca?.nombre}
                </span>
                <span className="text-xs text-slate-500 block">
                  Tablero de frentes de obra
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a 
                href="/?mode=map"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/15 text-primary text-xs font-bold transition-all no-underline cursor-pointer"
                title="Abrir mapa georreferenciado completo"
              >
                <span className="material-symbols-outlined text-sm">map</span>
                <span className="hidden sm:inline">Ver Mapa Interactivo</span>
                <span className="sm:hidden">Mapa</span>
              </a>
            </div>
          </header>
        )}

        {/* Mobile Header Bar */}
        {!isInspectorMode && !isLandingOnlyMode && view !== 'map-only' && (
          <header className="flex items-center gap-3 bg-white border-b border-slate-200 px-4 py-3 md:hidden sticky top-0 z-30 shadow-xs">
            <button 
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 text-slate-650 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer flex items-center justify-center border-none bg-transparent"
              aria-label="Abrir menú"
            >
              <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl font-bold">construction</span>
              <span className="font-headline-md text-sm font-black text-primary tracking-tight">
                {projectConfig.marca?.nombreCorto || projectConfig.marca?.nombre}{isContractorMode ? ' – contratista' : ''}
              </span>
            </div>
          </header>
        )}
        <Suspense fallback={<ViewLoadingFallback />}>
        {view === 'dashboard' && (
          <Dashboard 
            projects={projects} 
            onSelectProject={handleSelectProject} 
            onAddProject={handleAddProject}
            isContractorMode={isContractorMode}
            weeklyReports={weeklyReports}
            onNavigateToReports={() => setView('reports')}
          />
        )}

        {view === 'project-detail' && (
          <ProjectDetail 
            project={activeProject || getUnifiedProject()} 
            isContractorMode={isContractorMode}
            onBack={() => {
              setView('dashboard');
              setActiveProjectId(null);
              localStorage.removeItem(storageKey('geo_interventoria_active_id'));
              setActiveFrenteId(null);
            }} 
            onResetToUnified={() => {
              setActiveProjectId(null);
              localStorage.removeItem(storageKey('geo_interventoria_active_id'));
              setActiveFrenteId(null);
            }}
            onUpdateProject={handleUpdateProjectOrUnified}
            isUnified={!activeProjectId}
            activeFrenteId={activeFrenteId}
            onFrenteSelect={(frenteId) => {
              if (!activeProjectId) {
                // Unified view: find which project contains this frente!
                const parentProj = projects.find(p => p.frentes?.some(f => f.id === frenteId));
                if (parentProj) {
                  // Switch project dynamically!
                  setActiveProjectId(parentProj.id);
                  localStorage.setItem(storageKey('geo_interventoria_active_id'), parentProj.id);
                  setActiveFrenteId(frenteId);
                }
              } else {
                setActiveFrenteId(frenteId);
              }
            }}
          />
        )}

        {view === 'reports' && (
          <ReportsView 
            projects={projects}
            weeklyReports={weeklyReports}
          />
        )}

        {view === 'frentes-control' && (
          <FrentesControl 
            projects={projects}
            designOverrides={designOverrides}
            onUpdateDesignOverrides={handleUpdateDesignOverrides}
          />
        )}

        {view === 'project-info' && (
          <ProjectInfo isContractorMode={isContractorMode} />
        )}

        {view === 'weekly-reports' && (
          <WeeklyReports 
            weeklyReports={weeklyReports}
            onUpdateReports={handleUpdateWeeklyReports}
            isContractorMode={isContractorMode}
            onNavigateToDetail={(reportId, frenteId) => {
              setSelectedReportId(reportId);
              setSelectedDetailFrenteId(frenteId);
              setView('weekly-detail');
            }}
          />
        )}

        {view === 'weekly-detail' && (
          <WeeklyReportPanel 
            report={weeklyReports.find(r => String(r.id_informe) === String(selectedReportId))}
            weeklyReports={weeklyReports}
            initialEditingFrenteId={selectedDetailFrenteId}
            allFrentes={projects.flatMap(p => p.frentes || [])}
            designOverrides={designOverrides}
            onUpdateDesignOverrides={handleUpdateDesignOverrides}
            isContractorMode={isContractorMode}
            onClose={() => {
              setView('weekly-reports');
              setSelectedReportId(null);
              setSelectedDetailFrenteId(null);
            }}
            onSaveFrente={(updatedFrente) => {
              const updatedReports = weeklyReportsRef.current.map(r => {
                if (String(r.id_informe) === String(selectedReportId)) {
                  const newFrentes = r.frentes.map(f => f.id === updatedFrente.id ? updatedFrente : f);
                  return calculateConsolidatedMetrics(newFrentes, r);
                }
                return r;
              });
              handleUpdateWeeklyReports(updatedReports);
            }}
            onSaveReport={(updatedReport) => {
              const updatedReports = weeklyReportsRef.current.map(r => String(r.id_informe) === String(updatedReport.id_informe) ? updatedReport : r);
              return handleUpdateWeeklyReports(updatedReports);
            }}
          />
        )}

        {view === 'config' && (
          <ConfigView projects={projects} />
        )}

        {view === 'correspondencia' && (
          <CorrespondenciaView projects={projects} isContractorMode={isContractorMode} />
        )}

        {view === 'engineers' && (
          <EngineersView projects={projects} onUpdateProjects={saveProjects} />
        )}

        {view === 'inspector-portal' && (
          <InspectorPortal 
            weeklyReports={weeklyReports}
            onSaveFrenteData={handleSaveFrenteData}
            onUpdateReports={handleUpdateWeeklyReports}
            isDataFresh={isDataFresh}
            pendingSyncCount={failedCount}
          />
        )}

        {view === 'map-only' && (
          <div className="map-only-view">
            <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-2.5 flex items-center justify-between z-10 shadow-xs shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  <span className="material-symbols-outlined text-lg">map</span>
                </div>
                <div>
                  <h1 className="text-sm font-extrabold text-primary leading-tight">
                    Mapa de frentes – {projectConfig.marca?.nombreCorto || projectConfig.marca?.nombre}
                  </h1>
                  <p className="text-xs text-slate-500">
                    {projectConfig.nombre}: {projects.reduce((n, p) => n + (p.frentes?.length || 0), 0)} frentes georreferenciados
                  </p>
                </div>
              </div>
            </header>
            <MapView 
              frentes={projects.flatMap(p => p.frentes || [])}
              isUnified={true}
            />
            
            <style dangerouslySetInnerHTML={{ __html: `
              .map-only-view {
                width: 100vw;
                height: 100vh;
                display: flex;
                flex-direction: column;
                background-color: #f8fafc;
              }
              .map-only-view .map-card {
                flex: 1;
                height: 100% !important;
                border: none !important;
                border-radius: 0 !important;
              }
              .map-only-view .map-wrapper {
                flex: 1;
                height: 100%;
              }
            `}} />
          </div>
        )}
        </Suspense>
      </div>
    </div>
  );
}
