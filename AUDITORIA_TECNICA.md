# Auditoría técnica profunda del proyecto

## Resumen ejecutivo

Se auditó la aplicación original desde la perspectiva de estabilidad, compilación, tolerancia a fallas, mantenibilidad, portabilidad de despliegue y utilidad analítica. La versión revisada presentaba problemas críticos que podían impedir compilación, romper funciones visibles o generar resultados silenciosamente incompletos. En esta versión mejorada se corrigieron fallas estructurales y se añadió una capa operativa de monitoreo interno del estado de los recursos.

## Hallazgos críticos detectados

### 1. Falla de compilación por props faltantes
El componente `Sidebar` exigía `showVias` y `setShowVias`, pero `App.tsx` no declaraba ni enviaba dichos props. Esto podía impedir compilación TypeScript o romper la ejecución en tiempo de ejecución, según el entorno.

### 2. Variable no definida en la lógica indígena
En `MapViewer.tsx` se utilizaba `dptoContext` para buscar estadísticas en `T_012` y `T_029`, pero esa variable no estaba definida. Era una falla crítica de ejecución.

### 3. Rutas de datos rígidas y acopladas al nombre del repositorio
Las llamadas `fetch('/concepcion_amambay_geodemogsocial/...')` funcionaban solo bajo una convención específica de GitHub Pages. Esto reducía la portabilidad y facilitaba roturas al renombrar repositorio o desplegar en otra ruta base.

### 4. Falta de verificación `response.ok`
Las cargas JSON asumían éxito y llamaban directamente `response.json()`. Cuando el servidor devolvía 404, 500 o HTML en lugar de JSON, la aplicación podía fallar con errores poco legibles.

### 5. Manejo inconsistente de nombres de campos
Las capas usan esquemas heterogéneos, por ejemplo `DPTO`, `dpto`, `Dpto`, `DPTO_DESC`, `dpto_desc`, etc. La aplicación anterior resolvía esto de forma parcial y repetida, con alta fragilidad.

### 6. Falta de monitoreo del estado de capas
No existía una interfaz clara para saber qué capa estaba cargada, cuál falló y cuántos registros quedaban visibles tras los filtros.

### 7. Soporte incompleto para la capa de vías principales
La lógica cartográfica de vías existía parcialmente, pero no estaba conectada de forma consistente en el flujo principal de estados.

### 8. Riesgo de degradación severa de rendimiento
Los archivos de viviendas, hidrografía y pobreza son muy pesados. La aplicación original cargaba o renderizaba capas intensivas sin estrategia explícita de muestreo visual o degradación controlada por zoom.

### 9. Despliegue con dependencia frágil de peer dependencies
La combinación React 19 + `react-leaflet` 4 requería instalación con `--legacy-peer-deps`, lo que agregaba riesgo operativo y disminuía reproducibilidad.

### 10. Ausencia de persistencia local
Al recargar la aplicación, los filtros y capas activas se perdían. Esto reducía utilidad analítica y eficiencia operativa.

## Acciones correctivas implementadas

1. Reescritura de `App.tsx` con orquestación centralizada de recursos.
2. Creación del hook `useJsonResource`, con cache, `AbortController`, validación HTTP y recarga explícita.
3. Sustitución de rutas rígidas por `import.meta.env.BASE_URL`.
4. Normalización de campos geográficos en `src/utils/geo.ts`.
5. Corrección completa de la lógica de comunidades indígenas.
6. Incorporación real de la capa de vías principales.
7. Persistencia en `localStorage` del estado analítico.
8. Selector de distrito con búsqueda textual.
9. Estado de salud por capa, con indicadores de carga, error y conteo.
10. Exportación del estado analítico activo a JSON.
11. Tres fondos cartográficos, claro, oscuro y satelital.
12. Muestreo visual automático para viviendas según nivel de zoom.
13. Flujo de GitHub Pages reforzado y archivo `.npmrc` para fijar registry público.
14. Documentación técnica adicional y README actualizado.

## Funcionalidades nuevas de alto valor

- Búsqueda por distrito.
- Exportación de configuración actual.
- Reintento de recarga para capas con error.
- Persistencia local del trabajo del usuario.
- Cambios de mapa base.
- Indicadores de salud y conteos visibles por capa.
- Restablecimiento rápido de vista.
- Mostrar todo, ocultar todo en capas temáticas.

## Riesgos residuales y mejoras futuras recomendadas

### 1. Peso de archivos GeoJSON
Aunque la aplicación es ahora más robusta, varias capas siguen siendo pesadas. Para un entorno productivo de alto uso conviene evaluar:
- simplificación geométrica,
- tiles vectoriales,
- generalización por nivel de zoom,
- división por departamento,
- compresión adicional.

### 2. Datasets duplicados o ambiguos en `public`
Existen archivos aparentemente equivalentes con nombres distintos, por ejemplo viviendas y comunidades indígenas, que deberían revisarse para evitar duplicidad funcional o confusión editorial.

### 3. Ausencia de pruebas automatizadas
La siguiente fase deseable es incorporar pruebas unitarias y de integración mínima sobre:
- normalización de departamento,
- filtros,
- construcción de bounds,
- carga de recursos,
- persistencia local.

### 4. Posible migración futura a una arquitectura de catálogo de capas
Si el proyecto seguirá creciendo, conviene modelar las capas desde una única tabla de metadatos, con estilo, archivo, alias de campos y comportamiento por zoom.

## Veredicto técnico

La versión original no era suficientemente confiable para un uso operativo exigente sin correcciones. La versión mejorada incluida en este paquete eleva de forma importante la robustez, la portabilidad, la observabilidad y la utilidad analítica de la aplicación, quedando en una condición mucho más apta para despliegue, validación funcional y extensión futura.
