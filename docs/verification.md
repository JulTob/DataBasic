# Verificación de DataBasic

Comprobación local, publicación y prueba online: 3 de noviembre de 2026.

## Resultados

| Comprobación | Estado | Evidencia y alcance |
| --- | --- | --- |
| Sintaxis de los módulos, scripts y pruebas | Superada | `npm run check`. |
| Pruebas automatizadas | 169 superadas en local en 0.4.0, ninguna omitida | Dominio, migración v1/v2, SQL, escenas, diálogos, eventos, bundle generado, ejemplos y guardados independientes. |
| Motor de distribución Graphviz incluido | Superada | El archivo redistribuido calcula posiciones sin descargar recursos. |
| Generación estática | Superada | `npm run build` produce `dist/` con todos los recursos locales. |
| Sintaxis del script generado | Superada | `node --check dist/app.bundle.js`. |
| Resolución de recursos de la entrega | Superada | Las referencias locales de HTML y los avisos de terceros están incluidos. |
| Prueba en un navegador real | Superada para el recorrido descrito abajo | Aplicación alojada en GitHub Pages, abierta y manejada en el navegador de la app. |
| Identidad visual propia | Implementada | La versión 0.2.0 usa un lienzo punteado, tarjetas y paneles suaves. Conserva los comandos de estudio; no busca reproducir la apariencia de Visio. |
| Contraste con los apuntes del curso | Realizado | [Requisitos del curso](course-requirements.md). La versión 0.4.0 añade transformaciones de multivaluados, jerarquías y cardinalidad ternaria explícita; la cobertura y las carencias se detallan por operación. |
| Repositorio remoto y publicación | Superada para el código 0.4.0 | Archivos subidos mediante la interfaz de GitHub; [verificación y despliegue del código final](https://github.com/JulTob/DataBasic/actions/runs/41666023631). |

Las pruebas locales se ejecutaron con Node.js 26. El flujo de GitHub Actions
también completó comprobación, pruebas y generación con Node.js 22.
Las pruebas de eventos usan un doble de DOM: verifican el código de las
interacciones, no la maquetación, los clics físicos ni los diálogos nativos.

La web pública es [DataBasic](https://jultob.github.io/DataBasic/).
El primer despliegue corresponde al commit `990e999`.
GitHub mostró avisos sobre la actualización del runtime de sus acciones y
la imagen de Ubuntu; no impidieron la verificación ni el despliegue.

## Revisión de uso del curso en 0.4.0

Comprobación integrada y uso real: 3 de noviembre de 2026.
El código final corresponde a `d8edc10`; el flujo 57 completó verificación y
publicación. Después se recargó la práctica: la web sirvió la versión 0.4.0
y `app.bundle.js?v=9609c30a913e`, coincidente con el build local. Se recuperó
el ejercicio anterior y se reabrieron las descargas de jerarquía y ternaria.
La cabecera mostró «Especialización de Instrumento» y las restricciones
usaron nombres legibles. No se registraron errores de consola.
Los recorridos funcionales se hicieron en una pestaña nueva con
`?practica=full-use-20261103`, sin operar el ejercicio principal ni la práctica
anterior. La [guía de práctica](practice-guide.md) usa un club de observación
original y [once archivos de ejemplo](../examples/README.md), con estados
pendientes y resueltos para comprobar las decisiones de transformación.

### Comprobaciones automatizadas y del artefacto

- Sintaxis, 169 pruebas, generación, sintaxis del bundle y revisión del diff
  superadas. Ninguna prueba se omitió en local; `xmllint` estuvo disponible.
- Once ejemplos reales: importación, validación, guardado y relectura;
  ocho estados resueltos exportan SQL y tres pendientes lo bloquean.
- Transformaciones atómicas e idempotentes, trazas coherentes y rechazo de
  cambios que destruyan claves o artefactos consumidos por otros objetos.
- La distribución copia los once JSON sin modificaciones. Sus 16 referencias
  HTML resuelven bajo `/DataBasic/`; dependencias y licencias se conservan.
- El formato permanece en la versión 2: se mantiene la migración v1 y la
  lectura conservadora de archivos anteriores sin las decisiones nuevas.

### Recorridos realizados en la aplicación pública

- Tipos NUMBER, VARCHAR, CHAR y DATE visibles en ambas representaciones.
  El inspector mostró precisión 8, escala 2, requerido, predeterminado 0 y
  mínimo 0 de `valor`; cambiar la precisión a 9 actualizó el atributo Chen.
  La clave alternativa de `serie` apareció en la tabla y en el SQL.
- La FK nativa de `Coordina` aceptó CASCADE. SET NULL incompatible se rechazó
  con un mensaje y se conservó CASCADE. «Editar origen Chen» abrió Coordina;
  rematerializarla mantuvo la política en el JSON y SQL descargados.
- N:N: apertura de `Habilitacion`, inspección de la clave y sus dos FKs,
  rematerialización sin duplicarlas y apertura del SQL resultante.
- Multivaluados: desde el estado pendiente se crearon `Etiquetas` y
  `Calibraciones`, esta última con dos componentes. La PK completa del
  propietario forma parte de cada PK auxiliar y de su FK. Deshacer y rehacer
  restauraron el estado anterior y posterior a la primera transformación.
  El JSON descargado se reabrió; el SQL mostró la PK de cuatro columnas.
- Jerarquía: la primera materialización rechazó las claves locales
  incompatibles. El JSON descargado después del rechazo fue idéntico al
  ejemplo pendiente. Tras renombrarlas a `referenciaLocal` y retirar su marca
  de clave, la transformación creó las PK/FK heredadas y conservó los IDs
  de los atributos y columnas locales.
- Ternaria: se eligieron las cardinalidades por combinación de roles,
  separadas de la participación absoluta. El formulario rechazó un contexto
  por período sin atributo seleccionado. Al elegir `instante`, materializó
  tres FKs, PK de los tres roles más instante y UNIQUE de Persona, Sesion e
  instante. Estas decisiones aparecen en el JSON y SQL reales.
- Entidad débil: el inspector mostró Puerto, su propietaria Instrumento y
  Contiene como vínculo identificador. SQL incluyó la clave parcial `numero`
  más la clave del propietario en su PK y una FK a Instrumento.
- Compuestos y recursiva: se inspeccionaron los dos roles de Persona en
  Orienta. SQL incluyó las hojas de los compuestos de entidad y relación,
  las dos FKs recursivas y omitió el atributo derivado `antiguedad`.
- Distribuir ejecutó Graphviz y notificó su operación reversible. Se
  descargaron JSON, SQL y SVG mediante los controles de la aplicación;
  el SVG real de compuestos y recursiva superó `xmllint --noout`.

Los cuatro JSON descargados de multivaluados y jerarquía/ternaria se
validaron sin errores ni normalización del parser. Los estados resueltos
conservan todos los IDs previos; sólo difieren de sus ejemplos resueltos
en los UUID nuevos y en el título conservado del ejemplo pendiente. El SQL
generado desde esos JSON coincide con el de sus ejemplos resueltos.

### Límites de esta verificación

No equivale a certificar todas las funciones de Visio 2010. La estrategia
implementada para jerarquías usa tablas de superclase y subclases; las
restricciones de cobertura, exclusión y algunos mínimos se conservan y se
señalan como documentales. No se ejecutó el SQL exportado en un SGBD.

El botón Imprimir/PDF se intentó en el navegador integrado, pero su llamada
de impresión no permitió comprobar la vista previa. La revisión de fuente
confirma `window.print()`, el ajuste del SVG y estilos de impresión; no se
han validado paginación, PDF guardado ni impresión física. Safari, Firefox y
otros dispositivos quedan fuera de este recorrido. Los arrastres reales de
rombos y rótulos se verificaron en 0.3.1, como se registra abajo; sus
regresiones automatizadas siguen incluidas en 0.4.0.

Las secciones siguientes conservan el historial de verificaciones anteriores.

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
- Las 16 referencias locales de los HTML generados resuelven a archivos
  incluidos. CSS y código generado llevan una versión derivada de su
  contenido para renovar la caché al actualizarse; ambas coinciden
  con los hashes de los archivos de la distribución.
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
- No se registraron errores en la consola durante este recorrido.

Esta revisión no amplía la cobertura manual a impresión, arrastre ni otros
navegadores. El formato de los ejercicios sigue siendo la versión 1.
Los contratos del modelo y los avisos de licencia se conservan.

## Revisión funcional de 0.3.0

Comprobación local integrada: 3 de noviembre de 2026.

- `npm run check`, 97 pruebas, `npm run build` y
  `node --check dist/app.bundle.js` superados en las fuentes integradas.
- El ensamblado es común para la entrega y el doble de DOM de aplicación.
  Una prueba compila una copia temporal sin red y ejecuta su `dist` real:
  arranque, cambio Chen/relacional, alta y guardado.
- Se comprueban rutas relativas bajo `/DataBasic/`, versiones por contenido
  de CSS/JavaScript y presencia de avisos legales en la distribución.
- Se compararon `LICENSE`, `NOTICE.md`, `legal.html`, favicon y todos los
  archivos de librerías con la copia previa: se conservan byte a byte.
  Esa primera comparación precede a una edición remota posterior de
  `legal.html`, incorporada a la copia local sin sobrescribirla en GitHub.
- La entrada v1 conserva IDs, tipos y relaciones al migrar al perfil general
  del formato v2. No se deducen asociaciones a partir de tablas puente.
- Se reproduce y corrige la reutilización indebida de la PK propia como FK
  al conectar dos tablas nuevas; también se rechazan parches de identidad
  y referencias que impidan guardar y reabrir el documento.
- Se prueban N:N con atributo, ternaria con tres roles y discriminador temporal,
  entidad débil con clave parcial, AK, dominios, valores predeterminados,
  propagación de tipos, materialización y rechazo sin mutación.
- Se prueba el flujo v1 con entidades proyectadas existentes → N:N nativa →
  atributo → clave explícita → materialización → SQL y reapertura.
- Diez alternancias conservan IDs, tablas, FKs y SQL. La posición Chen se
  guarda por separado de las coordenadas relacionales.
- Los tests de escenas verifican límites compartidos, XML mediante `xmllint`,
  tipos completos, participaciones por rol y altas sin superposición.
  La validación XML se ejecutó en local con `xmllint`; en CI ese caso se
  omite cuando la herramienta no está instalada.
- IDEF1X se implementó tras leer texto y figuras 1, 4, 5, 6 y 7 de FIPS 184
  en la copia oficial de GovInfo. Esto establece los símbolos de referencia;
  la revisión visual de la aplicación se registra aparte.
- Las pruebas de ventanas ejecutan las rutas de revisión del modelo,
  generalización, claves alternativas y edición nativa, además de los formularios
  de tipo/dominio y estrategias de atributos y entidades débiles.
- Una prueba resuelve una lectura inicial diferida después de abrir otro JSON:
  el documento importado se conserva. El guardado ya estaba protegido por
  el historial de la apertura; no hizo falta cambiar ese código.
- Se añaden casos de ramas Chen cortas con roles largos y extremos en ambos
  sentidos: las etiquetas no se intersectan y conservan su entidad/rol.
  Las guías finas y sus anclajes vinculan cada rótulo desplazado a su rama;
  la regresión incluye una rama diagonal y otra horizontal de 90 unidades.
- La distribución relacional del ejemplo reproduce dos lecturas que se pisaban.
  Ahora cada conector agrupa sus lecturas en un bloque con guía; se comprueban
  el caso con/sin cardinalidad, la separación de tablas/bloques y la conservación
  exacta de los trazados. Esto no garantiza una distribución óptima de todo grafo.

Las pruebas de DOM simulado no verifican CSS, hit-testing, almacenamiento del
navegador ni impresión física. Las pruebas de almacenamiento comparten un
almacén simulado: la clave principal se conserva, dos prácticas no se pisan y
cada una recupera sólo su propio contenido.
Multivaluados y generalizaciones se conservan como semántica pendiente de
materialización; no se presentan como una transformación SQL completa.

## Comprobación online de 0.3.0

El [despliegue de la corrección de colocación](https://github.com/JulTob/DataBasic/actions/runs/41559438338)
terminó correctamente para `c44b91e`. La comprobación previa detectó que faltaba
subir el adaptador de `diagram.js`; no se desplegó la subida incompleta.
Se descargó el repositorio desde GitHub y se compararon 42 archivos de código
y recursos con las fuentes locales: todos coinciden byte a byte.

Recorrido real en el navegador, 3 de noviembre de 2026:

- Inicio a 100 % con tipos completos. En la ventana observada de 963 × 968,
  tres altas quedan enteras dentro del lienzo y sin superposición; los clics
  en sus títulos conectan la primera con la segunda, sin autorrelación accidental.
- Dos PK llamadas `id` se conservan: la FK hija se crea como `Entidad1_id`.
- Se usaron Varios, identificación y opcionalidad; la FK identificadora pasa
  a la PK hija y la caja IDEF1X dependiente cambia sus esquinas.
- Deshacer y rehacer restaura conjuntamente PK y FK. Se seleccionó el conector
  y se abrió Acción referencial; SET NULL incompatible se rechaza con mensaje
  y vuelve a mostrar la política válida, sin confirmar el cambio.
- El diálogo de columna guardó NUMBER(12,2), requerido, predeterminado 0 y
  mínimo 0. Se creó una AK separada del índice; el SQL mostró NUMERIC(12,2),
  NOT NULL, DEFAULT, CHECK y UNIQUE. Se abrió la revisión del modelo correcta.
- Sobre entidades proyectadas de un archivo anterior se creó una N:N con
  roles, atributo DATE y clave explícita. Su materialización produjo una tabla
  y dos FKs; renombrar la columna desde Relacional actualizó el atributo Chen.
- Diez alternancias finalizaron con JSON idéntico, incluidos IDs, trazas y
  posiciones, comprobado sobre las dos descargas reales.
- Se creó una ternaria con período y un participante de PK compuesta. Se
  conservaron tres roles, tres FKs y todos los componentes de la clave elegida;
  el archivo descargado se reabrió y mostró sus tres participaciones.
- El SVG descargado es XML válido y usa los límites de la escena completa.
- Se arrastró una tabla con un gesto real: cambió de posición y su conector
  la siguió. Otro arrastre en Chen sólo cambió `presentation.chen`; tablas,
  FKs y posiciones relacionales permanecieron idénticas en los JSON comparados.

La revisión continuó en otra pestaña para aislar las pruebas del ejercicio abierto.
La comprobación de recuperación concurrente anterior no se considera evidencia
de pérdida ni de éxito. Se repitió en `?practica=revision-20261103`: se esperó
la confirmación de guardado, se recargó la página y se recuperaron la ternaria,
sus tablas, FKs y participaciones. El indicador confirmó «Práctica independiente».
La pestaña de trabajo quedó aparte durante el recorrido independiente. Las URLs sin
`practica` conservan la clave anterior; las prácticas nombradas no leen ni
copian el ejercicio principal. El formato JSON no cambia por esta separación.

En la práctica independiente de 1280 × 720 también se crearon dos entidades
nativas, una N:N y un atributo DATE. Se materializó la clave elegida y se
ejecutó la distribución Graphviz real. Se verificaron los cuatro anclajes
y guías de sus rótulos en la aplicación publicada, tras el
[despliegue de las guías Chen](https://github.com/JulTob/DataBasic/actions/runs/41624981059)
para `0484d75`. No hubo desbordamiento horizontal
de la página ni errores registrados en la consola durante ese recorrido.

Quedan fuera de esta revisión manual la impresión física, otros navegadores
y todas las combinaciones posibles de restricciones. Las carencias funcionales
se detallan en la [matriz](functional-audit.md).

## Comprobación final de los rótulos

El [despliegue del código final](https://github.com/JulTob/DataBasic/actions/runs/41627572686)
completó verificación y publicación para `434f085`. La pestaña independiente
se recargó y sirvió `app.bundle.js?v=8d02cef33fb6`, coincidente con el build local.
El ejemplo se recuperó con sus tres tablas, dos FKs y relación N:N nativa.

Se ocultó el panel y se ajustó cada representación: Relacional al 99 % y Chen
al 110 %, en 1280 × 720. Las lecturas relacionales quedaron en bloques separados
con guía al conector, sin pisar tablas ni entre sí en este ejemplo. Los tipos
NUMBER y DATE permanecieron completos y legibles. Chen conservó roles,
cardinalidades y anclajes. No se registraron errores de consola. Se guardaron
capturas y un JSON descargable con las dos disposiciones; el ejercicio principal
no se utilizó para este recorrido.

## Fuentes del comportamiento esperado

[Especificación y referencias de Visio 2010](specification.md).


## Relaciones movibles en 0.3.1

- 117 pruebas locales, sintaxis, build y bundle generado correctos.
- Siete regresiones de persistencia cubren posiciones FK opcionales, formato 2
  anterior, aislamiento, SQL, rechazo atómico y limpieza tras borrados.
- La escena evita solapes de roles/cardinalidades de dos relaciones diferentes
  y considera las generalizaciones antes de colocar textos.
- Se prueban posiciones libres al soltar rombos sobre entidades u otros rombos,
  incluyendo el espacio del aviso pendiente; captions FK contra tablas y otros
  captions; posiciones propias con IDs como `toString` y `valueOf`.
- La aplicación ejecuta el ciclo de puntero con pan/zoom, una sola confirmación,
  guardado y reapertura, deshacer/rehacer, cambio de vista, cancelación del
  puntero y Escape. Volver al origen descarta el destino intermedio, y borrar
  durante el arrastre cancela la previsualización antes de retirar la FK.
  Distribuir reinicia los rótulos manuales de forma reversible.
- El panel de propiedades mantiene su tamaño durante el arrastre; un clic sin
  movimiento sigue abriéndolo.

Se conserva el formato 2. Las posiciones Chen antiguas no se redistribuyen al
abrir; pueden recolocarse o usarse Distribuir. Se evitan cajas de formas y textos,
sin prometer eliminar todos los cruces entre conectores.


Comprobación online de 0.3.1 en práctica independiente:

- [Despliegue del código correcto](https://github.com/JulTob/DataBasic/actions/runs/41630469354)
  para `7ff6c4f`; bundle público `c8e9997dbc31`, igual al construido en local.
- Fixture propio con dos relaciones Chen, sus roles/cardinalidades y atributos.
  Un arrastre real de Reserva hacia Persona dejó el rombo en `(80,272)`, libre
  de la entidad y con espacio para el aviso pendiente. El panel oculto no se abrió.
- Deshacer recuperó `(400,180)` y rehacer restauró `(80,272)`.
- En Relacional se arrastró el bloque de la primera FK hacia la tabla hija.
  La posición resuelta fue `(540,273)`, fuera de la tabla y del otro rótulo.
- Los JSON descargados conservan tablas, FKs, objetos conceptuales y trazas
  idénticos; sólo cambian la presentación correspondiente y el modo elegido.
- Se esperó la confirmación de guardado y se recargó: reaparecieron el bloque
  en `(540,273)` y el rombo Chen en `(80,272)`. No hubo errores de consola.
- Se usó sólo la pestaña de práctica para movimientos, aperturas y recargas.
  La pestaña de trabajo se inspeccionó sin modificarla.

## Revisión funcional y correcciones de 0.4.1

Revisión local del 3 de noviembre de 2026 con los apuntes del curso aportados
(Práctica 1, introducción al ERE, Práctica 0, Tema 1 y Tema 2) y la
[cobertura frente a Visio 2010](visio-2010-coverage.md) como especificación.
La revisión se realizó sobre 0.3.1 y se integró después con 0.4.0; la
cardinalidad ternaria por combinación de 0.4.0 es la letra 1/N de esas ramas.

- `npm run check`, 181 pruebas tras la integración (12 de esta revisión),
  `npm run build` y `node --check dist/app.bundle.js` superados en local
  con Node.js 22.
- Recorrido automatizado en Chromium (Playwright, 1400 × 900, práctica
  independiente) sobre la aplicación servida con `npm start`:
  40 pasos relacionales (R-01 a R-40) y 25 pasos Chen (C-01 a C-25), sin
  errores ni avisos en la consola del navegador. Cada paso leyó el documento
  guardado automáticamente en IndexedDB para contrastar el estado real.
- Relacional: nuevo documento; entidad desde Formas y desde la cinta;
  columnas con Agregar, Quitar, Subir, Editar… (CHAR(12), DATE requerido,
  NUMBER(8,2) con predeterminado y mínimo de dominio); rechazo de escala sin
  precisión; PK compuesta y deshacer; clave alternativa e índice único;
  relación padre→hijo con migración de PK; Definición, Nombre, Varios y
  Acción referencial (CASCADE aceptado, SET NULL rechazado con aviso);
  Opciones de visualización con IDEF1X, patas de cuervo, flecha relacional,
  tipos, claves y nombres conceptuales; SQL con PK, UNIQUE, CHECK, FK,
  NUMERIC(8,2) y CREATE UNIQUE INDEX; descarga JSON y SVG; deshacer/rehacer;
  arrastre de tabla y de bloque de lecturas; zoom por botones, deslizador,
  rueda y Ctrl + rueda; Distribuir y deshacer; copiar, pegar, duplicar;
  eliminar con confirmación; vista SQL con consulta y rechazo de FK;
  nombre del documento; atajos de teclado; eventos de impresión;
  Comprobar y Ayuda; perfil General/Curso con rechazo de INTEGER;
  panel de propiedades y divisor; recarga con recuperación; Abrir JSON
  válido e inválido; ejemplo de biblioteca.
- Chen: proyección del ejemplo; entidad nativa con atributo clave; atributo
  VARCHAR(80) requerido; relación binaria pendiente con roles y Varios;
  rechazo de máximo inferior al mínimo; atributo de relación; materialización
  de tabla asociativa y comprobación en Relacional; renombrado de columna
  reflejado en Chen; rechazo de editar la PK de una columna generada;
  ternaria con período en la clave; entidad débil con clave parcial, FK
  identificadora y vínculo elegido; compuesto con componentes, derivado
  omitido y multivaluado; especialización; revisión del modelo y Ver origen;
  SQL bloqueado por pendientes; arrastre del rombo y deshacer; renombrado
  sincronizado; eliminación rechazada de entidad con relaciones y
  eliminación de atributo y de relación materializada; guardar, nuevo y
  abrir conservando ambas representaciones; Distribuir, Ajustar y SVG.
- Defectos encontrados y corregidos, con pruebas de regresión:
  la relación que vuelve a no identificadora dejaba la FK en la PK hija y
  bloqueaba Opcional; arrastrar una tabla por sus filas no la movía;
  Revisar modelo duplicaba los avisos; Propiedades mostraba «undefined» para
  una especialización; los rótulos sobre la primera tabla quedaban bajo la
  barra flotante al abrir.
- Grafía del curso incorporada y verificada en escena y navegador: letras
  1/N junto al rombo (deducidas en binarias; en ternarias, la cardinalidad
  por combinación elegida), rombo doble del vínculo identificador y arcos de
  subconjunto en las subclases. Un documento formato 2 anterior abre y
  deduce las letras de sus binarias.
- La documentación de Microsoft sobre Visio 2010 no pudo abrirse desde el
  entorno de revisión; la matriz de cobertura señala qué filas se apoyan en
  extractos y conocimiento general y deben contrastarse después.

Quedan fuera de esta revisión la impresión física, otros navegadores, las
tres estrategias de jerarquía no implementadas y la publicación en GitHub
Pages de esta versión, que se verifica tras integrar la rama. El recorrido en
navegador se hizo antes de integrar 0.4.0; las transformaciones nuevas de esa
versión se cubren con sus propias pruebas de dominio y de ejemplos.

## Supuestos y memoria del diseño en 0.4.2

Revisión local del 4 de noviembre de 2026.

- `npm run check`, 189 pruebas (8 nuevas: supuestos, memoria, interfaz y
  aplicación), `npm run build` y `node --check dist/app.bundle.js` superados.
- Recorrido en Chromium (Playwright, 1400 × 900, práctica independiente)
  sobre un documento del curso con siete pasos (A-01 a A-07), sin errores de
  consola: alta de un supuesto global desde Insertar → Supuesto; rechazo de un
  texto vacío dentro del diálogo; categoría Supuestos de una entidad con el
  objeto preseleccionado; edición y eliminación desde la lista con deshacer;
  visión general en Base de datos → Supuestos con cinco restricciones
  documentales detectadas y edición desde ella; descarga de la memoria HTML
  (dos SVG incrustados, letras de cardinalidad, supuestos y semántica
  perdida) y Markdown (siete secciones); al borrar un atributo, su supuesto
  conserva el texto como global.
- La memoria se deriva del documento en cada descarga; nada se guarda fuera
  del JSON. Un archivo formato 2 anterior sin `assumptions` abre sin cambios.

No se ha comprobado la apertura del HTML en Word ni la impresión de la memoria;
la memoria no sustituye la justificación escrita que pide la práctica.
