-- Funcionarios y contratados · ejercicio 2 (Tema 2)
-- SQL del proyecto, en el dialecto de la consola de DataBasic.
-- Este archivo manda en tablas, claves, relaciones, consultas y filas: si lo cambias,
-- DataBasic lo sigue al abrir la carpeta. Las líneas que empiezan por -- son comentarios.

-- Tablas

CREATE TABLE Empleado (
    nrp VARCHAR(16) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    direccion VARCHAR(120),
    telefono VARCHAR(15),
    PRIMARY KEY (nrp)
);

CREATE TABLE Funcionario (
    nivel VARCHAR(10) NOT NULL,
    fecha_ingreso DATE NOT NULL,
    Empleado_nrp VARCHAR(16) NOT NULL,
    PRIMARY KEY (Empleado_nrp)
);

CREATE TABLE Laboral (
    grupo VARCHAR(10) NOT NULL,
    especialidad VARCHAR(40),
    Empleado_nrp VARCHAR(16) NOT NULL,
    PRIMARY KEY (Empleado_nrp)
);

CREATE TABLE Docente (
    creditos NUMBER(4,1) NOT NULL CHECK (creditos >= 0),
    Empleado_nrp VARCHAR(16) NOT NULL,
    PRIMARY KEY (Empleado_nrp)
);

CREATE TABLE Servicios (
    servicio VARCHAR(40) NOT NULL,
    Empleado_nrp VARCHAR(16) NOT NULL,
    PRIMARY KEY (Empleado_nrp)
);

-- Relaciones (claves ajenas)

ALTER TABLE Funcionario ADD CONSTRAINT FK_Funcionario_Empleado
    FOREIGN KEY (Empleado_nrp) REFERENCES Empleado (nrp)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Laboral ADD CONSTRAINT FK_Laboral_Empleado
    FOREIGN KEY (Empleado_nrp) REFERENCES Empleado (nrp)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Docente ADD CONSTRAINT FK_Docente_Empleado
    FOREIGN KEY (Empleado_nrp) REFERENCES Empleado (nrp)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Servicios ADD CONSTRAINT FK_Servicios_Empleado
    FOREIGN KEY (Empleado_nrp) REFERENCES Empleado (nrp)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Índices

-- Sin índices.

-- Consultas guardadas

-- Sin consultas.

-- Filas

INSERT INTO Empleado (nrp, nombre, direccion, telefono) VALUES ('nrp 1', 'Marta Sánchez', 'C/ del Mar 37, Torrevieja', NULL);
INSERT INTO Empleado (nrp, nombre, direccion, telefono) VALUES ('nrp 2', 'Diego Navarro', 'C/ Reina Victoria 31, Alicante', NULL);
INSERT INTO Empleado (nrp, nombre, direccion, telefono) VALUES ('nrp 3', 'Clara Sánchez', 'C/ Reina Victoria 21, Alicante', '610001654');
INSERT INTO Empleado (nrp, nombre, direccion, telefono) VALUES ('nrp 4', 'Javier Torres', 'Pl. de España 70, Santa Pola', '610002476');
INSERT INTO Empleado (nrp, nombre, direccion, telefono) VALUES ('nrp 5', 'Paula López', 'Av. de Elche 20, Torrevieja', '610003256');
INSERT INTO Empleado (nrp, nombre, direccion, telefono) VALUES ('nrp 6', 'Óscar Fernández', NULL, '610004111');
INSERT INTO Empleado (nrp, nombre, direccion, telefono) VALUES ('nrp 7', 'Marta Romero', 'C/ Reina Victoria 29, Torrevieja', '610004926');
INSERT INTO Empleado (nrp, nombre, direccion, telefono) VALUES ('nrp 8', 'Diego García', 'C/ del Mar 14, Crevillente', '610005712');

INSERT INTO Funcionario (nivel, fecha_ingreso, Empleado_nrp) VALUES ('A1', #2026-01-20#, 'nrp 2');
INSERT INTO Funcionario (nivel, fecha_ingreso, Empleado_nrp) VALUES ('C2', #2025-09-11#, 'nrp 3');
INSERT INTO Funcionario (nivel, fecha_ingreso, Empleado_nrp) VALUES ('A2', #2025-11-06#, 'nrp 7');
INSERT INTO Funcionario (nivel, fecha_ingreso, Empleado_nrp) VALUES ('C2', #2024-11-05#, 'nrp 5');

INSERT INTO Laboral (grupo, especialidad, Empleado_nrp) VALUES ('A1', 'investigación', 'nrp 6');
INSERT INTO Laboral (grupo, especialidad, Empleado_nrp) VALUES ('C2', 'gestión', 'nrp 8');
INSERT INTO Laboral (grupo, especialidad, Empleado_nrp) VALUES ('C2', 'investigación', 'nrp 4');
INSERT INTO Laboral (grupo, especialidad, Empleado_nrp) VALUES ('A1', NULL, 'nrp 1');

INSERT INTO Docente (creditos, Empleado_nrp) VALUES (19, 'nrp 8');
INSERT INTO Docente (creditos, Empleado_nrp) VALUES (2.1, 'nrp 1');
INSERT INTO Docente (creditos, Empleado_nrp) VALUES (22.4, 'nrp 7');
INSERT INTO Docente (creditos, Empleado_nrp) VALUES (23.3, 'nrp 5');

INSERT INTO Servicios (servicio, Empleado_nrp) VALUES ('secretaría', 'nrp 6');
INSERT INTO Servicios (servicio, Empleado_nrp) VALUES ('secretaría', 'nrp 2');
INSERT INTO Servicios (servicio, Empleado_nrp) VALUES ('limpieza', 'nrp 3');
INSERT INTO Servicios (servicio, Empleado_nrp) VALUES ('biblioteca', 'nrp 4');
