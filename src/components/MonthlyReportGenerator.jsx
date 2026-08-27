import React, { useState, useMemo } from 'react';
import { 
  getAvailableMonths, 
  getMonthlyConsolidatedData, 
  generateMonthlyFullOfficialReport, 
  generateMonthlyExcelTSV, 
  generateMonthlyAIPrompt, 
  generateMonthlyPhotosTSV,
  generateSectionText
} from '../data/reportsWeekly';
import { 
  FileText, 
  Copy, 
  Check, 
  Download, 
  Table, 
  Sparkles, 
  Image as ImageIcon, 
  Calendar, 
  Filter, 
  Layers, 
  Eye, 
  FileSpreadsheet, 
  CheckCircle2, 
  ChevronRight,
  Layers3
} from 'lucide-react';

export default function MonthlyReportGenerator({ weeklyReports = [], projects = [] }) {
  const availableMonths = useMemo(() => getAvailableMonths(weeklyReports), [weeklyReports]);
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => availableMonths[0]?.key || '');
  const [contractFilter, setContractFilter] = useState('all'); // 'all', 'malla_vial', 'espacio_publico'
  const [onlyWithActivity, setOnlyWithActivity] = useState(true); // true: only frentes with data
  const [previewTab, setPreviewTab] = useState('document'); // 'document', 'plainText', 'excelTable', 'photos'
  const [copiedKey, setCopiedKey] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Auto-set first month if not set
  React.useEffect(() => {
    if (availableMonths.length > 0 && (!selectedMonthKey || !availableMonths.some(m => m.key === selectedMonthKey))) {
      setSelectedMonthKey(availableMonths[0].key);
    }
  }, [availableMonths, selectedMonthKey]);

  // Consolidated monthly data (pure user-entered data)
  const monthlyData = useMemo(() => {
    if (!selectedMonthKey) return null;
    return getMonthlyConsolidatedData(weeklyReports, projects, selectedMonthKey, contractFilter, onlyWithActivity);
  }, [weeklyReports, projects, selectedMonthKey, contractFilter, onlyWithActivity]);

  // Copy helper with feedback
  const handleCopy = (text, keyName) => {
    if (!text) {
      alert('No hay información disponible para copiar en este mes.');
      return;
    }
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedKey(keyName);
        setTimeout(() => setCopiedKey(null), 2500);
      })
      .catch(err => {
        console.error('Error al copiar:', err);
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopiedKey(keyName);
        setTimeout(() => setCopiedKey(null), 2500);
      });
  };

  // Download text file helper
  const handleDownload = (format = 'txt') => {
    if (!monthlyData) return;
    const text = format === 'tsv' 
      ? generateMonthlyExcelTSV(weeklyReports, projects, selectedMonthKey, contractFilter, onlyWithActivity)
      : generateMonthlyFullOfficialReport(weeklyReports, projects, selectedMonthKey, contractFilter, onlyWithActivity);
    
    const blob = new Blob([text], { type: format === 'tsv' ? 'text/tab-separated-values;charset=utf-8' : 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeMonth = (monthlyData.monthLabel || 'mes').replace(/\s+/g, '_').toLowerCase();
    a.download = `Datos_Mes_${safeMonth}_${contractFilter}.${format === 'tsv' ? 'tsv' : 'txt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!monthlyData || availableMonths.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 shadow-sm">
        <Calendar size={40} className="mx-auto mb-3 text-slate-300" />
        <h3 className="font-bold text-slate-800 text-lg mb-1">No hay informes semanales registrados</h3>
        <p className="text-xs text-slate-400">Registra informes semanales para habilitar la compilación automática por meses.</p>
      </div>
    );
  }

  // Filtered frentes for preview search
  const filteredFrentes = monthlyData.frentes.filter(f => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      String(f.frente).includes(term) ||
      String(f.civ).toLowerCase().includes(term) ||
      (f.eje && f.eje.toLowerCase().includes(term)) ||
      (f.desde && f.desde.toLowerCase().includes(term)) ||
      (f.hasta && f.hasta.toLowerCase().includes(term))
    );
  });

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Top Banner & Month Selector */}
      <div className="bg-gradient-to-r from-slate-950 via-[#00236f] to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-amber-400/20 text-amber-300 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-amber-400/30 flex items-center gap-1">
                <FileText size={12} />
                Datos Reales de Obra
              </span>
              <span className="bg-white/10 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded">
                {monthlyData.reportsCount} Semanas ({monthlyData.startDate} al {monthlyData.endDate})
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Copiar Datos del Mes para Informe Mensual
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
              Copia directamente los datos que registraste en el mes de <strong className="text-amber-300">{monthlyData.monthLabel}</strong>: <strong>Diseño de capas de pavimento por CIV</strong>, <strong>Hitos y actividades semanales</strong>, <strong>Notas de bitácora</strong> y <strong>Fotografías</strong>.
            </p>
          </div>

          {/* Month Selector Pills */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mes a Copiar:</span>
            <div className="flex flex-wrap gap-1.5 max-w-md">
              {availableMonths.map(m => (
                <button
                  key={m.key}
                  onClick={() => setSelectedMonthKey(m.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedMonthKey === m.key
                      ? 'bg-amber-400 text-slate-950 shadow-md font-black ring-2 ring-white/20 scale-105'
                      : 'bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  <Calendar size={13} />
                  <span>{m.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedMonthKey === m.key ? 'bg-slate-950/20 text-slate-950' : 'bg-black/30 text-slate-300'}`}>
                    S{m.weekNumbers.join(',')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filters and Scope bar */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                <Filter size={13} className="text-amber-400" />
                Contrato:
              </span>
              <div className="bg-black/30 p-1 rounded-lg flex gap-1 border border-white/10">
                <button
                  onClick={() => setContractFilter('all')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    contractFilter === 'all'
                      ? 'bg-white text-slate-900 shadow font-black'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Todos los Frentes
                </button>
                <button
                  onClick={() => setContractFilter('malla_vial')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    contractFilter === 'malla_vial'
                      ? 'bg-blue-500 text-white shadow font-black'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Solo Malla Vial
                </button>
                <button
                  onClick={() => setContractFilter('espacio_publico')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    contractFilter === 'espacio_publico'
                      ? 'bg-amber-500 text-slate-950 shadow font-black'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Solo Espacio Público
                </button>
              </div>
            </div>

            {/* Toggle: Only with activity */}
            <label className="flex items-center gap-2 cursor-pointer bg-black/20 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-200 hover:bg-black/30">
              <input 
                type="checkbox"
                checked={onlyWithActivity}
                onChange={(e) => setOnlyWithActivity(e.target.checked)}
                className="rounded accent-amber-400 cursor-pointer"
              />
              <span>Solo frentes con registros en el mes ({monthlyData.metrics.frentesConActividad})</span>
            </label>
          </div>

          <div className="text-[11px] text-slate-300 bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
            Semanas: <strong className="text-white font-mono-numbers">S{monthlyData.weekNumbers.join(', ')}</strong> ({monthlyData.startDate} a {monthlyData.endDate})
          </div>
        </div>
      </div>

      {/* Real Data Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Frentes del Mes</span>
            <Layers size={15} className="text-primary" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono-numbers">
            {monthlyData.frentes.length}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            {onlyWithActivity ? 'Con actividad en el mes' : 'Total evaluados'}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Hitos Semanales</span>
            <FileText size={15} className="text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700 font-mono-numbers">
            {monthlyData.metrics.totalHitosMes}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Actividades constructivas
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Notas de Bitácora</span>
            <CheckCircle2 size={15} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono-numbers">
            {monthlyData.metrics.totalNotasMes}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Supervisión diaria en campo
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Fotos Registradas</span>
            <ImageIcon size={15} className="text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700 font-mono-numbers">
            {monthlyData.metrics.totalFotosMes}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Con fecha y anotaciones
          </span>
        </div>
      </div>

      {/* Main Copy Action Bar (Prominent Buttons) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Copy size={18} className="text-primary" />
                Copiar Información del Mes al Portapapeles
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Selecciona cómo quieres copiar la información del mes de <strong>{monthlyData.monthLabel}</strong>:
              </p>
            </div>
            
            {/* Quick Download Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownload('txt')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                title="Descargar archivo de texto limpio"
              >
                <Download size={14} />
                Descargar TXT
              </button>
              <button
                onClick={() => handleDownload('tsv')}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 border border-emerald-200 cursor-pointer"
                title="Descargar tabla compatible con Excel (.tsv)"
              >
                <FileSpreadsheet size={14} />
                Descargar Excel
              </button>
            </div>
          </div>

          {/* Primary Action Buttons Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Copiar Datos Reales en Texto Limpio */}
            <button
              onClick={() => handleCopy(
                generateMonthlyFullOfficialReport(weeklyReports, projects, selectedMonthKey, contractFilter, onlyWithActivity),
                'pure_report'
              )}
              className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer group ${
                copiedKey === 'pure_report'
                  ? 'bg-green-600 text-white border-green-600 shadow-md scale-[1.02]'
                  : 'bg-gradient-to-br from-primary to-[#00174a] text-white border-primary hover:shadow-lg'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
                    Texto Limpio
                  </span>
                  {copiedKey === 'pure_report' ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-white bg-green-700/80 px-2 py-0.5 rounded-full animate-bounce">
                      <Check size={14} /> ¡Copiado!
                    </span>
                  ) : (
                    <Copy size={16} className="text-white/80 group-hover:scale-110 transition-transform" />
                  )}
                </div>
                <h4 className="font-black text-sm text-white mb-1">
                  📋 Copiar Datos Reales del Mes
                </h4>
                <p className="text-[11px] text-slate-200 leading-tight">
                  Diseño de capas de pavimento, hitos semanales, bitácoras y fotos organizadas frente por frente.
                </p>
              </div>
              <span className="text-[10px] font-bold text-amber-300 mt-3 flex items-center gap-1">
                Copiar para Word / Google Docs <ChevronRight size={12} />
              </span>
            </button>

            {/* 2. Copiar Prompt para IA */}
            <button
              onClick={() => handleCopy(
                generateMonthlyAIPrompt(weeklyReports, projects, selectedMonthKey, contractFilter, onlyWithActivity),
                'ai_prompt'
              )}
              className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer group ${
                copiedKey === 'ai_prompt'
                  ? 'bg-green-600 text-white border-green-600 shadow-md scale-[1.02]'
                  : 'bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-slate-950 border-amber-400 hover:shadow-lg'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-black/20 text-slate-950 px-2 py-0.5 rounded flex items-center gap-1">
                    <Sparkles size={11} />
                    Para IA (Ultra Compacto)
                  </span>
                  {copiedKey === 'ai_prompt' ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-white bg-green-800 px-2 py-0.5 rounded-full animate-bounce">
                      <Check size={14} /> ¡Copiado!
                    </span>
                  ) : (
                    <span className="text-[9px] font-extrabold bg-slate-950 text-amber-300 px-1.5 py-0.5 rounded">
                      -70% Tokens
                    </span>
                  )}
                </div>
                <h4 className="font-black text-sm text-slate-950 mb-1">
                  🤖 Copiar Prompt para IA
                </h4>
                <p className="text-[11px] text-slate-900 leading-tight font-medium">
                  Sin caracteres innecesarios ni separadores largos. Ahorra tokens en ChatGPT / Claude.
                </p>
              </div>
              <span className="text-[10px] font-extrabold text-slate-950 mt-3 flex items-center gap-1">
                Copiar Prompt Optimizado <ChevronRight size={12} />
              </span>
            </button>

            {/* 3. Copiar Tabla para Excel */}
            <button
              onClick={() => handleCopy(
                generateMonthlyExcelTSV(weeklyReports, projects, selectedMonthKey, contractFilter, onlyWithActivity),
                'excel_tsv'
              )}
              className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer group ${
                copiedKey === 'excel_tsv'
                  ? 'bg-green-600 text-white border-green-600 shadow-md scale-[1.02]'
                  : 'bg-gradient-to-br from-emerald-700 to-teal-900 text-white border-emerald-700 hover:shadow-lg'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
                    Celdas de Excel
                  </span>
                  {copiedKey === 'excel_tsv' ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-white bg-green-700/80 px-2 py-0.5 rounded-full animate-bounce">
                      <Check size={14} /> ¡Copiado!
                    </span>
                  ) : (
                    <Table size={16} className="text-white/80 group-hover:scale-110 transition-transform" />
                  )}
                </div>
                <h4 className="font-black text-sm text-white mb-1">
                  📊 Copiar Tabla para Excel (TSV)
                </h4>
                <p className="text-[11px] text-emerald-100 leading-tight">
                  Matriz tabulada con Frente, CIV, Eje, Diseño de Capas, Hitos, Bitácoras y Fotos.
                </p>
              </div>
              <span className="text-[10px] font-bold text-emerald-200 mt-3 flex items-center gap-1">
                Pegar directo en Excel <ChevronRight size={12} />
              </span>
            </button>

            {/* 4. Copiar Fotos del Mes */}
            <button
              onClick={() => handleCopy(
                generateMonthlyPhotosTSV(weeklyReports, selectedMonthKey, contractFilter),
                'photos_tsv'
              )}
              className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer group ${
                copiedKey === 'photos_tsv'
                  ? 'bg-green-600 text-white border-green-600 shadow-md scale-[1.02]'
                  : 'bg-gradient-to-br from-purple-700 to-indigo-900 text-white border-purple-700 hover:shadow-lg'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
                    Registro de Fotos
                  </span>
                  {copiedKey === 'photos_tsv' ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-white bg-green-700/80 px-2 py-0.5 rounded-full animate-bounce">
                      <Check size={14} /> ¡Copiado!
                    </span>
                  ) : (
                    <ImageIcon size={16} className="text-white/80 group-hover:scale-110 transition-transform" />
                  )}
                </div>
                <h4 className="font-black text-sm text-white mb-1">
                  📸 Copiar Fotos del Mes (URLs)
                </h4>
                <p className="text-[11px] text-purple-100 leading-tight">
                  Listado de las {monthlyData.metrics.totalFotosMes} fotos con fechas, pie de foto y enlace público Supabase.
                </p>
              </div>
              <span className="text-[10px] font-bold text-purple-200 mt-3 flex items-center gap-1">
                Copiar URLs y descripciones <ChevronRight size={12} />
              </span>
            </button>
          </div>

          {/* Quick Copy by Specific Section */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-1">
              <Layers size={12} />
              Copiar Sección Individual:
            </span>

            <button
              onClick={() => handleCopy(
                generateSectionText(weeklyReports, projects, selectedMonthKey, 'hitos', contractFilter),
                'sec_hitos'
              )}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copiedKey === 'sec_hitos' ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
              Solo Hitos y Actividades ({monthlyData.metrics.totalHitosMes})
            </button>

            <button
              onClick={() => handleCopy(
                generateSectionText(weeklyReports, projects, selectedMonthKey, 'bitacoras', contractFilter),
                'sec_bitacoras'
              )}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copiedKey === 'sec_bitacoras' ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
              Solo Bitácoras de Campo ({monthlyData.metrics.totalNotasMes})
            </button>

            <button
              onClick={() => handleCopy(
                generateSectionText(weeklyReports, projects, selectedMonthKey, 'disenos', contractFilter),
                'sec_disenos'
              )}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copiedKey === 'sec_disenos' ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
              Solo Diseños de Pavimento (Capas)
            </button>

            <button
              onClick={() => handleCopy(
                generateSectionText(weeklyReports, projects, selectedMonthKey, 'fotos', contractFilter),
                'sec_fotos'
              )}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copiedKey === 'sec_fotos' ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
              Solo Fotos ({monthlyData.metrics.totalFotosMes})
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Preview Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Preview Tabs & Search Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Vista Previa:</span>
            <div className="flex bg-slate-200/70 p-1 rounded-lg gap-1">
              <button
                onClick={() => setPreviewTab('document')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  previewTab === 'document'
                    ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye size={13} />
                Vista Documento ({filteredFrentes.length} frentes)
              </button>
              <button
                onClick={() => setPreviewTab('excelTable')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  previewTab === 'excelTable'
                    ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table size={13} />
                Matriz de Frentes
              </button>
              <button
                onClick={() => setPreviewTab('plainText')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  previewTab === 'plainText'
                    ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText size={13} />
                Texto Plano para Copiar
              </button>
              <button
                onClick={() => setPreviewTab('photos')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  previewTab === 'photos'
                    ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ImageIcon size={13} />
                Galería de Fotos ({monthlyData.metrics.totalFotosMes})
              </button>
            </div>
          </div>

          {/* Search input for filtering */}
          <div className="relative min-w-[240px]">
            <input
              type="text"
              placeholder="Buscar frente, CIV o eje..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 font-medium focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-[16px]">
              search
            </span>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Formatted Document Preview */}
        {previewTab === 'document' && (
          <div className="p-6 md:p-8 max-w-5xl mx-auto text-slate-800 leading-relaxed font-sans">
            {/* Header Documento */}
            <div className="border-b-2 border-slate-800 pb-5 mb-6 text-center">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                REGISTRO MENSUAL DE ACTIVIDADES, DISEÑOS Y BITÁCORAS DE OBRA
              </div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">
                Consolidado del Mes de {monthlyData.monthLabel}
              </h1>
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-600 mt-2">
                <span className="bg-slate-100 px-3 py-1 rounded">Período: <strong>{monthlyData.startDate}</strong> al <strong>{monthlyData.endDate}</strong></span>
                <span className="bg-slate-100 px-3 py-1 rounded">Semanas: <strong>S{monthlyData.weekNumbers.join(', ')}</strong></span>
                <span className="bg-slate-100 px-3 py-1 rounded">Frentes con datos: <strong>{filteredFrentes.length}</strong></span>
              </div>
            </div>

            {/* Listado de Frentes */}
            <div className="space-y-6">
              {filteredFrentes.map(f => (
                <div key={f.id} className="border border-slate-200 rounded-xl p-5 bg-slate-50/40 hover:bg-slate-50 transition-colors shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded text-white ${f.isMv ? 'bg-blue-600' : 'bg-amber-600'}`}>
                        {f.tipo}
                      </span>
                      <span className="font-black text-slate-900 text-sm">
                        Frente {f.frente} • CIV {f.civ}
                      </span>
                      <span className="text-slate-600 text-xs font-medium">
                        ({f.eje})
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      f.pmtStatusLatest === 'Aprobado' ? 'bg-green-100 text-green-800' :
                      f.pmtStatusLatest === 'En revisión' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                    }`}>
                      PMT: {f.pmtStatusLatest}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 mb-3">
                    <strong>Tramo:</strong> Desde {f.desde} hasta {f.hasta}
                  </div>

                  {/* Diseño de Pavimento / Capas */}
                  {f.designLayers && f.designLayers.length > 0 && (
                    <div className="bg-blue-50/40 border border-blue-200/60 rounded-lg p-3 mb-3 text-xs">
                      <strong className="text-blue-900 text-[11px] uppercase font-bold flex items-center gap-1.5 mb-1.5">
                        <Layers3 size={13} className="text-blue-700" />
                        Diseño Estructural de Pavimento Aprobado ({f.designName}):
                      </strong>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-700">
                        {f.designLayers.map((l, i) => (
                          <div key={i} className="flex items-center gap-1.5 bg-white/70 px-2 py-1 rounded border border-blue-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                            <span className="font-semibold text-slate-800">{l.nombre}</span>
                            {l.label && <span className="text-blue-700 font-mono-numbers ml-auto text-[10px] font-bold">({l.label})</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hitos constructivos */}
                  {f.weeklyHitos.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-lg p-3 mb-3 text-xs">
                      <strong className="text-slate-800 text-[11px] uppercase font-bold block mb-1.5">
                        🏗️ Actividades e Hitos Constructivos del Mes:
                      </strong>
                      <ul className="space-y-1.5 list-disc list-inside text-slate-700">
                        {f.weeklyHitos.map((h, i) => (
                          <li key={i}>
                            <span className="font-bold text-slate-900 font-mono-numbers">Semana {h.semana} ({h.fecha_inicial} al {h.fecha_final}):</span> {h.texto}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Bitácoras */}
                  {f.allNotes.length > 0 && (
                    <div className="bg-amber-50/60 border border-amber-200/80 rounded-lg p-3 mb-3 text-xs">
                      <strong className="text-amber-950 text-[11px] uppercase font-bold block mb-1.5">
                        📜 Notas de Bitácora de Campo ({f.allNotes.length}):
                      </strong>
                      <div className="space-y-1.5">
                        {f.allNotes.map((n, i) => (
                          <div key={i} className="text-slate-800 flex gap-2">
                            <span className="font-bold text-amber-900 shrink-0 font-mono-numbers">{n.date} (Sem {n.semana}):</span>
                            <span>{n.note}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fotos del frente */}
                  {f.allPhotos.length > 0 && (
                    <div className="bg-purple-50/40 border border-purple-200/60 rounded-lg p-3 text-xs">
                      <strong className="text-purple-950 text-[11px] uppercase font-bold block mb-1.5">
                        📸 Evidencias Fotográficas ({f.allPhotos.length}):
                      </strong>
                      <div className="space-y-1">
                        {f.allPhotos.map((ph, i) => (
                          <div key={i} className="text-slate-700 flex items-center justify-between text-[11px] bg-white/70 px-2.5 py-1 rounded border border-purple-100">
                            <span>
                              <strong className="font-mono-numbers text-purple-900">Foto {i + 1} ({ph.date || 'Mes'}):</strong> {ph.caption || 'Registro de inspección'}
                            </span>
                            {ph.url && ph.url.startsWith('http') && (
                              <a href={ph.url} target="_blank" rel="noopener noreferrer" className="text-purple-700 hover:underline font-bold text-[10px] shrink-0 ml-2">
                                Ver Foto ↗
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Excel Tabular Matrix */}
        {previewTab === 'excelTable' && (
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead className="sticky top-0 bg-slate-900 text-white z-10 font-bold uppercase text-[9px] tracking-wider shadow-sm">
                <tr>
                  <th className="py-2.5 px-3">No.</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">CIV</th>
                  <th className="py-2.5 px-3">Eje Vial</th>
                  <th className="py-2.5 px-3">Desde - Hasta</th>
                  <th className="py-2.5 px-3 text-center">PMT</th>
                  <th className="py-2.5 px-3">Diseño Pavimento</th>
                  <th className="py-2.5 px-3">Hitos del Mes</th>
                  <th className="py-2.5 px-3">Bitácoras</th>
                  <th className="py-2.5 px-3 text-center">Fotos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredFrentes.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-3 font-bold text-slate-900 font-mono-numbers">{f.frente}</td>
                    <td className="py-2 px-3">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded text-white ${f.isMv ? 'bg-blue-600' : 'bg-amber-600'}`}>
                        {f.isMv ? 'Malla' : 'Espacio'}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono-numbers font-semibold text-slate-800">{f.civ}</td>
                    <td className="py-2 px-3 font-bold text-slate-800">{f.eje}</td>
                    <td className="py-2 px-3 text-slate-500">{f.desde} - {f.hasta}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        f.pmtStatusLatest === 'Aprobado' ? 'bg-green-100 text-green-800' :
                        f.pmtStatusLatest === 'En revisión' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {f.pmtStatusLatest}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[10px] text-slate-600 max-w-[200px] truncate" title={f.designName}>
                      {f.designName}
                    </td>
                    <td className="py-2 px-3 text-[10px] text-slate-600 max-w-[250px] truncate" title={f.weeklyHitos.map(h => `[S${h.semana}] ${h.texto}`).join(' | ')}>
                      {f.weeklyHitos.map(h => `[S${h.semana}] ${h.texto}`).join(' | ') || '-'}
                    </td>
                    <td className="py-2 px-3 text-[10px] text-slate-600 max-w-[200px] truncate" title={f.allNotes.map(n => n.note).join(' | ')}>
                      {f.allNotes.map(n => n.note).join(' | ') || '-'}
                    </td>
                    <td className="py-2 px-3 text-center font-mono-numbers font-bold text-purple-600">
                      {f.allPhotos.length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Plain Text Box */}
        {previewTab === 'plainText' && (
          <div className="p-4 bg-slate-950 text-slate-200">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[11px] font-mono text-amber-400 font-bold">
                Texto estructurado con saltos de línea (Listo para Ctrl+A y Ctrl+C)
              </span>
              <button
                onClick={() => handleCopy(
                  generateMonthlyFullOfficialReport(weeklyReports, projects, selectedMonthKey, contractFilter, onlyWithActivity),
                  'box_full'
                )}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black px-3 py-1 rounded transition-all flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'box_full' ? <Check size={13} /> : <Copy size={13} />}
                Copiar Todo el Texto
              </button>
            </div>
            <textarea
              readOnly
              rows={22}
              value={generateMonthlyFullOfficialReport(weeklyReports, projects, selectedMonthKey, contractFilter, onlyWithActivity)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-300 font-mono text-xs p-4 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400 select-all leading-relaxed"
            />
          </div>
        )}

        {/* Tab 4: Photos Gallery */}
        {previewTab === 'photos' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Catálogo Fotográfico del Mes ({monthlyData.metrics.totalFotosMes} fotos registradas)
              </h4>
              <button
                onClick={() => handleCopy(
                  generateMonthlyPhotosTSV(weeklyReports, selectedMonthKey, contractFilter),
                  'box_photos'
                )}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiedKey === 'box_photos' ? <Check size={13} /> : <Copy size={13} />}
                Copiar Catálogo de Fotos
              </button>
            </div>

            {monthlyData.metrics.totalFotosMes === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 text-center text-slate-400">
                <ImageIcon size={36} className="mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-xs">No hay fotos registradas con fecha en el mes seleccionado.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {monthlyData.frentes.flatMap(f => 
                  f.allPhotos.map((ph, idx) => (
                    <div key={`${f.id}_${idx}`} className="group bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col">
                      <div className="aspect-video bg-slate-200 relative overflow-hidden">
                        <img 
                          src={ph.url} 
                          alt={ph.caption || 'Foto de obra'} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1541888946425-d0fbb180ec4f?w=600&auto=format&fit=crop&q=80';
                          }}
                        />
                        <span className="absolute top-1.5 left-1.5 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          Frente {f.frente}
                        </span>
                        <span className="absolute bottom-1.5 right-1.5 bg-black/70 text-amber-300 text-[9px] font-mono-numbers px-1.5 py-0.5 rounded">
                          Sem {ph.semana}
                        </span>
                      </div>
                      <div className="p-2 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-700 block truncate">
                            CIV {f.civ} • {f.eje}
                          </span>
                          <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                            {ph.caption || 'Registro fotográfico de inspección técnica.'}
                          </p>
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono-numbers mt-1.5 block">
                          {ph.date || monthlyData.startDate}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
