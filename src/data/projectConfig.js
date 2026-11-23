// Modelo de proyecto de InterventorIA.
//
// Un proyecto describe todo lo que antes estaba fijo en el código: la interventoría (marca
// blanca: nombre, logo, color), el contratante, el calendario de semanas y los contratos con
// sus frentes (CIV, eje, tramo, coordenadas). La app genera a partir de él la estructura que
// usan las vistas (contratos con frentes enriquecidos).

export const DEFAULT_PROJECT_ID = 'usaquen';
export const DEFAULT_BRAND_COLOR = '#00236f';

// Helper to initialize compliance list of checks for Colombian regulations
export const createDefaultCompliance = (checkedAll = false) => {
  return {
    tecnico: {
      checklist: [
        { id: 't1', label: 'Verificar planos de construcción aprobados para el frente', checked: checkedAll },
        { id: 't2', label: 'Controlar ensayos de calidad de materiales (concreto, acero, etc.)', checked: checkedAll },
        { id: 't3', label: 'Revisar bitácora diaria de obra de este frente', checked: checkedAll },
        { id: 't4', label: 'Comprobar rendimiento y avance físico vs programación contractual', checked: checkedAll }
      ],
      notes: checkedAll ? 'Planos validados por la interventoría. Ensayos de laboratorio conformes.' : ''
    },
    financiero: {
      checklist: [
        { id: 'f1', label: 'Verificar actas de medición de cantidades de obra ejecutada', checked: checkedAll },
        { id: 'f2', label: 'Revisar amortización del anticipo asignado al frente', checked: checkedAll },
        { id: 'f3', label: 'Controlar balance de presupuesto y costos extras del frente', checked: checkedAll },
        { id: 'f4', label: 'Verificar aprobación de facturas por interventoría', checked: checkedAll }
      ],
      notes: checkedAll ? 'Actas mensuales firmadas y amortización del anticipo al día.' : ''
    },
    administrativo: {
      checklist: [
        { id: 'a1', label: 'Verificar registro de asistencia del personal asignado', checked: checkedAll },
        { id: 'a2', label: 'Revisar diario de obra / Bitácora firmado por residentes', checked: checkedAll },
        { id: 'a3', label: 'Controlar listado de maquinaria activa en el frente', checked: checkedAll },
        { id: 'a4', label: 'Revisar cumplimiento del cronograma detallado', checked: checkedAll }
      ],
      notes: checkedAll ? 'Diarios de obra firmados y maquinaria registrada.' : ''
    },
    legal: {
      checklist: [
        { id: 'l1', label: 'Verificar vigencia y cobertura de las pólizas de seguro del contrato', checked: checkedAll },
        { id: 'l2', label: 'Revisar otrosíes o actas de suspensión/modificación aplicables', checked: checkedAll },
        { id: 'l3', label: 'Verificar pago de aportes parafiscales y seguridad social del personal', checked: checkedAll },
        { id: 'l4', label: 'Inspeccionar cumplimiento del objeto contractual en este frente', checked: checkedAll }
      ],
      notes: checkedAll ? 'Certificados de aportes de nómina aprobados sin observaciones.' : ''
    },
    ambiental: {
      checklist: [
        { id: 'am1', label: 'Inspeccionar el Plan de Manejo Ambiental (PMA)', checked: checkedAll },
        { id: 'am2', label: 'Verificar manejo de escombros y disposición final (certificados de botadero)', checked: checkedAll },
        { id: 'am3', label: 'Revisar control de emisiones de polvo y ruido', checked: checkedAll },
        { id: 'am4', label: 'Comprobar limpieza y orden ambiental en el frente', checked: checkedAll }
      ],
      notes: checkedAll ? 'Cumplimiento ambiental verificado en botadero autorizado.' : ''
    },
    social: {
      checklist: [
        { id: 's1', label: 'Verificar actas de socialización previas con la vecindad/comunidad', checked: checkedAll },
        { id: 's2', label: 'Atender y registrar PQRS (Peticiones, Quejas, Reclamos) del sector', checked: checkedAll },
        { id: 's3', label: 'Verificar porcentaje de mano de obra local contratada', checked: checkedAll },
        { id: 's4', label: 'Revisar actas de vecindad levantadas antes del inicio', checked: checkedAll }
      ],
      notes: checkedAll ? 'Socialización efectuada y actas de vecindad registradas.' : ''
    },
    sst: {
      checklist: [
        { id: 'sst1', label: 'Inspeccionar uso obligatorio de EPP completo por el personal', checked: checkedAll },
        { id: 'sst2', label: 'Verificar planillas de afiliación a ARL, EPS y Pensión al día', checked: checkedAll },
        { id: 'sst3', label: 'Revisar realización de la charla diaria de seguridad (5 minutos)', checked: checkedAll },
        { id: 'sst4', label: 'Monitorear señalización de peligro y cerramientos de seguridad activos', checked: checkedAll }
      ],
      notes: checkedAll ? 'Charlas de seguridad de 5 min al día. EPP en campo verificado.' : ''
    }
  };
};

// Generator to build enriched frentes list from raw configurations
export const generateFrentes = (rawList, isMallaVial, prefijo = isMallaVial ? 'f_mv' : 'f_ep', numeroInicial = isMallaVial ? 1 : 101, etiqueta = isMallaVial ? 'Malla Vial' : 'Espacio Público') => {
  return rawList.map((f, index) => {
    // Determine default checking status (mostly checked except for alerts)
    const isCompliant = f.status === 'al-dia';
    const comp = createDefaultCompliance(isCompliant);

    // If alert, make sure l3 (Parafiscales) is false to trigger red flag
    if (f.status === 'alerta') {
      comp.legal.checklist = comp.legal.checklist.map(item => 
        item.id === 'l3' ? { ...item, checked: false } : item
      );
      comp.legal.notes = 'Falta radicar planilla y paz y salvo de parafiscales firmado por Revisor Fiscal.';
    }

    // Concrete tests mock data
    const tests = [];
    if (isMallaVial && index === 0) {
      tests.push({
        id: 't_m1',
        testDate: '2026-06-25',
        mixDesign: '4000 PSI (28 MPa)',
        strengthRequired: 28,
        strengthResult: 29.8,
        status: 'passed',
        laboratoryName: 'Suelos & Concretos de Colombia'
      });
    }
    // Failed test under frente_2 (alert) to trigger técnico red flag
    if (isMallaVial && index === 1) {
      tests.push({
        id: 't_m2',
        testDate: '2026-06-28',
        mixDesign: '4000 PSI (28 MPa)',
        strengthRequired: 28,
        strengthResult: 23.4, // Failed
        status: 'failed',
        laboratoryName: 'Suelos & Concretos de Colombia'
      });
    }

    return {
      id: `${prefijo}_${index + 1}`,
      frente: f.frenteNumber || (numeroInicial + index),
      alias: f.alias || `Frente ${f.frenteNumber || (numeroInicial + index)}`,
      civ: f.civ,
      eje: f.eje,
      desde: f.desde,
      hasta: f.hasta,
      barrio: f.barrio || '',
      tipoIntervencion: f.tipoIntervencion || '',
      prioridad: f.prioridad || 'Normal',
      name: `${etiqueta} - CIV ${f.civ} (${f.eje})`,
      description: f.description || `Tramo: ${f.desde} hasta ${f.hasta} - Área: ${f.area} m2 - Malla: ${f.type || 'N/A'}`,
      latitude: f.lat,
      longitude: f.lng,
      supervisor: f.supervisor || '',
      progress: f.progress,
      plannedProgress: f.plannedProgress,
      status: f.status,
      concreteTests: tests,
      pagaMetrics: {
        co2Emissions: Math.round(f.area * 0.005 * 10) / 10,
        localLabor: f.status === 'alerta' ? 45 : 75,
        femaleLabor: 25,
        machineryHours: Math.round(f.area * 0.05)
      },
      financialMetrics: {
        totalBudget: f.totalBudget !== undefined ? f.totalBudget : (f.area * 320000),
        executedBudget: f.executedBudget !== undefined ? f.executedBudget : (f.area * 320000 * (f.progress / 100)),
        advanceAmortized: 20
      },
      compliance: comp,
      photos: []
    };
  });
};


// Contratos del proyecto -> estructura que usan las vistas (antes getSeededProjects)
export function configToProjects(config) {
  return (config?.contratos || []).map(c => ({
    id: c.id,
    name: c.nombre,
    shortName: c.nombreCorto || c.nombre,
    contractNo: c.numero,
    contractor: c.contratista || '',
    constructionBudget: Number(c.presupuestoObra) || 0,
    interventoriaBudget: Number(c.presupuestoInterventoria) || 0,
    duration: Number(c.duracionMeses) || 0,
    plannedProgress: Number(c.avanceProgramado) || 0,
    description: c.descripcion || '',
    frentePrefix: c.prefijo,
    frentes: generateFrentes(c.frentes || [], c.prefijo === 'f_mv', c.prefijo, Number(c.numeroInicial) || 1, c.etiquetaFrentes || c.nombreCorto || c.nombre)
  }));
}

// Contrato al que pertenece un frente (por el prefijo de su id)
export function contractForFrente(config, frenteId) {
  const id = String(frenteId || '');
  return (config?.contratos || []).find(c => id.startsWith(`${c.prefijo}_`)) || null;
}

// Nombre corto para mostrar: "Malla vial", "Espacio público", ...
export function contractShortName(config, frenteId) {
  return contractForFrente(config, frenteId)?.nombreCorto || '';
}

// Iniciales del contrato para insignias pequeñas (MV, EP, ...)
export function contractInitials(config, frenteId) {
  const c = contractForFrente(config, frenteId);
  if (c?.sigla) return c.sigla;
  const name = c?.nombreCorto || '';
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '·';
}

// Validación mínima antes de guardar un proyecto
export function validateProjectConfig(config) {
  const errors = [];
  if (!config?.id || !/^[a-z0-9-]{3,40}$/.test(config.id)) errors.push('El identificador debe tener 3 a 40 letras minúsculas, números o guiones.');
  if (!config?.nombre?.trim()) errors.push('Falta el nombre del proyecto.');
  if (!config?.marca?.nombre?.trim()) errors.push('Falta el nombre de la interventoría.');
  if (!Array.isArray(config?.contratos) || config.contratos.length === 0) errors.push('El proyecto necesita al menos un contrato.');
  const prefixes = new Set();
  (config?.contratos || []).forEach((c, i) => {
    if (!c.nombre?.trim()) errors.push(`Contrato ${i + 1}: falta el nombre.`);
    if (!/^[a-z][a-z0-9_]{0,15}$/.test(c.prefijo || '')) errors.push(`Contrato ${i + 1}: prefijo inválido.`);
    if (prefixes.has(c.prefijo)) errors.push(`Contrato ${i + 1}: prefijo repetido (${c.prefijo}).`);
    prefixes.add(c.prefijo);
    (c.frentes || []).forEach((f, j) => {
      if (!f.civ && !f.eje) errors.push(`Contrato ${i + 1}, frente ${j + 1}: falta CIV o eje.`);
    });
  });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(config?.calendario?.fechaInicioPrimeraSemana || '')) {
    errors.push('Falta la fecha de inicio de la primera semana (AAAA-MM-DD).');
  }
  return errors;
}
