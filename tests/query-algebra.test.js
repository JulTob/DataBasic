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
    const reference = await queryModel( model, 'SELECT DISTINCT id FROM Edicion WHERE isbn IS NULL AND (anio < 1700 OR anio = 1929)' );
    allRowsMatch( isbn, reference );
    assert.ok( [21, 31].every( id => isbn.rows.some( row => row[0] === id ) ) );
    } );

test( 'La división comprueba todas las obligaciones y admite un divisor vacío', async () => {
    const model = libraryDocument();
    const offered = 'π[edicion_id, estante](Ejemplar)';
    const incomplete = await queryModel(
        model, compileAlgebra( '÷(' + offered + ', π[estante](Ejemplar))', model )
        );
    const allShelves = await queryModel( model,
        'SELECT edicion_id FROM Ejemplar GROUP BY edicion_id '
            + 'HAVING COUNT(DISTINCT estante) = (SELECT COUNT(DISTINCT estante) FROM Ejemplar)'
        );
    allRowsMatch( incomplete, allShelves );
    assert.ok( incomplete.rows.some( ([id]) => id === 11 ) );
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

test( 'El reto de los cuatro campus sigue disponible al añadir doscientos ejemplares al fondo', async () => {
    const model = libraryDocument();
    const table = model.tables.find( item => item.name === 'Ejemplar' );
    const register = table.columns.find( column => column.name === 'registro' );
    const examples = model.data[table.id];
    const source = examples.at( -1 );
    for (let i = 0; i < 200; i++) {
        examples.push( {...source, [register.id]: String( 700000 + i )} );
        }

    const challenges = compatibleChallenges( model );
    assert.deepEqual(
        new Set( challenges.map( item => item.family ) ),
        new Set( algebraOperators.map( item => item.id ) )
        );
    const division = challenges.find( item =>
        item.id.startsWith( 'divide:coverage-' ) && item.prompt.includes( 'registros de Campus' )
        );
    assert.ok( division );
    allRowsMatch(
        await queryModel( model, compileAlgebra( division.algebra, model ) ),
        {columns: ['edicion_id'], rows: [[11]]}
        );
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

test( 'El reto de autores cuenta obras distintas con coautoría aunque se duplique una acreditación', async () => {
    const model = libraryDocument();
    const credits = model.tables.find( item => item.name === 'Autoria' );
    const rows = model.data[credits.id];
    rows.push( {...rows[0]} );
    const exercise = compatibleChallenges( model ).find( item => item.id.startsWith( 'group:biblioteca-obras-' ) );
    assert.ok( exercise );
    const actual = await queryModel( model, compileAlgebra( exercise.algebra, model ) );
    allRowsMatch( actual, await queryModel( model, exercise.sql ) );

    // Count distinct titled records directly from the three datasheets.
    const table = name => model.tables.find( item => item.name === name );
    const field = (entity, name) => entity.columns.find( column => column.name === name ).id;
    const authors = table( 'Autor' );
    const books = table( 'Libro' );
    const ids = new Set( model.data[books.id].map( row => row[field( books, 'id' )] ) );
    const expected = [];
    for (const author of model.data[authors.id]) {
        const authored = new Set();
        for (const row of rows) {
            const book = row[field( credits, 'libro_id' )];
            if (row[field( credits, 'autor_id' )] === author[field( authors, 'id' )] && ids.has( book )) {
                authored.add( book );
                }
            }
        if (authored.size > 1) {
            expected.push( [author[field( authors, 'nombre' )], authored.size] );
            }
        }
    allRowsMatch( actual, {columns: ['nombre', 'obras'], rows: expected} );
    const totals = new Map( actual.rows );
    for (const [name, total] of [
        ['Richard P. Feynman', 5],
        ['J. Robert Oppenheimer', 2],
        ['Tom M. Apostol', 4],
        ['Andrei N. Kolmogorov', 2]
        ]) {
        assert.equal( totals.get( name ), total, name );
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

test( 'El producto elige dos campos categóricos si las claves producirían demasiadas parejas', async () => {
    const model = {tables: [], relationships: [], data: {}};
    for (const [name, category] of [['Fondo', 'idioma'], ['Estantes', 'sala']]) {
        model.tables.push( {
            id: name, kind: 'entity', name,
            columns: [{id: 'id', name: 'id', type: 'INT'}, {id: 'valor', name: category, type: 'VARCHAR(5)'}]
            } );
        model.data[name] = Array.from( {length: 100}, (_, i) => ({id: String( i ), valor: i % 2 ? 'x' : 'y'} ) );
        }
    const exercise = compatibleChallenges( model ).find( item => item.family === 'product' );
    assert.ok( exercise );
    const result = await queryModel( model, compileAlgebra( exercise.algebra, model ) );
    allRowsMatch( result, {columns: ['idioma', 'sala'], rows: [['x', 'x'], ['x', 'y'], ['y', 'x'], ['y', 'y']]} );
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
