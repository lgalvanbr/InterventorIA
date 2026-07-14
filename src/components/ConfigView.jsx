import React, { useState, useEffect } from 'react';
import { Save, CheckCircle } from 'lucide-react';

export default function ConfigView() {
  const [dbHost, setDbHost] = useState('192.168.10.45');
  const [dbName, setDbName] = useState('db_interventor_ia');
  const [dbUser, setDbUser] = useState('admin_interventoria');
  const [secopKey, setSecopKey] = useState('secop_api_prod_k39f8s9d9f');
  const [secopSync, setSecopSync] = useState('daily');
  const [carbonFactor, setCarbonFactor] = useState('0.08'); // ton CO2 per hour of diesel machinery
  
  const [savedMsg, setSavedMsg] = useState('');

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
    </div>
  );
}
