"""
generate_data.py — Extracción y procesamiento de datos para la app web.

Uso:
    python scripts/generate_data.py

Genera archivos JSON en public/data/ a partir de:
  - I:/Mi unidad/MAPEO_COMUNIDADES_INDIGENAS/BaseDatos_INE_Indigena.db
  - I:/Mi unidad/CONCEPCION_AMAMBAY_GEODEMOGSOCIAL/MUESTREO_CONCEPCION_AMAMBAY/
    concepcion_amambay_muestreo_repo_v3/data/processed/

Requiere:  pip install pandas openpyxl
"""

import json
import sqlite3
import csv
from pathlib import Path

# ─── Rutas ────────────────────────────────────────────────────────────────────
SQLITE_DB   = Path("I:/Mi unidad/MAPEO_COMUNIDADES_INDIGENAS/BaseDatos_INE_Indigena.db")
MUESTREO_DIR = Path("I:/Mi unidad/CONCEPCION_AMAMBAY_GEODEMOGSOCIAL"
                    "/MUESTREO_CONCEPCION_AMAMBAY"
                    "/concepcion_amambay_muestreo_repo_v3/data/processed")
OUT_DIR     = Path(__file__).parent.parent / "public" / "data"
OUT_DIR.mkdir(parents=True, exist_ok=True)


# ─── SQLite helpers ───────────────────────────────────────────────────────────

def get_table(conn: sqlite3.Connection, table: str) -> list[dict]:
    cur = conn.cursor()
    cur.execute(f'SELECT * FROM "{table}"')
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, row)) for row in cur.fetchall()]


def save_json(data: object, filename: str) -> None:
    path = OUT_DIR / filename
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  ✔ {path}")


# ─── 1. Datos del marco muestral ──────────────────────────────────────────────

def extract_marco():
    marco_csv = MUESTREO_DIR / "marco_unificado_v3.csv"
    rows = []
    with open(marco_csv, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            rows.append({
                "uid":          r["uid_marco"],
                "tipo":         r["tipo_poblacion"],
                "departamento": r["departamento"],
                "distrito":     r["distrito"],
                "area":         r["area"],
                "comunidad":    r["comunidad"],
                "pueblo":       r["pueblo"],
                "familia":      r["familia_linguistica"],
                "viviendas":    int(r["viviendas_particulares"] or 0),
                "pob_total":    int(r["poblacion_total"] or 0),
                "pob_varones":  int(r["poblacion_varones"] or 0),
                "pob_mujeres":  int(r["poblacion_mujeres"] or 0),
                "lat":          float(r["lat"]) if r["lat"] else None,
                "lon":          float(r["lon"]) if r["lon"] else None,
            })

    save_json(rows, "marco_demografico.json")


# ─── 2. Resúmenes por departamento y distrito ─────────────────────────────────

def extract_resumenes():
    for csv_file in ["resumen_departamentos.csv", "resumen_distritos.csv"]:
        src = MUESTREO_DIR / csv_file
        rows = []
        with open(src, encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
        save_json(rows, csv_file.replace(".csv", ".json"))


# ─── 3. Tablas clave del Censo 2022 (SQLite) ──────────────────────────────────

TABLAS_CENSO_2022 = {
    "pob_por_departamento":       "T_084_Cuadro_A2",
    "viviendas_por_departamento": "T_103_Cuadro_A1",
    "piramide_indigena":          "T_111_Cuadro_P1",
    "seguro_medico_2022":         "T_108_Cuadro_P5",
    "actividad_economica_2022":   "T_077_Cuadro_P13",
    "alfabetismo_2022":           "T_060_Cuadro_P7",
    "asistencia_escolar_2022":    "T_087_Cuadro_P8",
    "jefatura_hogar_2022":        "T_066_Cuadro_V7",
}

TABLAS_EPH_INDIGENA = {
    "salud_eph":     "T_001_t_2ae64Poblacion_indigena_salud_enferma_o_accidentada_por_sexo",
    "pobreza_eph":   "T_025_aaf21Poblacion_indigena_pobreza_incidencia_absoluta_y_relativa",
    "empleo_eph":    "T_019_ab813Poblacion_indigena_empleo",
    "educacion_eph": "T_029_c3f61Poblacion_indigena_educac",
    "seguro_eph":    "T_022_fe06fPoblacion_indigena_salud",
    "piramide_eph":  "T_012_t_87eccPoblacion_indigena_poblac",
    "genero_eph":    "T_032_b45fbPoblacion_indigena_genero",
}


def extract_sqlite():
    if not SQLITE_DB.exists():
        print(f"  ⚠ No encontrado: {SQLITE_DB}")
        return
    conn = sqlite3.connect(SQLITE_DB)
    all_tables = {**TABLAS_CENSO_2022, **TABLAS_EPH_INDIGENA}
    for key, table in all_tables.items():
        try:
            rows = get_table(conn, table)
            save_json(rows, f"{key}.json")
        except Exception as e:
            print(f"  ✗ {key}: {e}")
    conn.close()


# ─── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("Generando datos JSON para la app web...")
    print("\n[1/3] Marco muestral")
    extract_marco()
    print("\n[2/3] Resúmenes")
    extract_resumenes()
    print("\n[3/3] Tablas SQLite (Censo 2022 + EPH indígena)")
    extract_sqlite()
    print("\n✅ Listo. Archivos en:", OUT_DIR)
