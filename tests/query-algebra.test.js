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
    const genres = await queryModel( model, compileAlgebra( 'π[genero](Libro)', model ) );
    allRowsMatch( genres, await queryModel( model, 'SELECT DISTINCT genero FROM Libro' ) );
    assert.ok( genres.rows.length > 1 && genres.rows.length < 65 );
    const selected = await queryModel(
            model,
            compileAlgebra( 'π[id](σ[isbn IS NULL AND (anio_edicion < 1700 OR anio_edicion = 1929)](Libro))', model )
            );
    const reference = await queryModel(
            model,
            'SELECT DISTINCT id FROM Libro WHERE isbn IS NULL AND (anio_edicion < 1700 OR anio_edicion = 1929)'
            );
    allRowsMatch( selected, reference );
    assert.ok( [2, 3].every( id => selected.rows.some( row => row[0] === id ) ) );
    } );

test( 'La división encuentra los libros que tratan dos temas y admite un divisor vacío', async () => {
    const model = libraryDocument();
    const pairs = 'π[libro_id, tema_id](LibroTema)';
    const both = 'π[tema_id](σ[tema_id = 1 OR tema_id = 2](LibroTema))';
    const covered = await queryModel( model, compileAlgebra( '÷(' + pairs + ', ' + both + ')', model ) );
    const reference = await queryModel(
            model,
            'SELECT libro_id FROM LibroTema WHERE tema_id IN (1, 2) GROUP BY libro_id '
                + 'HAVING COUNT(DISTINCT tema_id) = 2'
            );
    allRowsMatch( covered, reference );
    assert.ok( covered.rows.some( ([id]) => id === 2 ) );

    const empty = 'π[tema_id](σ[tema_id = 0](LibroTema))';
    const vacuous = await queryModel( model, compileAlgebra( '÷(' + pairs + ', ' + empty + ')', model ) );
    allRowsMatch( vacuous, await queryModel( model, 'SELECT DISTINCT libro_id FROM LibroTema' ) );
    } );

test( 'El reto de cobertura por dos claves externas se mantiene al ampliar la biblioteca', async () => {
    const model = libraryDocument();
    const table = name => model.tables.find( item => item.name === name );
    const field = (table, name) => table.columns.find( item => item.name === name ).id;
    const books = table( 'Libro' );
    const topics = table( 'Tema' );
    const links = table( 'LibroTema' );
    const bookKey = field( books, 'id' );
    const topicKey = field( topics, 'id' );
    const bookRef = field( links, 'libro_id' );
    const topicRef = field( links, 'tema_id' );

    // This model catalogs literature and fine arts; some books span both subjects.
    const selected = new Set( ['1', '2'] );
    model.data[topics.id] = model.data[topics.id].filter( row => selected.has( row[topicKey] ) );
    model.data[links.id] = model.data[links.id].filter( row => selected.has( row[topicRef] ) );

    async function verifyCoverage() {
        const challenges = compatibleChallenges( model );
        assert.deepEqual(
                new Set( challenges.map( item => item.family ) ),
                new Set( algebraOperators.map( item => item.id ) )
                );
        const exercise = challenges.find( item =>
            item.id.startsWith( 'divide:coverage-' ) && item.prompt.includes( 'registros de Tema' )
            );
        assert.ok( exercise );
        const expected = await queryModel(
                model,
                'SELECT libro_id FROM LibroTema GROUP BY libro_id HAVING COUNT(DISTINCT tema_id) = 2'
                );
        assert.ok( expected.rows.some( ([id]) => id === 2 ) );
        allRowsMatch( await queryModel( model, exercise.sql ), expected );
        allRowsMatch( await queryModel( model, compileAlgebra( exercise.algebra, model ) ), expected );
        }

    await verifyCoverage();
    for (let i = 0; i < 200; i++) {
        const id = String( 1000 + i );
        model.data[books.id].push( {...model.data[books.id][0], [bookKey]: id} );
        model.data[links.id].push( {[bookRef]: id, [topicRef]: '1'} );
        }
    await verifyCoverage();
    } );

test( 'Los retos del catálogo recuperan los autores y temas de un título', async () => {
    const model = libraryDocument();
    const exercises = compatibleChallenges( model );
    for (const [role, names] of [
        ['autores', ['Antonio Machado', 'Manuel Machado']],
        ['temas', ['Literatura', 'Bellas artes']]
        ]) {
        const exercise = exercises.find( item => item.id.startsWith( 'join:biblioteca-' + role ) );
        assert.ok( exercise );
        assert.match( exercise.prompt, /La Lola se va a los puertos/ );
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

test( 'La reunión externa conserva el libro sin autor conocido y la reunión interna lo descarta', async () => {
    const model = libraryDocument();
    const expression = 'π[Libro.titulo](σ[Autoria.autor_id IS NULL]('
        + '⟕[Libro.id = Autoria.libro_id](Libro, Autoria)))';
    allRowsMatch(
        await queryModel( model, compileAlgebra( expression, model ) ),
        {columns: ['titulo'], rows: [['Lazarillo de Tormes']]}
        );
    allRowsMatch(
        await queryModel( model, compileAlgebra( expression.replace( '⟕', '⋈' ), model ) ),
        {columns: ['titulo'], rows: []}
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
        ['⋈[id = id](Autor, Libro)', /ambiguo/],
        ['ℱ[; SUM(titulo) AS importe](Libro)', /numérico/],
        ['÷(π[titulo](Libro), π[nombre](Tema))', /divisor/],
        ['σ[id = 1; DROP TABLE Libro](Libro)', /expresión/],
        ['π[titulo](Libro) SELECT 1', /expresión/],
        ['ρ[id ← titulo](Libro)', /repetido/]
        ]) {
        assert.throws( () => compileAlgebra( input, model ), message );
        }
    } );
