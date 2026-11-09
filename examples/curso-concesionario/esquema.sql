-- Concesionario · ejercicio 7 (Tema 2)
-- SQL del proyecto, en el dialecto de la consola de DataBasic.
-- Este archivo manda en tablas, claves, relaciones, consultas y filas: si lo cambias,
-- DataBasic lo sigue al abrir la carpeta. Las líneas que empiezan por -- son comentarios.

-- Tablas

CREATE TABLE Cliente (
    dni CHAR(9) NOT NULL,
    nombre VARCHAR(40) NOT NULL,
    apellidos VARCHAR(80) NOT NULL,
    direccion VARCHAR(120),
    telefono VARCHAR(15),
    PRIMARY KEY (dni)
);

CREATE TABLE Coche (
    matricula VARCHAR(10) NOT NULL,
    marca VARCHAR(30) NOT NULL,
    modelo VARCHAR(40) NOT NULL,
    color VARCHAR(20),
    cliente_dni CHAR(9),
    PRIMARY KEY (matricula)
);

CREATE TABLE Nuevo (
    unidades NUMBER(3) NOT NULL CHECK (unidades >= 0),
    Coche_matricula VARCHAR(10) NOT NULL,
    PRIMARY KEY (Coche_matricula)
);

CREATE TABLE Usado (
    kilometros NUMBER(7) NOT NULL CHECK (kilometros >= 0),
    Coche_matricula VARCHAR(10) NOT NULL,
    PRIMARY KEY (Coche_matricula)
);

CREATE TABLE Mecanico (
    dni CHAR(9) NOT NULL,
    nombre VARCHAR(40) NOT NULL,
    apellidos VARCHAR(80) NOT NULL,
    fecha_contratacion DATE NOT NULL,
    salario NUMBER(8,2) CHECK (salario >= 0),
    PRIMARY KEY (dni)
);

CREATE TABLE Reparacion (
    mecanico_dni CHAR(9) NOT NULL,
    coche_matricula VARCHAR(10) NOT NULL,
    fecha DATE NOT NULL,
    horas NUMBER(4,1) NOT NULL CHECK (horas >= 0),
    PRIMARY KEY (mecanico_dni, coche_matricula, fecha)
);

-- Relaciones (claves ajenas)

ALTER TABLE Nuevo ADD CONSTRAINT FK_Nuevo_Coche
    FOREIGN KEY (Coche_matricula) REFERENCES Coche (matricula)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Usado ADD CONSTRAINT FK_Usado_Coche
    FOREIGN KEY (Coche_matricula) REFERENCES Coche (matricula)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Coche ADD CONSTRAINT FK_Compra_cliente
    FOREIGN KEY (cliente_dni) REFERENCES Cliente (dni)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Reparacion ADD CONSTRAINT FK_Repara_mecanico
    FOREIGN KEY (mecanico_dni) REFERENCES Mecanico (dni)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Reparacion ADD CONSTRAINT FK_Repara_coche
    FOREIGN KEY (coche_matricula) REFERENCES Coche (matricula)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Índices

-- Sin índices.

-- Consultas guardadas

-- Sin consultas.

-- Filas

INSERT INTO Cliente (dni, nombre, apellidos, direccion, telefono) VALUES ('10000569P', 'Ana', 'Álvarez Castro', 'Pl. de España 68, Elche', '610000095');
INSERT INTO Cliente (dni, nombre, apellidos, direccion, telefono) VALUES ('10008330H', 'Paula', 'Fernández Gil', 'C/ Mayor 8, Alicante', '610000886');
INSERT INTO Cliente (dni, nombre, apellidos, direccion, telefono) VALUES ('10016067G', 'Clara', 'Sánchez Pérez', 'Av. de Elche 82, Murcia', '610001699');
INSERT INTO Cliente (dni, nombre, apellidos, direccion, telefono) VALUES ('10024073Y', 'Javier', 'López Molina', 'Pl. de España 48, Valencia', '610002518');
INSERT INTO Cliente (dni, nombre, apellidos, direccion, telefono) VALUES ('10032353Y', 'Sara', 'Díaz Serrano', 'C/ Mayor 79, Murcia', '610003326');
INSERT INTO Cliente (dni, nombre, apellidos, direccion, telefono) VALUES ('10040129P', 'Alba', 'Gómez Navarro', 'Av. de la Libertad 55, Alicante', NULL);
INSERT INTO Cliente (dni, nombre, apellidos, direccion, telefono) VALUES ('10047856F', 'Javier', 'Martínez Ruiz', 'C/ San Vicente 33, Elche', '610004918');
INSERT INTO Cliente (dni, nombre, apellidos, direccion, telefono) VALUES ('10056333C', 'Diego', 'Romero Rubio', 'Av. de la Libertad 75, Crevillente', '610005704');

INSERT INTO Mecanico (dni, nombre, apellidos, fecha_contratacion, salario) VALUES ('10000749G', 'Javier', 'Fernández Gil', #2024-05-26#, 2305.55);
INSERT INTO Mecanico (dni, nombre, apellidos, fecha_contratacion, salario) VALUES ('10008687F', 'Pablo', 'García López', #2026-04-29#, 2378.14);
INSERT INTO Mecanico (dni, nombre, apellidos, fecha_contratacion, salario) VALUES ('10015857R', 'Clara', 'López Molina', #2025-07-21#, 3311.96);
INSERT INTO Mecanico (dni, nombre, apellidos, fecha_contratacion, salario) VALUES ('10024166F', 'Luis', 'Sánchez Pérez', #2025-07-12#, NULL);
INSERT INTO Mecanico (dni, nombre, apellidos, fecha_contratacion, salario) VALUES ('10032414K', 'Andrés', 'López Molina', #2025-03-06#, NULL);
INSERT INTO Mecanico (dni, nombre, apellidos, fecha_contratacion, salario) VALUES ('10040151F', 'Nuria', 'Martínez Ruiz', #2025-06-01#, 2014.51);
INSERT INTO Mecanico (dni, nombre, apellidos, fecha_contratacion, salario) VALUES ('10048288W', 'Javier', 'Romero Rubio', #2026-03-26#, NULL);
INSERT INTO Mecanico (dni, nombre, apellidos, fecha_contratacion, salario) VALUES ('10056414D', 'Andrés', 'Martínez Ruiz', #2026-03-17#, 2958.2);

INSERT INTO Coche (matricula, marca, modelo, color, cliente_dni) VALUES ('1000 BCD', 'Iveco', 'Corolla', 'rojo', '10024073Y');
INSERT INTO Coche (matricula, marca, modelo, color, cliente_dni) VALUES ('1037 FGH', 'Renault', 'Partner', 'rojo', '10008330H');
INSERT INTO Coche (matricula, marca, modelo, color, cliente_dni) VALUES ('1074 JKL', 'Ford', 'Transit', 'blanco', '10047856F');
INSERT INTO Coche (matricula, marca, modelo, color, cliente_dni) VALUES ('1111 MNP', 'Seat', 'Transit', 'blanco', '10056333C');
INSERT INTO Coche (matricula, marca, modelo, color, cliente_dni) VALUES ('1148 BCD', 'Toyota', 'Transit', 'rojo', '10000569P');
INSERT INTO Coche (matricula, marca, modelo, color, cliente_dni) VALUES ('1185 FGH', 'Peugeot', 'Partner', 'gris', '10056333C');
INSERT INTO Coche (matricula, marca, modelo, color, cliente_dni) VALUES ('1222 JKL', 'Iveco', 'Transit', 'gris', '10008330H');
INSERT INTO Coche (matricula, marca, modelo, color, cliente_dni) VALUES ('1259 MNP', 'Seat', 'Clio', 'rojo', '10040129P');

INSERT INTO Nuevo (unidades, Coche_matricula) VALUES (9, '1259 MNP');
INSERT INTO Nuevo (unidades, Coche_matricula) VALUES (7, '1000 BCD');
INSERT INTO Nuevo (unidades, Coche_matricula) VALUES (24, '1185 FGH');

INSERT INTO Usado (kilometros, Coche_matricula) VALUES (336, '1222 JKL');
INSERT INTO Usado (kilometros, Coche_matricula) VALUES (299, '1111 MNP');
INSERT INTO Usado (kilometros, Coche_matricula) VALUES (211, '1037 FGH');

INSERT INTO Reparacion (mecanico_dni, coche_matricula, fecha, horas) VALUES ('10000749G', '1111 MNP', #2024-10-05#, 32.9);
INSERT INTO Reparacion (mecanico_dni, coche_matricula, fecha, horas) VALUES ('10056414D', '1037 FGH', #2026-01-05#, 15.9);
INSERT INTO Reparacion (mecanico_dni, coche_matricula, fecha, horas) VALUES ('10024166F', '1000 BCD', #2024-08-27#, 17.6);
INSERT INTO Reparacion (mecanico_dni, coche_matricula, fecha, horas) VALUES ('10024166F', '1037 FGH', #2026-03-26#, 30.6);
INSERT INTO Reparacion (mecanico_dni, coche_matricula, fecha, horas) VALUES ('10015857R', '1185 FGH', #2024-10-09#, 29.5);
INSERT INTO Reparacion (mecanico_dni, coche_matricula, fecha, horas) VALUES ('10032414K', '1222 JKL', #2025-09-18#, 25.5);
INSERT INTO Reparacion (mecanico_dni, coche_matricula, fecha, horas) VALUES ('10000749G', '1185 FGH', #2024-08-10#, 37.2);
INSERT INTO Reparacion (mecanico_dni, coche_matricula, fecha, horas) VALUES ('10024166F', '1000 BCD', #2025-05-02#, 31.7);
