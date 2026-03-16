import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip } from 'react-leaflet';
import type { GeoJsonObject, Feature, Geometry } from 'geojson';
import 'leaflet/dist/leaflet.css';
import { useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';

interface MapViewerProps {
  geoData: GeoJsonObject | null;
  activeDepartment: string | null;
  rutasData?: GeoJsonObject | null;
  hidroData?: GeoJsonObject | null;
  showRoutes?: boolean;
  showWater?: boolean;
}

export default function MapViewer({ geoData, activeDepartment, rutasData, hidroData, showRoutes, showWater }: MapViewerProps) {
  const mapRef = useRef<LeafletMap>(null);

  // Modern UI Colors mapping corresponding to departments
  const colors = {
    '01': '#3b82f6', // Concepcion Blue
    '13': '#8b5cf6'  // Amambay Purple
  };

  const styleFeature = (feature?: Feature<Geometry, any>) => {
    const dpto = feature?.properties?.DPTO;
    const isConcepcion = dpto === '01';
    
    // Fade out unselected departments
    const isActive = !activeDepartment || activeDepartment === dpto;
    const opacity = isActive ? 0.3 : 0.1; // Reduced opacity for polygons to make circles pop
    const color = isConcepcion ? colors['01'] : colors['13'];
    
    return {
        fillColor: color,
        weight: 1,
        opacity: isActive ? 0.6 : 0.2,
        color: 'white',
        fillOpacity: opacity
    };
  };

  const onEachFeature = (feature: Feature<Geometry, any>, layer: any) => {
    const props = feature.properties;
    if (props) {
      // Prioritize DIST_DESC_ (usually cleaner) or NOM_DIST, fallback to 'Distrito'
      const distName = props.DIST_DESC_ || props.NOM_DIST || 'Distrito';
      
      const tooltipContent = `
        <div style="font-family: var(--font-primary); min-width: 150px;">
          <strong style="color: var(--text-primary); font-size: 1.1em; display: block; margin-bottom: 2px;">${distName}</strong>
          <span style="color: var(--text-secondary); font-size: 0.9em;">Departamento de ${props.DPTO_DESC || 'Desconocido'}</span><br/>
          <div style="margin-top: 8px; border-top: 1px solid var(--border-color); padding-top: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-secondary); font-size: 0.9em;">Total Viviendas:</span>
                <strong style="color: var(--accent-primary); font-size: 1.1em;">${props.label_value || props.value || 0}</strong>
            </div>
          </div>
        </div>
      `;
      layer.bindTooltip(tooltipContent, { className: 'custom-tooltip', sticky: true });
    }
  };

  return (
    <div className="map-container">
      <MapContainer 
        center={[-22.9, -56.5]} // Center between Concepcion and Amambay
        zoom={7} 
        style={{ width: '100%', height: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {geoData && (
          <>
            <GeoJSON 
              data={geoData}
              // @ts-ignore
              style={styleFeature}
              onEachFeature={onEachFeature}
              key={activeDepartment || 'all'} 
            />
            {/* Render Circles for housing points */}
            {'features' in geoData && (geoData.features as any[]).map((feature: any, index: number) => {
              const props = feature.properties;
              if (!props || !props.centroid_lat || !props.centroid_lon) return null;
              
              const dpto = props.DPTO;
              const isActive = !activeDepartment || activeDepartment === dpto;
              const color = dpto === '01' ? colors['01'] : colors['13'];
              
              // Base radius on square root of value to scale area proportionally
              const value = props.value || 0;
              const radius = Math.max(8, Math.sqrt(value) / 7);

              const distName = props.DIST_DESC_ || props.NOM_DIST || 'Distrito';

              return (
                <CircleMarker
                  key={`circle-${props.id || index}-${activeDepartment || 'all'}`}
                  center={[props.centroid_lat, props.centroid_lon]}
                  radius={radius}
                  pathOptions={{
                    fillColor: color,
                    color: 'white',
                    weight: 2,
                    fillOpacity: isActive ? 0.8 : 0.2,
                    opacity: isActive ? 1 : 0.3
                  }}
                >
                  <Tooltip sticky className="custom-tooltip">
                    <div style={{ fontFamily: 'var(--font-primary)', minWidth: '150px' }}>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '1.1em', display: 'block', marginBottom: '2px' }}>
                        {distName}
                      </strong>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9em' }}>
                        Departamento de {props.DPTO_DESC || 'Desconocido'}
                      </span><br/>
                      <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9em' }}>Total Viviendas:</span>
                            <strong style={{ color: 'var(--accent-primary)', fontSize: '1.1em' }}>
                              {props.label_value || props.value || 0}
                            </strong>
                        </div>
                      </div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              );
            })}
          </>
        )}
        
        {/* Render Routes Layer */}
        {showRoutes && rutasData && (
          <GeoJSON
            data={rutasData}
            style={() => ({
              color: '#fbbf24', // Amber for routes
              weight: 1.5,
              opacity: 0.8
            })}
            key={`rutas-${activeDepartment || 'all'}`}
          />
        )}
        
        {/* Render Hydrography Layer */}
        {showWater && hidroData && (
          <GeoJSON
            data={hidroData}
            style={() => ({
              color: '#0ea5e9', // Sky blue for water
              fillColor: '#0ea5e9',
              weight: 1,
              opacity: 0.7,
              fillOpacity: 0.5
            })}
            key={`hidro-${activeDepartment || 'all'}`}
          />
        )}
      </MapContainer>
    </div>
  );
}
