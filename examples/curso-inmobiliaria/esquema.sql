-- Inmobiliaria · ejercicio 5 (guion ERE)
-- SQL del proyecto, en el dialecto de la consola de DataBasic.
-- Este archivo manda en tablas, claves, relaciones, consultas y filas: si lo cambias,
-- DataBasic lo sigue al abrir la carpeta. Las líneas que empiezan por -- son comentarios.

-- Tablas

CREATE TABLE Persona (
    codigo NUMBER(6) NOT NULL,
    dni CHAR(9) NOT NULL,
    nombre VARCHAR(40) NOT NULL,
    apellidos VARCHAR(80) NOT NULL,
    direccion VARCHAR(120),
    PRIMARY KEY (codigo),
    CONSTRAINT AK_Persona_dni UNIQUE (dni)
);

CREATE TABLE Telefonos_persona (
    Persona_codigo NUMBER(6) NOT NULL,
    telefono VARCHAR(15) NOT NULL,
    PRIMARY KEY (Persona_codigo, telefono)
);

CREATE TABLE Cliente (
    Persona_codigo NUMBER(6) NOT NULL,
    PRIMARY KEY (Persona_codigo)
);

CREATE TABLE Trabajador (
    fecha_ingreso DATE NOT NULL,
    Persona_codigo NUMBER(6) NOT NULL,
    PRIMARY KEY (Persona_codigo)
);

CREATE TABLE Inmueble (
    codigo NUMBER(6) NOT NULL,
    superficie_m2 NUMBER(7,2) NOT NULL CHECK (superficie_m2 >= 0),
    descripcion VARCHAR(200),
    direccion VARCHAR(120) NOT NULL,
    PRIMARY KEY (codigo)
);

CREATE TABLE Piso (
    codigo_piso VARCHAR(10) NOT NULL,
    Inmueble_codigo NUMBER(6) NOT NULL,
    PRIMARY KEY (Inmueble_codigo),
    CONSTRAINT AK_Piso_codigo UNIQUE (codigo_piso)
);

CREATE TABLE Local (
    uso VARCHAR(40),
    servicio CHAR(1) NOT NULL DEFAULT 'N' CHECK (servicio IN ('S', 'N')),
    Inmueble_codigo NUMBER(6) NOT NULL,
    PRIMARY KEY (Inmueble_codigo)
);

CREATE TABLE Garaje (
    numero NUMBER(4) NOT NULL,
    planta NUMBER(2),
    Inmueble_codigo NUMBER(6) NOT NULL,
    piso_Inmueble_codigo NUMBER(6),
    PRIMARY KEY (Inmueble_codigo)
);

CREATE TABLE Compra (
    codigo NUMBER(8) NOT NULL,
    fecha DATE NOT NULL,
    valor NUMBER(12,2) NOT NULL CHECK (valor >= 0),
    inmueble_codigo NUMBER(6) NOT NULL,
    PRIMARY KEY (codigo)
);

CREATE TABLE Alquiler (
    numero NUMBER(5) NOT NULL,
    inmueble_codigo NUMBER(6) NOT NULL,
    inquilino_Persona_codigo NUMBER(6) NOT NULL,
    agente_Persona_codigo NUMBER(6) NOT NULL,
    PRIMARY KEY (numero, inmueble_codigo)
);

CREATE TABLE Pago (
    anio NUMBER(4) NOT NULL,
    mes NUMBER(2) NOT NULL CHECK (mes >= 1 AND mes <= 12),
    valor NUMBER(8,2) NOT NULL CHECK (valor >= 0),
    alquiler_numero NUMBER(5) NOT NULL,
    alquiler_inmueble_codigo NUMBER(6) NOT NULL,
    PRIMARY KEY (anio, mes, alquiler_numero, alquiler_inmueble_codigo)
);

CREATE TABLE Titulares (
    compra_codigo NUMBER(8) NOT NULL,
    titular_Persona_codigo NUMBER(6) NOT NULL,
    PRIMARY KEY (compra_codigo, titular_Persona_codigo)
);

-- Relaciones (claves ajenas)

ALTER TABLE Telefonos_persona ADD CONSTRAINT FK_Telefonos_persona_Persona
    FOREIGN KEY (Persona_codigo) REFERENCES Persona (codigo)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Cliente ADD CONSTRAINT FK_Cliente_Persona
    FOREIGN KEY (Persona_codigo) REFERENCES Persona (codigo)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Trabajador ADD CONSTRAINT FK_Trabajador_Persona
    FOREIGN KEY (Persona_codigo) REFERENCES Persona (codigo)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Piso ADD CONSTRAINT FK_Piso_Inmueble
    FOREIGN KEY (Inmueble_codigo) REFERENCES Inmueble (codigo)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Local ADD CONSTRAINT FK_Local_Inmueble
    FOREIGN KEY (Inmueble_codigo) REFERENCES Inmueble (codigo)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Garaje ADD CONSTRAINT FK_Garaje_Inmueble
    FOREIGN KEY (Inmueble_codigo) REFERENCES Inmueble (codigo)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Garaje ADD CONSTRAINT FK_Asociado_piso
    FOREIGN KEY (piso_Inmueble_codigo) REFERENCES Piso (Inmueble_codigo)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Compra ADD CONSTRAINT FK_Se_compra_inmueble
    FOREIGN KEY (inmueble_codigo) REFERENCES Inmueble (codigo)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Titulares ADD CONSTRAINT FK_Titular_compra
    FOREIGN KEY (compra_codigo) REFERENCES Compra (codigo)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Titulares ADD CONSTRAINT FK_Titular_titular
    FOREIGN KEY (titular_Persona_codigo) REFERENCES Cliente (Persona_codigo)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Alquiler ADD CONSTRAINT FK_Se_alquila_inmueble
    FOREIGN KEY (inmueble_codigo) REFERENCES Inmueble (codigo)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Alquiler ADD CONSTRAINT FK_Inquilino_inquilino
    FOREIGN KEY (inquilino_Persona_codigo) REFERENCES Cliente (Persona_codigo)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Alquiler ADD CONSTRAINT FK_Gestiona_agente
    FOREIGN KEY (agente_Persona_codigo) REFERENCES Trabajador (Persona_codigo)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Pago ADD CONSTRAINT FK_Paga_alquiler
    FOREIGN KEY (alquiler_numero, alquiler_inmueble_codigo) REFERENCES Alquiler (numero, inmueble_codigo)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Índices

-- Sin índices.

-- Consultas guardadas

-- Sin consultas.

-- Filas

INSERT INTO Persona (codigo, dni, nombre, apellidos, direccion) VALUES (1, '10000569P', 'Ana', 'Álvarez Castro', 'Pl. de España 68, Elche');
INSERT INTO Persona (codigo, dni, nombre, apellidos, direccion) VALUES (2, '10008609K', 'Paula', 'Fernández Gil', 'C/ del Mar 15, Elche');
INSERT INTO Persona (codigo, dni, nombre, apellidos, direccion) VALUES (3, '10015923K', 'Clara', 'Navarro Soler', 'Av. de la Libertad 18, Alicante');
INSERT INTO Persona (codigo, dni, nombre, apellidos, direccion) VALUES (4, '10024085H', 'Javier', 'Torres Marín', 'Pl. de España 70, Santa Pola');
INSERT INTO Persona (codigo, dni, nombre, apellidos, direccion) VALUES (5, '10032378P', 'Diego', 'Moreno Ortega', 'C/ San Vicente 60, Alicante');
INSERT INTO Persona (codigo, dni, nombre, apellidos, direccion) VALUES (6, '10040446A', 'Óscar', 'Martínez Ruiz', 'Pl. de España 5, Torrevieja');
INSERT INTO Persona (codigo, dni, nombre, apellidos, direccion) VALUES (7, '10048075L', 'Marta', 'Romero Rubio', 'C/ Reina Victoria 29, Torrevieja');
INSERT INTO Persona (codigo, dni, nombre, apellidos, direccion) VALUES (8, '10055662Q', 'Andrés', 'Sánchez Pérez', NULL);

INSERT INTO Inmueble (codigo, superficie_m2, descripcion, direccion) VALUES (1, 174.52, 'Descripción de inmueble 1', 'Av. de la Libertad 89, Murcia');
INSERT INTO Inmueble (codigo, superficie_m2, descripcion, direccion) VALUES (2, 183.16, NULL, 'C/ San Vicente 48, Crevillente');
INSERT INTO Inmueble (codigo, superficie_m2, descripcion, direccion) VALUES (3, 24.45, 'Descripción de inmueble 3', 'Av. de la Libertad 13, Torrevieja');
INSERT INTO Inmueble (codigo, superficie_m2, descripcion, direccion) VALUES (4, 459.89, 'Descripción de inmueble 4', 'C/ del Mar 68, Torrevieja');
INSERT INTO Inmueble (codigo, superficie_m2, descripcion, direccion) VALUES (5, 175.28, 'Descripción de inmueble 5', 'C/ del Mar 46, Torrevieja');
INSERT INTO Inmueble (codigo, superficie_m2, descripcion, direccion) VALUES (6, 94.64, NULL, 'Paseo Marítimo 54, Murcia');
INSERT INTO Inmueble (codigo, superficie_m2, descripcion, direccion) VALUES (7, 14.76, NULL, 'Pl. de España 57, Orihuela');
INSERT INTO Inmueble (codigo, superficie_m2, descripcion, direccion) VALUES (8, 461.22, 'Descripción de inmueble 8', 'C/ Mayor 19, Murcia');

INSERT INTO Telefonos_persona (Persona_codigo, telefono) VALUES (1, '610000073');
INSERT INTO Telefonos_persona (Persona_codigo, telefono) VALUES (7, '610000857');
INSERT INTO Telefonos_persona (Persona_codigo, telefono) VALUES (4, '610001622');
INSERT INTO Telefonos_persona (Persona_codigo, telefono) VALUES (5, '610002464');
INSERT INTO Telefonos_persona (Persona_codigo, telefono) VALUES (2, '610003301');
INSERT INTO Telefonos_persona (Persona_codigo, telefono) VALUES (8, '610004093');
INSERT INTO Telefonos_persona (Persona_codigo, telefono) VALUES (7, '610004911');
INSERT INTO Telefonos_persona (Persona_codigo, telefono) VALUES (7, '610005767');

INSERT INTO Cliente (Persona_codigo) VALUES (5);
INSERT INTO Cliente (Persona_codigo) VALUES (3);
INSERT INTO Cliente (Persona_codigo) VALUES (8);
INSERT INTO Cliente (Persona_codigo) VALUES (7);
INSERT INTO Cliente (Persona_codigo) VALUES (1);

INSERT INTO Trabajador (fecha_ingreso, Persona_codigo) VALUES (#2024-10-09#, 5);
INSERT INTO Trabajador (fecha_ingreso, Persona_codigo) VALUES (#2026-01-05#, 2);
INSERT INTO Trabajador (fecha_ingreso, Persona_codigo) VALUES (#2026-06-03#, 6);
INSERT INTO Trabajador (fecha_ingreso, Persona_codigo) VALUES (#2025-09-04#, 4);
INSERT INTO Trabajador (fecha_ingreso, Persona_codigo) VALUES (#2025-11-04#, 1);

INSERT INTO Piso (codigo_piso, Inmueble_codigo) VALUES ('PIS0001', 5);
INSERT INTO Piso (codigo_piso, Inmueble_codigo) VALUES ('PIS0002', 1);

INSERT INTO Local (uso, servicio, Inmueble_codigo) VALUES (NULL, 'S', 6);
INSERT INTO Local (uso, servicio, Inmueble_codigo) VALUES ('gestión', 'S', 4);

INSERT INTO Compra (codigo, fecha, valor, inmueble_codigo) VALUES (1, #2025-06-05#, 828.33, 1);
INSERT INTO Compra (codigo, fecha, valor, inmueble_codigo) VALUES (2, #2025-07-03#, 677.6, 4);
INSERT INTO Compra (codigo, fecha, valor, inmueble_codigo) VALUES (3, #2025-11-30#, 1358.77, 8);
INSERT INTO Compra (codigo, fecha, valor, inmueble_codigo) VALUES (4, #2025-02-18#, 1975.44, 4);
INSERT INTO Compra (codigo, fecha, valor, inmueble_codigo) VALUES (5, #2026-02-25#, 911.12, 2);
INSERT INTO Compra (codigo, fecha, valor, inmueble_codigo) VALUES (6, #2025-01-06#, 1937.18, 6);
INSERT INTO Compra (codigo, fecha, valor, inmueble_codigo) VALUES (7, #2024-03-15#, 622.31, 6);
INSERT INTO Compra (codigo, fecha, valor, inmueble_codigo) VALUES (8, #2025-11-10#, 524.9, 6);

INSERT INTO Garaje (numero, planta, Inmueble_codigo, piso_Inmueble_codigo) VALUES (24, 9, 2, 5);
INSERT INTO Garaje (numero, planta, Inmueble_codigo, piso_Inmueble_codigo) VALUES (21, 21, 8, 5);

INSERT INTO Alquiler (numero, inmueble_codigo, inquilino_Persona_codigo, agente_Persona_codigo) VALUES (1, 5, 8, 5);
INSERT INTO Alquiler (numero, inmueble_codigo, inquilino_Persona_codigo, agente_Persona_codigo) VALUES (2, 4, 3, 1);
INSERT INTO Alquiler (numero, inmueble_codigo, inquilino_Persona_codigo, agente_Persona_codigo) VALUES (3, 8, 3, 1);
INSERT INTO Alquiler (numero, inmueble_codigo, inquilino_Persona_codigo, agente_Persona_codigo) VALUES (4, 4, 8, 5);
INSERT INTO Alquiler (numero, inmueble_codigo, inquilino_Persona_codigo, agente_Persona_codigo) VALUES (5, 3, 8, 6);
INSERT INTO Alquiler (numero, inmueble_codigo, inquilino_Persona_codigo, agente_Persona_codigo) VALUES (6, 2, 1, 4);
INSERT INTO Alquiler (numero, inmueble_codigo, inquilino_Persona_codigo, agente_Persona_codigo) VALUES (7, 3, 7, 2);
INSERT INTO Alquiler (numero, inmueble_codigo, inquilino_Persona_codigo, agente_Persona_codigo) VALUES (8, 6, 8, 1);

INSERT INTO Titulares (compra_codigo, titular_Persona_codigo) VALUES (6, 7);
INSERT INTO Titulares (compra_codigo, titular_Persona_codigo) VALUES (1, 7);
INSERT INTO Titulares (compra_codigo, titular_Persona_codigo) VALUES (2, 1);
INSERT INTO Titulares (compra_codigo, titular_Persona_codigo) VALUES (4, 5);
INSERT INTO Titulares (compra_codigo, titular_Persona_codigo) VALUES (5, 7);
INSERT INTO Titulares (compra_codigo, titular_Persona_codigo) VALUES (8, 1);
INSERT INTO Titulares (compra_codigo, titular_Persona_codigo) VALUES (3, 5);
INSERT INTO Titulares (compra_codigo, titular_Persona_codigo) VALUES (7, 8);

INSERT INTO Pago (anio, mes, valor, alquiler_numero, alquiler_inmueble_codigo) VALUES (2018, 1, 236.05, 1, 5);
INSERT INTO Pago (anio, mes, valor, alquiler_numero, alquiler_inmueble_codigo) VALUES (2019, 2, 1649.94, 1, 5);
INSERT INTO Pago (anio, mes, valor, alquiler_numero, alquiler_inmueble_codigo) VALUES (2020, 3, 1924.59, 2, 4);
INSERT INTO Pago (anio, mes, valor, alquiler_numero, alquiler_inmueble_codigo) VALUES (2021, 4, 301.65, 5, 3);
INSERT INTO Pago (anio, mes, valor, alquiler_numero, alquiler_inmueble_codigo) VALUES (2022, 5, 1450, 4, 4);
INSERT INTO Pago (anio, mes, valor, alquiler_numero, alquiler_inmueble_codigo) VALUES (2023, 6, 288.82, 8, 6);
INSERT INTO Pago (anio, mes, valor, alquiler_numero, alquiler_inmueble_codigo) VALUES (2024, 7, 1079.36, 5, 3);
INSERT INTO Pago (anio, mes, valor, alquiler_numero, alquiler_inmueble_codigo) VALUES (2025, 8, 610.72, 1, 5);
