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
    for (const table of catalog.tables.filter( item => item.name !== 'Campus' )) {
        assert.ok( catalog.data[table.id].length >= 8 && catalog.data[table.id].length <= 16, table.name );
        }

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
