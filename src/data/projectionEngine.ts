// Motor de Proyecciones Demográficas — Método Cohorte-Componente
// Adaptado de proypob (Paraguay nacional) para nivel departamental.
// Fuente metodológica: CELADE/CEPAL. Software RUPEX / Leslie Matrix approach.
// Parámetros calibrados con datos Censo 2022 y EPH departamental.

import type { DeptKey } from './census2022';
import { CENSUS } from './census2022';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export type ScenarioKey = 'optimista' | 'medio' | 'pesimista';

export interface ProjectionParams {
  tgfInicio: number;
  tgfFin: number;
  ev0hInicio: number;
  ev0hFin: number;
  ev0mInicio: number;
  ev0mFin: number;
  migAnualNeto: number;   // personas/año (positivo = inmigración)
}

export interface ProjectionYear {
  anio: number;
  pobTotal: number;
  varones: number;
  mujeres: number;
  nacimientos: number;
  defunciones: number;
  migracion: number;
  tgf: number;
  ev0h: number;
  ev0m: number;
  tasaCrecimiento: number;
  tasaNatalidad: number;
  tasaMortalidad: number;
  razDependencia: number;
  indiceEnvejecimiento: number;
  piramide: { grupo: string; varones: number; mujeres: number }[];
}

// ─────────────────────────────────────────────
// PARÁMETROS POR ESCENARIO Y DEPARTAMENTO
// ─────────────────────────────────────────────

const PARAMS: Record<DeptKey, Record<ScenarioKey, ProjectionParams>> = {
  concepcion: {
    optimista: {
      tgfInicio: 3.1, tgfFin: 1.9,
      ev0hInicio: 71.5, ev0hFin: 78.5,
      ev0mInicio: 75.5, ev0mFin: 82.5,
      migAnualNeto: -200,
    },
    medio: {
      tgfInicio: 3.1, tgfFin: 2.1,
      ev0hInicio: 71.5, ev0hFin: 77.0,
      ev0mInicio: 75.5, ev0mFin: 81.0,
      migAnualNeto: -450,
    },
    pesimista: {
      tgfInicio: 3.1, tgfFin: 2.4,
      ev0hInicio: 71.5, ev0hFin: 75.5,
      ev0mInicio: 75.5, ev0mFin: 79.5,
      migAnualNeto: -800,
    },
  },
  amambay: {
    optimista: {
      tgfInicio: 2.7, tgfFin: 1.8,
      ev0hInicio: 72.0, ev0hFin: 79.0,
      ev0mInicio: 76.0, ev0mFin: 83.0,
      migAnualNeto: 300,
    },
    medio: {
      tgfInicio: 2.7, tgfFin: 2.0,
      ev0hInicio: 72.0, ev0hFin: 77.5,
      ev0mInicio: 76.0, ev0mFin: 81.5,
      migAnualNeto: 100,
    },
    pesimista: {
      tgfInicio: 2.7, tgfFin: 2.3,
      ev0hInicio: 72.0, ev0hFin: 76.0,
      ev0mInicio: 76.0, ev0mFin: 80.0,
      migAnualNeto: -200,
    },
  },
};

// ─────────────────────────────────────────────
// FUNCIONES DEMOGRÁFICAS AUXILIARES
// ─────────────────────────────────────────────

const GRUPOS = ['0–4','5–9','10–14','15–19','20–24','25–29','30–34','35–39',
                '40–44','45–49','50–54','55–59','60–64','65–69','70–74','75–79','80+'];
const N_GRUPOS = 17;

// Tasas específicas de fecundidad relativas (patrón etario estándar Paraguay)
// Grupos 15-19, 20-24, 25-29, 30-34, 35-39, 40-44, 45-49
const PATRON_FECUNDIDAD_REL = [0.08, 0.22, 0.28, 0.22, 0.13, 0.05, 0.02];

// Cociente mortalidad 5qx por grupo etario según ev0 — aproximación Coale-Demeny (West)
// ev0 → probabilidad de muerte en cada grupo quinquenal (hombres)
function qxFromEv0(ev0: number, esMujer: boolean): number[] {
  // Escala lineal entre dos tablas de referencia
  const ev_min = 60, ev_max = 85;
  const t = Math.max(0, Math.min(1, (ev0 - ev_min) / (ev_max - ev_min)));

  // qx en ev0=60 (Coale-Demeny West, nivel 12-13)
  const qx_low_h = [0.120,0.018,0.010,0.020,0.025,0.032,0.048,0.072,0.110,0.165,0.240,0.340,0.450,0.560,0.660,0.760,1.000];
  const qx_low_m = [0.105,0.015,0.008,0.012,0.015,0.022,0.033,0.052,0.082,0.130,0.200,0.300,0.410,0.530,0.640,0.740,1.000];
  // qx en ev0=85 (mortalidad muy baja)
  const qx_high_h = [0.035,0.005,0.004,0.007,0.012,0.018,0.028,0.045,0.075,0.120,0.185,0.270,0.380,0.500,0.620,0.730,1.000];
  const qx_high_m = [0.028,0.004,0.003,0.005,0.008,0.012,0.020,0.033,0.058,0.097,0.158,0.240,0.348,0.470,0.590,0.710,1.000];

  const low = esMujer ? qx_low_m : qx_low_h;
  const high = esMujer ? qx_high_m : qx_high_h;
  return low.map((v, i) => v + t * (high[i] - v));
}

// Porcentaje de nacimientos masculinos
const PCT_NACIMIENTOS_H = 0.512;

// Distribución de migración por grupo etario (concentrada en edad activa)
const PATRON_MIG_H = [0.06,0.07,0.07,0.10,0.14,0.14,0.12,0.09,0.07,0.05,0.04,0.03,0.02,0.01,0.00,0.00,0.00];
const PATRON_MIG_M = [0.06,0.07,0.07,0.11,0.13,0.13,0.11,0.09,0.07,0.05,0.04,0.03,0.02,0.01,0.00,0.00,0.00];

// ─────────────────────────────────────────────
// MOTOR PRINCIPAL
// ─────────────────────────────────────────────

export function runProjection(
  dept: DeptKey,
  scenario: ScenarioKey,
  horizonte = 30,
): ProjectionYear[] {
  const params = PARAMS[dept][scenario];
  const census = CENSUS[dept];
  const baseAnio = 2022;

  // Estado inicial: vectores por grupo etario
  let h = census.piramide.map(g => g.varones);
  let m = census.piramide.map(g => g.mujeres);

  const results: ProjectionYear[] = [];

  for (let t = 0; t <= horizonte; t++) {
    const anio = baseAnio + t;
    const prog = t / horizonte; // 0..1

    // Parámetros interpolados (decline logístico para TGF, lineal para ev0)
    const tgf = params.tgfFin + (params.tgfInicio - params.tgfFin) * Math.exp(-3 * prog);
    const ev0h = params.ev0hInicio + (params.ev0hFin - params.ev0hInicio) * prog;
    const ev0m = params.ev0mInicio + (params.ev0mFin - params.ev0mInicio) * prog;

    // Tasas de mortalidad quinquenales por grupo
    const qxh = qxFromEv0(ev0h, false);
    const qxm = qxFromEv0(ev0m, true);

    // Tasas específicas de fecundidad
    const tef: number[] = new Array(N_GRUPOS).fill(0);
    // Grupos reproductivos: índices 3..9 (15-19 a 45-49)
    PATRON_FECUNDIDAD_REL.forEach((r, i) => {
      tef[3 + i] = (tgf * r) / 5; // por persona-año, grupo quinquenal
    });

    // Calcular nacimientos (aplica tasas a mujeres en edad reproductiva)
    const nacBrutos = m.reduce((s, mg, i) => s + mg * tef[i], 0);
    const nacH = Math.round(nacBrutos * PCT_NACIMIENTOS_H);
    const nacM = Math.round(nacBrutos * (1 - PCT_NACIMIENTOS_H));

    // Calcular defunciones
    const defH = h.reduce((s, hg, i) => s + hg * qxh[i], 0);
    const defM = m.reduce((s, mg, i) => s + mg * qxm[i], 0);
    const defTotal = Math.round(defH + defM);

    // Migración neta anual (distribuida por edad)
    const migH = params.migAnualNeto * 0.512;
    const migM = params.migAnualNeto * 0.488;

    const pobTotalAnio = h.reduce((s, v) => s + v, 0) + m.reduce((s, v) => s + v, 0);
    const nacBrutosTotal = nacH + nacM;
    const tasaCrecimiento = t === 0 ? 0 : ((pobTotalAnio - results[t-1].pobTotal) / results[t-1].pobTotal) * 100;

    // Indicadores de estructura
    const jovenes = [...h.slice(0,3), ...m.slice(0,3)].reduce((s,v)=>s+v,0);
    const adultos = [...h.slice(3,13), ...m.slice(3,13)].reduce((s,v)=>s+v,0);
    const mayores = [...h.slice(13), ...m.slice(13)].reduce((s,v)=>s+v,0);
    const razDep = ((jovenes + mayores) / Math.max(1, adultos)) * 100;
    const indEnv = (mayores / Math.max(1, jovenes)) * 100;

    results.push({
      anio,
      pobTotal: pobTotalAnio,
      varones: h.reduce((s,v)=>s+v,0),
      mujeres: m.reduce((s,v)=>s+v,0),
      nacimientos: nacBrutosTotal,
      defunciones: defTotal,
      migracion: params.migAnualNeto,
      tgf: +tgf.toFixed(2),
      ev0h: +ev0h.toFixed(1),
      ev0m: +ev0m.toFixed(1),
      tasaCrecimiento: +tasaCrecimiento.toFixed(2),
      tasaNatalidad: +((nacBrutosTotal / pobTotalAnio) * 1000).toFixed(1),
      tasaMortalidad: +((defTotal / pobTotalAnio) * 1000).toFixed(1),
      razDependencia: +razDep.toFixed(1),
      indiceEnvejecimiento: +indEnv.toFixed(1),
      piramide: h.map((v,i) => ({ grupo: GRUPOS[i], varones: Math.round(v), mujeres: Math.round(m[i]) })),
    });

    if (t === horizonte) break;

    // Avanzar un año: proyección quinquenal interpolada a 1 año
    // Supervivencia: cada grupo avanza (parcialmente, 1/5 de grupo quinquenal)
    const hNuevo: number[] = new Array(N_GRUPOS).fill(0);
    const mNuevo: number[] = new Array(N_GRUPOS).fill(0);

    hNuevo[0] = nacH * (1 - qxh[0] / 5);
    mNuevo[0] = nacM * (1 - qxm[0] / 5);

    for (let i = 1; i < N_GRUPOS; i++) {
      const sobrevH = 1 - qxh[i] / 5;
      const sobrevM = 1 - qxm[i] / 5;
      // 1/5 del grupo anterior sube al grupo actual cada año
      hNuevo[i] = h[i] * sobrevH * (4/5) + h[i-1] * (1 - qxh[i-1]/5) * (1/5);
      mNuevo[i] = m[i] * sobrevM * (4/5) + m[i-1] * (1 - qxm[i-1]/5) * (1/5);
    }

    // Agregar migración
    PATRON_MIG_H.forEach((p, i) => { hNuevo[i] += migH * p; });
    PATRON_MIG_M.forEach((p, i) => { mNuevo[i] += migM * p; });

    h = hNuevo.map(v => Math.max(0, v));
    m = mNuevo.map(v => Math.max(0, v));
  }

  return results;
}

// Cache de resultados para evitar recomputación
const _cache = new Map<string, ProjectionYear[]>();
export function getProjection(dept: DeptKey, scenario: ScenarioKey): ProjectionYear[] {
  const key = `${dept}:${scenario}`;
  if (!_cache.has(key)) _cache.set(key, runProjection(dept, scenario));
  return _cache.get(key)!;
}
