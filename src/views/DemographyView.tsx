import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LabelList,
} from 'recharts';
import { Users, Home, MapPin, TreePine } from 'lucide-react';
import PopulationPyramid from '../components/charts/PopulationPyramid';
import KPICard from '../components/charts/KPICard';
import { CENSUS, getDeptStats, INDIGENAS_POR_PUEBLO } from '../data/census2022';
import type { DeptKey } from '../data/census2022';

const fmt = (n: number) => n.toLocaleString('es-PY');
const pct = (n: number) => n.toFixed(1) + '%';

const COLORES_PIE = ['#059669','#2563eb','#d97706','#7c3aed','#dc2626','#0891b2','#4b5563','#ea580c'];

export default function DemographyView() {
  const [dept, setDept] = useState<DeptKey>('concepcion');
  const d = CENSUS[dept];
  const stats = useMemo(() => getDeptStats(dept), [dept]);
  const pueblos = INDIGENAS_POR_PUEBLO[dept];

  const distritosData = d.distritos.map(di => ({
    nombre: di.nombre.length > 16 ? di.nombre.slice(0, 14) + '…' : di.nombre,
    nombreFull: di.nombre,
    poblacion: di.poblacion,
    indigena: di.pob_indigena,
    noIndigena: di.poblacion - di.pob_indigena,
  }));

  return (
    <div className="view-container">
      {/* Selector de departamento */}
      <div className="dept-selector">
        {(['concepcion', 'amambay'] as DeptKey[]).map(k => (
          <button
            key={k}
            className={`dept-btn${dept === k ? ' active' : ''}`}
            onClick={() => setDept(k)}
          >
            {CENSUS[k].nombre}
          </button>
        ))}
      </div>

      <h2 className="view-title">
        Demografía · {d.nombre}
        <span className="view-subtitle"> — Censo 2022</span>
      </h2>

      {/* KPIs */}
      <div className="kpi-grid">
        <KPICard
          label="Población total"
          value={fmt(d.poblacion_total)}
          sub={`${fmt(d.varones)} H / ${fmt(d.mujeres)} M`}
          color="var(--emerald-600)"
          icon={<Users size={20} />}
        />
        <KPICard
          label="Población urbana"
          value={pct((d.pob_urbana / d.poblacion_total) * 100)}
          sub={`${fmt(d.pob_urbana)} personas`}
          color="var(--blue-600)"
          icon={<Home size={20} />}
        />
        <KPICard
          label="Población indígena"
          value={fmt(d.pob_indigena)}
          sub={`${pct(stats.pctIndigena)} de la población total`}
          color="var(--amber-600)"
          icon={<TreePine size={20} />}
        />
        <KPICard
          label="Comunidades indígenas"
          value={d.comunidades_indigenas}
          sub={`en ${d.distritos.length} distritos`}
          color="var(--violet-600)"
          icon={<MapPin size={20} />}
        />
        <KPICard
          label="Razón de dependencia"
          value={pct(stats.razDependencia)}
          sub="menores + adultos mayores / PEA"
          color="var(--cyan-600)"
        />
        <KPICard
          label="Índice de envejecimiento"
          value={pct(stats.indiceEnvejecimiento)}
          sub="adultos mayores / jóvenes"
          color="var(--red-600)"
        />
      </div>

      {/* Pirámide poblacional */}
      <div className="charts-grid-2">
        <div className="chart-card">
          <PopulationPyramid
            data={d.piramide}
            title={`Pirámide de población — ${d.nombre} 2022`}
            colorH="#2563eb"
            colorM="#dc2626"
          />
          <p className="chart-note">
            * Distribución estimada a partir de la estructura etaria nacional INE 2022 ajustada por perfil departamental.
          </p>
        </div>

        {/* Pirámide comparativa Concepción vs Amambay */}
        <div className="chart-card">
          <h4 className="chart-title">Estructura por grupo de edad — Comparativa</h4>
          <ResponsiveContainer width="100%" height={380}>
            <BarChart
              data={CENSUS.concepcion.piramide.map((g, i) => ({
                grupo: g.grupo,
                concepcion: g.varones + g.mujeres,
                amambay: CENSUS.amambay.piramide[i].varones + CENSUS.amambay.piramide[i].mujeres,
              }))}
              layout="vertical"
              margin={{ top: 4, right: 8, left: 44, bottom: 4 }}
              barCategoryGap="12%"
            >
              <XAxis type="number" tickFormatter={v => (v/1000).toFixed(0)+'k'} tick={{fontSize:11}} />
              <YAxis type="category" dataKey="grupo" tick={{fontSize:11}} width={42} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              <Bar dataKey="concepcion" name="Concepción" fill="#059669" radius={[0,2,2,0]} />
              <Bar dataKey="amambay" name="Amambay" fill="#2563eb" radius={[0,2,2,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Población por distrito */}
      <div className="chart-card">
        <h4 className="chart-title">Población por distrito — {d.nombre}</h4>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={distritosData} margin={{ top: 4, right: 24, left: 8, bottom: 60 }}>
            <XAxis
              dataKey="nombre"
              tick={{ fontSize: 11 }}
              interval={0}
              angle={-35}
              textAnchor="end"
            />
            <YAxis tickFormatter={v => (v/1000).toFixed(0)+'k'} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(v: number, name: string) => [fmt(v), name]}
              labelFormatter={(_: any, payload: any) => payload?.[0]?.payload?.nombreFull || ''}
            />
            <Legend />
            <Bar dataKey="noIndigena" name="No indígena" stackId="a" fill="#059669" radius={[0,0,0,0]} />
            <Bar dataKey="indigena" name="Indígena" stackId="a" fill="#d97706" radius={[2,2,0,0]}>
              <LabelList dataKey="indigena" position="top" formatter={(v: number) => v > 300 ? fmt(v) : ''} style={{fontSize:10}} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pueblos indígenas */}
      <div className="charts-grid-2">
        <div className="chart-card">
          <h4 className="chart-title">Pueblos indígenas — {d.nombre} (Censo 2022)</h4>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pueblos}
                dataKey="poblacion"
                nameKey="pueblo"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ pueblo, percent }) =>
                  percent > 0.04 ? `${pueblo} (${(percent * 100).toFixed(0)}%)` : ''
                }
                labelLine={false}
              >
                {pueblos.map((_, i) => (
                  <Cell key={i} fill={COLORES_PIE[i % COLORES_PIE.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number, name: string) => [fmt(v) + ' personas', name]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pueblo-table">
            {pueblos.map((p, i) => (
              <div key={i} className="pueblo-row">
                <span className="pueblo-dot" style={{ background: COLORES_PIE[i % COLORES_PIE.length] }} />
                <span className="pueblo-nombre">{p.pueblo}</span>
                <span className="pueblo-familia">{p.familia}</span>
                <span className="pueblo-pob">{fmt(p.poblacion)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Distribución urbano-rural */}
        <div className="chart-card">
          <h4 className="chart-title">Área de residencia — {d.nombre}</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={[
                { area: 'Urbana', poblacion: d.pob_urbana, pct: (d.pob_urbana/d.poblacion_total*100).toFixed(1) },
                { area: 'Rural', poblacion: d.pob_rural, pct: (d.pob_rural/d.poblacion_total*100).toFixed(1) },
              ]}
              margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
            >
              <XAxis dataKey="area" tick={{ fontSize: 13 }} />
              <YAxis tickFormatter={v => (v/1000).toFixed(0)+'k'} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [fmt(v) + ' personas']} />
              <Bar dataKey="poblacion" fill="#059669" radius={[6,6,0,0]}>
                <LabelList
                  dataKey="pct"
                  position="top"
                  formatter={(v: string) => v + '%'}
                  style={{ fontSize: 13, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="district-cards">
            {d.distritos.map((di, i) => (
              <div key={i} className="district-mini-card">
                <div className="district-mini-name">{di.nombre}</div>
                <div className="district-mini-stats">
                  <span>{fmt(di.poblacion)} hab.</span>
                  <span className="badge-rural">{di.pob_rural_pct}% rural</span>
                  {di.pob_indigena > 0 && (
                    <span className="badge-indigena">{fmt(di.pob_indigena)} ind.</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fuentes */}
      <div className="fuentes-card">
        <strong>Fuentes:</strong> INE. IV Censo Nacional de Población y Viviendas para Pueblos Indígenas 2022.
        INE. Censo Nacional de Población y Viviendas 2022. DGEEC. Encuesta Permanente de Hogares 2022.
        Distribución etaria departamental estimada a partir de la estructura nacional ajustada por características departamentales (INE 2022).
      </div>
    </div>
  );
}
