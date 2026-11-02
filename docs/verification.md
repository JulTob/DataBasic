# Verificación de DataBasic 0.1.1

Fecha: 2 de noviembre de 2026.

## Resultados

| Comprobación | Estado | Evidencia y alcance |
| --- | --- | --- |
| Sintaxis de los módulos, scripts y pruebas | Superada | `npm run check`. |
| Pruebas automatizadas | 43 superadas | Modelo, serialización, SQL, SVG, ventanas, eventos simulados y tipos NUMBER. |
| Motor de distribución Graphviz incluido | Superada | El archivo redistribuido calcula posiciones sin descargar recursos. |
| Generación estática | Superada | `npm run build` produce `dist/` con todos los recursos locales. |
| Sintaxis del script generado | Superada | `node --check dist/app.bundle.js`. |
| Resolución de recursos de la entrega | Superada | Las referencias locales de HTML y los avisos de terceros están incluidos. |
| Prueba en un navegador real | Pendiente | El entorno rechazó tanto el servidor local como la apertura de archivos mediante la herramienta de navegador. |
| Comparación visual con Visio 2010 | Pendiente | Se reconstruyó la estructura documentada; no se certifica identidad visual. |
| Contraste con los apuntes del curso | Realizado | [Requisitos del curso](course-requirements.md). IDEF1X, perfil restrictivo de tipos y editor ERE quedan pendientes de implementar. |
| Creación del repositorio remoto y publicación | Pendiente | La conexión con GitHub falló y la solicitud de acceso ampliado fue rechazada automáticamente. |

Las pruebas se ejecutaron con Node.js 26. El flujo de GitHub Actions está
configurado para Node.js 22, pero todavía no se ha ejecutado en GitHub.
Las pruebas de eventos usan un doble de DOM: verifican el código de las
interacciones, no la maquetación, los clics físicos ni los diálogos nativos.

## Cobertura funcional

- Operaciones inmutables y rechazo atómico de cambios incoherentes.
- PK y FK compuestas, migración y reutilización de columnas compatibles.
- Relaciones identificadoras, autorreferencias y referencias cíclicas.
- Conservación de referencias al renombrar y reordenar columnas.
- Bloqueo del borrado de columnas referenciadas.
- Eliminación de entidades y relaciones sin borrar columnas ajenas.
- Coherencia entre opcionalidad, nulabilidad y acciones referenciales.
- Guardado/lectura con formato versionado y validación de importaciones.
- Restricciones UNIQUE para cardinalidades con máximo uno.
- Escape de nombres en SVG, HTML y SQL.
- Crear, editar, deshacer, rehacer, guardar y conectar mediante eventos simulados.
- Disponibilidad de las ventanas y categorías especificadas para esta base.
- NUMBER con precisión/escala, límites documentados, propagación a FKs,
  guardado y traducción SQL a NUMERIC sin modificar el modelo.

## Revisión manual cuando se abra en un navegador

1. Abrir `dist/index.html` y comprobar que no aparecen errores.
2. Arrastrar una entidad, editar sus columnas y conectar padre e hijo.
3. Mover las tablas y comprobar el seguimiento de las relaciones.
4. Ajustar Varios y las opciones del documento.
5. Descargar y volver a abrir un ejercicio; comprobar el guardado automático.
6. Exportar SVG/SQL e imprimir un diagrama desplazado y ampliado.
7. Comparar ventanas, etiquetas y procedimientos con los apuntes del profesor.

## Fuentes del comportamiento esperado

[Especificación y referencias de Visio 2010](specification.md).
