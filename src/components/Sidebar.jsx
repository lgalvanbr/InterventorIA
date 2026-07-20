import React from 'react';

export default function Sidebar({ 
  currentView, 
  onViewChange, 
  activeProjectId,
  isExpanded,
  onMouseEnter,
  onMouseLeave,
  isMobileOpen,
  onCloseMobile,
  isContractorMode
}) {
  const baseMenuItems = [
    { id: 'dashboard', label: 'Proyectos de Obra', icon: 'assignment' },
    { id: 'project-detail', label: 'Mapa y Frentes', icon: 'map' },
    { id: 'frentes-control', label: 'Control de Frentes', icon: 'layers' },
    { id: 'project-info', label: 'Ficha de Proyecto', icon: 'info' },
    { id: 'weekly-reports', label: 'Informes Semanales', icon: 'history' }
  ];

  const internalMenuItems = [
    { id: 'reports', label: 'Actas y Reportes', icon: 'description' },
    { id: 'contractor-hub', label: 'Compartir Hub Contratista', icon: 'share', isAction: true },
    { id: 'inspector-portal', label: 'Portal Inspectores', icon: 'share_location', isAction: true },
    { id: 'engineers', label: 'Perfiles de Ingenieros', icon: 'badge' },
    { id: 'config', label: 'Configuración', icon: 'settings' }
  ];

  const menuItems = isContractorMode 
    ? baseMenuItems 
    : [
        ...baseMenuItems.slice(0, 4), // Proyectos, Mapa, Control, Ficha
        internalMenuItems[0],          // Actas y Reportes
        baseMenuItems[4],             // Informes Semanales
        ...internalMenuItems.slice(1)  // Compartir, Inspectores, Ingenieros, Config
      ];

  const handleItemClick = (item) => {
    if (item.isAction) {
      if (item.id === 'inspector-portal') {
        const portalUrl = `${window.location.origin}/?mode=inspector`;
        navigator.clipboard.writeText(portalUrl)
          .then(() => alert(`¡Enlace copiado al portapapeles!\n\nComparte este link por WhatsApp o correo con los inspectores de obra para que reporten fotos y notas:\n\n${portalUrl}`))
          .catch(() => alert(`Por favor, copia y comparte este enlace:\n\n${portalUrl}`));
      } else if (item.id === 'contractor-hub') {
        const portalUrl = `${window.location.origin}/?mode=contractor`;
        navigator.clipboard.writeText(portalUrl)
          .then(() => alert(`¡Enlace del Hub del Contratista copiado!\n\nComparte este enlace con el contratista de obra para que consulte los mapas, planos y reportes semanales en modo de lectura:\n\n${portalUrl}`))
          .catch(() => alert(`Por favor, copia y comparte este enlace:\n\n${portalUrl}`));
      }
    } else {
      onViewChange(item.id);
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300"
        />
      )}

      <aside 
        className={`flex flex-col h-screen fixed left-0 top-0 bg-white border-r border-slate-200 z-50 transition-all duration-300 shadow-sm md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64 md:w-auto'
        } ${
          isExpanded ? 'md:w-64' : 'md:w-16'
        }`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
      {/* Brand Header */}
      <div className={`border-b border-slate-100 bg-[#f7f9fb]/50 flex items-center gap-3 overflow-hidden ${
        isExpanded ? 'p-6' : 'p-4 justify-center'
      }`}>
        <span className="material-symbols-outlined text-primary text-2xl shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
          construction
        </span>
        {isExpanded && (
          <div className="animate-fade-in">
            <h1 className="font-headline-md text-base font-extrabold text-primary tracking-tight leading-none">
              INCOLTA SAS
            </h1>
            <p className="text-slate-500 text-[9px] font-bold uppercase tracking-wider mt-1">
              {isContractorMode ? 'Hub del Contratista' : 'Portal de Interventoría'}
            </p>
          </div>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className={`flex-1 py-6 space-y-1.5 ${isExpanded ? 'px-4' : 'px-2'}`}>
        {menuItems.map((item) => {
          const isActive = currentView === item.id;
          
          // Disable "Mapa y Frentes" if no project is active/selected
          const isDisabled = item.disabledWithoutProject && !activeProjectId;
          
          return (
            <button
              key={item.id}
              onClick={() => !isDisabled && handleItemClick(item)}
              disabled={isDisabled}
              className={`w-full flex items-center rounded-md transition-all duration-200 text-left overflow-hidden ${
                isExpanded ? 'px-4 py-3 gap-3' : 'p-3 justify-center'
              } ${
                isActive
                  ? 'bg-[#00236f]/8 text-primary font-bold border-r-4 border-primary shadow-2xs scale-102'
                  : isDisabled
                    ? 'text-slate-300 cursor-not-allowed opacity-50'
                    : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1'
              }`}
              title={!isExpanded ? item.label : (isDisabled ? 'Selecciona primero un proyecto de la lista' : '')}
            >
              <span className={`material-symbols-outlined text-[22px] shrink-0 ${isActive ? 'text-primary' : 'text-slate-400'}`}>
                {item.icon}
              </span>
              {isExpanded && (
                <span className="text-sm font-medium whitespace-nowrap">
                  {item.label}
                </span>
              )}
              {isExpanded && isDisabled && (
                <span className="material-symbols-outlined text-xs text-slate-300 ml-auto">
                  lock
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User profile footer */}
      <div className={`border-t border-slate-200 bg-slate-50/50 flex items-center overflow-hidden ${
        isExpanded ? 'p-4 gap-3' : 'p-3 justify-center'
      }`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm shrink-0 ${
          isContractorMode ? 'bg-amber-600 text-white' : 'bg-primary text-white'
        }`}>
          {isContractorMode ? 'CO' : 'LG'}
        </div>
        {isExpanded && (
          <div className="animate-fade-in min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-800 truncate leading-tight flex items-center gap-1.5">
              {isContractorMode ? 'Contratista de Obra' : 'Ing. Luis Carlos Galvan'}
              {isContractorMode && (
                <span className="material-symbols-outlined text-[12px] text-amber-600 font-bold" title="Acceso de Consulta (Solo Lectura)">
                  lock
                </span>
              )}
            </p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5 truncate">
              {isContractorMode ? 'Consorcio Vial' : 'Director de Interventoría'}
            </p>
          </div>
        )}
      </div>
    </aside>
    </>
  );
}
