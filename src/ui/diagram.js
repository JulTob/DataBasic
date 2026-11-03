import { escapeHTML } from './html.js';
import {
    buildDiagramScene,
    sceneFindFreePosition,
    sceneTableHeight,
    sceneTableWidth,
    SCENE_TABLE_WIDTH,
    SCENE_ROW_HEIGHT,
    SCENE_HEADER_HEIGHT
    } from './scene.js';

export const TABLE_WIDTH = SCENE_TABLE_WIDTH;
export const ROW_HEIGHT = SCENE_ROW_HEIGHT;
export const HEADER_HEIGHT = SCENE_HEADER_HEIGHT;

export function tableWidth( table ) {
    return sceneTableWidth( table );
    }

export function tableHeight( table ) {
    return sceneTableHeight( table );
    }

export function diagramScene( model ) {
    return buildDiagramScene( model );
    }

export function diagramBounds( model ) {
    return buildDiagramScene( model ).bounds;
    }

export function findFreePosition(
        model,
        preferred,
        size,
        area = null
        ) {
    return sceneFindFreePosition( model, preferred, size, area );
    }

function diagramReferenceAttributes( ref ) {
    const attributes = [
        `data-diagram-kind="${ref.kind}"`,
        `data-diagram-id="${escapeHTML( ref.id )}"`
        ];
    const legacy = {
        table: 'table-id',
        column: 'column-id',
        relationship: 'relation-id',
        participation: 'participation-id',
        'conceptual-entity': 'conceptual-entity-id',
        'conceptual-attribute': 'conceptual-attribute-id',
        'conceptual-relationship': 'conceptual-relationship-id',
        'conceptual-generalization': 'conceptual-generalization-id'
        };

    if (legacy[ref.kind]) {
        attributes.push( `data-${legacy[ref.kind]}="${escapeHTML( ref.id )}"` );
        }

    if (ref.ownerId) {
        attributes.push( `data-owner-id="${escapeHTML( ref.ownerId )}"` );
        }

    return attributes.join( ' ' );
    }

function diagramTextLines(
        lines,
        x,
        y,
        className,
        lineHeight = 19
        ) {
    return lines.map(
            (line, index) => `<text x="${x}" y="${y + index * lineHeight}"
                class="${className}">${escapeHTML( line )}</text>`
            ).join( '' );
    }

function diagramColumnKeys(
        model,
        table,
        field
        ) {
    const labels = field.primary ? ['PK'] : [];

    model.relationships.filter( relation => relation.childId === table.id ).forEach(
            (relation, index) => {
                if (relation.mappings.some( pair => pair.childColumnId === field.id )) {
                    labels.push( `FK${index + 1}` );
                    }
                }
            );
    (table.alternateKeys || []).forEach(
            (key, index) => {
                if (key.columns.includes( field.id )) {
                    labels.push( `AK${index + 1}` );
                    }
                }
            );

    return labels;
    }

function diagramTableRows(
        model,
        node,
        selectedId
        ) {
    return node.rows.map(
            (row, index) => {
                const field = row.field;
                const ref = {kind: 'column', id: field.id, ownerId: node.ref.id};
                const keys = model.display.keys
                    ? diagramColumnKeys( model, node.table, field ) : [];
                const keyLines = keys.length > 3
                    ? [...keys.slice( 0, 2 ), `+${keys.length - 2}`] : keys;
                const divider = field.primary && !node.rows[index + 1]?.field.primary
                    ? `<line class="primary-divider" x1="0" x2="${node.width}"
                        y1="${row.y + row.height}" y2="${row.y + row.height}"/>`
                    : '';
                const names = [...row.nameLines];

                if (model.display.required && field.required) {
                    names[names.length - 1] += ' *';
                    }

                return `<g ${diagramReferenceAttributes( ref )}
                    class="column-target ${selectedId === field.id ? 'selected-column' : ''}"
                    role="button" tabindex="0" aria-label="Columna ${escapeHTML( field.name )}, ${escapeHTML( field.type )}">
                    <title>${escapeHTML( field.name )}: ${escapeHTML( field.type )} · ${escapeHTML( keys.join( ', ' ) )}</title>
                    <rect class="column-hit" x="1" y="${row.y + 1}"
                        width="${node.width - 2}" height="${row.height - 2}"/>
                    ${diagramTextLines( keyLines, 12, row.y + 16, 'key-label', 13 )}
                    ${diagramTextLines(
                            names,
                            72,
                            row.y + 20,
                            `field-label ${field.required ? 'field-required' : ''}`
                            )}
                    ${model.display.types ? `<text x="72" y="${row.y + row.height - 9}"
                        class="type-label">${escapeHTML( field.type )}</text>` : ''}
                    ${divider}</g>`;
                }
            ).join( '' );
    }

function diagramTable(
        model,
        node,
        selectedId,
        parentId
        ) {
    const table = node.table;
    const selected = table.id === selectedId;
    const notation = model.display.notation || (model.display.crowsFeet ? 'crows-foot' : 'relational');
    const radius = notation === 'idef1x' ? (node.dependent ? 12 : 0) : 10;
    const title = model.display.conceptual ? table.conceptualName : table.name;
    const header = node.headerHeight;
    const bodyHeight = node.height - header;

    return `<g ${diagramReferenceAttributes( node.ref )}
        data-dependent="${node.dependent}" data-notation="${notation}"
        class="entity ${selected ? 'selected' : ''} ${parentId === table.id ? 'connect-parent' : ''}"
        transform="translate(${node.x},${node.y})" tabindex="0" role="button"
        aria-label="${table.kind === 'view' ? 'Vista SQL' : 'Entidad'} ${escapeHTML( title )}">
        <title>${escapeHTML( table.name )} · selecciona una columna para editarla</title>
        ${diagramTextLines(
                table.kind === 'view' ? [`◇ ${node.titleLines[0]}`, ...node.titleLines.slice( 1 )] : node.titleLines,
                0,
                21,
                'table-title',
                20
                )}
        <rect class="table-shadow" x="0" y="${header + 4}" rx="${radius}"
            width="${node.width}" height="${bodyHeight}"/>
        <rect class="table-body" y="${header}" rx="${radius}"
            width="${node.width}" height="${bodyHeight}"/>
        ${diagramTableRows( model, node, selectedId )}
        ${node.rows.length ? '' : `<text x="18" y="${header + 30}"
            class="empty-columns">Sin columnas</text>`}
        ${selected ? `<rect class="selection-outline" x="-4" y="${header - 4}"
            rx="${radius}" width="${node.width + 8}" height="${bodyHeight + 8}"/>` : ''}
        </g>`;
    }

function diagramPath( points ) {
    return points.map(
            (point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`
            ).join( ' ' );
    }

function diagramCrowFoot(
        endpoint,
        neighbor,
        many,
        optional
        ) {
    const angle = Math.atan2( neighbor.y - endpoint.y, neighbor.x - endpoint.x ) * 180 / Math.PI;
    const end = many
        ? '<path d="M0,-8 L14,0 L0,8 M14,0 L0,0"/>'
        : '<path d="M6,-8 L6,8"/>';
    const minimum = optional
        ? '<circle cx="26" cy="0" r="4.5" fill="white"/>'
        : '<path d="M24,-8 L24,8"/>';

    return `<g transform="translate(${endpoint.x},${endpoint.y}) rotate(${angle})"
        fill="none" stroke="currentColor" stroke-width="1.7">${end}${minimum}</g>`;
    }

function diagramIDEFMarkers( edge ) {
    const relation = edge.relation;
    const parent = edge.markers[0];
    const child = edge.markers[1];
    const end = edge.points.at( -1 );
    const neighbor = edge.points.at( -2 );
    const length = Math.hypot( neighbor.x - end.x, neighbor.y - end.y ) || 1;
    const outward = {
        x: (neighbor.x - end.x) / length,
        y: (neighbor.y - end.y) / length
        };
    const codeX = child.x + outward.x * 14 - outward.y * 10;
    const codeY = child.y + outward.y * 14 + outward.x * 10 + 4;
    const code = {
        'zero-many': '',
        'one-many': 'P',
        'zero-one': 'Z',
        'one-one': '1'
        }[relation.cardinality];
    const optional = relation.optional && !relation.identifying
        ? `<path data-marker="optional-parent" class="optional-parent"
            d="M${parent.x},${parent.y - 7} L${parent.x + 7},${parent.y}
                L${parent.x},${parent.y + 7} L${parent.x - 7},${parent.y} Z"/>`
        : '';

    return `${optional}<circle data-marker="child-dot" class="child-dot"
        cx="${child.x}" cy="${child.y}" r="4.5"/>
        ${code ? `<text data-marker="child-cardinality" x="${codeX}"
            y="${codeY}" text-anchor="middle" class="cardinality-code">${code}</text>` : ''}`;
    }

function diagramEdgeLabels( edge ) {
    return edge.labels.map(
            label => `<text x="${label.x}" y="${label.y}"
                data-reading="${label.purpose}" class="relation-label"
                text-anchor="middle">${escapeHTML( label.text )}</text>`
            ).join( '' );
    }

function diagramForeignKey(
        model,
        edge,
        selectedId
        ) {
    const relation = edge.relation;
    const notation = model.display.notation || (model.display.crowsFeet ? 'crows-foot' : 'relational');
    const points = edge.points;
    let markers = '';

    if (notation === 'idef1x') {
        markers = diagramIDEFMarkers( edge );
        }
    else if (notation === 'crows-foot') {
        markers = diagramCrowFoot( points[0], points[1], false, relation.optional )
            + diagramCrowFoot(
                    points.at( -1 ),
                    points.at( -2 ),
                    relation.cardinality.endsWith( 'many' ),
                    relation.cardinality.startsWith( 'zero' )
                    );
        }

    return `<g ${diagramReferenceAttributes( edge.ref )}
        data-notation="${notation}" data-identifying="${relation.identifying}"
        class="relationship ${relation.id === selectedId ? 'selected' : ''}"
        role="button" tabindex="0" aria-label="Relación ${escapeHTML( relation.name )}">
        <title>${escapeHTML( edge.parent.table.name )} ${escapeHTML( relation.forward )} ${escapeHTML( edge.child.table.name )};
            ${escapeHTML( edge.child.table.name )} ${escapeHTML( relation.inverse )} ${escapeHTML( edge.parent.table.name )}</title>
        <path class="relation-hit" d="${diagramPath( points )}"/>
        <path class="relation-line" d="${diagramPath( points )}"
            ${relation.identifying ? '' : 'stroke-dasharray="7 5"'}/>
        ${markers}${diagramEdgeLabels( edge )}</g>`;
    }

function diagramCenteredLines(
        node,
        lines,
        className,
        offset = 0
        ) {
    return diagramTextLines(
            lines,
            node.width / 2,
            node.height / 2 - (lines.length - 1) * 10 + 5 + offset,
            `${className} centered-label`,
            20
            );
    }

function diagramChenEntity(
        node,
        selectedId,
        parentId
        ) {
    const weak = node.entity.weak;
    const table = node.tableId && node.ref.kind !== 'table'
        ? `data-table-id="${escapeHTML( node.tableId )}"` : '';

    return `<g ${diagramReferenceAttributes( node.ref )} ${table}
        class="chen-node chen-entity ${node.ref.id === selectedId ? 'selected' : ''}
            ${node.ref.id === parentId ? 'connect-parent' : ''}"
        data-projected="${Boolean( node.entity.projected )}"
        transform="translate(${node.x},${node.y})" role="button" tabindex="0"
        aria-label="Entidad ${escapeHTML( node.entity.name )}">
        <title>${escapeHTML( node.entity.name )}${node.entity.projected ? ' · proyección parcial de tabla' : ''}</title>
        <rect class="chen-shape" width="${node.width}" height="${node.height}"/>
        ${weak ? `<rect class="chen-inner" x="5" y="5"
            width="${node.width - 10}" height="${node.height - 10}"/>` : ''}
        ${diagramCenteredLines( node, node.labelLines, 'chen-name' )}</g>`;
    }

function diagramChenAttribute(
        model,
        node,
        selectedId
        ) {
    const attribute = node.attribute;
    const centerX = node.width / 2;
    const centerY = node.height / 2;

    return `<g ${diagramReferenceAttributes( node.ref )}
        class="chen-node chen-attribute ${node.ref.id === selectedId ? 'selected' : ''}"
        transform="translate(${node.x},${node.y})" role="button" tabindex="0"
        aria-label="Atributo ${escapeHTML( attribute.name )}, ${escapeHTML( attribute.type || '' )}">
        <title>${escapeHTML( attribute.name )}: ${escapeHTML( attribute.type || '' )}${attribute.derived ? ' · derivado' : ''}</title>
        <ellipse class="chen-shape" cx="${centerX}" cy="${centerY}"
            rx="${centerX}" ry="${centerY}"
            ${attribute.derived ? 'stroke-dasharray="6 4"' : ''}/>
        ${attribute.multivalued ? `<ellipse class="chen-inner" cx="${centerX}" cy="${centerY}"
            rx="${centerX - 5}" ry="${centerY - 5}"/>` : ''}
        ${diagramCenteredLines(
                node,
                node.labelLines,
                `chen-name ${attribute.primary ? 'attribute-key' : ''} ${attribute.partialKey ? 'attribute-partial-key' : ''}`,
                model.display.types ? -10 : 0
                )}
        ${model.display.types && attribute.type ? `<text x="${centerX}"
            y="${centerY + node.labelLines.length * 10 + 11}"
            class="type-label centered-label">${escapeHTML( attribute.type )}</text>` : ''}</g>`;
    }

function diagramChenRelationship(
        node,
        selectedId
        ) {
    return `<g ${diagramReferenceAttributes( node.ref )}
        class="chen-node chen-relation ${node.ref.id === selectedId ? 'selected' : ''}"
        transform="translate(${node.x},${node.y})" role="button" tabindex="0"
        aria-label="Interrelación ${escapeHTML( node.relation.name )}">
        <title>${escapeHTML( node.relation.name )}${node.pending ? ' · transformación pendiente' : ''}</title>
        <path class="chen-shape" d="M${node.width / 2},0 L${node.width},${node.height / 2}
            L${node.width / 2},${node.height} L0,${node.height / 2} Z"/>
        ${diagramCenteredLines( node, node.labelLines, 'chen-name' )}
        ${node.pending ? `<text x="${node.width / 2}" y="${node.height + 21}"
            class="pending-label centered-label">Pendiente de transformar</text>` : ''}</g>`;
    }

function diagramGeneralization(
        node,
        selectedId
        ) {
    const generalization = node.generalization;

    return `<g ${diagramReferenceAttributes( node.ref )}
        class="chen-node ${node.ref.id === selectedId ? 'selected' : ''}"
        transform="translate(${node.x},${node.y})" role="button" tabindex="0"
        aria-label="Especialización ${generalization.disjoint ? 'disjunta' : 'solapada'}, ${generalization.total ? 'total' : 'parcial'}">
        <title>${generalization.disjoint ? 'Disjunta' : 'Solapada'} · ${generalization.total ? 'total' : 'parcial'}</title>
        <circle class="chen-shape" cx="21" cy="21" r="21"/>
        <text x="21" y="26" class="chen-name centered-label">${generalization.disjoint ? 'd' : 's'}</text></g>`;
    }

function diagramChenEdge(
        edge,
        selectedId
        ) {
    const path = diagramPath( edge.points );
    const start = edge.points[0];
    const end = edge.points.at( -1 );
    const angle = Math.atan2( end.y - start.y, end.x - start.x );
    const offsetX = -Math.sin( angle ) * 2.5;
    const offsetY = Math.cos( angle ) * 2.5;
    const secondLine = edge.total
        ? `<path class="relation-line" d="${path}"
            transform="translate(${offsetX},${offsetY})"/>`
        : '';

    return `<g ${diagramReferenceAttributes( edge.ref )}
        class="relationship ${edge.ref.id === selectedId ? 'selected' : ''}"
        role="button" tabindex="0">
        <path class="relation-hit" d="${path}"/>
        <path class="relation-line" d="${path}"
            ${edge.total ? `transform="translate(${-offsetX},${-offsetY})"` : ''}/>
        ${secondLine}${diagramEdgeLabels( edge )}</g>`;
    }

export const DIAGRAM_STYLES = `
    .table-shadow { fill: #254b3e0c; }
    .table-body { fill: #fff; stroke: #78988b; stroke-width: 1.5; }
    .table-title { font: 650 15px system-ui, sans-serif; fill: #234b3e; }
    .column-hit { fill: transparent; }
    .column-target { cursor: pointer; outline: none; }
    .column-target:hover .column-hit,
    .column-target:focus .column-hit,
    .selected-column .column-hit { fill: #edf7f2; }
    .field-label { font: 14px system-ui, sans-serif; fill: #243e33; }
    .field-required { font-weight: 600; }
    .key-label { font: 650 10px system-ui, sans-serif; fill: #8a5c14; }
    .type-label { font: 14px system-ui, sans-serif; fill: #526e60; }
    .primary-divider { stroke: #b8cec2; stroke-width: 1.4; }
    .empty-columns { font: italic 13px system-ui, sans-serif; fill: #718379; }
    .selection-outline { fill: none; stroke: #16805e; stroke-width: 2; }
    .connect-parent .table-body,
    .connect-parent .chen-shape { stroke: #bf771c; stroke-width: 3; }
    .entity { cursor: move; outline: none; }
    .entity:focus .table-body { stroke: #16805e; stroke-width: 2.5; }
    .relationship { color: #607e70; cursor: pointer; outline: none; }
    .relationship.selected, .relationship:focus { color: #147554; }
    .relation-line { fill: none; stroke: currentColor; stroke-width: 1.6; }
    .selected .relation-line { stroke-width: 2.4; }
    .relation-hit { fill: none; stroke: transparent; stroke-width: 18; }
    .relation-label {
        font: 14px system-ui, sans-serif;
        fill: currentColor;
        paint-order: stroke;
        stroke: white;
        stroke-width: 5px;
        stroke-linejoin: round;
        }
    .child-dot { fill: currentColor; }
    .optional-parent { fill: white; stroke: currentColor; stroke-width: 1.7; }
    .cardinality-code { font: 650 13px system-ui, sans-serif; fill: currentColor; }
    .chen-node { cursor: move; outline: none; }
    .chen-shape { fill: #fbfefc; stroke: #6e9482; stroke-width: 1.6; }
    .chen-inner { fill: none; stroke: #6e9482; stroke-width: 1.4; }
    .chen-node.selected .chen-shape,
    .chen-node:focus .chen-shape { stroke: #16805e; stroke-width: 2.7; }
    .chen-name { font: 14px system-ui, sans-serif; fill: #243e33; }
    .chen-entity .chen-name { font-weight: 650; font-size: 15px; }
    .centered-label { text-anchor: middle; }
    .attribute-key { text-decoration: underline; }
    .attribute-partial-key { text-decoration: underline dashed; }
    .pending-label { font: 12px system-ui, sans-serif; fill: #8a5c14; }
    `;

export function diagramContents(
        model,
        selectedId = null,
        parentId = null
        ) {
    const scene = buildDiagramScene( model );
    const edges = scene.edges.map(
            edge => edge.kind === 'foreign-key'
                ? diagramForeignKey( model, edge, selectedId )
                : diagramChenEdge( edge, selectedId )
            ).join( '' );
    const nodes = scene.nodes.map(
            node => {
                switch (node.kind) {
                    case 'table':
                        return diagramTable( model, node, selectedId, parentId );
                    case 'chen-entity':
                        return diagramChenEntity( node, selectedId, parentId );
                    case 'attribute':
                        return diagramChenAttribute( model, node, selectedId );
                    case 'chen-relationship':
                        return diagramChenRelationship( node, selectedId );
                    case 'generalization':
                        return diagramGeneralization( node, selectedId );
                    default:
                        throw new Error( 'Tipo de figura desconocido en el diagrama.' );
                    }
                }
            ).join( '' );

    return `<style>${DIAGRAM_STYLES}</style>${edges}${nodes}`;
    }

export function exportSVG( model ) {
    const bounds = diagramBounds( model );

    return `<svg xmlns="http://www.w3.org/2000/svg"
        width="${Math.ceil( bounds.width )}" height="${Math.ceil( bounds.height )}"
        viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}">
        <title>${escapeHTML( model.name )}</title>
        <rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}"
            height="${bounds.height}" fill="white"/>
        ${diagramContents( model )}</svg>`;
    }
