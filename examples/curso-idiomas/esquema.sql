-- Escuela de idiomas · ejercicio 1 (Tema 2)
-- SQL del proyecto, en el dialecto de la consola de DataBasic.
-- Este archivo manda en tablas, claves, relaciones, consultas y filas: si lo cambias,
-- DataBasic lo sigue al abrir la carpeta. Las líneas que empiezan por -- son comentarios.

-- Tablas

CREATE TABLE Alumno (
    dni CHAR(9) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    telefono VARCHAR(15),
    PRIMARY KEY (dni)
);

CREATE TABLE Idioma (
    codigo CHAR(3) NOT NULL,
    nombre VARCHAR(30) NOT NULL,
    PRIMARY KEY (codigo),
    CONSTRAINT AK_Idioma_nombre UNIQUE (nombre)
);

CREATE TABLE Nivel (
    codigo CHAR(2) NOT NULL,
    descripcion VARCHAR(60),
    PRIMARY KEY (codigo)
);

CREATE TABLE Curso (
    codigo NUMBER(5) NOT NULL,
    idioma_codigo CHAR(3) NOT NULL,
    nivel_codigo CHAR(2) NOT NULL,
    PRIMARY KEY (codigo),
    CONSTRAINT AK_Curso_idioma_nivel UNIQUE (idioma_codigo, nivel_codigo)
);

CREATE TABLE Matricula (
    alumno_dni CHAR(9) NOT NULL,
    curso_codigo NUMBER(5) NOT NULL,
    calificacion NUMBER(4,2) CHECK (calificacion >= 0 AND calificacion <= 10),
    PRIMARY KEY (alumno_dni, curso_codigo)
);

-- Relaciones (claves ajenas)

ALTER TABLE Curso ADD CONSTRAINT FK_De_idioma_idioma
    FOREIGN KEY (idioma_codigo) REFERENCES Idioma (codigo)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Curso ADD CONSTRAINT FK_De_nivel_nivel
    FOREIGN KEY (nivel_codigo) REFERENCES Nivel (codigo)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Matricula ADD CONSTRAINT FK_Matricula_alumno
    FOREIGN KEY (alumno_dni) REFERENCES Alumno (dni)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Matricula ADD CONSTRAINT FK_Matricula_curso
    FOREIGN KEY (curso_codigo) REFERENCES Curso (codigo)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Índices

-- Sin índices.

-- Consultas guardadas

-- Sin consultas.

-- Filas

INSERT INTO Alumno (dni, nombre, telefono) VALUES ('10000569P', 'Ana Álvarez', '610000040');
INSERT INTO Alumno (dni, nombre, telefono) VALUES ('10008672S', 'Pablo Álvarez', '610000852');
INSERT INTO Alumno (dni, nombre, telefono) VALUES ('10016588L', 'Hugo Martínez', NULL);
INSERT INTO Alumno (dni, nombre, telefono) VALUES ('10023842M', 'Luis Navarro', '610002455');
INSERT INTO Alumno (dni, nombre, telefono) VALUES ('10031873D', 'Sara Gómez', '610003335');
INSERT INTO Alumno (dni, nombre, telefono) VALUES ('10040184V', 'Nuria Romero', '610004125');
INSERT INTO Alumno (dni, nombre, telefono) VALUES ('10047946M', 'Lucía López', '610004932');
INSERT INTO Alumno (dni, nombre, telefono) VALUES ('10055651M', 'Irene Álvarez', '610005734');

INSERT INTO Idioma (codigo, nombre) VALUES ('001', 'Inglés');
INSERT INTO Idioma (codigo, nombre) VALUES ('002', 'Francés');
INSERT INTO Idioma (codigo, nombre) VALUES ('003', 'Alemán');
INSERT INTO Idioma (codigo, nombre) VALUES ('004', 'Italiano');
INSERT INTO Idioma (codigo, nombre) VALUES ('005', 'Chino');
INSERT INTO Idioma (codigo, nombre) VALUES ('006', 'Portugués');
INSERT INTO Idioma (codigo, nombre) VALUES ('007', 'Árabe');
INSERT INTO Idioma (codigo, nombre) VALUES ('008', 'Japonés');

INSERT INTO Nivel (codigo, descripcion) VALUES ('01', 'Descripción de nivel 1');
INSERT INTO Nivel (codigo, descripcion) VALUES ('02', NULL);
INSERT INTO Nivel (codigo, descripcion) VALUES ('03', 'Descripción de nivel 3');
INSERT INTO Nivel (codigo, descripcion) VALUES ('04', 'Descripción de nivel 4');
INSERT INTO Nivel (codigo, descripcion) VALUES ('05', 'Descripción de nivel 5');
INSERT INTO Nivel (codigo, descripcion) VALUES ('06', 'Descripción de nivel 6');
INSERT INTO Nivel (codigo, descripcion) VALUES ('07', 'Descripción de nivel 7');
INSERT INTO Nivel (codigo, descripcion) VALUES ('08', 'Descripción de nivel 8');

INSERT INTO Curso (codigo, idioma_codigo, nivel_codigo) VALUES (1, '003', '07');
INSERT INTO Curso (codigo, idioma_codigo, nivel_codigo) VALUES (2, '002', '05');
INSERT INTO Curso (codigo, idioma_codigo, nivel_codigo) VALUES (3, '002', '01');
INSERT INTO Curso (codigo, idioma_codigo, nivel_codigo) VALUES (4, '003', '03');
INSERT INTO Curso (codigo, idioma_codigo, nivel_codigo) VALUES (5, '002', '08');
INSERT INTO Curso (codigo, idioma_codigo, nivel_codigo) VALUES (6, '005', '03');
INSERT INTO Curso (codigo, idioma_codigo, nivel_codigo) VALUES (7, '001', '05');
INSERT INTO Curso (codigo, idioma_codigo, nivel_codigo) VALUES (8, '005', '08');

INSERT INTO Matricula (alumno_dni, curso_codigo, calificacion) VALUES ('10000569P', 7, 1.42);
INSERT INTO Matricula (alumno_dni, curso_codigo, calificacion) VALUES ('10047946M', 8, 2.73);
INSERT INTO Matricula (alumno_dni, curso_codigo, calificacion) VALUES ('10040184V', 7, 1.62);
INSERT INTO Matricula (alumno_dni, curso_codigo, calificacion) VALUES ('10016588L', 5, 1.81);
INSERT INTO Matricula (alumno_dni, curso_codigo, calificacion) VALUES ('10000569P', 8, 5.33);
INSERT INTO Matricula (alumno_dni, curso_codigo, calificacion) VALUES ('10000569P', 1, 6.3);
INSERT INTO Matricula (alumno_dni, curso_codigo, calificacion) VALUES ('10023842M', 8, 0.54);
INSERT INTO Matricula (alumno_dni, curso_codigo, calificacion) VALUES ('10008672S', 5, NULL);
