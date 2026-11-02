import { escapeHTML } from './html.js';
import { CARDINALITIES } from '../domain/model.js';

export const TABLE_WIDTH = 242;
export const ROW_HEIGHT = 25;
export const HEADER_HEIGHT = 35;

export function tableHeight( table ) {
    return HEADER_HEIGHT + Math.max( 1, table.columns.length ) * ROW_HEIGHT + 9;
    }

function shortText(
        value,
        limit
        ) {
    return escapeHTML( value.length > limit ? `${value.slice( 0, limit - 1 )}…` : value );
    }

function tableSVG(
        model,
        table,
        selectedId,
        parentId
        ) {
    const height = tableHeight( table );
    const selected = table.id === selectedId;
    const foreignIds = new Set(
            model.relationships.filter( relation => relation.childId === table.id )
                .flatMap( relation => relation.mappings.map( pair => pair.childColumnId ) )
            );
    const fields = table.columns.toSorted(
            (first, second) => Number( second.primary ) - Number( first.primary )
            );
    const rows = fields.map(
            (field, index) => {
                const y = HEADER_HEIGHT + 19 + index * ROW_HEIGHT;
                const key = [
                    field.primary ? 'PK' : '',
                    foreignIds.has( field.id ) ? 'FK' : ''
                    ].filter( Boolean ).join( ',' );
                const divider = field.primary && !fields[index + 1]?.primary
                    ? `<line x1="0" x2="${TABLE_WIDTH}" y1="${y + 8}" y2="${y + 8}"
                        stroke="#929a9f"/>`
                    : '';

                return `<g><title>${escapeHTML( field.name )}: ${escapeHTML( field.type )}</title>
                    <text x="10" y="${y}" class="key-label">${model.display.keys ? key : ''}</text>
                    <text x="${model.display.keys ? 52 : 12}" y="${y}"
                        class="field-label ${field.required ? 'field-required' : ''}">
                        ${shortText( field.name, model.display.types ? 17 : 25 )}${model.display.required && field.required ? '*' : ''}
                    </text>
                    ${model.display.types ? `<text x="232" y="${y}" class="type-label"
                        text-anchor="end">${shortText( field.type, 15 )}</text>` : ''}
                    ${divider}</g>`;
                }
            ).join( '' );

    return `<g data-table-id="${escapeHTML( table.id )}"
        class="entity ${selected ? 'selected' : ''} ${parentId === table.id ? 'connect-parent' : ''}"
        transform="translate(${table.x},${table.y})" tabindex="0" role="button"
        aria-label="${table.kind === 'view' ? 'Vista' : 'Entidad'} ${escapeHTML( table.name )}">
        <title>${escapeHTML( table.name )} · doble clic para editar columnas</title>
        <rect class="table-shadow" x="3" y="4" width="${TABLE_WIDTH}" height="${height}"/>
        <rect class="table-body" width="${TABLE_WIDTH}" height="${height}"/>
        <rect class="table-header" x="0.5" y="0.5" width="${TABLE_WIDTH - 1}" height="${HEADER_HEIGHT}"/>
        <text x="${TABLE_WIDTH / 2}" y="23" text-anchor="middle" class="table-title">
            ${table.kind === 'view' ? '◇ ' : ''}${shortText( model.display.conceptual ? table.conceptualName : table.name, 29 )}
        </text>
        ${rows || `<text x="14" y="58" class="empty-columns">Sin columnas</text>`}
        ${selected ? `<rect class="selection-outline" x="-3" y="-3"
            width="${TABLE_WIDTH + 6}" height="${height + 6}"/>` : ''}
        </g>`;
    }

function cardinalityMarker(
        x,
        y,
        angle,
        many,
        optional
        ) {
    const end = many
        ? '<path d="M0,-8 L-14,0 L0,8 M-14,0 L0,0"/>'
        : '<path d="M-6,-8 L-6,8"/>';
    const minimum = optional
        ? '<circle cx="-24" cy="0" r="4.5" fill="white"/>'
        : '<path d="M-22,-8 L-22,8"/>';

    return `<g transform="translate(${x},${y}) rotate(${angle})"
        fill="none" stroke="currentColor" stroke-width="1.7">${end}${minimum}</g>`;
    }

function relationshipSVG(
        model,
        relation,
        selectedId
        ) {
    const parent = model.tables.find( table => table.id === relation.parentId );
    const child = model.tables.find( table => table.id === relation.childId );
    const self = parent.id === child.id;
    const right = child.x >= parent.x;
    const startX = parent.x + (right ? TABLE_WIDTH : 0);
    const startY = parent.y + tableHeight( parent ) / 2;
    const endX = self ? startX : child.x + (right ? 0 : TABLE_WIDTH);
    const endY = self
        ? parent.y + Math.min( tableHeight( parent ) - 15, tableHeight( parent ) / 2 + 42 )
        : child.y + tableHeight( child ) / 2;
    const middle = self ? startX + 90 : (startX + endX) / 2;
    const path = `M${startX},${startY} H${middle} V${endY} H${endX}`;
    const many = relation.cardinality.endsWith( 'many' );
    const zero = relation.cardinality.startsWith( 'zero' );
    const markers = model.display.crowsFeet
        ? cardinalityMarker( startX, startY, right ? 180 : 0, false, relation.optional )
            + cardinalityMarker( endX, endY, self || !right ? 180 : 0, many, zero )
        : `<path d="M${startX + (right ? 12 : -12)},${startY - 5}
            L${startX},${startY} L${startX + (right ? 12 : -12)},${startY + 5}"
            fill="none" stroke="currentColor" stroke-width="1.6"/>`;
    const code = CARDINALITIES.find( item => item[0] === relation.cardinality )[2];
    const label = [
        model.display.relationshipNames ? relation.forward : '',
        model.display.cardinality ? `${relation.optional ? '0..1' : '1'} : ${code}` : ''
        ].filter( Boolean ).join( ' · ' );

    return `<g data-relation-id="${escapeHTML( relation.id )}"
        class="relationship ${relation.id === selectedId ? 'selected' : ''}"
        tabindex="0" role="button" aria-label="Relación ${escapeHTML( relation.name )}">
        <title>${escapeHTML( parent.name )} → ${escapeHTML( child.name )}: ${escapeHTML( relation.name )}</title>
        <path class="relation-hit" d="${path}"/>
        <path class="relation-line" d="${path}" ${relation.identifying ? '' : 'stroke-dasharray="6 4"'}/>
        ${markers}
        ${label ? `<text x="${middle}" y="${Math.min( startY, endY ) - 13}"
            class="relation-label" text-anchor="middle">${escapeHTML( label )}</text>` : ''}
        </g>`;
    }

export const DIAGRAM_STYLES = `
    .table-shadow { fill: #00000010; }
    .table-body { fill: #fff; stroke: #465362; stroke-width: 1.2; }
    .table-header { fill: #eef2f7; stroke: #465362; stroke-width: 0.7; }
    .table-title { font: 600 13px 'Segoe UI', Arial, sans-serif; fill: #182c43; }
    .field-label { font: 12px 'Segoe UI', Arial, sans-serif; fill: #253445; }
    .field-required { font-weight: 600; }
    .key-label { font: 10px Arial, sans-serif; fill: #8e6a20; }
    .type-label { font: 10px 'Segoe UI', Arial, sans-serif; fill: #7a8490; }
    .empty-columns { font: italic 11px Arial, sans-serif; fill: #8b96a0; }
    .selection-outline { fill: none; stroke: #3285cf; stroke-width: 1.5; }
    .connect-parent .table-body { stroke: #e18a17; stroke-width: 3; }
    .entity { cursor: move; outline: none; }
    .entity:focus .table-body { stroke: #3285cf; stroke-width: 2; }
    .relationship { color: #536579; cursor: pointer; outline: none; }
    .relationship.selected, .relationship:focus { color: #187ac4; }
    .relation-line { fill: none; stroke: currentColor; stroke-width: 1.4; }
    .selected .relation-line { stroke-width: 2.3; }
    .relation-hit { fill: none; stroke: transparent; stroke-width: 20; }
    .relation-label { font: 11px 'Segoe UI', Arial, sans-serif; fill: currentColor;
        paint-order: stroke; stroke: white; stroke-width: 5px; stroke-linejoin: round; }
    `;

export function diagramContents(
        model,
        selectedId = null,
        parentId = null
        ) {
    return `<style>${DIAGRAM_STYLES}</style>
        ${model.relationships.map( relation => relationshipSVG( model, relation, selectedId ) ).join( '' )}
        ${model.tables.map( table => tableSVG( model, table, selectedId, parentId ) ).join( '' )}`;
    }

export function exportSVG( model ) {
    const width = Math.max( 800, ...model.tables.map( table => table.x + TABLE_WIDTH + 140 ) );
    const height = Math.max( 500, ...model.tables.map( table => table.y + tableHeight( table ) + 80 ) );

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"
        viewBox="0 0 ${width} ${height}">
        <title>${escapeHTML( model.name )}</title>
        <rect width="100%" height="100%" fill="white"/>
        ${diagramContents( model )}</svg>`;
    }
