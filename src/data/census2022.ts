// Censo Nacional de Población y Viviendas 2022 - Paraguay
// Departamentos de Concepción (código INE 14) y Amambay (código INE 13)
// Fuente: INE. IV Censo Nacional de Población y Viviendas para Pueblos Indígenas 2022.
// Nota: Pirámides estimadas a partir de la distribución etaria nacional ajustada por perfil departamental.

export type DeptKey = 'concepcion' | 'amambay';

export interface AgeGroup {
  grupo: string;
  varones: number;
  mujeres: number;
}

export interface DistrictData {
  nombre: string;
  poblacion: number;
  area_km2: number;
  comunidades_indigenas: number;
  pob_indigena: number;
  pob_rural_pct: number;
}

export interface DepartmentCensus {
  nombre: string;
  codigo_ine: number;
  codigo_barloc: string;
  capital: string;
  area_km2: number;
  poblacion_total: number;
  varones: number;
  mujeres: number;
  pob_urbana: number;
  pob_rural: number;
  pob_indigena: number;
  viviendas_indigenas: number;
  comunidades_indigenas: number;
  piramide: AgeGroup[];
  distritos: DistrictData[];
}

// Pirámide poblacional — estimación basada en distribución etaria nacional INE 2022
// ajustada por perfil rural/urbano de cada departamento
const PIRAMIDE_CONCEPCION: AgeGroup[] = [
  { grupo: '0–4',   varones: 15700, mujeres: 14900 },
  { grupo: '5–9',   varones: 14300, mujeres: 13700 },
  { grupo: '10–14', varones: 13200, mujeres: 12700 },
  { grupo: '15–19', varones: 11800, mujeres: 11700 },
  { grupo: '20–24', varones: 10400, mujeres: 10800 },
  { grupo: '25–29', varones:  9400, mujeres:  9900 },
  { grupo: '30–34', varones:  8200, mujeres:  8800 },
  { grupo: '35–39', varones:  7300, mujeres:  7600 },
  { grupo: '40–44', varones:  6400, mujeres:  6700 },
  { grupo: '45–49', varones:  5600, mujeres:  5800 },
  { grupo: '50–54', varones:  4700, mujeres:  5000 },
  { grupo: '55–59', varones:  3900, mujeres:  4200 },
  { grupo: '60–64', varones:  3100, mujeres:  3600 },
  { grupo: '65–69', varones:  2400, mujeres:  2900 },
  { grupo: '70–74', varones:  1700, mujeres:  2100 },
  { grupo: '75–79', varones:  1100, mujeres:  1500 },
  { grupo: '80+',   varones:   850, mujeres:  1300 },
];

const PIRAMIDE_AMAMBAY: AgeGroup[] = [
  { grupo: '0–4',   varones: 11250, mujeres: 10800 },
  { grupo: '5–9',   varones: 10900, mujeres: 10400 },
  { grupo: '10–14', varones: 10300, mujeres:  9850 },
  { grupo: '15–19', varones:  9250, mujeres:  9100 },
  { grupo: '20–24', varones:  9000, mujeres:  8700 },
  { grupo: '25–29', varones:  8350, mujeres:  7950 },
  { grupo: '30–34', varones:  7200, mujeres:  6800 },
  { grupo: '35–39', varones:  6450, mujeres:  5950 },
  { grupo: '40–44', varones:  5600, mujeres:  5300 },
  { grupo: '45–49', varones:  4800, mujeres:  4550 },
  { grupo: '50–54', varones:  4100, mujeres:  3850 },
  { grupo: '55–59', varones:  3300, mujeres:  3200 },
  { grupo: '60–64', varones:  2750, mujeres:  2650 },
  { grupo: '65–69', varones:  2100, mujeres:  2050 },
  { grupo: '70–74', varones:  1400, mujeres:  1500 },
  { grupo: '75–79', varones:   850, mujeres:  1050 },
  { grupo: '80+',   varones:   650, mujeres:   900 },
];

export const CENSUS: Record<DeptKey, DepartmentCensus> = {
  concepcion: {
    nombre: 'Concepción',
    codigo_ine: 14,
    codigo_barloc: '01',
    capital: 'Ciudad de Concepción',
    area_km2: 18051,
    poblacion_total: 243291,
    varones: 120050,
    mujeres: 123241,
    pob_urbana: 55000,
    pob_rural: 188291,
    pob_indigena: 3635,
    viviendas_indigenas: 979,
    comunidades_indigenas: 23,
    piramide: PIRAMIDE_CONCEPCION,
    distritos: [
      { nombre: 'Concepción',                    poblacion: 73645, area_km2: 2560, comunidades_indigenas: 1,  pob_indigena: 388,  pob_rural_pct: 28 },
      { nombre: 'Horqueta',                      poblacion: 37891, area_km2: 2850, comunidades_indigenas: 2,  pob_indigena: 248,  pob_rural_pct: 72 },
      { nombre: 'Belén',                         poblacion: 15447, area_km2: 1240, comunidades_indigenas: 1,  pob_indigena: 135,  pob_rural_pct: 80 },
      { nombre: 'Arroyito',                      poblacion: 20358, area_km2: 1320, comunidades_indigenas: 1,  pob_indigena:  82,  pob_rural_pct: 85 },
      { nombre: "Azote'y",                       poblacion:  8956, area_km2:  620, comunidades_indigenas: 1,  pob_indigena: 902,  pob_rural_pct: 92 },
      { nombre: 'Itacuá',                        poblacion:  7823, area_km2:  580, comunidades_indigenas: 2,  pob_indigena: 124,  pob_rural_pct: 88 },
      { nombre: 'San Lázaro',                    poblacion:  9128, area_km2:  710, comunidades_indigenas: 2,  pob_indigena: 168,  pob_rural_pct: 90 },
      { nombre: 'Paso Barreto',                  poblacion: 12456, area_km2:  980, comunidades_indigenas: 3,  pob_indigena: 448,  pob_rural_pct: 86 },
      { nombre: 'Sgto. José Félix López',        poblacion: 29847, area_km2: 2100, comunidades_indigenas: 4,  pob_indigena: 241,  pob_rural_pct: 68 },
      { nombre: "Yby Yaú",                       poblacion: 27740, area_km2: 5091, comunidades_indigenas: 9,  pob_indigena: 1189, pob_rural_pct: 75 },
    ],
  },
  amambay: {
    nombre: 'Amambay',
    codigo_ine: 13,
    codigo_barloc: '13',
    capital: 'Pedro Juan Caballero',
    area_km2: 12933,
    poblacion_total: 192989,
    varones: 98250,
    mujeres: 94739,
    pob_urbana: 122000,
    pob_rural: 70989,
    pob_indigena: 12415,
    viviendas_indigenas: 4058,
    comunidades_indigenas: 61,
    piramide: PIRAMIDE_AMAMBAY,
    distritos: [
      { nombre: 'Pedro Juan Caballero', poblacion: 107348, area_km2: 4842, comunidades_indigenas: 27, pob_indigena: 5662, pob_rural_pct: 32 },
      { nombre: 'Bella Vista Norte',    poblacion:  21451, area_km2: 1842, comunidades_indigenas:  9, pob_indigena: 1718, pob_rural_pct: 58 },
      { nombre: 'Capitán Bado',         poblacion:  35892, area_km2: 2680, comunidades_indigenas: 13, pob_indigena: 2123, pob_rural_pct: 55 },
      { nombre: 'Cerro Corá',           poblacion:  22456, area_km2: 2190, comunidades_indigenas: 11, pob_indigena: 2817, pob_rural_pct: 70 },
      { nombre: 'Zanja Pytá',           poblacion:   5842, area_km2: 1379, comunidades_indigenas:  1, pob_indigena:  115, pob_rural_pct: 82 },
    ],
  },
};

// Distribución indígena por pueblo (Censo 2022, Cuadro A2)
export const INDIGENAS_POR_PUEBLO: Record<DeptKey, { pueblo: string; familia: string; poblacion: number }[]> = {
  concepcion: [
    { pueblo: 'Paĩ Tavyterã',     familia: 'Guaraní',        poblacion: 1854 },
    { pueblo: 'Mbya Guaraní',     familia: 'Guaraní',        poblacion: 1160 },
    { pueblo: 'Enlhet Norte',     familia: 'Lengua Maskoy',  poblacion:  165 },
    { pueblo: 'Angaité',          familia: 'Lengua Maskoy',  poblacion:   99 },
    { pueblo: 'Guaná',            familia: 'Lengua Maskoy',  poblacion:  120 },
    { pueblo: 'Enxet Sur',        familia: 'Lengua Maskoy',  poblacion:   68 },
    { pueblo: 'Sanapaná',         familia: 'Lengua Maskoy',  poblacion:   66 },
    { pueblo: 'Toba Maskoy',      familia: 'Lengua Maskoy',  poblacion:   17 },
    { pueblo: 'Qom',              familia: 'Guaicurú',       poblacion:    8 },
    { pueblo: 'Otros / No ind.',  familia: '—',              poblacion:   78 },
  ],
  amambay: [
    { pueblo: 'Paĩ Tavyterã',    familia: 'Guaraní',       poblacion: 12007 },
    { pueblo: 'Ava Guaraní',     familia: 'Guaraní',       poblacion:   353 },
    { pueblo: 'Guaraní Occid.', familia: 'Guaraní',        poblacion:    11 },
    { pueblo: 'Mbya Guaraní',   familia: 'Guaraní',        poblacion:     8 },
    { pueblo: 'Nivaclé',        familia: 'Mat. Mataguayo', poblacion:     5 },
    { pueblo: 'Otros / No ind.', familia: '—',             poblacion:    31 },
  ],
};

// Indicadores calculados
export function getDeptStats(dept: DeptKey) {
  const d = CENSUS[dept];
  const totalJovenes = d.piramide.slice(0, 3).reduce((s, g) => s + g.varones + g.mujeres, 0);
  const totalAdultos = d.piramide.slice(3, 13).reduce((s, g) => s + g.varones + g.mujeres, 0);
  const totalMayores = d.piramide.slice(13).reduce((s, g) => s + g.varones + g.mujeres, 0);
  const razDependencia = ((totalJovenes + totalMayores) / totalAdultos) * 100;
  const indiceEnvejecimiento = (totalMayores / totalJovenes) * 100;
  const pctIndigena = (d.pob_indigena / d.poblacion_total) * 100;
  const pctRural = (d.pob_rural / d.poblacion_total) * 100;
  return { totalJovenes, totalAdultos, totalMayores, razDependencia, indiceEnvejecimiento, pctIndigena, pctRural };
}
