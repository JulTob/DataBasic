# Guía de práctica de DataBasic 0.3

Trabajamos con ejemplos propios de un pequeño laboratorio. Cada recorrido
termina con algo que comprobar. Conviene descargar una copia antes de empezar
otro ejercicio con **Archivo → Guardar**.

**Relacional** y **Chen** son representaciones del mismo documento. El primero
sirve para practicar tablas y propiedades con rutas reconocibles de Visio
2010; Chen es una ampliación educativa de DataBasic. Cambiar de representación
no convierte automáticamente todo el modelo ni recupera intención desconocida.

## Crear una tabla con tipos, PK, AK y dominio

**Situación.** Queremos describir equipos: un código interno, un número de
serie único, una fecha de alta y un coste no negativo.

1. Usa **Archivo → Nuevo**. En la barra superior conserva **Relacional** y
   **Perfil → Curso · 4 tipos**.
2. Pulsa **Entidad** en Formas. En **Definición**, escribe `Equipo` como nombre.
3. Abre **Columnas** o haz doble clic en la tabla. Renombra la columna inicial
   a `codigoEquipo`; conserva **PK**. PK implica requerido.
4. Usa **Agregar** para cada columna y **Editar…** para elegir:

   | Columna | Familia y parámetros | Decisión |
   | --- | --- | --- |
   | codigoEquipo | NUMBER, sin parámetros explícitos | PK. |
   | serie | CHAR, longitud 12 | Identificador alternativo. |
   | fechaAlta | DATE | Requerido. |
   | coste | NUMBER, precisión 8, escala 2 | Requerido; mínimo de dominio 0. |

5. Para `coste`, fija **Valor predeterminado (expresión SQL)** a `0` solo si
   esa es la regla del ejemplo. En **Dominio declarativo**, indica mínimo `0`.
   No escribas comillas alrededor de un predeterminado numérico.
6. Abre **Índices / Claves alternativas → Clave alternativa…**, nómbrala
   `AK_Equipo_serie` y elige `serie`. La columna pasa a ser requerida.
7. Usa **Base de datos → Ver SQL** o **Archivo → SQL** para revisar la
   declaración; el SQL de estudio no se ejecuta en la aplicación.

**Qué comprobar.** El dibujo y las propiedades conservan tipos completos;
`serie` figura como AK, distinta de PK y de un índice único. El SQL contiene
la PK, UNIQUE para la AK, NOT NULL, DEFAULT y CHECK del coste. DataBasic no
demuestra que el conjunto elegido sea una clave mínima del negocio: eso hay
que justificarlo.

El perfil del curso ofrece VARCHAR, CHAR, NUMBER y DATE. Longitud corresponde
a caracteres; precisión y escala, a números; DATE no lleva parámetros. El
selector General permite trabajar con tipos anteriores. Cambiar de perfil no
convierte silenciosamente tipos incompatibles.

## Conectar padre e hijo y leer Varios

**Situación.** Cada equipo puede registrar varias revisiones. Una revisión
pertenece a un equipo; en una variante provisional puede desconocerse ese equipo.

1. En **Relacional**, crea `Revision`, con su propia PK `codigoRevision`.
2. Pulsa **Relación** en Formas. Selecciona primero `Equipo` y después `Revision`.
3. Selecciona el conector. En **Definición**, comprueba los componentes de la
   PK principal y sus columnas FK secundarias. La PK completa del padre migra.
4. Abre **Varios**. En **Cardinalidad y dependencia**, elige **Cero o más**:
   describe cuántas revisiones puede tener un equipo.
5. En **El hijo tiene un padre**, **Opcional** significa que una revisión puede
   existir sin equipo. Desmárcalo para exigir equipo a cada revisión.
6. En **Tipo de relación**, distingue **Identificadora** de **No identificadora**.
   Identificadora incorpora la FK a la PK hija; no significa por sí sola que
   el diseño conceptual original fuera una entidad débil. Volver a No
   identificadora saca la FK de la PK hija y permite de nuevo marcarla Opcional.
7. Abre **Acción referencial** para elegir qué ocurre al borrar el padre o
   actualizar su clave. Prueba SET NULL solo con FK anulable; SET DEFAULT
   necesita predeterminados. Para conservar el caso obligatorio, usa NO ACTION
   o la política que hayas justificado.

**Qué comprobar.** La identidad propia de `Revision` no se reutiliza como FK
solo por coincidir su nombre con el del padre. La opción de muchos no contradice
una clave única sobre toda la FK. Una PK compuesta que contiene la FK como
parte no limita por ello a un único hijo.

Una FK no nula exige padre a cada hijo; no exige hijos a cada padre. Para
practicar una PK compuesta, marca varias columnas PK en **Columnas** o en
**Identificador principal** y comprueba que todas migran al conectar.

## Elegir IDEF1X y pasar a Chen

**Situación.** Queremos ver la misma relación en dos representaciones y leer
sus límites sin intercambiar los extremos.

1. Abre **Vista → Opciones de visualización → Relaciones → Notación → IDEF1X**.
   Las alternativas Patas de cuervo y Flecha relacional son opciones diferentes.
2. En **Tablas**, activa **Tipos de datos** y **Claves primarias y foráneas**.
   En Relaciones puedes mostrar cardinalidad numérica y textos.
3. Lee IDEF1X: caja rectangular para identidad independiente y esquinas
   redondeadas para dependiente; vínculo identificador continuo y no
   identificador discontinuo. El punto está en el hijo; sin letra significa
   0..N, `P` significa 1..N, `Z` significa 0..1 y `1`, exactamente uno.
   El rombo hueco del lado padre indica la variante no identificadora opcional.
4. Pulsa **Chen** en la barra superior. Las tablas creadas en Relacional se
   muestran como **proyección parcial**; una tabla con dos FKs sigue siendo tabla.
5. En nuestro caso, si Equipo tiene cero o muchas revisiones y Revision admite
   cero o un equipo, lee **Equipo (0,N)** y **Revision (0,1)** junto a sus ramas.
   Junto al rombo aparecen las letras de la razón de cardinalidad: **1** en la
   rama de Equipo y **N** en la de Revision, como en los apuntes del curso.
6. Vuelve a **Relacional**. Mueve una forma y alterna de nuevo para comparar las
   disposiciones independientes. Usa **Deshacer** y **Rehacer** para revisar un cambio.

**Qué comprobar.** Alternar no crea tablas, elige claves ni pierde atributos.
En Chen, cada par indica cuántas ocurrencias de esa relación admite una
ocurrencia de **esa entidad en ese rol**. No es el marcador del extremo opuesto
copiado desde la FK. Las guías finas unen los rótulos desplazados con la rama
de su participación. **General → Nombres conceptuales** solo alterna nombres
de tablas: es una opción diferente del botón Chen.

## Recolocar relaciones

**Situación.** El rombo o las lecturas de una relación dificultan leer el dibujo.

1. En **Chen**, arrastra el rombo; en **Relacional**, arrastra el bloque que
   contiene las lecturas directa e inversa.
2. Suelta cerca del hueco deseado. La aplicación evita las cajas de otras
   figuras y rótulos. Las guías mantienen la referencia a su conector.
3. Usa **Deshacer** para recuperar la posición anterior o **Escape** antes
   de soltar para cancelar el arrastre.
4. **Distribuir** organiza el dibujo de nuevo, incluidos los rótulos movidos
   a mano; también puede deshacerse.

**Qué comprobar.** Guardar y reabrir conserva las posiciones por vista.
Las claves y participaciones permanecen iguales. Las líneas de un grafo
pueden cruzarse aunque las cajas y los rótulos se mantengan separados.

## Relaciones N:N y ternarias

### Una N:N con atributo propio

**Situación.** Una persona puede inscribirse en varias actividades; una actividad
admite varias personas. Suponemos una sola inscripción por pareja.

1. En **Chen**, crea las entidades nativas `Persona` y `Actividad`. Revisa sus
   atributos clave iniciales en **Atributos**.
2. Pulsa **Relación**. Pon `Inscripcion`, grado **Binaria**, elige ambas entidades
   y sus roles. Para este ejemplo usa mínimo `0` y máximo `N` en ambas ramas.
   Deja la **letra junto al rombo** en automática: en una binaria es el máximo
   de la otra rama, aquí `N` en ambas.
3. Acepta. La relación puede guardarse **pendiente**; todavía no tiene tabla asociativa.
4. Selecciona el rombo → **Atributos → Agregar atributo…**. Elige la relación
   como propietario y crea `fechaAlta` con tipo DATE.
5. Vuelve al rombo → **Correspondencias → Elegir clave y materializar…**.
6. Elige **Tabla asociativa · N:N / ternaria**, nombre `Inscripcion`, y marca
   las claves de ambos roles en **Identidad de cada ocurrencia**. En este ejemplo
   la fecha no identifica: la regla impide repetir la pareja.
7. Pulsa **Materializar** y cambia a Relacional.

**Qué comprobar.** Hay una tabla de inscripción con ambas FKs, PK compuesta y
`fechaAlta`. Chen conserva un rombo con su atributo y sus roles. Una tabla puente
heredada no se convierte automáticamente en esta relación nativa.

### Una ternaria que puede repetirse por período

**Situación.** Un técnico usa un equipo en un proyecto. La misma terna puede
repetirse en meses diferentes, y registramos horas en cada mes.

1. En un documento de práctica, crea `Tecnico`, `Equipo` y `Proyecto` en Chen.
2. Pulsa **Relación**, nombre `UsoMensual`, grado **Ternaria**. Elige los tres
   participantes y roles `operador`, `recurso` y `contexto`.
3. Declara mínimos/máximos por rama según el supuesto del ejemplo; para una
   prueba sin obligatoriedad, usa `(0,N)` en las tres. Elige la **letra junto
   al rombo** de cada rama (`1` o `N`): en una ternaria no se deduce de los
   pares, la decides tú y puedes cambiarla después en **Varios**. Anota la
   regla del mes en **Notas**: esos pares no describen por sí solos toda
   restricción ternaria.
4. En **Atributos**, crea `periodo` de tipo DATE y `horas` de tipo NUMBER(6,2).
   Para el ejemplo, acordamos usar el primer día de cada mes como período.
5. En **Correspondencias → Elegir clave y materializar…**, elige tabla asociativa
   `UsoMensual`. Marca las claves de los tres roles **y `periodo`** como identidad.
6. Materializa y abre Relacional. Revisa la tabla, sus tres FKs y la PK elegida.

**Qué comprobar.** La misma terna puede aparecer en meses distintos. No se ha
impuesto una PK de solo tres FKs ni sustituido la ternaria por tres binarias.
El formato DATE no impone por sí solo «primer día del mes»: esa regla necesita
justificación y, si se implementa, una restricción adecuada al motor.

Una recursiva se crea como relación binaria eligiendo la misma entidad en ambos
participantes y roles distintos, por ejemplo `supervisor` y `supervisado`.
Comprueba que cada rol conserva su propio par y su propia rama.

## Elegir una FK binaria o una entidad débil

**Situación.** Cada puesto de ensayo tiene módulos numerados dentro del puesto;
el número de módulo puede repetirse en puestos diferentes.

1. En Chen crea `Puesto` y `Modulo`. Selecciona `Modulo` → **Definición**:
   marca **Entidad débil** y elige `Puesto` como **Entidad propietaria**.
2. Edita el atributo identificador de `Modulo`: nómbralo `numero`, desmarca
   **Clave** y marca **Clave parcial**. No inventes unicidad global del número.
3. Crea la relación `Contiene` con `Puesto` `(0,N)` y `Modulo` `(1,1)`.
4. En el rombo → **Correspondencias → Elegir clave y materializar…**, elige
   **FK binaria · elegir lado receptor**, receptor `Modulo`, y marca
   **Identificadora · incorpora la FK a la clave hija**.
5. En `Modulo` → **Definición → Vínculo identificador**, elige `Contiene`.
   El rombo de `Contiene` pasa a dibujarse doble, como el vínculo identificador
   de los apuntes.
6. Abre la revisión del modelo y vuelve a Relacional para inspeccionar la PK/FK.

**Qué comprobar.** La PK de Modulo reúne identidad del puesto y número parcial;
la FK apunta a Puesto y participa en la PK hija. El origen conceptual conserva
propietaria y clave parcial. Para una binaria no identificadora, elige el lado
receptor compatible y deja desmarcada identificación; no añadas debilidad.

## Compuestos, derivados y construcciones pendientes

**Situación.** Queremos conservar más información conceptual que una lista plana
de columnas.

1. En un atributo nuevo, elige **Estructura → Compuesto**, nombre `ubicacion`,
   y **Traducción del atributo → Compuesto · descomponer en componentes**.
2. Añade `edificio` y `sala` al mismo propietario. En cada uno elige
   **Componente de → ubicacion**. Define sus tipos simples.
3. Añade un atributo derivado `antiguedad`: marca **Derivado**, escribe la regla
   y elige **Derivado · omitir columna** o **Derivado · almacenar valor sin calcularlo**.
4. Para explorar multivaluados, marca **Multivaluado** en otro atributo. Para una
   jerarquía, pulsa **Especialización**, elige superclase/subclases y si es
   disjunta y total. Guarda una copia separada de este ejercicio.
5. Usa **Ayuda → Revisar modelo**, **Base de datos → Comprobar** o el estado
   de la barra superior. **Ver origen** lleva al objeto que requiere decisión.

**Qué comprobar.** Los componentes simples son columnas; el atributo compuesto
conserva su agrupación conceptual. La derivación no se calcula: omitir no crea
columna y almacenar no genera una fórmula automática. Multivaluados y jerarquías
se conservan **pendientes** y bloquean SQL completo; no hay una conversión
relacional implementada para ellos. Guardar el trabajo pendiente sigue permitido.

## Guardar, recuperar y llevar el trabajo a otro equipo

**Situación.** Queremos conservar el ejercicio completo, incluidas sus decisiones
pendientes y las dos disposiciones.

1. Pon nombre con **Archivo → Nombre** y descarga **Archivo → Guardar**.
2. Abre la copia con **Archivo → Abrir**. Revisa tipos, clave elegida, roles,
   notas y posiciones en ambos modos.
3. Usa **Archivo → Imagen SVG** para la representación activa o
   **Imprimir / PDF** para abrir la impresión del navegador.
4. Si no quedan decisiones que bloqueen SQL, abre **Archivo → SQL** y descarga
   el resultado desde esa ventana. Revísalo para el motor elegido.
5. Antes de borrar datos del navegador, cambiar de equipo o abrir otro origen,
   conserva el JSON descargado. El guardado automático solo recupera el último
   ejercicio de la práctica activa en ese navegador y origen.

**Qué comprobar.** El JSON es el respaldo editable: SVG y PDF no conservan el
documento para reabrirlo. Los archivos de formato 1 se abren como perfil General
sin convertir tipos ni deducir un ERE original. No se importan/exportan VSD,
VDX, VSDX ni bases de datos Access.

## Abrir otra práctica sin cambiar el guardado principal

**Situación.** Queremos probar otro ejercicio en una pestaña nueva conservando
el trabajo actual.

1. Deja abierta la pestaña principal y descarga una copia con **Archivo → Guardar**.
2. En otra pestaña abre
   [DataBasic con práctica laboratorio](https://jultob.github.io/DataBasic/?practica=laboratorio).
3. Comprueba el indicador **Práctica independiente · …**. Esta dirección tiene
   su propio guardado local; no lee ni copia el principal.
4. Para ensayar sobre el mismo diagrama, usa **Archivo → Abrir** en la práctica
   independiente y selecciona el JSON descargado.
5. Usa otro nombre para otro ejercicio. El nombre admite 1–64 caracteres ASCII
   —letras, números, `_` y `-`— y empieza por letra o número. Volver al mismo
   nombre recupera su guardado; dos pestañas con ese nombre lo comparten.

**Qué comprobar.** La dirección sin `practica` sigue recuperando el principal;
la otra conserva su ejercicio separado sin cambiar el formato del JSON.
Un nombre inválido no lee ni escribe guardados, aunque permite descargar JSON.
Esta separación es local, sin sincronización: sigue siendo necesario conservar
copias con **Archivo → Guardar**.

## Comprobar la transferencia a Visio 2010

Repite sin mirar la guía una tabla con PK, una FK y una decisión de nulos.
Después localiza en Visio 2010 **Definition, Columns, Primary ID, Indexes,
Miscellaneous y Referential Action** —sus rótulos dependen del idioma— y
explica la dirección de la referencia y qué restricción no impone una FK.
El tutorial de 18 páginas muestra el recorrido de propiedades. La construcción
Chen y las correspondencias nativas son la ampliación educativa de DataBasic.

La [matriz](functional-audit.md) distingue pruebas automatizadas y carencias;
el [registro de verificación](verification.md) identifica las comprobaciones
reales de navegador y publicación. Completar esta guía no acredita por sí solo
equivalencia total con la herramienta ni aceptación de los formatos académicos.

## Fuentes

- [Microsoft: nombres y definición, aplicable a Visio 2010](https://support.microsoft.com/en-us/visio/database-properties-for-entity-and-view-shapes-definition).
- [Microsoft: acciones referenciales y predeterminados, aplicable a 2010](https://support.microsoft.com/en-us/visio/preserve-referential-integrity-in-database-model-diagrams).
- [DeVry: tutorial de Visio 2010, 18 páginas](https://lms.devry.edu/lms/CourseExport/files/4c59b998-a778-4673-b5b5-1040a4a59543/documents--Creating_ERD_in_MS_Visio_2010.pdf), pp. 5–9 y 14–16.
- [FIPS PUB 184, NIST, copia oficial GovInfo](https://www.govinfo.gov/app/details/GOVPUB-C13-986bf8b12a4fed44eb78fca0bb55d668), figuras 1 y 4–7.
- [Requisitos del curso y fuentes](course-requirements.md), especialmente separación de modelos y semántica perdida.
