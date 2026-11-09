-- Empresa · ejercicio 2 (guion ERE)
-- SQL del proyecto, en el dialecto de la consola de DataBasic.
-- Este archivo manda en tablas, claves, relaciones, consultas y filas: si lo cambias,
-- DataBasic lo sigue al abrir la carpeta. Las líneas que empiezan por -- son comentarios.

-- Tablas

CREATE TABLE Departamento (
    numero NUMBER(3) NOT NULL,
    nombre VARCHAR(60) NOT NULL,
    gerente_dni CHAR(9) NOT NULL,
    fecha_inicio DATE NOT NULL,
    PRIMARY KEY (numero),
    CONSTRAINT AK_Departamento_nombre UNIQUE (nombre),
    CONSTRAINT AK_Departamento_Dirige UNIQUE (gerente_dni)
);

CREATE TABLE Lugares_departamento (
    Departamento_numero NUMBER(3) NOT NULL,
    lugar VARCHAR(60) NOT NULL,
    PRIMARY KEY (Departamento_numero, lugar)
);

CREATE TABLE Proyecto (
    numero NUMBER(4) NOT NULL,
    nombre VARCHAR(60) NOT NULL,
    lugar VARCHAR(60) NOT NULL,
    departamento_numero NUMBER(3) NOT NULL,
    PRIMARY KEY (numero),
    CONSTRAINT AK_Proyecto_nombre UNIQUE (nombre)
);

CREATE TABLE Empleado (
    dni CHAR(9) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    direccion VARCHAR(120),
    salario NUMBER(8,2) CHECK (salario >= 0),
    sexo CHAR(1) CHECK (sexo IN ('H', 'M')),
    fecha_nacimiento DATE,
    departamento_numero NUMBER(3) NOT NULL,
    supervisor_dni CHAR(9),
    PRIMARY KEY (dni)
);

CREATE TABLE Familiar (
    nombre VARCHAR(80) NOT NULL,
    sexo CHAR(1) CHECK (sexo IN ('H', 'M')),
    fecha_nacimiento DATE,
    parentesco VARCHAR(20) NOT NULL,
    empleado_dni CHAR(9) NOT NULL,
    PRIMARY KEY (nombre, empleado_dni)
);

CREATE TABLE Trabaja_en (
    empleado_dni CHAR(9) NOT NULL,
    proyecto_numero NUMBER(4) NOT NULL,
    horas_semana NUMBER(4,1) NOT NULL CHECK (horas_semana >= 0 AND horas_semana <= 60),
    PRIMARY KEY (empleado_dni, proyecto_numero)
);

-- Relaciones (claves ajenas)

ALTER TABLE Lugares_departamento ADD CONSTRAINT FK_Lugares_departamento_Departamento
    FOREIGN KEY (Departamento_numero) REFERENCES Departamento (numero)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Departamento ADD CONSTRAINT FK_Dirige_gerente
    FOREIGN KEY (gerente_dni) REFERENCES Empleado (dni)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Empleado ADD CONSTRAINT FK_Trabaja_para_departamento
    FOREIGN KEY (departamento_numero) REFERENCES Departamento (numero)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Proyecto ADD CONSTRAINT FK_Controla_departamento
    FOREIGN KEY (departamento_numero) REFERENCES Departamento (numero)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Empleado ADD CONSTRAINT FK_Supervision_supervisor
    FOREIGN KEY (supervisor_dni) REFERENCES Empleado (dni)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Trabaja_en ADD CONSTRAINT FK_Trabaja_en_empleado
    FOREIGN KEY (empleado_dni) REFERENCES Empleado (dni)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Trabaja_en ADD CONSTRAINT FK_Trabaja_en_proyecto
    FOREIGN KEY (proyecto_numero) REFERENCES Proyecto (numero)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Familiar ADD CONSTRAINT FK_Familiares_de_empleado
    FOREIGN KEY (empleado_dni) REFERENCES Empleado (dni)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Índices

-- Sin índices.

-- Consultas guardadas

-- Sin consultas.

-- Filas

INSERT INTO Departamento (numero, nombre, gerente_dni, fecha_inicio) VALUES (1, 'Logística', '10039823R', #2025-05-27#);
INSERT INTO Departamento (numero, nombre, gerente_dni, fecha_inicio) VALUES (2, 'Administración', '10032450B', #2024-07-25#);
INSERT INTO Departamento (numero, nombre, gerente_dni, fecha_inicio) VALUES (3, 'Mantenimiento', '10000561T', #2025-10-13#);
INSERT INTO Departamento (numero, nombre, gerente_dni, fecha_inicio) VALUES (4, 'Ventas', '10056401L', #2024-09-23#);
INSERT INTO Departamento (numero, nombre, gerente_dni, fecha_inicio) VALUES (5, 'Recursos Humanos', '10016340R', #2024-12-27#);
INSERT INTO Departamento (numero, nombre, gerente_dni, fecha_inicio) VALUES (6, 'Informática', '10024678J', #2025-11-09#);
INSERT INTO Departamento (numero, nombre, gerente_dni, fecha_inicio) VALUES (7, 'Calidad', '10007983Q', #2024-02-05#);
INSERT INTO Departamento (numero, nombre, gerente_dni, fecha_inicio) VALUES (8, 'Compras', '10047978Z', #2025-09-14#);

INSERT INTO Lugares_departamento (Departamento_numero, lugar) VALUES (8, 'Orihuela');
INSERT INTO Lugares_departamento (Departamento_numero, lugar) VALUES (7, 'Santa Pola');
INSERT INTO Lugares_departamento (Departamento_numero, lugar) VALUES (2, 'Elche');
INSERT INTO Lugares_departamento (Departamento_numero, lugar) VALUES (1, 'Alicante');
INSERT INTO Lugares_departamento (Departamento_numero, lugar) VALUES (8, 'Torrevieja');
INSERT INTO Lugares_departamento (Departamento_numero, lugar) VALUES (2, 'Alicante');
INSERT INTO Lugares_departamento (Departamento_numero, lugar) VALUES (2, 'Santa Pola');
INSERT INTO Lugares_departamento (Departamento_numero, lugar) VALUES (6, 'Crevillente');

INSERT INTO Proyecto (numero, nombre, lugar, departamento_numero) VALUES (1, 'Proyecto Alfa', 'Orihuela', 5);
INSERT INTO Proyecto (numero, nombre, lugar, departamento_numero) VALUES (2, 'Proyecto Brisa', 'Santa Pola', 7);
INSERT INTO Proyecto (numero, nombre, lugar, departamento_numero) VALUES (3, 'Proyecto Coral', 'Orihuela', 6);
INSERT INTO Proyecto (numero, nombre, lugar, departamento_numero) VALUES (4, 'Proyecto Delta', 'Orihuela', 5);
INSERT INTO Proyecto (numero, nombre, lugar, departamento_numero) VALUES (5, 'Proyecto Eco', 'Valencia', 5);
INSERT INTO Proyecto (numero, nombre, lugar, departamento_numero) VALUES (6, 'Proyecto Faro', 'Torrevieja', 2);
INSERT INTO Proyecto (numero, nombre, lugar, departamento_numero) VALUES (7, 'Proyecto Alfa 2', 'Alicante', 6);
INSERT INTO Proyecto (numero, nombre, lugar, departamento_numero) VALUES (8, 'Proyecto Brisa 2', 'Orihuela', 5);

INSERT INTO Empleado (dni, nombre, direccion, salario, sexo, fecha_nacimiento, departamento_numero, supervisor_dni) VALUES ('10000561T', 'Ana Romero', 'C/ Reina Victoria 29, Torrevieja', 2540.6, 'H', #1970-02-28#, 1, NULL);
INSERT INTO Empleado (dni, nombre, direccion, salario, sexo, fecha_nacimiento, departamento_numero, supervisor_dni) VALUES ('10007983Q', 'Diego Díaz', 'C/ Mayor 69, Alicante', 3099.82, 'M', #1993-10-10#, 5, NULL);
INSERT INTO Empleado (dni, nombre, direccion, salario, sexo, fecha_nacimiento, departamento_numero, supervisor_dni) VALUES ('10016340R', 'Óscar Sánchez', NULL, 2513.88, 'H', NULL, 2, NULL);
INSERT INTO Empleado (dni, nombre, direccion, salario, sexo, fecha_nacimiento, departamento_numero, supervisor_dni) VALUES ('10024678J', 'Marta García', 'C/ San Vicente 4, Valencia', 2220.08, 'H', #1971-02-17#, 4, '10007983Q');
INSERT INTO Empleado (dni, nombre, direccion, salario, sexo, fecha_nacimiento, departamento_numero, supervisor_dni) VALUES ('10032450B', 'Diego Romero', 'C/ Mayor 89, Valencia', 3246.96, 'M', #1976-11-19#, 8, NULL);
INSERT INTO Empleado (dni, nombre, direccion, salario, sexo, fecha_nacimiento, departamento_numero, supervisor_dni) VALUES ('10039823R', 'Nuria Romero', 'Av. de Elche 68, Torrevieja', 1960.11, 'H', #2003-02-13#, 8, '10007983Q');
INSERT INTO Empleado (dni, nombre, direccion, salario, sexo, fecha_nacimiento, departamento_numero, supervisor_dni) VALUES ('10047978Z', 'Marta Díaz', 'Pl. de España 55, Santa Pola', 2964.31, 'H', #2005-03-25#, 7, NULL);
INSERT INTO Empleado (dni, nombre, direccion, salario, sexo, fecha_nacimiento, departamento_numero, supervisor_dni) VALUES ('10056401L', 'Andrés García', 'Av. de Elche 68, Santa Pola', 1669.98, 'M', #1995-04-06#, 4, '10016340R');

INSERT INTO Familiar (nombre, sexo, fecha_nacimiento, parentesco, empleado_dni) VALUES ('Marta Moreno', 'H', #1970-10-27#, 'hija', '10047978Z');
INSERT INTO Familiar (nombre, sexo, fecha_nacimiento, parentesco, empleado_dni) VALUES ('Sara López', NULL, #1976-05-06#, 'madre', '10047978Z');
INSERT INTO Familiar (nombre, sexo, fecha_nacimiento, parentesco, empleado_dni) VALUES ('Hugo Álvarez', 'M', #1996-09-18#, 'hijo', '10047978Z');
INSERT INTO Familiar (nombre, sexo, fecha_nacimiento, parentesco, empleado_dni) VALUES ('Luis Navarro', 'H', #1995-12-28#, 'hija', '10039823R');
INSERT INTO Familiar (nombre, sexo, fecha_nacimiento, parentesco, empleado_dni) VALUES ('Andrés Romero', 'H', NULL, 'hijo', '10000561T');
INSERT INTO Familiar (nombre, sexo, fecha_nacimiento, parentesco, empleado_dni) VALUES ('Alba Sánchez', 'M', #1980-09-26#, 'hijo', '10000561T');
INSERT INTO Familiar (nombre, sexo, fecha_nacimiento, parentesco, empleado_dni) VALUES ('Lucía Martínez', 'M', #1991-02-25#, 'hija', '10032450B');
INSERT INTO Familiar (nombre, sexo, fecha_nacimiento, parentesco, empleado_dni) VALUES ('Andrés Torres', NULL, #1999-12-01#, 'hijo', '10056401L');

INSERT INTO Trabaja_en (empleado_dni, proyecto_numero, horas_semana) VALUES ('10032450B', 6, 34.1);
INSERT INTO Trabaja_en (empleado_dni, proyecto_numero, horas_semana) VALUES ('10007983Q', 3, 6.7);
INSERT INTO Trabaja_en (empleado_dni, proyecto_numero, horas_semana) VALUES ('10007983Q', 1, 30.2);
INSERT INTO Trabaja_en (empleado_dni, proyecto_numero, horas_semana) VALUES ('10032450B', 1, 9);
INSERT INTO Trabaja_en (empleado_dni, proyecto_numero, horas_semana) VALUES ('10024678J', 7, 31.6);
INSERT INTO Trabaja_en (empleado_dni, proyecto_numero, horas_semana) VALUES ('10016340R', 1, 24.5);
INSERT INTO Trabaja_en (empleado_dni, proyecto_numero, horas_semana) VALUES ('10032450B', 4, 28.6);
INSERT INTO Trabaja_en (empleado_dni, proyecto_numero, horas_semana) VALUES ('10024678J', 2, 40);
