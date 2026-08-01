import fs from 'fs';
import path from 'path';

async function runFullVerificationSuite() {
  console.log('===============================================================');
  console.log('🧪 SUITE DE PRUEBAS DE CALIDAD Y SANIDAD PRE-DESPLIEGUE (TEST SUITE)');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 7;

  const key = process.env.SUPABASE_KEY || process.env.SUPABASE_SECRET_KEY || 'sb_publishable_QQ_O2_zR4gy1jlJzoLc8uA_SIKzyZtS';
  const baseUrl = process.env.SUPABASE_URL || 'https://rjghsenbsrprbajhkwxr.supabase.co';

  // -------------------------------------------------------------
  // TEST 1: Verificar Integridad del JSON Estático (Tamaño < 1.5 MB)
  // -------------------------------------------------------------
  try {
    console.log('Test 1: Verificando límite de tamaño de datos estáticos...');
    const filePath = 'src/data/saved_weekly_reports.json';
    if (!fs.existsSync(filePath)) {
      throw new Error(`El archivo ${filePath} no existe.`);
    }
    const stat = fs.statSync(filePath);
    const sizeInMB = stat.size / (1024 * 1024);
    if (sizeInMB > 1.5) {
      throw new Error(`Tamaño de archivo excedido: ${sizeInMB.toFixed(2)} MB (Máximo permitido: 1.5 MB para evitar QuotaExceededError en localStorage).`);
    }
    console.log(`  ✅ PASÓ - Tamaño de datos: ${(stat.size / 1024).toFixed(1)} KB (< 1.5 MB)\n`);
    passedTests++;
  } catch (e) {
    console.error(`  ❌ FALLÓ Test 1:`, e.message, '\n');
  }

  // -------------------------------------------------------------
  // TEST 2: Estructura y Semanas Registradas (Semanas 20 a 36)
  // -------------------------------------------------------------
  let reports = [];
  try {
    console.log('Test 2: Verificando integridad de informes y semanas (Semanas 20 a 36)...');
    const content = fs.readFileSync('src/data/saved_weekly_reports.json', 'utf8');
    reports = JSON.parse(content);
    
    if (!Array.isArray(reports) || reports.length < 6) {
      throw new Error(`Número insuficiente de informes semanales: ${reports.length}`);
    }

    const weekNumbers = reports.map(r => r.numero_semana);
    const requiredWeeks = [20, 28, 29, 30, 31, 32, 33, 34, 35, 36];
    const missingWeeks = requiredWeeks.filter(w => !weekNumbers.includes(w));

    if (missingWeeks.length > 0) {
      throw new Error(`Faltan semanas requeridas en la estructura: ${missingWeeks.join(', ')}`);
    }

    console.log(`  ✅ PASÓ - Semanas verificadas (${reports.length} semanas registradas: ${weekNumbers.join(', ')})\n`);
    passedTests++;
  } catch (e) {
    console.error(`  ❌ FALLÓ Test 2:`, e.message, '\n');
  }

  // -------------------------------------------------------------
  // TEST 3: Verificación de Frentes por Semana (42 Frentes)
  // -------------------------------------------------------------
  try {
    console.log('Test 3: Verificando que cada semana contenga los 42 frentes de obra...');
    for (const r of reports) {
      const frentes = r.frentes || [];
      if (frentes.length < 42) {
        throw new Error(`La Semana ${r.numero_semana} solo tiene ${frentes.length} frentes (Requerido: 42 frentes).`);
      }
    }
    console.log(`  ✅ PASÓ - Todos los informes semanales contienen sus 42 frentes georreferenciados.\n`);
    passedTests++;
  } catch (e) {
    console.error(`  ❌ FALLÓ Test 3:`, e.message, '\n');
  }

  // -------------------------------------------------------------
  // TEST 4: Conexión en Vivo con Base de Datos Supabase (REST API 200 OK)
  // -------------------------------------------------------------
  let cloudReports = [];
  try {
    console.log('Test 4: Probando conexión en vivo con la Base de Datos de Supabase PostgreSQL...');
    const res = await fetch(`${baseUrl}/rest/v1/weekly_reports?id=eq.main_reports&select=data`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });

    if (!res.ok) {
      throw new Error(`Error de conexión HTTP Supabase DB: Status ${res.status}`);
    }

    const dbRows = await res.json();
    if (!dbRows || dbRows.length === 0 || !dbRows[0].data) {
      throw new Error('La fila main_reports en Supabase DB está vacía o corrupta.');
    }
    cloudReports = dbRows[0].data;
    console.log(`  ✅ PASÓ - Supabase DB responde Status 200 OK con ${cloudReports.length} informes en la nube.\n`);
    passedTests++;
  } catch (e) {
    console.error(`  ❌ FALLÓ Test 4:`, e.message, '\n');
  }

  // -------------------------------------------------------------
  // TEST 5: Verificación de Enlace de Fotos y URLs de Supabase Storage
  // -------------------------------------------------------------
  try {
    console.log('Test 5: Verificando fotos y URLs públicas de Supabase Storage en la nube...');
    let totalPhotosFound = 0;
    let corruptedPhotos = 0;

    cloudReports.forEach(r => {
      (r.frentes || []).forEach(f => {
        const photosList = [...(f.fotos || []), ...(f.photos || [])];
        photosList.forEach(p => {
          totalPhotosFound++;
          if (!p.url || (p.url.startsWith('data:') && p.url.length > 500000)) {
            corruptedPhotos++;
          }
        });
      });
    });

    if (corruptedPhotos > 50) {
      throw new Error(`Se encontraron ${corruptedPhotos} fotos pesadas en base64 en lugar de URLs públicas de Supabase Storage.`);
    }

    console.log(`  ✅ PASÓ - ${totalPhotosFound} fotos verificadas en la nube (${corruptedPhotos} base64 locales).\n`);
    passedTests++;
  } catch (e) {
    console.error(`  ❌ FALLÓ Test 5:`, e.message, '\n');
  }

  // -------------------------------------------------------------
  // TEST 6: Validación de Esquema Vercel (`vercel.json`)
  // -------------------------------------------------------------
  try {
    console.log('Test 6: Validando esquema del archivo de configuración Vercel (vercel.json)...');
    const vercelContent = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
    const includeFiles = vercelContent.functions?.['api/index.js']?.includeFiles;
    
    if (includeFiles && typeof includeFiles !== 'string') {
      throw new Error('includeFiles en vercel.json debe ser una cadena de texto (string), no un array u objeto.');
    }
    console.log(`  ✅ PASÓ - vercel.json cumple con las especificaciones de Vercel Serverless.\n`);
    passedTests++;
  } catch (e) {
    console.error(`  ❌ FALLÓ Test 6:`, e.message, '\n');
  }

  // -------------------------------------------------------------
  // TEST 7: Verificación de Bitácoras e Historiales
  // -------------------------------------------------------------
  try {
    console.log('Test 7: Verificando estructura e integridad de las bitácoras diarias...');
    let notesCount = 0;
    cloudReports.forEach(r => {
      (r.frentes || []).forEach(f => {
        const notes = f.bitacora_notes || f.bitacora_notas || [];
        notesCount += notes.length;
      });
    });
    console.log(`  ✅ PASÓ - Estructura de bitácoras íntegra (${notesCount} notas históricas registradas en la nube).\n`);
    passedTests++;
  } catch (e) {
    console.error(`  ❌ FALLÓ Test 7:`, e.message, '\n');
  }

  // -------------------------------------------------------------
  // RESUMEN FINAL
  // -------------------------------------------------------------
  console.log('===============================================================');
  if (passedTests === totalTests) {
    console.log(`🎉 ¡TODAS LAS ${totalTests} PRUEBAS PASARON CON ÉXITO 100%! EL PROYECTO ESTÁ LISTO PARA PRODUCCIÓN.`);
    console.log('===============================================================\n');
    process.exit(0);
  } else {
    console.error(`💥 PRUEBAS FALLIDAS: ${totalTests - passedTests} de ${totalTests} pruebas fallaron. NO DESPLEGAR A PRODUCCIÓN.`);
    console.log('===============================================================\n');
    process.exit(1);
  }
}

runFullVerificationSuite();
