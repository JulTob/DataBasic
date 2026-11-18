import test from 'node:test';
import assert from 'node:assert/strict';
import {libraryDocument} from '../src/domain/library.js';
import {algebraOperators, compileAlgebra} from '../src/domain/query-algebra.js';
import {compatibleChallenges, newChallenge} from '../src/domain/query-challenges.js';
import {queryModel} from '../src/domain/query-engine.js';

function resultBag( result ) {
    return {
        columns: result.columns,
        rows: result.rows.map( row => JSON.stringify( row ) ).sort()
        };
    }

function allRowsMatch( actual, expected ) {
    assert.deepEqual( resultBag( actual ), resultBag( expected ) );
    }

test( 'El catálogo inicial genera y resuelve todas las familias y agregados de la paleta en SQLite', async () => {
    const model = libraryDocument();
    const exercises = compatibleChallenges( model );

    assert.deepEqual(
        new Set( exercises.map( item => item.family ) ),
        new Set( algebraOperators.map( item => item.id ) )
        );
    assert.equal( new Set( exercises.map( item => item.id ) ).size, exercises.length );
    for (const fn of ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX']) {
        assert.ok( exercises.some( item => item.family === 'group' && item.algebra.includes( fn + '(' ) ) );
        }
    for (const exercise of exercises) {
        const [algebra, reference] = await Promise.all( [
            queryModel( model, compileAlgebra( exercise.algebra, model ) ),
            queryModel( model, exercise.sql )
            ] );
        assert.ok( algebra.rows.length > 0, exercise.prompt );
        allRowsMatch( algebra, reference );
        }
    } );

test( 'La proyección elimina duplicados y la selección distingue texto, NULL y disyunción', async () => {
    const model = libraryDocument();
    const shelf = await queryModel( model, compileAlgebra( 'π[estante](Ejemplar)', model ) );
    allRowsMatch( shelf, {columns: ['estante'], rows: [['A'], ['B']]} );
    const isbn = await queryModel(
        model,
        compileAlgebra( 'π[id](σ[isbn IS NULL AND (anio < 1700 OR anio = 1929)](Edicion))', model )
        );
    allRowsMatch( isbn, {columns: ['id'], rows: [[21], [31]]} );
    } );

test( 'La división comprueba todas las obligaciones y admite un divisor vacío', async () => {
    const model = libraryDocument();
    const offered = 'π[edicion_id, estante](Ejemplar)';
    const incomplete = await queryModel(
        model, compileAlgebra( '÷(' + offered + ', π[estante](Ejemplar))', model )
        );
    allRowsMatch( incomplete, {columns: ['edicion_id'], rows: [[11]]} );
    const vacuous = await queryModel(
        model, compileAlgebra( "÷(" + offered + ", π[estante](σ[estante = 'Z'](Ejemplar)))", model )
        );
    allRowsMatch( vacuous, await queryModel( model, 'SELECT DISTINCT edicion_id FROM Ejemplar' ) );
    } );

test( 'Una división descubre desde ambas FK las ediciones disponibles en los cuatro campus', async () => {
    const model = libraryDocument();
    const exercise = compatibleChallenges( model ).find( item =>
        item.id.startsWith( 'divide:coverage-' ) && item.prompt.includes( 'registros de Campus' )
        );
    assert.ok( exercise, 'La biblioteca debe permitir el reto sin identificar tablas por su nombre en el generador.' );
    const expected = {columns: ['edicion_id'], rows: [[11]]};
    allRowsMatch( await queryModel( model, exercise.sql ), expected );
    allRowsMatch( await queryModel( model, compileAlgebra( exercise.algebra, model ) ), expected );
    } );

test( 'Los retos del catálogo relacionan nombres bibliográficos y campus con su referencia', async () => {
    const model = libraryDocument();
    const exercises = compatibleChallenges( model );
    for (const [role, names] of [
        ['autores', ['Antonio Machado', 'Manuel Machado']],
        ['campus', ['Altea', 'Elche', 'Orihuela', 'Sant Joan d’Alacant']]
        ]) {
        const exercise = exercises.find( item => item.id.startsWith( 'join:biblioteca-' + role ) );
        assert.ok( exercise );
        const expected = {columns: ['nombre'], rows: names.map( name => [name] )};
        allRowsMatch( await queryModel( model, compileAlgebra( exercise.algebra, model ) ), expected );
        allRowsMatch( await queryModel( model, exercise.sql ), expected );
        }
    } );

test( 'La reunión externa conserva una edición sin ejemplar y la reunión interna la descarta', async () => {
    const model = libraryDocument();
    const expression = 'π[Edicion.id](σ[Ejemplar.registro IS NULL]('
        + '⟕[Edicion.id = Ejemplar.edicion_id](Edicion, Ejemplar)))';
    allRowsMatch(
        await queryModel( model, compileAlgebra( expression, model ) ),
        {columns: ['id'], rows: [[12]]}
        );
    allRowsMatch(
        await queryModel( model, compileAlgebra( expression.replace( '⟕', '⋈' ), model ) ),
        {columns: ['id'], rows: []}
        );
    } );

test( 'Reconoce un diseño de alumno con claves compuestas, espacios, comillas y nombres distintos', async () => {
    const model = {
        tables: [
            {id: 'p', name: 'Depósito "N"', namespace: 'Sede A', kind: 'entity', columns: [
                {id: 'ap', name: 'zona', type: 'VARCHAR(8)'}, {id: 'bp', name: 'turno', type: 'INT'}
                ]},
            {id: 'c', name: 'Registro', namespace: 'Sede B', kind: 'entity', columns: [
                {id: 'ac', name: 'turno', type: 'VARCHAR(8)'}, {id: 'bc', name: 'zona', type: 'INT'}
                ]}
            ],
        data: {
            p: [{ap: 'A', bp: '2'}, {ap: 'B', bp: '2'}, {ap: 'A', bp: '1'}],
            c: [{ac: 'A', bc: '1'}, {ac: 'B', bc: '2'}]
            },
        relationships: [{id: 'pc', name: 'Cruce', parentId: 'p', childId: 'c', mappings: [
            {parentColumnId: 'ap', childColumnId: 'ac'}, {parentColumnId: 'bp', childColumnId: 'bc'}
            ]}]
        };
    const exercises = compatibleChallenges( model ).filter( exercise => ['join', 'natural'].includes( exercise.family ) );
    assert.equal( exercises.length, 2 );
    for (const exercise of exercises) {
        const expected = {columns: ['zona', 'turno'], rows: [['A', 1], ['B', 2]]};
        allRowsMatch( await queryModel( model, compileAlgebra( exercise.algebra, model ) ), expected );
        allRowsMatch( await queryModel( model, exercise.sql ), expected );
        }
    } );

test( 'Los esquemas vacíos y poco poblados tienen una salida finita', () => {
    const empty = {tables: [], data: {}, relationships: []};
    assert.deepEqual( compatibleChallenges( empty ), [] );
    assert.equal( newChallenge( empty ), null );
    const model = libraryDocument();
    const first = newChallenge( model, null, () => 0 );
    const second = newChallenge( model, first, () => 0 );
    assert.notEqual( first.family, second.family );
    } );

test( 'Explica errores de tipos, ambigüedad y operandos y conserva SELECT como única salida', () => {
    const model = libraryDocument();
    for (const [input, message] of [
        ['∪(π[titulo](Libro), π[id](Libro))', /dominios/],
        ['π[inexistente](Libro)', /desconocido/],
        ['⋈[id = id](Edicion, Libro)', /ambiguo/],
        ['ℱ[; SUM(titulo) AS importe](Libro)', /numérico/],
        ['÷(π[titulo](Libro), π[isbn](Edicion))', /divisor/],
        ['σ[id = 1; DROP TABLE Libro](Libro)', /expresión/],
        ['π[titulo](Libro) SELECT 1', /expresión/],
        ['ρ[id ← titulo](Libro)', /repetido/]
        ]) {
        assert.throws( () => compileAlgebra( input, model ), message );
        }
    } );
