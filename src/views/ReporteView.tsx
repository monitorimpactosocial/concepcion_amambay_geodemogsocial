import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer,
  ReferenceLine, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { ReactNode } from 'react';
import {
  Briefcase, FileText, HeartPulse, Home, Printer, TrendingUp, Users,
} from 'lucide-react';
import KPICard from '../components/charts/KPICard';
import { CENSUS, type DeptKey } from '../data/census2022';
import { SOCIAL_INDICATORS, SERIES_HISTORICAS } from '../data/socialIndicators';
import { getProjection } from '../data/projectionEngine';
import { computeImpacto, ESCENARIOS_PRESET } from '../data/impactoEngine';
import type { GlobalFilters } from '../types';
import {
  PARACEL_MILESTONES,
  aggregateCensus,
  aggregateProjection,
  clampHorizonYear,
  deptKeysFromFilters,
  scopeLabel,
} from '../utils/analysis';
import {
  CONTEXT_INDICATORS_2025_2026,
  CONTEXT_PRIORITY_CODES,
  CONTEXT_SIGNAL_INDEX,
} from '../data/contexto2025';

const fmt = (n: number) => Math.round(n).toLocaleString('es-PY');
const pct = (n: number, digits = 1) => `${n.toFixed(digits)}%`;
const mm = (n: number) => `${(n / 1_000_000_000).toLocaleString('es-PY', { maximumFractionDigits: 1 })} MM Gs.`;

function socialKey(dept: DeptKey) {
  return dept === 'concepcion' ? 'concepcion_total' : 'amambay_total';
}

function getYear<T extends { anio: number }>(series: T[], anio: number): T {
  return series.find((row) => row.anio === anio) ?? series[series.length - 1];
}

function ReportTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<Array<string | number | ReactNode>>;
}) {
  return (
    <div className="impact-table-wrap">
      <table className="impact-table report-table">
        <thead>
          <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const contextByCode = new Map(CONTEXT_INDICATORS_2025_2026.map((item) => [item.code, item]));
const contextRows = CONTEXT_PRIORITY_CODES
  .map((code) => contextByCode.get(code))
  .filter((item): item is NonNullable<typeof item> => Boolean(item))
  .map((item) => [
    item.code,
    item.category,
    item.indicator,
    item.scope,
    item.update,
    item.source,
  ]);

export default function ReporteView({ filters }: { filters: GlobalFilters }) {
  const deptKeys = deptKeysFromFilters(filters);
  const viewScope = scopeLabel(filters);
  const horizonYear = clampHorizonYear(filters.horizonYear);
  const impactoParams = ESCENARIOS_PRESET[filters.impactScenario];
  const impacto = computeImpacto(impactoParams);
  const projectionCon = getProjection('concepcion', filters.projectionScenario);
  const projectionAma = getProjection('amambay', filters.projectionScenario);
  const projectionScope = aggregateProjection(deptKeys, filters.projectionScenario);
  const censusScope = aggregateCensus(deptKeys);
  const basePob = censusScope.poblacion_total;
  const pob2052 = getYear(projectionScope, 2052).pobTotal;
  const ruralPct = (censusScope.pob_rural / Math.max(1, basePob)) * 100;
  const indigenaPct = (censusScope.pob_indigena / Math.max(1, basePob)) * 100;
  const pobrezaPond = deptKeys.reduce((sum, dept) => (
    sum + SOCIAL_INDICATORS[socialKey(dept)].pobreza.incidencia_pobreza_pct * CENSUS[dept].poblacion_total
  ), 0) / Math.max(1, basePob);

  const projectionYears = Array.from(new Set([2022, horizonYear, 2032, 2042, 2052])).sort((a, b) => a - b);
  const projectionData = projectionYears.map((anio) => ({
    anio,
    concepcion: deptKeys.includes('concepcion') ? getYear(projectionCon, anio).pobTotal : null,
    amambay: deptKeys.includes('amambay') ? getYear(projectionAma, anio).pobTotal : null,
    total: getYear(projectionScope, anio).pobTotal,
  }));

  const phaseData = [
    { fase: 'Antes', empleo: 0, residentes: 0, ingreso: 0 },
    {
      fase: 'Durante obra',
      empleo: 7200,
      residentes: Math.round(impacto.pobInducidaTotal * 0.48),
      ingreso: Math.round((impactoParams.empleoDirectoObra * impactoParams.salarioMensualGs * 12 * 0.55 * 0.72) / 1_000_000_000),
    },
    {
      fase: 'Operación',
      empleo: impacto.empleoTotal,
      residentes: impacto.pobInducidaTotal,
      ingreso: Math.round(impacto.ingresoTotalLocalAnualGs / 1_000_000_000),
    },
  ];

  const tendenciaPobreza = SERIES_HISTORICAS.pobreza.map((row) => ({
    anio: row.anio,
    concepcion: deptKeys.includes('concepcion') ? row.concepcion : null,
    amambay: deptKeys.includes('amambay') ? row.amambay : null,
  }));

  const topDistritos = impacto.distritos
    .filter((d) => {
      if (filters.selectedDistrictName) return d.nombre === filters.selectedDistrictName;
      if (filters.activeDepartment === '01') return d.departamento === 'Concepcion' || d.departamento === 'Concepción';
      if (filters.activeDepartment === '13') return d.departamento === 'Amambay';
      return true;
    })
    .slice()
    .sort((a, b) => (
      b.presionViviendaIndice + b.presionServiciosIndice + b.empleosLocalesEstimados / 40
    ) - (
      a.presionViviendaIndice + a.presionServiciosIndice + a.empleosLocalesEstimados / 40
    ))
    .slice(0, 10);

  const baselineRows = deptKeys.map((dept) => {
    const c = CENSUS[dept];
    const s = SOCIAL_INDICATORS[socialKey(dept)];
    return [
      c.nombre,
      fmt(c.poblacion_total),
      pct((c.pob_rural / c.poblacion_total) * 100),
      pct((c.pob_indigena / c.poblacion_total) * 100),
      pct(s.pobreza.incidencia_pobreza_pct),
      pct(s.salud.sinSeguroMedico_pct),
      pct(s.vivienda.sin_agua_potable_pct),
      pct(s.empleo.tasa_actividad_pct),
    ];
  });

  const projectionRows = projectionYears
    .filter((anio) => anio !== 2022)
    .flatMap((anio) => deptKeys.map((dept) => {
      const projection = dept === 'concepcion' ? projectionCon : projectionAma;
      const row = getYear(projection, anio);
      return [CENSUS[dept].nombre, anio, fmt(row.pobTotal), pct(row.razDependencia), row.tgf.toFixed(2)];
    }));

  return (
    <div className="view-container impacto-report report-page">
      <div className="impacto-hero print-section">
        <div>
          <p className="eyebrow">Reporte imprimible / PDF</p>
          <h2 className="view-title">Situacion socioeconomica e impacto PARACEL · {viewScope}</h2>
          <p className="view-subtitle">Lectura historica, actual y proyectada con escenario demografico {filters.projectionScenario}, impacto {filters.impactScenario} y horizonte {horizonYear}.</p>
        </div>
        <button className="secondary-button print-hide" type="button" onClick={() => window.print()}>
          <Printer size={16} /> Imprimir / PDF
        </button>
      </div>

      <div className="kpi-grid-4 print-section">
        <KPICard label="Poblacion base" value={fmt(basePob)} sub={`Censo 2022, ${viewScope}`} color="var(--emerald-700)" icon={<Users size={18} />} />
        <KPICard label="Población 2052" value={fmt(pob2052)} sub={`${pob2052 >= basePob ? '+' : ''}${pct(((pob2052 - basePob) / basePob) * 100)} vs 2022`} color="var(--blue-600)" icon={<TrendingUp size={18} />} />
        <KPICard label="Pobreza actual" value={pct(pobrezaPond)} sub="promedio ponderado EPH/INE" color="var(--red-600)" icon={<HeartPulse size={18} />} />
        <KPICard label="Empleo total PARACEL" value={fmt(impacto.empleoTotal)} sub="directo + indirecto + inducido" color="var(--amber-600)" icon={<Briefcase size={18} />} />
        <KPICard label="Ruralidad" value={pct(ruralPct)} sub="condiciona movilidad y servicios" color="var(--cyan-700)" icon={<Home size={18} />} />
        <KPICard label="Población indígena" value={pct(indigenaPct)} sub="enfoque diferencial necesario" color="var(--violet-600)" icon={<Users size={18} />} />
        <KPICard label="Ingreso local anual" value={mm(impacto.ingresoTotalLocalAnualGs)} sub="salarios retenidos + compras locales" color="var(--emerald-600)" icon={<FileText size={18} />} />
        <KPICard label="Hogares adicionales" value={fmt(impacto.hogaresAdicionalesTotal)} sub="demanda habitacional inducida" color="var(--orange-600)" icon={<Home size={18} />} />
      </div>

      <div className="chart-card print-section">
        <h4 className="chart-title">Pulso económico y social 2025-2026 incorporado al análisis</h4>
        <div className="kpi-grid-4">
          <KPICard label="PIB Paraguay 2025" value="+6,6%" sub="proyección 2026: +4,2%" color="var(--emerald-600)" icon={<TrendingUp size={18} />} />
          <KPICard label="Contribuyentes Concepción" value="26.108" sub="base formal para proveedores" color="var(--blue-600)" icon={<FileText size={18} />} />
          <KPICard label="Construcción Concepción" value="197" sub="permisos 2024; 948 ventas de inmuebles" color="var(--amber-600)" icon={<Home size={18} />} />
          <KPICard label="Plantaciones forestales" value="+66,1%" sub="crecimiento de superficie en el bienio" color="var(--emerald-700)" icon={<Briefcase size={18} />} />
          <KPICard label="Asegurados IPS" value="1.641.062" sub="+3,4% nacional en 2025" color="var(--cyan-700)" icon={<HeartPulse size={18} />} />
          <KPICard label="Seguro médico" value="31%" sub="cobertura nacional estimada 2025" color="var(--red-600)" icon={<HeartPulse size={18} />} />
          <KPICard label="Edad activa Concepción" value="63,8%" sub="población proyectada 2025" color="var(--violet-600)" icon={<Users size={18} />} />
          <KPICard label="Desocupación nacional" value="3,6%" sub="subocupación 3,5%, 4T 2025" color="var(--emerald-600)" icon={<Briefcase size={18} />} />
        </div>
      </div>

      <div className="charts-grid-2 print-section">
        <div className="chart-card">
          <h4 className="chart-title">Señales tempranas para anticipar impactos PARACEL</h4>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={CONTEXT_SIGNAL_INDEX} margin={{ top: 8, right: 18, left: 8, bottom: 42 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
              <XAxis dataKey="dimension" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number, name: string) => [`${v}/100`, name === 'opportunity' ? 'Oportunidad' : name === 'pressure' ? 'Presión' : 'Índice']} />
              <Legend formatter={(v: string) => v === 'opportunity' ? 'Oportunidad' : v === 'pressure' ? 'Presión' : 'Índice'} />
              <Bar dataKey="opportunity" fill="#059669" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pressure" fill="#d97706" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <h4 className="chart-title">Lectura inteligente de señales 2025-2026</h4>
          <ReportTable
            headers={['Dimensión', 'KPI líder', 'Interpretación']}
            rows={CONTEXT_SIGNAL_INDEX.map((signal) => [
              signal.dimension,
              signal.leadKpi,
              signal.interpretation,
            ])}
          />
        </div>
      </div>

      <div className="phase-grid print-section">
        <div className="phase-card">
          <div className="phase-head"><span>Antes de PARACEL</span><strong>línea base</strong></div>
          <p>Territorio con alta ruralidad, pobreza relevante, brechas de agua/salud y mercado laboral todavía primario.</p>
          <small>Decisión crítica: preparar capacidades antes del pico de demanda laboral.</small>
        </div>
        <div className="phase-card">
          <div className="phase-head"><span>Durante obra</span><strong>pico temporal</strong></div>
          <p>El shock principal es urbano: empleo temporal, alojamiento, movilidad, precios, seguridad vial y servicios.</p>
          <small>Decisión crítica: monitoreo mensual de alquileres, empleo local, proveedores y presión sanitaria.</small>
        </div>
        <div className="phase-card">
          <div className="phase-head"><span>Operación plena</span><strong>estructura</strong></div>
          <p>El impacto duradero depende de captura local, formación técnica y compras a proveedores regionales.</p>
          <small>Decisión crítica: convertir empleo temporal en cadena de valor estable.</small>
        </div>
        <div className="phase-card">
          <div className="phase-head"><span>Después / consolidación</span><strong>gobernanza</strong></div>
          <p>La región necesitará ordenar suelo urbano, logística, educación técnica, salud y diálogo comunitario.</p>
          <small>Decisión crítica: tablero de seguimiento con metas por distrito.</small>
        </div>
      </div>

      <div className="charts-grid-2 print-section">
        <div className="chart-card">
          <h4 className="chart-title">Histórico: incidencia de pobreza</h4>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={tendenciaPobreza} margin={{ top: 8, right: 18, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
              <XAxis dataKey="anio" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number, name: string) => [pct(v), name === 'concepcion' ? 'Concepción' : 'Amambay']} />
              <Legend formatter={(v: string) => v === 'concepcion' ? 'Concepción' : 'Amambay'} />
              <ReferenceLine x={2022} stroke="#111827" strokeDasharray="4 4" label={{ value: 'Actual 2022', fontSize: 10, fill: '#111827' }} />
              <Line type="monotone" dataKey="concepcion" stroke="#dc2626" strokeWidth={2} dot />
              <Line type="monotone" dataKey="amambay" stroke="#f59e0b" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h4 className="chart-title">Proyección demográfica 2022-2052</h4>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={projectionData} margin={{ top: 8, right: 18, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
              <XAxis dataKey="anio" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number, name: string) => [fmt(v), name === 'concepcion' ? 'Concepción' : name === 'amambay' ? 'Amambay' : 'Total']} />
              <Legend formatter={(v: string) => v === 'concepcion' ? 'Concepción' : v === 'amambay' ? 'Amambay' : 'Total'} />
              {PARACEL_MILESTONES.map((milestone) => (
                <ReferenceLine key={milestone.anio} x={milestone.anio} stroke="#111827" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: milestone.label, angle: -90, position: 'insideTop', fontSize: 10, fill: '#111827' }} />
              ))}
              <Line type="monotone" dataKey="concepcion" stroke="#2563eb" strokeWidth={2} dot />
              <Line type="monotone" dataKey="amambay" stroke="#059669" strokeWidth={2} dot />
              <Line type="monotone" dataKey="total" stroke="#111827" strokeWidth={2.5} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card print-section">
        <h4 className="chart-title">PARACEL: antes, durante obra y operación</h4>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={phaseData} margin={{ top: 8, right: 18, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
            <XAxis dataKey="fase" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v} MM`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number, name: string) => [fmt(v), name === 'ingreso' ? 'Ingreso local anual, MM Gs.' : name === 'empleo' ? 'Empleo total' : 'Nuevos residentes']} />
            <Legend formatter={(v: string) => v === 'ingreso' ? 'Ingreso local anual, MM Gs.' : v === 'empleo' ? 'Empleo total' : 'Nuevos residentes'} />
            <Bar yAxisId="left" dataKey="empleo" fill="#059669" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="left" dataKey="residentes" fill="#2563eb" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="right" dataKey="ingreso" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card print-section">
        <h4 className="chart-title">Situación actual por departamento</h4>
        <ReportTable
          headers={['Departamento', 'Población', 'Rural', 'Indígena', 'Pobreza', 'Sin seguro', 'Sin agua', 'Actividad']}
          rows={baselineRows}
        />
      </div>

      <div className="chart-card print-section">
        <h4 className="chart-title">Indicadores 2025-2026 priorizados para monitoreo</h4>
        <ReportTable
          headers={['Código', 'Categoría', 'Indicador', 'Ámbito', 'Actualización 2025-2026', 'Fuente']}
          rows={contextRows}
        />
      </div>

      <div className="charts-grid-2 print-section">
        <div className="chart-card">
          <h4 className="chart-title">Proyección social-demográfica</h4>
          <ReportTable
            headers={['Departamento', 'Año', 'Población', 'Dependencia', 'TGF']}
            rows={projectionRows}
          />
        </div>
        <div className="chart-card">
          <h4 className="chart-title">Agenda de gestión por fase</h4>
          <ReportTable
            headers={['Fase', 'Riesgo principal', 'KPI de control', 'Respuesta recomendada']}
            rows={[
              ['Antes', 'Baja captura laboral local', '% de cupos formativos cubiertos', 'Convenios con SNPP, colegios técnicos, municipios y proveedores'],
              ['Durante obra', 'Presión en vivienda, precios y movilidad', 'Alquiler promedio, accidentes, consultas de salud', 'Tablero mensual distrital y mesa de respuesta rápida'],
              ['Operación', 'Fuga de ingreso y compras fuera de la región', '% compras locales, proveedores homologados', 'Programa de homologación y financiamiento de pymes'],
              ['Consolidación', 'Crecimiento desordenado de servicios urbanos', 'Hogares nuevos, agua, saneamiento, salud', 'Plan de suelo, transporte y servicios con municipios'],
            ]}
          />
        </div>
      </div>

      <div className="chart-card print-section">
        <h4 className="chart-title">Distritos prioritarios para seguimiento</h4>
        <ReportTable
          headers={['Distrito', 'Departamento', 'Empleo local', 'Nuevos residentes', 'Hogares', 'Vivienda', 'Servicios']}
          rows={topDistritos.map((d) => [
            d.nombre,
            d.departamento,
            fmt(d.empleosLocalesEstimados),
            fmt(d.nuevoResidentesEstimados),
            fmt(d.hogaresAdicionalesRequeridos),
            `${d.presionViviendaIndice}/100`,
            `${d.presionServiciosIndice}/100`,
          ])}
        />
      </div>

      <div className="metodologia-note print-section">
        <strong>Lectura metodológica:</strong> este reporte combina Censo 2022, series históricas sociales disponibles, proyecciones cohorte-componente 2022-2052 y el escenario medio del motor de impacto PARACEL. Las cifras de impacto son simulaciones; deben recalibrarse con dotación contractual, salarios, compras, rutas, cronograma y localización de alojamientos.
      </div>
    </div>
  );
}
