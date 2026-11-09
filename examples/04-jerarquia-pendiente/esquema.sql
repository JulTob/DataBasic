-- Club de observación · jerarquía con claves locales por resolver
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
    PRIMARY KEY (codigoInstrumento),
    CONSTRAINT AK_Instrumento_serie UNIQUE (serie)
);

CREATE TABLE Sesion (
    codigoSesion NUMBER NOT NULL,
    fecha DATE NOT NULL,
    coordinadora_codigoPersona NUMBER NOT NULL,
    PRIMARY KEY (codigoSesion)
);

CREATE TABLE Manual (
    id NUMBER NOT NULL,
    mando VARCHAR(30),
    PRIMARY KEY (id)
);

CREATE TABLE Automatizado (
    id NUMBER NOT NULL,
    protocolo VARCHAR(30),
    PRIMARY KEY (id)
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

INSERT INTO Instrumento (codigoInstrumento, serie, fechaAlta, valor) VALUES (1, 'INS0001', #2026-04-08#, 1523.14);
INSERT INTO Instrumento (codigoInstrumento, serie, fechaAlta, valor) VALUES (2, 'INS0002', #2024-07-25#, 411.65);
INSERT INTO Instrumento (codigoInstrumento, serie, fechaAlta, valor) VALUES (3, 'INS0003', #2024-07-21#, 670.8);
INSERT INTO Instrumento (codigoInstrumento, serie, fechaAlta, valor) VALUES (4, 'INS0004', #2025-10-06#, 1823.09);
INSERT INTO Instrumento (codigoInstrumento, serie, fechaAlta, valor) VALUES (5, 'INS0005', #2025-06-14#, 1005.54);
INSERT INTO Instrumento (codigoInstrumento, serie, fechaAlta, valor) VALUES (6, 'INS0006', #2025-11-28#, 646.71);
INSERT INTO Instrumento (codigoInstrumento, serie, fechaAlta, valor) VALUES (7, 'INS0007', #2025-09-24#, 875.41);
INSERT INTO Instrumento (codigoInstrumento, serie, fechaAlta, valor) VALUES (8, 'INS0008', #2025-06-17#, 907.21);

INSERT INTO Manual (id, mando) VALUES (1, 'mando 1');
INSERT INTO Manual (id, mando) VALUES (2, 'mando 2');
INSERT INTO Manual (id, mando) VALUES (3, 'mando 3');
INSERT INTO Manual (id, mando) VALUES (4, 'mando 4');
INSERT INTO Manual (id, mando) VALUES (5, 'mando 5');
INSERT INTO Manual (id, mando) VALUES (6, 'mando 6');
INSERT INTO Manual (id, mando) VALUES (7, 'mando 7');
INSERT INTO Manual (id, mando) VALUES (8, 'mando 8');

INSERT INTO Automatizado (id, protocolo) VALUES (1, NULL);
INSERT INTO Automatizado (id, protocolo) VALUES (2, 'protocolo 2');
INSERT INTO Automatizado (id, protocolo) VALUES (3, 'protocolo 3');
INSERT INTO Automatizado (id, protocolo) VALUES (4, 'protocolo 4');
INSERT INTO Automatizado (id, protocolo) VALUES (5, 'protocolo 5');
INSERT INTO Automatizado (id, protocolo) VALUES (6, 'protocolo 6');
INSERT INTO Automatizado (id, protocolo) VALUES (7, 'protocolo 7');
INSERT INTO Automatizado (id, protocolo) VALUES (8, 'protocolo 8');

INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona) VALUES (1, #2024-07-25#, 7);
INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona) VALUES (2, #2024-06-26#, 5);
INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona) VALUES (3, #2024-11-04#, 1);
INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona) VALUES (4, #2024-05-13#, 3);
INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona) VALUES (5, #2025-05-07#, 8);
INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona) VALUES (6, #2024-02-27#, 3);
INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona) VALUES (7, #2025-04-19#, 5);
INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona) VALUES (8, #2024-02-05#, 8);
