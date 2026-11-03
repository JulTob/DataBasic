# DataBasic 0.3.2 — especificación funcional

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

La aplicación 0.3.2 escribe documentos `.databasic.json` de **formato 2**.
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
| Barra superior | Relacional/Chen, Perfil Curso/General y acceso a revisión. |
| Tabla → Definición | Nombre físico y conceptual, sincronización y espacio de nombres. Propietario/origen se muestran sin edición; no hay ingeniería inversa. |
| Tabla → Columnas | Nombre, tipo completo, requerido, PK y notas; agregar, quitar, editar y reordenar. |
| Columnas → Editar… | Familia, longitud o precisión/escala, predeterminado y dominio declarativo. |
| Tabla → Identificador principal | Selección de una o varias columnas PK. |
| Tabla → Índices / Claves alternativas | Índices separados de las claves candidatas alternativas; creación, edición y eliminación. |
| FK → Definición / Nombre | Correspondencia de todos los componentes PK/FK y textos de lectura. |
| FK → Varios | Cardinalidad y dependencia: hijos por padre, identificación y si el hijo admite ausencia de padre. Volver a no identificadora saca la FK de la PK hija, salvo que otra relación identificadora la necesite. |
| FK → Acción referencial | Acción al borrar el padre o actualizar su clave. |
| Chen → Relación | Dos o tres participaciones, entidad, rol, mínimo/máximo y letra 1/N por rama. Puede repetirse una entidad en roles distintos. |
| Relación nativa → Atributos / Varios / Correspondencias | Atributos propios; roles y límites; elección de estrategia y clave. |
| Chen → Atributo / Especialización | Tipología y dominio de atributos; superclase, subclases, disyunción y totalidad. La transformación puede seguir pendiente. |
| Vista → Opciones de visualización | General, Tablas y Relaciones; nombres, tipos, claves, requerido, notación y textos. |

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
- Las FKs referencian la PK completa del padre. La creación evita reutilizar
  la identidad PK hija solo por tener el mismo nombre; advierte cuando una
  clave única limita efectivamente a uno lo dibujado como muchos.
- Una FK identificadora integra sus columnas en la PK hija. Una entidad
  débil ERE necesita además propietaria, clave parcial y vínculo elegido;
  no se deduce solo por encontrar una FK identificadora.
- SET NULL necesita columnas FK anulables; SET DEFAULT, predeterminados.
  La aplicación valida la estructura declarada, no la existencia de datos
  que hagan válido el predeterminado en un motor real.
- Los dominios conservan mínimo, máximo, valores permitidos y condición
  adicional. Se traducen a CHECK cuando corresponden a columnas almacenadas.
  Una expresión libre se conserva como SQL del autor; no se ejecuta ni se
  demuestra que represente la regla de negocio deseada.

## Transformación conceptual

| Construcción | Alcance 0.3.2 |
| --- | --- |
| Entidad y atributo simple | Tabla/columna trazadas; atributos propios de relación se materializan con su relación. |
| Binaria mediante FK | Lado receptor explícito compatible con máximo uno de esa participación; se conservan restricciones residuales. |
| N:N o ternaria | Tabla asociativa con una FK por participación. Clave elegida entre claves participantes y atributos simples almacenados; admite un período que distinga ocurrencias. |
| Recursiva | Participaciones y roles con identidades distintas aunque compartan entidad. |
| Débil | Definición permite propietaria y vínculo; el atributo marca clave parcial y la materialización binaria permite identificación. La PK heredada se combina con la parcial. |
| Compuesto | El editor de atributo permite descomposición explícita y componentes. No se infiere una agrupación por parecido de nombres. |
| Derivado | El editor permite omitir o almacenar; regla de derivación documental, sin evaluarla ni generar fórmula SQL. |
| Multivaluado y especialización | Se editan y guardan, pero no tienen transformación implementada. Mantienen estado pendiente y bloquean SQL completo. |

Los pares Chen se leen en la rama de **esa entidad y ese rol**: cuántas
ocurrencias de la relación admite una ocurrencia de la entidad. No se copian
sin más los marcadores PK/FK. Los pares de una ternaria no expresan por sí
solos todas sus restricciones posibles; se conservan también las notas.

La grafía Chen sigue la introducción al ERE del curso: la **letra 1/N** junto
al rombo es la razón de cardinalidad de esa rama. En una binaria se deduce
como el máximo de la otra participación y no se edita; en una ternaria cada
rama guarda su letra (`cardinality`, opcional en el formato 2) y el autor la
elige. La **participación total** (mínimo mayor que cero) se dibuja con doble
línea. El **vínculo identificador** de una entidad débil, o una estrategia FK
identificadora, dibuja el rombo doble. En una especialización, el círculo
muestra `d` o `s`, la doble línea indica totalidad y cada subclase lleva el
arco de subconjunto abierto hacia el círculo.

## Dibujo, archivos y SQL

IDEF1X distingue entidades independientes/dependientes, vínculos
identificadores/no identificadores, opcionalidad y cardinalidad del hijo.
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

Guardar/abrir JSON, exportar SVG y mostrar/descargar SQL son operaciones
disponibles; Imprimir/PDF utiliza la ventana del navegador. El guardado local
no sincroniza equipos. El SQL de estudio usa sintaxis tipo PostgreSQL/SQL
estándar y traduce NUMBER a NUMERIC; no se ejecuta en DataBasic. Restricciones
documentales aparecen como comentarios; decisiones pendientes bloquean la
exportación completa. Una FK sola no exige que todo padre tenga hijos.

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
