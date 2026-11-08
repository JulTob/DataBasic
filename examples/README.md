# Ejercicios de la asignatura

Resueltos a partir de los enunciados de los apuntes (guion de introducción al
ERE y Tema 2) y, en el caso de la Lonja, de la solución del autor a la práctica
del curso 2025-2026 (repositorio BasesDeDatos), con la notación del curso. Cada archivo lleva sus
supuestos en la categoría Supuestos: lo que dice el enunciado, lo que se ha
supuesto y lo que el modelo no impone. Son borradores para comparar con la
solución del profesor; ajusta claves, cardinalidades o nombres si difieren.
Se generan con `node scripts/course-examples.mjs`.

| Archivo | Enunciado | Qué muestra |
| --- | --- | --- |
| [curso-lonja](curso-lonja.databasic.json) | Práctica 1 del curso 2025-2026 | Solución del autor: ternaria Faena con el periodo en la clave, Creditor como única subclase (especialización por predicado), adjudicación en tabla propia, facturas y pagos de compradores y barcos, ubicación compuesta del caladero. |
| [curso-agencia](curso-agencia.databasic.json) | Guion ERE, ejercicio 1 | Reserva como entidad que enlaza cliente, viaje y agente; teléfonos multivaluados; especialización total y disjunta de Empleado con clave alternativa del agente. |
| [curso-empresa](curso-empresa.databasic.json) | Guion ERE, ejercicio 2 | Dirige 1:1 con fecha de inicio, supervisión recursiva, Trabaja_en N:N con horas, familiar débil, lugares multivaluados y número de empleados derivado. |
| [curso-hoteles](curso-hoteles.databasic.json) | Guion ERE, ejercicio 3 | Habitacion y Factura débiles, clave alternativa del nombre, N:N Reserva–Habitacion, especialización total y disjunta de Empleado, dominios 1..5 y CHECK de fechas. |
| [curso-restaurante](curso-restaurante.databasic.json) | Guion ERE, ejercicio 4 | Especialización parcial, estante débil con letras A–Z, ingrediente ubicado con cantidad, pinche 1:1 con su cocinero, consumo débil identificado por fecha y turno. |
| [curso-inmobiliaria](curso-inmobiliaria.databasic.json) | Guion ERE, ejercicio 5 | Persona con especialización solapada, inmuebles con especialización parcial, alquiler débil y pago débil del alquiler (débil de débil), titulares N:N de la compra. |
| [curso-farmacos](curso-farmacos.databasic.json) | Guion ERE, ejercicio 6 | Ingreso débil del paciente, precio por envase derivado, consumos por paciente y por servicio con la fecha en la clave. |
| [curso-idiomas](curso-idiomas.databasic.json) | Tema 2, ejercicio 1 | Curso como oferta de idioma y nivel con clave alternativa doble; matrícula N:N con calificación. |
| [curso-personal](curso-personal.databasic.json) | Tema 2, ejercicio 2 | Dos especializaciones independientes del mismo empleado: por vínculo y por función. |
| [curso-videoclub](curso-videoclub.databasic.json) | Tema 2, ejercicio 3 | Clave compuesta (título, año), copia débil, actores multivaluados, alquiler N:N con la fecha en la clave. |
| [curso-muebles](curso-muebles.databasic.json) | Tema 2, ejercicio 4 | Composición N:N con unidades, estantería con clave compuesta (pasillo, altura) y semántica perdida explicada. |
| [curso-salas](curso-salas.databasic.json) | Tema 2, ejercicio 5 (Tema1_5 en BasesDeDatos) | Dos relaciones 1:N sencillas hacia Sala. |
| [curso-transporte](curso-transporte.databasic.json) | Tema 2, ejercicio 6 | Dos especializaciones (vehículos total, empleados parcial), departamento obligatorio y asignación N:N por turnos. |
| [curso-concesionario](curso-concesionario.databasic.json) | Tema 2, ejercicio 7 | Coches nuevos y usados, compra con FK opcional, reparación N:N con fecha y horas. |
| [curso-universidad](curso-universidad.databasic.json) | Tema 2, ejercicio 8 | Grupo débil de asignatura, director 1:1, horario con día y hora en la clave, matrícula e impartición N:N, ciclo de claves ajenas explicado. |
| [curso-biblioteca](curso-biblioteca.databasic.json) | Tema 2, mini-ejercicio 2 | Autoría N:N y préstamo N:N fechado, con la entidad Ejemplar señalada como semántica perdida. |

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
