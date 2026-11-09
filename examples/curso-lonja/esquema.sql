-- Lonja de Santa Pola · práctica 1 (2025-2026)
-- SQL del proyecto, en el dialecto de la consola de DataBasic.
-- Este archivo manda en tablas, claves, relaciones, consultas y filas: si lo cambias,
-- DataBasic lo sigue al abrir la carpeta. Las líneas que empiezan por -- son comentarios.

-- Tablas

CREATE TABLE Caladero (
    nombre VARCHAR(40) NOT NULL,
    extension NUMBER(8,2) CHECK (extension >= 0),
    latitud NUMBER(9,6) NOT NULL CHECK (latitud >= -90 AND latitud <= 90),
    longitud NUMBER(9,6) NOT NULL CHECK (longitud >= -180 AND longitud <= 180),
    PRIMARY KEY (nombre)
);

CREATE TABLE Especie (
    cod_especie VARCHAR(5) NOT NULL,
    nombre VARCHAR(40) NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    PRIMARY KEY (cod_especie)
);

CREATE TABLE Barco (
    matricula CHAR(10) NOT NULL,
    nombre VARCHAR(40) NOT NULL,
    clase VARCHAR(30),
    capitan VARCHAR(60),
    armador VARCHAR(60),
    cif CHAR(9) NOT NULL,
    PRIMARY KEY (matricula)
);

CREATE TABLE Lote (
    cod_lote CHAR(5) NOT NULL,
    num_cajas NUMBER(4) NOT NULL CHECK (num_cajas >= 1),
    kilos_total NUMBER(8,2) NOT NULL CHECK (kilos_total >= 0),
    fecha_llegada DATE NOT NULL,
    precio_kg_salida NUMBER(8,2) NOT NULL CHECK (precio_kg_salida >= 0),
    precio_total_salida NUMBER(10,2) NOT NULL CHECK (precio_total_salida >= 0),
    especie_cod_especie VARCHAR(5) NOT NULL,
    barco_matricula CHAR(10) NOT NULL,
    PRIMARY KEY (cod_lote)
);

CREATE TABLE Comprador (
    cod_comprador CHAR(5) NOT NULL,
    nombre VARCHAR(40) NOT NULL,
    direccion VARCHAR(60),
    dni_cif CHAR(9) NOT NULL,
    cuota_anual NUMBER(8,2) NOT NULL CHECK (cuota_anual >= 0),
    PRIMARY KEY (cod_comprador),
    CONSTRAINT AK_Comprador_dni_cif UNIQUE (dni_cif)
);

CREATE TABLE Credito (
    num_cuenta CHAR(24) NOT NULL,
    importe_acumulado NUMBER(10,2) NOT NULL DEFAULT 0 CHECK (importe_acumulado >= 0),
    fecha_vencimiento DATE NOT NULL,
    Comprador_cod_comprador CHAR(5) NOT NULL,
    PRIMARY KEY (Comprador_cod_comprador)
);

CREATE TABLE Contado (
    Comprador_cod_comprador CHAR(5) NOT NULL,
    PRIMARY KEY (Comprador_cod_comprador)
);

CREATE TABLE Factura (
    num_factura CHAR(10) NOT NULL,
    fecha_emision DATE NOT NULL,
    importe_total NUMBER(10,2) NOT NULL CHECK (importe_total >= 0),
    PRIMARY KEY (num_factura)
);

CREATE TABLE Factura_barco (
    Factura_num_factura CHAR(10) NOT NULL,
    barco_matricula CHAR(10) NOT NULL,
    PRIMARY KEY (Factura_num_factura)
);

CREATE TABLE Factura_comprador (
    estado VARCHAR(9) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada')),
    Factura_num_factura CHAR(10) NOT NULL,
    comprador_cod_comprador CHAR(5) NOT NULL,
    PRIMARY KEY (Factura_num_factura)
);

CREATE TABLE Pago (
    cod_pago CHAR(5) NOT NULL,
    fecha DATE NOT NULL,
    importe NUMBER(10,2) NOT NULL CHECK (importe >= 0),
    factura_num_factura CHAR(10) NOT NULL,
    PRIMARY KEY (cod_pago)
);

CREATE TABLE Faena (
    barco_matricula CHAR(10) NOT NULL,
    caladero_nombre VARCHAR(40) NOT NULL,
    especie_cod_especie VARCHAR(5) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE CHECK (fecha_fin >= fecha_inicio),
    kg_especie NUMBER(8,2) NOT NULL CHECK (kg_especie >= 0),
    PRIMARY KEY (barco_matricula, caladero_nombre, especie_cod_especie, fecha_inicio)
);

CREATE TABLE Adjudicacion (
    lote_cod_lote CHAR(5) NOT NULL,
    comprador_cod_comprador CHAR(5) NOT NULL,
    precio_kg_compra NUMBER(8,2) NOT NULL CHECK (precio_kg_compra >= 0),
    precio_total_adjudicacion NUMBER(10,2) NOT NULL CHECK (precio_total_adjudicacion >= 0),
    PRIMARY KEY (lote_cod_lote)
);

CREATE TABLE Incluye (
    factura_Factura_num_factura CHAR(10) NOT NULL,
    lote_cod_lote CHAR(5) NOT NULL,
    PRIMARY KEY (factura_Factura_num_factura, lote_cod_lote),
    CONSTRAINT AK_Incluye_lote UNIQUE (lote_cod_lote)
);

CREATE TABLE Provision (
    factura_Factura_num_factura CHAR(10) NOT NULL,
    lote_cod_lote CHAR(5) NOT NULL,
    PRIMARY KEY (factura_Factura_num_factura, lote_cod_lote),
    CONSTRAINT AK_Provision_lote UNIQUE (lote_cod_lote)
);

-- Relaciones (claves ajenas)

ALTER TABLE Credito ADD CONSTRAINT FK_Credito_Comprador
    FOREIGN KEY (Comprador_cod_comprador) REFERENCES Comprador (cod_comprador)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Contado ADD CONSTRAINT FK_Contado_Comprador
    FOREIGN KEY (Comprador_cod_comprador) REFERENCES Comprador (cod_comprador)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Factura_barco ADD CONSTRAINT FK_Factura_barco_Factura
    FOREIGN KEY (Factura_num_factura) REFERENCES Factura (num_factura)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Factura_comprador ADD CONSTRAINT FK_Factura_comprador_Factura
    FOREIGN KEY (Factura_num_factura) REFERENCES Factura (num_factura)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Lote ADD CONSTRAINT FK_De_especie_especie
    FOREIGN KEY (especie_cod_especie) REFERENCES Especie (cod_especie)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Lote ADD CONSTRAINT FK_Capturado_por_barco
    FOREIGN KEY (barco_matricula) REFERENCES Barco (matricula)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Faena ADD CONSTRAINT FK_Faena_barco
    FOREIGN KEY (barco_matricula) REFERENCES Barco (matricula)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Faena ADD CONSTRAINT FK_Faena_caladero
    FOREIGN KEY (caladero_nombre) REFERENCES Caladero (nombre)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Faena ADD CONSTRAINT FK_Faena_especie
    FOREIGN KEY (especie_cod_especie) REFERENCES Especie (cod_especie)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Adjudicacion ADD CONSTRAINT FK_Adjudicacion_lote
    FOREIGN KEY (lote_cod_lote) REFERENCES Lote (cod_lote)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Adjudicacion ADD CONSTRAINT FK_Adjudicacion_comprador
    FOREIGN KEY (comprador_cod_comprador) REFERENCES Comprador (cod_comprador)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Factura_comprador ADD CONSTRAINT FK_Emitida_a_comprador
    FOREIGN KEY (comprador_cod_comprador) REFERENCES Comprador (cod_comprador)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Incluye ADD CONSTRAINT FK_Incluye_factura
    FOREIGN KEY (factura_Factura_num_factura) REFERENCES Factura_comprador (Factura_num_factura)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Incluye ADD CONSTRAINT FK_Incluye_lote
    FOREIGN KEY (lote_cod_lote) REFERENCES Lote (cod_lote)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Factura_barco ADD CONSTRAINT FK_Emitida_por_barco
    FOREIGN KEY (barco_matricula) REFERENCES Barco (matricula)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Provision ADD CONSTRAINT FK_Provision_factura
    FOREIGN KEY (factura_Factura_num_factura) REFERENCES Factura_barco (Factura_num_factura)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Provision ADD CONSTRAINT FK_Provision_lote
    FOREIGN KEY (lote_cod_lote) REFERENCES Lote (cod_lote)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE Pago ADD CONSTRAINT FK_Salda_factura
    FOREIGN KEY (factura_num_factura) REFERENCES Factura (num_factura)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Índices

-- Sin índices.

-- Consultas guardadas

-- Sin consultas.

-- Filas

INSERT INTO Caladero (nombre, extension, latitud, longitud) VALUES ('Cabo de Santa Pola', 118.34, 38.244698, -0.611169);
INSERT INTO Caladero (nombre, extension, latitud, longitud) VALUES ('Isla de Tabarca', 378.01, 38.107803, -0.492826);
INSERT INTO Caladero (nombre, extension, latitud, longitud) VALUES ('Bajo de la Nao', 208.7, 38.250128, -0.599171);
INSERT INTO Caladero (nombre, extension, latitud, longitud) VALUES ('Golfo de Alicante', 43.01, 38.117069, -0.626065);
INSERT INTO Caladero (nombre, extension, latitud, longitud) VALUES ('Banco de Torrevieja', 380.79, 38.145926, -0.640659);
INSERT INTO Caladero (nombre, extension, latitud, longitud) VALUES ('Cabo de Palos', 167.7, 38.243018, -0.426804);
INSERT INTO Caladero (nombre, extension, latitud, longitud) VALUES ('Fondo de Calpe', 251.38, 38.254838, -0.605044);
INSERT INTO Caladero (nombre, extension, latitud, longitud) VALUES ('Placer de las Hormigas', 218.85, 38.21844, -0.565574);

INSERT INTO Especie (cod_especie, nombre, tipo) VALUES ('ESP01', 'Merluza', 'marisco');
INSERT INTO Especie (cod_especie, nombre, tipo) VALUES ('ESP02', 'Gamba roja', 'marisco');
INSERT INTO Especie (cod_especie, nombre, tipo) VALUES ('ESP03', 'Sardina', 'pescado blanco');
INSERT INTO Especie (cod_especie, nombre, tipo) VALUES ('ESP04', 'Pulpo', 'cefalópodo');
INSERT INTO Especie (cod_especie, nombre, tipo) VALUES ('ESP05', 'Dorada', 'marisco');
INSERT INTO Especie (cod_especie, nombre, tipo) VALUES ('ESP06', 'Lubina', 'pescado blanco');
INSERT INTO Especie (cod_especie, nombre, tipo) VALUES ('ESP07', 'Boquerón', 'marisco');
INSERT INTO Especie (cod_especie, nombre, tipo) VALUES ('ESP08', 'Calamar', 'pescado azul');

INSERT INTO Barco (matricula, nombre, clase, capitan, armador, cif) VALUES ('AT-3-1000', 'Virgen del Mar', NULL, 'Marta Martínez', 'Marta Torres', 'B40000031');
INSERT INTO Barco (matricula, nombre, clase, capitan, armador, cif) VALUES ('AT-4-1001', 'Nuevo Amanecer', 'arrastre', 'Pablo García', 'Sara Martínez', 'B40009270');
INSERT INTO Barco (matricula, nombre, clase, capitan, armador, cif) VALUES ('AT-5-1002', 'Rosa de Tabarca', 'cerco', NULL, 'Nuria Torres', 'B40018349');
INSERT INTO Barco (matricula, nombre, clase, capitan, armador, cif) VALUES ('AT-6-1003', 'Hermanos Pérez', 'arrastre', 'Lucía Navarro', 'Marta Álvarez', 'B40027594');
INSERT INTO Barco (matricula, nombre, clase, capitan, armador, cif) VALUES ('AT-7-1004', 'Mar de Santa Pola', 'arrastre', 'Paula Romero', 'Sara Navarro', 'B40036750');
INSERT INTO Barco (matricula, nombre, clase, capitan, armador, cif) VALUES ('AT-3-1005', 'Estrella del Sur', 'arrastre', NULL, 'Óscar López', 'B40045957');
INSERT INTO Barco (matricula, nombre, clase, capitan, armador, cif) VALUES ('AT-4-1006', 'Cabo Cervera', 'arrastre', 'Lucía García', 'Carlos López', 'B40055085');
INSERT INTO Barco (matricula, nombre, clase, capitan, armador, cif) VALUES ('AT-5-1007', 'La Paloma', NULL, 'Paula Martínez', 'Irene Fernández', 'B40064288');

INSERT INTO Comprador (cod_comprador, nombre, direccion, dni_cif, cuota_anual) VALUES ('COM01', 'Luis Romero', 'C/ Mayor 89, Valencia', '10000157X', 1791.24);
INSERT INTO Comprador (cod_comprador, nombre, direccion, dni_cif, cuota_anual) VALUES ('COM02', 'Diego Romero', 'Pl. de España 76, Valencia', '10008812V', 1266.84);
INSERT INTO Comprador (cod_comprador, nombre, direccion, dni_cif, cuota_anual) VALUES ('COM03', 'Hugo Sánchez', 'C/ Reina Victoria 89, Valencia', '10016586V', 1738.69);
INSERT INTO Comprador (cod_comprador, nombre, direccion, dni_cif, cuota_anual) VALUES ('COM04', 'Marta Fernández', 'Av. de la Libertad 54, Crevillente', '10023866Y', 934.35);
INSERT INTO Comprador (cod_comprador, nombre, direccion, dni_cif, cuota_anual) VALUES ('COM05', 'Andrés Martínez', 'C/ Mayor 53, Orihuela', '10032165W', 1227.41);
INSERT INTO Comprador (cod_comprador, nombre, direccion, dni_cif, cuota_anual) VALUES ('COM06', 'Nuria Torres', 'Av. de Elche 45, Orihuela', '10040582R', 434.85);
INSERT INTO Comprador (cod_comprador, nombre, direccion, dni_cif, cuota_anual) VALUES ('COM07', 'Carlos López', 'Pl. de España 88, Valencia', '10047596T', 622.31);
INSERT INTO Comprador (cod_comprador, nombre, direccion, dni_cif, cuota_anual) VALUES ('COM08', 'Andrés Romero', 'Av. de Elche 22, Alicante', '10056389F', 603.02);

INSERT INTO Factura (num_factura, fecha_emision, importe_total) VALUES ('FAC0001', #2025-12-17#, 556.22);
INSERT INTO Factura (num_factura, fecha_emision, importe_total) VALUES ('FAC0002', #2024-07-06#, 1589.89);
INSERT INTO Factura (num_factura, fecha_emision, importe_total) VALUES ('FAC0003', #2025-08-24#, 1197.34);
INSERT INTO Factura (num_factura, fecha_emision, importe_total) VALUES ('FAC0004', #2025-01-10#, 153);
INSERT INTO Factura (num_factura, fecha_emision, importe_total) VALUES ('FAC0005', #2025-03-04#, 631.05);
INSERT INTO Factura (num_factura, fecha_emision, importe_total) VALUES ('FAC0006', #2026-01-05#, 1873.53);
INSERT INTO Factura (num_factura, fecha_emision, importe_total) VALUES ('FAC0007', #2024-08-04#, 1636.17);
INSERT INTO Factura (num_factura, fecha_emision, importe_total) VALUES ('FAC0008', #2024-12-09#, 913.48);

INSERT INTO Lote (cod_lote, num_cajas, kilos_total, fecha_llegada, precio_kg_salida, precio_total_salida, especie_cod_especie, barco_matricula) VALUES ('LOT01', 13, 837.31, #2024-07-04#, 54.39, 45541.29, 'ESP01', 'AT-5-1002');
INSERT INTO Lote (cod_lote, num_cajas, kilos_total, fecha_llegada, precio_kg_salida, precio_total_salida, especie_cod_especie, barco_matricula) VALUES ('LOT02', 22, 640.24, #2025-10-19#, 31.64, 20257.19, 'ESP07', 'AT-5-1002');
INSERT INTO Lote (cod_lote, num_cajas, kilos_total, fecha_llegada, precio_kg_salida, precio_total_salida, especie_cod_especie, barco_matricula) VALUES ('LOT03', 19, 71.42, #2025-10-03#, 15.58, 1112.72, 'ESP07', 'AT-3-1005');
INSERT INTO Lote (cod_lote, num_cajas, kilos_total, fecha_llegada, precio_kg_salida, precio_total_salida, especie_cod_especie, barco_matricula) VALUES ('LOT04', 2, 1090.42, #2025-12-09#, 58.59, 63887.71, 'ESP08', 'AT-6-1003');
INSERT INTO Lote (cod_lote, num_cajas, kilos_total, fecha_llegada, precio_kg_salida, precio_total_salida, especie_cod_especie, barco_matricula) VALUES ('LOT05', 3, 1859.13, #2026-01-07#, 47.1, 87565.02, 'ESP08', 'AT-5-1002');
INSERT INTO Lote (cod_lote, num_cajas, kilos_total, fecha_llegada, precio_kg_salida, precio_total_salida, especie_cod_especie, barco_matricula) VALUES ('LOT06', 4, 80.84, #2026-01-11#, 15.21, 1229.58, 'ESP04', 'AT-3-1000');
INSERT INTO Lote (cod_lote, num_cajas, kilos_total, fecha_llegada, precio_kg_salida, precio_total_salida, especie_cod_especie, barco_matricula) VALUES ('LOT07', 5, 998.75, #2025-10-12#, 55.55, 55480.56, 'ESP08', 'AT-7-1004');
INSERT INTO Lote (cod_lote, num_cajas, kilos_total, fecha_llegada, precio_kg_salida, precio_total_salida, especie_cod_especie, barco_matricula) VALUES ('LOT08', 17, 196.86, #2024-09-25#, 56.96, 11213.15, 'ESP02', 'AT-7-1004');

INSERT INTO Credito (num_cuenta, importe_acumulado, fecha_vencimiento, Comprador_cod_comprador) VALUES ('ES8621000000000000000000', 74.57, #2026-04-27#, 'COM08');
INSERT INTO Credito (num_cuenta, importe_acumulado, fecha_vencimiento, Comprador_cod_comprador) VALUES ('ES8821000000000000007777', 1860.3, #2024-01-20#, 'COM03');
INSERT INTO Credito (num_cuenta, importe_acumulado, fecha_vencimiento, Comprador_cod_comprador) VALUES ('ES2321000000000000015554', 1073.57, #2025-08-10#, 'COM07');
INSERT INTO Credito (num_cuenta, importe_acumulado, fecha_vencimiento, Comprador_cod_comprador) VALUES ('ES8621000000000000023331', 345.61, #2024-09-06#, 'COM05');

INSERT INTO Contado (Comprador_cod_comprador) VALUES ('COM04');
INSERT INTO Contado (Comprador_cod_comprador) VALUES ('COM02');
INSERT INTO Contado (Comprador_cod_comprador) VALUES ('COM01');
INSERT INTO Contado (Comprador_cod_comprador) VALUES ('COM06');

INSERT INTO Factura_barco (Factura_num_factura, barco_matricula) VALUES ('FAC0008', 'AT-6-1003');
INSERT INTO Factura_barco (Factura_num_factura, barco_matricula) VALUES ('FAC0006', 'AT-4-1006');
INSERT INTO Factura_barco (Factura_num_factura, barco_matricula) VALUES ('FAC0004', 'AT-4-1006');
INSERT INTO Factura_barco (Factura_num_factura, barco_matricula) VALUES ('FAC0001', 'AT-5-1002');

INSERT INTO Factura_comprador (estado, Factura_num_factura, comprador_cod_comprador) VALUES ('pagada', 'FAC0005', 'COM01');
INSERT INTO Factura_comprador (estado, Factura_num_factura, comprador_cod_comprador) VALUES ('pendiente', 'FAC0003', 'COM04');
INSERT INTO Factura_comprador (estado, Factura_num_factura, comprador_cod_comprador) VALUES ('pendiente', 'FAC0007', 'COM02');
INSERT INTO Factura_comprador (estado, Factura_num_factura, comprador_cod_comprador) VALUES ('pendiente', 'FAC0002', 'COM03');

INSERT INTO Pago (cod_pago, fecha, importe, factura_num_factura) VALUES ('PAG01', #2025-08-20#, 1685.79, 'FAC0002');
INSERT INTO Pago (cod_pago, fecha, importe, factura_num_factura) VALUES ('PAG02', #2025-06-13#, 1016.71, 'FAC0004');
INSERT INTO Pago (cod_pago, fecha, importe, factura_num_factura) VALUES ('PAG03', #2025-10-26#, 1697.96, 'FAC0005');
INSERT INTO Pago (cod_pago, fecha, importe, factura_num_factura) VALUES ('PAG04', #2026-04-08#, 38.82, 'FAC0008');
INSERT INTO Pago (cod_pago, fecha, importe, factura_num_factura) VALUES ('PAG05', #2024-10-30#, 93.27, 'FAC0004');
INSERT INTO Pago (cod_pago, fecha, importe, factura_num_factura) VALUES ('PAG06', #2024-01-29#, 153.84, 'FAC0005');
INSERT INTO Pago (cod_pago, fecha, importe, factura_num_factura) VALUES ('PAG07', #2025-05-01#, 792.8, 'FAC0002');
INSERT INTO Pago (cod_pago, fecha, importe, factura_num_factura) VALUES ('PAG08', #2026-04-29#, 1420.19, 'FAC0001');

INSERT INTO Faena (barco_matricula, caladero_nombre, especie_cod_especie, fecha_inicio, fecha_fin, kg_especie) VALUES ('AT-5-1007', 'Placer de las Hormigas', 'ESP04', #2025-09-13#, #2025-10-29#, 242.78);
INSERT INTO Faena (barco_matricula, caladero_nombre, especie_cod_especie, fecha_inicio, fecha_fin, kg_especie) VALUES ('AT-4-1006', 'Fondo de Calpe', 'ESP05', #2024-03-29#, #2024-04-11#, 461.91);
INSERT INTO Faena (barco_matricula, caladero_nombre, especie_cod_especie, fecha_inicio, fecha_fin, kg_especie) VALUES ('AT-5-1007', 'Cabo de Palos', 'ESP07', #2025-12-06#, #2025-12-22#, 458.48);
INSERT INTO Faena (barco_matricula, caladero_nombre, especie_cod_especie, fecha_inicio, fecha_fin, kg_especie) VALUES ('AT-3-1005', 'Golfo de Alicante', 'ESP05', #2024-01-23#, NULL, 98.59);
INSERT INTO Faena (barco_matricula, caladero_nombre, especie_cod_especie, fecha_inicio, fecha_fin, kg_especie) VALUES ('AT-5-1002', 'Golfo de Alicante', 'ESP03', #2025-11-25#, #2025-12-27#, 339.49);
INSERT INTO Faena (barco_matricula, caladero_nombre, especie_cod_especie, fecha_inicio, fecha_fin, kg_especie) VALUES ('AT-7-1004', 'Cabo de Santa Pola', 'ESP08', #2024-08-09#, #2024-09-07#, 443.75);
INSERT INTO Faena (barco_matricula, caladero_nombre, especie_cod_especie, fecha_inicio, fecha_fin, kg_especie) VALUES ('AT-3-1005', 'Cabo de Palos', 'ESP05', #2024-03-15#, #2024-03-16#, 313.79);
INSERT INTO Faena (barco_matricula, caladero_nombre, especie_cod_especie, fecha_inicio, fecha_fin, kg_especie) VALUES ('AT-5-1002', 'Placer de las Hormigas', 'ESP04', #2025-12-09#, #2025-12-24#, 6.94);

INSERT INTO Adjudicacion (lote_cod_lote, comprador_cod_comprador, precio_kg_compra, precio_total_adjudicacion) VALUES ('LOT07', 'COM01', 51.72, 718.23);
INSERT INTO Adjudicacion (lote_cod_lote, comprador_cod_comprador, precio_kg_compra, precio_total_adjudicacion) VALUES ('LOT04', 'COM02', 36.45, 566.15);
INSERT INTO Adjudicacion (lote_cod_lote, comprador_cod_comprador, precio_kg_compra, precio_total_adjudicacion) VALUES ('LOT01', 'COM03', 30.97, 546.53);
INSERT INTO Adjudicacion (lote_cod_lote, comprador_cod_comprador, precio_kg_compra, precio_total_adjudicacion) VALUES ('LOT06', 'COM06', 51.35, 948.38);
INSERT INTO Adjudicacion (lote_cod_lote, comprador_cod_comprador, precio_kg_compra, precio_total_adjudicacion) VALUES ('LOT03', 'COM07', 47.1, 1030.93);
INSERT INTO Adjudicacion (lote_cod_lote, comprador_cod_comprador, precio_kg_compra, precio_total_adjudicacion) VALUES ('LOT08', 'COM05', 44.38, 162.33);
INSERT INTO Adjudicacion (lote_cod_lote, comprador_cod_comprador, precio_kg_compra, precio_total_adjudicacion) VALUES ('LOT02', 'COM02', 26.99, 1858.9);
INSERT INTO Adjudicacion (lote_cod_lote, comprador_cod_comprador, precio_kg_compra, precio_total_adjudicacion) VALUES ('LOT05', 'COM02', 20.75, 1663.56);

INSERT INTO Incluye (factura_Factura_num_factura, lote_cod_lote) VALUES ('FAC0007', 'LOT05');
INSERT INTO Incluye (factura_Factura_num_factura, lote_cod_lote) VALUES ('FAC0002', 'LOT03');
INSERT INTO Incluye (factura_Factura_num_factura, lote_cod_lote) VALUES ('FAC0005', 'LOT06');
INSERT INTO Incluye (factura_Factura_num_factura, lote_cod_lote) VALUES ('FAC0003', 'LOT02');
INSERT INTO Incluye (factura_Factura_num_factura, lote_cod_lote) VALUES ('FAC0002', 'LOT04');
INSERT INTO Incluye (factura_Factura_num_factura, lote_cod_lote) VALUES ('FAC0007', 'LOT08');
INSERT INTO Incluye (factura_Factura_num_factura, lote_cod_lote) VALUES ('FAC0007', 'LOT01');
INSERT INTO Incluye (factura_Factura_num_factura, lote_cod_lote) VALUES ('FAC0005', 'LOT07');

INSERT INTO Provision (factura_Factura_num_factura, lote_cod_lote) VALUES ('FAC0008', 'LOT01');
INSERT INTO Provision (factura_Factura_num_factura, lote_cod_lote) VALUES ('FAC0004', 'LOT03');
INSERT INTO Provision (factura_Factura_num_factura, lote_cod_lote) VALUES ('FAC0008', 'LOT04');
INSERT INTO Provision (factura_Factura_num_factura, lote_cod_lote) VALUES ('FAC0008', 'LOT07');
INSERT INTO Provision (factura_Factura_num_factura, lote_cod_lote) VALUES ('FAC0008', 'LOT05');
INSERT INTO Provision (factura_Factura_num_factura, lote_cod_lote) VALUES ('FAC0006', 'LOT08');
INSERT INTO Provision (factura_Factura_num_factura, lote_cod_lote) VALUES ('FAC0006', 'LOT02');
INSERT INTO Provision (factura_Factura_num_factura, lote_cod_lote) VALUES ('FAC0006', 'LOT06');
