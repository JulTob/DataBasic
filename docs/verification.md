# Verificación de DataBasic 0.1.1

Comprobación local: 2 de noviembre de 2026.
Publicación y prueba online: 3 de noviembre de 2026.

## Resultados

| Comprobación | Estado | Evidencia y alcance |
| --- | --- | --- |
| Sintaxis de los módulos, scripts y pruebas | Superada | `npm run check`. |
| Pruebas automatizadas | 43 superadas | Modelo, serialización, SQL, SVG, ventanas, eventos simulados y tipos NUMBER. |
| Motor de distribución Graphviz incluido | Superada | El archivo redistribuido calcula posiciones sin descargar recursos. |
| Generación estática | Superada | `npm run build` produce `dist/` con todos los recursos locales. |
| Sintaxis del script generado | Superada | `node --check dist/app.bundle.js`. |
| Resolución de recursos de la entrega | Superada | Las referencias locales de HTML y los avisos de terceros están incluidos. |
| Prueba en un navegador real | Superada para el recorrido descrito abajo | Aplicación alojada en GitHub Pages, abierta y manejada en el navegador de la app. |
| Comparación visual con Visio 2010 | Pendiente | Se reconstruyó la estructura documentada; no se certifica identidad visual. |
| Contraste con los apuntes del curso | Realizado | [Requisitos del curso](course-requirements.md). IDEF1X, perfil restrictivo de tipos y editor ERE quedan pendientes de implementar. |
| Repositorio remoto y publicación | Superada | Archivos subidos mediante la interfaz de GitHub; [primer despliegue correcto](https://github.com/JulTob/DataBasic/actions/runs/41542519291). |

Las pruebas locales se ejecutaron con Node.js 26. El flujo de GitHub Actions
también completó comprobación, pruebas y generación con Node.js 22.
Las pruebas de eventos usan un doble de DOM: verifican el código de las
interacciones, no la maquetación, los clics físicos ni los diálogos nativos.

La web pública es [DataBasic](https://jultob.github.io/DataBasic/).
El primer despliegue corresponde al commit `990e999`.
GitHub mostró avisos sobre la actualización del runtime de sus acciones y
la imagen de Ubuntu; no impidieron la verificación ni el despliegue.

## Recorrido verificado en la web pública

- Carga del ejemplo de biblioteca, iconos, cinta, diagrama y propiedades.
- Creación de una entidad y edición de su nombre con sincronización conceptual.
- Incorporación de una columna `importe` con tipo `NUMBER(8,2)`.
- Creación de una relación con Socio y migración de su PK a la nueva entidad.
- Apertura de Varios y cambio de la relación opcional a obligatoria, con FK requerida.
- Comprobación del modelo sin errores.
- Distribución mediante Graphviz, deshacer y rehacer.
- Descarga de `.databasic.json` y reapertura mediante el selector de archivos.
- Recarga de la web conservando cuatro entidades, tres relaciones y NUMBER.
- Apertura del SQL generado con `NUMERIC(8,2)` y la nueva FK.

Este recorrido no certifica equivalencia visual o funcional con Visio 2010.
No se probaron en esta sesión el arrastre, la impresión, todos los tamaños
de pantalla ni la descarga SVG. Esos casos siguen pendientes de revisión manual.

## Cobertura funcional

- Operaciones inmutables y rechazo atómico de cambios incoherentes.
- PK y FK compuestas, migración y reutilización de columnas compatibles.
- Relaciones identificadoras, autorreferencias y referencias cíclicas.
- Conservación de referencias al renombrar y reordenar columnas.
- Bloqueo del borrado de columnas referenciadas.
- Eliminación de entidades y relaciones sin borrar columnas ajenas.
- Coherencia entre opcionalidad, nulabilidad y acciones referenciales.
- Guardado/lectura con formato versionado y validación de importaciones.
- Restricciones UNIQUE para cardinalidades con máximo uno.
- Escape de nombres en SVG, HTML y SQL.
- Crear, editar, deshacer, rehacer, guardar y conectar mediante eventos simulados.
- Disponibilidad de las ventanas y categorías especificadas para esta base.
- NUMBER con precisión/escala, límites documentados, propagación a FKs,
  guardado y traducción SQL a NUMERIC sin modificar el modelo.

## Revisión manual adicional

1. Abrir también `dist/index.html` desde una copia local.
2. Arrastrar una entidad, editar sus columnas y conectar padre e hijo.
3. Mover las tablas y comprobar el seguimiento de las relaciones.
4. Ajustar Varios y las opciones del documento.
5. Repetir el guardado y la reapertura en Safari y Firefox.
6. Exportar SVG/SQL e imprimir un diagrama desplazado y ampliado.
7. Comparar ventanas, etiquetas y procedimientos con los apuntes del profesor.

## Fuentes del comportamiento esperado

[Especificación y referencias de Visio 2010](specification.md).
