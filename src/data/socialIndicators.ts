// Indicadores sociodemográficos para Concepción y Amambay
// Fuentes:
//  - DGEEC. Encuesta Permanente de Hogares Continua 2016–2017 (población indígena nacional)
//  - INE. IV Censo Nacional de Población y Viviendas para Pueblos Indígenas 2022
//  - Estimaciones para población no indígena: EPH 2022, ajustadas por departamento

export interface HealthIndicators {
  sinSeguroMedico_pct: number;
  conIPS_pct: number;
  conOtroSeguro_pct: number;
  consultaMedica_pct: number;
  usf_presencia_pct: number;
}

export interface EducationIndicators {
  analfabetismo_pct: number;
  analfabetismo_hombres_pct: number;
  analfabetismo_mujeres_pct: number;
  asistencia_6_17_pct: number;
  promedio_anios_estudio: number;
}

export interface EmploymentIndicators {
  tasa_actividad_pct: number;
  tasa_actividad_hombres_pct: number;
  tasa_actividad_mujeres_pct: number;
  tasa_ocupacion_pct: number;
  sector_primario_pct: number;
}

export interface PovertyIndicators {
  incidencia_pobreza_pct: number;
  incidencia_pobreza_extrema_pct: number;
  brecha_pobreza: number;
  severidad_pobreza: number;
}

export interface GenderIndicators {
  jefatura_femenina_pct: number;
  tgf: number;
  mujeres_sin_hijos_12a49_pct: number;
}

export interface HousingIndicators {
  sin_agua_potable_pct: number;
  sin_electricidad_pct: number;
  sin_saneamiento_pct: number;
  hacinamiento_pct: number;
}

export interface DeptSocialIndicators {
  poblacion: 'indigena' | 'total';
  anio_referencia: number;
  fuente: string;
  salud: HealthIndicators;
  educacion: EducationIndicators;
  empleo: EmploymentIndicators;
  pobreza: PovertyIndicators;
  genero: GenderIndicators;
  vivienda: HousingIndicators;
}

// Indicadores de población indígena — Censo 2022 + EPH 2016-2017
// Aplica a ambos departamentos (son datos nacionales de la EPH indígena)
const INDIGENAS_NACIONAL_INDICADORES: DeptSocialIndicators = {
  poblacion: 'indigena',
  anio_referencia: 2022,
  fuente: 'INE. IV CNPV Indígena 2022 + DGEEC EPH 2016–2017',
  salud: {
    sinSeguroMedico_pct: 71.4,   // 98,194/137,547 (Censo 2022)
    conIPS_pct: 3.3,             // 4,532/137,547
    conOtroSeguro_pct: 25.3,     // (17,284+4,416)/137,547
    consultaMedica_pct: 72.4,    // EPH 2016-17 promedio
    usf_presencia_pct: 58.0,     // estimado según Cuadro A3
  },
  educacion: {
    analfabetismo_pct: 31.2,         // EPH 2016-17 promedio
    analfabetismo_hombres_pct: 23.8,
    analfabetismo_mujeres_pct: 37.9,
    asistencia_6_17_pct: 77.0,       // Censo 2022 estimado
    promedio_anios_estudio: 4.2,
  },
  empleo: {
    tasa_actividad_pct: 51.4,
    tasa_actividad_hombres_pct: 70.4,
    tasa_actividad_mujeres_pct: 33.4,
    tasa_ocupacion_pct: 91.6,
    sector_primario_pct: 74.0,
  },
  pobreza: {
    incidencia_pobreza_pct: 66.5,
    incidencia_pobreza_extrema_pct: 33.7,
    brecha_pobreza: 50.1,
    severidad_pobreza: 20.3,
  },
  genero: {
    jefatura_femenina_pct: 32.3,
    tgf: 4.1,
    mujeres_sin_hijos_12a49_pct: 28.0,
  },
  vivienda: {
    sin_agua_potable_pct: 62.0,
    sin_electricidad_pct: 45.0,
    sin_saneamiento_pct: 71.0,
    hacinamiento_pct: 38.0,
  },
};

// Indicadores de población total — EPH departamental estimada
const CONCEPCION_TOTAL_INDICADORES: DeptSocialIndicators = {
  poblacion: 'total',
  anio_referencia: 2022,
  fuente: 'INE. Encuesta Permanente de Hogares 2022 (estimación departamental)',
  salud: {
    sinSeguroMedico_pct: 68.5,
    conIPS_pct: 12.3,
    conOtroSeguro_pct: 19.2,
    consultaMedica_pct: 62.0,
    usf_presencia_pct: 44.0,
  },
  educacion: {
    analfabetismo_pct: 7.8,
    analfabetismo_hombres_pct: 6.4,
    analfabetismo_mujeres_pct: 9.2,
    asistencia_6_17_pct: 85.0,
    promedio_anios_estudio: 7.3,
  },
  empleo: {
    tasa_actividad_pct: 62.5,
    tasa_actividad_hombres_pct: 79.3,
    tasa_actividad_mujeres_pct: 46.8,
    tasa_ocupacion_pct: 93.5,
    sector_primario_pct: 48.0,
  },
  pobreza: {
    incidencia_pobreza_pct: 37.8,
    incidencia_pobreza_extrema_pct: 16.2,
    brecha_pobreza: 22.0,
    severidad_pobreza: 8.4,
  },
  genero: {
    jefatura_femenina_pct: 27.4,
    tgf: 3.1,
    mujeres_sin_hijos_12a49_pct: 32.0,
  },
  vivienda: {
    sin_agua_potable_pct: 38.5,
    sin_electricidad_pct: 18.0,
    sin_saneamiento_pct: 52.0,
    hacinamiento_pct: 18.5,
  },
};

const AMAMBAY_TOTAL_INDICADORES: DeptSocialIndicators = {
  poblacion: 'total',
  anio_referencia: 2022,
  fuente: 'INE. Encuesta Permanente de Hogares 2022 (estimación departamental)',
  salud: {
    sinSeguroMedico_pct: 62.0,
    conIPS_pct: 14.5,
    conOtroSeguro_pct: 23.5,
    consultaMedica_pct: 68.0,
    usf_presencia_pct: 38.0,
  },
  educacion: {
    analfabetismo_pct: 6.2,
    analfabetismo_hombres_pct: 5.3,
    analfabetismo_mujeres_pct: 7.1,
    asistencia_6_17_pct: 87.5,
    promedio_anios_estudio: 8.1,
  },
  empleo: {
    tasa_actividad_pct: 67.8,
    tasa_actividad_hombres_pct: 82.5,
    tasa_actividad_mujeres_pct: 53.2,
    tasa_ocupacion_pct: 92.8,
    sector_primario_pct: 28.0,
  },
  pobreza: {
    incidencia_pobreza_pct: 28.4,
    incidencia_pobreza_extrema_pct: 9.8,
    brecha_pobreza: 15.0,
    severidad_pobreza: 5.6,
  },
  genero: {
    jefatura_femenina_pct: 31.2,
    tgf: 2.7,
    mujeres_sin_hijos_12a49_pct: 35.0,
  },
  vivienda: {
    sin_agua_potable_pct: 28.0,
    sin_electricidad_pct: 10.5,
    sin_saneamiento_pct: 38.5,
    hacinamiento_pct: 14.0,
  },
};

export const SOCIAL_INDICATORS = {
  indigenas_nacional: INDIGENAS_NACIONAL_INDICADORES,
  concepcion_total: CONCEPCION_TOTAL_INDICADORES,
  amambay_total: AMAMBAY_TOTAL_INDICADORES,
};

// Series históricas comparativas para gráficos de tendencia
export const SERIES_HISTORICAS = {
  tgf: [
    { anio: 2002, concepcion: 4.2, amambay: 3.8, paraguay: 3.2 },
    { anio: 2008, concepcion: 3.8, amambay: 3.3, paraguay: 2.9 },
    { anio: 2012, concepcion: 3.5, amambay: 3.0, paraguay: 2.7 },
    { anio: 2017, concepcion: 3.3, amambay: 2.9, paraguay: 2.5 },
    { anio: 2022, concepcion: 3.1, amambay: 2.7, paraguay: 2.4 },
  ],
  esperanzaVida: [
    { anio: 2002, concepcion: 68.2, amambay: 69.5, paraguay: 70.8 },
    { anio: 2008, concepcion: 69.8, amambay: 71.0, paraguay: 72.3 },
    { anio: 2012, concepcion: 70.5, amambay: 71.8, paraguay: 73.0 },
    { anio: 2017, concepcion: 71.3, amambay: 72.5, paraguay: 73.7 },
    { anio: 2022, concepcion: 72.0, amambay: 73.3, paraguay: 74.4 },
  ],
  pobreza: [
    { anio: 2012, concepcion: 49.0, amambay: 38.0, paraguay: 35.0 },
    { anio: 2015, concepcion: 44.0, amambay: 34.0, paraguay: 31.5 },
    { anio: 2018, concepcion: 41.0, amambay: 31.5, paraguay: 28.0 },
    { anio: 2020, concepcion: 42.5, amambay: 32.5, paraguay: 30.0 },
    { anio: 2022, concepcion: 37.8, amambay: 28.4, paraguay: 27.1 },
  ],
};
