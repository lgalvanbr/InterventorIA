import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rjghsenbsrprbajhkwxr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// In-memory fallback database for Vercel Serverless (since filesystem is read-only)
let memoryReports = null;
const memoryUploadedFiles = {}; // stores base64/buffers in memory to mock download

async function getReportsFromSupabase() {
  if (!SUPABASE_KEY) {
    console.warn("Supabase key is missing. Skipping fetching from cloud.");
    return null;
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/weekly_reports?id=eq.main_reports&select=data`, {
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
    console.error("Failed to fetch reports from Supabase:", e);
  }
  return null;
}

async function saveReportsToSupabase(reportsData) {
  if (!SUPABASE_KEY) {
    console.warn("Supabase key is missing. Skipping saving to cloud.");
    return false;
  }
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
        id: 'main_reports',
        data: reportsData
      })
    });
    return res.ok;
  } catch (e) {
    console.error("Failed to save reports to Supabase:", e);
  }
  return false;
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
async function listAllFilesRecursively(prefix = 'semana_37', bucketName = 'frentes-fotos', customFolders = []) {
  if (!SUPABASE_KEY) return [];
  const result = [];
  const seenPaths = new Set();
  
  // Known subfolders for semana 37 plus general prefix
  const queue = [
    prefix,
    ...customFolders,
    `${prefix}/frente_f_ep_10`,
    `${prefix}/frente_f_ep_2`,
    `${prefix}/frente_f_ep_20`,
    `${prefix}/frente_f_ep_3`,
    `${prefix}/frente_f_ep_9`,
    `${prefix}/frente_f_mv_1`,
    `${prefix}/frente_f_mv_12`,
    `${prefix}/frente_f_mv_14`,
    `${prefix}/frente_f_mv_18`,
    `${prefix}/frente_f_mv_2`,
    `${prefix}/frente_f_mv_20`,
    `${prefix}/frente_f_mv_8`,
    `${prefix}/frente_f_mv_9`
  ];
  
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
async function syncStoragePhotosIntoReports(reports, customFiles = []) {
  if (!Array.isArray(reports) || reports.length === 0) return reports;

  const scannedFiles = await listAllFilesRecursively('semana_37');
  const allFiles = [...scannedFiles, ...customFiles];

  if (allFiles.length === 0) return reports;

  let hasChanges = false;
  const updatedReports = reports.map(report => {
    const semNum = report.numero_semana;
    const matchingWeekFiles = allFiles.filter(f => 
      f.fullPath.includes(`semana_${semNum}`) || f.fullPath.includes(`SEM${semNum}`)
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
    await saveReportsToSupabase(updatedReports);
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

  // GET /api/health
  if (pathname === '/api/health' && req.method === 'GET') {
    res.status(200).json({
      status: 'ok',
      supabaseConnected: !!SUPABASE_KEY,
      supabaseUrl: SUPABASE_URL
    });
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

    // Fallback: Fetch from Supabase Storage bucket 'frentes-fotos'
    const storagePath = pathname.replace(/^\/uploads\//, '');
    const supabaseCloudUrl = `${SUPABASE_URL}/storage/v1/object/public/frentes-fotos/${storagePath}`;
    
    try {
      const cloudRes = await fetch(supabaseCloudUrl);
      if (cloudRes.ok) {
        const arrayBuf = await cloudRes.arrayBuffer();
        const contentType = cloudRes.headers.get('content-type') || 'image/jpeg';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.status(200).send(Buffer.from(arrayBuf));
        return;
      }
    } catch (e) {
      console.error("Error fetching image from Supabase Storage fallback:", e);
    }

    res.status(404).send('Image Not Found');
    return;
  }

  // GET /api/sync-storage-photos or POST /api/sync-storage-photos
  if (pathname === '/api/sync-storage-photos' && (req.method === 'GET' || req.method === 'POST')) {
    try {
      let customFolders = [];
      let customFiles = [];
      if (req.method === 'POST') {
        const body = await getBody(req);
        if (body && Array.isArray(body.folders)) customFolders = body.folders;
        if (body && Array.isArray(body.files)) customFiles = body.files;
      }
      const scannedFiles = await listAllFilesRecursively('semana_37', 'frentes-fotos', customFolders);
      const cloudReports = (await getReportsFromSupabase()) || getInitialReports();
      const syncedReports = await syncStoragePhotosIntoReports(cloudReports, customFiles);

      res.status(200).json({
        success: true,
        scannedCount: scannedFiles.length,
        files: scannedFiles.map(f => f.fullPath),
        reportsCount: syncedReports.length
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  // GET /api/weekly-reports
  if (pathname === '/api/weekly-reports' && req.method === 'GET') {
    // Try Supabase first
    let cloudReports = await getReportsFromSupabase();
    if (cloudReports) {
      // Automatically sync photos from storage into reports
      try {
        cloudReports = await syncStoragePhotosIntoReports(cloudReports);
      } catch (syncErr) {
        console.warn("Auto-sync storage photos non-fatal error:", syncErr);
      }
      memoryReports = cloudReports;
      res.status(200).json(cloudReports);
      return;
    }

    if (memoryReports === null) {
      memoryReports = getInitialReports();
    }
    res.status(200).json(memoryReports);
    return;
  }

  // POST /api/weekly-reports
  if (pathname === '/api/weekly-reports' && req.method === 'POST') {
    try {
      const body = await getBody(req);
      if (!Array.isArray(body) || body.length === 0) {
        res.status(400).json({ error: "Invalid reports array format" });
        return;
      }
      memoryReports = body; // save to memory

      // 1. Attempt to write to Supabase Storage/Database
      const savedToCloud = await saveReportsToSupabase(body);

      // 2. Attempt to write to disk (will succeed locally, fail on Vercel gracefully)
      try {
        const filePath = path.join(process.cwd(), 'src/data/saved_weekly_reports.json');
        fs.writeFileSync(filePath, JSON.stringify(body, null, 2), 'utf8');
      } catch (diskErr) {
        console.warn("Disk write failed (expected on Vercel read-only filesystem):", diskErr);
      }

      res.status(200).json({ 
        success: true, 
        persisted: savedToCloud, 
        message: savedToCloud ? "Report saved to Supabase Cloud Database." : "Report saved in memory only (fallback)." 
      });
    } catch (e) {
      res.status(500).json({ error: 'Failed to process request' });
    }
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
