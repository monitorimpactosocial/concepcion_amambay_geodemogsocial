import { MapPin, Users, Filter, Layers, Menu, X, Route, Droplets, Activity, BookOpen, AlertTriangle, ArrowDownToDot } from 'lucide-react';
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
  showBarrios: boolean;
  setShowBarrios: (show: boolean) => void;
  showManzanas: boolean;
  setShowManzanas: (show: boolean) => void;
  showPuntos: boolean;
  setShowPuntos: (show: boolean) => void;
  showIndigenas: boolean;
  setShowIndigenas: (show: boolean) => void;
  showSalud: boolean;
  setShowSalud: (show: boolean) => void;
  showEducacion: boolean;
  setShowEducacion: (show: boolean) => void;
  showAgua: boolean;
  setShowAgua: (show: boolean) => void;
  showPobreza: boolean;
  setShowPobreza: (show: boolean) => void;
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
  setShowWater,
  showBarrios,
  setShowBarrios,
  showManzanas,
  setShowManzanas,
  showPuntos,
  setShowPuntos,
  showIndigenas,
  setShowIndigenas,
  showSalud,
  setShowSalud,
  showEducacion,
  setShowEducacion,
  showAgua,
  setShowAgua,
  showPobreza,
  setShowPobreza
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
            <button 
              className={`filter-btn ${showBarrios ? 'active' : ''}`}
              onClick={() => setShowBarrios(!showBarrios)}
              style={{ justifyContent: 'flex-start', gap: '12px' }}
            >
              <div style={{ width: 16, height: 16, border: `2px solid ${showBarrios ? '#ec4899' : 'currentColor'}`, borderRadius: 2 }} />
              <span>Barrios Locales</span>
            </button>
            <button 
              className={`filter-btn ${showManzanas ? 'active' : ''}`}
              onClick={() => setShowManzanas(!showManzanas)}
              style={{ justifyContent: 'flex-start', gap: '12px' }}
            >
              <div style={{ width: 16, height: 16, border: `1px solid ${showManzanas ? '#ef4444' : 'currentColor'}`, background: showManzanas ? 'rgba(239, 68, 68, 0.2)' : 'transparent' }} />
              <span>Manzanas Censales</span>
            </button>
            <button 
              className={`filter-btn ${showPuntos ? 'active' : ''}`}
              onClick={() => setShowPuntos(!showPuntos)}
              style={{ justifyContent: 'flex-start', gap: '12px' }}
            >
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: showPuntos ? '#facc15' : 'currentColor', opacity: 0.8 }} />
              <span>Viviendas (Puntos)</span>
            </button>
            <button 
              className={`filter-btn ${showIndigenas ? 'active' : ''}`}
              onClick={() => setShowIndigenas(!showIndigenas)}
              style={{ justifyContent: 'flex-start', gap: '12px' }}
            >
              <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${showIndigenas ? '#10b981' : 'currentColor'}` }} />
              <span style={{ color: showIndigenas ? '#10b981' : 'inherit', fontWeight: showIndigenas ? 600 : 'normal' }}>
                Comunidades Indígenas
              </span>
            </button>
            <button 
              className={`filter-btn ${showSalud ? 'active' : ''}`}
              onClick={() => setShowSalud(!showSalud)}
              style={{ justifyContent: 'flex-start', gap: '12px' }}
            >
              <Activity size={16} style={{ color: showSalud ? '#22c55e' : 'inherit' }} />
              <span>Locales de Salud</span>
            </button>
            <button 
              className={`filter-btn ${showEducacion ? 'active' : ''}`}
              onClick={() => setShowEducacion(!showEducacion)}
              style={{ justifyContent: 'flex-start', gap: '12px' }}
            >
              <BookOpen size={16} style={{ color: showEducacion ? '#f97316' : 'inherit' }} />
              <span>Locales Educativos</span>
            </button>
            <button 
              className={`filter-btn ${showAgua ? 'active' : ''}`}
              onClick={() => setShowAgua(!showAgua)}
              style={{ justifyContent: 'flex-start', gap: '12px' }}
            >
              <ArrowDownToDot size={16} style={{ color: showAgua ? '#06b6d4' : 'inherit' }} />
              <span>Tanques de Agua</span>
            </button>
            <button 
              className={`filter-btn ${showPobreza ? 'active' : ''}`}
              onClick={() => setShowPobreza(!showPobreza)}
              style={{ justifyContent: 'flex-start', gap: '12px' }}
            >
              <AlertTriangle size={16} style={{ color: showPobreza ? '#991b1b' : 'inherit' }} />
              <span>Riesgo Inundación</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
