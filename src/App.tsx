import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import type { GeoJsonObject } from 'geojson';
import MapViewer from './components/MapViewer';
import Sidebar from './components/Sidebar';
import NavBar from './components/NavBar';
import GlobalFilterBar from './components/GlobalFilterBar';
import { useJsonResource } from './hooks/useJsonResource';
import type {
  BasemapKey,
  DepartmentCode,
  GlobalFilters,
  ImpactScenarioKey,
  LayerHealthItem,
  LayerVisibilityState,
  ProjectionScenarioKey,
  ViewId,
} from './types';
import {
  buildDistrictOptions,
  computeBaseStats,
  countMatchingFeatures,
  getFeatureCollectionFeatures,
  getDistrictByKey,
  mergeFeatureCollections,
} from './utils/geo';

const DemographyView = lazy(() => import('./views/DemographyView'));
const ProjectionsView = lazy(() => import('./views/ProjectionsView'));
const SocialView = lazy(() => import('./views/SocialView'));
const ImpactoView = lazy(() => import('./views/ImpactoView'));
const ReporteView = lazy(() => import('./views/ReporteView'));
const MetodologiaView = lazy(() => import('./views/MetodologiaView'));

const STORAGE_KEY = 'monitor-impacto-social:v2';

const DEFAULT_LAYERS: LayerVisibilityState = {
  routes: true,
  water: true,
  barrios: true,
  manzanas: false,
  puntos: true,
  indigenas: false,
  salud: false,
  educacion: false,
  agua: false,
  pobreza: false,
  vias: true,
  usoSuelos: false,
  censo: false,
};

const NON_RESTORED_LAYERS: Array<keyof LayerVisibilityState> = [
  'manzanas',
  'indigenas',
  'salud',
  'educacion',
  'agua',
  'pobreza',
  'usoSuelos',
  'censo',
];

const BASEMAP_OPTIONS: BasemapKey[] = ['light', 'dark', 'satellite'];
const DEPARTMENT_OPTIONS: DepartmentCode[] = ['01', '13', null];
const PROJECTION_OPTIONS: ProjectionScenarioKey[] = ['optimista', 'medio', 'pesimista'];
const IMPACT_OPTIONS: ImpactScenarioKey[] = ['conservador', 'medio', 'transformador'];

function pickAllowed<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function pickHorizonYear(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 2042;
  return Math.min(2052, Math.max(2027, value));
}

function normalizeStoredLayers(value: Partial<LayerVisibilityState> | undefined): LayerVisibilityState {
  const next = {
    ...DEFAULT_LAYERS,
    ...(value ?? {}),
  };

  for (const layerId of NON_RESTORED_LAYERS) {
    next[layerId] = false;
  }

  return next;
}

function readStoredState(): {
  activeDepartment: DepartmentCode;
  basemap: BasemapKey;
  layers: LayerVisibilityState;
  sidebarOpen: boolean;
  projectionScenario: ProjectionScenarioKey;
  impactScenario: ImpactScenarioKey;
  horizonYear: number;
} {
  if (typeof window === 'undefined') {
    return {
      activeDepartment: null,
      basemap: 'light',
      layers: DEFAULT_LAYERS,
      sidebarOpen: true,
      projectionScenario: 'medio',
      impactScenario: 'medio',
      horizonYear: 2042,
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        activeDepartment: null,
        basemap: 'light',
        layers: DEFAULT_LAYERS,
        sidebarOpen: window.innerWidth >= 1180,
        projectionScenario: 'medio',
        impactScenario: 'medio',
        horizonYear: 2042,
      };
    }

    const parsed = JSON.parse(raw) as Partial<{
      activeDepartment: DepartmentCode;
      basemap: BasemapKey;
      layers: Partial<LayerVisibilityState>;
      sidebarOpen: boolean;
      projectionScenario: ProjectionScenarioKey;
      impactScenario: ImpactScenarioKey;
      horizonYear: number;
    }>;

      return {
        activeDepartment: pickAllowed(parsed.activeDepartment, DEPARTMENT_OPTIONS, null),
        basemap: pickAllowed(parsed.basemap, BASEMAP_OPTIONS, 'light'),
        layers: normalizeStoredLayers(parsed.layers),
        sidebarOpen:
        typeof parsed.sidebarOpen === 'boolean'
          ? parsed.sidebarOpen
          : window.innerWidth >= 1180,
      projectionScenario: pickAllowed(parsed.projectionScenario, PROJECTION_OPTIONS, 'medio'),
      impactScenario: pickAllowed(parsed.impactScenario, IMPACT_OPTIONS, 'medio'),
      horizonYear: pickHorizonYear(parsed.horizonYear),
    };
  } catch {
    return {
      activeDepartment: null,
      basemap: 'light',
      layers: DEFAULT_LAYERS,
      sidebarOpen: window.innerWidth >= 1180,
      projectionScenario: 'medio',
      impactScenario: 'medio',
      horizonYear: 2042,
    };
  }
}

function ViewLoading({ label = 'Cargando vista' }: { label?: string }) {
  return (
    <div className="view-loading">
      <div className="spinner spinner-small" />
      <span>{label}</span>
    </div>
  );
}

function App() {
  const storedState = readStoredState();

  const [activeDepartment, setActiveDepartment] = useState<DepartmentCode>(
    storedState.activeDepartment,
  );
  const [basemap, setBasemap] = useState<BasemapKey>(storedState.basemap);
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibilityState>(
    storedState.layers,
  );
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(storedState.sidebarOpen);
  const [selectedDistrictKey, setSelectedDistrictKey] = useState<string | null>(null);
  const [projectionScenario, setProjectionScenario] = useState<ProjectionScenarioKey>(
    storedState.projectionScenario,
  );
  const [impactScenario, setImpactScenario] = useState<ImpactScenarioKey>(
    storedState.impactScenario,
  );
  const [horizonYear, setHorizonYear] = useState<number>(storedState.horizonYear);
  const [resetViewToken, setResetViewToken] = useState(0);
  
  const [activeView, setActiveView] = useState<ViewId>('mapa');

  const baseResource = useJsonResource<GeoJsonObject>('concepcion_amambay_hogares.geojson', true);
  const routesResource = useJsonResource<GeoJsonObject>(
    'concepcion_amambay_rutas.geojson',
    layerVisibility.routes,
  );
  const waterResource = useJsonResource<GeoJsonObject>(
    'concepcion_amambay_hidrografia.geojson',
    layerVisibility.water,
  );
  const barriosResource = useJsonResource<GeoJsonObject>(
    'concepcion_amambay_barrios.geojson',
    layerVisibility.barrios,
  );
  const manzanasResource = useJsonResource<GeoJsonObject>(
    'concepcion_amambay_manzanas.geojson',
    layerVisibility.manzanas,
  );
  const viviendasConcepcionResource = useJsonResource<GeoJsonObject>(
    'concepcion_viviendas.geojson',
    false,
  );
  const viviendasAmambayResource = useJsonResource<GeoJsonObject>(
    'amambay_viviendas.geojson',
    false,
  );
  const indigenasGeoResource = useJsonResource<GeoJsonObject>(
    'indigenas_comunidades.geojson',
    layerVisibility.indigenas,
  );
  const indigenasStatsResource = useJsonResource<Record<string, unknown>>(
    'indigenas_stats.json',
    layerVisibility.indigenas,
  );
  const indigenasPueblosResource = useJsonResource<Record<string, string>>(
    'indigenas_pueblos.json',
    layerVisibility.indigenas,
  );
  const saludResource = useJsonResource<GeoJsonObject>(
    'locales_de_salud.geojson',
    layerVisibility.salud,
  );
  const educacionResource = useJsonResource<GeoJsonObject>(
    'locales_educativos.geojson',
    layerVisibility.educacion,
  );
  const aguaResource = useJsonResource<GeoJsonObject>(
    'tanques_de_agua_comunitarios.geojson',
    layerVisibility.agua,
  );
  const pobrezaResource = useJsonResource<GeoJsonObject>(
    'poblacion_en_situacion_de_pobreza_expuesta_a_inundaciones.geojson',
    layerVisibility.pobreza,
  );
  const viasResource = useJsonResource<GeoJsonObject>(
    'vias_principales.geojson',
    layerVisibility.vias,
  );
  const usoDeSuelosConcepcionResource = useJsonResource<GeoJsonObject>(
    'uso_de_suelo_concepcion.geojson',
    layerVisibility.usoSuelos,
  );
  const usoDeSuelosAmambayResource = useJsonResource<GeoJsonObject>(
    'uso_de_suelo_amambay.geojson',
    layerVisibility.usoSuelos,
  );
  const censoResource = useJsonResource<GeoJsonObject>(
    'censo_2022_indicadores.geojson',
    layerVisibility.censo,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        activeDepartment,
        basemap,
        layers: layerVisibility,
        sidebarOpen,
        projectionScenario,
        impactScenario,
        horizonYear,
      }),
    );
  }, [
    activeDepartment,
    basemap,
    horizonYear,
    impactScenario,
    layerVisibility,
    projectionScenario,
    sidebarOpen,
  ]);

  const baseStats = useMemo(
    () => computeBaseStats(baseResource.data ?? null),
    [baseResource.data],
  );

  const districtOptions = useMemo(
    () => buildDistrictOptions(baseResource.data ?? null),
    [baseResource.data],
  );

  const selectedDistrict = useMemo(
    () => getDistrictByKey(districtOptions, selectedDistrictKey),
    [districtOptions, selectedDistrictKey],
  );

  const globalFilters = useMemo<GlobalFilters>(() => ({
    activeDepartment,
    selectedDistrictKey,
    selectedDistrictName: selectedDistrict?.districtName ?? null,
    selectedDepartmentName: selectedDistrict?.departmentName ?? null,
    projectionScenario,
    impactScenario,
    horizonYear,
  }), [
    activeDepartment,
    horizonYear,
    impactScenario,
    projectionScenario,
    selectedDistrict,
    selectedDistrictKey,
  ]);

  useEffect(() => {
    if (!selectedDistrict) return;
    if (activeDepartment && selectedDistrict.departmentCode !== activeDepartment) {
      setSelectedDistrictKey(null);
    }
  }, [activeDepartment, selectedDistrict]);

  const mergedUsoDeSuelosFeatures = useMemo(
    () =>
      mergeFeatureCollections([
        usoDeSuelosConcepcionResource.data,
        usoDeSuelosAmambayResource.data,
      ]),
    [usoDeSuelosConcepcionResource.data, usoDeSuelosAmambayResource.data],
  );

  const visibleLayerCount = useMemo(
    () => Object.values(layerVisibility).filter(Boolean).length,
    [layerVisibility],
  );

  const optionalErrors = useMemo(() => {
    const errors = [
      routesResource.error,
      waterResource.error,
      barriosResource.error,
      manzanasResource.error,
      viviendasConcepcionResource.error,
      viviendasAmambayResource.error,
      indigenasGeoResource.error,
      indigenasStatsResource.error,
      indigenasPueblosResource.error,
      saludResource.error,
      educacionResource.error,
      aguaResource.error,
      pobrezaResource.error,
      viasResource.error,
      usoDeSuelosConcepcionResource.error,
      usoDeSuelosAmambayResource.error,
      censoResource.error,
    ].filter(Boolean);

    return errors as string[];
  }, [
    aguaResource.error,
    barriosResource.error,
    educacionResource.error,
    indigenasGeoResource.error,
    indigenasPueblosResource.error,
    indigenasStatsResource.error,
    manzanasResource.error,
    pobrezaResource.error,
    routesResource.error,
    saludResource.error,
    viasResource.error,
    usoDeSuelosConcepcionResource.error,
    usoDeSuelosAmambayResource.error,
    censoResource.error,
    viviendasAmambayResource.error,
    viviendasConcepcionResource.error,
    waterResource.error,
  ]);

  const layerHealthItems = useMemo<LayerHealthItem[]>(() => {
    const viviendasStatus = layerVisibility.puntos ? baseResource.status : 'idle';
    const viviendasError = baseResource.error;

    const usoSuelosStatus =
      usoDeSuelosConcepcionResource.status === 'error' || usoDeSuelosAmambayResource.status === 'error'
        ? 'error'
        : usoDeSuelosConcepcionResource.status === 'loading' || usoDeSuelosAmambayResource.status === 'loading'
          ? 'loading'
          : usoDeSuelosConcepcionResource.status === 'loaded' && usoDeSuelosAmambayResource.status === 'loaded'
            ? 'loaded'
            : 'idle';

    const usoSuelosError = usoDeSuelosConcepcionResource.error || usoDeSuelosAmambayResource.error || null;

    const indigenasStatus =
      indigenasGeoResource.status === 'error' ||
      indigenasStatsResource.status === 'error' ||
      indigenasPueblosResource.status === 'error'
        ? 'error'
        : indigenasGeoResource.status === 'loading' ||
            indigenasStatsResource.status === 'loading' ||
            indigenasPueblosResource.status === 'loading'
          ? 'loading'
          : indigenasGeoResource.status === 'loaded' &&
              indigenasStatsResource.status === 'loaded' &&
              indigenasPueblosResource.status === 'loaded'
            ? 'loaded'
            : 'idle';

    const indigenasError =
      indigenasGeoResource.error ||
      indigenasStatsResource.error ||
      indigenasPueblosResource.error ||
      null;

    return [
      {
        id: 'routes',
        label: 'Rutas',
        status: routesResource.status,
        error: routesResource.error,
        count: countMatchingFeatures(routesResource.data ?? null, activeDepartment),
      },
      {
        id: 'water',
        label: 'Hidrografía',
        status: waterResource.status,
        error: waterResource.error,
        count: countMatchingFeatures(waterResource.data ?? null, activeDepartment),
      },
      {
        id: 'barrios',
        label: 'Barrios',
        status: barriosResource.status,
        error: barriosResource.error,
        count: countMatchingFeatures(barriosResource.data ?? null, activeDepartment),
      },
      {
        id: 'manzanas',
        label: 'Manzanas',
        status: manzanasResource.status,
        error: manzanasResource.error,
        count: countMatchingFeatures(manzanasResource.data ?? null, activeDepartment),
      },
      {
        id: 'puntos',
        label: 'Densidad viviendas distrito',
        status: viviendasStatus,
        error: viviendasError,
        count: countMatchingFeatures(baseResource.data ?? null, activeDepartment),
      },
      {
        id: 'indigenas',
        label: 'Comunidades indígenas',
        status: indigenasStatus,
        error: indigenasError,
        count: countMatchingFeatures(indigenasGeoResource.data ?? null, activeDepartment),
      },
      {
        id: 'salud',
        label: 'Locales de salud',
        status: saludResource.status,
        error: saludResource.error,
        count: countMatchingFeatures(saludResource.data ?? null, activeDepartment),
      },
      {
        id: 'educacion',
        label: 'Locales educativos',
        status: educacionResource.status,
        error: educacionResource.error,
        count: countMatchingFeatures(educacionResource.data ?? null, activeDepartment),
      },
      {
        id: 'agua',
        label: 'Tanques de agua',
        status: aguaResource.status,
        error: aguaResource.error,
        count: countMatchingFeatures(aguaResource.data ?? null, activeDepartment),
      },
      {
        id: 'pobreza',
        label: 'Riesgo de inundación y pobreza',
        status: pobrezaResource.status,
        error: pobrezaResource.error,
        count: countMatchingFeatures(pobrezaResource.data ?? null, activeDepartment),
      },
      {
        id: 'vias',
        label: 'Vías principales',
        status: viasResource.status,
        error: viasResource.error,
        count: countMatchingFeatures(viasResource.data ?? null, activeDepartment),
      },
      {
        id: 'usoSuelos',
        label: 'Uso de suelos (pesado)',
        status: usoSuelosStatus,
        error: usoSuelosError,
        count: mergedUsoDeSuelosFeatures.length,
      },
      {
        id: 'censo',
        label: 'Densidad viviendas barrio',
        status: censoResource.status,
        error: censoResource.error,
        count: countMatchingFeatures(censoResource.data ?? null, activeDepartment),
      },
    ];
  }, [
    activeDepartment,
    aguaResource.data,
    aguaResource.error,
    aguaResource.status,
    baseResource.data,
    baseResource.error,
    baseResource.status,
    barriosResource.data,
    barriosResource.error,
    barriosResource.status,
    educacionResource.data,
    educacionResource.error,
    educacionResource.status,
    indigenasGeoResource.data,
    indigenasGeoResource.error,
    indigenasGeoResource.status,
    indigenasPueblosResource.error,
    indigenasPueblosResource.status,
    indigenasStatsResource.error,
    indigenasStatsResource.status,
    layerVisibility.puntos,
    manzanasResource.data,
    manzanasResource.error,
    manzanasResource.status,
    pobrezaResource.data,
    pobrezaResource.error,
    pobrezaResource.status,
    routesResource.data,
    routesResource.error,
    routesResource.status,
    saludResource.data,
    saludResource.error,
    saludResource.status,
    viasResource.data,
    viasResource.error,
    viasResource.status,
    usoDeSuelosConcepcionResource.status,
    usoDeSuelosConcepcionResource.error,
    usoDeSuelosAmambayResource.status,
    usoDeSuelosAmambayResource.error,
    mergedUsoDeSuelosFeatures.length,
    censoResource.status,
    censoResource.error,
    censoResource.data,
    waterResource.data,
    waterResource.error,
    waterResource.status,
  ]);

  const baseFeatures = getFeatureCollectionFeatures(baseResource.data ?? null);

  const retryFailedLayers = () => {
    [
      routesResource,
      waterResource,
      barriosResource,
      manzanasResource,
      viviendasConcepcionResource,
      viviendasAmambayResource,
      indigenasGeoResource,
      indigenasStatsResource,
      indigenasPueblosResource,
      saludResource,
      educacionResource,
      aguaResource,
      pobrezaResource,
      viasResource,
      usoDeSuelosConcepcionResource,
      usoDeSuelosAmambayResource,
      censoResource,
    ].forEach((resource) => {
      if (resource.status === 'error') {
        resource.reload();
      }
    });
  };

  const exportCurrentConfiguration = () => {
    const payload = {
      activeDepartment,
      basemap,
      selectedDistrict,
      projectionScenario,
      impactScenario,
      horizonYear,
      visibleLayers: Object.entries(layerVisibility)
        .filter(([, visible]) => visible)
        .map(([key]) => key),
      baseStats,
      generatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'monitor-impacto-social-configuracion.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const setLayer = (layerId: keyof LayerVisibilityState, nextValue: boolean) => {
    setLayerVisibility((current) => ({
      ...current,
      [layerId]: nextValue,
    }));
  };

  const showAllLayers = () => {
    setLayerVisibility({
      routes: true,
      water: true,
      barrios: true,
      manzanas: true,
      puntos: true,
      indigenas: true,
      salud: true,
      educacion: true,
      agua: true,
      pobreza: true,
      vias: true,
      usoSuelos: false,
      censo: true,
    });
  };

  const hideAllLayers = () => {
    setLayerVisibility(DEFAULT_LAYERS);
  };

  const resetView = () => {
    setSelectedDistrictKey(null);
    setActiveDepartment(null);
    setProjectionScenario('medio');
    setImpactScenario('medio');
    setHorizonYear(2042);
    setResetViewToken((current) => current + 1);
  };

  const handleDistrictSelection = (districtKey: string | null) => {
    setSelectedDistrictKey(districtKey);
    const selected = getDistrictByKey(districtOptions, districtKey);
    if (selected) {
      setActiveDepartment(selected.departmentCode as DepartmentCode);
    }
  };

  const handleDepartmentFilterChange = (department: DepartmentCode) => {
    setActiveDepartment(department);
    if (!department) {
      setSelectedDistrictKey(null);
    }
  };

  return (
    <div className="app-shell">
      <NavBar activeView={activeView} onViewChange={setActiveView} />
      <GlobalFilterBar
        activeDepartment={activeDepartment}
        onDepartmentChange={handleDepartmentFilterChange}
        selectedDistrictKey={selectedDistrictKey}
        onDistrictChange={handleDistrictSelection}
        districtOptions={districtOptions}
        projectionScenario={projectionScenario}
        onProjectionScenarioChange={setProjectionScenario}
        impactScenario={impactScenario}
        onImpactScenarioChange={setImpactScenario}
        horizonYear={horizonYear}
        onHorizonYearChange={setHorizonYear}
      />

      {/* Vistas no-mapa: demografía, proyecciones, indicadores sociales */}
      {activeView === 'demografia' && (
        <div className="view-main">
          <Suspense fallback={<ViewLoading label="Cargando demografía" />}>
            <DemographyView filters={globalFilters} />
          </Suspense>
        </div>
      )}
      {activeView === 'proyecciones' && (
        <div className="view-main">
          <Suspense fallback={<ViewLoading label="Cargando proyecciones" />}>
            <ProjectionsView filters={globalFilters} />
          </Suspense>
        </div>
      )}
      {activeView === 'social' && (
        <div className="view-main">
          <Suspense fallback={<ViewLoading label="Cargando indicadores sociales" />}>
            <SocialView filters={globalFilters} />
          </Suspense>
        </div>
      )}
      {activeView === 'impacto' && (
        <div className="view-main">
          <Suspense fallback={<ViewLoading label="Cargando impacto PARACEL" />}>
            <ImpactoView filters={globalFilters} />
          </Suspense>
        </div>
      )}
      {activeView === 'reporte' && (
        <div className="view-main">
          <Suspense fallback={<ViewLoading label="Cargando reporte" />}>
            <ReporteView filters={globalFilters} />
          </Suspense>
        </div>
      )}
      {activeView === 'metodologia' && (
        <div className="view-main">
          <Suspense fallback={<ViewLoading label="Cargando metodología" />}>
            <MetodologiaView />
          </Suspense>
        </div>
      )}


      {/* Vista mapa (con loading/error igual que antes) */}
      {activeView === 'mapa' && baseResource.status === 'loading' && (
        <div className="loading-screen">
          <div className="spinner" />
          <h2>Cargando capa base geodemográfica</h2>
          <p>Se están preparando polígonos, centroides y metadatos territoriales.</p>
        </div>
      )}

      {activeView === 'mapa' && baseResource.status === 'error' && (
        <div className="loading-screen error-screen">
          <h2>No se pudo cargar la capa base</h2>
          <p>{baseResource.error}</p>
          <button className="primary-button" onClick={baseResource.reload}>
            Reintentar carga base
          </button>
        </div>
      )}

      {activeView === 'mapa' && baseResource.status !== 'error' && baseResource.data && (
        <>
          <Sidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            activeDepartment={activeDepartment}
            setActiveDepartment={setActiveDepartment}
            basemap={basemap}
            setBasemap={setBasemap}
            baseStats={baseStats}
            selectedDistrict={selectedDistrict}
            selectedDistrictKey={selectedDistrictKey}
            setSelectedDistrictKey={handleDistrictSelection}
            districtOptions={districtOptions}
            visibleLayerCount={visibleLayerCount}
            layerVisibility={layerVisibility}
            setLayer={setLayer}
            showAllLayers={showAllLayers}
            hideAllLayers={hideAllLayers}
            layerHealthItems={layerHealthItems}
            baseFeatureCount={baseFeatures.length}
            optionalErrors={optionalErrors}
            resetView={resetView}
            retryFailedLayers={retryFailedLayers}
            exportCurrentConfiguration={exportCurrentConfiguration}
          />

          <main className="map-main">
            <MapViewer
              baseData={baseResource.data}
              activeDepartment={activeDepartment}
              selectedDistrictKey={selectedDistrictKey}
              onSelectDistrict={handleDistrictSelection}
              basemap={basemap}
              resetViewToken={resetViewToken}
              routesData={routesResource.data}
              waterData={waterResource.data}
              barriosData={barriosResource.data}
              manzanasData={manzanasResource.data}
              indigenasData={indigenasGeoResource.data}
              indigenasStats={indigenasStatsResource.data}
              indigenasPueblosMapping={indigenasPueblosResource.data}
              saludData={saludResource.data}
              educacionData={educacionResource.data}
              aguaData={aguaResource.data}
              pobrezaData={pobrezaResource.data}
              viasData={viasResource.data}
              usoSuelosFeatures={mergedUsoDeSuelosFeatures}
              censoData={censoResource.data}
              layerVisibility={layerVisibility}
              selectedDistrict={selectedDistrict}
            />
          </main>
          
        </>
      )}
    </div>
  );
}

export default App;
