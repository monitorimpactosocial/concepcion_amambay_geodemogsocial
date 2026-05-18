// Motor de simulación de impacto territorial PARACEL
// Modela empleo, migración e ingreso local por fase de proyecto.
// Metodología: multiplicadores de Leontief adaptados a escala departamental.

import { CENSUS } from './census2022';

export type EscenarioKey = 'conservador' | 'medio' | 'transformador';

export interface ImpactoParams {
  // Empleo
  empleoDirectoObra: number;      // pico de empleo directo en construcción
  empleoDirectoOperacion: number; // empleo directo permanente en operación
  multiplicadorIndirecto: number; // empleos indirectos por cada empleo directo
  coeficienteInducido: number;    // empleos inducidos por cada 1 000 M Gs de masa salarial local
  capturaLocal_pct: number;       // % de empleos capturados por mano de obra local (0-100)

  // Migración
  pctNoLocales: number;           // % de trabajadores de fuera de la región (0-100)
  proporcionConFamilia_pct: number; // % de no-locales que traen familia (0-100)
  tamanioHogarMigrante: number;   // personas por hogar migrante (incluyendo al trabajador)

  // Economía local
  salarioMensualGs: number;       // salario mensual promedio en Gs.
  proporcionResidenteLocal_pct: number; // % del salario gastado en la zona (0-100)
  presupuestoComprasAnualGs: number;   // Gs. anuales en compras de bienes/servicios
  pctComprasLocales: number;      // % de compras proveniente de proveedores locales (0-100)

  // Cronograma
  anioInicioObra: number;
  duracionObraAnios: number;      // años de fase constructiva
}

export interface DistritoPerfil {
  nombre: string;
  departamento: 'Concepción' | 'Amambay';
  poblacion: number;
  pobRuralPct: number;           // % rural (proxy de ruralidad / menor tensión sobre servicios urbanos)
  pesoOportunidad: number;       // peso relativo de captura de empleo (normalizado a 1 sobre total)
  pesoPresion: number;           // peso relativo de presión sobre servicios urbanos
}

export interface ImpactoDistrito {
  nombre: string;
  departamento: string;
  empleosLocalesEstimados: number;
  nuevoResidentesEstimados: number;
  hogaresAdicionalesRequeridos: number;
  presionViviendaIndice: number;  // 0-100
  presionServiciosIndice: number; // 0-100
  oportunidadLaboral: 'alta' | 'media' | 'baja';
  vulnerabilidadDesplazamiento: 'alta' | 'media' | 'baja';
}

export interface ImpactoResult {
  // Empleo global
  empleoDirectoTotal: number;
  empleoIndirecto: number;
  empleoInducido: number;
  empleoTotal: number;
  empleoLocal: number;
  empleoImportado: number;

  // Población y vivienda
  trabajadoresNoLocales: number;
  trabajadoresConFamilia: number;
  pobInducidaTotal: number;
  hogaresAdicionalesTotal: number;

  // Economía local
  masaSalarialMensualGs: number;
  masaSalarialAnualGs: number;
  ingresoLocalAnualGs: number;
  comprasLocalesAnualesGs: number;
  ingresoTotalLocalAnualGs: number;
  proveedoresLocalesEstimados: number;

  // Presión sobre servicios (índices 0-100)
  presionViviendaGlobal: number;
  presionServiciosGlobal: number;

  // Cronograma
  anioInicioObra: number;
  anioFinObra: number;
  anioOperacionPlena: number;

  // Desagregado por distrito
  distritos: ImpactoDistrito[];
}

// ─── ESCENARIOS PRESET ──────────────────────────────────────────────────────

export const ESCENARIOS_PRESET: Record<EscenarioKey, ImpactoParams> = {
  conservador: {
    empleoDirectoObra: 1200,
    empleoDirectoOperacion: 800,
    multiplicadorIndirecto: 1.8,
    coeficienteInducido: 0.12,
    capturaLocal_pct: 35,
    pctNoLocales: 65,
    proporcionConFamilia_pct: 25,
    tamanioHogarMigrante: 3.8,
    salarioMensualGs: 3_200_000,
    proporcionResidenteLocal_pct: 40,
    presupuestoComprasAnualGs: 80_000_000_000,
    pctComprasLocales: 15,
    anioInicioObra: 2026,
    duracionObraAnios: 3,
  },
  medio: {
    empleoDirectoObra: 1500,
    empleoDirectoOperacion: 1000,
    multiplicadorIndirecto: 2.5,
    coeficienteInducido: 0.22,
    capturaLocal_pct: 55,
    pctNoLocales: 45,
    proporcionConFamilia_pct: 35,
    tamanioHogarMigrante: 3.5,
    salarioMensualGs: 3_800_000,
    proporcionResidenteLocal_pct: 55,
    presupuestoComprasAnualGs: 100_000_000_000,
    pctComprasLocales: 30,
    anioInicioObra: 2026,
    duracionObraAnios: 3,
  },
  transformador: {
    empleoDirectoObra: 1800,
    empleoDirectoOperacion: 1200,
    multiplicadorIndirecto: 3.5,
    coeficienteInducido: 0.38,
    capturaLocal_pct: 75,
    pctNoLocales: 25,
    proporcionConFamilia_pct: 50,
    tamanioHogarMigrante: 3.2,
    salarioMensualGs: 4_500_000,
    proporcionResidenteLocal_pct: 70,
    presupuestoComprasAnualGs: 120_000_000_000,
    pctComprasLocales: 50,
    anioInicioObra: 2026,
    duracionObraAnios: 3,
  },
};

// ─── PERFILES DISTRITALES ───────────────────────────────────────────────────
// Pesos de oportunidad laboral: distribución poblacional de PEA (15-64) estimada.
// Pesos de presión: población urbana relativa (más urbano = mayor impacto en servicios).

function buildDistritoPerfiles(): DistritoPerfil[] {
  const perfiles: DistritoPerfil[] = [];

  for (const [deptKey, dept] of Object.entries(CENSUS)) {
    const deptNombre = dept.nombre as 'Concepción' | 'Amambay';
    for (const d of dept.distritos) {
      const pesoOportunidad = d.poblacion * (1 - d.pob_rural_pct / 100) * 0.6
        + d.poblacion * (d.pob_rural_pct / 100) * 0.4;
      const pesoPresion = d.poblacion * (1 - d.pob_rural_pct / 100);
      perfiles.push({
        nombre: d.nombre,
        departamento: deptNombre,
        poblacion: d.poblacion,
        pobRuralPct: d.pob_rural_pct,
        pesoOportunidad,
        pesoPresion,
      });
    }
    void deptKey;
  }

  // Normalizar pesos
  const totalOp = perfiles.reduce((s, p) => s + p.pesoOportunidad, 0);
  const totalPr = perfiles.reduce((s, p) => s + p.pesoPresion, 0);
  for (const p of perfiles) {
    p.pesoOportunidad = p.pesoOportunidad / totalOp;
    p.pesoPresion = p.pesoPresion / Math.max(1, totalPr);
  }

  return perfiles;
}

const DISTRITOS_PERFILES = buildDistritoPerfiles();

// ─── MOTOR PRINCIPAL ─────────────────────────────────────────────────────────

export function computeImpacto(params: ImpactoParams): ImpactoResult {
  const {
    empleoDirectoOperacion,
    multiplicadorIndirecto,
    coeficienteInducido,
    capturaLocal_pct,
    pctNoLocales,
    proporcionConFamilia_pct,
    tamanioHogarMigrante,
    salarioMensualGs,
    proporcionResidenteLocal_pct,
    presupuestoComprasAnualGs,
    pctComprasLocales,
    anioInicioObra,
    duracionObraAnios,
  } = params;

  // Empleo en fase de operación plena (más relevante para impacto estructural)
  const empDir = empleoDirectoOperacion;
  const empInd = Math.round(empDir * multiplicadorIndirecto);

  // Masa salarial local (solo empleos capturados localmente)
  const empLocal = Math.round(empDir * (capturaLocal_pct / 100));
  const masaSalarialMensual = empDir * salarioMensualGs;
  const masaSalarialAnual = masaSalarialMensual * 12;
  const masaSalarialLocalAnual = masaSalarialAnual * (proporcionResidenteLocal_pct / 100);

  // Empleos inducidos (basados en Gs. por cada 1 000 M de masa salarial local)
  const empInducido = Math.round((masaSalarialLocalAnual / 1_000_000_000) * coeficienteInducido);

  const empTotal = empDir + empInd + empInducido;
  const empImportado = empDir - empLocal;

  // Migración
  const trabajadoresNoLocales = Math.round(empDir * (pctNoLocales / 100));
  const trabajadoresConFamilia = Math.round(trabajadoresNoLocales * (proporcionConFamilia_pct / 100));
  const trabajadoresSinFamilia = trabajadoresNoLocales - trabajadoresConFamilia;
  // Hogar migrante: el trabajador + resto de familia
  const pobInducida = Math.round(
    trabajadoresConFamilia * tamanioHogarMigrante + trabajadoresSinFamilia
  );
  const hogaresAdicionales = Math.round(
    trabajadoresConFamilia + Math.ceil(trabajadoresSinFamilia / 2.5)
  );

  // Economía local
  const comprasLocalesAnuales = Math.round(presupuestoComprasAnualGs * (pctComprasLocales / 100));
  const ingresoLocalAnual = Math.round(
    masaSalarialLocalAnual + comprasLocalesAnuales
  );
  // Proveedor local estimado: 1 empresa por cada ~8 M Gs. anuales de compras locales
  const proveedoresLocales = Math.round(comprasLocalesAnuales / 8_000_000);

  // Cronograma
  const anioFinObra = anioInicioObra + duracionObraAnios;
  const anioOperacionPlena = anioFinObra + 1;

  // Presión global (escala 0-100 relativa a la población base de los dos departamentos)
  const pobBase = CENSUS.concepcion.poblacion_total + CENSUS.amambay.poblacion_total;
  const presionViviendaGlobal = Math.min(100, Math.round((hogaresAdicionales / (pobBase / 3.5)) * 100 * 5));
  const presionServiciosGlobal = Math.min(100, Math.round((pobInducida / pobBase) * 100 * 8));

  // Desagregado por distrito
  const distritos: ImpactoDistrito[] = DISTRITOS_PERFILES.map((perfil) => {
    const empLocalesDistrito = Math.round(empLocal * perfil.pesoOportunidad);
    const residentesDistrito = Math.round(pobInducida * perfil.pesoPresion);
    const hogaresDistrito = Math.round(hogaresAdicionales * perfil.pesoPresion);

    // Índices de presión por distrito (0-100)
    const capHogaresDistrito = perfil.poblacion / 3.5;
    const presViv = Math.min(100, Math.round((hogaresDistrito / Math.max(1, capHogaresDistrito)) * 100 * 8));
    const presServ = Math.min(100, Math.round((residentesDistrito / Math.max(1, perfil.poblacion)) * 100 * 10));

    const relEmpPob = empLocalesDistrito / Math.max(1, perfil.poblacion) * 100;
    const oportunidadLaboral: ImpactoDistrito['oportunidadLaboral'] =
      relEmpPob > 1.5 ? 'alta' : relEmpPob > 0.6 ? 'media' : 'baja';

    const vulnerabilidadDesplazamiento: ImpactoDistrito['vulnerabilidadDesplazamiento'] =
      presViv > 40 ? 'alta' : presViv > 20 ? 'media' : 'baja';

    return {
      nombre: perfil.nombre,
      departamento: perfil.departamento,
      empleosLocalesEstimados: empLocalesDistrito,
      nuevoResidentesEstimados: residentesDistrito,
      hogaresAdicionalesRequeridos: hogaresDistrito,
      presionViviendaIndice: presViv,
      presionServiciosIndice: presServ,
      oportunidadLaboral,
      vulnerabilidadDesplazamiento,
    };
  });

  return {
    empleoDirectoTotal: empleoDirectoOperacion,
    empleoIndirecto: empInd,
    empleoInducido: empInducido,
    empleoTotal: empTotal,
    empleoLocal: empLocal,
    empleoImportado: empImportado,
    trabajadoresNoLocales,
    trabajadoresConFamilia,
    pobInducidaTotal: pobInducida,
    hogaresAdicionalesTotal: hogaresAdicionales,
    masaSalarialMensualGs: masaSalarialMensual,
    masaSalarialAnualGs: masaSalarialAnual,
    ingresoLocalAnualGs: masaSalarialLocalAnual,
    comprasLocalesAnualesGs: comprasLocalesAnuales,
    ingresoTotalLocalAnualGs: ingresoLocalAnual,
    proveedoresLocalesEstimados: proveedoresLocales,
    presionViviendaGlobal,
    presionServiciosGlobal,
    anioInicioObra,
    anioFinObra,
    anioOperacionPlena,
    distritos,
  };
}
