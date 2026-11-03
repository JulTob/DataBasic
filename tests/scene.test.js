import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
    addColumn,
    addConceptualAttribute,
    addConceptualEntity,
    addConceptualRelationship,
    addRelationship,
    addTable,
    emptyDocument,
    setDiagramMode,
    updateColumn,
    updateRelationship,
    updateTable
    } from '../src/domain/model.js';
import {
    diagramBounds,
    diagramContents,
    diagramScene,
    exportSVG,
    findFreePosition,
    tableHeight,
    tableWidth
    } from '../src/ui/diagram.js';

function sceneLinkedFixture() {
    let model = addTable( emptyDocument( 'general' ), 'entity', {x: 100, y: 140} );

    model = addTable( model, 'entity', {x: 900, y: 420} );
    model = updateTable( model, model.tables[0].id, {name: 'PADRE'} );
    model = updateTable( model, model.tables[1].id, {name: 'HIJO'} );
    model = addRelationship( model, model.tables[0].id, model.tables[1].id );

    return updateRelationship( model, model.relationships[0].id, {optional: true} );
    }

function sceneNativeFixture( degree = 3 ) {
    let model = emptyDocument( 'course' );
    const entities = [];

    for (let index = 0; index < degree; index += 1) {
        model = addConceptualEntity(
                model,
                {name: `Entidad${index + 1}`},
                {x: 100 + index * 750, y: 320}
                );
        entities.push( model.conceptual.entities.at( -1 ).id );
        }

    model = addConceptualRelationship( model, {
        name: degree === 3 ? 'Colabora' : 'Participa',
        participations: entities.map(
                (entityId, index) => ({entityId, role: `papel${index + 1}`, min: index, max: null})
                ),
        translation: null
        } );
    model = addConceptualAttribute( model, {
        ownerKind: 'relationship',
        ownerId: model.conceptual.relationships.at( -1 ).id,
        name: 'fecha_inicio',
        type: 'DATE'
        } );

    return setDiagramMode( model, 'chen' );
    }

function sceneAssertContained(
        bounds,
        rectangle
        ) {
    assert.ok( rectangle.x >= bounds.x );
    assert.ok( rectangle.y >= bounds.y );
    assert.ok( rectangle.x + rectangle.width <= bounds.x + bounds.width );
    assert.ok( rectangle.y + rectangle.height <= bounds.y + bounds.height );
    }

test( 'Tipos completos y nombres largos ocupan líneas separadas y ancho propio', () => {
    let model = addTable( emptyDocument( 'course' ) );
    const id = model.tables[0].id;

    model = updateColumn( model, id, model.tables[0].columns[0].id, {
        name: 'identificador_de_la_ocurrencia_en_el_periodo',
        type: 'NUMBER(38,-84)'
        } );
    const table = model.tables[0];
    const node = diagramScene( model ).nodes[0];
    const svg = diagramContents( model );

    assert.match( svg, /class="type-label">NUMBER\(38,-84\)<\/text>/ );
    assert.ok( !svg.includes( '…' ) );
    assert.ok( tableWidth( table ) >= 320 );
    assert.equal( node.width, tableWidth( table ) );
    assert.equal( node.height, tableHeight( table ) );
    assert.ok( node.rows[0].height >= 48 );
    assert.match( svg, /\.type-label \{ font: 14px/ );
    } );

test( 'IDEF1X: FIPS184 figuras 1/4/5/6/7, cajas, dependencia y marcadores', () => {
    let model = sceneLinkedFixture();

    model.display.notation = 'idef1x';

    for (const [cardinality, code] of [
        ['zero-many', ''],
        ['one-many', 'P'],
        ['zero-one', 'Z'],
        ['one-one', '1']
        ]) {
        const variant = updateRelationship( model, model.relationships[0].id, {cardinality} );
        const svg = diagramContents( variant );

        assert.match( svg, /data-marker="child-dot"/ );
        assert.match( svg, /data-marker="optional-parent"/ );
        assert.match( svg, /stroke-dasharray="7 5"/ );

        if (code) {
            assert.match( svg, new RegExp( `class="cardinality-code">${code}<` ) );
            }
        else {
            assert.ok( !svg.includes( 'data-marker="child-cardinality"' ) );
            }
        }

    model = updateRelationship( model, model.relationships[0].id, {identifying: true} );
    const scene = diagramScene( model );
    const child = scene.nodes.find( node => node.ref.id === model.tables[1].id );
    const svg = diagramContents( model );

    assert.equal( child.dependent, true );
    assert.equal( scene.nodes.find( node => node.ref.id === model.tables[0].id ).dependent, false );
    assert.match( svg, /data-dependent="false"[\s\S]*?class="table-body"[^>]+rx="0"/ );
    assert.match( svg, /data-dependent="true"[\s\S]*?class="table-body"[^>]+rx="12"/ );
    assert.ok( !svg.includes( 'stroke-dasharray="7 5"' ) );
    assert.ok( !svg.includes( 'data-marker="optional-parent"' ) );
    } );

test( 'Ambas lecturas y cardinalidad tienen etiquetas distintas, incluidas en bounds', () => {
    const model = sceneLinkedFixture();

    model.display.cardinality = true;
    const scene = diagramScene( model );
    const edge = scene.edges[0];
    const svg = diagramContents( model );

    assert.match( svg, /data-reading="forward"[^>]*>→ tiene/ );
    assert.match( svg, /data-reading="inverse"[^>]*>← pertenece a/ );
    assert.equal( new Set( edge.labels.map( label => label.y ) ).size, 3 );

    for (const label of edge.labels) {
        sceneAssertContained( scene.bounds, label.bounds );
        }
    } );

test( 'Chen proyectado pone PADRE (0,N) e HIJO (0,1) en sus propias ramas', () => {
    const model = setDiagramMode( sceneLinkedFixture(), 'chen' );

    for (const positions of [
        [{x: 100, y: 300}, {x: 1000, y: 300}],
        [{x: 1000, y: 300}, {x: 100, y: 300}],
        [{x: 500, y: 100}, {x: 500, y: 800}]
        ]) {
        const variant = structuredClone( model );

        variant.presentation.chen[model.tables[0].id] = positions[0];
        variant.presentation.chen[model.tables[1].id] = positions[1];
        const scene = diagramScene( variant );
        const branches = scene.edges.filter( edge => edge.kind === 'participation' );
        const parent = branches.find( edge => edge.participation.entityId === model.tables[0].id );
        const child = branches.find( edge => edge.participation.entityId === model.tables[1].id );

        assert.equal( parent.labels[0].text, '(0,N)' );
        assert.equal( child.labels[0].text, '(0,1)' );
        assert.equal( parent.targetId, `entity:${model.tables[0].id}` );
        assert.equal( child.targetId, `entity:${model.tables[1].id}` );
        }
    } );

test( 'N:N y ternaria tienen un rombo, sus ramas, roles y atributo de relación', () => {
    for (const degree of [2, 3]) {
        const model = sceneNativeFixture( degree );
        const scene = diagramScene( model );
        const relation = model.conceptual.relationships[0];
        const attribute = model.conceptual.attributes.find( item => item.ownerKind === 'relationship' );
        const svg = diagramContents( model );

        assert.equal( scene.nodes.filter( node => node.kind === 'chen-relationship' ).length, 1 );
        assert.equal( scene.edges.filter( edge => edge.kind === 'participation' ).length, degree );
        assert.match( svg, new RegExp( `data-conceptual-relationship-id="${relation.id}"` ) );
        assert.match( svg, new RegExp( `data-conceptual-attribute-id="${attribute.id}"` ) );
        assert.match( svg, /Pendiente de transformar/ );

        for (let index = 0; index < degree; index += 1) {
            assert.match( svg, new RegExp( `papel${index + 1}` ) );
            }
        }
    } );

test( 'La recursiva mantiene dos puertos, participaciones y roles distinguibles', () => {
    let model = addConceptualEntity( emptyDocument(), {name: 'Persona'} );
    const entityId = model.conceptual.entities[0].id;

    model = addConceptualRelationship( model, {
        name: 'Supervisa',
        participations: [
            {entityId, role: 'supervisor', min: 0, max: null},
            {entityId, role: 'supervisado', min: 0, max: 1}
            ],
        translation: null
        } );
    const scene = diagramScene( setDiagramMode( model, 'chen' ) );
    const branches = scene.edges.filter( edge => edge.kind === 'participation' );

    assert.equal( branches.length, 2 );
    assert.notEqual( branches[0].ref.id, branches[1].ref.id );
    assert.notDeepEqual( branches[0].points.at( -1 ), branches[1].points.at( -1 ) );
    assert.equal( branches[0].labels[1].text, 'supervisor' );
    assert.equal( branches[1].labels[1].text, 'supervisado' );
    } );

test( 'La escena es determinista y sus bounds contienen nodos, ramas y etiquetas', () => {
    const model = sceneNativeFixture();
    const before = JSON.stringify( model );
    const scene = diagramScene( model );

    assert.deepEqual( scene, diagramScene( model ) );
    assert.equal( JSON.stringify( model ), before );
    assert.deepEqual( diagramBounds( model ), scene.bounds );

    for (const node of scene.nodes) {
        sceneAssertContained( scene.bounds, node );
        }

    for (const edge of scene.edges) {
        assert.ok( scene.nodes.some( node => node.id === edge.sourceId ) );
        assert.ok( scene.nodes.some( node => node.id === edge.targetId ) );

        for (const point of edge.points) {
            sceneAssertContained( scene.bounds, {...point, width: 0, height: 0} );
            }

        for (const label of edge.labels) {
            sceneAssertContained( scene.bounds, label.bounds );
            }
        }
    } );

test( 'Tres altas consecutivas en el punto preferido dejan títulos sin solapes', () => {
    let model = emptyDocument();

    for (let index = 0; index < 3; index += 1) {
        model = addTable( model, 'entity', findFreePosition( model, {x: 130, y: 100} ) );
        }

    const nodes = diagramScene( model ).nodes;

    for (const [index, first] of nodes.entries()) {
        for (const second of nodes.slice( index + 1 )) {
            assert.ok(
                    first.x + first.width < second.x
                        || second.x + second.width < first.x
                        || first.y + first.height < second.y
                        || second.y + second.height < first.y
                    );
            }
        }
    } );

test( 'SVG usa los bounds comunes y XML válido para nombres y tipos con escapes', t => {
    let model = sceneNativeFixture();
    const id = model.tables[0].id;

    model = updateTable( model, id, {name: 'A & B <origen> "citado"'} );
    const svg = exportSVG( model );
    const bounds = diagramBounds( model );

    assert.ok( svg.includes( `viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}"` ) );
    assert.ok( !svg.includes( '<origen>' ) );
    const result = spawnSync( 'xmllint', ['--noout', '-'], {input: svg, encoding: 'utf8'} );

    if (result.error?.code === 'ENOENT') {
        t.skip( 'xmllint no está disponible para la comprobación XML independiente.' );
        return;
        }

    assert.equal( result.status, 0, result.stderr );
    } );
