# Monitor de Impacto Social, Concepción y Amambay

Aplicación web en React + Vite + Leaflet para visualizar información geodemográfica y capas temáticas de infraestructura social para los departamentos de Concepción y Amambay, Paraguay.

## Mejoras incorporadas en esta versión

1. Carga de datos desacoplada de rutas rígidas, usando `import.meta.env.BASE_URL`.
2. Manejo explícito de errores HTTP y recursos JSON.
3. Persistencia local del estado de filtros, capas y mapa base.
4. Corrección de fallas de compilación y ejecución detectadas en la auditoría.
5. Nuevo panel de salud de capas, con estados `idle`, `loading`, `loaded` y `error`.
6. Soporte real para la capa de vías principales.
7. Selector de distrito con búsqueda.
8. Alternancia entre mapa claro, oscuro y satelital.
9. Muestreo visual automático de puntos de viviendas para preservar rendimiento.
10. Exportación de la configuración activa a JSON.

## Instalación

```bash
npm install
npm run dev
```

## Verificación recomendada antes de publicar

```bash
npm run typecheck
npm run build
```

## Estructura principal

- `src/App.tsx`, orquestación de recursos, estados y persistencia.
- `src/components/Sidebar.tsx`, control analítico y operativo.
- `src/components/MapViewer.tsx`, renderizado cartográfico y control de vista.
- `src/hooks/useJsonResource.ts`, carga tolerante a fallas y cache local.
- `src/utils/geo.ts`, normalización de campos, filtros, centros, conteos y bounds.
- `AUDITORIA_TECNICA.md`, hallazgos y acciones correctivas.

## Despliegue

El flujo de GitHub Pages está preparado en `.github/workflows/deploy.yml`.

## Observación

Dado el peso de varias capas GeoJSON, conviene considerar una fase futura de simplificación geométrica, vector tiles o preagregación por zoom para obtener un rendimiento aún superior.
