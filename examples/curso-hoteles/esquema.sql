-- Cadena hotelera · ejercicio 3 (guion ERE)
-- SQL del proyecto, en el dialecto de la consola de DataBasic.
-- Este archivo manda en tablas, claves, relaciones, consultas y filas: si lo cambias,
-- DataBasic lo sigue al abrir la carpeta. Las líneas que empiezan por -- son comentarios.

-- Tablas

CREATE TABLE Hotel (
    codigo_hotel NUMBER NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    direccion VARCHAR(120),
    categoria NUMBER(1) NOT NULL CHECK (categoria >= 1 AND categoria <= 5),
    PRIMARY KEY (codigo_hotel),
    CONSTRAINT AK_Hotel_nombre UNIQUE (nombre)
);

CREATE TABLE Habitacion (
    numero NUMBER(4) NOT NULL,
    hotel_codigo_hotel NUMBER NOT NULL,
    PRIMARY KEY (numero, hotel_codigo_hotel)
);

CREATE TABLE Cliente (
    dni CHAR(9) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    direccion VARCHAR(120),
    telefono VARCHAR(15),
    PRIMARY KEY (dni)
);

CREATE TABLE Reserva (
    codigo_reserva NUMBER NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL CHECK (fecha_fin >= fecha_inicio),
    num_personas NUMBER(2) NOT NULL CHECK (num_personas >= 1),
    cliente_dni CHAR(9) NOT NULL,
    recepcionista_Empleado_dni CHAR(9) NOT NULL,
    PRIMARY KEY (codigo_reserva)
);

CREATE TABLE Factura (
    numero NUMBER(4) NOT NULL,
    importe_total NUMBER(8,2) NOT NULL CHECK (importe_total >= 0),
    fecha_emision DATE NOT NULL,
    reserva_codigo_reserva NUMBER NOT NULL,
    PRIMARY KEY (numero, reserva_codigo_reserva)
);

CREATE TABLE Empleado (
    dni CHAR(9) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    fecha_contratacion DATE NOT NULL,
    PRIMARY KEY (dni)
);

CREATE TABLE Recepcionista (
    idioma_principal VARCHAR(30),
    Empleado_dni CHAR(9) NOT NULL,
    PRIMARY KEY (Empleado_dni)
);

CREATE TABLE Camarero (
    area_asignada VARCHAR(30),
    Empleado_dni CHAR(9) NOT NULL,
    PRIMARY KEY (Empleado_dni)
);

CREATE TABLE Reserva_Habitacion (
    reserva_codigo_reserva NUMBER NOT NULL,
    habitacion_numero NUMBER(4) NOT NULL,
    habitacion_hotel_codigo_hotel NUMBER NOT NULL,
    PRIMARY KEY (reserva_codigo_reserva, habitacion_numero, habitacion_hotel_codigo_hotel)
);

-- Relaciones (claves ajenas)

ALTER TABLE Habitacion ADD CONSTRAINT FK_Contiene_hotel
    FOREIGN KEY (hotel_codigo_hotel) REFERENCES Hotel (codigo_hotel)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Reserva ADD CONSTRAINT FK_Hace_cliente
    FOREIGN KEY (cliente_dni) REFERENCES Cliente (dni)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Reserva_Habitacion ADD CONSTRAINT FK_Incluye_reserva
    FOREIGN KEY (reserva_codigo_reserva) REFERENCES Reserva (codigo_reserva)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Reserva_Habitacion ADD CONSTRAINT FK_Incluye_habitacion
    FOREIGN KEY (habitacion_numero, habitacion_hotel_codigo_hotel) REFERENCES Habitacion (numero, hotel_codigo_hotel)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Recepcionista ADD CONSTRAINT FK_Recepcionista_Empleado
    FOREIGN KEY (Empleado_dni) REFERENCES Empleado (dni)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Camarero ADD CONSTRAINT FK_Camarero_Empleado
    FOREIGN KEY (Empleado_dni) REFERENCES Empleado (dni)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Reserva ADD CONSTRAINT FK_Gestiona_recepcionista
    FOREIGN KEY (recepcionista_Empleado_dni) REFERENCES Recepcionista (Empleado_dni)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Factura ADD CONSTRAINT FK_Emite_reserva
    FOREIGN KEY (reserva_codigo_reserva) REFERENCES Reserva (codigo_reserva)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Índices

-- Sin índices.

-- Consultas guardadas

-- Sin consultas.

-- Filas

INSERT INTO Hotel (codigo_hotel, nombre, direccion, categoria) VALUES (1, 'Hotel Mediterráneo', 'Av. de la Libertad 66, Santa Pola', 3);
INSERT INTO Hotel (codigo_hotel, nombre, direccion, categoria) VALUES (2, 'Hotel Las Palmeras', 'C/ Mayor 63, Crevillente', 3);
INSERT INTO Hotel (codigo_hotel, nombre, direccion, categoria) VALUES (3, 'Hotel Costa Blanca', 'C/ del Mar 15, Elche', 1);
INSERT INTO Hotel (codigo_hotel, nombre, direccion, categoria) VALUES (4, 'Hotel Bahía', 'Paseo Marítimo 69, Alicante', 1);
INSERT INTO Hotel (codigo_hotel, nombre, direccion, categoria) VALUES (5, 'Hotel Faro', 'C/ del Mar 65, Crevillente', 3);
INSERT INTO Hotel (codigo_hotel, nombre, direccion, categoria) VALUES (6, 'Hotel Albufera', 'C/ Reina Victoria 29, Valencia', 3);
INSERT INTO Hotel (codigo_hotel, nombre, direccion, categoria) VALUES (7, 'Hotel Mediterráneo 2', 'Pl. de España 48, Valencia', 2);
INSERT INTO Hotel (codigo_hotel, nombre, direccion, categoria) VALUES (8, 'Hotel Las Palmeras 2', 'Av. de Elche 12, Murcia', 2);

INSERT INTO Cliente (dni, nombre, direccion, telefono) VALUES ('10000048Q', 'Javier Díaz', 'C/ Reina Victoria 49, Torrevieja', '610000083');
INSERT INTO Cliente (dni, nombre, direccion, telefono) VALUES ('10008148C', 'Diego Sánchez', NULL, '610000840');
INSERT INTO Cliente (dni, nombre, direccion, telefono) VALUES ('10015985Z', 'Óscar Díaz', 'C/ Mayor 56, Murcia', '610001625');
INSERT INTO Cliente (dni, nombre, direccion, telefono) VALUES ('10024521V', 'Luis Martínez', 'Paseo Marítimo 62, Santa Pola', '610002508');
INSERT INTO Cliente (dni, nombre, direccion, telefono) VALUES ('10032020H', 'Sara Gómez', 'C/ Reina Victoria 17, Elche', '610003302');
INSERT INTO Cliente (dni, nombre, direccion, telefono) VALUES ('10040127Y', 'Hugo García', 'Av. de Elche 40, Crevillente', '610004060');
INSERT INTO Cliente (dni, nombre, direccion, telefono) VALUES ('10047721X', 'Lucía García', 'C/ Reina Victoria 43, Orihuela', NULL);
INSERT INTO Cliente (dni, nombre, direccion, telefono) VALUES ('10055989K', 'Paula Martínez', 'Paseo Marítimo 35, Torrevieja', '610005752');

INSERT INTO Empleado (dni, nombre, fecha_contratacion) VALUES ('10000904K', 'Ana Navarro', #2025-08-15#);
INSERT INTO Empleado (dni, nombre, fecha_contratacion) VALUES ('10008076V', 'Paula Álvarez', #2025-11-28#);
INSERT INTO Empleado (dni, nombre, fecha_contratacion) VALUES ('10016173H', 'Hugo Torres', #2025-08-12#);
INSERT INTO Empleado (dni, nombre, fecha_contratacion) VALUES ('10024650P', 'Javier Fernández', #2024-07-24#);
INSERT INTO Empleado (dni, nombre, fecha_contratacion) VALUES ('10031989X', 'Andrés Navarro', #2025-09-04#);
INSERT INTO Empleado (dni, nombre, fecha_contratacion) VALUES ('10040343S', 'Alba Fernández', #2024-11-18#);
INSERT INTO Empleado (dni, nombre, fecha_contratacion) VALUES ('10048234V', 'Marta Moreno', #2026-04-28#);
INSERT INTO Empleado (dni, nombre, fecha_contratacion) VALUES ('10055542B', 'Paula Romero', #2024-05-05#);

INSERT INTO Habitacion (numero, hotel_codigo_hotel) VALUES (1, 4);
INSERT INTO Habitacion (numero, hotel_codigo_hotel) VALUES (2, 1);
INSERT INTO Habitacion (numero, hotel_codigo_hotel) VALUES (3, 5);
INSERT INTO Habitacion (numero, hotel_codigo_hotel) VALUES (4, 4);
INSERT INTO Habitacion (numero, hotel_codigo_hotel) VALUES (5, 4);
INSERT INTO Habitacion (numero, hotel_codigo_hotel) VALUES (6, 5);
INSERT INTO Habitacion (numero, hotel_codigo_hotel) VALUES (7, 3);
INSERT INTO Habitacion (numero, hotel_codigo_hotel) VALUES (8, 8);

INSERT INTO Recepcionista (idioma_principal, Empleado_dni) VALUES ('alemán', '10055542B');
INSERT INTO Recepcionista (idioma_principal, Empleado_dni) VALUES ('italiano', '10000904K');
INSERT INTO Recepcionista (idioma_principal, Empleado_dni) VALUES ('inglés', '10040343S');
INSERT INTO Recepcionista (idioma_principal, Empleado_dni) VALUES ('alemán', '10031989X');

INSERT INTO Camarero (area_asignada, Empleado_dni) VALUES ('docencia', '10008076V');
INSERT INTO Camarero (area_asignada, Empleado_dni) VALUES ('docencia', '10024650P');
INSERT INTO Camarero (area_asignada, Empleado_dni) VALUES ('mantenimiento', '10016173H');
INSERT INTO Camarero (area_asignada, Empleado_dni) VALUES ('atención al público', '10048234V');

INSERT INTO Reserva (codigo_reserva, fecha_inicio, fecha_fin, num_personas, cliente_dni, recepcionista_Empleado_dni) VALUES (1, #2025-12-15#, #2026-01-25#, 18, '10015985Z', '10055542B');
INSERT INTO Reserva (codigo_reserva, fecha_inicio, fecha_fin, num_personas, cliente_dni, recepcionista_Empleado_dni) VALUES (2, #2025-03-04#, #2025-03-23#, 25, '10024521V', '10055542B');
INSERT INTO Reserva (codigo_reserva, fecha_inicio, fecha_fin, num_personas, cliente_dni, recepcionista_Empleado_dni) VALUES (3, #2026-01-05#, #2026-01-28#, 14, '10055989K', '10055542B');
INSERT INTO Reserva (codigo_reserva, fecha_inicio, fecha_fin, num_personas, cliente_dni, recepcionista_Empleado_dni) VALUES (4, #2025-01-19#, #2025-02-13#, 7, '10000048Q', '10000904K');
INSERT INTO Reserva (codigo_reserva, fecha_inicio, fecha_fin, num_personas, cliente_dni, recepcionista_Empleado_dni) VALUES (5, #2024-09-07#, #2024-10-21#, 10, '10055989K', '10031989X');
INSERT INTO Reserva (codigo_reserva, fecha_inicio, fecha_fin, num_personas, cliente_dni, recepcionista_Empleado_dni) VALUES (6, #2025-12-29#, #2026-02-09#, 19, '10040127Y', '10040343S');
INSERT INTO Reserva (codigo_reserva, fecha_inicio, fecha_fin, num_personas, cliente_dni, recepcionista_Empleado_dni) VALUES (7, #2024-08-10#, #2024-10-05#, 14, '10000048Q', '10040343S');
INSERT INTO Reserva (codigo_reserva, fecha_inicio, fecha_fin, num_personas, cliente_dni, recepcionista_Empleado_dni) VALUES (8, #2025-12-09#, #2026-02-06#, 30, '10000048Q', '10040343S');

INSERT INTO Factura (numero, importe_total, fecha_emision, reserva_codigo_reserva) VALUES (1, 195.52, #2026-04-16#, 3);
INSERT INTO Factura (numero, importe_total, fecha_emision, reserva_codigo_reserva) VALUES (2, 1566.99, #2025-01-20#, 7);
INSERT INTO Factura (numero, importe_total, fecha_emision, reserva_codigo_reserva) VALUES (3, 236.05, #2024-01-28#, 1);
INSERT INTO Factura (numero, importe_total, fecha_emision, reserva_codigo_reserva) VALUES (4, 496.9, #2026-05-16#, 7);
INSERT INTO Factura (numero, importe_total, fecha_emision, reserva_codigo_reserva) VALUES (5, 301.65, #2025-03-21#, 5);
INSERT INTO Factura (numero, importe_total, fecha_emision, reserva_codigo_reserva) VALUES (6, 1850.54, #2024-05-02#, 6);
INSERT INTO Factura (numero, importe_total, fecha_emision, reserva_codigo_reserva) VALUES (7, 1079.36, #2024-03-21#, 5);
INSERT INTO Factura (numero, importe_total, fecha_emision, reserva_codigo_reserva) VALUES (8, 1897.97, #2025-10-25#, 3);

INSERT INTO Reserva_Habitacion (reserva_codigo_reserva, habitacion_numero, habitacion_hotel_codigo_hotel) VALUES (6, 2, 1);
INSERT INTO Reserva_Habitacion (reserva_codigo_reserva, habitacion_numero, habitacion_hotel_codigo_hotel) VALUES (7, 3, 5);
INSERT INTO Reserva_Habitacion (reserva_codigo_reserva, habitacion_numero, habitacion_hotel_codigo_hotel) VALUES (8, 6, 5);
INSERT INTO Reserva_Habitacion (reserva_codigo_reserva, habitacion_numero, habitacion_hotel_codigo_hotel) VALUES (7, 1, 4);
INSERT INTO Reserva_Habitacion (reserva_codigo_reserva, habitacion_numero, habitacion_hotel_codigo_hotel) VALUES (8, 7, 3);
INSERT INTO Reserva_Habitacion (reserva_codigo_reserva, habitacion_numero, habitacion_hotel_codigo_hotel) VALUES (8, 1, 4);
INSERT INTO Reserva_Habitacion (reserva_codigo_reserva, habitacion_numero, habitacion_hotel_codigo_hotel) VALUES (2, 5, 4);
INSERT INTO Reserva_Habitacion (reserva_codigo_reserva, habitacion_numero, habitacion_hotel_codigo_hotel) VALUES (6, 7, 3);
