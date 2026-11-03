import test from 'node:test';
import assert from 'node:assert/strict';
import {
    exampleDocument,
    emptyDocument,
    addConceptualEntity,
    addConceptualAttribute,
    addConceptualGeneralization,
    addConceptualRelationship,
    setDiagramMode,
    updateTable,
    updateConceptualAttribute,
    updateConceptualGeneralization,
    validType
    } from '../src/domain/model.js';
import { renderProperties, typeFields } from '../src/ui/properties.js';
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

test( 'Los orígenes multivaluado y jerarquía muestran acción y resumen de PK/FK', () => {
    const state = interfaceState();

    state.model = addConceptualEntity( emptyDocument(), {name: 'Persona'} );
    state.model = addConceptualEntity( state.model, {name: 'Socia', withIdentifier: false} );
    const [parent, subtype] = state.model.conceptual.entities;

    state.model = addConceptualAttribute(
            state.model,
            {
                ownerKind: 'entity',
                ownerId: parent.id,
                name: 'telefono',
                type: 'VARCHAR(24)',
                multivalued: true
                }
            );
    state.selectedId = state.model.conceptual.attributes.at( -1 ).id;
    assert.match( renderProperties( state.model, state ), /Multivaluado → Tabla auxiliar/ );
    state.model = updateConceptualAttribute(
            state.model,
            state.selectedId,
            {translation: {kind: 'multivalued-table', tableName: 'Telefonos'}}
            );
    const attribute = renderProperties( state.model, state );

    assert.match( attribute, /Telefonos.*PK:.*telefono/s );
    assert.match( attribute, /FK:.*Telefonos.*Persona/s );
    assert.match( attribute, /Documental:/ );

    state.model = addConceptualGeneralization(
            state.model,
            {supertypeId: parent.id, subtypeIds: [subtype.id]}
            );
    state.selectedId = state.model.conceptual.generalizations[0].id;
    assert.match( renderProperties( state.model, state ), /Tablas de superclase y subclases/ );
    state.model = updateConceptualGeneralization(
            state.model,
            state.selectedId,
            {translation: {kind: 'class-tables'}}
            );
    const classes = renderProperties( state.model, state );

    assert.match( classes, /Socia.*PK:/s );
    assert.match( classes, /FK:.*Socia.*Persona/s );
    assert.match( classes, /restricciones documentales/ );
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


test( 'Los dos modos y el perfil son controles visibles del mismo documento', () => {
    const html = initialLayout( interfaceState() );

    assert.match( html, /data-mode="relational"/ );
    assert.match( html, /data-mode="chen"/ );
    assert.match( html, /id="profile-select" data-profile/ );
    assert.match( html, /Vista SQL/ );
    } );


test( 'Los parámetros del tipo conservan precisión y escala completas', () => {
    const html = typeFields( 'NUMBER(10,2)', 'course' );

    assert.match( html, /name="typePrecision"[^>]*value="10"/ );
    assert.match( html, /name="typeScale"[^>]*value="2"/ );
    assert.match( html, /value="VARCHAR"/ );
    assert.doesNotMatch( html, /value="BOOLEAN"/ );
    } );

test( 'Una N:N pendiente muestra roles y acceso a materialización sin fingir FK', () => {
    const state = interfaceState();

    state.model = addConceptualRelationship(
            setDiagramMode( state.model, 'chen' ),
            {
                name: 'Lectura',
                participations: [
                    {entityId: state.model.tables[0].id, role: 'lector', min: 0, max: null},
                    {entityId: state.model.tables[2].id, role: 'obra', min: 0, max: null}
                    ],
                translation: null
                }
            );
    state.selectedId = state.model.conceptual.relationships.at( -1 ).id;
    state.category = 'misc';

    const roles = renderProperties( state.model, state );

    assert.match( roles, /Varios/ );
    assert.match( roles, /Participaciones, roles y límites/ );
    assert.match( roles, /value="lector"/ );
    assert.match( roles, /value="N"/ );

    state.category = 'translation';
    const translation = renderProperties( state.model, state );

    assert.match( translation, /Pendiente/ );
    assert.match( translation, /data-action="materialize"/ );
    } );

test( 'Varios ofrece la letra junto al rombo por rama, automática o elegida', () => {
    const state = interfaceState();

    state.model = addConceptualRelationship(
            setDiagramMode( state.model, 'chen' ),
            {
                name: 'Lectura',
                participations: [
                    {entityId: state.model.tables[0].id, role: 'lector', min: 0, max: null},
                    {entityId: state.model.tables[2].id, role: 'obra', min: 1, max: 1}
                    ],
                translation: null
                }
            );
    state.selectedId = state.model.conceptual.relationships.at( -1 ).id;
    state.category = 'misc';

    const html = renderProperties( state.model, state );

    // A binary shows the derived letter per branch and no combination selector.
    assert.equal( (html.match( /Letra junto al rombo: /g ) || []).length, 2 );
    assert.match( html, /Letra junto al rombo: 1/, 'lector: el máximo de obra es 1' );
    assert.match( html, /Letra junto al rombo: N/, 'obra: el máximo de lector es N' );
    assert.match( html, /máximo de la otra rama/ );
    assert.doesNotMatch( html, /data-field="cardinality"/ );
    } );
