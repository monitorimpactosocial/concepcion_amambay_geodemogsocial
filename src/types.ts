import type { GeoJsonObject } from 'geojson';

export type ViewId =
  | 'mapa'
  | 'demografia'
  | 'proyecciones'
  | 'social'
  | 'impacto'
  | 'reporte'
  | 'metodologia';

export type DepartmentCode = '01' | '13' | null;
export type BasemapKey = 'light' | 'dark' | 'satellite';
export type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error';
export type ProjectionScenarioKey = 'optimista' | 'medio' | 'pesimista';
export type ImpactScenarioKey = 'conservador' | 'medio' | 'transformador';

export type LayerId =
  | 'routes'
  | 'water'
  | 'barrios'
  | 'manzanas'
  | 'puntos'
  | 'indigenas'
  | 'salud'
  | 'educacion'
  | 'agua'
  | 'pobreza'
  | 'vias'
  | 'usoSuelos'
  | 'censo';

export type LayerVisibilityState = Record<LayerId, boolean>;

export interface ResourceState<T = GeoJsonObject> {
  data: T | null;
  status: LoadStatus;
  error: string | null;
  reload: () => void;
}

export interface BaseStats {
  totalHogares: number;
  hogaresConcepcion: number;
  hogaresAmambay: number;
  totalDistritos: number;
}

export interface DistrictOption {
  key: string;
  districtCode: string;
  districtName: string;
  departmentCode: string;
  departmentName: string;
  totalValue: number;
  lat: number | null;
  lng: number | null;
}

export interface GlobalFilters {
  activeDepartment: DepartmentCode;
  selectedDistrictKey: string | null;
  selectedDistrictName: string | null;
  selectedDepartmentName: string | null;
  projectionScenario: ProjectionScenarioKey;
  impactScenario: ImpactScenarioKey;
  horizonYear: number;
}

export interface LayerHealthItem {
  id: string;
  label: string;
  status: LoadStatus;
  error: string | null;
  count: number | null;
}

export interface UPM {
  id: string;
  tipo: string;
  dpto: string;
  dist: string;
  barrio: string;
  manzana: string;
  hogares: number;
  lng: number;
  lat: number;
}
