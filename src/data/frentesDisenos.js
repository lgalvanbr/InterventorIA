// Catálogo Técnico de Diseños y Capas de Pavimento Aprobados por Interventoría
// Basado en los informes oficiales de INCOLTA S.A.S. para la Malla Vial y Espacio Público de Usaquén

// Estructuras Tipo Definidas
const ESTRUCTURA_TIPO_1 = (civId) => ({
  civ_id: civId,
  grupo: "Tipo 1",
  nombre_grupo: "Tipo 1: Pavimento Flexible (Sin Mejoramiento de Rasante)",
  tecnologia_aprobada: "Pavimento Flexible (Asfáltico)",
  alternativa_aprobada: "Mezcla Asfáltica MD-19 sobre Base Cemento y Geocelda",
  periodo_diseno_anos: 15,
  transito_ejes_equivalentes: 800000,
  datos_geotecnicos: {
    cbr_saturado_promedio_porcentaje: 1.09,
    modulo_resiliente_saturado_psi: 1135.65,
    clasificacion_uscs: "CL (Arcilla lacustre de la Sabana)",
    presion_lambe_mpa: 0.021
  },
  paquete_estructural_capas: [
    { posicion: 1, nombre: "Mezcla asfáltica (MD-19-ET-620-18 (MD-12) y MCCH25)", espesor_cm: 12.0, especificacion_idu: "ET IDU 620-18", tipo_material: "asfalto", modulo_psi: 345000 },
    { posicion: 2, nombre: "Imprimación Emulsión asfáltica CRL-1", espesor_cm: 0.0, especificacion_idu: "ET IDU 202-18", tipo_material: "imprimacion" },
    { posicion: 3, nombre: "Base Granular (BG38) estabilizada con 5% de cemento y aditivo", espesor_cm: 20.0, especificacion_idu: "ET IDU 520-18", tipo_material: "base_cemento", modulo_psi: 37000 },
    { posicion: 4, nombre: "Subbase Granular Reciclada (AR-SBG50) mejorada con Geomalla multiaxial (resistencia a la fluencia >= 300 kN/m)", espesor_cm: 25.0, espesor_label: "10 cm + Geomalla + 15 cm", especificacion_idu: "ET IDU 520-18", tipo_material: "geomalla", modulo_psi: 19500 },
    { posicion: 5, nombre: "Geocelda h=15cm rellena de Subbase Granular Reciclada (AR-SBG50)", espesor_cm: 15.0, especificacion_idu: "ET IDU 412-18", tipo_material: "geocelda", modulo_psi: 2814.9 },
    { posicion: 6, nombre: "Geotextil tejido, método de tira ancha > 90 kN/m", espesor_cm: 0.0, especificacion_idu: "ET IDU 411-18", tipo_material: "geotextil" }
  ],
  elementos_estabilizacion_subrasante: {
    tipo: "Sin mejoramiento de rasante",
    diametro_m: 0.0,
    profundidad_m: 0.0,
    distribucion: "N/A",
    espaciamiento_m: 0.0
  },
  alertas_interventoria: [
    {
      id: "t1_1",
      titulo: "Verificación del Módulo de Mezcla Asfáltica",
      tipo: "warning",
      mensaje: "Asegurar que la mezcla asfáltica cumpla con el módulo de 345,000 psi especificado en el diseño definitivo."
    }
  ]
});

const ESTRUCTURA_TIPO_1B = (civId) => ({
  civ_id: civId,
  grupo: "Tipo 1B",
  nombre_grupo: "Tipo 1B: Pavimento Flexible Especial (Sin Mejoramiento de Rasante)",
  tecnologia_aprobada: "Pavimento Flexible (Asfáltico) Especial",
  alternativa_aprobada: "Estructura flexible optimizada con mayor espesor de base",
  periodo_diseno_anos: 15,
  transito_ejes_equivalentes: 850000,
  datos_geotecnicos: {
    cbr_saturado_promedio_porcentaje: 0.92,
    modulo_resiliente_saturado_psi: 1000.8,
    clasificacion_uscs: "CL (Suelo Natural)",
    presion_lambe_mpa: 0.025
  },
  paquete_estructural_capas: [
    { posicion: 1, nombre: "Mezcla asfáltica (MD-19-ET-620-18 (MD-12) y MCCH25)", espesor_cm: 12.0, especificacion_idu: "ET IDU 620-18", tipo_material: "asfalto", modulo_psi: 345000 },
    { posicion: 2, nombre: "Imprimación Emulsión asfáltica CRL-1", espesor_cm: 0.0, especificacion_idu: "ET IDU 202-18", tipo_material: "imprimacion" },
    { posicion: 3, nombre: "Base Granular (BG38) o reciclada (AR-BG38) estabilizada con 5% de cemento y aditivo", espesor_cm: 23.0, especificacion_idu: "ET IDU 533-18", tipo_material: "base_cemento", modulo_psi: 30000 },
    { posicion: 4, nombre: "Subbase Granular Reciclada (AR-SBG50) mejorada con Geomalla multiaxial (resistencia a la fluencia >= 300 kN/m)", espesor_cm: 25.0, espesor_label: "15 cm + Geomalla + 10 cm", especificacion_idu: "ET IDU 520-18", tipo_material: "geomalla", modulo_psi: 19500 },
    { posicion: 5, nombre: "Geocelda h=15cm rellena de Subbase Granular Reciclada (AR-SBG50)", espesor_cm: 15.0, especificacion_idu: "ET IDU 412-18", tipo_material: "geocelda", modulo_psi: 2480.5 },
    { posicion: 6, nombre: "Geotextil tejido, método de tira ancha > 90 kN/m", espesor_cm: 0.0, especificacion_idu: "ET IDU 411-18", tipo_material: "geotextil" }
  ],
  elementos_estabilizacion_subrasante: {
    tipo: "Sin mejoramiento de rasante",
    diametro_m: 0.0,
    profundidad_m: 0.0,
    distribucion: "N/A",
    espaciamiento_m: 0.0
  },
  alertas_interventoria: [
    {
      id: "t1b_1",
      titulo: "Espesor de Base Granular",
      tipo: "warning",
      mensaje: "Verificar strictly el espesor de 23 cm de Base Granular BG38 estabilizada al 5% con cemento."
    }
  ]
});

const ESTRUCTURA_TIPO_2 = (civId) => {
  const base = ESTRUCTURA_TIPO_1(civId);
  return {
    ...base,
    grupo: "Tipo 2",
    nombre_grupo: "Tipo 2: Pavimento Flexible (Con Mejoramiento de Subrasante)",
    alternativa_aprobada: "Mezcla Asfáltica MD-19 sobre Base Cemento, Geocelda y Barrenos de Cal",
    paquete_estructural_capas: [
      ...base.paquete_estructural_capas,
      { posicion: 7, nombre: "Barrenos de cal en tresbolillo cada 1 m (profundidad 1 m, diámetro 4\")", espesor_cm: 0.0, especificacion_idu: "ET IDU 231-18", tipo_material: "arena" }
    ],
    elementos_estabilizacion_subrasante: {
      tipo: "Barrenos de cal en tresbolillo cada 1 m con perforaciones de 1 m de profundidad (diámetro 4\")",
      diametro_m: 0.10,
      profundidad_m: 1.0,
      distribucion: "Tresbolillo",
      espaciamiento_m: 1.0
    },
    alertas_interventoria: [
      {
        id: "t2_1",
        titulo: "Control del Suelo-Cal",
        tipo: "critical",
        mensaje: "Inspeccionar que los barrenos de cal en tresbolillo estén espaciados exactamente a 1.0 m y tengan una profundidad de 1.0 m para la estabilización química."
      }
    ]
  };
};

const ESTRUCTURA_TIPO_3 = (civId, espesorLosa = 18) => {
  const moduloGeocelda = espesorLosa === 20 ? 2998.5 : 2716.5;
  const moduloSubrasante = espesorLosa === 20 ? 1169.37 : 1095.94;
  return {
    civ_id: civId,
    grupo: "Tipo 3" + (espesorLosa === 20 ? " (Modificada)" : ""),
    nombre_grupo: `Tipo 3${espesorLosa === 20 ? " (Modificada)" : ""}: Pavimento Rígido MR-45 (Sin Mejoramiento de Rasante)`,
    tecnologia_aprobada: "Pavimento Rígido",
    alternativa_aprobada: `Losa de Concreto MR-45 (${espesorLosa} cm) sobre Subbase Estabilizada y Geocelda`,
    periodo_diseno_anos: 20,
    transito_ejes_equivalentes: 4500000,
    datos_geotecnicos: {
      cbr_saturado_promedio_porcentaje: espesorLosa === 20 ? 1.08 : 1.05,
      modulo_resiliente_saturado_psi: moduloSubrasante,
      clasificacion_uscs: "CL (Arcillas de baja plasticidad / lacustres)",
      presion_lambe_mpa: 0.024
    },
    paquete_estructural_capas: [
      { posicion: 1, nombre: `Losa de concreto hidráulico MR-45 (${espesorLosa} cm)`, espesor_cm: parseFloat(espesorLosa), especificacion_idu: "ET IDU 800-18", tipo_material: "concreto", modulo_psi: 4502639 },
      { posicion: 2, nombre: "Subbase reciclada (AR-SBG50) estabilizada con cemento al 5% y aditivo", espesor_cm: 16.0, especificacion_idu: "ET IDU 533-18", tipo_material: "subbase_cemento", modulo_psi: 37000 },
      { posicion: 3, nombre: "Subbase Granular Reciclada (AR-SBG50)", espesor_cm: 10.0, especificacion_idu: "ET IDU 242-18", tipo_material: "subbase", modulo_psi: 19500 },
      { posicion: 4, nombre: "Geomalla multiaxial (resistencia a la fluencia >= 300 kN/m)", espesor_cm: 0.0, espesor_label: "Geomalla", especificacion_idu: "ET IDU 242-18", tipo_material: "geomalla", modulo_psi: 19500 },
      { posicion: 5, nombre: "Subbase Granular Reciclada (AR-SBG50)", espesor_cm: 15.0, especificacion_idu: "ET IDU 242-18", tipo_material: "subbase", modulo_psi: 19500 },
      { posicion: 6, nombre: "Geocelda h=15cm con Subbase Granular Reciclada (AR-SBG50)", espesor_cm: 15.0, especificacion_idu: "ET IDU 412-18", tipo_material: "geocelda", modulo_psi: moduloGeocelda },
      { posicion: 7, nombre: "Geotextil tejido, método de tira ancha > 90 kN/m", espesor_cm: 0.0, especificacion_idu: "ET IDU 411-18", tipo_material: "geotextil" }
    ],
    elementos_estabilizacion_subrasante: {
      tipo: "Sin mejoramiento de rasante",
      diametro_m: 0.0,
      profundidad_m: 0.0,
      distribucion: "N/A",
      espaciamiento_m: 0.0
    },
    alertas_interventoria: [
      {
        id: "t3_1",
        titulo: "Control del Espesor de Losa",
        tipo: "warning",
        mensaje: `Verificar que el espesor de la losa de concreto MR-45 sea exactamente de ${espesorLosa} cm según lo aprobado.`
      }
    ]
  };
};

const ESTRUCTURA_TIPO_4 = (civId, espesorLosa = 18) => {
  const base = ESTRUCTURA_TIPO_3(civId, espesorLosa);
  return {
    ...base,
    grupo: "Tipo 4" + (espesorLosa === 20 ? " (Modificada)" : ""),
    nombre_grupo: `Tipo 4${espesorLosa === 20 ? " (Modificada)" : ""}: Pavimento Rígido MR-45 (Con Mejoramiento de Subrasante)`,
    alternativa_aprobada: `Losa de Concreto MR-45 (${espesorLosa} cm) sobre Subbase Estabilizada, Geocelda y Barrenos de Cal`,
    paquete_estructural_capas: [
      ...base.paquete_estructural_capas,
      { posicion: 8, nombre: "Barrenos de cal en tresbolillo cada 1 m (profundidad 1 m, diámetro 4\")", espesor_cm: 0.0, especificacion_idu: "ET IDU 231-18", tipo_material: "arena" }
    ],
    elementos_estabilizacion_subrasante: {
      tipo: "Barrenos de cal en tresbolillo cada 1 m con perforaciones de 1 m de profundidad (diámetro 4\")",
      diametro_m: 0.10,
      profundidad_m: 1.0,
      distribucion: "Tresbolillo",
      espaciamiento_m: 1.0
    },
    alertas_interventoria: [
      {
        id: "t4_1",
        titulo: "Ejecución de Barrenos de Cal",
        tipo: "critical",
        mensaje: "Supervisar estrictamente la perforación e inyección de cal a 1.0 m de profundidad en tresbolillo."
      }
    ]
  };
};

export const FRENTES_DISENOS = {
  // Frente 1: Tipo 1
  "1002332": ESTRUCTURA_TIPO_1("1002332"),
  // Frente 2: Tipo 4 (18cm)
  "1000067": ESTRUCTURA_TIPO_4("1000067", 18),
  // Frente 3: Tipo 3 (Rigido)
  "1007361": ESTRUCTURA_TIPO_3("1007361", 18),
  // Frente 4: Tipo 4 (18cm)
  "1000086": ESTRUCTURA_TIPO_4("1000086", 18),
  // Frente 5: Tipo 4 Modificada (20cm)
  "1001471": ESTRUCTURA_TIPO_4("1001471", 20),
  // Frente 6: Tipo 2
  "1004836": ESTRUCTURA_TIPO_2("1004836"),
  // Frente 7: Tipo 1B
  "1003131": ESTRUCTURA_TIPO_1B("1003131"),
  // Frente 8: Tipo 3 Modificada (20cm)
  "1001881": ESTRUCTURA_TIPO_3("1001881", 20),
  // Frente 9: Tipo 3 (18cm)
  "1002987": ESTRUCTURA_TIPO_3("1002987", 18),
  // Frente 10: Tipo 2
  "1005246": ESTRUCTURA_TIPO_2("1005246"),
  // Frente 11: Tipo 4 (18cm)
  "1006974": ESTRUCTURA_TIPO_4("1006974", 18),
  // Frente 12: Tipo 1
  "1006799": ESTRUCTURA_TIPO_1("1006799"),
  // Frente 13: Tipo 2
  "1004557": ESTRUCTURA_TIPO_2("1004557"),
  // Frente 14: Tipo 3 Modificada (20cm)
  "1001044": ESTRUCTURA_TIPO_3("1001044", 20),
  // Frente 15: Tipo 3 Modificada (20cm)
  "1000988": ESTRUCTURA_TIPO_3("1000988", 20),
  // Frente 16: Tipo 3 Modificada (20cm)
  "1001202": ESTRUCTURA_TIPO_3("1001202", 20),
  // Frente 17: Tipo 4 (18cm)
  "1007255": ESTRUCTURA_TIPO_4("1007255", 18),
  // Frente 18: Tipo 2
  "1005663": ESTRUCTURA_TIPO_2("1005663"),
  // Frente 19: Tipo 2
  "1005704": ESTRUCTURA_TIPO_2("1005704"),
  // Frente 20: Tipo 4 (18cm)
  "1005491": ESTRUCTURA_TIPO_4("1005491", 18),
  // Frente 21: Tipo 2
  "1005808": ESTRUCTURA_TIPO_2("1005808"),
  // Frente 22: Tipo 1B
  "1008209": ESTRUCTURA_TIPO_1B("1008209"),
  
  // Soporte de compatibilidad hacia atrás para el CIV original de Frente 9
  "1002087": ESTRUCTURA_TIPO_3("1002087", 18)
};

// Helper for default/fallback design (e.g. Espacio Público CIVs)
export function getDisenoForCiv(civId) {
  if (typeof window !== 'undefined') {
    const overrides = JSON.parse(localStorage.getItem('geo_interventoria_design_overrides') || '{}');
    if (overrides[civId]) {
      return overrides[civId];
    }
  }
  if (FRENTES_DISENOS[civId]) {
    return FRENTES_DISENOS[civId];
  }
  
  // Default design for Espacio Público CIVs
  return {
    civ_id: civId,
    grupo: "EP",
    nombre_grupo: "Espacio Público (Andenes y Plazoletas)",
    tecnologia_aprobada: "Adecuación de Espacio Público",
    alternativa_aprobada: "Loseta de Concreto y Adoquín sobre Arena",
    periodo_diseno_anos: 15,
    transito_ejes_equivalentes: 150000,
    datos_geotecnicos: {
      cbr_saturado_promedio_porcentaje: 2.5,
      modulo_resiliente_saturado_psi: 2500,
      clasificacion_uscs: "SM (Limo arenoso / Relleno antrópico)",
      presion_lambe_mpa: 0.005
    },
    paquete_estructural_capas: [
      {
        posicion: 1,
        nombre: "Loseta de Concreto prefabricada / Adoquín de Arcilla peatonal",
        espesor_cm: 8.0,
        especificacion_idu: "ET IDU 610-18 / 611-18",
        tipo_material: "concreto"
      },
      {
        posicion: 2,
        nombre: "Capa de Asiento en Arena limpia de río",
        espesor_cm: 3.0,
        especificacion_idu: "ET IDU 610-18",
        tipo_material: "arena"
      },
      {
        posicion: 3,
        nombre: "Subbase Granular clase C",
        espesor_cm: 15.0,
        especificacion_idu: "ET IDU 500-18",
        tipo_material: "subbase"
      },
      {
        posicion: 4,
        nombre: "Geotextil No Tejido de separación y filtración NT-2000",
        espesor_cm: 0.2,
        especificacion_idu: "ET IDU 411-18",
        tipo_material: "geotextil"
      }
    ],
    elementos_estabilizacion_subrasante: {
      tipo: "Compactación mecánica de la subrasante al 95% del Proctor Modificado",
      diametro_m: 0.0,
      profundidad_m: 0.30,
      distribucion: "Uniforme",
      espaciamiento_m: 0.0
    },
    alertas_interventoria: [
      {
        id: "ep_1",
        titulo: "Verificación de Pendientes y Drenajes",
        tipo: "warning",
        mensaje: "Validar pendientes mínimas del 2% hacia las cunetas para evitar encharcamientos sobre las losetas peatonales."
      },
      {
        id: "ep_2",
        titulo: "Confinamiento Lateral del Adoquín",
        tipo: "critical",
        mensaje: "Es obligatorio inspeccionar el vaciado y curado del bordillo de confinamiento lateral antes de colocar la capa de arena, para evitar el desplazamiento de adoquines."
      }
    ]
  };
}

export const DESIGN_TEMPLATES = {
  template_1_flexible: {
    grupo: "Plantilla 1",
    nombre_grupo: "Flexible: Asfalto 12cm / Base Cemento / Geocelda (Tipo 1)",
    tecnologia_aprobada: "Pavimento Flexible",
    alternativa_aprobada: "Mezcla Asfáltica MD-19 sobre Base Cemento y Geoceldas",
    periodo_diseno_anos: 15,
    transito_ejes_equivalentes: 800000,
    datos_geotecnicos: {
      cbr_saturado_promedio_porcentaje: 1.09,
      modulo_resiliente_saturado_psi: 1135.65,
      clasificacion_uscs: "CL (Arcilla de alta plasticidad)",
      presion_lambe_mpa: 0.021
    },
    paquete_estructural_capas: [
      { posicion: 1, nombre: "Mezcla asfáltica (MD-19-ET-620-18 (MD-12) y MCCH25)", espesor_cm: 12.0, especificacion_idu: "620-18", tipo_material: "asfalto", modulo_psi: 345000 },
      { posicion: 2, nombre: "Imprimación Emulsión asfáltica CRL-1", espesor_cm: 0.0, especificacion_idu: "202-18", tipo_material: "imprimacion" },
      { posicion: 3, nombre: "Base Granular (BG38) estabilizada con 5% de cemento y aditivo", espesor_cm: 20.0, especificacion_idu: "520-18", tipo_material: "base_cemento", modulo_psi: 37000 },
      { posicion: 4, nombre: "Subbase Granular Reciclada (AR-SBG50) mejorada con Geomalla multiaxial", espesor_cm: 25.0, especificacion_idu: "520-18", tipo_material: "geomalla", modulo_psi: 19500 },
      { posicion: 5, nombre: "Geocelda h=15cm con lleno de Subbase Granular Reciclada (AR-SBG50)", espesor_cm: 15.0, especificacion_idu: "412-18", tipo_material: "geocelda", modulo_psi: 2814.9 },
      { posicion: 6, nombre: "Geotextil tejido, método de tira ancha >90 kN/m", espesor_cm: 0.0, especificacion_idu: "411-18", tipo_material: "geotextil" }
    ]
  },
  template_2_rigido: {
    grupo: "Plantilla 2",
    nombre_grupo: "Rígido: Concreto 18cm / Geocelda / Barrenos (Tipo 4)",
    tecnologia_aprobada: "Pavimento Rígido (Concreto)",
    alternativa_aprobada: "Losa de Concreto MR-45 sobre Subbase Estabilizada y Geoceldas",
    periodo_diseno_anos: 20,
    transito_ejes_equivalentes: 4500000,
    datos_geotecnicos: {
      cbr_saturado_promedio_porcentaje: 1.05,
      modulo_resiliente_saturado_psi: 1095.94,
      clasificacion_uscs: "CL (Arcilla lacustre de alta plasticidad)",
      presion_lambe_mpa: 0.030
    },
    paquete_estructural_capas: [
      { posicion: 1, nombre: "Losa de concreto MR-45", espesor_cm: 18.0, especificacion_idu: "800-18", tipo_material: "concreto", modulo_psi: 4502639 },
      { posicion: 2, nombre: "Subbase reciclada (AR-SBG50) estabilizada con cemento 5% y aditivo", espesor_cm: 16.0, especificacion_idu: "533-18", tipo_material: "subbase_cemento", modulo_psi: 37000 },
      { posicion: 3, nombre: "Subbase Granular Reciclada (AR-SBG50)", espesor_cm: 10.0, especificacion_idu: "242-18", tipo_material: "subbase", modulo_psi: 19500 },
      { posicion: 4, nombre: "Geomalla multiaxial resistencia a la fluencia >= 300 kN/m", espesor_cm: 0.0, espesor_label: "Geomalla", especificacion_idu: "242-18", tipo_material: "geomalla", modulo_psi: 19500 },
      { posicion: 5, nombre: "Subbase Granular Reciclada (AR-SBG50)", espesor_cm: 15.0, especificacion_idu: "242-18", tipo_material: "subbase", modulo_psi: 19500 },
      { posicion: 6, nombre: "Geocelda h=15cm con Subbase Granular Reciclada (AR-SBG50)", espesor_cm: 15.0, especificacion_idu: "412-18", tipo_material: "geocelda", modulo_psi: 2716.5 },
      { posicion: 7, nombre: "Geotextil tejido, método de tira ancha >90 kN/m", espesor_cm: 0.0, especificacion_idu: "411-18", tipo_material: "geotextil" },
      { posicion: 8, nombre: "Barrenos de cal en tresbolillo cada 1 m con perforaciones de 1 m", espesor_cm: 0.0, especificacion_idu: "231-18", tipo_material: "arena" }
    ],
    elementos_estabilizacion_subrasante: {
      tipo: "Barrenos de cal en tresbolillo cada 1 m con perforaciones de 1 m de profundidad",
      diametro_m: 0.10,
      profundidad_m: 1.0,
      distribucion: "Tresbolillo",
      espaciamiento_m: 1.0
    }
  }
};
