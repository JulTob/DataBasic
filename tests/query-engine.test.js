import test from 'node:test';
import assert from 'node:assert/strict';
import { queryModel } from '../src/domain/query-engine.js';

function copyRegister() {
    const copies = {
        id: 'copies',
        name: 'Copia',
        kind: 'entity',
        columns: [
            {id: 'branch', name: 'sede', type: 'TEXT'},
            {id: 'copy', name: 'código', type: 'NUMBER(3,0)'},
            {id: 'room', name: 'sala', type: 'TEXT'},
            {id: 'free', name: 'disponible', type: 'BOOLEAN'},
            {id: 'price', name: 'precio', type: 'NUMBER(5,2)'}
            ]
        };
    const movements = {
        id: 'moves',
        name: 'Movimientos',
        kind: 'entity',
        columns: [
            {id: 'site', name: 'sede', type: 'TEXT'},
            {id: 'localId', name: 'copia', type: 'INTEGER'},
            {id: 'date', name: 'fecha', type: 'DATE'}
            ]
        };

    return {
        tables: [copies, movements],
        data: {
            copies: [
                {branch: '001', copy: '1', room: 'Sala A', free: 'sí', price: '3.50'},
                {branch: '002', copy: '1', room: 'Sala A', free: 'no', price: '2.05'},
                {branch: '002', copy: '2', room: '', free: '1', price: ''}
                ],
            moves: [
                {site: '002', localId: '1', date: '2026-11-18'}
                ]
            }
        };
    }

test( 'SQL trabaja con ambos componentes de una clave y conserva el orden solicitado', async () => {
    const result = await queryModel(
            copyRegister(),
            `SELECT C.sede, C.código, C.disponible, C.precio, M.fecha
             FROM Copia AS C LEFT JOIN Movimientos AS M
             ON C.sede = M.sede AND C.código = M.copia
             ORDER BY C.sede, C.código`
            );
    assert.deepEqual( result.columns, ['sede', 'código', 'disponible', 'precio', 'fecha'] );
    assert.deepEqual( result.rows, [
        ['001', 1, 1, 3.5, null],
        ['002', 1, 0, 2.05, '2026-11-18'],
        ['002', 2, 1, null, null]
        ] );
    } );

test( 'Proyección, nulos, CTE y agregación reproducen las filas actuales', async () => {
    const model = copyRegister();
    const sql = `-- ejemplo del catálogo
        WITH numeradas AS (
            SELECT sala FROM Copia WHERE sala IS NOT NULL
        ) SELECT sala, COUNT(*) AS ejemplares FROM numeradas GROUP BY sala;`;
    assert.deepEqual( (await queryModel( model, sql )).rows, [['Sala A', 2]] );
    model.data.copies.pop();
    model.data.copies[1].room = 'Sala B';
    assert.deepEqual( (await queryModel(
            model, 'SELECT DISTINCT sala FROM Copia ORDER BY sala'
            )).rows, [['Sala A'], ['Sala B']] );
    } );

test( 'Una tabla antigua sin filas conserva su encabezado en una consulta vacía', async () => {
    const model = copyRegister();
    delete model.data;
    const result = await queryModel( model, 'SELECT "código" AS identificador FROM Copia' );
    assert.deepEqual( result, {columns: ['identificador'], rows: []} );
    } );

test( 'El motor distingue espacios de nombres, identificadores entrecomillados y literales', async () => {
    const model = copyRegister();
    model.tables[0].namespace = 'estudio';
    model.tables[0].name = 'Copia "local"';
    const sql = `SELECT COUNT(*) AS "n;º" FROM "estudio"."Copia ""local"""; -- fin`;
    assert.deepEqual( await queryModel( model, sql ), {columns: ['n;º'], rows: [[3]]} );
    } );

test( 'Las vistas guardadas se consultan y las incompletas se explican al abrirlas', async () => {
    const model = copyRegister();
    model.tables.push(
            {id: 'catalog', kind: 'view', columns: [], name: 'Catalogo',
                definition: 'SELECT sede AS centro FROM Copia'},
            {id: 'draft', kind: 'view', columns: [], name: 'Borrador', definition: ''}
            );
    assert.deepEqual(
            (await queryModel( model, 'SELECT DISTINCT centro FROM Catalogo ORDER BY centro' )).rows,
            [['001'], ['002']]
            );
    await assert.rejects( queryModel( model, 'SELECT * FROM Borrador' ), /falta la definición/ );
    } );

test( 'Se rechazan escrituras, sentencias encadenadas y resultados excesivos', async () => {
    const model = copyRegister();
    const initial = structuredClone( model );
    for (const command of [
            'DELETE FROM Copia',
            'SELECT 1; SELECT 2',
            'WITH n AS (SELECT 1) DELETE FROM Copia RETURNING sede'
            ]) {
        await assert.rejects( queryModel( model, command ) );
        }
    const manyRows = `WITH RECURSIVE n(i) AS (
        SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i<5001
        ) SELECT i FROM n`;
    await assert.rejects( queryModel( model, manyRows ), /Resultado demasiado grande/ );
    assert.deepEqual( model, initial );
    } );

test( 'Un entero de 64 bits se conserva exactamente al mostrar el resultado', async () => {
    const result = await queryModel( copyRegister(), 'SELECT 9223372036854775807 AS grande' );
    assert.deepEqual( result.rows, [['9223372036854775807']] );
    } );
