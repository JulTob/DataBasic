# DataBasic

Un modelador educativo de bases de datos que funciona en el navegador.
Su espacio de trabajo combina menús superiores, herramientas flotantes,
formas a la izquierda y un panel de propiedades inferior. Microsoft Visio 2010
ha servido como referencia funcional y visual para esta implementación independiente.

La versión **0.4.4** permite editar un documento con tres representaciones
progresivas: **Diagrama**, el entidad-relación con la notación de Chen;
**Relacional**, con IDEF1X; y **Tablas**, las mismas tablas como las verá
Access, con sus tipos y propiedades. El desplegable Vista cambia la
representación; las transformaciones se eligen por separado y conservan sus
correspondencias. Ayuda → Ejemplos abre los ejercicios de la carpeta
`examples/`, y cada tabla o elemento del diagrama puede llevar un color. En la
vista Tablas, la Hoja de datos admite filas de ejemplo y señala la celda o la
fila que incumple una regla de la tabla; las filas viajan a Access.

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
Supuestos** los reúne y **Archivo → Memoria Word** descarga la memoria del
diseño (.docx) con portada, los dos diagramas, las tablas de atributos y
relaciones con su tipo (1:1, 1:N, N:N, N:N:N), los supuestos, las restricciones
que el relacional no impone y el diccionario de datos. También hay versión HTML
y Markdown.

**Archivo → Alumno** guarda el DNI o NIE (con su letra comprobada), el nombre y
los apellidos, y **Archivo → Paquete de entrega** comprueba el documento frente
al enunciado de la práctica y descarga `Practica_Apellidos_Nombre.zip` con la
memoria Word, el Visio del relacional (con leyenda y diccionario de datos), los
archivos de Access, los diagramas en SVG, el proyecto y un `LEEME.txt` con los
pasos para crear la base de datos `.accdb`, que DataBasic no puede escribir.

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
- No hay ingeniería inversa, ODBC, ejecución SQL, triggers ni tipos objeto.
- El SQL es una ayuda de estudio con sintaxis tipo PostgreSQL/SQL estándar;
  debe revisarse para el motor de clase. Una FK no obliga a que cada fila
  referenciada tenga filas que la referencien.
- __Archivo → Visio 2010__ escribe el diagrama relacional como dibujo XML de
  Visio 2010 (`.vdx`): grupos por tabla, conectores pegados y marcas IDEF1X o
  patas de cuervo. Es un dibujo editable, no un «Diagrama de modelo de base de
  datos» con las propiedades de Visio. No se abren archivos de Visio ni se
  generan VSD binario, VSDX o bases de datos Access. JSON, SVG, SQL y la
  impresión/PDF sirven para practicar y conservar trabajo; no sustituyen por
  sí solos los formatos de la entrega académica.
- __Archivo → Access__ entrega tres archivos que Access convierte en la base
  de datos, derivados del relacional con el vocabulario de la vista Diseño de
  Access: un módulo VBA con DAO que la crea entera (tablas, propiedades,
  claves, relaciones con integridad y cascadas, campos de búsqueda), un SQL de
  Access de una instrucción por consulta y un XML con esquema para Datos
  externos. No se genera `.accdb`; los archivos no se han ejecutado en Access
  desde el entorno de desarrollo.
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
