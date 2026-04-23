import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import type { AgeGroup } from '../../data/census2022';

interface Props {
  data: AgeGroup[];
  title?: string;
  colorH?: string;
  colorM?: string;
}

const fmt = (v: number) => Math.abs(v).toLocaleString('es-PY');

export default function PopulationPyramid({
  data,
  title,
  colorH = '#2563eb',
  colorM = '#dc2626',
}: Props) {
  // Para el gráfico de mariposa: varones negativos
  const chartData = [...data].reverse().map(g => ({
    grupo: g.grupo,
    varones: -g.varones,
    mujeres: g.mujeres,
    varAbsoluto: g.varones,
    musAbsoluto: g.mujeres,
  }));

  const maxVal = Math.max(...data.map(g => Math.max(g.varones, g.mujeres)));
  const tickStep = maxVal > 10000 ? 5000 : 2000;
  const domain = [-Math.ceil(maxVal / tickStep) * tickStep, Math.ceil(maxVal / tickStep) * tickStep];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const h = payload.find((p: any) => p.dataKey === 'varones');
    const m = payload.find((p: any) => p.dataKey === 'mujeres');
    return (
      <div className="chart-tooltip">
        <p className="tooltip-label">{label}</p>
        {h && <p style={{ color: colorH }}>Varones: {fmt(Math.abs(h.value))}</p>}
        {m && <p style={{ color: colorM }}>Mujeres: {fmt(m.value)}</p>}
      </div>
    );
  };

  const tickFmt = (v: number) => Math.abs(v / 1000).toFixed(0) + 'k';

  return (
    <div className="chart-wrapper">
      {title && <h4 className="chart-title">{title}</h4>}
      <div className="pyramid-legend">
        <span style={{ color: colorH }}>■ Varones</span>
        <span style={{ color: colorM }}>■ Mujeres</span>
      </div>
      <ResponsiveContainer width="100%" height={380}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 52, bottom: 4 }}
          barCategoryGap="12%"
        >
          <XAxis
            type="number"
            domain={domain}
            tickFormatter={tickFmt}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="grupo"
            tick={{ fontSize: 11 }}
            width={44}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine x={0} stroke="var(--border-strong)" />
          <Bar dataKey="varones" name="Varones" fill={colorH} radius={[0, 2, 2, 0]} />
          <Bar dataKey="mujeres" name="Mujeres" fill={colorM} radius={[0, 2, 2, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
