import test from 'node:test';
import assert from 'node:assert/strict';
import * as domain from '../src/domain/model.js';
import { dataStatus } from '../src/domain/data.js';
import {
    fillWithSampleData,
    sampleData
    } from '../src/sql/sample.js';
import { runSql } from '../src/sql/console.js';
import {
    exampleFolders,
    readExample
    } from './support/examples.js';

const filenames = await exampleFolders();

async function openExample( name ) {
    return readExample( name );
    }

function tableRows(
        model,
        name
        ) {
    const table = model.tables.find( item => item.name === name );

    return {table, rows: domain.documentData( model )[table.id] || []};
    }

function columnValues(
        model,
        tableName,
        columnName
        ) {
    const {table, rows} = tableRows( model, tableName );
    const column = table.columns.find( item => item.name === columnName );

    return rows.map( row => row[column.id] );
    }

test( 'Todos los ejemplos traen filas de ejemplo que cumplen las reglas de sus tablas', async () => {
    for (const name of filenames) {
        const model = await openExample( name );
        const filled = model.tables.filter( table => table.kind === 'entity' && tableRows( model, table.name ).rows.length );

        assert.ok( filled.length >= 3, `${name}: tablas con filas` );
        assert.deepEqual( dataStatus( model ).map( issue => issue.message ), [], `${name}: sin incidencias` );
        }
    } );

test( 'Las subclases reparten las filas de su superclase según la especialización', async () => {
    const lonja = await openExample( 'curso-lonja' );
    const credit = new Set( columnValues( lonja, 'Credito', 'Comprador_cod_comprador' ) );
    const cash = new Set( columnValues( lonja, 'Contado', 'Comprador_cod_comprador' ) );
    const buyers = columnValues( lonja, 'Comprador', 'cod_comprador' );

    assert.equal( [...credit].filter( code => cash.has( code ) ).length, 0, 'disjunta: nadie está en las dos' );
    assert.deepEqual( [...credit, ...cash].sort(), [...buyers].sort(), 'total: todos están en alguna' );

    const estate = await openExample( 'curso-inmobiliaria' );
    const people = columnValues( estate, 'Persona', 'codigo' );
    const covered = new Set( [...columnValues( estate, 'Cliente', 'Persona_codigo' ), ...columnValues( estate, 'Trabajador', 'Persona_codigo' )] );

    assert.equal( covered.size, people.length, 'solapada y total: cada persona es cliente, trabajador o ambas' );
    } );

test( 'Los datos generados sirven para consultas con combinaciones y derivados calculados', async () => {
    const lonja = await openExample( 'curso-lonja' );
    const joined = runSql( lonja, `
        SELECT b.nombre, e.nombre, Sum(l.kilos_total) AS kilos
        FROM (Lote AS l INNER JOIN Barco AS b ON l.barco_matricula = b.matricula)
             INNER JOIN Especie AS e ON l.especie_cod_especie = e.cod_especie
        GROUP BY b.nombre, e.nombre` ).outputs[0];

    assert.equal( joined.kind, 'rows', joined.message );
    assert.ok( joined.rows.length >= 3 );

    const derived = runSql( lonja, 'SELECT Count(*) FROM Lote WHERE Abs(precio_total_salida - Round(kilos_total * precio_kg_salida, 2)) > 0.01' ).outputs[0];

    assert.deepEqual( derived.rows, [[0]], 'precio_total_salida = kilos_total × precio_kg_salida' );

    const periods = runSql( lonja, 'SELECT Count(*) FROM Faena WHERE fecha_fin < fecha_inicio' ).outputs[0];

    assert.deepEqual( periods.rows, [[0]], 'el CHECK de la faena se cumple' );
    } );

test( 'El generador es determinista y no toca las tablas que ya tienen filas', async () => {
    const empty = domain.exampleDocument();

    assert.deepEqual( sampleData( empty ), sampleData( empty ), 'misma semilla, mismas filas' );

    const socio = empty.tables.find( table => table.name === 'Socio' );
    const own = [{[socio.columns[0].id]: '99', [socio.columns[1].id]: 'Mía', [socio.columns[2].id]: ''}];
    const filled = fillWithSampleData( domain.setDataRows( empty, socio.id, own ) );

    assert.deepEqual( domain.documentData( filled )[socio.id], own );
    assert.ok( domain.documentData( filled )[empty.tables.find( table => table.name === 'Libro' ).id].length === 8 );
    assert.deepEqual( dataStatus( filled ), [] );

    const dni = columnValues( await openExample( 'curso-videoclub' ), 'Cliente', 'dni' );

    assert.ok( dni.every( value => /^\d{8}[A-Z]$/.test( value ) && 'TRWAGMYFPDXBNJZSQVHLCKE'[Number( value.slice( 0, 8 ) ) % 23] === value[8] ), 'DNI con su letra' );
    } );
