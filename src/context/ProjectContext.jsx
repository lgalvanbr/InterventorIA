import { createContext, useContext } from 'react';

// Configuración del proyecto activo (marca, contratos, frentes, calendario)
export const ProjectContext = createContext(null);
export const useProject = () => useContext(ProjectContext);
