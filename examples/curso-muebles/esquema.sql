-- Taller de muebles · ejercicio 4 (Tema 2)
-- SQL del proyecto, en el dialecto de la consola de DataBasic.
-- Este archivo manda en tablas, claves, relaciones, consultas y filas: si lo cambias,
-- DataBasic lo sigue al abrir la carpeta. Las líneas que empiezan por -- son comentarios.

-- Tablas

CREATE TABLE Mueble (
    nombre VARCHAR(60) NOT NULL,
    precio NUMBER(8,2) NOT NULL CHECK (precio >= 0),
    PRIMARY KEY (nombre)
);

CREATE TABLE Pieza (
    codigo NUMBER(6) NOT NULL,
    descripcion VARCHAR(120),
    PRIMARY KEY (codigo)
);

CREATE TABLE Mueble_una_pieza (
    Mueble_nombre VARCHAR(60) NOT NULL,
    PRIMARY KEY (Mueble_nombre)
);

CREATE TABLE Estanteria (
    pasillo NUMBER(3) NOT NULL,
    altura NUMBER(2) NOT NULL,
    PRIMARY KEY (pasillo, altura)
);

CREATE TABLE Compone (
    mueble_nombre VARCHAR(60) NOT NULL,
    pieza_codigo NUMBER(6) NOT NULL,
    unidades NUMBER(3) NOT NULL CHECK (unidades >= 1),
    PRIMARY KEY (mueble_nombre, pieza_codigo)
);

CREATE TABLE Almacena (
    mueble_Mueble_nombre VARCHAR(60) NOT NULL,
    estanteria_pasillo NUMBER(3) NOT NULL,
    estanteria_altura NUMBER(2) NOT NULL,
    unidades NUMBER(4) NOT NULL CHECK (unidades >= 1),
    PRIMARY KEY (mueble_Mueble_nombre, estanteria_pasillo, estanteria_altura)
);

-- Relaciones (claves ajenas)

ALTER TABLE Mueble_una_pieza ADD CONSTRAINT FK_Mueble_una_pieza_Mueble
    FOREIGN KEY (Mueble_nombre) REFERENCES Mueble (nombre)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Compone ADD CONSTRAINT FK_Compone_mueble
    FOREIGN KEY (mueble_nombre) REFERENCES Mueble (nombre)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Compone ADD CONSTRAINT FK_Compone_pieza
    FOREIGN KEY (pieza_codigo) REFERENCES Pieza (codigo)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Almacena ADD CONSTRAINT FK_Almacena_mueble
    FOREIGN KEY (mueble_Mueble_nombre) REFERENCES Mueble_una_pieza (Mueble_nombre)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Almacena ADD CONSTRAINT FK_Almacena_estanteria
    FOREIGN KEY (estanteria_pasillo, estanteria_altura) REFERENCES Estanteria (pasillo, altura)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Índices

-- Sin índices.

-- Consultas guardadas

-- Sin consultas.

-- Filas

INSERT INTO Mueble (nombre, precio) VALUES ('Mesa de roble', 34.59);
INSERT INTO Mueble (nombre, precio) VALUES ('Silla nórdica', 14.51);
INSERT INTO Mueble (nombre, precio) VALUES ('Estantería', 43.69);
INSERT INTO Mueble (nombre, precio) VALUES ('Armario ropero', 18.47);
INSERT INTO Mueble (nombre, precio) VALUES ('Cómoda', 24.65);
INSERT INTO Mueble (nombre, precio) VALUES ('Mesita de noche', 45.46);
INSERT INTO Mueble (nombre, precio) VALUES ('Banco de pino', 3.3);
INSERT INTO Mueble (nombre, precio) VALUES ('Aparador', 41.74);

INSERT INTO Pieza (codigo, descripcion) VALUES (1, 'Descripción de pieza 1');
INSERT INTO Pieza (codigo, descripcion) VALUES (2, 'Descripción de pieza 2');
INSERT INTO Pieza (codigo, descripcion) VALUES (3, 'Descripción de pieza 3');
INSERT INTO Pieza (codigo, descripcion) VALUES (4, 'Descripción de pieza 4');
INSERT INTO Pieza (codigo, descripcion) VALUES (5, 'Descripción de pieza 5');
INSERT INTO Pieza (codigo, descripcion) VALUES (6, NULL);
INSERT INTO Pieza (codigo, descripcion) VALUES (7, NULL);
INSERT INTO Pieza (codigo, descripcion) VALUES (8, 'Descripción de pieza 8');

INSERT INTO Estanteria (pasillo, altura) VALUES (1, 1);
INSERT INTO Estanteria (pasillo, altura) VALUES (2, 2);
INSERT INTO Estanteria (pasillo, altura) VALUES (3, 3);
INSERT INTO Estanteria (pasillo, altura) VALUES (4, 4);
INSERT INTO Estanteria (pasillo, altura) VALUES (5, 5);
INSERT INTO Estanteria (pasillo, altura) VALUES (6, 6);
INSERT INTO Estanteria (pasillo, altura) VALUES (7, 7);
INSERT INTO Estanteria (pasillo, altura) VALUES (8, 8);

INSERT INTO Mueble_una_pieza (Mueble_nombre) VALUES ('Estantería');
INSERT INTO Mueble_una_pieza (Mueble_nombre) VALUES ('Banco de pino');
INSERT INTO Mueble_una_pieza (Mueble_nombre) VALUES ('Armario ropero');
INSERT INTO Mueble_una_pieza (Mueble_nombre) VALUES ('Cómoda');
INSERT INTO Mueble_una_pieza (Mueble_nombre) VALUES ('Mesa de roble');
INSERT INTO Mueble_una_pieza (Mueble_nombre) VALUES ('Silla nórdica');

INSERT INTO Compone (mueble_nombre, pieza_codigo, unidades) VALUES ('Aparador', 5, 15);
INSERT INTO Compone (mueble_nombre, pieza_codigo, unidades) VALUES ('Banco de pino', 3, 22);
INSERT INTO Compone (mueble_nombre, pieza_codigo, unidades) VALUES ('Armario ropero', 5, 14);
INSERT INTO Compone (mueble_nombre, pieza_codigo, unidades) VALUES ('Cómoda', 6, 7);
INSERT INTO Compone (mueble_nombre, pieza_codigo, unidades) VALUES ('Banco de pino', 6, 4);
INSERT INTO Compone (mueble_nombre, pieza_codigo, unidades) VALUES ('Cómoda', 4, 2);
INSERT INTO Compone (mueble_nombre, pieza_codigo, unidades) VALUES ('Banco de pino', 5, 5);
INSERT INTO Compone (mueble_nombre, pieza_codigo, unidades) VALUES ('Estantería', 7, 7);

INSERT INTO Almacena (mueble_Mueble_nombre, estanteria_pasillo, estanteria_altura, unidades) VALUES ('Cómoda', 2, 2, 2);
INSERT INTO Almacena (mueble_Mueble_nombre, estanteria_pasillo, estanteria_altura, unidades) VALUES ('Armario ropero', 3, 3, 5);
INSERT INTO Almacena (mueble_Mueble_nombre, estanteria_pasillo, estanteria_altura, unidades) VALUES ('Silla nórdica', 5, 5, 11);
INSERT INTO Almacena (mueble_Mueble_nombre, estanteria_pasillo, estanteria_altura, unidades) VALUES ('Estantería', 5, 5, 16);
INSERT INTO Almacena (mueble_Mueble_nombre, estanteria_pasillo, estanteria_altura, unidades) VALUES ('Silla nórdica', 1, 1, 23);
INSERT INTO Almacena (mueble_Mueble_nombre, estanteria_pasillo, estanteria_altura, unidades) VALUES ('Estantería', 2, 2, 25);
INSERT INTO Almacena (mueble_Mueble_nombre, estanteria_pasillo, estanteria_altura, unidades) VALUES ('Silla nórdica', 6, 6, 9);
INSERT INTO Almacena (mueble_Mueble_nombre, estanteria_pasillo, estanteria_altura, unidades) VALUES ('Mesa de roble', 7, 7, 11);
