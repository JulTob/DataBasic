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

test( 'El catálogo inicial conserva Chen, las claves y sus datos al reabrirlo', () => {
    const catalog = libraryDocument();
    const restored = parseDocument( serializeDocument( catalog ) );

    assert.deepEqual( restored, catalog );
    assert.deepEqual( conceptualStatus( restored ), [] );
    assert.deepEqual( validateDocument( restored ), [] );
    assert.deepEqual( dataStatus( restored ), [] );
    assert.deepEqual(
            restored.tables.map( table => table.name ).sort(),
            ['Autor', 'Autoria', 'Libro', 'LibroTema', 'Tema']
            );

    assert.deepEqual(
            restored.conceptual.relationships.map( relation => relation.name ).sort(),
            ['Escribe', 'Trata']
            );
    assert.deepEqual(
            restored.conceptual.entities.map( entity => entity.name ).sort(),
            ['Autor', 'Libro', 'Tema']
            );

    for (const [name, keys] of [
        ['Autoria', ['autor_id', 'libro_id']],
        ['LibroTema', ['libro_id', 'tema_id']]
        ]) {
        const link = restored.tables.find( table => table.name === name );
        const primary = link.columns.filter( field => field.primary );
        const parents = restored.relationships.filter( fk => fk.childId === link.id );
        assert.deepEqual( primary.map( field => field.name ).sort(), keys );
        assert.deepEqual(
                new Set( parents.flatMap( fk => fk.mappings.map( mapping => mapping.childColumnId ) ) ),
                new Set( primary.map( field => field.id ) )
                );
        }
    } );

test( 'El catálogo incluye coautoría, libros anónimos y clasificaciones múltiples', () => {
    const catalog = libraryDocument();
    const authorships = sampleRows( catalog, 'Autoria' );
    const topics = sampleRows( catalog, 'LibroTema' );
    const books = sampleRows( catalog, 'Libro' );

    assert.equal( authorships.filter( row => row.libro_id === '2' ).length, 2 );
    assert.ok( !authorships.some( row => row.libro_id === '4' ) );
    assert.equal( topics.filter( row => row.libro_id === '6' ).length, 2 );
    assert.deepEqual(
            new Set( topics.map( link => link.libro_id ) ),
            new Set( books.map( book => book.id ) )
            );
    } );

test( 'Las obras tienen títulos distintos, autores recurrentes y datos de su edición de referencia', () => {
    const catalog = libraryDocument();
    const books = sampleRows( catalog, 'Libro' );
    const authors = sampleRows( catalog, 'Autor' );
    const authorships = sampleRows( catalog, 'Autoria' );

    assert.ok( books.length >= 60 );
    assert.equal( new Set( books.map( book => book.titulo ) ).size, books.length );
    assert.ok( books.some( book => book.isbn === null ) );
    assert.ok( books.some( book => book.isbn !== null ) );

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

    for (const {isbn} of books.filter( book => book.isbn !== null )) {
        assert.match( isbn, /^[0-9]{13}$/ );
        const sum = [...isbn].reduce(
                (total, digit, index) => total + Number( digit ) * (index % 2 === 0 ? 1 : 3),
                0
                );
        assert.equal( sum % 10, 0, isbn );
        }
    } );

test( 'Los temas distinguen física, probabilidad, señales y humanidades', () => {
    const catalog = libraryDocument();
    const subjects = sampleRows( catalog, 'Tema' );
    const books = sampleRows( catalog, 'Libro' );
    const links = sampleRows( catalog, 'LibroTema' );

    for (const [title, subjectName] of [
        ['The Feynman Lectures on Physics', 'Física'],
        ['Foundations of the Theory of Probability', 'Probabilidad y estadística'],
        ['New Horizons in Geometry', 'Matemáticas'],
        ['Signals and Systems', 'Ingeniería de señales'],
        ['Lazarillo de Tormes', 'Literatura']
        ]) {
        const {id: subject} = subjects.find( item => item.nombre === subjectName );
        const {id: book} = books.find( item => item.titulo === title );
        assert.ok( links.some( link => link.libro_id === book && link.tema_id === subject ), title );
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
