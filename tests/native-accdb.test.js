import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {exampleDocument} from '../src/domain/model.js';
import {exportAccdb} from '../scripts/export-accdb.mjs';
import {nativeSchema} from '../scripts/access/schema.mjs';

function library() {
    const model = exampleDocument();
    const values = {
        Socio: {id_socio: '1', nombre: 'A & B'},
        Libro: {id_libro: '2', titulo: 'SQL'},
        Prestamo: {id_prestamo: ' 8 ', fecha: ' 2026-11-18 '}
        };

    for (const table of model.tables) {
        const row = {};
        for (const field of table.columns) {
            const relation = model.relationships.find(
                r => r.childId === table.id && r.mappings.some( p => p.childColumnId === field.id )
                );
            if (relation) {
                const parent = model.tables.find( p => p.id === relation.parentId );
                row[field.id] = parent.name === 'Socio' ? '1' : '2';
                }
            else if (values[table.name][field.name]) {
                row[field.id] = values[table.name][field.name];
                }
            if (field.name === 'nombre') model.physical.columns[field.id] = {caption: 'Nombre visible'};
            }
        model.data[table.id] = [row];
        }
    model.tables.push( {
        ...model.tables[0], id: crypto.randomUUID(), name: 'SociosActivos', kind: 'view',
        columns: [], indexes: [], alternateKeys: [],
        definition: 'SELECT S.nombre AS socio FROM Socio AS S WHERE S.id_socio > 0'
        } );
    return model;
    }

test( 'the local writer preserves real rows, field properties and enforced keys in an ACE database', async () => {
    const contents = await exportAccdb( JSON.stringify( library() ) );
    assert.equal( contents.toString( 'ascii', 4, 19 ), 'Standard ACE DB' );
    const folder = await mkdtemp( join( tmpdir(), 'databasic-readback-' ) );
    try {
        const path = join( folder, 'test.accdb' );
        await writeFile( path, contents );
        const jar = fileURLToPath( new URL( '../scripts/access/databasic-access.jar', import.meta.url ) );
        const probe = fileURLToPath( new URL( './support/ReadNativeAccess.java', import.meta.url ) );
        execFileSync( 'java', ['-cp', jar, probe, path] );
        }
    finally {
        await rm( folder, {recursive: true, force: true} );
        }
    } );

test( 'invalid child data aborts the complete export', async () => {
    const model = library();
    const relation = model.relationships[0];
    model.data[relation.childId][0][relation.mappings[0].childColumnId] = '123';
    await assert.rejects( exportAccdb( JSON.stringify( model ) ), /[Ii]ntegrity/ );
    } );

test( 'namespaces are refused explicitly and invalid documents cannot yield files', async () => {
    const model = library();
    model.tables[0].namespace = 'otra';
    assert.throws( () => nativeSchema( model ), /espacios de nombres/ );
    await assert.rejects( exportAccdb( '{}' ) );
    } );

test( 'the HTTP adapter returns ACE bytes to same-origin JSON requests and rejects external origins', async () => {
    const {Readable} = await import( 'node:stream' );
    const {sendAccess} = await import( '../scripts/serve.mjs' );

    async function post( origin ) {
        const request = Readable.from( [Buffer.from( JSON.stringify( library() ) )] );
        request.method = 'POST';
        request.headers = {host: '127.0.0.1:4173', origin, 'content-type': 'application/json'};
        const response = {
            writeHead( status, headers ) {this.status = status; this.headers = headers;},
            end( body ) {this.body = body;}
            };
        await sendAccess( request, response );
        return response;
        }

    const result = await post( 'http://127.0.0.1:4173' );
    assert.equal( result.status, 200 );
    assert.equal( result.headers['Content-Type'], 'application/octet-stream' );
    assert.equal( result.body.toString( 'ascii', 4, 19 ), 'Standard ACE DB' );
    assert.equal( (await post( 'https://externo.example' )).status, 403 );
    } );

test( 'unsupported SELECT syntax and external sources do not produce misleading saved queries', () => {
    const model = library();
    const view = model.tables.at( -1 );
    for (const sql of [
        'SELECT * FROM UnaTablaDesconocida',
        'SELECT * FROM Socio UNION SELECT * FROM Libro',
        'SELECT * FROM (Socio AS S INNER JOIN Prestamo AS P ON S.id_socio = P.id_prestamo) LEFT JOIN Libro AS L ON P.id_prestamo = L.id_libro'
        ]) {
        view.definition = sql;
        assert.throws( () => nativeSchema( model ), /SELECT local/ );
        }
    } );
