// Módulo de Historial e Informes Semanales (Línea base y Utilidades)
// Inicia formalmente en la Semana 20 (04 de Abril de 2026 al 10 de Abril de 2026)

export function initializeWeeklyReports(allFrentes) {
  // Semana 20 Baseline
  const baselineFrentes = allFrentes.map(f => {
    // Determine a mock long text for activities/hitos based on status
    let hitosText = '';
    if (f.status === 'al-dia') {
      hitosText = 'Excavación y retiro de material completado. Colocación de material de base granular estabilizada y compactación al 95%.';
    } else if (f.status === 'alerta') {
      hitosText = 'Avance lento por fuertes lluvias. Pendiente entrega de planilla de pago de aportes a seguridad social del personal.';
    } else {
      hitosText = 'Frente temporalmente paralizado a la espera del acta de modificación del diseño estructural para cimentación.';
    }

    return {
      id: f.id,
      frente: f.frente,
      civ: f.civ,
      eje: f.eje,
      desde: f.desde,
      hasta: f.hasta,
      projectName: f.projectName,
      porcentaje_avance_semana: f.progress, // Cumulative progress up to Week 20
      ejecucion_presupuestal_semana: Math.round(f.financialMetrics.executedBudget * 0.1), // Investment of this week (10% of total executed)
      actividades_ejecutadas_hitos: hitosText,
      pmt_estado: f.status === 'al-dia' ? 'Aprobado' : f.status === 'alerta' ? 'En revisión' : 'Suspendido',
      fotos: [],
      bitacora_notas: []
    };
  });

  const reportSemana20 = {
    id_informe: 1,
    numero_semana: 20,
    fecha_inicial_corte: '2026-04-04',
    fecha_final_corte: '2026-04-10',
    estado_informe: 'abierto', // always editable
    malla_vial_programado: 0.38,
    malla_vial_ejecutado: 0.44,
    espacio_publico_programado: 0.03,
    espacio_publico_ejecutado: 0.05,
    avance_meta_porcentaje: 24.5, // (0.44 + 0.05) / 2 = 24.5% general meta
    frentes: baselineFrentes
  };

  return [reportSemana20];
}

export function calculateConsolidatedMetrics(frentesList, currentReport) {
  const mvFrentes = frentesList.filter(f => f.id.startsWith('f_mv'));
  const epFrentes = frentesList.filter(f => f.id.startsWith('f_ep'));

  const mvAvg = mvFrentes.length > 0 
    ? mvFrentes.reduce((acc, f) => acc + (parseFloat(f.porcentaje_avance_semana) || 0), 0) / mvFrentes.length
    : 0;

  const epAvg = epFrentes.length > 0
    ? epFrentes.reduce((acc, f) => acc + (parseFloat(f.porcentaje_avance_semana) || 0), 0) / epFrentes.length
    : 0;

  // Baseline calibration:
  // Week 20 MV average is 60.8%, we want executed to be 44% (0.44). Difference is 16.8.
  // Week 20 EP average is 63.7%, we want executed to be 5% (0.05). Difference is 58.7.
  const mvEjecutado = Math.max(0, Math.min(1, (mvAvg - 16.8) / 100));
  const epEjecutado = Math.max(0, Math.min(1, (epAvg - 58.7) / 100));

  // Programmed values increment slowly or stay as registered
  const mvProgramado = currentReport.malla_vial_programado || 0.40;
  const epProgramado = currentReport.espacio_publico_programado || 0.04;

  return {
    ...currentReport,
    frentes: frentesList,
    malla_vial_ejecutado: parseFloat(mvEjecutado.toFixed(3)),
    espacio_publico_ejecutado: parseFloat(epEjecutado.toFixed(3)),
    malla_vial_programado: parseFloat(parseFloat(mvProgramado).toFixed(3)),
    espacio_publico_programado: parseFloat(parseFloat(epProgramado).toFixed(3)),
    avance_meta_porcentaje: parseFloat(((mvEjecutado + epEjecutado) / 2 * 100).toFixed(1))
  };
}

export function cloneWeeklyReport(prevReport) {
  const nextSemana = prevReport.numero_semana + 1;
  
  // Calculate next dates (7 days later)
  const prevEnd = new Date(prevReport.fecha_final_corte + 'T00:00:00');
  const nextStart = new Date(prevEnd);
  nextStart.setDate(nextStart.getDate() + 1);
  const nextEnd = new Date(nextStart);
  nextEnd.setDate(nextEnd.getDate() + 6);

  const formatDate = (d) => d.toISOString().split('T')[0];

  // Auto increment programmed values
  const nextMvProg = parseFloat((prevReport.malla_vial_programado + 0.02).toFixed(3));
  const nextEpProg = parseFloat((prevReport.espacio_publico_programado + 0.01).toFixed(3));

  // Clone frentes list. Keep structure and all coordinates/metadata but:
  // - activities/hitos are set to empty for the new week
  // - budget of the week starts at 0
  // - photos and bitacoras are reset for new entries
  const clonedFrentes = prevReport.frentes.map(f => ({
    ...f,
    porcentaje_avance_semana: f.porcentaje_avance_semana, // inherits cumulative progress
    ejecucion_presupuestal_semana: 0, // new budget invested in this week starts at 0
    actividades_ejecutadas_hitos: '', // hitos are empty
    fotos: [],
    photos: [],
    bitacora_notas: [],
    bitacora_notes: []
  }));

  const nextReportDraft = {
    id_informe: Date.now(),
    numero_semana: nextSemana,
    fecha_inicial_corte: formatDate(nextStart),
    fecha_final_corte: formatDate(nextEnd),
    estado_informe: 'abierto',
    malla_vial_programado: nextMvProg,
    malla_vial_ejecutado: prevReport.malla_vial_ejecutado,
    espacio_publico_programado: nextEpProg,
    espacio_publico_ejecutado: prevReport.espacio_publico_ejecutado,
    avance_meta_porcentaje: prevReport.avance_meta_porcentaje,
    frentes: clonedFrentes
  };

  return nextReportDraft;
}

export function getReportMonthKey(report) {
  if (!report?.fecha_inicial_corte) return '';
  const [year, month] = report.fecha_inicial_corte.split('-');
  return `${year}-${month}`;
}

export function getReportMonthLabel(monthKey) {
  if (!monthKey) return '';
  const [year, monthStr] = monthKey.split('-');
  const monthIdx = parseInt(monthStr, 10) - 1;
  const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return `${MONTH_NAMES[monthIdx] || ''} ${year}`;
}

export function getAvailableMonths(weeklyReports = []) {
  const monthMap = new Map();
  
  weeklyReports.forEach(r => {
    const key = getReportMonthKey(r);
    if (!key) return;
    if (!monthMap.has(key)) {
      monthMap.set(key, {
        key,
        label: getReportMonthLabel(key),
        reportsCount: 0,
        weekNumbers: []
      });
    }
    const item = monthMap.get(key);
    item.reportsCount += 1;
    item.weekNumbers.push(r.numero_semana);
  });

  return Array.from(monthMap.values()).sort((a, b) => b.key.localeCompare(a.key));
}

export function generateMonthlyBitacoraText(weeklyReports = [], targetMonthKey = null) {
  return generateMonthlyFullOfficialReport(weeklyReports, [], targetMonthKey, 'all', true);
}

import { getDisenoForCiv } from './frentesDisenos';

/**
 * Retorna la información pura y estructurada de los frentes intervenidos en un mes
 * (Ubicación, Diseño de Capas por CIV, Hitos semanales, Bitácoras diarias y Fotos),
 * sin métricas financieras, sin presupuestos y sin porcentajes calculados de avance de proyecto.
 */
export function getMonthlyConsolidatedData(weeklyReports = [], projects = [], targetMonthKey = null, contractFilter = 'all', onlyWithActivity = true) {
  if (!weeklyReports || weeklyReports.length === 0) return null;

  let monthKey = targetMonthKey;
  if (!monthKey) {
    const sortedAll = [...weeklyReports].sort((a, b) => b.numero_semana - a.numero_semana);
    monthKey = getReportMonthKey(sortedAll[0]);
  }

  const monthReports = weeklyReports
    .filter(r => getReportMonthKey(r) === monthKey)
    .sort((a, b) => a.numero_semana - b.numero_semana);

  if (monthReports.length === 0) return null;

  const monthLabel = getReportMonthLabel(monthKey);
  const weekNumbers = monthReports.map(r => r.numero_semana);
  const startDate = monthReports[0].fecha_inicial_corte;
  const endDate = monthReports[monthReports.length - 1].fecha_final_corte;

  const frentesAggMap = new Map();

  monthReports.forEach((rep) => {
    (rep.frentes || []).forEach(wf => {
      const isMv = wf.id.startsWith('f_mv');
      const isEp = wf.id.startsWith('f_ep');

      // Filtro de contrato
      if (contractFilter === 'malla_vial' && !isMv) return;
      if (contractFilter === 'espacio_publico' && !isEp) return;

      if (!frentesAggMap.has(wf.id)) {
        const design = getDisenoForCiv(wf.civ);
        frentesAggMap.set(wf.id, {
          id: wf.id,
          frente: wf.frente || (isMv ? wf.id.replace('f_mv_', '') : (parseInt(wf.id.replace('f_ep_', '')) + 100)),
          civ: wf.civ || 'N/A',
          eje: wf.eje || 'N/A',
          desde: wf.desde || 'N/A',
          hasta: wf.hasta || 'N/A',
          tipo: isMv ? 'Malla Vial' : 'Espacio Público',
          isMv,
          isEp,
          pmtStatusLatest: wf.pmt_estado || 'Aprobado',
          designName: design?.nombre_grupo || design?.alternativa_aprobada || 'Pavimento Flexible',
          designLayers: (design?.paquete_estructural_capas || []).map(l => ({
            nombre: l.nombre,
            espesor_cm: l.espesor_cm,
            label: l.espesor_label || (l.espesor_cm > 0 ? `${l.espesor_cm} cm` : '')
          })),
          weeklyHitos: [],
          allNotes: [],
          allPhotos: []
        });
      }

      const fEntry = frentesAggMap.get(wf.id);

      if (wf.pmt_estado) {
        fEntry.pmtStatusLatest = wf.pmt_estado;
      }

      // Hitos semanales
      if (wf.actividades_ejecutadas_hitos && wf.actividades_ejecutadas_hitos.trim()) {
        const texto = wf.actividades_ejecutadas_hitos.trim();
        const exists = fEntry.weeklyHitos.some(h => h.semana === rep.numero_semana && h.texto === texto);
        if (!exists) {
          fEntry.weeklyHitos.push({
            semana: rep.numero_semana,
            fecha_inicial: rep.fecha_inicial_corte,
            fecha_final: rep.fecha_final_corte,
            texto
          });
        }
      }

      // Bitácoras diarias registradas
      const notes = (wf.bitacora_notas || wf.bitacora_notes || []).filter(n => n.note && n.note.trim());
      notes.forEach(n => {
        const exists = fEntry.allNotes.some(x => (x.id && n.id && x.id === n.id) || (x.date === n.date && x.note === n.note));
        if (!exists) {
          fEntry.allNotes.push({
            semana: rep.numero_semana,
            date: n.date || rep.fecha_inicial_corte,
            note: n.note
          });
        }
      });

      // Fotografías con fecha y anotaciones
      const photos = (wf.fotos || wf.photos || []).filter(p => p.url);
      photos.forEach(p => {
        const exists = fEntry.allPhotos.some(x => (x.id && p.id && x.id === p.id) || x.url === p.url);
        if (!exists) {
          fEntry.allPhotos.push({
            ...p,
            semana: p.semana || rep.numero_semana,
            date: p.date || rep.fecha_inicial_corte,
            caption: p.caption || ''
          });
        }
      });
    });
  });

  let frentesList = Array.from(frentesAggMap.values());

  if (onlyWithActivity) {
    frentesList = frentesList.filter(f => f.weeklyHitos.length > 0 || f.allNotes.length > 0 || f.allPhotos.length > 0);
  }

  const totalNotasMes = frentesList.reduce((acc, f) => acc + f.allNotes.length, 0);
  const totalFotosMes = frentesList.reduce((acc, f) => acc + f.allPhotos.length, 0);
  const totalHitosMes = frentesList.reduce((acc, f) => acc + f.weeklyHitos.length, 0);
  const frentesConActividad = frentesList.filter(f => f.weeklyHitos.length > 0 || f.allNotes.length > 0 || f.allPhotos.length > 0).length;

  return {
    monthKey,
    monthLabel,
    startDate,
    endDate,
    weekNumbers,
    reportsCount: monthReports.length,
    frentes: frentesList,
    metrics: {
      totalNotasMes,
      totalFotosMes,
      totalHitosMes,
      frentesTotal: frentesList.length,
      frentesConActividad
    }
  };
}

/**
 * Genera el documento de texto consolidado token-optimizado (sin caracteres decorativos, sin URLs innecesarias).
 */
export function generateMonthlyFullOfficialReport(weeklyReports = [], projects = [], targetMonthKey = null, contractFilter = 'all', onlyWithActivity = true) {
  const data = getMonthlyConsolidatedData(weeklyReports, projects, targetMonthKey, contractFilter, onlyWithActivity);
  if (!data || data.frentes.length === 0) return 'No hay registros de frentes en el mes seleccionado.';

  let doc = `[MES: ${data.monthLabel.toUpperCase()} | CORTE: ${data.startDate} AL ${data.endDate} | SEMANAS: S${data.weekNumbers.join(', S')}]\n\n`;

  data.frentes.forEach(f => {
    doc += `# FRENTE ${f.frente} (CIV ${f.civ}) | ${f.tipo.toUpperCase()} | ${f.eje} (${f.desde} a ${f.hasta}) | PMT: ${f.pmtStatusLatest}\n`;

    // Diseño de capas condensado en 1 sola línea para ahorrar tokens
    if (f.designLayers && f.designLayers.length > 0) {
      const layersStr = f.designLayers.map(l => `${l.nombre}${l.label ? ` (${l.label})` : ''}`).join(' / ');
      doc += `- Diseño: ${layersStr}\n`;
    }

    // Hitos semanales
    if (f.weeklyHitos.length > 0) {
      doc += `- Hitos:\n`;
      f.weeklyHitos.forEach(h => {
        doc += `  * S${h.semana}: ${h.texto}\n`;
      });
    }

    // Bitácoras
    if (f.allNotes.length > 0) {
      doc += `- Bitácora:\n`;
      f.allNotes.forEach(n => {
        doc += `  * ${n.date}: ${n.note}\n`;
      });
    }

    // Fotos (solo fecha y pie de foto, sin URLs largas)
    if (f.allPhotos.length > 0) {
      doc += `- Fotos:\n`;
      f.allPhotos.forEach((ph, pIdx) => {
        doc += `  * ${ph.date || 'Mes'}: ${ph.caption || `Foto ${pIdx + 1}`}\n`;
      });
    }

    doc += `\n`;
  });

  return doc.trim();
}

/**
 * Genera el prompt estructurado y ultra-compacto para IA.
 */
export function generateMonthlyAIPrompt(weeklyReports = [], projects = [], targetMonthKey = null, contractFilter = 'all', onlyWithActivity = true) {
  const data = getMonthlyConsolidatedData(weeklyReports, projects, targetMonthKey, contractFilter, onlyWithActivity);
  if (!data) return '';

  const pureReport = generateMonthlyFullOfficialReport(weeklyReports, projects, targetMonthKey, contractFilter, onlyWithActivity);

  return `Actúa como Ingeniero Senior de Interventoría IDU. Redacta el informe mensual de obra de Usaquén para ${data.monthLabel} estructurado frente por frente en tono técnico y directivo a partir de estos datos:

${pureReport}`;
}

/**
 * Genera la matriz de datos reales en formato TSV (Tab Separated Values) para Excel.
 */
export function generateMonthlyExcelTSV(weeklyReports = [], projects = [], targetMonthKey = null, contractFilter = 'all', onlyWithActivity = true) {
  const data = getMonthlyConsolidatedData(weeklyReports, projects, targetMonthKey, contractFilter, onlyWithActivity);
  if (!data) return '';

  const headers = [
    'No. Frente',
    'Tipo',
    'CIV',
    'Eje Vial',
    'Desde',
    'Hasta',
    'Estado PMT',
    'Diseño Pavimento',
    'Hitos y Actividades del Mes',
    'Notas de Bitácora',
    'Anotaciones de Fotos',
    'Total Fotos'
  ];

  const rows = data.frentes.map(f => {
    const hitosText = f.weeklyHitos.map(h => `[S${h.semana}] ${h.texto}`).join(' | ');
    const notesText = f.allNotes.map(n => `[${n.date}] ${n.note}`).join(' | ');
    const photosText = f.allPhotos.map(p => `[${p.date}] ${p.caption || 'Foto'}`).join(' | ');

    return [
      f.frente,
      f.tipo,
      f.civ,
      `"${f.eje}"`,
      `"${f.desde}"`,
      `"${f.hasta}"`,
      f.pmtStatusLatest,
      `"${f.designName}"`,
      `"${hitosText.replace(/"/g, '""')}"`,
      `"${notesText.replace(/"/g, '""')}"`,
      `"${photosText.replace(/"/g, '""')}"`,
      f.allPhotos.length
    ];
  });

  return [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
}

/**
 * Genera el catálogo de fotos para copiar.
 */
export function generateMonthlyPhotosTSV(weeklyReports = [], targetMonthKey = null, contractFilter = 'all') {
  const data = getMonthlyConsolidatedData(weeklyReports, [], targetMonthKey, contractFilter, false);
  if (!data) return '';

  const headers = ['Semana', 'Fecha', 'No. Frente', 'Tipo', 'CIV', 'Eje Vial', 'Descripción de la Fotografía', 'Enlace URL Supabase Storage'];
  const rows = [];

  data.frentes.forEach(f => {
    f.allPhotos.forEach(ph => {
      rows.push([
        ph.semana || 'Mes',
        ph.date || data.startDate,
        f.frente,
        f.tipo,
        f.civ,
        `"${f.eje}"`,
        `"${(ph.caption || 'Registro de obra').replace(/"/g, '""')}"`,
        ph.url || 'N/A'
      ]);
    });
  });

  return [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
}

/**
 * Copia una sección específica.
 */
export function generateSectionText(weeklyReports = [], projects = [], targetMonthKey = null, sectionKey = 'bitacoras', contractFilter = 'all') {
  const data = getMonthlyConsolidatedData(weeklyReports, projects, targetMonthKey, contractFilter, true);
  if (!data) return '';

  switch (sectionKey) {
    case 'bitacoras':
      return `[BITÁCORAS DE CAMPO - ${data.monthLabel.toUpperCase()}]\n\n` +
        data.frentes
          .filter(f => f.allNotes.length > 0)
          .map(f => `# Frente ${f.frente} (CIV ${f.civ} - ${f.eje}):\n` +
            f.allNotes.map(n => `* ${n.date}: ${n.note}`).join('\n')
          ).join('\n\n');

    case 'hitos':
      return `[HITOS Y ACTIVIDADES - ${data.monthLabel.toUpperCase()}]\n\n` +
        data.frentes
          .filter(f => f.weeklyHitos.length > 0)
          .map(f => `# Frente ${f.frente} (CIV ${f.civ} - ${f.eje}):\n` +
            f.weeklyHitos.map(h => `* S${h.semana}: ${h.texto}`).join('\n')
          ).join('\n\n');

    case 'fotos':
      return `[FOTOS - ${data.monthLabel.toUpperCase()}]\n\n` +
        data.frentes
          .filter(f => f.allPhotos.length > 0)
          .map(f => `# Frente ${f.frente} (CIV ${f.civ} - ${f.eje}):\n` +
            f.allPhotos.map((p, idx) => `* ${p.date || 'Mes'}: ${p.caption || `Foto ${idx + 1}`}`).join('\n')
          ).join('\n\n');

    case 'disenos':
      return `[DISEÑOS DE PAVIMENTO - ${data.monthLabel.toUpperCase()}]\n\n` +
        data.frentes
          .map(f => `# Frente ${f.frente} (CIV ${f.civ} - ${f.eje}): ${f.designLayers.map(l => `${l.nombre} (${l.label})`).join(' / ')}`
          ).join('\n');

    default:
      return generateMonthlyFullOfficialReport(weeklyReports, projects, targetMonthKey, contractFilter, true);
  }
}


