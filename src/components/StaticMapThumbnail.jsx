import React, { useEffect, useRef, useState } from 'react';

// Caché en memoria para no repetir peticiones de mosaicos compartidos entre los 42 frentes
const tileCache = new Map();

/**
 * Carga un mosaico de mapa con fuentes de alta calidad sin marcas de agua (Esri World Street Map -> OpenStreetMap -> Esri Topo)
 * Nota: Esri utiliza la convención tile/{z}/{y}/{x}
 */
function fetchTileImage(zoom, x, y) {
  const sources = [
    `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${zoom}/${y}/${x}`,
    `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`,
    `https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/${zoom}/${y}/${x}`
  ];

  const cacheKey = `${zoom}_${x}_${y}`;
  if (tileCache.has(cacheKey)) {
    return Promise.resolve(tileCache.get(cacheKey));
  }

  return new Promise((resolve) => {
    let sourceIndex = 0;

    function tryNext() {
      if (sourceIndex >= sources.length) {
        // Lienzo neutro si fallan las fuentes remotas
        const fallbackCanvas = document.createElement('canvas');
        fallbackCanvas.width = 256;
        fallbackCanvas.height = 256;
        const ctx = fallbackCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(0, 0, 256, 256);
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 1;
          ctx.strokeRect(0, 0, 256, 256);
        }
        resolve(fallbackCanvas);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        tileCache.set(cacheKey, img);
        resolve(img);
      };
      img.onerror = () => {
        sourceIndex++;
        tryNext();
      };
      img.src = sources[sourceIndex];
    }

    tryNext();
  });
}

/**
 * Componente para renderizar mapas estáticos centrados con precisión milimétrica
 * en coordenadas geográficas (lat, lng), horneando el pin para impresión PDF y pantalla.
 */
export default function StaticMapThumbnail({
  lat,
  lng,
  zoom = 15,
  width = 320,
  height = 140,
  className = '',
  alt = 'Ubicación georreferenciada del frente'
}) {
  const canvasRef = useRef(null);
  const [dataUrl, setDataUrl] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  const isValidCoords = !isNaN(parsedLat) && !isNaN(parsedLng) && parsedLat !== 0 && parsedLng !== 0;

  useEffect(() => {
    if (!isValidCoords) return;

    let isMounted = true;

    async function drawMap() {
      const n = Math.pow(2, zoom);
      const worldX = ((parsedLng + 180) / 360) * n * 256;
      const latRad = (parsedLat * Math.PI) / 180;
      const worldY = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n * 256;

      const startX = worldX - width / 2;
      const startY = worldY - height / 2;

      const minTileX = Math.floor(startX / 256);
      const maxTileX = Math.floor((startX + width) / 256);
      const minTileY = Math.floor(startY / 256);
      const maxTileY = Math.floor((startY + height) / 256);

      const tilePromises = [];
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        for (let tx = minTileX; tx <= maxTileX; tx++) {
          tilePromises.push(
            fetchTileImage(zoom, tx, ty).then((img) => ({
              img,
              destX: tx * 256 - startX,
              destY: ty * 256 - startY
            }))
          );
        }
      }

      const loadedTiles = await Promise.all(tilePromises);
      if (!isMounted) return;

      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Fondo suave previo
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);

      // 2. Dibujar mosaicos del mapa
      for (const { img, destX, destY } of loadedTiles) {
        if (img) {
          ctx.drawImage(img, destX, destY, 256, 256);
        }
      }

      // 3. Dibujar pin georreferenciado en el centro exacto (width/2, height/2)
      const centerX = width / 2;
      const centerY = height / 2;

      // Anillo de pulso/radar exterior
      ctx.beginPath();
      ctx.arc(centerX, centerY, 16, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
      ctx.fill();

      // Sombra del pin
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + 1, 8, 4, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.fill();

      // Cuerpo del pin tipo gota
      ctx.save();
      ctx.translate(centerX, centerY);
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-6, -8, -10, -14, -10, -19);
      ctx.bezierCurveTo(-10, -25, -5.5, -29, 0, -29);
      ctx.bezierCurveTo(5.5, -29, 10, -25, 10, -19);
      ctx.bezierCurveTo(10, -14, 6, -8, 0, 0);
      ctx.closePath();

      ctx.fillStyle = '#dc2626'; // Rojo vibrante
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Punto blanco interior del pin
      ctx.beginPath();
      ctx.arc(0, -19, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();

      // 4. Convertir a Data URL para inmutabilidad y máxima compatibilidad de impresión
      try {
        const url = canvas.toDataURL('image/png');
        setDataUrl(url);
      } catch {
        // En caso de restricción de canvas
      }
      setHasLoaded(true);
    }

    drawMap();

    return () => {
      isMounted = false;
    };
  }, [parsedLat, parsedLng, zoom, width, height, isValidCoords]);

  if (!isValidCoords) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 text-[9px] gap-1 p-2 text-center rounded ${className}`}>
        <span className="material-symbols-outlined text-base text-slate-300">location_off</span>
        <span>Coordenadas pendientes</span>
      </div>
    );
  }

  return (
    <div className={`w-full h-full relative overflow-hidden bg-slate-100 rounded ${className}`}>
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={alt}
          className="w-full h-full object-cover block"
          loading="eager"
        />
      ) : (
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={`w-full h-full object-cover block ${hasLoaded ? 'opacity-100' : 'opacity-80 animate-pulse'}`}
        />
      )}
    </div>
  );
}
