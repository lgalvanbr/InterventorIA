import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ProjectDetail from './components/ProjectDetail';
import ReportsView from './components/ReportsView';
import ConfigView from './components/ConfigView';
import FrentesControl from './components/FrentesControl';
import WeeklyReports from './components/WeeklyReports';
import WeeklyFrenteDetail from './components/WeeklyFrenteDetail';
import WeeklyReportPanel from './components/WeeklyReportPanel';
import EngineersView from './components/EngineersView';
import InspectorPortal from './components/InspectorPortal';
import MapView from './components/MapView';
import ProjectInfo from './components/ProjectInfo';
import { initializeWeeklyReports, calculateConsolidatedMetrics } from './data/reportsWeekly';

// Helper to initialize compliance list of checks for Colombian regulations
const createDefaultCompliance = (checkedAll = false) => {
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

// 22 Geolocalizados Frentes de Obra for Malla Vial
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
  { civ: '1008209', eje: 'Carrera 8C', desde: 'CL 167D', hasta: 'CL 168', type: 'Intermedia', area: 544.83, lat: '4.745266', lng: '-74.026888', status: 'al-dia', progress: 100, plannedProgress: 100, supervisor: 'Ing. Diana Guerrero' }
];

// 20 Geolocalizados Frentes de Obra for Espacio Público
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
  { civ: '1000720', pk: '20013130', eje: 'Calle 185 C bis', desde: 'Kr 3ª', hasta: 'Kr 4', area: 253.41, lat: '4.762149', lng: '-74.024926', status: 'al-dia', progress: 95, plannedProgress: 95, supervisor: 'Ing. Andrés Castro' }
];

// Generator to build enriched frentes list from raw configurations
const generateFrentes = (rawList, isMallaVial) => {
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
      id: `${isMallaVial ? 'f_mv' : 'f_ep'}_${index + 1}`,
      frente: isMallaVial ? (index + 1) : (index + 101),
      civ: f.civ,
      eje: f.eje,
      desde: f.desde,
      hasta: f.hasta,
      name: `${isMallaVial ? 'Malla Vial' : 'Espacio Público'} - CIV ${f.civ} (${f.eje})`,
      description: f.description || `Tramo: ${f.desde} hasta ${f.hasta} - Área: ${f.area} m2 - Malla: ${f.type || 'N/A'}`,
      latitude: f.lat,
      longitude: f.lng,
      supervisor: 'Ing. Luis Carlos Galvan',
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

const getSeededProjects = () => {
  return [
    {
      id: 'project_1',
      name: 'Conservación de la Malla Vial Local e Intermedia - Localidad de Usaquén',
      contractNo: 'IDU-2026-CO301',
      contractor: 'Consorcio Malla Vial Bogotá 2026',
      constructionBudget: 22800000000,
      interventoriaBudget: 1720000000,
      duration: 18,
      plannedProgress: 68,
      description: 'Actividades de conservación, rehabilitación, parcheo y reconstrucción de la malla vial local e intermedia en la localidad de Usaquén en Bogotá D.C.',
      frentes: generateFrentes(MALLA_VIAL_FRENTES_RAW, true)
    },
    {
      id: 'project_2',
      name: 'Conservación y Adecuación de Espacio Público - Localidad de Usaquén',
      contractNo: 'IDU-2026-CO302',
      contractor: 'Infraestructuras de los Andes S.A.S.',
      constructionBudget: 14500000000,
      interventoriaBudget: 1150000000,
      duration: 15,
      plannedProgress: 58,
      description: 'Actividades de conservación, reparación y adecuación del espacio público (andenes, vados peatonales, plazoletas) en la localidad de Usaquén en Bogotá D.C.',
      frentes: generateFrentes(ESPACIO_PUBLICO_FRENTES_RAW, false)
    }
  ];
};

const saveWeeklyReportsToStorage = (reports) => {
  try {
    localStorage.setItem('geo_interventoria_weekly_reports', JSON.stringify(reports));
  } catch (err) {
    console.error("Error saving weekly reports to localStorage (quota exceeded):", err);
  }
};

export default function App() {
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeFrenteId, setActiveFrenteId] = useState(null);
  const [view, setView] = useState('dashboard'); // 'dashboard', 'project-detail', 'reports', 'config', 'weekly-detail'
  const [weeklyReports, setWeeklyReports] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [selectedDetailFrenteId, setSelectedDetailFrenteId] = useState(null);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isInspectorMode, setIsInspectorMode] = useState(false);
  const [designOverrides, setDesignOverrides] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('geo_interventoria_design_overrides') || '{}');
    } catch (e) {
      return {};
    }
  });

  const handleUpdateDesignOverrides = (newOverrides) => {
    setDesignOverrides(newOverrides);
    localStorage.setItem('geo_interventoria_design_overrides', JSON.stringify(newOverrides));
    fetch('/api/design-overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOverrides)
    }).catch(err => console.error("Error syncing design overrides to Supabase:", err));
  };

  // Load from localStorage or set defaults
  useEffect(() => {
    let loadedProjects = [];
    const savedProjects = localStorage.getItem('geo_interventoria_projects_v7');
    if (savedProjects) {
      try {
        loadedProjects = JSON.parse(savedProjects);
        setProjects(loadedProjects);
      } catch (e) {
        console.error("Error al cargar de localStorage, cargando datos por defecto:", e);
        loadedProjects = getSeededProjects();
        setProjects(loadedProjects);
        localStorage.setItem('geo_interventoria_projects_v7', JSON.stringify(loadedProjects));
      }
    } else {
      loadedProjects = getSeededProjects();
      setProjects(loadedProjects);
      localStorage.setItem('geo_interventoria_projects_v7', JSON.stringify(loadedProjects));
    }

    // Fetch design overrides from Supabase and save to local storage
    fetch('/api/design-overrides')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          localStorage.setItem('geo_interventoria_design_overrides', JSON.stringify(data));
          setDesignOverrides(data);
        }
      })
      .catch(err => console.warn("Error loading design overrides from cloud:", err));

    // Fetch project info from Supabase and save to local storage
    fetch('/api/project-info')
      .then(res => res.json())
      .then(data => {
        if (data && data.objeto) {
          localStorage.setItem('geo_interventoria_project_info_v1', JSON.stringify(data));
        }
      })
      .catch(err => console.warn("Error loading project info from cloud:", err));

    // Load weekly reports from local server API database or localStorage fallback
    const localWeekly = localStorage.getItem('geo_interventoria_weekly_reports');
    if (localWeekly) {
      try {
        setWeeklyReports(JSON.parse(localWeekly));
      } catch (e) {
        console.error("Error loading weekly reports from localStorage:", e);
      }
    }

    fetch('/api/weekly-reports')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setWeeklyReports(data);
          saveWeeklyReportsToStorage(data);
        } else if (!localWeekly) {
          const allFrentes = loadedProjects.flatMap(p => 
            (p.frentes || []).map(f => {
              const civMatch = f.civ || (f.name?.match(/CIV\s+(\d+)/i)?.[1] || '');
              const ejeMatch = f.eje || (f.name?.match(/\(([^)]+)\)/)?.[1] || f.name || '');
              let frenteNum = f.frente;
              if (!frenteNum && f.id) {
                const parts = f.id.split('_');
                if (parts.length >= 3) {
                  const num = parseInt(parts[2]);
                  if (parts[1] === 'mv') frenteNum = num;
                  else if (parts[1] === 'ep') frenteNum = num + 100;
                }
              }
              return {
                ...f,
                frente: frenteNum || '',
                civ: civMatch,
                eje: ejeMatch,
                projectName: p.name,
                contractNo: p.contractNo
              };
            })
          );
          const seededWeekly = initializeWeeklyReports(allFrentes);
          setWeeklyReports(seededWeekly);
          saveWeeklyReportsToStorage(seededWeekly);
          
          fetch('/api/weekly-reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(seededWeekly)
          }).catch(err => console.error("Error saving seeded reports to disk:", err));
        }
      })
      .catch(err => {
        console.error("Error loading weekly reports from API:", err);
      });

    // Default active project
    const savedActiveId = localStorage.getItem('geo_interventoria_active_id');
    if (savedActiveId) {
      setActiveProjectId(savedActiveId);
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'inspector') {
      setIsInspectorMode(true);
      setView('inspector-portal');
    } else if (params.get('mode') === 'map') {
      setView('map-only');
    }
  }, []);

  const saveProjects = (updatedProjects) => {
    setProjects(updatedProjects);
    localStorage.setItem('geo_interventoria_projects_v7', JSON.stringify(updatedProjects));
  };

  const handleUpdateWeeklyReports = (updatedReports) => {
    setWeeklyReports(updatedReports);
    saveWeeklyReportsToStorage(updatedReports);
    fetch('/api/weekly-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedReports)
    }).catch(err => console.error("Error saving updated reports to disk:", err));
  };

  const handleSaveFrenteData = (reportId, frenteId, updatedData) => {
    const updatedReports = weeklyReports.map(r => {
      if (r.id_informe === reportId) {
        const newFrentes = r.frentes.map(f => {
          if (f.id === frenteId) {
            return {
              ...f,
              ...updatedData
            };
          }
          return f;
        });
        return calculateConsolidatedMetrics(newFrentes, r);
      }
      return r;
    });
    handleUpdateWeeklyReports(updatedReports);
  };

  const handleAddProject = (newProject) => {
    const updated = [newProject, ...projects];
    saveProjects(updated);
  };

  const handleSelectProject = (projectId) => {
    setActiveProjectId(projectId);
    localStorage.setItem('geo_interventoria_active_id', projectId);
    
    // Auto-focus first frente
    const proj = projects.find(p => p.id === projectId);
    if (proj && proj.frentes?.length > 0) {
      setActiveFrenteId(proj.frentes[0].id);
    } else {
      setActiveFrenteId(null);
    }
    
    setView('project-detail');
  };

  const handleUpdateProject = (updatedProject, shouldDelete = false) => {
    if (shouldDelete) {
      const updated = projects.filter(p => p.id !== activeProjectId);
      saveProjects(updated);
      setView('dashboard');
      setActiveProjectId(null);
      localStorage.removeItem('geo_interventoria_active_id');
      setActiveFrenteId(null);
      return;
    }

    const updated = projects.map(p => p.id === updatedProject.id ? updatedProject : p);
    saveProjects(updated);
  };

  const handleViewChange = (newView) => {
    if (newView === 'project-detail') {
      // If navigating directly from sidebar to map view, reset active project to show unified map
      setActiveProjectId(null);
      localStorage.removeItem('geo_interventoria_active_id');
      setActiveFrenteId(null);
    }
    setView(newView);
  };

  const activeProject = projects.find(p => p.id === activeProjectId) || null;

  // Build a virtual consolidated project to show all 42 frentes of both contracts
  const getUnifiedProject = () => {
    return {
      id: 'unified_project',
      name: 'Consolidado General - Usaquén (Vial y Espacio Público)',
      contractNo: 'IDU-Usaquén-2026-CONS',
      contractor: 'Consorcios Bogotá Conservación (Consolidado)',
      constructionBudget: projects.reduce((acc, curr) => acc + (curr.constructionBudget || 0), 0),
      interventoriaBudget: projects.reduce((acc, curr) => acc + (curr.interventoriaBudget || 0), 0),
      duration: 18,
      plannedProgress: 63,
      description: 'Vista integrada y georreferenciada de los tramos de Malla Vial y adecuaciones de Espacio Público activos en la localidad de Usaquén.',
      frentes: projects.flatMap(p => p.frentes || [])
    };
  };

  const handleUpdateProjectOrUnified = (updatedProject, shouldDelete = false) => {
    if (activeProjectId) {
      handleUpdateProject(updatedProject, shouldDelete);
    } else {
      // Propagate edits to the sub-projects containing the frentes
      const updatedFrentes = updatedProject.frentes;
      const newProjects = projects.map(p => {
        const subFrentes = updatedFrentes.filter(uf => {
          // Check prefix mapping (f_mv for project_1, f_ep for project_2)
          if (p.id === 'project_1') return uf.id.startsWith('f_mv');
          if (p.id === 'project_2') return uf.id.startsWith('f_ep');
          return false;
        });
        return {
          ...p,
          frentes: subFrentes
        };
      });
      saveProjects(newProjects);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f7f9fb] text-on-surface">
      {/* Sidebar Navigation */}
      {!isInspectorMode && view !== 'map-only' && (
        <Sidebar 
          currentView={view} 
          onViewChange={handleViewChange} 
          activeProjectId={activeProjectId}
          isExpanded={isSidebarHovered}
          onMouseEnter={() => setIsSidebarHovered(true)}
          onMouseLeave={() => setIsSidebarHovered(false)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Main Content routing with dynamic padding-left for sidebar offset */}
      <div className={`flex-1 transition-all duration-300 min-w-0 ${(isInspectorMode || view === 'map-only') ? 'pl-0' : (isSidebarHovered ? 'md:pl-64 pl-0' : 'md:pl-16 pl-0')}`}>
        {/* Mobile Header Bar */}
        {!isInspectorMode && view !== 'map-only' && (
          <header className="flex items-center gap-3 bg-white border-b border-slate-200 px-4 py-3 md:hidden sticky top-0 z-30 shadow-xs">
            <button 
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 text-slate-650 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer flex items-center justify-center border-none bg-transparent"
              aria-label="Abrir menú"
            >
              <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl font-bold">construction</span>
              <span className="font-headline-md text-sm font-black text-primary tracking-tight">INCOLTA SAS</span>
            </div>
          </header>
        )}
        {view === 'dashboard' && (
          <Dashboard 
            projects={projects} 
            onSelectProject={handleSelectProject} 
            onAddProject={handleAddProject}
          />
        )}

        {view === 'project-detail' && (
          <ProjectDetail 
            project={activeProject || getUnifiedProject()} 
            onBack={() => {
              setView('dashboard');
              setActiveProjectId(null);
              localStorage.removeItem('geo_interventoria_active_id');
              setActiveFrenteId(null);
            }} 
            onResetToUnified={() => {
              setActiveProjectId(null);
              localStorage.removeItem('geo_interventoria_active_id');
              setActiveFrenteId(null);
            }}
            onUpdateProject={handleUpdateProjectOrUnified}
            isUnified={!activeProjectId}
            activeFrenteId={activeFrenteId}
            onFrenteSelect={(frenteId) => {
              if (!activeProjectId) {
                // Unified view: find which project contains this frente!
                const parentProj = projects.find(p => p.frentes?.some(f => f.id === frenteId));
                if (parentProj) {
                  // Switch project dynamically!
                  setActiveProjectId(parentProj.id);
                  localStorage.setItem('geo_interventoria_active_id', parentProj.id);
                  setActiveFrenteId(frenteId);
                }
              } else {
                setActiveFrenteId(frenteId);
              }
            }}
          />
        )}

        {view === 'reports' && (
          <ReportsView 
            projects={projects}
          />
        )}

        {view === 'frentes-control' && (
          <FrentesControl 
            projects={projects}
            designOverrides={designOverrides}
            onUpdateDesignOverrides={handleUpdateDesignOverrides}
          />
        )}

        {view === 'project-info' && (
          <ProjectInfo />
        )}

        {view === 'weekly-reports' && (
          <WeeklyReports 
            weeklyReports={weeklyReports}
            onUpdateReports={handleUpdateWeeklyReports}
            onNavigateToDetail={(reportId, frenteId) => {
              setSelectedReportId(reportId);
              setSelectedDetailFrenteId(frenteId);
              setView('weekly-detail');
            }}
          />
        )}

        {view === 'weekly-detail' && (
          <WeeklyReportPanel 
            report={weeklyReports.find(r => r.id_informe === selectedReportId)}
            weeklyReports={weeklyReports}
            initialEditingFrenteId={selectedDetailFrenteId}
            allFrentes={projects.flatMap(p => p.frentes || [])}
            designOverrides={designOverrides}
            onUpdateDesignOverrides={handleUpdateDesignOverrides}
            onClose={() => {
              setView('weekly-reports');
              setSelectedReportId(null);
              setSelectedDetailFrenteId(null);
            }}
            onSaveFrente={(updatedFrente) => {
              const updatedReports = weeklyReports.map(r => {
                if (r.id_informe === selectedReportId) {
                  const newFrentes = r.frentes.map(f => f.id === updatedFrente.id ? updatedFrente : f);
                  return calculateConsolidatedMetrics(newFrentes, r);
                }
                return r;
              });
              handleUpdateWeeklyReports(updatedReports);
            }}
            onSaveReport={(updatedReport) => {
              const updatedReports = weeklyReports.map(r => r.id_informe === updatedReport.id_informe ? updatedReport : r);
              handleUpdateWeeklyReports(updatedReports);
            }}
          />
        )}

        {view === 'config' && (
          <ConfigView projects={projects} />
        )}

        {view === 'engineers' && (
          <EngineersView projects={projects} onUpdateProjects={saveProjects} />
        )}

        {view === 'inspector-portal' && (
          <InspectorPortal 
            weeklyReports={weeklyReports}
            onSaveFrenteData={handleSaveFrenteData}
          />
        )}

        {view === 'map-only' && (
          <div className="map-only-view">
            <MapView 
              frentes={projects.flatMap(p => p.frentes || [])}
              isUnified={true}
            />
            
            <style dangerouslySetInnerHTML={{ __html: `
              .map-only-view {
                width: 100vw;
                height: 100vh;
                display: flex;
                flex-direction: column;
                background-color: #f8fafc;
              }
              .map-only-view .map-card {
                flex: 1;
                height: 100% !important;
                border: none !important;
                border-radius: 0 !important;
              }
              .map-only-view .map-wrapper {
                flex: 1;
                height: 100%;
              }
            `}} />
          </div>
        )}
      </div>
    </div>
  );
}
