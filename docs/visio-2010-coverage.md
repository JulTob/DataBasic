# Cobertura de DataBasic 0.4.5 frente a Visio 2010 y al curso

Revisión realizada el 3 de noviembre de 2026 sobre la base 0.3.1 e integrada
después con la versión 0.4.0 (transformaciones de multivaluados y jerarquías,
cardinalidad ternaria por combinación y ejemplos del curso), como ejercicio
de desarrollo dirigido por especificación: cada función de la plantilla **Modelo de base de
datos** de Visio 2010 y cada exigencia de los apuntes del curso se trata como
un requisito con su estado en DataBasic y la evidencia que lo respalda.
DataBasic es una implementación independiente, con código, textos e identidad
visual propios; no copia código ni recursos de Microsoft.

Los estados son: **Disponible** (existe la operación y una prueba automatizada
o un paso de la revisión en navegador la ejercita), **Parcial** (existe con
límites indicados), **Alternativa propia** (DataBasic resuelve la necesidad
de otra manera), **Pendiente** (se guarda el hecho, falta la operación) y
**Fuera de alcance** (no se implementa en una aplicación de navegador sin
servidor ni se necesita para el curso).

Las evidencias `R-nn` y `C-nn` remiten a los pasos del recorrido en navegador
registrado en [verificación](verification.md#revisión-funcional-y-correcciones-de-032);
los nombres entre comillas son pruebas de `tests/`.

## Fuentes y su fiabilidad en esta revisión

| Clave | Fuente | Fiabilidad |
| --- | --- | --- |
| MS | Páginas de soporte de Microsoft citadas en la [especificación](specification.md#fuentes) (Definition, integridad referencial, Define a relationship, Create or edit views, Define categories, Primary ID, Triggers and Check, Set display options). | Citadas en versiones anteriores; en esta sesión el entorno de revisión no pudo abrir `support.microsoft.com`, así que los nombres de opciones se contrastaron con extractos de buscador y con el tutorial DeVry. |
| V10 | [DeVry, Creating ERD in MS Visio 2010, 18 páginas](https://lms.devry.edu/lms/CourseExport/files/4c59b998-a778-4673-b5b5-1040a4a59543/documents--Creating_ERD_in_MS_Visio_2010.pdf). | Recorrido de propiedades y opciones de documento en 2010. |
| POG | Microsoft Visio 2010 Product Overview Guide (descarga 27196, archivo `.docx`). | La página de descarga respondió; el archivo no pudo descargarse desde el entorno. La lista de funciones generales procede de la documentación pública de la versión y se marca «sin verificar en esta sesión» cuando corresponde. |
| F184 | FIPS PUB 184, símbolos IDEF1X. | Verificado en versiones anteriores sobre la copia oficial. |
| P1 | Práctica 1 FBD 2026-2027 (PDF aportado): §§3.1–3.2 y pp. 3–4. | Leído íntegro en esta sesión. |
| ERE | Práctica 1, Introducción al modelo ERE (13 páginas aportadas): grafía básica pp. 2–5, ejemplo pp. 5–10. | Leído íntegro en esta sesión. |
| T1, T2 | Tema 1 y Tema 2 FBD 2026-2027 (PDF aportados). | Leídos íntegros; Tema 2 pp. 5–12 y 14–19 fijan entidades, atributos, relaciones, restricciones y jerarquías. |
| P0 | Práctica 0, separabilidad programas/datos. | Leída; no impone requisitos a la herramienta de modelado. |

## A. Plantilla Modelo de base de datos de Visio 2010

| ID · fuente | Función de Visio 2010 | Estado en DataBasic | Evidencia | Carencia o diferencia |
| --- | --- | --- | --- | --- |
| A-01 · V10 p. 5 | Galería Entity Relationship: formas Entidad, Relación, Vista. | Disponible | R-02, R-11, R-29; «UI-01» | Formas propias en el panel Formas; sin galería Object Relational (tipos objeto). |
| A-02 · V10 pp. 7–8 | Conector arrastrado y pegado a los extremos de dos tablas. | Alternativa propia | R-11 | Se pulsa Relación y después la tabla referenciada y la que recibe la FK; no hay arrastre de extremos. |
| A-03 · MS | Formas Category, Parent to category y Category to child (subtipos relacionales). | Alternativa propia | C-15; Dominio y Ejemplos de la jerarquía 04 | La jerarquía se dibuja en Chen y se transforma con tablas de superclase y subclases (PK heredada que es también FK). No hay símbolo de categoría en el relacional. |
| A-04 · V10 p. 8 | Ventana Propiedades de la base de datos anclada bajo el dibujo. | Disponible | R-36; «UI-01» | Se oculta, redimensiona y cierra con su propio control. |
| A-05 · MS | Definición: nombre físico, conceptual, espacio de nombres, propietario, base de datos de origen, sincronizar nombres. | Disponible | R-02; «UI-02/UI-03» | Propietario y origen sólo se muestran: no hay ingeniería inversa. |
| A-06 · V10 p. 9 | Columnas: nombre físico, tipo, requerido, PK, notas; agregar, quitar, editar, subir y bajar. | Disponible | R-03 a R-06; «Los tipos estándar del desplegable son válidos…» | El tipo se elige en una lista agrupada por categoría, como los tipos portables de Visio, filtrada por perfil y con «Otro…» para escribirlo. Visio alterna además tipo portable/físico. |
| A-07 · MS | Diálogo de columna: definición, tipo de datos con longitud, precisión y escala, comprobación, extendido, notas. | Parcial | R-04, R-05; «El editor de tipos guarda parámetros, dominio y predeterminado…» | Familia y parámetros, predeterminado, dominio declarativo (mínimo, máximo, valores, condición) y notas. Sin pestañas Collection ni Extended. |
| A-08 · MS | Identificador principal: columnas de la clave, opción sin clave, índice automático de PK. | Disponible | R-07 | PK compuesta por marcado; una entidad sin PK produce aviso, no se bloquea el guardado. |
| A-09 · MS | Índices: nuevo, editar, eliminar, único o no único. | Disponible | R-09; «Dominios y claves alternativas conservan obligaciones…» | Sin orden ascendente/descendente por columna. Las claves alternativas se separan de los índices. |
| A-10 · MS | Triggers (código por tabla). | Fuera de alcance | — | Puede anotarse en Notas; no se genera DDL de triggers. |
| A-11 · MS | Check: cláusulas de comprobación de la tabla. | Parcial | R-17 | CHECK por columna desde el dominio; sin cláusulas libres de tabla. |
| A-12 · MS | Extended: atributos específicos del SGBD. | Fuera de alcance | — | DataBasic no se conecta a un SGBD. |
| A-13 · MS | Notas de tabla. | Disponible | «UI-04»; recorrido Notas | — |
| A-14 · MS | Relación → Definición: tablas principal y secundaria y columnas asociadas. | Disponible | R-12 | La FK siempre referencia la PK completa; no hay «Disconnect» ni FK hacia una clave alternativa. |
| A-15 · MS | Relación → Nombre: frase verbal, frase inversa y nombre físico. | Disponible | R-12 | — |
| A-16 · MS | Relación → Varios: Cero o más, Uno o más, Cero o uno, Exactamente uno, Rango; identificadora/no identificadora; Child has parent opcional. | Parcial | R-13, R-14; «Volver a no identificadora saca la FK de la PK hija…» | Sin cardinalidad por rango numérico. Volver a no identificadora saca la FK de la PK hija, como en Visio (corregido en 0.4.1). |
| A-17 · MS | Relación → Acción referencial: No action, Cascade, Set NULL, Set default, Do not enforce. | Parcial | R-15; «SET NULL rechaza una relación obligatoria» | Sin «Do not enforce». SET NULL y SET DEFAULT se validan contra nulos y predeterminados. |
| A-18 · MS | Vistas: definición, columnas, SQL. | Parcial | R-29; «Las vistas se exportan como consultas…» | Consulta libre y columnas; no hay generador visual de consultas ni comprobación de la sintaxis. |
| A-19 · MS | Categorías: discriminador y categoría completa. | Parcial | C-15; Ejemplos 04 y 04b | Disyunción y totalidad se conservan y se comentan en el SQL como documentales; no hay columna discriminadora ni las otras tres estrategias del tema. |
| A-20 · V10 pp. 5–6 | Opciones → Documento → General: símbolos Relacional/IDEF1X; nombres conceptuales o físicos. | Disponible | R-16; «Opciones del documento conserva modo y notación como texto» | La notación vive en la pestaña Relaciones; los nombres conceptuales, en General. No hay «ambos nombres». |
| A-21 · V10 p. 6 | Opciones → Documento → Tabla: tipos de datos, claves, anotaciones, líneas verticales. | Parcial | R-16 | Tipos, PK/FK/AK y marca de requerido. Sin anotaciones ni líneas verticales. |
| A-22 · V10 p. 6 | Opciones → Documento → Relaciones: patas de cuervo, acciones referenciales, frase verbal, cardinalidad IDEF1X. | Parcial | R-16; «IDEF1X: FIPS184 figuras 1/4/5/6/7…» | Notación IDEF1X, patas de cuervo y flecha relacional; textos directo e inverso; cardinalidad numérica. No se dibujan las acciones referenciales. |
| A-23 · MS | Opciones → Controladores y orígenes ODBC. | Fuera de alcance | — | Sin conexión a bases de datos. |
| A-24 · MS | Opciones → Modelado: nombres de FK, propagación, sincronización. | Parcial | «Crear una relación migra toda la PK compuesta» | Nombres `FK_hija_padre` fijos; la sincronización conceptual/física se activa por tabla. |
| A-25 · MS | Ingeniería inversa de una base de datos existente. | Fuera de alcance | — | — |
| A-26 · MS | Actualizar modelo, tablas relacionadas e informes. | Fuera de alcance | — | «Revisar modelo» cubre la comprobación de coherencia; no hay informes. |
| A-27 · MS | Ventanas Código y Tipos definidos por el usuario. | Fuera de alcance | — | — |
| A-28 · F184 | Entidad IDEF1X: caja independiente o dependiente, separación de claves, FK dentro de la PK. | Disponible | R-13; «IDEF1X: FIPS184 figuras 1/4/5/6/7…» | — |
| A-29 · F184 | Vínculo IDEF1X: continuo/discontinuo, punto en el hijo, P/Z/1, rombo opcional del padre. | Disponible | R-13, R-14 | — |
| A-30 · V10 pp. 14–16 | Patas de cuervo con mínimo y máximo. | Disponible | R-16 | — |
| A-31 · MS | Visio no representa relaciones N:N en esta plantilla. | Alternativa propia | C-04 a C-09 | Chen permite N:N y ternarias y las materializa en una tabla asociativa con clave elegida. |
| A-32 · V10 p. 9 | Nombre conceptual sombreado en la cabecera (símbolos Relational). | Alternativa propia | R-16 | La cabecera alterna nombre físico o conceptual según General. |

## B. Interfaz general de Visio 2010

| ID · fuente | Función | Estado en DataBasic | Evidencia | Carencia o diferencia |
| --- | --- | --- | --- | --- |
| B-01 · POG | Cinta con pestañas y vista Backstage de Archivo. | Alternativa propia | R-01; «UI-01» | Pestañas Archivo, Inicio, Insertar, Diseño, Base de datos, Vista y Ayuda; Archivo es una pestaña de cinta, no una vista completa. |
| B-02 · POG | Barra de acceso rápido: guardar, deshacer, rehacer. | Disponible | R-20 | — |
| B-03 · POG | Ventana Formas con formas rápidas y búsqueda. | Parcial | R-02; «UI-01» | Tres o cuatro formas por representación; sin búsqueda de formas. |
| B-04 · POG | Arrastrar una forma al lienzo. | Disponible | «La aplicación arranca y permite crear…» | Entidad arrastrable; las demás se crean con un clic. |
| B-05 · POG | Conexión automática entre formas. | Alternativa propia | R-11 | Relación por selección de la tabla referenciada y la que recibe la FK. |
| B-06 · POG | Cuadrícula dinámica, ajuste y pegado. | Parcial | R-21, R-22 | Ajuste a 10 unidades y evitación de solapes; sin pegado a puntos de conexión. |
| B-07 · POG | Reglas y cuadrícula. | Parcial | R-36 | Cuadrícula activable; sin reglas. |
| B-08 · POG | Varias páginas y páginas de fondo. | Fuera de alcance | — | Un documento tiene dos representaciones, no páginas. |
| B-09 · POG | Tamaño de página automático. | Alternativa propia | R-32; «SVG usa los bounds comunes…» | El SVG y la impresión usan los límites de la escena. |
| B-10 · POG | Temas y estilos. | Fuera de alcance | — | Identidad visual fija de DataBasic. |
| B-11 · POG | Contenedores y llamadas. | Fuera de alcance | — | Notas por objeto en Propiedades. |
| B-12 · POG | Alinear y espaciar automáticamente; volver a distribuir. | Parcial | R-25, C-24 | Distribuir con Graphviz y deshacer; sin alineación selectiva. |
| B-13 · POG | Panorámica y zoom; control deslizante en la barra de estado; ajustar a la ventana. | Disponible | R-23, R-24 | Rueda, Ctrl + rueda, deslizador, Ajustar y 100 %. |
| B-14 · POG | Vista previa dinámica. | Fuera de alcance | — | — |
| B-15 · POG | Deshacer y rehacer de varios niveles. | Disponible | R-20, R-31 | Cien niveles por sesión. |
| B-16 · POG | Copiar, pegar y duplicar formas. | Disponible | R-26 | Sólo tablas relacionales; sin selección múltiple. |
| B-17 · POG | Imprimir y vista previa. | Parcial | R-32 | Imprimir/PDF usa la ventana del navegador y los límites de la escena. |
| B-18 · POG | Guardar como VSD/VDX, PDF, XPS, SVG, PNG. | Parcial (0.4.3) | R-18, R-19; Visio | JSON propio, SVG y dibujo XML de Visio 2010 (.vdx) del diagrama relacional; PDF por impresión. Sin VSD binario, VSDX ni PNG. El .vdx es un dibujo editable, no un «Diagrama de modelo de base de datos» con sus propiedades. |
| B-19 · POG | Validación de diagramas (Premium). | Alternativa propia | R-33, C-16 | «Comprobar» revisa claves, FKs, tipos y decisiones pendientes del modelo. |
| B-20 · POG | Publicación en SharePoint y Visio Services. | Fuera de alcance | — | Guardado local por navegador y práctica independiente por URL. |
| B-21 · POG | Formato de texto, relleno y línea por forma. | Fuera de alcance | — | — |
| B-22 · POG | Capas y agrupación. | Fuera de alcance | — | — |
| B-23 · POG | Atajos de teclado. | Disponible | R-31 | Ctrl+S, Ctrl+Z, Ctrl+Mayús+Z/Ctrl+Y, Ctrl+D, Supr y Escape. |
| B-24 · POG | Ortografía y buscar/reemplazar. | Fuera de alcance | — | — |
| B-25 · POG | Comentarios de revisión. | Alternativa propia | C-16, A-01 a A-07 | Notas y supuestos por objeto; la memoria del diseño los reúne. |

## C. Exigencias del curso (apuntes aportados)

| ID · fuente | Exigencia | Estado en DataBasic | Evidencia | Observación |
| --- | --- | --- | --- | --- |
| C-01 · ERE p. 2 | Entidad: rectángulo; entidad débil: rectángulo doble. | Disponible | C-13 | — |
| C-02 · ERE p. 2 | Relación: rombo; vínculo identificador de entidades débiles: rombo doble. | Disponible (0.4.1) | «El vínculo identificador dibuja rombo doble…» | El rombo doble aparece cuando la débil elige ese vínculo o la estrategia FK es identificadora. |
| C-03 · ERE p. 3 | Atributo, clave (subrayado), clave parcial (subrayado discontinuo), multivaluado (elipse doble), compuesto (componentes), derivado (discontinuo). | Disponible | C-03, C-13, C-14 | — |
| C-04 · ERE p. 4, P1 p. 3 | Letras 1/N de cardinalidad en cada rama, junto al rombo. | Disponible (0.4.1) | «Cada rama Chen lleva la letra 1/N…»; «La letra junto al rombo se elige…» | En una binaria es el máximo de la otra rama y se dibuja sola. En una ternaria es la cardinalidad por combinación de los otros roles (`one`/`many`) elegida en Varios; la rama sin decidir no muestra letra. |
| C-05 · ERE p. 4, T2 p. 12 | Restricción estructural (mín,máx) en cada participación. | Disponible | C-05 | — |
| C-06 · ERE p. 4 | Participación total: doble línea entre entidad y rombo. | Disponible | C-05, C-13 | Se dibuja cuando el mínimo es mayor que cero. |
| C-07 · T2 p. 8 | Roles en las relaciones, incluidas las recursivas. | Disponible | C-04, C-05; «La recursiva mantiene dos puertos…» | — |
| C-08 · T2 p. 8, P1 p. 3 | Relaciones binarias, ternarias y con atributos propios. | Disponible | C-07, C-12 | — |
| C-09 · ERE p. 5, T2 p. 16 | Especialización con círculo d/s, doble línea si total, arcos de subconjunto en las subclases. | Disponible (0.4.1) | C-15; «El vínculo identificador dibuja rombo doble y las subclases llevan el arco»; Ejemplos 04 | La transformación usa tablas de superclase y subclases; disyunción y totalidad quedan documentales. |
| C-10 · T2 pp. 11–13 | Restricciones de entidades, atributos, claves, estructurales y de integridad. | Disponible | R-07, R-08, R-13, R-15, C-06 | Las restricciones conceptuales no traducibles quedan documentales. |
| C-11 · P1 p. 3 | Relacional en Visio 2010 con IDEF1X: tablas, dominios, PK y AK, FK con dependencia, nulos, predeterminados, cardinalidades y acción referencial. | Disponible | R-03 a R-17 | El archivo de Visio no se genera; véase C-14. |
| C-12 · P1 p. 3 | Sólo VARCHAR, CHAR, NUMBER y DATE. | Disponible | R-04, R-35 | Perfil Curso · 4 tipos por defecto. |
| C-13 · P1 p. 4 | Ternaria N:N:N: tabla con las tres FK y sus atributos; la clave se adapta cuando se repite la combinación en distintos períodos. | Disponible | C-12 | Clave elegida explícitamente, incluido el período. |
| C-14 · P1 p. 4 | Entrega: documento del conceptual, archivo Visio del relacional y base de datos Access. | Parcial (0.4.4) | R-18, R-19, R-32, A-06; Visio; Access; Entrega | Archivo → Paquete de entrega reúne en un .zip la memoria Word con los datos del alumno, el .vdx del relacional con leyenda y página de diccionario de datos, y el módulo VBA, el SQL y el XML que Access convierte en la base de datos, con un LEEME de los pasos. Ni el .vdx lleva las propiedades de Visio ni se genera `.accdb`; la ejecución en Access y Visio 2010 reales queda por comprobar. |
| C-16 · P1 p. 2 §3.1, ERE p. 7 | Supuestos semánticos y semántica perdida razonados junto al grafo ERE. | Disponible (0.4.2) | A-01 a A-07; «La memoria reúne entidades, relaciones con letras, supuestos y semántica perdida» | Tres clases de entrada por objeto o globales; la memoria añade las restricciones documentales detectadas. La argumentación sigue siendo del autor. |
| C-15 · T2 p. 19 | Patrones incorrectos: entidad con entidad sin rombo, rombo con rombo, atributo sobre la línea. | Disponible | C-04, C-07 | Las relaciones siempre pasan por un rombo y los atributos cuelgan de la entidad o del rombo. |

## D. Defectos detectados y corregidos en esta revisión

1. Volver una relación de identificadora a no identificadora dejaba la FK
   dentro de la PK hija y bloqueaba la opción Opcional (R-14). Ahora la FK
   sale de la PK, salvo que otra relación identificadora la necesite.
2. Arrastrar una tabla por sus filas de columnas no la movía (R-21); sólo
   funcionaba desde el título. Ahora arrastrar una fila mueve su tabla y un
   clic sigue seleccionando la columna.
3. Revisar modelo mostraba cada aviso pendiente o documental dos veces (C-16).
4. Al seleccionar una especialización, el título de Propiedades mostraba
   «undefined» (C-15); la versión 0.4.0 lo corrigió en paralelo con el nombre
   de la superclase, que es el texto conservado.
5. Al abrir un documento, las lecturas situadas sobre la primera tabla
   quedaban ocultas bajo la barra de herramientas flotante (R-11).

## E. Carencias priorizadas

1. Las otras tres estrategias de transformación de jerarquías del Tema 3
   (una tabla por subclase, tabla única con discriminador y variantes),
   además de la de tablas de superclase y subclases ya disponible.
2. Columna discriminadora y símbolo de categoría IDEF1X en el relacional
   (A-03, A-19).
3. FK hacia una clave alternativa (A-14) y cardinalidad por rango (A-16).
4. Selección múltiple y alineación de formas (B-12, B-16).
5. Exportación PNG y PDF directa sin pasar por la impresión (B-18).
6. Notas en relaciones y cláusulas de comprobación de tabla (A-11, A-13).

Las entradas marcadas sin verificar en esta sesión deben contrastarse con la
documentación original de Microsoft cuando el entorno permita abrirla; la
matriz no afirma equivalencia total con Visio 2010.
