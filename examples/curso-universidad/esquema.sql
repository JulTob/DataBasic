-- Gestión universitaria · ejercicio 8 (Tema 2)
-- SQL del proyecto, en el dialecto de la consola de DataBasic.
-- Este archivo manda en tablas, claves, relaciones, consultas y filas: si lo cambias,
-- DataBasic lo sigue al abrir la carpeta. Las líneas que empiezan por -- son comentarios.

-- Tablas

CREATE TABLE Departamento (
    codigo NUMBER(3) NOT NULL,
    nombre VARCHAR(60) NOT NULL,
    director_nrp VARCHAR(16) NOT NULL,
    PRIMARY KEY (codigo),
    CONSTRAINT AK_Departamento_Dirige UNIQUE (director_nrp)
);

CREATE TABLE Profesor (
    nrp VARCHAR(16) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    area VARCHAR(60),
    categoria VARCHAR(30),
    departamento_codigo NUMBER(3) NOT NULL,
    PRIMARY KEY (nrp)
);

CREATE TABLE Asignatura (
    codigo NUMBER(6) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    creditos NUMBER(4,1) NOT NULL CHECK (creditos >= 0),
    caracter VARCHAR(12) NOT NULL CHECK (caracter IN ('basica', 'obligatoria', 'optativa')),
    curso NUMBER(1) NOT NULL CHECK (curso >= 1 AND curso <= 6),
    PRIMARY KEY (codigo)
);

CREATE TABLE Grupo (
    codigo CHAR(3) NOT NULL,
    tipo VARCHAR(9) NOT NULL CHECK (tipo IN ('teoria', 'practicas')),
    max_alumnos NUMBER(3) NOT NULL CHECK (max_alumnos >= 1),
    asignatura_codigo NUMBER(6) NOT NULL,
    PRIMARY KEY (codigo, asignatura_codigo)
);

CREATE TABLE Aula (
    codigo VARCHAR(10) NOT NULL,
    capacidad NUMBER(4) NOT NULL CHECK (capacidad >= 1),
    PRIMARY KEY (codigo)
);

CREATE TABLE Alumno (
    dni CHAR(9) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    fecha_nacimiento DATE,
    direccion VARCHAR(120),
    PRIMARY KEY (dni)
);

CREATE TABLE Imparte (
    profesor_nrp VARCHAR(16) NOT NULL,
    grupo_codigo CHAR(3) NOT NULL,
    grupo_asignatura_codigo NUMBER(6) NOT NULL,
    PRIMARY KEY (profesor_nrp, grupo_codigo, grupo_asignatura_codigo)
);

CREATE TABLE Horario (
    grupo_codigo CHAR(3) NOT NULL,
    grupo_asignatura_codigo NUMBER(6) NOT NULL,
    aula_codigo VARCHAR(10) NOT NULL,
    dia VARCHAR(9) NOT NULL CHECK (dia IN ('lunes', 'martes', 'miercoles', 'jueves', 'viernes')),
    hora CHAR(5) NOT NULL,
    PRIMARY KEY (grupo_codigo, grupo_asignatura_codigo, dia, hora),
    CONSTRAINT AK_Horario_aula_dia_hora UNIQUE (aula_codigo, dia, hora)
);

CREATE TABLE Matricula (
    alumno_dni CHAR(9) NOT NULL,
    grupo_codigo CHAR(3) NOT NULL,
    grupo_asignatura_codigo NUMBER(6) NOT NULL,
    PRIMARY KEY (alumno_dni, grupo_codigo, grupo_asignatura_codigo)
);

-- Relaciones (claves ajenas)

ALTER TABLE Profesor ADD CONSTRAINT FK_Pertenece_departamento
    FOREIGN KEY (departamento_codigo) REFERENCES Departamento (codigo)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Departamento ADD CONSTRAINT FK_Dirige_director
    FOREIGN KEY (director_nrp) REFERENCES Profesor (nrp)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Grupo ADD CONSTRAINT FK_Tiene_asignatura
    FOREIGN KEY (asignatura_codigo) REFERENCES Asignatura (codigo)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Imparte ADD CONSTRAINT FK_Imparte_profesor
    FOREIGN KEY (profesor_nrp) REFERENCES Profesor (nrp)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Imparte ADD CONSTRAINT FK_Imparte_grupo
    FOREIGN KEY (grupo_codigo, grupo_asignatura_codigo) REFERENCES Grupo (codigo, asignatura_codigo)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Horario ADD CONSTRAINT FK_Clase_grupo
    FOREIGN KEY (grupo_codigo, grupo_asignatura_codigo) REFERENCES Grupo (codigo, asignatura_codigo)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Horario ADD CONSTRAINT FK_Clase_aula
    FOREIGN KEY (aula_codigo) REFERENCES Aula (codigo)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Matricula ADD CONSTRAINT FK_Matricula_alumno
    FOREIGN KEY (alumno_dni) REFERENCES Alumno (dni)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Matricula ADD CONSTRAINT FK_Matricula_grupo
    FOREIGN KEY (grupo_codigo, grupo_asignatura_codigo) REFERENCES Grupo (codigo, asignatura_codigo)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Índices

-- Sin índices.

-- Consultas guardadas

-- Sin consultas.

-- Filas

INSERT INTO Asignatura (codigo, nombre, creditos, caracter, curso) VALUES (1, 'Bases de datos', 17.5, 'basica', 5);
INSERT INTO Asignatura (codigo, nombre, creditos, caracter, curso) VALUES (2, 'Programación', 9.6, 'obligatoria', 5);
INSERT INTO Asignatura (codigo, nombre, creditos, caracter, curso) VALUES (3, 'Redes', 2.1, 'optativa', 6);
INSERT INTO Asignatura (codigo, nombre, creditos, caracter, curso) VALUES (4, 'Estadística', 12.9, 'optativa', 3);
INSERT INTO Asignatura (codigo, nombre, creditos, caracter, curso) VALUES (5, 'Sistemas operativos', 5.6, 'basica', 1);
INSERT INTO Asignatura (codigo, nombre, creditos, caracter, curso) VALUES (6, 'Matemáticas', 8.1, 'optativa', 5);
INSERT INTO Asignatura (codigo, nombre, creditos, caracter, curso) VALUES (7, 'Física', 7.7, 'basica', 2);
INSERT INTO Asignatura (codigo, nombre, creditos, caracter, curso) VALUES (8, 'Ingeniería del software', 10.5, 'optativa', 6);

INSERT INTO Aula (codigo, capacidad) VALUES ('AUL0001', 297);
INSERT INTO Aula (codigo, capacidad) VALUES ('AUL0002', 251);
INSERT INTO Aula (codigo, capacidad) VALUES ('AUL0003', 388);
INSERT INTO Aula (codigo, capacidad) VALUES ('AUL0004', 161);
INSERT INTO Aula (codigo, capacidad) VALUES ('AUL0005', 353);
INSERT INTO Aula (codigo, capacidad) VALUES ('AUL0006', 219);
INSERT INTO Aula (codigo, capacidad) VALUES ('AUL0007', 298);
INSERT INTO Aula (codigo, capacidad) VALUES ('AUL0008', 227);

INSERT INTO Alumno (dni, nombre, fecha_nacimiento, direccion) VALUES ('10000524D', 'Marta Sánchez', #1989-02-17#, 'C/ Mayor 79, Murcia');
INSERT INTO Alumno (dni, nombre, fecha_nacimiento, direccion) VALUES ('10008062A', 'Paula Díaz', #1970-10-07#, 'Av. de la Libertad 4, Santa Pola');
INSERT INTO Alumno (dni, nombre, fecha_nacimiento, direccion) VALUES ('10016134W', 'Clara Navarro', #1973-01-18#, 'Paseo Marítimo 4, Torrevieja');
INSERT INTO Alumno (dni, nombre, fecha_nacimiento, direccion) VALUES ('10023888M', 'Luis Romero', #1990-04-21#, 'C/ del Mar 15, Santa Pola');
INSERT INTO Alumno (dni, nombre, fecha_nacimiento, direccion) VALUES ('10032178S', 'Andrés Sánchez', NULL, 'C/ San Vicente 48, Elche');
INSERT INTO Alumno (dni, nombre, fecha_nacimiento, direccion) VALUES ('10039647D', 'Nuria Moreno', #2002-05-02#, 'C/ San Vicente 4, Valencia');
INSERT INTO Alumno (dni, nombre, fecha_nacimiento, direccion) VALUES ('10048283C', 'Javier López', NULL, 'C/ del Mar 15, Murcia');
INSERT INTO Alumno (dni, nombre, fecha_nacimiento, direccion) VALUES ('10056322D', 'Paula Romero', #1993-11-03#, 'Av. de Elche 15, Crevillente');

INSERT INTO Grupo (codigo, tipo, max_alumnos, asignatura_codigo) VALUES ('001', 'practicas', 34, 6);
INSERT INTO Grupo (codigo, tipo, max_alumnos, asignatura_codigo) VALUES ('002', 'practicas', 66, 4);
INSERT INTO Grupo (codigo, tipo, max_alumnos, asignatura_codigo) VALUES ('003', 'practicas', 37, 8);
INSERT INTO Grupo (codigo, tipo, max_alumnos, asignatura_codigo) VALUES ('004', 'teoria', 82, 2);
INSERT INTO Grupo (codigo, tipo, max_alumnos, asignatura_codigo) VALUES ('005', 'practicas', 75, 8);
INSERT INTO Grupo (codigo, tipo, max_alumnos, asignatura_codigo) VALUES ('006', 'teoria', 36, 7);
INSERT INTO Grupo (codigo, tipo, max_alumnos, asignatura_codigo) VALUES ('007', 'teoria', 60, 6);
INSERT INTO Grupo (codigo, tipo, max_alumnos, asignatura_codigo) VALUES ('008', 'teoria', 47, 8);

INSERT INTO Horario (grupo_codigo, grupo_asignatura_codigo, aula_codigo, dia, hora) VALUES ('007', 6, 'AUL0002', 'miercoles', '08:00');
INSERT INTO Horario (grupo_codigo, grupo_asignatura_codigo, aula_codigo, dia, hora) VALUES ('001', 6, 'AUL0005', 'miercoles', '09:00');
INSERT INTO Horario (grupo_codigo, grupo_asignatura_codigo, aula_codigo, dia, hora) VALUES ('004', 2, 'AUL0005', 'martes', '10:00');
INSERT INTO Horario (grupo_codigo, grupo_asignatura_codigo, aula_codigo, dia, hora) VALUES ('008', 8, 'AUL0007', 'jueves', '11:00');
INSERT INTO Horario (grupo_codigo, grupo_asignatura_codigo, aula_codigo, dia, hora) VALUES ('004', 2, 'AUL0004', 'viernes', '12:00');
INSERT INTO Horario (grupo_codigo, grupo_asignatura_codigo, aula_codigo, dia, hora) VALUES ('002', 4, 'AUL0007', 'miercoles', '13:00');
INSERT INTO Horario (grupo_codigo, grupo_asignatura_codigo, aula_codigo, dia, hora) VALUES ('006', 7, 'AUL0004', 'viernes', '14:00');
INSERT INTO Horario (grupo_codigo, grupo_asignatura_codigo, aula_codigo, dia, hora) VALUES ('006', 7, 'AUL0001', 'martes', '15:00');

INSERT INTO Matricula (alumno_dni, grupo_codigo, grupo_asignatura_codigo) VALUES ('10039647D', '007', 6);
INSERT INTO Matricula (alumno_dni, grupo_codigo, grupo_asignatura_codigo) VALUES ('10016134W', '006', 7);
INSERT INTO Matricula (alumno_dni, grupo_codigo, grupo_asignatura_codigo) VALUES ('10008062A', '002', 4);
INSERT INTO Matricula (alumno_dni, grupo_codigo, grupo_asignatura_codigo) VALUES ('10056322D', '003', 8);
INSERT INTO Matricula (alumno_dni, grupo_codigo, grupo_asignatura_codigo) VALUES ('10048283C', '003', 8);
INSERT INTO Matricula (alumno_dni, grupo_codigo, grupo_asignatura_codigo) VALUES ('10008062A', '007', 6);
INSERT INTO Matricula (alumno_dni, grupo_codigo, grupo_asignatura_codigo) VALUES ('10039647D', '005', 8);
INSERT INTO Matricula (alumno_dni, grupo_codigo, grupo_asignatura_codigo) VALUES ('10023888M', '001', 6);

INSERT INTO Departamento (codigo, nombre, director_nrp) VALUES (1, 'Logística', 'nrp 6');
INSERT INTO Departamento (codigo, nombre, director_nrp) VALUES (2, 'Administración', 'nrp 4');
INSERT INTO Departamento (codigo, nombre, director_nrp) VALUES (3, 'Mantenimiento', 'nrp 7');
INSERT INTO Departamento (codigo, nombre, director_nrp) VALUES (4, 'Ventas', 'nrp 3');
INSERT INTO Departamento (codigo, nombre, director_nrp) VALUES (5, 'Recursos Humanos', 'nrp 1');
INSERT INTO Departamento (codigo, nombre, director_nrp) VALUES (6, 'Informática', 'nrp 5');
INSERT INTO Departamento (codigo, nombre, director_nrp) VALUES (7, 'Calidad', 'nrp 8');
INSERT INTO Departamento (codigo, nombre, director_nrp) VALUES (8, 'Compras', 'nrp 2');

INSERT INTO Profesor (nrp, nombre, area, categoria, departamento_codigo) VALUES ('nrp 1', 'Luis Romero', 'docencia', 'asociado', 4);
INSERT INTO Profesor (nrp, nombre, area, categoria, departamento_codigo) VALUES ('nrp 2', 'Pablo Gómez', 'investigación', 'catedrático', 4);
INSERT INTO Profesor (nrp, nombre, area, categoria, departamento_codigo) VALUES ('nrp 3', 'Hugo Álvarez', 'atención al público', 'catedrático', 7);
INSERT INTO Profesor (nrp, nombre, area, categoria, departamento_codigo) VALUES ('nrp 4', 'Javier García', 'docencia', 'asociado', 6);
INSERT INTO Profesor (nrp, nombre, area, categoria, departamento_codigo) VALUES ('nrp 5', 'Paula Romero', 'mantenimiento', 'titular', 1);
INSERT INTO Profesor (nrp, nombre, area, categoria, departamento_codigo) VALUES ('nrp 6', 'Alba Romero', 'gestión', NULL, 8);
INSERT INTO Profesor (nrp, nombre, area, categoria, departamento_codigo) VALUES ('nrp 7', 'Carlos Sánchez', 'investigación', 'asociado', 1);
INSERT INTO Profesor (nrp, nombre, area, categoria, departamento_codigo) VALUES ('nrp 8', 'Irene Martínez', 'investigación', NULL, 6);

INSERT INTO Imparte (profesor_nrp, grupo_codigo, grupo_asignatura_codigo) VALUES ('nrp 3', '008', 8);
INSERT INTO Imparte (profesor_nrp, grupo_codigo, grupo_asignatura_codigo) VALUES ('nrp 6', '006', 7);
INSERT INTO Imparte (profesor_nrp, grupo_codigo, grupo_asignatura_codigo) VALUES ('nrp 2', '007', 6);
INSERT INTO Imparte (profesor_nrp, grupo_codigo, grupo_asignatura_codigo) VALUES ('nrp 6', '007', 6);
INSERT INTO Imparte (profesor_nrp, grupo_codigo, grupo_asignatura_codigo) VALUES ('nrp 1', '008', 8);
INSERT INTO Imparte (profesor_nrp, grupo_codigo, grupo_asignatura_codigo) VALUES ('nrp 7', '008', 8);
INSERT INTO Imparte (profesor_nrp, grupo_codigo, grupo_asignatura_codigo) VALUES ('nrp 1', '002', 4);
INSERT INTO Imparte (profesor_nrp, grupo_codigo, grupo_asignatura_codigo) VALUES ('nrp 5', '006', 7);
