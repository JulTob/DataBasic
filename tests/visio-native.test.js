import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { emptyDocument, exampleDocument } from '../src/domain/model.js';
import { buildVisioNativeKit } from '../src/io/visio-native.js';
import { readStoredZip, zipText } from './support/zip.js';

function accessHeader() {
    const page = new Uint8Array( 4096 );
    page.set( new TextEncoder().encode( 'Standard ACE DB' ), 4 );
    return page;
    }

function kitFor( model ) {
    return readStoredZip( buildVisioNativeKit( model, accessHeader() ) );
    }

function collection( items ) {
    return {Count: items.length, Item: index => items[index - 1]};
    }

function nativeDrawing( model ) {
    const tables = model.tables.map( (table, index) => ({
        ID: index + 1,
        Characters: {Text: table.name},
        Master: {NameU: 'Entity'},
        Shapes: collection( table.columns.map( column => ({
            Characters: {Text: column.name},
            Shapes: collection( [] )
            }) ) )
        }) );
    const shapeFor = id => tables[model.tables.findIndex( table => table.id === id )];
    const edges = model.relationships.map( relation => ({
        OneD: true,
        Connects: collection( [
            {FromCell: {NameU: 'BeginX'}, ToSheet: shapeFor( relation.parentId )},
            {FromCell: {NameU: 'EndX'}, ToSheet: shapeFor( relation.childId )}
            ] )
        }) );
    return [...tables, ...edges];
    }

// Exercise the actual self-contained JScript through doubles for the Windows
// host. This checks acceptance and cancellation, not the Office COM installation.
function runBridge(
        source,
        shapes,
        answers
        ) {
    const history = {messages: [], outputs: [], template: '', dsn: []};
    const doc = {
        Pages: collection( [{Shapes: collection( shapes )}] ),
        SaveAs: name => history.outputs.push( name )
        };
    const automation = {
        'Visio.Application': {
            Version: '14.0',
            Documents: {Add: name => {
                history.template = name;
                return doc;
                }}
            },
        'WScript.Shell': {
            Popup: (message, seconds, title, buttons) => {
                history.messages.push( message );
                return buttons === 1 ? answers.shift() : 1;
                }
            },
        'Scripting.FileSystemObject': {
            GetParentFolderName: () => 'C:/Práctica',
            BuildPath: (base, name) => base + '/' + name,
            GetTempName: () => 'estudio.tmp',
            GetBaseName: () => 'estudio',
            CreateFolder: path => ({Path: path}),
            FileExists: path => path.endsWith( '.accdb' ),
            CreateTextFile: () => ({
                WriteLine: text => history.dsn.push( text ),
                Close: () => {}
                })
            }
        };
    vm.runInNewContext( source, {
        ActiveXObject: function( name ) { return automation[name]; },
        WScript: {ScriptFullName: 'CrearModelo.js', Quit: code => assert.fail( 'WSH exit ' + code )}
        } );
    return history;
    }

test( 'native Visio transfer carries the ACE catalog, project-specific dictionary and Windows bridge', () => {
    const model = exampleDocument();
    model.tables[0].name = 'Barco "$&" (Á)';
    const kit = kitFor( model );
    assert.deepEqual( kit['Origen.accdb'], accessHeader() );
    assert.ok( zipText( kit['Diccionario.txt'] ).includes( model.tables[0].name ) );
    assert.ok( zipText( kit['LEEME.txt'] ).includes( 'IDEF1X' ) );
    const source = zipText( kit['CrearModelo.js'] );
    assert.doesNotMatch( source, /[^\x00-\x7f]/u );
    const run = runBridge( source, nativeDrawing( model ), [1] );
    assert.equal( run.template, 'DBMODL_M.VST' );
    assert.deepEqual( run.outputs, ['C:/Práctica/Visio-estudio/Modelo_nativo.vsd'] );
    assert.ok( run.dsn.includes( 'DBQ=C:/Práctica/Origen.accdb' ) );
    } );

test( 'a missing relationship, field or empty page cannot produce a native result', () => {
    const model = exampleDocument();
    const bridge = zipText( kitFor( model )['CrearModelo.js'] );
    for (const defect of ['edge', 'field', 'empty']) {
        const shapes = nativeDrawing( model );
        if (defect === 'edge') shapes.pop();
        if (defect === 'field') shapes[0].Shapes = collection( [] );
        if (defect === 'empty') shapes.length = 0;
        const run = runBridge( bridge, shapes, [1,2] );
        assert.deepEqual( run.outputs, [] );
        assert.ok( run.messages.some( message => message.includes( 'Faltan' ) ) );
        }
    } );

test( 'the native workflow rejects text disguised as Access and empty models', () => {
    assert.throws( () => buildVisioNativeKit( exampleDocument(), new Uint8Array( 5000 ) ), /accdb/ );
    assert.throws( () => buildVisioNativeKit( emptyDocument(), accessHeader() ), /tabla/ );
    } );
