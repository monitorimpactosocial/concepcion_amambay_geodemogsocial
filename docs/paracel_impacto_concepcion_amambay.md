# Marco de analisis de impacto PARACEL en Concepcion y Amambay

## Proposito

Este documento propone una forma operativa de medir y proyectar el impacto demografico, laboral y economico de PARACEL en Concepcion y Amambay. La idea no es producir una cifra unica, sino un modelo vivo con escenarios, supuestos explicitos y trazabilidad territorial.

## Pregunta central

Como cambia el territorio cuando una planta industrial de gran escala entra en operacion, demanda empleo directo e indirecto, mueve proveedores, induce migracion, presiona servicios urbanos y modifica ingresos familiares.

## Enfoque recomendado

1. Linea de base territorial
   - Poblacion 2022 por distrito, sexo y edad.
   - Hogares, viviendas, barrios, comunidades indigenas y red vial.
   - Indicadores de pobreza, empleo, educacion, salud, servicios basicos y movilidad.
   - Oferta actual de mano de obra por distrito y nivel educativo.

2. Shock PARACEL por fase
   - Construccion: empleo temporal, contratistas, alojamiento, transporte, presion sobre alquileres y comercio local.
   - Puesta en marcha: transicion desde empleo de obra a empleo industrial estable.
   - Operacion plena: demanda permanente de operarios, tecnicos, logistica, mantenimiento, seguridad, alimentacion, transporte, servicios profesionales y cadena forestal.
   - Expansion/estabilizacion: consolidacion de proveedores, formacion tecnica, migracion familiar y nuevos patrones de residencia.

3. Escenarios
   - Conservador: baja captura local de empleo y proveedores; alta importacion de mano de obra calificada.
   - Medio: captura local progresiva con capacitacion y proveedores regionales.
   - Transformador: fuerte encadenamiento local, formacion tecnica acelerada y retencion de ingreso en distritos cercanos.

## Variables minimas del modelo

### Demografia

- Migracion neta anual inducida por empleo directo.
- Migracion neta anual inducida por empleo indirecto y servicios.
- Porcentaje de trabajadores que llegan con familia.
- Tamano medio de hogar migrante.
- Localizacion residencial probable por distrito.
- Presion sobre viviendas, alquileres, transporte y servicios.

Formula inicial:

```text
poblacion_inducida =
  trabajadores_no_locales * proporcion_con_familia * tamano_hogar_promedio
  + trabajadores_no_locales_sin_familia
```

### Trabajo

- Empleo directo por fase y categoria ocupacional.
- Empleo indirecto por multiplicador sectorial.
- Empleo inducido por consumo de hogares.
- Captura local del empleo por nivel educativo y oficio.
- Brecha de habilidades por distrito.
- Rotacion y estabilidad del empleo.

Formula inicial:

```text
empleo_total = empleo_directo
             + empleo_directo * multiplicador_indirecto
             + masa_salarial_local * coeficiente_empleo_inducido
```

### Economia local

- Masa salarial directa retenida localmente.
- Compras locales de bienes y servicios.
- Gasto de contratistas y trabajadores.
- Recaudacion municipal potencial.
- Efecto sobre alquileres, alimentos, transporte y servicios.
- Creacion de empresas proveedoras.

Formula inicial:

```text
ingreso_local_anual =
  masa_salarial_directa * proporcion_residente_local
  + compras_empresa * proporcion_proveedores_locales
  + gasto_contratistas_en_zona
```

## Indicadores de tablero

- Nuevos residentes estimados por distrito.
- Hogares adicionales requeridos.
- Relacion empleo local / empleo total PARACEL.
- Brecha de perfiles tecnicos.
- Masa salarial retenida en Concepcion y Amambay.
- Proveedores locales activos y facturacion estimada.
- Riesgo de presion sobre alquileres.
- Riesgo de presion sobre salud, educacion, agua y transporte.
- Distritos con mayor oportunidad laboral.
- Distritos con mayor vulnerabilidad a desplazamiento o encarecimiento.

## Datos que faltan pedir a PARACEL

- Produccion anual esperada por etapa.
- Cronograma de construccion, arranque y operacion plena.
- Dotacion directa prevista por area y categoria.
- Dotacion contratista prevista por fase.
- Salarios promedio por categoria.
- Politica de contratacion local.
- Porcentaje esperado de personal no local.
- Localizacion de campamentos, alojamientos o buses.
- Presupuesto anual de compras y servicios tercerizados.
- Proveedores ya identificados por rubro.
- Volumen logistico diario: camiones, turnos, rutas, puertos o nodos.

## Como llevarlo a la app

1. Crear una vista `Impacto PARACEL`.
2. Incorporar controles de escenario: conservador, medio y transformador.
3. Parametrizar produccion, empleo directo, multiplicadores, captura local y migracion familiar.
4. Mostrar mapas de presion territorial por distrito.
5. Exportar una matriz Excel con supuestos, resultados y sensibilidad.
6. Separar siempre datos observados, supuestos PARACEL y estimaciones del modelo.

## Primer entregable recomendado

Un modulo de simulacion territorial con 10 a 15 parametros editables, tres escenarios precargados y resultados por distrito. Debe permitir responder rapidamente:

- Cuanta poblacion adicional podria atraer la operacion.
- Cuantos empleos podrian capturarse localmente.
- Donde se concentraria la presion sobre vivienda y servicios.
- Que distritos tienen mayor oportunidad de encadenamiento economico.
- Que brechas de formacion laboral deberian atenderse antes de la operacion plena.

