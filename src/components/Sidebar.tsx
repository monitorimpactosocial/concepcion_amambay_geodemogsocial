import { MapPin, Users, Filter, Layers, Menu, X, Route, Droplets } from 'lucide-react';
import type { GeoJsonObject } from 'geojson';

interface SidebarProps {
  geoData: GeoJsonObject | null;
  activeDepartment: string | null;
  setActiveDepartment: (dpto: string | null) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  showRoutes: boolean;
  setShowRoutes: (show: boolean) => void;
  showWater: boolean;
  setShowWater: (show: boolean) => void;
}

export default function Sidebar({ 
  geoData, 
  activeDepartment, 
  setActiveDepartment, 
  isOpen, 
  setIsOpen,
  showRoutes,
  setShowRoutes,
  showWater,
  setShowWater
}: SidebarProps) {
  // Calculate stats from GeoJSON
  let totalHogares = 0;
  let hogaresConcepcion = 0;
  let hogaresAmambay = 0;
  
  if (geoData && 'features' in geoData) {
    (geoData.features as any[]).forEach(feature => {
      const dpto = feature.properties?.DPTO;
      const val = feature.properties?.value || 0;
      
      totalHogares += val;
      if (dpto === '01') hogaresConcepcion += val;
      if (dpto === '13') hogaresAmambay += val;
    });
  }

  const formatNumber = (num: number) => new Intl.NumberFormat('es-PY').format(num);

  return (
    <>
      <button 
        className="menu-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1 className="title-gradient">Monitor de Impacto Social</h1>
          <p className="subtitle">Análisis Geodemográfico: Concepción y Amambay</p>
        </div>

        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">
              <Users size={16} />
              Total Hogares
            </div>
            <div className="stat-value">{formatNumber(totalHogares)}</div>
            {activeDepartment && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Mostrando datos filtrados
              </div>
            )}
          </div>
          
          <div className="stat-card">
            <div className="stat-label">
              <div className="department-indicator indicator-concepcion"></div>
              Hogares Concepción
            </div>
            <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>
              {formatNumber(hogaresConcepcion)}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">
              <div className="department-indicator indicator-amambay"></div>
              Hogares Amambay
            </div>
            <div className="stat-value" style={{ color: 'var(--accent-secondary)' }}>
              {formatNumber(hogaresAmambay)}
            </div>
          </div>
        </div>

        <div className="filter-section">
          <h3 className="filter-title">
            <Filter size={18} />
            Filtros Territoriales
          </h3>
          <div className="filter-options">
            <button 
              className={`filter-btn ${activeDepartment === null ? 'active' : ''}`}
              onClick={() => setActiveDepartment(null)}
            >
              <span>Mostrar Ambos Departamentos</span>
              <Layers size={16} />
            </button>
            <button 
              className={`filter-btn ${activeDepartment === '01' ? 'active' : ''}`}
              onClick={() => setActiveDepartment('01')}
            >
              <span>Solo Concepción</span>
              <MapPin size={16} />
            </button>
            <button 
              className={`filter-btn ${activeDepartment === '13' ? 'active' : ''}`}
              onClick={() => setActiveDepartment('13')}
            >
              <span>Solo Amambay</span>
              <MapPin size={16} />
            </button>
          </div>
        </div>

        <div className="filter-section" style={{ marginTop: '24px' }}>
          <h3 className="filter-title">
            <Layers size={18} />
            Capas Adicionales
          </h3>
          <div className="filter-options">
            <button 
              className={`filter-btn ${showRoutes ? 'active' : ''}`}
              onClick={() => setShowRoutes(!showRoutes)}
              style={{ justifyContent: 'flex-start', gap: '12px' }}
            >
              <Route size={16} style={{ color: showRoutes ? 'var(--accent-primary)' : 'inherit' }} />
              <span>Rutas Nacionales</span>
            </button>
            <button 
              className={`filter-btn ${showWater ? 'active' : ''}`}
              onClick={() => setShowWater(!showWater)}
              style={{ justifyContent: 'flex-start', gap: '12px' }}
            >
              <Droplets size={16} style={{ color: showWater ? '#0ea5e9' : 'inherit' }} />
              <span>Hidrografía</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
