import { useEffect, useMemo, useState } from 'react';
import type { GeoJsonObject } from 'geojson';
import MapViewer from './components/MapViewer';
import Sidebar from './components/Sidebar';
import { useJsonResource } from './hooks/useJsonResource';
import type {
  BasemapKey,
  DepartmentCode,
  LayerHealthItem,
  LayerVisibilityState,
} from './types';
import {
  buildDistrictOptions,
  computeBaseStats,
  countMatchingFeatures,
  getFeatureCollectionFeatures,
  getDistrictByKey,
  mergeFeatureCollections,
} from './utils/geo';

const STORAGE_KEY = 'monitor-impacto-social:v2';

const DEFAULT_LAYERS: LayerVisibilityState = {
  routes: false,
  water: false,
  barrios: false,
  manzanas: false,
  puntos: false,
  indigenas: false,
  salud: false,
  educacion: false,
  agua: false,
  pobreza: false,
  vias: false,
};

function readStoredState(): {
  activeDepartment: DepartmentCode;
  basemap: BasemapKey;
  layers: LayerVisibilityState;
  sidebarOpen: boolean;
} {
  if (typeof window === 'undefined') {
    return {
      activeDepartment: null,
      basemap: 'light',
      layers: DEFAULT_LAYERS,
      sidebarOpen: true,
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
      };
    }

    const parsed = JSON.parse(raw) as Partial<{
      activeDepartment: DepartmentCode;
      basemap: BasemapKey;
      layers: Partial<LayerVisibilityState>;
      sidebarOpen: boolean;
    }>;

    return {
      activeDepartment: parsed.activeDepartment ?? null,
      basemap: parsed.basemap ?? 'light',
      layers: {
        ...DEFAULT_LAYERS,
        ...(parsed.layers ?? {}),
      },
      sidebarOpen:
        typeof parsed.sidebarOpen === 'boolean'
          ? parsed.sidebarOpen
          : window.innerWidth >= 1180,
    };
  } catch {
    return {
      activeDepartment: null,
      basemap: 'light',
      layers: DEFAULT_LAYERS,
      sidebarOpen: window.innerWidth >= 1180,
    };
  }
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
  const [resetViewToken, setResetViewToken] = useState(0);

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
    layerVisibility.puntos,
  );
  const viviendasAmambayResource = useJsonResource<GeoJsonObject>(
    'amambay_viviendas.geojson',
    layerVisibility.puntos,
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

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        activeDepartment,
        basemap,
        layers: layerVisibility,
        sidebarOpen,
      }),
    );
  }, [activeDepartment, basemap, layerVisibility, sidebarOpen]);

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

  useEffect(() => {
    if (!selectedDistrict) return;
    if (activeDepartment && selectedDistrict.departmentCode !== activeDepartment) {
      setSelectedDistrictKey(null);
    }
  }, [activeDepartment, selectedDistrict]);

  const mergedHousingFeatures = useMemo(
    () =>
      mergeFeatureCollections([
        viviendasConcepcionResource.data,
        viviendasAmambayResource.data,
      ]),
    [viviendasConcepcionResource.data, viviendasAmambayResource.data],
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
    viviendasAmambayResource.error,
    viviendasConcepcionResource.error,
    waterResource.error,
  ]);

  const layerHealthItems = useMemo<LayerHealthItem[]>(() => {
    const viviendasStatus =
      viviendasConcepcionResource.status === 'error' || viviendasAmambayResource.status === 'error'
        ? 'error'
        : viviendasConcepcionResource.status === 'loading' ||
            viviendasAmambayResource.status === 'loading'
          ? 'loading'
          : viviendasConcepcionResource.status === 'loaded' &&
              viviendasAmambayResource.status === 'loaded'
            ? 'loaded'
            : 'idle';

    const viviendasError =
      viviendasConcepcionResource.error || viviendasAmambayResource.error || null;

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
        label: 'Viviendas',
        status: viviendasStatus,
        error: viviendasError,
        count: mergedHousingFeatures.length,
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
    ];
  }, [
    activeDepartment,
    aguaResource.data,
    aguaResource.error,
    aguaResource.status,
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
    manzanasResource.data,
    manzanasResource.error,
    manzanasResource.status,
    mergedHousingFeatures.length,
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
    viviendasAmambayResource.error,
    viviendasAmambayResource.status,
    viviendasConcepcionResource.error,
    viviendasConcepcionResource.status,
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
    });
  };

  const hideAllLayers = () => {
    setLayerVisibility(DEFAULT_LAYERS);
  };

  const resetView = () => {
    setSelectedDistrictKey(null);
    setActiveDepartment(null);
    setResetViewToken((current) => current + 1);
  };

  const handleDistrictSelection = (districtKey: string | null) => {
    setSelectedDistrictKey(districtKey);
    const selected = getDistrictByKey(districtOptions, districtKey);
    if (selected) {
      setActiveDepartment(selected.departmentCode as DepartmentCode);
    }
  };

  return (
    <div className="app-shell">
      {baseResource.status === 'loading' && (
        <div className="loading-screen">
          <div className="spinner" />
          <h2>Cargando capa base geodemográfica</h2>
          <p>Se están preparando polígonos, centroides y metadatos territoriales.</p>
        </div>
      )}

      {baseResource.status === 'error' && (
        <div className="loading-screen error-screen">
          <h2>No se pudo cargar la capa base</h2>
          <p>{baseResource.error}</p>
          <button className="primary-button" onClick={baseResource.reload}>
            Reintentar carga base
          </button>
        </div>
      )}

      {baseResource.status !== 'error' && baseResource.data && (
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
              viviendasFeatures={mergedHousingFeatures}
              indigenasData={indigenasGeoResource.data}
              indigenasStats={indigenasStatsResource.data}
              indigenasPueblosMapping={indigenasPueblosResource.data}
              saludData={saludResource.data}
              educacionData={educacionResource.data}
              aguaData={aguaResource.data}
              pobrezaData={pobrezaResource.data}
              viasData={viasResource.data}
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
