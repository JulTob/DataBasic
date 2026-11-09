-- Salas de un hospital · ejercicio 5 (Tema 2)
-- SQL del proyecto, en el dialecto de la consola de DataBasic.
-- Este archivo manda en tablas, claves, relaciones, consultas y filas: si lo cambias,
-- DataBasic lo sigue al abrir la carpeta. Las líneas que empiezan por -- son comentarios.

-- Tablas

CREATE TABLE Personal (
    num_empleado NUMBER(6) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    direccion VARCHAR(120),
    telefono VARCHAR(15),
    sala_nombre VARCHAR(40) NOT NULL,
    PRIMARY KEY (num_empleado)
);

CREATE TABLE Sala (
    nombre VARCHAR(40) NOT NULL,
    num_camas NUMBER(3) NOT NULL CHECK (num_camas >= 0),
    PRIMARY KEY (nombre)
);

CREATE TABLE Paciente (
    num_registro NUMBER(8) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    sala_nombre VARCHAR(40) NOT NULL,
    PRIMARY KEY (num_registro)
);

-- Relaciones (claves ajenas)

ALTER TABLE Personal ADD CONSTRAINT FK_Trabaja_en_sala
    FOREIGN KEY (sala_nombre) REFERENCES Sala (nombre)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Paciente ADD CONSTRAINT FK_Internado_en_sala
    FOREIGN KEY (sala_nombre) REFERENCES Sala (nombre)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Índices

-- Sin índices.

-- Consultas guardadas

-- Sin consultas.

-- Filas

INSERT INTO Sala (nombre, num_camas) VALUES ('Sala Azul', 18);
INSERT INTO Sala (nombre, num_camas) VALUES ('Sala Verde', 7);
INSERT INTO Sala (nombre, num_camas) VALUES ('Sala Norte', 22);
INSERT INTO Sala (nombre, num_camas) VALUES ('Sala Sur', 9);
INSERT INTO Sala (nombre, num_camas) VALUES ('Sala Mar', 13);
INSERT INTO Sala (nombre, num_camas) VALUES ('Sala Sol', 23);
INSERT INTO Sala (nombre, num_camas) VALUES ('Sala Azul 2', 2);
INSERT INTO Sala (nombre, num_camas) VALUES ('Sala Verde 2', 21);

INSERT INTO Personal (num_empleado, nombre, direccion, telefono, sala_nombre) VALUES (1, 'Luis Romero', 'Av. de la Libertad 7, Elche', '610000091', 'Sala Verde 2');
INSERT INTO Personal (num_empleado, nombre, direccion, telefono, sala_nombre) VALUES (2, 'Pablo Sánchez', 'C/ del Mar 65, Crevillente', '610000860', 'Sala Azul 2');
INSERT INTO Personal (num_empleado, nombre, direccion, telefono, sala_nombre) VALUES (3, 'Hugo Álvarez', 'C/ San Vicente 41, Murcia', '610001643', 'Sala Azul 2');
INSERT INTO Personal (num_empleado, nombre, direccion, telefono, sala_nombre) VALUES (4, 'Javier Martínez', 'Pl. de España 5, Torrevieja', '610002447', 'Sala Azul 2');
INSERT INTO Personal (num_empleado, nombre, direccion, telefono, sala_nombre) VALUES (5, 'Paula Torres', 'C/ Reina Victoria 21, Murcia', '610003248', 'Sala Azul 2');
INSERT INTO Personal (num_empleado, nombre, direccion, telefono, sala_nombre) VALUES (6, 'Nuria Martínez', 'C/ San Vicente 33, Elche', '610004107', 'Sala Norte');
INSERT INTO Personal (num_empleado, nombre, direccion, telefono, sala_nombre) VALUES (7, 'Marta Romero', 'Av. de la Libertad 75, Crevillente', '610004893', 'Sala Verde 2');
INSERT INTO Personal (num_empleado, nombre, direccion, telefono, sala_nombre) VALUES (8, 'Irene Fernández', 'C/ del Mar 46, Torrevieja', '610005684', 'Sala Sol');

INSERT INTO Paciente (num_registro, nombre, sala_nombre) VALUES (1, 'Marta Díaz', 'Sala Verde 2');
INSERT INTO Paciente (num_registro, nombre, sala_nombre) VALUES (2, 'Pablo López', 'Sala Azul');
INSERT INTO Paciente (num_registro, nombre, sala_nombre) VALUES (3, 'Hugo Navarro', 'Sala Sol');
INSERT INTO Paciente (num_registro, nombre, sala_nombre) VALUES (4, 'Luis Sánchez', 'Sala Sur');
INSERT INTO Paciente (num_registro, nombre, sala_nombre) VALUES (5, 'Sara Álvarez', 'Sala Mar');
INSERT INTO Paciente (num_registro, nombre, sala_nombre) VALUES (6, 'Nuria López', 'Sala Azul 2');
INSERT INTO Paciente (num_registro, nombre, sala_nombre) VALUES (7, 'Lucía Gómez', 'Sala Azul');
INSERT INTO Paciente (num_registro, nombre, sala_nombre) VALUES (8, 'Andrés Torres', 'Sala Verde');
