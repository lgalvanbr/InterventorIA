import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, /api/* lo atiende el mismo handler que en Vercel (api/index.js).
// Sin SUPABASE_KEY usa el archivo local src/data/saved_weekly_reports.json.
function vercelApiInDev() {
  return {
    name: 'vercel-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) return next();
        try {
          const { default: handler } = await server.ssrLoadModule('/api/index.js');
          const vercelRes = Object.assign(res, {
            status(code) { res.statusCode = code; return vercelRes; },
            json(body) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(body));
            },
            send(body) {
              res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
            },
            redirect(code, url) {
              res.statusCode = code;
              res.setHeader('Location', url);
              res.end();
            }
          });
          await handler(req, vercelRes);
        } catch (err) {
          console.error('Error en /api (dev):', err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true,
    port: 5173
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('leaflet')) {
              return 'vendor-leaflet';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            return 'vendor-utils';
          }
        }
      }
    }
  },
  plugins: [react(), vercelApiInDev()],
});
