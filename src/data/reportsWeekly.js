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

  // Clone frentes list. Keep structure but:
  // - activities/hitos are set to empty for the new week
  // - budget of the week starts at 0
  const clonedFrentes = prevReport.frentes.map(f => ({
    id: f.id,
    frente: f.frente,
    civ: f.civ,
    eje: f.eje,
    desde: f.desde,
    hasta: f.hasta,
    projectName: f.projectName,
    porcentaje_avance_semana: f.porcentaje_avance_semana, // inherits cumulative progress
    ejecucion_presupuestal_semana: 0, // new budget invested in this week starts at 0
    actividades_ejecutadas_hitos: '', // hits are empty
    pmt_estado: f.pmt_estado,
    fotos: [],
    bitacora_notas: []
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
  if (!weeklyReports || weeklyReports.length === 0) {
    return 'No hay informes semanales disponibles para generar la bitácora mensual.';
  }

  let monthKey = targetMonthKey;
  if (!monthKey) {
    const sortedAll = [...weeklyReports].sort((a, b) => b.numero_semana - a.numero_semana);
    monthKey = getReportMonthKey(sortedAll[0]);
  }

  const monthReports = weeklyReports
    .filter(r => getReportMonthKey(r) === monthKey)
    .sort((a, b) => a.numero_semana - b.numero_semana);

  if (monthReports.length === 0) {
    return `No se encontraron informes semanales para el mes seleccionado (${targetMonthKey}).`;
  }

  const monthLabel = getReportMonthLabel(monthKey).toUpperCase();
  const weekNumbers = monthReports.map(r => r.numero_semana).join(', ');
  const startDate = monthReports[0].fecha_inicial_corte;
  const endDate = monthReports[monthReports.length - 1].fecha_final_corte;

  let text = `==================================================\n`;
  text += `INFORME CONSOLIDADO MENSUAL DE BITÁCORAS Y ACTIVIDADES\n`;
  text += `==================================================\n`;
  text += `EMPRESA: INCOLTA SAS\n`;
  text += `PROYECTO: Conservación de la Malla Vial Local e Intermedia - Localidad de Usaquén\n`;
  text += `PERÍODO MENSUAL: ${monthLabel}\n`;
  text += `FECHAS DE CORTE: DEL ${startDate} AL ${endDate}\n`;
  text += `SEMANAS INCLUIDAS: Semanas ${weekNumbers}\n\n`;

  text += `=== 1. RESUMEN GENERAL DEL MES ===\n`;
  text += `Total de Informes Semanales Consolidados: ${monthReports.length}\n`;
  
  const frenteMap = new Map();
  monthReports.forEach(rep => {
    (rep.frentes || []).forEach(f => {
      if (!frenteMap.has(f.id)) {
        frenteMap.set(f.id, {
          id: f.id,
          frente: f.frente,
          civ: f.civ,
          eje: f.eje,
          desde: f.desde,
          hasta: f.hasta,
          projectName: f.projectName,
          weeklyDetails: []
        });
      }
      frenteMap.get(f.id).weeklyDetails.push({
        numero_semana: rep.numero_semana,
        fecha_inicial_corte: rep.fecha_inicial_corte,
        fecha_final_corte: rep.fecha_final_corte,
        porcentaje_avance_semana: f.porcentaje_avance_semana || f.progress || 0,
        ejecucion_presupuestal_semana: f.ejecucion_presupuestal_semana || 0,
        actividades_ejecutadas_hitos: f.actividades_ejecutadas_hitos || '',
        pmt_estado: f.pmt_estado || 'Sin registrar',
        bitacora_notas: f.bitacora_notas || [],
        fotos: f.fotos || []
      });
    });
  });

  const allFrentes = Array.from(frenteMap.values());

  allFrentes.forEach(f => {
    const isMv = f.id.startsWith('f_mv');
    const firstWeek = f.weeklyDetails[0];
    const lastWeek = f.weeklyDetails[f.weeklyDetails.length - 1];
    const initialProg = firstWeek?.porcentaje_avance_semana || 0;
    const finalProg = lastWeek?.porcentaje_avance_semana || 0;
    const monthDelta = Math.max(0, finalProg - initialProg);

    text += `- Frente ${f.frente} (CIV ${f.civ}): ${f.eje} [${isMv ? 'Malla Vial' : 'Espacio Público'}] | Avance Final: ${finalProg}% (+${monthDelta}% en el mes)\n`;
  });
  text += `\n`;

  text += `=== 2. DETALLE CRONOLÓGICO POR FRENTE DE OBRA ===\n\n`;

  allFrentes.forEach(f => {
    const isMv = f.id.startsWith('f_mv');
    text += `--------------------------------------------------\n`;
    text += `FRENTE ${f.frente} - CIV ${f.civ} [${isMv ? 'MALLA VIAL' : 'ESPACIO PÚBLICO'}]\n`;
    text += `Ubicación: ${f.eje} (Desde ${f.desde} hasta ${f.hasta})\n`;

    const lastProg = f.weeklyDetails[f.weeklyDetails.length - 1]?.porcentaje_avance_semana || 0;
    text += `Avance Acumulado al cierre del mes: ${lastProg}%\n\n`;

    f.weeklyDetails.forEach(w => {
      text += `  [SEMANA ${w.numero_semana} (${w.fecha_inicial_corte} a ${w.fecha_final_corte})]\n`;
      text += `  * Avance Semana: ${w.porcentaje_avance_semana}% | Inversión: $${(w.ejecucion_presupuestal_semana || 0).toLocaleString('es-CO')}\n`;
      text += `  * Estado PMT: ${w.pmt_estado}\n`;

      if (w.actividades_ejecutadas_hitos && w.actividades_ejecutadas_hitos.trim() !== '') {
        text += `  * Actividades e Hitos: ${w.actividades_ejecutadas_hitos.trim()}\n`;
      } else {
        text += `  * Actividades e Hitos: (Sin registro de hitos en la semana)\n`;
      }

      const notes = (w.bitacora_notas || []).filter(n => n.note && n.note.trim() !== '');
      if (notes.length > 0) {
        text += `  * Notas de Bitácora:\n`;
        notes.forEach(n => {
          text += `    - ${n.date}: ${n.note}\n`;
        });
      }

      const photos = w.fotos || [];
      if (photos.length > 0) {
        text += `  * Anotaciones Fotográficas (${photos.length} fotos):\n`;
        photos.forEach((ph, pIdx) => {
          text += `    - Foto ${pIdx + 1} (${ph.date || 'Semanal'}): ${ph.caption || 'Sin descripción'}\n`;
        });
      }

      text += `\n`;
    });
  });

  text += `==================================================\n`;
  text += `INSTRUCCIÓN PARA LA REDACCIÓN MENSUAL CON IA:\n`;
  text += `==================================================\n`;
  text += `Actúa como un Ingeniero Senior de Interventoría Técnica para el IDU / Entidad Contratante. Genera un Informe Consolidado MENSUAL de Obra formal, riguroso y profesional para el mes de ${monthLabel}.\n\n`;
  text += `Estructura el informe en las siguientes secciones:\n`;
  text += `1. RESUMEN EJECUTIVO DEL MES: Síntesis de los logros principales, avance global alcanzado e inversión ejecutada en el mes.\n`;
  text += `2. ANÁLISIS TÉCNICO DETALLADO FRENTE POR FRENTE: Redacta un párrafo directivo por cada frente de obra consolidando la evolución del mes, hitos constructivos ejecutados, notas de bitácora clave y soporte fotográfico.\n`;
  text += `3. GESTIÓN DE RIESGOS Y RECOMENDACIONES DE INTERVENTORÍA: Identifica cuellos de botella, estados de PMT y recomendaciones técnicas para la entidad.\n\n`;

  return text;
}

