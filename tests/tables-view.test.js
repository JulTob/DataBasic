import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    exampleDocument,
    moveDiagramElement,
    setDiagramMode,
    updatePhysicalColumn,
    updateRelationship,
    validateDocument
    } from '../src/domain/model.js';
import { buildDiagramScene } from '../src/ui/scene.js';
import {
    accessTypeLabel,
    diagramContents
    } from '../src/ui/diagram.js';
import { renderProperties } from '../src/ui/properties.js';
import {
    initialLayout,
    paletteContents
    } from '../src/ui/layout.js';
import { buildDesignReport } from '../src/io/report.js';
import { accessColumnDefinition } from '../src/domain/access.js';
import { applicationHarness } from './support/application.js';

function tablesState( model ) {
    return {
        model,
        selectedId: model.tables[0].id,
        selectedColumnId: model.tables[0].columns[0].id,
        category: 'fields',
        tab: 'database',
        propertiesShown: true,
        tool: 'pointer',
        past: [],
        future: [],
        clipboard: null
        };
    }

test( 'the Tablas view is a valid mode that shares the relational positions', () => {
    const model = setDiagramMode( exampleDocument(), 'tables' );

    assert.deepEqual( validateDocument( model ).filter( issue => issue.level === 'error' ), [] );

    const socio = model.tables[0];
    const moved = moveDiagramElement( model, socio.id, {x: 300, y: 400} );

    assert.deepEqual( [moved.tables[0].x, moved.tables[0].y], [300, 400] );
    assert.deepEqual(
            [setDiagramMode( moved, 'relational' ).tables[0].x, setDiagramMode( moved, 'relational' ).tables[0].y],
            [300, 400],
            'the relational view sees the same position'
            );

    const scene = buildDiagramScene( model );

    assert.equal( scene.mode, 'tables' );
    assert.equal( scene.nodes.length, model.tables.length );
    assert.equal( scene.edges.length, model.relationships.length );
    } );

test( 'the canvas draws Access tables with a key, Access types and 1/∞ ends', () => {
    let model = setDiagramMode( exampleDocument(), 'tables' );

    model = updateRelationship( model, model.relationships[1].id, {cardinality: 'zero-one'} );

    const svg = diagramContents( model );

    assert.equal( (svg.match( /class="entity access-entity/g ) || []).length, 3 );
    assert.equal( (svg.match( /<rect class="access-header"/g ) || []).length, 3 );
    assert.equal( (svg.match( /class="access-key"/g ) || []).length, 3, 'one key per primary key field' );
    assert.ok( svg.includes( 'Número (Entero largo)' ) );
    assert.ok( svg.includes( 'Texto corto (100)' ) );
    assert.equal( (svg.match( /data-marker="access-end"[^>]*class="access-end">∞</g ) || []).length, 1 );
    assert.equal( (svg.match( /data-marker="access-end"[^>]*class="access-end">1</g ) || []).length, 3 );
    assert.ok( !svg.includes( 'data-marker="child-dot"' ), 'no IDEF1X marks in the Tablas view' );
    assert.ok( svg.includes( 'data-diagram-kind="column"' ), 'fields stay selectable' );

    const relational = diagramContents( setDiagramMode( model, 'relational' ) );

    assert.ok( !relational.includes( '<rect class="access-header"' ) );
    assert.equal( accessTypeLabel( accessColumnDefinition( model, model.tables[0], model.tables[0].columns[1] ) ), 'Texto corto (100)' );
    } );

test( 'the properties pane speaks Access for fields, tables and relationships in the Tablas view', () => {
    const model = setDiagramMode( exampleDocument(), 'tables' );
    const state = tablesState( model );
    const fields = renderProperties( model, state );

    assert.match( fields, /data-category="fields"[^>]*aria-pressed="true"/ );
    assert.match( fields, /Nombre del campo/ );
    assert.match( fields, /data-physical="column" data-col-id="[^"]+"\s+data-field="accessType"/ );
    assert.match( fields, /<option value="Autonumeración"/ );
    assert.match( fields, /Propiedades del campo id_socio · General/ );
    assert.match( fields, /data-field="validationRule"/ );
    assert.match( fields, /data-field="indexed" disabled/ );
    assert.match( fields, /derivado/ );
    assert.doesNotMatch( fields, /reset-physical/ );

    state.model = updatePhysicalColumn( model, state.selectedColumnId, {caption: 'Código'} );
    assert.match( renderProperties( state.model, state ), /ajustado/ );
    assert.match( renderProperties( state.model, state ), /data-action="reset-physical"\s+data-scope="column"/ );

    state.category = 'access-table';
    assert.match( renderProperties( state.model, state ), /Regla de validación de la tabla/ );
    assert.match( renderProperties( state.model, state ), /Clave principal: id_socio/ );

    state.selectedId = model.relationships[0].id;
    state.selectedColumnId = null;
    state.category = 'access-relationship';
    const relation = renderProperties( state.model, state );

    assert.match( relation, /Exigir integridad referencial/ );
    assert.match( relation, /data-field="cascadeDelete"/ );
    assert.match( relation, /Tipo de relación: Uno a varios/ );
    assert.match( relation, /Automática · nombre/ );
    assert.match( relation, /data-field="hideKey"/ );

    const relational = renderProperties( setDiagramMode( model, 'relational' ), {...tablesState( model ), category: 'columns'} );

    assert.doesNotMatch( relational, /data-category="fields"/ );
    } );

test( 'the layout offers the three views and an Access palette', () => {
    const model = exampleDocument();
    const html = initialLayout( tablesState( model ) );

    assert.match( html, /data-mode="chen"[\s\S]*data-mode="relational"[\s\S]*data-mode="tables"/ );
    assert.match( paletteContents( {model: setDiagramMode( model, 'tables' )} ), /Campos con tipos de Access/ );
    assert.match( paletteContents( {model} ), /Tabla y columnas/ );
    } );

test( 'the memo gets a physical design section and the Access warnings', () => {
    let model = exampleDocument();

    model = updateRelationship( model, model.relationships[0].id, {optional: true, onDelete: 'SET NULL'} );

    const report = buildDesignReport( model );
    const physical = report.sections.at( -1 );
    const lost = report.sections.find( section => section.heading === 'Semántica perdida' );

    assert.equal( physical.heading, 'Diseño físico en Access' );
    assert.deepEqual( physical.blocks[1].header, ['Campo', 'Tipo de datos', 'Tamaño', 'Requerido', 'Indexado', 'Regla de validación', 'Predeterminado'] );
    assert.deepEqual( physical.blocks[1].rows[0], ['id_socio (PK)', 'Número', 'Entero largo', 'Sí', 'Sí (Sin duplicados)', '—', '—'] );
    assert.ok( physical.blocks.at( -1 ).items.some( item => item.includes( 'Prestamo → Socio (uno a varios): exigir integridad referencial, eliminación restringida; campo de búsqueda que muestra nombre.' ) ) );
    assert.ok( lost.blocks.some( block => block.kind === 'list' && block.items.some( item => item.includes( 'SET NULL' ) ) ) );
    } );

test( 'the application switches to the Tablas view, edits Access properties and resets them', async () => {
    const app = await applicationHarness( 500 );

    await app.click({action: 'example'});
    await app.click({mode: 'tables'});
    await app.flushTimers();
    assert.equal( app.element( '#diagram-mode-label' ).textContent, 'Tablas · Access' );

    let saved = JSON.parse( app.saved() );
    const socio = saved.tables[0];

    await app.click({select: socio.id});
    assert.match( app.element( '#properties-body' ).innerHTML, /Campos de Access/ );

    app.change( {physical: 'column', colId: socio.columns[0].id, field: 'accessType'}, 'Autonumeración' );
    await app.flushTimers();
    saved = JSON.parse( app.saved() );
    assert.deepEqual( saved.physical.columns[socio.columns[0].id], {accessType: 'Autonumeración'} );
    assert.match( app.element( '#properties-body' ).innerHTML, /Restablecer lo derivado/ );

    app.change( {physical: 'column', colId: socio.columns[1].id, field: 'fieldSize'}, '80', 'number' );
    await app.flushTimers();
    saved = JSON.parse( app.saved() );
    assert.deepEqual( saved.physical.columns[socio.columns[1].id], {fieldSize: 80} );

    await app.click({action: 'reset-physical', scope: 'column', target: socio.columns[0].id});
    await app.flushTimers();
    saved = JSON.parse( app.saved() );
    assert.equal( saved.physical.columns[socio.columns[0].id], undefined );

    await app.click({select: saved.relationships[0].id});
    app.change( {physical: 'relationship', field: 'cascadeDelete'}, true, 'checkbox' );
    await app.flushTimers();
    saved = JSON.parse( app.saved() );
    assert.deepEqual( saved.physical.relationships[saved.relationships[0].id], {cascadeDelete: true} );

    await app.click({mode: 'relational'});
    assert.doesNotMatch( app.element( '#properties-body' ).innerHTML, /Campos de Access/ );
    assert.match( app.element( '#diagram-mode-label' ).textContent, /Relacional/ );
    } );
