import React, { useState } from 'react';
import { 
  Wrench, DollarSign, FileText, Scale, Leaf, Users, ShieldAlert, CheckCircle2, 
  AlertTriangle, Save, ClipboardList, BookOpen, Plus, Trash2, Globe, Lock 
} from 'lucide-react';

const COMPONENT_METADATA = {
  tecnico: { label: 'Técnico', icon: Wrench, color: '#00236f' },
  financiero: { label: 'Financiero', icon: DollarSign, color: '#16a34a' },
  administrativo: { label: 'Administrativo', icon: FileText, color: '#0891b2' },
  legal: { label: 'Legal', icon: Scale, color: '#4f46e5' },
  ambiental: { label: 'Ambiental (PAGA)', icon: Leaf, color: '#84cc16' },
  social: { label: 'Social', icon: Users, color: '#ec4899' },
  sst: { label: 'SST', icon: ShieldAlert, color: '#f59e0b' },
};

export default function ComplianceTabs({ frente, onUpdateCompliance, onUpdateFrenteData, isContractorMode }) {
  const [activeTab, setActiveTab] = useState('tecnico');
  const [savedMessage, setSavedMessage] = useState('');

  // Form states for Concrete Test inputs
  const [testDate, setTestDate] = useState('');
  const [mixDesign, setMixDesign] = useState('4000 PSI (28 MPa)');
  const [strengthRequired, setStrengthRequired] = useState('28');
  const [strengthResult, setStrengthResult] = useState('');
  const [labName, setLabName] = useState('Suelos & Concretos de Colombia');

  if (!frente) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-16 text-center text-slate-500">
        <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">
          assignment_late
        </span>
        <p className="text-sm font-semibold">Selecciona un frente de obra para ver y gestionar su cumplimiento normativo.</p>
      </div>
    );
  }

  const compliance = frente.compliance || {};
  const currentData = compliance[activeTab] || { checklist: [], notes: '' };

  const handleCheckboxToggle = (itemId) => {
    const updatedChecklist = currentData.checklist.map(item => 
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    
    onUpdateCompliance(frente.id, activeTab, {
      ...currentData,
      checklist: updatedChecklist
    });
  };

  const handleNotesChange = (e) => {
    onUpdateCompliance(frente.id, activeTab, {
      ...currentData,
      notes: e.target.value
    });
  };

  const triggerSaveNotification = () => {
    setSavedMessage('¡Notas guardadas correctamente!');
    setTimeout(() => setSavedMessage(''), 3000);
  };

  // Add a new concrete test
  const handleAddConcreteTest = (e) => {
    e.preventDefault();
    if (!testDate || !strengthResult) return;

    const reqVal = parseFloat(strengthRequired) || 28;
    const resVal = parseFloat(strengthResult) || 0;
    
    const newTest = {
      id: 'test_' + Date.now(),
      testDate,
      mixDesign,
      strengthRequired: reqVal,
      strengthResult: resVal,
      status: resVal >= reqVal ? 'passed' : 'failed',
      laboratoryName: labName
    };

    const updatedTests = [...(frente.concreteTests || []), newTest];
    
    // Bubble up to parent
    onUpdateFrenteData(frente.id, {
      concreteTests: updatedTests
    });

    // Reset inputs
    setTestDate('');
    setStrengthResult('');
  };

  // Delete a concrete test
  const handleDeleteConcreteTest = (testId) => {
    const updatedTests = (frente.concreteTests || []).filter(t => t.id !== testId);
    onUpdateFrenteData(frente.id, {
      concreteTests: updatedTests
    });
  };

  // Handle PAGA metrics change
  const handlePagaChange = (field, value) => {
    const paga = frente.pagaMetrics || { co2Emissions: 1.2, localLabor: 80, femaleLabor: 25, machineryHours: 15 };
    onUpdateFrenteData(frente.id, {
      pagaMetrics: {
        ...paga,
        [field]: parseFloat(value) || 0
      }
    });
  };

  // Handle Financiero metrics change
  const handleFinancieroChange = (field, value) => {
    const financial = frente.financialMetrics || { totalBudget: 500000000, executedBudget: 150000000, advanceAmortized: 20 };
    onUpdateFrenteData(frente.id, {
      financialMetrics: {
        ...financial,
        [field]: parseFloat(value) || 0
      }
    });
  };

  // Calculations for active tab
  const totalItems = currentData.checklist.length;
  const checkedItems = currentData.checklist.filter(item => item.checked).length;
  const percentage = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  const ActiveIcon = COMPONENT_METADATA[activeTab].icon;
  const activeColor = COMPONENT_METADATA[activeTab].color;

  const concreteTests = frente.concreteTests || [];
  const paga = frente.pagaMetrics || { co2Emissions: 1.2, localLabor: 80, femaleLabor: 25, machineryHours: 15 };
  const financial = frente.financialMetrics || { totalBudget: 500000000, executedBudget: 150000000, advanceAmortized: 20 };

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(num);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 mt-6">
      
      {/* Header with Title and Progress */}
      <div className="flex justify-between items-start flex-wrap gap-4 pb-5 border-b border-slate-100 mb-6">
        <div>
          <span className="text-[10px] font-bold text-primary bg-blue-50 border border-blue-100 rounded px-2 py-0.5 uppercase tracking-wider">
            Auditoría Legal de Interventoría
          </span>
          <h3 className="font-headline-md text-lg font-bold text-slate-800 flex items-center gap-2 mt-1.5">
            <span className="material-symbols-outlined text-primary text-xl">gavel</span>
            Cumplimiento: Componente {COMPONENT_METADATA[activeTab].label}
          </h3>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded px-4 py-2">
          <div className="text-right">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Cumplimiento</span>
            <span className={`text-lg font-extrabold font-mono-numbers ${percentage === 100 ? 'text-green-600' : percentage >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
              {percentage}%
            </span>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="text-xs font-bold text-slate-600 font-mono-numbers">
            {checkedItems} / {totalItems} ítems
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex gap-1 border-b border-slate-200 pb-px mb-6 overflow-x-auto hide-scrollbar">
        {Object.entries(COMPONENT_METADATA).map(([key, meta]) => {
          const isActive = activeTab === key;
          const tabChecklist = compliance[key]?.checklist || [];
          const tabCheckedCount = tabChecklist.filter(item => item.checked).length;
          const tabTotal = tabChecklist.length;
          
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 font-bold text-xs border-b-2 transition-all whitespace-nowrap ${
                isActive 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{meta.label}</span>
              {tabTotal > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  tabCheckedCount === tabTotal ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tabCheckedCount}/{tabTotal}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Checklist Grid Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className={isContractorMode ? 'read-only-container' : ''}>
          <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-slate-500">checklist</span>
              Lista de Requisitos de Control
            </span>
            {isContractorMode && (
              <span className="read-only-badge">
                <Lock size={10} /> Solo Consulta
              </span>
            )}
          </h4>
          <div className="space-y-2">
            {currentData.checklist.map((item) => (
              <div 
                key={item.id} 
                onClick={() => !isContractorMode && handleCheckboxToggle(item.id)}
                className={`flex items-start gap-3 p-3 bg-slate-50/50 border border-slate-200 rounded transition-all ${
                  isContractorMode ? 'cursor-default' : 'cursor-pointer hover:bg-slate-50'
                }`}
              >
                <input 
                  type="checkbox" 
                  className="rounded border-slate-300 text-primary focus:ring-primary mt-0.5" 
                  checked={item.checked}
                  disabled={isContractorMode}
                  onChange={() => {}} // Controlled click on card
                />
                <div>
                  <p className={`text-xs font-semibold leading-normal ${item.checked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                    {item.label}
                  </p>
                  <span className={`text-[9px] font-bold uppercase tracking-wider mt-1 block ${item.checked ? 'text-green-600' : 'text-slate-400'}`}>
                    {item.checked ? '✓ Cumple' : '⚠ Pendiente de validar'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tab-Specific Panels (Legal/Technical/Environmental details) */}
        <div>
          {/* TECHNICAL TAB: Concrete Laboratory break tests (NSR-10) */}
          {activeTab === 'tecnico' && (
            <div className={`border rounded p-4 shadow-2xs ${isContractorMode ? 'read-only-container' : 'border-slate-200 bg-slate-50/30'}`}>
              <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-primary">biotech</span>
                  Ensayos de Concreto NSR-10
                </span>
                {isContractorMode && (
                  <span className="read-only-badge">
                    <Lock size={10} /> Ensayo
                  </span>
                )}
              </h4>

              {/* Add Concrete Test Form */}
              {!isContractorMode && (
                <form onSubmit={handleAddConcreteTest} className="grid grid-cols-2 gap-3 mb-4 border-b border-slate-100 pb-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Fecha Ensayo</label>
                    <input 
                      type="date" 
                      required 
                      className="w-full bg-white border border-slate-200 rounded text-xs p-1.5 focus:ring-1 focus:ring-primary focus:outline-none" 
                      value={testDate}
                      onChange={(e) => setTestDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Cilindro MPa Requerido</label>
                    <select 
                      className="w-full bg-white border border-slate-200 rounded text-xs p-1.5 focus:ring-1 focus:ring-primary focus:outline-none" 
                      value={strengthRequired}
                      onChange={(e) => {
                        setStrengthRequired(e.target.value);
                        setMixDesign(e.target.value === '28' ? '4000 PSI (28 MPa)' : e.target.value === '21' ? '3000 PSI (21 MPa)' : '3500 PSI (24 MPa)');
                      }}
                    >
                      <option value="28">28 MPa (4000 PSI)</option>
                      <option value="21">21 MPa (3000 PSI)</option>
                      <option value="24">24 MPa (3500 PSI)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Rotura Laboratorio (MPa)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      required 
                      placeholder="Ej. 29.2" 
                      className="w-full bg-white border border-slate-200 rounded text-xs p-1.5 font-mono-numbers focus:ring-1 focus:ring-primary focus:outline-none" 
                      value={strengthResult}
                      onChange={(e) => setStrengthResult(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <button type="submit" className="w-full bg-[#00236f] text-white text-xs font-bold py-2 rounded transition-transform active:scale-95 flex items-center justify-center gap-1">
                      <Plus size={12} /> Registrar Ensayo
                    </button>
                  </div>
                </form>
              )}

              {/* Concrete Tests Log Table */}
              <div className="overflow-x-auto max-h-48">
                <table className="w-full text-[11px] text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="pb-1.5">Fecha</th>
                      <th className="pb-1.5">Requerido</th>
                      <th className="pb-1.5">Resultado</th>
                      <th className="pb-1.5">Estado</th>
                      {!isContractorMode && <th className="pb-1.5 text-right">Acción</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {concreteTests.length === 0 ? (
                      <tr>
                        <td colSpan={isContractorMode ? "4" : "5"} className="text-slate-400 italic py-2 text-center">No se han registrado ensayos de rotura.</td>
                      </tr>
                    ) : (
                      concreteTests.map((t) => (
                        <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-100/50">
                          <td className="py-2 font-mono-numbers">{t.testDate}</td>
                          <td className="py-2 font-mono-numbers">{t.strengthRequired} MPa</td>
                          <td className="py-2 font-mono-numbers font-bold">{t.strengthResult} MPa</td>
                          <td className="py-2">
                            <span className={`px-1.5 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                              t.status === 'passed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {t.status === 'passed' ? 'Aprobado' : 'Falla'}
                            </span>
                          </td>
                          {!isContractorMode && (
                            <td className="py-2 text-right">
                              <button onClick={() => handleDeleteConcreteTest(t.id)} className="text-red-500 hover:text-red-700">
                                <Trash2 size={12} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ENVIRONMENTAL TAB: PAGA metrics editor */}
          {activeTab === 'ambiental' && (
            <div className={`border rounded p-4 shadow-2xs space-y-4 ${isContractorMode ? 'read-only-container' : 'border-slate-200 bg-slate-50/30'}`}>
              <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-green-600">carbon</span>
                  Métricas PAGA (Ambiental & Social)
                </span>
                {isContractorMode && (
                  <span className="read-only-badge">
                    <Lock size={10} /> Ambiental
                  </span>
                )}
              </h4>
              
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Horas de Maquinaria Pesada</label>
                  <input 
                    type="number" 
                    disabled={isContractorMode}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 font-mono-numbers disabled:bg-slate-100 disabled:text-slate-500" 
                    value={paga.machineryHours || 15}
                    onChange={(e) => handlePagaChange('machineryHours', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">CO2 Estimado (Toneladas)</label>
                  <div className="bg-slate-100 border border-slate-200 rounded p-1.5 font-bold font-mono-numbers text-slate-600">
                    {((paga.machineryHours || 15) * 0.08).toFixed(2)} t CO2
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Mano de Obra Local (%)</label>
                  <input 
                    type="number" 
                    disabled={isContractorMode}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 font-mono-numbers disabled:bg-slate-100 disabled:text-slate-500" 
                    value={paga.localLabor || 80}
                    onChange={(e) => handlePagaChange('localLabor', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Cuota de Equidad de Género (%)</label>
                  <input 
                    type="number" 
                    disabled={isContractorMode}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 font-mono-numbers disabled:bg-slate-100 disabled:text-slate-500" 
                    value={paga.femaleLabor || 25}
                    onChange={(e) => handlePagaChange('femaleLabor', e.target.value)}
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded p-3 text-[11px] text-slate-600 leading-normal flex gap-2">
                <span className="material-symbols-outlined text-blue-600 text-base mt-0.5">info</span>
                <span>
                  El Plan de Acción de Gestión Ambiental y Social (PAGA) exige mínimo 60% de mano de obra local y reportar emisiones de maquinaria.
                </span>
              </div>
            </div>
          )}

          {/* FINANCIAL TAB: Budget, Amortization & Curva S */}
          {activeTab === 'financiero' && (
            <div className={`border rounded p-4 shadow-2xs space-y-4 ${isContractorMode ? 'read-only-container' : 'border-slate-200 bg-slate-50/30'}`}>
              <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-green-600">finance</span>
                  Balance Financiero del Frente
                </span>
                {isContractorMode && (
                  <span className="read-only-badge">
                    <Lock size={10} /> Financiero
                  </span>
                )}
              </h4>
              
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Presupuesto Asignado Frente ($ COP)</label>
                  <input 
                    type="number" 
                    disabled={isContractorMode}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 font-mono-numbers disabled:bg-slate-100 disabled:text-slate-500" 
                    value={financial.totalBudget || 500000000}
                    onChange={(e) => handleFinancieroChange('totalBudget', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Presupuesto Ejecutado ($ COP)</label>
                  <input 
                    type="number" 
                    disabled={isContractorMode}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 font-mono-numbers disabled:bg-slate-100 disabled:text-slate-500" 
                    value={financial.executedBudget || 150000000}
                    onChange={(e) => handleFinancieroChange('executedBudget', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Amortización de Anticipo (%)</label>
                  <input 
                    type="number" 
                    disabled={isContractorMode}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 font-mono-numbers disabled:bg-slate-100 disabled:text-slate-500" 
                    value={financial.advanceAmortized || 20}
                    onChange={(e) => handleFinancieroChange('advanceAmortized', e.target.value)}
                  />
                </div>

                <div className="bg-slate-100 p-2.5 rounded border border-slate-200 font-bold text-slate-800 flex justify-between font-mono-numbers">
                  <span>Saldo por Amortizar:</span>
                  <span>{formatCurrency((financial.totalBudget * 0.3) - ((financial.executedBudget || 0) * (financial.advanceAmortized / 100)))} COP</span>
                </div>
              </div>
            </div>
          )}

          {/* LEGAL & ADMINISTRATIVO TAB: Parafiscales, SECOP II and bitacora */}
          {activeTab === 'legal' && (
            <div className={`border rounded p-4 shadow-2xs space-y-4 ${isContractorMode ? 'read-only-container' : 'border-slate-200 bg-slate-50/30'}`}>
              <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-indigo-600">gavel</span>
                  Sincronización Contractual (SECOP II)
                </span>
                {isContractorMode && (
                  <span className="read-only-badge">
                    <Lock size={10} /> Legal
                  </span>
                )}
              </h4>
              
              <div className="space-y-3.5 text-xs">
                <div className="bg-white border border-slate-200 rounded p-3.5 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-700 block">Radicación SECOP II</span>
                    <span className="text-[10px] text-slate-400 block font-mono-numbers">ID: CO1.BD.123456-F{frente.id.split('_')[1] || '1'}</span>
                  </div>
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold text-[9px] uppercase flex items-center gap-1">
                    <Globe size={10} /> En Línea
                  </span>
                </div>

                <div className="p-3 bg-red-50/60 border border-red-100 rounded text-[11px] text-red-700 leading-normal flex gap-2">
                  <span className="material-symbols-outlined text-red-600 text-base">emergency_home</span>
                  <span>
                    <strong>Importante:</strong> El contratista debe registrar el certificado de parafiscales firmado por Revisor Fiscal antes del día 10 de cada mes.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Default details placeholder for other tabs */}
          {activeTab !== 'tecnico' && activeTab !== 'ambiental' && activeTab !== 'financiero' && activeTab !== 'legal' && (
            <div className={`border rounded p-4 shadow-2xs ${isContractorMode ? 'read-only-container' : 'border-slate-200 bg-slate-50/30'}`}>
              <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                <span>Requisitos de Control y Bitácora</span>
                {isContractorMode && (
                  <span className="read-only-badge">
                    <Lock size={10} /> Registro
                  </span>
                )}
              </h4>
              <p className="text-slate-500 text-xs leading-relaxed mt-2">
                Utilice el diario de campo inferior para consignar anotaciones específicas sobre el control de {COMPONENT_METADATA[activeTab].label.toLowerCase()} de este frente de obra. Marque los requisitos a la izquierda para certificar el cumplimiento.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Diary of Campo Section */}
      <div className={`border-t border-slate-100 pt-5 mt-5 ${isContractorMode ? 'read-only-container' : ''}`}>
        <div className="flex justify-between items-center mb-3">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <ActiveIcon size={15} style={{ color: activeColor }} />
            Bitácora de Campo y Diario de Obra ({COMPONENT_METADATA[activeTab].label})
          </label>
          {isContractorMode ? (
            <span className="read-only-badge">
              <Lock size={10} /> Bitácora
            </span>
          ) : (
            savedMessage && (
              <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-100 font-mono">
                {savedMessage}
              </span>
            )
          )}
        </div>
        <textarea
          disabled={isContractorMode}
          className="w-full bg-slate-50 border border-slate-200 rounded p-3 text-xs text-slate-700 focus:ring-1 focus:ring-primary focus:outline-none leading-relaxed disabled:bg-slate-100 disabled:text-slate-500"
          rows="4"
          placeholder={isContractorMode ? "Sin observaciones registradas." : `Escribe aquí las observaciones técnicas, hallazgos, recomendaciones o justificaciones del componente ${COMPONENT_METADATA[activeTab].label.toLowerCase()} de este frente de obra...`}
          value={currentData.notes || ''}
          onChange={handleNotesChange}
        />
        {!isContractorMode && (
          <div className="mt-3.5 flex justify-end">
            <button 
              type="button" 
              className="bg-white border border-slate-300 text-slate-700 font-bold text-xs px-4 py-2 rounded hover:bg-slate-50 flex items-center gap-1.5 transition-colors shadow-sm" 
              onClick={triggerSaveNotification}
            >
              <Save size={13} />
              Asentar en Bitácora
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
