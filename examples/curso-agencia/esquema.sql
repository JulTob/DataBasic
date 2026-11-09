-- Agencia de viajes · ejercicio 1 (guion ERE)
-- SQL del proyecto, en el dialecto de la consola de DataBasic.
-- Este archivo manda en tablas, claves, relaciones, consultas y filas: si lo cambias,
-- DataBasic lo sigue al abrir la carpeta. Las líneas que empiezan por -- son comentarios.

-- Tablas

CREATE TABLE Cliente (
    dni CHAR(9) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    direccion VARCHAR(120),
    PRIMARY KEY (dni)
);

CREATE TABLE Telefonos_cliente (
    Cliente_dni CHAR(9) NOT NULL,
    telefono VARCHAR(15) NOT NULL,
    PRIMARY KEY (Cliente_dni, telefono)
);

CREATE TABLE Reserva (
    codigo_reserva NUMBER NOT NULL,
    fecha_reserva DATE NOT NULL,
    num_plazas NUMBER(3) NOT NULL CHECK (num_plazas >= 1),
    cliente_dni CHAR(9) NOT NULL,
    viaje_codigo NUMBER NOT NULL,
    agente_Empleado_dni CHAR(9) NOT NULL,
    PRIMARY KEY (codigo_reserva)
);

CREATE TABLE Viaje (
    codigo NUMBER NOT NULL,
    destino VARCHAR(80) NOT NULL,
    fecha_salida DATE NOT NULL,
    precio NUMBER(8,2) NOT NULL CHECK (precio >= 0),
    PRIMARY KEY (codigo)
);

CREATE TABLE Empleado (
    dni CHAR(9) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    fecha_contratacion DATE NOT NULL,
    PRIMARY KEY (dni)
);

CREATE TABLE Agente (
    codigo_empleado NUMBER(5) NOT NULL,
    area_especializacion VARCHAR(40),
    Empleado_dni CHAR(9) NOT NULL,
    PRIMARY KEY (Empleado_dni),
    CONSTRAINT AK_Agente_codigo UNIQUE (codigo_empleado)
);

CREATE TABLE Administrativo (
    Empleado_dni CHAR(9) NOT NULL,
    PRIMARY KEY (Empleado_dni)
);

-- Relaciones (claves ajenas)

ALTER TABLE Telefonos_cliente ADD CONSTRAINT FK_Telefonos_cliente_Cliente
    FOREIGN KEY (Cliente_dni) REFERENCES Cliente (dni)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Agente ADD CONSTRAINT FK_Agente_Empleado
    FOREIGN KEY (Empleado_dni) REFERENCES Empleado (dni)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Administrativo ADD CONSTRAINT FK_Administrativo_Empleado
    FOREIGN KEY (Empleado_dni) REFERENCES Empleado (dni)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Reserva ADD CONSTRAINT FK_Realiza_cliente
    FOREIGN KEY (cliente_dni) REFERENCES Cliente (dni)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Reserva ADD CONSTRAINT FK_Reserva_de_viaje
    FOREIGN KEY (viaje_codigo) REFERENCES Viaje (codigo)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Reserva ADD CONSTRAINT FK_Gestiona_agente
    FOREIGN KEY (agente_Empleado_dni) REFERENCES Agente (Empleado_dni)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Índices

-- Sin índices.

-- Consultas guardadas

-- Sin consultas.

-- Filas

INSERT INTO Cliente (dni, nombre, direccion) VALUES ('10000569P', 'Ana Álvarez', 'Pl. de España 68, Elche');
INSERT INTO Cliente (dni, nombre, direccion) VALUES ('10008609K', 'Paula Fernández', 'C/ del Mar 15, Elche');
INSERT INTO Cliente (dni, nombre, direccion) VALUES ('10015923K', 'Clara Navarro', 'Av. de la Libertad 18, Alicante');
INSERT INTO Cliente (dni, nombre, direccion) VALUES ('10024085H', 'Javier Torres', 'Pl. de España 70, Santa Pola');
INSERT INTO Cliente (dni, nombre, direccion) VALUES ('10032378P', 'Diego Moreno', 'C/ San Vicente 60, Alicante');
INSERT INTO Cliente (dni, nombre, direccion) VALUES ('10040446A', 'Óscar Martínez', 'Pl. de España 5, Torrevieja');
INSERT INTO Cliente (dni, nombre, direccion) VALUES ('10048075L', 'Marta Romero', 'C/ Reina Victoria 29, Torrevieja');
INSERT INTO Cliente (dni, nombre, direccion) VALUES ('10055662Q', 'Andrés Sánchez', NULL);

INSERT INTO Viaje (codigo, destino, fecha_salida, precio) VALUES (1, 'Santa Pola', #2024-09-23#, 9.73);
INSERT INTO Viaje (codigo, destino, fecha_salida, precio) VALUES (2, 'Crevillente', #2025-05-07#, 22.24);
INSERT INTO Viaje (codigo, destino, fecha_salida, precio) VALUES (3, 'Elche', #2025-07-09#, 32.09);
INSERT INTO Viaje (codigo, destino, fecha_salida, precio) VALUES (4, 'Crevillente', #2024-02-05#, 46.09);
INSERT INTO Viaje (codigo, destino, fecha_salida, precio) VALUES (5, 'Alicante', #2024-05-07#, 50.16);
INSERT INTO Viaje (codigo, destino, fecha_salida, precio) VALUES (6, 'Crevillente', #2025-09-11#, 17.1);
INSERT INTO Viaje (codigo, destino, fecha_salida, precio) VALUES (7, 'Valencia', #2025-11-14#, 21.3);
INSERT INTO Viaje (codigo, destino, fecha_salida, precio) VALUES (8, 'Alicante', #2024-08-19#, 30.64);

INSERT INTO Empleado (dni, nombre, fecha_contratacion) VALUES ('10000768T', 'Ana García', #2026-04-29#);
INSERT INTO Empleado (dni, nombre, fecha_contratacion) VALUES ('10008508N', 'Diego García', #2024-02-17#);
INSERT INTO Empleado (dni, nombre, fecha_contratacion) VALUES ('10016331S', 'Nuria López', #2026-04-10#);
INSERT INTO Empleado (dni, nombre, fecha_contratacion) VALUES ('10024166F', 'Luis Sánchez', #2025-07-12#);
INSERT INTO Empleado (dni, nombre, fecha_contratacion) VALUES ('10031714B', 'Paula Romero', #2025-02-24#);
INSERT INTO Empleado (dni, nombre, fecha_contratacion) VALUES ('10040073K', 'Hugo Díaz', #2024-10-13#);
INSERT INTO Empleado (dni, nombre, fecha_contratacion) VALUES ('10047680S', 'Lucía Torres', #2024-12-09#);
INSERT INTO Empleado (dni, nombre, fecha_contratacion) VALUES ('10056207D', 'Paula Romero', #2026-03-26#);

INSERT INTO Telefonos_cliente (Cliente_dni, telefono) VALUES ('10000569P', '610000098');
INSERT INTO Telefonos_cliente (Cliente_dni, telefono) VALUES ('10040446A', '610000826');
INSERT INTO Telefonos_cliente (Cliente_dni, telefono) VALUES ('10055662Q', '610001693');
INSERT INTO Telefonos_cliente (Cliente_dni, telefono) VALUES ('10048075L', '610002466');
INSERT INTO Telefonos_cliente (Cliente_dni, telefono) VALUES ('10024085H', '610003327');
INSERT INTO Telefonos_cliente (Cliente_dni, telefono) VALUES ('10040446A', '610004144');
INSERT INTO Telefonos_cliente (Cliente_dni, telefono) VALUES ('10040446A', '610004902');
INSERT INTO Telefonos_cliente (Cliente_dni, telefono) VALUES ('10008609K', '610005708');

INSERT INTO Agente (codigo_empleado, area_especializacion, Empleado_dni) VALUES (73, 'investigación', '10016331S');
INSERT INTO Agente (codigo_empleado, area_especializacion, Empleado_dni) VALUES (95, NULL, '10008508N');
INSERT INTO Agente (codigo_empleado, area_especializacion, Empleado_dni) VALUES (47, 'gestión', '10024166F');
INSERT INTO Agente (codigo_empleado, area_especializacion, Empleado_dni) VALUES (58, 'investigación', '10056207D');

INSERT INTO Administrativo (Empleado_dni) VALUES ('10000768T');
INSERT INTO Administrativo (Empleado_dni) VALUES ('10040073K');
INSERT INTO Administrativo (Empleado_dni) VALUES ('10031714B');
INSERT INTO Administrativo (Empleado_dni) VALUES ('10047680S');

INSERT INTO Reserva (codigo_reserva, fecha_reserva, num_plazas, cliente_dni, viaje_codigo, agente_Empleado_dni) VALUES (1, #2025-11-30#, 21, '10032378P', 3, '10056207D');
INSERT INTO Reserva (codigo_reserva, fecha_reserva, num_plazas, cliente_dni, viaje_codigo, agente_Empleado_dni) VALUES (2, #2024-07-07#, 27, '10024085H', 4, '10056207D');
INSERT INTO Reserva (codigo_reserva, fecha_reserva, num_plazas, cliente_dni, viaje_codigo, agente_Empleado_dni) VALUES (3, #2026-05-22#, 21, '10024085H', 6, '10008508N');
INSERT INTO Reserva (codigo_reserva, fecha_reserva, num_plazas, cliente_dni, viaje_codigo, agente_Empleado_dni) VALUES (4, #2025-11-10#, 8, '10000569P', 3, '10024166F');
INSERT INTO Reserva (codigo_reserva, fecha_reserva, num_plazas, cliente_dni, viaje_codigo, agente_Empleado_dni) VALUES (5, #2026-05-12#, 9, '10040446A', 2, '10016331S');
INSERT INTO Reserva (codigo_reserva, fecha_reserva, num_plazas, cliente_dni, viaje_codigo, agente_Empleado_dni) VALUES (6, #2025-12-15#, 21, '10048075L', 3, '10016331S');
INSERT INTO Reserva (codigo_reserva, fecha_reserva, num_plazas, cliente_dni, viaje_codigo, agente_Empleado_dni) VALUES (7, #2025-03-04#, 10, '10032378P', 4, '10016331S');
INSERT INTO Reserva (codigo_reserva, fecha_reserva, num_plazas, cliente_dni, viaje_codigo, agente_Empleado_dni) VALUES (8, #2026-01-05#, 12, '10048075L', 8, '10016331S');
