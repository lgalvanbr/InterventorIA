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
