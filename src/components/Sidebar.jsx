import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { shareUrl } from '../data/projectSession';
import { brandInitials } from '../utils/brand';
import { PoweredByInterventorIA } from './InterventorIAMark';

// Navegación agrupada por tarea. Las vistas son las mismas de antes (mismos ids).
const SECTIONS = [
  {
    title: 'Seguimiento',
    items: [
      { id: 'dashboard', label: 'Tablero de frentes', icon: 'dashboard' },
      { id: 'project-detail', label: 'Mapa y frentes', icon: 'map' },
      { id: 'frentes-control', label: 'Control de frentes', icon: 'layers' },
      { id: 'weekly-reports', label: 'Informes semanales', icon: 'date_range' },
      { id: 'correspondencia', label: 'Correspondencia', icon: 'mail', internal: true }
    ]
  },
  {
    title: 'Informes',
    internal: true,
    items: [
      { id: 'reports', label: 'Informes mensuales y actas', icon: 'description' }
    ]
  },
  {
    title: 'Proyecto',
    items: [
      { id: 'project-info', label: 'Ficha del proyecto', icon: 'info' },
      { id: 'engineers', label: 'Equipo de ingenieros', icon: 'badge', internal: true },
      { id: 'config', label: 'Configuración', icon: 'settings', internal: true }
    ]
  }
];

const SHARE_LINKS = [
  { mode: 'inspector', label: 'Portal de inspectores', hint: 'Para reportar fotos y bitácora desde el celular' },
  { mode: 'landing', label: 'Tablero público', hint: 'Solo lectura, sin menú' },
  { mode: 'map', label: 'Solo mapa', hint: 'Únicamente el mapa de frentes, sin acceso al resto del proyecto' },
  { mode: 'contractor', label: 'Acceso del contratista', hint: 'Consulta de mapas, planos e informes' }
];

function ProjectBadge({ marca, size = 36 }) {
  if (marca?.logoUrl) {
    return <img src={marca.logoUrl} alt="" className="rounded-lg object-contain bg-white border border-slate-200 shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="rounded-lg bg-primary text-white flex items-center justify-center font-bold shrink-0"
      style={{ width: size, height: size, fontFamily: "'Archivo', sans-serif", fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {brandInitials(marca?.nombre)}
    </span>
  );
}

export default function Sidebar({
  currentView,
  onViewChange,
  isExpanded,
  onMouseEnter,
  onMouseLeave,
  isMobileOpen,
  onCloseMobile,
  isContractorMode
}) {
  const project = useProject();
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState('');
  const expanded = isExpanded || isMobileOpen;

  const go = (id) => {
    onViewChange(id);
    if (onCloseMobile) onCloseMobile();
  };

  const copy = async (mode) => {
    const url = shareUrl(mode);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(mode);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      window.prompt('Copia este enlace:', url);
    }
  };

  const sections = SECTIONS
    .filter(s => !(isContractorMode && s.internal))
    .map(s => ({ ...s, items: s.items.filter(i => !(isContractorMode && i.internal)) }))
    .filter(s => s.items.length > 0);

  return (
    <>
      {isMobileOpen && (
        <div onClick={onCloseMobile} className="fixed inset-0 bg-slate-900/40 z-40 md:hidden" />
      )}

      <aside
        className={`flex flex-col h-screen fixed left-0 top-0 bg-white border-r border-slate-200 z-50 transition-[width,transform] duration-200 md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72 md:w-auto'
        } ${isExpanded ? 'md:w-72' : 'md:w-16'}`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={() => { setShareOpen(false); onMouseLeave?.(); }}
        aria-label="Navegación principal"
      >
        {/* Proyecto activo (marca blanca) */}
        <div className={`border-b border-slate-100 flex items-center gap-3 ${expanded ? 'px-4 py-4' : 'p-3 justify-center'}`}>
          <ProjectBadge marca={project?.marca} />
          {expanded && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 truncate leading-tight">{project?.marca?.nombre}</p>
              <p className="text-xs text-slate-500 truncate">{project?.nombre}</p>
              {!isContractorMode && (
                <a href="/?mode=proyectos" className="text-xs font-semibold text-primary no-underline hover:underline">
                  Cambiar proyecto
                </a>
              )}
            </div>
          )}
        </div>

        <nav className={`flex-1 overflow-y-auto py-3 ${expanded ? 'px-3' : 'px-2'}`}>
          {sections.map(section => (
            <div key={section.title} className="mb-3">
              {expanded ? (
                <p className="px-3 pt-2 pb-1 text-xs font-semibold text-slate-400">{section.title}</p>
              ) : (
                <div className="mx-3 my-2 border-t border-slate-100" />
              )}
              {section.items.map(item => {
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => go(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    title={expanded ? undefined : item.label}
                    className={`w-full flex items-center rounded-lg text-left transition-colors ${
                      expanded ? 'px-3 py-2.5 gap-3' : 'p-3 justify-center'
                    } ${isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                  >
                    <span className={`material-symbols-outlined text-[21px] shrink-0 ${isActive ? 'text-primary' : 'text-slate-400'}`}>
                      {item.icon}
                    </span>
                    {expanded && <span className="text-sm whitespace-nowrap">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          ))}

          {!isContractorMode && (
            <div className="mb-3">
              {expanded ? (
                <p className="px-3 pt-2 pb-1 text-xs font-semibold text-slate-400">Compartir</p>
              ) : (
                <div className="mx-3 my-2 border-t border-slate-100" />
              )}
              <button
                type="button"
                onClick={() => setShareOpen(v => !v)}
                aria-expanded={shareOpen}
                title={expanded ? undefined : 'Compartir enlaces'}
                className={`w-full flex items-center rounded-lg text-left text-slate-600 hover:bg-slate-50 hover:text-slate-900 ${
                  expanded ? 'px-3 py-2.5 gap-3' : 'p-3 justify-center'
                }`}
              >
                <span className="material-symbols-outlined text-[21px] shrink-0 text-slate-400">share</span>
                {expanded && (
                  <>
                    <span className="text-sm flex-1">Enlaces para compartir</span>
                    <span className={`material-symbols-outlined text-[18px] text-slate-400 transition-transform ${shareOpen ? 'rotate-180' : ''}`}>expand_more</span>
                  </>
                )}
              </button>
              {expanded && shareOpen && (
                <ul className="mt-1 ml-3 pl-3 border-l border-slate-100 flex flex-col gap-1">
                  {SHARE_LINKS.map(link => (
                    <li key={link.mode}>
                      <button
                        type="button"
                        onClick={() => copy(link.mode)}
                        className="w-full text-left rounded-lg px-3 py-2 hover:bg-slate-50"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm text-slate-700">{link.label}</span>
                          <span className={`text-xs font-semibold ${copied === link.mode ? 'text-emerald-600' : 'text-primary'}`}>
                            {copied === link.mode ? 'Copiado' : 'Copiar'}
                          </span>
                        </span>
                        <span className="block text-xs text-slate-400">{link.hint}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </nav>

        <div className={`border-t border-slate-100 ${expanded ? 'px-4 py-3' : 'p-3 flex justify-center'}`}>
          {expanded ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500 truncate">
                {isContractorMode ? 'Consulta del contratista' : 'Equipo de interventoría'}
              </span>
              <PoweredByInterventorIA />
            </div>
          ) : (
            <a href="/?mode=proyectos" title="con InterventorIA" className="no-underline">
              <span className="material-symbols-outlined text-[20px] text-slate-400">apps</span>
            </a>
          )}
        </div>
      </aside>
    </>
  );
}
