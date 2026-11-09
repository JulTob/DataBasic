import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as domain from '../src/domain/model.js';
import { parseDocument } from '../src/domain/serialization.js';
import { tokenize } from '../src/sql/lexer.js';
import {
    parseExpression,
    parseScript
    } from '../src/sql/parser.js';
import { runSql } from '../src/sql/console.js';
import {
    compareValues,
    displayValue,
    likeMatches
    } from '../src/sql/values.js';

/** A small library in the course profile, built with the console itself. */
function library() {
    const result = runSql( domain.emptyDocument( 'course' ), `
        CREATE TABLE Socio (
            id_socio NUMBER(6) PRIMARY KEY,
            nombre VARCHAR(80) NOT NULL,
            email VARCHAR(100) UNIQUE,
            cuota NUMBER(6,2) DEFAULT 20 CHECK (cuota >= 0)
        );
        CREATE TABLE Libro (id_libro NUMBER(6) PRIMARY KEY, titulo VARCHAR(100) NOT NULL);
        CREATE TABLE Prestamo (
            id_prestamo NUMBER(8),
            socio NUMBER(6) NOT NULL,
            libro NUMBER(6) NOT NULL,
            fecha DATE NOT NULL,
            devolucion DATE,
            CONSTRAINT PK_Prestamo PRIMARY KEY (id_prestamo),
            CONSTRAINT FK_Prestamo_Socio FOREIGN KEY (socio) REFERENCES Socio (id_socio) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT FK_Prestamo_Libro FOREIGN KEY (libro) REFERENCES Libro,
            CHECK (devolucion >= fecha)
        );
        INSERT INTO Socio (id_socio, nombre, email) VALUES (1, 'Ana', 'ana@x.es'), (2, 'Luis', NULL), (3, 'Marta', 'marta@x.es');
        INSERT INTO Libro VALUES (10, 'Dune'), (11, 'Ubik'), (12, 'Solaris');
        INSERT INTO Prestamo VALUES (100, 1, 10, #2026-01-10#, #2026-01-20#), (101, 1, 11, #2026-02-01#, NULL),
            (102, 2, 10, #2026-02-03#, #2026-02-10#), (103, 3, 12, #2026-03-01#, NULL);
        ` );

    assert.ok( result.outputs.every( output => output.kind === 'done' ), JSON.stringify( result.outputs.filter( output => output.kind === 'error' ) ) );
    return result.model;
    }

/** Runs one statement and returns its output. */
function run(
        model,
        sql
        ) {
    return runSql( model, sql ).outputs.at( -1 );
    }

function rows(
        model,
        sql
        ) {
    const output = run( model, sql );

    assert.equal( output.kind, 'rows', output.message );
    return output.rows.map( row => row.map( displayValue ) );
    }

test( 'El léxico de Access: nombres entre corchetes, textos con comillas dobladas, fechas y comentarios', () => {
    const tokens = tokenize( "SELECT [Fecha de alta], 'O''Brien', \"x\", #1/31/2026#, #2026-02-01#, 12.5 -- comentario\n /* otro */ FROM t" );

    assert.deepEqual(
            tokens.map( token => [token.kind, token.value] ),
            [
                ['word', 'SELECT'], ['name', 'Fecha de alta'], ['symbol', ','], ['string', 'O\'Brien'], ['symbol', ','],
                ['string', 'x'], ['symbol', ','], ['date', '2026-01-31'], ['symbol', ','], ['date', '2026-02-01'],
                ['symbol', ','], ['number', 12.5], ['word', 'FROM'], ['word', 't'], ['end', '']
                ]
            );
    assert.throws( () => tokenize( "SELECT 'abierto" ), /Falta cerrar el texto/ );
    assert.throws( () => tokenize( 'SELECT #2026-02-30#' ), /no existe/ );
    } );

test( 'Los errores de sintaxis dicen qué se esperaba y dónde', () => {
    const output = run( domain.emptyDocument(), 'SELECT nombre\nFROM WHERE x = 1' );

    assert.equal( output.kind, 'error' );
    assert.match( output.message, /se esperaba el nombre de una tabla o consulta, pero aparece «WHERE» \(línea 2, columna 6\)/ );
    assert.match( run( domain.emptyDocument(), 'SELECT CASE WHEN 1 THEN 2 END' ).message, /Este dialecto no tiene CASE: usa IIf/ );
    assert.equal( parseScript( 'SELECT 1; ; SELECT 2;' ).length, 2 );
    assert.equal( parseExpression( "estado IN ('pendiente', 'pagada')" ).type, 'in' );
    } );

test( 'Los valores siguen a Access: textos sin mayúsculas, comodines de LIKE y NULL desconocido', () => {
    assert.equal( compareValues( 'ana', 'ANA' ), 0 );
    assert.equal( compareValues( null, 1 ), null );
    assert.equal( likeMatches( 'Solaris', 's*r?s' ), true );
    assert.equal( likeMatches( 'A1', '[a-c]#' ), true );
    assert.equal( likeMatches( 'B', '[!a-c]' ), false );
    assert.equal( displayValue( 12.5 ), '12,5' );
    assert.throws( () => compareValues( 'Ana', 1 ), /No coinciden los tipos de datos/ );
    } );

test( 'SELECT con WHERE, combinaciones, totales, subconsultas y UNION', () => {
    const model = library();

    assert.deepEqual( rows( model, 'SELECT nombre FROM Socio WHERE email IS NULL' ), [['Luis']] );
    assert.deepEqual(
            rows( model, `SELECT s.nombre, l.titulo FROM (Prestamo AS p INNER JOIN Socio AS s ON p.socio = s.id_socio)
                INNER JOIN Libro AS l ON l.id_libro = p.libro WHERE p.devolucion IS NULL ORDER BY s.nombre` ),
            [['Ana', 'Ubik'], ['Marta', 'Solaris']]
            );
    assert.deepEqual(
            rows( model, `SELECT s.nombre, Count(p.id_prestamo) AS n FROM Socio s LEFT JOIN Prestamo p ON p.socio = s.id_socio
                GROUP BY s.nombre HAVING Count(p.id_prestamo) < 2 ORDER BY 2 DESC, 1` ),
            [['Luis', '1'], ['Marta', '1']]
            );
    assert.deepEqual(
            rows( model, 'SELECT titulo FROM Libro WHERE id_libro NOT IN (SELECT libro FROM Prestamo WHERE devolucion IS NULL)' ),
            [['Dune']]
            );
    assert.deepEqual(
            rows( model, 'SELECT nombre FROM Socio s WHERE NOT EXISTS (SELECT * FROM Prestamo p WHERE p.socio = s.id_socio AND p.devolucion IS NULL)' ),
            [['Luis']]
            );
    assert.deepEqual( rows( model, 'SELECT nombre FROM Socio UNION SELECT titulo FROM Libro ORDER BY 1' ).length, 6 );
    assert.deepEqual( rows( model, 'SELECT libro FROM Prestamo UNION ALL SELECT libro FROM Prestamo' ).length, 8 );
    assert.deepEqual( rows( model, 'SELECT TOP 1 libro, Count(*) AS veces FROM Prestamo GROUP BY libro ORDER BY Count(*) DESC' ), [['10', '2']] );
    assert.deepEqual(
            rows( model, 'SELECT TOP 1 socio FROM Prestamo ORDER BY socio' ),
            [['1'], ['1']],
            'TOP keeps the rows tied with the last one, as Access does'
            );
    assert.deepEqual(
            rows( model, "SELECT nombre & ' <' & Nz(email, 'sin correo') & '>' AS contacto FROM Socio WHERE nombre LIKE '*s'" ),
            [['Luis <sin correo>']]
            );
    assert.deepEqual( rows( model, 'SELECT DISTINCT socio FROM Prestamo ORDER BY socio DESC' ), [['3'], ['2'], ['1']] );
    assert.deepEqual( rows( model, "SELECT IIf(devolucion IS NULL, 'pendiente', 'devuelto') AS estado, Count(*) FROM Prestamo GROUP BY IIf(devolucion IS NULL, 'pendiente', 'devuelto')" ),
            [['devuelto', '2'], ['pendiente', '2']] );
    assert.deepEqual( rows( model, 'SELECT Year(fecha), Max(fecha), DateDiff("d", Min(fecha), Max(fecha)) FROM Prestamo GROUP BY Year(fecha)' ),
            [['2026', '01/03/2026', '50']] );
    } );

test( 'El álgebra relacional de la consulta y los nombres de campo de Access', () => {
    const model = library();
    const output = run( model, 'SELECT nombre, Count(*) FROM Socio INNER JOIN Prestamo ON Socio.id_socio = Prestamo.socio WHERE fecha > #2026-01-15# GROUP BY nombre' );

    assert.deepEqual( output.columns, ['nombre', 'Expr1000'] );
    assert.equal(
            output.algebra,
            'π_{nombre, COUNT(*)}(γ_{nombre, COUNT(*)}(σ_{fecha > #2026-01-15#}((Socio ⋈_{Socio.id_socio = Prestamo.socio} Prestamo))))'
            );
    assert.deepEqual( run( model, 'SELECT Socio.id_socio, Prestamo.socio AS id_socio FROM Socio, Prestamo' ).columns, ['Socio.id_socio', 'id_socio'] );
    assert.deepEqual( run( model, 'SELECT * FROM Socio, Libro' ).columns.slice( 0, 2 ), ['id_socio', 'nombre'] );
    assert.deepEqual( run( model, 'SELECT * FROM Socio s, Socio t' ).columns.slice( 0, 2 ), ['s.id_socio', 's.nombre'] );
    assert.deepEqual( run( model, 'SELECT * FROM Socio' ).kinds, ['number', 'text', 'text', 'number'] );
    } );

test( 'Los errores de las consultas se explican como en Access', () => {
    const model = library();

    assert.match( run( model, 'SELECT nombre, Count(*) FROM Socio' ).message, /no incluye la expresión «nombre» como parte de una función de agregado/ );
    assert.match( run( model, 'SELECT x FROM Socio' ).message, /No se encuentra el campo «x»/ );
    assert.match( run( model, 'SELECT * FROM Nada' ).message, /No se encuentra la tabla o consulta de entrada «Nada»/ );
    assert.match( run( model, 'SELECT id_socio FROM Socio, Prestamo, Socio s' ).message, /puede referirse a más de una tabla/ );
    assert.match( run( model, "SELECT nombre FROM Socio WHERE nombre = 1" ).message, /No coinciden los tipos de datos/ );
    assert.match( run( model, 'SELECT nombre FROM Socio WHERE Count(*) > 1' ).message, /No se puede usar una función de agregado en WHERE/ );
    assert.match( run( model, 'SELECT Count(DISTINCT socio) FROM Prestamo' ).message, /Este dialecto no admite COUNT\(DISTINCT/ );
    assert.match( run( model, 'SELECT nombre FROM Socio UNION SELECT id_libro, titulo FROM Libro' ).message, /número de campos/ );
    assert.match( run( model, 'SELECT (SELECT nombre FROM Socio) FROM Libro' ).message, /como mucho un registro/ );
    assert.match( run( model, 'SELECT 1 / 0' ).message, /División por cero/ );
    } );

test( 'INSERT, UPDATE y DELETE respetan claves, dominios, CHECK y la integridad referencial', () => {
    const model = library();

    assert.match( run( model, "INSERT INTO Socio VALUES (1, 'Repe', NULL, 10)" ).message, /repite la clave principal \(1\)/ );
    assert.match( run( model, "INSERT INTO Socio (id_socio, nombre, email) VALUES (4, 'Otra', 'ANA@x.es')" ).message, /repite la clave alternativa|repite el índice único/ );
    assert.match( run( model, 'INSERT INTO Prestamo VALUES (104, 9, 10, #2026-03-01#, NULL)' ).message, /se necesita un registro relacionado en la tabla «Socio»/ );
    assert.match( run( model, "INSERT INTO Socio (id_socio, nombre, cuota) VALUES (4, 'Neg', -5)" ).message, /regla de validación de cuota: cuota >= 0/ );
    assert.match( run( model, 'INSERT INTO Prestamo VALUES (104, 3, 10, #2026-03-10#, #2026-03-01#)' ).message, /regla de validación de devolucion/ );
    assert.match( run( model, 'INSERT INTO Socio (id_socio) VALUES (5)' ).message, /el campo nombre es obligatorio/ );
    assert.match( run( model, "INSERT INTO Socio (id_socio, nombre) VALUES ('x', 'Texto')" ).message, /Campo «id_socio»: No coinciden los tipos de datos/ );
    assert.match( run( model, 'DELETE FROM Libro WHERE id_libro = 10' ).message, /la tabla «Prestamo» tiene 2 registros relacionados/ );

    const inserted = runSql( model, "INSERT INTO Socio (id_socio, nombre) VALUES (4, 'Pablo'); SELECT cuota FROM Socio WHERE id_socio = 4" );

    assert.deepEqual( inserted.outputs.at( -1 ).rows, [[20]], 'DEFAULT fills the missing field' );

    const cascade = runSql( model, 'UPDATE Socio SET id_socio = 10 WHERE id_socio = 1; SELECT socio FROM Prestamo ORDER BY id_prestamo' );

    assert.equal( cascade.outputs[0].message, '1 registro actualizado en Socio.' );
    assert.deepEqual( cascade.outputs[1].rows.map( row => row[0] ), [10, 10, 2, 3], 'ON UPDATE CASCADE' );

    const removal = runSql( model, "DELETE FROM Socio WHERE nombre = 'ANA'; SELECT Count(*) FROM Prestamo" );

    assert.equal( removal.outputs[0].message, '1 registro eliminado de Socio y 2 registros relacionados en cascada.' );
    assert.deepEqual( removal.outputs[1].rows, [[2]] );
    assert.deepEqual( domain.validateDocument( removal.model ).filter( issue => issue.level === 'error' ), [] );
    } );

test( 'ON DELETE SET NULL deja la referencia vacía y una instrucción que falla no cambia nada', () => {
    let model = library();

    model = runSql( model, `
        CREATE TABLE Nota (id_nota NUMBER(4) PRIMARY KEY, socio NUMBER(6) REFERENCES Socio (id_socio) ON DELETE SET NULL);
        INSERT INTO Nota VALUES (1, 2), (2, 3);
        ` ).model;

    const result = runSql( model, 'DELETE FROM Socio WHERE id_socio = 2; SELECT id_nota, socio FROM Nota ORDER BY id_nota' );

    assert.equal( result.outputs[0].message, '1 registro eliminado de Socio y 1 registro relacionado en cascada.', 'Prestamo cascades' );
    assert.deepEqual( result.outputs.at( -1 ).rows, [[1, null], [2, 3]], 'Nota keeps its row without a reference' );

    const stopped = runSql( model, "INSERT INTO Libro VALUES (13, 'Nuevo'); INSERT INTO Libro VALUES (13, 'Repetido'); INSERT INTO Libro VALUES (14, 'No llega')" );

    assert.deepEqual( stopped.outputs.map( output => output.kind ), ['done', 'error'], 'the script stops at the first error' );
    assert.equal( stopped.changed, true, 'the statements before the error stay done' );
    assert.deepEqual( rows( stopped.model, 'SELECT id_libro FROM Libro WHERE id_libro >= 13' ), [['13']] );
    } );

test( 'CREATE, ALTER y DROP pasan por las reglas del modelo', async () => {
    let model = library();
    const socio = () => model.tables.find( table => table.name === 'Socio' );

    assert.ok( socio().alternateKeys?.length === 0 || !socio().alternateKeys?.length );
    assert.ok( socio().indexes.some( index => index.unique && index.name === 'UX_Socio_email' ), 'UNIQUE nullable → unique index' );
    assert.equal( model.relationships.find( relation => relation.name === 'FK_Prestamo_Socio' ).onDelete, 'CASCADE' );
    assert.equal( model.tables.find( table => table.name === 'Prestamo' ).columns.find( column => column.name === 'devolucion' ).domain.check, 'devolucion >= fecha' );

    assert.match( run( model, 'CREATE TABLE Mal (x INTEGER)' ).message, /el perfil del curso sólo admite VARCHAR, CHAR, NUMBER y DATE/ );
    assert.match( run( model, 'CREATE TABLE Socio (x NUMBER)' ).message, /Ya existe una tabla o consulta «Socio»/ );
    assert.match( run( model, 'CREATE TABLE T (a NUMBER, b NUMBER REFERENCES Prestamo (fecha))' ).message, /clave principal completa de «Prestamo»/ );
    assert.match( run( model, 'ALTER TABLE Socio ADD COLUMN alta DATE NOT NULL' ).message, /necesita DEFAULT/ );
    assert.match( run( model, 'DROP TABLE Socio' ).message, /la referencian Prestamo/ );

    model = runSql( model, `
        ALTER TABLE Socio ADD COLUMN alta DATE NOT NULL DEFAULT #2026-01-01#;
        ALTER TABLE Socio ADD CONSTRAINT AK_Socio_nombre UNIQUE (nombre);
        ALTER TABLE Socio ALTER COLUMN nombre VARCHAR(120) NOT NULL;
        CREATE INDEX IX_Prestamo_fecha ON Prestamo (fecha);
        CREATE VIEW Pendientes AS SELECT socio, Count(*) AS n FROM Prestamo WHERE devolucion IS NULL GROUP BY socio;
        ` ).model;

    assert.deepEqual( rows( model, 'SELECT DISTINCT alta FROM Socio' ), [['01/01/2026']] );
    assert.equal( socio().alternateKeys.find( key => key.name === 'AK_Socio_nombre' ).columns.length, 1 );
    assert.equal( socio().columns.find( column => column.name === 'nombre' ).type, 'VARCHAR(120)' );
    assert.deepEqual( rows( model, 'SELECT * FROM Pendientes ORDER BY socio' ), [['1', '1'], ['3', '1']] );
    assert.equal( model.tables.find( table => table.name === 'Pendientes' ).kind, 'view' );
    assert.match( run( model, "ALTER TABLE Socio ALTER COLUMN nombre VARCHAR(3) NOT NULL" ).message, /supera los 3 caracteres/ );

    model = runSql( model, 'DROP VIEW Pendientes; DROP INDEX IX_Prestamo_fecha ON Prestamo; ALTER TABLE Prestamo DROP CONSTRAINT FK_Prestamo_Socio; DROP TABLE Socio' ).model;
    assert.ok( !model.tables.some( table => ['Socio', 'Pendientes'].includes( table.name ) ) );
    assert.deepEqual( domain.validateDocument( model ).filter( issue => issue.level === 'error' ), [] );

    const lonja = parseDocument( await readFile( new URL( '../examples/curso-lonja.databasic.json', import.meta.url ), 'utf8' ) );

    assert.match( run( lonja, 'ALTER TABLE Lote ADD COLUMN nota VARCHAR(20)' ).message, /se genera desde el diagrama entidad-relación/ );
    assert.match( run( lonja, 'DROP TABLE Pago' ).message, /se genera desde el diagrama entidad-relación|Edita el origen Chen/ );
    } );

test( 'Una consulta guardada que se usa a sí misma se rechaza sin colgar la consola', () => {
    let model = library();

    model = runSql( model, 'CREATE VIEW A AS SELECT * FROM Socio' ).model;

    const view = model.tables.find( table => table.name === 'A' );

    model = domain.updateTable( model, view.id, {definition: 'SELECT * FROM A'} );
    assert.match( run( model, 'SELECT * FROM A' ).message, /se usa a sí misma/ );
    } );

test( 'La consola de la aplicación ejecuta SQL, muestra la hoja de datos y se deshace en un paso', async () => {
    const { applicationHarness } = await import( './support/application.js' );
    const app = await applicationHarness( 500 );

    await app.click({action: 'example'});
    await app.click({mode: 'tables'});
    await app.click({action: 'sample-data'});
    await app.flushTimers();

    const saved = JSON.parse( app.saved() );

    assert.ok( Object.values( saved.data ).every( rows => rows.length === 8 ), 'filas de ejemplo en las tres tablas' );

    await app.click({action: 'sql-console'});
    assert.match( app.element( '#properties-body' ).innerHTML, /data-sql-input/ );
    assert.match( app.element( '#properties-body' ).innerHTML, /data-sql-insert="Socio"/ );

    app.change( {sqlInput: ''}, 'SELECT nombre FROM Socio ORDER BY nombre;\nSELECT Count(*) AS n FROM Prestamo' );
    await app.click({action: 'sql-run'});

    const body = app.element( '#properties-body' ).innerHTML;

    assert.match( body, /<th class="">nombre<\/th>/ );
    assert.match( body, /Registros: 8/ );
    assert.match( body, /<p class="console-algebra"/ );
    assert.match( body, /τ<sub>nombre<\/sub>/ );

    app.change( {sqlInput: ''}, "INSERT INTO Socio (id_socio, nombre, email) VALUES (999, 'Nueva', NULL)" );
    await app.click({action: 'sql-run'});
    await app.flushTimers();
    assert.match( app.element( '#properties-body' ).innerHTML, /1 registro agregado a Socio\./ );
    assert.equal( Object.values( JSON.parse( app.saved() ).data ).reduce( (sum, rows) => sum + rows.length, 0 ), 25 );

    await app.click({action: 'undo'});
    await app.flushTimers();
    assert.equal( Object.values( JSON.parse( app.saved() ).data ).reduce( (sum, rows) => sum + rows.length, 0 ), 24, 'Deshacer revierte la instrucción' );

    app.change( {sqlInput: ''}, 'SELECT * FROM Nada' );
    await app.click({action: 'sql-run'});
    assert.match( app.element( '#properties-body' ).innerHTML, /class="console-error"[\s\S]*No se encuentra la tabla o consulta de entrada «Nada»/ );

    app.change( {sqlTemplate: ''}, '0' );
    assert.match( app.element( '#properties-body' ).innerHTML, /SELECT \*\nFROM Socio;/ );

    app.change( {sqlInput: ''}, 'SELECT nombre FROM Socio WHERE email IS NULL' );
    await app.click({action: 'sql-save-view'});
    app.submit( {name: 'SinCorreo'} );
    await app.flushTimers();
    assert.ok( JSON.parse( app.saved() ).tables.some( table => table.kind === 'view' && table.name === 'SinCorreo' ) );

    await app.click({action: 'pane-properties'});
    assert.doesNotMatch( app.element( '#properties-body' ).innerHTML, /data-sql-input/ );
    } );

test( 'La consola muestra el resultado aunque la instrucción no cambie ninguna fila', async () => {
    const { applicationHarness } = await import( './support/application.js' );
    const app = await applicationHarness( 500 );

    await app.click({action: 'example'});
    await app.click({action: 'sql-console'});
    app.change( {sqlInput: ''}, 'UPDATE Socio SET nombre = nombre WHERE id_socio = -1' );
    await app.click({action: 'sql-run'});
    assert.match( app.element( '#properties-body' ).innerHTML, /0 registros actualizados en Socio\./ );
    } );
