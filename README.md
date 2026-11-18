# DataBasic

Un modelador educativo de bases de datos que funciona en el navegador.
Su espacio de trabajo combina una cinta de herramientas propia de cada vista,
formas a la izquierda y un panel de propiedades inferior. Microsoft Visio 2010
ha servido como referencia funcional y visual para esta implementación independiente.

La versión **0.6.1** reúne cuatro vistas del mismo proyecto. **Diagrama** permite construir el modelo conceptual en notación de Chen. **Relacional** muestra sus tablas, claves y relaciones con las convenciones de Visio. **Tablas** permite editar campos y filas con el vocabulario de Access. **Consultas** ejecuta álgebra relacional y SQL sobre esas filas. Al cambiar de vista, la cinta muestra las herramientas de ese entorno.

### Biblioteca UMH antes de abrir

[Abre la práctica de la biblioteca](https://jultob.github.io/DataBasic/?practica=biblioteca-umh-catalogo). El catálogo contiene **65 obras, 55 autores, 66 ediciones y 88 ejemplares** repartidos entre los cuatro campus. Se describen por separado la autoría de la obra, cada edición y la ubicación física de sus copias. **CampusMateria** registra los intereses temáticos de un campus y **LibroMateria**, las materias asignadas a cada obra. Una copia puede estar en un campus con otros intereses. El nombre de los cuatro campus procede de la universidad. El inventario, las signaturas y los perfiles temáticos se han preparado para la práctica. [Ubicación de las bibliotecas de la UMH](https://biblioteca.umh.es/presentacion/informacion-general/localizacion/) · [Catalogación en la convocatoria estatal](https://www.boe.es/buscar/doc.php?id=BOE-A-2025-26893).

1. Lee **Enunciado**. Crea socios y préstamos en Diagrama. Decide cómo distinguir dos préstamos sucesivos de la misma copia y materializa la decisión en **Correspondencias**.
2. En **Tablas → Hoja de datos**, comprueba los registros del catálogo y añade los tuyos. El ejercicio y los editores de consultas se guardan en el documento.
3. En **Consultas**, escribe una expresión a la izquierda o una consulta SQL a la derecha. Se pueden insertar campos y operadores con teclado, clic o arrastre. En **Operadores**, activa **Rellenar con mis tablas** para insertar una fórmula con nombres y valores de tu proyecto cuando haya un ejemplo compatible. **Ejecutar selección** evalúa una subexpresión completa. El resultado conserva los duplicados de SQL y distingue el valor nulo.
4. **Nuevo reto** elige una fórmula y la vincula a los campos, datos y relaciones actuales. En **Familia de retos** se puede elegir una operación. Ambas respuestas se contrastan con el resultado de referencia sobre esas filas. **Consulta libre** permite explorar y comparar resultados propios. **Herramientas → SQL del esquema** abre las declaraciones de creación.

La consola ejecuta consultas de lectura en SQLite, dentro del navegador y en una copia temporal de los datos. Las operaciones de conjuntos, las fechas y algunas funciones se escriben de manera diferente en Access. El archivo ACCDB se verifica en Access cuando el objetivo del ejercicio es el comportamiento de ese motor.

Para averiguar qué autores firman más de una obra, abre **Consultas → Familia de retos → Preguntas de la biblioteca** o ejecuta esta consulta en el editor SQL. Cuenta las obras asociadas a cada persona una sola vez aunque haya varios ejemplares o ediciones de un libro.

```sql
SELECT Autor.nombre, COUNT(DISTINCT Autoria.libro_id) AS obras
FROM Autor
JOIN Autoria ON Autoria.autor_id = Autor.id
GROUP BY Autor.id, Autor.nombre
HAVING COUNT(DISTINCT Autoria.libro_id) > 1
ORDER BY obras DESC, Autor.nombre
```

Los registros científicos incluyen sus coautorías y conservan los títulos de la edición consultada. [Fuentes del catálogo](docs/catalogo-fuentes.md).


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
En una ternaria, la letra indica cuántos participantes de esa rama pueden
asociarse con una pareja fija de los otros dos. Si el máximo es uno, una
anotación indica si se aplica globalmente o al fijar atributos adicionales
como el período. También identifica un ámbito pendiente de decidir.

Cada objeto tiene una categoría **Supuestos** para anotar la semántica del
enunciado, los supuestos propios y la semántica perdida; **Base de datos →
Supuestos** los reúne y **Archivo → Memoria Word** descarga la memoria del
diseño (.docx) con portada, los dos diagramas, las tablas de atributos y
relaciones con su tipo (1:1, 1:N, N:N, N:N:N), los supuestos, las restricciones
que el relacional no impone y el diccionario de datos. También hay versión HTML
y Markdown.

**Archivo → Alumno** conserva la identificación para la portada.
En **Archivo → Paquete de entrega**, la edición local genera un ZIP con la memoria
Word, el dibujo IDEF1X en VDX y la base Access en ACCDB. La descarga de fuentes
reúne además los diagramas SVG, el proyecto y los exportadores VBA, SQL y XML.

### Crear archivos de Microsoft Office en la edición local

1. Instala Node.js 22 o posterior y Java 17 o posterior. Desde la carpeta
   de DataBasic ejecuta `npm start` y abre la dirección local que se indica.
2. Abre tu proyecto. En **Archivo → Access → Descargar base de datos** puedes
   guardar un ACCDB. Para generarlo desde la línea de órdenes ejecuta
   `node scripts/export-accdb.mjs modelo.databasic.json salida.accdb`.
   El exportador guarda consultas SELECT sobre las tablas locales, con alias,
   combinaciones por igualdad, filtros y agrupaciones. Si una consulta requiere
   otra construcción SQL, el exportador indica cómo continuar mediante VBA/DAO.
3. **Dibujo Visio (.vdx)** genera el dibujo editable con su diccionario.
   **Plantilla Visio 2010** prepara en el equipo local un kit para la plantilla
   **Diagrama de modelo de base de datos**. Extráelo en Windows con Visio 2010
   Professional o Premium. Si conviven varias versiones, abre primero Visio
   2010 y después ejecuta el asistente. Sigue sus instrucciones para importar
   la base, elegir IDEF1X, comprobar las propiedades y guardar el VSD.
   El asistente coteja las formas de entidad y vista, sus columnas declaradas
   visibles y las conexiones entre tablas. En las propiedades de Visio,
   comprueba las cardinalidades y contrasta el SQL y el orden de las columnas
   de cada vista con su consulta guardada de Access.
   El modelo con propiedades nativas se materializa al completar ese paso en Visio.

La aplicación estática y GitHub Pages mantienen los exportadores de navegador.
El servidor de la edición local usa la interfaz de bucle local. La generación del
ACCDB y del kit se realiza en el equipo que contiene el proyecto.

Arrastra las tablas desde su título o sus filas, los rombos en Chen o los
bloques de lectura en Relacional para recolocar las formas y relaciones. El arrastre busca hueco entre formas y rótulos;
las posiciones se guardan por vista. **Distribuir** vuelve a organizarlas
y **Deshacer** recupera la disposición anterior.

Empieza por la [guía del club de observación](docs/practice-guide.md):
un núcleo de tres entidades y [once archivos editables](examples/README.md),
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

Los ejercicios se guardan automáticamente en ese navegador. Descarga una
copia con **Archivo → Guardar** para conservarla o llevarla a otro equipo.
La aplicación funciona en tu navegador: no envía tus diagramas a GitHub.

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
el principal; **Archivo → Guardar** permite descargar JSON igualmente.

Es guardado local separado, sin sincronización entre equipos. Conserva
copias JSON; para practicar sobre una copia del principal, descarga su JSON
y ábrelo mediante **Archivo → Abrir** en la pestaña independiente.

## Primer ejercicio

1. Abre **Archivo → Nuevo**. Conserva **Relacional** y **Perfil → Curso · 4 tipos**.
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
6. Cambia a **Chen**. Las tablas anteriores aparecen como proyección parcial,
   sin inventar su diseño conceptual original. Puedes crear objetos nativos.
7. Descarga una copia con **Archivo → Guardar** y continúa con la
   [N:N y la ternaria de la guía](docs/practice-guide.md#relaciones-nn-y-ternarias).

Los archivos propios terminan en `.databasic.json`. Se pueden abrir de nuevo
en **Archivo → Abrir**. El formato actual es versión 2; admite documentos
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
| `src/ui/` | Diagrama, cinta, paneles y ventanas. |
| `src/io/` | Generación de SQL y de la memoria del diseño. |
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
- La aplicación de navegador ejecuta SQL de consulta mediante SQLite. La ingeniería inversa de Access para el VSD se completa en Visio 2010.
- El SQL de creación del esquema sigue sintaxis tipo PostgreSQL/SQL estándar;
  debe revisarse para el motor de clase. Una FK no obliga a que cada fila
  referenciada tenga filas que la referencien.
- El VDX conserva formas editables, conectores IDEF1X y diccionario.
  La plantilla relacional y sus propiedades requieren completar la importación
  en Visio para Windows.
- La edición local produce ACCDB mediante Jackcess. El archivo puede comprobarse
  con un segundo lector como MDB Tools. Las rutas VBA, SQL y XML siguen disponibles
  en la edición estática.

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
