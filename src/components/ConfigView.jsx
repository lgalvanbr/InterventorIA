import React, { useState, useEffect } from 'react';
import { Save, CheckCircle } from 'lucide-react';

export default function ConfigView({ projects = [] }) {
  const [dbHost, setDbHost] = useState('192.168.10.45');
  const [dbName, setDbName] = useState('db_interventor_ia');
  const [dbUser, setDbUser] = useState('admin_interventoria');
  const [secopKey, setSecopKey] = useState('secop_api_prod_k39f8s9d9f');
  const [secopSync, setSecopSync] = useState('daily');
  const [carbonFactor, setCarbonFactor] = useState('0.08'); // ton CO2 per hour of diesel machinery
  
  const [savedMsg, setSavedMsg] = useState('');
  
  // Custom frentes colors states
  const [frentesSearch, setFrentesSearch] = useState('');
  const [frenteColors, setFrenteColors] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('geo_interventoria_frentes_colors') || '{}');
    } catch (e) {
      return {};
    }
  });
  const [colorSavedMsg, setColorSavedMsg] = useState('');

  // Extract and enrich all frentes
  const allFrentes = projects.flatMap(p => 
    (p.frentes || []).map(f => {
      let frenteNum = f.frente;
      if (!frenteNum && f.id) {
        const parts = f.id.split('_');
        if (parts.length >= 3) {
          const num = parseInt(parts[2]);
          if (parts[1] === 'mv') {
            frenteNum = num;
          } else if (parts[1] === 'ep') {
            frenteNum = num + 100;
          }
        }
      }
      return {
        ...f,
        frente: frenteNum || '',
        projectName: p.name
      };
    })
  );

  const COLOR_PRESETS = [
    { name: 'Azul', value: '#1e3a8a' },
    { name: 'Naranja', value: '#d97706' },
    { name: 'Verde', value: '#10b981' },
    { name: 'Amarillo', value: '#f59e0b' },
    { name: 'Rojo', value: '#ef4444' },
    { name: 'Púrpura', value: '#8b5cf6' },
    { name: 'Cerceta', value: '#14b8a6' },
    { name: 'Gris', value: '#64748b' }
  ];

  const handleSelectColor = (frenteId, color) => {
    const newColors = { ...frenteColors, [frenteId]: color };
    setFrenteColors(newColors);
    localStorage.setItem('geo_interventoria_frentes_colors', JSON.stringify(newColors));
    
    // Extract front number for message
    const fr = allFrentes.find(item => item.id === frenteId);
    setColorSavedMsg(`Color guardado para Frente ${fr ? fr.frente : frenteId}`);
    setTimeout(() => setColorSavedMsg(''), 2000);
  };

  const handleResetColors = () => {
    if (window.confirm('¿Estás seguro de que deseas restablecer los colores de todos los frentes a los valores por defecto?')) {
      setFrenteColors({});
      localStorage.removeItem('geo_interventoria_frentes_colors');
      setColorSavedMsg('Colores restablecidos a los valores por defecto.');
      setTimeout(() => setColorSavedMsg(''), 2000);
    }
  };

  const filteredFrentes = allFrentes.filter(f => 
    f.name.toLowerCase().includes(frentesSearch.toLowerCase()) ||
    f.civ.toLowerCase().includes(frentesSearch.toLowerCase()) ||
    f.eje.toLowerCase().includes(frentesSearch.toLowerCase()) ||
    String(f.frente).includes(frentesSearch)
  );

  // Load initial configuration from localStorage if available
  useEffect(() => {
    const savedConfig = localStorage.getItem('geo_interventoria_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setDbHost(parsed.dbHost || '');
        setDbName(parsed.dbName || '');
        setDbUser(parsed.dbUser || '');
        setSecopKey(parsed.secopKey || '');
        setSecopSync(parsed.secopSync || 'daily');
        setCarbonFactor(parsed.carbonFactor || '0.08');
      } catch (e) {
        console.error("Error loading config from localStorage:", e);
      }
    }
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    const configData = {
      dbHost,
      dbName,
      dbUser,
      secopKey,
      secopSync,
      carbonFactor
    };

    localStorage.setItem('geo_interventoria_config', JSON.stringify(configData));
    setSavedMsg('Configuración guardada correctamente.');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  return (
    <div className="flex-1 p-gutter max-w-container-max mx-auto grid-bg min-h-screen pb-16">
      
      {/* View Header */}
      <section className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-gutter border-b border-slate-200 pb-6">
        <div>
          <h2 className="font-headline-lg text-3xl font-extrabold text-primary mb-1">
            Configuración del Sistema
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            Administra las conexiones de bases de datos, llaves de APIs gubernamentales y parámetros del Plan de Manejo Ambiental (PAGA).
          </p>
        </div>
      </section>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Connection Database Module (Card 1) */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-3">
            <span className="material-symbols-outlined text-primary text-lg">database</span>
            Base de Datos Centralizada
          </h4>
          
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Servidor Base de Datos (Host)</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono-numbers focus:ring-1 focus:ring-primary focus:outline-none"
                placeholder="Ej. 192.168.1.100"
                value={dbHost}
                onChange={(e) => setDbHost(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Puerto</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono-numbers focus:ring-1 focus:ring-primary focus:outline-none"
                  defaultValue="5432"
                  disabled
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Esquema / BD</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  placeholder="db_interventoria"
                  value={dbName}
                  onChange={(e) => setDbName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Usuario DB</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  value={dbUser}
                  onChange={(e) => setDbUser(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Contraseña</label>
                <input 
                  type="password" 
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  defaultValue="••••••••••••"
                  disabled
                />
              </div>
            </div>
          </div>
        </div>

        {/* Integration API SECOP II (Card 2) */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <span className="material-symbols-outlined text-primary text-lg">api</span>
              Sincronización SECOP II (Colombia Compra Eficiente)
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Llave API (SECOP II OAuth Token)</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono-numbers focus:ring-1 focus:ring-primary focus:outline-none"
                  placeholder="Ingrese el token de autenticación gubernamental..."
                  value={secopKey}
                  onChange={(e) => setSecopKey(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Frecuencia de Sincronización</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  value={secopSync}
                  onChange={(e) => setSecopSync(e.target.value)}
                  style={{ height: '36px' }}
                >
                  <option value="realtime">Tiempo Real (Al asentar actas)</option>
                  <option value="daily">Diario (Cada noche 00:00)</option>
                  <option value="weekly">Semanal (Sábados)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded p-3 text-[11px] text-slate-600 leading-normal flex gap-2 mt-4">
            <span className="material-symbols-outlined text-blue-600 text-base">info</span>
            <span>
              La integración con el SECOP II publica automáticamente los hitos y actas de recibo aprobadas por la interventoría al portal único estatal.
            </span>
          </div>
        </div>

        {/* Environmental Parameter Controls (Card 3) */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-3">
            <span className="material-symbols-outlined text-green-600 text-lg">carbon</span>
            Parámetros y Factores de Emisión (PAGA)
          </h4>
          
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Factor Emisión Diesel (ton CO2 / hora maquinaria)</label>
              <input 
                type="number" 
                step="0.01"
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono-numbers focus:ring-1 focus:ring-primary focus:outline-none"
                value={carbonFactor}
                onChange={(e) => setCarbonFactor(e.target.value)}
              />
              <span className="text-[9px] text-slate-400 mt-1 block">Estándar recomendado: 0.08 (representa maquinaria pesada promedio de excavación).</span>
            </div>
          </div>
        </div>

        {/* Save button and Notification area */}
        <div className="flex flex-col justify-end gap-4 p-6 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="flex items-center gap-3">
            <button 
              type="submit" 
              className="bg-[#00236f] text-white font-bold text-xs px-6 py-3 rounded transition-transform active:scale-95 duration-100 flex items-center gap-1.5 shadow-sm ml-auto"
            >
              <Save size={14} />
              Guardar Configuración
            </button>
          </div>
          {savedMsg && (
            <div className="bg-green-50 border border-green-200 rounded p-3 text-[11px] text-green-700 font-bold flex items-center gap-1.5 shadow-sm animate-pulse mt-2">
              <CheckCircle size={14} />
              {savedMsg}
            </div>
          )}
        </div>

      </form>

      {/* Front Colors Customization (Full-Width Card) */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-4">
          <div>
            <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-lg">palette</span>
              Personalización de Colores de Frentes de Obra
            </h4>
            <p className="text-slate-400 text-[10px] mt-1">
              Asigna un color específico a cada frente de obra para distinguirlos en el mapa consolidado. Los cambios se guardan automáticamente.
            </p>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <input
              type="text"
              placeholder="Buscar frente, CIV o eje..."
              className="bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none min-w-[200px]"
              value={frentesSearch}
              onChange={(e) => setFrentesSearch(e.target.value)}
            />
            
            <button
              type="button"
              onClick={handleResetColors}
              className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold text-xs px-3 py-1.5 rounded transition-all flex items-center gap-1 shadow-sm"
            >
              <span className="material-symbols-outlined text-xs">restart_alt</span>
              Restablecer
            </button>
          </div>
        </div>

        {colorSavedMsg && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold rounded px-4 py-2 mb-4 animate-pulse flex items-center gap-2">
            <span className="material-symbols-outlined text-base">check_circle</span>
            {colorSavedMsg}
          </div>
        )}

        <div className="max-h-[400px] overflow-y-auto border border-slate-200 rounded divide-y divide-slate-100">
          {filteredFrentes.length > 0 ? (
            filteredFrentes.map((f) => {
              const isMallaVial = f.id.startsWith('f_mv');
              const defaultColor = isMallaVial ? '#1e3a8a' : '#d97706';
              const currentColor = frenteColors[f.id] || defaultColor;

              return (
                <div key={f.id} className="p-4 hover:bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
                  <div className="flex items-center gap-3">
                    {/* Active color preview indicator */}
                    <div 
                      className="w-5 h-5 rounded-full border border-slate-200 shadow-sm shrink-0" 
                      style={{ backgroundColor: currentColor }} 
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[10px] text-white bg-slate-500 px-1.5 py-0.5 rounded">
                          Fr. {f.frente}
                        </span>
                        <span className="font-bold font-mono text-xs text-primary bg-primary/5 px-2 py-0.5 rounded">
                          CIV {f.civ}
                        </span>
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                          {isMallaVial ? 'Vial' : 'Espacio'}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-700 mt-1">
                        {f.eje} ({f.desde} - {f.hasta})
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      {COLOR_PRESETS.map((preset) => {
                        const isSelected = currentColor.toLowerCase() === preset.value.toLowerCase();
                        return (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => handleSelectColor(f.id, preset.value)}
                            className={`w-6 h-6 rounded-full border flex items-center justify-center transition-transform hover:scale-110 active:scale-90 ${
                              isSelected ? 'border-slate-800 ring-2 ring-slate-400 ring-offset-1' : 'border-slate-200'
                            }`}
                            style={{ backgroundColor: preset.value }}
                            title={preset.name}
                          >
                            {isSelected && (
                              <span className="material-symbols-outlined text-[12px] text-white font-bold">check</span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Color Input */}
                    <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Personalizado</label>
                      <input
                        type="color"
                        value={currentColor}
                        onChange={(e) => handleSelectColor(f.id, e.target.value)}
                        className="w-8 h-8 rounded border border-slate-250 cursor-pointer p-0 bg-transparent"
                      />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              No se encontraron frentes con los criterios de búsqueda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
