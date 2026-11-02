import test from 'node:test';
import assert from 'node:assert/strict';
import {
    exampleDocument,
    updateTable,
    validType
    } from '../src/domain/model.js';
import { renderProperties } from '../src/ui/properties.js';
import {
    initialLayout,
    ribbonContents
    } from '../src/ui/layout.js';

function interfaceState() {
    const model = exampleDocument();

    return {
        model,
        selectedId: model.tables[0].id,
        selectedColumnId: model.tables[0].columns[0].id,
        category: 'definition',
        tab: 'database',
        propertiesShown: true,
        tool: 'pointer',
        past: [],
        future: [],
        clipboard: null
        };
    }

test( 'UI-01: la estructura mantiene cinta, formas, lienzo y propiedades inferiores', () => {
    const html = initialLayout( interfaceState() );

    for (const label of [
        'Cinta de comandos',
        'Formas',
        'Lienzo del modelo de base de datos',
        'Propiedades de la base de datos'
        ]) {
        assert.ok( html.includes( label ) );
        }

    assert.ok( html.indexOf( 'id="canvas"' ) < html.indexOf( 'id="properties-pane"' ) );
    } );

test( 'UI-02/UI-03: definición presenta campos y sincronización documentados', () => {
    const state = interfaceState();
    const html = renderProperties( state.model, state );

    for (const name of [
        'Nombre físico:',
        'Nombre conceptual:',
        'Espacio de nombres:',
        'Sincronizar nombres al escribir',
        'Identificador principal',
        'Índices'
        ]) {
        assert.ok( html.includes( name ) );
        }
    } );

test( 'UI-04: columnas presenta PK, requerido y acciones de edición', () => {
    const state = interfaceState();

    state.category = 'columns';

    const html = renderProperties( state.model, state );

    for (const token of [
        'Tipo de datos',
        'data-field="required"',
        'data-field="primary"',
        'data-action="add-column"',
        'data-action="remove-column"',
        'data-action="edit-column"',
        'data-action="column-up"',
        'data-action="column-down"'
        ]) {
        assert.ok( html.includes( token ) );
        }
    } );

test( 'UI-05: Varios separa cardinalidad, tipo y opcionalidad de la relación', () => {
    const state = interfaceState();

    state.selectedId = state.model.relationships[0].id;
    state.category = 'misc';

    const html = renderProperties( state.model, state );

    for (const text of [
        'Cardinalidad',
        'Cero o más',
        'Uno o más',
        'Cero o uno',
        'Exactamente uno',
        'Identificadora',
        'El hijo tiene un padre',
        'Opcional'
        ]) {
        assert.ok( html.includes( text ) );
        }
    } );

test( 'El contenido importado se escapa en las ventanas de propiedades', () => {
    const state = interfaceState();

    state.model = updateTable(
            state.model,
            state.selectedId,
            {name: '\"><img src=x onerror=alert(1)>'}
            );

    const html = renderProperties( state.model, state );

    assert.ok( !html.includes( '<img' ) );
    assert.ok( html.includes( '&lt;img' ) );
    } );

test( 'El portapapeles y la edición sin selección muestran estados deshabilitados', () => {
    const state = interfaceState();

    state.tab = 'home';
    state.selectedId = null;

    const html = ribbonContents( state );

    assert.match( html, /data-action="paste"[^>]*disabled/ );
    assert.match( html, /data-action="copy"[^>]*disabled/ );
    assert.match( html, /data-action="delete"[^>]*disabled/ );
    } );

test( 'Los tipos parametrizados rechazan precisión y tamaños inválidos', () => {
    assert.equal( validType( 'DECIMAL(10,2)' ), true );
    assert.equal( validType( 'DECIMAL(2,10)' ), false );
    assert.equal( validType( 'VARCHAR(0)' ), false );
    assert.equal( validType( 'INTEGER; DROP TABLE x' ), false );
    } );
