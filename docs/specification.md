# DataBasic 0.4.3 — especificación funcional

DataBasic permite practicar modelado relacional y conceptual en el navegador.
Conserva rutas de propiedades reconocibles de Visio 2010 y una identidad
visual propia. **Chen es una ampliación educativa de DataBasic**; no se
atribuye esa función a Visio 2010 ni se promete equivalencia completa.

La [guía](practice-guide.md) describe operaciones; la
[matriz funcional](functional-audit.md) enlaza fuentes, controles y pruebas.
La [cobertura frente a Visio 2010 y al curso](visio-2010-coverage.md)
recorre función por función qué existe, qué es parcial y qué falta.
Los resultados de ejecución y publicación están en
[verificación](verification.md).

## Documento y representaciones

La aplicación 0.4.3 escribe documentos `.databasic.json` de **formato 2**.
Un documento conserva tablas, columnas, FKs, objetos conceptuales nativos,
correspondencias e información de presentación por representación.

| Operación | Resultado y obligación |
| --- | --- |
| Abrir formato 1 | Promueve a formato 2 con perfil General; conserva tablas, tipos, IDs, FKs y opciones. No reconstruye intención conceptual desconocida. |
| Relacional / Chen | Cambia la representación sin crear tablas, elegir claves ni reconstruir objetos. Las posiciones Chen son independientes de las relacionales. |
| Proyección de tablas existentes | Muestra una interpretación parcial tabla/columna/FK, identificada como proyección. No colapsa tablas puente ni deduce entidades débiles, multivaluados o jerarquías. |
| Crear concepto nativo | Conserva identidad propia y hechos declarados. Una relación puede dibujarse y guardarse pendiente de transformación. |
| Materializar relación | Exige estrategia y clave cuando corresponda; registra tabla/FKs y sus orígenes en una operación. |
| Editar propiedad compartida | Nombres, tipos y notas compatibles se propagan mediante correspondencias, conservando referencias. Una edición estructural ambigua se rechaza y remite al origen. |
| Guardar, deshacer y rehacer | Conserva el documento completo y las posiciones; el rechazo de una operación no deja cambios parciales. |

No hay una inversa universal entre ERE y relacional. Los nombres conceptual y
físico de una tabla son propiedades de ese objeto; alternarlos en Opciones
del documento no crea un modelo ERE. Relacional tampoco significa que ya se
haya implementado una base de datos física en un SGBD.

## Ventanas y controles

| Selección o ruta | Contenido |
| --- | --- |
| Barra superior | Desplegable Vista (Diagrama, Relacional, Tablas), desplegable Tipos (Curso o General) y acceso a revisión. Ayuda → Ejemplos lista `examples/index.json` más el ejemplo integrado. |
| Tabla → Definición | Nombre físico y conceptual, sincronización y espacio de nombres. Propietario/origen se muestran sin edición; no hay ingeniería inversa. |
| Tabla → Columnas | Nombre, tipo, requerido, PK y notas; agregar, quitar, editar y reordenar. El tipo se elige en una lista de tipos estándar agrupados por categoría (texto, numérico, temporal, lógico, datos en bruto y otros) y filtrada por perfil; el valor actual se conserva aunque no sea estándar y «Otro…» descubre un cuadro para escribirlo. |
| Columnas → Editar… | Familia, longitud o precisión/escala, predeterminado y dominio declarativo. |
| Tabla → Identificador principal | Selección de una o varias columnas PK. |
| Tabla → Índices / Claves alternativas | Índices separados de las claves candidatas alternativas; creación, edición y eliminación. |
| FK → Definición / Nombre | Correspondencia de todos los componentes PK/FK y textos de lectura. |
| FK → Varios | Cardinalidad y dependencia: filas que referencian por fila referenciada, identificación y si la clave ajena admite nulos. Volver a no identificadora saca la FK de la PK de la tabla que referencia, salvo que otra relación identificadora la necesite. El vocabulario sigue al curso (tabla referenciada, clave ajena), no el padre/hijo de Visio. |
| FK → Acción referencial | Acción al borrar la fila referenciada o actualizar su clave. |
| Chen → Relación | Dos o tres participaciones, entidad, rol, mínimo/máximo y letra 1/N por rama. Puede repetirse una entidad en roles distintos. |
| Relación nativa → Atributos / Varios / Correspondencias | Atributos propios; roles y límites; elección de estrategia y clave. |
| Chen → Atributo / Especialización | Tipología y dominio de atributos; superclase, subclases, disyunción y totalidad. La transformación puede seguir pendiente. |
| Vista → Opciones de visualización | General, Tablas y Relaciones; nombres, tipos, claves, requerido, notación y textos. |
| Cualquier objeto → Supuestos | Entradas de semántica del enunciado, supuesto semántico o semántica perdida vinculadas a ese objeto; Añadir supuesto… abre el diálogo con el objeto preseleccionado. |
| Base de datos → Supuestos | Visión general por clase, con las restricciones documentales que detecta DataBasic, y acceso a editar cada entrada. |
| Archivo → Memoria HTML / Markdown | Memoria del diseño generada del documento; el HTML incrusta los dos diagramas. |

El término **Varios** se conserva por continuidad con Visio 2010; su contenido
explica la decisión concreta. Una **Vista SQL** es un objeto consulta, distinto
de las representaciones Relacional/Chen.

## Tipos, claves e integridad

- Un documento nuevo usa **Curso · 4 tipos**: VARCHAR, CHAR, NUMBER y DATE.
  El perfil General conserva los tipos adicionales de documentos anteriores.
  Cambiar de perfil no convierte datos ni tipos silenciosamente; una
  incompatibilidad se informa para resolverla.
- VARCHAR/CHAR admiten longitud positiva. NUMBER admite precisión 1–38 y
  escala −84–127; DATE no lleva parámetros. Los límites NUMBER son una
  decisión de implementación documentada, no una regla atribuida al profesor.
- Cada columna PK es requerida. Una clave alternativa tiene identidad y
  conjunto de columnas propios; sus columnas se hacen requeridas y el SQL
  declara UNIQUE. Un índice único no se presenta automáticamente como AK.
- Las FKs referencian la PK completa de la tabla referenciada. La creación evita
  reutilizar la PK propia de la tabla que referencia solo por tener el mismo nombre; advierte cuando una
  clave única limita efectivamente a uno lo dibujado como muchos.
- Una FK identificadora integra sus columnas en la PK de la tabla que referencia. Una entidad
  débil ERE necesita además propietaria, clave parcial y vínculo elegido;
  no se deduce solo por encontrar una FK identificadora.
- SET NULL necesita columnas FK anulables; SET DEFAULT, predeterminados.
  La aplicación valida la estructura declarada, no la existencia de datos
  que hagan válido el predeterminado en un motor real.
  Las acciones se editan en la FK física concreta, incluidas las generadas;
  se conservan al rematerializar su origen. Su estructura sigue protegida.
- Los dominios conservan mínimo, máximo, valores permitidos y condición
  adicional. Se traducen a CHECK cuando corresponden a columnas almacenadas.
  Una expresión libre se conserva como SQL del autor; no se ejecuta ni se
  demuestra que represente la regla de negocio deseada.

## Transformación conceptual

| Construcción | Alcance 0.4.3 |
| --- | --- |
| Entidad y atributo simple | Tabla/columna trazadas; atributos propios de relación se materializan con su relación. |
| Binaria mediante FK | Lado receptor explícito compatible con máximo uno de esa participación; se conservan restricciones residuales. |
| N:N o ternaria | Tabla asociativa con una FK por participación. Clave elegida entre claves participantes y atributos simples almacenados; admite un período que distinga ocurrencias. La cardinalidad ternaria por combinación se decide por rol y tiene contexto global o por atributos, separado de la PK. |
| Recursiva | Participaciones y roles con identidades distintas aunque compartan entidad. |
| Débil | Definición permite propietaria y vínculo; el atributo marca clave parcial y la materialización binaria permite identificación. La PK heredada se combina con la parcial. |
| Compuesto | Descomposición explícita y componentes de entidad o relación. No se infiere una agrupación por parecido de nombres. |
| Derivado | El editor permite omitir o almacenar; regla de derivación documental, sin evaluarla ni generar fórmula SQL. |
| Multivaluado simple/compuesto | Decisión `multivalued-table` con nombre elegido; tabla auxiliar con PK propietaria completa + valor/componentes y FK completa. Se retira la copia escalar; referencias incompatibles se rechazan sin pérdida. |
| Especialización | Decisión `class-tables`: tabla de superclase y tablas de subclases, cada una con PK completa heredada que también es FK. Una PK local incompatible exige decisión explícita; desmarcar Clave conserva su columna. Disyunción y totalidad permanecen documentales. No se implementan las otras tres estrategias. |

Los pares Chen se leen en la rama de **esa entidad y ese rol**: cuántas
ocurrencias de la relación admite una ocurrencia de la entidad. No se copian
sin más los marcadores PK/FK. Los pares de una ternaria no expresan por sí
solos todas sus restricciones posibles; se conservan también las notas.
En ternarias, `cardinality:'one'` genera una AK con las FKs completas de los
otros roles y `cardinalityContextAttributeIds` elegido expresamente: `[]`
para global o atributos simples almacenados y requeridos para contexto.
`many` no añade ese máximo. La PK de ocurrencia no elige el contexto.

Los archivos anteriores sin `cardinality` conservan su SQL y desconocimiento
documental. Una decisión nueva con roles sin decidir o rama `one` sin contexto
queda pendiente; no se exporta una unicidad ficticia. Las operaciones rechazan
estrategias desconocidas, trazas ajenas, jerarquías vacías/cíclicas y artefactos
incoherentes. Repetir una decisión conserva IDs y no duplica tablas ni claves.

Los [ejemplos editables](../examples/README.md) y sus
[pruebas de archivos reales](../tests/examples.test.js) concretan estos contratos.

La grafía Chen sigue la introducción al ERE del curso: la **letra 1/N** junto
al rombo es la razón de cardinalidad de esa rama. En una binaria se deduce
como el máximo de la otra participación y no se edita; en una ternaria es la
cardinalidad por combinación de los otros roles (`cardinality` `one`/`many`
elegida en Varios) y mientras no se decide la rama no muestra letra. La
**participación total** (mínimo mayor que cero) se dibuja con doble línea. El **vínculo identificador** de una entidad débil, o una estrategia FK
identificadora, dibuja el rombo doble. En una especialización, el círculo
muestra `d` o `s`, la doble línea indica totalidad y cada subclase lleva el
arco de subconjunto abierto hacia el círculo.

## Supuestos y memoria del diseño

Un **supuesto** es una afirmación de diseño con tres clases, las de la
introducción al ERE del curso: `enunciado` (lo que dice el texto), `supuesto`
(lo que el autor decide porque el texto no lo dice) y `perdida` (lo que el
modelo no impone). Cada entrada tiene identidad, texto de hasta 2000
caracteres y un `elementId` opcional que apunta a una entidad, atributo,
relación, participación, especialización, tabla, columna o clave foránea. Se
guarda en la lista opcional `assumptions` del formato 2; los archivos sin esa
lista abren sin cambios. Una entrada con clase desconocida, texto vacío o
elemento inexistente se rechaza; al borrar el elemento, la entrada conserva el
texto y pasa a ser global. Las notas por objeto siguen siendo un campo
distinto: describen el objeto, no afirman una decisión.

La **memoria del diseño** se deriva del documento, nunca se almacena. Un
modelo de informe con secciones de párrafos, listas y tablas reúne entidades y
atributos (tipo, identidad, tipología y dominio), relaciones (roles, pares,
letra de cardinalidad, atributos propios y decisión de transformación),
especializaciones, la semántica reflejada, los supuestos, la semántica
perdida (entradas del autor más las restricciones documentales y decisiones
pendientes que detecta la revisión) y el esquema relacional resultante. Dos
renderizadores dan formato: Markdown y HTML; el HTML incrusta los diagramas
Chen y relacional en SVG y Word lo abre. La memoria no redacta la
justificación ni demuestra fidelidad al enunciado: reúne lo que el autor
escribió y lo que el modelo contiene.

## Dibujo, archivos y SQL

IDEF1X distingue entidades independientes/dependientes, vínculos
identificadores/no identificadores, opcionalidad y cardinalidad del lado de la FK.
La grafía se contrasta con FIPS 184; no es una etiqueta aplicada a patas de
cuervo. Estas últimas y la flecha relacional siguen siendo opciones separadas.
Tipos completos, nombres y marcadores alimentan los mismos límites para
ajuste, SVG e impresión. La revisión en navegador sigue su registro propio.

El rombo Chen y el bloque de lecturas de una FK se arrastran. Una tabla se
arrastra desde su título o desde cualquiera de sus filas; un clic sin
movimiento sobre una fila selecciona esa columna. La posición
resuelta evita las cajas de otras formas y rótulos; incluye el aviso de una
relación pendiente. Las etiquetas Chen consideran también las otras ramas
y las generalizaciones. Las guías permanecen unidas a su conector. No se
pretende eliminar todos los cruces entre líneas.

Las posiciones de bloques FK se guardan en el mapa opcional
`presentation.relational`, separado de `presentation.chen`; los documentos
formato 2 anteriores sin ese mapa siguen abriendo. Mover no cambia claves,
participaciones ni SQL. El arrastre sólo se confirma al soltar; Escape o la
cancelación del puntero lo descartan. Un clic abre las propiedades sin cambiar
la geometría. Al abrir un documento, la vista deja visibles los rótulos
situados justo encima de la primera forma, bajo la barra flotante. Distribuir recoloca los nodos y reinicia las posiciones manuales
de los bloques relacionales en una operación que puede deshacerse.
Las posiciones Chen antiguas se conservan hasta moverlas o distribuirlas.

Guardar/abrir JSON, exportar SVG, exportar el dibujo de Visio 2010 y
mostrar/descargar SQL son operaciones disponibles; Imprimir/PDF utiliza la
ventana del navegador. El guardado local
no sincroniza equipos. El SQL de estudio usa sintaxis tipo PostgreSQL/SQL
estándar y traduce NUMBER a NUMERIC; no se ejecuta en DataBasic. Restricciones
documentales aparecen como comentarios; decisiones pendientes bloquean la
exportación completa. Una FK sola no exige que toda fila referenciada tenga filas que la referencien.

## Dibujo de Visio 2010

__Archivo → Visio 2010__ descarga `<nombre>.vdx`, el formato XML nativo de
Visio 2010 (DatadiagramML), con el diagrama relacional aunque esté abierta la
vista Chen. La escena es la misma que dibuja el lienzo: cada tabla es un
grupo con un texto por bloque (título, etiquetas PK/FK/AK, nombre y tipo de
cada columna, línea bajo la clave primaria y cuerpo con esquinas redondeadas
en las entidades dependientes); cada clave ajena es un conector 1-D pegado a
puntos de conexión de los dos grupos, discontinuo si no es identificadora,
y sus marcas (punto del lado de la FK, rombo de la referencia opcional, código
P/Z/1, patas de cuervo) viajan en una segunda forma pegada a los mismos
puntos con línea continua. Los rótulos de lecturas y cardinalidad se
exportan con su fondo y su guía. Las opciones de visualización (tipos,
claves, obligatoriedad, notación) se respetan.

Los píxeles de la escena se convierten a pulgadas (96 por pulgada) con el eje
vertical invertido y la página toma el tamaño de los límites del diagrama.
El resultado es un dibujo editable: Visio mueve cada tabla como una unidad y
los extremos de los conectores siguen a los puntos de conexión. No es un
«Diagrama de modelo de base de datos» de Visio con sus propiedades de base de
datos, y no se generan VSD binario ni VSDX; Visio 2013 y posteriores abren
el `.vdx` pero ya no lo guardan.

## Capa física y archivos para Access

La capa física describe el modelo relacional con el vocabulario de la vista
Diseño de tabla de Access: tipo de datos (Texto corto, Texto largo, Número con
su tamaño Byte/Entero/Entero largo/Simple/Doble/Decimal, Fecha/Hora, Moneda,
Autonumeración, Sí/No, Objeto OLE, Hipervínculo), tamaño, posiciones
decimales, requerido, permitir longitud cero, indexado, regla y texto de
validación, valor predeterminado, título, descripción y formato; y, por
relación, exigir integridad referencial, actualizar y eliminar en cascada y el
campo de búsqueda (tabla referenciada, columna mostrada, clave oculta).

**Todo se deriva** del relacional: VARCHAR(n)/CHAR(n) son Texto corto de
tamaño n (Texto largo por encima de 255), NUMBER sin parámetros es Entero
largo, NUMBER(p) es Entero hasta 4 dígitos y Entero largo hasta 9, los
decimales y BIGINT son Doble, DATE es Fecha/Hora y BOOLEAN es Sí/No; NOT NULL
es Requerido; el dominio (mínimo, máximo, lista) es la regla de validación del
campo con un texto de validación redactado, y el CHECK libre pasa a la regla de
validación de la tabla; el valor predeterminado SQL se traduce a expresión de
Access (`'x'` → `"x"`, `CURRENT_DATE` → `Date()`); una FK es una relación con
integridad referencial, cascadas según las acciones referenciales y, si tiene
una sola columna, un campo de búsqueda que muestra la primera columna de texto
de la tabla referenciada con la clave oculta.

El documento guarda sólo las **sobrescrituras** en la sección opcional
`physical` (mapas `columns`, `relationships` y `tables` por identificador);
los archivos anteriores abren como totalmente derivados. Las operaciones
`updatePhysicalColumn`, `updatePhysicalRelationship` y `updatePhysicalTable`
son atómicas, rechazan claves o valores desconocidos y restauran el valor
derivado al recibir `null`; al eliminar el elemento, sus sobrescrituras
desaparecen. La validación exige que cada entrada apunte a un elemento vivo y
que la columna mostrada por una búsqueda pertenezca a la tabla referenciada.

Lo que Access no expresa se declara como aviso (`accessStatus`): SET NULL y
SET DEFAULT se exportan como acción restringida, BIGINT y los decimales como
Doble, los textos de más de 255 caracteres como Texto largo, las claves ajenas
compuestas sin campo de búsqueda y las vistas como consultas guardadas por
revisar.

**Archivo → Access** ofrece tres archivos sobre la misma capa física, porque
Access no abre ningún formato de archivo que lleve las relaciones y su `.accdb`
no puede escribirse desde el navegador:

- **Módulo VBA con DAO** (`.bas`): en una base de datos en blanco, Alt+F11 →
  Archivo → Importar archivo y ejecutar `CrearEsquema`. Crea las tablas con
  sus campos y propiedades, la clave principal, los índices únicos, las
  relaciones con integridad y cascadas, los campos de búsqueda y las consultas
  de las vistas. Se niega a ejecutarse si alguna tabla ya existe.
- **SQL de Access** (`.sql`): una instrucción por consulta en la Vista SQL
  (CREATE TABLE con NOT NULL, PRIMARY KEY y UNIQUE; CREATE INDEX; ALTER TABLE
  ADD CONSTRAINT FOREIGN KEY con las cascadas, que requieren la sintaxis
  ANSI 92). Lo que SQL no fija en Access (reglas, predeterminados, búsquedas,
  consultas) se lista al final para hacerlo en la vista Diseño.
- **XML con esquema** (`.xml`): para Datos externos → Archivo XML, con el
  esquema incrustado que Access entiende (`od:jetType`, `od:index`,
  `od:fieldProperty`). Crea las tablas con tipos, claves, índices y
  propiedades; Access no importa relaciones, que se dibujan después en la
  ventana Relaciones como enseña el curso.

DataBasic no ejecuta Access: los tres archivos se comprueban por estructura y
contenido, y su apertura real en Access queda para el usuario.

## Vista Tablas

El documento tiene tres representaciones progresivas: **Chen**, **Relacional**
y **Tablas** (`display.mode` admite `chen`, `relational` y `tables`). La vista
Tablas no es un modelo aparte: dibuja las mismas tablas y relaciones del
relacional, con sus mismas posiciones, como las muestra la ventana Relaciones
de Access (cabecera con el nombre, llave junto a la clave principal, tipo de
Access bajo cada campo, extremos 1 e ∞ y línea discontinua si no se exige
integridad referencial). Mover una tabla en Tablas la mueve en Relacional.

El panel de propiedades antepone en esa vista las categorías **Campos de
Access** (cuadrícula de nombre, tipo, tamaño y descripción, y debajo las
propiedades generales del campo seleccionado: formato, posiciones decimales,
título, valor predeterminado, regla y texto de validación, requerido,
permitir longitud cero e indexado), **Tabla de Access** (descripción, regla y
texto de validación de la tabla, con la clave y los índices derivados) y
**Relación en Access** (exigir integridad referencial, actualizar y eliminar en
cascada, tipo de relación derivado, campo de búsqueda con la columna mostrada
y la clave oculta). Cada propiedad indica si está «derivada» o «ajustada», y
Restablecer elimina las sobrescrituras del elemento. Las categorías
relacionales siguen disponibles; al volver a Relacional o Chen se recuperan.

La memoria del diseño añade la sección «Diseño físico en Access» (campos con
tipo, tamaño, requerido, indexado, regla y predeterminado por tabla, y las
relaciones con integridad, cascadas y búsqueda) y, en «Semántica perdida», la
lista de lo que Access expresa de otra manera.

No se admiten VSD/VDX/VSDX, bases de datos Access, ODBC, ingeniería inversa,
triggers, ejecución de consultas o colaboración. Las vistas SQL conservan
consulta y columnas; no incluyen un editor visual de consultas.

## Fuentes

- [Microsoft, Definition, aplicable a Visio 2010](https://support.microsoft.com/en-us/visio/database-properties-for-entity-and-view-shapes-definition): nombres y sincronización.
- [Microsoft, integridad referencial, aplicable a Visio 2010](https://support.microsoft.com/en-us/visio/preserve-referential-integrity-in-database-model-diagrams): acciones y predeterminado.
- [DeVry, Creating Entity Relationship Diagrams in MS Visio, 2011, 18 páginas](https://lms.devry.edu/lms/CourseExport/files/4c59b998-a778-4673-b5b5-1040a4a59543/documents--Creating_ERD_in_MS_Visio_2010.pdf): pp. 5–9 y 14–16, opciones y propiedades. Su ejemplo utiliza Crow’s Foot.
- [FIPS PUB 184, NIST, 21-12-1993, copia oficial GovInfo](https://www.govinfo.gov/app/details/GOVPUB-C13-986bf8b12a4fed44eb78fca0bb55d668): §§3.1.2, 3.1.3 y 3.5.2, figuras 1 y 4–7. Define símbolos, no controles de Visio.
- [Materiales y requisitos del curso](course-requirements.md): páginas y restricciones académicas.
- [Licencias y derechos](intellectual-property.md): alcance de la revisión existente; esta especificación funcional no amplía esa revisión.

## Color de los elementos

Una tabla, una entidad, un atributo o una relación del diagrama pueden llevar
un color: un tono del espectro (0 a 360) elegido con un deslizador en
Definición, o ningún color. El borde toma el tono y el interior un tinte casi
blanco del mismo tono; la cabecera de la vista Tablas, un tinte algo más
intenso. El color viaja en `color` (entero o `null`) y los archivos sin él
abren igual. Una entidad nativa y su tabla comparten el color; una entidad
proyectada muestra el de su tabla. El SVG lo lleva como variables CSS y el
dibujo de Visio como colores hexadecimales. El lienzo admite posiciones entre
-20000 y 20000 en cada eje, de modo que todo el área visible acepta formas.

## Hoja de datos

En la vista Tablas, una tabla tiene la categoría **Hoja de datos**: una
cuadrícula con una fila por registro de ejemplo y una celda por columna, como
la hoja de datos de Access. Las filas se guardan en la sección opcional `data`
del documento (por identificador de tabla, cada fila un mapa de identificador
de columna a texto; un texto vacío es NULL y no se guarda), con un máximo de
500 filas por tabla y 500 caracteres por celda. Los archivos sin la sección
abren con hojas vacías; al eliminar una columna o una tabla desaparecen sus
celdas o sus filas. Las operaciones son atómicas: añadir fila, cambiar una
celda, quitar fila y reemplazar la hoja.

Cada celda y cada fila se contrastan con las reglas de la tabla y se
devuelven como avisos (`dataStatus`), nunca como errores que impidan guardar:
obligatoriedad (NOT NULL y clave primaria), formato del tipo (número, entero,
dígitos y decimales de NUMBER(p,s), longitud de VARCHAR/CHAR, fecha
AAAA-MM-DD, hora, fecha y hora, sí/no), dominio (mínimo, máximo, lista de
valores), unicidad de la clave primaria, de las claves alternativas y de los
índices únicos, y existencia de cada clave ajena completa en la tabla
referenciada. El CHECK libre y la regla de validación de Access no se evalúan.
La cuadrícula marca la celda o la fila con el aviso, Revisar modelo los lista
junto a los demás y la memoria los recoge en «Datos de ejemplo».

Las filas viajan a Access con los tres archivos: el módulo VBA las inserta en
`CrearDatos` con `db.Execute`, el SQL de Access las escribe como INSERT tras
las relaciones y el XML las incluye en `dataroot`, en los tres casos con las
tablas referenciadas antes que las que las referencian y con la notación de
Access (números tal cual, fechas entre `#` o con hora `T00:00:00`, sí/no como
True/False o 1/0, textos entre comillas dobles).
