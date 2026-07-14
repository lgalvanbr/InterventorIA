import React, { useState } from 'react';
import { curvaSData } from '../data/reportsCurvaS';
import { FileText, TrendingUp, HelpCircle } from 'lucide-react';

export default function ReportsView({ projects = [] }) {
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [selectedFrenteId, setSelectedFrenteId] = useState('all');
  const [activeTab, setActiveTab] = useState('actas'); // 'actas' or 'curva-s'
  const [isApproved, setIsApproved] = useState(false);
  const [signatures, setSignatures] = useState({
    contratista: false,
    interventor: false,
    supervisor: false
  });

  const project = projects.find(p => p.id === selectedProjectId);

  const formatCOP = (num) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(num);
  };

  const handleSign = (role) => {
    setSignatures(prev => ({
      ...prev,
      [role]: !prev[role]
    }));
  };

  // Mock itemized list of items for the project budget
  const mockItems = [
    { item: '1.1', desc: 'Demolición de carpeta asfáltica (m2)', unit: 'm2', qty: 1500, price: 35000 },
    { item: '1.2', desc: 'Excavación mecánica en suelo arcilloso (m3)', unit: 'm3', qty: 1200, price: 42000 },
    { item: '1.3', desc: 'Relleno de base granular compactada (m3)', unit: 'm3', qty: 800, price: 65000 },
    { item: '2.1', desc: 'Suministro e instalación de tubería pluvial 36" (m)', unit: 'm', qty: 500, price: 280000 },
    { item: '2.2', desc: 'Construcción de pozos de inspección h=2m (Und)', unit: 'Und', qty: 15, price: 3500000 },
    { item: '3.1', desc: 'Suministro y colocación de concreto de 4000 PSI para vigas (m3)', unit: 'm3', qty: 95, price: 540000 },
    { item: '3.2', desc: 'Adoquinamiento peatonal tipo andén (m2)', unit: 'm2', qty: 2500, price: 85000 }
  ];

  // Calculate values depending on project progress
  const frentesCount = project?.frentes?.length || 0;
  const projectProgress = frentesCount > 0
    ? Math.round(project.frentes.reduce((acc, curr) => acc + curr.progress, 0) / frentesCount)
    : 0;

  // Simulate execution quantity based on physical progress
  const itemsWithExecution = mockItems.map(item => {
    // If a specific frente is selected, simulate slightly different quantities
    const progressFactor = selectedFrenteId === 'all' 
      ? projectProgress / 100 
      : ((project.frentes?.find(f => f.id === selectedFrenteId)?.progress || 10) / 100);

    const execQty = Math.round(item.qty * progressFactor * 10) / 10;
    const totalExec = execQty * item.price;
    const balanceQty = Math.max(0, item.qty - execQty);
    const balanceVal = balanceQty * item.price;

    return {
      ...item,
      execQty,
      totalExec,
      balanceQty,
      balanceVal
    };
  });

  const totalContractVal = mockItems.reduce((acc, curr) => acc + (curr.qty * curr.price), 0);
  const totalExecutedVal = itemsWithExecution.reduce((acc, curr) => acc + curr.totalExec, 0);
  const totalBalanceVal = itemsWithExecution.reduce((acc, curr) => acc + curr.balanceVal, 0);

  // Amortization of advance payment (30% of contract value total)
  const advanceTotal = totalContractVal * 0.3;
  const advanceAmortizationRate = 0.2; // 20% amortization of executed work value per act
  const currentAmortization = totalExecutedVal * advanceAmortizationRate;
  const netPayment = totalExecutedVal - currentAmortization;

  // Curva S Mock Data points for SVG chart
  const plannedProgressPoints = [0, 10, 25, 45, 65, 80, 100];
  const actualProgressPoints = [
    0, 
    Math.round(projectProgress * 0.2), 
    Math.round(projectProgress * 0.45), 
    Math.round(projectProgress * 0.7), 
    Math.round(projectProgress * 0.9), 
    projectProgress
  ];

  return (
    <div className="flex-1 p-gutter max-w-container-max mx-auto grid-bg min-h-screen pb-16">
      
      {/* View Header */}
      <section className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-gutter border-b border-slate-200 pb-6">
        <div>
          <h2 className="font-headline-lg text-3xl font-extrabold text-primary mb-1">
            Actas de Recibo Parcial
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            Genera, valida y firma los informes mensuales de obra requeridos por la normativa colombiana de contratación pública.
          </p>
        </div>
      </section>

      {/* Sub-tab navigation */}
      <div className="flex border border-slate-200 bg-white rounded-lg p-1 gap-2 mb-6 shadow-sm">
        <button
          onClick={() => setActiveTab('actas')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded transition-all ${
            activeTab === 'actas'
              ? 'bg-primary text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <FileText size={14} />
          Actas de Recibo Parcial
        </button>
        <button
          onClick={() => setActiveTab('curva-s')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded transition-all ${
            activeTab === 'curva-s'
              ? 'bg-primary text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <TrendingUp size={14} />
          Línea Base y Curva S (Programación)
        </button>
      </div>

      {/* Selectors and Actions Control bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 mb-8 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Seleccionar Contrato</label>
            <select 
              className="bg-slate-50 border border-slate-200 rounded text-xs p-2 font-medium focus:ring-1 focus:ring-primary focus:outline-none min-w-[240px]"
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setSelectedFrenteId('all');
                setIsApproved(false);
                setSignatures({ contratista: false, interventor: false, supervisor: false });
              }}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Frente de Obra</label>
            <select 
              className="bg-slate-50 border border-slate-200 rounded text-xs p-2 font-medium focus:ring-1 focus:ring-primary focus:outline-none min-w-[180px]"
              value={selectedFrenteId}
              onChange={(e) => {
                setSelectedFrenteId(e.target.value);
                setIsApproved(false);
              }}
            >
              <option value="all">Todos los Frentes</option>
              {project?.frentes?.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => window.print()}
            className="bg-white border border-slate-300 text-slate-700 font-bold text-xs px-4 py-2.5 rounded hover:bg-slate-50 flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            Imprimir Acta
          </button>
          
          <button 
            onClick={() => {
              if (!signatures.interventor) {
                alert('La interventoría debe firmar digitalmente el acta antes de la aprobación final.');
                return;
              }
              setIsApproved(true);
            }}
            className="bg-green-600 text-white font-bold text-xs px-5 py-2.5 rounded hover:bg-green-700 transition-transform active:scale-95 duration-100 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">verified</span>
            Aprobar Acta de Obra
          </button>
        </div>
      </div>

      {activeTab === 'actas' ? (
        !project ? (
          <div className="bg-white border border-slate-200 rounded-lg p-16 text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-2">assignment_late</span>
            <p className="font-bold">No hay proyectos de obra cargados para generar reportes.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* Main Acceptance Document Card (2 Cols) */}
            <div className="xl:col-span-2 bg-white border border-slate-200 rounded-lg p-8 relative overflow-hidden">
              {/* Approved stamp layer */}
              {isApproved && (
                <div className="absolute top-8 right-8 z-30">
                  <div className="stamp-approved">
                    Aprobado
                    <span className="block text-[8px] font-bold text-center tracking-widest mt-0.5">Interventoría CO</span>
                  </div>
                </div>
              )}

              {/* Document Header */}
              <div className="text-center border-b border-slate-200 pb-6 mb-6">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest mb-1">Acta de Recibo Parcial de Obra</h3>
                <p className="text-xs text-slate-400">FORMATO OFICIAL DE CONTROL MENSUAL - NORMATIVA COLOMBIANA DE OBRAS PÚBLICAS</p>
                <div className="flex justify-center gap-6 text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-3">
                  <span>Expediente: <strong className="font-mono-numbers">ACT-2026-N04</strong></span>
                  <span>Fecha Corte: <strong>{new Date().toLocaleDateString('es-CO', {month: 'long', year: 'numeric'})}</strong></span>
                </div>
              </div>

              {/* Contract data */}
              <div className="grid grid-cols-2 gap-y-3.5 gap-x-6 text-[11px] text-slate-600 mb-6 bg-slate-50 p-4 border border-slate-200 rounded">
                <div>
                  <strong className="text-slate-400 uppercase text-[9px] block">Contrato de Obra No.</strong>
                  <span className="font-bold text-slate-800 font-mono-numbers">{project.contractNo}</span>
                </div>
                <div>
                  <strong className="text-slate-400 uppercase text-[9px] block">Contratista Ejecutor</strong>
                  <span className="font-bold text-slate-800">{project.contractor}</span>
                </div>
                <div>
                  <strong className="text-slate-400 uppercase text-[9px] block">Interventor del Contrato</strong>
                  <span className="font-bold text-slate-800">Consorcio Interventores Bogotá 2026</span>
                </div>
                <div>
                  <strong className="text-slate-400 uppercase text-[9px] block">Obra / Frente Auditado</strong>
                  <span className="font-bold text-slate-800">
                    {selectedFrenteId === 'all' ? 'Consolidado General' : project.frentes?.find(f => f.id === selectedFrenteId)?.name}
                  </span>
                </div>
              </div>

              {/* Itemized Progress Table */}
              <div className="mb-8">
                <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-3">Relación de Ítems Ejecutados y Cantidades</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-300 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-2.5 pr-2">Ítem</th>
                        <th className="py-2.5">Descripción</th>
                        <th className="py-2.5">Unid</th>
                        <th className="py-2.5 text-right">Cant. Contrato</th>
                        <th className="py-2.5 text-right">Cant. Realizada</th>
                        <th className="py-2.5 text-right">V. Unitario</th>
                        <th className="py-2.5 text-right">V. Ejecutado (COP)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsWithExecution.map((item) => (
                        <tr key={item.item} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="py-2 font-mono-numbers font-bold text-slate-800">{item.item}</td>
                          <td className="py-2 font-semibold text-slate-700">{item.desc}</td>
                          <td className="py-2 text-slate-500 font-medium">{item.unit}</td>
                          <td className="py-2 text-right font-mono-numbers text-slate-500">{item.qty}</td>
                          <td className="py-2 text-right font-mono-numbers font-bold text-slate-800">{item.execQty}</td>
                          <td className="py-2 text-right font-mono-numbers text-slate-600">{formatCOP(item.price)}</td>
                          <td className="py-2 text-right font-mono-numbers font-extrabold text-slate-900">{formatCOP(item.totalExec)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="border-t border-slate-200 pt-5 text-xs text-slate-700">
                <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-3">Resumen Financiero del Período</h4>
                <div className="max-w-md ml-auto space-y-2 border border-slate-200 rounded p-4 bg-slate-50/20">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Valor Bruto Ejecutado:</span>
                    <span className="font-bold font-mono-numbers">{formatCOP(totalExecutedVal)}</span>
                  </div>
                  <div className="flex justify-between text-amber-600">
                    <span className="font-semibold">Deducción Amortización Anticipo (20%):</span>
                    <span className="font-bold font-mono-numbers">-{formatCOP(currentAmortization)}</span>
                  </div>
                  <div className="h-px bg-slate-200 my-1"></div>
                  <div className="flex justify-between text-sm text-slate-900 font-extrabold">
                    <span>Valor Neto a Pagar:</span>
                    <span className="font-mono-numbers text-primary">{formatCOP(netPayment)}</span>
                  </div>
                  <div className="h-px bg-slate-200 my-1"></div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <span>Saldo Contrato por Ejecutar:</span>
                    <span className="font-mono-numbers">{formatCOP(totalBalanceVal)}</span>
                  </div>
                </div>
              </div>

              {/* Official signature block */}
              <div className="border-t border-slate-200 pt-6 mt-8 grid grid-cols-3 gap-6 text-[10px] text-slate-500 font-semibold">
                <div className="text-center">
                  <div className="h-14 flex items-center justify-center border-b border-slate-300 mb-2">
                    {signatures.contratista ? (
                      <span className="font-bold text-green-600 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">verified_user</span>
                        FIRMADO DIGITALMENTE (Contratista)
                      </span>
                    ) : (
                      <button onClick={() => handleSign('contratista')} className="text-primary hover:underline text-[9px] font-bold">
                        [Firmar Contratista]
                      </button>
                    )}
                  </div>
                  <span>Representante de Obra</span>
                  <span className="block text-[8px] text-slate-400 uppercase tracking-widest mt-0.5">Contratista</span>
                </div>

                <div className="text-center">
                  <div className="h-14 flex items-center justify-center border-b border-slate-300 mb-2">
                    {signatures.interventor ? (
                      <span className="font-bold text-green-600 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">verified_user</span>
                        FIRMADO DIGITALMENTE (Interventor)
                      </span>
                    ) : (
                      <button onClick={() => handleSign('interventor')} className="text-primary hover:underline text-[9px] font-bold">
                        [Firmar Interventoría]
                      </button>
                    )}
                  </div>
                  <span>Ingeniero Interventor Senior</span>
                  <span className="block text-[8px] text-slate-400 uppercase tracking-widest mt-0.5">Interventoría</span>
                </div>

                <div className="text-center">
                  <div className="h-14 flex items-center justify-center border-b border-slate-300 mb-2">
                    {signatures.supervisor ? (
                      <span className="font-bold text-green-600 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">verified_user</span>
                        FIRMADO DIGITALMENTE (Supervisor)
                      </span>
                    ) : (
                      <button onClick={() => handleSign('supervisor')} className="text-primary hover:underline text-[9px] font-bold">
                        [Firmar Supervisor IDU]
                      </button>
                    )}
                  </div>
                  <span>Supervisor de la Entidad</span>
                  <span className="block text-[8px] text-slate-400 uppercase tracking-widest mt-0.5">Alcaldía / IDU</span>
                </div>
              </div>
            </div>

            {/* Right Panel: Curva S SVG Graphic (1 Col) */}
            <div className="bg-white border border-slate-200 rounded-lg p-6 animate-fade-in">
              <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <TrendingUp size={16} className="text-primary" />
                Resumen de Avance Real
              </h4>
              
              {/* SVG Curve Chart */}
              <div className="bg-slate-50 rounded border border-slate-100 p-4 mb-4 flex justify-center">
                <svg width="240" height="180" viewBox="0 0 240 180" className="overflow-visible">
                  <line x1="20" y1="20" x2="220" y2="20" stroke="#eceef0" strokeWidth="1" />
                  <line x1="20" y1="50" x2="220" y2="50" stroke="#eceef0" strokeWidth="1" />
                  <line x1="20" y1="80" x2="220" y2="80" stroke="#eceef0" strokeWidth="1" />
                  <line x1="20" y1="110" x2="220" y2="110" stroke="#eceef0" strokeWidth="1" />
                  <line x1="20" y1="140" x2="220" y2="140" stroke="#eceef0" strokeWidth="1" />
                  
                  <line x1="20" y1="140" x2="220" y2="140" stroke="#cbd5e1" strokeWidth="1.5" />
                  <line x1="20" y1="20" x2="20" y2="140" stroke="#cbd5e1" strokeWidth="1.5" />

                  <text x="14" y="23" fontSize="8" fontWeight="700" fill="#94a3b8" textAnchor="end">100%</text>
                  <text x="14" y="83" fontSize="8" fontWeight="700" fill="#94a3b8" textAnchor="end">50%</text>
                  <text x="14" y="143" fontSize="8" fontWeight="700" fill="#94a3b8" textAnchor="end">0%</text>

                  <text x="20" y="155" fontSize="7" fontWeight="700" fill="#94a3b8" textAnchor="middle">M0</text>
                  <text x="60" y="155" fontSize="7" fontWeight="700" fill="#94a3b8" textAnchor="middle">M1</text>
                  <text x="100" y="155" fontSize="7" fontWeight="700" fill="#94a3b8" textAnchor="middle">M2</text>
                  <text x="140" y="155" fontSize="7" fontWeight="700" fill="#94a3b8" textAnchor="middle">M3</text>
                  <text x="180" y="155" fontSize="7" fontWeight="700" fill="#94a3b8" textAnchor="middle">M4</text>
                  <text x="220" y="155" fontSize="7" fontWeight="700" fill="#94a3b8" textAnchor="middle">M5</text>

                  <path 
                    d="M 20 140 Q 90 120 130 90 T 220 20" 
                    fill="none" 
                    stroke="#16a34a" 
                    strokeWidth="2" 
                    strokeDasharray="3,3"
                  />
                  <path 
                    d="M 20 140 Q 85 131 125 101 T 220 50" 
                    fill="none" 
                    stroke="#00236f" 
                    strokeWidth="3.5" 
                  />

                  <circle cx="220" cy="50" r="4" fill="#00236f" />
                  <circle cx="220" cy="20" r="3" fill="#16a34a" />
                </svg>
              </div>

              {/* Graphic Legend */}
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 border-t-2 border-dashed border-[#16a34a]"></div>
                  <span className="font-semibold text-slate-700">Progreso Programado (Curva S)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 bg-[#00236f]"></div>
                  <span className="font-semibold text-slate-700">Progreso Físico Real</span>
                </div>
                
                <div className="h-px bg-slate-200 my-4"></div>
                
                <div className="bg-amber-50 border border-amber-200 rounded p-3 text-[11px] text-amber-800 leading-normal flex gap-2">
                  <HelpCircle size={16} className="shrink-0 text-amber-600" />
                  <span>
                    <strong>Aviso de Retraso:</strong> El avance físico real se encuentra desfasado un 12.3% respecto a la curva S programada del proyecto.
                  </span>
                </div>
              </div>
            </div>

          </div>
        )
      ) : (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* Curva S chart panel */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <TrendingUp size={16} className="text-primary" />
              Gráfica Curva S Oficial — Avance Físico de Obra
            </h4>

            <div className="bg-slate-50 rounded border border-slate-150 p-4 mb-4 flex flex-col items-center justify-center overflow-x-auto">
              <svg width="860" height="280" viewBox="0 0 860 280" className="overflow-visible min-w-[700px]">
                {/* Grid Lines */}
                {[0, 20, 40, 60, 80, 100].map(pct => {
                  const y = 20 + 200 - (pct / 100) * 200;
                  return (
                    <g key={pct}>
                      <line x1="50" y1={y} x2="830" y2={y} stroke="#e2e8f0" strokeWidth="1" />
                      <text x="40" y={y + 3} fontSize="9" fontWeight="700" fill="#94a3b8" textAnchor="end">{pct}%</text>
                    </g>
                  );
                })}

                {/* X Axis Labels (Every 8 weeks) */}
                {curvaSData.map((d, i) => {
                  if (i % 8 === 0 || i === curvaSData.length - 1) {
                    const x = 50 + (i / (curvaSData.length - 1)) * 780;
                    return (
                      <g key={i}>
                        <line x1={x} y1="20" x2={x} y2="220" stroke="#f1f5f9" strokeWidth="1" />
                        <text x={x} y="235" fontSize="8" fontWeight="700" fill="#94a3b8" textAnchor="middle">
                          {d.semana.replace('Semana ', 'S')}
                        </text>
                        <text x={x} y="245" fontSize="7" fontWeight="600" fill="#cbd5e1" textAnchor="middle">
                          {d.year}
                        </text>
                      </g>
                    );
                  }
                  return null;
                })}

                {/* Axes */}
                <line x1="50" y1="220" x2="830" y2="220" stroke="#cbd5e1" strokeWidth="1.5" />
                <line x1="50" y1="20" x2="50" y2="220" stroke="#cbd5e1" strokeWidth="1.5" />

                {/* Curves */}
                <path 
                  d={curvaSData.map((d, i) => {
                    const x = 50 + (i / (curvaSData.length - 1)) * 780;
                    const y = 20 + 200 - (d.progFisicoAcum / 100) * 200;
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ')} 
                  fill="none" 
                  stroke="#16a34a" 
                  strokeWidth="2.5" 
                  strokeDasharray="4,4" 
                />

                <path 
                  d={curvaSData
                    .map((d, i) => {
                      const hasExec = d.costoAcumRealPct > 0 || d.costoExecAcum > 0;
                      if (i === 0) return { x: 50, y: 220 };
                      if (!hasExec) return null;
                      const x = 50 + (i / (curvaSData.length - 1)) * 780;
                      const y = 20 + 200 - (d.costoAcumRealPct / 100) * 200;
                      return { x, y };
                    })
                    .filter(p => p !== null)
                    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                    .join(' ')
                  } 
                  fill="none" 
                  stroke="#00236f" 
                  strokeWidth="3.5" 
                />

                {/* Legend points */}
                <circle cx={50 + 780} cy={20 + 200 - (curvaSData[curvaSData.length-1].progFisicoAcum / 100) * 200} r="4.5" fill="#16a34a" />
                <circle cx={50 + (26 / (curvaSData.length - 1)) * 780} cy={20 + 200 - (curvaSData[26].costoAcumRealPct / 100) * 200} r="5" fill="#00236f" />
              </svg>
            </div>

            {/* Graphic Legend */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 p-4 border border-slate-100 rounded-lg">
              <div className="flex flex-wrap gap-6 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-0.5 border-t-2 border-dashed border-[#16a34a]"></div>
                  <span className="text-slate-600">Progreso Programado Acumulado ({curvaSData[curvaSData.length - 1].progFisicoAcum.toFixed(1)}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-1 bg-[#00236f] rounded"></div>
                  <span className="text-slate-600">Progreso Físico Real Acumulado ({curvaSData[26].costoAcumRealPct.toFixed(2)}% - Corte S27)</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[11px] text-amber-800 leading-normal flex items-center gap-2 max-w-lg">
                <HelpCircle size={16} className="shrink-0 text-amber-600" />
                <span>
                  <strong>Control de Desviación:</strong> Al corte de la **Semana 27 de 2026**, la obra presenta un avance acumulado del **{curvaSData[26].costoAcumRealPct.toFixed(2)}%** frente al **{curvaSData[26].progFisicoAcum.toFixed(2)}%** programado (Desfase de **{(curvaSData[26].costoAcumRealPct - curvaSData[26].progFisicoAcum).toFixed(2)}%**).
                </span>
              </div>
            </div>
          </div>

          {/* Detailed table panel */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-700 text-sm">Cronograma y Curva de Avance Semanal (Línea Base)</h3>
                <p className="text-[10px] text-slate-400 font-medium">Programación presupuestal, física y actas de cobro consolidada</p>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">{curvaSData.length} Semanas registradas</span>
            </div>
            
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left border-collapse text-[11px] relative">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10 text-slate-500 font-bold uppercase tracking-wider text-[9px] shadow-sm">
                  <tr>
                    <th className="py-2.5 px-3">Año / Trim</th>
                    <th className="py-2.5 px-3">Semana</th>
                    <th className="py-2.5 px-3 text-right">Costo Prog. Semanal</th>
                    <th className="py-2.5 px-3 text-right">Costo Prog. Acumulado</th>
                    <th className="py-2.5 px-3 text-right">Costo Ejec. Semanal</th>
                    <th className="py-2.5 px-3 text-right">Costo Ejec. Acumulado</th>
                    <th className="py-2.5 px-3 text-center">% Prog. Acum.</th>
                    <th className="py-2.5 px-3 text-center">% Ejec. Acum.</th>
                    <th className="py-2.5 px-3 text-center">Acta</th>
                    <th className="py-2.5 px-3 text-right">Cobrado Acum.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {curvaSData.map((d, index) => (
                    <tr key={index} className="hover:bg-slate-50/50 transition-all font-medium">
                      <td className="py-2 px-3 font-semibold text-slate-500">{d.year} {d.trimestre}</td>
                      <td className="py-2 px-3 font-bold text-slate-800">{d.semana}</td>
                      <td className="py-2 px-3 text-right font-mono-numbers">{d.costoProgSemana > 0 ? formatCOP(d.costoProgSemana) : '-'}</td>
                      <td className="py-2 px-3 text-right font-mono-numbers text-slate-500">{d.costoProgAcum > 0 ? formatCOP(d.costoProgAcum) : '-'}</td>
                      <td className="py-2 px-3 text-right font-mono-numbers">{d.costoExecSemana > 0 ? formatCOP(d.costoExecSemana) : '-'}</td>
                      <td className="py-2 px-3 text-right font-mono-numbers text-primary">{d.costoExecAcum > 0 ? formatCOP(d.costoExecAcum) : '-'}</td>
                      <td className="py-2 px-3 text-center font-mono-numbers text-emerald-700 font-bold bg-emerald-50/30">{d.progFisicoAcum.toFixed(2)}%</td>
                      <td className="py-2 px-3 text-center font-mono-numbers text-blue-700 font-bold bg-blue-50/30">
                        {d.costoAcumRealPct > 0 ? `${d.costoAcumRealPct.toFixed(2)}%` : '-'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {d.actaNum ? (
                          <span className="bg-slate-100 text-slate-850 px-2 py-0.5 rounded text-[10px] font-bold">Acta {d.actaNum}</span>
                        ) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono-numbers text-slate-500">{d.cobradoAcum > 0 ? formatCOP(d.cobradoAcum) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
