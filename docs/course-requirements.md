# Contraste de DataBasic con Fundamentos de Bases de Datos

Revisión del 2 de noviembre de 2026. Se parte de DataBasic 0.1, revisión
`17caffa`, y se incorpora una primera corrección en 0.1.1.

La aplicación inicial sirve para practicar una parte del modelo relacional,
pero todavía no ofrece equivalencia funcional con las prácticas del curso.
La prioridad es ajustar ese editor a **IDEF1X** y al perfil de tipos exigido.
El modelo conceptual ERE requiere otro conjunto de objetos y reglas; cambiar
la apariencia de las tablas no lo convierte en un editor conceptual.

## Qué determina cada fuente

| Fuente | Contenido inspeccionado | Uso en la especificación |
| --- | --- | --- |
| Tema 1 FBD 2026_2027 | 26 páginas; fundamentos, independencia, estructura, restricciones y operaciones. | Contexto de la separación entre el modelo y su representación. No implica construir un SGBD completo. |
| Tema 2 FBD 2026_2027 | 25 páginas; ERE, claves, participación, roles, jerarquías y notaciones alternativas. | Semántica y grafía del futuro editor conceptual. |
| Tema 3 FBD 2026_2027 | 36 páginas; modelo relacional, restricciones y transformación ERE→relacional. | Reglas del editor relacional y de una futura transformación guiada. |
| Introducción al modelo ERE | 13 páginas; dos diapositivas por página, grafía, método y ejercicios. | Entidades fuertes/débiles, atributos, relaciones y documentación semántica. |
| Práctica 0 Separabilidad Programas-Datos | 4 páginas; ejercicio de programación con cambios de requisitos. | Contexto pedagógico. Sus instrucciones no se convierten en funcionalidades de facturación de DataBasic. |
| Visio 2010 Product Overview Guide | Texto y figuras de la guía general aportada en DOCX. Las dos copias son idénticas. | Cinta, ventana de formas, barra de estado y organización general. No describe en detalle todas las ventanas del modelador de bases de datos. |
| Práctica 1 Modelos Conceptual y Relacional | 4 páginas; enunciado evaluable localizado en el campus y descargado para verificar su versión. | Requisitos concretos: ERE, IDEF1X, tipos permitidos y entregables. |

Los números siguientes son **páginas del PDF**, no números de diapositiva.
Los enunciados se usan como evidencia de necesidades, no como instrucciones
para resolver ejercicios, completar formularios o realizar entregas.

## Requisitos y situación actual

| ID | Requisito de la asignatura | Evidencia | Situación en 0.1.1 |
| --- | --- | --- | --- |
| FBD-R01 | Diagrama relacional con notación IDEF1X. | Práctica evaluable, p. 3, §3.2. | Pendiente. El dibujo actual usa patas de cuervo o flechas; no se identifica como IDEF1X. |
| FBD-R02 | Utilizar únicamente VARCHAR, CHAR, NUMBER y DATE en el trabajo de clase. | Práctica evaluable, p. 3. | Parcial. Los cuatro están disponibles, pero el editor general conserva otros tipos y no hay todavía un perfil restrictivo de asignatura. |
| FBD-R03 | PK, claves alternativas y FKs con su dependencia. | Práctica evaluable, p. 3; Tema 3, pp. 6–8. | PK/FK simples y compuestas disponibles. Los índices únicos cubren parte de la unicidad alternativa, pero falta representar explícitamente las claves candidatas alternativas. |
| FBD-R04 | Dominios, nulabilidad y valores predeterminados. | Práctica evaluable, p. 3; Tema 3, p. 5. | Nulos y valores predeterminados disponibles. Los tipos con tamaño/precisión cubren parte del dominio; faltan rangos y conjuntos de valores. |
| FBD-R05 | Cardinalidades y acciones para preservar integridad referencial. | Práctica evaluable, p. 3; Tema 3, pp. 8–9 y 16–19. | Disponibles los cuatro casos binarios habituales y las acciones declarativas. No se ejecutan contra registros reales. |
| FBD-C01 | Entidades fuertes/débiles y vínculos identificadores en la grafía ERE. | Tema 2, p. 5; introducción ERE, p. 2. | Pendiente como editor conceptual. Una FK identificadora no sustituye la entidad débil y su clave parcial. |
| FBD-C02 | Atributos clave, parciales, compuestos, multivaluados y derivados. | Tema 2, pp. 6–7 y 11–12; introducción ERE, p. 3. | Pendiente. Las columnas actuales representan atributos relacionales, no la estructura de atributos conceptuales. |
| FBD-C03 | Relaciones con atributos propios; binarias, recursivas y ternarias. | Tema 2, pp. 7–8; práctica evaluable, pp. 2–3. | La autorreferencia relacional está disponible. Faltan los objetos relación ERE, sus atributos y las participaciones de una ternaria. |
| FBD-C04 | Participación total/parcial, mínimos, máximos y roles. | Tema 2, pp. 8 y 12; introducción ERE, pp. 4 y 10. | Parcial en el relacional. Faltan participaciones conceptuales por rama, roles y rangos como (1,10). |
| FBD-C05 | Especialización/generalización disjunta o solapada, total o parcial. | Tema 2, pp. 15–16; introducción ERE, p. 5; práctica evaluable, p. 2. | Pendiente. |
| FBD-D01 | Justificar supuestos y documentar semántica perdida. | Introducción ERE, pp. 5–10; práctica evaluable, p. 2; Tema 3, p. 9. | Las notas de entidad permiten texto libre; falta documentación estructurada del modelo completo. |
| FBD-T01 | Transformación ERE→relacional conservando claves y restricciones representables. | Tema 3, pp. 19–35; práctica evaluable, p. 4. | Pendiente como proceso guiado. Se pueden construir manualmente tablas y FKs. |

La práctica exige una relación ternaria. No debe simplificarse automáticamente
en tres relaciones binarias: esa sustitución no conserva, en general, la misma
información. Al transformarla al relacional se debe conservar la identidad de
cada ocurrencia; el enunciado advierte expresamente sobre combinaciones que
se repiten en distintos períodos, por lo que no se debe fijar siempre una PK
formada únicamente por las tres FKs.

## Cambio pequeño incorporado en 0.1.1

Se añade `NUMBER`, `NUMBER(p)` y `NUMBER(p,s)` a los tipos admitidos y a las
sugerencias del editor. Se conserva el formato de archivo versión 1 y los
documentos anteriores siguen admitiendo sus tipos existentes.

El enunciado exige NUMBER, pero no define por sí mismo su gramática completa.
Para sus parámetros se adopta como **decisión de implementación** la sintaxis
documentada por Oracle: precisión de 1 a 38 y escala de -84 a 127. La escala
puede superar la precisión. No se atribuyen esos límites al profesor ni se
supone que Access utilice la misma representación física.

La exportación SQL dirigida a sintaxis tipo PostgreSQL representa NUMBER como
NUMERIC, conservando la precisión y escala explícitas. Es una conversión de
declaración, no una promesa de identidad entre los sistemas numéricos de todos
los motores. Las escalas negativas requieren PostgreSQL 15 o posterior.

Las cinco pruebas añadidas cubren parámetros válidos, rechazo de parámetros
inválidos, guardado compatible, propagación a una FK y conversión SQL sin
modificar el modelo. La suite completa suma 43 pruebas superadas.

## Siguiente bloque propuesto

### 1 Editor relacional conforme al curso

1. Añadir un perfil de asignatura que admita únicamente las cuatro familias
   de tipos exigidas. Abrir modelos anteriores debe conservarlos en el perfil
   general y permitir revisarlos sin conversiones silenciosas.
2. Implementar IDEF1X como notación diferenciada, con evidencia visual y
   pruebas de sus entidades, dependencias y extremos de relación. Mantener
   separados los datos del modelo y sus símbolos de presentación.
3. Representar claves alternativas como conjuntos de columnas identificables.
   No confundir dos claves candidatas diferentes con una PK compuesta.
4. Incorporar dominios declarativos de rango o lista cuando el ejercicio los
   requiera, separados del tipo físico y de las notas libres.

Aceptación: crear dos tablas con tipos del curso, una PK compuesta y una
clave alternativa; conectarlas, fijar nulos y acciones referenciales; guardar
y recuperar el archivo; verificar los símbolos IDEF1X frente a una referencia
concreta de Visio y comprobar que los documentos antiguos siguen abriendo.
La guía general recibida aporta el marco de la interfaz, pero necesita
complementarse con la referencia específica de IDEF1X/modelado de Visio 2010.

### 2 Editor conceptual ERE como segundo modo

Modelar por separado entidades, atributos, relaciones, participaciones y
especializaciones. Una relación admite varias participaciones con roles
propios, incluso cuando una entidad interviene más de una vez. Los atributos
pueden pertenecer a una entidad o a una relación y tener componentes.

Crear una relación ERE no debe migrar columnas ni crear FKs todavía. Esa
operación pertenece a la transformación al modelo relacional. El guardado de
estas estructuras requerirá una evolución explícita del formato.

Aceptación inicial: dibujar una relación N:N con atributo propio y una ternaria
con rol, razón de cardinalidad y (mínimo,máximo) en cada rama, conservando todo
al guardar y abrir. Las entidades débiles y especializaciones se incorporarán
en pasos posteriores con sus propias comprobaciones.

### 3 Transformación guiada y documentación

Aplicar de forma trazable las reglas del Tema 3: entidades fuertes y débiles,
relaciones 1:1, 1:N y N:N, atributos multivaluados, jerarquías y autorreferencias.
Las variantes de transformación y las restricciones no conservadas deben
quedar documentadas. Se usará un ejemplo propio y acotado para verificar cada
regla antes de ampliar la automatización.

## Alcance de los entregables académicos

La práctica evaluable pide un documento Word/PDF del conceptual, un archivo
de Microsoft Visio del relacional y una base de datos Access. Los archivos
DataBasic, SVG y SQL actuales no se presentan como sustitutos aceptados de
esos entregables. El desarrollo de un editor de práctica y la compatibilidad
con los formatos de entrega son objetivos distintos que necesitan su propia
verificación.

## Fuentes

- [Asignatura en el campus](https://campus.umh.es/course/view.php?id=116629).
- [Tema 1](https://campus.umh.es/pluginfile.php/1329060/mod_resource/content/1/Tema%201%20FBD%202026_2027.pdf), copia aportada: `Tema 1 FBD 2026_2027 (1).pdf`.
- [Tema 2](https://campus.umh.es/pluginfile.php/1338296/mod_resource/content/2/Tema%202%20FBD%202026_2027.pdf), copia aportada: `Tema 2 FBD 2026_2027 (1).pdf`.
- [Tema 3](https://campus.umh.es/pluginfile.php/1361008/mod_resource/content/1/Tema%203%20FBD%202026_2027.pdf), copia aportada: `Tema 3 FBD 2026_2027.pdf`.
- [Introducción al modelo ERE](https://campus.umh.es/pluginfile.php/1341330/mod_resource/content/1/Pr%C3%A0ctica%201%20Introducci%C3%B3%20an%20es%20model%20ERE.pdf), copia aportada: `Pràctica 1 Introducció an es model ERE (3).pdf`.
- [Práctica 0](https://campus.umh.es/pluginfile.php/1329062/mod_resource/content/2/Practica_0_Separabilidad_Programas_Datos.pdf), copia aportada: `Practica_0_Separabilidad_Programas_Datos (1).pdf`.
- [Práctica evaluable actual](https://campus.umh.es/pluginfile.php/1358407/mod_assign/introattachment/0/Pr%C3%A0ctica%201%20FBD%202026-2027%20Castell%C3%A0.pdf?forcedownload=1), verificada mediante descarga desde su enlace en el campus. SHA-256: `1c5fa1bd30c895369d8692d0363012921fc4fe56ba20f09b38a22910d3b8673a`.
- Guía general de Visio 2010: copias DOCX aportadas, con y sin `(1)`, ambas con SHA-256 `e9ca8e02fa744169104ec20ddb36a45531cb75eecdac3cbd4270ab23704347a6`. [Ficha oficial](https://www.microsoft.com/en-gb/download/details.aspx?id=27196).
- [Oracle: gramática y parámetros de NUMBER](https://docs.oracle.com/en/database/oracle/oracle-database/21/sqlqr/Data-Types.html).
- [PostgreSQL: NUMERIC y escalas negativas](https://www.postgresql.org/docs/current/datatype-numeric.html).
