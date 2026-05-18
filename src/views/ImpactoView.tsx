import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, Legend, ReferenceLine,
  ComposedChart, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import {
  AlertTriangle,
  Building2,
  Calendar,
  Coins,
  Factory,
  FileText,
  GraduationCap,
  Gauge,
  Home,
  Landmark,
  Printer,
  ShieldCheck,
  Trees,
  Truck,
  Users,
} from 'lucide-react';
import KPICard from '../components/charts/KPICard';
import { CENSUS } from '../data/census2022';
import { SOCIAL_INDICATORS } from '../data/socialIndicators';
import { CONTEXT_SIGNAL_INDEX } from '../data/contexto2025';
import type { GlobalFilters } from '../types';
import {
  PARACEL_MILESTONES,
  aggregateCensus,
  clampHorizonYear,
  deptKeysFromFilters,
  scopeLabel,
} from '../utils/analysis';
import {
  computeImpacto,
  ESCENARIOS_PRESET,
  type EscenarioKey,
  type ImpactoParams,
  type ImpactoDistrito,
} from '../data/impactoEngine';

const FMT_MRD = (n: number) => (n / 1_000_000_000).toLocaleString('es-PY', { maximumFractionDigits: 1 }) + ' MM';
const FMT_N = (n: number) => Math.round(n).toLocaleString('es-PY');
const FMT_PCT = (n: number, digits = 1) => `${n.toFixed(digits)}%`;

const PARACEL_FACTS = {
  produccionAnualTon: 1_800_000,
  energiaMW: 220,
  inversionIndustrialUsd: 2_900_000_000,
  inversionTotalUsdRef: 4_000_000_000,
  tierrasPropiasHa: 203_515,
  tierrasPlantadasHa: 82_471,
  empleosDirectosActuales: 1_040,
  empleosDirectosIndirectosRef: 7_000,
  empleosObraDirectosRef: 1_800,
  empleosObraTotalRef: 7_200,
  movimientoSueloM3: 6_000_000,
  alojamientoC9: 2_000,
};

const ESCENARIO_LABELS: Record<EscenarioKey, { label: string; desc: string }> = {
  conservador: {
    label: 'Conservador',
    desc: 'Baja captura local y bajo encadenamiento de proveedores regionales.',
  },
  medio: {
    label: 'Medio',
    desc: 'Calibrado con magnitudes públicas recientes y captura local progresiva.',
  },
  transformador: {
    label: 'Transformador',
    desc: 'Alto encadenamiento, formación técnica acelerada y mayor retención local.',
  },
};

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
    alta: { cls: 'badge-red', txt: 'Alta' },
    media: { cls: 'badge-amber', txt: 'Media' },
    baja: { cls: 'badge-green', txt: 'Baja' },
  };
  const { cls, txt } = map[nivel];
  return <span className={`risk-badge ${cls}`}>{txt}</span>;
}

function PriorityBadge({ score }: { score: number }) {
  if (score >= 75) return <span className="risk-badge badge-red">Intervención prioritaria</span>;
  if (score >= 50) return <span className="risk-badge badge-amber">Seguimiento activo</span>;
  return <span className="risk-badge badge-green">Gestión ordinaria</span>;
}

function FactCard({
  icon, label, value, source,
}: { icon: ReactNode; label: string; value: string; source: string }) {
  return (
    <div className="fact-card">
      <div className="fact-icon">{icon}</div>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        <small>{source}</small>
      </div>
    </div>
  );
}

const totalPoblacionBase = CENSUS.concepcion.poblacion_total + CENSUS.amambay.poblacion_total;
const hogaresBaseEstimados = Math.round(totalPoblacionBase / 3.5);

function weightedSocialForKeys(
  keys: Array<'concepcion' | 'amambay'>,
  getter: (k: 'concepcion_total' | 'amambay_total') => number,
): number {
  const total = keys.reduce((sum, key) => sum + CENSUS[key].poblacion_total, 0);
  return keys.reduce((sum, key) => {
    const socialKey = key === 'concepcion' ? 'concepcion_total' : 'amambay_total';
    return sum + getter(socialKey) * CENSUS[key].poblacion_total;
  }, 0) / Math.max(1, total);
}

function districtPopulation(nombre: string): number {
  for (const dept of Object.values(CENSUS)) {
    const found = dept.distritos.find((d) => d.nombre === nombre);
    if (found) return found.poblacion;
  }
  return 0;
}

function districtRuralPct(nombre: string): number {
  for (const dept of Object.values(CENSUS)) {
    const found = dept.distritos.find((d) => d.nombre === nombre);
    if (found) return found.pob_rural_pct;
  }
  return 0;
}

export default function ImpactoView({ filters }: { filters: GlobalFilters }) {
  const [escenario, setEscenario] = useState<EscenarioKey>('medio');
  const [params, setParams] = useState<ImpactoParams>({ ...ESCENARIOS_PRESET.medio });
  const deptKeys = useMemo(() => deptKeysFromFilters(filters), [filters]);
  const viewScope = scopeLabel(filters);
  const horizonYear = clampHorizonYear(filters.horizonYear);

  const setEscenarioPreset = (k: EscenarioKey) => {
    setEscenario(k);
    setParams({ ...ESCENARIOS_PRESET[k] });
  };

  useEffect(() => {
    setEscenario(filters.impactScenario);
    setParams({ ...ESCENARIOS_PRESET[filters.impactScenario] });
  }, [filters.impactScenario]);

  const setParam = <K extends keyof ImpactoParams>(key: K, value: ImpactoParams[K]) => {
    setEscenario('medio');
    setParams((p) => ({ ...p, [key]: value }));
  };

  const result = useMemo(() => computeImpacto(params), [params]);
  const baselineView = useMemo(() => {
    const censusScope = aggregateCensus(deptKeys);
    const selectedDistrict = filters.selectedDistrictName
      ? censusScope.distritos.find((district) => district.nombre === filters.selectedDistrictName)
      : null;
    const poblacion = selectedDistrict?.poblacion ?? censusScope.poblacion_total;
    const ruralPct = selectedDistrict
      ? selectedDistrict.pob_rural_pct
      : (censusScope.pob_rural / Math.max(1, censusScope.poblacion_total)) * 100;
    const indigenaPct = selectedDistrict
      ? (selectedDistrict.pob_indigena / Math.max(1, selectedDistrict.poblacion)) * 100
      : (censusScope.pob_indigena / Math.max(1, censusScope.poblacion_total)) * 100;

    return {
      poblacion,
      ruralPct,
      indigenaPct,
      pobrezaPct: weightedSocialForKeys(deptKeys, (k) => SOCIAL_INDICATORS[k].pobreza.incidencia_pobreza_pct),
      sinSeguroPct: weightedSocialForKeys(deptKeys, (k) => SOCIAL_INDICATORS[k].salud.sinSeguroMedico_pct),
      sinAguaPct: weightedSocialForKeys(deptKeys, (k) => SOCIAL_INDICATORS[k].vivienda.sin_agua_potable_pct),
    };
  }, [deptKeys, filters.selectedDistrictName]);

  const faseData = useMemo(() => {
    const obraTotal = Math.max(
      PARACEL_FACTS.empleosObraTotalRef,
      Math.round(params.empleoDirectoObra * (1 + Math.max(3, params.multiplicadorIndirecto * 0.72))),
    );
    const obraIngreso = params.empleoDirectoObra * params.salarioMensualGs * 12 *
      (params.proporcionResidenteLocal_pct / 100) * 0.72;
    return [
      {
        fase: 'Antes',
        periodo: `${params.anioInicioObra - 1}`,
        empleo: Math.round(params.empleoDirectoObra * 0.08),
        residentes: 0,
        hogares: 0,
        ingresoMM: 0,
        presion: 8,
        foco: 'Línea base, empleo rural y brechas sociales',
        gestion: 'Preparar formación técnica y proveedores',
      },
      {
        fase: 'Durante obra',
        periodo: `${params.anioInicioObra}-${result.anioFinObra}`,
        empleo: obraTotal,
        residentes: Math.round(result.pobInducidaTotal * 0.48),
        hogares: Math.round(result.hogaresAdicionalesTotal * 0.42),
        ingresoMM: Math.round(obraIngreso / 1_000_000_000),
        presion: Math.min(100, Math.round(result.presionViviendaGlobal * 1.35 + 18)),
        foco: 'Pico de mano de obra, alojamiento, transporte y precios',
        gestion: 'Monitorear alquileres, seguridad vial y servicios urbanos',
      },
      {
        fase: 'Operación plena',
        periodo: `${result.anioOperacionPlena}+`,
        empleo: result.empleoTotal,
        residentes: result.pobInducidaTotal,
        hogares: result.hogaresAdicionalesTotal,
        ingresoMM: Math.round(result.ingresoTotalLocalAnualGs / 1_000_000_000),
        presion: Math.max(result.presionViviendaGlobal, result.presionServiciosGlobal),
        foco: 'Empleo estable, cadena de proveedores y migracion familiar',
        gestion: 'Formalizar proveedores y cerrar brechas de oficio',
      },
      {
        fase: 'Consolidacion',
        periodo: `${result.anioOperacionPlena + 3}+`,
        empleo: Math.round(result.empleoTotal * 1.12),
        residentes: Math.round(result.pobInducidaTotal * 1.08),
        hogares: Math.round(result.hogaresAdicionalesTotal * 1.05),
        ingresoMM: Math.round(result.ingresoTotalLocalAnualGs / 1_000_000_000 * 1.25),
        presion: Math.min(100, Math.round(Math.max(result.presionViviendaGlobal, result.presionServiciosGlobal) * 0.82)),
        foco: 'Maduracion de proveedores, nueva demanda urbana y especializacion',
        gestion: 'Planificar suelo urbano, servicios y educación técnica',
      },
    ];
  }, [params, result]);

  const evolutionData = useMemo(() => {
    const rows: { anio: number; empTotal: number; empDir: number; ingresoMM: number; residentes: number }[] = [];
    const finalYear = Math.max(result.anioOperacionPlena + 5, horizonYear);
    for (let yr = params.anioInicioObra - 1; yr <= finalYear; yr++) {
      const fase = yr < params.anioInicioObra
        ? faseData[0]
        : yr <= result.anioFinObra
          ? faseData[1]
          : yr < result.anioOperacionPlena + 3
            ? faseData[2]
            : faseData[3];
      const ramp = yr < params.anioInicioObra
        ? 1
        : yr <= result.anioFinObra
          ? Math.min(1, 0.55 + (yr - params.anioInicioObra) * 0.2)
          : yr < result.anioOperacionPlena + 3
            ? Math.min(1, 0.72 + (yr - result.anioFinObra) * 0.12)
            : 1;
      rows.push({
        anio: yr,
        empDir: Math.round((yr <= result.anioFinObra ? params.empleoDirectoObra : result.empleoDirectoTotal) * ramp),
        empTotal: Math.round(fase.empleo * ramp),
        ingresoMM: Math.round(fase.ingresoMM * ramp),
        residentes: Math.round(fase.residentes * ramp),
      });
    }
    return rows;
  }, [faseData, horizonYear, params, result]);

  const impactTimeline = useMemo(() => {
    const byYear = new Map<number, {
      anio: number;
      empleoObservado: number | null;
      empleoEsperado: number | null;
      ingresoEsperadoMM: number | null;
      residentesEsperados: number | null;
    }>();

    [
      { anio: 2022, empleoObservado: 0 },
      { anio: 2025, empleoObservado: PARACEL_FACTS.empleosDirectosActuales },
      { anio: 2026, empleoObservado: PARACEL_FACTS.empleosObraTotalRef },
    ].forEach((row) => {
      byYear.set(row.anio, {
        anio: row.anio,
        empleoObservado: row.empleoObservado,
        empleoEsperado: null,
        ingresoEsperadoMM: null,
        residentesEsperados: null,
      });
    });

    evolutionData.forEach((row) => {
      const current = byYear.get(row.anio) ?? {
        anio: row.anio,
        empleoObservado: null,
        empleoEsperado: null,
        ingresoEsperadoMM: null,
        residentesEsperados: null,
      };
      byYear.set(row.anio, {
        ...current,
        empleoEsperado: row.empTotal,
        ingresoEsperadoMM: row.ingresoMM,
        residentesEsperados: row.residentes,
      });
    });

    return Array.from(byYear.values()).sort((a, b) => a.anio - b.anio);
  }, [evolutionData]);

  const radarData = useMemo(() => [
    {
      dimension: 'Empleo',
      Antes: 8,
      Durante: Math.min(100, faseData[1].empleo / 80),
      Despues: Math.min(100, result.empleoTotal / 80),
    },
    {
      dimension: 'Ingreso',
      Antes: 6,
      Durante: Math.min(100, faseData[1].ingresoMM / 2),
      Despues: Math.min(100, faseData[2].ingresoMM / 2),
    },
    {
      dimension: 'Vivienda',
      Antes: 12,
      Durante: faseData[1].presion,
      Después: result.presionViviendaGlobal,
    },
    {
      dimension: 'Servicios',
      Antes: 18,
      Durante: Math.min(100, result.presionServiciosGlobal * 1.25 + 12),
      Después: result.presionServiciosGlobal,
    },
    {
      dimension: 'Proveedores',
      Antes: 14,
      Durante: params.pctComprasLocales,
      Despues: Math.min(100, params.pctComprasLocales * 1.35),
    },
    {
      dimension: 'Capacitacion',
      Antes: 30,
      Durante: Math.max(20, 100 - params.pctNoLocales),
      Despues: params.capturaLocal_pct,
    },
  ], [faseData, params, result]);

  const brechas = useMemo(() => {
    const empleoReferencia = PARACEL_FACTS.empleosDirectosIndirectosRef;
    const comprasMeta = params.presupuestoComprasAnualGs * 0.6;
    const cuposFormacion = Math.max(0, Math.round((result.empleoImportado + result.empleoIndirecto * 0.22) * 0.65));
    const hogaresSensibles = Math.max(0, result.hogaresAdicionalesTotal - Math.round(hogaresBaseEstimados * 0.006));
    return [
      {
        area: 'Empleo local',
        actual: result.empleoLocal,
        meta: Math.round(result.empleoDirectoTotal * 0.8),
        brecha: Math.max(0, Math.round(result.empleoDirectoTotal * 0.8) - result.empleoLocal),
        decision: 'Cupos de formación técnica antes del pico de contratación',
      },
      {
        area: 'Empleo total',
        actual: result.empleoTotal,
        meta: empleoReferencia,
        brecha: Math.max(0, empleoReferencia - result.empleoTotal),
        decision: 'Acelerar proveedores y servicios de soporte regional',
      },
      {
        area: 'Proveedores locales',
        actual: Math.round(result.comprasLocalesAnualesGs / 1_000_000_000),
        meta: Math.round(comprasMeta / 1_000_000_000),
        brecha: Math.max(0, Math.round((comprasMeta - result.comprasLocalesAnualesGs) / 1_000_000_000)),
        decision: 'Programa de homologación y financiamiento de pymes',
      },
      {
        area: 'Vivienda',
        actual: result.hogaresAdicionalesTotal,
        meta: Math.round(hogaresBaseEstimados * 0.006),
        brecha: hogaresSensibles,
        decision: 'Inventario de alquileres, suelo urbano y alojamiento temporal',
      },
      {
        area: 'Formacion',
        actual: 0,
        meta: cuposFormacion,
        brecha: cuposFormacion,
        decision: 'Meta mínima de becas, oficios industriales y logística',
      },
    ];
  }, [params, result]);

  const valueChainData = useMemo(() => [
    { rubro: 'Forestacion', montoMM: Math.round(result.comprasLocalesAnualesGs / 1_000_000_000 * 0.28), empleo: Math.round(result.empleoIndirecto * 0.22), prioridad: 'alta' },
    { rubro: 'Transporte', montoMM: Math.round(result.comprasLocalesAnualesGs / 1_000_000_000 * 0.20), empleo: Math.round(result.empleoIndirecto * 0.18), prioridad: 'alta' },
    { rubro: 'Mantenimiento', montoMM: Math.round(result.comprasLocalesAnualesGs / 1_000_000_000 * 0.16), empleo: Math.round(result.empleoIndirecto * 0.15), prioridad: 'media' },
    { rubro: 'Servicios urbanos', montoMM: Math.round(result.comprasLocalesAnualesGs / 1_000_000_000 * 0.14), empleo: Math.round(result.empleoInducido * 0.32), prioridad: 'media' },
    { rubro: 'Alimentos y alojamiento', montoMM: Math.round(result.comprasLocalesAnualesGs / 1_000_000_000 * 0.12), empleo: Math.round(result.empleoInducido * 0.26), prioridad: 'alta' },
    { rubro: 'Servicios profesionales', montoMM: Math.round(result.comprasLocalesAnualesGs / 1_000_000_000 * 0.10), empleo: Math.round(result.empleoIndirecto * 0.08), prioridad: 'media' },
  ], [result]);

  const districtIntelligence = useMemo(() => result.distritos
    .map((d: ImpactoDistrito) => {
      const poblacion = districtPopulation(d.nombre);
      const ruralPct = districtRuralPct(d.nombre);
      const score = Math.min(100, Math.round(
        d.presionViviendaIndice * 0.28 +
        d.presionServiciosIndice * 0.25 +
        (d.empleosLocalesEstimados / Math.max(1, poblacion)) * 2200 +
        (d.nuevoResidentesEstimados / Math.max(1, poblacion)) * 1600 +
        (ruralPct > 75 ? 8 : 0),
      ));
      return {
        ...d,
        poblacion,
        ruralPct,
        score,
        cuposFormacion: Math.round(d.empleosLocalesEstimados * (100 - params.capturaLocal_pct) / 100 * 0.9 + d.empleosLocalesEstimados * 0.18),
        proveedoresMeta: Math.max(1, Math.round(result.proveedoresLocalesEstimados * d.empleosLocalesEstimados / Math.max(1, result.empleoLocal))),
      };
    })
    .sort((a, b) => b.score - a.score), [params.capturaLocal_pct, result]);

  const filteredDistrictIntelligence = useMemo(() => districtIntelligence.filter((district) => {
    if (filters.selectedDistrictName) return district.nombre === filters.selectedDistrictName;
    if (filters.activeDepartment === '01') return district.departamento === 'Concepcion' || district.departamento === 'Concepción';
    if (filters.activeDepartment === '13') return district.departamento === 'Amambay';
    return true;
  }), [districtIntelligence, filters.activeDepartment, filters.selectedDistrictName]);

  const resumenKpis = useMemo(() => {
    const empleoVsRef = (result.empleoTotal / PARACEL_FACTS.empleosDirectosIndirectosRef) * 100;
    const produccionPorEmpleo = PARACEL_FACTS.produccionAnualTon / Math.max(1, result.empleoTotal);
    const toneladasDia = PARACEL_FACTS.produccionAnualTon / 365;
    const inversionPorEmpleoUsd = PARACEL_FACTS.inversionIndustrialUsd / Math.max(1, result.empleoTotal);
    return {
      empleoVsRef,
      produccionPorEmpleo,
      toneladasDia,
      inversionPorEmpleoUsd,
      cuposFormacion: brechas.find((b) => b.area === 'Formacion')?.brecha ?? 0,
      brechaComprasMM: brechas.find((b) => b.area === 'Proveedores locales')?.brecha ?? 0,
    };
  }, [brechas, result.empleoTotal]);

  return (
    <div className="view-container impacto-report">
      <div className="impacto-hero print-section">
        <div>
          <p className="eyebrow">Modelo territorial antes / durante / después</p>
          <h2 className="view-title">
            Impacto territorial PARACEL · {viewScope}
            <span className="view-subtitle"> - Escenario {ESCENARIO_LABELS[escenario].label}: {ESCENARIO_LABELS[escenario].desc}</span>
          </h2>
          <p className="view-subtitle">Horizonte global {horizonYear}. Las lineas separan presencia observada de efectos esperados.</p>
        </div>
        <button className="secondary-button print-hide" type="button" onClick={() => window.print()}>
          <Printer size={16} /> Imprimir / PDF
        </button>
      </div>

      <div className="dept-selector print-hide" style={{ flexWrap: 'wrap', gap: 8 }}>
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

      <div className="source-fact-grid print-section">
        <FactCard icon={<Factory size={18} />} value="1,8 M t/año" label="capacidad anual de celulosa" source="Paracel" />
        <FactCard icon={<Gauge size={18} />} value="220 MW" label="energia electrica asociada" source="Paracel" />
        <FactCard icon={<Landmark size={18} />} value="USD 2,9 MM" label="inversión industrial reportada" source="Paracel" />
        <FactCard icon={<Trees size={18} />} value="203.515 ha" label="tierras propias forestales" source="Paracel" />
        <FactCard icon={<Users size={18} />} value="1.040" label="empleos directos actuales reportados" source="Paracel" />
        <FactCard icon={<Truck size={18} />} value="~7.000" label="empleos directos e indirectos esperados" source="BID Invest" />
      </div>

      <div className="impacto-layout">
        <aside className="params-panel print-hide">
          <h3 className="params-section-title"><Factory size={15} /> Empleo y cadena</h3>
          <SliderField label="Empleo directo (obra)" value={params.empleoDirectoObra}
            min={500} max={5000} step={100} unit=" pers."
            onChange={(v) => setParam('empleoDirectoObra', v)} />
          <SliderField label="Empleo directo (operación)" value={params.empleoDirectoOperacion}
            min={200} max={3000} step={20} unit=" pers."
            onChange={(v) => setParam('empleoDirectoOperacion', v)} />
          <SliderField label="Multiplicador indirecto" value={params.multiplicadorIndirecto}
            min={1} max={6} step={0.1} unit="x"
            hint="empleos indirectos por empleo directo"
            onChange={(v) => setParam('multiplicadorIndirecto', v)} />
          <SliderField label="Empleo inducido por 1.000 M Gs." value={params.coeficienteInducido}
            min={0.5} max={8} step={0.1} unit=""
            hint="empleos por cada 1.000 M Gs. retenidos localmente"
            onChange={(v) => setParam('coeficienteInducido', v)} />
          <SliderField label="Captura local" value={params.capturaLocal_pct}
            min={10} max={95} step={5} unit="%"
            onChange={(v) => setParam('capturaLocal_pct', v)} />

          <h3 className="params-section-title" style={{ marginTop: 20 }}><Users size={15} /> Migracion</h3>
          <SliderField label="Trabajadores no locales" value={params.pctNoLocales}
            min={5} max={90} step={5} unit="%"
            onChange={(v) => setParam('pctNoLocales', v)} />
          <SliderField label="Traen familia" value={params.proporcionConFamilia_pct}
            min={0} max={80} step={5} unit="%"
            onChange={(v) => setParam('proporcionConFamilia_pct', v)} />
          <SliderField label="Tamaño hogar migrante" value={params.tamanioHogarMigrante}
            min={2} max={6} step={0.1} unit=" pers."
            onChange={(v) => setParam('tamanioHogarMigrante', v)} />

          <h3 className="params-section-title" style={{ marginTop: 20 }}><Coins size={15} /> Economia local</h3>
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

          <h3 className="params-section-title" style={{ marginTop: 20 }}><Calendar size={15} /> Cronograma</h3>
          <SliderField label="Inicio de obra" value={params.anioInicioObra}
            min={2025} max={2030} step={1} unit=""
            onChange={(v) => setParam('anioInicioObra', v)} />
          <SliderField label="Duracion de obra" value={params.duracionObraAnios}
            min={1} max={6} step={1} unit=" años"
            onChange={(v) => setParam('duracionObraAnios', v)} />
          <p className="params-note">Operación plena estimada: <strong>{result.anioOperacionPlena}</strong></p>
        </aside>

        <div className="results-panel">
          <div className="baseline-strip print-section">
            <KPICard label="Poblacion base" value={FMT_N(baselineView.poblacion)} sub={`${viewScope}, Censo 2022`} color="var(--emerald-600)" icon={<Users size={18} />} />
            <KPICard label="Ruralidad" value={FMT_PCT(baselineView.ruralPct)} sub="presion sobre conectividad y servicios" color="var(--blue-600)" icon={<Truck size={18} />} />
            <KPICard label="Poblacion indigena" value={FMT_PCT(baselineView.indigenaPct)} sub="peso relativo en el filtro actual" color="var(--amber-600)" icon={<Trees size={18} />} />
            <KPICard label="Pobreza estimada" value={FMT_PCT(baselineView.pobrezaPct)} sub="promedio ponderado departamental" color="var(--red-600)" icon={<AlertTriangle size={18} />} />
            <KPICard label="Sin seguro medico" value={FMT_PCT(baselineView.sinSeguroPct)} sub="riesgo de presion sanitaria" color="var(--violet-600)" icon={<ShieldCheck size={18} />} />
            <KPICard label="Sin agua potable" value={FMT_PCT(baselineView.sinAguaPct)} sub="brecha de servicios basicos" color="var(--cyan-600)" icon={<Home size={18} />} />
          </div>

          <div className="chart-card print-section">
            <h4 className="chart-title">Sensores 2025-2026: oportunidades y presiones antes del shock PARACEL</h4>
            <ResponsiveContainer width="100%" height={230}>
              <ComposedChart data={CONTEXT_SIGNAL_INDEX} margin={{ top: 8, right: 12, left: 0, bottom: 34 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                <XAxis dataKey="dimension" tick={{ fontSize: 10 }} interval={0} angle={-22} textAnchor="end" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number, name: string) => [`${v}/100`, name === 'opportunity' ? 'Oportunidad' : name === 'pressure' ? 'Presión' : 'Índice']} />
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v: string) => v === 'opportunity' ? 'Oportunidad' : v === 'pressure' ? 'Presión' : 'Índice'} />
                <Bar dataKey="opportunity" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pressure" fill="#d97706" radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="phase-grid print-section">
            {faseData.map((fase) => (
              <article key={fase.fase} className={`phase-card phase-${fase.fase.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="phase-head">
                  <span>{fase.fase}</span>
                  <strong>{fase.periodo}</strong>
                </div>
                <div className="phase-metrics">
                  <b>{FMT_N(fase.empleo)}</b><span>empleos totales</span>
                  <b>{FMT_N(fase.residentes)}</b><span>residentes inducidos</span>
                  <b>{FMT_N(fase.hogares)}</b><span>hogares adicionales</span>
                  <b>{FMT_N(fase.ingresoMM)} MM</b><span>Gs. retenidos/año</span>
                </div>
                <div className="phase-pressure">
                  <div style={{ width: `${fase.presion}%` }} />
                </div>
                <p>{fase.foco}</p>
                <small>{fase.gestion}</small>
              </article>
            ))}
          </div>

          <div className="kpi-grid-4 print-section">
            <KPICard icon={<Factory size={18} />} label="Empleo total estimado"
              value={FMT_N(result.empleoTotal)}
              sub={`${FMT_PCT(resumenKpis.empleoVsRef, 0)} de la referencia ~7.000 empleos`}
              color="var(--emerald-600)" />
            <KPICard icon={<Users size={18} />} label="Captura local directa"
              value={`${FMT_N(result.empleoLocal)} (${params.capturaLocal_pct}%)`}
              sub={`${FMT_N(result.empleoImportado)} puestos importados o por formar`}
              color="var(--blue-600)" />
            <KPICard icon={<GraduationCap size={18} />} label="Cupos tecnicos urgentes"
              value={FMT_N(resumenKpis.cuposFormacion)}
              sub="meta minima para reducir dependencia externa"
              color="var(--violet-600)" />
            <KPICard icon={<Building2 size={18} />} label="Vivienda adicional"
              value={FMT_N(result.hogaresAdicionalesTotal)}
              sub={`${FMT_N(result.pobInducidaTotal)} residentes inducidos`}
              color="var(--amber-600)" />
            <KPICard icon={<Coins size={18} />} label="Ingreso local anual"
              value={`${FMT_MRD(result.ingresoTotalLocalAnualGs)} Gs.`}
              sub="salarios retenidos + compras locales"
              color="var(--emerald-600)" />
            <KPICard icon={<Truck size={18} />} label="Produccion equivalente"
              value={`${FMT_N(Math.round(resumenKpis.toneladasDia))} t/dia`}
              sub={`${FMT_N(Math.round(resumenKpis.produccionPorEmpleo))} t/año por empleo total`}
              color="var(--blue-600)" />
            <KPICard icon={<Landmark size={18} />} label="Inversion por empleo"
              value={`USD ${FMT_N(Math.round(resumenKpis.inversionPorEmpleoUsd))}`}
              sub="inversión industrial / empleo total modelado"
              color="var(--cyan-600)" />
            <KPICard icon={<FileText size={18} />} label="Brecha compras locales"
              value={`${FMT_N(resumenKpis.brechaComprasMM)} MM Gs.`}
              sub="hasta meta de 60% de compras locales"
              color="var(--red-600)" />
          </div>

          <div className="chart-card print-section">
            <h4 className="chart-title">Serie PARACEL: observado reciente vs impacto esperado</h4>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={impactTimeline} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                <XAxis dataKey="anio" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number, name: string) => [
                  FMT_N(v),
                  name === 'empleoObservado'
                    ? 'Empleo observado/reportado'
                    : name === 'empleoEsperado'
                      ? 'Empleo esperado'
                      : name === 'residentesEsperados'
                        ? 'Residentes esperados'
                        : 'Ingreso esperado MM Gs.',
                ]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {PARACEL_MILESTONES.map((milestone) => (
                  <ReferenceLine
                    key={milestone.anio}
                    yAxisId="left"
                    x={milestone.anio}
                    stroke="#111827"
                    strokeDasharray="4 4"
                    strokeOpacity={0.45}
                    label={{ value: milestone.label, angle: -90, position: 'insideTop', fontSize: 10, fill: '#111827' }}
                  />
                ))}
                <Line yAxisId="left" type="monotone" dataKey="empleoObservado" name="Empleo observado" stroke="#111827" strokeWidth={2.4} connectNulls dot={{ r: 4 }} />
                <Line yAxisId="left" type="monotone" dataKey="empleoEsperado" name="Empleo esperado" stroke="#059669" strokeWidth={2.4} connectNulls dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="residentesEsperados" name="Residentes esperados" stroke="#7c3aed" strokeWidth={2} connectNulls dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="ingresoEsperadoMM" name="Ingreso esperado MM Gs." stroke="#d97706" strokeWidth={2} connectNulls dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="charts-grid-2 print-section">
            <div className="chart-card">
              <h4 className="chart-title">Antes, durante y después: empleo, residentes e ingreso</h4>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={faseData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                  <XAxis dataKey="fase" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number, name: string) => [FMT_N(v), name]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="empleo" name="Empleo total" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="residentes" name="Residentes inducidos" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="ingresoMM" name="Ingreso local MM Gs." stroke="#d97706" strokeWidth={2.4} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h4 className="chart-title">Radar de tensiones y oportunidades por fase</h4>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                  <Radar name="Antes" dataKey="Antes" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.14} />
                  <Radar name="Durante" dataKey="Durante" stroke="#d97706" fill="#d97706" fillOpacity={0.18} />
                  <Radar name="Despues" dataKey="Despues" stroke="#059669" fill="#059669" fillOpacity={0.2} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `${v}/100`} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="charts-grid-2 print-section">
            <div className="chart-card">
              <h4 className="chart-title">Evolucion temporal: empleo e ingreso local</h4>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={evolutionData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                  <XAxis dataKey="anio" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number, name: string) => [FMT_N(v), name]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine yAxisId="left" x={result.anioFinObra} stroke="#059669" strokeDasharray="4 3" />
                  {PARACEL_MILESTONES.map((milestone) => (
                    <ReferenceLine key={milestone.anio} yAxisId="left" x={milestone.anio} stroke="#111827" strokeDasharray="4 4" strokeOpacity={0.28} />
                  ))}
                  <Line yAxisId="left" type="monotone" dataKey="empTotal" name="Empleo total" stroke="#059669" strokeWidth={2.4} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="ingresoMM" name="Ingreso local MM Gs." stroke="#d97706" strokeWidth={2.2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h4 className="chart-title">Cadena de valor: compras locales y empleo asociado</h4>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={valueChainData} margin={{ top: 8, right: 12, bottom: 36, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                  <XAxis dataKey="rubro" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number, name: string) => [FMT_N(v), name]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="montoMM" name="Compras MM Gs." fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="empleo" name="Empleo asociado" stroke="#059669" strokeWidth={2.4} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card print-section">
            <h4 className="chart-title">Matriz de brechas de gestion</h4>
            <div className="impact-table-wrap">
              <table className="impact-table">
                <thead>
                  <tr>
                    <th>Área crítica</th>
                    <th>Actual / estimado</th>
                    <th>Meta inteligente</th>
                    <th>Brecha</th>
                    <th>Decision sugerida</th>
                  </tr>
                </thead>
                <tbody>
                  {brechas.map((b) => (
                    <tr key={b.area}>
                      <td className="td-nombre">{b.area}</td>
                      <td className="td-num">{FMT_N(b.actual)}</td>
                      <td className="td-num">{FMT_N(b.meta)}</td>
                      <td className="td-num">{FMT_N(b.brecha)}</td>
                      <td>{b.decision}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="chart-card print-section">
            <h4 className="chart-title">Ranking distrital inteligente: oportunidad + presion · {viewScope}</h4>
            <div className="impact-table-wrap">
              <table className="distrito-table">
                <thead>
                  <tr>
                    <th>Distrito</th>
                    <th>Depto.</th>
                    <th>Poblacion base</th>
                    <th>Ruralidad</th>
                    <th>Empleos locales</th>
                    <th>Residentes inducidos</th>
                    <th>Hogares</th>
                    <th>Presion vivienda</th>
                    <th>Presion servicios</th>
                    <th>Cupos formación</th>
                    <th>Proveedores meta</th>
                    <th>Prioridad</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDistrictIntelligence.map((d) => (
                    <tr key={`${d.departamento}-${d.nombre}`}>
                      <td className="td-nombre">{d.nombre}</td>
                      <td className="td-depto">{d.departamento}</td>
                      <td className="td-num">{FMT_N(d.poblacion)}</td>
                      <td className="td-num">{FMT_PCT(d.ruralPct, 0)}</td>
                      <td className="td-num">{FMT_N(d.empleosLocalesEstimados)}</td>
                      <td className="td-num">{FMT_N(d.nuevoResidentesEstimados)}</td>
                      <td className="td-num">{FMT_N(d.hogaresAdicionalesRequeridos)}</td>
                      <td className="td-num"><RiskBadge nivel={d.vulnerabilidadDesplazamiento} /></td>
                      <td className="td-num">{d.presionServiciosIndice}/100</td>
                      <td className="td-num">{FMT_N(d.cuposFormacion)}</td>
                      <td className="td-num">{FMT_N(d.proveedoresMeta)}</td>
                      <td><PriorityBadge score={d.score} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="chart-card print-section">
            <h4 className="chart-title">Lectura ejecutiva</h4>
            <div className="executive-grid">
              <div>
                <strong>Antes</strong>
                <p>La región parte de una base rural alta, pobreza significativa, fuerte presencia indígena y brechas de salud/agua. La decisión inteligente es preparar capacidades antes del pico de obra.</p>
              </div>
              <div>
                <strong>Durante</strong>
                <p>La obra concentra el mayor riesgo de tension: alojamiento, alquileres, movilidad, seguridad vial, demanda sanitaria y precios locales. Esta fase requiere monitoreo mensual.</p>
              </div>
              <div>
                <strong>Despues</strong>
                <p>La operación plena cambia el eje: empleo estable, proveedores, logística, servicios técnicos y retención salarial. El impacto positivo depende de elevar captura local y compras regionales.</p>
              </div>
            </div>
          </div>

          <div className="metodologia-note print-section">
            <strong>Fuentes y trazabilidad:</strong> magnitudes públicas tomadas de Paracel, BID Invest y Agencia IP. Los cálculos son simulaciones con supuestos editables; deben actualizarse cuando PARACEL entregue dotación por categoría, cronograma contractual, salarios, compras, rutas logísticas y localización de alojamientos.
            <div className="source-links print-hide">
              <a href="https://www.paracel.com.py/" target="_blank" rel="noreferrer">Paracel</a>
              <a href="https://idbinvest.org/en/news-media/idb-invest-supports-paracel-largest-private-investment-paraguays-history-develop-countrys" target="_blank" rel="noreferrer">BID Invest</a>
              <a href="https://www.ip.gov.py/ip/2025/04/09/paracel-finaliza-movimiento-de-suelo-para-futura-planta-de-celulosa-en-concepcion/" target="_blank" rel="noreferrer">Agencia IP</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
