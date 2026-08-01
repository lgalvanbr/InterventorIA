# 🧠 PROJECT_BRAIN.md - CEREBRO DE PROYECTO INTERVENTORIA USAQUÉN

Este archivo actúa como la memoria central permanente y documentación de arquitectura del proyecto **InterventorIA (FrentesObra - Usaquén)**.

---

## 📐 1. Información General y Estructura del Proyecto

- **Objetivo**: Plataforma de supervisión, seguimiento georreferenciado e interventoría de frentes de obra en la localidad de Usaquén, Bogotá.
- **Contratos Supervisados**:
  1. **Malla Vial**: Contrato `IDU-Usaquén-2026-CONS` (22 Tramos / Frentes: `f_mv_1` a `f_mv_22`).
  2. **Espacio Público**: Contrato `IDU-ESP-2026-042` (20 Tramos / Frentes: `f_ep_1` a `f_ep_20`).
  3. **Consolidado General**: Vista integrada con 42 Frentes activos georreferenciados en Leaflet Map.

---

## ☁️ 2. Arquitectura de Base de Datos y Supabase

- **Supabase URL**: `https://rjghsenbsrprbajhkwxr.supabase.co`
- **Supabase MCP Server URL**: `https://mcp.supabase.com/mcp?project_ref=rjghsenbsrprbajhkwxr&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching`
- **Tabla Principal de Base de Datos**: `weekly_reports`
  - Fila Clave: `id = 'main_reports'`
  - Columna `data`: Array JSON con todos los informes semanales de control de interventoría (Semanas `semana_20` a `semana_36`, cubriendo hasta Septiembre de 2026 con los 42 frentes de obra clonados y calibrados).
- **Bucket de Almacenamiento**: `frentes-fotos`
- **Servidor Backend Vercel Serverless (`api/index.js`)**:
  - `GET /api/weekly-reports`: Consulta la tabla `weekly_reports` en Supabase y devuelve el historial completo.
  - `POST /api/weekly-reports`: Sincroniza y guarda los cambios de informes semanales y fotografías en Supabase PostgreSQL.
  - `POST /api/upload-photo`: Procesa subidas de fotos enviando los buffers/Data URIs a Supabase con la cabecera `x-upsert: true`.
  - `GET /uploads/*`: Sirve imágenes locales estáticas o consulta el bucket de Supabase Storage en caso de requerir una imagen remota.
  - `GET /api/health`: Verifica el estado de conexión con la API de Supabase.

---

## 🖼️ 3. Estructura de Datos de Fotografías e Histórico

Cada fotografía de control de obra posee la siguiente estructura JSON unificada:

```json
{
  "id": "photo_1784007473645",
  "url": "data:image/jpeg;base64,...",
  "caption": "Avance de excavación y nivelación de subrasante",
  "date": "2026-07-13",
  "category": "avance",
  "semana": 29
}
```

### Reglas de Sincronización Fotográfica y Nomenclatura Estándar:
1. **Nomenclatura Estandarizada de Archivos**: Cada fotografía guardada en Supabase Storage y Base de Datos adopta la siguiente estructura codificada:
   `FECHA_YYYY-MM-DD_SEMXX_FRENTE_f_mv_Y_TIMESTAMP_HASH.ext`
   - Ejemplo: `FECHA_2026-07-25_SEM31_FRENTE_f_mv_1_143059_a1b2.jpeg`
2. **Unificación de Propiedades**: Los arreglos de fotos dentro de cada frente responden tanto a `fotos` (usado en reportes semanales) como a `photos` (usado en el estado de proyectos).
3. **Extractor Cronológico (`Dashboard.jsx`)**: La función `getFrentePhotos(frenteId)` consolida y deduplica todas las imágenes de todas las semanas registradas en Supabase.
4. **Carga Inicial Autocorregida (`App.jsx`)**: La función `mergeSupabasePhotosIntoProjects` toma los reportes descargados de Supabase al abrir la aplicación y los fusiona automáticamente con el estado local `projects`, garantizando que la Galería y el Detalle del Frente rendericen las fotos sin depender del caché de `localStorage`.

---

## 🗺️ 4. Mapa Georreferenciado y Navegación GPS

- **Componente**: `MapView.jsx`
- **Características**:
  - Marcadores interactivos Leaflet con íconos dinámicos SVG (Azul para Malla Vial, Naranja para Espacio Público, con borde Verde/Amarillo/Rojo según estado).
  - **Integración Google Maps**: Botones con el Logo Oficial Multicolor 4 Colores de Google Maps en popups, barra superior y tarjeta flotante en pantalla completa, abriendo rutas paso a paso hacia las coordenadas GPS (`lat`, `lng`).

---

## 📋 5. Guía para Futuras Conversaciones

- **No es necesario volver a explicar la arquitectura**: Este archivo `PROJECT_BRAIN.md` y `.agents/AGENTS.md` conservan la memoria completa del sistema.
- **Flujo de Trabajo del Desarrollador / Agente**:
  1. Revisar siempre los archivos antes de modificar.
  2. Ejecutar `npm run build` tras realizar cualquier cambio para verificar que la compilación de producción continúe en `0 errores`.
  3. Enviar los commits a `origin main` para mantener Vercel y Supabase sincronizados en producción.

---

## 👷 6. Reglas del Portal de Inspectores (`InspectorPortal.jsx`)

1. **Filtrado Diario Estricto de Fotografías**:
   - Por solicitud explícita, el registro fotográfico en el Portal de Inspectores muestra por defecto únicamente las fotos tomadas en la fecha seleccionada (`activeDateStr`).
   - Las fotos pertenecientes a semanas anteriores quedan estrictamente aisladas comparando `p.semana === currentReport.numero_semana`.
2. **Preservación e Historial de Bitácoras Diarias**:
   - La función `saveCurrentFrenteDataSilently` no sobreescribe notas existentes con textos vacíos `""` al cambiar de día o frente.
   - El Paso 3 incluye un listado histórico visual (`📜 Notas Registradas en este Frente`) con la cronología de todas las notas del informe semanal.
3. **Persistencia de la Semana Seleccionada**:
   - La semana elegida por el inspector se almacena en `localStorage.setItem('geo_interventoria_inspector_report_id', String(newReportId))` y no se restablece automáticamente al re-renderizar.
