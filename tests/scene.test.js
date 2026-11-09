import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import {
    addColumn,
    addConceptualAttribute,
    addConceptualEntity,
    addConceptualGeneralization,
    addConceptualRelationship,
    addRelationship,
    addTable,
    emptyDocument,
    moveDiagramElement,
    setDiagramMode,
    updateColumn,
    updateConceptualAttribute,
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
    resolveDiagramPosition,
    tableHeight,
    tableWidth
    } from '../src/ui/diagram.js';
import {
    parseDocument,
    serializeDocument
    } from '../src/domain/serialization.js';

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

function sceneRectanglesOverlap(
        first,
        second
        ) {
    return first.x < second.x + second.width
        && first.x + first.width > second.x
        && first.y < second.y + second.height
        && first.y + first.height > second.y;
    }

function sceneTwoRelationshipsFixture() {
    let model = addConceptualEntity(
            emptyDocument( 'course' ),
            {name: 'Persona'},
            {x: 100, y: 200}
            );

    model = addConceptualEntity( model, {name: 'Actividad'}, {x: 800, y: 200} );

    for (const [index, name] of ['Inscripcion', 'Reserva'].entries()) {
        model = addConceptualRelationship( model, {
            name,
            participations: model.conceptual.entities.map(
                    (entity, participant) => ({
                        entityId: entity.id,
                        role: participant === 0 ? 'persona' : 'actividad',
                        min: 0,
                        max: null
                        })
                    ),
            translation: null
            } );
        model.presentation.chen[model.conceptual.relationships.at( -1 ).id] = {
            x: 400,
            y: 50 + index * 130
            };
        }

    return setDiagramMode( model, 'chen' );
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

test( 'La nueva cardinalidad ternaria tiene rótulo y contexto propios dentro del SVG', () => {
    let model = sceneNativeFixture();
    const relation = model.conceptual.relationships[0];
    const period = model.conceptual.attributes.find( attribute => attribute.ownerId === relation.id );

    model = updateConceptualAttribute( model, period.id, {required: true} );

    for (const [index, part] of relation.participations.entries()) {
        model = updateConceptualParticipation(
                model,
                relation.id,
                part.id,
                {cardinality: index === 0 ? 'one' : 'many'}
                );
        }

    model = updateConceptualRelationship(
            model,
            relation.id,
            {
                translation: {
                    kind: 'association',
                    tableName: 'Colaboraciones',
                    key: {
                        participationIds: relation.participations.map( part => part.id ),
                        attributeIds: [period.id]
                        },
                    cardinalityContextAttributeIds: [period.id]
                    }
                }
            );
    const scene = diagramScene( model );
    const branches = scene.edges.filter( edge => edge.kind === 'participation' );

    for (const branch of branches) {
        const cardinality = branch.labels.find( label => label.purpose === 'combination-cardinality' );

        assert.match( cardinality.text, /combinación \+ fecha_inicio/ );
        assert.equal( branch.labels[0].text, `(${branch.participation.min},N)` );
        sceneAssertContained( scene.bounds, cardinality.bounds );

        for (const other of scene.edges.flatMap( edge => edge.labels )) {
            if (other !== cardinality) {
                assert.equal( sceneRectanglesOverlap( cardinality.bounds, other.bounds ), false );
                }
            }
        }

    const svg = exportSVG( model );

    assert.match( svg, /data-label-purpose="combination-cardinality"/ );
    assert.match( svg, /1 · combinación \+ fecha_inicio/ );
    assert.deepEqual( diagramBounds( model ), scene.bounds );

    model = updateConceptualParticipation(
            model,
            relation.id,
            relation.participations[0].id,
            {cardinality: 'many'}
            );
    model = updateConceptualRelationship(
            model,
            relation.id,
            {translation: {
                ...model.conceptual.relationships[0].translation,
                cardinalityContextAttributeIds: null
                }}
            );
    assert.doesNotMatch( exportSVG( model ), /contexto pendiente/ );
    } );

test( 'Auxiliares y tablas de clases conservan símbolos Chen y bounds de ambas vistas', async () => {
    for (const [file, semanticKind] of [
        ['03-multivaluados-resuelto/proyecto.databasic.json', 'attribute'],
        ['04-jerarquia-resuelta/proyecto.databasic.json', 'generalization']
        ]) {
        const model = parseDocument( await readFile(
                new URL( `../examples/${file}`, import.meta.url ),
                'utf8'
                ) );
        const original = serializeDocument( model );

        for (const mode of ['chen', 'relational']) {
            const variant = setDiagramMode( model, mode );
            const scene = diagramScene( variant );
            const svg = exportSVG( variant );

            for (const node of scene.nodes) {
                sceneAssertContained( scene.bounds, node );
                }

            for (const label of scene.edges.flatMap( edge => edge.labels )) {
                sceneAssertContained( scene.bounds, label.bounds );
                }

            assert.ok( !svg.includes( 'NaN' ) );
            assert.deepEqual( diagramBounds( variant ), scene.bounds );

            if (mode === 'chen') {
                assert.ok( scene.nodes.some( node => node.kind === semanticKind ) );
                assert.match( svg, semanticKind === 'attribute' ? /class="chen-inner"/ : /Especialización disjunta/ );
                }
            else {
                assert.equal( scene.nodes.length, model.tables.length );
                assert.equal( scene.edges.length, model.relationships.length );
                }
            }

        assert.equal( serializeDocument( model ), original );
        }
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

test( 'Las lecturas relacionales del ejemplo Graphviz no colisionan y conservan su conector', () => {
    let model = emptyDocument( 'course' );
    const positions = [{x: 50, y: 50}, {x: 50, y: 192}, {x: 456, y: 73}];

    for (const [index, name] of ['Persona', 'Actividad', 'Inscripcion'].entries()) {
        model = addTable( model, 'entity', positions[index] );
        model = updateTable( model, model.tables.at( -1 ).id, {name} );
        }

    for (const [index, inverse] of ['persona', 'actividad'].entries()) {
        model = addRelationship( model, model.tables[index].id, model.tables[2].id );
        model = updateRelationship( model, model.relationships.at( -1 ).id, {
            identifying: true,
            forward: 'Inscripcion',
            inverse
            } );
        }

    const expectedPoints = [
        [
            {x: 370, y: 133.67487684729065},
            {x: 413, y: 133.67487684729065},
            {x: 413, y: 148.71428571428572},
            {x: 456, y: 148.71428571428572}
            ],
        [
            {x: 350, y: 224},
            {x: 423, y: 224},
            {x: 423, y: 204.67487684729065},
            {x: 456, y: 204.67487684729065}
            ]
        ];
    const overlaps = (first, second) => first.x < second.x + second.width
        && first.x + first.width > second.x
        && first.y < second.y + second.height
        && first.y + first.height > second.y;

    for (const cardinality of [false, true]) {
        model.display.cardinality = cardinality;
        const scene = diagramScene( model );
        const captions = scene.edges.map( edge => edge.caption.bounds );
        const svg = exportSVG( model );

        assert.equal( overlaps( captions[0], captions[1] ), false );

        for (const [index, edge] of scene.edges.entries()) {
            assert.deepEqual( edge.points, expectedPoints[index] );
            assert.equal( edge.labels.length, cardinality ? 3 : 2 );
            assert.equal( edge.labels[0].text, '→ Inscripcion' );
            assert.equal( edge.labels[1].text, index === 0 ? '← persona' : '← actividad' );
            sceneAssertContained( scene.bounds, edge.caption.bounds );

            for (const node of scene.nodes) {
                assert.equal( overlaps( edge.caption.bounds, node ), false );
                const [start, end] = edge.caption.leader;
                const leaderArea = {
                    x: Math.min( start.x, end.x ) - 1,
                    y: Math.min( start.y, end.y ),
                    width: Math.abs( start.x - end.x ) + 2,
                    height: Math.abs( start.y - end.y )
                    };

                assert.equal( overlaps( leaderArea, node ), false );
                }

            for (const [labelIndex, label] of edge.labels.entries()) {
                sceneAssertContained( edge.caption.bounds, label.bounds );

                for (const other of edge.labels.slice( labelIndex + 1 )) {
                    assert.equal( overlaps( label.bounds, other.bounds ), false );
                    }
                }

            const anchor = edge.caption.anchor;

            assert.ok( edge.points.slice( 1 ).some(
                    (end, segmentIndex) => {
                        const start = edge.points[segmentIndex];

                        return anchor.x >= Math.min( start.x, end.x )
                            && anchor.x <= Math.max( start.x, end.x )
                            && anchor.y >= Math.min( start.y, end.y )
                            && anchor.y <= Math.max( start.y, end.y );
                        }
                    ) );
            assert.ok( svg.includes( `data-label-for="${edge.ref.id}"` ) );
            assert.ok( svg.includes( `data-label-leader="${edge.ref.id}"` ) );
            }
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

test( 'Las participaciones de dos relaciones Chen evitan rótulos de otras ramas', () => {
    const model = sceneTwoRelationshipsFixture();
    const before = JSON.stringify( model );
    const scene = diagramScene( model );
    const labels = scene.edges.flatMap( edge => edge.labels );

    // Four branches, each with (min,max), role and the 1/N letter by the diamond.
    assert.equal( labels.length, 12 );
    assert.equal( JSON.stringify( model ), before );

    for (const [index, label] of labels.entries()) {
        for (const other of labels.slice( index + 1 )) {
            assert.equal( sceneRectanglesOverlap( label.bounds, other.bounds ), false );
            }

        for (const node of scene.nodes) {
            assert.equal(
                    sceneRectanglesOverlap( label.bounds, {
                        ...node,
                        height: node.height + (node.pending ? 30 : 0)
                        } ),
                    false
                    );
            }

        sceneAssertContained( scene.bounds, label.bounds );
        }
    } );

test( 'Los rótulos Chen evitan una especialización que ocupa su antigua posición', () => {
    let model = sceneTwoRelationshipsFixture();
    const previousLabel = diagramScene( model ).edges.find(
            edge => edge.kind === 'participation'
            ).labels[0];

    model = addConceptualGeneralization( model, {
        supertypeId: model.conceptual.entities[0].id,
        subtypeIds: [model.conceptual.entities[1].id]
        } );
    model.presentation.chen[model.conceptual.generalizations[0].id] = {
        x: previousLabel.bounds.x,
        y: previousLabel.bounds.y
        };
    const scene = diagramScene( model );
    const generalization = scene.nodes.find( node => node.kind === 'generalization' );

    for (const label of scene.edges.flatMap( edge => edge.labels )) {
        assert.equal( sceneRectanglesOverlap( label.bounds, generalization ), false );
        }
    } );

test( 'Soltar un rombo junto a una entidad u otro rombo reserva el espacio pendiente', () => {
    const model = sceneTwoRelationshipsFixture();
    const before = JSON.stringify( model );
    const relation = model.conceptual.relationships[0];
    const original = diagramScene( model );
    const moving = original.nodes.find( node => node.ref.id === relation.id );
    const other = original.nodes.find(
            node => node.kind === 'chen-relationship' && node.ref.id !== relation.id
            );

    for (const preferred of [
        {x: 100, y: 200},
        {x: other.x, y: other.y + other.height + 8}
        ]) {
        const position = resolveDiagramPosition( model, relation.id, preferred );
        const next = moveDiagramElement( model, relation.id, position );
        const scene = diagramScene( next );
        const placed = scene.nodes.find( node => node.ref.id === relation.id );

        assert.equal( JSON.stringify( model ), before );
        assert.deepEqual( {x: placed.x, y: placed.y}, position );
        assert.notDeepEqual( position, preferred );
        assert.deepEqual( next.tables, model.tables );
        assert.deepEqual( next.relationships, model.relationships );
        assert.deepEqual( next.conceptual, model.conceptual );

        for (const node of scene.nodes.filter( item => item.ref.id !== relation.id )) {
            assert.equal(
                    sceneRectanglesOverlap(
                            {...placed, height: moving.height + 30},
                            {...node, height: node.height + (node.pending ? 30 : 0)}
                            ),
                    false
                    );
            }

        assert.deepEqual( parseDocument( serializeDocument( next ) ), next );
        }

    const free = {x: 1700, y: 1400};

    assert.deepEqual( resolveDiagramPosition( model, relation.id, free ), free );
    assert.throws( () => resolveDiagramPosition( model, relation.id, {x: NaN, y: 20} ), /finitas/ );
    assert.throws( () => resolveDiagramPosition( model, 'desconocido', free ), /arrastrable/ );
    } );

test( 'Los bloques FK conservan su posición libre y se separan al soltar sobre otra figura', () => {
    let model = sceneLinkedFixture();

    model = addTable( model, 'entity', {x: 1200, y: 1200} );
    model = addRelationship( model, model.tables[0].id, model.tables[2].id );
    const [first, second] = model.relationships;
    const initial = {x: 1700, y: 500};
    const fixed = {x: 1700, y: 950};

    model.presentation.relational = {[first.id]: initial, [second.id]: fixed};
    const before = JSON.stringify( model );
    const scene = diagramScene( model );
    const caption = scene.edges.find( edge => edge.ref.id === first.id ).caption;

    assert.deepEqual( {x: caption.bounds.x, y: caption.bounds.y}, initial );
    sceneAssertContained( diagramBounds( model ), caption.bounds );
    assert.deepEqual( parseDocument( serializeDocument( model ) ), model );
    assert.match( diagramContents( model ), /relationship-caption/ );

    for (const preferred of [{x: 100, y: 140}, fixed]) {
        const position = resolveDiagramPosition( model, first.id, preferred );
        const next = structuredClone( model );

        next.presentation.relational[first.id] = position;
        const result = diagramScene( next );
        const placed = result.edges.find( edge => edge.ref.id === first.id ).caption;
        const other = result.edges.find( edge => edge.ref.id === second.id ).caption;

        assert.notDeepEqual( position, preferred );
        assert.deepEqual( {x: placed.bounds.x, y: placed.bounds.y}, position );
        assert.deepEqual( {x: other.bounds.x, y: other.bounds.y}, fixed );
        assert.equal( sceneRectanglesOverlap( placed.bounds, other.bounds ), false );

        for (const node of result.nodes) {
            assert.equal( sceneRectanglesOverlap( placed.bounds, node ), false );
            }

        assert.deepEqual( result.edges.map( edge => edge.points ), scene.edges.map( edge => edge.points ) );
        sceneAssertContained( result.bounds, placed.bounds );
        }

    assert.equal( JSON.stringify( model ), before );
    const limited = resolveDiagramPosition( model, first.id, {x: 21000, y: 21000} );

    assert.ok( limited.x >= -20000 && limited.x + caption.bounds.width <= 20000 );
    assert.ok( limited.y >= -20000 && limited.y + caption.bounds.height <= 20000 );
    } );

test( 'El resolvedor también mueve tablas y rombos proyectados con sus identificadores existentes', () => {
    const model = sceneLinkedFixture();
    const before = JSON.stringify( model );
    const id = model.tables[0].id;
    const target = {x: model.tables[1].x, y: model.tables[1].y};
    const position = resolveDiagramPosition( model, id, target );
    const next = moveDiagramElement( model, id, position );
    const nodes = diagramScene( next ).nodes;

    assert.equal( sceneRectanglesOverlap( nodes[0], nodes[1] ), false );
    assert.deepEqual( next.relationships, model.relationships );

    const conceptual = setDiagramMode( model, 'chen' );
    const relationId = model.relationships[0].id;
    const entity = diagramScene( conceptual ).nodes.find( node => node.ref.id === id );
    const resolved = resolveDiagramPosition( conceptual, relationId, entity );
    const moved = moveDiagramElement( conceptual, relationId, resolved );
    const result = diagramScene( moved );
    const relation = result.nodes.find( node => node.ref.id === relationId );

    assert.deepEqual( {x: relation.x, y: relation.y}, resolved );
    assert.equal( sceneRectanglesOverlap( relation, entity ), false );
    assert.deepEqual( moved.tables, model.tables );
    assert.deepEqual( moved.relationships, model.relationships );
    assert.equal( JSON.stringify( model ), before );
    } );

test( 'Los IDs heredados de Object usan sólo coordenadas propias de los mapas', () => {
    for (const id of ['toString', 'valueOf']) {
        const model = sceneLinkedFixture();

        model.relationships[0].id = id;
        model.presentation.relational = {};
        const imported = parseDocument( serializeDocument( model ) );
        const automatic = diagramScene( imported ).edges[0].caption.bounds;

        assert.ok( [automatic.x, automatic.y].every( Number.isFinite ) );

        const relationalPosition = {x: 1800, y: 1000};

        imported.presentation.relational[id] = relationalPosition;
        const reopened = parseDocument( serializeDocument( imported ) );
        const manual = diagramScene( reopened ).edges[0].caption.bounds;

        assert.deepEqual( {x: manual.x, y: manual.y}, relationalPosition );

        const conceptual = setDiagramMode( imported, 'chen' );
        const projected = diagramScene( conceptual ).nodes.find( node => node.ref.id === id );

        assert.ok( [projected.x, projected.y].every( Number.isFinite ) );

        const conceptualPosition = {x: 2500, y: 1700};

        conceptual.presentation.chen[id] = conceptualPosition;
        const restored = parseDocument( serializeDocument( conceptual ) );
        const placed = diagramScene( restored ).nodes.find( node => node.ref.id === id );

        assert.deepEqual( {x: placed.x, y: placed.y}, conceptualPosition );
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

test( 'Cada rama Chen lleva la letra 1/N junto al rombo, opuesta al par (mín,máx)', () => {
    const model = setDiagramMode( sceneLinkedFixture(), 'chen' );
    const scene = diagramScene( model );
    const branches = scene.edges.filter( edge => edge.kind === 'participation' );
    const parent = branches.find( edge => edge.participation.entityId === model.tables[0].id );
    const child = branches.find( edge => edge.participation.entityId === model.tables[1].id );
    const letter = edge => edge.labels.find( label => label.purpose === 'cardinality' );

    // PADRE (0,N) e HIJO (0,1): la letra de PADRE es el máximo de HIJO, 1; la de HIJO, N.
    assert.equal( letter( parent ).text, '1' );
    assert.equal( letter( child ).text, 'N' );
    assert.equal( letter( parent ).plain, true );

    for (const edge of branches) {
        const pair = edge.labels.find( label => label.purpose === 'participation' );
        const diamond = edge.points[0];
        const distance = label => Math.hypot( label.x - diamond.x, label.y - diamond.y );

        assert.ok( distance( letter( edge ) ) < distance( pair ), 'la letra queda junto al rombo' );

        for (const node of scene.nodes) {
            assert.equal( sceneRectanglesOverlap( letter( edge ).bounds, node ), false );
            }

        sceneAssertContained( scene.bounds, letter( edge ).bounds );
        }

    const svg = diagramContents( model );

    assert.match( svg, /data-reading="cardinality" class="relation-label cardinality-letter"/ );
    assert.doesNotMatch( svg, /data-label-purpose="cardinality"/, 'la letra no lleva guía ni caja' );
    } );

test( 'El vínculo identificador dibuja rombo doble y las subclases llevan el arco', () => {
    let model = addConceptualEntity( emptyDocument( 'course' ), {name: 'Persona'}, {x: 100, y: 200} );
    const ownerId = model.conceptual.entities[0].id;

    model = addConceptualEntity( model, {name: 'Pago', weak: true, ownerEntityId: ownerId}, {x: 100, y: 700} );

    const childId = model.conceptual.entities[1].id;

    model = addConceptualRelationship( model, {
        name: 'Realiza',
        participations: [
            {entityId: ownerId, role: 'pagador', min: 0, max: null},
            {entityId: childId, role: 'abono', min: 1, max: 1}
            ],
        translation: null
        } );
    model = setDiagramMode( model, 'chen' );

    const relation = model.conceptual.relationships[0];
    const diamond = scene => scene.nodes.find( node => node.kind === 'chen-relationship' );

    assert.equal( diamond( diagramScene( model ) ).identifying, false );
    assert.match( diagramContents( model ), /chen-relation[^>]*data-identifying="false"/ );

    model = updateConceptualRelationship( model, relation.id, {
        translation: {kind: 'foreign-key', childParticipationId: relation.participations[1].id, identifying: true}
        } );
    assert.equal( diamond( diagramScene( model ) ).identifying, true );

    const svg = diagramContents( model );

    assert.match( svg, /chen-relation[^>]*data-identifying="true"/ );
    assert.match( svg, /vínculo identificador/ );
    assert.equal( (svg.match( /class="chen-inner"/g ) || []).length, 2, 'entidad débil y rombo dobles' );

    model = addConceptualEntity( model, {name: 'Agente'}, {x: 800, y: 700} );
    model = addConceptualGeneralization( model, {
        supertypeId: ownerId,
        subtypeIds: [model.conceptual.entities.at( -1 ).id],
        disjoint: true,
        total: true
        } );

    const links = diagramScene( model ).edges.filter( edge => edge.kind === 'generalization-link' );

    assert.deepEqual( links.map( edge => edge.subset ), [false, true] );
    assert.deepEqual( links.map( edge => edge.total ), [true, false] );
    assert.equal( (diagramContents( model ).match( /data-marker="subset"/g ) || []).length, 1 );
    } );

test( 'Una FK identificadora proyectada también se muestra como vínculo identificador', () => {
    let model = sceneLinkedFixture();

    model = updateRelationship( model, model.relationships[0].id, {identifying: true} );

    const scene = diagramScene( setDiagramMode( model, 'chen' ) );
    const diamond = scene.nodes.find( node => node.kind === 'chen-relationship' );
    const branches = scene.edges.filter( edge => edge.kind === 'participation' );

    assert.equal( diamond.identifying, true );
    assert.deepEqual(
            branches.map( edge => edge.labels.find( label => label.purpose === 'cardinality' ).text ).sort(),
            ['1', 'N']
            );
    } );
