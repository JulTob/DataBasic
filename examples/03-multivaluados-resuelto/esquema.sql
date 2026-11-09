-- Club de observación · tablas de valores múltiples
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

CREATE TABLE Etiquetas (
    Instrumento_codigoInstrumento NUMBER NOT NULL,
    Instrumento_sede CHAR(4) NOT NULL,
    etiqueta VARCHAR(20) NOT NULL,
    PRIMARY KEY (Instrumento_codigoInstrumento, Instrumento_sede, etiqueta)
);

CREATE TABLE Calibraciones (
    Instrumento_codigoInstrumento NUMBER NOT NULL,
    Instrumento_sede CHAR(4) NOT NULL,
    fechaCalibracion DATE NOT NULL,
    patron CHAR(10) NOT NULL,
    PRIMARY KEY (Instrumento_codigoInstrumento, Instrumento_sede, fechaCalibracion, patron)
);

-- Relaciones (claves ajenas)

ALTER TABLE Sesion ADD CONSTRAINT FK_Coordina_coordinadora
    FOREIGN KEY (coordinadora_codigoPersona) REFERENCES Persona (codigoPersona)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Etiquetas ADD CONSTRAINT FK_Etiquetas_Instrumento
    FOREIGN KEY (Instrumento_codigoInstrumento, Instrumento_sede) REFERENCES Instrumento (codigoInstrumento, sede)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Calibraciones ADD CONSTRAINT FK_Calibraciones_Instrumento
    FOREIGN KEY (Instrumento_codigoInstrumento, Instrumento_sede) REFERENCES Instrumento (codigoInstrumento, sede)
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

INSERT INTO Etiquetas (Instrumento_codigoInstrumento, Instrumento_sede, etiqueta) VALUES (8, 'Orih', 'etiqueta 1');
INSERT INTO Etiquetas (Instrumento_codigoInstrumento, Instrumento_sede, etiqueta) VALUES (5, 'Murc', 'etiqueta 2');
INSERT INTO Etiquetas (Instrumento_codigoInstrumento, Instrumento_sede, etiqueta) VALUES (3, 'Murc', 'etiqueta 3');
INSERT INTO Etiquetas (Instrumento_codigoInstrumento, Instrumento_sede, etiqueta) VALUES (1, 'Alic', 'etiqueta 4');
INSERT INTO Etiquetas (Instrumento_codigoInstrumento, Instrumento_sede, etiqueta) VALUES (5, 'Murc', 'etiqueta 5');
INSERT INTO Etiquetas (Instrumento_codigoInstrumento, Instrumento_sede, etiqueta) VALUES (5, 'Murc', 'etiqueta 6');
INSERT INTO Etiquetas (Instrumento_codigoInstrumento, Instrumento_sede, etiqueta) VALUES (8, 'Orih', 'etiqueta 7');
INSERT INTO Etiquetas (Instrumento_codigoInstrumento, Instrumento_sede, etiqueta) VALUES (1, 'Alic', 'etiqueta 8');

INSERT INTO Calibraciones (Instrumento_codigoInstrumento, Instrumento_sede, fechaCalibracion, patron) VALUES (7, 'Vale', #2024-04-28#, 'CAL0001');
INSERT INTO Calibraciones (Instrumento_codigoInstrumento, Instrumento_sede, fechaCalibracion, patron) VALUES (2, 'Sant', #2026-01-20#, 'CAL0002');
INSERT INTO Calibraciones (Instrumento_codigoInstrumento, Instrumento_sede, fechaCalibracion, patron) VALUES (8, 'Orih', #2025-09-11#, 'CAL0003');
INSERT INTO Calibraciones (Instrumento_codigoInstrumento, Instrumento_sede, fechaCalibracion, patron) VALUES (3, 'Murc', #2025-11-06#, 'CAL0004');
INSERT INTO Calibraciones (Instrumento_codigoInstrumento, Instrumento_sede, fechaCalibracion, patron) VALUES (7, 'Vale', #2024-11-05#, 'CAL0005');
INSERT INTO Calibraciones (Instrumento_codigoInstrumento, Instrumento_sede, fechaCalibracion, patron) VALUES (2, 'Sant', #2024-08-19#, 'CAL0006');
INSERT INTO Calibraciones (Instrumento_codigoInstrumento, Instrumento_sede, fechaCalibracion, patron) VALUES (5, 'Murc', #2025-11-23#, 'CAL0007');
INSERT INTO Calibraciones (Instrumento_codigoInstrumento, Instrumento_sede, fechaCalibracion, patron) VALUES (2, 'Sant', #2024-03-06#, 'CAL0008');
