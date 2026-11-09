import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    addDataRow,
    addRelationship,
    exampleDocument,
    removeColumn,
    removeDataRow,
    removeElement,
    setAlternateKey,
    setDataRows,
    setDiagramMode,
    updateColumn,
    updateDataCell,
    updateRelationship,
    validateDocument
    } from '../src/domain/model.js';
import { parseDocument } from '../src/domain/serialization.js';
import {
    cellProblem,
    dataInsertOrder,
    dataStatus
    } from '../src/domain/data.js';
import {
    exportAccessSQL,
    exportAccessVBA,
    exportAccessXML
    } from '../src/io/access.js';
import { buildDesignReport } from '../src/io/report.js';
import { renderProperties } from '../src/ui/properties.js';
import { applicationHarness } from './support/application.js';
import { unbalancedTag } from './support/xml.js';

/** The library example with two members, one book and one loan, keyed by column ids. */
function filledExample() {
    let model = exampleDocument();
    const [socio, prestamo, libro] = model.tables;
    const column = (table, name) => table.columns.find( item => item.name === name ).id;

    model = setDataRows( model, socio.id, [
        {[column( socio, 'id_socio' )]: '1', [column( socio, 'nombre' )]: 'Ana', [column( socio, 'email' )]: 'ana@ejemplo.es'},
        {[column( socio, 'id_socio' )]: '2', [column( socio, 'nombre' )]: 'Luis'}
        ] );
    model = setDataRows( model, libro.id, [
        {[column( libro, 'id_libro' )]: '10', [column( libro, 'titulo' )]: 'Quijote'}
        ] );
    model = setDataRows( model, prestamo.id, [
        {
            [column( prestamo, 'id_prestamo' )]: '100',
            [column( prestamo, 'fecha' )]: '2026-11-04',
            [column( prestamo, 'id_socio' )]: '1',
            [column( prestamo, 'id_libro' )]: '10'
            }
        ] );

    return model;
    }

test( 'rows are added, edited cell by cell, removed and saved with the document', () => {
    let model = exampleDocument();
    const socio = model.tables[0];
    const [id, nombre] = socio.columns;

    model = addDataRow( model, socio.id );
    model = addDataRow( model, socio.id );
    model = updateDataCell( model, socio.id, 0, id.id, '1' );
    model = updateDataCell( model, socio.id, 0, nombre.id, 'Ana' );
    model = updateDataCell( model, socio.id, 1, nombre.id, '  ' );

    assert.deepEqual( model.data[socio.id], [{[id.id]: '1', [nombre.id]: 'Ana'}, {[nombre.id]: '  '}] );
    assert.deepEqual( updateDataCell( model, socio.id, 1, nombre.id, '' ).data[socio.id][1], {} );
    assert.throws( () => updateDataCell( model, socio.id, 5, id.id, 'x' ), /ya no existe/ );
    assert.throws( () => updateDataCell( model, socio.id, 0, 'ghost', 'x' ), /columna ya no existe/ );

    const reopened = parseDocument( JSON.stringify( model ) );

    assert.equal( reopened.data[socio.id].length, 2 );
    assert.equal( removeDataRow( model, socio.id, 1 ).data[socio.id].length, 1 );
    assert.equal( removeDataRow( removeDataRow( model, socio.id, 1 ), socio.id, 0 ).data[socio.id], undefined );

    const older = structuredClone( model );

    delete older.data;
    assert.deepEqual( validateDocument( older ).filter( issue => issue.level === 'error' ), [] );

    const broken = structuredClone( model );

    broken.data.ghost = [{}];
    assert.throws( () => parseDocument( JSON.stringify( broken ) ), /tabla inexistente/ );

    const malformed = structuredClone( model );

    malformed.data[socio.id] = [{[id.id]: 5}];
    assert.throws( () => parseDocument( JSON.stringify( malformed ) ), /texto de hasta/ );
    } );

test( 'removing a column or a table drops the cells and rows that depended on them', () => {
    let model = filledExample();
    const socio = model.tables[0];
    const email = socio.columns.find( item => item.name === 'email' );

    model = removeColumn( model, socio.id, email.id );
    assert.equal( Object.values( model.data[socio.id][0] ).includes( 'ana@ejemplo.es' ), false );
    assert.equal( model.data[socio.id].length, 2 );

    const prestamo = model.tables[1];

    model = removeElement( model, model.relationships[0].id );
    model = removeElement( model, model.relationships[0].id );
    model = removeElement( model, prestamo.id );
    assert.equal( model.data[prestamo.id], undefined );
    } );

test( 'a cell is checked against its type, its domain and its obligation', () => {
    const column = (type, extra = {}) => ({id: 'c', name: 'c', type, required: false, primary: false, domain: null, ...extra});

    assert.equal( cellProblem( column( 'VARCHAR(5)' ), 'hola' ), null );
    assert.match( cellProblem( column( 'VARCHAR(5)' ), 'demasiado' ), /supera los 5 caracteres/ );
    assert.match( cellProblem( column( 'NUMBER' ), 'abc' ), /debe ser un número/ );
    assert.equal( cellProblem( column( 'NUMBER' ), '1.5' ), null, 'NUMBER without parameters admits decimals' );
    assert.match( cellProblem( column( 'NUMBER(3)' ), '1.5' ), /entero/ );
    assert.match( cellProblem( column( 'INTEGER' ), '1.5' ), /entero/ );
    assert.match( cellProblem( column( 'NUMBER(3)' ), '1234' ), /3 dígitos/ );
    assert.equal( cellProblem( column( 'NUMBER(5,2)' ), '123.45' ), null );
    assert.match( cellProblem( column( 'NUMBER(5,2)' ), '1.234' ), /2 decimales/ );
    assert.equal( cellProblem( column( 'DATE' ), '2026-02-28' ), null );
    assert.match( cellProblem( column( 'DATE' ), '2026-02-30' ), /AAAA-MM-DD/ );
    assert.match( cellProblem( column( 'DATE' ), '30/02/2026' ), /AAAA-MM-DD/ );
    assert.equal( cellProblem( column( 'BOOLEAN' ), 'sí' ), null );
    assert.match( cellProblem( column( 'BOOLEAN' ), 'quizá' ), /sí o no/ );
    assert.equal( cellProblem( column( 'NUMBER', {required: true} ), '' ), 'es obligatorio.' );
    assert.equal( cellProblem( column( 'NUMBER' ), '' ), null );
    assert.match( cellProblem( column( 'NUMBER', {domain: {minimum: 1, maximum: 9, values: [], check: ''}} ), '0' ), /mayor o igual que 1/ );
    assert.match( cellProblem( column( 'NUMBER', {domain: {minimum: 1, maximum: 9, values: [], check: ''}} ), '10' ), /menor o igual que 9/ );
    assert.match( cellProblem( column( 'VARCHAR(10)', {domain: {minimum: null, maximum: null, values: ['fijo', 'móvil'], check: ''}} ), 'otro' ), /uno de: fijo, móvil/ );
    } );

test( 'the datasheet reports duplicate keys, broken references and the rows that pass', () => {
    let model = filledExample();
    const [socio, prestamo, libro] = model.tables;
    const column = (table, name) => table.columns.find( item => item.name === name ).id;

    assert.deepEqual( dataStatus( model ), [], 'the filled example is consistent' );

    model = addDataRow( model, socio.id );
    model = updateDataCell( model, socio.id, 2, column( socio, 'id_socio' ), '1' );
    model = updateDataCell( model, socio.id, 2, column( socio, 'nombre' ), 'Otra Ana' );
    model = updateDataCell( model, prestamo.id, 0, column( prestamo, 'id_libro' ), '99' );
    model = updateColumn( model, prestamo.id, column( prestamo, 'fecha' ), {required: true} );
    model = addDataRow( model, prestamo.id );
    model = updateDataCell( model, prestamo.id, 1, column( prestamo, 'id_prestamo' ), '101' );
    model = setAlternateKey( model, libro.id, {name: 'AK_titulo', columns: [column( libro, 'titulo' )]} );
    model = addDataRow( model, libro.id );
    model = updateDataCell( model, libro.id, 1, column( libro, 'id_libro' ), '11' );
    model = updateDataCell( model, libro.id, 1, column( libro, 'titulo' ), 'Quijote' );

    const messages = dataStatus( model ).map( issue => issue.message );

    assert.ok( messages.includes( 'Socio, fila 3: repite la clave primaria de la fila 1 (1).' ) );
    assert.ok( messages.includes( 'Prestamo, fila 1: id_libro = 99 no existe en Libro.' ) );
    assert.ok( messages.includes( 'Prestamo, fila 2: fecha: es obligatorio.' ) );
    assert.ok( messages.includes( 'Libro, fila 2: repite la clave alternativa AK_titulo de la fila 1 (Quijote).' ) );
    assert.ok( messages.some( message => /Prestamo, fila 2: id_socio/.test( message ) === false ), 'an empty foreign key is not a broken reference' );

    const issue = dataStatus( model ).find( item => item.message.startsWith( 'Prestamo, fila 2: fecha' ) );

    assert.deepEqual( [issue.level, issue.code, issue.elementId, issue.rowIndex, issue.columnId], ['warning', 'data', prestamo.id, 1, column( prestamo, 'fecha' )] );
    } );

test( 'referenced tables are inserted before the tables that reference them', () => {
    let model = filledExample();

    assert.deepEqual( dataInsertOrder( model ).map( table => table.name ), ['Socio', 'Libro', 'Prestamo'] );

    model = addRelationship( model, model.tables[0].id, model.tables[0].id );
    assert.deepEqual( dataInsertOrder( model ).map( table => table.name ), ['Socio', 'Libro', 'Prestamo'], 'a self-reference does not block' );
    } );

test( 'the three Access files carry the rows in Access notation', () => {
    let model = filledExample();
    const socio = model.tables[0];

    model = updateRelationship( model, model.relationships[0].id, {onDelete: 'CASCADE'} );

    const sql = exportAccessSQL( model );

    assert.match( sql, /INSERT INTO \[Socio\] \(\[id_socio\], \[nombre\], \[email\]\) VALUES \(1, "Ana", "ana@ejemplo\.es"\);/ );
    assert.match( sql, /INSERT INTO \[Prestamo\] \(\[id_prestamo\], \[fecha\], \[id_socio\], \[id_libro\]\) VALUES \(100, #2026-11-04#, 1, 10\);/ );
    assert.ok( sql.indexOf( 'INSERT INTO [Libro]' ) < sql.indexOf( 'INSERT INTO [Prestamo]' ), 'parents first' );
    assert.ok( sql.indexOf( 'ADD CONSTRAINT' ) < sql.indexOf( 'INSERT INTO' ), 'after the relationships' );

    const vba = exportAccessVBA( model );

    assert.match( vba, /Private Sub CrearDatos\(db As DAO\.Database\)\n    ' Socio: 2 filas de ejemplo\n    db\.Execute "INSERT INTO \[Socio\] \(\[id_socio\], \[nombre\], \[email\]\) VALUES \(1, ""Ana"", ""ana@ejemplo\.es""\);", dbFailOnError/ );
    assert.match( vba, /CrearRelaciones db\n    CrearDatos db\n    CrearConsultas db/ );

    const xml = exportAccessXML( model );

    assert.equal( unbalancedTag( xml ), null );
    assert.ok( xml.includes( '<dataroot xmlns:od="urn:schemas-microsoft-com:officedata"><Socio><id_socio>1</id_socio><nombre>Ana</nombre><email>ana@ejemplo.es</email></Socio><Socio><id_socio>2</id_socio><nombre>Luis</nombre></Socio>' ) );
    assert.ok( xml.includes( '<fecha>2026-11-04T00:00:00</fecha>' ) );

    const quoted = updateDataCell( model, socio.id, 0, socio.columns[1].id, 'Ana "la lista" <3' );

    assert.match( exportAccessSQL( quoted ), /"Ana ""la lista"" <3"/ );
    assert.ok( exportAccessXML( quoted ).includes( '<nombre>Ana &quot;la lista&quot; &lt;3</nombre>' ) );
    } );

test( 'the memo lists the sample rows and their findings', () => {
    let model = filledExample();

    model = updateDataCell( model, model.tables[1].id, 0, model.tables[1].columns[3].id, '99' );

    const section = buildDesignReport( model ).sections.at( -1 );

    assert.equal( section.heading, 'Datos de ejemplo' );
    assert.equal( section.blocks[0].text, 'Socio (2 filas)' );
    assert.deepEqual( section.blocks[1].header, ['id_socio', 'nombre', 'email'] );
    assert.deepEqual( section.blocks[1].rows[1], ['2', 'Luis', ''] );
    assert.ok( section.blocks.at( -1 ).items.some( item => item.includes( 'id_socio = 99 no existe en Socio' ) ) );
    } );

test( 'the Hoja de datos panel shows the grid, the broken cells and the findings', () => {
    let model = setDiagramMode( filledExample(), 'tables' );
    const socio = model.tables[0];

    model = addDataRow( model, socio.id );
    model = updateDataCell( model, socio.id, 2, socio.columns[0].id, '1' );
    model = updateDataCell( model, socio.id, 2, socio.columns[2].id, 'x'.repeat( 101 ) );

    const html = renderProperties( model, {
        model,
        selectedId: socio.id,
        selectedColumnId: null,
        category: 'datasheet',
        tab: 'database',
        propertiesShown: true,
        tool: 'pointer',
        past: [],
        future: [],
        clipboard: null
        } );

    assert.match( html, /data-category="datasheet"[^>]*aria-pressed="true"/ );
    assert.match( html, /<th class="row-number">#<\/th><th>[\s\S]*id_socio\s*<small>NUMBER · req\.<\/small>/ );
    assert.equal( (html.match( /<input data-cell data-row="\d+"/g ) || []).length, 9 );
    assert.match( html, /<tr class="row-error">\s*<td class="row-number" title="Socio, fila 3: repite la clave primaria de la fila 1 \(1\)\."/ );
    assert.match( html, /<td class="cell-error"><input data-cell data-row="2"[^>]*data-col-id="[^"]+"[^>]*title="Socio, fila 3: email: supera los 100 caracteres de VARCHAR\(100\)\."/ );
    assert.match( html, /data-action="add-data-row"/ );
    assert.match( html, /data-action="remove-data-row" data-row="2"/ );
    assert.match( html, /<ul class="data-issues">/ );
    } );

test( 'the application adds, edits and removes sample rows in the Tablas view', async () => {
    const app = await applicationHarness( 500 );

    await app.click({action: 'example'});
    await app.click({mode: 'tables'});
    await app.flushTimers();

    let saved = JSON.parse( app.saved() );
    const socio = saved.tables[0];
    const existing = saved.data[socio.id];

    assert.equal( existing.length, 8, 'the built-in example opens with sample rows' );

    await app.click({select: socio.id});
    await app.click({category: 'datasheet'});
    await app.click({action: 'add-data-row'});
    await app.flushTimers();
    saved = JSON.parse( app.saved() );
    assert.deepEqual( saved.data[socio.id], [...existing, {}] );
    assert.match( app.element( '#properties-body' ).innerHTML, /es obligatorio/ );

    app.change( {cell: '', row: '8', colId: socio.columns[0].id}, '700', 'text' );
    app.change( {cell: '', row: '8', colId: socio.columns[1].id}, 'Ana', 'text' );
    await app.flushTimers();
    saved = JSON.parse( app.saved() );
    assert.deepEqual( saved.data[socio.id].at( -1 ), {[socio.columns[0].id]: '700', [socio.columns[1].id]: 'Ana'} );
    assert.match( app.element( '#properties-body' ).innerHTML, /cumplen obligatoriedad/ );

    await app.click({action: 'validate'});
    assert.doesNotMatch( app.element( '#dialog' ).innerHTML, /fila 9/ );
    await app.click({action: 'close-dialog'});

    await app.click({action: 'remove-data-row', row: '8'});
    await app.flushTimers();
    saved = JSON.parse( app.saved() );
    assert.deepEqual( saved.data[socio.id], existing );
    } );
