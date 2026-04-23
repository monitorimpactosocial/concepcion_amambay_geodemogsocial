import type { ReactNode } from 'react';

interface KPICardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: ReactNode;
}

export default function KPICard({ label, value, sub, color = 'var(--emerald-600)', icon }: KPICardProps) {
  return (
    <div className="kpi-card">
      {icon && <div className="kpi-icon" style={{ color }}>{icon}</div>}
      <div className="kpi-value" style={{ color }}>{value}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}
