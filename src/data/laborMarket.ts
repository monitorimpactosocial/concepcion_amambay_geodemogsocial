import { CENSUS, type DeptKey, type AgeGroup } from './census2022';
import { computeImpacto, ESCENARIOS_PRESET, type EscenarioKey, type ImpactoParams } from './impactoEngine';
import { getProjection, type ScenarioKey } from './projectionEngine';
import { SOCIAL_INDICATORS } from './socialIndicators';

export const LABOR_MARKET_SOURCE =
  'INE Censo 2022, INE/EPH 2022 y simulacion propia PARACEL; cifras de salarios e impactos sujetas a verificacion.';

export interface LaborIncomeYear {
  anio: number;
  etapa: 'historico' | 'actual' | 'proyectado';
  poblacionEdadActiva: number;
  tasaActividadPct: number;
  pea: number;
  tasaOcupacionPct: number;
  ocupados: number;
  salarioMedioGs: number;
  ingresoLaboralMensualGs: number;
  ingresoParacelMensualGs: number;
}

interface LaborRatePoint {
  anio: number;
  activityPct: number;
  occupationPct: number;
  salaryGs: number;
  workingAgeFactor: number;
}

const HISTORICAL_LABOR_RATES: Record<DeptKey, LaborRatePoint[]> = {
  concepcion: [
    { anio: 2012, activityPct: 59.4, occupationPct: 91.2, salaryGs: 1_620_000, workingAgeFactor: 0.88 },
    { anio: 2017, activityPct: 60.8, occupationPct: 92.4, salaryGs: 1_980_000, workingAgeFactor: 0.94 },
    { anio: 2022, activityPct: 62.5, occupationPct: 93.5, salaryGs: 2_420_000, workingAgeFactor: 1.00 },
  ],
  amambay: [
    { anio: 2012, activityPct: 64.2, occupationPct: 90.6, salaryGs: 1_760_000, workingAgeFactor: 0.90 },
    { anio: 2017, activityPct: 65.1, occupationPct: 91.7, salaryGs: 2_120_000, workingAgeFactor: 0.95 },
    { anio: 2022, activityPct: 67.8, occupationPct: 92.8, salaryGs: 2_620_000, workingAgeFactor: 1.00 },
  ],
};

const IMPACT_ACTIVITY_BONUS: Record<EscenarioKey, number> = {
  conservador: 0.8,
  medio: 1.8,
  transformador: 3.2,
};

const IMPACT_OCCUPATION_BONUS: Record<EscenarioKey, number> = {
  conservador: 0.4,
  medio: 1.0,
  transformador: 1.7,
};

const DEPT_PROJECT_SHARE: Record<DeptKey, number> = {
  concepcion: 0.72,
  amambay: 0.28,
};

const WORKING_AGE_GROUP_START = 3;
const WORKING_AGE_GROUP_END = 12;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sumBy<T>(items: T[], getter: (item: T) => number): number {
  return items.reduce((sum, item) => sum + getter(item), 0);
}

export function workingAgeFromPyramid(pyramid: AgeGroup[]): number {
  return pyramid
    .slice(WORKING_AGE_GROUP_START, WORKING_AGE_GROUP_END + 1)
    .reduce((sum, group) => sum + group.varones + group.mujeres, 0);
}

function getSocialKey(dept: DeptKey): 'concepcion_total' | 'amambay_total' {
  return dept === 'concepcion' ? 'concepcion_total' : 'amambay_total';
}

function weightedAverage(values: Array<{ value: number; weight: number }>): number {
  const totalWeight = sumBy(values, (item) => item.weight);
  if (!totalWeight) return 0;
  return sumBy(values, (item) => item.value * item.weight) / totalWeight;
}

function projectStageFactor(anio: number, params: ImpactoParams): number {
  const finObra = params.anioInicioObra + params.duracionObraAnios;
  const operacion = finObra + 1;

  if (anio < params.anioInicioObra) return 0;
  if (anio <= finObra) {
    return clamp(0.45 + (anio - params.anioInicioObra) * 0.22, 0.45, 1);
  }
  if (anio < operacion + 3) {
    return clamp(0.72 + (anio - finObra) * 0.12, 0.72, 1);
  }
  return 1;
}

function projectedActivityRate(dept: DeptKey, anio: number, impactScenario: EscenarioKey, params: ImpactoParams): number {
  const base = SOCIAL_INDICATORS[getSocialKey(dept)].empleo.tasa_actividad_pct;
  const demographicTrend = Math.min(3.6, Math.max(0, anio - 2022) * 0.08);
  const paracelBonus = projectStageFactor(anio, params) * IMPACT_ACTIVITY_BONUS[impactScenario];
  return clamp(base + demographicTrend + paracelBonus, 45, 78);
}

function projectedOccupationRate(dept: DeptKey, anio: number, impactScenario: EscenarioKey, params: ImpactoParams): number {
  const base = SOCIAL_INDICATORS[getSocialKey(dept)].empleo.tasa_ocupacion_pct;
  const paracelBonus = projectStageFactor(anio, params) * IMPACT_OCCUPATION_BONUS[impactScenario];
  return clamp(base + paracelBonus, 88, 97.5);
}

function nominalSalaryTrend(dept: DeptKey, anio: number): number {
  const base = HISTORICAL_LABOR_RATES[dept].find((row) => row.anio === 2022)?.salaryGs ?? 2_500_000;
  return base * Math.pow(1.045, Math.max(0, anio - 2022));
}

function projectPayrollByDept(dept: DeptKey, anio: number, params: ImpactoParams): {
  jobs: number;
  payrollMonthlyGs: number;
} {
  const impact = computeImpacto(params);
  const localShare = params.capturaLocal_pct / 100;
  const stage = projectStageFactor(anio, params);
  if (!stage) return { jobs: 0, payrollMonthlyGs: 0 };

  const obraMode = anio <= impact.anioFinObra;
  const directJobs = obraMode ? params.empleoDirectoObra : impact.empleoDirectoTotal;
  const indirectJobs = obraMode
    ? Math.round(params.empleoDirectoObra * Math.max(1.8, params.multiplicadorIndirecto * 0.65))
    : impact.empleoIndirecto;
  const inducedJobs = obraMode
    ? Math.round((directJobs * params.salarioMensualGs * 12 * localShare / 1_000_000_000) * params.coeficienteInducido * 0.45)
    : impact.empleoInducido;

  const regionalJobs = Math.round((directJobs * localShare + indirectJobs * localShare + inducedJobs) * stage);
  const regionalPayroll =
    (directJobs * localShare * params.salarioMensualGs +
      indirectJobs * localShare * params.salarioMensualGs * 0.74 +
      inducedJobs * params.salarioMensualGs * 0.55) * stage;

  return {
    jobs: Math.round(regionalJobs * DEPT_PROJECT_SHARE[dept]),
    payrollMonthlyGs: Math.round(regionalPayroll * DEPT_PROJECT_SHARE[dept]),
  };
}

function buildHistoricalYear(keys: DeptKey[], anio: number): LaborIncomeYear {
  const rows = keys.map((dept) => {
    const rate = HISTORICAL_LABOR_RATES[dept].find((item) => item.anio === anio) ?? HISTORICAL_LABOR_RATES[dept][0];
    const workingAgeBase = workingAgeFromPyramid(CENSUS[dept].piramide);
    const poblacionEdadActiva = Math.round(workingAgeBase * rate.workingAgeFactor);
    const pea = Math.round(poblacionEdadActiva * rate.activityPct / 100);
    const ocupados = Math.round(pea * rate.occupationPct / 100);

    return {
      poblacionEdadActiva,
      activityPct: rate.activityPct,
      occupationPct: rate.occupationPct,
      pea,
      ocupados,
      salaryGs: rate.salaryGs,
    };
  });

  const poblacionEdadActiva = sumBy(rows, (row) => row.poblacionEdadActiva);
  const pea = sumBy(rows, (row) => row.pea);
  const ocupados = sumBy(rows, (row) => row.ocupados);
  const salarioMedioGs = weightedAverage(rows.map((row) => ({ value: row.salaryGs, weight: row.ocupados })));

  return {
    anio,
    etapa: anio === 2022 ? 'actual' : 'historico',
    poblacionEdadActiva,
    tasaActividadPct: poblacionEdadActiva ? pea / poblacionEdadActiva * 100 : 0,
    pea,
    tasaOcupacionPct: pea ? ocupados / pea * 100 : 0,
    ocupados,
    salarioMedioGs: Math.round(salarioMedioGs),
    ingresoLaboralMensualGs: Math.round(ocupados * salarioMedioGs),
    ingresoParacelMensualGs: 0,
  };
}

function buildProjectedYear(
  keys: DeptKey[],
  projectionScenario: ScenarioKey,
  impactScenario: EscenarioKey,
  params: ImpactoParams,
  anio: number,
): LaborIncomeYear {
  const rows = keys.map((dept) => {
    const projectionSeries = getProjection(dept, projectionScenario);
    const projection = projectionSeries.find((row) => row.anio === anio) ??
      projectionSeries[projectionSeries.length - 1];
    const poblacionEdadActiva = workingAgeFromPyramid(projection.piramide);
    const activityRate = projectedActivityRate(dept, anio, impactScenario, params);
    const occupationRate = projectedOccupationRate(dept, anio, impactScenario, params);
    const pea = Math.round(poblacionEdadActiva * activityRate / 100);
    const project = projectPayrollByDept(dept, anio, params);
    const ocupados = Math.max(project.jobs, Math.round(pea * occupationRate / 100));
    const trendSalary = nominalSalaryTrend(dept, anio);
    const baselineJobs = Math.max(1, ocupados - project.jobs);
    const salarioMedioGs = project.jobs > 0
      ? ((baselineJobs * trendSalary) + project.payrollMonthlyGs) / Math.max(1, baselineJobs + project.jobs)
      : trendSalary;

    return {
      poblacionEdadActiva,
      pea,
      ocupados,
      activityRate,
      occupationRate,
      salarioMedioGs,
      ingresoParacelMensualGs: project.payrollMonthlyGs,
    };
  });

  const poblacionEdadActiva = sumBy(rows, (row) => row.poblacionEdadActiva);
  const pea = sumBy(rows, (row) => row.pea);
  const ocupados = sumBy(rows, (row) => row.ocupados);
  const salarioMedioGs = weightedAverage(rows.map((row) => ({ value: row.salarioMedioGs, weight: row.ocupados })));
  const ingresoParacelMensualGs = sumBy(rows, (row) => row.ingresoParacelMensualGs);

  return {
    anio,
    etapa: anio === 2022 ? 'actual' : 'proyectado',
    poblacionEdadActiva,
    tasaActividadPct: poblacionEdadActiva ? pea / poblacionEdadActiva * 100 : 0,
    pea,
    tasaOcupacionPct: pea ? ocupados / pea * 100 : 0,
    ocupados,
    salarioMedioGs: Math.round(salarioMedioGs),
    ingresoLaboralMensualGs: Math.round(ocupados * salarioMedioGs),
    ingresoParacelMensualGs,
  };
}

export function buildLaborIncomeTimeline(
  keys: DeptKey[],
  projectionScenario: ScenarioKey,
  impactScenario: EscenarioKey,
  horizonYear = 2052,
  customParams?: ImpactoParams,
): LaborIncomeYear[] {
  const params = customParams ?? ESCENARIOS_PRESET[impactScenario];
  const finalYear = Math.max(2052, horizonYear);
  const rows = [2012, 2017, 2022].map((anio) => buildHistoricalYear(keys, anio));

  for (let anio = 2023; anio <= finalYear; anio += 1) {
    rows.push(buildProjectedYear(keys, projectionScenario, impactScenario, params, anio));
  }

  return rows;
}

export function getLaborYear(rows: LaborIncomeYear[], anio: number): LaborIncomeYear {
  return rows.find((row) => row.anio === anio) ?? rows[rows.length - 1];
}

export function splitLaborSeries(rows: LaborIncomeYear[]) {
  return rows.map((row) => ({
    ...row,
    peaHistorico: row.etapa === 'historico' ? row.pea : null,
    peaActual: row.etapa === 'actual' ? row.pea : null,
    peaProyectado: row.etapa === 'proyectado' ? row.pea : null,
    ocupadosHistorico: row.etapa === 'historico' ? row.ocupados : null,
    ocupadosActual: row.etapa === 'actual' ? row.ocupados : null,
    ocupadosProyectado: row.etapa === 'proyectado' ? row.ocupados : null,
    salarioHistorico: row.etapa === 'historico' ? row.salarioMedioGs : null,
    salarioActual: row.etapa === 'actual' ? row.salarioMedioGs : null,
    salarioProyectado: row.etapa === 'proyectado' ? row.salarioMedioGs : null,
  }));
}
