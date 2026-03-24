import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Droplets,
  FileDown,
  Filter,
  Globe,
  GraduationCap,
  HeartPulse,
  Home,
  Layers,
  Loader2,
  MapPinned,
  MoonStar,
  Route,
  Search,
  Sun,
  Trees,
  Users,
  Waves,
  XCircle,
} from 'lucide-react';
import type {
  BaseStats,
  BasemapKey,
  DepartmentCode,
  DistrictOption,
  LayerHealthItem,
  LayerVisibilityState,
} from '../types';
import { formatNumber } from '../utils/geo';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (value: boolean) => void;
  activeDepartment: DepartmentCode;
  setActiveDepartment: (value: DepartmentCode) => void;
  basemap: BasemapKey;
  setBasemap: (value: BasemapKey) => void;
  baseStats: BaseStats;
  selectedDistrict: DistrictOption | null;
  selectedDistrictKey: string | null;
  setSelectedDistrictKey: (value: string | null) => void;
  districtOptions: DistrictOption[];
  visibleLayerCount: number;
  layerVisibility: LayerVisibilityState;
  setLayer: (layerId: keyof LayerVisibilityState, nextValue: boolean) => void;
  showAllLayers: () => void;
  hideAllLayers: () => void;
  layerHealthItems: LayerHealthItem[];
  baseFeatureCount: number;
  optionalErrors: string[];
  resetView: () => void;
  retryFailedLayers: () => void;
  exportCurrentConfiguration: () => void;
  onOpenGenerator: () => void;
}

const LAYER_LABELS: Array<{
  id: keyof LayerVisibilityState;
  label: string;
  icon: JSX.Element;
}> = [
  { id: 'routes', label: 'Rutas', icon: <Route size={16} /> },
  { id: 'water', label: 'Hidrografía', icon: <Waves size={16} /> },
  { id: 'barrios', label: 'Barrios', icon: <MapPinned size={16} /> },
  { id: 'manzanas', label: 'Manzanas censales', icon: <Home size={16} /> },
  { id: 'puntos', label: 'Viviendas', icon: <Layers size={16} /> },
  { id: 'indigenas', label: 'Comunidades indígenas', icon: <Trees size={16} /> },
  { id: 'salud', label: 'Locales de salud', icon: <HeartPulse size={16} /> },
  { id: 'educacion', label: 'Locales educativos', icon: <GraduationCap size={16} /> },
  { id: 'agua', label: 'Tanques de agua', icon: <Droplets size={16} /> },
  { id: 'pobreza', label: 'Riesgo de inundación', icon: <AlertTriangle size={16} /> },
  { id: 'vias', label: 'Vías principales', icon: <Route size={16} /> },
  { id: 'usoSuelos', label: 'Uso de suelos', icon: <Trees size={16} /> },
  { id: 'censo', label: 'Censo 2022', icon: <Users size={16} /> },
];

function statusClass(status: LayerHealthItem['status']): string {
  if (status === 'loaded') return 'status-loaded';
  if (status === 'loading') return 'status-loading';
  if (status === 'error') return 'status-error';
  return 'status-idle';
}

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  activeDepartment,
  setActiveDepartment,
  basemap,
  setBasemap,
  baseStats,
  selectedDistrict,
  selectedDistrictKey,
  setSelectedDistrictKey,
  districtOptions,
  visibleLayerCount,
  layerVisibility,
  setLayer,
  showAllLayers,
  hideAllLayers,
  layerHealthItems,
  baseFeatureCount,
  optionalErrors,
  resetView,
  retryFailedLayers,
  exportCurrentConfiguration,
  onOpenGenerator,
}: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDistrictOptions = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return districtOptions;

    return districtOptions.filter((item) => {
      return (
        item.districtName.toLowerCase().includes(normalized) ||
        item.departmentName.toLowerCase().includes(normalized)
      );
    });
  }, [districtOptions, searchTerm]);

  return (
    <>
      <button
        className="sidebar-toggle"
        type="button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label={sidebarOpen ? 'Contraer panel lateral' : 'Expandir panel lateral'}
      >
        {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
      </button>

      <aside className={`sidebar-panel ${sidebarOpen ? 'is-open' : 'is-collapsed'}`}>
        <div className="sidebar-header">
          <div>
            <p className="eyebrow">Monitor geodemográfico</p>
            <h1>Concepción y Amambay</h1>
            <p className="sidebar-subtitle">
              Visualización territorial robustecida, con auditoría técnica y carga tolerante a fallas.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', zIndex: 1000, position: 'absolute', top: '22px', right: '18px' }}>
            <button className="primary-button" type="button" onClick={onOpenGenerator} style={{ padding: '8px 12px', fontSize: '0.85rem' }}>
              <Calculator size={15} /> Generar Muestra
            </button>
            <button className="secondary-button" type="button" onClick={exportCurrentConfiguration} style={{ padding: '8px', width: '36px', justifyContent: 'center' }}>
              <FileDown size={15} />
            </button>
          </div>
        </div>

        <section className="card-grid">
          <article className="metric-card">
            <span className="metric-label">Hogares totales</span>
            <strong className="metric-value">{formatNumber(baseStats.totalHogares)}</strong>
            <span className="metric-foot">Distritos base: {formatNumber(baseFeatureCount)}</span>
          </article>

          <article className="metric-card">
            <span className="metric-label">Concepción</span>
            <strong className="metric-value accent-blue">
              {formatNumber(baseStats.hogaresConcepcion)}
            </strong>
            <span className="metric-foot">Departamento 01</span>
          </article>

          <article className="metric-card">
            <span className="metric-label">Amambay</span>
            <strong className="metric-value accent-violet">
              {formatNumber(baseStats.hogaresAmambay)}
            </strong>
            <span className="metric-foot">Departamento 13</span>
          </article>

          <article className="metric-card">
            <span className="metric-label">Capas activas</span>
            <strong className="metric-value accent-emerald">{visibleLayerCount}</strong>
            <span className="metric-foot">Capas temáticas visibles</span>
          </article>
        </section>

        <section className="section-card">
          <div className="section-title">
            <Filter size={17} />
            <h2>Filtros territoriales</h2>
          </div>

          <div className="button-group">
            <button
              type="button"
              className={`chip-button ${activeDepartment === null ? 'is-active' : ''}`}
              onClick={() => setActiveDepartment(null)}
            >
              Ambos departamentos
            </button>
            <button
              type="button"
              className={`chip-button ${activeDepartment === '01' ? 'is-active' : ''}`}
              onClick={() => setActiveDepartment('01')}
            >
              Solo Concepción
            </button>
            <button
              type="button"
              className={`chip-button ${activeDepartment === '13' ? 'is-active' : ''}`}
              onClick={() => setActiveDepartment('13')}
            >
              Solo Amambay
            </button>
          </div>

          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar distrito"
            />
          </div>

          <div className="district-list">
            <button
              type="button"
              className={`district-item ${selectedDistrictKey === null ? 'is-active' : ''}`}
              onClick={() => setSelectedDistrictKey(null)}
            >
              <span>Sin selección específica</span>
              <span className="district-tag">Vista general</span>
            </button>

            {filteredDistrictOptions.slice(0, 20).map((item) => (
              <button
                key={item.key}
                type="button"
                className={`district-item ${selectedDistrictKey === item.key ? 'is-active' : ''}`}
                onClick={() => setSelectedDistrictKey(item.key)}
              >
                <span>
                  {item.districtName}, {item.departmentName}
                </span>
                <span className="district-tag">{formatNumber(item.totalValue)}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="section-card">
          <div className="section-title">
            <Globe size={17} />
            <h2>Mapa base</h2>
          </div>

          <div className="button-group basemap-group">
            <button
              type="button"
              className={`chip-button ${basemap === 'light' ? 'is-active' : ''}`}
              onClick={() => setBasemap('light')}
            >
              <Sun size={15} />
              Claro
            </button>
            <button
              type="button"
              className={`chip-button ${basemap === 'dark' ? 'is-active' : ''}`}
              onClick={() => setBasemap('dark')}
            >
              <MoonStar size={15} />
              Oscuro
            </button>
            <button
              type="button"
              className={`chip-button ${basemap === 'satellite' ? 'is-active' : ''}`}
              onClick={() => setBasemap('satellite')}
            >
              <Globe size={15} />
              Satelital
            </button>
          </div>
        </section>

        <section className="section-card">
          <div className="section-title">
            <Layers size={17} />
            <h2>Capas temáticas</h2>
          </div>

          <div className="toolbar-row">
            <button className="secondary-button" type="button" onClick={showAllLayers}>
              Mostrar todo
            </button>
            <button className="secondary-button" type="button" onClick={hideAllLayers}>
              Ocultar todo
            </button>
            <button className="secondary-button" type="button" onClick={resetView}>
              Restablecer vista
            </button>
          </div>

          <div className="layer-list">
            {LAYER_LABELS.map((layer) => (
              <label key={layer.id} className={`layer-item ${layerVisibility[layer.id] ? 'is-active' : ''}`}>
                <span className="layer-item-left">
                  {layer.icon}
                  {layer.label}
                </span>
                <input
                  type="checkbox"
                  checked={layerVisibility[layer.id]}
                  onChange={(event) => setLayer(layer.id, event.target.checked)}
                />
              </label>
            ))}
          </div>
        </section>

        {selectedDistrict && (
          <section className="section-card highlight-card">
            <div className="section-title">
              <MapPinned size={17} />
              <h2>Distrito seleccionado</h2>
            </div>

            <div className="selected-district">
              <strong>{selectedDistrict.districtName}</strong>
              <span>{selectedDistrict.departmentName}</span>
              <span>Hogares estimados: {formatNumber(selectedDistrict.totalValue)}</span>
              <span>
                Coordenadas de referencia: {selectedDistrict.lat?.toFixed(4) ?? 'N/D'}, {selectedDistrict.lng?.toFixed(4) ?? 'N/D'}
              </span>
            </div>
          </section>
        )}

        <section className="section-card">
          <div className="section-title">
            <BookOpen size={17} />
            <h2>Salud de recursos</h2>
          </div>

          {optionalErrors.length > 0 && (
            <div className="alert-box">
              <AlertTriangle size={16} />
              <div>
                <strong>Se detectaron capas con error</strong>
                <p>
                  Revise el estado por recurso y utilice la recarga selectiva.
                </p>
              </div>
              <button className="secondary-button" type="button" onClick={retryFailedLayers}>
                Reintentar
              </button>
            </div>
          )}

          <div className="health-list">
            {layerHealthItems.map((item) => (
              <div key={item.id} className="health-item">
                <div className="health-item-main">
                  <span className={`status-dot ${statusClass(item.status)}`} />
                  <div>
                    <strong>{item.label}</strong>
                    <p>
                      {item.status === 'loaded' && `Cargado, registros visibles: ${formatNumber(item.count ?? 0)}`}
                      {item.status === 'loading' && 'Cargando recurso'}
                      {item.status === 'idle' && 'Aún no solicitado'}
                      {item.status === 'error' && (item.error || 'Error no identificado')}
                    </p>
                  </div>
                </div>
                {item.status === 'loading' && <Loader2 className="spin-icon" size={15} />}
                {item.status === 'error' && <XCircle size={15} className="error-icon" />}
              </div>
            ))}
          </div>
        </section>
      </aside>
    </>
  );
}
