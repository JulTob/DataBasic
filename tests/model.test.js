import test from 'node:test';
import assert from 'node:assert/strict';
import {
    addColumn,
    addRelationship,
    addTable,
    changeDocument,
    column,
    emptyDocument,
    exampleDocument,
    moveColumn,
    removeColumn,
    removeElement,
    updateColumn,
    updateRelationship,
    updateTable,
    validateDocument
    } from '../src/domain/model.js';
import {
    parseDocument,
    serializeDocument
    } from '../src/domain/serialization.js';
import { exportSQL } from '../src/io/sql.js';
import { exportSVG } from '../src/ui/diagram.js';

function fixture( composite = false ) {
    let model = addTable( emptyDocument( 'general' ) );

    model = addTable( model );
    model.tables[0].columns = [column( 'id_padre', 'INTEGER', true )];
    model.tables[1].columns = [column( 'id_hijo', 'INTEGER', true )];

    if (composite) {
        model.tables[0].columns.push( column( 'codigo', 'VARCHAR(50)', true ) );
        }

    return model;
    }

function linked( composite = false ) {
    const model = fixture( composite );

    return addRelationship( model, model.tables[0].id, model.tables[1].id );
    }

test( 'El ejemplo de biblioteca cumple las invariantes del modelo', () => {
    assert.deepEqual( validateDocument( exampleDocument() ), [] );
    } );

test( 'Crear una entidad es inmutable y genera nombres distintos', () => {
    const original = emptyDocument();
    const first = addTable( original );
    const second = addTable( first );

    assert.equal( original.tables.length, 0 );
    assert.equal( first.tables.length, 1 );
    assert.notEqual( second.tables[0].name, second.tables[1].name );
    } );

test( 'Marcar PK implica NOT NULL, también en claves compuestas', () => {
    let model = fixture();

    model = addColumn( model, model.tables[0].id );
    model = updateColumn(
            model,
            model.tables[0].id,
            model.tables[0].columns[1].id,
            {primary: true, required: false}
            );

    assert.equal( model.tables[0].columns[1].required, true );
    } );

test( 'Crear una relación migra toda la PK compuesta', () => {
    const model = linked( true );

    assert.equal( model.relationships[0].mappings.length, 2 );
    assert.deepEqual(
            model.tables[1].columns.slice( 1 ).map( field => field.name ),
            ['id_padre', 'codigo']
            );
    assert.deepEqual( validateDocument( model ), [] );
    } );

test( 'Se reutiliza una columna hija homónima con tipo compatible', () => {
    const original = fixture();

    original.tables[1].columns.push( column( 'id_padre', 'integer' ) );

    const model = addRelationship( original, original.tables[0].id, original.tables[1].id );

    assert.equal( model.tables[1].columns.length, 2 );
    assert.equal(
            model.relationships[0].mappings[0].childColumnId,
            original.tables[1].columns[1].id
            );
    } );

test( 'Un tipo incompatible rechaza la operación sin cambios parciales', () => {
    const original = fixture( true );

    original.tables[1].columns.push( column( 'codigo', 'DATE' ) );

    const snapshot = serializeDocument( original );

    assert.throws(
            () => addRelationship( original, original.tables[0].id, original.tables[1].id ),
            /incompatible/
            );
    assert.equal( serializeDocument( original ), snapshot );
    } );

test( 'No se puede crear una FK sin una PK en el padre', () => {
    const model = fixture();

    model.tables[0].columns[0].primary = false;

    assert.throws(
            () => addRelationship( model, model.tables[0].id, model.tables[1].id ),
            /clave primaria/
            );
    } );

test( 'Una relación identificadora incorpora la FK a la PK hija', () => {
    const original = linked( true );
    const model = updateRelationship(
            original,
            original.relationships[0].id,
            {identifying: true}
            );

    assert.equal( model.relationships[0].optional, false );
    assert.ok( model.tables[1].columns.every( field => field.primary && field.required ) );
    assert.deepEqual( validateDocument( model ), [] );
    } );

test( 'Renombrar tablas y columnas conserva las referencias por ID', () => {
    const original = linked();
    let model = updateColumn(
            original,
            original.tables[0].id,
            original.tables[0].columns[0].id,
            {name: 'nuevo_id'}
            );

    model = updateTable( model, model.tables[0].id, {name: 'Persona'} );

    assert.deepEqual( model.relationships, original.relationships );
    assert.equal( model.tables[0].conceptualName, 'Persona' );
    assert.match( exportSQL( model ), /REFERENCES "Persona" \("nuevo_id"\)/ );
    } );

test( 'Cambiar la PK de una tabla relacionada exige resolver sus relaciones', () => {
    const original = linked();

    assert.throws(
            () => updateColumn(
                    original,
                    original.tables[0].id,
                    original.tables[0].columns[0].id,
                    {primary: false}
                    ),
            /clave primaria/
            );
    assert.equal( original.tables[0].columns[0].primary, true );
    } );

test( 'Una columna que participa en una relación no se puede eliminar', () => {
    const original = linked();

    assert.throws(
            () => removeColumn(
                    original,
                    original.tables[1].id,
                    original.tables[1].columns[1].id
                    ),
            /participa en una relación/
            );
    } );

test( 'Eliminar una relación conserva las columnas migradas', () => {
    const original = linked();
    const model = removeElement( original, original.relationships[0].id );

    assert.equal( model.relationships.length, 0 );
    assert.deepEqual( model.tables, original.tables );
    } );

test( 'Eliminar el padre elimina sus relaciones y conserva las columnas de la hija', () => {
    const original = linked();
    const model = removeElement( original, original.tables[0].id );

    assert.equal( model.relationships.length, 0 );
    assert.equal( model.tables.length, 1 );
    assert.deepEqual( model.tables[0].columns, original.tables[1].columns );
    } );

test( 'La relación autorreferenciada crea otra columna para la FK', () => {
    const original = addTable( emptyDocument() );
    const model = addRelationship( original, original.tables[0].id, original.tables[0].id );

    assert.equal( model.tables[0].columns.length, 2 );
    assert.equal( model.tables[0].columns[1].name, 'id_ref' );
    assert.deepEqual( validateDocument( model ), [] );
    } );

test( 'SET NULL rechaza una relación obligatoria', () => {
    const original = linked();
    const model = updateRelationship( original, original.relationships[0].id, {optional: false} );

    assert.throws(
            () => updateRelationship( model, model.relationships[0].id, {onDelete: 'SET NULL'} ),
            /SET NULL/
            );
    } );

test( 'SET DEFAULT exige que la FK tenga un valor predeterminado', () => {
    const original = linked();

    assert.throws(
            () => updateRelationship( original, original.relationships[0].id, {onDelete: 'SET DEFAULT'} ),
            /SET DEFAULT/
            );

    let model = updateColumn(
            original,
            original.tables[1].id,
            original.tables[1].columns[1].id,
            {defaultValue: '0'}
            );

    model = updateRelationship( model, model.relationships[0].id, {onDelete: 'SET DEFAULT'} );

    assert.match( exportSQL( model ), /ON DELETE SET DEFAULT/ );
    } );

test( 'Opcionalidad y nulos de las columnas FK permanecen sincronizados', () => {
    const original = linked( true );
    const model = updateRelationship( original, original.relationships[0].id, {optional: false} );

    assert.ok( model.tables[1].columns.every( field => field.required ) );
    assert.throws(
            () => updateColumn(
                    model,
                    model.tables[1].id,
                    model.tables[1].columns[1].id,
                    {required: false}
                    ),
            /opcionalidad/
            );
    } );

test( 'Reordenar columnas conserva sus identificadores y referencias', () => {
    const original = linked( true );
    const model = moveColumn(
            original,
            original.tables[0].id,
            original.tables[0].columns[1].id,
            -1
            );

    assert.deepEqual( model.relationships, original.relationships );
    assert.deepEqual( validateDocument( model ), [] );
    } );

test( 'El guardado conserva íntegramente modelo, posiciones y opciones', () => {
    const original = exampleDocument();

    original.display.types = false;

    assert.deepEqual( parseDocument( serializeDocument( original ) ), original );
    } );

test( 'La importación rechaza versiones, IDs duplicados y coordenadas no válidas', () => {
    const original = exampleDocument();

    for (const mutate of [
        model => { model.version = 99; },
        model => { model.tables[1].id = model.tables[0].id; },
        model => { model.tables[0].x = null; },
        model => { model.tables[0].id = 'bad"; evil'; },
        model => { model.relationships[0].mappings = []; },
        model => { model.relationships[0].onDelete = 'DROP TABLE'; }
        ]) {
        const model = structuredClone( original );

        mutate( model );
        assert.throws( () => parseDocument( JSON.stringify( model ) ) );
        }
    } );

test( 'Una referencia rota se rechaza al importar', () => {
    const model = linked();

    model.relationships[0].mappings[0].childColumnId = 'inexistente';

    assert.throws( () => parseDocument( JSON.stringify( model ) ), /deben existir/ );
    } );

test( 'El SQL de máximo un hijo incluye una restricción UNIQUE compuesta', () => {
    const original = linked( true );
    const model = updateRelationship(
            original,
            original.relationships[0].id,
            {cardinality: 'zero-one'}
            );

    assert.match( exportSQL( model ), /UNIQUE \("id_padre", "codigo"\)/ );
    } );

test( 'El SQL crea todas las tablas antes de añadir FKs, también en ciclos', () => {
    const original = linked();
    const model = addRelationship( original, original.tables[1].id, original.tables[0].id );
    const sql = exportSQL( model );

    assert.ok( sql.lastIndexOf( 'CREATE TABLE' ) < sql.indexOf( 'ALTER TABLE' ) );
    assert.equal( (sql.match( /FOREIGN KEY/g ) || []).length, 2 );
    } );

test( 'SQL cita identificadores con espacios, comillas y palabras reservadas', () => {
    const original = fixture();
    const model = updateTable( original, original.tables[0].id, {name: 'Order "especial"'} );

    assert.match( exportSQL( model ), /CREATE TABLE "Order ""especial"""/ );
    } );

test( 'La exportación SVG escapa texto y atributos, conservando acentos', () => {
    const original = fixture();
    const model = updateTable(
            original,
            original.tables[0].id,
            {name: '<script>á & "x"</script>'}
            );
    const svg = exportSVG( model );

    assert.ok( !svg.includes( '<script>' ) );
    assert.ok( svg.includes( '&lt;script&gt;á &amp;' ) );
    assert.ok( svg.startsWith( '<svg xmlns="http://www.w3.org/2000/svg"' ) );
    } );

test( 'Los nombres físicos duplicados se rechazan por espacio de nombres', () => {
    const original = fixture();

    assert.throws(
            () => updateTable( original, original.tables[1].id, {name: original.tables[0].name} ),
            /nombre físico único/
            );
    } );

test( 'Las vistas se exportan como consultas y no admiten relaciones FK', () => {
    let model = addTable( fixture(), 'view' );
    const view = model.tables.at( -1 );

    model = updateTable( model, view.id, {definition: 'SELECT 1 AS total;'} );

    assert.match( exportSQL( model ), /CREATE VIEW "Vista1" AS\nSELECT 1 AS total;/ );
    assert.throws(
            () => addRelationship( model, model.tables[0].id, view.id ),
            /vistas/
            );
    } );

test( 'Volver a no identificadora saca la FK de la PK hija y permite opcional', () => {
    let model = linked();
    const relationId = model.relationships[0].id;
    const foreignId = model.relationships[0].mappings[0].childColumnId;
    const foreign = () => model.tables[1].columns.find( field => field.id === foreignId );

    model = updateRelationship( model, relationId, {identifying: true} );
    assert.equal( foreign().primary, true );
    assert.equal( model.relationships[0].optional, false );

    model = updateRelationship( model, relationId, {identifying: false} );
    assert.equal( foreign().primary, false );
    assert.equal( foreign().required, true, 'La FK sigue obligatoria mientras no sea opcional.' );
    assert.deepEqual(
            model.tables[1].columns.filter( field => field.primary ).map( field => field.name ),
            ['id_hijo']
            );

    model = updateRelationship( model, relationId, {optional: true} );
    assert.equal( foreign().required, false );
    assert.deepEqual( validateDocument( model ), [] );
    } );

test( 'La columna FK compartida por otra relación identificadora sigue en la PK', () => {
    let model = fixture();

    model = addTable( model );
    model.tables[2].columns = [column( 'id_otro', 'INTEGER', true )];

    const [first, child, second] = model.tables;

    model = addRelationship( model, first.id, child.id );
    model = addRelationship( model, second.id, child.id );

    const shared = model.relationships[0].mappings[0].childColumnId;
    const sharedColumn = () => model.tables[1].columns.find( field => field.id === shared );

    model = updateRelationship( model, model.relationships[1].id, {
        mappings: [{parentColumnId: second.columns[0].id, childColumnId: shared}]
        } );

    // Both FKs share one column, so NOT NULL must change for both in one operation.
    model = changeDocument(
            model,
            next => {
                next.tables[1].columns.find( field => field.id === shared ).required = true;

                for (const relation of next.relationships) {
                    relation.optional = false;
                    }
                }
            );

    model = updateRelationship( model, model.relationships[0].id, {identifying: true} );
    model = updateRelationship( model, model.relationships[1].id, {identifying: true} );
    model = updateRelationship( model, model.relationships[0].id, {identifying: false} );
    assert.equal( sharedColumn().primary, true, 'La segunda FK identificadora la mantiene en la PK.' );

    model = updateRelationship( model, model.relationships[1].id, {identifying: false} );
    assert.equal( sharedColumn().primary, false );
    assert.deepEqual( validateDocument( model ), [] );
    } );
