import { useEffect, useMemo, useState } from 'react';
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Pane,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
  ZoomControl,
} from 'react-leaflet';
import L, { type PathOptions } from 'leaflet';
import type { Feature, GeoJsonObject } from 'geojson';
import type { BasemapKey, DepartmentCode, DistrictOption, LayerVisibilityState } from '../types';
import {
  buildDistrictKey,
  buildFeatureCollection,
  featureMatchesDepartment,
  featureMatchesDistrict,
  filterFeaturesByDepartment,
  getBoundsFromFeatures,
  getDepartmentCode,
  getDepartmentName,
  getDistrictCode,
  getDistrictName,
  getFeatureCollectionFeatures,
  getGeometryCenter,
  getLayerFeatureName,
  getProp,
  isTargetDepartment,
  safeNumber,
} from '../utils/geo';
import 'leaflet/dist/leaflet.css';

function shouldShowFeature(
  feature: Feature | null,
  activeDepartment: DepartmentCode,
  selectedDistrictKey: string | null
): boolean {
  if (!feature) return false;
  if (selectedDistrictKey) {
    const dCode = getDistrictCode(feature);
    if (dCode && dCode !== 'sin-codigo' && dCode !== 'null' && dCode !== '') {
      return featureMatchesDistrict(feature, selectedDistrictKey);
    }
  }
  return featureMatchesDepartment(feature, activeDepartment);
}

interface MapViewerProps {
  baseData: GeoJsonObject | null;
  activeDepartment: DepartmentCode;
  selectedDistrictKey: string | null;
  onSelectDistrict: (districtKey: string | null) => void;
  basemap: BasemapKey;
  resetViewToken: number;
  routesData: GeoJsonObject | null;
  waterData: GeoJsonObject | null;
  barriosData: GeoJsonObject | null;
  manzanasData: GeoJsonObject | null;
  viviendasFeatures: Feature[];
  indigenasData: GeoJsonObject | null;
  indigenasStats: Record<string, unknown> | null;
  indigenasPueblosMapping: Record<string, string> | null;
  saludData: GeoJsonObject | null;
  educacionData: GeoJsonObject | null;
  aguaData: GeoJsonObject | null;
  pobrezaData: GeoJsonObject | null;
  viasData: GeoJsonObject | null;
  usoSuelosFeatures?: Feature[];
  censoData?: GeoJsonObject | null;
  layerVisibility: LayerVisibilityState;
  selectedDistrict: DistrictOption | null;
}

const BASEMAPS: Record<
  BasemapKey,
  { url: string; attribution: string }
> = {
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
};

function ZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
  });

  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);

  return null;
}

function MapViewportController({
  baseData,
  activeDepartment,
  selectedDistrictKey,
  resetViewToken,
}: {
  baseData: GeoJsonObject | null;
  activeDepartment: DepartmentCode;
  selectedDistrictKey: string | null;
  resetViewToken: number;
}) {
  const map = useMap();
  const baseFeatures = getFeatureCollectionFeatures(baseData);

  useEffect(() => {
    const bounds = getBoundsFromFeatures(baseFeatures, (feature) => {
      if (selectedDistrictKey) return featureMatchesDistrict(feature, selectedDistrictKey);
      return featureMatchesDepartment(feature, activeDepartment);
    });

    if (bounds) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: selectedDistrictKey ? 11 : 9 });
      return;
    }

    const fallbackBounds = getBoundsFromFeatures(baseFeatures, (feature) =>
      featureMatchesDepartment(feature, null),
    );
    if (fallbackBounds) {
      map.fitBounds(fallbackBounds, { padding: [28, 28], maxZoom: 8 });
    }
  }, [activeDepartment, baseFeatures, map, resetViewToken, selectedDistrictKey]);

  return null;
}

function getBasePolygonStyle(feature?: Feature | null): PathOptions {
  const departmentCode = getDepartmentCode(feature ?? undefined);
  const isConcepcion = departmentCode === '01';
  const isTarget = isTargetDepartment(departmentCode);

  return {
    color: '#ffffff',
    weight: 1,
    opacity: isTarget ? 0.85 : 0.1,
    fillColor: isConcepcion ? '#2563eb' : '#7c3aed',
    fillOpacity: isTarget ? 0.24 : 0.04,
  };
}

function cleanText(text: string): string {
  if (!text) return '';
  let clean = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  clean = clean.replace(
    /\b(com indig|com\.\s*indig\.|comunidad|aldea|barrio|nucleo|individualidades de)\b/g,
    '',
  );
  clean = clean.replace(/[^a-z0-9\s]/g, '');
  return clean.trim();
}

function pointCenterFromFeature(feature: Feature | null | undefined): { lat: number; lng: number } | null {
  const center = getGeometryCenter(feature);
  if (center.lat === null || center.lng === null) return null;
  return { lat: center.lat, lng: center.lng };
}

function renderGenericPointLayer(
  data: GeoJsonObject | null,
  activeDepartment: DepartmentCode,
  selectedDistrictKey: string | null,
  color: string,
  fallback: string,
) {
  if (!data) return null;

  return (
    <GeoJSON
      data={data as GeoJsonObject}
      filter={(feature) => shouldShowFeature(feature as Feature, activeDepartment, selectedDistrictKey)}
      pointToLayer={(_, latlng) =>
        new L.CircleMarker(latlng, {
          radius: 5,
          fillColor: color,
          color: '#ffffff',
          weight: 1,
          fillOpacity: 0.9,
          opacity: 1,
        })
      }
      style={() => ({
        color,
        weight: 1.5,
        opacity: 0.85,
        fillOpacity: 0.25,
      })}
      onEachFeature={(feature, layer) => {
        const name = getLayerFeatureName(feature as Feature, fallback);
        const desc = getProp(feature as Feature, ['descref', 'DescRef', 'descripcion', 'DESC', 'desc']);
        const descHtml = desc ? `<span>${desc}</span>` : '';
        layer.bindTooltip(
          `<div class="tooltip-shell"><strong>${name}</strong>${descHtml}<span>${getDepartmentName(
            feature as Feature,
          )}</span></div>`,
          { className: 'custom-tooltip', sticky: true },
        );
      }}
    />
  );
}

export default function MapViewer({
  baseData,
  activeDepartment,
  selectedDistrictKey,
  onSelectDistrict,
  basemap,
  resetViewToken,
  routesData,
  waterData,
  barriosData,
  manzanasData,
  viviendasFeatures,
  indigenasData,
  indigenasStats,
  indigenasPueblosMapping,
  saludData,
  educacionData,
  aguaData,
  pobrezaData,
  viasData,
  usoSuelosFeatures,
  censoData,
  layerVisibility,
  selectedDistrict,
}: MapViewerProps) {
  const [zoomLevel, setZoomLevel] = useState(7);

  const visibleBaseFeatures = useMemo(
    () =>
      getFeatureCollectionFeatures(baseData).filter((feature) =>
        featureMatchesDepartment(feature, activeDepartment),
      ),
    [activeDepartment, baseData],
  );

  const visibleHousingFeatures = useMemo(() => {
    const filtered = viviendasFeatures.filter((f) => shouldShowFeature(f, activeDepartment, selectedDistrictKey));

    if (zoomLevel < 10) return [];
    if (zoomLevel >= 13) return filtered;
    if (zoomLevel === 12) return filtered.filter((_, index) => index % 2 === 0);
    if (zoomLevel === 11) return filtered.filter((_, index) => index % 4 === 0);
    return filtered.filter((_, index) => index % 8 === 0);
  }, [activeDepartment, viviendasFeatures, zoomLevel]);

  const housingSamplingMessage = useMemo(() => {
    if (!layerVisibility.puntos) return null;
    if (zoomLevel < 10) return 'Amplíe a zoom 10 o superior para visualizar puntos de viviendas.';
    if (zoomLevel < 13) return 'Se aplica muestreo visual para mejorar rendimiento a este nivel de zoom.';
    return null;
  }, [layerVisibility.puntos, zoomLevel]);

  const selectedDistrictLabel = selectedDistrict
    ? `${selectedDistrict.districtName}, ${selectedDistrict.departmentName}`
    : activeDepartment === '01'
      ? 'Concepción'
      : activeDepartment === '13'
        ? 'Amambay'
        : 'Concepción y Amambay';

  const thematicLegend = useMemo(
    () => [
      { label: 'Concepción', color: '#2563eb' },
      { label: 'Amambay', color: '#7c3aed' },
      { label: 'Salud', color: '#16a34a' },
      { label: 'Educación', color: '#ea580c' },
      { label: 'Agua', color: '#0891b2' },
      { label: 'Riesgo', color: '#991b1b' },
    ],
    [],
  );

  return (
    <div className="map-shell">
      <MapContainer
        center={[-22.6, -56.3]}
        zoom={7}
        minZoom={6}
        zoomControl={false}
        preferCanvas
        className="leaflet-host"
      >
        <ZoomControl position="bottomright" />
        <ZoomTracker onZoomChange={setZoomLevel} />
        <MapViewportController
          baseData={baseData}
          activeDepartment={activeDepartment}
          selectedDistrictKey={selectedDistrictKey}
          resetViewToken={resetViewToken}
        />

        <TileLayer attribution={BASEMAPS[basemap].attribution} url={BASEMAPS[basemap].url} />

        <Pane name="base-polygons" style={{ zIndex: 200 }}>
          <GeoJSON
            data={buildFeatureCollection(visibleBaseFeatures)}
            style={(feature) => {
              const baseStyle = getBasePolygonStyle(feature as Feature);
              const isSelected = featureMatchesDistrict(feature as Feature, selectedDistrictKey);
              return {
                ...baseStyle,
                weight: isSelected ? 2.5 : baseStyle.weight,
                fillOpacity: isSelected ? 0.38 : baseStyle.fillOpacity,
              };
            }}
            onEachFeature={(feature, layer) => {
              const districtKey = buildDistrictKey(feature as Feature);
              const districtName = getDistrictName(feature as Feature);
              const value = safeNumber(getProp(feature as Feature, ['value', 'label_value']));
              const departmentName = getDepartmentName(feature as Feature);

              layer.bindTooltip(
                `<div class="tooltip-shell">
                  <strong>${districtName}</strong>
                  <span>${departmentName}</span>
                  <span>Hogares estimados: ${new Intl.NumberFormat('es-PY').format(value)}</span>
                </div>`,
                { className: 'custom-tooltip', sticky: true },
              );

              layer.on('click', () => {
                onSelectDistrict(districtKey);
              });
            }}
          />
        </Pane>

        <Pane name="district-centroids" style={{ zIndex: 360 }}>
          {visibleBaseFeatures.map((feature, index) => {
            const center = pointCenterFromFeature(feature);
            if (!center) return null;

            const departmentCode = getDepartmentCode(feature);
            const value = safeNumber(getProp(feature, ['value', 'label_value']));
            const radius = Math.max(10, Math.min(26, Math.sqrt(value) / 7));
            const districtKey = buildDistrictKey(feature);
            const isSelected = districtKey === selectedDistrictKey;

            return (
              <CircleMarker
                key={`centroid-${districtKey}-${index}`}
                center={[center.lat, center.lng]}
                radius={radius}
                pathOptions={{
                  fillColor: departmentCode === '01' ? '#2563eb' : '#7c3aed',
                  color: '#ffffff',
                  weight: isSelected ? 3 : 2,
                  fillOpacity: isSelected ? 0.9 : 0.72,
                  opacity: 1,
                }}
                eventHandlers={{
                  click: () => onSelectDistrict(districtKey),
                }}
              >
                <Tooltip sticky className="custom-tooltip">
                  <div className="tooltip-react-shell">
                    <strong>{getDistrictName(feature)}</strong>
                    <span>{getDepartmentName(feature)}</span>
                    <span>Hogares estimados: {new Intl.NumberFormat('es-PY').format(value)}</span>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </Pane>

        {layerVisibility.routes && routesData && (
          <Pane name="routes" style={{ zIndex: 420 }}>
            <GeoJSON
              data={routesData}
              filter={(feature) => shouldShowFeature(feature as Feature, activeDepartment, selectedDistrictKey)}
              style={() => ({
                color: '#b45309',
                weight: 2.2,
                opacity: 0.85,
              })}
              onEachFeature={(feature, layer) => {
                const name = getLayerFeatureName(feature as Feature, 'Ruta');
                layer.bindTooltip(
                  `<div class="tooltip-shell"><strong>${name}</strong><span>Rutas principales</span></div>`,
                  { className: 'custom-tooltip', sticky: true },
                );
              }}
            />
          </Pane>
        )}

        {layerVisibility.water && waterData && (
          <Pane name="water" style={{ zIndex: 410 }}>
            <GeoJSON
              data={waterData}
              filter={(feature) => shouldShowFeature(feature as Feature, activeDepartment, selectedDistrictKey)}
              style={() => ({
                color: '#0284c7',
                weight: 1.1,
                opacity: 0.9,
                fillColor: '#38bdf8',
                fillOpacity: 0.2,
              })}
              onEachFeature={(feature, layer) => {
                const name = getLayerFeatureName(feature as Feature, 'Hidrografía');
                layer.bindTooltip(
                  `<div class="tooltip-shell"><strong>${name}</strong><span>Capa hidrográfica</span></div>`,
                  { className: 'custom-tooltip', sticky: true },
                );
              }}
            />
          </Pane>
        )}

        {layerVisibility.barrios && barriosData && (
          <Pane name="barrios" style={{ zIndex: 430 }}>
            <GeoJSON
              data={barriosData}
              filter={(feature) => shouldShowFeature(feature as Feature, activeDepartment, selectedDistrictKey)}
              style={() => ({
                color: '#db2777',
                weight: 1.2,
                opacity: 0.95,
                fillOpacity: 0,
                dashArray: '4 4',
              })}
              onEachFeature={(feature, layer) => {
                const name = getLayerFeatureName(feature as Feature, 'Barrio');
                layer.bindTooltip(
                  `<div class="tooltip-shell"><strong>${name}</strong><span>Delimitación barrial</span></div>`,
                  { className: 'custom-tooltip', sticky: true },
                );
              }}
            />
          </Pane>
        )}

        {layerVisibility.manzanas && manzanasData && (
          <Pane name="manzanas" style={{ zIndex: 435 }}>
            <GeoJSON
              data={manzanasData}
              filter={(feature) => shouldShowFeature(feature as Feature, activeDepartment, selectedDistrictKey)}
              style={() => ({
                color: '#ef4444',
                weight: 0.7,
                opacity: 0.85,
                fillColor: '#ef4444',
                fillOpacity: 0.09,
              })}
              onEachFeature={(feature, layer) => {
                const name = getLayerFeatureName(feature as Feature, 'Manzana');
                layer.bindTooltip(
                  `<div class="tooltip-shell"><strong>${name}</strong><span>Unidad censal</span></div>`,
                  { className: 'custom-tooltip', sticky: true },
                );
              }}
            />
          </Pane>
        )}

        {layerVisibility.puntos && zoomLevel >= 10 && (
          <Pane name="housing-points" style={{ zIndex: 500 }}>
            {visibleHousingFeatures.map((feature, index) => {
              const center = pointCenterFromFeature(feature);
              if (!center) return null;

              return (
                <CircleMarker
                  key={`house-point-${index}`}
                  center={[center.lat, center.lng]}
                  radius={1.8}
                  pathOptions={{
                    fillColor: '#f59e0b',
                    color: 'transparent',
                    weight: 0,
                    fillOpacity: 0.18,
                    interactive: false,
                  }}
                />
              );
            })}
          </Pane>
        )}

        {layerVisibility.indigenas && indigenasData && (
          <Pane name="indigenas" style={{ zIndex: 520 }}>
            {getFeatureCollectionFeatures(indigenasData)
              .filter((feature) => shouldShowFeature(feature, activeDepartment, selectedDistrictKey))
              .map((feature, index) => {
                const center = pointCenterFromFeature(feature);
                if (!center) return null;

                const rawName = String(getProp(feature, ['BARLO_DESC', 'barlocdesc']) || 'Comunidad');
                const cleanedName = cleanText(rawName);
                const puebloName = indigenasPueblosMapping?.[cleanedName] || 'Sin clasificación';

                let totalPueblo = 'N/D';
                let totalHombres = 'N/D';
                let totalMujeres = 'N/D';
                let analfabetismo = 'N/D';

                const departmentContext = getDepartmentName(feature);
                const table12 = Array.isArray(indigenasStats?.T_012)
                  ? (indigenasStats.T_012 as Array<Record<string, string>>)
                  : [];
                const table29 = Array.isArray(indigenasStats?.T_029)
                  ? (indigenasStats.T_029 as Array<Record<string, string>>)
                  : [];

                const row12 = table12.find(
                  (row) => row.Col_0 === departmentContext && row.Col_6 === puebloName,
                );
                const row29 = table29.find(
                  (row) => row.Col_0 === departmentContext && row.Col_6 === puebloName,
                );

                if (row12) {
                  totalPueblo = row12.Col_7 || 'N/D';
                  totalHombres = row12.Col_8 || 'N/D';
                  totalMujeres = row12.Col_9 || 'N/D';
                }
                if (row29) {
                  analfabetismo = row29.Col_10 || 'N/D';
                }

                return (
                  <CircleMarker
                    key={`indigena-${index}`}
                    center={[center.lat, center.lng]}
                    radius={6}
                    pathOptions={{
                      fillColor: '#059669',
                      color: '#ffffff',
                      weight: 1.5,
                      fillOpacity: 0.9,
                      opacity: 1,
                    }}
                  >
                    <Tooltip sticky className="custom-tooltip">
                      <div className="tooltip-react-shell large">
                        <strong>{rawName}</strong>
                        <span>Pueblo: {puebloName}</span>
                        <span>Departamento: {departmentContext}</span>
                        <span>Población total del pueblo: {totalPueblo}</span>
                        <span>Hombres: {totalHombres}</span>
                        <span>Mujeres: {totalMujeres}</span>
                        <span>Analfabetismo 15 y más: {analfabetismo}</span>
                      </div>
                    </Tooltip>
                  </CircleMarker>
                );
              })}
          </Pane>
        )}

        {layerVisibility.salud && (
          <Pane name="salud" style={{ zIndex: 525 }}>
            {renderGenericPointLayer(saludData, activeDepartment, selectedDistrictKey, '#16a34a', 'Local de salud')}
          </Pane>
        )}

        {layerVisibility.educacion && (
          <Pane name="educacion" style={{ zIndex: 526 }}>
            {renderGenericPointLayer(
              educacionData,
              activeDepartment,
              selectedDistrictKey,
              '#ea580c',
              'Local educativo',
            )}
          </Pane>
        )}

        {layerVisibility.agua && (
          <Pane name="agua" style={{ zIndex: 527 }}>
            {renderGenericPointLayer(aguaData, activeDepartment, selectedDistrictKey, '#0891b2', 'Tanque de agua')}
          </Pane>
        )}

        {layerVisibility.pobreza && pobrezaData && (
          <Pane name="pobreza" style={{ zIndex: 470 }}>
            <GeoJSON
              data={pobrezaData}
              filter={(feature) => shouldShowFeature(feature as Feature, activeDepartment, selectedDistrictKey)}
              style={() => ({
                color: '#991b1b',
                weight: 1.4,
                opacity: 0.85,
                fillColor: '#b91c1c',
                fillOpacity: 0.22,
              })}
              onEachFeature={(feature, layer) => {
                const exposed = safeNumber(getProp(feature as Feature, ['exp_tot']));
                const poverty = safeNumber(getProp(feature as Feature, ['pobr_exp']));
                const name = getLayerFeatureName(feature as Feature, 'Área expuesta');

                layer.bindTooltip(
                  `<div class="tooltip-shell">
                    <strong>${name}</strong>
                    <span>Expuestos: ${new Intl.NumberFormat('es-PY').format(exposed)}</span>
                    <span>Población pobre expuesta: ${new Intl.NumberFormat('es-PY').format(poverty)}</span>
                  </div>`,
                  { className: 'custom-tooltip', sticky: true },
                );
              }}
            />
          </Pane>
        )}

        {layerVisibility.vias && viasData && (
          <Pane name="vias" style={{ zIndex: 445 }}>
            <GeoJSON
              data={viasData}
              filter={(feature) => shouldShowFeature(feature as Feature, activeDepartment, selectedDistrictKey)}
              style={(feature) => {
                const tipo = String(getProp(feature as Feature, ['TIPO_VIA']) || '');
                let color = '#71717a';
                let weight = 1.6;

                if (tipo === '5') {
                  color = '#dc2626';
                  weight = 3;
                } else if (tipo === '3') {
                  color = '#f97316';
                  weight = 2.5;
                } else if (tipo === '1') {
                  color = '#eab308';
                  weight = 2;
                }

                return {
                  color,
                  weight,
                  opacity: 0.9,
                };
              }}
              onEachFeature={(feature, layer) => {
                const name = getLayerFeatureName(feature as Feature, 'Vía principal');
                const tipo = String(getProp(feature as Feature, ['DesTipoVia']) || 'Camino');
                const rodadura = String(getProp(feature as Feature, ['DesRodaVia']) || '');

                layer.bindTooltip(
                  `<div class="tooltip-shell">
                    <strong>${name}</strong>
                    <span>${tipo}${rodadura ? `, ${rodadura}` : ''}</span>
                  </div>`,
                  { className: 'custom-tooltip', sticky: true },
                );
              }}
            />
          </Pane>
        )}
        {layerVisibility.usoSuelos && usoSuelosFeatures && (
          <Pane name="usoSuelos" style={{ zIndex: 415 }}>
            <GeoJSON
              data={buildFeatureCollection(usoSuelosFeatures)}
              filter={(feature) => shouldShowFeature(feature as Feature, activeDepartment, selectedDistrictKey)}
              style={(feature) => {
                const desc_uso = String(getProp(feature as Feature, ['DESC_USO']) || '');
                let color = '#22c55e'; // Green default
                if (desc_uso.includes('CULTIVO')) color = '#eab308'; // Yellow
                else if (desc_uso.includes('AGUA') || desc_uso.includes('RIO')) color = '#3b82f6'; // Blue
                else if (desc_uso.includes('URBANO') || desc_uso.includes('ASENTAMIENTO')) color = '#ef4444'; // Red
                else if (desc_uso.includes('PASTURA')) color = '#84cc16'; // Lime
                else if (desc_uso.includes('BOSQUE')) color = '#15803d'; // Dark green
                
                return {
                  weight: 0.5,
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.45,
                };
              }}
              onEachFeature={(feature, layer) => {
                const desc_uso = String(getProp(feature as Feature, ['DESC_USO']) || 'Uso no especificado');
                layer.bindTooltip(
                  `<div class="tooltip-shell"><strong>${desc_uso}</strong><span>Capa de Uso de Suelo</span></div>`,
                  { className: 'custom-tooltip', sticky: true },
                );
              }}
            />
          </Pane>
        )}

        {layerVisibility.censo && censoData && (
          <Pane name="censo" style={{ zIndex: 432 }}>
            <GeoJSON
              data={censoData}
              filter={(feature) => shouldShowFeature(feature as Feature, activeDepartment, selectedDistrictKey)}
              style={() => ({
                color: '#4f46e5',
                weight: 1.5,
                opacity: 0.9,
                fillColor: '#6366f1',
                fillOpacity: 0.35,
              })}
              onEachFeature={(feature, layer) => {
                const barrio = String(getProp(feature as Feature, ['barrio', 'BARRIO']) || 'Barrio/Localidad');
                const pob1 = safeNumber(getProp(feature as Feature, ['pob1']));
                const viv1 = safeNumber(getProp(feature as Feature, ['viv1']));
                const hog1 = safeNumber(getProp(feature as Feature, ['hog1']));
                const hombres = safeNumber(getProp(feature as Feature, ['pob2']));
                const mujeres = safeNumber(getProp(feature as Feature, ['pob3']));
                const edad1 = safeNumber(getProp(feature as Feature, ['pob4']));
                const edad2 = safeNumber(getProp(feature as Feature, ['pob5']));
                const edad3 = safeNumber(getProp(feature as Feature, ['pob6']));

                layer.bindTooltip(
                  `<div class="tooltip-shell hover-metrics">
                    <strong>${barrio} (Censo 2022)</strong>
                    <span>Población Total: <b>${new Intl.NumberFormat('es-PY').format(pob1)}</b></span>
                    <span>Hombres / Mujeres: <b>${new Intl.NumberFormat('es-PY').format(hombres)}</b> / <b>${new Intl.NumberFormat('es-PY').format(mujeres)}</b></span>
                    <span>Edades: 0-14 (<b>${new Intl.NumberFormat('es-PY').format(edad1)}</b>), 15-64 (<b>${new Intl.NumberFormat('es-PY').format(edad2)}</b>), 65+ (<b>${new Intl.NumberFormat('es-PY').format(edad3)}</b>)</span>
                    <span>Viviendas / Hogares: <b>${new Intl.NumberFormat('es-PY').format(viv1)}</b> / <b>${new Intl.NumberFormat('es-PY').format(hog1)}</b></span>
                  </div>`,
                  { className: 'custom-tooltip', sticky: true },
                );
              }}
            />
          </Pane>
        )}
      </MapContainer>

      <div className="map-overlay top-left">
        <div className="overlay-title">Ámbito visible</div>
        <div className="overlay-value">{selectedDistrictLabel}</div>
        <div className="overlay-subvalue">Zoom actual: {zoomLevel.toFixed(0)}</div>
      </div>

      {housingSamplingMessage && (
        <div className="map-overlay top-center warning">
          <AlertNote message={housingSamplingMessage} />
        </div>
      )}

      <div className="map-overlay bottom-left legend-card">
        <div className="overlay-title">Leyenda</div>
        <div className="legend-list">
          {thematicLegend.map((item) => (
            <div key={item.label} className="legend-item">
              <span className="legend-swatch" style={{ backgroundColor: item.color }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AlertNote({ message }: { message: string }) {
  return (
    <div className="alert-note">
      <span>{message}</span>
    </div>
  );
}
