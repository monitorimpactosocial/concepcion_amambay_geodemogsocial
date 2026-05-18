# Bitacora operativa

## 2026-05-18 - Estudio del repositorio y app publicada

### Alcance

- Repositorio revisado: `G:\Mi unidad\CONCEPCION_AMAMBAY_GEODEMOGSOCIAL\concepcion_amambay_geodemogsocial`.
- App publicada revisada: `https://monitorimpactosocial.github.io/concepcion_amambay_geodemogsocial/`.
- Objetivo: entender estructura, estado tecnico, flujo de publicacion y condicion real del deploy.

### Procedimiento ejecutado

- Se reviso la carpeta raiz `G:\Mi unidad\CONCEPCION_AMAMBAY_GEODEMOGSOCIAL` y se identifico que contiene varios proyectos e insumos; el repo principal de la app publicada es la subcarpeta `concepcion_amambay_geodemogsocial`.
- Se inspeccionaron archivos clave: `package.json`, `README.md`, `AUDITORIA_TECNICA.md`, `vite.config.ts`, `.gitattributes`, `.github/workflows/deploy.yml`, `src/App.tsx`, `src/components/MapViewer.tsx`, `src/components/Sidebar.tsx`, `src/components/SamplingPanel.tsx`, `src/hooks/useJsonResource.ts`, `src/utils/geo.ts`, vistas demograficas/sociales/proyecciones y pruebas.
- Se consulto el estado Git local y remoto. El remoto `origin` apunta a `https://github.com/monitorimpactosocial/concepcion_amambay_geodemogsocial.git`.
- Se verifico la app publicada con `Invoke-WebRequest`. El HTML principal responde `HTTP 200` y referencia assets versionados de JS/CSS.
- Se verificaron recursos publicados individuales en GitHub Pages, incluyendo capas GeoJSON y `data/marco_muestral_viviendas.json`.
- Se intento ejecutar `npm run check`; fallo porque la instalacion local de dependencias esta incompleta o mal materializada.
- Se intento reparar dependencias con `npm install --no-package-lock`; el proceso supero 3 minutos en Drive y se corto por timeout. No quedo disponible `node_modules/.bin/tsc.cmd` ni `node_modules/.bin/vite.cmd`.

### Hallazgos del repositorio local

- La app es React + Vite + Leaflet, con vistas principales de mapa, demografia, proyecciones, indicadores sociales y generador de muestra PPS.
- `vite.config.ts` fija `base: '/concepcion_amambay_geodemogsocial/'`, coherente con GitHub Pages.
- `src/utils/geo.ts` centraliza normalizacion de codigos, campos geograficos, conteos, bounds y rutas con `import.meta.env.BASE_URL`.
- `src/hooks/useJsonResource.ts` implementa carga JSON con cache, `AbortController` y validacion `response.ok`.
- `src/App.tsx` carga la capa base `concepcion_amambay_hogares.geojson` siempre y deja capas pesadas como opcionales.
- `src/components/MapViewer.tsx` evita renderizar puntos de viviendas por debajo de zoom 10 y aplica muestreo visual por zoom.
- `src/components/SamplingPanel.tsx` usa `data/marco_muestral_viviendas.json` para generar muestras PPS y exportar CSV.
- Hay pruebas unitarias para utilidades geograficas y motor de proyeccion en `src/__tests__`.

### Hallazgos criticos

- El repositorio Git local esta en estado inconsistente: `.git/refs/heads/main` apunta a `067446cb3af8bbe3e66bb1dfbd494ffba574d4f3`, pero `git log` y `git status` fallan con `fatal: bad object HEAD`.
- El remoto `origin/main` apunta a `48966a112c7d2fb7c4b3bd6244377ab41cbf3c07`, diferente del HEAD local roto.
- `.gitattributes` configura `*.geojson filter=lfs diff=lfs merge=lfs -text`.
- El workflow de deploy usa `actions/checkout@v4` con `lfs: false`.
- La app publicada responde, pero varias capas GeoJSON publicadas son punteros Git LFS y no archivos GeoJSON reales. Ejemplos verificados:
  - `concepcion_amambay_hogares.geojson`: 132 bytes, inicia con `version https://git-lfs.github.com/spec/v1`.
  - `concepcion_amambay_rutas.geojson`: 131 bytes, inicia con `version https://git-lfs.github.com/spec/v1`.
  - `locales_de_salud.geojson`: 131 bytes, inicia con `version https://git-lfs.github.com/spec/v1`.
  - `uso_de_suelo_concepcion.geojson`: 134 bytes, inicia con `version https://git-lfs.github.com/spec/v1`.
- En local esas capas si existen como archivos grandes reales; por ejemplo `public/concepcion_amambay_hogares.geojson` pesa aproximadamente 3 MB y `public/uso_de_suelo_concepcion.geojson` es mucho mayor. Por tanto, el problema principal observado en produccion es de publicacion/checkout LFS, no de ausencia local de datos.
- `data/marco_muestral_viviendas.json` si se publica como JSON real y pesa aproximadamente 1.23 MB.

### Estado funcional inferido de la app publicada

- El HTML principal y los assets JS/CSS cargan correctamente.
- La interfaz puede iniciar, pero la capa base obligatoria `concepcion_amambay_hogares.geojson` esta publicada como puntero LFS. Como `App.tsx` requiere esa capa para montar el mapa, la vista mapa publicada queda en riesgo alto de error de carga o pantalla de fallo de capa base.
- Las vistas no-mapa pueden cargar parcialmente porque sus datos principales estan embebidos en el bundle JS, pero el flujo cartografico y capas tematicas dependen de GeoJSON publicados correctamente.

### Pendientes recomendados

1. Reparar el Git local o trabajar desde un clon limpio, porque el HEAD actual esta corrupto y no permite auditoria Git confiable ni commit seguro.
2. Cambiar el workflow de GitHub Pages para obtener objetos LFS reales durante el build, por ejemplo `lfs: true` en `actions/checkout` o un paso explicito `git lfs pull`.
3. Volver a ejecutar el deploy y validar que los GeoJSON publicados inicien con `{ "type": "FeatureCollection" ... }` o contenido GeoJSON real, no con punteros LFS.
4. Regenerar dependencias en una ubicacion estable o limpiar `node_modules`, ya que la instalacion actual no expone `tsc` ni `vite`.
5. Una vez reparado lo anterior, correr `npm run typecheck`, `npm run build` y `npm run test`.
6. Hacer smoke test vivo de GitHub Pages: carga de mapa base, activar capas pesadas, abrir generador PPS, generar muestra, exportar CSV y navegar por demografia/proyecciones/social.

## 2026-05-18 - Correccion de deploy LFS y marco de impacto PARACEL

### Procedimiento ejecutado

- Se intento reparar el Git local con `git fetch origin main gh-pages --prune`, pero fallo por el objeto local corrupto: `fatal: bad object refs/heads/main`.
- Para evitar perder tiempo con la carpeta sincronizada y no arriesgar los datos locales, se creo un clon limpio en `C:\tmp\concepcion_amambay_geodemogsocial_fix_20260518`.
- En el clon limpio se ejecuto `git lfs pull` y se confirmo que los GeoJSON reales si estan disponibles como objetos LFS.
- Se modifico el workflow de GitHub Pages para hacer checkout con `lfs: true` y ejecutar `git lfs pull`.
- Se agrego `scripts/prepare_pages_assets.py` para preparar los assets publicados despues del build:
  - simplifica las dos capas de uso de suelo que exceden los limites practicos de GitHub Pages;
  - falla si queda algun puntero Git LFS en `dist`;
  - falla si queda algun archivo mayor a 95 MB.
- Se corrigieron dos imports no usados que impedían `tsc --strict`: `Cell` en `PopulationPyramid.tsx` y `LabelList` en `SocialView.tsx`.
- Se agrego `docs/paracel_impacto_concepcion_amambay.md` con el marco inicial para analizar impacto demografico, laboral y economico de PARACEL.

### Verificaciones

- `npm install` en el clon limpio: exitoso, con advertencia de `1 high severity vulnerability` reportada por npm audit.
- `npm run check`: exitoso despues de limpiar los imports no usados.
- `npm run build`: exitoso.
- `python scripts\prepare_pages_assets.py dist`: exitoso.
- Resultado del preparador:
  - sin punteros LFS en `dist`;
  - sin archivos por encima de 95 MB;
  - `dist/uso_de_suelo_concepcion.geojson`: 93.49 MB;
  - `dist/uso_de_suelo_amambay.geojson`: 56.45 MB;
  - `dist/censo_2022_indicadores.geojson`: 79.05 MB.

### Criterio tecnico aplicado

- No basta con publicar LFS reales sin control, porque algunas capas superan 100 MB y podrian ser rechazadas o volver demasiado pesado el deploy.
- La solucion aplicada mantiene la app con GeoJSON reales en GitHub Pages, pero publica versiones livianas de las capas mas grandes de uso de suelo.
- La fuente local y LFS conserva los datos completos; la version `dist` queda optimizada para web.

### Pendiente posterior al push

- Confirmar que el workflow de GitHub Actions termine correctamente.
- Verificar en vivo que `concepcion_amambay_hogares.geojson` y las capas principales ya no devuelvan punteros LFS.
- Hacer smoke test de la app publicada: vista mapa, filtros, capas, generador PPS y vistas analiticas.

### Seguimiento del primer push

- Commit `7a71dc8` fue empujado a `main` y el workflow `Deploy to GitHub Pages` termino en `success`.
- El branch `gh-pages` avanzo a `26a76f5f89121536690d5f480e842d8e39321a0c`.
- La verificacion viva posterior mostro que GitHub Pages seguia sirviendo punteros LFS para los GeoJSON.
- Diagnostico: la regla raiz `.gitattributes` (`*.geojson filter=lfs`) seguia aplicandose durante el commit del contenido de `dist` hacia `gh-pages`.
- Correccion adicional aplicada: `scripts/prepare_pages_assets.py` ahora escribe `dist/.gitattributes` con:
  - `*.geojson -filter -diff -merge text`
  - `*.json -filter -diff -merge text`
- Objetivo: que los archivos publicados en `gh-pages` se commiteen como archivos web reales y no como punteros LFS.
