import type { Feature, FeatureCollection, GeoJsonObject } from 'geojson';
import type { BaseStats, DepartmentCode, DistrictOption } from '../types';

type Bounds = [[number, number], [number, number]];

const TARGET_DEPARTMENTS = new Set(['01', '13']);

export function buildAssetUrl(filename: string): string {
  const baseUrl = import.meta.env.BASE_URL || '/';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const normalizedFile = filename.replace(/^\//, '');
  return `${normalizedBase}${normalizedFile}`;
}

export function getReadableError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Ocurrió un error no identificado al cargar el recurso.';
}

export function getFeatureCollectionFeatures(data: GeoJsonObject | null | undefined): Feature[] {
  if (!data) return [];
  if ('features' in data && Array.isArray(data.features)) {
    return data.features as Feature[];
  }
  return [];
}

export function getProp(feature: Feature | null | undefined, keys: string[]): unknown {
  if (!feature || !feature.properties) return null;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(feature.properties, key)) {
      return feature.properties[key];
    }
  }
  return null;
}

export function safeNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.replace(/\./g, '').replace(',', '.').trim();
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-PY').format(value);
}

export function normalizeDepartmentCode(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return raw.padStart(2, '0');
  return raw.toUpperCase();
}

export function isTargetDepartment(code: string | null): boolean {
  return code !== null && TARGET_DEPARTMENTS.has(code);
}

export function getDepartmentCode(feature: Feature | null | undefined): string | null {
  return normalizeDepartmentCode(getProp(feature, ['DPTO', 'dpto', 'Dpto', 'COD_DPTO', 'CodDpto']));
}

export function getDepartmentName(feature: Feature | null | undefined): string {
  const value = getProp(feature, [
    'DPTO_DESC',
    'dpto_desc',
    'DptoDesc',
    'dptodesc',
    'Departamento',
    'departamento',
  ]);
  return value ? String(value) : 'Departamento no identificado';
}

export function getDistrictCode(feature: Feature | null | undefined): string {
  const value = getProp(feature, ['DISTRITO', 'distrito', 'Distrito', 'DIST', 'dist']);
  if (value === null || value === undefined) return 'sin-codigo';
  return String(value);
}

export function getDistrictName(feature: Feature | null | undefined): string {
  const value = getProp(feature, [
    'DIST_DESC_',
    'DIST_DESC',
    'dist_desc',
    'distdesc',
    'DistDesc',
    'NOM_DIST',
    'nom_dist',
    'disbar_des',
    'BARLO_DESC',
    'barlocdesc',
  ]);
  return value ? String(value) : 'Distrito no identificado';
}

export function buildDistrictKey(feature: Feature | null | undefined): string {
  const departmentCode = getDepartmentCode(feature) ?? '00';
  const districtCode = getDistrictCode(feature);
  return `${departmentCode}|${districtCode}`;
}

export function featureMatchesDepartment(
  feature: Feature | null | undefined,
  activeDepartment: DepartmentCode,
): boolean {
  const code = getDepartmentCode(feature);
  if (!code) return false;
  if (activeDepartment) return code === activeDepartment;
  return isTargetDepartment(code);
}

export function featureMatchesDistrict(
  feature: Feature | null | undefined,
  districtKey: string | null,
): boolean {
  if (!districtKey) return false;
  return buildDistrictKey(feature) === districtKey;
}

function pushCoordinates(
  coords: unknown,
  target: Array<[number, number]>,
): void {
  if (!Array.isArray(coords)) return;

  if (
    coords.length >= 2 &&
    typeof coords[0] === 'number' &&
    typeof coords[1] === 'number'
  ) {
    target.push([coords[0], coords[1]]);
    return;
  }

  for (const item of coords) {
    pushCoordinates(item, target);
  }
}

export function getGeometryCenter(feature: Feature | null | undefined): {
  lat: number | null;
  lng: number | null;
} {
  const centroidLat = safeNumber(getProp(feature, ['centroid_lat', 'lat', 'LAT', 'Latitude']));
  const centroidLng = safeNumber(getProp(feature, ['centroid_lon', 'lon', 'LON', 'Longitude']));

  if (centroidLat !== 0 || centroidLng !== 0) {
    return { lat: centroidLat, lng: centroidLng };
  }

  if (!feature?.geometry) return { lat: null, lng: null };

  const points: Array<[number, number]> = [];
  pushCoordinates((feature.geometry as any).coordinates, points);
  if (points.length === 0) return { lat: null, lng: null };

  const lng = points.reduce((acc, [x]) => acc + x, 0) / points.length;
  const lat = points.reduce((acc, [, y]) => acc + y, 0) / points.length;

  return { lat, lng };
}

export function getBoundsFromFeatures(
  features: Feature[],
  predicate?: (feature: Feature) => boolean,
): Bounds | null {
  const points: Array<[number, number]> = [];

  for (const feature of features) {
    if (predicate && !predicate(feature)) continue;
    pushCoordinates((feature.geometry as any)?.coordinates, points);
    const center = getGeometryCenter(feature);
    if (center.lat !== null && center.lng !== null) {
      points.push([center.lng, center.lat]);
    }
  }

  if (points.length === 0) return null;

  const lngs = points.map(([lng]) => lng);
  const lats = points.map(([, lat]) => lat);

  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];
}

export function computeBaseStats(data: GeoJsonObject | null): BaseStats {
  const features = getFeatureCollectionFeatures(data);
  let totalHogares = 0;
  let hogaresConcepcion = 0;
  let hogaresAmambay = 0;
  let totalDistritos = 0;

  for (const feature of features) {
    if (!featureMatchesDepartment(feature, null)) continue;

    const value = safeNumber(getProp(feature, ['value', 'label_value']));
    const code = getDepartmentCode(feature);

    totalHogares += value;
    totalDistritos += 1;

    if (code === '01') hogaresConcepcion += value;
    if (code === '13') hogaresAmambay += value;
  }

  return {
    totalHogares,
    hogaresConcepcion,
    hogaresAmambay,
    totalDistritos,
  };
}

export function buildDistrictOptions(data: GeoJsonObject | null): DistrictOption[] {
  const features = getFeatureCollectionFeatures(data);
  return features
    .filter((feature) => featureMatchesDepartment(feature, null))
    .map((feature) => {
      const center = getGeometryCenter(feature);
      const departmentCode = getDepartmentCode(feature) ?? '00';
      return {
        key: buildDistrictKey(feature),
        districtCode: getDistrictCode(feature),
        districtName: getDistrictName(feature),
        departmentCode,
        departmentName: getDepartmentName(feature),
        totalValue: safeNumber(getProp(feature, ['value', 'label_value'])),
        lat: center.lat,
        lng: center.lng,
      };
    })
    .sort((a, b) => a.districtName.localeCompare(b.districtName, 'es'));
}

export function countMatchingFeatures(
  data: GeoJsonObject | null,
  activeDepartment: DepartmentCode,
): number {
  return getFeatureCollectionFeatures(data).filter((feature) =>
    featureMatchesDepartment(feature, activeDepartment),
  ).length;
}

export function getLayerFeatureName(feature: Feature | null | undefined, fallback: string): string {
  const value = getProp(feature, [
    'NOMBRE',
    'Nombre',
    'nombre',
    'nombref',
    'descref',
    'DescRef',
    'BARLO_DESC',
    'DESC_HIDRO',
    'DIST_DESC_',
    'DIST_DESC',
    'DesTipoVia',
    'NomPob',
    'disbar_des',
  ]);
  return value ? String(value) : fallback;
}

export function mergeFeatureCollections(
  collections: Array<GeoJsonObject | null | undefined>,
): Feature[] {
  const merged: Feature[] = [];
  for (const collection of collections) {
    merged.push(...getFeatureCollectionFeatures(collection));
  }
  return merged;
}

export function filterFeaturesByDepartment(
  features: Feature[],
  activeDepartment: DepartmentCode,
): Feature[] {
  return features.filter((feature) => featureMatchesDepartment(feature, activeDepartment));
}

export function buildFeatureCollection(features: Feature[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features,
  };
}

export function getDistrictByKey(
  options: DistrictOption[],
  key: string | null,
): DistrictOption | null {
  if (!key) return null;
  return options.find((item) => item.key === key) ?? null;
}
