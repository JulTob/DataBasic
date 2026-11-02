# DataBasic

Un modelador educativo de bases de datos que funciona en el navegador.
Reproduce la organización del espacio de trabajo del modelador de Visio 2010:
cinta superior, formas a la izquierda, diagrama y propiedades abajo.

La primera versión permite crear entidades y vistas, editar columnas, definir
claves simples o compuestas, conectar tablas y ajustar cardinalidad,
opcionalidad e integridad referencial. Incluye deshacer/rehacer, índices,
notas, distribución automática, un ejemplo de biblioteca y exportación SVG/SQL.

Es una implementación independiente y parcial. **Todavía no es una réplica
exacta de Visio 2010** y no abre archivos VSD. El contraste con los apuntes
ha identificado que falta implementar IDEF1X y el editor conceptual ERE.
Consulta los [requisitos del curso](docs/course-requirements.md) y el alcance
en [la especificación](docs/specification.md).

La versión 0.1.1 incorpora NUMBER y sus variantes con precisión y escala.
El editor general todavía admite otros tipos: no verifica por sí solo la
restricción de usar únicamente los cuatro tipos permitidos en la práctica.

## Abrir la aplicación

Abre [DataBasic online](https://jultob.github.io/DataBasic/) en Safari,
Chrome o Firefox. No necesitas instalar nada ni iniciar sesión.

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

## Primer ejercicio

1. Abre **Archivo → Nuevo**, o estudia el ejemplo de biblioteca inicial.
2. Arrastra **Entidad** desde Formas al lienzo.
3. Selecciona la entidad y escribe sus nombres en **Definición**.
4. Abre **Columnas** o haz doble clic sobre la entidad. Añade columnas,
   tipos de datos, requerido y PK.
5. Pulsa **Relación** y selecciona primero el padre y después el hijo.
   La clave primaria completa del padre se incorpora como clave foránea.
6. Selecciona la relación y abre **Varios** para ajustar las reglas.
7. Usa **Comprobar** y descarga una copia con **Archivo → Guardar**.

Los archivos propios terminan en `.databasic.json`. Se pueden abrir de nuevo
en **Archivo → Abrir**. El guardado automático conserva el último ejercicio
en ese navegador y ese origen; no sincroniza equipos ni publica tus ejercicios.

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
| `src/io/` | Generación de SQL. |
| `src/app.js` | Interacciones, historial y guardado. |
| `tests/` | Reglas del modelo, ventanas y eventos de la aplicación. |
| `docs/` | Especificación, fuentes y resultados de verificación. |
| `public/vendor/` | Bibliotecas redistribuidas con sus avisos. |

El modelo usa identificadores estables para las referencias. Cada operación
valida sus obligaciones antes de aceptar el nuevo documento. Una operación
rechazada conserva el estado anterior y explica la causa.

## Límites de esta versión

- Las FKs referencian la PK completa. No se eligen todavía claves alternativas.
- No hay ingeniería inversa, ODBC, ejecución SQL, triggers, tipos objeto ni
  rangos arbitrarios de cardinalidad.
- El SQL es una ayuda de estudio con sintaxis tipo PostgreSQL/SQL estándar;
  debe revisarse para el motor de clase. Las participaciones mínimas del padre
  no se garantizan con una FK por sí sola.
- La interfaz se ha reconstruido siguiendo la documentación. La comparación
  documental con los apuntes y una prueba de uso online están hechas;
  la identidad visual con Visio sigue pendiente de verificar.
  La práctica evaluable exige archivos de Visio y Access, que la aplicación
  todavía no genera.

## Bibliotecas y fuentes

- [Lucide](https://lucide.dev/), iconos.
- [idb-keyval](https://github.com/jakearchibald/idb-keyval), guardado en IndexedDB.
- [Viz.js / Graphviz](https://viz-js.com/), distribución automática del diagrama.
- [Versiones, licencias y código fuente de terceros](public/vendor/THIRD-PARTY.md).
- [Fuentes de Visio 2010 y trazabilidad funcional](docs/specification.md#fuentes).

Visio es una marca de Microsoft. DataBasic no está afiliado a Microsoft.
