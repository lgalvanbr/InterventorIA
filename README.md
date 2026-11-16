# CivicSupervise 🚧 - Portal de Interventoría de Obras (Usaquén)

**CivicSupervise** es un panel de control interactivo de interventoría y supervisión técnica, administrativa, financiera, legal y ambiental para el monitoreo de frentes de obra civil en la localidad de Usaquén (Bogotá, Colombia).

Desarrollada con **React + Vite** y estilizada mediante **Tailwind CSS**, esta aplicación web permite realizar el seguimiento detallado de contratos de infraestructura pública y privada, asegurando el cumplimiento de normativas locales y ofreciendo un mapa interactivo para localizar frentes de obra.

---

## 🟢 INICIO RÁPIDO

La app está publicada en **Vercel** y guarda los datos en **Supabase**; no hace falta encender nada en un computador.

| Qué | Enlace |
|-----|--------|
| Aplicación | https://interventor-ia.vercel.app |
| Portal de inspectores (celular) | https://interventor-ia.vercel.app/?mode=inspector |
| Estado de la conexión con Supabase | https://interventor-ia.vercel.app/api/health |

Cada `push` a `main` en GitHub despliega automáticamente una versión nueva.

### Desarrollo local
```bash
npm install
npm run dev
```
Abre http://localhost:5173. La API (`/api/*`) es la misma que en Vercel: sin la variable `SUPABASE_KEY` trabaja con el archivo local `src/data/saved_weekly_reports.json`; con `SUPABASE_KEY` usa la base real.

Antes de publicar: `npm run build` y `npm test`.

### Datos
- Tabla `weekly_reports` en Supabase: **una fila por semana** (`id = semana_<N>`). Cada guardado envía solo los cambios y se aplica sobre la versión más reciente, con reintento si otro dispositivo guardó al mismo tiempo.
- La fila `main_reports` (todas las semanas en una sola fila) es el formato anterior y se conserva como respaldo; se migró automáticamente a filas por semana.

---

## 🚀 Requisitos Previos

Antes de ejecutar el proyecto, asegúrate de tener instalado en tu sistema:

*   **Node.js**: Versión 18.0 o superior (se recomienda la versión LTS). Puedes descargarlo desde [nodejs.org](https://nodejs.org/).
*   **npm**: Gestor de paquetes de Node (se instala automáticamente con Node.js).

---

## 🛠️ Instalación y Configuración

Sigue estos pasos para poner en marcha el proyecto en tu entorno local:

### 1. Clonar el repositorio
Abre una terminal y clona el repositorio del proyecto:
```bash
git clone <url-del-repositorio>
cd FrentesObra
```
*(Si ya tienes el proyecto de forma local, simplemente abre la carpeta en tu terminal).*

### 2. Instalar dependencias
Descarga e instala todos los paquetes necesarios definidos en el archivo [package.json](file:///c:/Users/LuisPc/OneDrive%20-%20Universidad%20de%20los%20Andes/Documentos/2026-2/Usaquen/FrentesObra/package.json):
```bash
npm install
```

---

## ⚡ Ejecución del Proyecto

El proyecto utiliza **Vite** para ofrecer un entorno de desarrollo ultra rápido con Hot Module Replacement (HMR).

### 🖥️ Entorno de Desarrollo
Para iniciar el servidor de desarrollo local, ejecuta:
```bash
npm run dev
```
Una vez ejecutado, abre tu navegador web en la dirección indicada en la consola (por defecto: `http://localhost:5173`).

### 📦 Compilación para Producción
Para generar una versión optimizada y lista para producción, ejecuta:
```bash
npm run build
```
Los archivos optimizados se generarán en la carpeta `dist/`.

### 🔍 Previsualizar Compilación de Producción
Para probar localmente la versión compilada de producción, ejecuta:
```bash
npm run preview
```

### 🧹 Análisis de Código (Linter)
El proyecto cuenta con **Oxlint** para un análisis estático de código extremadamente rápido. Para ejecutarlo:
```bash
npm run lint
```

---

## 🌟 Características Principales

*   **Tablero de Control Dinámico:** Visualización del estado del contrato actual, avances físicos vs. financieros, presupuestos, retrasos y frentes activos.
*   **Mapa Interactivo:** Integración con **Leaflet** para geolocalizar de manera precisa cada uno de los frentes de obra sobre el mapa de Usaquén.
*   **Detalle de Frentes de Obra:** Fichas técnicas detalladas por cada frente con su porcentaje de avance, residente de obra, número de obreros, y maquinaria activa.
*   **Listas de Chequeo de Cumplimiento (Normativa Colombiana):** Seguimiento estructurado a las obligaciones:
    *   **Técnicas** (Ensayos de materiales, planos)
    *   **Financieras** (Actas de medición, amortización del anticipo)
    *   **Administrativas** (Registro de maquinaria, bitácora de obra)
    *   **Legales** (Pólizas, seguridad social del personal)
    *   **Ambientales** (Plan de Manejo Ambiental, disposición de escombros)
    *   **SST** (Seguridad y Salud en el Trabajo: EPPs, señalización, ARL)
*   **Galería Fotográfica:** Bitácora fotográfica de avances con clasificación por frente de obra.
*   **Generador de Reportes:** Exportación de informes de interventoría semanales/mensuales listos para descargar.
*   **Configuración de Fuentes de Datos:** Panel para configurar URLs de APIs externas, capas WMS de mapas y bases de datos.

---

## 📁 Estructura del Proyecto

*   [`/src/components`](file:///c:/Users/LuisPc/OneDrive%20-%20Universidad%20de%20los%20Andes/Documentos/2026-2/Usaquen/FrentesObra/src/components): Contiene los componentes React de cada sección.
    *   [`Dashboard.jsx`](file:///c:/Users/LuisPc/OneDrive%20-%20Universidad%20de%20los%20Andes/Documentos/2026-2/Usaquen/FrentesObra/src/components/Dashboard.jsx): Resumen general y métricas del contrato.
    *   [`MapView.jsx`](file:///c:/Users/LuisPc/OneDrive%20-%20Universidad%20de%20los%20Andes/Documentos/2026-2/Usaquen/FrentesObra/src/components/MapView.jsx): Mapa de frentes de obra basado en Leaflet.
    *   [`ProjectDetail.jsx`](file:///c:/Users/LuisPc/OneDrive%20-%20Universidad%20de%20los%20Andes/Documentos/2026-2/Usaquen/FrentesObra/src/components/ProjectDetail.jsx): Vista al detalle de frentes individuales y gestión directa de estado.
    *   [`ComplianceTabs.jsx`](file:///c:/Users/LuisPc/OneDrive%20-%20Universidad%20de%20los%20Andes/Documentos/2026-2/Usaquen/FrentesObra/src/components/ComplianceTabs.jsx): Módulos de cumplimiento de interventoría.
    *   [`PhotoGallery.jsx`](file:///c:/Users/LuisPc/OneDrive%20-%20Universidad%20de%20los%20Andes/Documentos/2026-2/Usaquen/FrentesObra/src/components/PhotoGallery.jsx): Gestión visual de evidencias físicas.
    *   [`ReportsView.jsx`](file:///c:/Users/LuisPc/OneDrive%20-%20Universidad%20de%20los%20Andes/Documentos/2026-2/Usaquen/FrentesObra/src/components/ReportsView.jsx): Generador de actas e informes.
    *   [`ConfigView.jsx`](file:///c:/Users/LuisPc/OneDrive%20-%20Universidad%20de%20los%20Andes/Documentos/2026-2/Usaquen/FrentesObra/src/components/ConfigView.jsx): Configuración técnica de conexiones y datos.
*   [`/src/App.jsx`](file:///c:/Users/LuisPc/OneDrive%20-%20Universidad%20de%20los%20Andes/Documentos/2026-2/Usaquen/FrentesObra/src/App.jsx): Componente principal y gestor del estado global del aplicativo.
*   [`/DOCUMENTACION`](file:///c:/Users/LuisPc/OneDrive%20-%20Universidad%20de%20los%20Andes/Documentos/2026-2/Usaquen/FrentesObra/DOCUMENTACION): Formatos y plantillas oficiales de interventoría (Minuta, Informe de supervisión, actas, cuenta de cobro).

---

## 🛠️ Tecnologías Usadas

*   [React](https://react.dev/) - Biblioteca de interfaz de usuario.
*   [Vite](https://vite.dev/) - Entorno y empaquetador de desarrollo rápido.
*   [Tailwind CSS](https://tailwindcss.com/) - Framework de utilidades CSS.
*   [Leaflet.js](https://leafletjs.com/) - Biblioteca de mapas interactivos.
*   [Lucide React](https://lucide.dev/) - Set de iconos vectoriales limpios y modernos.
*   [Oxlint](https://oxc.rs/) - Linter ultrarrápido escrito en Rust.
