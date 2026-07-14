# CivicSupervise 🚧 - Portal de Interventoría de Obras (Usaquén)

**CivicSupervise** es un panel de control interactivo de interventoría y supervisión técnica, administrativa, financiera, legal y ambiental para el monitoreo de frentes de obra civil en la localidad de Usaquén (Bogotá, Colombia).

Desarrollada con **React + Vite** y estilizada mediante **Tailwind CSS**, esta aplicación web permite realizar el seguimiento detallado de contratos de infraestructura pública y privada, asegurando el cumplimiento de normativas locales y ofreciendo un mapa interactivo para localizar frentes de obra.

---

## 🟢 INICIO RÁPIDO — Paso a Paso para Arrancar Mañana

> Sigue estos pasos en orden cada vez que quieras prender el proyecto en tu computador.

### Paso 1 — Abrir una terminal en la carpeta del proyecto
Abre **PowerShell** o la terminal de VS Code y navega a la carpeta del proyecto:
```
cd "C:\Users\LuisPc\OneDrive - Universidad de los Andes\Documentos\2026-2\Usaquen\FrentesObra"
```

---

### Paso 2 — Compilar la aplicación (Solo si hiciste cambios en el código)
Si modificaste algún archivo fuente, vuelve a compilar para que los cambios queden en producción:
```bash
npm run build
```
> ⚠️ Si no hiciste cambios, **puedes saltarte este paso**. La carpeta `dist/` ya tiene la última versión compilada.

---

### Paso 3 — Iniciar el servidor de producción
Este comando enciende el servidor que sirve la app a tu red local y permite la subida de fotos y guardado de reportes en tu computador:
```bash
node server.js
```
✅ Verás el mensaje: `Production server running at http://0.0.0.0:5173`

> Deja esta terminal **abierta** mientras uses la app. Si la cierras, el servidor se apaga.

---

### Paso 4 — Crear el túnel público para acceso desde el celular
Abre una **segunda terminal** (nueva, no la del paso anterior) y ejecuta:
```bash
ssh -T -o StrictHostKeyChecking=no -R 80:127.0.0.1:5173 nokey@localhost.run
```
Espera unos segundos y verás una línea así:
```
xxxxxxxxxxxxxxxx.lhr.life tunneled with tls termination, https://xxxxxxxxxxxxxxxx.lhr.life
```
📱 **Copia ese enlace `https://...lhr.life`** y ábrelo en el navegador de tu celular o compártelo con los inspectores de obra.

> ⚠️ La URL cambia cada vez que reinicias el túnel. Debes copiarla y reenviarla a los inspectores cuando arranques.

---

### Paso 5 — Compartir el Portal de Inspectores
Para que los inspectores suban sus fotos y bitácoras diarias, el enlace del portal es:
```
https://xxxxxxxxxxxxxxxx.lhr.life/?mode=inspector
```
*(Reemplaza `xxxxxxxxxxxxxxxx.lhr.life` con el dominio que te generó el Paso 4)*

También puedes hacer clic en **"Portal Inspectores"** en el menú lateral izquierdo de la app en tu PC para copiar el enlace automáticamente.

---

### 🔴 Para apagar todo al final del día
1. Ve a la terminal del servidor (`node server.js`) y presiona `Ctrl + C`.
2. Ve a la terminal del túnel SSH y presiona `Ctrl + C`.

---

### ✅ Resumen de los 3 comandos clave

| Paso | Acción | Comando |
|------|--------|---------|
| (Opcional) | Recompilar si hiciste cambios | `npm run build` |
| 1 | Encender servidor de producción | `node server.js` |
| 2 | Abrir túnel público para el celular | `ssh -T -o StrictHostKeyChecking=no -R 80:127.0.0.1:5173 nokey@localhost.run` |

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
