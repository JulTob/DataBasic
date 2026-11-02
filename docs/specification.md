# DataBasic 0.1.2 — especificación de la base funcional

Estado: alcance de implementación de la base funcional. Los apuntes del profesor
se han recibido y contrastado en [requisitos del curso](course-requirements.md).
La equivalencia con la asignatura sigue siendo parcial. Microsoft Visio 2010
ha servido como referencia funcional y visual; la interfaz se ha implementado
con código propio. Esto no determina por sí solo los derechos sobre su
apariencia. No se afirma equivalencia completa ni identidad píxel a píxel.
El alcance de las licencias figura en el [aviso de derechos](../NOTICE.md).

## Flujo y ventanas

| ID | Requisito comprobable | Referencia |
| --- | --- | --- |
| UI-01 | Cinta de comandos superior, formas a la izquierda, lienzo central y propiedades abajo. | Tutorial 2010, pp. 7–9; tutorial IT525, pp. 3–5. |
| UI-02 | Seleccionar una entidad muestra Definición, Columnas, Identificador principal, Índices y Notas. | Ayuda de definición; tutorial 2010, pp. 8–9. |
| UI-03 | Definición permite nombres físico/conceptual, sincronización y espacio de nombres. | Ayuda de definición, aplicable explícitamente a 2010. |
| UI-04 | Columnas presenta nombre, tipo, requerido, PK y notas; permite añadir, editar, borrar y reordenar. | Tutorial 2010, p. 9; ayuda de columnas. |
| UI-05 | Una relación ofrece Definición, Nombre, Varios y Acción referencial. | Tutorial 2010, pp. 14–16; IT525, pp. 7–8. |
| UI-06 | Opciones del documento separa General, Tablas y Relaciones; controla nombres, tipos, claves, notación y cardinalidad. | Tutorial 2010, pp. 5–6 y 12. |
| DB-01 | Crear una relación padre→hijo migra la PK completa como FK; reutiliza columnas homónimas compatibles. | Tutorial IT525, pp. 6–7. |
| DB-02 | Las relaciones identificadoras incorporan la FK en la PK hija y hacen obligatoria la participación del hijo. | IT525, pp. 8–11. |
| DB-03 | Se admiten cero/muchos, uno/muchos, cero/uno y exactamente uno; la opcionalidad del padre se configura por separado. | IT525, p. 8. |
| DB-04 | Las referencias usan IDs estables: renombrar no rompe relaciones. Una eliminación referenciada se rechaza. | Decisión de implementación para mantener DB-01. |
| DB-05 | SET NULL exige una FK anulable; SET DEFAULT exige valores predeterminados. | Ayuda de integridad referencial. |
| IO-01 | Guardar/abrir documentos JSON versionados y recuperar el último ejercicio desde el navegador. | Adaptación a una aplicación web sin servidor. |
| IO-02 | Deshacer/rehacer incluye cambios del modelo, relaciones y posiciones. | Requisito de usabilidad de esta entrega. |
| IO-03 | Exportar SVG y SQL; imprimir permite obtener PDF desde el navegador. | Ampliación educativa; no se atribuye generación SQL a Visio 2010 Professional. |
| WEB-01 | La aplicación se sirve como archivos estáticos, con rutas relativas, mediante GitHub Pages. | Documentación de GitHub Pages. |

## Decisiones y contratos

- Cada cambio del dominio es atómico y devuelve un documento nuevo. Si falla,
  conserva el original y presenta el motivo.
- Una PK, también compuesta, implica NOT NULL en todas sus columnas.
- Las FKs de esta versión referencian la PK completa del padre. La selección
  de claves alternativas queda fuera del alcance inicial.
- Al quitar una relación se conservan las columnas migradas. Al borrar una
  entidad se eliminan sus relaciones tras confirmación del usuario.
- Cambiar la PK de un padre relacionado requiere resolver primero sus relaciones.
- La opcionalidad exige que todas las columnas de la FK tengan una política
  de nulos uniforme. Es una simplificación explícita de esta versión.
- Cambiar una relación identificadora a no identificadora no elimina partes
  de la PK: esa clave puede seguir siendo necesaria por otra razón.
- El SQL usa sintaxis portable con identificadores entre comillas. Se generan
  tablas antes que restricciones FK mediante ALTER TABLE para permitir ciclos.
  El resultado debe adaptarse al motor escogido; no se ejecuta en esta app.
- Las cardinalidades con máximo uno generan UNIQUE sobre la FK. Los mínimos
  de hijos se documentan, pero no se pueden imponer con una FK por sí sola.
- Se avisa de entidades sin PK; no se prohíben durante el aprendizaje.
- Los datos permanecen en el navegador o en los archivos descargados.
- Se admite NUMBER con sus parámetros documentados. Se conserva esa notación
  en el modelo y se traduce a NUMERIC al exportar SQL para el destino actual.
  Los rangos y las fuentes de esta decisión están en los requisitos del curso.

## Diferencias y trabajo pendiente

- DataBasic 0.1 cubre un subconjunto de la interfaz y del modelador de 2010.
  Conserva ubicación y terminología de los controles documentados. Las pestañas
  del producto completo ajenas al modelado no se reproducen.
- Se usan iconos de Lucide, tipografía disponible en el sistema y adaptación
  al ancho de pantalla. El diseño inicial buscó una apariencia cercana a
  Microsoft Office 2010. Se adopta una identidad visual de DataBasic:
  superficies planas claras, acentos verdes y tipografía del sistema,
  conservando la distribución de paneles, los comandos y el flujo de modelado.
  Esta diferenciación y los avisos de licencia no certifican ausencia de
  derechos ajenos. La identidad visual exacta con otro producto no es un
  criterio de aceptación.
- No hay importación/exportación VSD/VDX/VSDX, ingeniería inversa, ODBC,
  ejecución SQL, procedimientos, triggers, tipos objeto, categorías/subtipos,
  colaboración ni rangos arbitrarios de cardinalidad.
- Las vistas admiten nombre, columnas, notas y consulta; no hay editor visual
  de consultas ni dependencias entre vistas.
- La creación de relaciones se realiza por dos clics (padre e hijo); no se
  reproduce todavía el enganche de los dos extremos de un conector suelto.
- La revisión documental ha identificado que la práctica exige IDEF1X;
  esa notación todavía no está implementada. El contraste funcional con los
  apuntes no certifica una réplica exacta ni autoriza la reproducción de
  expresión gráfica o textual protegida. Véase el
  [estado de la revisión de derechos](intellectual-property.md).

## Verificación de aceptación

1. Crear dos entidades; editar nombre, tipo, PK y requerido.
2. Conectar padre/hijo y comprobar migración de todos los componentes de la PK.
3. Cambiar nombre y comprobar que la referencia se conserva.
4. Cambiar cardinalidad/opcionalidad y observar la notación.
5. Crear una relación identificadora y comprobar la PK de la hija.
6. Rechazar la eliminación de una columna relacionada sin modificar el modelo.
7. Guardar/abrir y recuperar el modelo con sus posiciones y opciones.
8. Deshacer/rehacer una edición y un movimiento.
9. Exportar SVG/SQL sin perder acentos ni introducir HTML ejecutable.
10. Abrir la compilación en una subruta como /DataBasic/.

## Fuentes

- [Microsoft: definición de entidades y vistas, Visio 2010](https://support.microsoft.com/en-us/visio/database-properties-for-entity-and-view-shapes-definition).
- [Microsoft: columnas y campos](https://support.microsoft.com/en-us/visio/database-properties-for-entity-type-and-view-shapes-columns-fields). La página actual enumera versiones posteriores; se contrasta con los tutoriales de 2010.
- [Microsoft: definición de relaciones](https://support.microsoft.com/en-us/visio/define-a-relationship-in-a-database-model-diagram). Página actual: referencia complementaria, no evidencia exclusiva de la versión 2010.
- [Microsoft: integridad referencial, Visio 2010](https://support.microsoft.com/en-us/visio/preserve-referential-integrity-in-database-model-diagrams).
- [DeVry: Creating Entity Relationship Diagrams in MS Visio, 2011](https://lms.devry.edu/lms/CourseExport/files/4c59b998-a778-4673-b5b5-1040a4a59543/documents--Creating_ERD_in_MS_Visio_2010.pdf).
- [IT525: tutorial basado en Visio 2010 Professional](https://kapextmediassl-a.akamaihd.net/IST/IT525/IT525_1805D/Documents/IT525_Unit_2_Visio_Tutorial.pdf).
- [Microsoft: guía general del producto 2010](https://www.microsoft.com/en-gb/download/details.aspx?id=27196). Se han leído las copias DOCX aportadas por el usuario y se han inspeccionado sus figuras de interfaz. No es un manual detallado del modelador de bases de datos.
- [Materiales y requisitos de la asignatura, páginas y contraste funcional](course-requirements.md).
- [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).
