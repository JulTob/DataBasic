import assert from 'node:assert/strict';
import test from 'node:test';
import {libraryDocument} from '../src/domain/library.js';
import {conceptualStatus, setDiagramMode, validateDocument} from '../src/domain/model.js';
import {dataStatus} from '../src/domain/data.js';
import {parseDocument, serializeDocument} from '../src/domain/serialization.js';
import {buildDiagramScene} from '../src/ui/scene.js';

function sampleRows(
        model,
        tableName
        ) {
    const table = model.tables.find( item => item.name === tableName );

    return model.data[table.id].map( row => Object.fromEntries(
            table.columns.map( field => [field.name, row[field.id] ?? null] )
            ) );
    }

test( 'El catálogo inicial conserva Chen, las claves y las existencias al reabrirlo', () => {
    const catalog = libraryDocument();
    const restored = parseDocument( serializeDocument( catalog ) );

    assert.deepEqual( restored, catalog );
    assert.deepEqual( conceptualStatus( restored ), [] );
    assert.deepEqual( validateDocument( restored ), [] );
    assert.deepEqual( dataStatus( restored ), [] );
    assert.deepEqual(
            restored.tables.map( table => table.name ).sort(),
            ['Autor', 'Autoria', 'Campus', 'CampusMateria', 'Edicion', 'Ejemplar', 'Libro', 'LibroMateria', 'Materia']
            );

    const authorship = restored.tables.find( table => table.name === 'Autoria' );
    assert.deepEqual(
            authorship.columns.filter( field => field.primary ).map( field => field.name ).sort(),
            ['autor_id', 'libro_id']
            );
    assert.equal( restored.conceptual.entities.length, 6 );
    assert.equal( restored.conceptual.relationships.length, 6 );
    } );

test( 'Las filas distinguen conteo, división, duplicados, nulos y reunión externa', () => {
    const catalog = libraryDocument();
    const copies = sampleRows( catalog, 'Ejemplar' );
    const editions = sampleRows( catalog, 'Edicion' );
    const authorships = sampleRows( catalog, 'Autoria' );
    const shelves = edition => copies
        .filter( row => row.edicion_id === edition )
        .map( row => row.estante );

    assert.deepEqual( shelves( '11' ), ['A', 'A', 'B', 'B'] );
    assert.deepEqual( shelves( '21' ), ['A'] );
    assert.deepEqual( shelves( '41' ), ['B'] );
    assert.ok( editions.some( edition => shelves( edition.id ).length === 0 ) );
    assert.ok( editions.some( edition => edition.isbn === null ) );
    assert.ok( editions.some( edition => edition.isbn !== null ) );
    assert.equal( authorships.filter( row => row.libro_id === '2' ).length, 2 );
    assert.ok( !authorships.some( row => row.libro_id === '4' ) );
    } );

test( 'Cuatro campus comparten obras y materias y tienen colecciones distintas', () => {
    const catalog = libraryDocument();
    const campuses = sampleRows( catalog, 'Campus' );
    const copies = sampleRows( catalog, 'Ejemplar' );
    const profiles = sampleRows( catalog, 'CampusMateria' );
    const classifications = sampleRows( catalog, 'LibroMateria' );
    const editions = sampleRows( catalog, 'Edicion' );
    const campusesWith = id => new Set(
            copies.filter( copy => copy.edicion_id === id ).map( copy => copy.campus_id )
            );

    assert.deepEqual(
            campuses.map( campus => campus.nombre ),
            ['Altea', 'Elche', 'Orihuela', 'Sant Joan d’Alacant']
            );
    assert.deepEqual(
            editions.filter( edition => campusesWith( edition.id ).size === campuses.length )
                .map( edition => edition.id ),
            ['11']
            );
    assert.deepEqual( campusesWith( '111' ), new Set( ['2', '3'] ) );
    assert.deepEqual( campusesWith( '12' ), new Set() );
    assert.equal( classifications.filter( link => link.libro_id === '6' ).length, 2 );
    assert.equal( profiles.filter( link => link.materia_id === '4' ).length, 3 );

    for (const book of sampleRows( catalog, 'Libro' )) {
        assert.ok( classifications.some( link => link.libro_id === book.id ) );
        }
    for (const campus of campuses) {
        assert.ok( profiles.some( link => link.campus_id === campus.id ) );
        }
    } );

test( 'Un recuento de ejemplares y uno de obras dan resultados diferentes en dos campus', () => {
    const catalog = libraryDocument();
    const copies = sampleRows( catalog, 'Ejemplar' );
    const editions = sampleRows( catalog, 'Edicion' );
    const bookForEdition = new Map( editions.map( item => [item.id, item.libro_id] ) );

    const totals = sampleRows( catalog, 'Campus' ).map( campus => {
        const holdings = copies.filter( item => item.campus_id === campus.id );
        const uniqueBooks = new Set( holdings.map( item => bookForEdition.get( item.edicion_id ) ) );
        return [campus.nombre, holdings.length, uniqueBooks.size];
        } );

    assert.deepEqual( totals, [
        ['Altea', 22, 21],
        ['Elche', 25, 25],
        ['Orihuela', 22, 22],
        ['Sant Joan d’Alacant', 19, 18]
        ] );
    } );

test( 'Cada obra distinta dispone de edición y ejemplar; los autores pueden volver a aparecer', () => {
    const catalog = libraryDocument();
    const books = sampleRows( catalog, 'Libro' );
    const editions = sampleRows( catalog, 'Edicion' );
    const copies = sampleRows( catalog, 'Ejemplar' );
    const authors = sampleRows( catalog, 'Autor' );
    const authorships = sampleRows( catalog, 'Autoria' );
    const booksWithCopies = new Set( copies.map( copy =>
        editions.find( edition => edition.id === copy.edicion_id ).libro_id
        ) );

    assert.ok( books.length >= 60 );
    assert.equal( new Set( books.map( book => book.titulo ) ).size, books.length );
    assert.deepEqual( booksWithCopies, new Set( books.map( book => book.id ) ) );

    for (const name of [
        'J. Robert Oppenheimer',
        'Alan V. Oppenheim',
        'Richard P. Feynman',
        'Andrei N. Kolmogorov',
        'Tom M. Apostol'
        ]) {
        const author = authors.find( person => person.nombre === name );
        assert.ok( author, name );
        const works = authorships.filter( link => link.autor_id === author.id );
        assert.ok( works.length >= 2, name );
        }

    for (const {isbn} of editions.filter( edition => edition.isbn !== null )) {
        assert.match( isbn, /^[0-9]{13}$/ );
        const sum = [...isbn].reduce(
                (total, digit, index) => total + Number( digit ) * (index % 2 === 0 ? 1 : 3),
                0
                );
        assert.equal( sum % 10, 0, isbn );
        }
    } );

test( 'Las materias distinguen física, probabilidad, señales y humanidades', () => {
    const catalog = libraryDocument();
    const subjects = sampleRows( catalog, 'Materia' );
    const books = sampleRows( catalog, 'Libro' );
    const links = sampleRows( catalog, 'LibroMateria' );

    for (const [title, subjectName] of [
        ['The Feynman Lectures on Physics', 'Física'],
        ['Foundations of the Theory of Probability', 'Probabilidad y estadística'],
        ['New Horizons in Geometry', 'Matemáticas'],
        ['Signals and Systems', 'Ingeniería de señales'],
        ['Lazarillo de Tormes', 'Literatura']
        ]) {
        const {id: subject} = subjects.find( item => item.nombre === subjectName );
        const {id: book} = books.find( item => item.titulo === title );
        assert.ok( links.some( link => link.libro_id === book && link.materia_id === subject ), title );
        }
    } );

test( 'Los elementos del catálogo tienen espacio propio en Chen y en el relacional', () => {
    const catalog = libraryDocument();

    for (const mode of ['chen', 'relational']) {
        const {nodes} = buildDiagramScene( setDiagramMode( catalog, mode ) );

        for (const [index, a] of nodes.entries()) {
            for (const b of nodes.slice( index + 1 )) {
                assert.ok(
                        a.x + a.width <= b.x || b.x + b.width <= a.x
                            || a.y + a.height <= b.y || b.y + b.height <= a.y,
                        `Se solapan ${a.id} y ${b.id} en ${mode}.`
                        );
                }
            }
        }
    } );
