import test from 'node:test';
import assert from 'node:assert/strict';
import * as domain from '../src/domain/model.js';
import {
    addForm,
    documentForms,
    removeForm,
    suggestedFormName,
    updateForm
    } from '../src/domain/forms.js';
import {
    parseDocument,
    serializeDocument
    } from '../src/domain/serialization.js';
import {
    deleteRecord,
    saveRecord
    } from '../src/sql/dml.js';
import {
    formRecords,
    sourceFields
    } from '../src/sql/records.js';
import { fillWithSampleData } from '../src/sql/sample.js';
import { runSql } from '../src/sql/console.js';
import { exportAccessVBA } from '../src/io/access.js';
import { formWindow } from '../src/ui/forms.js';

function library() {
    return fillWithSampleData( domain.exampleDocument() );
    }

function table(
        model,
        name
        ) {
    return model.tables.find( item => item.name === name );
    }

test( 'Un formulario se guarda en el documento, se valida al abrir y desaparece con su tabla', () => {
    let model = library();
    const socio = table( model, 'Socio' );

    model = addForm( model, {name: suggestedFormName( model, socio ), title: 'Socios', sourceId: socio.id, fields: socio.columns.map( column => column.id ), layout: 'columnar'} );

    const form = documentForms( model )[0];

    assert.equal( form.name, 'Formulario_Socio' );
    assert.equal( suggestedFormName( model, socio ), 'Formulario_Socio_2' );
    assert.deepEqual( parseDocument( serializeDocument( model ) ), model );
    assert.throws( () => addForm( model, {...form, name: 'formulario_socio'} ), /Ya hay un formulario llamado/ );
    assert.throws( () => addForm( model, {...form, name: 'Otro', fields: []} ), /al menos un campo/ );
    assert.throws( () => addForm( model, {...form, name: '1 mal'} ), /empieza por una letra/ );

    model = updateForm( model, form.id, {layout: 'tabular'} );
    assert.equal( documentForms( model )[0].layout, 'tabular' );

    const tampered = JSON.parse( serializeDocument( model ) );

    tampered.forms[0].layout = 'otro';
    assert.throws( () => parseDocument( JSON.stringify( tampered ) ), /distribución/ );

    const dropped = runSql( model, 'ALTER TABLE Socio DROP COLUMN email' ).model;

    assert.equal( documentForms( dropped )[0].fields.length, 2, 'una columna borrada sale del formulario' );
    assert.equal( documentForms( removeForm( model, form.id ) ).length, 0 );
    } );

test( 'Guardar un registro desde el formulario aplica las reglas de la tabla', () => {
    const model = library();
    const socio = table( model, 'Socio' );
    const [id, nombre] = socio.columns;
    const added = saveRecord( model, socio.id, null, {[id.id]: '500', [nombre.id]: 'Nuevo socio'} );

    assert.equal( added.message, 'Registro agregado a Socio.' );
    assert.equal( domain.documentData( added.model )[socio.id].length, 9 );
    assert.throws( () => saveRecord( model, socio.id, null, {[id.id]: '500x', [nombre.id]: 'Mal'} ), /debe ser un número/ );
    assert.throws( () => saveRecord( model, socio.id, null, {[nombre.id]: 'Sin clave'} ), /el campo id_socio es obligatorio/ );
    assert.throws( () => saveRecord( added.model, socio.id, null, {[id.id]: '500', [nombre.id]: 'Repe'} ), /repite la clave principal/ );

    const prestamo = table( model, 'Prestamo' );
    const socioField = prestamo.columns.find( column => column.name === 'id_socio' );

    assert.throws( () => saveRecord( model, prestamo.id, 0, {[socioField.id]: '99999'} ), /se necesita un registro relacionado en la tabla «Socio»/ );
    const loans = domain.documentData( model )[prestamo.id];
    const referenced = domain.documentData( model )[socio.id].findIndex( row => row[id.id] === loans[0][socioField.id] );

    assert.throws( () => deleteRecord( model, socio.id, referenced ), /No se puede eliminar el registro porque la tabla «Prestamo»/ );
    assert.equal( saveRecord( model, socio.id, 1, {[nombre.id]: 'Cambiado'} ).message, 'Registro guardado en Socio.' );
    } );

test( 'El formulario muestra los campos con sus listas y recorre los registros', () => {
    let model = library();
    const prestamo = table( model, 'Prestamo' );
    const fields = sourceFields( model, prestamo.id );
    const socioField = fields.find( field => field.name === 'id_socio' );

    assert.equal( socioField.choices.length, 8, 'una clave ajena ofrece las filas de la tabla referenciada' );
    assert.equal( fields.find( field => field.name === 'fecha' ).kind, 'date' );

    model = addForm( model, {name: 'Prestamos', title: 'Préstamos', sourceId: prestamo.id, fields: fields.map( field => field.key ), layout: 'columnar'} );

    const form = documentForms( model )[0];
    const view = formWindow( model, form, 2 );

    assert.match( view.content, /Registro 3 de 8/ );
    assert.match( view.content, /<select name="[^"]+" aria-label="id_socio"/ );
    assert.match( view.content, /<input type="date"/ );
    assert.equal( formWindow( model, form, null ).position, null );
    assert.match( formWindow( model, form, null ).content, /Nuevo registro \(8 guardados\)/ );

    const asGrid = updateForm( model, form.id, {layout: 'datasheet'} );
    const grid = formWindow( asGrid, documentForms( asGrid )[0], 0 );

    assert.match( grid.content, /data-action="form-save-row" data-row="0"/ );

    const view2 = runSql( model, 'CREATE VIEW Pendientes AS SELECT id_prestamo, fecha FROM Prestamo WHERE devolucion IS NULL' ).model;
    const query = table( view2, 'Pendientes' );
    const records = formRecords( addForm( view2, {name: 'Pend', title: 'Pendientes', sourceId: query.id, fields: ['id_prestamo', 'fecha'], layout: 'tabular'} ), {sourceId: query.id, fields: ['id_prestamo', 'fecha'], layout: 'tabular'} );

    assert.equal( records.editable, false, 'un formulario sobre una consulta no se edita' );
    } );

test( 'Los formularios viajan en el módulo VBA con CreateForm y su vista', () => {
    let model = library();
    const socio = table( model, 'Socio' );

    model = addForm( model, {name: 'Formulario_Socio', title: 'Socios', sourceId: socio.id, fields: socio.columns.map( column => column.id ), layout: 'tabular'} );

    const vba = exportAccessVBA( model );

    assert.match( vba, /    CrearFormularios\n/ );
    assert.match( vba, /Private Sub CrearFormulario_1\(\)[\s\S]*frm\.RecordSource = "Socio"[\s\S]*frm\.DefaultView = 1[\s\S]*DoCmd\.RunCommand acCmdFormHdrFtr[\s\S]*CampoDeFormulario frm, "nombre", 1, True[\s\S]*DoCmd\.Rename "Formulario_Socio", acForm, nombreTemporal/ );
    assert.match( vba, /On Error GoTo Fallo/ );
    assert.doesNotMatch( exportAccessVBA( library() ), /CrearFormularios/, 'sin formularios no hay procedimiento' );
    } );

test( 'La aplicación crea un formulario con el asistente y guarda registros desde él', async () => {
    const { applicationHarness } = await import( './support/application.js' );
    const app = await applicationHarness( 500 );

    await app.click({action: 'example'});
    await app.click({mode: 'tables'});
    await app.flushTimers();

    let saved = JSON.parse( app.saved() );
    const socio = saved.tables.find( item => item.name === 'Socio' );

    await app.click({action: 'form-wizard'});
    assert.match( app.element( '#dialog' ).innerHTML, /1\. Tabla o consulta/ );

    app.submit( {sourceId: socio.id} );
    assert.match( app.element( '#dialog' ).innerHTML, /name="field"/ );
    app.submit( {field: socio.columns.map( column => column.id )} );
    assert.match( app.element( '#dialog' ).innerHTML, /name="layout"/ );
    app.submit( {layout: 'columnar'} );
    assert.match( app.element( '#dialog' ).innerHTML, /name="title"/ );
    app.submit( {title: 'Socios', name: 'Formulario_Socio'} );
    await app.flushTimers();
    saved = JSON.parse( app.saved() );
    assert.equal( saved.forms[0].name, 'Formulario_Socio' );
    assert.match( app.element( '#dialog' ).innerHTML, /Registro 1 de 8/ );

    await app.click({action: 'form-new'});
    assert.match( app.element( '#dialog' ).innerHTML, /Nuevo registro/ );
    app.submit( {[socio.columns[0].id]: '900', [socio.columns[1].id]: 'Desde formulario', [socio.columns[2].id]: ''} );
    await app.flushTimers();
    saved = JSON.parse( app.saved() );
    assert.equal( saved.data[socio.id].length, 9 );
    assert.match( app.element( '#dialog' ).innerHTML, /Registro 9 de 9/ );

    app.submit( {[socio.columns[0].id]: 'x', [socio.columns[1].id]: 'Mal', [socio.columns[2].id]: ''}, /debe ser un número/ );
    } );
