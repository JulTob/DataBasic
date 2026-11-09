-- Club de observación · compuestos, derivado y recursiva
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
    edificio VARCHAR(30),
    sala CHAR(8),
    PRIMARY KEY (codigoSesion)
);

CREATE TABLE Habilitacion (
    persona_codigoPersona NUMBER NOT NULL,
    instrumento_codigoInstrumento NUMBER NOT NULL,
    fechaAlta DATE NOT NULL,
    emisor VARCHAR(30),
    referencia CHAR(12),
    PRIMARY KEY (persona_codigoPersona, instrumento_codigoInstrumento)
);

CREATE TABLE Orientacion (
    orientador_codigoPersona NUMBER NOT NULL,
    orientado_codigoPersona NUMBER NOT NULL,
    PRIMARY KEY (orientador_codigoPersona, orientado_codigoPersona)
);

-- Relaciones (claves ajenas)

ALTER TABLE Sesion ADD CONSTRAINT FK_Coordina_coordinadora
    FOREIGN KEY (coordinadora_codigoPersona) REFERENCES Persona (codigoPersona)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Habilitacion ADD CONSTRAINT FK_Habilitacion_persona
    FOREIGN KEY (persona_codigoPersona) REFERENCES Persona (codigoPersona)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Habilitacion ADD CONSTRAINT FK_Habilitacion_instrumento
    FOREIGN KEY (instrumento_codigoInstrumento) REFERENCES Instrumento (codigoInstrumento)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Orientacion ADD CONSTRAINT FK_Orienta_orientador
    FOREIGN KEY (orientador_codigoPersona) REFERENCES Persona (codigoPersona)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Orientacion ADD CONSTRAINT FK_Orienta_orientado
    FOREIGN KEY (orientado_codigoPersona) REFERENCES Persona (codigoPersona)
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

INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona, edificio, sala) VALUES (1, #2025-08-22#, 5, 'Torrevieja', 'SES0001');
INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona, edificio, sala) VALUES (2, #2025-06-01#, 2, 'Elche', 'SES0002');
INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona, edificio, sala) VALUES (3, #2024-05-09#, 5, 'Murcia', 'SES0003');
INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona, edificio, sala) VALUES (4, #2026-01-20#, 3, 'Murcia', 'SES0004');
INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona, edificio, sala) VALUES (5, #2024-11-04#, 1, 'Alicante', 'SES0005');
INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona, edificio, sala) VALUES (6, #2024-11-20#, 5, NULL, 'SES0006');
INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona, edificio, sala) VALUES (7, #2026-03-21#, 5, NULL, 'SES0007');
INSERT INTO Sesion (codigoSesion, fecha, coordinadora_codigoPersona, edificio, sala) VALUES (8, #2024-05-07#, 2, 'Crevillente', 'SES0008');

INSERT INTO Habilitacion (persona_codigoPersona, instrumento_codigoInstrumento, fechaAlta, emisor, referencia) VALUES (3, 6, #2025-11-14#, 'emisor 1', 'HAB0001');
INSERT INTO Habilitacion (persona_codigoPersona, instrumento_codigoInstrumento, fechaAlta, emisor, referencia) VALUES (3, 5, #2025-11-23#, 'emisor 2', NULL);
INSERT INTO Habilitacion (persona_codigoPersona, instrumento_codigoInstrumento, fechaAlta, emisor, referencia) VALUES (8, 5, #2025-04-24#, NULL, NULL);
INSERT INTO Habilitacion (persona_codigoPersona, instrumento_codigoInstrumento, fechaAlta, emisor, referencia) VALUES (4, 6, #2025-01-28#, 'emisor 4', 'HAB0004');
INSERT INTO Habilitacion (persona_codigoPersona, instrumento_codigoInstrumento, fechaAlta, emisor, referencia) VALUES (1, 2, #2025-07-12#, NULL, 'HAB0005');
INSERT INTO Habilitacion (persona_codigoPersona, instrumento_codigoInstrumento, fechaAlta, emisor, referencia) VALUES (7, 4, #2025-03-06#, NULL, 'HAB0006');
INSERT INTO Habilitacion (persona_codigoPersona, instrumento_codigoInstrumento, fechaAlta, emisor, referencia) VALUES (3, 2, #2025-06-01#, 'emisor 7', 'HAB0007');
INSERT INTO Habilitacion (persona_codigoPersona, instrumento_codigoInstrumento, fechaAlta, emisor, referencia) VALUES (8, 6, #2024-05-21#, 'emisor 16', 'HAB0016');

INSERT INTO Orientacion (orientador_codigoPersona, orientado_codigoPersona) VALUES (7, 3);
INSERT INTO Orientacion (orientador_codigoPersona, orientado_codigoPersona) VALUES (4, 7);
INSERT INTO Orientacion (orientador_codigoPersona, orientado_codigoPersona) VALUES (6, 8);
INSERT INTO Orientacion (orientador_codigoPersona, orientado_codigoPersona) VALUES (6, 3);
INSERT INTO Orientacion (orientador_codigoPersona, orientado_codigoPersona) VALUES (2, 3);
INSERT INTO Orientacion (orientador_codigoPersona, orientado_codigoPersona) VALUES (7, 8);
INSERT INTO Orientacion (orientador_codigoPersona, orientado_codigoPersona) VALUES (6, 6);
INSERT INTO Orientacion (orientador_codigoPersona, orientado_codigoPersona) VALUES (3, 6);
