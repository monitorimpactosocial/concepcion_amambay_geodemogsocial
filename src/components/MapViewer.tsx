import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import type { GeoJsonObject, Feature, Geometry } from 'geojson';
import 'leaflet/dist/leaflet.css';
import { useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';

interface MapViewerProps {
  geoData: GeoJsonObject | null;
  activeDepartment: string | null;
}

export default function MapViewer({ geoData, activeDepartment }: MapViewerProps) {
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
    const opacity = isActive ? 0.8 : 0.2;
    const color = isConcepcion ? colors['01'] : colors['13'];
    
    return {
        fillColor: color,
        weight: 1,
        opacity: isActive ? 1 : 0.4,
        color: 'white',
        fillOpacity: opacity
    };
  };

  const onEachFeature = (feature: Feature<Geometry, any>, layer: any) => {
    const props = feature.properties;
    if (props) {
      // Parse numeric value if necessary, though GeoJSON likely holds numbers directly
      const numericValue = typeof props.value === 'string' ? parseInt(props.value, 10) : (props.value || 0);
      const formattedValue = new Intl.NumberFormat('es-PY').format(numericValue);
      
      const tooltipContent = `
        <div style="font-family: var(--font-primary);">
          <strong style="color: var(--text-primary); font-size: 1.1em;">${props.NOM_DIST || 'Distrito'}</strong><br/>
          <span style="color: var(--text-secondary);">${props.DPTO_DESC}</span><br/>
          <div style="margin-top: 8px; border-top: 1px solid var(--border-color); padding-top: 4px;">
            Total Hogares: <strong style="color: var(--accent-primary);">${formattedValue}</strong>
          </div>
        </div>
      `;
      layer.bindTooltip(tooltipContent, { className: 'custom-tooltip' });
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
          <GeoJSON 
            data={geoData}
            // @ts-ignore
            style={styleFeature}
            onEachFeature={onEachFeature}
            key={activeDepartment || 'all'} 
          />
        )}
      </MapContainer>
    </div>
  );
}
