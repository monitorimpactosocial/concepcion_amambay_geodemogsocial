import type { ReactNode } from 'react';
import { BarChart2, Map, TrendingUp, HeartPulse } from 'lucide-react';
import type { ViewId } from '../types';

interface NavBarProps {
  activeView: ViewId;
  onViewChange: (v: ViewId) => void;
}

const TABS: { id: ViewId; label: string; icon: ReactNode }[] = [
  { id: 'mapa',        label: 'Mapa',             icon: <Map size={16} /> },
  { id: 'demografia',  label: 'Demografía',        icon: <BarChart2 size={16} /> },
  { id: 'proyecciones',label: 'Proyecciones',      icon: <TrendingUp size={16} /> },
  { id: 'social',      label: 'Indicadores Sociales', icon: <HeartPulse size={16} /> },
];

export default function NavBar({ activeView, onViewChange }: NavBarProps) {
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
    </nav>
  );
}
