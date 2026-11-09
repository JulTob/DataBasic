-- Club de observación · multivaluados por decidir
-- SQL del proyecto, en el dialecto de la consola de DataBasic.
-- Este archivo manda en tablas, claves, relaciones, consultas y filas: si lo cambias,
-- DataBasic lo sigue al abrir la carpeta. Las líneas que empiezan por -- son comentarios.

-- Tablas

CREATE TABLE Persona (
    codigoPersona NUMBER NOT NULL,
    nombre VARCHAR(60) NOT NULL,
    PRIMARY KEY (codigoPersona)
);

CREATE TABLE Instrumento (
    codigoInstrumento NUMBER NOT NULL,
    serie CHAR(12) NOT NULL,
    fechaAlta DATE NOT NULL,
    valor NUMBER(8,2) NOT NULL DEFAULT 0 CHECK (valor >= 0),
    sede CHAR(4) NOT NULL,
    PRIMARY KEY (codigoInstrumento, sede),
    CONSTRAINT AK_Instrumento_serie UNIQUE (serie)
);

CREATE TABLE Sesion (
    codigoSesion NUMBER NOT NULL,
    fecha DATE NOT NULL,
    coordinadora_codigoPersona NUMBER NOT NULL,
    PRIMARY KEY (codigoSesion)
);

-- Relaciones (claves ajenas)

ALTER TABLE Sesion ADD CONSTRAINT FK_Coordina_coordinadora
    FOREIGN KEY (coordinadora_codigoPersona) REFERENCES Persona (codigoPersona)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Índices

-- Sin índices.

-- Consultas guardadas

-- Sin consultas.

-- Filas

INSERT INTO Persona (codigoPersona, nombre) VALUES (1, 'Marta Sánchez');
INSERT INTO Persona (codigoPersona, nombre) VALUES (2, 'Diego Gómez');
INSERT INTO Persona (codigoPersona, nombre) VALUES (3, 'Hugo Romero');
INSERT INTO Persona (codigoPersona, nombre) VALUES (4, 'Luis Álvarez');
INSERT INTO Persona (codigoPersona, nombre) VALUES (5, 'Andrés Fernández');
INSERT INTO Persona (codigoPersona, nombre) VALUES (6, 'Alba Fernández');
INSERT INTO Persona (codigoPersona, nombre) VALUES (7, 'Marta García');
INSERT INTO Persona (codigoPersona, nombre) VALUES (8, 'Diego Sánchez');

INSERT INTO Instrumento (codigoInstrumento, serie, fechaAlta, valor, sede) VALUES (1, 'INS0001', #2026-04-08#, 1523.14, 'Alic');
INSERT INTO Instrumento (codigoInstrumento, serie, fechaAlta, valor, sede) VALUES (2, 'INS0002', #2024-06-27#, 465.22, 'Sant');
INSERT INTO Instrumento (codigoInstrumento, serie, fechaAlta, valor, sede) VALUES (3, 'INS0003', #2025-10-06#, 1823.09, 'Murc');
INSERT INTO Instrumento (codigoInstrumento, serie, fechaAlta, valor, sede) VALUES (4, 'INS0004', #2025-03-24#, 1552.89, 'Sant');
INSERT INTO Instrumento (codigoInstrumento, serie, fechaAlta, valor, sede) VALUES (5, 'INS0005', #2025-09-24#, 875.41, 'Murc');
INSERT INTO Instrumento (codigoInstrumento, serie, fechaAlta, valor, sede) VALUES (6, 'INS0006', #2025-02-07#, 1058.89, 'Vale');
INSERT INTO Instrumento (codigoInstrumento, serie, fechaAlta, valor, sede) VALUES (7, 'INS0007', #2024-07-15#, 1706.09, 'Vale');
INSERT INTO Instrumento (codigoInstrumento, serie, fechaAlta, valor, sede) VALUES (8, 'INS0008', #2024-04-25#, 1156.37, 'Orih');

INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona) VALUES (1, #2026-02-21#, 1);
INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona) VALUES (2, #2024-05-09#, 5);
INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona) VALUES (3, #2025-04-26#, 7);
INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona) VALUES (4, #2024-10-09#, 7);
INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona) VALUES (5, #2024-07-25#, 7);
INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona) VALUES (6, #2024-06-26#, 5);
INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona) VALUES (7, #2024-11-04#, 1);
INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona) VALUES (8, #2024-05-13#, 3);
