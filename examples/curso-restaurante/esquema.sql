-- Restaurante · ejercicio 4 (guion ERE)
-- SQL del proyecto, en el dialecto de la consola de DataBasic.
-- Este archivo manda en tablas, claves, relaciones, consultas y filas: si lo cambias,
-- DataBasic lo sigue al abrir la carpeta. Las líneas que empiezan por -- son comentarios.

-- Tablas

CREATE TABLE Empleado (
    dni CHAR(9) NOT NULL,
    num_ss CHAR(12) NOT NULL,
    nombre VARCHAR(40) NOT NULL,
    apellidos VARCHAR(80) NOT NULL,
    PRIMARY KEY (dni),
    CONSTRAINT AK_Empleado_num_ss UNIQUE (num_ss)
);

CREATE TABLE Telefonos_empleado (
    Empleado_dni CHAR(9) NOT NULL,
    telefono VARCHAR(15) NOT NULL,
    PRIMARY KEY (Empleado_dni, telefono)
);

CREATE TABLE Cocinero (
    fecha_alta DATE NOT NULL,
    Empleado_dni CHAR(9) NOT NULL,
    PRIMARY KEY (Empleado_dni)
);

CREATE TABLE Pinche (
    fecha_nacimiento DATE NOT NULL,
    Empleado_dni CHAR(9) NOT NULL,
    cocinero_Empleado_dni CHAR(9) NOT NULL,
    PRIMARY KEY (Empleado_dni),
    CONSTRAINT AK_Pinche_Asignado UNIQUE (cocinero_Empleado_dni)
);

CREATE TABLE Plato (
    nombre VARCHAR(60) NOT NULL,
    precio NUMBER(6,2) NOT NULL CHECK (precio >= 0),
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrante', 'primero', 'segundo', 'postre')),
    PRIMARY KEY (nombre)
);

CREATE TABLE Ingrediente (
    nombre VARCHAR(40) NOT NULL,
    precio_kg NUMBER(6,2) NOT NULL CHECK (precio_kg >= 0),
    estante_letra CHAR(1) NOT NULL,
    estante_almacen_numero NUMBER(3) NOT NULL,
    cantidad NUMBER(7,2) NOT NULL CHECK (cantidad >= 0),
    PRIMARY KEY (nombre)
);

CREATE TABLE Almacen (
    numero NUMBER(3) NOT NULL,
    nombre VARCHAR(40) NOT NULL,
    descripcion VARCHAR(200),
    PRIMARY KEY (numero)
);

CREATE TABLE Estante (
    letra CHAR(1) NOT NULL CHECK (letra IN ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z')),
    tamano_cm NUMBER(4) NOT NULL CHECK (tamano_cm >= 1),
    almacen_numero NUMBER(3) NOT NULL,
    PRIMARY KEY (letra, almacen_numero)
);

CREATE TABLE Consumo (
    fecha DATE NOT NULL,
    turno VARCHAR(6) NOT NULL CHECK (turno IN ('comida', 'cena')),
    raciones NUMBER(4) NOT NULL CHECK (raciones >= 0),
    plato_nombre VARCHAR(60) NOT NULL,
    PRIMARY KEY (fecha, turno, plato_nombre)
);

CREATE TABLE Compone (
    plato_nombre VARCHAR(60) NOT NULL,
    ingrediente_nombre VARCHAR(40) NOT NULL,
    cantidad NUMBER(6,3) NOT NULL CHECK (cantidad >= 0),
    PRIMARY KEY (plato_nombre, ingrediente_nombre)
);

CREATE TABLE Prepara (
    cocinero_Empleado_dni CHAR(9) NOT NULL,
    plato_nombre VARCHAR(60) NOT NULL,
    PRIMARY KEY (cocinero_Empleado_dni, plato_nombre)
);

-- Relaciones (claves ajenas)

ALTER TABLE Telefonos_empleado ADD CONSTRAINT FK_Telefonos_empleado_Empleado
    FOREIGN KEY (Empleado_dni) REFERENCES Empleado (dni)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Cocinero ADD CONSTRAINT FK_Cocinero_Empleado
    FOREIGN KEY (Empleado_dni) REFERENCES Empleado (dni)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Pinche ADD CONSTRAINT FK_Pinche_Empleado
    FOREIGN KEY (Empleado_dni) REFERENCES Empleado (dni)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Estante ADD CONSTRAINT FK_Contiene_almacen
    FOREIGN KEY (almacen_numero) REFERENCES Almacen (numero)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Ingrediente ADD CONSTRAINT FK_Ubicado_estante
    FOREIGN KEY (estante_letra, estante_almacen_numero) REFERENCES Estante (letra, almacen_numero)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Compone ADD CONSTRAINT FK_Compone_plato
    FOREIGN KEY (plato_nombre) REFERENCES Plato (nombre)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Compone ADD CONSTRAINT FK_Compone_ingrediente
    FOREIGN KEY (ingrediente_nombre) REFERENCES Ingrediente (nombre)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Prepara ADD CONSTRAINT FK_Prepara_cocinero
    FOREIGN KEY (cocinero_Empleado_dni) REFERENCES Cocinero (Empleado_dni)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Prepara ADD CONSTRAINT FK_Prepara_plato
    FOREIGN KEY (plato_nombre) REFERENCES Plato (nombre)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Pinche ADD CONSTRAINT FK_Asignado_cocinero
    FOREIGN KEY (cocinero_Empleado_dni) REFERENCES Cocinero (Empleado_dni)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Consumo ADD CONSTRAINT FK_Registra_plato
    FOREIGN KEY (plato_nombre) REFERENCES Plato (nombre)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Índices

-- Sin índices.

-- Consultas guardadas

-- Sin consultas.

-- Filas

INSERT INTO Empleado (dni, num_ss, nombre, apellidos) VALUES ('10000569P', '280000000228', 'Marta', 'Gómez Navarro');
INSERT INTO Empleado (dni, num_ss, nombre, apellidos) VALUES ('10008319F', '280000105482', 'Pablo', 'Álvarez Castro');
INSERT INTO Empleado (dni, num_ss, nombre, apellidos) VALUES ('10016797K', '280000209869', 'Óscar', 'Fernández Gil');
INSERT INTO Empleado (dni, num_ss, nombre, apellidos) VALUES ('10023913F', '280000314263', 'Luis', 'Sánchez Pérez');
INSERT INTO Empleado (dni, num_ss, nombre, apellidos) VALUES ('10032595H', '280000419675', 'Sara', 'Sánchez Pérez');
INSERT INTO Empleado (dni, num_ss, nombre, apellidos) VALUES ('10039819C', '280000523973', 'Óscar', 'Torres Marín');
INSERT INTO Empleado (dni, num_ss, nombre, apellidos) VALUES ('10048103R', '280000628871', 'Carlos', 'Gómez Navarro');
INSERT INTO Empleado (dni, num_ss, nombre, apellidos) VALUES ('10056135Y', '280000733535', 'Andrés', 'López Molina');

INSERT INTO Plato (nombre, precio, tipo) VALUES ('Paella valenciana', 31.96, 'segundo');
INSERT INTO Plato (nombre, precio, tipo) VALUES ('Gazpacho', 13.88, 'postre');
INSERT INTO Plato (nombre, precio, tipo) VALUES ('Arroz a banda', 41, 'entrante');
INSERT INTO Plato (nombre, precio, tipo) VALUES ('Tortilla de patatas', 34.86, 'primero');
INSERT INTO Plato (nombre, precio, tipo) VALUES ('Flan casero', 3.86, 'postre');
INSERT INTO Plato (nombre, precio, tipo) VALUES ('Ensalada mixta', 34.15, 'entrante');
INSERT INTO Plato (nombre, precio, tipo) VALUES ('Merluza a la plancha', 49.71, 'segundo');
INSERT INTO Plato (nombre, precio, tipo) VALUES ('Crema catalana', 52.33, 'primero');

INSERT INTO Almacen (numero, nombre, descripcion) VALUES (1, 'Cámara frigorífica', 'Descripción de almacen 1');
INSERT INTO Almacen (numero, nombre, descripcion) VALUES (2, 'Despensa', 'Descripción de almacen 2');
INSERT INTO Almacen (numero, nombre, descripcion) VALUES (3, 'Bodega', 'Descripción de almacen 3');
INSERT INTO Almacen (numero, nombre, descripcion) VALUES (4, 'Congelador', 'Descripción de almacen 4');
INSERT INTO Almacen (numero, nombre, descripcion) VALUES (5, 'Almacén seco', NULL);
INSERT INTO Almacen (numero, nombre, descripcion) VALUES (6, 'Cámara frigorífica 2', 'Descripción de almacen 6');
INSERT INTO Almacen (numero, nombre, descripcion) VALUES (7, 'Despensa 2', 'Descripción de almacen 7');
INSERT INTO Almacen (numero, nombre, descripcion) VALUES (8, 'Bodega 2', 'Descripción de almacen 8');

INSERT INTO Telefonos_empleado (Empleado_dni, telefono) VALUES ('10056135Y', '610000054');
INSERT INTO Telefonos_empleado (Empleado_dni, telefono) VALUES ('10016797K', '610000817');
INSERT INTO Telefonos_empleado (Empleado_dni, telefono) VALUES ('10032595H', '610001674');
INSERT INTO Telefonos_empleado (Empleado_dni, telefono) VALUES ('10056135Y', '610002436');
INSERT INTO Telefonos_empleado (Empleado_dni, telefono) VALUES ('10048103R', '610003257');
INSERT INTO Telefonos_empleado (Empleado_dni, telefono) VALUES ('10008319F', '610004138');
INSERT INTO Telefonos_empleado (Empleado_dni, telefono) VALUES ('10056135Y', '610004934');
INSERT INTO Telefonos_empleado (Empleado_dni, telefono) VALUES ('10016797K', '610005751');

INSERT INTO Cocinero (fecha_alta, Empleado_dni) VALUES (#2024-03-06#, '10032595H');
INSERT INTO Cocinero (fecha_alta, Empleado_dni) VALUES (#2026-04-29#, '10023913F');
INSERT INTO Cocinero (fecha_alta, Empleado_dni) VALUES (#2025-06-14#, '10008319F');

INSERT INTO Estante (letra, tamano_cm, almacen_numero) VALUES ('A', 6, 5);
INSERT INTO Estante (letra, tamano_cm, almacen_numero) VALUES ('Q', 44, 4);
INSERT INTO Estante (letra, tamano_cm, almacen_numero) VALUES ('K', 6, 8);
INSERT INTO Estante (letra, tamano_cm, almacen_numero) VALUES ('Q', 4, 2);
INSERT INTO Estante (letra, tamano_cm, almacen_numero) VALUES ('U', 47, 6);
INSERT INTO Estante (letra, tamano_cm, almacen_numero) VALUES ('A', 56, 4);
INSERT INTO Estante (letra, tamano_cm, almacen_numero) VALUES ('E', 58, 3);
INSERT INTO Estante (letra, tamano_cm, almacen_numero) VALUES ('J', 78, 8);

INSERT INTO Consumo (fecha, turno, raciones, plato_nombre) VALUES (#2025-11-11#, 'cena', 3, 'Tortilla de patatas');
INSERT INTO Consumo (fecha, turno, raciones, plato_nombre) VALUES (#2025-08-15#, 'comida', 27, 'Crema catalana');
INSERT INTO Consumo (fecha, turno, raciones, plato_nombre) VALUES (#2025-11-28#, 'comida', 13, 'Ensalada mixta');
INSERT INTO Consumo (fecha, turno, raciones, plato_nombre) VALUES (#2025-08-12#, 'cena', 19, 'Merluza a la plancha');
INSERT INTO Consumo (fecha, turno, raciones, plato_nombre) VALUES (#2024-07-24#, 'comida', 25, 'Arroz a banda');
INSERT INTO Consumo (fecha, turno, raciones, plato_nombre) VALUES (#2025-09-04#, 'cena', 27, 'Crema catalana');
INSERT INTO Consumo (fecha, turno, raciones, plato_nombre) VALUES (#2024-11-18#, 'cena', 5, 'Arroz a banda');
INSERT INTO Consumo (fecha, turno, raciones, plato_nombre) VALUES (#2026-04-28#, 'comida', 14, 'Flan casero');

INSERT INTO Pinche (fecha_nacimiento, Empleado_dni, cocinero_Empleado_dni) VALUES (#1962-06-02#, '10039819C', '10008319F');
INSERT INTO Pinche (fecha_nacimiento, Empleado_dni, cocinero_Empleado_dni) VALUES (#1975-06-18#, '10056135Y', '10023913F');
INSERT INTO Pinche (fecha_nacimiento, Empleado_dni, cocinero_Empleado_dni) VALUES (#1999-10-19#, '10000569P', '10032595H');

INSERT INTO Ingrediente (nombre, precio_kg, estante_letra, estante_almacen_numero, cantidad) VALUES ('Arroz', 28.11, 'Q', 2, 29.64);
INSERT INTO Ingrediente (nombre, precio_kg, estante_letra, estante_almacen_numero, cantidad) VALUES ('Tomate', 52.48, 'Q', 4, 14.05);
INSERT INTO Ingrediente (nombre, precio_kg, estante_letra, estante_almacen_numero, cantidad) VALUES ('Aceite de oliva', 25.33, 'A', 4, 29.08);
INSERT INTO Ingrediente (nombre, precio_kg, estante_letra, estante_almacen_numero, cantidad) VALUES ('Ajo', 5.88, 'A', 4, 9.82);
INSERT INTO Ingrediente (nombre, precio_kg, estante_letra, estante_almacen_numero, cantidad) VALUES ('Cebolla', 45.5, 'A', 4, 8.39);
INSERT INTO Ingrediente (nombre, precio_kg, estante_letra, estante_almacen_numero, cantidad) VALUES ('Huevo', 15.01, 'A', 4, 7.72);
INSERT INTO Ingrediente (nombre, precio_kg, estante_letra, estante_almacen_numero, cantidad) VALUES ('Patata', 18.37, 'J', 8, 24.06);
INSERT INTO Ingrediente (nombre, precio_kg, estante_letra, estante_almacen_numero, cantidad) VALUES ('Merluza', 13.28, 'K', 8, 23.99);

INSERT INTO Prepara (cocinero_Empleado_dni, plato_nombre) VALUES ('10008319F', 'Flan casero');
INSERT INTO Prepara (cocinero_Empleado_dni, plato_nombre) VALUES ('10023913F', 'Paella valenciana');
INSERT INTO Prepara (cocinero_Empleado_dni, plato_nombre) VALUES ('10023913F', 'Arroz a banda');
INSERT INTO Prepara (cocinero_Empleado_dni, plato_nombre) VALUES ('10008319F', 'Crema catalana');
INSERT INTO Prepara (cocinero_Empleado_dni, plato_nombre) VALUES ('10032595H', 'Merluza a la plancha');
INSERT INTO Prepara (cocinero_Empleado_dni, plato_nombre) VALUES ('10023913F', 'Tortilla de patatas');
INSERT INTO Prepara (cocinero_Empleado_dni, plato_nombre) VALUES ('10032595H', 'Arroz a banda');
INSERT INTO Prepara (cocinero_Empleado_dni, plato_nombre) VALUES ('10032595H', 'Crema catalana');

INSERT INTO Compone (plato_nombre, ingrediente_nombre, cantidad) VALUES ('Merluza a la plancha', 'Aceite de oliva', 22.089);
INSERT INTO Compone (plato_nombre, ingrediente_nombre, cantidad) VALUES ('Arroz a banda', 'Huevo', 16.06);
INSERT INTO Compone (plato_nombre, ingrediente_nombre, cantidad) VALUES ('Merluza a la plancha', 'Huevo', 19.212);
INSERT INTO Compone (plato_nombre, ingrediente_nombre, cantidad) VALUES ('Paella valenciana', 'Huevo', 8.165);
INSERT INTO Compone (plato_nombre, ingrediente_nombre, cantidad) VALUES ('Crema catalana', 'Ajo', 1.971);
INSERT INTO Compone (plato_nombre, ingrediente_nombre, cantidad) VALUES ('Flan casero', 'Patata', 29.308);
INSERT INTO Compone (plato_nombre, ingrediente_nombre, cantidad) VALUES ('Crema catalana', 'Aceite de oliva', 3.571);
INSERT INTO Compone (plato_nombre, ingrediente_nombre, cantidad) VALUES ('Crema catalana', 'Patata', 23.658);
