-- Biblioteca · mini-ejercicio 2 (Tema 2)
-- SQL del proyecto, en el dialecto de la consola de DataBasic.
-- Este archivo manda en tablas, claves, relaciones, consultas y filas: si lo cambias,
-- DataBasic lo sigue al abrir la carpeta. Las líneas que empiezan por -- son comentarios.

-- Tablas

CREATE TABLE Autor (
    codigo NUMBER(6) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    PRIMARY KEY (codigo)
);

CREATE TABLE Libro (
    isbn CHAR(13) NOT NULL,
    titulo VARCHAR(120) NOT NULL,
    anio_publicacion NUMBER(4),
    PRIMARY KEY (isbn)
);

CREATE TABLE Usuario (
    dni CHAR(9) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    telefono VARCHAR(15),
    PRIMARY KEY (dni)
);

CREATE TABLE Autoria (
    autor_codigo NUMBER(6) NOT NULL,
    libro_isbn CHAR(13) NOT NULL,
    PRIMARY KEY (autor_codigo, libro_isbn)
);

CREATE TABLE Prestamo (
    usuario_dni CHAR(9) NOT NULL,
    libro_isbn CHAR(13) NOT NULL,
    fecha_prestamo DATE NOT NULL,
    fecha_devolucion DATE CHECK (fecha_devolucion >= fecha_prestamo),
    PRIMARY KEY (usuario_dni, libro_isbn, fecha_prestamo)
);

-- Relaciones (claves ajenas)

ALTER TABLE Autoria ADD CONSTRAINT FK_Escribe_autor
    FOREIGN KEY (autor_codigo) REFERENCES Autor (codigo)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Autoria ADD CONSTRAINT FK_Escribe_libro
    FOREIGN KEY (libro_isbn) REFERENCES Libro (isbn)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Prestamo ADD CONSTRAINT FK_Prestamo_usuario
    FOREIGN KEY (usuario_dni) REFERENCES Usuario (dni)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Prestamo ADD CONSTRAINT FK_Prestamo_libro
    FOREIGN KEY (libro_isbn) REFERENCES Libro (isbn)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Índices

-- Sin índices.

-- Consultas guardadas

-- Sin consultas.

-- Filas

INSERT INTO Autor (codigo, nombre) VALUES (1, 'Marta Sánchez');
INSERT INTO Autor (codigo, nombre) VALUES (2, 'Diego Gómez');
INSERT INTO Autor (codigo, nombre) VALUES (3, 'Hugo Romero');
INSERT INTO Autor (codigo, nombre) VALUES (4, 'Luis Álvarez');
INSERT INTO Autor (codigo, nombre) VALUES (5, 'Andrés Fernández');
INSERT INTO Autor (codigo, nombre) VALUES (6, 'Alba Fernández');
INSERT INTO Autor (codigo, nombre) VALUES (7, 'Marta García');
INSERT INTO Autor (codigo, nombre) VALUES (8, 'Diego Sánchez');

INSERT INTO Libro (isbn, titulo, anio_publicacion) VALUES ('9788400000000', 'Cien años de soledad', 2018);
INSERT INTO Libro (isbn, titulo, anio_publicacion) VALUES ('9788400001371', 'La sombra del viento', 2001);
INSERT INTO Libro (isbn, titulo, anio_publicacion) VALUES ('9788400002742', 'El Quijote', 2005);
INSERT INTO Libro (isbn, titulo, anio_publicacion) VALUES ('9788400004113', 'Nada', 2023);
INSERT INTO Libro (isbn, titulo, anio_publicacion) VALUES ('9788400005484', 'Patria', 2010);
INSERT INTO Libro (isbn, titulo, anio_publicacion) VALUES ('9788400006855', 'La colmena', 2004);
INSERT INTO Libro (isbn, titulo, anio_publicacion) VALUES ('9788400008226', 'Rayuela', 2008);
INSERT INTO Libro (isbn, titulo, anio_publicacion) VALUES ('9788400009597', 'Fortunata y Jacinta', 2008);

INSERT INTO Usuario (dni, nombre, telefono) VALUES ('10000524D', 'Marta Sánchez', '610000067');
INSERT INTO Usuario (dni, nombre, telefono) VALUES ('10008046X', 'Diego Fernández', NULL);
INSERT INTO Usuario (dni, nombre, telefono) VALUES ('10016706E', 'Nuria Martínez', '610001675');
INSERT INTO Usuario (dni, nombre, telefono) VALUES ('10024626F', 'Marta Romero', '610002493');
INSERT INTO Usuario (dni, nombre, telefono) VALUES ('10031873D', 'Sara Fernández', '610003258');
INSERT INTO Usuario (dni, nombre, telefono) VALUES ('10040573S', 'Óscar Fernández', NULL);
INSERT INTO Usuario (dni, nombre, telefono) VALUES ('10048129G', 'Lucía Torres', NULL);
INSERT INTO Usuario (dni, nombre, telefono) VALUES ('10056197E', 'Diego Martínez', '610005768');

INSERT INTO Autoria (autor_codigo, libro_isbn) VALUES (6, '9788400002742');
INSERT INTO Autoria (autor_codigo, libro_isbn) VALUES (6, '9788400008226');
INSERT INTO Autoria (autor_codigo, libro_isbn) VALUES (3, '9788400001371');
INSERT INTO Autoria (autor_codigo, libro_isbn) VALUES (3, '9788400005484');
INSERT INTO Autoria (autor_codigo, libro_isbn) VALUES (7, '9788400001371');
INSERT INTO Autoria (autor_codigo, libro_isbn) VALUES (1, '9788400009597');
INSERT INTO Autoria (autor_codigo, libro_isbn) VALUES (5, '9788400005484');
INSERT INTO Autoria (autor_codigo, libro_isbn) VALUES (1, '9788400000000');

INSERT INTO Prestamo (usuario_dni, libro_isbn, fecha_prestamo, fecha_devolucion) VALUES ('10024626F', '9788400006855', #2025-01-28#, #2025-02-22#);
INSERT INTO Prestamo (usuario_dni, libro_isbn, fecha_prestamo, fecha_devolucion) VALUES ('10000524D', '9788400001371', #2025-07-12#, NULL);
INSERT INTO Prestamo (usuario_dni, libro_isbn, fecha_prestamo, fecha_devolucion) VALUES ('10040573S', '9788400008226', #2025-02-24#, #2025-02-25#);
INSERT INTO Prestamo (usuario_dni, libro_isbn, fecha_prestamo, fecha_devolucion) VALUES ('10031873D', '9788400002742', #2024-05-29#, #2024-07-22#);
INSERT INTO Prestamo (usuario_dni, libro_isbn, fecha_prestamo, fecha_devolucion) VALUES ('10024626F', '9788400008226', #2025-02-09#, #2025-04-05#);
INSERT INTO Prestamo (usuario_dni, libro_isbn, fecha_prestamo, fecha_devolucion) VALUES ('10000524D', '9788400009597', #2025-08-15#, #2025-10-08#);
INSERT INTO Prestamo (usuario_dni, libro_isbn, fecha_prestamo, fecha_devolucion) VALUES ('10040573S', '9788400008226', #2024-10-28#, #2024-12-18#);
INSERT INTO Prestamo (usuario_dni, libro_isbn, fecha_prestamo, fecha_devolucion) VALUES ('10040573S', '9788400009597', #2025-07-21#, #2025-08-04#);
