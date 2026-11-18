import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { addTable, column, emptyDocument, exampleDocument } from '../src/domain/model.js';
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
        Master: {NameU: table.kind === 'view' ? 'View' : 'Entity'},
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

test( 'the native bridge requires each saved view and its declared projection', () => {
    const model = addTable( exampleDocument(), 'view' );
    const view = model.tables.pop();
    model.tables.unshift( view );
    view.name = 'Directorio';
    view.definition = 'SELECT id_socio AS codigo, nombre AS persona FROM Socio';
    view.columns = [
        {...column( 'codigo', 'INTEGER' ), required: true},
        column( 'persona', 'VARCHAR(60)' )
        ];

    const kit = kitFor( model );
    const bridge = zipText( kit['CrearModelo.js'] );
    const dictionary = zipText( kit['Diccionario.txt'] );
    assert.ok( dictionary.includes( [
        'VISTA Directorio',
        'codigo INTEGER · NOT NULL',
        'persona VARCHAR(60) · NULL',
        'SELECT del modelo:',
        view.definition
        ].join( '\r\n' ) ) );

    for (const defect of ['missing', 'wrong master', 'missing column']) {
        const drawing = nativeDrawing( model );
        if (defect === 'missing') drawing.shift();
        if (defect === 'wrong master') drawing[0].Master.NameU = 'Entity';
        if (defect === 'missing column') {
            drawing[0].Shapes = collection( [drawing[0].Shapes.Item( 1 )] );
            }
        const run = runBridge( bridge, drawing, [1, 2] );
        assert.deepEqual( run.outputs, [], defect );
        assert.ok( run.messages.some( message => message.includes( view.name ) ), defect );
        }

    const complete = runBridge( bridge, nativeDrawing( model ), [1] );
    assert.equal( complete.outputs.length, 1 );
    } );

test( 'views with columns inferred from the SELECT still need a native view shape', () => {
    const model = addTable( exampleDocument(), 'view' );
    const view = model.tables.at( -1 );
    view.definition = 'SELECT * FROM Socio';
    const bridge = zipText( kitFor( model )['CrearModelo.js'] );
    const drawing = nativeDrawing( model );

    assert.equal( runBridge( bridge, drawing, [1] ).outputs.length, 1 );
    drawing.splice( model.tables.indexOf( view ), 1 );
    assert.deepEqual( runBridge( bridge, drawing, [1, 2] ).outputs, [] );
    } );

test( 'the native workflow rejects text disguised as Access and empty models', () => {
    assert.throws( () => buildVisioNativeKit( exampleDocument(), new Uint8Array( 5000 ) ), /accdb/ );
    assert.throws( () => buildVisioNativeKit( emptyDocument(), accessHeader() ), /tabla/ );
    } );
