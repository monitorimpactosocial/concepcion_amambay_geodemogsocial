import { useEffect, useState } from 'react';
import type { GeoJsonObject } from 'geojson';
import MapViewer from './components/MapViewer';
import Sidebar from './components/Sidebar';

function App() {
  const [geoData, setGeoData] = useState<GeoJsonObject | null>(null);
  const [rutasData, setRutasData] = useState<GeoJsonObject | null>(null);
  const [hidroData, setHidroData] = useState<GeoJsonObject | null>(null);
  const [barriosData, setBarriosData] = useState<GeoJsonObject | null>(null);
  const [manzanasData, setManzanasData] = useState<GeoJsonObject | null>(null);
  const [viviendasData, setViviendasData] = useState<any[]>([]); // Array to hold features
  
  // Indigenous Communities State
  const [indigenasData, setIndigenasData] = useState<GeoJsonObject | null>(null);
  const [indigenasStats, setIndigenasStats] = useState<any>(null);
  const [indigenasPueblosMapping, setIndigenasPueblosMapping] = useState<any>(null);
  
  const [activeDepartment, setActiveDepartment] = useState<string | null>(null);
  
  // Layer visibility toggles
  const [showRoutes, setShowRoutes] = useState(false);
  const [showWater, setShowWater] = useState(false);
  const [showBarrios, setShowBarrios] = useState(false);
  const [showManzanas, setShowManzanas] = useState(false);
  const [showPuntos, setShowPuntos] = useState(false);
  const [showIndigenas, setShowIndigenas] = useState(false);
  
  // New Layers
  const [saludData, setSaludData] = useState<GeoJsonObject | null>(null);
  const [showSalud, setShowSalud] = useState(false);
  const [isSaludLoading, setIsSaludLoading] = useState(false);

  const [educacionData, setEducacionData] = useState<GeoJsonObject | null>(null);
  const [showEducacion, setShowEducacion] = useState(false);
  const [isEducacionLoading, setIsEducacionLoading] = useState(false);

  const [aguaData, setAguaData] = useState<GeoJsonObject | null>(null);
  const [showAgua, setShowAgua] = useState(false);
  const [isAguaLoading, setIsAguaLoading] = useState(false);

  const [pobrezaData, setPobrezaData] = useState<GeoJsonObject | null>(null);
  const [showPobreza, setShowPobreza] = useState(false);
  const [isPobrezaLoading, setIsPobrezaLoading] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isPointsLoading, setIsPointsLoading] = useState(false); // separate loader for heavy points
  const [isIndigenasLoading, setIsIndigenasLoading] = useState(false);
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
      fetch('/concepcion_amambay_geodemogsocial/concepcion_amambay_hidrografia.geojson').then(r => r.json()).catch(() => null),
      fetch('/concepcion_amambay_geodemogsocial/concepcion_amambay_barrios.geojson').then(r => r.json()).catch(() => null),
      fetch('/concepcion_amambay_geodemogsocial/concepcion_amambay_manzanas.geojson').then(r => r.json()).catch(() => null)
    ])
      .then(([hogares, rutas, hidro, barrios, manzanas]) => {
        setGeoData(hogares);
        if (rutas) setRutasData(rutas);
        if (hidro) setHidroData(hidro);
        if (barrios) setBarriosData(barrios);
        if (manzanas) setManzanasData(manzanas);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        setError('No se pudo cargar la información geográfica principal.');
        setError('No se pudo cargar la información geográfica principal.');
        setIsLoading(false);
      });
  }, []);

  // Lazy load the 40MB points data only when user wants it
  useEffect(() => {
    if (showPuntos && viviendasData.length === 0) {
      setIsPointsLoading(true);
      Promise.all([
        fetch('/concepcion_amambay_geodemogsocial/concepcion_viviendas.geojson').then(r => r.json()).catch(() => ({ features: [] })),
        fetch('/concepcion_amambay_geodemogsocial/amambay_viviendas.geojson').then(r => r.json()).catch(() => ({ features: [] }))
      ]).then(([concepcion, amambay]) => {
        const mergedFeatures = [...(concepcion.features || []), ...(amambay.features || [])];
        setViviendasData(mergedFeatures);
        setIsPointsLoading(false);
      }).catch((e) => {
        console.error("Error fetching points:", e);
        setIsPointsLoading(false);
      });
    }
  }, [showPuntos, viviendasData.length]);

  // Lazy load Indigenous Communities and their Stats mapping
  useEffect(() => {
    if (showIndigenas && !indigenasData) {
      setIsIndigenasLoading(true);
      Promise.all([
        fetch('/concepcion_amambay_geodemogsocial/indigenas_comunidades.geojson').then(r => r.json()).catch(() => null),
        fetch('/concepcion_amambay_geodemogsocial/indigenas_stats.json').then(r => r.json()).catch(() => null),
        fetch('/concepcion_amambay_geodemogsocial/indigenas_pueblos.json').then(r => r.json()).catch(() => null)
      ]).then(([geo, stats, mapping]) => {
        setIndigenasData(geo);
        setIndigenasStats(stats);
        setIndigenasPueblosMapping(mapping);
        setIsIndigenasLoading(false);
      }).catch((e) => {
        console.error("Error fetching indigenous data:", e);
        setIsIndigenasLoading(false);
      });
    }
  }, [showIndigenas, indigenasData]);

  // Lazy load new layers
  useEffect(() => {
    if (showSalud && !saludData) {
      setIsSaludLoading(true);
      fetch('/concepcion_amambay_geodemogsocial/locales_de_salud.geojson')
        .then(r => r.json())
        .then(data => { setSaludData(data); setIsSaludLoading(false); })
        .catch(e => { console.error(e); setIsSaludLoading(false); });
    }
  }, [showSalud, saludData]);

  useEffect(() => {
    if (showEducacion && !educacionData) {
      setIsEducacionLoading(true);
      fetch('/concepcion_amambay_geodemogsocial/locales_educativos.geojson')
        .then(r => r.json())
        .then(data => { setEducacionData(data); setIsEducacionLoading(false); })
        .catch(e => { console.error(e); setIsEducacionLoading(false); });
    }
  }, [showEducacion, educacionData]);

  useEffect(() => {
    if (showAgua && !aguaData) {
      setIsAguaLoading(true);
      fetch('/concepcion_amambay_geodemogsocial/tanques_de_agua_comunitarios.geojson')
        .then(r => r.json())
        .then(data => { setAguaData(data); setIsAguaLoading(false); })
        .catch(e => { console.error(e); setIsAguaLoading(false); });
    }
  }, [showAgua, aguaData]);

  useEffect(() => {
    if (showPobreza && !pobrezaData) {
      setIsPobrezaLoading(true);
      fetch('/concepcion_amambay_geodemogsocial/poblacion_en_situacion_de_pobreza_expuesta_a_inundaciones.geojson')
        .then(r => r.json())
        .then(data => { setPobrezaData(data); setIsPobrezaLoading(false); })
        .catch(e => { console.error(e); setIsPobrezaLoading(false); });
    }
  }, [showPobreza, pobrezaData]);

  return (
    <div className="app-container">
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <h2>Cargando Datos Geográficos...</h2>
        </div>
      )}
      {isPointsLoading && (
        <div className="loading-overlay" style={{ background: 'rgba(0,0,0,0.6)', zIndex: 10000 }}>
          <div className="spinner"></div>
          <h2>Cargando Miles de Puntos de Viviendas...</h2>
        </div>
      )}
      
      {isIndigenasLoading && (
        <div className="loading-overlay" style={{ background: 'rgba(0,0,0,0.6)', zIndex: 10000 }}>
          <div className="spinner"></div>
          <h2>Cargando Comunidades Indígenas y Estadísticas...</h2>
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
            showBarrios={showBarrios}
            setShowBarrios={setShowBarrios}
            showManzanas={showManzanas}
            setShowManzanas={setShowManzanas}
            showPuntos={showPuntos}
            setShowPuntos={setShowPuntos}
            showIndigenas={showIndigenas}
            setShowIndigenas={setShowIndigenas}
            showSalud={showSalud}
            setShowSalud={setShowSalud}
            showEducacion={showEducacion}
            setShowEducacion={setShowEducacion}
            showAgua={showAgua}
            setShowAgua={setShowAgua}
            showPobreza={showPobreza}
            setShowPobreza={setShowPobreza}
          />
          <MapViewer 
            geoData={geoData} 
            activeDepartment={activeDepartment} 
            rutasData={rutasData}
            hidroData={hidroData}
            barriosData={barriosData}
            manzanasData={manzanasData}
            viviendasData={viviendasData}
            indigenasData={indigenasData}
            indigenasStats={indigenasStats}
            indigenasPueblosMapping={indigenasPueblosMapping}
            saludData={saludData}
            educacionData={educacionData}
            aguaData={aguaData}
            pobrezaData={pobrezaData}
            showRoutes={showRoutes}
            showWater={showWater}
            showBarrios={showBarrios}
            showManzanas={showManzanas}
            showPuntos={showPuntos}
            showIndigenas={showIndigenas}
            showSalud={showSalud}
            showEducacion={showEducacion}
            showAgua={showAgua}
            showPobreza={showPobreza}
          />
        </>
      )}
    </div>
  );
}

export default App;
