import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, isChunkError: false, isAutoReloading: false };
  }

  static getDerivedStateFromError(error) {
    const errorStr = error?.toString() || '';
    const isChunkError = 
      errorStr.includes('Failed to fetch dynamically imported module') ||
      errorStr.includes('error loading dynamically imported module') ||
      errorStr.includes('Importing a module script failed') ||
      error?.name === 'ChunkLoadError';

    return { hasError: true, error, isChunkError };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught Error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });

    const errorStr = error?.toString() || '';
    const isChunkError = 
      errorStr.includes('Failed to fetch dynamically imported module') ||
      errorStr.includes('error loading dynamically imported module') ||
      errorStr.includes('Importing a module script failed') ||
      error?.name === 'ChunkLoadError';

    if (isChunkError) {
      const lastAutoReload = sessionStorage.getItem('last_auto_chunk_reload');
      const now = Date.now();
      // Auto-reload una sola vez cada 15 segundos para no caer en bucle
      if (!lastAutoReload || (now - Number(lastAutoReload)) > 15000) {
        sessionStorage.setItem('last_auto_chunk_reload', String(now));
        this.setState({ isAutoReloading: true });
        setTimeout(() => {
          this.handleForceReload();
        }, 1200);
      }
    }
  }

  handleForceReload = () => {
    try {
      sessionStorage.removeItem('chunk_retry_refreshed');
    } catch (e) {}
    // Cache-busting para descargar el último index.html y assets de Vercel
    const cleanUrl = window.location.pathname + (window.location.search ? window.location.search + '&' : '?') + 'update=' + Date.now();
    window.location.href = cleanUrl;
  };

  handleResetState = () => {
    try {
      localStorage.removeItem('geo_interventoria_inspector_report_id');
      localStorage.removeItem('geo_interventoria_active_id');
      sessionStorage.clear();
    } catch (e) {}
    window.location.href = window.location.origin + '?reset=' + Date.now();
  };

  render() {
    if (this.state.hasError) {
      const isChunk = this.state.isChunkError;

      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-lg w-full shadow-2xl text-center flex flex-col items-center gap-4 animate-fade-in">
            
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              isChunk ? 'bg-primary/20 border border-primary/40 text-primary-200' : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
            }`}>
              <span className="material-symbols-outlined text-4xl">
                {isChunk ? 'cloud_sync' : 'warning'}
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-100 tracking-tight mb-1">
                {isChunk ? 'Nueva Versión de InterventorIA' : 'InterventorIA - Sistema de Supervisión'}
              </h2>
              <p className="text-slate-400 text-xs leading-relaxed">
                {isChunk 
                  ? 'Se ha desplegado una nueva versión optimizada en la nube. Sincronizando los módulos y assets más recientes...' 
                  : 'Se detectó una excepción inesperada en el renderizado de la interfaz.'}
              </p>
            </div>

            {isChunk && this.state.isAutoReloading && (
              <div className="flex items-center justify-center gap-2 py-2 px-4 bg-primary/20 border border-primary/30 rounded-lg text-primary-200 text-xs font-semibold">
                <div className="w-4 h-4 rounded-full border-2 border-primary-200 border-t-transparent animate-spin" />
                <span>Actualizando plataforma automáticamente...</span>
              </div>
            )}

            {!isChunk && this.state.error && (
              <div className="w-full bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-left overflow-x-auto max-h-36 font-mono text-[11px] text-rose-300">
                <p className="font-bold text-rose-400 mb-1">{this.state.error.toString()}</p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-slate-500 text-[9px] leading-tight whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack.slice(0, 300)}...
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
              <button
                onClick={this.handleForceReload}
                className="flex-1 bg-primary hover:bg-primary-container text-white text-xs font-bold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow"
              >
                <span className="material-symbols-outlined text-[16px]">sync</span>
                {isChunk ? 'Actualizar Ahora' : 'Reintentar Carga'}
              </button>
              <button
                onClick={this.handleResetState}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                Restablecer Sesión
              </button>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
