// Proyecto 1: Usaquén (INCOLTA S.A.S.). Datos que antes estaban fijos en App.jsx.
// Sus semanas se guardan en las filas semana_<N> (formato original), por compatibilidad.

// Frentes de Malla Vial: 22 del contrato + 4 calzadas de la adición (301-304)
const MALLA_VIAL_FRENTES_RAW = [
  { civ: '1002332', eje: 'KR 7F', desde: 'AC 161', hasta: 'CL 161A', type: 'Local', area: 335.4, lat: '4.736779', lng: '-74.025494', status: 'al-dia', progress: 23, plannedProgress: 11, supervisor: 'Ing. Carolina Rojas', totalBudget: 313155084, executedBudget: 37578610, description: 'Tramo: AC 161 hasta CL 161A - Área: 335.4 m² - Malla: Local | Acta inicio: 18/06/2026 | Real: 02/07/2026 | Vence: 24/09/2026' },
  { civ: '1000067', eje: 'CL 192', desde: 'KR 7B', hasta: 'KR 8', type: 'Local', area: 194.94, lat: '4.769023', lng: '-74.028627', status: 'al-dia', progress: 33, plannedProgress: 27, supervisor: 'Ing. Juan Mendoza', totalBudget: 253799700, executedBudget: 83753901, description: 'Tramo: KR 7B hasta KR 8 - Área: 194.94 m² - Malla: Local | Real Inicio: 09/06/2026 | Plazo: 20/04/2026 al 20/11/2026' },
  { civ: '1007361', eje: 'KR 7B', desde: '192', hasta: 'Cerrada', type: 'Local', area: 113.43, lat: '4.769023', lng: '-74.028627', status: 'al-dia', progress: 40, plannedProgress: 39, supervisor: 'Ing. Juan Mendoza' },
  { civ: '1000086', eje: 'KR 7B', desde: '192', hasta: 'Cerrada', type: 'Local', area: 167.22, lat: '4.769023', lng: '-74.028627', status: 'al-dia', progress: 42, plannedProgress: 34, supervisor: 'Ing. Juan Mendoza' },
  { civ: '1001471', eje: 'KR 19', desde: 'CL 166', hasta: 'Sin Establecer', type: 'Local', area: 484.43, lat: '4.746409', lng: '-74.042640', status: 'al-dia', progress: 22, plannedProgress: 7, supervisor: 'Ing. Diana Guerrero' },
  { civ: '1004836', eje: '7 B BIS', desde: 'CL 123', hasta: 'CL 124', type: 'Intermedia', area: 814.47, lat: '4.699749', lng: '-74.031773', status: 'al-dia', progress: 0, plannedProgress: 0, supervisor: 'Ing. Carlos Ortiz' },
  { civ: '1003131', eje: 'Calle 148', desde: 'Carrera 16B', hasta: 'Carrera 17A', type: 'Local', area: 491.51, lat: '4.730479', lng: '-74.043712', status: 'al-dia', progress: 0, plannedProgress: 0, supervisor: 'Ing. Carolina Rojas' },
  { civ: '1001881', eje: 'CL 163ª', desde: 'KR 13 A', hasta: 'KR 13 B', type: 'Local', area: 417.5, lat: '4.741022', lng: '-74.033712', status: 'al-dia', progress: 0, plannedProgress: 0, supervisor: 'Ing. Diego Pardo' },
  { civ: '1002987', eje: 'KR 8B BIS', desde: 'CL 163', hasta: 'CL 163A', type: 'Local', area: 360.01, lat: '4.739400', lng: '-74.027619', status: 'al-dia', progress: 50, plannedProgress: 29, supervisor: 'Ing. Diego Pardo' },
  { civ: '1005246', eje: 'CL 111', desde: 'KR 14', hasta: 'KR 14B', type: 'Local', area: 749.17, lat: '4.693499', lng: '-74.042721', status: 'al-dia', progress: 100, plannedProgress: 100, supervisor: 'Ing. Carlos Ortiz' },
  { civ: '1006974', eje: 'Calle 185B', desde: 'Carrera 8C', hasta: 'Carrera 8D', type: 'Local', area: 199.03, lat: '4.762333', lng: '-74.031029', status: 'al-dia', progress: 0, plannedProgress: 0, supervisor: 'Ing. Juan Mendoza' },
  { civ: '1006799', eje: 'KR 1ª', desde: 'CL 127 B BIS A', hasta: 'CL 127 B BIS', type: 'Local', area: 269.64, lat: '4.703701', lng: '-74.023672', status: 'al-dia', progress: 23, plannedProgress: 23, supervisor: 'Ing. Carolina Rojas' },
  { civ: '1004557', eje: 'KR 1ª', desde: 'CL 127 B BIS', hasta: '127 B', type: 'Local', area: 244.07, lat: '4.703701', lng: '-74.023672', status: 'al-dia', progress: 23, plannedProgress: 19, supervisor: 'Ing. Carolina Rojas' },
  { civ: '1001202', eje: 'KR 8C', desde: 'CL 181', hasta: 'CL 181B', type: 'Local', area: 692.67, lat: '4.757676', lng: '-74.030866', status: 'alerta', progress: 1, plannedProgress: 18, supervisor: 'Ing. Diego Pardo' },
  { civ: '1000988', eje: 'KR 7C', desde: 'CL 182B', hasta: 'AC 183', type: 'Local', area: 471.86, lat: '4.759772', lng: '-74.028383', status: 'alerta', progress: 1, plannedProgress: 18, supervisor: 'Ing. Diego Pardo' },
  { civ: '1001202', eje: 'KR 8C', desde: 'CL 181', hasta: 'CL 181B', type: 'Local', area: 692.67, lat: '4.757676', lng: '-74.030866', status: 'alerta', progress: 66, plannedProgress: 80, supervisor: 'Ing. Diana Guerrero' },
  { civ: '1007255', eje: 'Carrera 2B', desde: 'Calle 127B', hasta: 'Calle 127C', type: 'Local', area: 76.72, lat: '4.704844', lng: '-74.023904', status: 'al-dia', progress: 0, plannedProgress: 0, supervisor: 'Ing. Carolina Rojas' },
  { civ: '1005663', eje: 'KR 11B', desde: 'CL 104A', hasta: 'AK 9', type: 'Local', area: 1027.18, lat: '4.687661', lng: '-74.042491', status: 'al-dia', progress: 89, plannedProgress: 69, supervisor: 'Ing. Diana Guerrero' },
  { civ: '1005704', eje: 'KR 11B', desde: 'CL 103A', hasta: 'CL 104A', type: 'Local', area: 735.2, lat: '4.686872', lng: '-74.042882', status: 'al-dia', progress: 90, plannedProgress: 67, supervisor: 'Ing. Diana Guerrero' },
  { civ: '1005491', eje: 'CL 106ª', desde: 'KR 13A', hasta: 'KR 14', type: 'Local', area: 53.73, lat: '4.689826', lng: '-74.045197', status: 'al-dia', progress: 100, plannedProgress: 100, supervisor: 'Ing. Carlos Ortiz' },
  { civ: '1005808', eje: 'KR 12', desde: 'CL 101', hasta: 'CL 101A', type: 'Local', area: 530.35, lat: '4.684540', lng: '-74.045465', status: 'al-dia', progress: 100, plannedProgress: 100, supervisor: 'Ing. Carlos Ortiz' },
  { civ: '1008209', eje: 'Carrera 8C', desde: 'CL 167D', hasta: 'CL 168', type: 'Intermedia', area: 544.83, lat: '4.745266', lng: '-74.026888', status: 'al-dia', progress: 100, plannedProgress: 100, supervisor: 'Ing. Diana Guerrero' },
  // Adición: calzadas (CIVS contractuales, hoja CCTV)
  { civ: '1008292', pk: '91010798', eje: 'Carrera 17B', desde: 'Calle 180 Bis', hasta: 'Calle 180A', longitud: 64.3, area: 0, lat: '4.757391', lng: '-74.038870', status: 'al-dia', progress: 0, plannedProgress: 0, supervisor: '', tipoIntervencion: 'Calzada', frenteNumber: 301, alias: 'Frente 301 (adición)', adicion: true, totalBudget: 0, executedBudget: 0, description: 'Tramo: Calle 180 Bis hasta Calle 180A - Longitud: 64.3 m | Adición: Parqueadero buses' },
  { civ: '1007132', pk: '91019385', eje: 'Carrera 17B', desde: 'Calle 180A', hasta: 'Calle 181', longitud: 28.22, area: 0, lat: '4.757818', lng: '-74.038851', status: 'al-dia', progress: 0, plannedProgress: 0, supervisor: '', tipoIntervencion: 'Calzada', frenteNumber: 302, alias: 'Frente 302 (adición)', adicion: true, totalBudget: 0, executedBudget: 0, description: 'Tramo: Calle 180A hasta Calle 181 - Longitud: 28.22 m | Adición: Parqueadero buses' },
  { civ: '1003125', pk: '138050', eje: 'Calle 182B', desde: 'Carrera 7C', hasta: 'Cerrada', longitud: 110, area: 0, lat: '4.731051', lng: '-74.043943', status: 'al-dia', progress: 0, plannedProgress: 0, supervisor: '', tipoIntervencion: 'Calzada', frenteNumber: 303, alias: 'Frente 303 (adición)', adicion: true, totalBudget: 0, executedBudget: 0, description: 'Tramo: Carrera 7C hasta Cerrada - Longitud: 110 m | Adición: Margaritas 2' },
  { civ: '1001715', pk: '140541', eje: 'Calle 162', desde: 'Carrera 21', hasta: 'Carrera 20', longitud: 116.35, area: 0, lat: '4.742513', lng: '-74.044820', status: 'al-dia', progress: 0, plannedProgress: 0, supervisor: '', tipoIntervencion: 'Calzada', frenteNumber: 304, alias: 'Frente 304 (adición)', adicion: true, totalBudget: 0, executedBudget: 0, description: 'Tramo: Carrera 21 hasta Carrera 20 - Longitud: 116.35 m | Adición: Iglesia' }
];

// Frentes de Espacio Público: 20 del contrato, 201 (emergencia) y 5 de la adición (401-405)
const ESPACIO_PUBLICO_FRENTES_RAW = [
  { civ: '1001048', pk: '3000', eje: 'Carrera 7 a', desde: 'Calle 182', hasta: 'Calle 182ª', area: 154.04, lat: '4.759100', lng: '-74.027433', status: 'al-dia', progress: 40, plannedProgress: 40, supervisor: 'Ing. Diana Guerrero' },
  { civ: '1007343', pk: '92073803', eje: 'Carrera 13', desde: 'Calle 187', hasta: 'Calle 187ª', area: 32.01, lat: '4.764420', lng: '-74.036999', status: 'al-dia', progress: 90, plannedProgress: 90, supervisor: 'Ing. Andrés Castro' },
  { civ: '1000029', pk: '92053192', eje: 'Carrera 19ª', desde: 'Calle 196', hasta: 'Calle 195', area: 344.63, lat: '4.773203', lng: '-74.040019', status: 'al-dia', progress: 75, plannedProgress: 75, supervisor: 'Ing. Andrés Castro' },
  { civ: '1007338', pk: '92073807', eje: 'Carrera 18 a', desde: 'Calle 189', hasta: 'Cerrada', area: 79.83, lat: '4.765923', lng: '-74.039117', status: 'al-dia', progress: 55, plannedProgress: 55, supervisor: 'Ing. Javier Ruiz' },
  { civ: '1000067', pk: '7021', eje: 'CL 192', desde: 'KR 7B', hasta: 'KR 8', area: 55.23, lat: '4.769023', lng: '-74.028627', status: 'al-dia', progress: 60, plannedProgress: 60, supervisor: 'Ing. Andrés Castro' },
  { civ: '1000067', pk: '7020', eje: 'CL 192', desde: 'KR 7B', hasta: 'KR 8', area: 70.6, lat: '4.769023', lng: '-74.028627', status: 'al-dia', progress: 65, plannedProgress: 65, supervisor: 'Ing. Andrés Castro' },
  { civ: '1003131', pk: '5055', eje: 'Calle 148', desde: 'Carrera 17', hasta: 'Carrera 18', area: 134.29, lat: '4.730479', lng: '-74.043712', status: 'al-dia', progress: 48, plannedProgress: 50, supervisor: 'Ing. Javier Ruiz' },
  { civ: '1003135', pk: '5053', eje: 'Calle 148', desde: 'Carrera 16B', hasta: 'Carrera 17', area: 131.55, lat: '4.730479', lng: '-74.043712', status: 'al-dia', progress: 52, plannedProgress: 50, supervisor: 'Ing. Javier Ruiz' },
  { civ: '1005444', pk: '20005212', eje: 'Calle 104', desde: 'Carrera 17A', hasta: 'Carrera 18ª', area: 119.05, lat: '4.690304', lng: '-74.050113', status: 'al-dia', progress: 85, plannedProgress: 80, supervisor: 'Ing. Javier Ruiz' },
  { civ: '1005268', pk: '20004061', eje: 'Calle 108', desde: 'Carrera 17', hasta: 'Carrera 17ª', area: 280.18, lat: '4.692872', lng: '-74.047504', status: 'al-dia', progress: 70, plannedProgress: 70, supervisor: 'Ing. Javier Ruiz' },
  { civ: '1003125', pk: '2129', eje: 'Carrera 18', desde: 'Calle 148', hasta: 'Calle 150', area: 179.47, lat: '4.730940', lng: '-74.043916', status: 'al-dia', progress: 35, plannedProgress: 40, supervisor: 'Ing. Javier Ruiz' },
  { civ: '1002332', pk: '1460', eje: 'KR 7F', desde: 'AC 161', hasta: 'CL 161A', area: 102.88, lat: '4.736728', lng: '-74.025532', status: 'al-dia', progress: 95, plannedProgress: 95, supervisor: 'Ing. Andrés Castro' },
  { civ: '1002087', pk: '1539', eje: 'KR 8 B BIS', desde: 'Calle 163', hasta: 'Cale163a', area: 92.96, lat: '4.736728', lng: '-74.025532', status: 'al-dia', progress: 80, plannedProgress: 80, supervisor: 'Ing. Andrés Castro' },
  { civ: '1006974', pk: '92073759', eje: 'Calle 185 B', desde: 'Kr 8 C', hasta: 'Kr 8 D', area: 61.44, lat: '4.762292', lng: '-74.030374', status: 'al-dia', progress: 30, plannedProgress: 30, supervisor: 'Ing. Javier Ruiz' },
  { civ: '1006974', pk: '92073760', eje: 'Calle 185 B', desde: 'Kr 8 C', hasta: 'Kr 8 D', area: 81.42, lat: '4.762292', lng: '-74.030374', status: 'al-dia', progress: 40, plannedProgress: 40, supervisor: 'Ing. Javier Ruiz' },
  { civ: '1001044', pk: '3006', eje: 'Carrera 7c', desde: 'Calle 182', hasta: 'Calle 182B', area: 279.77, lat: '4.759232', lng: '-74.028292', status: 'al-dia', progress: 68, plannedProgress: 70, supervisor: 'Ing. Andrés Castro' },
  { civ: '1001044', pk: '3007', eje: 'Carrera 7c', desde: 'Calle 182', hasta: 'Calle 182B', area: 179.85, lat: '4.759232', lng: '-74.028292', status: 'al-dia', progress: 72, plannedProgress: 70, supervisor: 'Ing. Andrés Castro' },
  { civ: '1000988', pk: '3008', eje: 'Carrera 7c', desde: 'Calle 182B', hasta: 'Calle 183', area: 189.49, lat: '4.759772', lng: '-74.028383', status: 'al-dia', progress: 50, plannedProgress: 50, supervisor: 'Ing. Andrés Castro' },
  { civ: '1000988', pk: '3009', eje: 'Carrera 7c', desde: 'Calle 182B', hasta: 'Calle 183', area: 109.85, lat: '4.759772', lng: '-74.028383', status: 'al-dia', progress: 45, plannedProgress: 50, supervisor: 'Ing. Andrés Castro' },
  { civ: '1000720', pk: '20013130', eje: 'Calle 185 C bis', desde: 'Kr 3ª', hasta: 'Kr 4', area: 253.41, lat: '4.762149', lng: '-74.024926', status: 'al-dia', progress: 95, plannedProgress: 95, supervisor: 'Ing. Andrés Castro' },
  { 
    civ: '1005243', 
    pk: '20004062', 
    eje: 'carrera 17A', 
    desde: 'calle 109', 
    hasta: 'calle 108', 
    area: 91.5, 
    lat: '4.693450', 
    lng: '-74.047620', 
    status: 'al-dia', 
    progress: 25, 
    plannedProgress: 25, 
    supervisor: 'Ing. Javier Ruiz',
    barrio: 'Santa Ana Occidental',
    tipoIntervencion: 'Andén',
    prioridad: 'Emergencia',
    frenteNumber: 201,
    alias: 'Frente 201 (Ítem 21)',
    totalBudget: 44759461,
    executedBudget: 11189865,
    description: 'Tramo: calle 109 hasta calle 108 - Área: 91.5 m² - Andén Concreto MR-40 | Aprobado COI 33 del 13/08/2026 | Emergencia'
  },
  // Adición: espacio público (CIVS contractuales, hoja CCTV)
  { civ: '1003764', pk: '92052601', eje: 'Calle 137', desde: 'Carrera 19', hasta: 'Carrera 18A', longitud: 61.06, area: 0, lat: '4.721301', lng: '-74.046066', status: 'al-dia', progress: 0, plannedProgress: 0, supervisor: '', tipoIntervencion: 'Andén', frenteNumber: 401, alias: 'Frente 401 (adición)', adicion: true, totalBudget: 0, executedBudget: 0, description: 'Tramo: Carrera 19 hasta Carrera 18A - Longitud: 61.06 m | Adición: Banco Caja Social' },
  { civ: '1002087', pk: '1538', eje: 'Carrera 8B Bis', desde: 'Calle 163', hasta: 'Calle 163A', longitud: 52.63, area: 0, lat: '4.739126', lng: '-74.027654', status: 'al-dia', progress: 0, plannedProgress: 0, supervisor: '', tipoIntervencion: 'Andén', frenteNumber: 402, alias: 'Frente 402 (adición)', adicion: true, totalBudget: 0, executedBudget: 0, description: 'Tramo: Calle 163 hasta Calle 163A - Longitud: 52.63 m | Adición: Andén La Suiza' },
  { civ: '1000209', pk: '2962', eje: 'Carrera 6', desde: 'Calle 190', hasta: 'Calle 190A', longitud: 86.7, area: 0, lat: '4.767490', lng: '-74.026672', status: 'al-dia', progress: 0, plannedProgress: 0, supervisor: '', tipoIntervencion: 'Rampa', frenteNumber: 403, alias: 'Frente 403 (adición)', adicion: true, totalBudget: 0, executedBudget: 0, description: 'Tramo: Calle 190 hasta Calle 190A - Longitud: 86.7 m | Adición: Rampa zona verde' },
  { civ: '1000250', pk: '92093833', eje: 'Calle 189B', desde: 'Carrera 5B', hasta: 'Carrera 5A Bis', longitud: 19.53, area: 0, lat: '4.767490', lng: '-74.026672', status: 'al-dia', progress: 0, plannedProgress: 0, supervisor: '', tipoIntervencion: 'Escaleras', frenteNumber: 404, alias: 'Frente 404 (adición)', adicion: true, totalBudget: 0, executedBudget: 0, description: 'Tramo: Carrera 5B hasta Carrera 5A Bis - Longitud: 19.53 m | Adición: Escaleras 2 El Codito' },
  { civ: '1002332', pk: '1461', eje: 'Carrera 7F', desde: 'Calle 161', hasta: 'Calle 161A', longitud: 50.73, area: 0, lat: '4.736671', lng: '-74.025488', status: 'al-dia', progress: 0, plannedProgress: 0, supervisor: '', tipoIntervencion: 'Andén', frenteNumber: 405, alias: 'Frente 405 (adición)', adicion: true, totalBudget: 0, executedBudget: 0, description: 'Tramo: Calle 161 hasta Calle 161A - Longitud: 50.73 m | Adición: Andén frente 1' }
];


export const USAQUEN_CONFIG = {
  id: 'usaquen',
  nombre: 'Frentes de obra en Usaquén',
  ubicacion: 'Localidad de Usaquén, Bogotá D.C.',
  contratante: 'IDU',
  marca: {
    nombre: 'INCOLTA S.A.S.',
    nombreCorto: 'INCOLTA',
    logoUrl: '/marcas/incolta/emblema-mosaico.svg',
    logoCompletoUrl: '/marcas/incolta/logo.svg',
    sitioWeb: 'https://incolta.cuadreb.com',
    color: '#00236f'
  },
  correspondencia: {
    // Días hábiles para responder un oficio recibido y pistas para clasificar remitentes
    plazoDiasHabiles: 5,
    // Lo recibido antes de esta fecha se considera histórico (tramitado)
    inicioSeguimiento: '2026-11-01',
    dominiosEntidad: ['idu.gov.co'],
    // Cuentas del consorcio contratista (gestión social, correspondencia, SST, ambiental)
    dominiosContratista: ['gsusaquenvias@gmail.com', 'consorciocon423@gmail.com', 'sstconusaquen@gmail.com', 'ambiental423.2025@gmail.com']
  },
  interventoria: {
    consorcio: 'Consorcio Interventoría Usaquén',
    contrato: 'IDU-19-620-18'
  },
  calendario: {
    // Semanas de sábado a viernes; la semana 20 empezó el sábado 4 de abril de 2026
    numeroPrimeraSemana: 20,
    fechaInicioPrimeraSemana: '2026-04-04'
  },
  contratos: [
    {
      id: 'project_1',
      nombre: 'Conservación de la Malla Vial Local e Intermedia - Localidad de Usaquén',
      nombreCorto: 'Malla vial',
      etiquetaFrentes: 'Malla Vial',
      sigla: 'MV',
      numero: 'IDU-2026-CO301',
      contratista: 'Consorcio Malla Vial Bogotá 2026',
      prefijo: 'f_mv',
      numeroInicial: 1,
      presupuestoObra: 22800000000,
      presupuestoInterventoria: 1720000000,
      duracionMeses: 18,
      avanceProgramado: 68,
      descripcion: 'Actividades de conservación, rehabilitación, parcheo y reconstrucción de la malla vial local e intermedia en la localidad de Usaquén en Bogotá D.C.',
      frentes: MALLA_VIAL_FRENTES_RAW
    },
    {
      id: 'project_2',
      nombre: 'Conservación y Adecuación de Espacio Público - Localidad de Usaquén',
      nombreCorto: 'Espacio público',
      etiquetaFrentes: 'Espacio Público',
      sigla: 'EP',
      numero: 'IDU-2026-CO302',
      contratista: 'Infraestructuras de los Andes S.A.S.',
      prefijo: 'f_ep',
      numeroInicial: 101,
      presupuestoObra: 14500000000,
      presupuestoInterventoria: 1150000000,
      duracionMeses: 15,
      avanceProgramado: 58,
      descripcion: 'Actividades de conservación, reparación y adecuación del espacio público (andenes, vados peatonales, plazoletas) en la localidad de Usaquén en Bogotá D.C.',
      frentes: ESPACIO_PUBLICO_FRENTES_RAW
    }
  ]
};
