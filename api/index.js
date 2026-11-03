import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rjghsenbsrprbajhkwxr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

import crypto from 'crypto';
import { applyChanges, legacyArrayToChanges, normalizeReports } from '../src/data/reportsMerge.js';

// In-memory fallback database (solo desarrollo local sin SUPABASE_KEY)
let memoryReports = null;
const memoryUploadedFiles = {}; // stores base64/buffers in memory to mock download

const supabaseHeaders = () => ({
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`
});

// Lee las semanas desde Supabase. Lanza error si Supabase no responde:
// nunca se debe confundir "Supabase caído" con "no hay datos".
async function getReportsFromSupabase() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/weekly_reports?id=eq.main_reports&select=data`, {
    headers: supabaseHeaders(),
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) {
    throw new Error(`Supabase respondió HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const rows = await res.json();
  return rows && rows.length > 0 && Array.isArray(rows[0].data) ? rows[0].data : [];
}

async function saveReportsToSupabase(reportsData) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/weekly_reports`, {
    method: 'POST',
    headers: {
      ...supabaseHeaders(),
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify({
      id: 'main_reports',
      data: reportsData
    }),
    signal: AbortSignal.timeout(20000)
  });
  if (!res.ok) {
    throw new Error(`Supabase rechazó el guardado HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

// Fuente de verdad: Supabase en producción; archivo semilla solo en local sin credenciales.
async function loadReports() {
  if (!SUPABASE_KEY) {
    if (memoryReports === null) memoryReports = getInitialReports();
    return normalizeReports(memoryReports);
  }
  return normalizeReports(await getReportsFromSupabase());
}

async function persistReports(reports) {
  if (!SUPABASE_KEY) {
    memoryReports = reports;
    try {
      const filePath = path.join(process.cwd(), 'src/data/saved_weekly_reports.json');
      fs.writeFileSync(filePath, JSON.stringify(reports, null, 2), 'utf8');
    } catch (diskErr) {
      console.warn("Disk write failed:", diskErr.message);
    }
    return;
  }
  await saveReportsToSupabase(reports);
}

async function uploadPhotoToSupabase(semana, frenteId, fileName, base64Data, bucketName = 'frentes-fotos') {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Supabase credentials (SUPABASE_URL/SUPABASE_KEY) are missing in environment variables.");
  }

  try {
    let base64Clean = base64Data;
    let contentType = 'image/jpeg';

    if (base64Data.includes(';base64,')) {
      const parts = base64Data.split(';base64,');
      const mimeMatch = parts[0].match(/data:(image\/[A-Za-z-+\/]+)/);
      if (mimeMatch) {
        contentType = mimeMatch[1];
      }
      base64Clean = parts[1];
    }

    const buffer = Buffer.from(base64Clean, 'base64');
    
    const filePath = `semana_${semana}/frente_${frenteId}/${fileName}`;
    const url = `${SUPABASE_URL}/storage/v1/object/${bucketName}/${filePath}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY,
        'Content-Type': contentType,
        'x-upsert': 'true'
      },
      body: buffer
    });

    if (!response.ok) {
      let errMsg = `HTTP ${response.status}`;
      try {
        const err = await response.json();
        errMsg = err.message || JSON.stringify(err);
      } catch (jsonErr) {}
      throw new Error(`Supabase Storage returned error: ${errMsg}`);
    }

    return `${SUPABASE_URL}/storage/v1/object/public/${bucketName}/${filePath}`;
  } catch (e) {
    console.error("Failed to upload photo to Supabase:", e);
    throw e;
  }
}

async function uploadDesignToSupabase(civId, fileName, base64Data, bucketName = 'frentes-fotos') {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Supabase credentials are missing");
  }
  
  let base64Clean = base64Data;
  if (base64Data.includes(';base64,')) {
    base64Clean = base64Data.split(';base64,')[1];
  }
  
  const buffer = Buffer.from(base64Clean, 'base64');
  const contentType = 'application/pdf';
  
  const filePath = `disenos/design_${civId}.pdf`;
  const url = `${SUPABASE_URL}/storage/v1/object/${bucketName}/${filePath}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
      'Content-Type': contentType
    },
    body: buffer
  });

  if (!response.ok) {
    if (response.status === 409) {
      const putResponse = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY,
          'Content-Type': contentType
        },
        body: buffer
      });
      if (!putResponse.ok) {
        throw new Error(`Failed to update design on Supabase: ${putResponse.status}`);
      }
    } else {
      throw new Error(`Failed to upload design: ${response.status}`);
    }
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${bucketName}/${filePath}`;
}

async function getProjectInfoFromSupabase() {
  if (!SUPABASE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/weekly_reports?id=eq.project_info&select=data`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    if (res.ok) {
      const rows = await res.json();
      if (rows && rows.length > 0) {
        return rows[0].data;
      }
    }
  } catch (e) {
    console.error("Failed to fetch project info from Supabase:", e);
  }
  return null;
}

async function saveProjectInfoToSupabase(infoData) {
  if (!SUPABASE_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/weekly_reports`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        id: 'project_info',
        data: infoData
      })
    });
    return res.ok;
  } catch (e) {
    console.error("Failed to save project info to Supabase:", e);
  }
  return false;
}

async function getOverridesFromSupabase() {
  if (!SUPABASE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/weekly_reports?id=eq.design_overrides&select=data`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    if (res.ok) {
      const rows = await res.json();
      if (rows && rows.length > 0) {
        return rows[0].data;
      }
    }
  } catch (e) {
    console.error("Failed to fetch overrides from Supabase:", e);
  }
  return null;
}

async function saveOverridesToSupabase(overridesData) {
  if (!SUPABASE_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/weekly_reports`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        id: 'design_overrides',
        data: overridesData
      })
    });
    return res.ok;
  } catch (e) {
    console.error("Failed to save overrides to Supabase:", e);
  }
  return false;
}

// Recursively list files from Supabase Storage bucket
async function listAllFilesRecursively(prefixes = [], bucketName = 'frentes-fotos', customFolders = []) {
  if (!SUPABASE_KEY) return [];
  const result = [];
  const seenPaths = new Set();

  // Se listan las carpetas semana_N pedidas; las subcarpetas de frente se descubren solas.
  const queue = [...prefixes, ...customFolders];
  
  const processedPrefixes = new Set();

  while (queue.length > 0) {
    const currentPrefix = queue.shift();
    if (!currentPrefix || processedPrefixes.has(currentPrefix)) continue;
    processedPrefixes.add(currentPrefix);

    try {
      const listRes = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucketName}`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prefix: currentPrefix,
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' }
        })
      });

      if (listRes.ok) {
        const items = await listRes.json();
        if (Array.isArray(items)) {
          for (const item of items) {
            const fullPath = currentPrefix ? `${currentPrefix}/${item.name}` : item.name;
            if (seenPaths.has(fullPath)) continue;
            seenPaths.add(fullPath);

            // In Supabase Storage, folders either have id: null, or lack metadata
            if (item.id === null || !item.metadata) {
              queue.push(fullPath);
            } else {
              result.push({
                name: item.name,
                fullPath,
                id: item.id,
                created_at: item.created_at,
                updated_at: item.updated_at
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn("Storage list error for prefix:", currentPrefix, e);
    }
  }

  return result;
}

// Sync photos found in Supabase Storage into the weekly_reports structure
async function syncStoragePhotosIntoReports(reports, scannedFiles = [], customFiles = []) {
  if (!Array.isArray(reports) || reports.length === 0) return reports;

  const allFiles = [...scannedFiles, ...customFiles];

  if (allFiles.length === 0) return reports;

  let hasChanges = false;
  const updatedReports = reports.map(report => {
    const semNum = report.numero_semana;
    const matchingWeekFiles = allFiles.filter(f => 
      // Separador obligatorio: "semana_4" no debe coincidir con "semana_44/..."
      f.fullPath.startsWith(`semana_${semNum}/`) || f.fullPath.includes(`_SEM${semNum}_`)
    );

    if (matchingWeekFiles.length === 0) return report;

    const newFrentes = (report.frentes || []).map(frente => {
      const frenteFiles = matchingWeekFiles.filter(file => 
        file.fullPath.includes(`/frente_${frente.id}/`) || 
        file.fullPath.includes(`_FRENTE_${frente.id}_`)
      );

      if (frenteFiles.length === 0) return frente;

      const currentMap = new Map();
      [...(frente.fotos || []), ...(frente.photos || [])].forEach(p => {
        const key = p.url || p.id;
        if (key) currentMap.set(key, p);
      });

      let addedCount = 0;
      frenteFiles.forEach(file => {
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/frentes-fotos/${file.fullPath}`;
        if (!currentMap.has(publicUrl)) {
          const dateMatch = file.name.match(/FECHA_(\d{4}-\d{2}-\d{2})/);
          const dateStr = dateMatch ? dateMatch[1] : (report.fecha_inicial_corte || '2026-09-09');

          currentMap.set(publicUrl, {
            id: `cloud_${file.name.replace(/\.[^/.]+$/, '')}`,
            url: publicUrl,
            caption: `Avance diario (Frente ${frente.frente || frente.id})`,
            date: dateStr,
            semana: report.numero_semana,
            category: 'avance'
          });
          addedCount++;
        }
      });

      if (addedCount > 0) {
        hasChanges = true;
        const photoList = Array.from(currentMap.values());
        return {
          ...frente,
          fotos: photoList,
          photos: photoList
        };
      }
      return frente;
    });

    return {
      ...report,
      frentes: newFrentes
    };
  });

  if (hasChanges) {
    await persistReports(updatedReports.map(r => ({ ...r, _rev: (r._rev || 1) + 1 })));
  }
  return updatedReports;
}

// Load initial weekly reports from the JSON file
function getInitialReports() {
  try {
    const filePath = path.join(process.cwd(), 'src/data/saved_weekly_reports.json');
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error("Failed to load initial reports from disk:", e);
  }
  return [];
}

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

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = url.pathname;
  const pathParam = url.searchParams.get('path');
  if (pathParam) {
    pathname = '/' + pathParam;
  }

  // GET /api/health -> verifica la conexión real con Supabase
  if (pathname === '/api/health' && req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    if (!SUPABASE_KEY) {
      res.status(200).json({ status: 'local', supabaseConnected: false, supabaseUrl: SUPABASE_URL });
      return;
    }
    try {
      const reports = await getReportsFromSupabase();
      res.status(200).json({
        status: 'ok',
        supabaseConnected: true,
        supabaseUrl: SUPABASE_URL,
        semanas: reports.map(r => r.numero_semana).sort((x, y) => x - y)
      });
    } catch (err) {
      res.status(503).json({ status: 'error', supabaseConnected: false, supabaseUrl: SUPABASE_URL, error: err.message });
    }
    return;
  }

  // GET /uploads/* -> Serve static image from disk or fallback to Supabase Storage
  if (pathname.startsWith('/uploads/') && req.method === 'GET') {
    const relativePath = pathname.replace(/^\//, '');
    const localFilePath = path.join(process.cwd(), relativePath);
    const publicFilePath = path.join(process.cwd(), 'public', relativePath);
    
    const targetFile = fs.existsSync(localFilePath) ? localFilePath : (fs.existsSync(publicFilePath) ? publicFilePath : null);

    if (targetFile && fs.statSync(targetFile).isFile()) {
      const ext = path.extname(targetFile).toLowerCase();
      const MIME_TYPES = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.jfif': 'image/jpeg',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.pdf': 'application/pdf'
      };
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.status(200).send(fs.readFileSync(targetFile));
      return;
    }

    // Fallback: redirigir al bucket público de Supabase (sin pasar los bytes por la función)
    const storagePath = pathname.replace(/^\/uploads\//, '');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.redirect(302, `${SUPABASE_URL}/storage/v1/object/public/frentes-fotos/${storagePath}`);
    return;
  }


  // GET /api/sync-storage-photos?semana=44  or  POST { semanas: [44], folders, files }
  if (pathname === '/api/sync-storage-photos' && (req.method === 'GET' || req.method === 'POST')) {
    try {
      let customFolders = [];
      let customFiles = [];
      let semanas = url.searchParams.getAll('semana').map(Number).filter(Number.isFinite);
      if (req.method === 'POST') {
        const body = await getBody(req);
        if (body && Array.isArray(body.folders)) customFolders = body.folders;
        if (body && Array.isArray(body.files)) customFiles = body.files;
        if (body && Array.isArray(body.semanas)) semanas = body.semanas.map(Number).filter(Number.isFinite);
      }
      const reports = await loadReports();
      // Por defecto solo la semana más reciente, para no recorrer todo el bucket.
      if (semanas.length === 0 && reports.length > 0) {
        semanas = [Math.max(...reports.map(r => Number(r.numero_semana)))];
      }
      const scannedFiles = await listAllFilesRecursively(semanas.map(n => `semana_${n}`), 'frentes-fotos', customFolders);
      const syncedReports = await syncStoragePhotosIntoReports(reports, scannedFiles, customFiles);

      res.status(200).json({
        success: true,
        semanas,
        scannedCount: scannedFiles.length,
        files: scannedFiles.map(f => f.fullPath),
        reportsCount: syncedReports.length
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  // GET /api/weekly-reports -> siempre la versión real de Supabase (con ETag para no re-descargar)
  if (pathname === '/api/weekly-reports' && req.method === 'GET') {
    // no-cache: el navegador puede reutilizar su copia solo tras validar el ETag; la CDN no la guarda.
    res.setHeader('Cache-Control', 'no-cache');
    let reports;
    try {
      reports = await loadReports();
    } catch (err) {
      console.error("No se pudieron leer los informes de Supabase:", err);
      res.status(503).json({ error: 'No hay conexión con la base de datos (Supabase).', detail: err.message });
      return;
    }
    const payload = JSON.stringify(reports);
    const etag = `"${crypto.createHash('sha1').update(payload).digest('base64url')}"`;
    res.setHeader('ETag', etag);
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).send(payload);
    return;
  }

  // POST /api/weekly-reports
  //   Formato nuevo: { changes: [{ semana, isNew, report } | { semana, meta, frentes }] }
  //   Formato antiguo (arreglo completo): solo se agregan semanas que no existen.
  if (pathname === '/api/weekly-reports' && req.method === 'POST') {
    res.setHeader('Cache-Control', 'no-store');
    const body = await getBody(req);
    const isLegacy = Array.isArray(body);
    if (!isLegacy && !(body && Array.isArray(body.changes))) {
      res.status(400).json({ error: 'Formato inválido: se espera { changes: [...] }' });
      return;
    }

    let stored;
    try {
      stored = await loadReports();
    } catch (err) {
      console.error("No se pudieron leer los informes antes de guardar:", err);
      res.status(503).json({ success: false, persisted: false, error: 'No hay conexión con la base de datos (Supabase). No se guardó nada.' });
      return;
    }

    const changes = isLegacy ? legacyArrayToChanges(stored, body) : body.changes;
    if (changes.length === 0) {
      res.status(200).json({ success: true, persisted: true, reports: [], conflicts: [] });
      return;
    }

    const { reports, affected, conflicts } = applyChanges(stored, changes);
    try {
      await persistReports(reports);
    } catch (err) {
      console.error("Fallo al guardar informes en Supabase:", err);
      res.status(502).json({ success: false, persisted: false, error: err.message });
      return;
    }

    res.status(200).json({ success: true, persisted: true, reports: affected, conflicts });
    return;
  }

  // POST /api/upload-design
  if (pathname === '/api/upload-design' && req.method === 'POST') {
    try {
      const body = await getBody(req);
      const { civId, fileName, base64 } = body;

      if (!civId || !fileName || !base64) {
        res.status(400).json({ error: 'Missing parameters' });
        return;
      }

      // Try uploading to Supabase first if credentials are set
      let fileKey = `/uploads/designs/design_${civId}.pdf`;
      let uploadedToCloud = false;
      if (SUPABASE_KEY) {
        try {
          const cloudUrl = await uploadDesignToSupabase(civId, fileName, base64);
          fileKey = cloudUrl;
          uploadedToCloud = true;
        } catch (cloudErr) {
          console.warn("Failed to upload design to Supabase Cloud:", cloudErr);
        }
      }

      let base64Data = base64;
      if (base64.includes(';base64,')) {
        base64Data = base64.split(';base64,')[1];
      }
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Save to memory storage
      memoryUploadedFiles[`/uploads/designs/design_${civId}.pdf`] = {
        buffer,
        contentType: 'application/pdf'
      };

      // Attempt disk write (local development)
      try {
        const absoluteDir = path.join(process.cwd(), 'public/uploads/designs');
        fs.mkdirSync(absoluteDir, { recursive: true });
        fs.writeFileSync(path.join(absoluteDir, `design_${civId}.pdf`), buffer);
      } catch (diskErr) {
        console.warn("Disk write for design PDF failed (expected on Vercel):", diskErr);
      }

      res.status(200).json({ 
        url: fileKey,
        success: true,
        persisted: uploadedToCloud,
        message: uploadedToCloud ? "Design PDF saved to Supabase Cloud Storage." : "Design PDF saved in local memory."
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to process upload' });
    }
    return;
  }

  // GET /api/project-info
  if (pathname === '/api/project-info' && req.method === 'GET') {
    const cloudInfo = await getProjectInfoFromSupabase();
    if (cloudInfo) {
      res.status(200).json(cloudInfo);
      return;
    }
    // Fallback: read from local file if exists
    try {
      const filePath = path.join(process.cwd(), 'src/data/saved_project_info.json');
      if (fs.existsSync(filePath)) {
        res.status(200).json(JSON.parse(fs.readFileSync(filePath, 'utf8')));
        return;
      }
    } catch (e) {}
    res.status(200).json({});
    return;
  }

  // POST /api/project-info
  if (pathname === '/api/project-info' && req.method === 'POST') {
    try {
      const body = await getBody(req);
      const savedToCloud = await saveProjectInfoToSupabase(body);
      
      // Also write to local file for dev
      try {
        const filePath = path.join(process.cwd(), 'src/data/saved_project_info.json');
        fs.writeFileSync(filePath, JSON.stringify(body, null, 2), 'utf8');
      } catch (diskErr) {
        console.warn("Disk write for project info failed:", diskErr);
      }

      res.status(200).json({ success: true, persisted: savedToCloud });
    } catch (e) {
      res.status(500).json({ error: 'Failed to process request' });
    }
    return;
  }

  // GET /api/design-overrides
  if (pathname === '/api/design-overrides' && req.method === 'GET') {
    const cloudOverrides = await getOverridesFromSupabase();
    if (cloudOverrides) {
      res.status(200).json(cloudOverrides);
      return;
    }
    // Fallback: read from local file if exists
    try {
      const filePath = path.join(process.cwd(), 'src/data/saved_design_overrides.json');
      if (fs.existsSync(filePath)) {
        res.status(200).json(JSON.parse(fs.readFileSync(filePath, 'utf8')));
        return;
      }
    } catch (e) {}
    res.status(200).json({});
    return;
  }

  // POST /api/design-overrides
  if (pathname === '/api/design-overrides' && req.method === 'POST') {
    try {
      const body = await getBody(req);
      const savedToCloud = await saveOverridesToSupabase(body);
      
      // Also write to local file for dev
      try {
        const filePath = path.join(process.cwd(), 'src/data/saved_design_overrides.json');
        fs.writeFileSync(filePath, JSON.stringify(body, null, 2), 'utf8');
      } catch (diskErr) {
        console.warn("Disk write for overrides failed:", diskErr);
      }

      res.status(200).json({ success: true, persisted: savedToCloud });
    } catch (e) {
      res.status(500).json({ error: 'Failed to process request' });
    }
    return;
  }

  // POST /api/upload-photo
  if (pathname === '/api/upload-photo' && req.method === 'POST') {
    try {
      const body = await getBody(req);
      const { semana, frenteId, fileName, base64, bucket } = body;

      if (!semana || !frenteId || !fileName || !base64) {
        res.status(400).json({ error: 'Missing parameters' });
        return;
      }

      const matches = base64.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        res.status(400).json({ error: 'Invalid base64 image data' });
        return;
      }

      const buffer = Buffer.from(matches[2], 'base64');
      const fileKey = `/uploads/semana_${semana}/frente_${frenteId}/${fileName}`;

      // Save to memory storage
      memoryUploadedFiles[fileKey] = {
        buffer,
        contentType: `image/${matches[1]}`
      };

      // Attempt disk write (local development)
      try {
        const absoluteDir = path.join(process.cwd(), `public/uploads/semana_${semana}/frente_${frenteId}`);
        fs.mkdirSync(absoluteDir, { recursive: true });
        fs.writeFileSync(path.join(absoluteDir, fileName), buffer);
      } catch (diskErr) {
        console.warn("Disk write for photo failed (expected on Vercel):", diskErr);
      }

      // Try uploading to Supabase Storage via backend credentials
      let responseUrl = null;
      let supabaseError = null;
      try {
        const bucketName = bucket || 'frentes-fotos';
        responseUrl = await uploadPhotoToSupabase(semana, frenteId, fileName, base64, bucketName);
      } catch (supErr) {
        console.error("Backend error uploading to Supabase:", supErr);
        supabaseError = supErr.message || String(supErr);
      }

      // Check if we are in production (Vercel) and fail if cloud upload failed
      const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
      if (isProduction && !responseUrl) {
        res.status(500).json({ 
          error: 'Failed to upload photo to Supabase Storage', 
          details: supabaseError || 'Supabase credentials missing or invalid' 
        });
        return;
      }

      // Local fallback
      if (!responseUrl) {
        responseUrl = fileKey;
      }

      res.status(200).json({ 
        url: responseUrl,
        message: responseUrl.startsWith('http') ? "Photo uploaded to Supabase Storage." : "Photo uploaded to memory fallback."
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to process photo upload' });
    }
    return;
  }

  // Fallback endpoint handler for serving memory-uploaded files in serverless environment
  if (pathname.startsWith('/uploads/') && req.method === 'GET') {
    const cleanPath = pathname.replace(/^\//, '');
    const memoryFile = memoryUploadedFiles[pathname];
    if (memoryFile) {
      res.setHeader('Content-Type', memoryFile.contentType);
      res.status(200).send(memoryFile.buffer);
      return;
    }
    
    // If not in memory, try to serve from public disk (if compiled or locally available)
    try {
      const filePath = path.join(process.cwd(), 'public', cleanPath);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const MIME_TYPES = {
          '.pdf': 'application/pdf',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.svg': 'image/svg+xml'
        };
        res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
        res.status(200).send(fs.readFileSync(filePath));
        return;
      }
    } catch (e) {}

    res.status(404).send('404 Not Found');
    return;
  }

  res.status(404).json({ error: 'Endpoint not found' });
}
