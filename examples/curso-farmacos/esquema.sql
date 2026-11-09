-- Hospital: consumo de fármacos · ejercicio 6 (guion ERE)
-- SQL del proyecto, en el dialecto de la consola de DataBasic.
-- Este archivo manda en tablas, claves, relaciones, consultas y filas: si lo cambias,
-- DataBasic lo sigue al abrir la carpeta. Las líneas que empiezan por -- son comentarios.

-- Tablas

CREATE TABLE Paciente (
    num_historia NUMBER(8) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    num_ss CHAR(12),
    direccion VARCHAR(120),
    telefono VARCHAR(15),
    fecha_nacimiento DATE NOT NULL,
    PRIMARY KEY (num_historia)
);

CREATE TABLE Ingreso (
    num_secuencia NUMBER(3) NOT NULL,
    diagnostico VARCHAR(8) NOT NULL,
    fecha_ingreso DATE NOT NULL,
    fecha_alta DATE CHECK (fecha_alta >= fecha_ingreso),
    paciente_num_historia NUMBER(8) NOT NULL,
    servicio_codigo NUMBER(3) NOT NULL,
    PRIMARY KEY (num_secuencia, paciente_num_historia)
);

CREATE TABLE Servicio (
    codigo NUMBER(3) NOT NULL,
    nombre VARCHAR(40) NOT NULL,
    PRIMARY KEY (codigo),
    CONSTRAINT AK_Servicio_nombre UNIQUE (nombre)
);

CREATE TABLE Farmaco (
    num_registro NUMBER(8) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    compuesto VARCHAR(80),
    ubicacion VARCHAR(40),
    dosis_envase NUMBER(4) NOT NULL CHECK (dosis_envase >= 1),
    precio_dosis NUMBER(8,2) NOT NULL CHECK (precio_dosis >= 0),
    PRIMARY KEY (num_registro)
);

CREATE TABLE Consumo_paciente (
    ingreso_num_secuencia NUMBER(3) NOT NULL,
    ingreso_paciente_num_historia NUMBER(8) NOT NULL,
    farmaco_num_registro NUMBER(8) NOT NULL,
    fecha DATE NOT NULL,
    num_dosis NUMBER(4) NOT NULL CHECK (num_dosis >= 1),
    PRIMARY KEY (ingreso_num_secuencia, ingreso_paciente_num_historia, farmaco_num_registro, fecha)
);

CREATE TABLE Consumo_servicio (
    servicio_codigo NUMBER(3) NOT NULL,
    farmaco_num_registro NUMBER(8) NOT NULL,
    fecha DATE NOT NULL,
    num_dosis NUMBER(4) NOT NULL CHECK (num_dosis >= 1),
    PRIMARY KEY (servicio_codigo, farmaco_num_registro, fecha)
);

-- Relaciones (claves ajenas)

ALTER TABLE Ingreso ADD CONSTRAINT FK_Ingresa_paciente
    FOREIGN KEY (paciente_num_historia) REFERENCES Paciente (num_historia)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Ingreso ADD CONSTRAINT FK_En_servicio_servicio
    FOREIGN KEY (servicio_codigo) REFERENCES Servicio (codigo)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Consumo_paciente ADD CONSTRAINT FK_Consume_ingreso
    FOREIGN KEY (ingreso_num_secuencia, ingreso_paciente_num_historia) REFERENCES Ingreso (num_secuencia, paciente_num_historia)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Consumo_paciente ADD CONSTRAINT FK_Consume_farmaco
    FOREIGN KEY (farmaco_num_registro) REFERENCES Farmaco (num_registro)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Consumo_servicio ADD CONSTRAINT FK_Gasta_servicio
    FOREIGN KEY (servicio_codigo) REFERENCES Servicio (codigo)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Consumo_servicio ADD CONSTRAINT FK_Gasta_farmaco
    FOREIGN KEY (farmaco_num_registro) REFERENCES Farmaco (num_registro)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Índices

CREATE UNIQUE INDEX UX_Paciente_num_ss ON Paciente (num_ss);

-- Consultas guardadas

-- Sin consultas.

-- Filas

INSERT INTO Paciente (num_historia, nombre, num_ss, direccion, telefono, fecha_nacimiento) VALUES (1, 'Marta Sánchez', '280000000296', 'C/ Reina Victoria 4, Valencia', '610000041', #1993-05-05#);
INSERT INTO Paciente (num_historia, nombre, num_ss, direccion, telefono, fecha_nacimiento) VALUES (2, 'Pablo Martínez', '280000105648', 'Av. de la Libertad 18, Alicante', '610000882', #2001-08-14#);
INSERT INTO Paciente (num_historia, nombre, num_ss, direccion, telefono, fecha_nacimiento) VALUES (3, 'Óscar Gómez', '280000209890', 'Pl. de España 48, Valencia', '610001707', #1989-02-17#);
INSERT INTO Paciente (num_historia, nombre, num_ss, direccion, telefono, fecha_nacimiento) VALUES (4, 'Marta García', '280000314748', 'C/ Reina Victoria 49, Torrevieja', '610002516', #1966-08-06#);
INSERT INTO Paciente (num_historia, nombre, num_ss, direccion, telefono, fecha_nacimiento) VALUES (5, 'Sara Fernández', '280000419063', 'C/ San Vicente 33, Elche', '610003296', #2000-01-22#);
INSERT INTO Paciente (num_historia, nombre, num_ss, direccion, telefono, fecha_nacimiento) VALUES (6, 'Hugo Martínez', '280000524563', 'C/ del Mar 68, Torrevieja', '610004071', #1968-07-22#);
INSERT INTO Paciente (num_historia, nombre, num_ss, direccion, telefono, fecha_nacimiento) VALUES (7, 'Marta García', '280000628963', 'C/ Mayor 5, Orihuela', '610004909', #2002-05-02#);
INSERT INTO Paciente (num_historia, nombre, num_ss, direccion, telefono, fecha_nacimiento) VALUES (8, 'Diego Moreno', NULL, 'C/ Reina Victoria 43, Orihuela', NULL, #1983-04-05#);

INSERT INTO Servicio (codigo, nombre) VALUES (1, 'Oncología');
INSERT INTO Servicio (codigo, nombre) VALUES (2, 'Traumatología');
INSERT INTO Servicio (codigo, nombre) VALUES (3, 'Pediatría');
INSERT INTO Servicio (codigo, nombre) VALUES (4, 'Cardiología');
INSERT INTO Servicio (codigo, nombre) VALUES (5, 'Urgencias');
INSERT INTO Servicio (codigo, nombre) VALUES (6, 'Neurología');
INSERT INTO Servicio (codigo, nombre) VALUES (7, 'Digestivo');
INSERT INTO Servicio (codigo, nombre) VALUES (8, 'Oncología 2');

INSERT INTO Farmaco (num_registro, nombre, compuesto, ubicacion, dosis_envase, precio_dosis) VALUES (1, 'Paracetamol', 'omeprazol', 'Torrevieja', 14, 45.58);
INSERT INTO Farmaco (num_registro, nombre, compuesto, ubicacion, dosis_envase, precio_dosis) VALUES (2, 'Ibuprofeno', 'paracetamol', 'Valencia', 5, 53.78);
INSERT INTO Farmaco (num_registro, nombre, compuesto, ubicacion, dosis_envase, precio_dosis) VALUES (3, 'Amoxicilina', 'omeprazol', 'Orihuela', 26, 39.6);
INSERT INTO Farmaco (num_registro, nombre, compuesto, ubicacion, dosis_envase, precio_dosis) VALUES (4, 'Omeprazol', 'amoxicilina', 'Alicante', 10, 49.15);
INSERT INTO Farmaco (num_registro, nombre, compuesto, ubicacion, dosis_envase, precio_dosis) VALUES (5, 'Metformina', 'amoxicilina', 'Torrevieja', 11, 22.14);
INSERT INTO Farmaco (num_registro, nombre, compuesto, ubicacion, dosis_envase, precio_dosis) VALUES (6, 'Enalapril', 'paracetamol', 'Crevillente', 4, 28.25);
INSERT INTO Farmaco (num_registro, nombre, compuesto, ubicacion, dosis_envase, precio_dosis) VALUES (7, 'Salbutamol', 'paracetamol', 'Elche', 18, 25.09);
INSERT INTO Farmaco (num_registro, nombre, compuesto, ubicacion, dosis_envase, precio_dosis) VALUES (8, 'Atorvastatina', 'amoxicilina', 'Crevillente', 24, 40.89);

INSERT INTO Ingreso (num_secuencia, diagnostico, fecha_ingreso, fecha_alta, paciente_num_historia, servicio_codigo) VALUES (1, 'E11.9', #2024-07-07#, #2024-08-04#, 4, 4);
INSERT INTO Ingreso (num_secuencia, diagnostico, fecha_ingreso, fecha_alta, paciente_num_historia, servicio_codigo) VALUES (2, 'E11.9', #2025-09-03#, NULL, 6, 4);
INSERT INTO Ingreso (num_secuencia, diagnostico, fecha_ingreso, fecha_alta, paciente_num_historia, servicio_codigo) VALUES (3, 'C50.9', #2024-08-17#, #2024-09-01#, 3, 6);
INSERT INTO Ingreso (num_secuencia, diagnostico, fecha_ingreso, fecha_alta, paciente_num_historia, servicio_codigo) VALUES (4, 'S72.0', #2025-12-17#, #2025-12-30#, 2, 8);
INSERT INTO Ingreso (num_secuencia, diagnostico, fecha_ingreso, fecha_alta, paciente_num_historia, servicio_codigo) VALUES (5, 'K35.8', #2025-01-10#, NULL, 7, 6);
INSERT INTO Ingreso (num_secuencia, diagnostico, fecha_ingreso, fecha_alta, paciente_num_historia, servicio_codigo) VALUES (6, 'C50.9', #2026-04-23#, #2026-06-11#, 4, 3);
INSERT INTO Ingreso (num_secuencia, diagnostico, fecha_ingreso, fecha_alta, paciente_num_historia, servicio_codigo) VALUES (7, 'J18.9', #2024-08-27#, #2024-09-21#, 4, 4);
INSERT INTO Ingreso (num_secuencia, diagnostico, fecha_ingreso, fecha_alta, paciente_num_historia, servicio_codigo) VALUES (8, 'C50.9', #2024-09-07#, #2024-09-26#, 2, 8);

INSERT INTO Consumo_servicio (servicio_codigo, farmaco_num_registro, fecha, num_dosis) VALUES (6, 5, #2025-12-29#, 21);
INSERT INTO Consumo_servicio (servicio_codigo, farmaco_num_registro, fecha, num_dosis) VALUES (6, 1, #2025-10-03#, 8);
INSERT INTO Consumo_servicio (servicio_codigo, farmaco_num_registro, fecha, num_dosis) VALUES (8, 4, #2024-01-31#, 17);
INSERT INTO Consumo_servicio (servicio_codigo, farmaco_num_registro, fecha, num_dosis) VALUES (7, 8, #2026-06-14#, 11);
INSERT INTO Consumo_servicio (servicio_codigo, farmaco_num_registro, fecha, num_dosis) VALUES (1, 8, #2026-01-07#, 24);
INSERT INTO Consumo_servicio (servicio_codigo, farmaco_num_registro, fecha, num_dosis) VALUES (4, 1, #2024-04-08#, 1);
INSERT INTO Consumo_servicio (servicio_codigo, farmaco_num_registro, fecha, num_dosis) VALUES (7, 2, #2026-05-16#, 16);
INSERT INTO Consumo_servicio (servicio_codigo, farmaco_num_registro, fecha, num_dosis) VALUES (2, 4, #2025-10-12#, 28);

INSERT INTO Consumo_paciente (ingreso_num_secuencia, ingreso_paciente_num_historia, farmaco_num_registro, fecha, num_dosis) VALUES (2, 6, 5, #2025-04-27#, 3);
INSERT INTO Consumo_paciente (ingreso_num_secuencia, ingreso_paciente_num_historia, farmaco_num_registro, fecha, num_dosis) VALUES (3, 3, 8, #2025-10-25#, 22);
INSERT INTO Consumo_paciente (ingreso_num_secuencia, ingreso_paciente_num_historia, farmaco_num_registro, fecha, num_dosis) VALUES (2, 6, 7, #2024-08-28#, 27);
INSERT INTO Consumo_paciente (ingreso_num_secuencia, ingreso_paciente_num_historia, farmaco_num_registro, fecha, num_dosis) VALUES (6, 4, 7, #2024-01-25#, 29);
INSERT INTO Consumo_paciente (ingreso_num_secuencia, ingreso_paciente_num_historia, farmaco_num_registro, fecha, num_dosis) VALUES (7, 4, 8, #2024-01-20#, 5);
INSERT INTO Consumo_paciente (ingreso_num_secuencia, ingreso_paciente_num_historia, farmaco_num_registro, fecha, num_dosis) VALUES (5, 7, 6, #2026-02-04#, 5);
INSERT INTO Consumo_paciente (ingreso_num_secuencia, ingreso_paciente_num_historia, farmaco_num_registro, fecha, num_dosis) VALUES (3, 3, 2, #2024-05-07#, 3);
INSERT INTO Consumo_paciente (ingreso_num_secuencia, ingreso_paciente_num_historia, farmaco_num_registro, fecha, num_dosis) VALUES (6, 4, 5, #2024-03-17#, 7);
