// Proyecto activo de la sesión. Se elige con ?p=<id> en la dirección; sin parámetro es el
// proyecto original (Usaquén), así los enlaces que ya tienen los inspectores siguen funcionando.
// Cambiar de proyecto recarga la página, por eso basta leerlo una vez.
import { DEFAULT_PROJECT_ID } from './projectConfig.js';

const readProjectId = () => {
  if (typeof window === 'undefined') return DEFAULT_PROJECT_ID;
  const params = new URLSearchParams(window.location.search);
  const id = (params.get('p') || params.get('proyecto') || '').toLowerCase();
  return /^[a-z0-9-]{3,40}$/.test(id) ? id : DEFAULT_PROJECT_ID;
};

export const CURRENT_PROJECT_ID = readProjectId();
export const isDefaultProject = CURRENT_PROJECT_ID === DEFAULT_PROJECT_ID;

// Claves de localStorage separadas por proyecto (las de Usaquén no cambian)
export const storageKey = (base) => (isDefaultProject ? base : `${base}__${CURRENT_PROJECT_ID}`);

// Rutas de la API con el proyecto activo
export const apiPath = (path) => {
  if (isDefaultProject) return path;
  return `${path}${path.includes('?') ? '&' : '?'}proyecto=${CURRENT_PROJECT_ID}`;
};

// Enlace para compartir una vista del proyecto activo (?mode=inspector, landing, ...)
export const shareUrl = (mode) => {
  const params = new URLSearchParams();
  if (!isDefaultProject) params.set('p', CURRENT_PROJECT_ID);
  if (mode) params.set('mode', mode);
  const query = params.toString();
  return `${window.location.origin}/${query ? `?${query}` : ''}`;
};

export const projectHomeUrl = (projectId) =>
  projectId === DEFAULT_PROJECT_ID ? '/' : `/?p=${encodeURIComponent(projectId)}`;
