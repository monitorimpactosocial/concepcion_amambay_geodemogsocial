import type { GlobalFilters } from '../types';
import {
  CENSUS,
  getDeptStats,
  type AgeGroup,
  type DepartmentCensus,
  type DeptKey,
} from '../data/census2022';
import { getProjection, type ProjectionYear, type ScenarioKey } from '../data/projectionEngine';

export const DEFAULT_PROJECTION_HORIZON = 2042;

export const PARACEL_MILESTONES = [
  { anio: 2022, label: 'Base Censo 2022' },
  { anio: 2025, label: 'Movimiento de suelo' },
  { anio: 2026, label: 'Financiamiento y obra' },
  { anio: 2029, label: 'Operacion plena estimada' },
] as const;

export function deptKeyFromDepartmentCode(code: GlobalFilters['activeDepartment']): DeptKey | null {
  if (code === '01') return 'concepcion';
  if (code === '13') return 'amambay';
  return null;
}

export function deptKeysFromFilters(filters?: GlobalFilters): DeptKey[] {
  const active = deptKeyFromDepartmentCode(filters?.activeDepartment ?? null);
  return active ? [active] : ['concepcion', 'amambay'];
}

export function primaryDeptFromFilters(filters?: GlobalFilters): DeptKey {
  return deptKeysFromFilters(filters)[0];
}

export function scopeLabel(filters?: GlobalFilters): string {
  if (filters?.selectedDistrictName) {
    return `${filters.selectedDistrictName}, ${filters.selectedDepartmentName ?? ''}`.trim();
  }
  const keys = deptKeysFromFilters(filters);
  return keys.length === 2 ? 'Concepcion + Amambay' : CENSUS[keys[0]].nombre;
}

export function clampHorizonYear(year?: number): number {
  return Math.min(2052, Math.max(2027, year ?? DEFAULT_PROJECTION_HORIZON));
}

function sumBy<T>(items: T[], getter: (item: T) => number): number {
  return items.reduce((sum, item) => sum + getter(item), 0);
}

function aggregatePyramid(keys: DeptKey[]): AgeGroup[] {
  return CENSUS[keys[0]].piramide.map((group, i) => ({
    grupo: group.grupo,
    varones: sumBy(keys, (key) => CENSUS[key].piramide[i]?.varones ?? 0),
    mujeres: sumBy(keys, (key) => CENSUS[key].piramide[i]?.mujeres ?? 0),
  }));
}

export function aggregateCensus(keys: DeptKey[]): DepartmentCensus {
  if (keys.length === 1) return CENSUS[keys[0]];

  const departamentos = keys.map((key) => CENSUS[key]);
  const poblacion_total = sumBy(departamentos, (d) => d.poblacion_total);

  return {
    nombre: 'Concepcion + Amambay',
    codigo_ine: 0,
    codigo_barloc: '00',
    capital: 'Area de influencia regional',
    area_km2: sumBy(departamentos, (d) => d.area_km2),
    poblacion_total,
    varones: sumBy(departamentos, (d) => d.varones),
    mujeres: sumBy(departamentos, (d) => d.mujeres),
    pob_urbana: sumBy(departamentos, (d) => d.pob_urbana),
    pob_rural: sumBy(departamentos, (d) => d.pob_rural),
    pob_indigena: sumBy(departamentos, (d) => d.pob_indigena),
    viviendas_indigenas: sumBy(departamentos, (d) => d.viviendas_indigenas),
    comunidades_indigenas: sumBy(departamentos, (d) => d.comunidades_indigenas),
    piramide: aggregatePyramid(keys),
    distritos: keys.flatMap((key) => CENSUS[key].distritos),
  };
}

export function aggregateDeptStats(keys: DeptKey[]) {
  if (keys.length === 1) return getDeptStats(keys[0]);

  const d = aggregateCensus(keys);
  const totalJovenes = d.piramide.slice(0, 3).reduce((s, g) => s + g.varones + g.mujeres, 0);
  const totalAdultos = d.piramide.slice(3, 13).reduce((s, g) => s + g.varones + g.mujeres, 0);
  const totalMayores = d.piramide.slice(13).reduce((s, g) => s + g.varones + g.mujeres, 0);

  return {
    totalJovenes,
    totalAdultos,
    totalMayores,
    razDependencia: ((totalJovenes + totalMayores) / Math.max(1, totalAdultos)) * 100,
    indiceEnvejecimiento: (totalMayores / Math.max(1, totalJovenes)) * 100,
    pctIndigena: (d.pob_indigena / Math.max(1, d.poblacion_total)) * 100,
    pctRural: (d.pob_rural / Math.max(1, d.poblacion_total)) * 100,
  };
}

function weighted(rows: ProjectionYear[], getter: (row: ProjectionYear) => number): number {
  const total = sumBy(rows, (row) => row.pobTotal);
  if (!total) return 0;
  return sumBy(rows, (row) => getter(row) * row.pobTotal) / total;
}

export function aggregateProjection(keys: DeptKey[], scenario: ScenarioKey): ProjectionYear[] {
  if (keys.length === 1) return getProjection(keys[0], scenario);

  const all = keys.map((key) => getProjection(key, scenario));
  return all[0].map((base, i) => {
    const rows = all.map((series) => series[i]);
    const previousRows = i > 0 ? all.map((series) => series[i - 1]) : rows;
    const pobTotal = sumBy(rows, (row) => row.pobTotal);
    const previousTotal = sumBy(previousRows, (row) => row.pobTotal);

    return {
      anio: base.anio,
      pobTotal,
      varones: sumBy(rows, (row) => row.varones),
      mujeres: sumBy(rows, (row) => row.mujeres),
      nacimientos: sumBy(rows, (row) => row.nacimientos),
      defunciones: sumBy(rows, (row) => row.defunciones),
      migracion: sumBy(rows, (row) => row.migracion),
      tgf: +weighted(rows, (row) => row.tgf).toFixed(2),
      ev0h: +weighted(rows, (row) => row.ev0h).toFixed(1),
      ev0m: +weighted(rows, (row) => row.ev0m).toFixed(1),
      tasaCrecimiento: i === 0 ? 0 : +(((pobTotal - previousTotal) / previousTotal) * 100).toFixed(2),
      tasaNatalidad: +((sumBy(rows, (row) => row.nacimientos) / Math.max(1, pobTotal)) * 1000).toFixed(1),
      tasaMortalidad: +((sumBy(rows, (row) => row.defunciones) / Math.max(1, pobTotal)) * 1000).toFixed(1),
      razDependencia: +weighted(rows, (row) => row.razDependencia).toFixed(1),
      indiceEnvejecimiento: +weighted(rows, (row) => row.indiceEnvejecimiento).toFixed(1),
      piramide: base.piramide.map((group, groupIndex) => ({
        grupo: group.grupo,
        varones: sumBy(rows, (row) => row.piramide[groupIndex]?.varones ?? 0),
        mujeres: sumBy(rows, (row) => row.piramide[groupIndex]?.mujeres ?? 0),
      })),
    };
  });
}

export function scopedHistoricalValue(
  row: { concepcion: number; amambay: number },
  keys: DeptKey[],
): number {
  if (keys.length === 1) return row[keys[0]];
  const total = CENSUS.concepcion.poblacion_total + CENSUS.amambay.poblacion_total;
  return (
    row.concepcion * CENSUS.concepcion.poblacion_total +
    row.amambay * CENSUS.amambay.poblacion_total
  ) / total;
}
