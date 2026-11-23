import React, { useEffect, useState, Suspense } from 'react';
import App from './App.jsx';
import { ProjectContext } from './context/ProjectContext';
import { CURRENT_PROJECT_ID, isDefaultProject } from './data/projectSession';
import { USAQUEN_CONFIG } from './data/proyectos/usaquen';
import { applyBrand } from './utils/brand';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { InterventorIAMark } from './components/InterventorIAMark';

const ProjectSelector = lazyWithRetry(() => import('./components/ProjectSelector'));
const ProjectAssistant = lazyWithRetry(() => import('./components/ProjectAssistant'));

const mode = new URLSearchParams(window.location.search).get('mode');

function FullScreenMessage({ children }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center bg-[#eef0f2] text-slate-700">
      <InterventorIAMark size={36} />
      {children}
    </div>
  );
}

// Carga la configuración del proyecto activo y la pone a disposición de toda la app.
export default function ProjectGate() {
  // Usaquén abre al instante con su configuración incluida; luego se usa la guardada si existe
  const [config, setConfig] = useState(isDefaultProject ? USAQUEN_CONFIG : null);
  const [error, setError] = useState('');
  const isShell = mode === 'proyectos' || mode === 'nuevo-proyecto';

  useEffect(() => {
    if (isShell) return;
    let cancelled = false;
    fetch(`/api/proyectos/${CURRENT_PROJECT_ID}`)
      .then(async res => {
        if (res.status === 404) throw new Error('not-found');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(remote => {
        if (cancelled) return;
        setConfig(prev => (JSON.stringify(prev) === JSON.stringify(remote) ? prev : remote));
      })
      .catch(err => {
        if (cancelled) return;
        // Usaquén sigue funcionando con su configuración incluida aunque la nube no responda
        if (!isDefaultProject) setError(err.message === 'not-found' ? 'not-found' : 'offline');
      });
    return () => { cancelled = true; };
  }, [isShell]);

  useEffect(() => {
    if (!config || isShell) return; // las pantallas de InterventorIA no llevan la marca del cliente
    applyBrand(config.marca);
    document.title = `${config.nombre} – ${config.marca?.nombre || 'InterventorIA'}`;
  }, [config, isShell]);

  if (isShell) {
    return (
      <Suspense fallback={<FullScreenMessage><p className="text-sm">Cargando…</p></FullScreenMessage>}>
        {mode === 'nuevo-proyecto' ? <ProjectAssistant /> : <ProjectSelector />}
      </Suspense>
    );
  }

  if (error === 'not-found') {
    return (
      <FullScreenMessage>
        <p className="text-lg font-semibold">No existe el proyecto “{CURRENT_PROJECT_ID}”.</p>
        <a href="/?mode=proyectos" className="text-sm font-semibold underline">Ver los proyectos disponibles</a>
      </FullScreenMessage>
    );
  }
  if (error === 'offline' && !config) {
    return (
      <FullScreenMessage>
        <p className="text-lg font-semibold">No se pudo cargar el proyecto.</p>
        <p className="text-sm">Revisa la conexión e intenta de nuevo.</p>
        <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-[#2b3138] text-white px-4 py-2 text-sm font-semibold">
          Reintentar
        </button>
      </FullScreenMessage>
    );
  }
  if (!config) {
    return <FullScreenMessage><p className="text-sm">Cargando proyecto…</p></FullScreenMessage>;
  }

  return (
    <ProjectContext.Provider value={config}>
      <App />
    </ProjectContext.Provider>
  );
}
