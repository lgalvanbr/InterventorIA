import { lazy } from 'react';

/**
 * lazyWithRetry: Envuelve React.lazy para recuperarse automáticamente de
 * errores de módulos dinámicos desactualizados (stale chunk errors) tras un nuevo despliegue.
 *
 * Cuando se publica una nueva versión en Vercel, los nombres de archivo de los chunks
 * cambian de hash. Si un usuario tiene la pestaña abierta y navega a una nueva sección,
 * la petición del chunk anterior devuelve 404 (Failed to fetch dynamically imported module).
 *
 * Esta utilidad intercepta el fallo, refresca la página de forma limpia una sola vez
 * para sincronizar los nuevos assets, evitando pantallas de error para el usuario.
 */
export function lazyWithRetry(componentImport) {
  return lazy(async () => {
    const pageHasBeenRefreshed = JSON.parse(
      window.sessionStorage.getItem('chunk_retry_refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('chunk_retry_refreshed', 'false');
      return component;
    } catch (error) {
      console.warn('InterventorIA: Error cargando módulo dinámico (posible nuevo despliegue en Vercel):', error);
      
      const isChunkError = 
        error?.message?.includes('Failed to fetch dynamically imported module') ||
        error?.message?.includes('error loading dynamically imported module') ||
        error?.message?.includes('Importing a module script failed') ||
        error?.name === 'ChunkLoadError';

      if (!pageHasBeenRefreshed && isChunkError) {
        window.sessionStorage.setItem('chunk_retry_refreshed', 'true');
        // Cache-busting reload para garantizar que el navegador tome el nuevo index.html
        window.location.href = window.location.pathname + (window.location.search ? window.location.search + '&' : '?') + 'v=' + Date.now();
        return new Promise(() => {}); // Suspender hasta que la página recargue
      }

      throw error;
    }
  });
}

export default lazyWithRetry;
