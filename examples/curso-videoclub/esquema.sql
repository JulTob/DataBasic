-- Videoclub · ejercicio 3 (Tema 2)
-- SQL del proyecto, en el dialecto de la consola de DataBasic.
-- Este archivo manda en tablas, claves, relaciones, consultas y filas: si lo cambias,
-- DataBasic lo sigue al abrir la carpeta. Las líneas que empiezan por -- son comentarios.

-- Tablas

CREATE TABLE Pelicula (
    titulo VARCHAR(120) NOT NULL,
    anio_estreno NUMBER(4) NOT NULL,
    tema VARCHAR(40),
    PRIMARY KEY (titulo, anio_estreno)
);

CREATE TABLE Actores (
    Pelicula_titulo VARCHAR(120) NOT NULL,
    Pelicula_anio_estreno NUMBER(4) NOT NULL,
    actor_principal VARCHAR(80) NOT NULL,
    PRIMARY KEY (Pelicula_titulo, Pelicula_anio_estreno, actor_principal)
);

CREATE TABLE Copia (
    numero_copia NUMBER(3) NOT NULL,
    formato CHAR(3) NOT NULL CHECK (formato IN ('DVD', 'BR')),
    pelicula_titulo VARCHAR(120) NOT NULL,
    pelicula_anio_estreno NUMBER(4) NOT NULL,
    PRIMARY KEY (numero_copia, pelicula_titulo, pelicula_anio_estreno)
);

CREATE TABLE Cliente (
    dni CHAR(9) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    direccion VARCHAR(120),
    telefono VARCHAR(15),
    PRIMARY KEY (dni)
);

CREATE TABLE Alquiler (
    cliente_dni CHAR(9) NOT NULL,
    copia_numero_copia NUMBER(3) NOT NULL,
    copia_pelicula_titulo VARCHAR(120) NOT NULL,
    copia_pelicula_anio_estreno NUMBER(4) NOT NULL,
    fecha DATE NOT NULL,
    PRIMARY KEY (copia_numero_copia, copia_pelicula_titulo, copia_pelicula_anio_estreno, fecha)
);

-- Relaciones (claves ajenas)

ALTER TABLE Actores ADD CONSTRAINT FK_Actores_Pelicula
    FOREIGN KEY (Pelicula_titulo, Pelicula_anio_estreno) REFERENCES Pelicula (titulo, anio_estreno)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Copia ADD CONSTRAINT FK_Tiene_pelicula
    FOREIGN KEY (pelicula_titulo, pelicula_anio_estreno) REFERENCES Pelicula (titulo, anio_estreno)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Alquiler ADD CONSTRAINT FK_Alquila_cliente
    FOREIGN KEY (cliente_dni) REFERENCES Cliente (dni)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Alquiler ADD CONSTRAINT FK_Alquila_copia
    FOREIGN KEY (copia_numero_copia, copia_pelicula_titulo, copia_pelicula_anio_estreno) REFERENCES Copia (numero_copia, pelicula_titulo, pelicula_anio_estreno)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Índices

-- Sin índices.

-- Consultas guardadas

-- Sin consultas.

-- Filas

INSERT INTO Pelicula (titulo, anio_estreno, tema) VALUES ('El sur', 2018, 'comedia');
INSERT INTO Pelicula (titulo, anio_estreno, tema) VALUES ('Volver', 2019, 'comedia');
INSERT INTO Pelicula (titulo, anio_estreno, tema) VALUES ('Mar adentro', 2020, 'ciencia ficción');
INSERT INTO Pelicula (titulo, anio_estreno, tema) VALUES ('La lengua de las mariposas', 2021, NULL);
INSERT INTO Pelicula (titulo, anio_estreno, tema) VALUES ('Los otros', 2022, 'animación');
INSERT INTO Pelicula (titulo, anio_estreno, tema) VALUES ('Ocho apellidos vascos', 2023, 'ciencia ficción');
INSERT INTO Pelicula (titulo, anio_estreno, tema) VALUES ('El orfanato', 2024, 'drama');
INSERT INTO Pelicula (titulo, anio_estreno, tema) VALUES ('Celda 211', 2025, NULL);

INSERT INTO Cliente (dni, nombre, direccion, telefono) VALUES ('10000085F', 'Ana Navarro', 'Av. de la Libertad 18, Alicante', '610000071');
INSERT INTO Cliente (dni, nombre, direccion, telefono) VALUES ('10008829B', 'Diego López', 'C/ del Mar 64, Orihuela', '610000855');
INSERT INTO Cliente (dni, nombre, direccion, telefono) VALUES ('10016362T', 'Nuria Sánchez', 'Av. de Elche 12, Murcia', '610001626');
INSERT INTO Cliente (dni, nombre, direccion, telefono) VALUES ('10024625Y', 'Javier Martínez', 'C/ San Vicente 79, Santa Pola', '610002455');
INSERT INTO Cliente (dni, nombre, direccion, telefono) VALUES ('10032276K', 'Sara García', 'C/ del Mar 14, Crevillente', '610003279');
INSERT INTO Cliente (dni, nombre, direccion, telefono) VALUES ('10039659K', 'Óscar Díaz', 'C/ Mayor 69, Alicante', '610004138');
INSERT INTO Cliente (dni, nombre, direccion, telefono) VALUES ('10048432P', 'Lucía Gómez', 'C/ Reina Victoria 31, Alicante', '610004916');
INSERT INTO Cliente (dni, nombre, direccion, telefono) VALUES ('10056201A', 'Diego García', 'C/ San Vicente 48, Elche', NULL);

INSERT INTO Actores (Pelicula_titulo, Pelicula_anio_estreno, actor_principal) VALUES ('La lengua de las mariposas', 2021, 'actor_principal 1');
INSERT INTO Actores (Pelicula_titulo, Pelicula_anio_estreno, actor_principal) VALUES ('Ocho apellidos vascos', 2023, 'actor_principal 2');
INSERT INTO Actores (Pelicula_titulo, Pelicula_anio_estreno, actor_principal) VALUES ('La lengua de las mariposas', 2021, 'actor_principal 3');
INSERT INTO Actores (Pelicula_titulo, Pelicula_anio_estreno, actor_principal) VALUES ('Celda 211', 2025, 'actor_principal 4');
INSERT INTO Actores (Pelicula_titulo, Pelicula_anio_estreno, actor_principal) VALUES ('La lengua de las mariposas', 2021, 'actor_principal 5');
INSERT INTO Actores (Pelicula_titulo, Pelicula_anio_estreno, actor_principal) VALUES ('El sur', 2018, 'actor_principal 6');
INSERT INTO Actores (Pelicula_titulo, Pelicula_anio_estreno, actor_principal) VALUES ('Volver', 2019, 'actor_principal 7');
INSERT INTO Actores (Pelicula_titulo, Pelicula_anio_estreno, actor_principal) VALUES ('Los otros', 2022, 'actor_principal 8');

INSERT INTO Copia (numero_copia, formato, pelicula_titulo, pelicula_anio_estreno) VALUES (1, 'BR', 'El sur', 2018);
INSERT INTO Copia (numero_copia, formato, pelicula_titulo, pelicula_anio_estreno) VALUES (2, 'DVD', 'El orfanato', 2024);
INSERT INTO Copia (numero_copia, formato, pelicula_titulo, pelicula_anio_estreno) VALUES (3, 'DVD', 'La lengua de las mariposas', 2021);
INSERT INTO Copia (numero_copia, formato, pelicula_titulo, pelicula_anio_estreno) VALUES (4, 'DVD', 'Los otros', 2022);
INSERT INTO Copia (numero_copia, formato, pelicula_titulo, pelicula_anio_estreno) VALUES (5, 'BR', 'Volver', 2019);
INSERT INTO Copia (numero_copia, formato, pelicula_titulo, pelicula_anio_estreno) VALUES (6, 'DVD', 'Celda 211', 2025);
INSERT INTO Copia (numero_copia, formato, pelicula_titulo, pelicula_anio_estreno) VALUES (7, 'DVD', 'El orfanato', 2024);
INSERT INTO Copia (numero_copia, formato, pelicula_titulo, pelicula_anio_estreno) VALUES (8, 'BR', 'El orfanato', 2024);

INSERT INTO Alquiler (cliente_dni, copia_numero_copia, copia_pelicula_titulo, copia_pelicula_anio_estreno, fecha) VALUES ('10000085F', 8, 'El orfanato', 2024, #2025-08-15#);
INSERT INTO Alquiler (cliente_dni, copia_numero_copia, copia_pelicula_titulo, copia_pelicula_anio_estreno, fecha) VALUES ('10008829B', 8, 'El orfanato', 2024, #2025-10-05#);
INSERT INTO Alquiler (cliente_dni, copia_numero_copia, copia_pelicula_titulo, copia_pelicula_anio_estreno, fecha) VALUES ('10048432P', 3, 'La lengua de las mariposas', 2021, #2025-01-12#);
INSERT INTO Alquiler (cliente_dni, copia_numero_copia, copia_pelicula_titulo, copia_pelicula_anio_estreno, fecha) VALUES ('10048432P', 6, 'Celda 211', 2025, #2026-03-16#);
INSERT INTO Alquiler (cliente_dni, copia_numero_copia, copia_pelicula_titulo, copia_pelicula_anio_estreno, fecha) VALUES ('10039659K', 3, 'La lengua de las mariposas', 2021, #2024-07-24#);
INSERT INTO Alquiler (cliente_dni, copia_numero_copia, copia_pelicula_titulo, copia_pelicula_anio_estreno, fecha) VALUES ('10016362T', 7, 'El orfanato', 2024, #2026-06-03#);
INSERT INTO Alquiler (cliente_dni, copia_numero_copia, copia_pelicula_titulo, copia_pelicula_anio_estreno, fecha) VALUES ('10039659K', 6, 'Celda 211', 2025, #2026-02-21#);
INSERT INTO Alquiler (cliente_dni, copia_numero_copia, copia_pelicula_titulo, copia_pelicula_anio_estreno, fecha) VALUES ('10016362T', 3, 'La lengua de las mariposas', 2021, #2025-10-11#);
