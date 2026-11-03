import { getConceptualProjection } from '../domain/model.js';

export const SCENE_TABLE_WIDTH = 320;
export const SCENE_ROW_HEIGHT = 48;
export const SCENE_HEADER_HEIGHT = 32;

function sceneTextWidth( text, size = 14 ) {
    return Array.from( String( text ) ).reduce(
            (width, character) => width + (/[MW@#%]/.test( character ) ? 0.95
                : /[ilI.,:;' !|]/.test( character ) ? 0.36 : 0.66) * size,
            0
            );
    }

function sceneWrapText( text, width, size = 14 ) {
    const lines = [''];

    for (const character of String( text )) {
        const last = lines.length - 1;

        if (lines[last] && sceneTextWidth( lines[last] + character, size ) > width) {
            lines.push( character );
            }
        else {
            lines[last] += character;
            }
        }

    return lines;
    }

export function sceneTableWidth( table ) {
    return Math.ceil( Math.max(
            SCENE_TABLE_WIDTH,
            Math.min( 540, sceneTextWidth( table.name, 15 ) + 36 ),
            Math.min( 540, sceneTextWidth( table.conceptualName || table.name, 15 ) + 36 ),
            ...table.columns.map(
                    field => Math.max(
                            Math.min( 540, sceneTextWidth( field.name ) + 88 ),
                            sceneTextWidth( field.type ) + 88
                            )
                    )
            ) );
    }

function sceneTableHeaderHeight( table ) {
    const width = sceneTableWidth( table ) - 8;
    const lines = Math.max(
            sceneWrapText( table.name, width, 15 ).length,
            sceneWrapText( table.conceptualName || table.name, width, 15 ).length
            );

    return SCENE_HEADER_HEIGHT + (lines - 1) * 20;
    }

function sceneTableRows( table ) {
    const width = sceneTableWidth( table );
    let y = sceneTableHeaderHeight( table );

    return table.columns.toSorted(
            (first, second) => Number( second.primary ) - Number( first.primary )
            ).map(
            field => {
                const nameLines = sceneWrapText( field.name, width - 88 );
                const height = SCENE_ROW_HEIGHT + (nameLines.length - 1) * 19;
                const row = {field, nameLines, y, height};

                y += height;
                return row;
                }
            );
    }

export function sceneTableHeight( table ) {
    return sceneTableHeaderHeight( table ) + 12 + Math.max(
            SCENE_ROW_HEIGHT,
            sceneTableRows( table ).reduce( (sum, row) => sum + row.height, 0 )
            );
    }

function sceneCenter( node ) {
    return {x: node.x + node.width / 2, y: node.y + node.height / 2};
    }

function scenePointOnNode(
        node,
        target,
        port = 0,
        portCount = 1
        ) {
    if (node.kind === 'table') {
        return scenePointOnNode(
                {
                    ...node,
                    kind: 'rectangle',
                    y: node.y + node.headerHeight,
                    height: node.height - node.headerHeight
                    },
                target,
                port,
                portCount
                );
        }

    const center = sceneCenter( node );
    let dx = target.x - center.x;
    let dy = target.y - center.y;

    if (!dx && !dy) {
        dx = 1;
        }

    if (node.kind === 'attribute' || node.kind === 'generalization') {
        const scale = 1 / Math.sqrt(
                (dx / (node.width / 2)) ** 2 + (dy / (node.height / 2)) ** 2
                );

        return {x: center.x + dx * scale, y: center.y + dy * scale};
        }

    if (node.kind === 'chen-relationship') {
        const scale = 1 / (
                Math.abs( dx ) / (node.width / 2)
                    + Math.abs( dy ) / (node.height / 2)
                );

        return {x: center.x + dx * scale, y: center.y + dy * scale};
        }

    const scale = Math.min(
            node.width / (2 * Math.abs( dx )),
            node.height / (2 * Math.abs( dy ))
            );
    const point = {x: center.x + dx * scale, y: center.y + dy * scale};

    if (portCount > 1) {
        const fraction = (port + 1) / (portCount + 1);

        if (Math.abs( dx ) / node.width >= Math.abs( dy ) / node.height) {
            point.y = node.y + node.height * fraction;
            }
        else {
            point.x = node.x + node.width * fraction;
            }
        }

    return point;
    }

function sceneLabel(
        text,
        x,
        y,
        purpose = 'name'
        ) {
    const width = sceneTextWidth( text, 14 ) + 14;

    return {
        text,
        x,
        y,
        purpose,
        bounds: {x: x - width / 2, y: y - 16, width, height: 22}
        };
    }

function sceneOverlaps(
        first,
        second,
        gap = 28
        ) {
    return first.x < second.x + second.width + gap
        && first.x + first.width + gap > second.x
        && first.y < second.y + second.height + gap
        && first.y + first.height + gap > second.y;
    }

function sceneFreePosition(
        preferred,
        size,
        occupied,
        area = null
        ) {
    if (area) {
        const visible = sceneVisibleFreePosition( preferred, size, occupied, area );

        if (visible) {
            return visible;
            }
        }

    for (let row = 0; row < 80; row += 1) {
        for (let column = 0; column < 4; column += 1) {
            const candidate = {
                x: Math.max( 20, preferred.x ) + column * (size.width + 72),
                y: Math.max( 20, preferred.y ) + row * (size.height + 72),
                ...size
                };

            if (candidate.x > 19000 || candidate.y > 19000) {
                continue;
                }

            if (!occupied.some( node => sceneOverlaps( candidate, node ) )) {
                return {x: candidate.x, y: candidate.y};
                }
            }
        }

    throw new Error( 'No queda espacio libre en esta zona del diagrama.' );
    }

function sceneCandidateAxis(
        start,
        end,
        extent
        ) {
    const positions = [];

    for (let position = start; position + extent <= end; position += extent + 28) {
        positions.push( position );
        }

    if (end - extent >= start) {
        positions.push( end - extent );
        }

    return [...new Set( positions )];
    }

function sceneVisibleFreePosition(
        preferred,
        size,
        occupied,
        area
        ) {
    if (![area.x, area.y, area.width, area.height].every( Number.isFinite )
        || area.width <= 0 || area.height <= 0) {
        throw new Error( 'El área visible necesita una posición y un tamaño válidos.' );
        }

    const left = Math.max( 20, area.x );
    const top = Math.max( 20, area.y );
    const right = Math.min( 20000, area.x + area.width );
    const bottom = Math.min( 20000, area.y + area.height );

    if (right - left < size.width || bottom - top < size.height) {
        return null;
        }

    const first = {
        x: Math.min( right - size.width, Math.max( left, preferred.x ) ),
        y: Math.min( bottom - size.height, Math.max( top, preferred.y ) )
        };
    const candidates = [first];

    for (const y of sceneCandidateAxis( top, bottom, size.height )) {
        for (const x of sceneCandidateAxis( left, right, size.width )) {
            candidates.push({x, y});
            }
        }

    return candidates.find(
            position => !occupied.some(
                    node => sceneOverlaps( {...position, ...size}, node )
                    )
            ) || null;
    }

function sceneRelationalNode(
        model,
        table
        ) {
    const dependent = model.relationships.some(
            relation => relation.childId === table.id
                && relation.mappings.length > 0
                && relation.mappings.every(
                        pair => table.columns.some(
                                field => field.id === pair.childColumnId && field.primary
                                )
                        )
            );

    return {
        id: `table:${table.id}`,
        ref: {kind: 'table', id: table.id},
        kind: 'table',
        x: table.x,
        y: table.y,
        width: sceneTableWidth( table ),
        height: sceneTableHeight( table ),
        headerHeight: sceneTableHeaderHeight( table ),
        titleLines: sceneWrapText(
                model.display.conceptual ? table.conceptualName : table.name,
                sceneTableWidth( table ) - 8,
                15
                ),
        table,
        rows: sceneTableRows( table ),
        dependent
        };
    }

function sceneRelationalPoints(
        parent,
        child,
        index
        ) {
    const startCenter = sceneCenter( parent );
    const endCenter = sceneCenter( child );

    if (parent.id === child.id) {
        const x = parent.x + parent.width;
        const outer = x + 100 + index * 28;

        return [
            {x, y: startCenter.y - 24},
            {x: outer, y: startCenter.y - 24},
            {x: outer, y: startCenter.y + 28},
            {x, y: startCenter.y + 28}
            ];
        }

    const start = scenePointOnNode( parent, endCenter );
    const end = scenePointOnNode( child, startCenter );
    const horizontal = Math.abs( startCenter.x - endCenter.x )
        >= Math.abs( startCenter.y - endCenter.y );

    if (horizontal) {
        const middle = (start.x + end.x) / 2 + index * 20;

        return [start, {x: middle, y: start.y}, {x: middle, y: end.y}, end];
        }

    const middle = (start.y + end.y) / 2 + index * 20;

    return [start, {x: start.x, y: middle}, {x: end.x, y: middle}, end];
    }

function sceneMarkerPoint(
        endpoint,
        neighbor,
        distance
        ) {
    const length = Math.hypot( neighbor.x - endpoint.x, neighbor.y - endpoint.y ) || 1;

    return {
        x: endpoint.x + (neighbor.x - endpoint.x) / length * distance,
        y: endpoint.y + (neighbor.y - endpoint.y) / length * distance
        };
    }

function sceneRelationalEdge(
        model,
        relation,
        nodes,
        index
        ) {
    const parent = nodes.find( node => node.ref.id === relation.parentId );
    const child = nodes.find( node => node.ref.id === relation.childId );
    const points = sceneRelationalPoints( parent, child, index );
    const start = points[0];
    const end = points.at( -1 );
    const labels = [];
    const centerX = (parent.x + parent.width / 2 + child.x + child.width / 2) / 2;
    const labelY = Math.min( parent.y, child.y ) - 30 - index * 50;

    if (model.display.relationshipNames) {
        if (relation.forward) {
            labels.push( sceneLabel( `→ ${relation.forward}`, centerX, labelY, 'forward' ) );
            }

        if (relation.inverse) {
            labels.push( sceneLabel( `← ${relation.inverse}`, centerX, labelY + 21, 'inverse' ) );
            }
        }

    if (model.display.cardinality) {
        const maximum = relation.cardinality.endsWith( 'many' ) ? 'N' : '1';
        const minimum = relation.cardinality.startsWith( 'zero' ) ? '0' : '1';

        labels.push( sceneLabel(
                `${relation.optional ? '0..1' : '1..1'} : ${minimum}..${maximum}`,
                centerX,
                labelY - 22,
                'cardinality'
                ) );
        }

    return {
        id: `foreign-key:${relation.id}`,
        ref: {kind: 'relationship', id: relation.id},
        kind: 'foreign-key',
        sourceId: parent.id,
        targetId: child.id,
        relation,
        points,
        labels,
        parent,
        child,
        markers: [
            {...sceneMarkerPoint( start, points[1], 10 ), kind: 'parent'},
            {...sceneMarkerPoint( end, points.at( -2 ), 8 ), kind: 'child'}
            ]
        };
    }

function sceneConceptualRef(
        item,
        kind
        ) {
    if (item.projected) {
        const legacy = {
            entity: 'table',
            attribute: 'column',
            relationship: 'relationship'
            };

        return {
            kind: legacy[kind],
            id: item.id,
            ...(kind === 'attribute' ? {ownerId: item.tableId || item.ownerId} : {})
            };
        }

    return {
        kind: `conceptual-${kind}`,
        id: item.id,
        ...(kind === 'attribute' ? {ownerId: item.ownerId} : {})
        };
    }

function sceneSavedPosition(
        model,
        id,
        preferred,
        size,
        occupied
        ) {
    const saved = model.presentation?.chen?.[id];

    return saved
        ? {x: saved.x, y: saved.y}
        : sceneFreePosition( preferred, size, occupied );
    }

function sceneConceptualEntities(
        model,
        graph
        ) {
    const nodes = [];

    for (const [index, entity] of graph.entities.entries()) {
        const width = Math.max( 180, Math.min( 360, sceneTextWidth( entity.name, 15 ) + 38 ) );
        const labelLines = sceneWrapText( entity.name, width - 26, 15 );
        const size = {width, height: Math.max( 60, labelLines.length * 22 + 24 )};
        const preferred = {x: 180 + (index % 3) * 850, y: 240 + Math.floor( index / 3 ) * 650};
        const position = sceneSavedPosition( model, entity.id, preferred, size, nodes );
        const trace = model.traces?.find(
                item => item.sourceKind === 'entity' && item.sourceId === entity.id
                    && item.targetKind === 'table'
                );

        nodes.push({
            id: `entity:${entity.id}`,
            ref: sceneConceptualRef( entity, 'entity' ),
            kind: 'chen-entity',
            ...position,
            ...size,
            entity,
            tableId: entity.tableId || trace?.targetId,
            labelLines
            });
        }

    return nodes;
    }

function sceneConceptualRelationships(
        model,
        graph,
        nodes
        ) {
    for (const relation of graph.relationships) {
        const participants = relation.participations.map(
                participation => nodes.find( node => node.ref.id === participation.entityId )
                );
        const centers = participants.map( sceneCenter );
        const center = {
            x: centers.reduce( (sum, point) => sum + point.x, 0 ) / centers.length,
            y: centers.reduce( (sum, point) => sum + point.y, 0 ) / centers.length
            };
        const labelLines = sceneWrapText( relation.name, 135 );
        const size = {width: 220, height: Math.max( 100, labelLines.length * 22 + 50 )};
        const recursive = new Set( relation.participations.map( item => item.entityId ) ).size === 1;
        const preferred = {
            x: center.x + (recursive ? participants[0].width + 130 : -size.width / 2),
            y: center.y + (recursive ? 80 : -size.height / 2)
            };
        const position = sceneSavedPosition( model, relation.id, preferred, size, nodes );

        nodes.push({
            id: `chen-relationship:${relation.id}`,
            ref: sceneConceptualRef( relation, 'relationship' ),
            kind: 'chen-relationship',
            ...position,
            ...size,
            relation,
            labelLines,
            pending: !relation.projected && relation.translation === null
            });
        }
    }

function sceneConceptualAttributes(
        model,
        graph,
        nodes
        ) {
    const pending = [...graph.attributes];
    const ownerCounts = new Map();

    while (pending.length) {
        const index = pending.findIndex(
                attribute => nodes.some(
                        node => node.ref.id === (attribute.parentAttributeId || attribute.ownerId)
                        )
                );

        if (index < 0) {
            throw new Error( 'Un atributo no tiene propietario visible en Chen.' );
            }

        const attribute = pending.splice( index, 1 )[0];
        const ownerId = attribute.parentAttributeId || attribute.ownerId;
        const owner = nodes.find( node => node.ref.id === ownerId );
        const ordinal = ownerCounts.get( ownerId ) || 0;

        ownerCounts.set( ownerId, ordinal + 1 );

        const nameLines = sceneWrapText( attribute.name, 190 );
        const width = Math.max(
                180,
                Math.min( 290, sceneTextWidth( attribute.name ) + 65 ),
                model.display.types ? sceneTextWidth( attribute.type || '' ) + 72 : 0
                );
        const size = {
            width,
            height: Math.max( 80, nameLines.length * 20 + (model.display.types ? 58 : 34) )
            };
        const preferred = {
            x: owner.x + owner.width + 105,
            y: Math.max( 20, owner.y - 110 + ordinal * (size.height + 35) )
            };
        const position = sceneSavedPosition( model, attribute.id, preferred, size, nodes );

        nodes.push({
            id: `attribute:${attribute.id}`,
            ref: sceneConceptualRef( attribute, 'attribute' ),
            kind: 'attribute',
            ...position,
            ...size,
            attribute,
            ownerId,
            labelLines: nameLines
            });
        }
    }

function sceneBranchLabel(
        text,
        purpose,
        origin,
        normal,
        obstacles
        ) {
    let label = sceneLabel(
            text,
            origin.x + normal.x * 22,
            origin.y + normal.y * 22,
            purpose
            );

    for (let pass = 0; pass < obstacles.length; pass += 1) {
        const obstacle = obstacles.find( item => sceneOverlaps( label.bounds, item, 2 ) );

        if (!obstacle) {
            return label;
            }

        const distances = [];

        for (const axis of ['x', 'y']) {
            const extent = axis === 'x' ? 'width' : 'height';

            if (normal[axis] > 0) {
                distances.push(
                        (obstacle[axis] + obstacle[extent] + 2 - label.bounds[axis])
                            / normal[axis]
                        );
                }
            else if (normal[axis] < 0) {
                distances.push(
                        (label.bounds[axis] + label.bounds[extent] + 2 - obstacle[axis])
                            / -normal[axis]
                        );
                }
            }

        // Continue outward along the same side; a cleared box stays behind.
        const distance = Math.min( ...distances ) + 1;

        label = sceneLabel(
                text,
                label.x + normal.x * distance,
                label.y + normal.y * distance,
                purpose
                );
        }

    return label;
    }

function sceneParticipationEdge(
        relationNode,
        participation,
        nodes
        ) {
    const entity = nodes.find( node => node.ref.id === participation.entityId );
    const siblings = relationNode.relation.participations.filter(
            item => item.entityId === participation.entityId
            );
    const port = siblings.findIndex( item => item.id === participation.id );
    const end = scenePointOnNode( entity, sceneCenter( relationNode ), port, siblings.length );
    const start = scenePointOnNode( relationNode, end );
    const dx = start.x - end.x;
    const dy = start.y - end.y;
    const length = Math.hypot( dx, dy ) || 1;
    const normal = dx || dy ? {x: -dy / length, y: dx / length} : {x: 0, y: 1};
    const side = siblings.length > 1 && port === 0 ? -1 : 1;
    const outward = {x: normal.x * side, y: normal.y * side};
    const obstacles = nodes.map(
            node => ({...node, height: node.height + (node.pending ? 30 : 0)})
            );
    const labels = [sceneBranchLabel(
            `(${participation.min},${participation.max === null ? 'N' : participation.max})`,
            'participation',
            {x: end.x + dx * 0.2, y: end.y + dy * 0.2},
            outward,
            obstacles
            )];

    if (participation.role) {
        labels.push( sceneBranchLabel(
                participation.role,
                'role',
                {x: end.x + dx * 0.5, y: end.y + dy * 0.5},
                {x: -outward.x, y: -outward.y},
                [...obstacles, labels[0].bounds]
                ) );
        }

    return {
        id: `participation:${participation.id}`,
        ref: {kind: 'participation', id: participation.id, ownerId: relationNode.ref.id},
        kind: 'participation',
        sourceId: relationNode.id,
        targetId: entity.id,
        participation,
        points: [start, end],
        labels,
        total: participation.min > 0
        };
    }

function sceneGeneralizations(
        model,
        graph,
        nodes,
        edges
        ) {
    for (const generalization of graph.generalizations) {
        const parent = nodes.find( node => node.ref.id === generalization.supertypeId );
        const size = {width: 42, height: 42};
        const position = sceneSavedPosition(
                model,
                generalization.id,
                {x: parent.x + parent.width / 2 - 21, y: parent.y + parent.height + 100},
                size,
                nodes
                );
        const node = {
            id: `generalization:${generalization.id}`,
            ref: {kind: 'conceptual-generalization', id: generalization.id},
            kind: 'generalization',
            ...position,
            ...size,
            generalization
            };

        nodes.push( node );

        for (const [index, entityId] of [generalization.supertypeId, ...generalization.subtypeIds].entries()) {
            const entity = nodes.find( item => item.ref.id === entityId );

            edges.push({
                id: `${node.id}:${entityId}`,
                ref: node.ref,
                kind: 'generalization-link',
                sourceId: node.id,
                targetId: entity.id,
                points: [
                    scenePointOnNode( node, sceneCenter( entity ) ),
                    scenePointOnNode( entity, sceneCenter( node ) )
                    ],
                labels: [],
                total: index === 0 && generalization.total
                });
            }
        }
    }

function sceneChen( model ) {
    const graph = getConceptualProjection( model );
    const nodes = sceneConceptualEntities( model, graph );
    const edges = [];

    sceneConceptualRelationships( model, graph, nodes );
    sceneConceptualAttributes( model, graph, nodes );

    for (const node of nodes) {
        if (node.kind === 'chen-relationship') {
            edges.push( ...node.relation.participations.map(
                    participation => sceneParticipationEdge( node, participation, nodes )
                    ) );
            }
        else if (node.kind === 'attribute') {
            const owner = nodes.find( item => item.ref.id === node.ownerId );

            edges.push({
                id: `attribute-link:${node.ref.id}`,
                ref: node.ref,
                kind: 'attribute-link',
                sourceId: owner.id,
                targetId: node.id,
                points: [
                    scenePointOnNode( owner, sceneCenter( node ) ),
                    scenePointOnNode( node, sceneCenter( owner ) )
                    ],
                labels: []
                });
            }
        }

    sceneGeneralizations( model, graph, nodes, edges );

    return {nodes, edges};
    }

function sceneCompleteBounds(
        nodes,
        edges
        ) {
    const rectangles = nodes.map(
            node => ({...node, height: node.height + (node.pending ? 30 : 0)})
            );

    for (const edge of edges) {
        rectangles.push( ...edge.labels.map( label => label.bounds ) );
        rectangles.push( ...edge.points.map(
                point => ({x: point.x - 24, y: point.y - 24, width: 48, height: 48})
                ) );
        }

    if (!rectangles.length) {
        return {x: 0, y: 0, width: 800, height: 500};
        }

    const x = Math.min( ...rectangles.map( item => item.x ) ) - 36;
    const y = Math.min( ...rectangles.map( item => item.y ) ) - 36;
    const right = Math.max( ...rectangles.map( item => item.x + item.width ) ) + 36;
    const bottom = Math.max( ...rectangles.map( item => item.y + item.height ) ) + 36;

    return {x, y, width: right - x, height: bottom - y};
    }

/** The scene contains references, never new domain identities or mutations. */
export function buildDiagramScene( model ) {
    const mode = model.display.mode || 'relational';
    const contents = mode === 'chen' ? sceneChen( model ) : {
        nodes: model.tables.map( table => sceneRelationalNode( model, table ) ),
        edges: []
        };

    if (mode === 'relational') {
        contents.edges = model.relationships.map(
                (relation, index) => sceneRelationalEdge( model, relation, contents.nodes, index )
                );
        }

    return {
        mode,
        ...contents,
        bounds: sceneCompleteBounds( contents.nodes, contents.edges )
        };
    }

export function sceneFindFreePosition(
        model,
        preferred,
        size = {width: SCENE_TABLE_WIDTH, height: 180},
        area = null
        ) {
    return sceneFreePosition( preferred, size, buildDiagramScene( model ).nodes, area );
    }
