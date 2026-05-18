# Bitacora operativa

## 2026-05-18 - Filtros globales, series historicas-actuales-proyectadas e hitos PARACEL

### Pedido atendido

- Se implemento un bloque superior de filtros globales para que el alcance territorial, distrito, escenario demografico, escenario de impacto y horizonte se apliquen de forma transversal.
- Se agrego lectura explicita de series con tres tramos: historia disponible, punto actual/base y proyeccion.
- Se marcaron hitos PARACEL en las series para separar impactos observados de impactos esperados.

### Implementacion

- `src/components/GlobalFilterBar.tsx`: nuevo componente fijo bajo el navbar con filtros globales de departamento, distrito, escenario demografico, escenario PARACEL, horizonte y reset.
- `src/types.ts`: nuevos tipos `ProjectionScenarioKey`, `ImpactScenarioKey` y `GlobalFilters`.
- `src/utils/analysis.ts`: helpers compartidos para convertir filtros en alcance territorial, agregar Censo/proyecciones, calcular valores historicos ponderados y reutilizar hitos PARACEL.
- `src/App.tsx`: estado global persistido en `localStorage`, exportacion de configuracion enriquecida y paso de filtros a demografia, proyecciones, social, impacto y reporte.
- `src/views/DemographyView.tsx`: KPIs, piramides, distritos y pueblos indigenas responden al alcance global; cuando hay distrito seleccionado se muestra el recorte disponible.
- `src/views/SocialView.tsx`: indicadores sociales responden al alcance global mediante promedio ponderado cuando se seleccionan ambos departamentos.
- `src/views/ProjectionsView.tsx`: se reconstruyo la vista para mostrar serie integrada historica/actual/proyectada, comparativa de escenarios y marcas verticales de hitos PARACEL.
- `src/views/ImpactoView.tsx`: el escenario y horizonte global alimentan el modelo; se agrego serie observado vs esperado y se filtra el ranking distrital.
- `src/views/ReporteView.tsx`: el PDF imprimible usa el alcance, escenario demografico, escenario de impacto y horizonte seleccionados globalmente.
- `src/index.css`: estilos del filtro global, ajuste de offsets del mapa/vistas/sidebar/loading y soporte responsive horizontal.

### Verificacion local

- `npm run check`: exitoso.
- `npm run typecheck`: exitoso dentro del check.
- `npm run build`: exitoso dentro del check.
- Vista previa local: `http://127.0.0.1:4175/concepcion_amambay_geodemogsocial/` responde `HTTP 200`.
- Bundle local verificado con cadenas clave:
  - `Filtros globales`.
  - `Serie PARACEL`.
  - `Serie integrada`.
  - `Actual 2022`.
  - `Operacion plena estimada`.

### Cierre operativo

- Commit funcional publicado: `09e65c8` - `feat: agregar filtros globales e hitos paracel`.
- Push a `origin/main`: exitoso; remoto en `09e65c8289de59a587048aa808aaf6a6ad4939bc`.
- Workflow `Deploy to GitHub Pages`: `success` (run `26048782280`).
- Workflow `pages build and deployment` sobre `gh-pages`: `success` (run `26048910897`, commit `65d3aed`).
- App publicada verificada en `https://monitorimpactosocial.github.io/concepcion_amambay_geodemogsocial/`.
- Asset publicado nuevo: `assets/index-CY4MS425.js` (`HTTP 200`, 937.956 bytes).
- Bundle publicado contiene:
  - `Filtros globales`.
  - `Serie PARACEL`.
  - `Serie integrada`.
  - `Actual 2022`.
  - `Operacion plena estimada`.
- Archivos sincronizados al repo operativo de Drive: `G:\Mi unidad\CONCEPCION_AMAMBAY_GEODEMOGSOCIAL\concepcion_amambay_geodemogsocial`.

## 2026-05-18 - Cierre de publicacion Impacto PARACEL v2 y Reporte PDF

### Commit y push

- Commit funcional publicado: `841ba26` - `feat: expandir impacto paracel y reporte socioeconomico`.
- Push a `origin/main`: exitoso, remoto en `841ba2687341affc0df7803f8cc64d5e90942a6c`.
- Archivos sincronizados tambien a Drive: `G:\Mi unidad\CONCEPCION_AMAMBAY_GEODEMOGSOCIAL\concepcion_amambay_geodemogsocial`.

### Workflows

- `Deploy to GitHub Pages` para `841ba26`: `success` (run `26042134401`).
- `pages build and deployment` en `gh-pages`: `success` (run `26042248127`, commit `f4bf9e7`).

### Verificacion viva publicada

- URL verificada: `https://monitorimpactosocial.github.io/concepcion_amambay_geodemogsocial/`.
- HTML publicado responde `HTTP 200`.
- Asset JS publicado: `assets/index-6sRP1h89.js` (`HTTP 200`, 924.117 bytes).
- El bundle publicado contiene:
  - `Reporte PDF`.
  - `Pulso economico y social 2025-2026`.
  - `Sensores 2025-2026`.
  - `Indicadores 2025-2026 priorizados`.
  - `Imprimir / PDF`.
  - `Impacto territorial PARACEL`.
- Recursos criticos publicados siguen siendo archivos reales, no punteros LFS:
  - `concepcion_amambay_hogares.geojson`: `HTTP 200`, 3.006.718 bytes, `lfs=False`.
  - `concepcion_amambay_rutas.geojson`: `HTTP 200`, 579.895 bytes, `lfs=False`.
  - `data/marco_muestral_viviendas.json`: `HTTP 200`, 1.232.821 bytes, `lfs=False`.

### Estado final de esta fase

- La app publicada ya incluye el nuevo panel Impacto PARACEL v2, la pestana `Reporte PDF`, los sensores 2025-2026 y la salida de impresion/PDF.
- Pendiente recomendado: obtener fichas/URLs completas de la matriz 2025-2026 para reemplazar fuentes declaradas por enlaces verificables en cada indicador.

## 2026-05-18 - Impacto PARACEL v2, reporte PDF y calibracion con fuentes publicas

### Pedido atendido

- Se profundizo la version que estima niveles de impacto de PARACEL en su area de influencia.
- Objetivo funcional: agregar mas KPIs, tablas y figuras para entender la situacion antes, durante y despues de PARACEL.
- Se incorporo ademas una vista imprimible de reporte socioeconomico completo para PDF, porque seguia pendiente desde la auditoria anterior.

### Fuentes publicas verificadas

- Paracel web institucional: 1.800.000 t/anio de produccion anual de celulosa, USD 2,9 mil millones de inversion industrial, 220 MW, 203.515 ha propias, 82.471 ha plantadas y 1.040 empleos directos reportados.
- BID Invest, nota del 10/03/2026: financiamiento de hasta USD 165 millones y expectativa de alrededor de 7.000 empleos directos e indirectos.
- Agencia IP, nota del 09/04/2025: 6.000.000 m3 de movimiento de suelo, inversion total estimada de USD 4.000 millones, 1.800 empleos directos de obra, 7.200 empleos totales y alojamiento C9 para mas de 2.000 personas.

### Cambios funcionales

- `src/views/ImpactoView.tsx`: redisenio completo del modulo de impacto con lectura ejecutiva, magnitudes publicas, linea base social, fases antes/durante/operacion/consolidacion, 8 KPIs estrategicos, 4 figuras, matriz de brechas y ranking distrital inteligente.
- `src/data/impactoEngine.ts`: escenarios recalibrados para que el escenario medio use 1.040 empleos directos de operacion, 1.800 empleos directos de obra y multiplicadores compatibles con la referencia publica de 7.000 empleos directos/indirectos.
- `src/views/ReporteView.tsx`: nueva pestana `Reporte PDF` con reporte socioeconomico integral imprimible: historico, situacion actual, proyecciones 2022-2052 e impacto PARACEL.
- `src/components/NavBar.tsx`, `src/App.tsx`, `src/types.ts`: integracion de la nueva vista `Reporte PDF`.
- `src/views/MetodologiaView.tsx`: se agrego la tabla de magnitudes publicas usadas para calibrar Impacto PARACEL v2 y se corrigio la formula/documentacion del empleo inducido.
- `src/index.css`: estilos de reporte, panel de impacto y reglas de impresion para que la SPA pueda generar PDF completo sin cortar el contenido por el alto del viewport.

### Nuevos elementos analiticos agregados

- KPIs de escala: produccion anual, energia, inversion industrial, tierras propias, superficie plantada, empleos directos actuales, empleos esperados, alojamiento y avance fisico de obra.
- KPIs socioeconomicos: poblacion base, ruralidad, poblacion indigena, pobreza, sin seguro medico, sin agua potable, empleo total, captura local, ingreso local, brecha de proveedores, cupos de formacion y demanda habitacional.
- Figuras: evolucion antes/durante/despues, radar de tensiones, evolucion temporal del impacto y encadenamiento de valor por compras/proveedores.
- Tablas: matriz de brechas de gestion, ranking distrital inteligente, situacion actual por departamento, proyeccion social-demografica y agenda de gestion por fase.
- Salida PDF: botones `Imprimir / PDF` en Impacto PARACEL y en Reporte PDF.

### Verificaciones ejecutadas

- `npm run check`: exitoso.
- `npm run typecheck`: exitoso dentro del check.
- `npm run build`: exitoso dentro del check.
- Vista previa local: `npm run preview -- --host 127.0.0.1 --port 4174` responde `HTTP 200` en `http://127.0.0.1:4174/concepcion_amambay_geodemogsocial/`.
- Validacion de bundle local: contiene `Reporte PDF`, `Situacion socioeconomica`, `Imprimir / PDF`, `Magnitudes publicas` e `Intervencion prioritaria`.

### Pendiente operativo inmediato

- Commit y push desde el clon limpio.
- Esperar el workflow de GitHub Pages y verificar en vivo que la app publicada contenga `Reporte PDF`, `Imprimir / PDF` y las nuevas tablas/figuras de Impacto PARACEL.

## 2026-05-18 - Integracion de matriz 2025-2026 aportada por usuario

### Insumo recibido

- El usuario aporto una matriz de indicadores recientes 2025-2026 con codigos ECO, SAL, EDU y EMP.
- Cobertura: economia nacional y departamental, contribuyentes, construccion, inmuebles, forestacion, salud, educacion y empleo.
- Criterio aplicado: usar el insumo como capa de senales tempranas, no como texto narrativo suelto.

### Implementacion

- `src/data/contexto2025.ts`: nuevo dataset tipado con 33 indicadores, categoria, ambito, actualizacion, fuente declarada y relevancia.
- `src/data/contexto2025.ts`: nuevo `CONTEXT_SIGNAL_INDEX` con 7 dimensiones sinteticas:
  - Macro y demanda.
  - Formalizacion.
  - Construccion y suelo.
  - Forestal e industria.
  - Mercado laboral.
  - Salud y proteccion.
  - Educacion y habilidades.
- `src/views/ReporteView.tsx`: se agrego bloque de KPIs 2025-2026, grafico de oportunidades/presiones, tabla interpretativa de senales e indicadores priorizados para monitoreo.
- `src/views/ImpactoView.tsx`: se agrego grafico de sensores 2025-2026 para conectar la simulacion PARACEL con senales economicas, laborales, inmobiliarias, sanitarias y educativas recientes.

### Uso analitico logrado

- El reporte ya no depende solo de Censo 2022 y proyecciones: incorpora un pulso 2025-2026 para anticipar presiones reales.
- Las senales de construccion, inmuebles, contribuyentes, forestacion y mercado laboral ayudan a definir KPIs de monitoreo antes/durante/despues de PARACEL.
- Las senales de salud y educacion funcionan como alertas de capacidad local: cobertura de seguro baja, presion sobre red publica y brechas de habilidades tecnicas.

### Verificacion

- `npm run check`: exitoso.
- `npm run typecheck`: exitoso dentro del check.
- `npm run build`: exitoso dentro del check.
- El bundle local contiene `Pulso economico y social 2025-2026`, `Sensores 2025-2026` e `Indicadores 2025-2026 priorizados`.

## 2026-05-18 - Auditoria de situacion actual, bitacora y ultimos commits

### Contexto de la revision

- Pedido: estudiar la situacion actual del proyecto, la ultima bitacora y los ultimos commits.
- Repositorio operativo local en Drive: `G:\Mi unidad\CONCEPCION_AMAMBAY_GEODEMOGSOCIAL\concepcion_amambay_geodemogsocial`.
- Clon limpio usado para Git confiable: `C:\tmp\concepcion_amambay_geodemogsocial_fix_20260518`.
- App publicada: `https://monitorimpactosocial.github.io/concepcion_amambay_geodemogsocial/`.

### Estado Git y deploy

- El Git del repo local en Drive sigue no confiable: `git status` y `git log` fallan con `fatal: bad object HEAD`.
- El clon limpio fue actualizado con fast-forward a `origin/main`.
- Punta remota actual de `main`: `10dc0f7122ad955aed437b41ec9360035f21465d`.
- Punta remota actual de `gh-pages`: `e165ceb96e80f488978f70627ddb6cec25f41404`.
- Workflow `Deploy to GitHub Pages` para `10dc0f7`: `success`.
- Workflow `pages build and deployment` para `e165ceb`: `success`.

### Ultimos commits relevantes

- `10dc0f7` - `fix(impacto): mover cronograma y lineas de evolucion al tope del panel`.
- `371dff4` - agrega cronograma de hitos, lineas de evolucion temporal y corrige coloreado al filtrar departamento.
- `1582eaf` - mueve `ExportPanel` al `NavBar`, quita Generador de Muestra del mapa, corrige filtro Concepcion y coropleta de hogares.
- `7e11bf4` - agrega tab `Metodologia` con fuentes, metodos, formulas y supuestos.
- `49842a2` - agrega modulo de simulacion `Impacto PARACEL`.
- `189031d`, `e9c018f`, `7a71dc8` - cierre de deploy LFS/Pages y bitacora.

### Estado funcional publicado

- HTML de la app responde `HTTP 200`.
- Asset publicado actual: `assets/index-CTSoSYp9.js`.
- El bundle publicado contiene `Impacto PARACEL`, `Metodologia` y `Cronograma`.
- El bundle publicado no contiene todavia funcionalidad de `PDF`, `pdf` o `imprimir`.
- Verificacion viva de recursos chicos/criticos:
  - `concepcion_amambay_hogares.geojson`: 2.87 MB, GeoJSON real, no puntero LFS.
  - `concepcion_amambay_rutas.geojson`: 0.55 MB, GeoJSON real, no puntero LFS.
  - `data/marco_muestral_viviendas.json`: 1.18 MB, JSON real, no puntero LFS.

### Verificacion local en clon limpio

- `npm run check`: exitoso.
- `npm run typecheck`: exitoso dentro del check.
- `npm run build`: exitoso dentro del check.
- Advertencia residual: Vite reporta chunks mayores a 500 kB; no bloquea build, pero conviene optimizar luego con code-splitting.

### Lectura de situacion

- El proyecto ya no esta en el punto critico de LFS roto: la publicacion de datos web reales esta funcionando.
- La app ya incorporo el modulo `Impacto PARACEL` y la pestana `Metodologia`.
- La prioridad funcional nueva es implementar la capacidad solicitada de imprimir/generar un reporte PDF completo y detallado de la situacion socioeconomica historica, actual y proyectada de Concepcion y Amambay.
- Para trabajar con seguridad en codigo y commits, conviene seguir usando el clon limpio o reconstruir el repo local de Drive, porque el Git local sigue corrupto.

## 2026-05-18 - Vista Impacto PARACEL y tab Metodologia

### Verificaciones previas

- Deploy del 18/05 (11:58 UTC) confirmado en success; todos los GeoJSON sirven contenido real (no punteros LFS).
- `uso_de_suelo_concepcion.geojson` en Pages: 93.49 MiB (98 MB decimal), dentro del limite de 95 MiB del script.

### Implementacion Vista Impacto PARACEL

- `src/data/impactoEngine.ts`: motor Leontief departamental, 3 escenarios preset, 13 parametros, desagregado por 15 distritos.
- `src/views/ImpactoView.tsx`: selector de escenario, sliders interactivos, KPIs, graficos de barra, flujo economico, barras de presion territorial, tabla por distrito con badges de oportunidad/vulnerabilidad.
- `src/types.ts`: ViewId incluye 'impacto'.
- `src/components/NavBar.tsx`: tab 'Impacto PARACEL' (icono Factory).
- `src/App.tsx`: renderiza ImpactoView.
- `src/index.css`: estilos de layout, params-panel, kpi-grid-4, pressure-bars, distrito-table, risk-badge.
- Errores TS corregidos antes del push: import Legend no usado, empleoDirectoObra no leido, prop label vs title en KPICard, discrepancia de version App.tsx remoto/local.
- Commit: `49842a2` — Deploy Actions termino en success.

### Pendiente

- Tab Metodologia: documentacion completa de fuentes, procesos, definiciones, formulas y supuestos.

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

### Cierre verificado del segundo push

- Commit `e9c018f` fue empujado a `main`.
- Workflow `Deploy to GitHub Pages` para `e9c018f`: `success`.
- Workflow `pages build and deployment` para `gh-pages` commit `5b3f815d39aaebe4cff53b44d61a18a7030f7520`: `success`.
- Verificacion viva con cache-busting `?v=e9c018f`:
  - `concepcion_amambay_hogares.geojson`: 2.87 MB, GeoJSON real, no puntero LFS.
  - `concepcion_amambay_rutas.geojson`: 0.55 MB, GeoJSON real, no puntero LFS.
  - `locales_de_salud.geojson`: 0.77 MB, GeoJSON real, no puntero LFS.
  - `uso_de_suelo_concepcion.geojson`: 93.49 MB, GeoJSON real optimizado, no puntero LFS.
  - `uso_de_suelo_amambay.geojson`: 56.45 MB, GeoJSON real optimizado, no puntero LFS.
  - `censo_2022_indicadores.geojson`: 79.05 MB, GeoJSON real, no puntero LFS.
  - `data/marco_muestral_viviendas.json`: 1.18 MB, JSON real, no puntero LFS.
- Estado: la falla critica de publicacion de GeoJSON como punteros LFS quedo corregida y validada en produccion.
