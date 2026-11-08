# Ejercicios de la asignatura

Resueltos a partir de los enunciados de los apuntes (guion de introducción al
ERE y Tema 2), con la notación del curso. Cada archivo lleva sus supuestos en
la categoría Supuestos: lo que dice el enunciado, lo que se ha supuesto y lo
que el modelo no impone. Son borradores para comparar con la solución del
profesor; ajusta claves, cardinalidades o nombres si difieren.

| Archivo | Enunciado | Qué muestra |
| --- | --- | --- |
| [curso-hoteles](curso-hoteles.databasic.json) | Cadena hotelera (guion ERE, ejercicio 3) | Entidades débiles Habitacion y Factura, clave alternativa del nombre, N:N Reserva–Habitacion, especialización total y disjunta de Empleado, dominios 1..5 y CHECK de fechas. |
| [curso-videoclub](curso-videoclub.databasic.json) | Videoclub (Tema 2, ejercicio 3) | Clave compuesta (título, año), copia como entidad débil, actores como multivaluado, alquiler N:N con la fecha en la clave. |

# Club de observación

Ejemplos originales para DataBasic 0.4.0, formato de archivo 2.
Descarga cada JSON y usa __Archivo → Abrir__ en una práctica independiente.
En GitHub, usa __Download raw file__ desde la página del archivo.
La [guía](../docs/practice-guide.md) explica pasos y resultados esperados.

| Archivo | Para practicar |
| --- | --- |
| [00-nucleo](00-nucleo.databasic.json) | Persona, Instrumento y Sesion; tipos, PK, AK, dominio y binaria. |
| [01-nn](01-nn.databasic.json) | Habilitacion N:N con fecha propia. |
| [02-ternaria-pendiente](02-ternaria-pendiente.databasic.json) | Elegir cardinalidad, clave de ocurrencia y contexto. |
| [02-ternaria-resuelta](02-ternaria-resuelta.databasic.json) | Comparar las tres FKs, PK temporal y AK por combinación. |
| [03-multivaluados-pendiente](03-multivaluados-pendiente.databasic.json) | Materializar etiqueta y calibracion compuesta. |
| [03-multivaluados-resuelto](03-multivaluados-resuelto.databasic.json) | Comparar las dos tablas auxiliares y FKs compuestas. |
| [04-jerarquia-pendiente](04-jerarquia-pendiente.databasic.json) | Rechazar PK local y resolverla expresamente, sin borrar columna. |
| [04-jerarquia-resuelta](04-jerarquia-resuelta.databasic.json) | Comparar tablas de superclase/subclases, disjunta y total. |
| [04b-jerarquia-solapada-parcial](04b-jerarquia-solapada-parcial.databasic.json) | Revisar restricciones residuales con la misma estrategia. |
| [05-debil](05-debil.databasic.json) | Puerto con número parcial y propietaria Instrumento. |
| [06-compuestos-recursiva](06-compuestos-recursiva.databasic.json) | Compuestos de entidad y relación, derivado omitido y dos roles de Persona. |

Son copias independientes del núcleo, con IDs estables. En el módulo 03,
el código del instrumento es local a una sede: su PK contiene dos columnas.
Las jerarquías 04 y 04b son variantes de supuestos, no clasificaciones que
deban combinarse en el mismo diagrama.

Los archivos pendientes se pueden abrir y guardar, pero requieren decisiones
antes de exportar SQL completo. Los resultados resueltos permiten comparar;
no sustituyen la práctica de los controles. Sus
[pruebas](../tests/examples.test.js) abren los archivos reales y verifican
persistencia, correspondencias y DDL. No acreditan ejecución en un SGBD.
