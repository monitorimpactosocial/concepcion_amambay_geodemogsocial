import { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { Factory, Users, Building2, Coins, TrendingUp, AlertTriangle, Calendar } from 'lucide-react';
import KPICard from '../components/charts/KPICard';
import {
  computeImpacto,
  ESCENARIOS_PRESET,
  type EscenarioKey,
  type ImpactoParams,
  type ImpactoDistrito,
} from '../data/impactoEngine';
const FMT_MRD = (n: number) => (n / 1_000_000_000).toLocaleString('es-PY', { maximumFractionDigits: 1 }) + ' MM';
const FMT_N = (n: number) => n.toLocaleString('es-PY');

function SliderField({
  label, value, min, max, step, unit, onChange, hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div className="param-field">
      <div className="param-label-row">
        <span className="param-label">{label}</span>
        <span className="param-value">{value.toLocaleString('es-PY')}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="param-slider"
      />
      {hint && <span className="param-hint">{hint}</span>}
    </div>
  );
}

function RiskBadge({ nivel }: { nivel: 'alta' | 'media' | 'baja' }) {
  const map = {
    alta:  { cls: 'badge-red',    txt: 'Alta' },
    media: { cls: 'badge-amber',  txt: 'Media' },
    baja:  { cls: 'badge-green',  txt: 'Baja' },
  };
  const { cls, txt } = map[nivel];
  return <span className={`risk-badge ${cls}`}>{txt}</span>;
}

const ESCENARIO_LABELS: Record<EscenarioKey, { label: string; desc: string }> = {
  conservador: {
    label: 'Conservador',
    desc: 'Baja captura local, alta importación de mano de obra calificada.',
  },
  medio: {
    label: 'Medio',
    desc: 'Captura local progresiva con capacitación y proveedores regionales.',
  },
  transformador: {
    label: 'Transformador',
    desc: 'Fuerte encadenamiento local, formación técnica y retención de ingreso.',
  },
};

export default function ImpactoView() {
  const [escenario, setEscenario] = useState<EscenarioKey>('medio');
  const [params, setParams] = useState<ImpactoParams>({ ...ESCENARIOS_PRESET.medio });

  const setEscenarioPreset = (k: EscenarioKey) => {
    setEscenario(k);
    setParams({ ...ESCENARIOS_PRESET[k] });
  };

  const setParam = <K extends keyof ImpactoParams>(key: K, value: ImpactoParams[K]) => {
    setEscenario('medio'); // salir del preset si el usuario cambia un parámetro
    setParams((p) => ({ ...p, [key]: value }));
  };

  const result = useMemo(() => computeImpacto(params), [params]);

  // ── Evolución temporal año a año ──────────────────────────────────────────
  const evolutionData = useMemo(() => {
    const startYr = params.anioInicioObra;
    const obraEnd = result.anioFinObra;
    const rows: { anio: number; empTotal: number; empDir: number; ingresoMM: number; residentes: number }[] = [];

    for (let yr = startYr - 1; yr <= result.anioOperacionPlena + 5; yr++) {
      let empDir = 0, empTotal = 0, ingresoMM = 0, residentes = 0;

      if (yr < startYr) {
        empDir = Math.round(params.empleoDirectoObra * 0.06);
        empTotal = Math.round(params.empleoDirectoObra * 0.09);
      } else if (yr < obraEnd) {
        const n = Math.max(1, obraEnd - startYr);
        const t = yr - startYr;
        const ramp = n === 1 ? 1 : (t === 0 ? 0.55 : t === n - 1 ? 0.82 : 1.0);
        empDir = Math.round(params.empleoDirectoObra * ramp);
        empTotal = Math.round(empDir * (1 + params.multiplicadorIndirecto));
        const msLocal = empDir * params.salarioMensualGs * 12
          * (params.capturaLocal_pct / 100) * (params.proporcionResidenteLocal_pct / 100);
        ingresoMM = Math.round(msLocal / 1_000_000_000);
        residentes = Math.round(result.pobInducidaTotal * ramp * 0.4);
      } else {
        const opT = yr - obraEnd;
        const mat = Math.min(1.0, 0.45 + opT * 0.18);
        empDir = Math.round(result.empleoDirectoTotal * mat);
        empTotal = Math.round(result.empleoTotal * mat);
        ingresoMM = Math.round(result.ingresoTotalLocalAnualGs / 1_000_000_000 * mat);
        residentes = Math.round(result.pobInducidaTotal * Math.min(1.0, 0.55 + opT * 0.15));
      }
      rows.push({ anio: yr, empDir, empTotal, ingresoMM, residentes });
    }
    return rows;
  }, [params, result]);

  // ── Hitos del proyecto ────────────────────────────────────────────────────
  const milestones = useMemo(() => {
    const items: { anio: number; label: string; desc: string; tipo: 'prep'|'clave'|'normal'|'hito' }[] = [
      { anio: params.anioInicioObra - 1, label: 'Gestión y permisos', desc: 'EIA, licencias ambientales, negociaciones territoriales', tipo: 'prep' },
      { anio: params.anioInicioObra, label: 'Inicio de obra civil', desc: `Inicio de construcción. Pico de empleo: ${FMT_N(params.empleoDirectoObra)} pers.`, tipo: 'clave' },
      { anio: params.anioInicioObra + 1, label: 'Instalación de equipamiento', desc: 'Montaje de maquinaria industrial y pruebas técnicas', tipo: 'normal' },
    ];
    if (params.duracionObraAnios > 2) {
      items.push({ anio: result.anioFinObra - 1, label: 'Puesta en marcha', desc: 'Comisioning y ajuste de procesos productivos', tipo: 'normal' });
    }
    items.push(
      { anio: result.anioFinObra, label: 'Inicio de producción', desc: `Primer producto. Empleo permanente: ${FMT_N(params.empleoDirectoOperacion)} pers.`, tipo: 'clave' },
      { anio: result.anioOperacionPlena, label: 'Plena capacidad operativa', desc: `Ingreso local est.: ${FMT_MRD(result.ingresoTotalLocalAnualGs)} Gs/año`, tipo: 'hito' },
      { anio: result.anioOperacionPlena + 3, label: 'Consolidación proveedores', desc: `~${FMT_N(result.proveedoresLocalesEstimados)} proveedores locales integrados`, tipo: 'normal' },
    );
    return items;
  }, [params, result]);

  const empleoChartData = [
    { nombre: 'Directo', valor: result.empleoDirectoTotal },
    { nombre: 'Indirecto', valor: result.empleoIndirecto },
    { nombre: 'Inducido', valor: result.empleoInducido },
  ];

  const capturaChartData = [
    { nombre: 'Local', valor: result.empleoLocal },
    { nombre: 'Importado', valor: result.empleoImportado },
  ];

  const topDistritosOportunidad = [...result.distritos]
    .sort((a, b) => b.empleosLocalesEstimados - a.empleosLocalesEstimados)
    .slice(0, 6);

  return (
    <div className="view-container">

      {/* Selector de escenario */}
      <div className="dept-selector" style={{ flexWrap: 'wrap', gap: 8 }}>
        {(Object.keys(ESCENARIOS_PRESET) as EscenarioKey[]).map((k) => (
          <button
            key={k}
            className={`dept-btn${escenario === k ? ' active' : ''}`}
            onClick={() => setEscenarioPreset(k)}
          >
            {ESCENARIO_LABELS[k].label}
          </button>
        ))}
      </div>

      <h2 className="view-title">
        Impacto territorial PARACEL
        <span className="view-subtitle"> — Escenario {ESCENARIO_LABELS[escenario].label}: {ESCENARIO_LABELS[escenario].desc}</span>
      </h2>

      <div className="impacto-layout">

        {/* Panel de parámetros */}
        <aside className="params-panel">
          <h3 className="params-section-title">
            <Factory size={15} /> Empleo
          </h3>
          <SliderField label="Empleo directo (obra)" value={params.empleoDirectoObra}
            min={500} max={5000} step={100} unit=" pers."
            onChange={(v) => setParam('empleoDirectoObra', v)} />
          <SliderField label="Empleo directo (operación)" value={params.empleoDirectoOperacion}
            min={200} max={3000} step={50} unit=" pers."
            onChange={(v) => setParam('empleoDirectoOperacion', v)} />
          <SliderField label="Multiplicador indirecto" value={params.multiplicadorIndirecto}
            min={1} max={5} step={0.1} unit="×"
            hint="empleos indirectos por cada empleo directo"
            onChange={(v) => setParam('multiplicadorIndirecto', v)} />
          <SliderField label="Captura local" value={params.capturaLocal_pct}
            min={10} max={95} step={5} unit="%"
            hint="% empleos capturados por mano de obra local"
            onChange={(v) => setParam('capturaLocal_pct', v)} />

          <h3 className="params-section-title" style={{ marginTop: 20 }}>
            <Users size={15} /> Migración
          </h3>
          <SliderField label="Trabajadores no locales" value={params.pctNoLocales}
            min={5} max={90} step={5} unit="%"
            onChange={(v) => setParam('pctNoLocales', v)} />
          <SliderField label="Traen familia" value={params.proporcionConFamilia_pct}
            min={0} max={80} step={5} unit="%"
            onChange={(v) => setParam('proporcionConFamilia_pct', v)} />
          <SliderField label="Tamaño hogar migrante" value={params.tamanioHogarMigrante}
            min={2} max={6} step={0.1} unit=" pers."
            onChange={(v) => setParam('tamanioHogarMigrante', v)} />

          <h3 className="params-section-title" style={{ marginTop: 20 }}>
            <Coins size={15} /> Economía local
          </h3>
          <SliderField label="Salario mensual" value={params.salarioMensualGs / 1_000_000}
            min={1} max={15} step={0.1} unit=" M Gs."
            onChange={(v) => setParam('salarioMensualGs', v * 1_000_000)} />
          <SliderField label="Gasto local del salario" value={params.proporcionResidenteLocal_pct}
            min={10} max={90} step={5} unit="%"
            onChange={(v) => setParam('proporcionResidenteLocal_pct', v)} />
          <SliderField label="Compras locales" value={params.pctComprasLocales}
            min={5} max={80} step={5} unit="%"
            hint="% del presupuesto de compras con proveedores locales"
            onChange={(v) => setParam('pctComprasLocales', v)} />

          <h3 className="params-section-title" style={{ marginTop: 20 }}>
            <TrendingUp size={15} /> Cronograma
          </h3>
          <SliderField label="Inicio de obra" value={params.anioInicioObra}
            min={2025} max={2030} step={1} unit=""
            onChange={(v) => setParam('anioInicioObra', v)} />
          <SliderField label="Duración de obra" value={params.duracionObraAnios}
            min={1} max={6} step={1} unit=" años"
            onChange={(v) => setParam('duracionObraAnios', v)} />

          <p className="params-note">
            Operación plena estimada: <strong>{result.anioOperacionPlena}</strong>
          </p>
        </aside>

        {/* Panel de resultados */}
        <div className="results-panel">

          {/* KPIs empleo */}
          <div className="kpi-grid-4">
            <KPICard
              icon={<Factory size={18} />}
              label="Empleo total estimado"
              value={FMT_N(result.empleoTotal)}
              sub={`Directo ${FMT_N(result.empleoDirectoTotal)} + Indirecto ${FMT_N(result.empleoIndirecto)} + Inducido ${FMT_N(result.empleoInducido)}`}
              color="var(--emerald-600)"
            />
            <KPICard
              icon={<Users size={18} />}
              label="Empleo capturado localmente"
              value={`${FMT_N(result.empleoLocal)} (${params.capturaLocal_pct}%)`}
              sub={`${FMT_N(result.empleoImportado)} puestos cubiertos desde fuera`}
              color="var(--blue-600)"
            />
            <KPICard
              icon={<Building2 size={18} />}
              label="Nuevos residentes estimados"
              value={FMT_N(result.pobInducidaTotal)}
              sub={`${FMT_N(result.hogaresAdicionalesTotal)} hogares adicionales requeridos`}
              color="var(--violet-600)"
            />
            <KPICard
              icon={<Coins size={18} />}
              label="Ingreso local anual"
              value={FMT_MRD(result.ingresoTotalLocalAnualGs) + ' Gs.'}
              sub={`Masa salarial local + compras locales anuales`}
              color="var(--amber-600)"
            />
          </div>

          {/* ── Cronograma e hitos clave ───────────────────────────────── */}
          <div className="chart-card" style={{ marginBottom: 16 }}>
            <h4 className="chart-title">
              <Calendar size={14} style={{ marginRight: 6 }} />
              Cronograma e hitos clave del proyecto PARACEL
            </h4>
            <div className="milestone-timeline">
              {milestones.map((m, i) => (
                <div key={i} className={`ms-item ms-${m.tipo}`}>
                  <div className="ms-year">{m.anio}</div>
                  <div className="ms-connector">
                    {i > 0 && <div className="ms-line" />}
                    <div className="ms-dot" />
                    {i < milestones.length - 1 && <div className="ms-line" />}
                  </div>
                  <div className="ms-content">
                    <div className="ms-label">{m.label}</div>
                    <div className="ms-desc">{m.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Evolución temporal de indicadores ─────────────────────────── */}
          <div className="charts-grid-2" style={{ marginBottom: 16 }}>
            <div className="chart-card">
              <h4 className="chart-title">Evolución del empleo por año</h4>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={evolutionData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                  <XAxis dataKey="anio" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={45} />
                  <Tooltip formatter={(v: number, name: string) => [FMT_N(v), name]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine x={result.anioFinObra} stroke="#059669" strokeDasharray="4 3"
                    label={{ value: 'Inicio op.', position: 'insideTopLeft', fontSize: 9, fill: '#047857' }} />
                  <Line type="monotone" dataKey="empTotal" name="Empleo total" stroke="#059669" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="empDir" name="Empleo directo" stroke="#2563eb" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card">
              <h4 className="chart-title">Ingreso local y nuevos residentes</h4>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={evolutionData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                  <XAxis dataKey="anio" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} width={45} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} width={45} />
                  <Tooltip formatter={(v: number, name: string) =>
                    name === 'Ingreso local (MM Gs.)' ? [FMT_N(v) + ' MM', name] : [FMT_N(v), name]
                  } />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine yAxisId="left" x={result.anioFinObra} stroke="#059669" strokeDasharray="4 3"
                    label={{ value: 'Inicio op.', position: 'insideTopLeft', fontSize: 9, fill: '#047857' }} />
                  <Line yAxisId="left" type="monotone" dataKey="ingresoMM" name="Ingreso local (MM Gs.)" stroke="#d97706" strokeWidth={2.5} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="residentes" name="Nuevos residentes" stroke="#7c3aed" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráficos */}
          <div className="charts-grid-2">
            <div className="chart-card">
              <h4 className="chart-title">Composición del empleo total</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={empleoChartData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                  <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => FMT_N(v)} />
                  <Bar dataKey="valor" fill="var(--emerald-500)" radius={[6, 6, 0, 0]} name="Empleos" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h4 className="chart-title">Empleo local vs importado</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={capturaChartData} barSize={50}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                  <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => FMT_N(v)} />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]} name="Empleos"
                    fill="var(--blue-600)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Economía local detalle */}
          <div className="chart-card" style={{ marginBottom: 16 }}>
            <h4 className="chart-title">Flujo económico local estimado (Gs. anuales)</h4>
            <div className="econ-flow-grid">
              <div className="econ-item">
                <span className="econ-label">Masa salarial directa total</span>
                <span className="econ-value">{FMT_MRD(result.masaSalarialAnualGs)}</span>
              </div>
              <div className="econ-item">
                <span className="econ-label">Porción retenida localmente</span>
                <span className="econ-value emerald">{FMT_MRD(result.ingresoLocalAnualGs)}</span>
              </div>
              <div className="econ-item">
                <span className="econ-label">Compras locales anuales</span>
                <span className="econ-value emerald">{FMT_MRD(result.comprasLocalesAnualesGs)}</span>
              </div>
              <div className="econ-item highlight">
                <span className="econ-label">Ingreso total local estimado</span>
                <span className="econ-value emerald bold">{FMT_MRD(result.ingresoTotalLocalAnualGs)}</span>
              </div>
              <div className="econ-item">
                <span className="econ-label">Proveedores locales estimados</span>
                <span className="econ-value">{FMT_N(result.proveedoresLocalesEstimados)}</span>
              </div>
            </div>
          </div>

          {/* Presión territorial */}
          <div className="chart-card" style={{ marginBottom: 16 }}>
            <h4 className="chart-title"><AlertTriangle size={14} style={{ marginRight: 6 }} />Presión territorial global</h4>
            <div className="pressure-bars">
              <div className="pressure-item">
                <span>Presión sobre vivienda</span>
                <div className="pressure-track">
                  <div className="pressure-fill" style={{ width: `${result.presionViviendaGlobal}%`,
                    background: result.presionViviendaGlobal > 60 ? 'var(--red-600)' : result.presionViviendaGlobal > 30 ? 'var(--amber-600)' : 'var(--emerald-500)' }} />
                </div>
                <span className="pressure-val">{result.presionViviendaGlobal}/100</span>
              </div>
              <div className="pressure-item">
                <span>Presión sobre servicios</span>
                <div className="pressure-track">
                  <div className="pressure-fill" style={{ width: `${result.presionServiciosGlobal}%`,
                    background: result.presionServiciosGlobal > 60 ? 'var(--red-600)' : result.presionServiciosGlobal > 30 ? 'var(--amber-600)' : 'var(--emerald-500)' }} />
                </div>
                <span className="pressure-val">{result.presionServiciosGlobal}/100</span>
              </div>
            </div>
          </div>

          {/* Top distritos por oportunidad */}
          <div className="chart-card" style={{ marginBottom: 16 }}>
            <h4 className="chart-title">Principales distritos por oportunidad laboral</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topDistritosOportunidad} layout="vertical" barSize={18} margin={{ left: 130 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={125} />
                <Tooltip formatter={(v: number) => [FMT_N(v), 'Empleos locales']} />
                <Bar dataKey="empleosLocalesEstimados" fill="var(--emerald-500)" radius={[0, 6, 6, 0]} name="Empleos locales" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabla completa por distrito */}
          <div className="chart-card">
            <h4 className="chart-title">Desagregado por distrito</h4>
            <div style={{ overflowX: 'auto' }}>
              <table className="distrito-table">
                <thead>
                  <tr>
                    <th>Distrito</th>
                    <th>Depto.</th>
                    <th>Empleos locales</th>
                    <th>Nuevos residentes</th>
                    <th>Hogares adicionales</th>
                    <th>Presión vivienda</th>
                    <th>Presión servicios</th>
                    <th>Oportunidad</th>
                    <th>Vulnerabilidad</th>
                  </tr>
                </thead>
                <tbody>
                  {result.distritos
                    .slice()
                    .sort((a, b) => b.empleosLocalesEstimados - a.empleosLocalesEstimados)
                    .map((d: ImpactoDistrito) => (
                      <tr key={`${d.departamento}-${d.nombre}`}>
                        <td className="td-nombre">{d.nombre}</td>
                        <td className="td-depto">{d.departamento}</td>
                        <td className="td-num">{FMT_N(d.empleosLocalesEstimados)}</td>
                        <td className="td-num">{FMT_N(d.nuevoResidentesEstimados)}</td>
                        <td className="td-num">{FMT_N(d.hogaresAdicionalesRequeridos)}</td>
                        <td className="td-num">
                          <span style={{ color: d.presionViviendaIndice > 60 ? 'var(--red-600)' : d.presionViviendaIndice > 30 ? 'var(--amber-600)' : 'var(--emerald-600)' }}>
                            {d.presionViviendaIndice}
                          </span>
                        </td>
                        <td className="td-num">
                          <span style={{ color: d.presionServiciosIndice > 60 ? 'var(--red-600)' : d.presionServiciosIndice > 30 ? 'var(--amber-600)' : 'var(--emerald-600)' }}>
                            {d.presionServiciosIndice}
                          </span>
                        </td>
                        <td><RiskBadge nivel={d.oportunidadLaboral} /></td>
                        <td><RiskBadge nivel={d.vulnerabilidadDesplazamiento} /></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Nota metodológica */}
          <div className="metodologia-note">
            <strong>Nota metodológica:</strong> Los resultados son estimaciones con supuestos explícitos.
            Empleo indirecto calculado con multiplicador de Leontief adaptado a escala departamental.
            Presión territorial índice relativo a población 2022 (Censo INE).
            Distribución distrital proporcional a PEA estimada y urbanización.
            Los supuestos deben contrastarse con datos reales de PARACEL cuando estén disponibles.
          </div>

        </div>
      </div>
    </div>
  );
}
