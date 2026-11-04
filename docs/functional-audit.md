# Matriz funcional de DataBasic 0.4.3

Esta matriz enlaza necesidad, fuente, operación y evidencia. Describe el código
0.4.3 y el formato de documento 2, con entrada compatible de formato 1.
**Disponible** significa que existe una operación y cobertura automatizada
indicada; no significa que todos los clics y tamaños de pantalla se hayan
probado en un navegador real. **Documental** conserva hechos que no se imponen
como reglas ejecutables. **Pendiente** identifica una transformación ausente
o una decisión todavía no elegida.

Los resultados y conteos vigentes, el artefacto probado y el estado publicado
se consultan exclusivamente en [verificación](verification.md). La
[cobertura frente a Visio 2010 y al curso](visio-2010-coverage.md) enumera
función por función el estado respecto a la plantilla de Visio y a los apuntes. Las pruebas de
interacciones simulan el DOM; la prueba del bundle comprueba el artefacto
construido, sin sustituir la revisión visual.

## Claves de fuentes y evidencias

| Clave | Fuente y pasaje |
| --- | --- |
| T2 | [Tema 2](course-requirements.md#fuentes), pp. 2–4, separación de niveles; pp. 5–12, objetos/restricciones; pp. 15–16, jerarquías. |
| T3 | [Tema 3](course-requirements.md#fuentes), pp. 5–9, dominios y restricciones; §3.6, pp. 19–35, transformación. |
| P1 | [Práctica evaluable](course-requirements.md#fuentes), pp. 2–3, ERE, IDEF1X, claves, dominios y cuatro tipos; p. 4, identidad de ocurrencias. |
| ERE | [Introducción al ERE](course-requirements.md#fuentes), pp. 2–5, grafía (rombo doble, letras 1/N, pares, doble línea, arcos de subclase); pp. 6–10, supuestos y método. |
| V10 | [DeVry, tutorial 2010 de 18 páginas](https://lms.devry.edu/lms/CourseExport/files/4c59b998-a778-4673-b5b5-1040a4a59543/documents--Creating_ERD_in_MS_Visio_2010.pdf), pp. 5–9 y 14–16, opciones y propiedades; ejemplo Crow’s Foot. |
| MS-D | [Microsoft, Definition, aplicable a 2010](https://support.microsoft.com/en-us/visio/database-properties-for-entity-and-view-shapes-definition), nombres y sincronización. |
| MS-R | [Microsoft, integridad referencial, aplicable a 2010](https://support.microsoft.com/en-us/visio/preserve-referential-integrity-in-database-model-diagrams), acciones y predeterminados. |
| F184 | [FIPS PUB 184, NIST/GovInfo](https://www.govinfo.gov/app/details/GOVPUB-C13-986bf8b12a4fed44eb78fca0bb55d668), §§3.1.2–3.1.3, 3.5.2; figuras 1 y 4–7. Páginas impresas 8–9 y 16–19; páginas del PDF 26–27 y 34–37. |
| DB | Decisión propia de DataBasic: persistencia web, perfiles, trazabilidad y controles. No se atribuye al producto Microsoft. |

| Pruebas | Qué inspeccionan |
| --- | --- |
| [Modelo](../tests/model.test.js) | PK/FK, acciones, referencias, archivos y SQL relacional. |
| [Conceptual](../tests/conceptual.test.js) | Proyección, relaciones nativas, transformaciones, trazas, decisiones pendientes y formato 2. |
| [Dominio de uso completo](../tests/full-use-domain.test.js) | Tablas auxiliares, herencia, cardinalidad ternaria/contexto, rechazo atómico y validación de trazas/estrategias. |
| [Ejemplos entregados](../tests/examples.test.js) | Abre los once JSON reales; compara SQL y conservación; repite decisiones desde los tres pendientes. |
| [Tipos](../tests/course-types.test.js) | NUMBER, parámetros, compatibilidad y conversión a NUMERIC. |
| [Escena](../tests/scene.test.js) | Símbolos, roles, posiciones, textos completos y límites del SVG. |
| [Interfaz](../tests/interface.test.js) | Controles y categorías renderizados; no demuestra maquetación visual. |
| [Aplicación](../tests/application.test.js) | Eventos y diálogos simulados usando el ensamblado común. |
| [Bundle](../tests/bundle.test.js) | Recursos de salida y arranque del artefacto offline construido. |
| [Supuestos](../tests/assumptions.test.js) | Supuestos por objeto, etiquetas, desvinculación al borrar y memoria del diseño en Markdown y HTML. |

## Recorrido relacional y ventanas

| ID / fuente | Operación y ruta | Estado y prueba concreta | Carencia o precaución |
| --- | --- | --- | --- |
| UI-01 · V10 pp. 7–9 | Formas, lienzo, cinta y propiedades inferiores. | Disponible; Interfaz comprueba estructura y categorías. | Adaptación propia; no réplica de píxeles ni prueba de todos los anchos. |
| UI-02 · MS-D | Tabla → Definición: físico/conceptual, sincronización, espacio de nombres. | Disponible; Interfaz, campos y sincronización. | Nombre conceptual es propiedad de tabla, no un ERE. Propietario/origen sin edición; no ingeniería inversa. |
| UI-03 · V10 p. 9 / MS | Tabla → Columnas: agregar, editar, quitar, reordenar, requerido y PK; tipo elegido en una lista de tipos estándar por categoría, como los tipos portables de Visio, con «Otro…» para escribirlo. | Disponible; Modelo/Interfaz, orden e identidad; Tipos, lista válida por perfil; Interfaz, lista agrupada y valor actual; Aplicación, elección y «Otro…». | Quitar columnas referenciadas se rechaza; no se borran dependencias ocultamente. La lista no sustituye a Editar… para precisión y escala a medida. |
| UI-04 · P1 p. 3 | Columnas → Editar…: Familia, Longitud, Precisión, Escala. | Disponible; Tipos, límites; Aplicación, guardado real de campos del diálogo. | Perfil General puede conservar tipos fuera del curso. |
| UI-05 · P1 p. 3 / T3 pp. 6–8 | Identificador principal e Índices / Claves alternativas. | Disponible; Conceptual, AK requerida y SQL; controles AK separados de índices. | La candidatura/minimalidad la justifica el autor; FK a AK no soportada. |
| UI-06 · P1 p. 3 / T3 p. 5 | Editar columna → Dominio declarativo y predeterminado. | Disponible; Conceptual, rango/lista y SQL; Aplicación, parámetros y dominio guardados. | No hay evaluación de expresiones ni registros. CHECK libre necesita revisión del autor. |
| UI-07 · V10 pp. 14–16 | FK → Definición, Nombre, Varios y Acción referencial. | Disponible; Interfaz separa categorías; Aplicación abre propiedades de relación. | Conector por dos clics; no reproduce el arrastre/enganche de extremos de Visio. |
| UI-08 · V10 pp. 5–6 / F184 | Vista → Opciones de visualización: nombres, tipos, claves y notación. | Disponible; Aplicación conserva modo/notación y booleanos; Escena consume opciones. | Visibilidad y nombres no transforman semántica. |
| UI-09 · DB | Arrastrar una tabla desde su título o desde una fila de columna. | Disponible; Aplicación, «Arrastrar una fila de columna mueve su tabla…». | Un clic sin movimiento sobre la fila selecciona la columna; no hay selección múltiple. |
| UI-10 · DB | Comprobar / Revisar modelo sin avisos repetidos; título de la especialización en Propiedades. | Disponible; Aplicación, «Comprobar el modelo muestra cada aviso…» y título «Especialización». | Los avisos documentales siguen siendo responsabilidad del autor. |

## Integridad y representación relacional

| ID / fuente | Operación y ruta | Estado y prueba concreta | Carencia o precaución |
| --- | --- | --- | --- |
| R-01 · T3 pp. 6–8 | Relación: seleccionar la tabla referenciada y después la que recibe la FK; migrar PK completa. | Disponible; Modelo, PK compuesta y autorreferencia; Conceptual, ruta inicial id/id conserva identidad hija. | No hay referencia a AK ni asignación arbitraria de un subconjunto de la PK. |
| R-02 · T3 pp. 8–9 | FK → Varios: cardinalidad, identificación y referencia opcional. | Disponible; Modelo, nulos/identificación; Conceptual distingue FK única de FK que solo forma parte de PK compuesta. | Mínimos de hijos no se imponen con FK; unicidad efectiva puede limitar el máximo dibujado. |
| R-07 · MS-D / DB | FK → Varios: volver a no identificadora saca la FK de la PK de la tabla que referencia. | Disponible; Modelo, «Volver a no identificadora saca la FK…» y «La columna FK compartida…». | Una columna se mantiene en la PK si otra relación identificadora la usa; la PK propia del hijo no se toca. |
| R-03 · MS-R | FK física → Acción referencial, también cuando es generada. | Disponible; Modelo/Dominio prueban políticas, rechazo atómico SET NULL obligatorio/SET DEFAULT sin valor y conservación tras rematerializar, renombrar y reabrir. | La estructura generada permanece protegida por su origen. Declaración exportada; sin ejecutar contra datos o SGBD. |
| R-04 · F184 fig. 1 | IDEF1X: caja independiente/dependiente. | Disponible; Escena comprueba esquinas según dependencia real y separación de claves. | Un vínculo no identificador no vuelve independiente una entidad dependiente por otro vínculo. |
| R-05 · F184 figs. 4–7 | IDEF1X: continua/discontinua, punto en el lado de la FK, P/Z/1 y rombo opcional. | Disponible; Escena contrasta los cuatro casos y vínculo identificador. | La prueba SVG no sustituye inspección visual del dibujo final. |
| R-06 · DB | Tipos completos, ancho propio y textos separados. | Disponible; Escena comprueba NUMBER con parámetros y nombres largos sin elipsis. | Legibilidad a zoom y tamaño de pantalla requiere revisión real. |

## Modelo conceptual, transformación y límites

| ID / fuente | Operación y ruta | Estado y prueba concreta | Carencia o precaución |
| --- | --- | --- | --- |
| C-01 · T2 pp. 2–4 / T3 p. 9 | Botón Relacional/Chen. | Disponible; Conceptual, diez alternancias conservan IDs, SQL, semántica y posiciones; Aplicación conserva modo y notación. | No es conversión automática ni inversa universal. |
| C-02 · DB / T3 p. 9 | Abrir formato 1; Chen proyecta tablas anteriores. | Disponible; Conceptual, promoción a General sin asociaciones nativas inventadas; archivos conservados. | No deduce jerarquías, atributos multivaluados, debilidad ni relación N:N desde dos FKs. |
| C-03 · T2 pp. 5–7 | Chen → Entidad y Atributo; propietario, clave y tipo. | Disponible; Conceptual, trazas y edición compartida; Aplicación, diálogos y persistencia. | Entidad nativa y proyección heredada conservan procedencias distintas. |
| C-04 · T2 pp. 7–8 / P1 pp. 2–3 | Relación nativa, 2/3 participaciones, roles y atributos. | Disponible; Conceptual, N:N/ternaria; Escena, un rombo y ramas; Aplicación, N:N y ternaria GUI con período. | No equivale a crear FKs al dibujar; la relación puede quedar pendiente. |
| C-05 · T2 pp. 8, 12 / ERE p. 4 / P1 p. 3 | Relación → Varios: participación absoluta y cardinalidad ternaria por combinación. Correspondencias: contexto explícito. | Disponible; Dominio y Ejemplos, rama one añade AK sobre los otros roles y contexto; incompletos bloquean SQL; legado desconocido conserva SQL. Aplicación prueba los controles. | Cardinalidad por combinación, mínimos/máximos absolutos e identidad son decisiones distintas. Los mínimos residuales siguen documentales. |
| C-06 · T2 p. 8 | Recursiva: una entidad repetida con dos roles. | Disponible; Conceptual, participaciones distintas; Escena, dos puertos/ramas identificables. | Compartir entidad no autoriza fusionar roles. |
| C-15 · ERE p. 4 / P1 p. 3 | Letra 1/N junto al rombo en cada rama. | Disponible; Conceptual, «La letra de cardinalidad se deduce…»; Escena, «Cada rama Chen lleva la letra…»; Aplicación, diálogo y Varios. | Binaria: deducida del máximo de la otra rama. Ternaria: la elige el autor; automática muestra N. |
| C-16 · ERE p. 2 / T2 p. 5 | Rombo doble del vínculo identificador. | Disponible; Conceptual, «El vínculo identificador se reconoce…»; Escena, rombo doble y FK identificadora proyectada. | Se dibuja al elegir el vínculo en la débil o una FK identificadora; no se deduce de nombres. |
| C-17 · ERE p. 5 / T2 p. 16 | Arcos de subconjunto en las subclases y doble línea de totalidad. | Disponible (dibujo); Escena, «…las subclases llevan el arco». | La transformación relacional usa la estrategia de C-13. |
| C-18 · P1 p. 2 / ERE pp. 5–10 | Supuestos: enunciado, supuesto y semántica perdida, por objeto o globales. | Disponible; Supuestos prueba altas, ediciones, rechazo, JSON y desvinculación al borrar; Interfaz, categoría; Aplicación, diálogo, visión general y deshacer. | Un supuesto cuyo objeto se borra conserva el texto como global. No se evalúa la verdad del supuesto. |
| C-07 · T3 §3.6 | Correspondencias → tabla asociativa y elección explícita de clave. | Disponible; Conceptual, N:N con atributo y ternaria con período; Aplicación, período en clave y persistencia. | No se supone que todas las FKs basten; la política de identidad la elige el autor. |
| C-08 · T3 §3.6 | Correspondencias → FK binaria, lado receptor e identificación. | Disponible; Conceptual/Aplicación, materialización y receptor compatible. | Cambiar después a otra estrategia no tiene inversa automática; se conserva la decisión existente o se resuelve desde el origen. |
| C-09 · T2 p. 5 / T3 §3.6 | Entidad débil → propietaria/vínculo; atributo clave parcial; FK identificadora. | Disponible; Conceptual, PK heredada más parcial y SQL; Aplicación ejecuta los controles de debilidad y vínculo. | Una FK del legado no prueba por sí sola entidad débil conceptual. |
| C-10 · T2 pp. 6–7 / T3 §3.6 | Atributo compuesto → descomponer; componentes con propietario. | Disponible; Conceptual/Aplicación, flatten y componentes. Ejemplos comprueba compuesto de entidad y de relación en el archivo 06. | Sin componentes o sin decisión queda pendiente; no se infiere agrupación desde columnas. |
| C-11 · T2 pp. 6–7 | Derivado → regla y elección omitir/almacenar. | Disponible como política documental; Conceptual/Aplicación, omit y stored sin perder la regla. | No se evalúa fórmula ni genera SQL calculado. Sin política queda pendiente. |
| C-12 · T2 pp. 6–7 / T3 pp. 29–30 | Atributo → Multivaluado → Tabla auxiliar. | Disponible; Dominio y Ejemplos prueban simple/compuesto, PK propietaria completa, FK y retirada escalar. Aplicación prueba materializar/undo/reapertura. | Exige estrategia y hojas simples almacenadas. La FK no impone mínimo de valores por propietaria. |
| C-13 · T2 pp. 15–16 / T3 pp. 31–34 | Especialización → Tablas de superclase y subclases. | Disponible; Dominio y Ejemplos prueban PK/FK heredada, cuatro combinaciones d/s-total/parcial y columna local conservada. Aplicación prueba rechazo→corrección→materializar con historial. | Una estrategia implementada. Disyunción/totalidad son documentales; las otras tres estrategias no están implementadas. |
| C-14 · ERE pp. 5–10 / T3 p. 9 | Notas y revisión → Ver origen. | Disponible; revisión distingue pendientes y documentales; Aplicación prueba la ruta de revisión. | No genera la justificación global del diseño ni demuestra fidelidad al enunciado. |

## Persistencia, exportaciones y entrega

| ID / fuente | Operación y ruta | Estado y prueba concreta | Carencia o precaución |
| --- | --- | --- | --- |
| IO-01 · DB | Archivo → Guardar/Abrir y recuperación del navegador. | Disponible; Modelo/Conceptual, JSON completo, IDs/referencias inválidos rechazados. | Formato 2 no promete lectura por versiones antiguas de la app; respaldo entre equipos mediante JSON. |
| IO-02 · DB | Deshacer/Rehacer y movimientos por representación. | Disponible; operaciones atómicas y pruebas de aplicación; posiciones independientes probadas en Conceptual; Aplicación ejecuta arrastre FK/Chen, colisión, cancelación y reapertura. | La revisión de gestos reales y despliegue está en Verificación. |
| IO-03 · DB | Ajustar, Distribuir, Imagen SVG e Imprimir/PDF. | Disponible; Escena usa límites comunes para textos, ramas y marcadores; SVG/XML probado. | Impresión depende del navegador; revisar diagramas grandes, solapes y márgenes en uso real. |
| IO-04 · DB / T3 | Archivo → SQL, revisar y descargar. | Disponible; Modelo/Conceptual/Tipos/Dominio/Ejemplos prueban DDL, claves, CHECK, NUMBER→NUMERIC, auxiliares, herencia y contexto. | Sin ejecución en SGBD. Decisiones no resueltas bloquean SQL completo. El ALTER TABLE ADD CONSTRAINT exportado no es compatible con SQLite. |
| IO-05 · DB | Abrir entrega offline construida. | Bundle comprueba recursos y arranque del artefacto real; instrucciones en README. | Sincronización, cuentas y colaboración no están implementadas. |
| IO-07 · P1 p. 3 | Archivo → Visio 2010 (.vdx) del diagrama relacional. | Disponible (0.4.3); Visio prueba el XML equilibrado, la conversión de píxeles a pulgadas con el eje invertido, el pegado de los conectores a los grupos, las líneas discontinuas, el rombo opcional, el código P/Z/1, la autorreferencia, las patas de gallo, el escape de caracteres y la salida relacional desde Chen; LibreOffice abre el archivo en Verificación. | Dibujo editable, no modelo de base de datos de Visio; comprobación en Visio 2010 real pendiente del usuario. |
| IO-06 · P1 p. 2 | Archivo → Memoria HTML / Memoria Markdown. | Disponible; Supuestos prueba secciones, letras y pares, avisos, escapes y determinismo; Aplicación prueba la descarga. | La memoria reúne el documento; la justificación y la fidelidad al enunciado siguen siendo del autor. Word abre el HTML; no se genera DOCX. |
| AC-01 · P1 | Entregables académicos Visio/Access. | Parcial; Archivo → Visio 2010 escribe el diagrama relacional como dibujo XML .vdx que Visio 2010 abre y edita (IO-07). | No se abren archivos de Visio ni se generan VSD binario o VSDX; sin bases de datos Access. El .vdx no lleva las propiedades de base de datos de Visio. |

## Cobertura del ejemplo por requisito

Las etapas remiten a los pasos de la [guía](practice-guide.md). Los nombres
de archivo completos y sus descargas están en [ejemplos](../examples/README.md).
_Ejemplos_ indica pruebas de los JSON reales; _Aplicación_ significa eventos
simulados. La evidencia de navegador y publicación sigue en [verificación](verification.md).

| Requisito / fuente | Archivo y paso de guía | Resultado comprobable | Evidencia y límite |
| --- | --- | --- | --- |
| Tipos/PK/AK/dominio · T2 pp. 5, 11–12; T3 pp. 5–8; P1 p. 3 | 00-nucleo · etapa 0, pasos 1–4 y 6 | Cuatro familias; AK serie, DEFAULT/CHECK de valor. | Ejemplos: «Núcleo entregado»; Tipos/Aplicación. No evaluación de filas. |
| Binaria 1:N · T2 pp. 9, 12; T3 pp. 23–26 | 00-nucleo · etapa 0, pasos 5–6 | Coordina FK requerida en Sesion, sin alterar PK hija. | Ejemplos: «Núcleo entregado»; Conceptual. Mínimos residuales documentales. |
| Binaria 1:1 · mismas fuentes | Copia 00 · «Practicar 1:1 y acciones compatibles», paso 1 | Receptor elegido, FK anulable y UNIQUE. | Modelo/Conceptual prueban unicidad. El gesto propuesto necesita verificación de navegador. |
| Acciones · T3 pp. 8, 16–19; P1 p. 3 | Copia 00 · «Acciones referenciales de Coordina», pasos 1–5; «acciones compatibles», pasos 2–6 | CASCADE en la FK del núcleo; SET NULL obligatorio rechazado sin cambiarla; variantes opcional/predeterminado. | Dominio prueba FK nativa, auxiliar y herencia; Aplicación usa 00 real, undo/redo, rechazo, origen, rematerialización y reapertura. Modelo prueba variantes. Sin SGBD. |
| N:N con atributo · T2 pp. 7–9; T3 pp. 27–28 | 01-nn · etapa 1, pasos 1–5 | Dos FKs, PK pareja y fechaAlta. | Ejemplos abre archivo; Conceptual/Aplicación. |
| Ternaria/identidad · T2 p. 8; P1 pp. 2–4 | 02-ternaria-pendiente/resuelta · etapa 2, pasos 1–5 | Tres participaciones; tres FKs + instante en PK. | Ejemplos: «Ternaria entregada»; Dominio/Aplicación. No sustituida por binarias. |
| Cardinalidad por combinación/contexto · P1 p. 3 | Mismos 02 · etapa 2, pasos 3, 6–7 | AK Persona/Sesion/instante, separada de PK y participación. | Ejemplos y Dominio comprueban unicidad declarada y bloqueo sin contexto; no inserción de datos. |
| Multivaluados simples/compuestos · T2 pp. 6–7; T3 pp. 29–30 | 03-multivaluados-pendiente/resuelto · etapa 3, pasos 1–5 | Dos auxiliares; PK/FK propietaria de dos componentes y hojas valor. | Ejemplos: «Multivaluados entregados»; Dominio/Aplicación. Sin escalar divergente. |
| Jerarquía d/s-total/parcial · T2 pp. 15–16; T3 pp. 31–34 | 04-jerarquia-pendiente/resuelta y 04b · etapa 4, pasos 1–6 | Rechazo PK local, columna conservada y PK/FK heredada. | Ejemplos: «Jerarquía entregada», cuatro combinaciones; Dominio/Aplicación. Disyunción/totalidad documentales. |
| Débil/clave parcial · T2 p. 5; T3 pp. 21–22 | 05-debil · etapa 5, pasos 1–5 | Puerto PK instrumento + numero; FK identificadora. | Ejemplos: «Débil entregada»; Conceptual/Aplicación. |
| Compuesto de entidad y de relación · T2 pp. 6–7; T3 pp. 19–20, 23–28 | 06-compuestos-recursiva · etapa 6, pasos 1–3 | Ubicación→edificio/sala; acreditación→emisor/referencia. | Ejemplos: «Débil entregada» comprueba columnas en propietarias distintas. |
| Derivado · T2 pp. 6–7 | Mismo 06 · etapa 6, paso 4 | antiguedad conserva regla; omit no crea columna. | Ejemplos/Conceptual/Aplicación. stored conserva valor, no lo calcula. |
| Recursiva · T2 p. 8; T3 p. 35 | Mismo 06 · etapa 6, paso 5 | Orientacion con roles y FKs distintos a Persona. | Ejemplos/Conceptual/Escena. Compartir entidad no fusiona participaciones. |
| Supuestos/semántica residual · ERE pp. 6–10; P1 p. 2 | Notas 00–06 · etapa 7, paso 1 | Pendiente/documental y Ver origen. | Correspondencias/estados en archivos; Aplicación. La justificación corresponde al autor. |
| Modos, historial, disposición · DB; T2 pp. 2–4 | Cualquier archivo · etapa 7, pasos 2–4 | IDs/SQL estables y posiciones por vista; Escape/undo/redo. | Ejemplos alterna modos; Aplicación/Escena prueban eventos/geometría. Requiere inspección visual real. |
| JSON/SVG/VDX/SQL/impresión · DB; P1 p. 4 | Cualquier resuelto · etapa 7, pasos 5–8 | JSON editable; SVG completo; dibujo de Visio 2010; DDL; vista previa de impresión. | Ejemplos JSON/SQL; Escena/bundle; Visio contrasta el .vdx; navegador en Verificación. No Access ni ejecución SQL. |

## Uso de esta matriz

Para practicar una operación, sigue la [guía](practice-guide.md) y comprueba
su resultado. Para evaluar una carencia, distingue tres preguntas: ¿se guarda
el hecho?, ¿se transforma de forma trazada?, ¿el motor real lo impone? Una
respuesta afirmativa a la primera no resuelve las otras dos.

La identidad visual propia, los textos originales y las rutas inspiradas en
documentación no constituyen una revisión jurídica de apariencia. El alcance
existente está en [derechos](intellectual-property.md). Las fuentes del curso
permanecen fuera de la distribución.
