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
    updateConceptualParticipation,
    updateConceptualRelationship,
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

test( 'Una rama Chen horizontal corta separa el rol largo de su (0,N) y las cajas', () => {
    for (const roleText of ['actividad', 'actividad principal de la inscripción permanente']) {
        for (const reversed of [false, true]) {
            const model = sceneNativeFixture( 2 );
            const [first, second] = model.conceptual.entities;
            const relation = model.conceptual.relationships[0];
            const participation = relation.participations[1];

            model.presentation.chen[first.id] = {x: reversed ? 640 : 100, y: 200};
            model.presentation.chen[second.id] = {x: reversed ? 100 : 640, y: 200};
            model.presentation.chen[relation.id] = {x: 330, y: 180};
            participation.role = roleText;
            participation.min = 0;
            const scene = diagramScene( model );
            const branch = scene.edges.find( edge => edge.ref.id === participation.id );
            const [cardinality, role] = branch.labels;
            const lineY = branch.points[0].y;
            const overlaps = (left, right) => left.x < right.x + right.width
                && left.x + left.width > right.x
                && left.y < right.y + right.height
                && left.y + left.height > right.y;

            assert.equal( branch.points.at( -1 ).y, lineY );
            assert.ok( Math.abs( branch.points[0].x - branch.points.at( -1 ).x ) <= 90 );
            assert.equal( cardinality.text, '(0,N)' );
            assert.equal( role.text, roleText );
            assert.equal( branch.targetId, `entity:${second.id}` );
            assert.ok( (cardinality.y - lineY) * (role.y - lineY) < 0 );
            assert.equal( overlaps( cardinality.bounds, role.bounds ), false );
            assert.ok( cardinality.leader.length === 2 && role.leader.length === 2 );

            for (const label of branch.labels) {
                sceneAssertContained( scene.bounds, label.bounds );

                for (const node of scene.nodes) {
                    assert.equal(
                            overlaps( label.bounds, {
                                ...node,
                                height: node.height + (node.pending ? 30 : 0)
                                } ),
                            false,
                            `${label.purpose} no debe invadir ${node.kind}`
                            );
                    }
                }

            assert.match( diagramContents( model ), /\.relation-label \{\s+font: 14px/ );
            assert.ok( !exportSVG( model ).includes( 'NaN' ) );
            }
        }
    } );

test( 'Rango y rol conservan guía a su rama diagonal u horizontal, con atributo inferior', () => {
    let model = sceneNativeFixture( 2 );
    let relation = model.conceptual.relationships[0];
    const [person, activity] = model.conceptual.entities;
    const date = model.conceptual.attributes.find( item => item.ownerKind === 'relationship' );

    for (const [index, role] of ['persona', 'actividad'].entries()) {
        model = updateConceptualParticipation(
                model,
                relation.id,
                relation.participations[index].id,
                {role, min: 0, max: null}
                );
        }

    model = updateConceptualRelationship( model, relation.id, {
        name: 'Inscripcion',
        translation: {
            kind: 'association',
            tableName: 'Inscripcion',
            key: {participationIds: relation.participations.map( item => item.id ), attributeIds: []}
            }
        } );
    model.presentation.chen[person.id] = {x: 640, y: 70};
    model.presentation.chen[activity.id] = {x: 640, y: 200};
    model.presentation.chen[relation.id] = {x: 330, y: 180};
    model.presentation.chen[date.id] = {x: 640, y: 330};
    relation = model.conceptual.relationships[0];
    const scene = diagramScene( model );
    const branches = scene.edges.filter( edge => edge.kind === 'participation' );
    const horizontal = branches.find( edge => edge.participation.role === 'actividad' );
    const diagonal = branches.find( edge => edge.participation.role === 'persona' );
    const svg = exportSVG( model );
    const onSegment = (point, [start, end]) => {
        const cross = (point.x - start.x) * (end.y - start.y)
            - (point.y - start.y) * (end.x - start.x);

        return Math.abs( cross ) < 0.000001
            && point.x >= Math.min( start.x, end.x ) - 0.000001
            && point.x <= Math.max( start.x, end.x ) + 0.000001
            && point.y >= Math.min( start.y, end.y ) - 0.000001
            && point.y <= Math.max( start.y, end.y ) + 0.000001;
        };

    assert.equal( Math.abs( horizontal.points[0].x - horizontal.points[1].x ), 90 );
    assert.equal( horizontal.points[0].y, horizontal.points[1].y );
    assert.notEqual( diagonal.points[0].y, diagonal.points[1].y );

    for (const branch of branches) {
        const other = branches.find( edge => edge.id !== branch.id );

        assert.equal( branch.labels[0].text, '(0,N)' );

        for (const label of branch.labels) {
            assert.equal( onSegment( label.anchor, branch.points ), true );
            assert.equal( onSegment( label.anchor, other.points ), false );
            assert.deepEqual( label.leader[0], label.anchor );
            assert.notDeepEqual( label.leader[0], label.leader[1] );
            sceneAssertContained( label.bounds, {...label.leader[1], width: 0, height: 0} );
            sceneAssertContained( scene.bounds, label.bounds );

            for (const point of label.leader) {
                sceneAssertContained( scene.bounds, {...point, width: 0, height: 0} );
                }
            }

        assert.ok( svg.includes( `data-label-for="${branch.ref.id}"` ) );
        assert.ok( svg.includes( `data-label-leader="${branch.ref.id}"` ) );
        assert.ok( svg.includes( `data-label-anchor="${branch.ref.id}"` ) );
        }

    assert.ok( svg.lastIndexOf( 'class="participation-caption"' )
        > svg.indexOf( `data-conceptual-attribute-id="${date.id}"` ) );
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

test( 'G3: tres altas caben a 100% en un lienzo de 735px usando dos filas', () => {
    let model = emptyDocument();
    const area = {x: 20, y: 20, width: 695, height: 400};
    const preferred = {x: 280, y: 45};

    for (let index = 0; index < 3; index += 1) {
        const previous = JSON.stringify( model );
        const candidate = addTable( model, 'entity', preferred );
        const table = candidate.tables.at( -1 );
        const size = {width: tableWidth( table ), height: tableHeight( table )};
        const position = findFreePosition( model, preferred, size, area );

        assert.equal( JSON.stringify( model ), previous );
        model = updateTable( candidate, table.id, position );
        }

    const nodes = diagramScene( model ).nodes;

    for (const node of nodes) {
        sceneAssertContained( area, node );
        }

    assert.ok( new Set( nodes.map( node => node.y ) ).size >= 2 );
    assert.equal( nodes[0].x, preferred.x );
    assert.equal( nodes[0].y, preferred.y );
    } );

test( 'La colocación visible usa coordenadas de modelo tras pan y zoom', () => {
    const area = {x: 900, y: 750, width: 900, height: 600};
    const size = {width: 320, height: 92};
    const position = findFreePosition(
            emptyDocument(),
            {x: 2000, y: 100},
            size,
            area
            );

    sceneAssertContained( area, {...position, ...size} );
    assert.equal( position.x, 1480 );
    assert.equal( position.y, 750 );
    } );

test( 'Si no cabe otra forma visible, conserva posiciones y permite enfocar la nueva', () => {
    const area = {x: 130, y: 100, width: 320, height: 92};
    const model = addTable( emptyDocument(), 'entity', {x: 130, y: 100} );
    const before = JSON.stringify( model );
    const position = findFreePosition( model, {x: 130, y: 100}, {width: 320, height: 92}, area );

    assert.equal( JSON.stringify( model ), before );
    assert.ok( position.x >= area.x + area.width || position.y >= area.y + area.height );
    assert.throws(
            () => findFreePosition( model, {x: 130, y: 100}, undefined, {...area, width: NaN} ),
            /área visible/
            );
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
