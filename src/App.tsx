import { useEffect, useState } from 'react';
import type { GeoJsonObject } from 'geojson';
import MapViewer from './components/MapViewer';
import Sidebar from './components/Sidebar';

function App() {
  const [geoData, setGeoData] = useState<GeoJsonObject | null>(null);
  const [rutasData, setRutasData] = useState<GeoJsonObject | null>(null);
  const [hidroData, setHidroData] = useState<GeoJsonObject | null>(null);
  const [activeDepartment, setActiveDepartment] = useState<string | null>(null);
  
  // Layer visibility toggles
  const [showRoutes, setShowRoutes] = useState(false);
  const [showWater, setShowWater] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Force sidebar open on larger screens initially
    if (window.innerWidth > 768) {
      setSidebarOpen(true);
    }

    // Load the GeoJSON data (with explicit repository base path)
    Promise.all([
      fetch('/concepcion_amambay_geodemogsocial/concepcion_amambay_hogares.geojson').then(r => r.json()),
      fetch('/concepcion_amambay_geodemogsocial/concepcion_amambay_rutas.geojson').then(r => r.json()).catch(() => null),
      fetch('/concepcion_amambay_geodemogsocial/concepcion_amambay_hidrografia.geojson').then(r => r.json()).catch(() => null)
    ])
      .then(([hogares, rutas, hidro]) => {
        setGeoData(hogares);
        if (rutas) setRutasData(rutas);
        if (hidro) setHidroData(hidro);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        setError('No se pudo cargar la información geográfica principal.');
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="app-container">
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <h2>Cargando Datos Geográficos...</h2>
        </div>
      )}
      
      {error && !isLoading && (
        <div className="loading-overlay" style={{ color: '#ef4444' }}>
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      )}

      {!isLoading && !error && (
        <>
          <Sidebar 
            geoData={geoData} 
            activeDepartment={activeDepartment} 
            setActiveDepartment={setActiveDepartment}
            isOpen={sidebarOpen}
            setIsOpen={setSidebarOpen}
            showRoutes={showRoutes}
            setShowRoutes={setShowRoutes}
            showWater={showWater}
            setShowWater={setShowWater}
          />
          <MapViewer 
            geoData={geoData} 
            activeDepartment={activeDepartment} 
            rutasData={rutasData}
            hidroData={hidroData}
            showRoutes={showRoutes}
            showWater={showWater}
          />
        </>
      )}
    </div>
  );
}

export default App;
