# DataBasic

Un modelador educativo de bases de datos que funciona en el navegador.
Microsoft Visio 2010 ha servido como referencia funcional y visual para esta
implementación independiente.

La versión **0.5.0** permite editar un documento con tres representaciones
progresivas: **Diagrama**, el entidad-relación con la notación de Chen;
**Relacional**, con IDEF1X; y **Tablas**, las tablas con sus tipos físicos,
propiedades y filas. Las transformaciones se eligen por separado y conservan
sus correspondencias. Cada tabla o elemento del diagrama puede llevar un color.

El espacio de trabajo se ordena de arriba abajo:

- La **barra de título** lleva el desplegable de la vista (Diagrama, Relacional,
  Tablas), el nombre del documento y tres botones que muestran u ocultan
  **Formas**, **SQL** y **Propiedades**, para que solo esté a la vista lo que
  hace falta.
- La **cinta** cambia con la vista: cada vista muestra sus propias pestañas
  (Insertar y Modelo en Diagrama; Insertar y Base de datos en Relacional;
  Crear y Datos en Tablas), además de Archivo, Inicio, Diseño, Vista y Ayuda.
- La **columna izquierda** reúne secciones plegables: Formas, Tablas y la
  Consola SQL; se ensancha arrastrando su borde.
- El **panel de propiedades** queda debajo del dibujo y puede ocultarse.

En la vista Tablas, la Hoja de datos admite filas de ejemplo y señala la celda o
la fila que incumple una regla de la tabla. El **asistente para formularios**
(Crear → Asistente para formularios) pregunta, como el clásico, la tabla o
consulta, los campos, la distribución (en columnas, tabular u hoja de datos) y
el título; el formulario recorre los registros uno a uno, guarda cada cambio con
las reglas de la tabla y se exporta con la base de datos.

Incluye PK y claves alternativas, FKs compuestas, tipos parametrizados,
dominios, valores predeterminados, acciones referenciales y relaciones N:N
y ternarias con roles y atributos. Materializa multivaluados simples/compuestos
como tablas auxiliares y jerarquías como tablas de superclase/subclases.
La cardinalidad ternaria por combinación tiene contexto explícito, separado
de la identidad de ocurrencia y de los mínimos/máximos de participación.
Los estados pendientes pueden guardarse;
no se presentan como transformaciones ya terminadas. Chen es una ampliación
educativa de DataBasic para el curso.

La grafía Chen sigue los apuntes del curso: letras 1/N junto al rombo,
pares (mín,máx) junto a cada entidad, doble línea de participación total,
rombo doble del vínculo identificador y arcos de subconjunto en las subclases.

Cada objeto tiene una categoría **Supuestos** para anotar la semántica del
enunciado, los supuestos propios y la semántica perdida; **Base de datos →
Supuestos** los reúne y **Archivo → Memoria (.docx)** descarga la memoria del
diseño con portada, los dos diagramas, las tablas de atributos y
relaciones con su tipo (1:1, 1:N, N:N, N:N:N), los supuestos, las restricciones
que el relacional no impone y el diccionario de datos. También hay versión HTML
y Markdown.

La **Consola SQL** (botón SQL de la barra de título, o la sección Consola SQL de
la columna izquierda) ejecuta el dialecto SQL de Access sobre las filas de ejemplo: consultas SELECT con combinaciones,
totales, subconsultas y UNION, que se muestran como hoja de datos y como
expresión de álgebra relacional (σ, π, ⋈, γ…); INSERT, UPDATE y DELETE, que
respetan claves, dominios, CHECK e integridad referencial con sus acciones
(CASCADE, SET NULL…); y CREATE, ALTER y DROP de tablas, índices y consultas.
Cada ejecución se deshace con Deshacer. **Datos de ejemplo** rellena las tablas
vacías con filas que cumplen esas reglas; todos los ejemplos traen ocho filas
por tabla.

**Archivo → Alumno** guarda el DNI o NIE (con su letra comprobada), el nombre y
los apellidos, y **Archivo → Paquete de entrega** comprueba el documento frente
al enunciado de la práctica y descarga `Practica_Apellidos_Nombre.zip` con la
memoria (.docx), el dibujo del relacional (.vdx, compatible con Visio 2010, con
leyenda y diccionario de datos), los archivos de la base de datos (compatibles
con Access), los diagramas en SVG, el proyecto y un `LEEME.txt` con los pasos
para crear la base de datos `.accdb`, que DataBasic no puede escribir.

**Archivo → Exportar** reúne todos los formatos por grupos (proyecto, modelo
relacional, base de datos y memoria). Los nombres de los programas solo
aparecen como detalle de compatibilidad junto a cada formato.

## Carpetas de proyecto

**Archivo → Guardar** descarga el proyecto como una carpeta dentro de un `.zip`
con el nombre del proyecto. Cada archivo se puede leer y cambiar por separado,
con cualquier editor o directamente en GitHub:

| Archivo | Qué es | Al abrir |
| --- | --- | --- |
| `esquema.sql` | Tablas, claves, dominios, relaciones, índices, consultas y filas, en el SQL de la consola. | **Manda** en tablas y datos. |
| `README.md` | La semántica: enunciado, supuestos semánticos y semántica perdida, una entrada por línea; debajo, los dibujos y las tablas. | **Manda** en los supuestos. |
| `proyecto.databasic.json` | Lo que el SQL no dice: diagrama entidad-relación, posiciones, colores, cardinalidades, diseño físico y formularios. | Completa lo demás. |
| `diagrama.svg`, `relacional.svg` | Los dos dibujos. | Se comprueban; se rehacen al guardar. |
| `relacional.vdx`, `base_de_datos.bas/.sql/.xml` | El dibujo editable y los archivos de la base de datos para otros programas. | Se comprueban; se rehacen al guardar. |

**Archivo → Abrir** lee la carpeta de tres maneras: el `.zip` (o un
`.databasic.json` suelto, como en versiones anteriores), la carpeta
descomprimida del equipo, o el enlace de una carpeta pública de GitHub (sin
cuenta). El nombre del proyecto es el de la carpeta. Al abrir se comprueba que
los archivos digan lo mismo:

- si `esquema.sql` y el JSON describen las mismas tablas y filas, se abre tal cual;
- si solo cambian las filas, mandan las del SQL;
- si cambia la estructura (por ejemplo, un campo añadido a mano en el SQL),
  manda el SQL y se conservan por nombre posiciones, colores, notas,
  cardinalidades, diseño físico, formularios y supuestos; el diagrama
  entidad-relación, que ya no describe esas tablas, se deja fuera con un aviso;
- con solo `esquema.sql`, las tablas se colocan en cuadrícula.

Un informe dice qué se hizo con cada archivo. Los ejemplos de `examples/` son
carpetas de este tipo: en GitHub, su README muestra los dos dibujos.

Arrastra las tablas desde su título o sus filas, los rombos en Chen o los
bloques de lectura en Relacional para recolocar las formas y relaciones. El arrastre busca hueco entre formas y rótulos;
las posiciones se guardan por vista. **Distribuir** vuelve a organizarlas
y **Deshacer** recupera la disposición anterior.

Empieza por la [guía del club de observación](docs/practice-guide.md):
un núcleo de tres entidades y [once carpetas editables](examples/README.md),
con puntos de partida pendientes y resultados para comparar. La
[matriz funcional](docs/functional-audit.md) distingue operaciones disponibles,
pruebas y carencias; los [requisitos del curso](docs/course-requirements.md)
explican el alcance académico y la [cobertura frente a Visio 2010](docs/visio-2010-coverage.md)
compara función por función la plantilla de Visio con DataBasic.

## Abrir la aplicación

Abre [DataBasic online](https://jultob.github.io/DataBasic/) en Safari,
Chrome o Firefox. No necesitas instalar nada ni iniciar sesión.
El [registro de verificación](docs/verification.md) identifica qué versión
se ha publicado y qué recorrido se ha probado en navegador.

Los ejercicios se guardan automáticamente en ese navegador. Descarga la
carpeta del proyecto con **Archivo → Guardar** para conservarla, llevarla a otro
equipo o subirla a tu repositorio. La aplicación funciona en tu navegador: no
envía tus diagramas a GitHub; solo lee de GitHub la carpeta pública que le
indiques en **Archivo → Abrir**.

Para usar una copia descargada, genera la entrega con `npm run build`
y abre `dist/index.html`. Si tu navegador restringe el guardado automático
en archivos locales, usa **Archivo → Guardar**.

Para servir el proyecto localmente con Node.js 22 o posterior:

```sh
npm start
```

Abre la dirección que muestra el comando. También puede usarse cualquier
servidor de archivos estáticos.

### Dos ejercicios en pestañas distintas

Conserva tu trabajo principal abierto y, en otra pestaña, abre
[una práctica independiente](https://jultob.github.io/DataBasic/?practica=laboratorio).
La dirección sin `practica` mantiene el guardado principal existente; la
práctica usa otro guardado local y no lee ni copia el principal.
El estado muestra **Práctica independiente · …**.

Usa un nombre distinto para cada ejercicio: `?practica=laboratorio`, por
ejemplo. Se admiten 1–64 caracteres ASCII: letras, números, `_` y `-`,
comenzando por letra o número. Dos pestañas con el mismo nombre comparten
ese guardado. Un nombre inválido desactiva el guardado automático sin tocar
el principal; **Archivo → Guardar** permite descargar la carpeta igualmente.

Es guardado local separado, sin sincronización entre equipos. Conserva
copias guardadas; para practicar sobre una copia del principal, guárdala y
ábrela mediante **Archivo → Abrir** en la pestaña independiente.

## Primer ejercicio

1. Abre **Archivo → Nuevo** y elige **Relacional** en el desplegable de la barra
   de título. El perfil de tipos (**Curso · 4 tipos**) está en
   **Archivo → Propiedades**.
2. Crea una **Entidad** y nómbrala en **Definición**.
3. Abre **Columnas** o haz doble clic sobre la entidad. Añade nombre, tipo,
   requerido y PK. El tipo se elige en una lista de tipos estándar por
   categoría; **Otro…** permite escribirlo. **Editar…** abre familia,
   parámetros, predeterminado y dominio.
4. Crea otra entidad. Pulsa **Relación**, primero la tabla referenciada (la de
   la clave primaria) y después la que recibirá la clave ajena (FK). Se
   incorpora la PK completa como FK.
5. Selecciona el conector y abre **Varios** para cardinalidad, dependencia
   y opcionalidad; usa **Acción referencial** para borrado y actualización.
6. Cambia a **Diagrama**. Las tablas anteriores aparecen como proyección
   parcial, sin inventar su diseño conceptual original. Puedes crear objetos nativos.
7. Guarda la carpeta con **Archivo → Guardar** y continúa con la
   [N:N y la ternaria de la guía](docs/practice-guide.md#relaciones-nn-y-ternarias).

La carpeta guardada se abre de nuevo con **Archivo → Abrir**. El documento
(`proyecto.databasic.json`) es de formato versión 2; se admiten documentos
versión 1 conservando sus tipos en el perfil General. El guardado automático
conserva el último ejercicio de cada práctica en ese navegador y ese origen;
no sincroniza equipos ni publica tus ejercicios. La dirección sin `practica`
conserva el guardado principal.

## Publicar en GitHub Pages

El repositorio incluye `.github/workflows/pages.yml`. La aplicación es estática,
usa rutas relativas y no depende de un servidor de bases de datos.

El repositorio público es [JulTob/DataBasic](https://github.com/JulTob/DataBasic).
Pages utiliza **GitHub Actions** como origen de publicación.
Cada cambio en `main` ejecuta **Verify and publish DataBasic**: comprueba
el código, pasa las pruebas y publica `dist/` si todo es correcto.

Puedes seguir la publicación en la pestaña **Actions**. La dirección pública
también aparece en **Settings → Pages** al terminar el despliegue.

Para publicar tu propia copia, sube estos archivos a un repositorio público,
elige **GitHub Actions** en **Settings → Pages → Build and deployment**
y ejecuta el flujo o sube un cambio a `main`.

No subas los apuntes del curso al repositorio como parte de la aplicación;
sus requisitos y referencias se documentan en `docs/course-requirements.md`.

## Comprobar y generar

No hace falta `npm install`: las tres bibliotecas del navegador están incluidas
con sus versiones y licencias en `public/vendor/`.

```sh
npm run check
npm test
npm run build
```

La salida para alojar está en `dist/`. La compilación combina un conjunto fijo
de módulos locales en un script clásico para permitir abrir también la
aplicación desde un archivo, sin un servidor ni un CDN.

## Estructura

| Carpeta | Responsabilidad |
| --- | --- |
| `src/domain/` | Modelo, operaciones atómicas, validación y formato de archivo. |
| `src/sql/` | El dialecto SQL de la consola: léxico, gramática, valores, consultas, cambios de datos y de esquema, filas de ejemplo. |
| `src/ui/` | Diagrama, cinta, paneles y ventanas. |
| `src/io/` | Archivos: carpeta de proyecto (SQL, README, JSON, ZIP, GitHub), SQL, dibujo .vdx, base de datos, memoria y paquete de entrega. |
| `src/app.js` | Interacciones, historial y guardado. |
| `tests/` | Reglas del modelo, ventanas y eventos de la aplicación. |
| `docs/` | Especificación, fuentes y resultados de verificación. |
| `public/vendor/` | Bibliotecas redistribuidas con sus avisos. |

El modelo usa identificadores estables para las referencias. Cada operación
valida sus obligaciones antes de aceptar el nuevo documento. Una operación
rechazada conserva el estado anterior y explica la causa.

## Límites de esta versión

- Las FKs referencian la PK completa; no pueden elegir una clave alternativa
  como destino. Las claves alternativas sí pueden crearse y exportarse.
- Los multivaluados requieren elegir su tabla auxiliar; una jerarquía requiere
  elegir tablas de superclase/subclases y resolver expresamente las PK locales.
  Disjunta/solapada y total/parcial se conservan como restricciones documentales.
  Las otras tres estrategias de jerarquías del tema no están implementadas.
- Las restricciones de participación se conservan por rol; una FK no impone
  todos los mínimos o máximos conceptuales. Las decisiones nuevas incompletas
  bloquean el SQL completo. Un archivo ternario anterior sin cardinalidad por
  combinación conserva su SQL; ese dato permanece desconocido documental.
- No hay ingeniería inversa de bases de datos reales, ODBC, triggers ni tipos
  objeto. La consola SQL ejecuta su propio intérprete sobre las filas de ejemplo.
- El SQL es una ayuda de estudio con sintaxis tipo PostgreSQL/SQL estándar;
  debe revisarse para el motor de clase. Una FK no obliga a que cada fila
  referenciada tenga filas que la referencien.
- __Archivo → Exportar → Dibujo relacional (.vdx)__ escribe el diagrama
  relacional como dibujo XML compatible con Visio 2010: grupos por tabla, conectores pegados y marcas IDEF1X o
  patas de cuervo. Es un dibujo editable, no un «Diagrama de modelo de base de
  datos» con las propiedades de Visio. No se abren archivos de Visio ni se
  generan VSD binario, VSDX o bases de datos Access. JSON, SVG, SQL y la
  impresión/PDF sirven para practicar y conservar trabajo; no sustituyen por
  sí solos los formatos de la entrega académica.
- __Archivo → Exportar → Base de datos__ entrega tres archivos compatibles con
  Access que la convierten en la base de datos, derivados del relacional y del
  diseño físico: un módulo VBA con DAO que la crea entera (tablas, propiedades,
  claves, relaciones con integridad y cascadas, campos de búsqueda), un SQL de
  Access de una instrucción por consulta y un XML con esquema para Datos
  externos. No se genera `.accdb`; los archivos no se han ejecutado en Access
  desde el entorno de desarrollo.
- Abrir desde GitHub solo lee carpetas de repositorios públicos: GitHub admite
  60 consultas por hora sin cuenta desde una misma red. Una rama con barras en
  el nombre se reconoce hasta tres partes (`curso/2026/x`).
- La [especificación](docs/specification.md) concreta los contratos y límites;
  la verificación automatizada no acredita equivalencia total con Visio 2010.

## Licencia y derechos

Las contribuciones originales de DataBasic se ofrecen bajo la
[licencia MIT](LICENSE). La finalidad educativa describe el proyecto y no
limita los usos permitidos por esa licencia, incluidos los comerciales.
Las bibliotecas conservan sus propias licencias.

Consulta la [página de licencias y derechos](legal.html) y el
[aviso de derechos](NOTICE.md) para conocer el alcance y las referencias a
terceros. La interfaz adopta una identidad visual de DataBasic, con superficies
planas y acentos verdes, conservando el flujo de modelado. La diferenciación
visual y estos avisos no certifican ausencia de derechos ajenos o reclamaciones.
El [estado de la revisión](docs/intellectual-property.md) explica sus límites.

## Bibliotecas y fuentes

- [Lucide](https://lucide.dev/), iconos.
- [idb-keyval](https://github.com/jakearchibald/idb-keyval), guardado en IndexedDB.
- [Viz.js / Graphviz](https://viz-js.com/), distribución automática del diagrama.
- [Versiones, licencias y código fuente de terceros](public/vendor/THIRD-PARTY.md).
- [Fuentes de Visio 2010 y trazabilidad funcional](docs/specification.md#fuentes).

Microsoft Visio y Microsoft Office son marcas de Microsoft.
DataBasic no está afiliado a Microsoft ni cuenta con su patrocinio o respaldo.
