import { useMemo, useState } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  LineChart, Line, ReferenceLine,
} from 'recharts';
import { HeartPulse, GraduationCap, Briefcase, Coins, Home, Users } from 'lucide-react';
import KPICard from '../components/charts/KPICard';
import {
  SOCIAL_INDICATORS,
  SERIES_HISTORICAS,
  type DeptSocialIndicators,
} from '../data/socialIndicators';
import type { DeptKey } from '../data/census2022';
import { CENSUS } from '../data/census2022';
import type { GlobalFilters } from '../types';
import { deptKeysFromFilters, scopeLabel } from '../utils/analysis';

type PoblacionKey = 'total' | 'indigena';

const pct = (n: number) => n.toFixed(1) + '%';

const TABS = [
  { id: 'salud',      label: 'Salud',       icon: HeartPulse },
  { id: 'educacion',  label: 'Educación',   icon: GraduationCap },
  { id: 'empleo',     label: 'Empleo',      icon: Briefcase },
  { id: 'pobreza',    label: 'Pobreza',     icon: Coins },
  { id: 'vivienda',   label: 'Vivienda',    icon: Home },
  { id: 'genero',     label: 'Género',      icon: Users },
] as const;

type TabId = typeof TABS[number]['id'];

type SocialTotalKey = 'concepcion_total' | 'amambay_total';

function socialKey(dept: DeptKey): SocialTotalKey {
  return dept === 'concepcion' ? 'concepcion_total' : 'amambay_total';
}

function weightedTotal(keys: DeptKey[], getter: (row: DeptSocialIndicators) => number): number {
  const total = keys.reduce((sum, key) => sum + CENSUS[key].poblacion_total, 0);
  return keys.reduce((sum, key) => (
    sum + getter(SOCIAL_INDICATORS[socialKey(key)]) * CENSUS[key].poblacion_total
  ), 0) / Math.max(1, total);
}

function aggregateSocial(keys: DeptKey[]): DeptSocialIndicators {
  if (keys.length === 1) return SOCIAL_INDICATORS[socialKey(keys[0])];

  return {
    poblacion: 'total',
    anio_referencia: 2022,
    fuente: 'INE/EPH 2022, promedio ponderado Concepcion + Amambay',
    salud: {
      sinSeguroMedico_pct: weightedTotal(keys, (row) => row.salud.sinSeguroMedico_pct),
      conIPS_pct: weightedTotal(keys, (row) => row.salud.conIPS_pct),
      conOtroSeguro_pct: weightedTotal(keys, (row) => row.salud.conOtroSeguro_pct),
      consultaMedica_pct: weightedTotal(keys, (row) => row.salud.consultaMedica_pct),
      usf_presencia_pct: weightedTotal(keys, (row) => row.salud.usf_presencia_pct),
    },
    educacion: {
      analfabetismo_pct: weightedTotal(keys, (row) => row.educacion.analfabetismo_pct),
      analfabetismo_hombres_pct: weightedTotal(keys, (row) => row.educacion.analfabetismo_hombres_pct),
      analfabetismo_mujeres_pct: weightedTotal(keys, (row) => row.educacion.analfabetismo_mujeres_pct),
      asistencia_6_17_pct: weightedTotal(keys, (row) => row.educacion.asistencia_6_17_pct),
      promedio_anios_estudio: weightedTotal(keys, (row) => row.educacion.promedio_anios_estudio),
    },
    empleo: {
      tasa_actividad_pct: weightedTotal(keys, (row) => row.empleo.tasa_actividad_pct),
      tasa_actividad_hombres_pct: weightedTotal(keys, (row) => row.empleo.tasa_actividad_hombres_pct),
      tasa_actividad_mujeres_pct: weightedTotal(keys, (row) => row.empleo.tasa_actividad_mujeres_pct),
      tasa_ocupacion_pct: weightedTotal(keys, (row) => row.empleo.tasa_ocupacion_pct),
      sector_primario_pct: weightedTotal(keys, (row) => row.empleo.sector_primario_pct),
    },
    pobreza: {
      incidencia_pobreza_pct: weightedTotal(keys, (row) => row.pobreza.incidencia_pobreza_pct),
      incidencia_pobreza_extrema_pct: weightedTotal(keys, (row) => row.pobreza.incidencia_pobreza_extrema_pct),
      brecha_pobreza: weightedTotal(keys, (row) => row.pobreza.brecha_pobreza),
      severidad_pobreza: weightedTotal(keys, (row) => row.pobreza.severidad_pobreza),
    },
    genero: {
      jefatura_femenina_pct: weightedTotal(keys, (row) => row.genero.jefatura_femenina_pct),
      tgf: weightedTotal(keys, (row) => row.genero.tgf),
      mujeres_sin_hijos_12a49_pct: weightedTotal(keys, (row) => row.genero.mujeres_sin_hijos_12a49_pct),
    },
    vivienda: {
      sin_agua_potable_pct: weightedTotal(keys, (row) => row.vivienda.sin_agua_potable_pct),
      sin_electricidad_pct: weightedTotal(keys, (row) => row.vivienda.sin_electricidad_pct),
      sin_saneamiento_pct: weightedTotal(keys, (row) => row.vivienda.sin_saneamiento_pct),
      hacinamiento_pct: weightedTotal(keys, (row) => row.vivienda.hacinamiento_pct),
    },
  };
}

export default function SocialView({ filters }: { filters: GlobalFilters }) {
  const [tab, setTab] = useState<TabId>('salud');
  const [poblacion, setPoblacion] = useState<PoblacionKey>('total');
  const deptKeys = useMemo(() => deptKeysFromFilters(filters), [filters]);
  const viewScope = scopeLabel(filters);

  const ind = poblacion === 'total'
    ? aggregateSocial(deptKeys)
    : SOCIAL_INDICATORS.indigenas_nacional;
  const socialSource = ind.fuente;
  const comparativeSource = 'INE/EPH 2022 y Censo 2022; comparativa propia';
  const historicalSource = 'INE, series historicas disponibles';

  const indComparativo = {
    concepcion: SOCIAL_INDICATORS.concepcion_total,
    amambay:    SOCIAL_INDICATORS.amambay_total,
    indigena:   SOCIAL_INDICATORS.indigenas_nacional,
  };

  const radarData = [
    { indicador: 'Salud\n(seguro)',   con: 100 - ind.salud.sinSeguroMedico_pct, sin: ind.salud.sinSeguroMedico_pct },
    { indicador: 'Consulta\nmed.',    con: ind.salud.consultaMedica_pct, sin: 100 - ind.salud.consultaMedica_pct },
    { indicador: 'Alfabetismo',       con: 100 - ind.educacion.analfabetismo_pct, sin: ind.educacion.analfabetismo_pct },
    { indicador: 'Asistencia\nescolar', con: ind.educacion.asistencia_6_17_pct, sin: 100 - ind.educacion.asistencia_6_17_pct },
    { indicador: 'Empleo',            con: ind.empleo.tasa_ocupacion_pct, sin: 100 - ind.empleo.tasa_ocupacion_pct },
    { indicador: 'Sin\npobreza',      con: 100 - ind.pobreza.incidencia_pobreza_pct, sin: ind.pobreza.incidencia_pobreza_pct },
    { indicador: 'Agua\npotable',     con: 100 - ind.vivienda.sin_agua_potable_pct, sin: ind.vivienda.sin_agua_potable_pct },
    { indicador: 'Electricidad',      con: 100 - ind.vivienda.sin_electricidad_pct, sin: ind.vivienda.sin_electricidad_pct },
  ];

  return (
    <div className="view-container">
      {/* Selectores */}
      <div className="filter-scope-note">
        Filtro aplicado: <strong>{viewScope}</strong>
        {filters.selectedDistrictName && <span> | indicadores sociales usados como proxy departamental</span>}
      </div>

      <div className="dept-selector">
        {(['total', 'indigena'] as PoblacionKey[]).map(p => (
          <button key={p} className={`dept-btn${poblacion === p ? ' active' : ''}`} onClick={() => setPoblacion(p)}>
            {p === 'total' ? 'Población total' : 'Población indígena'}
          </button>
        ))}
      </div>

      <h2 className="view-title">
        Indicadores Sociales · {viewScope}
        <span className="view-subtitle"> — {ind.fuente}</span>
      </h2>

      {/* Radar resumen */}
      <div className="charts-grid-2">
        <div className="chart-card">
          <h4 className="chart-title">Perfil de bienestar — {poblacion === 'total' ? 'Población total' : 'Población indígena'}</h4>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="indicador" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
              <Radar name="Con acceso (%)" dataKey="con" stroke="#059669" fill="#059669" fillOpacity={0.35} />
              <Legend />
              <Tooltip formatter={(v: number) => pct(v)} />
            </RadarChart>
          </ResponsiveContainer>
          <p className="source-note"><strong>Fuente:</strong> {socialSource}.</p>
        </div>

        {/* Comparativa departamentos + indígena */}
        <div className="chart-card">
          <h4 className="chart-title">Comparativa: Concepción · Amambay · Indígena</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={[
                { ind: 'Sin seguro\nmédico (%)', con: indComparativo.concepcion.salud.sinSeguroMedico_pct, amb: indComparativo.amambay.salud.sinSeguroMedico_pct, indig: indComparativo.indigena.salud.sinSeguroMedico_pct },
                { ind: 'Analfab. (%)', con: indComparativo.concepcion.educacion.analfabetismo_pct, amb: indComparativo.amambay.educacion.analfabetismo_pct, indig: indComparativo.indigena.educacion.analfabetismo_pct },
                { ind: 'Pobreza (%)', con: indComparativo.concepcion.pobreza.incidencia_pobreza_pct, amb: indComparativo.amambay.pobreza.incidencia_pobreza_pct, indig: indComparativo.indigena.pobreza.incidencia_pobreza_pct },
                { ind: 'Sin agua\npotable (%)', con: indComparativo.concepcion.vivienda.sin_agua_potable_pct, amb: indComparativo.amambay.vivienda.sin_agua_potable_pct, indig: indComparativo.indigena.vivienda.sin_agua_potable_pct },
              ]}
              margin={{ top: 4, right: 8, left: 8, bottom: 40 }}
            >
              <XAxis dataKey="ind" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
              <Tooltip formatter={(v: number) => pct(v)} />
              <Legend />
              <Bar dataKey="con" name="Concepción" fill="#059669" />
              <Bar dataKey="amb" name="Amambay" fill="#2563eb" />
              <Bar dataKey="indig" name="Indígena" fill="#d97706" />
            </BarChart>
          </ResponsiveContainer>
          <p className="source-note"><strong>Fuente:</strong> {comparativeSource}.</p>
        </div>
      </div>

      {/* Tabs de indicadores */}
      <div className="indicator-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`indicator-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido por tab */}
      {tab === 'salud' && (
        <div>
          <div className="kpi-grid">
            <KPICard label="Sin seguro médico" value={pct(ind.salud.sinSeguroMedico_pct)} source={socialSource} color="var(--red-600)" icon={<HeartPulse size={18}/>} />
            <KPICard label="Con IPS" value={pct(ind.salud.conIPS_pct)} source={socialSource} color="var(--emerald-600)" />
            <KPICard label="Otro seguro" value={pct(ind.salud.conOtroSeguro_pct)} source={socialSource} color="var(--cyan-600)" />
            <KPICard label="Consultó al médico (ult. 90 días)" value={pct(ind.salud.consultaMedica_pct)} source={socialSource} color="var(--blue-600)" />
            <KPICard label="Con presencia de USF" value={pct(ind.salud.usf_presencia_pct)} source={socialSource} color="var(--violet-600)" />
          </div>
          <div className="chart-card">
            <h4 className="chart-title">Cobertura de seguro médico</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={[
                  { cat: 'IPS', concepcion: indComparativo.concepcion.salud.conIPS_pct, amambay: indComparativo.amambay.salud.conIPS_pct, indigena: indComparativo.indigena.salud.conIPS_pct },
                  { cat: 'Otro seguro', concepcion: indComparativo.concepcion.salud.conOtroSeguro_pct, amambay: indComparativo.amambay.salud.conOtroSeguro_pct, indigena: indComparativo.indigena.salud.conOtroSeguro_pct },
                  { cat: 'Sin seguro', concepcion: indComparativo.concepcion.salud.sinSeguroMedico_pct, amambay: indComparativo.amambay.salud.sinSeguroMedico_pct, indigena: indComparativo.indigena.salud.sinSeguroMedico_pct },
                ]}
                margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
              >
                <XAxis dataKey="cat" tick={{ fontSize: 12 }} />
                <YAxis unit="%" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => pct(v)} />
                <Legend />
                <Bar dataKey="concepcion" name="Concepción" fill="#059669" />
                <Bar dataKey="amambay" name="Amambay" fill="#2563eb" />
                <Bar dataKey="indigena" name="Indígena (nacional)" fill="#d97706" />
              </BarChart>
            </ResponsiveContainer>
            <p className="source-note"><strong>Fuente:</strong> {comparativeSource}.</p>
          </div>
        </div>
      )}

      {tab === 'educacion' && (
        <div>
          <div className="kpi-grid">
            <KPICard label="Tasa de analfabetismo" value={pct(ind.educacion.analfabetismo_pct)} source={socialSource} color="var(--red-600)" icon={<GraduationCap size={18}/>} />
            <KPICard label="Analfabetismo hombres" value={pct(ind.educacion.analfabetismo_hombres_pct)} source={socialSource} color="var(--blue-600)" />
            <KPICard label="Analfabetismo mujeres" value={pct(ind.educacion.analfabetismo_mujeres_pct)} source={socialSource} color="var(--violet-600)" />
            <KPICard label="Asistencia escolar (6–17)" value={pct(ind.educacion.asistencia_6_17_pct)} source={socialSource} color="var(--emerald-600)" />
            <KPICard label="Años de estudio promedio" value={ind.educacion.promedio_anios_estudio.toFixed(1)} source={socialSource} color="var(--cyan-600)" />
          </div>
          <div className="chart-card">
            <h4 className="chart-title">Analfabetismo por sexo — comparativa</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={[
                  { cat: 'Total', concepcion: indComparativo.concepcion.educacion.analfabetismo_pct, amambay: indComparativo.amambay.educacion.analfabetismo_pct, indigena: indComparativo.indigena.educacion.analfabetismo_pct },
                  { cat: 'Hombres', concepcion: indComparativo.concepcion.educacion.analfabetismo_hombres_pct, amambay: indComparativo.amambay.educacion.analfabetismo_hombres_pct, indigena: indComparativo.indigena.educacion.analfabetismo_hombres_pct },
                  { cat: 'Mujeres', concepcion: indComparativo.concepcion.educacion.analfabetismo_mujeres_pct, amambay: indComparativo.amambay.educacion.analfabetismo_mujeres_pct, indigena: indComparativo.indigena.educacion.analfabetismo_mujeres_pct },
                ]}
                margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
              >
                <XAxis dataKey="cat" tick={{ fontSize: 12 }} />
                <YAxis unit="%" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => pct(v)} />
                <Legend />
                <Bar dataKey="concepcion" name="Concepción" fill="#059669" />
                <Bar dataKey="amambay" name="Amambay" fill="#2563eb" />
                <Bar dataKey="indigena" name="Indígena (nacional)" fill="#d97706" />
              </BarChart>
            </ResponsiveContainer>
            <p className="source-note"><strong>Fuente:</strong> {comparativeSource}.</p>
          </div>
        </div>
      )}

      {tab === 'empleo' && (
        <div>
          <div className="kpi-grid">
            <KPICard label="Tasa de actividad" value={pct(ind.empleo.tasa_actividad_pct)} source={socialSource} color="var(--emerald-600)" icon={<Briefcase size={18}/>} />
            <KPICard label="Actividad hombres" value={pct(ind.empleo.tasa_actividad_hombres_pct)} source={socialSource} color="var(--blue-600)" />
            <KPICard label="Actividad mujeres" value={pct(ind.empleo.tasa_actividad_mujeres_pct)} source={socialSource} color="var(--violet-600)" />
            <KPICard label="Tasa de ocupación" value={pct(ind.empleo.tasa_ocupacion_pct)} source={socialSource} color="var(--cyan-600)" />
            <KPICard label="Sector primario" value={pct(ind.empleo.sector_primario_pct)} source={socialSource} color="var(--amber-600)" />
          </div>
          <div className="chart-card">
            <h4 className="chart-title">Tasa de actividad por sexo — comparativa</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={[
                  { cat: 'Total', con: indComparativo.concepcion.empleo.tasa_actividad_pct, amb: indComparativo.amambay.empleo.tasa_actividad_pct, ind: indComparativo.indigena.empleo.tasa_actividad_pct },
                  { cat: 'Hombres', con: indComparativo.concepcion.empleo.tasa_actividad_hombres_pct, amb: indComparativo.amambay.empleo.tasa_actividad_hombres_pct, ind: indComparativo.indigena.empleo.tasa_actividad_hombres_pct },
                  { cat: 'Mujeres', con: indComparativo.concepcion.empleo.tasa_actividad_mujeres_pct, amb: indComparativo.amambay.empleo.tasa_actividad_mujeres_pct, ind: indComparativo.indigena.empleo.tasa_actividad_mujeres_pct },
                ]}
                margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
              >
                <XAxis dataKey="cat" tick={{ fontSize: 12 }} />
                <YAxis unit="%" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => pct(v)} />
                <Legend />
                <Bar dataKey="con" name="Concepción" fill="#059669" />
                <Bar dataKey="amb" name="Amambay" fill="#2563eb" />
                <Bar dataKey="ind" name="Indígena (nacional)" fill="#d97706" />
              </BarChart>
            </ResponsiveContainer>
            <p className="source-note"><strong>Fuente:</strong> {comparativeSource}.</p>
          </div>
        </div>
      )}

      {tab === 'pobreza' && (
        <div>
          <div className="kpi-grid">
            <KPICard label="Incidencia pobreza total" value={pct(ind.pobreza.incidencia_pobreza_pct)} source={socialSource} color="var(--red-600)" icon={<Coins size={18}/>} />
            <KPICard label="Pobreza extrema" value={pct(ind.pobreza.incidencia_pobreza_extrema_pct)} source={socialSource} color="var(--amber-600)" />
            <KPICard label="Brecha de pobreza" value={pct(ind.pobreza.brecha_pobreza)} source={socialSource} color="var(--violet-600)" />
            <KPICard label="Severidad de pobreza" value={pct(ind.pobreza.severidad_pobreza)} source={socialSource} color="var(--cyan-600)" />
          </div>
          <div className="chart-card">
            <h4 className="chart-title">Evolución de la pobreza total (%)</h4>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={SERIES_HISTORICAS.pobreza} margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                <XAxis dataKey="anio" tick={{ fontSize: 11 }} />
                <YAxis unit="%" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => pct(v)} />
                <Legend />
                <Line type="monotone" dataKey="concepcion" name="Concepción" stroke="#059669" strokeWidth={2} />
                <Line type="monotone" dataKey="amambay" name="Amambay" stroke="#2563eb" strokeWidth={2} />
                <Line type="monotone" dataKey="paraguay" name="Paraguay" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
            <p className="source-note"><strong>Fuente:</strong> {historicalSource}.</p>
          </div>
        </div>
      )}

      {tab === 'vivienda' && (
        <div>
          <div className="kpi-grid">
            <KPICard label="Sin agua potable" value={pct(ind.vivienda.sin_agua_potable_pct)} source={socialSource} color="var(--red-600)" icon={<Home size={18}/>} />
            <KPICard label="Sin electricidad" value={pct(ind.vivienda.sin_electricidad_pct)} source={socialSource} color="var(--amber-600)" />
            <KPICard label="Sin saneamiento" value={pct(ind.vivienda.sin_saneamiento_pct)} source={socialSource} color="var(--violet-600)" />
            <KPICard label="Hacinamiento" value={pct(ind.vivienda.hacinamiento_pct)} source={socialSource} color="var(--cyan-600)" />
          </div>
          <div className="chart-card">
            <h4 className="chart-title">Déficit de servicios básicos — comparativa</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={[
                  { servicio: 'Agua potable', con: indComparativo.concepcion.vivienda.sin_agua_potable_pct, amb: indComparativo.amambay.vivienda.sin_agua_potable_pct, ind: indComparativo.indigena.vivienda.sin_agua_potable_pct },
                  { servicio: 'Electricidad', con: indComparativo.concepcion.vivienda.sin_electricidad_pct, amb: indComparativo.amambay.vivienda.sin_electricidad_pct, ind: indComparativo.indigena.vivienda.sin_electricidad_pct },
                  { servicio: 'Saneamiento', con: indComparativo.concepcion.vivienda.sin_saneamiento_pct, amb: indComparativo.amambay.vivienda.sin_saneamiento_pct, ind: indComparativo.indigena.vivienda.sin_saneamiento_pct },
                  { servicio: 'Hacinamiento', con: indComparativo.concepcion.vivienda.hacinamiento_pct, amb: indComparativo.amambay.vivienda.hacinamiento_pct, ind: indComparativo.indigena.vivienda.hacinamiento_pct },
                ]}
                margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
              >
                <XAxis dataKey="servicio" tick={{ fontSize: 11 }} />
                <YAxis unit="%" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => ['Sin: ' + pct(v)]} />
                <Legend />
                <Bar dataKey="con" name="Concepción" fill="#059669" />
                <Bar dataKey="amb" name="Amambay" fill="#2563eb" />
                <Bar dataKey="ind" name="Indígena (nacional)" fill="#d97706" />
              </BarChart>
            </ResponsiveContainer>
            <p className="source-note"><strong>Fuente:</strong> {comparativeSource}.</p>
          </div>
        </div>
      )}

      {tab === 'genero' && (
        <div>
          <div className="kpi-grid">
            <KPICard label="Jefatura femenina de hogar" value={pct(ind.genero.jefatura_femenina_pct)} source={socialSource} color="var(--violet-600)" icon={<Users size={18}/>} />
            <KPICard label="TGF (hijos por mujer)" value={ind.genero.tgf.toFixed(2)} source={socialSource} color="var(--red-600)" />
            <KPICard label="Mujeres sin hijos (12–49)" value={pct(ind.genero.mujeres_sin_hijos_12a49_pct)} source={socialSource} color="var(--cyan-600)" />
          </div>
          <div className="chart-card">
            <h4 className="chart-title">Evolución TGF — Concepción, Amambay y Paraguay</h4>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={SERIES_HISTORICAS.tgf} margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                <XAxis dataKey="anio" tick={{ fontSize: 11 }} />
                <YAxis domain={[2, 5]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => v.toFixed(2) + ' hijos/mujer'} />
                <Legend />
                <ReferenceLine y={2.1} stroke="#dc2626" strokeDasharray="6 3" label={{ value:'Reemplazo (2.1)', fontSize:10, fill:'#dc2626', position:'right' }} />
                <Line type="monotone" dataKey="concepcion" name="Concepción" stroke="#059669" strokeWidth={2} />
                <Line type="monotone" dataKey="amambay" name="Amambay" stroke="#2563eb" strokeWidth={2} />
                <Line type="monotone" dataKey="paraguay" name="Paraguay" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
            <p className="source-note"><strong>Fuente:</strong> {historicalSource}.</p>
          </div>
        </div>
      )}

      <div className="fuentes-card">
        <strong>Fuentes:</strong> INE. IV Censo Nacional de Población y Viviendas para Pueblos Indígenas 2022.
        DGEEC. Encuesta Permanente de Hogares Continua 2016–2017 (indicadores indígenas).
        INE. Encuesta Permanente de Hogares 2022 (indicadores totales, estimación departamental).
        Indicadores de población total son estimaciones basadas en EPH con ajuste departamental.
      </div>
    </div>
  );
}
