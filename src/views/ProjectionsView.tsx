import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
  AreaChart, Area, ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import PopulationPyramid from '../components/charts/PopulationPyramid';
import KPICard from '../components/charts/KPICard';
import { getProjection } from '../data/projectionEngine';
import type { DeptKey } from '../data/census2022';
import { CENSUS } from '../data/census2022';
import type { ScenarioKey } from '../data/projectionEngine';

const fmt = (n: number) => Math.round(n).toLocaleString('es-PY');
const pct = (n: number, d = 1) => n.toFixed(d) + '%';

const SCENARIO_COLORS: Record<ScenarioKey, string> = {
  optimista:  '#059669',
  medio:      '#2563eb',
  pesimista:  '#dc2626',
};

const SCENARIO_LABELS: Record<ScenarioKey, string> = {
  optimista:  'Optimista',
  medio:      'Medio',
  pesimista:  'Pesimista',
};

export default function ProjectionsView() {
  const [dept, setDept] = useState<DeptKey>('concepcion');
  const [scenario, setScenario] = useState<ScenarioKey>('medio');
  const [targetAnio, setTargetAnio] = useState(2042);

  const series = useMemo(() => getProjection(dept, scenario), [dept, scenario]);
  const allScenarios = useMemo(() => ({
    optimista: getProjection(dept, 'optimista'),
    medio:     getProjection(dept, 'medio'),
    pesimista: getProjection(dept, 'pesimista'),
  }), [dept]);

  const idx = series.findIndex(r => r.anio === targetAnio) ?? series.length - 1;
  const targetRow = series[Math.max(0, idx)];
  const baseRow   = series[0];
  const lastRow   = series[series.length - 1];

  const piramideTarget = targetRow?.piramide?.map(g => ({
    grupo: g.grupo, varones: g.varones, mujeres: g.mujeres,
  })) ?? [];

  // Series para comparativa de escenarios
  const comparData = series.map((row, i) => ({
    anio: row.anio,
    optimista: allScenarios.optimista[i]?.pobTotal,
    medio:     allScenarios.medio[i]?.pobTotal,
    pesimista: allScenarios.pesimista[i]?.pobTotal,
  }));

  const varPob = lastRow ? ((lastRow.pobTotal - baseRow.pobTotal) / baseRow.pobTotal * 100) : 0;
  const VarIcon = varPob > 0 ? TrendingUp : varPob < 0 ? TrendingDown : Minus;

  return (
    <div className="view-container">
      {/* Selectores */}
      <div className="dept-selector">
        {(['concepcion', 'amambay'] as DeptKey[]).map(k => (
          <button key={k} className={`dept-btn${dept === k ? ' active' : ''}`} onClick={() => setDept(k)}>
            {CENSUS[k].nombre}
          </button>
        ))}
      </div>

      <h2 className="view-title">
        Proyecciones Demográficas · {CENSUS[dept].nombre}
        <span className="view-subtitle"> — 2022–2052 · Método cohorte-componente</span>
      </h2>

      <div className="scenario-selector">
        <span className="scenario-label">Escenario:</span>
        {(['optimista','medio','pesimista'] as ScenarioKey[]).map(s => (
          <button
            key={s}
            className={`scenario-btn${scenario === s ? ' active' : ''}`}
            style={{ ['--sc' as any]: SCENARIO_COLORS[s] }}
            onClick={() => setScenario(s)}
          >
            {SCENARIO_LABELS[s]}
          </button>
        ))}
      </div>

      {/* KPIs dinámicos */}
      <div className="kpi-grid">
        <KPICard
          label="Población 2022 (base)"
          value={fmt(baseRow.pobTotal)}
          sub="Censo 2022"
          color="var(--text-secondary)"
        />
        <KPICard
          label={`Población 2052 (${SCENARIO_LABELS[scenario]})`}
          value={fmt(lastRow?.pobTotal ?? 0)}
          sub={`${varPob > 0 ? '+' : ''}${varPob.toFixed(1)}% vs 2022`}
          color={SCENARIO_COLORS[scenario]}
          icon={<VarIcon size={20} />}
        />
        <KPICard
          label="TGF 2052"
          value={lastRow?.tgf?.toFixed(2) ?? '—'}
          sub={`Inicia en ${baseRow.tgf}`}
          color="var(--amber-600)"
        />
        <KPICard
          label="Esp. de vida 2052 (H/M)"
          value={`${lastRow?.ev0h ?? '—'} / ${lastRow?.ev0m ?? '—'}`}
          sub={`Inicia ${baseRow.ev0h} / ${baseRow.ev0m} años`}
          color="var(--cyan-600)"
        />
        <KPICard
          label="Tasa natalidad 2052"
          value={(lastRow?.tasaNatalidad ?? 0) + '‰'}
          sub={`Inicia en ${baseRow.tasaNatalidad}‰`}
          color="var(--emerald-600)"
        />
        <KPICard
          label="Razón dependencia 2052"
          value={(lastRow?.razDependencia ?? 0).toFixed(1) + '%'}
          sub={`Inicia en ${baseRow.razDependencia}%`}
          color="var(--violet-600)"
        />
      </div>

      {/* Gráfico población total */}
      <div className="chart-card">
        <h4 className="chart-title">Proyección de población total — comparativa de escenarios</h4>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={comparData} margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
            <XAxis dataKey="anio" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={v => (v/1000).toFixed(0)+'k'} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number, name: string) => [fmt(v), SCENARIO_LABELS[name as ScenarioKey] ?? name]} />
            <Legend formatter={(v: string) => SCENARIO_LABELS[v as ScenarioKey] ?? v} />
            {(['optimista','medio','pesimista'] as ScenarioKey[]).map(s => (
              <Line
                key={s}
                type="monotone"
                dataKey={s}
                stroke={SCENARIO_COLORS[s]}
                strokeWidth={s === scenario ? 2.5 : 1.5}
                dot={false}
                strokeDasharray={s === 'pesimista' ? '6 3' : s === 'optimista' ? '2 3' : undefined}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Nacimientos y defunciones */}
      <div className="charts-grid-2">
        <div className="chart-card">
          <h4 className="chart-title">Nacimientos y defunciones anuales</h4>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={series} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
              <XAxis dataKey="anio" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number, name: string) => [fmt(v), name === 'nacimientos' ? 'Nacimientos' : 'Defunciones']} />
              <Legend formatter={(v: string) => v === 'nacimientos' ? 'Nacimientos' : 'Defunciones'} />
              <Area type="monotone" dataKey="nacimientos" stroke="#059669" fill="#d1fae5" strokeWidth={2} />
              <Area type="monotone" dataKey="defunciones" stroke="#dc2626" fill="#fee2e2" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Tasa de crecimiento y dependencia */}
        <div className="chart-card">
          <h4 className="chart-title">Razón de dependencia e índice de envejecimiento</h4>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={series} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
              <XAxis dataKey="anio" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number, name: string) => [v.toFixed(1)+'%', name === 'razDependencia' ? 'Razón dependencia' : 'Índice envejecimiento']} />
              <Legend formatter={(v: string) => v === 'razDependencia' ? 'Razón dependencia' : 'Índice envejecimiento'} />
              <Line type="monotone" dataKey="razDependencia" stroke="#d97706" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="indiceEnvejecimiento" stroke="#7c3aed" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TGF y esperanza de vida */}
      <div className="charts-grid-2">
        <div className="chart-card">
          <h4 className="chart-title">Tasa Global de Fecundidad (TGF)</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={series} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
              <XAxis dataKey="anio" tick={{ fontSize: 11 }} />
              <YAxis domain={[1.5, 4]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [v.toFixed(2), 'TGF']} />
              <ReferenceLine y={2.1} stroke="#dc2626" strokeDasharray="6 3" label={{ value:'Reemplazo (2.1)', fontSize:10, fill:'#dc2626' }} />
              <Line type="monotone" dataKey="tgf" stroke={SCENARIO_COLORS[scenario]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h4 className="chart-title">Esperanza de vida al nacer (años)</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={series} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
              <XAxis dataKey="anio" tick={{ fontSize: 11 }} />
              <YAxis domain={[68, 86]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number, name: string) => [v.toFixed(1)+' años', name === 'ev0h' ? 'Hombres' : 'Mujeres']} />
              <Legend formatter={(v: string) => v === 'ev0h' ? 'Hombres' : 'Mujeres'} />
              <Line type="monotone" dataKey="ev0h" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ev0m" stroke="#dc2626" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pirámide en año objetivo */}
      <div className="chart-card">
        <div className="pyramid-year-selector">
          <label>Pirámide proyectada para el año:</label>
          <input
            type="range"
            min={2022} max={2052} step={5}
            value={targetAnio}
            onChange={e => setTargetAnio(+e.target.value)}
            className="year-slider"
          />
          <strong>{targetAnio}</strong>
        </div>
        <div className="charts-grid-2">
          <PopulationPyramid
            data={CENSUS[dept].piramide}
            title="Pirámide 2022 (base)"
            colorH="#93c5fd"
            colorM="#fca5a5"
          />
          {piramideTarget.length > 0 && (
            <PopulationPyramid
              data={piramideTarget}
              title={`Pirámide ${targetAnio} (escenario ${SCENARIO_LABELS[scenario].toLowerCase()})`}
              colorH="#2563eb"
              colorM="#dc2626"
            />
          )}
        </div>
      </div>

      {/* Nota metodológica */}
      <div className="fuentes-card">
        <strong>Metodología:</strong> Método cohorte-componente (Leslie matrix simplificada) adaptado de proypob (Paraguay nacional, CELADE/CEPAL).
        Base: Censo 2022. Parámetros: TGF departamental calibrada con EPH; tablas de mortalidad aproximadas Coale-Demeny (West);
        migración neta estimada según tendencias históricas departamentales.
        Tres escenarios: <em>optimista</em> (mayor descenso fecundidad, mejor salud, mayor inmigración),
        <em>medio</em> (tendencias actuales), <em>pesimista</em> (menor descenso fecundidad, mayor emigración).
      </div>
    </div>
  );
}
