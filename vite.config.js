import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getBody(req) {
  return new Promise((resolve) => {
    let chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const data = Buffer.concat(chunks).toString();
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        resolve(data);
      }
    });
  });
}

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true,
    port: 5173
  },
  plugins: [
    react(),
    {
      name: 'local-db-plugin',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          // Endpoint: GET /api/weekly-reports
          if (req.url === '/api/weekly-reports' && req.method === 'GET') {
            const filePath = path.join(__dirname, 'src/data/saved_weekly_reports.json');
            if (fs.existsSync(filePath)) {
              try {
                const data = fs.readFileSync(filePath, 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(data);
              } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to read file' }));
              }
            } else {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify([]));
            }
            return;
          }

          // Endpoint: POST /api/weekly-reports
          if (req.url === '/api/weekly-reports' && req.method === 'POST') {
            try {
              const body = await getBody(req);
              const filePath = path.join(__dirname, 'src/data/saved_weekly_reports.json');
              fs.mkdirSync(path.dirname(filePath), { recursive: true });
              fs.writeFileSync(filePath, JSON.stringify(body, null, 2), 'utf8');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } catch (e) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Failed to write file' }));
            }
            return;
          }

          // Endpoint: POST /api/upload-photo
          if (req.url === '/api/upload-photo' && req.method === 'POST') {
            try {
              const body = await getBody(req);
              const { semana, frenteId, fileName, base64 } = body;

              if (!semana || !frenteId || !fileName || !base64) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing parameters' }));
                return;
              }

              const matches = base64.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
              if (!matches || matches.length !== 3) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid base64 image data' }));
                return;
              }

              const buffer = Buffer.from(matches[2], 'base64');
              const relativeDir = `public/uploads/semana_${semana}/frente_${frenteId}`;
              const absoluteDir = path.join(__dirname, relativeDir);

              fs.mkdirSync(absoluteDir, { recursive: true });
              fs.writeFileSync(path.join(absoluteDir, fileName), buffer);

              // Public URL served statically by Vite
              const publicUrl = `/uploads/semana_${semana}/frente_${frenteId}/${fileName}`;
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ url: publicUrl }));
            } catch (err) {
              console.error("Error saving uploaded image to disk:", err);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Failed to write file to disk' }));
            }
            return;
          }

          next();
        });
      }
    }
  ],
});
