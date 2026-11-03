# Guía de práctica de DataBasic 0.4.0

El _club de observación_ presta instrumentos y organiza sesiones. El núcleo
usa sólo tres entidades: `Persona`, `Instrumento` y `Sesion`. Cada ampliación
es una copia independiente; no hace falta reunirlas en un dibujo enorme.
Los supuestos son propios de este ejemplo, sin reproducir la práctica del curso.

Descarga el archivo de cada etapa y ábrelo con __Archivo → Abrir__.
En GitHub, abre el enlace y usa __Download raw file__ para descargar el JSON.
Conserva tu trabajo con __Archivo → Guardar__ antes de abrir otra etapa.
Para practicar aparte, abre [una práctica independiente](https://jultob.github.io/DataBasic/?practica=club-observacion)
y comprueba el indicador __Práctica independiente__.

| Etapa | Archivo editable | Punto de control |
| --- | --- | --- |
| 0 | [Núcleo](../examples/00-nucleo.databasic.json) | 3 entidades, 1 relación; cuatro familias de tipos, PK, AK y dominio. |
| 1 | [N:N con atributo](../examples/01-nn.databasic.json) | `Habilitacion`, 2 FKs y PK de la pareja. |
| 2 | [Ternaria pendiente](../examples/02-ternaria-pendiente.databasic.json) · [resultado](../examples/02-ternaria-resuelta.databasic.json) | `Utilizacion`, 3 FKs, instante en PK y contexto explícito. |
| 3 | [Multivaluados pendientes](../examples/03-multivaluados-pendiente.databasic.json) · [resultado](../examples/03-multivaluados-resuelto.databasic.json) | `Etiquetas` y `Calibraciones`; PK propietaria compuesta completa. |
| 4 | [Jerarquía pendiente](../examples/04-jerarquia-pendiente.databasic.json) · [resultado](../examples/04-jerarquia-resuelta.databasic.json) | Rechazo de PK local, corrección y PK/FK heredada. |
| 4b | [Solapada y parcial](../examples/04b-jerarquia-solapada-parcial.databasic.json) | Misma estrategia; restricciones residuales diferentes. |
| 5 | [Entidad débil](../examples/05-debil.databasic.json) | `Puerto` identificado por instrumento y número local. |
| 6 | [Compuestos, derivado y recursiva](../examples/06-compuestos-recursiva.databasic.json) | Componentes de entidad y relación; dos roles de Persona. |

Los archivos son documentos de formato 2 con IDs fijos. El ejemplo pendiente
permite practicar la decisión; el resultado sirve para comparar. Abrir el
resultado no demuestra haber ejecutado la transformación desde los controles.
Las [pruebas del ejemplo](../tests/examples.test.js) leen estos archivos reales,
comprueban sus correspondencias y repiten las decisiones mediante el modelo.
El [registro de verificación](verification.md) separa esa evidencia del navegador
y de la publicación.

## 0. Reconocer tipos, identidad y una binaria

_Situación._ Cada sesión tiene una persona coordinadora. Una persona puede
coordinar ninguna o varias sesiones. Cada instrumento tiene código, serie
única, fecha de alta y valor no negativo.

1. Abre __Núcleo__ y conserva __Perfil → Curso · 4 tipos__.
2. En __Chen__, selecciona `Instrumento` → __Atributos__. Revisa los atributos.
   Cambia a __Relacional__ y abre __Columnas__ para comparar:

   | Atributo | Tipo | Regla |
   | --- | --- | --- |
   | Persona.codigoPersona | NUMBER | PK. |
   | Persona.nombre | VARCHAR(60) | Requerido. |
   | Instrumento.codigoInstrumento | NUMBER | PK. |
   | Instrumento.serie | CHAR(12) | AK y requerido. |
   | Instrumento.fechaAlta | DATE | Requerido. |
   | Instrumento.valor | NUMBER(8,2) | Requerido, mínimo 0, predeterminado `0`. |
   | Sesion.codigoSesion | NUMBER | PK. |
   | Sesion.fecha | DATE | Requerido. |

3. En `Instrumento` → __Índices / Claves alternativas__, comprueba
   `AK_Instrumento_serie`; no es la PK ni sólo un índice único.
4. En __Columnas__, selecciona `valor` → __Editar…__. Revisa precisión,
   escala, predeterminado y mínimo de dominio. Cierra sin cambiar la regla.
5. Selecciona `Coordina` en Chen: `coordinadora` tiene `(0,N)` y `sesion`
   tiene `(1,1)`. En __Correspondencias__, el receptor FK es `Sesion`.
6. Vuelve a Relacional. La columna `coordinadora_codigoPersona` es FK requerida;
   no forma parte de la PK de Sesion. Abre __Archivo → SQL__.

_Resultado esperado._ Hay tres tablas y una FK Persona→Sesion. El SQL contiene
PK, `UNIQUE ("serie")`, `DEFAULT 0`, `CHECK ("valor" >= 0)` y `NOT NULL`.
`NUMBER(8,2)` se exporta como `NUMERIC(8,2)`.

_Qué comprobar y escribir._ Explica por qué `serie` es candidata según el
supuesto. La FK requerida exige coordinadora para cada sesión; no exige que
toda persona coordine sesiones. Una clave mínima de negocio requiere tu
justificación, además de las marcas del programa.

### Acciones referenciales de Coordina

_Situación._ Queremos que borrar una persona coordinadora elimine sus sesiones
según una política explícita, sin cambiar la estructura de la relación.

1. Guarda una copia del núcleo. En __Relacional__, selecciona el conector FK
   de `Coordina`, desde Persona hacia Sesion, y abre __Acción referencial__.
2. En __Al eliminar el padre__, elige __CASCADE__. En __Al actualizar su
   clave__, conserva __NO ACTION__. Revisa __Archivo → SQL__: debe contener
   `ON DELETE CASCADE` y `ON UPDATE NO ACTION` para esa FK.
3. En la misma FK, intenta __SET NULL__. Debe rechazarse: la coordinadora
   es obligatoria y su FK no admite nulos. CASCADE debe seguir elegido.
4. Usa __Deshacer__ y __Rehacer__; guarda y reabre. Selecciona la FK y pulsa
   __Editar origen Chen__. Vuelve a materializar la misma decisión de Coordina;
   la política debe conservarse.
5. Para recuperar la política inicial, selecciona otra vez la FK física
   y cambia __Al eliminar el padre__ a __NO ACTION__.

_Qué comprobar y escribir._ Las acciones se eligen en la FK física concreta,
también cuando proviene de una tabla auxiliar o de una jerarquía. La estructura
generada se sigue editando desde su origen Chen. No se borran filas dentro de
DataBasic: se comprueba la política declarada y su SQL.

### Practicar 1:1 y acciones compatibles en otra copia

_Situación._ Queremos comprobar restricciones sin cambiar el núcleo descargado.

1. Guarda una copia. En Chen crea `Responsabiliza` entre Persona e Instrumento
   con `(0,1)` en ambas ramas. En __Correspondencias → Elegir clave y
   materializar…__, elige __FK binaria · elegir lado receptor__, Instrumento,
   sin identificación. Comprueba en SQL la FK anulable y su `UNIQUE`.
2. Para comparar acciones con una FK opcional, crea en __Relacional__ dos
   tablas de prueba `Padre` y `Hijo` con sus PK. Pulsa
   __Relación__, primero Padre y después Hijo.
3. Selecciona el conector → __Varios__. Conserva padre opcional y relación no
   identificadora. En __Acción referencial__, prueba __SET NULL__; revisa el SQL.
4. Cambia a padre obligatorio. SET NULL debe rechazarse con explicación.
   Conserva una copia previa para comprobar que el rechazo no pierde datos.
5. Prueba __SET DEFAULT__ sin predeterminado: debe rechazarse. En Columnas de
   Hijo, asigna a la FK un predeterminado numérico; vuelve a intentarlo.
6. Compara __NO ACTION__ y __CASCADE__ en borrado/actualización. Descarga SQL;
   ninguna acción se ejecuta contra registros dentro de DataBasic.

_Qué comprobar y escribir._ 1:1 necesita unicidad de la FK, además de referencia.
El predeterminado debe referirse a un padre existente cuando se use en un SGBD;
DataBasic no comprueba esa fila. No guardes las tablas de prueba sobre el núcleo.

## 1. Una N:N con atributo propio

_Situación._ Una persona puede estar habilitada para varios instrumentos y
cada instrumento admitir varias personas. Sólo hay una habilitación por pareja.

1. Abre __N:N con atributo__. En Chen selecciona `Habilitacion`.
2. En __Varios__, comprueba los roles `persona` e `instrumento`, ambos `(0,N)`.
3. En __Atributos__, revisa `fechaAlta` de tipo DATE.
4. En __Correspondencias → Elegir clave y materializar…__, revisa
   __Tabla asociativa · N:N / ternaria__, nombre `Habilitacion` y las claves
   de los dos roles como __Identidad de cada ocurrencia__. No marques la fecha.
5. Materializa de nuevo y compara ambas representaciones.

_Resultado esperado._ Una tabla Habilitacion, dos FKs y PK
`(persona_codigoPersona, instrumento_codigoInstrumento)`, además de fechaAlta.
Repetir la decisión conserva los objetos existentes.

_Qué comprobar y escribir._ La pareja no se repite aunque cambie la fecha.
En Chen sigue habiendo una sola relación con dos participaciones y un atributo.

## 2. Ternaria: separar participación, identidad y cardinalidad

_Situación._ Una persona utiliza un instrumento en una sesión en un instante.
La misma terna puede repetirse en instantes distintos. En una misma sesión
y un mismo instante, una persona utiliza como máximo un instrumento.
`instante` usa DATE para respetar el perfil del curso; su precisión física
necesita una decisión al llevarlo al motor de destino.

1. Abre __Ternaria pendiente__. Selecciona `Utiliza` → __Varios__.
2. Conserva __Participación absoluta__ `(0,N)` en las tres ramas: una persona,
   instrumento o sesión puede participar muchas veces a lo largo del ejercicio.
3. En __Cardinalidad por combinación de los otros roles__, elige
   __Uno · máximo por combinación__ para `instrumento`; elige
   __Muchos · sin ese máximo__ para `persona` y `sesion`.
4. En __Atributos__, comprueba `instante` DATE requerido y `minutos`
   NUMBER(4,0) requerido con mínimo 1.
5. En __Correspondencias → Elegir clave y materializar…__, elige tabla
   asociativa `Utilizacion`. En __Identidad de cada ocurrencia__, marca
   los tres roles y `instante`.
6. En __Contexto de cardinalidad por combinación de los otros roles → Ámbito explícito__, elige
   __Por período u otros atributos de contexto__ y marca `instante`.
   No basta haberlo marcado en la identidad.
7. Materializa. Guarda/reabre y compara con __Ternaria resuelta__.

_Resultado esperado._ La PK reúne las tres FKs y `instante`. Una AK adicional
reúne sólo `(persona_codigoPersona, sesion_codigoSesion, instante)`: para esa
combinación no puede aparecer un segundo instrumento. No se añade unicidad
absoluta sobre Persona o Instrumento.

_Qué comprobar y escribir._ Mismos Persona/Instrumento/Sesion con otro instante
son distinguibles. Cambiar sólo el instrumento en el mismo Persona/Sesion/instante
viola la AK. Son comprobaciones de las claves declaradas, sin insertar filas en
un motor real. Elegir contexto __Global__ expresaría otra regla, sin instante.

Un archivo anterior sin cardinalidad por combinación conserva su SQL y muestra
esa cardinalidad como desconocida documental; no se deduce desde mín./máx. ni
PK. Una decisión nueva incompleta queda pendiente y bloquea el SQL completo.

## 3. Multivaluados simples y compuestos

_Situación._ Cada instrumento puede tener varias etiquetas y varias
calibraciones, descritas por fecha y patrón. En esta copia el código es local
a una sede: la PK de Instrumento es `(codigoInstrumento, sede)`.

1. Abre __Multivaluados pendientes__. Revisa la PK de Instrumento en Relacional
   y vuelve a Chen.
2. Selecciona `etiqueta` → __Definición → Multivaluado → Tabla auxiliar…__.
   Pon nombre `Etiquetas` y pulsa __Materializar__.
3. Selecciona `calibracion`: es compuesto y multivaluado; sus componentes
   `fechaCalibracion` DATE y `patron` CHAR(10) ya están creados.
4. Pulsa __Multivaluado → Tabla auxiliar…__, nómbrala `Calibraciones`
   y materializa. Compara con __Multivaluados resuelto__.
5. Prueba __Deshacer__, __Rehacer__, guardar y reabrir antes de exportar SQL.

_Resultado esperado._ Etiquetas tiene PK `(Instrumento_codigoInstrumento,
Instrumento_sede, etiqueta)`. Calibraciones tiene PK `(Instrumento_codigoInstrumento,
Instrumento_sede, fechaCalibracion, patron)`. Cada auxiliar tiene una FK de dos
componentes a Instrumento. Los valores ya no son columnas escalares de Instrumento.

_Qué comprobar y escribir._ Dos instrumentos pueden compartir la misma etiqueta;
un instrumento puede tener etiquetas distintas. Una calibración se identifica
por todos los componentes elegidos. La FK no obliga a tener al menos un valor.
No se conserva una copia escalar independiente que pueda divergir.

## 4. Jerarquía: resolver la clave local antes de heredar

_Situación._ En esta variante, todo instrumento tiene control exclusivamente
manual o automatizado: especialización disjunta y total. Sólo se implementa
la estrategia de tablas de superclase y subclases.

1. Abre __Jerarquía pendiente__. Selecciona la especialización en Chen.
2. En __Definición__, pulsa __Tablas de superclase y subclases… → Materializar__.
   Debe rechazar la PK local incompatible de Manual. Cierra el diálogo:
   las tablas y los atributos anteriores deben seguir intactos.
3. Selecciona el atributo `id` de Manual → __Editar atributo y dominio…__.
   Renómbralo `referenciaLocal`, desmarca __Clave__ y pulsa __Aceptar__ para
   guardar el atributo y su columna.
   No borres el atributo ni su columna. Repite en Automatizado.
4. Selecciona otra vez la especialización → __Tablas de superclase y subclases…__
   y materializa.
5. En Relacional, comprueba la PK/FK heredada y las columnas propias. Guarda
   y reabre; compara con __Jerarquía resuelta__.
6. Abre __Solapada y parcial__. Portatil y ConCamara pueden coincidir y no
   cubrir todos los instrumentos. En __Editar especialización…__, explora
   también disjunta/parcial y solapada/total en copias.

_Resultado esperado._ Instrumento conserva su tabla. Cada subclase tiene
`Instrumento_codigoInstrumento` como PK y FK a la superclase. `referenciaLocal`
sigue siendo columna propia, con la misma identidad, sin ser PK.

_Qué comprobar y escribir._ PK/FK garantiza que toda subclase tenga superclase;
no garantiza exclusión entre subclases ni pertenencia de toda superclase a alguna.
Disjunta/solapada y total/parcial permanecen visibles y comentadas en SQL como
restricciones documentales. Las otras tres estrategias del tema no se ofrecen.

## 5. Entidad débil y clave parcial

_Situación._ Los puertos se numeran dentro de cada instrumento; puerto 1 puede
existir en instrumentos distintos.

1. Abre __Entidad débil__. En `Puerto` → __Definición__, comprueba entidad
   débil, propietaria Instrumento y vínculo identificador Contiene.
2. En sus __Atributos__, `numero` es clave parcial requerida.
3. En `Contiene` → __Varios__, Instrumento tiene `(0,N)` y Puerto `(1,1)`.
4. En __Correspondencias__, comprueba FK binaria, receptor Puerto e
   __Identificadora · incorpora la FK a la clave hija__.
5. En Relacional, compara PK/FK con el SQL y guarda/reabre.

_Resultado esperado._ La PK de Puerto contiene `numero` y
`instrumento_codigoInstrumento`; esta última columna es FK identificadora.

_Qué comprobar y escribir._ El número por sí solo no es único globalmente.
Una FK identificadora heredada no demuestra, por sí sola, que se haya declarado
la entidad débil y su propietaria en el modelo conceptual.

## 6. Compuestos de entidad y relación, derivado y recursiva

_Situación._ Una sesión tiene ubicación; una habilitación incluye acreditación;
la antigüedad se explica desde fechaAlta; las personas orientan a otras personas.

1. Abre __Compuestos, derivado y recursiva__. En Sesion, `ubicacion` tiene
   estructura Compuesto y traducción __Compuesto · descomponer en componentes__.
   `edificio` y `sala` tienen __Componente de → ubicacion__.
2. Selecciona `Habilitacion` → __Atributos__. `acreditacion` es otro compuesto,
   propiedad de la relación; `emisor` y `referencia` son sus componentes.
3. En Relacional, comprueba edificio/sala en Sesion y emisor/referencia en
   Habilitacion. Los nombres de los compuestos no son columnas escalares.
4. En Instrumento, `antiguedad` es derivado con regla conservada y política
   __Derivado · omitir columna__. No aparece en SQL. En una copia, elige
   __Derivado · almacenar valor sin calcularlo__ y comprueba la columna.
5. Selecciona `Orienta` → __Varios__: Persona aparece con roles `orientador`
   y `orientado`, con participaciones distintas. En Relacional, Orientacion
   tiene dos FKs distintas a Persona y PK conjunta.

_Qué comprobar y escribir._ Descomponer conserva la agrupación conceptual.
Almacenar un derivado no calcula su valor. Repetir entidad en una recursiva
no fusiona sus roles ni sus ramas.

## 7. Revisar, organizar, conservar y exportar

_Situación._ Queremos recuperar el trabajo completo y comprobar que mover o
cambiar de vista no cambia sus reglas.

1. Abre __Ayuda → Revisar modelo__ o __Base de datos → Comprobar__.
   Distingue decisiones __Pendientes__ y restricciones __Documentales__.
   __Ver origen__ selecciona el objeto correspondiente.
2. En Chen, arrastra un rombo y una entidad. Pulsa __Escape__ durante otro
   arrastre para cancelarlo. Usa __Deshacer__ y __Rehacer__.
3. Alterna Relacional/Chen. Las posiciones son independientes; no deben aparecer
   tablas duplicadas ni desaparecer atributos. En Relacional también puedes
   arrastrar los bloques de lecturas de una FK.
4. Usa __Distribuir__, __Ajustar__ y zoom; deshaz Distribuir. En
   __Vista → Opciones de visualización__, compara IDEF1X, patas de cuervo y
   flecha relacional; activa tipos completos, claves y cardinalidad numérica.
5. Pon nombre con __Archivo → Nombre__, descarga __Archivo → Guardar__ y
   reabre ese JSON con __Archivo → Abrir__. Revisa ambos modos y propiedades.
6. Descarga __Archivo → Imagen SVG__ en cada representación. Abre el SVG:
   comprueba textos completos, roles y bordes sin recortes.
7. Abre __Imprimir / PDF__. En la vista previa comprueba márgenes y que todas
   las formas quepan; guarda PDF si el navegador lo permite.
8. Usa __Archivo → SQL__, revisa los comentarios documentales y descarga.
   Un pendiente debe impedir presentar un SQL completo sin resolverlo.

_Qué comprobar y escribir._ JSON es el respaldo editable; SVG/PDF no sustituyen
ese documento. El guardado automático es local a navegador/origen/práctica y
no sincroniza equipos. Para otra práctica, usa otro nombre en `?practica=`.

El SQL exportado usa sintaxis tipo PostgreSQL/SQL estándar y `ALTER TABLE ADD
CONSTRAINT`; no se ha acreditado su ejecución en un SGBD. SQLite no admite esa
forma de añadir restricciones. No se modifica el DDL para presentar otro script
como si fuera el export original. DataBasic no abre/genera VSD, VDX, VSDX ni
Access; tampoco reconstruye un ERE único desde cualquier esquema relacional.

## Transferencia y evidencia

Repite sin mirar una tabla con PK, una FK y una decisión de nulos. Localiza en
Visio 2010 Definition, Columns, Primary ID, Indexes, Miscellaneous y Referential
Action, según el idioma, y explica qué restricción no impone una FK.
Chen y las correspondencias nativas son ampliaciones propias de DataBasic.

La [matriz funcional](functional-audit.md) vincula fuente, operación y prueba.
Los [requisitos del curso](course-requirements.md) conservan las referencias
por página y los límites de formatos. Los materiales privados no se distribuyen.
La prueba de archivos/modelo no sustituye la inspección visual de navegador;
consulta [verificación](verification.md) para esa capa y para la publicación.
