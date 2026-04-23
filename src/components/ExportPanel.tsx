import { useState } from 'react';
import { Download, FileSpreadsheet, Loader } from 'lucide-react';
import { CENSUS, INDIGENAS_POR_PUEBLO, getDeptStats, type DeptKey } from '../data/census2022';
import { SOCIAL_INDICATORS, SERIES_HISTORICAS } from '../data/socialIndicators';
import { getProjection, type ScenarioKey } from '../data/projectionEngine';

const DEPTS: DeptKey[] = ['concepcion', 'amambay'];
const SCENARIO_KEYS: ScenarioKey[] = ['optimista', 'medio', 'pesimista'];
const SCENARIO_LABELS: Record<ScenarioKey, string> = {
  optimista: 'Optimista',
  medio: 'Medio',
  pesimista: 'Pesimista',
};

// Expand quinquennial group to single ages (uniform distribution within group)
function expandEdadSimple(grupo: string, varones: number, mujeres: number) {
  let start = 0;
  let years = 5;
  if (grupo === '80+') { start = 80; years = 5; }
  else {
    const m = grupo.match(/(\d+)/);
    if (m) start = parseInt(m[1]);
  }
  const rows: { edad: number; varones: number; mujeres: number }[] = [];
  const perYearV = Math.round(varones / years);
  const perYearM = Math.round(mujeres / years);
  for (let i = 0; i < years; i++) {
    rows.push({ edad: start + i, varones: perYearV, mujeres: perYearM });
  }
  return rows;
}

async function generateExcel() {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  // ── Hoja 1: Resumen departamental ─────────────────────────────────────────
  const resumenRows: unknown[][] = [
    ['RESUMEN DEPARTAMENTAL — Censo 2022'],
    [],
    [
      'Departamento', 'Población Total', 'Varones', 'Mujeres',
      'Pob. Urbana', 'Pob. Rural', '% Rural',
      'Pob. Indígena', '% Indígena', 'Comunidades Indíg.',
      'Viviendas Indíg.', 'Superficie km²', 'Capital',
      'Razón Dependencia (%)', 'Índice Envejecimiento (%)',
    ],
  ];
  for (const dk of DEPTS) {
    const c = CENSUS[dk];
    const st = getDeptStats(dk);
    resumenRows.push([
      c.nombre, c.poblacion_total, c.varones, c.mujeres,
      c.pob_urbana, c.pob_rural, parseFloat(st.pctRural.toFixed(1)),
      c.pob_indigena, parseFloat(st.pctIndigena.toFixed(2)), c.comunidades_indigenas,
      c.viviendas_indigenas, c.area_km2, c.capital,
      parseFloat(st.razDependencia.toFixed(1)),
      parseFloat(st.indiceEnvejecimiento.toFixed(1)),
    ]);
  }
  const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows);
  wsResumen['!cols'] = Array(15).fill({ wch: 22 });
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Departamental');

  // ── Hoja 2: Distritos ─────────────────────────────────────────────────────
  const distRows: unknown[][] = [
    ['POBLACIÓN POR DISTRITO — Censo 2022'],
    [],
    ['Departamento', 'Distrito', 'Población Total', 'Área km²',
      'Comunidades Indíg.', 'Pob. Indígena', '% Indígena', '% Rural'],
  ];
  for (const dk of DEPTS) {
    const c = CENSUS[dk];
    for (const d of c.distritos) {
      distRows.push([
        c.nombre, d.nombre, d.poblacion, d.area_km2,
        d.comunidades_indigenas, d.pob_indigena,
        parseFloat(((d.pob_indigena / d.poblacion) * 100).toFixed(2)),
        d.pob_rural_pct,
      ]);
    }
  }
  const wsDistritos = XLSX.utils.aoa_to_sheet(distRows);
  wsDistritos['!cols'] = Array(8).fill({ wch: 24 });
  XLSX.utils.book_append_sheet(wb, wsDistritos, 'Distritos');

  // ── Hoja 3: Pirámide quinquenal ───────────────────────────────────────────
  const pirRows: unknown[][] = [
    ['PIRÁMIDE POBLACIONAL POR SEXO Y GRUPO ETARIO QUINQUENAL — Censo 2022'],
    [],
    ['Departamento', 'Grupo Etario', 'Varones', 'Mujeres', 'Total', '% Varones', '% Mujeres'],
  ];
  for (const dk of DEPTS) {
    const c = CENSUS[dk];
    for (const g of c.piramide) {
      const tot = g.varones + g.mujeres;
      pirRows.push([
        c.nombre, g.grupo, g.varones, g.mujeres, tot,
        parseFloat(((g.varones / tot) * 100).toFixed(1)),
        parseFloat(((g.mujeres / tot) * 100).toFixed(1)),
      ]);
    }
  }
  const wsPiramide = XLSX.utils.aoa_to_sheet(pirRows);
  wsPiramide['!cols'] = Array(7).fill({ wch: 20 });
  XLSX.utils.book_append_sheet(wb, wsPiramide, 'Pirámide Quinquenal');

  // ── Hoja 4: Edad simple ───────────────────────────────────────────────────
  const edadSimpleRows: unknown[][] = [
    ['PIRÁMIDE POBLACIONAL POR SEXO Y EDAD SIMPLE (estimación) — Censo 2022'],
    ['Nota: distribución uniforme dentro de cada grupo quinquenal (estimación).'],
    [],
    ['Departamento', 'Edad', 'Varones', 'Mujeres', 'Total', 'Razón de Masculinidad (V/M×100)'],
  ];
  for (const dk of DEPTS) {
    const c = CENSUS[dk];
    for (const g of c.piramide) {
      const expanded = expandEdadSimple(g.grupo, g.varones, g.mujeres);
      for (const row of expanded) {
        const tot = row.varones + row.mujeres;
        const razSexo = row.mujeres > 0 ? parseFloat(((row.varones / row.mujeres) * 100).toFixed(1)) : null;
        edadSimpleRows.push([c.nombre, row.edad, row.varones, row.mujeres, tot, razSexo]);
      }
    }
  }
  const wsEdadSimple = XLSX.utils.aoa_to_sheet(edadSimpleRows);
  wsEdadSimple['!cols'] = Array(6).fill({ wch: 28 });
  XLSX.utils.book_append_sheet(wb, wsEdadSimple, 'Edad Simple');

  // ── Hoja 5: Pueblos indígenas ─────────────────────────────────────────────
  const puebloRows: unknown[][] = [
    ['POBLACIÓN INDÍGENA POR PUEBLO Y FAMILIA LINGÜÍSTICA — Censo 2022'],
    [],
    ['Departamento', 'Pueblo', 'Familia Lingüística', 'Población', '% Pob. Indígena Depto.'],
  ];
  for (const dk of DEPTS) {
    const c = CENSUS[dk];
    for (const p of INDIGENAS_POR_PUEBLO[dk]) {
      puebloRows.push([
        c.nombre, p.pueblo, p.familia, p.poblacion,
        parseFloat(((p.poblacion / c.pob_indigena) * 100).toFixed(1)),
      ]);
    }
  }
  const wsPueblos = XLSX.utils.aoa_to_sheet(puebloRows);
  wsPueblos['!cols'] = Array(5).fill({ wch: 26 });
  XLSX.utils.book_append_sheet(wb, wsPueblos, 'Pueblos Indígenas');

  // ── Hojas 6–7: Proyecciones por departamento ──────────────────────────────
  for (const dk of DEPTS) {
    const c = CENSUS[dk];
    const projRows: unknown[][] = [
      [`PROYECCIONES DEMOGRÁFICAS — ${c.nombre.toUpperCase()} — 2022–2052`],
      ['Método: Cohorte-Componente (Leslie). Fuente: Estimaciones propias — Censo 2022 e INE.'],
      [],
      [
        'Escenario', 'Año', 'Población Total', 'Varones', 'Mujeres',
        'Nacimientos', 'Defunciones', 'Migración Neta',
        'TGF', 'Esp. Vida Hombres', 'Esp. Vida Mujeres',
        'Tasa Crec. (%)', 'Tasa Natalidad (‰)', 'Tasa Mortalidad (‰)',
        'Razón Dependencia (%)', 'Índice Envejecimiento (%)',
      ],
    ];
    for (const sc of SCENARIO_KEYS) {
      const projection = getProjection(dk, sc);
      for (const yr of projection) {
        projRows.push([
          SCENARIO_LABELS[sc],
          yr.anio, yr.pobTotal, yr.varones, yr.mujeres,
          yr.nacimientos, yr.defunciones, yr.migracion,
          yr.tgf, yr.ev0h, yr.ev0m,
          yr.tasaCrecimiento,   // already % (×100 done in engine)
          yr.tasaNatalidad,     // already ‰ (×1000 done in engine)
          yr.tasaMortalidad,    // already ‰
          yr.razDependencia,
          yr.indiceEnvejecimiento,
        ]);
      }
    }
    const wsProy = XLSX.utils.aoa_to_sheet(projRows);
    wsProy['!cols'] = Array(16).fill({ wch: 20 });
    XLSX.utils.book_append_sheet(wb, wsProy, `Proyecc. ${c.nombre.substring(0, 11)}`);
  }

  // ── Hojas 8–9: Pirámides proyectadas (escenario medio) ───────────────────
  for (const dk of DEPTS) {
    const c = CENSUS[dk];
    const piramideRows: unknown[][] = [
      [`PIRÁMIDE PROYECTADA — ${c.nombre.toUpperCase()} — Escenario Medio — 2022–2052`],
      [],
      ['Año', 'Grupo Etario', 'Varones', 'Mujeres', 'Total'],
    ];
    const projection = getProjection(dk, 'medio');
    for (const yr of projection) {
      for (const g of yr.piramide) {
        piramideRows.push([yr.anio, g.grupo, g.varones, g.mujeres, g.varones + g.mujeres]);
      }
    }
    const wsPirProy = XLSX.utils.aoa_to_sheet(piramideRows);
    wsPirProy['!cols'] = Array(5).fill({ wch: 18 });
    XLSX.utils.book_append_sheet(wb, wsPirProy, `Pir. ${c.nombre.substring(0, 13)}`);
  }

  // ── Hoja 10: Indicadores sociales ────────────────────────────────────────
  const ind = SOCIAL_INDICATORS;
  const socRows: unknown[][] = [
    ['INDICADORES SOCIALES COMPARATIVOS'],
    ['Fuentes: EPH 2016–2017 (DGEEC) — Censo 2022 (INE)'],
    [],
    ['Dimensión', 'Indicador', 'Indígena Nacional', 'Concepción Total', 'Amambay Total'],
    // Salud
    ['Salud', 'Sin seguro médico (%)',     ind.indigenas_nacional.salud.sinSeguroMedico_pct, ind.concepcion_total.salud.sinSeguroMedico_pct, ind.amambay_total.salud.sinSeguroMedico_pct],
    ['Salud', 'Con IPS (%)',               ind.indigenas_nacional.salud.conIPS_pct,          ind.concepcion_total.salud.conIPS_pct,          ind.amambay_total.salud.conIPS_pct],
    ['Salud', 'Con otro seguro (%)',       ind.indigenas_nacional.salud.conOtroSeguro_pct,   ind.concepcion_total.salud.conOtroSeguro_pct,   ind.amambay_total.salud.conOtroSeguro_pct],
    ['Salud', 'Consulta médica anual (%)', ind.indigenas_nacional.salud.consultaMedica_pct,  ind.concepcion_total.salud.consultaMedica_pct,  ind.amambay_total.salud.consultaMedica_pct],
    // Educación
    ['Educación', 'Analfabetismo total (%)',     ind.indigenas_nacional.educacion.analfabetismo_pct,    ind.concepcion_total.educacion.analfabetismo_pct,    ind.amambay_total.educacion.analfabetismo_pct],
    ['Educación', 'Analfabetismo hombres (%)',   ind.indigenas_nacional.educacion.analfabetismo_hombres_pct, ind.concepcion_total.educacion.analfabetismo_hombres_pct, ind.amambay_total.educacion.analfabetismo_hombres_pct],
    ['Educación', 'Analfabetismo mujeres (%)',   ind.indigenas_nacional.educacion.analfabetismo_mujeres_pct, ind.concepcion_total.educacion.analfabetismo_mujeres_pct, ind.amambay_total.educacion.analfabetismo_mujeres_pct],
    ['Educación', 'Asistencia escolar 6-17 (%)', ind.indigenas_nacional.educacion.asistencia_6_17_pct,  ind.concepcion_total.educacion.asistencia_6_17_pct,  ind.amambay_total.educacion.asistencia_6_17_pct],
    ['Educación', 'Prom. años de estudio',        ind.indigenas_nacional.educacion.promedio_anios_estudio, ind.concepcion_total.educacion.promedio_anios_estudio, ind.amambay_total.educacion.promedio_anios_estudio],
    // Empleo
    ['Empleo', 'Tasa de actividad total (%)',    ind.indigenas_nacional.empleo.tasa_actividad_pct,         ind.concepcion_total.empleo.tasa_actividad_pct,         ind.amambay_total.empleo.tasa_actividad_pct],
    ['Empleo', 'Tasa actividad hombres (%)',     ind.indigenas_nacional.empleo.tasa_actividad_hombres_pct, ind.concepcion_total.empleo.tasa_actividad_hombres_pct, ind.amambay_total.empleo.tasa_actividad_hombres_pct],
    ['Empleo', 'Tasa actividad mujeres (%)',     ind.indigenas_nacional.empleo.tasa_actividad_mujeres_pct, ind.concepcion_total.empleo.tasa_actividad_mujeres_pct, ind.amambay_total.empleo.tasa_actividad_mujeres_pct],
    ['Empleo', 'Tasa de ocupación (%)',          ind.indigenas_nacional.empleo.tasa_ocupacion_pct,         ind.concepcion_total.empleo.tasa_ocupacion_pct,         ind.amambay_total.empleo.tasa_ocupacion_pct],
    ['Empleo', 'Sector primario (%)',            ind.indigenas_nacional.empleo.sector_primario_pct,        ind.concepcion_total.empleo.sector_primario_pct,        ind.amambay_total.empleo.sector_primario_pct],
    // Pobreza
    ['Pobreza', 'Incidencia pobreza total (%)',    ind.indigenas_nacional.pobreza.incidencia_pobreza_pct,         ind.concepcion_total.pobreza.incidencia_pobreza_pct,         ind.amambay_total.pobreza.incidencia_pobreza_pct],
    ['Pobreza', 'Pobreza extrema (%)',             ind.indigenas_nacional.pobreza.incidencia_pobreza_extrema_pct, ind.concepcion_total.pobreza.incidencia_pobreza_extrema_pct, ind.amambay_total.pobreza.incidencia_pobreza_extrema_pct],
    ['Pobreza', 'Brecha de pobreza',              ind.indigenas_nacional.pobreza.brecha_pobreza,                 ind.concepcion_total.pobreza.brecha_pobreza,                 ind.amambay_total.pobreza.brecha_pobreza],
    // Vivienda
    ['Vivienda', 'Sin agua potable (%)',   ind.indigenas_nacional.vivienda.sin_agua_potable_pct, ind.concepcion_total.vivienda.sin_agua_potable_pct, ind.amambay_total.vivienda.sin_agua_potable_pct],
    ['Vivienda', 'Sin electricidad (%)',  ind.indigenas_nacional.vivienda.sin_electricidad_pct, ind.concepcion_total.vivienda.sin_electricidad_pct, ind.amambay_total.vivienda.sin_electricidad_pct],
    ['Vivienda', 'Sin saneamiento (%)',   ind.indigenas_nacional.vivienda.sin_saneamiento_pct,  ind.concepcion_total.vivienda.sin_saneamiento_pct,  ind.amambay_total.vivienda.sin_saneamiento_pct],
    ['Vivienda', 'Hacinamiento (%)',      ind.indigenas_nacional.vivienda.hacinamiento_pct,     ind.concepcion_total.vivienda.hacinamiento_pct,     ind.amambay_total.vivienda.hacinamiento_pct],
    // Género
    ['Género', 'Jefatura femenina (%)', ind.indigenas_nacional.genero.jefatura_femenina_pct, ind.concepcion_total.genero.jefatura_femenina_pct, ind.amambay_total.genero.jefatura_femenina_pct],
    ['Género', 'TGF',                   ind.indigenas_nacional.genero.tgf,                   ind.concepcion_total.genero.tgf,                   ind.amambay_total.genero.tgf],
  ];
  const wsSocial = XLSX.utils.aoa_to_sheet(socRows);
  wsSocial['!cols'] = [{ wch: 14 }, { wch: 32 }, { wch: 22 }, { wch: 22 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsSocial, 'Indicadores Sociales');

  // ── Hoja 11: Series históricas ────────────────────────────────────────────
  const seriesRows: unknown[][] = [
    ['SERIES HISTÓRICAS — Concepción y Amambay'],
    [],
    ['Indicador / Año', ...SERIES_HISTORICAS.tgf.map(r => r.anio)],
    ['TGF Concepción',  ...SERIES_HISTORICAS.tgf.map(r => r.concepcion)],
    ['TGF Amambay',     ...SERIES_HISTORICAS.tgf.map(r => r.amambay)],
    ['TGF Paraguay',    ...SERIES_HISTORICAS.tgf.map(r => r.paraguay)],
    [],
    ['Esperanza de vida (ambos sexos)'],
    ['Ev0 Concepción',  ...SERIES_HISTORICAS.esperanzaVida.map(r => r.concepcion)],
    ['Ev0 Amambay',     ...SERIES_HISTORICAS.esperanzaVida.map(r => r.amambay)],
    ['Ev0 Paraguay',    ...SERIES_HISTORICAS.esperanzaVida.map(r => r.paraguay)],
    [],
    ['Pobreza total (%)'],
    ['Pobreza Concepción', ...SERIES_HISTORICAS.pobreza.map(r => r.concepcion)],
    ['Pobreza Amambay',    ...SERIES_HISTORICAS.pobreza.map(r => r.amambay)],
    ['Pobreza Paraguay',   ...SERIES_HISTORICAS.pobreza.map(r => r.paraguay)],
  ];
  const wsSeries = XLSX.utils.aoa_to_sheet(seriesRows);
  wsSeries['!cols'] = [{ wch: 26 }, ...Array(10).fill({ wch: 12 })];
  XLSX.utils.book_append_sheet(wb, wsSeries, 'Series Históricas');

  // Descarga
  const fecha = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `concepcion_amambay_demografico_${fecha}.xlsx`);
}

export default function ExportPanel() {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      await generateExcel();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="export-panel">
      <div className="export-panel-header">
        <FileSpreadsheet size={20} />
        <span>Exportar datos a Excel</span>
      </div>
      <p className="export-panel-desc">
        Genera un libro Excel con 11 hojas: pirámides por edad simple y quinquenal,
        distritos, pueblos indígenas, proyecciones 2022–2052 (3 escenarios),
        pirámides proyectadas e indicadores sociales comparativos.
      </p>
      <button
        className="export-btn"
        onClick={handleExport}
        disabled={loading}
      >
        {loading
          ? <><Loader size={16} className="spin" /> Generando…</>
          : <><Download size={16} /> Descargar Excel (.xlsx)</>
        }
      </button>
      <p className="export-note">
        Fuentes: Censo Nacional 2022 (INE) · EPH 2016–2017 (DGEEC) ·
        Proyecciones propias — método cohorte-componente.
      </p>
    </div>
  );
}
