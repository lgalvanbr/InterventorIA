import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught Error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetState = () => {
    try {
      localStorage.removeItem('geo_interventoria_inspector_report_id');
      localStorage.removeItem('geo_interventoria_active_id');
    } catch (e) {}
    window.location.href = window.location.origin;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-lg w-full shadow-2xl text-center flex flex-col items-center gap-4 animate-fade-in">
            
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <span className="material-symbols-outlined text-4xl">warning</span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-100 tracking-tight mb-1">
                InterventorIA - Sistema de Supervisión
              </h2>
              <p className="text-slate-400 text-xs">
                Se detectó una excepción inesperada en el renderizado de la interfaz.
              </p>
            </div>

            {this.state.error && (
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
                onClick={this.handleReload}
                className="flex-1 bg-primary hover:bg-primary-container text-white text-xs font-bold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                Reintentar Carga
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
