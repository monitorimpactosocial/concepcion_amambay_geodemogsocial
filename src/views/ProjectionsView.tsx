import { useMemo } from 'react';
import {
  Bar, ComposedChart, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
  AreaChart, Area, ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import PopulationPyramid from '../components/charts/PopulationPyramid';
import KPICard from '../components/charts/KPICard';
import {
  buildLaborIncomeTimeline,
  getLaborYear,
  LABOR_MARKET_SOURCE,
  splitLaborSeries,
} from '../data/laborMarket';
import { SERIES_HISTORICAS } from '../data/socialIndicators';
import type { ScenarioKey } from '../data/projectionEngine';
import type { GlobalFilters } from '../types';
import {
  PARACEL_MILESTONES,
  aggregateCensus,
  aggregateProjection,
  clampHorizonYear,
  deptKeysFromFilters,
  scopeLabel,
  scopedHistoricalValue,
} from '../utils/analysis';

const fmt = (n: number) => Math.round(n).toLocaleString('es-PY');
const fmtGs = (n: number) => `Gs. ${Math.round(n).toLocaleString('es-PY')}`;
const CENSUS_SOURCE = 'INE, Censo 2022';
const PROJECTION_SOURCE = 'INE 2022 + modelo cohorte-componente propio';
const HISTORICAL_SOURCE = 'INE, series historicas disponibles';

const SCENARIO_COLORS: Record<ScenarioKey, string> = {
  optimista: '#059669',
  medio: '#2563eb',
  pesimista: '#dc2626',
};

const SCENARIO_LABELS: Record<ScenarioKey, string> = {
  optimista: 'Optimista',
  medio: 'Medio',
  pesimista: 'Pesimista',
};

function milestoneLines(withLabels = false, yAxisId?: string) {
  return PARACEL_MILESTONES.map((milestone) => (
    <ReferenceLine
      key={milestone.anio}
      yAxisId={yAxisId}
      x={milestone.anio}
      stroke="#111827"
      strokeDasharray="4 4"
      strokeOpacity={0.42}
      label={withLabels ? {
        value: milestone.label,
        angle: -90,
        position: 'insideTop',
        fontSize: 10,
        fill: '#111827',
      } : undefined}
    />
  ));
}

export default function ProjectionsView({ filters }: { filters: GlobalFilters }) {
  const deptKeys = useMemo(() => deptKeysFromFilters(filters), [filters]);
  const scenario = filters.projectionScenario;
  const targetAnio = clampHorizonYear(filters.horizonYear);
  const viewScope = scopeLabel(filters);
  const census = useMemo(() => aggregateCensus(deptKeys), [deptKeys]);

  const series = useMemo(() => aggregateProjection(deptKeys, scenario), [deptKeys, scenario]);
  const allScenarios = useMemo(() => ({
    optimista: aggregateProjection(deptKeys, 'optimista'),
    medio: aggregateProjection(deptKeys, 'medio'),
    pesimista: aggregateProjection(deptKeys, 'pesimista'),
  }), [deptKeys]);

  const targetRow = series.find((row) => row.anio === targetAnio) ?? series[series.length - 1];
  const baseRow = series[0];
  const lastRow = series[series.length - 1];

  const piramideTarget = targetRow?.piramide?.map((group) => ({
    grupo: group.grupo,
    varones: group.varones,
    mujeres: group.mujeres,
  })) ?? [];

  const comparData = series.map((row, i) => ({
    anio: row.anio,
    optimista: allScenarios.optimista[i]?.pobTotal,
    medio: allScenarios.medio[i]?.pobTotal,
    pesimista: allScenarios.pesimista[i]?.pobTotal,
  }));

  const tgfTimeline = useMemo(() => {
    const byYear = new Map<number, {
      anio: number;
      historico: number | null;
      actual: number | null;
      proyectado: number | null;
    }>();

    SERIES_HISTORICAS.tgf.forEach((row) => {
      const value = +scopedHistoricalValue(row, deptKeys).toFixed(2);
      byYear.set(row.anio, {
        anio: row.anio,
        historico: value,
        actual: row.anio === 2022 ? value : null,
        proyectado: null,
      });
    });

    series
      .filter((row) => row.anio >= 2022 && row.anio <= targetAnio)
      .forEach((row) => {
        const current = byYear.get(row.anio) ?? {
          anio: row.anio,
          historico: null,
          actual: null,
          proyectado: null,
        };
        byYear.set(row.anio, {
          ...current,
          actual: row.anio === 2022 ? row.tgf : current.actual,
          proyectado: row.tgf,
        });
      });

    return Array.from(byYear.values()).sort((a, b) => a.anio - b.anio);
  }, [deptKeys, series, targetAnio]);

  const laborTimeline = useMemo(
    () => buildLaborIncomeTimeline(deptKeys, scenario, filters.impactScenario, targetAnio),
    [deptKeys, filters.impactScenario, scenario, targetAnio],
  );
  const laborSeries = useMemo(() => splitLaborSeries(laborTimeline), [laborTimeline]);
  const laborActual = getLaborYear(laborTimeline, 2022);
  const laborTarget = getLaborYear(laborTimeline, targetAnio);

  const varPob = lastRow ? ((lastRow.pobTotal - baseRow.pobTotal) / baseRow.pobTotal * 100) : 0;
  const VarIcon = varPob > 0 ? TrendingUp : varPob < 0 ? TrendingDown : Minus;

  return (
    <div className="view-container">
      <div className="filter-scope-note">
        Filtro aplicado: <strong>{viewScope}</strong> | escenario demografico: <strong>{SCENARIO_LABELS[scenario]}</strong> | horizonte: <strong>{targetAnio}</strong>
        {filters.selectedDistrictName && <span> | proyeccion departamental usada como proxy del distrito seleccionado</span>}
      </div>

      <h2 className="view-title">
        Proyecciones Demograficas · {viewScope}
        <span className="view-subtitle"> — historia disponible, actual 2022 y proyeccion 2022-2052</span>
      </h2>

      <div className="kpi-grid">
        <KPICard
          label="Poblacion 2022 (base)"
          value={fmt(baseRow.pobTotal)}
          sub="Censo 2022"
          source={CENSUS_SOURCE}
          color="var(--text-secondary)"
        />
        <KPICard
          label={`Poblacion ${targetAnio} (${SCENARIO_LABELS[scenario]})`}
          value={fmt(targetRow?.pobTotal ?? 0)}
          sub={`${targetRow && targetRow.pobTotal >= baseRow.pobTotal ? '+' : ''}${targetRow ? (((targetRow.pobTotal - baseRow.pobTotal) / baseRow.pobTotal) * 100).toFixed(1) : '0.0'}% vs 2022`}
          source={PROJECTION_SOURCE}
          color={SCENARIO_COLORS[scenario]}
          icon={<VarIcon size={20} />}
        />
        <KPICard
          label="Poblacion 2052"
          value={fmt(lastRow?.pobTotal ?? 0)}
          sub={`${varPob > 0 ? '+' : ''}${varPob.toFixed(1)}% vs 2022`}
          source={PROJECTION_SOURCE}
          color="var(--blue-600)"
        />
        <KPICard
          label={`TGF ${targetAnio}`}
          value={targetRow?.tgf?.toFixed(2) ?? '—'}
          sub={`Actual 2022: ${baseRow.tgf}`}
          source={PROJECTION_SOURCE}
          color="var(--amber-600)"
        />
        <KPICard
          label={`Esp. vida ${targetAnio} (H/M)`}
          value={`${targetRow?.ev0h ?? '—'} / ${targetRow?.ev0m ?? '—'}`}
          sub={`Actual 2022: ${baseRow.ev0h} / ${baseRow.ev0m}`}
          source={PROJECTION_SOURCE}
          color="var(--cyan-600)"
        />
        <KPICard
          label={`Dependencia ${targetAnio}`}
          value={(targetRow?.razDependencia ?? 0).toFixed(1) + '%'}
          sub={`Actual 2022: ${baseRow.razDependencia}%`}
          source={PROJECTION_SOURCE}
          color="var(--violet-600)"
        />
        <KPICard
          label={`PEA ${targetAnio}`}
          value={fmt(laborTarget.pea)}
          sub={`Actual 2022: ${fmt(laborActual.pea)}`}
          source={LABOR_MARKET_SOURCE}
          color="var(--emerald-700)"
        />
        <KPICard
          label={`Ocupados ${targetAnio}`}
          value={fmt(laborTarget.ocupados)}
          sub={`Actual 2022: ${fmt(laborActual.ocupados)}`}
          source={LABOR_MARKET_SOURCE}
          color="var(--blue-600)"
        />
        <KPICard
          label={`Salario medio ${targetAnio}`}
          value={fmtGs(laborTarget.salarioMedioGs)}
          sub={`Actual 2022: ${fmtGs(laborActual.salarioMedioGs)}`}
          source={LABOR_MARKET_SOURCE}
          color="var(--amber-600)"
        />
      </div>

      <div className="chart-card">
        <h4 className="chart-title">Serie integrada: historico disponible, actual y proyectado</h4>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={tgfTimeline} margin={{ top: 8, right: 24, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
            <XAxis dataKey="anio" tick={{ fontSize: 11 }} />
            <YAxis domain={[1.5, 4.5]} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number, name: string) => [
              v.toFixed(2),
              name === 'historico' ? 'Historico disponible' : name === 'actual' ? 'Actual/base 2022' : 'Proyectado',
            ]} />
            <Legend formatter={(v: string) => v === 'historico' ? 'Historico disponible' : v === 'actual' ? 'Actual/base' : 'Proyectado'} />
            <ReferenceLine y={2.1} stroke="#dc2626" strokeDasharray="6 3" label={{ value: 'Reemplazo 2.1', fontSize: 10, fill: '#dc2626' }} />
            {milestoneLines(true)}
            <Line type="monotone" dataKey="historico" stroke="#64748b" strokeWidth={2} dot connectNulls />
            <Line type="monotone" dataKey="actual" stroke="#111827" strokeWidth={0} dot={{ r: 5, fill: '#111827' }} />
            <Line type="monotone" dataKey="proyectado" stroke={SCENARIO_COLORS[scenario]} strokeWidth={2.6} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
        <p className="source-note"><strong>Fuente:</strong> {HISTORICAL_SOURCE}; {PROJECTION_SOURCE}.</p>
      </div>

      <div className="charts-grid-2">
        <div className="chart-card">
          <h4 className="chart-title">PEA y poblacion ocupada: historico, actual y proyectado</h4>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={laborSeries} margin={{ top: 8, right: 24, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
              <XAxis dataKey="anio" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number, name: string) => [
                fmt(v),
                name.toLowerCase().includes('pea') ? 'PEA' : 'Poblacion ocupada',
              ]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine x={2022} stroke="#111827" strokeDasharray="4 4" label={{ value: 'Actual 2022', fontSize: 10, fill: '#111827' }} />
              {milestoneLines()}
              <Line type="monotone" dataKey="peaHistorico" name="PEA historica" stroke="#64748b" strokeWidth={2} dot connectNulls />
              <Line type="monotone" dataKey="peaActual" name="PEA actual" stroke="#111827" strokeWidth={0} dot={{ r: 5, fill: '#111827' }} />
              <Line type="monotone" dataKey="peaProyectado" name="PEA proyectada" stroke="#059669" strokeWidth={2.6} dot={false} connectNulls />
              <Line type="monotone" dataKey="ocupadosHistorico" name="Ocupados historicos" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 3" dot connectNulls />
              <Line type="monotone" dataKey="ocupadosActual" name="Ocupados actual" stroke="#111827" strokeWidth={0} dot={{ r: 5, fill: '#111827' }} />
              <Line type="monotone" dataKey="ocupadosProyectado" name="Ocupados proyectados" stroke="#2563eb" strokeWidth={2.6} strokeDasharray="5 3" dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
          <p className="source-note"><strong>Fuente:</strong> {LABOR_MARKET_SOURCE}</p>
        </div>

        <div className="chart-card">
          <h4 className="chart-title">Salario medio mensual e ingreso PARACEL: historico, actual y proyectado</h4>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={laborSeries} margin={{ top: 8, right: 24, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
              <XAxis dataKey="anio" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tickFormatter={(v) => `${(Number(v) / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${Math.round(Number(v) / 1_000_000_000)} MM`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number, name: string) => [
                name === 'Ingreso PARACEL mensual' ? `${fmt(v)} Gs.` : fmtGs(v),
                name,
              ]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine yAxisId="left" x={2022} stroke="#111827" strokeDasharray="4 4" />
              {milestoneLines(false, 'left')}
              <Bar yAxisId="right" dataKey="ingresoParacelMensualGs" name="Ingreso PARACEL mensual" fill="#f59e0b" opacity={0.38} radius={[4, 4, 0, 0]} />
              <Line yAxisId="left" type="monotone" dataKey="salarioHistorico" name="Salario historico" stroke="#64748b" strokeWidth={2} dot connectNulls />
              <Line yAxisId="left" type="monotone" dataKey="salarioActual" name="Salario actual" stroke="#111827" strokeWidth={0} dot={{ r: 5, fill: '#111827' }} />
              <Line yAxisId="left" type="monotone" dataKey="salarioProyectado" name="Salario proyectado" stroke="#d97706" strokeWidth={2.6} dot={false} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="source-note"><strong>Fuente:</strong> {LABOR_MARKET_SOURCE}</p>
        </div>
      </div>

      <div className="chart-card">
        <h4 className="chart-title">Proyeccion de poblacion total — comparativa de escenarios</h4>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={comparData} margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
            <XAxis dataKey="anio" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={v => (Number(v) / 1000).toFixed(0) + 'k'} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number, name: string) => [fmt(v), SCENARIO_LABELS[name as ScenarioKey] ?? name]} />
            <Legend formatter={(v: string) => SCENARIO_LABELS[v as ScenarioKey] ?? v} />
            {milestoneLines()}
            {(['optimista', 'medio', 'pesimista'] as ScenarioKey[]).map((s) => (
              <Line
                key={s}
                type="monotone"
                dataKey={s}
                stroke={SCENARIO_COLORS[s]}
                strokeWidth={s === scenario ? 2.8 : 1.5}
                dot={false}
                strokeDasharray={s === 'pesimista' ? '6 3' : s === 'optimista' ? '2 3' : undefined}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        <p className="source-note"><strong>Fuente:</strong> {PROJECTION_SOURCE}.</p>
      </div>

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
              {milestoneLines()}
              <Area type="monotone" dataKey="nacimientos" stroke="#059669" fill="#d1fae5" strokeWidth={2} />
              <Area type="monotone" dataKey="defunciones" stroke="#dc2626" fill="#fee2e2" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
          <p className="source-note"><strong>Fuente:</strong> {PROJECTION_SOURCE}.</p>
        </div>

        <div className="chart-card">
          <h4 className="chart-title">Dependencia e indice de envejecimiento</h4>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={series} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
              <XAxis dataKey="anio" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number, name: string) => [v.toFixed(1) + '%', name === 'razDependencia' ? 'Razon dependencia' : 'Indice envejecimiento']} />
              <Legend formatter={(v: string) => v === 'razDependencia' ? 'Razon dependencia' : 'Indice envejecimiento'} />
              {milestoneLines()}
              <Line type="monotone" dataKey="razDependencia" stroke="#d97706" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="indiceEnvejecimiento" stroke="#7c3aed" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <p className="source-note"><strong>Fuente:</strong> {PROJECTION_SOURCE}.</p>
        </div>
      </div>

      <div className="charts-grid-2">
        <div className="chart-card">
          <h4 className="chart-title">Tasa Global de Fecundidad (TGF)</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={series} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
              <XAxis dataKey="anio" tick={{ fontSize: 11 }} />
              <YAxis domain={[1.5, 4]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [v.toFixed(2), 'TGF']} />
              <ReferenceLine y={2.1} stroke="#dc2626" strokeDasharray="6 3" label={{ value: 'Reemplazo 2.1', fontSize: 10, fill: '#dc2626' }} />
              {milestoneLines()}
              <Line type="monotone" dataKey="tgf" stroke={SCENARIO_COLORS[scenario]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <p className="source-note"><strong>Fuente:</strong> {PROJECTION_SOURCE}.</p>
        </div>

        <div className="chart-card">
          <h4 className="chart-title">Esperanza de vida al nacer (anios)</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={series} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
              <XAxis dataKey="anio" tick={{ fontSize: 11 }} />
              <YAxis domain={[68, 86]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number, name: string) => [v.toFixed(1) + ' anios', name === 'ev0h' ? 'Hombres' : 'Mujeres']} />
              <Legend formatter={(v: string) => v === 'ev0h' ? 'Hombres' : 'Mujeres'} />
              {milestoneLines()}
              <Line type="monotone" dataKey="ev0h" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ev0m" stroke="#dc2626" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <p className="source-note"><strong>Fuente:</strong> {PROJECTION_SOURCE}.</p>
        </div>
      </div>

      <div className="chart-card">
        <div className="pyramid-year-selector">
          <label>Piramide proyectada con filtro global:</label>
          <strong>{targetAnio}</strong>
        </div>
        <div className="charts-grid-2">
          <PopulationPyramid
            data={census.piramide}
            title="Piramide 2022 (base)"
            colorH="#93c5fd"
            colorM="#fca5a5"
          />
          {piramideTarget.length > 0 && (
            <PopulationPyramid
              data={piramideTarget}
              title={`Piramide ${targetAnio} (${SCENARIO_LABELS[scenario].toLowerCase()})`}
              colorH="#2563eb"
              colorM="#dc2626"
            />
          )}
        </div>
      </div>

      <div className="fuentes-card">
        <strong>Metodologia:</strong> metodo cohorte-componente con base Censo 2022, series historicas disponibles y escenarios globales. Los hitos PARACEL se marcan para distinguir base previa, presencia observada reciente y efectos esperados durante obra/operacion.
      </div>
    </div>
  );
}
