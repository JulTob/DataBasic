import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    addConceptualEntity,
    addConceptualRelationship,
    exampleDocument,
    getConceptualProjection,
    setDiagramMode,
    updateConceptualEntity,
    updateTable,
    validateDocument,
    validHue
    } from '../src/domain/model.js';
import { parseDocument } from '../src/domain/serialization.js';
import {
    diagramColorStyle,
    diagramContents,
    exportSVG
    } from '../src/ui/diagram.js';
import { renderProperties } from '../src/ui/properties.js';
import { exportVDX } from '../src/io/visio.js';

test( 'a colour is a hue of the spectrum or null, and older files without it still open', () => {
    assert.deepEqual( [0, 200, 360, null, undefined].map( validHue ), [true, true, true, true, true] );
    assert.deepEqual( [-1, 361, 1.5, '200', {}].map( validHue ), [false, false, false, false, false] );

    const model = exampleDocument();
    const socio = model.tables[0];

    assert.equal( socio.color, undefined, 'the example has no colours' );
    assert.deepEqual( validateDocument( model ).filter( issue => issue.level === 'error' ), [] );
    assert.throws( () => updateTable( model, socio.id, {color: 400} ), /tono entre 0 y 360/ );
    assert.throws( () => updateTable( model, socio.id, {color: 'rojo'} ), /tono entre 0 y 360/ );

    const coloured = updateTable( model, socio.id, {color: 210} );

    assert.equal( coloured.tables[0].color, 210 );
    assert.equal( parseDocument( JSON.stringify( coloured ) ).tables[0].color, 210 );
    assert.equal( updateTable( coloured, socio.id, {color: null} ).tables[0].color, null );
    } );

test( 'the colour of a table shows on its projected entity and syncs with a native one', () => {
    const base = exampleDocument();
    let model = updateTable( base, base.tables[0].id, {color: 120} );
    const socio = model.tables[0];
    const projected = getConceptualProjection( model ).entities.find( item => item.id === socio.id );

    assert.equal( projected.color, 120, 'projection carries the table colour' );

    model = addConceptualEntity( setDiagramMode( model, 'chen' ), {name: 'Autor'} );
    const autor = model.conceptual.entities.at( -1 );
    const table = model.tables.find( item => item.conceptualName === 'Autor' || item.name === 'Autor' );

    model = updateConceptualEntity( model, autor.id, {color: 30} );
    assert.equal( model.tables.find( item => item.id === table.id ).color, 30, 'entity → table' );

    model = updateTable( model, table.id, {color: 300} );
    assert.equal( model.conceptual.entities.find( item => item.id === autor.id ).color, 300, 'table → entity' );

    model = updateTable( model, table.id, {color: null} );
    assert.equal( model.conceptual.entities.find( item => item.id === autor.id ).color, null );
    } );

test( 'the canvas, the SVG and the Visio drawing paint the border in the hue and the fill almost white', () => {
    let model = exampleDocument();
    const socio = model.tables[0];

    model = updateTable( model, socio.id, {color: 210} );

    assert.equal( diagramColorStyle( null ), '' );
    assert.equal(
            diagramColorStyle( 210 ),
            'style="--element-color: hsl(210 55% 40%); --element-fill: hsl(210 65% 97%); --element-header: hsl(210 55% 90%)"'
            );

    const relational = diagramContents( model );

    assert.equal( (relational.match( /--element-color: hsl\(210 55% 40%\)/g ) || []).length, 1 );
    assert.match( relational, /\.table-body \{ fill: var\(--element-fill, #fff\); stroke: var\(--element-color, #78988b\)/ );

    const tables = diagramContents( setDiagramMode( model, 'tables' ) );

    assert.match( tables, /access-entity[^>]*>/ );
    assert.equal( (tables.match( /--element-header: hsl\(210 55% 90%\)/g ) || []).length, 1 );

    const chen = exportSVG( setDiagramMode( model, 'chen' ) );

    assert.equal( (chen.match( /--element-color: hsl\(210 55% 40%\)/g ) || []).length, 1, 'the projected entity' );

    const vdx = exportVDX( model );

    assert.ok( vdx.includes( '<LineColor>#2e669e</LineColor>' ), 'hsl(210 55% 40%) as hex' );
    assert.ok( vdx.includes( '<FillForegnd>#f2f7fc</FillForegnd>' ), 'hsl(210 65% 97%) as hex' );
    assert.ok( vdx.includes( `<LineColor>#78988b</LineColor>` ), 'the other tables keep the default border' );
    } );

test( 'a native relationship keeps its own colour on the diamond', () => {
    let model = setDiagramMode( exampleDocument(), 'chen' );

    model = addConceptualRelationship( model, {
        name: 'Lectura',
        participations: [
            {entityId: model.tables[0].id, role: 'lector', min: 0, max: null},
            {entityId: model.tables[2].id, role: 'obra', min: 0, max: null}
            ],
        translation: null
        } );
    const relation = model.conceptual.relationships.at( -1 );
    const state = {
        model,
        selectedId: relation.id,
        selectedColumnId: null,
        category: 'definition',
        tab: 'database',
        propertiesShown: true,
        tool: 'pointer',
        past: [],
        future: [],
        clipboard: null
        };

    assert.match( renderProperties( model, state ), /class="hue-slider" data-field="color"/ );
    assert.match( renderProperties( model, state ), /data-action="clear-color" disabled/ );
    } );

test( 'the Definición panel of a table offers the slider and «Sin color»', () => {
    const base = exampleDocument();
    const model = updateTable( base, base.tables[0].id, {color: 45} );
    const html = renderProperties( model, {
        model,
        selectedId: model.tables[0].id,
        selectedColumnId: null,
        category: 'definition',
        tab: 'database',
        propertiesShown: true,
        tool: 'pointer',
        past: [],
        future: [],
        clipboard: null
        } );

    assert.match( html, /class="hue-slider" data-field="color"\s+value="45"/ );
    assert.match( html, /color-swatch\s*" style="--element-color: hsl\(45 55% 40%\)/ );
    assert.match( html, /data-action="clear-color" >Sin color/ );
    } );
