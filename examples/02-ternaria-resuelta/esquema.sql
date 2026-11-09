-- Club de observación · ternaria temporal
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

CREATE TABLE Utilizacion (
    persona_codigoPersona NUMBER NOT NULL,
    instrumento_codigoInstrumento NUMBER NOT NULL,
    sesion_codigoSesion NUMBER NOT NULL,
    instante DATE NOT NULL,
    minutos NUMBER(4,0) NOT NULL CHECK (minutos >= 1),
    PRIMARY KEY (persona_codigoPersona, instrumento_codigoInstrumento, sesion_codigoSesion, instante),
    CONSTRAINT AK_Utilizacion_instrumento_2_combinacion UNIQUE (persona_codigoPersona, sesion_codigoSesion, instante)
);

-- Relaciones (claves ajenas)

ALTER TABLE Sesion ADD CONSTRAINT FK_Coordina_coordinadora
    FOREIGN KEY (coordinadora_codigoPersona) REFERENCES Persona (codigoPersona)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Utilizacion ADD CONSTRAINT FK_Utiliza_persona
    FOREIGN KEY (persona_codigoPersona) REFERENCES Persona (codigoPersona)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Utilizacion ADD CONSTRAINT FK_Utiliza_instrumento
    FOREIGN KEY (instrumento_codigoInstrumento) REFERENCES Instrumento (codigoInstrumento)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Utilizacion ADD CONSTRAINT FK_Utiliza_sesion
    FOREIGN KEY (sesion_codigoSesion) REFERENCES Sesion (codigoSesion)
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

INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona) VALUES (1, #2025-08-22#, 5);
INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona) VALUES (2, #2026-02-06#, 2);
INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona) VALUES (3, #2024-04-25#, 6);
INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona) VALUES (4, #2024-12-12#, 5);
INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona) VALUES (5, #2026-02-21#, 1);
INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona) VALUES (6, #2024-05-09#, 5);
INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona) VALUES (7, #2025-04-26#, 7);
INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona) VALUES (8, #2024-10-09#, 7);

INSERT INTO Utilizacion (persona_codigoPersona, instrumento_codigoInstrumento, sesion_codigoSesion, instante, minutos) VALUES (7, 2, 5, #2024-06-26#, 2);
INSERT INTO Utilizacion (persona_codigoPersona, instrumento_codigoInstrumento, sesion_codigoSesion, instante, minutos) VALUES (3, 3, 2, #2026-05-31#, 22);
INSERT INTO Utilizacion (persona_codigoPersona, instrumento_codigoInstrumento, sesion_codigoSesion, instante, minutos) VALUES (3, 1, 5, #2025-04-19#, 37);
INSERT INTO Utilizacion (persona_codigoPersona, instrumento_codigoInstrumento, sesion_codigoSesion, instante, minutos) VALUES (1, 7, 2, #2024-05-07#, 34);
INSERT INTO Utilizacion (persona_codigoPersona, instrumento_codigoInstrumento, sesion_codigoSesion, instante, minutos) VALUES (8, 6, 3, #2025-11-06#, 31);
INSERT INTO Utilizacion (persona_codigoPersona, instrumento_codigoInstrumento, sesion_codigoSesion, instante, minutos) VALUES (3, 2, 3, #2025-03-28#, 31);
INSERT INTO Utilizacion (persona_codigoPersona, instrumento_codigoInstrumento, sesion_codigoSesion, instante, minutos) VALUES (2, 1, 8, #2025-06-14#, 22);
INSERT INTO Utilizacion (persona_codigoPersona, instrumento_codigoInstrumento, sesion_codigoSesion, instante, minutos) VALUES (1, 1, 4, #2025-07-21#, 18);
