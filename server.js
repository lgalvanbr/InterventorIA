import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 5173;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf'
};

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

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // GET /api/weekly-reports
  if (pathname === '/api/weekly-reports' && req.method === 'GET') {
    const filePath = path.join(__dirname, 'src/data/saved_weekly_reports.json');
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(fs.readFileSync(filePath));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([]));
    }
    return;
  }

  // POST /api/weekly-reports
  if (pathname === '/api/weekly-reports' && req.method === 'POST') {
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

  // POST /api/upload-design
  if (pathname === '/api/upload-design' && req.method === 'POST') {
    try {
      const body = await getBody(req);
      const { civId, fileName, base64 } = body;

      if (!civId || !fileName || !base64) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing parameters' }));
        return;
      }

      let base64Data = base64;
      if (base64.includes(';base64,')) {
        base64Data = base64.split(';base64,')[1];
      }
      const buffer = Buffer.from(base64Data, 'base64');
      const relativeDir = 'public/uploads/designs';
      const absoluteDir = path.join(__dirname, relativeDir);

      fs.mkdirSync(absoluteDir, { recursive: true });
      fs.writeFileSync(path.join(absoluteDir, `design_${civId}.pdf`), buffer);

      const publicUrl = `/uploads/designs/design_${civId}.pdf`;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ url: publicUrl }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to write file to disk' }));
    }
    return;
  }

  // POST /api/upload-photo
  if (pathname === '/api/upload-photo' && req.method === 'POST') {
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

      const publicUrl = `/uploads/semana_${semana}/frente_${frenteId}/${fileName}`;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ url: publicUrl }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to write file to disk' }));
    }
    return;
  }

  // Serve static files from 'dist' directory (production build)
  let filePath = '';
  const normalizedPath = pathname.replace(/^\//, '');
  if (pathname.startsWith('/uploads/')) {
    filePath = path.join(__dirname, 'public', normalizedPath);
  } else {
    filePath = path.join(__dirname, 'dist', normalizedPath);
  }
  console.log(`[REQUEST] method: ${req.method} | url: ${req.url} | filePath: ${filePath} | exists: ${fs.existsSync(filePath)}`);

  // If path is root or folder, serve index.html
  if (pathname === '/' || !path.extname(filePath)) {
    filePath = path.join(__dirname, 'dist', 'index.html');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(fs.readFileSync(filePath));
  } else {
    // If not found, check if it's an uploaded file or asset that should 404
    if (pathname.startsWith('/uploads/') || pathname.startsWith('/frentes/') || path.extname(pathname)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    } else {
      // Otherwise, fallback to index.html for React Router SPA
      const fallbackPath = path.join(__dirname, 'dist', 'index.html');
      if (fs.existsSync(fallbackPath)) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(fs.readFileSync(fallbackPath));
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      }
    }
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Production server running at http://0.0.0.0:${PORT}`);
});
