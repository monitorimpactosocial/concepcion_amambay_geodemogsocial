import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip } from 'react-leaflet';
import type { GeoJsonObject, Feature, Geometry } from 'geojson';
import 'leaflet/dist/leaflet.css';
import { useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import L from 'leaflet';

interface MapViewerProps {
  geoData: GeoJsonObject | null;
  activeDepartment: string | null;
  rutasData?: GeoJsonObject | null;
  hidroData?: GeoJsonObject | null;
  barriosData?: GeoJsonObject | null;
  manzanasData?: GeoJsonObject | null;
  viviendasData?: any[]; // For heavy point features array
  showRoutes?: boolean;
  showWater?: boolean;
  showBarrios?: boolean;
  showManzanas?: boolean;
  showPuntos?: boolean;
  indigenasData?: GeoJsonObject | null;
  indigenasStats?: any;
  indigenasPueblosMapping?: any;
  showIndigenas?: boolean;
  saludData?: GeoJsonObject | null;
  educacionData?: GeoJsonObject | null;
  aguaData?: GeoJsonObject | null;
  pobrezaData?: GeoJsonObject | null;
  showSalud?: boolean;
  showEducacion?: boolean;
  showAgua?: boolean;
  showPobreza?: boolean;
}

export default function MapViewer({ 
  geoData, 
  activeDepartment, 
  rutasData, 
  hidroData, 
  barriosData,
  manzanasData,
  viviendasData,
  showRoutes, 
  showWater,
  showBarrios,
  showManzanas,
  showPuntos,
  indigenasData,
  indigenasStats,
  indigenasPueblosMapping,
  showIndigenas,
  saludData,
  educacionData,
  aguaData,
  pobrezaData,
  showSalud,
  showEducacion,
  showAgua,
  showPobreza
}: MapViewerProps) {
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

  // Helper function to clean text matching the Python script exactly
  const cleanText = (text: string) => {
    if (!text) return "";
    let clean = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    clean = clean.replace(/\b(com indig|com\.\s*indig\.|comunidad|aldea|barrio|nucleo|individualidades de)\b/g, '');
    clean = clean.replace(/[^a-z0-9\s]/g, '');
    return clean.trim();
  };

  return (
    <div className="map-container">
      <MapContainer 
        center={[-22.9, -56.5]} // Center between Concepcion and Amambay
        zoom={7} 
        style={{ width: '100%', height: '100%' }}
        ref={mapRef}
        preferCanvas={true} // Essential for rendering 40,000+ points smoothly
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
        
        {/* Render Barrios Layer */}
        {showBarrios && barriosData && (
          <GeoJSON
            data={barriosData}
            style={() => ({
              color: '#ec4899', // Pinkish border for barrios
              fillColor: 'transparent',
              weight: 1.5,
              opacity: 0.9,
              dashArray: '4 4'
            })}
            key={`barrios-${activeDepartment || 'all'}`}
          />
        )}

        {/* Render Manzanas Layer */}
        {showManzanas && manzanasData && (
          <GeoJSON
            data={manzanasData}
            style={() => ({
              color: '#ef4444', // Red border for blocks
              fillColor: '#ef4444',
              weight: 0.8,
              opacity: 0.9,
              fillOpacity: 0.2
            })}
            key={`manzanas-${activeDepartment || 'all'}`}
          />
        )}

        {/* Render Heavy Housing Points (Viviendas Canvas) */}
        {showPuntos && viviendasData && viviendasData.length > 0 && (
           viviendasData.map((feature: any, index: number) => {
              // Standard GeoJSON Point coords: [longitude, latitude]
              const coords = feature.geometry?.coordinates;
              if (!coords) return null;
              
              const dpto = feature.properties?.DPTO;
              const isActive = !activeDepartment || activeDepartment === dpto;
              
              if (!isActive) return null; // Don't render if filtered out

              return (
                <CircleMarker
                  key={`pt-${feature.properties?.fid || index}-${activeDepartment || 'all'}`}
                  center={[coords[1], coords[0]]} // Leaflet uses [lat, lng]
                  radius={2}
                  pathOptions={{
                    fillColor: '#facc15', // Vibrant yellow simulating heatmap intensity
                    color: 'transparent', // No border
                    weight: 0,
                    fillOpacity: 0.15, // Very transparent, overlaps build up heat!
                    interactive: false // Critical for 40k points performance
                  }}
                />
              );
            })
        )}
        
        {/* Render Indigenous Communities */}
        {showIndigenas && indigenasData && 'features' in indigenasData && (
          (indigenasData.features as any[]).map((feature: any, index: number) => {
            const props = feature.properties;
            const geom = feature.geometry;
            if (!props || !geom || !geom.coordinates) return null;
            
            const dptoContext = props.DPTO;
            const isActive = !activeDepartment || activeDepartment === dptoContext;
            if (!isActive) return null;

            // Geometry is usually a MultiPoint or Point
            let lat = 0, lng = 0;
            if (geom.type === 'Point') {
              [lng, lat] = geom.coordinates;
            } else if (geom.type === 'MultiPoint') {
              [lng, lat] = geom.coordinates[0];
            } else {
              return null; // unsupported geometry
            }

            const rawName = props.BARLO_DESC || 'Comunidad Desconocida';
            const cleanedName = cleanText(rawName);
            const puebloName = indigenasPueblosMapping?.[cleanedName] || 'Sin Pueblo';
            
            // Extract statistics for this specific Pueblo
            let totalPop = "N/D";
            let totalHombres = "N/D";
            let totalMujeres = "N/D";
            let analfabetismoCount = "N/D";

            if (indigenasStats && indigenasStats["T_012"]) {
              // T_012 is Total Population by Pueblo and Sex
              const table12 = indigenasStats["T_012"];
              const row = table12.find((r: any) => r.Col_0 === dptoContext && r.Col_6 === puebloName);
              if (row) {
                totalPop = row.Col_7;
                totalHombres = row.Col_8;
                totalMujeres = row.Col_9;
              }
            }

            if (indigenasStats && indigenasStats["T_029"]) {
              // T_029 is Literacy (age 15 and up). Let's just find their basic literacy stat if possible
               const table29 = indigenasStats["T_029"];
               const row = table29.find((r: any) => r.Col_0 === dptoContext && r.Col_6 === puebloName);
               if (row) {
                 // Depende de la estructura de la tabla, Col_9 o Col_10 puede ser analfabetos totales
                 analfabetismoCount = row.Col_10 || "N/D"; 
               }
            }
            
            return (
              <CircleMarker
                key={`indigena-${props.fid || index}`}
                center={[lat, lng]}
                radius={6}
                pathOptions={{
                  fillColor: '#10b981', // Vivid green for indigenous communities
                  color: 'white',
                  weight: 2,
                  fillOpacity: 0.9,
                  opacity: 1
                }}
              >
                <Tooltip sticky className="custom-tooltip">
                  <div style={{ fontFamily: 'var(--font-primary)', minWidth: '220px' }}>
                    <div style={{ paddingBottom: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '8px' }}>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '1.1em', display: 'block', lineHeight: 1.2 }}>
                        {rawName}
                      </strong>
                      <span style={{ color: '#10b981', fontSize: '0.85em', fontWeight: 600, display: 'block', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Pueblo: {puebloName}
                      </span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8em', marginTop: '2px', display: 'block' }}>
                        Distrito: {props.DIST_DESC}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85em' }}>Población Total (Pueblo):</span>
                          <strong style={{ color: 'var(--text-primary)', fontSize: '0.95em' }}>{totalPop}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85em' }}>Hombres:</span>
                          <strong style={{ color: 'var(--text-primary)', fontSize: '0.95em' }}>{totalHombres}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85em' }}>Mujeres:</span>
                          <strong style={{ color: 'var(--text-primary)', fontSize: '0.95em' }}>{totalMujeres}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', borderTop: '1px dashed var(--border-color)', paddingTop: '4px' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85em' }}>Analfabetismo (15+ años):</span>
                          <strong style={{ color: '#ef4444', fontSize: '0.95em' }}>{analfabetismoCount}</strong>
                      </div>
                    </div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })
        )}

        {/* Render New Layers */}
        {showSalud && saludData && (
          <GeoJSON
            data={saludData}
            style={() => ({
              color: '#22c55e', fillColor: '#22c55e', weight: 2, opacity: 0.9, fillOpacity: 0.5
            })}
            pointToLayer={(_, latlng) => new L.CircleMarker(latlng, { radius: 5, fillColor: '#22c55e', color: 'white', weight: 1, fillOpacity: 0.8 })}
            onEachFeature={(feature, layer) => {
              const props = feature.properties || {};
              const name = props.nombre || props.establecim || props.DESC || props.Nombre || 'Local de Salud';
              layer.bindTooltip(`<div style="font-family: var(--font-primary)"><strong style="color: #22c55e">${name}</strong></div>`);
            }}
            key={`salud-${activeDepartment || 'all'}`}
          />
        )}

        {showEducacion && educacionData && (
          <GeoJSON
            data={educacionData}
            style={() => ({
              color: '#f97316', fillColor: '#f97316', weight: 2, opacity: 0.9, fillOpacity: 0.5
            })}
            pointToLayer={(_, latlng) => new L.CircleMarker(latlng, { radius: 5, fillColor: '#f97316', color: 'white', weight: 1, fillOpacity: 0.8 })}
            onEachFeature={(feature, layer) => {
              const props = feature.properties || {};
              const name = props.nombre || props.institucio || props.DESC || props.Nombre || 'Local Educativo';
              layer.bindTooltip(`<div style="font-family: var(--font-primary)"><strong style="color: #f97316">${name}</strong></div>`);
            }}
            key={`educacion-${activeDepartment || 'all'}`}
          />
        )}

        {showAgua && aguaData && (
          <GeoJSON
            data={aguaData}
            style={() => ({
              color: '#06b6d4', fillColor: '#06b6d4', weight: 2, opacity: 0.9, fillOpacity: 0.5
            })}
            pointToLayer={(_, latlng) => new L.CircleMarker(latlng, { radius: 5, fillColor: '#06b6d4', color: 'white', weight: 1, fillOpacity: 0.8 })}
            onEachFeature={(feature, layer) => {
              const props = feature.properties || {};
              const name = props.nombre || props.comunidad || props.DESC || props.Nombre || 'Tanque de Agua';
              layer.bindTooltip(`<div style="font-family: var(--font-primary)"><strong style="color: #06b6d4">${name}</strong></div>`);
            }}
            key={`agua-${activeDepartment || 'all'}`}
          />
        )}

        {showPobreza && pobrezaData && (
          <GeoJSON
            data={pobrezaData}
            style={() => ({
              color: '#991b1b', fillColor: '#991b1b', weight: 2, opacity: 0.9, fillOpacity: 0.4
            })}
            pointToLayer={(_, latlng) => new L.CircleMarker(latlng, { radius: 6, fillColor: '#991b1b', color: 'white', weight: 1, fillOpacity: 0.8 })}
            onEachFeature={(feature, layer) => {
              const props = feature.properties || {};
              const name = props.nombre || props.barrio || props.DESC || props.Nombre || 'Zona de Riesgo/Pobreza';
              layer.bindTooltip(`<div style="font-family: var(--font-primary)"><strong style="color: #991b1b">${name}</strong></div>`);
            }}
            key={`pobreza-${activeDepartment || 'all'}`}
          />
        )}

      </MapContainer>
    </div>
  );
}
