import { useState } from 'react';
import type { ReactNode } from 'react';
import { BarChart2, Download, Loader, Map, TrendingUp, HeartPulse, Factory, FlaskConical } from 'lucide-react';
import type { ViewId } from '../types';
import { generateExcel } from './ExportPanel';

interface NavBarProps {
  activeView: ViewId;
  onViewChange: (v: ViewId) => void;
}

const TABS: { id: ViewId; label: string; icon: ReactNode }[] = [
  { id: 'mapa',        label: 'Mapa',             icon: <Map size={16} /> },
  { id: 'demografia',  label: 'Demografía',        icon: <BarChart2 size={16} /> },
  { id: 'proyecciones',label: 'Proyecciones',      icon: <TrendingUp size={16} /> },
  { id: 'social',      label: 'Indicadores Sociales', icon: <HeartPulse size={16} /> },
  { id: 'impacto',     label: 'Impacto PARACEL',   icon: <Factory size={16} /> },
  { id: 'metodologia', label: 'Metodología',        icon: <FlaskConical size={16} /> },
];

export default function NavBar({ activeView, onViewChange }: NavBarProps) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      await generateExcel();
    } finally {
      setExporting(false);
    }
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">●</span>
        <span className="navbar-title">
          Estudio Geodemogsocial · <strong>Concepción &amp; Amambay</strong>
        </span>
      </div>
      <div className="navbar-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`navbar-tab${activeView === t.id ? ' active' : ''}`}
            onClick={() => onViewChange(t.id)}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      <button
        className="navbar-export-btn"
        onClick={handleExport}
        disabled={exporting}
        title="Exportar datos a Excel"
      >
        {exporting ? <Loader size={15} className="spin" /> : <Download size={15} />}
        <span>{exporting ? 'Generando…' : 'Excel'}</span>
      </button>
    </nav>
  );
}
