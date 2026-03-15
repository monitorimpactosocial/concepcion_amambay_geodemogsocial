import { useEffect, useState } from 'react';
import type { GeoJsonObject } from 'geojson';
import MapViewer from './components/MapViewer';
import Sidebar from './components/Sidebar';

function App() {
  const [geoData, setGeoData] = useState<GeoJsonObject | null>(null);
  const [activeDepartment, setActiveDepartment] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Force sidebar open on larger screens initially
    if (window.innerWidth > 768) {
      setSidebarOpen(true);
    }

    // Load the GeoJSON data
    fetch('/concepcion_amambay_hogares.geojson')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        setGeoData(data);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        setError('No se pudo cargar la información geográfica.');
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
          />
          <MapViewer 
            geoData={geoData} 
            activeDepartment={activeDepartment} 
          />
        </>
      )}
    </div>
  );
}

export default App;
