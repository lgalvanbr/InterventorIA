import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

// Import Leaflet icons fixes (default assets path issues in Vite)
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadowUrl from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function MapView({ 
  frentes = [], 
  activeFrenteId = null, 
  onFrenteSelect = () => {}, 
  isAddingMode = false, 
  onLocationSelected = null,
  isUnified = false,
  onResetToUnified = null
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const clickMarkerRef = useRef(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Bogotá coordinate defaults
  const DEFAULT_CENTER = [4.6097, -74.0817];
  const DEFAULT_ZOOM = 12;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create Map
    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true
    });

    // Add Standard OSM tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle click on map when in adding mode
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e) => {
      if (!isAddingMode || !onLocationSelected) return;

      const { lat, lng } = e.latlng;
      
      // Update or create temporary marker
      if (clickMarkerRef.current) {
        clickMarkerRef.current.setLatLng([lat, lng]);
      } else {
        const tempIcon = L.divIcon({
          className: 'custom-temp-marker',
          html: `<div class="marker-pin temp-pin"></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 24]
        });
        
        clickMarkerRef.current = L.marker([lat, lng], { icon: tempIcon }).addTo(map);
      }

      onLocationSelected(lat.toFixed(6), lng.toFixed(6));
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [isAddingMode, onLocationSelected]);

  // Remove temporary marker if adding mode is disabled
  useEffect(() => {
    if (!isAddingMode && clickMarkerRef.current && mapInstanceRef.current) {
      clickMarkerRef.current.remove();
      clickMarkerRef.current = null;
    }
  }, [isAddingMode]);

  // Update Markers when frentes list changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove old markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    if (frentes.length === 0) return;

    // Get custom colors from localStorage
    let customColors = {};
    if (typeof window !== 'undefined') {
      try {
        customColors = JSON.parse(localStorage.getItem('geo_interventoria_frentes_colors') || '{}');
      } catch (e) {
        console.error("Error parsing custom colors:", e);
      }
    }

    const bounds = [];

    // Group frentes by rounded coordinates to detect stacking/overlap
    const coordGroups = {};
    frentes.forEach(f => {
      const lat = parseFloat(f.latitude);
      const lng = parseFloat(f.longitude);
      if (isNaN(lat) || isNaN(lng)) return;
      
      const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
      if (!coordGroups[key]) {
        coordGroups[key] = [];
      }
      coordGroups[key].push(f);
    });

    Object.keys(coordGroups).forEach(key => {
      const group = coordGroups[key];
      const count = group.length;

      group.forEach((f, index) => {
        let lat = parseFloat(f.latitude);
        let lng = parseFloat(f.longitude);
        
        // If multiple frentes share the exact same coordinates, slightly fan them out in a small circle
        if (count > 1) {
          const angle = (index / count) * 2 * Math.PI;
          const offsetRadius = 0.00012; // About 12 meters offset
          lat += Math.cos(angle) * offsetRadius;
          lng += Math.sin(angle) * offsetRadius;
        }

        bounds.push([lat, lng]);

        // Distinguish type (Malla Vial vs Espacio Público)
        const isMallaVial = f.id.includes('mv') || f.name.toLowerCase().includes('vial');
        const typeClass = isMallaVial ? 'type-vial' : 'type-espacio';
        const iconName = isMallaVial ? 'route' : 'park';

        // Distinguish compliance status (Inner Dot)
        let statusClass = 'status-al-dia';
        if (f.status === 'alerta') statusClass = 'status-alerta';
        if (f.status === 'critico') statusClass = 'status-critico';

        // Apply custom color if set
        const customColor = customColors[f.id];
        const pinStyle = customColor ? `background-color: ${customColor} !important;` : '';

        const customIcon = L.divIcon({
          className: 'custom-html-marker',
          html: `
            <div class="marker-pin-wrapper">
              <div class="marker-pin ${typeClass} ${statusClass} ${activeFrenteId === f.id ? 'active-pin' : ''}" style="${pinStyle}">
                <span class="material-symbols-outlined marker-icon" style="font-size: 14px; color: white;">${iconName}</span>
              </div>
              <div class="marker-label">Frente ${f.frente || ''}</div>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 28]
        });

        const marker = L.marker([lat, lng], { icon: customIcon })
          .addTo(map)
          .on('click', () => onFrenteSelect(f.id));

        // Add popup content
        marker.bindPopup(`
          <div style="font-family: 'Inter', sans-serif; color: #1e293b; padding: 4px; min-width: 180px;">
            <span style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: ${isMallaVial ? '#1e3a8a' : '#d97706'}; background-color: ${isMallaVial ? '#eff6ff' : '#fffbeb'}; border: 1px solid ${isMallaVial ? '#bfdbfe' : '#fef3c7'}; padding: 1px 4px; border-radius: 3px;">
              ${isMallaVial ? 'Malla Vial' : 'Espacio Público'}
            </span>
            <h4 style="margin: 6px 0 4px 0; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 700; color: #1e293b;">Frente ${f.frente} - ${f.name}</h4>
            <p style="margin: 0 0 6px 0; font-size: 10px; color: #64748b; line-height: 1.3;">${f.description || 'Sin descripción'}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; border-top: 1px solid #f1f5f9; padding-top: 4px; margin-top: 4px;">
              <span style="font-weight: 600;">Avance: ${f.progress}%</span>
              <span style="text-transform: capitalize; padding: 1px 4px; border-radius: 3px; font-weight: 700; color: white; background-color: ${
                f.status === 'al-dia' ? '#10b981' : f.status === 'alerta' ? '#f59e0b' : '#ef4444'
              };">${f.status === 'al-dia' ? 'Al día' : f.status === 'alerta' ? 'Alerta' : 'Crítico'}</span>
            </div>
          </div>
        `);

        markersRef.current[f.id] = marker;
      });
    });

    // Auto-fit bounds if we have frentes and not currently editing/adding
    if (bounds.length > 0 && !isAddingMode && !activeFrenteId) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [frentes, activeFrenteId, isAddingMode]);

  // Center on active frente
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !activeFrenteId) return;

    const activeFrente = frentes.find(f => f.id === activeFrenteId);
    if (!activeFrente) return;

    const lat = parseFloat(activeFrente.latitude);
    const lng = parseFloat(activeFrente.longitude);
    if (isNaN(lat) || isNaN(lng)) return;

    map.setView([lat, lng], 15, { animate: true });
    
    // Open marker popup
    const marker = markersRef.current[activeFrenteId];
    if (marker) {
      setTimeout(() => marker.openPopup(), 300);
    }
  }, [activeFrenteId, frentes]);

  return (
    <div className={`map-card ${isFullScreen ? 'fullscreen' : ''}`}>
      <div className="map-card-header flex justify-between items-center bg-white border-b border-slate-200 py-3 px-6 z-10">
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.5px' }}>
            Localización Geográfica
          </span>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }} className="text-slate-800">
            {isAddingMode ? 'Modo Posicionamiento' : 'Mapa de Frentes de Obra'}
          </h4>
        </div>
        
        <div className="flex items-center gap-3">
          {isAddingMode && (
            <span style={{ fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }} className="animate-pulse">
              ⚠️ Haz clic para fijar coordenadas
            </span>
          )}
          
          {!isUnified && onResetToUnified && (
            <button 
              type="button"
              onClick={onResetToUnified}
              className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#1e3a8a] font-bold text-xs px-3 py-1.5 rounded flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">map</span>
              Ver Mapa Consolidado
            </button>
          )}
          
          <button 
            type="button"
            onClick={() => {
              setIsFullScreen(!isFullScreen);
              setTimeout(() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.invalidateSize();
                }
              }, 150);
            }}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs px-3 py-1.5 rounded flex items-center gap-1.5 shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">
              {isFullScreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
            {isFullScreen ? 'Salir Pantalla' : 'Pantalla Completa'}
          </button>
        </div>
      </div>
      <div className="map-wrapper">
        <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }}></div>
      </div>
      
      {/* Styles for dynamic pins */}
      <style dangerouslySetInnerHTML={{ __html: `
        .map-card.fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh !important;
          z-index: 99999;
          border-radius: 0 !important;
          border: none !important;
        }
        .marker-pin-wrapper {
          position: relative;
          width: 28px;
          height: 28px;
        }
        .marker-label {
          position: absolute;
          top: -22px;
          left: 50%;
          transform: translateX(-50%);
          background-color: rgba(15, 23, 42, 0.9);
          color: white;
          font-size: 9px;
          font-weight: 800;
          padding: 2px 5px;
          border-radius: 4px;
          white-space: nowrap;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          pointer-events: none;
          z-index: 1001;
          border: 1px solid rgba(255, 255, 255, 0.15);
          font-family: 'Inter', sans-serif;
        }
        .marker-pin {
          width: 28px;
          height: 28px;
          border-radius: 50% 50% 50% 0;
          position: absolute;
          transform: rotate(-45deg);
          left: 50%;
          top: 50%;
          margin: -14px 0 0 -14px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        /* Pin color by Project/Frente Type */
        .marker-pin.type-vial { background-color: #1e3a8a; } /* Supervision Blue for Malla Vial */
        .marker-pin.type-espacio { background-color: #d97706; } /* Terrakotta Orange for Espacio Público */
        
        /* Border color represents compliance status */
        .marker-pin.status-al-dia { border: 2.5px solid #10b981; } /* Green: Compliant */
        .marker-pin.status-alerta { border: 2.5px solid #f59e0b; } /* Yellow: Warning */
        .marker-pin.status-critico { border: 2.5px solid #ef4444; } /* Red: Critical */
        
        .marker-pin .marker-icon {
          color: #ffffff;
          font-size: 13px !important;
          transform: rotate(45deg); /* Counteract parent rotation */
          display: block;
        }
        
        .marker-pin.temp-pin { 
          background-color: #06b6d4; 
          border: 2px solid #ffffff;
          animation: bouncePin 1s infinite alternate;
        }
        .marker-pin.temp-pin::after {
          content: '';
          width: 6px;
          height: 6px;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: #ffffff;
          border-radius: 50%;
        }
        
        .active-pin {
          transform: rotate(-45deg) scale(1.2);
          box-shadow: 0 0 12px rgba(30, 58, 138, 0.4);
          z-index: 1000 !important;
        }
        @keyframes bouncePin {
          from { transform: rotate(-45deg) translateY(0); }
          to { transform: rotate(-45deg) translateY(-6px); }
        }
      `}} />
    </div>
  );
}

