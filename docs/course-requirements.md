# DataBasic y Fundamentos de Bases de Datos

Cobertura de **DataBasic 0.4.5**, revisada el 8 de noviembre de 2026 con los PDF del curso y los enunciados de la práctica 2025-2026 y 2026-2027.
La aplicación permite practicar operaciones relacionales y construir ERE
nativos. La cobertura sigue siendo parcial: guardar una restricción conceptual
no significa haberla traducido al relacional ni implementado en Access.

La [guía](practice-guide.md) utiliza ejemplos originales. La
[matriz funcional](functional-audit.md) detalla controles, pruebas y carencias;
[verificación](verification.md) conserva los resultados de ejecución.

## Fuentes y precedencia

| Fuente | Pasajes relevantes | Qué determina |
| --- | --- | --- |
| Tema 1 | Modelo, estructura, restricciones, operaciones y niveles; especialmente pp. 10 y 18–19. | Vocabulario y separación entre modelo, representación y SGBD. No exige construir un SGBD completo. |
| Tema 2 | pp. 2–4, 5–12 y 15–16. | Separación conceptual/relacional/físico; entidades, atributos, roles, participación y jerarquías. |
| Tema 3 | pp. 5–9 y §3.6, pp. 19–35. | Dominios y claves, integridad, transformación y semántica que una FK no conserva. |
| Introducción al modelo ERE | pp. 2–5 y método de pp. 6–10. | Grafía ERE y justificación de supuestos; límites mín./máx. por participación. |
| Práctica 1 evaluable | §§3.1–3.2, pp. 2–3, y observaciones de p. 4. | ERE con ternaria, relacional IDEF1X, tipos permitidos, elementos y formatos de entrega. |
| Visio 2010 Product Overview Guide | Cinta, ventana Formas, área de dibujo y barra de estado. | Marco general de la interfaz; no es un manual detallado del modelador de BD. |
| Ayudas Microsoft aplicables a 2010 y tutorial DeVry de 18 páginas | Definición, columnas, opciones y propiedades de relaciones. | Rutas transferibles a la herramienta; el ejemplo DeVry usa Crow’s Foot. |
| FIPS PUB 184 | §§3.1.2–3.1.3 y 3.5.2; figuras 1 y 4–7. | Grafía IDEF1X; no describe botones de Visio. |

Las páginas indicadas son páginas del PDF del curso, no números de diapositiva.
La [cobertura frente a Visio 2010 y al curso](visio-2010-coverage.md) añade
la lectura íntegra de la Práctica 1, la introducción al ERE y los temas 1 y 2.
Los materiales originales no se redistribuyen con la aplicación. Se usan para
identificar requisitos, sin copiar figuras, ejercicios ni sus soluciones.

## Cobertura del relacional

| ID | Requisito y fuente | Operación en 0.4.5 | Límite concreto |
| --- | --- | --- | --- |
| FBD-R01 | IDEF1X; práctica p. 3. | Vista → Opciones de visualización → Relaciones → Notación → IDEF1X. Se distinguen cajas, dependencia, líneas y marcadores conforme a FIPS 184. | La prueba de símbolos/SVG no acredita identidad de interfaz ni equivalencia completa con Visio 2010. |
| FBD-R02 | VARCHAR, CHAR, NUMBER, DATE; práctica p. 3. | Perfil → Curso · 4 tipos; Columnas → Editar… ofrece familia y parámetros. Los nuevos documentos usan este perfil. | General conserva tipos heredados; no hay conversiones silenciosas al cambiar de perfil. |
| FBD-R03 | PK, AK y FK; práctica p. 3 y Tema 3 pp. 6–8. | Identificador principal; Índices / Claves alternativas; Relación de la tabla referenciada a la que recibe la FK con migración de PK completa. | Una FK no puede elegir AK como destino. La minimalidad semántica de una candidata la decide el autor. |
| FBD-R04 | Dominio, nulos y predeterminados; práctica p. 3 y Tema 3 p. 5. | Columnas → Editar…: rango, valores y condición; requerido/PK; expresión predeterminada. SQL conserva CHECK, NOT NULL y DEFAULT. | No se evalúan datos ni expresiones. La compatibilidad con el motor elegido necesita revisión. |
| FBD-R05 | Cardinalidad e integridad referencial; práctica p. 3 y Tema 3 pp. 8–9, 16–19. | FK → Varios: 0..N, 1..N, 0..1, 1..1 y opcionalidad; Acción referencial: NO ACTION, CASCADE, SET NULL, SET DEFAULT. | Una FK no impone mínimos de hijos. No se ejecutan acciones sobre registros reales. |
| FBD-R06 | Dependencia y correspondencia de claves; práctica p. 3. | Definición muestra componentes PK/FK; identificación incorpora la FK a la PK de la tabla que referencia. Se evita reutilizar una PK hija homónima como FK por accidente. | Dependencia de identidad relacional y entidad débil ERE son hechos relacionados, no sinónimos deducibles automáticamente. |

El perfil del curso restringe **familias de tipos**, no convierte el vocabulario
del enunciado en tipos físicos de Access. Para NUMBER se adopta precisión
1–38 y escala −84–127 según la referencia Oracle como decisión de implementación.
El curso exige NUMBER, pero no define esos límites. El SQL de estudio traduce
NUMBER a NUMERIC; las escalas negativas requieren PostgreSQL 15 o posterior.

## Cobertura del conceptual y su transformación

| ID | Requisito y fuente | Operación en 0.4.5 | Situación y carencia |
| --- | --- | --- | --- |
| FBD-C01 | Fuertes/débiles; Tema 2 p. 5, introducción p. 2. | Entidad nativa; Definición → Entidad débil, propietaria y vínculo identificador; atributo clave parcial; FK binaria identificadora explícita. El vínculo elegido se dibuja con rombo doble. | Transformación de débil disponible mediante decisiones trazadas. No se infiere debilidad de una tabla anterior. |
| FBD-C02 | Clave y clave parcial; Tema 2 pp. 11–12. | Atributo → Editar: Clave o Clave parcial; PK/AK materializadas en el relacional. | El autor justifica qué identifica cada ocurrencia. |
| FBD-C03 | Compuestos; Tema 2 pp. 6–7, introducción p. 3. | Estructura Compuesto y componentes; Traducción → Compuesto · descomponer en componentes. | Descomposición explícita disponible. Un compuesto sin componentes o sin estrategia queda pendiente. |
| FBD-C04 | Multivaluados y derivados; Tema 2 pp. 6–7 y Tema 3 pp. 29–30. | Multivaluado → Tabla auxiliar, simple o compuesto, con PK propietaria completa y valores; derivados permiten omitir columna o almacenar sin calcular. | La FK auxiliar no exige valores mínimos por propietaria. La derivación es documental: no se calcula ni genera fórmula SQL. |
| FBD-C05 | Relaciones con atributos, binarias, N:N, recursivas y ternarias; Tema 2 pp. 7–8 y práctica pp. 2–3. | Chen → Relación; dos o tres participaciones con rol; Atributos; Correspondencias → tabla asociativa o FK binaria. | N:N y ternarias se materializan con clave explícita. Una ternaria no se sustituye por tres binarias. |
| FBD-C06 | Participación, mín./máx., letras 1/N y roles; Tema 2 pp. 8, 12 e introducción pp. 4, 10; práctica p. 3. | Varios separa participación absoluta y cardinalidad ternaria por combinación; junto al rombo se dibuja la letra 1/N de cada rama. Correspondencias separa identidad y contexto global/temporal. Una recursiva conserva participaciones distintas. | En binarias la letra es el máximo de la otra rama; en ternarias es la cardinalidad por combinación elegida. Algunos límites permanecen documentales. La rama one genera AK sobre los otros roles y contexto elegido; no equivale a máximo absoluto 1. |
| FBD-C07 | Jerarquía disjunta/solapada, total/parcial; Tema 2 pp. 15–16 y Tema 3 pp. 31–34. | Chen → Especialización → Tablas de superclase y subclases. Círculo d/s, doble línea si total y arco de subconjunto en cada subclase. PK heredada completa también FK; PK local incompatible exige resolución explícita. | Una sola estrategia implementada. Disyunción/totalidad son restricciones documentales; las otras tres estrategias del tema no se ofrecen. |
| FBD-D01 | Supuestos y semántica perdida; introducción pp. 5–10, práctica p. 2 y Tema 3 p. 9. | Supuestos por objeto o globales en tres clases (enunciado, supuesto, perdida); Base de datos → Supuestos; Archivo → Memoria HTML/Markdown con diagramas, atributos, relaciones, decisiones, supuestos y restricciones documentales. | La memoria reúne lo que el autor escribió y lo que DataBasic detecta; no redacta la justificación por él ni demuestra fidelidad al enunciado. |
| FBD-D02 | Entrega en .zip: documento Word o PDF con DNI, nombre y apellidos y el diseño conceptual con supuestos y semántica perdida; Visio del relacional con IDEF1X; base de datos Access; práctica p. 4. | Archivo → Alumno (DNI o NIE con letra comprobada); Archivo → Paquete de entrega comprueba alumno, decisiones pendientes, ternaria, especialización, supuestos y tipos, y descarga memoria .docx, Visio .vdx con leyenda y diccionario de datos, módulo VBA, SQL y XML de Access, diagramas SVG, proyecto y LEEME. | El `.accdb` lo crea el alumno ejecutando el módulo en Access 2010; el .vdx es un dibujo editable, no un diagrama de modelo de base de datos de Visio. |
| FBD-S01 | SQL de consulta, manipulación y definición sobre la base de datos de la práctica; Access §3. | Consola SQL (vista Tablas): SELECT con combinaciones internas y externas, totales, subconsultas, UNION y TOP; INSERT, UPDATE y DELETE con claves, dominios, CHECK e integridad referencial (CASCADE, SET NULL, SET DEFAULT, NO ACTION); CREATE/ALTER/DROP TABLE, INDEX y VIEW por las reglas del modelo. Cada consulta muestra su expresión de álgebra relacional. Datos de ejemplo genera filas que cumplen las reglas. | Dialecto de Access interpretado por DataBasic, no el motor de Access: no hay consultas de parámetros, de tabla de referencias cruzadas (TRANSFORM) ni CASE; COUNT(DISTINCT) se rechaza como en Access. |
| FBD-T01 | Transformar sin perder hechos; Tema 3 §3.6 y práctica p. 4. | Correspondencias conservadas; materialización explícita de binarias, asociaciones, débiles, compuestos, multivaluados y tablas de clases; derivados con política. | Las decisiones incompletas quedan pendientes. No hay conversor ERE universal ni reconstrucción de un ERE único desde cualquier relacional. |

La transformación de una ternaria requiere decidir la identidad de sus
ocurrencias. En el [club de observación](practice-guide.md#2-ternaria-separar-participación-identidad-y-cardinalidad),
una misma Persona/Instrumento/Sesion puede repetirse en instantes distintos:
se elige `instante` como componente de PK y, por separado, como contexto de
la cardinalidad. Una AK Persona/Sesion/instante limita Instrumento por esa
combinación. Es una decisión del ejemplo, no una solución de la práctica.

## Qué se transfiere a Visio 2010

Se practican la selección de formas y las categorías **Definición, Columnas,
Identificador principal, Índices, Varios y Acción referencial**, además de
opciones de documento y lectura de PK/FK. La guía distingue las operaciones
propias de DataBasic —Chen nativo, correspondencias y SQL de estudio— de las
rutas documentadas de 2010. No se necesita una réplica de píxeles para practicar
esas decisiones.

## Formatos de entrega académica

La práctica pide un .zip con (a) un documento Word o PDF con el DNI, el nombre
y los apellidos del alumno y el diseño conceptual con los supuestos semánticos
y la semántica perdida, (b) el archivo Visio del relacional con IDEF1X y (c) la
base de datos Access. __Archivo → Paquete de entrega__ prepara ese .zip:
`Memoria.docx` con portada (datos de __Archivo → Alumno__), diagramas, diseño
conceptual con el tipo de cada relación, supuestos, semántica perdida, esquema
relacional con diccionario de datos y diseño físico; `Modelo_relacional.vdx`
con el diagrama, una leyenda de la notación y una página de diccionario de
datos (dominios, nulos, predeterminados, PK/AK, FK con dependencia,
cardinalidad y acciones referenciales); la carpeta `Access/`; los diagramas en
SVG; el proyecto y `LEEME.txt`. El módulo VBA se escribe en Windows-1252 con
saltos CRLF, que es como lo importa el editor de Access 2010. Antes de
entregar, el alumno crea el `.accdb` siguiendo el LEEME y lo añade al paquete.
DataBasic guarda JSON y exporta SVG/SQL; __Archivo → Visio
2010__ escribe el diagrama relacional como dibujo XML `.vdx`, que Visio 2010
abre y edita (sin las propiedades de base de datos de Visio); la memoria
también se descarga en HTML y Markdown y la impresión permite obtener PDF
mediante el navegador. __Archivo → Access__ entrega tres archivos que Access convierte en
la base de datos: el módulo VBA con DAO que la crea entera (tablas, propiedades
de campo, claves, relaciones con integridad y cascadas, campos de búsqueda), el
SQL de Access de una instrucción por consulta y el XML con esquema para Datos
externos, con los tipos de Access derivados del relacional y la lista de lo que
Access expresa de otra manera. La vista __Tablas__ muestra y ajusta esas
propiedades con el vocabulario de la vista Diseño de Access. **No genera VSD
binario, VSDX ni `.accdb`**; los
archivos de Access no se han ejecutado en Access desde el entorno de revisión.
Estos resultados no se presentan como sustitutos ya aceptados de los formatos
académicos.

## Fuentes

Los enlaces del campus pueden requerir acceso a la asignatura.

- [Asignatura](https://campus.umh.es/course/view.php?id=116629).
- [Tema 1](https://campus.umh.es/pluginfile.php/1329060/mod_resource/content/1/Tema%201%20FBD%202026_2027.pdf).
- [Tema 2](https://campus.umh.es/pluginfile.php/1338296/mod_resource/content/2/Tema%202%20FBD%202026_2027.pdf).
- [Tema 3](https://campus.umh.es/pluginfile.php/1361008/mod_resource/content/1/Tema%203%20FBD%202026_2027.pdf).
- [Introducción al ERE](https://campus.umh.es/pluginfile.php/1341330/mod_resource/content/1/Pr%C3%A0ctica%201%20Introducci%C3%B3%20an%20es%20model%20ERE.pdf).
- [Práctica evaluable](https://campus.umh.es/pluginfile.php/1358407/mod_assign/introattachment/0/Pr%C3%A0ctica%201%20FBD%202026-2027%20Castell%C3%A0.pdf?forcedownload=1).
- [Microsoft: guía general de Visio 2010](https://www.microsoft.com/en-gb/download/details.aspx?id=27196).
- [Microsoft: definición de entidad/vista, aplicable a 2010](https://support.microsoft.com/en-us/visio/database-properties-for-entity-and-view-shapes-definition).
- [Microsoft: integridad referencial, aplicable a 2010](https://support.microsoft.com/en-us/visio/preserve-referential-integrity-in-database-model-diagrams).
- [DeVry: tutorial de Visio 2010, 18 páginas](https://lms.devry.edu/lms/CourseExport/files/4c59b998-a778-4673-b5b5-1040a4a59543/documents--Creating_ERD_in_MS_Visio_2010.pdf).
- [NIST: FIPS PUB 184, copia oficial GovInfo](https://www.govinfo.gov/app/details/GOVPUB-C13-986bf8b12a4fed44eb78fca0bb55d668).
- [Oracle: parámetros de NUMBER](https://docs.oracle.com/en/database/oracle/oracle-database/21/sqlqr/Data-Types.html).
- [PostgreSQL: NUMERIC y escalas](https://www.postgresql.org/docs/current/datatype-numeric.html).
