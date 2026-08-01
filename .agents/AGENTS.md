# AGENTS.md - InterventorIA Core Workspace Rules & Guidelines

## 📌 Contexto General del Proyecto
- **Nombre**: InterventorIA - Sistema Integrado de Interventoría y Control Georreferenciado para Frentes de Obra en Usaquén.
- **Contratos**:
  - `IDU-Usaquén-2026-CONS`: Malla Vial (22 frentes de obra `f_mv_1` a `f_mv_22`).
  - `IDU-ESP-2026-042`: Espacio Público (20 frentes de obra `f_ep_1` a `f_ep_20`).
  - Total: **42 Frentes de Obra Georreferenciados**.

## ☁️ Integración con Supabase y Vercel Serverless
- **Instancia de Supabase**: `https://rjghsenbsrprbajhkwxr.supabase.co`
- **Tabla Principal de Base de Datos**: `weekly_reports` (Fila clave `id = 'main_reports'`)
- **Bucket de Almacenamiento**: `frentes-fotos`
- **API Serverless Vercel**: `api/index.js` (Manejador HTTP para `/api/weekly-reports`, `/api/health`, `/api/upload-photo`, `/uploads/*`).

## 🚨 Reglas Críticas de Persistencia e Histórico Fotografías
1. **Doble Propiedad (`photos` y `fotos`)**: Los componentes deben mapear y consultar ambas propiedades (`fotos` y `photos`) en arreglos de frentes para evitar desincronizaciones entre el estado de proyectos y reportes semanales.
2. **Sincronización Automática Supabase**: Toda foto agregada en cualquier vista (Galería, Detalle de Frente o Portal de Inspector) se guarda automáticamente tanto en el objeto del frente como en el informe semanal activo de `weeklyReports` y se publica inmediatamente a la API de Supabase.
3. **Resiliencia de Carga de Fotografías**: Cuando se reciban respuestas de la API de Supabase (`Status: 200 OK`), las fotos se incrustan como Data URI / URLs públicas de Supabase para evitar errores de 404 en el servidor de producción.
4. **Carga en Inicio (`App.jsx`)**: Al iniciar la aplicación, `fetch('/api/weekly-reports')` descarga el conjunto de datos más reciente de Supabase y fusiona automáticamente todas las imágenes de la nube directamente dentro del estado `projects` (`mergeSupabasePhotosIntoProjects`), garantizando que la Galería de Fotos y el Detalle del Frente muestren las fotos sin depender del caché antiguo del navegador.

## 🛠️ Tecnologías y Construcción
- **Frontend**: React 18, Vite, Vanilla CSS con variables CSS modernas, Leaflet / React-Leaflet para mapas interactivos, Lucide React / Material Symbols para iconografía.
- **Backend / DB**: Node.js Serverless Function (`api/index.js`), Supabase REST API & PostgreSQL, Supabase Storage.
- **Comandos de Verificación Obligatorios Pre-Producción**:
  - **Pruebas Automatizadas**: Ejecutar `npm run test` (verifica sanidad de base de datos, 42 frentes, fotos, bitácoras y límite de tamaño de localStorage).
  - **Compilación**: Ejecutar `npm run build` y comprobar que finalice con 0 errores.
  - **REGLA OBLIGATORIA**: NUNCA desplegar a producción sin haber ejecutado y superado `npm run test` al 100%.
