#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

require.extensions['.ts'] = function loadTypeScript(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      skipLibCheck: true,
    },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

const { CENSUS, INDIGENAS_POR_PUEBLO, getDeptStats } = require(path.join(SRC, 'data', 'census2022.ts'));
const { SOCIAL_INDICATORS, SERIES_HISTORICAS } = require(path.join(SRC, 'data', 'socialIndicators.ts'));
const { getProjection } = require(path.join(SRC, 'data', 'projectionEngine.ts'));
const { ESCENARIOS_PRESET, computeImpacto } = require(path.join(SRC, 'data', 'impactoEngine.ts'));
const {
  LABOR_MARKET_SOURCE,
  buildLaborIncomeTimeline,
} = require(path.join(SRC, 'data', 'laborMarket.ts'));
const {
  BCP_ANEXO_ESTADISTICO_2026,
  BCP_MACRO_INDICATORS_2026,
  CONTEXT_INDICATORS_2025_2026,
  CONTEXT_PRIORITY_CODES,
  CONTEXT_SIGNAL_INDEX,
} = require(path.join(SRC, 'data', 'contexto2025.ts'));

const DEPTS = ['concepcion', 'amambay'];
const SCENARIOS = ['optimista', 'medio', 'pesimista'];
const IMPACT_SCENARIOS = ['conservador', 'medio', 'transformador'];
const SOCIAL_SCOPES = [
  ['concepcion_total', 'Concepcion total'],
  ['amambay_total', 'Amambay total'],
  ['indigenas_nacional', 'Poblacion indigena nacional'],
];
const LABOR_SCOPES = [
  ['regional', ['concepcion', 'amambay'], 'Concepcion + Amambay'],
  ['concepcion', ['concepcion'], 'Concepcion'],
  ['amambay', ['amambay'], 'Amambay'],
];

const SOCIAL_LABELS = {
  sinSeguroMedico_pct: 'Poblacion sin seguro medico',
  conIPS_pct: 'Poblacion con IPS',
  conOtroSeguro_pct: 'Poblacion con otro seguro',
  consultaMedica_pct: 'Consulta medica reciente',
  usf_presencia_pct: 'Presencia de USF',
  analfabetismo_pct: 'Analfabetismo',
  analfabetismo_hombres_pct: 'Analfabetismo hombres',
  analfabetismo_mujeres_pct: 'Analfabetismo mujeres',
  asistencia_6_17_pct: 'Asistencia escolar 6-17',
  promedio_anios_estudio: 'Promedio de anios de estudio',
  tasa_actividad_pct: 'Tasa de actividad',
  tasa_actividad_hombres_pct: 'Tasa de actividad hombres',
  tasa_actividad_mujeres_pct: 'Tasa de actividad mujeres',
  tasa_ocupacion_pct: 'Tasa de ocupacion',
  sector_primario_pct: 'Ocupacion en sector primario',
  incidencia_pobreza_pct: 'Incidencia de pobreza',
  incidencia_pobreza_extrema_pct: 'Incidencia de pobreza extrema',
  brecha_pobreza: 'Brecha de pobreza',
  severidad_pobreza: 'Severidad de pobreza',
  jefatura_femenina_pct: 'Jefatura femenina',
  tgf: 'Tasa global de fecundidad',
  mujeres_sin_hijos_12a49_pct: 'Mujeres 12-49 sin hijos',
  sin_agua_potable_pct: 'Viviendas sin agua potable',
  sin_electricidad_pct: 'Viviendas sin electricidad',
  sin_saneamiento_pct: 'Viviendas sin saneamiento',
  hacinamiento_pct: 'Hacinamiento',
};

function text(value) {
  if (typeof value !== 'string') return value;
  if (!/[\u00c3\u00c2\u00e2\u00c4]/.test(value)) return value;
  try {
    return Buffer.from(value, 'latin1').toString('utf8');
  } catch {
    return value;
  }
}

function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, clean(val)]));
  }
  return text(value);
}

function unitFor(name) {
  if (name.endsWith('_pct') || name.includes('pct') || name.includes('tasa') || name.includes('incidencia')) return '%';
  if (name.includes('Gs')) return 'Gs.';
  if (name.includes('MM')) return 'millones Gs.';
  if (name === 'tgf') return 'hijos por mujer';
  if (name.includes('anios') || name.includes('anio')) return 'anios';
  if (name.includes('poblacion') || name.includes('ocupados') || name.includes('pea') || name.includes('empleo')) return 'personas';
  return 'valor';
}

function sourceForDept(deptKey) {
  return `INE Censo 2022; base departamental ${CENSUS[deptKey].nombre}`;
}

function sheet(description, source, headers, rows, options = {}) {
  return {
    description,
    source,
    headers,
    rows: rows.map((row) => headers.map((header) => clean(row[header] ?? null))),
    category: options.category ?? '',
    period: options.period ?? '',
    unit: options.unit ?? '',
  };
}

const catalog = [];
function addCatalog(row) {
  catalog.push({
    codigo: row.codigo,
    bloque: row.bloque,
    hoja: row.hoja,
    indicador: row.indicador,
    alcance: row.alcance ?? '',
    periodo: row.periodo ?? '',
    unidad: row.unidad ?? '',
    fuente: row.fuente ?? '',
    metodo: row.metodo ?? '',
    notas: row.notas ?? '',
  });
}

function flattenSocialIndicators(scopeKey, scopeLabel, payload) {
  const rows = [];
  for (const [category, values] of Object.entries(payload)) {
    if (!values || typeof values !== 'object') continue;
    if (['poblacion', 'anio_referencia', 'fuente'].includes(category)) continue;
    for (const [metric, value] of Object.entries(values)) {
      rows.push({
        serie_id: `social.${scopeKey}.${category}.${metric}`,
        scope_key: scopeKey,
        alcance: scopeLabel,
        poblacion: payload.poblacion,
        anio: payload.anio_referencia,
        categoria: category,
        indicador: SOCIAL_LABELS[metric] ?? metric,
        variable: metric,
        valor: value,
        unidad: unitFor(metric),
        fuente: payload.fuente,
      });
      addCatalog({
        codigo: `SOC-${scopeKey}-${category}-${metric}`,
        bloque: 'Social actual',
        hoja: 'SOCIAL_ACTUAL',
        indicador: SOCIAL_LABELS[metric] ?? metric,
        alcance: scopeLabel,
        periodo: String(payload.anio_referencia),
        unidad: unitFor(metric),
        fuente: payload.fuente,
        metodo: 'Valor cargado en SOCIAL_INDICATORS',
      });
    }
  }
  return rows;
}

const censoDeptoRows = DEPTS.map((deptKey) => {
  const dept = CENSUS[deptKey];
  const stats = getDeptStats(deptKey);
  const row = {
    serie_id: `censo.departamento.${deptKey}`,
    dept_key: deptKey,
    departamento: dept.nombre,
    codigo_ine: dept.codigo_ine,
    codigo_barloc: dept.codigo_barloc,
    capital: dept.capital,
    area_km2: dept.area_km2,
    poblacion_total: dept.poblacion_total,
    varones: dept.varones,
    mujeres: dept.mujeres,
    pob_urbana: dept.pob_urbana,
    pob_rural: dept.pob_rural,
    pob_indigena: dept.pob_indigena,
    viviendas_indigenas: dept.viviendas_indigenas,
    comunidades_indigenas: dept.comunidades_indigenas,
    pct_rural: stats.pctRural,
    pct_indigena: stats.pctIndigena,
    raz_dependencia: stats.razDependencia,
    indice_envejecimiento: stats.indiceEnvejecimiento,
    fuente: 'INE Censo 2022',
  };
  for (const metric of ['poblacion_total', 'varones', 'mujeres', 'pob_urbana', 'pob_rural', 'pob_indigena', 'pct_rural', 'pct_indigena', 'raz_dependencia', 'indice_envejecimiento']) {
    addCatalog({
      codigo: `CEN-${deptKey}-${metric}`,
      bloque: 'Censo 2022',
      hoja: 'CENSO_DEPTO',
      indicador: metric,
      alcance: dept.nombre,
      periodo: '2022',
      unidad: unitFor(metric),
      fuente: 'INE Censo 2022',
      metodo: metric.startsWith('pct') || metric.includes('dependencia') || metric.includes('envejecimiento') ? 'Calculado desde piramide/departamento' : 'Dato base cargado',
    });
  }
  return row;
});

const censoDistritoRows = [];
const pyramid2022Rows = [];
const indigenasRows = [];
for (const deptKey of DEPTS) {
  const dept = CENSUS[deptKey];
  for (const district of dept.distritos) {
    censoDistritoRows.push({
      serie_id: `censo.distrito.${deptKey}.${district.nombre}`,
      dept_key: deptKey,
      departamento: dept.nombre,
      distrito: district.nombre,
      poblacion: district.poblacion,
      area_km2: district.area_km2,
      densidad_hab_km2: district.area_km2 ? district.poblacion / district.area_km2 : null,
      comunidades_indigenas: district.comunidades_indigenas,
      pob_indigena: district.pob_indigena,
      pct_indigena: district.poblacion ? district.pob_indigena / district.poblacion * 100 : null,
      pob_rural_pct: district.pob_rural_pct,
      fuente: 'INE Censo 2022',
    });
  }
  dept.piramide.forEach((age) => {
    pyramid2022Rows.push({
      serie_id: `piramide.2022.${deptKey}.${age.grupo}`,
      dept_key: deptKey,
      departamento: dept.nombre,
      anio: 2022,
      grupo_edad: age.grupo,
      varones: age.varones,
      mujeres: age.mujeres,
      total: age.varones + age.mujeres,
      fuente: sourceForDept(deptKey),
    });
  });
  INDIGENAS_POR_PUEBLO[deptKey].forEach((row) => {
    indigenasRows.push({
      serie_id: `indigena.pueblo.${deptKey}.${row.pueblo}`,
      dept_key: deptKey,
      departamento: dept.nombre,
      pueblo: row.pueblo,
      familia: row.familia,
      poblacion: row.poblacion,
      pct_pob_indigena_depto: dept.pob_indigena ? row.poblacion / dept.pob_indigena * 100 : null,
      fuente: 'INE Censo Indigena 2022',
    });
  });
}

const socialRows = SOCIAL_SCOPES.flatMap(([scopeKey, scopeLabel]) =>
  flattenSocialIndicators(scopeKey, scopeLabel, SOCIAL_INDICATORS[scopeKey]),
);

const historicalRows = [];
for (const [serie, rows] of Object.entries(SERIES_HISTORICAS)) {
  rows.forEach((row) => {
    const out = {
      serie_id: `historica.${serie}`,
      serie,
      indicador: SOCIAL_LABELS[serie] ?? serie,
      anio: row.anio,
      concepcion: row.concepcion,
      amambay: row.amambay,
      paraguay: row.paraguay,
      unidad: unitFor(serie),
      fuente: 'INE, series historicas disponibles y estimaciones cargadas',
    };
    historicalRows.push(out);
  });
  addCatalog({
    codigo: `HIST-${serie}`,
    bloque: 'Series historicas',
    hoja: 'SERIES_HIST',
    indicador: SOCIAL_LABELS[serie] ?? serie,
    alcance: 'Concepcion, Amambay, Paraguay',
    periodo: `${rows[0]?.anio ?? ''}-${rows[rows.length - 1]?.anio ?? ''}`,
    unidad: unitFor(serie),
    fuente: 'INE, series historicas disponibles',
    metodo: 'Serie cargada en SERIES_HISTORICAS',
  });
}

const projectionRows = [];
const projectionPyramidRows = [];
const projectionMetrics = ['pobTotal', 'varones', 'mujeres', 'nacimientos', 'defunciones', 'migracion', 'tgf', 'ev0h', 'ev0m', 'tasaCrecimiento', 'tasaNatalidad', 'tasaMortalidad', 'razDependencia', 'indiceEnvejecimiento'];
for (const deptKey of DEPTS) {
  const deptName = CENSUS[deptKey].nombre;
  for (const scenario of SCENARIOS) {
    const rows = getProjection(deptKey, scenario);
    rows.forEach((row) => {
      projectionRows.push({
        serie_id: `proyeccion.${deptKey}.${scenario}`,
        dept_key: deptKey,
        departamento: deptName,
        escenario: scenario,
        anio: row.anio,
        pobTotal: row.pobTotal,
        varones: row.varones,
        mujeres: row.mujeres,
        nacimientos: row.nacimientos,
        defunciones: row.defunciones,
        migracion: row.migracion,
        tgf: row.tgf,
        ev0h: row.ev0h,
        ev0m: row.ev0m,
        tasaCrecimiento: row.tasaCrecimiento,
        tasaNatalidad: row.tasaNatalidad,
        tasaMortalidad: row.tasaMortalidad,
        razDependencia: row.razDependencia,
        indiceEnvejecimiento: row.indiceEnvejecimiento,
        fuente: 'Modelo cohorte-componente con base Censo 2022',
      });
      row.piramide.forEach((age) => {
        projectionPyramidRows.push({
          serie_id: `piramide.proy.${deptKey}.${scenario}.${age.grupo}`,
          dept_key: deptKey,
          departamento: deptName,
          escenario: scenario,
          anio: row.anio,
          grupo_edad: age.grupo,
          varones: age.varones,
          mujeres: age.mujeres,
          total: age.varones + age.mujeres,
          fuente: 'Modelo cohorte-componente con base Censo 2022',
        });
      });
    });
    for (const metric of projectionMetrics) {
      addCatalog({
        codigo: `PROY-${deptKey}-${scenario}-${metric}`,
        bloque: 'Proyecciones demograficas',
        hoja: 'PROYECCIONES',
        indicador: metric,
        alcance: `${deptName} - ${scenario}`,
        periodo: '2022-2052',
        unidad: unitFor(metric),
        fuente: 'Modelo cohorte-componente con base Censo 2022',
        metodo: 'getProjection()',
      });
    }
  }
}

const laborRows = [];
const laborMetrics = ['poblacionEdadActiva', 'tasaActividadPct', 'pea', 'tasaOcupacionPct', 'ocupados', 'salarioMedioGs', 'ingresoLaboralMensualGs', 'ingresoParacelMensualGs'];
for (const [scopeId, keys, scopeLabel] of LABOR_SCOPES) {
  for (const projectionScenario of SCENARIOS) {
    for (const impactScenario of IMPACT_SCENARIOS) {
      const rows = buildLaborIncomeTimeline(keys, projectionScenario, impactScenario, 2052);
      rows.forEach((row) => {
        laborRows.push({
          serie_id: `labor.${scopeId}.${projectionScenario}.${impactScenario}`,
          scope_id: scopeId,
          alcance: scopeLabel,
          escenario_demografico: projectionScenario,
          escenario_impacto: impactScenario,
          anio: row.anio,
          etapa: row.etapa,
          poblacionEdadActiva: row.poblacionEdadActiva,
          tasaActividadPct: row.tasaActividadPct,
          pea: row.pea,
          tasaOcupacionPct: row.tasaOcupacionPct,
          ocupados: row.ocupados,
          salarioMedioGs: row.salarioMedioGs,
          ingresoLaboralMensualGs: row.ingresoLaboralMensualGs,
          ingresoParacelMensualGs: row.ingresoParacelMensualGs,
          fuente: LABOR_MARKET_SOURCE,
        });
      });
      for (const metric of laborMetrics) {
        addCatalog({
          codigo: `LAB-${scopeId}-${projectionScenario}-${impactScenario}-${metric}`,
          bloque: 'Mercado laboral e ingresos',
          hoja: 'MERCADO_LABORAL',
          indicador: metric,
          alcance: `${scopeLabel} - demografico ${projectionScenario} - impacto ${impactScenario}`,
          periodo: '2012-2052',
          unidad: unitFor(metric),
          fuente: LABOR_MARKET_SOURCE,
          metodo: 'buildLaborIncomeTimeline()',
          notas: 'Historico 2012/2017/2022 y proyeccion anual desde 2023.',
        });
      }
    }
  }
}

const impactRows = [];
const impactDistrictRows = [];
for (const scenario of IMPACT_SCENARIOS) {
  const params = ESCENARIOS_PRESET[scenario];
  const result = computeImpacto(params);
  const row = { escenario: scenario };
  for (const [key, value] of Object.entries(params)) row[`param_${key}`] = value;
  for (const [key, value] of Object.entries(result)) {
    if (key !== 'distritos') row[`resultado_${key}`] = value;
  }
  row.fuente = 'Paracel/BID Invest + simulacion propia';
  impactRows.push(row);
  for (const [key] of Object.entries(row)) {
    if (key !== 'escenario' && key !== 'fuente') {
      addCatalog({
        codigo: `IMP-${scenario}-${key}`,
        bloque: 'Impacto PARACEL',
        hoja: 'IMPACTO_ESC',
        indicador: key,
        alcance: scenario,
        periodo: `${params.anioInicioObra}-${result.anioOperacionPlena}`,
        unidad: unitFor(key),
        fuente: row.fuente,
        metodo: 'computeImpacto()',
      });
    }
  }
  result.distritos.forEach((district) => {
    impactDistrictRows.push({
      serie_id: `impacto.distrito.${scenario}.${district.departamento}.${district.nombre}`,
      escenario: scenario,
      distrito: district.nombre,
      departamento: district.departamento,
      empleosLocalesEstimados: district.empleosLocalesEstimados,
      nuevoResidentesEstimados: district.nuevoResidentesEstimados,
      hogaresAdicionalesRequeridos: district.hogaresAdicionalesRequeridos,
      presionViviendaIndice: district.presionViviendaIndice,
      presionServiciosIndice: district.presionServiciosIndice,
      oportunidadLaboral: district.oportunidadLaboral,
      vulnerabilidadDesplazamiento: district.vulnerabilidadDesplazamiento,
      fuente: 'Paracel/BID Invest + simulacion propia',
    });
  });
}

const contextRows = CONTEXT_INDICATORS_2025_2026.map((item) => {
  addCatalog({
    codigo: item.code,
    bloque: 'Matriz PARACEL 2025-2026',
    hoja: 'CONTEXTO_PARACEL',
    indicador: item.indicator,
    alcance: item.scope,
    periodo: '2025-2026',
    unidad: 'texto/valor reportado',
    fuente: item.source,
    metodo: 'Indicador cargado desde matriz PARACEL',
    notas: item.update,
  });
  return {
    ...item,
    priorizado: CONTEXT_PRIORITY_CODES.includes(item.code) ? 'si' : 'no',
  };
});

const bcpRows = BCP_MACRO_INDICATORS_2026.map((item) => {
  addCatalog({
    codigo: item.code,
    bloque: 'BCP macro',
    hoja: 'BCP_MACRO',
    indicador: item.indicator,
    alcance: 'Paraguay',
    periodo: '2025-2026',
    unidad: 'texto/valor reportado',
    fuente: item.source,
    metodo: 'Indicador macro cargado desde BCP y reportes oficiales',
    notas: item.update,
  });
  return item;
});

CONTEXT_SIGNAL_INDEX.forEach((signal) => {
  addCatalog({
    codigo: `SIG-${signal.dimension}`,
    bloque: 'Indice de senales',
    hoja: 'SENALES',
    indicador: signal.dimension,
    alcance: 'Monitor regional',
    periodo: '2025-2026',
    unidad: 'indice 0-100',
    fuente: 'Matriz PARACEL 2025-2026; calculo propio',
    metodo: 'Indice sintetico de oportunidad/presion',
    notas: signal.interpretation,
  });
});

const sheets = {
  CATALOGO: sheet(
    'Catalogo maestro de indicadores y series exportadas',
    'Compilacion propia desde modulos de datos de la app',
    ['codigo', 'bloque', 'hoja', 'indicador', 'alcance', 'periodo', 'unidad', 'fuente', 'metodo', 'notas'],
    catalog,
    { category: 'indice', period: 'varios', unit: 'metadato' },
  ),
  CENSO_DEPTO: sheet(
    'Indicadores departamentales base del Censo 2022',
    'INE Censo 2022',
    ['serie_id', 'dept_key', 'departamento', 'codigo_ine', 'codigo_barloc', 'capital', 'area_km2', 'poblacion_total', 'varones', 'mujeres', 'pob_urbana', 'pob_rural', 'pob_indigena', 'viviendas_indigenas', 'comunidades_indigenas', 'pct_rural', 'pct_indigena', 'raz_dependencia', 'indice_envejecimiento', 'fuente'],
    censoDeptoRows,
    { category: 'censo', period: '2022', unit: 'personas/%' },
  ),
  CENSO_DISTRITOS: sheet(
    'Indicadores distritales base del Censo 2022',
    'INE Censo 2022',
    ['serie_id', 'dept_key', 'departamento', 'distrito', 'poblacion', 'area_km2', 'densidad_hab_km2', 'comunidades_indigenas', 'pob_indigena', 'pct_indigena', 'pob_rural_pct', 'fuente'],
    censoDistritoRows,
    { category: 'censo', period: '2022', unit: 'personas/%' },
  ),
  PIRAMIDE_2022: sheet(
    'Piramides poblacionales 2022 por sexo y edad',
    'INE Censo 2022; estimacion interna de estructura etaria',
    ['serie_id', 'dept_key', 'departamento', 'anio', 'grupo_edad', 'varones', 'mujeres', 'total', 'fuente'],
    pyramid2022Rows,
    { category: 'demografia', period: '2022', unit: 'personas' },
  ),
  INDIGENAS_PUEBLO: sheet(
    'Poblacion indigena por pueblo y departamento',
    'INE Censo Indigena 2022',
    ['serie_id', 'dept_key', 'departamento', 'pueblo', 'familia', 'poblacion', 'pct_pob_indigena_depto', 'fuente'],
    indigenasRows,
    { category: 'poblacion indigena', period: '2022', unit: 'personas/%' },
  ),
  SOCIAL_ACTUAL: sheet(
    'Indicadores sociales actuales por ambito cargado',
    'INE/EPH/Censo Indigena segun indicador',
    ['serie_id', 'scope_key', 'alcance', 'poblacion', 'anio', 'categoria', 'indicador', 'variable', 'valor', 'unidad', 'fuente'],
    socialRows,
    { category: 'social', period: '2022', unit: 'varios' },
  ),
  SERIES_HIST: sheet(
    'Series historicas disponibles para graficos de tendencia',
    'INE, series historicas disponibles y estimaciones cargadas',
    ['serie_id', 'serie', 'indicador', 'anio', 'concepcion', 'amambay', 'paraguay', 'unidad', 'fuente'],
    historicalRows,
    { category: 'series historicas', period: '2002-2022', unit: 'varios' },
  ),
  PROYECCIONES: sheet(
    'Proyecciones demograficas anuales 2022-2052',
    'Modelo cohorte-componente con base Censo 2022',
    ['serie_id', 'dept_key', 'departamento', 'escenario', 'anio', 'pobTotal', 'varones', 'mujeres', 'nacimientos', 'defunciones', 'migracion', 'tgf', 'ev0h', 'ev0m', 'tasaCrecimiento', 'tasaNatalidad', 'tasaMortalidad', 'razDependencia', 'indiceEnvejecimiento', 'fuente'],
    projectionRows,
    { category: 'proyeccion', period: '2022-2052', unit: 'varios' },
  ),
  PIRAMIDE_PROY: sheet(
    'Piramides proyectadas por departamento, escenario y anio',
    'Modelo cohorte-componente con base Censo 2022',
    ['serie_id', 'dept_key', 'departamento', 'escenario', 'anio', 'grupo_edad', 'varones', 'mujeres', 'total', 'fuente'],
    projectionPyramidRows,
    { category: 'proyeccion', period: '2022-2052', unit: 'personas' },
  ),
  MERCADO_LABORAL: sheet(
    'PEA, ocupados, salario medio e ingreso laboral historico-actual-proyectado',
    LABOR_MARKET_SOURCE,
    ['serie_id', 'scope_id', 'alcance', 'escenario_demografico', 'escenario_impacto', 'anio', 'etapa', 'poblacionEdadActiva', 'tasaActividadPct', 'pea', 'tasaOcupacionPct', 'ocupados', 'salarioMedioGs', 'ingresoLaboralMensualGs', 'ingresoParacelMensualGs', 'fuente'],
    laborRows,
    { category: 'mercado laboral', period: '2012-2052', unit: 'personas/Gs.' },
  ),
  IMPACTO_ESC: sheet(
    'Parametros y resultados globales del motor de impacto PARACEL',
    'Paracel/BID Invest + simulacion propia',
    Object.keys(impactRows[0] ?? {}),
    impactRows,
    { category: 'impacto', period: '2026+', unit: 'varios' },
  ),
  IMPACTO_DISTRITOS: sheet(
    'Impactos PARACEL desagregados por distrito',
    'Paracel/BID Invest + simulacion propia',
    ['serie_id', 'escenario', 'distrito', 'departamento', 'empleosLocalesEstimados', 'nuevoResidentesEstimados', 'hogaresAdicionalesRequeridos', 'presionViviendaIndice', 'presionServiciosIndice', 'oportunidadLaboral', 'vulnerabilidadDesplazamiento', 'fuente'],
    impactDistrictRows,
    { category: 'impacto', period: '2026+', unit: 'personas/hogares/indice' },
  ),
  CONTEXTO_PARACEL: sheet(
    'Matriz completa de indicadores PARACEL 2025-2026 cargados en la app',
    'Reporte_Indicadores-PARACEL_editado.pdf y fuentes operativas detalladas',
    ['code', 'category', 'indicator', 'scope', 'update', 'source', 'relevance', 'priorizado'],
    contextRows,
    { category: 'contexto', period: '2025-2026', unit: 'texto/valor' },
  ),
  BCP_MACRO: sheet(
    'Indicadores macro BCP relevantes para el monitoreo',
    'BCP, Anexo Estadistico del Informe Economico y reportes oficiales',
    ['code', 'indicator', 'value', 'update', 'relevance', 'source', 'url'],
    bcpRows,
    { category: 'macro', period: '2025-2026', unit: 'texto/valor' },
  ),
  SENALES: sheet(
    'Indice sintetico de senales de oportunidad y presion',
    'Matriz PARACEL 2025-2026; calculo propio',
    ['dimension', 'score', 'opportunity', 'pressure', 'leadKpi', 'interpretation'],
    CONTEXT_SIGNAL_INDEX,
    { category: 'indice', period: '2025-2026', unit: '0-100' },
  ),
};

const payload = {
  generatedAt: new Date().toISOString(),
  app: 'Monitor de Impacto Social - Concepcion y Amambay',
  notes: [
    'Libro compilado automaticamente desde los modulos de datos de la app web.',
    'Las proyecciones e impactos son simulaciones sujetas a verificacion institucional.',
    `Referencia BCP: ${BCP_ANEXO_ESTADISTICO_2026.fileName} (${BCP_ANEXO_ESTADISTICO_2026.publishedDate}).`,
  ],
  bcpAnexo: clean(BCP_ANEXO_ESTADISTICO_2026),
  sheets: clean(sheets),
};

process.stdout.write(JSON.stringify(payload));
