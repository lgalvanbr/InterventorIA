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
    const matches = base64Data.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error("Invalid base64 image data format");
    }

    const contentType = `image/${matches[1]}`;
    const buffer = Buffer.from(matches[2], 'base64');
    const blob = new Blob([buffer], { type: contentType });
    
    const filePath = `semana_${semana}/frente_${frenteId}/${fileName}`;
    const url = `${SUPABASE_URL}/storage/v1/object/${bucketName}/${filePath}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY,
        'Content-Type': contentType
      },
      body: blob
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

  // GET /api/weekly-reports
  if (pathname === '/api/weekly-reports' && req.method === 'GET') {
    // Try Supabase first
    const cloudReports = await getReportsFromSupabase();
    if (cloudReports) {
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
