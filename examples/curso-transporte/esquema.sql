-- Empresa de transporte · ejercicio 6 (Tema 2)
-- SQL del proyecto, en el dialecto de la consola de DataBasic.
-- Este archivo manda en tablas, claves, relaciones, consultas y filas: si lo cambias,
-- DataBasic lo sigue al abrir la carpeta. Las líneas que empiezan por -- son comentarios.

-- Tablas

CREATE TABLE Vehiculo (
    matricula VARCHAR(10) NOT NULL,
    marca VARCHAR(30) NOT NULL,
    anio_compra NUMBER(4) NOT NULL,
    PRIMARY KEY (matricula)
);

CREATE TABLE Camion (
    capacidad_kg NUMBER(6) NOT NULL CHECK (capacidad_kg >= 0),
    Vehiculo_matricula VARCHAR(10) NOT NULL,
    PRIMARY KEY (Vehiculo_matricula)
);

CREATE TABLE Furgoneta (
    volumen_m3 NUMBER(5,2) NOT NULL CHECK (volumen_m3 >= 0),
    Vehiculo_matricula VARCHAR(10) NOT NULL,
    PRIMARY KEY (Vehiculo_matricula)
);

CREATE TABLE Coche (
    num_plazas NUMBER(2) NOT NULL CHECK (num_plazas >= 1),
    Vehiculo_matricula VARCHAR(10) NOT NULL,
    PRIMARY KEY (Vehiculo_matricula)
);

CREATE TABLE Empleado (
    dni CHAR(9) NOT NULL,
    nombre VARCHAR(40) NOT NULL,
    apellidos VARCHAR(80) NOT NULL,
    salario NUMBER(8,2) CHECK (salario >= 0),
    departamento_codigo NUMBER(3) NOT NULL,
    PRIMARY KEY (dni)
);

CREATE TABLE Conductor (
    tipo_carnet VARCHAR(5) NOT NULL,
    anios_experiencia NUMBER(2) CHECK (anios_experiencia >= 0),
    Empleado_dni CHAR(9) NOT NULL,
    PRIMARY KEY (Empleado_dni)
);

CREATE TABLE Administrativo (
    area VARCHAR(40),
    Empleado_dni CHAR(9) NOT NULL,
    PRIMARY KEY (Empleado_dni)
);

CREATE TABLE Departamento (
    codigo NUMBER(3) NOT NULL,
    nombre VARCHAR(40) NOT NULL,
    PRIMARY KEY (codigo),
    CONSTRAINT AK_Departamento_nombre UNIQUE (nombre)
);

CREATE TABLE Asignacion (
    conductor_Empleado_dni CHAR(9) NOT NULL,
    vehiculo_matricula VARCHAR(10) NOT NULL,
    turno VARCHAR(6) NOT NULL CHECK (turno IN ('mañana', 'tarde', 'noche')),
    PRIMARY KEY (vehiculo_matricula, turno),
    CONSTRAINT AK_Asignacion_conductor_turno UNIQUE (conductor_Empleado_dni, turno)
);

-- Relaciones (claves ajenas)

ALTER TABLE Camion ADD CONSTRAINT FK_Camion_Vehiculo
    FOREIGN KEY (Vehiculo_matricula) REFERENCES Vehiculo (matricula)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Furgoneta ADD CONSTRAINT FK_Furgoneta_Vehiculo
    FOREIGN KEY (Vehiculo_matricula) REFERENCES Vehiculo (matricula)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Coche ADD CONSTRAINT FK_Coche_Vehiculo
    FOREIGN KEY (Vehiculo_matricula) REFERENCES Vehiculo (matricula)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Conductor ADD CONSTRAINT FK_Conductor_Empleado
    FOREIGN KEY (Empleado_dni) REFERENCES Empleado (dni)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Administrativo ADD CONSTRAINT FK_Administrativo_Empleado
    FOREIGN KEY (Empleado_dni) REFERENCES Empleado (dni)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Empleado ADD CONSTRAINT FK_Pertenece_departamento
    FOREIGN KEY (departamento_codigo) REFERENCES Departamento (codigo)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Asignacion ADD CONSTRAINT FK_Asignado_conductor
    FOREIGN KEY (conductor_Empleado_dni) REFERENCES Conductor (Empleado_dni)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Asignacion ADD CONSTRAINT FK_Asignado_vehiculo
    FOREIGN KEY (vehiculo_matricula) REFERENCES Vehiculo (matricula)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Índices

-- Sin índices.

-- Consultas guardadas

-- Sin consultas.

-- Filas

INSERT INTO Vehiculo (matricula, marca, anio_compra) VALUES ('1000 BCD', 'Toyota', 2002);
INSERT INTO Vehiculo (matricula, marca, anio_compra) VALUES ('1037 FGH', 'Peugeot', 2004);
INSERT INTO Vehiculo (matricula, marca, anio_compra) VALUES ('1074 JKL', 'Ford', 2018);
INSERT INTO Vehiculo (matricula, marca, anio_compra) VALUES ('1111 MNP', 'Seat', 2016);
INSERT INTO Vehiculo (matricula, marca, anio_compra) VALUES ('1148 BCD', 'Iveco', 2007);
INSERT INTO Vehiculo (matricula, marca, anio_compra) VALUES ('1185 FGH', 'Peugeot', 2005);
INSERT INTO Vehiculo (matricula, marca, anio_compra) VALUES ('1222 JKL', 'Seat', 1997);
INSERT INTO Vehiculo (matricula, marca, anio_compra) VALUES ('1259 MNP', 'Seat', 2002);

INSERT INTO Departamento (codigo, nombre) VALUES (1, 'Logística');
INSERT INTO Departamento (codigo, nombre) VALUES (2, 'Administración');
INSERT INTO Departamento (codigo, nombre) VALUES (3, 'Mantenimiento');
INSERT INTO Departamento (codigo, nombre) VALUES (4, 'Ventas');
INSERT INTO Departamento (codigo, nombre) VALUES (5, 'Recursos Humanos');
INSERT INTO Departamento (codigo, nombre) VALUES (6, 'Informática');
INSERT INTO Departamento (codigo, nombre) VALUES (7, 'Calidad');
INSERT INTO Departamento (codigo, nombre) VALUES (8, 'Compras');

INSERT INTO Camion (capacidad_kg, Vehiculo_matricula) VALUES (456, '1074 JKL');
INSERT INTO Camion (capacidad_kg, Vehiculo_matricula) VALUES (297, '1148 BCD');
INSERT INTO Camion (capacidad_kg, Vehiculo_matricula) VALUES (251, '1185 FGH');

INSERT INTO Furgoneta (volumen_m3, Vehiculo_matricula) VALUES (388.22, '1222 JKL');
INSERT INTO Furgoneta (volumen_m3, Vehiculo_matricula) VALUES (161.68, '1000 BCD');
INSERT INTO Furgoneta (volumen_m3, Vehiculo_matricula) VALUES (352.68, '1259 MNP');

INSERT INTO Coche (num_plazas, Vehiculo_matricula) VALUES (13, '1111 MNP');
INSERT INTO Coche (num_plazas, Vehiculo_matricula) VALUES (18, '1037 FGH');

INSERT INTO Empleado (dni, nombre, apellidos, salario, departamento_codigo) VALUES ('10000524D', 'Marta', 'Sánchez Pérez', 2726.95, 4);
INSERT INTO Empleado (dni, nombre, apellidos, salario, departamento_codigo) VALUES ('10008492L', 'Sara', 'García López', 2448.64, 2);
INSERT INTO Empleado (dni, nombre, apellidos, salario, departamento_codigo) VALUES ('10016663W', 'Nuria', 'Torres Marín', 3098.57, 2);
INSERT INTO Empleado (dni, nombre, apellidos, salario, departamento_codigo) VALUES ('10024357Z', 'Luis', 'García López', 1810.68, 2);
INSERT INTO Empleado (dni, nombre, apellidos, salario, departamento_codigo) VALUES ('10032654P', 'Paula', 'Fernández Gil', NULL, 2);
INSERT INTO Empleado (dni, nombre, apellidos, salario, departamento_codigo) VALUES ('10040121T', 'Alba', 'García López', 1416.37, 5);
INSERT INTO Empleado (dni, nombre, apellidos, salario, departamento_codigo) VALUES ('10048347S', 'Carlos', 'Álvarez Castro', 2899.42, 2);
INSERT INTO Empleado (dni, nombre, apellidos, salario, departamento_codigo) VALUES ('10055777Q', 'Diego', 'Gómez Navarro', 2944.53, 7);

INSERT INTO Conductor (tipo_carnet, anios_experiencia, Empleado_dni) VALUES ('C', 43, '10055777Q');
INSERT INTO Conductor (tipo_carnet, anios_experiencia, Empleado_dni) VALUES ('D', 5, '10048347S');
INSERT INTO Conductor (tipo_carnet, anios_experiencia, Empleado_dni) VALUES ('B', 3, '10016663W');

INSERT INTO Administrativo (area, Empleado_dni) VALUES ('atención al público', '10024357Z');
INSERT INTO Administrativo (area, Empleado_dni) VALUES ('investigación', '10032654P');
INSERT INTO Administrativo (area, Empleado_dni) VALUES (NULL, '10040121T');

INSERT INTO Asignacion (conductor_Empleado_dni, vehiculo_matricula, turno) VALUES ('10048347S', '1074 JKL', 'mañana');
INSERT INTO Asignacion (conductor_Empleado_dni, vehiculo_matricula, turno) VALUES ('10048347S', '1259 MNP', 'tarde');
INSERT INTO Asignacion (conductor_Empleado_dni, vehiculo_matricula, turno) VALUES ('10016663W', '1111 MNP', 'noche');
INSERT INTO Asignacion (conductor_Empleado_dni, vehiculo_matricula, turno) VALUES ('10048347S', '1037 FGH', 'noche');
INSERT INTO Asignacion (conductor_Empleado_dni, vehiculo_matricula, turno) VALUES ('10016663W', '1222 JKL', 'tarde');
INSERT INTO Asignacion (conductor_Empleado_dni, vehiculo_matricula, turno) VALUES ('10055777Q', '1074 JKL', 'noche');
INSERT INTO Asignacion (conductor_Empleado_dni, vehiculo_matricula, turno) VALUES ('10055777Q', '1148 BCD', 'tarde');
INSERT INTO Asignacion (conductor_Empleado_dni, vehiculo_matricula, turno) VALUES ('10016663W', '1000 BCD', 'mañana');
