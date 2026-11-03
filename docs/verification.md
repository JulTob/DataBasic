# Verificación de DataBasic

Comprobación local, publicación y prueba online: 3 de noviembre de 2026.

## Resultados

| Comprobación | Estado | Evidencia y alcance |
| --- | --- | --- |
| Sintaxis de los módulos, scripts y pruebas | Superada | `npm run check`. |
| Pruebas automatizadas | 44 superadas | Modelo, serialización, SQL, SVG, ventanas, eventos simulados, tipos NUMBER y ajuste del dibujo bajo las herramientas flotantes. |
| Motor de distribución Graphviz incluido | Superada | El archivo redistribuido calcula posiciones sin descargar recursos. |
| Generación estática | Superada | `npm run build` produce `dist/` con todos los recursos locales. |
| Sintaxis del script generado | Superada | `node --check dist/app.bundle.js`. |
| Resolución de recursos de la entrega | Superada | Las referencias locales de HTML y los avisos de terceros están incluidos. |
| Prueba en un navegador real | Superada para el recorrido descrito abajo | Aplicación alojada en GitHub Pages, abierta y manejada en el navegador de la app. |
| Identidad visual propia | Implementada | La versión 0.2.0 usa un lienzo punteado, tarjetas y paneles suaves. Conserva los comandos de estudio; no busca reproducir la apariencia de Visio. |
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

## Recorrido funcional verificado en la web pública 0.1.1

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

## Licencias de la distribución 0.1.2

Comprobación local: 3 de noviembre de 2026.

- `npm run build` incluye `LICENSE`, `NOTICE.md` y `legal.html` en `dist/`.
- `LICENSE` conserva el texto anterior sin cambios; su copia y la de
  `NOTICE.md` coinciden byte a byte con los archivos canónicos de la raíz.
- La página legal conserva sus enlaces en el árbol fuente y adapta
  `./public/vendor/` a `./vendor/` en la distribución.
- Se comprobaron 32 referencias locales de los dos HTML en ambos árboles.
  Las 16 referencias de la distribución también resuelven bajo `/DataBasic/`.
- El archivo generado conserva el enlace de Ayuda a `./legal.html` y supera
  `node --check dist/app.bundle.js`.
- Los 11 archivos de terceros se copian sin cambios; los tres archivos
  JavaScript coinciden con los hashes SHA-256 del manifiesto.

## Publicación y avisos de 0.1.2

Comprobación online: 3 de noviembre de 2026.
El [despliegue de la identidad DataBasic](https://github.com/JulTob/DataBasic/actions/runs/41545591439)
terminó correctamente para el commit `51af33a`.
La integración local también superó sintaxis y las 43 pruebas con la versión 0.1.2.

- La aplicación pública muestra superficies planas, acentos verde azulado,
  tipografía `system-ui` y DataBasic al principio del título del documento.
- Se comprobaron el ejemplo recuperado, la cinta y el panel Columnas.
- Ayuda muestra independencia, alcance MIT y enlace a licencias; el enlace
  abre la página de avisos en una pestaña nueva bajo `/DataBasic/`.
- La descarga pública de `LICENSE` coincide byte a byte con el texto canónico.
- El enlace a Apache 2.0 muestra su texto completo en el navegador.
- La consola del navegador no registró errores durante este recorrido.

Estas comprobaciones verifican presentación, acceso a avisos y distribución.
No certifican ausencia de infracción ni de posibles reclamaciones.

## Interfaz canvas de 0.2.0

Comprobación local y online: 3 de noviembre de 2026.
El [despliegue inicial de la interfaz canvas](https://github.com/JulTob/DataBasic/actions/runs/41550082435)
completó verificación y publicación para el commit `134e7c9`.

- Sintaxis, 44 pruebas y generación estática superadas en local.
- Revisión visual en el navegador a 809 × 755 y 1280 × 720 píxeles,
  sin desbordamiento horizontal de la página. En la ventana estrecha,
  la barra de herramientas y las tablas de propiedades permiten desplazamiento.
- Creación de una entidad, cambio de nombre y columna `fecha` de tipo `DATE`.
- Conexión padre-hijo, migración de PK y cambio de opcionalidad.
- Deshacer y rehacer la relación; comprobación del modelo sin errores.
- Redimensionado del panel de propiedades con el teclado y modo lienzo
  al ocultar el panel. Ajuste del dibujo con las herramientas flotantes.
- Descarga del ejercicio JSON y de un SVG; el SVG descargado es XML válido.
- Reapertura de la copia previa y recuperación del ejemplo original
  de tres entidades y dos relaciones después de las pruebas.

Esta revisión no amplía la cobertura manual a impresión, arrastre ni otros
navegadores. El formato de los ejercicios sigue siendo la versión 1.
Los contratos del modelo y los avisos de licencia se conservan.

## Fuentes del comportamiento esperado

[Especificación y referencias de Visio 2010](specification.md).
