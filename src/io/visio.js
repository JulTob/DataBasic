import { setDiagramMode } from '../domain/model.js';
import {
    buildDiagramScene,
    sceneColumnKeys
    } from '../ui/scene.js';
import {
    dictionaryTableLines,
    relationalDictionary
    } from './dictionary.js';

/*
 * Visio 2010 XML drawing (.vdx, DatadiagramML) of the relational diagram.
 *
 * The scene is the same one the SVG canvas draws: pixels, y axis downwards.
 * Visio measures in inches with the y axis upwards, so every scene point is
 * converted exactly once (visioPagePoint for the page, visioLocalRegion for
 * the inside of a table group) and the XML writers only ever see inches.
 *
 * A table is a group with one text shape per block, so Visio moves it as a
 * unit. A foreign key is a 1-D connector glued to connection points of both
 * groups; its IDEF1X or crow's foot marks travel in a second 1-D shape glued
 * to the same points, which keeps the marks solid when the line is dashed.
 * Visio opens the file as an editable drawing; it is not a "Database Model
 * Diagram" with Visio's own database properties. So that the drawing still
 * shows everything the practice asks of the relational model, page 1 carries
 * a legend of the notation and page 2 the data dictionary: domains, nulls,
 * defaults, keys, dependency, cardinality and referential actions.
 */

const VISIO_NAMESPACE = 'http://schemas.microsoft.com/visio/2003/core';
const VISIO_PIXELS_PER_INCH = 96;
const VISIO_POINTS_PER_INCH = 72;
const VISIO_CONNECTOR_HEIGHT = 0.25;
const VISIO_GLUE_BEGIN = 9;
const VISIO_GLUE_END = 12;
const VISIO_GLUE_CONNECTION = 100;

const VISIO_COLORS = {
    title: '#234b3e',
    text: '#243e33',
    type: '#526e60',
    key: '#8a5c14',
    border: '#78988b',
    divider: '#b8cec2',
    line: '#243e33',
    note: '#718379',
    caption: '#c7d8ce',
    white: '#ffffff'
    };

/** Font sizes in points, close to the pixel sizes of the SVG canvas. */
const VISIO_SIZES = {
    title: 11,
    field: 10,
    type: 8,
    key: 8,
    label: 9,
    note: 9,
    code: 9
    };

/** Entry point: the relational diagram of the document, whatever view is open. */
export function exportVDX( model ) {
    const relational = setDiagramMode( model, 'relational' );
    const scene = buildDiagramScene( relational );

    return visioDocument(
            relational.name,
            visioPage( relational, scene ) + visioDictionaryPage( relational )
            );
    }

/* ---------- page ---------- */

function visioPage(
        model,
        scene
        ) {
    const bounds = scene.bounds;
    const ids = {next: 1};
    const tables = visioReserveTables( scene.nodes, ids );
    const edges = scene.edges.map( edge => visioRegisterEdge( edge, tables ) );
    const legend = visioLegendBox( model, visioInches( bounds.width ), visioInches( bounds.height ) );
    const shapes = [
        ...[...tables.values()].map( entry => visioTableGroup( model, entry, bounds, ids ) ),
        ...edges.flatMap( entry => visioEdgeShapes( model, entry, bounds, ids ) ),
        ...visioTextBox( legend, ids )
        ];
    const connects = edges.flatMap( entry => visioEdgeConnects( entry ) );

    return `<Page ID="0" NameU="Page-1" Name="Modelo relacional">`
        + visioPageSheet( legend.pageWidth, legend.pageHeight )
        + `<Shapes>${shapes.join( '' )}</Shapes>`
        + `<Connects>${connects.join( '' )}</Connects></Page>`;
    }

/* ---------- legend and data dictionary ---------- */

const VISIO_NOTE = {
    margin: 0.4,
    padding: 0.12,
    lineHeight: 0.165,
    titleHeight: 0.24,
    charWidth: 0.058
    };

/** Lines a text needs once Visio wraps it inside the given width. */
function visioWrappedLines(
        lines,
        width
        ) {
    const perLine = Math.max( 10, Math.floor( (width - 2 * VISIO_NOTE.padding) / VISIO_NOTE.charWidth ) );

    return lines.reduce( (sum, line) => sum + Math.max( 1, Math.ceil( line.length / perLine ) ), 0 );
    }

function visioNoteHeight(
        lines,
        width
        ) {
    return VISIO_NOTE.titleHeight + visioWrappedLines( lines, width ) * VISIO_NOTE.lineHeight + 2 * VISIO_NOTE.padding;
    }

/** What each mark of the drawing means, in the notation the document uses. */
function visioLegendLines( model ) {
    const notation = model.display.notation || 'idef1x';
    const marks = notation === 'idef1x'
        ? [
            'Caja de esquinas rectas: tabla independiente. Esquinas redondeadas: tabla dependiente (su clave primaria incluye una clave ajena).',
            'Línea continua: relación identificadora. Línea discontinua: no identificadora.',
            'Punto en el extremo de la tabla que recibe la clave ajena: varias filas (0, 1 o más). P: 1 o más. Z: 0 o 1. 1: exactamente una.',
            'Rombo hueco junto a la tabla referenciada: la clave ajena admite nulos.'
            ]
        : notation === 'crows-foot'
            ? ['Pata de gallo: muchos. Barra: uno. Círculo: cero (opcional).']
            : [];

    return [
        ...marks,
        'PK: clave primaria. FKn: clave ajena n. AKn: clave alternativa n. *: obligatorio (NOT NULL).',
        'Dominios, valores predeterminados, nulos y acciones referenciales: página «Diccionario de datos».'
        ];
    }

/** The legend sits to the right of the drawing; the page grows to hold both. */
function visioLegendBox(
        model,
        drawingWidth,
        drawingHeight
        ) {
    const lines = visioLegendLines( model );
    const width = 3.6;
    const height = visioNoteHeight( lines, width );
    const pageWidth = drawingWidth + VISIO_NOTE.margin + width + VISIO_NOTE.margin;
    const pageHeight = Math.max( drawingHeight, height + 2 * VISIO_NOTE.margin );

    return {
        title: 'Leyenda',
        lines,
        region: {
            pin: {x: drawingWidth + VISIO_NOTE.margin + width / 2, y: pageHeight - VISIO_NOTE.margin - height / 2},
            width,
            height
            },
        pageWidth,
        pageHeight
        };
    }

/*
 * A framed note: a box, its title in bold along the top and its lines below.
 * Title and lines are separate text shapes, each with one format, so no
 * reader has to place a format change inside a text.
 */
function visioTextBox(
        note,
        ids
        ) {
    const inner = {
        left: note.region.pin.x - note.region.width / 2 + VISIO_NOTE.padding,
        top: note.region.pin.y + note.region.height / 2 - VISIO_NOTE.padding,
        width: note.region.width - 2 * VISIO_NOTE.padding
        };
    const bodyHeight = note.region.height - 2 * VISIO_NOTE.padding - VISIO_NOTE.titleHeight;

    return [
        visioBoxShape( visioNextId( ids ), note.region, {line: VISIO_COLORS.border, fill: VISIO_COLORS.white} ),
        visioTextShape(
                visioNextId( ids ),
                {
                    pin: {x: inner.left + inner.width / 2, y: inner.top - VISIO_NOTE.titleHeight / 2},
                    width: inner.width,
                    height: VISIO_NOTE.titleHeight
                    },
                [{text: note.title, char: 0}],
                {chars: [{size: VISIO_SIZES.title, color: VISIO_COLORS.title, bold: true}], align: 0}
                ),
        visioTextShape(
                visioNextId( ids ),
                {
                    pin: {x: inner.left + inner.width / 2, y: inner.top - VISIO_NOTE.titleHeight - bodyHeight / 2},
                    width: inner.width,
                    height: bodyHeight
                    },
                [{text: note.lines.join( '\n' ), char: 0}],
                {chars: [{size: VISIO_SIZES.type, color: VISIO_COLORS.text}], align: 0, vertical: 0}
                )
        ];
    }

const VISIO_DICTIONARY = {columns: 2, columnWidth: 5.6, gap: 0.3};

/*
 * Page 2: one framed note per table, placed in two columns; each note goes
 * to the column that is shorter so far, so the page stays compact.
 */
function visioDictionaryPage( model ) {
    const ids = {next: 1};
    const width = VISIO_DICTIONARY.columnWidth;
    const columnTops = Array( VISIO_DICTIONARY.columns ).fill( VISIO_NOTE.margin + VISIO_NOTE.titleHeight + VISIO_NOTE.padding );
    const placed = relationalDictionary( model ).map(
            table => {
                const lines = dictionaryTableLines( table );
                const height = visioNoteHeight( lines, width );
                const column = columnTops.indexOf( Math.min( ...columnTops ) );
                const top = columnTops[column];

                columnTops[column] += height + VISIO_DICTIONARY.gap;

                return {
                    title: `${table.name} — tabla ${table.dependent ? 'dependiente' : 'independiente'}`,
                    lines,
                    column,
                    top,
                    height
                    };
                }
            );
    const pageWidth = 2 * VISIO_NOTE.margin + VISIO_DICTIONARY.columns * width
        + (VISIO_DICTIONARY.columns - 1) * VISIO_DICTIONARY.gap;
    const pageHeight = Math.max( ...columnTops ) + VISIO_NOTE.margin;
    const heading = visioTextShape(
            visioNextId( ids ),
            {
                pin: {x: pageWidth / 2, y: pageHeight - VISIO_NOTE.margin - VISIO_NOTE.titleHeight / 2},
                width: pageWidth - 2 * VISIO_NOTE.margin,
                height: VISIO_NOTE.titleHeight
                },
            [{text: `Diccionario de datos · ${model.name}`, char: 0}],
            {chars: [{size: 12, color: VISIO_COLORS.title, bold: true}], align: 0}
            );
    const notes = placed.flatMap(
            item => visioTextBox(
                    {
                        title: item.title,
                        lines: item.lines,
                        region: {
                            pin: {
                                x: VISIO_NOTE.margin + item.column * (width + VISIO_DICTIONARY.gap) + width / 2,
                                y: pageHeight - item.top - item.height / 2
                                },
                            width,
                            height: item.height
                            }
                        },
                    ids
                    )
            );

    return `<Page ID="1" NameU="Page-2" Name="Diccionario de datos">`
        + visioPageSheet( pageWidth, pageHeight )
        + `<Shapes>${[heading, ...notes].join( '' )}</Shapes></Page>`;
    }

function visioPageSheet(
        width,
        height
        ) {
    return `<PageSheet><PageProps>${visioCell( 'PageWidth', width )}${visioCell( 'PageHeight', height )}`
        + `<ShdwOffsetX>0</ShdwOffsetX><ShdwOffsetY>0</ShdwOffsetY>`
        + `${visioCell( 'PageScale', 1 )}${visioCell( 'DrawingScale', 1 )}`
        + `<DrawingSizeType>3</DrawingSizeType><DrawingScaleType>0</DrawingScaleType>`
        + `<InhibitSnap>0</InhibitSnap></PageProps></PageSheet>`;
    }

/** Each table gets its shape ID first, so connectors can refer to it. */
function visioReserveTables(
        nodes,
        ids
        ) {
    const tables = new Map();

    for (const node of nodes) {
        tables.set( node.id, {node, shapeId: visioNextId( ids ), connections: []} );
        }

    return tables;
    }

/** A connection point in node pixels; the same point is reused when asked twice. */
function visioConnection(
        entry,
        point
        ) {
    const local = {x: point.x - entry.node.x, y: point.y - entry.node.y};
    const existing = entry.connections.findIndex(
            item => item.x === local.x && item.y === local.y
            );

    if (existing >= 0) {
        return existing;
        }

    entry.connections.push( local );
    return entry.connections.length - 1;
    }

function visioRegisterEdge(
        edge,
        tables
        ) {
    const parent = tables.get( edge.sourceId );
    const child = tables.get( edge.targetId );

    return {
        edge,
        begin: {table: parent, connection: visioConnection( parent, edge.points[0] )},
        end: {table: child, connection: visioConnection( child, edge.points.at( -1 ) )},
        shapeIds: []
        };
    }

function visioNextId( ids ) {
    const id = ids.next;

    ids.next += 1;
    return id;
    }

/* ---------- tables ---------- */

function visioTableGroup(
        model,
        entry,
        bounds,
        ids
        ) {
    const node = entry.node;
    const center = visioPagePoint(
            bounds,
            {x: node.x + node.width / 2, y: node.y + node.height / 2}
            );
    const members = [
        visioTableTitle( node, ids ),
        visioTableBody( model, node, ids ),
        ...visioTableDivider( node, ids ),
        ...node.rows.flatMap( row => visioTableRow( model, node, row, ids ) ),
        ...(node.rows.length ? [] : [visioTableEmptyNote( node, ids )])
        ];
    const connections = entry.connections.map(
            (point, index) => visioConnectionRow( index, visioLocalPoint( node, point ) )
            ).join( '' );
    const sections = visioXForm( center, visioInches( node.width ), visioInches( node.height ) )
        + visioLineSection( {color: VISIO_COLORS.border, visible: false} )
        + visioFillSection( VISIO_COLORS.white, false )
        + connections;

    return visioShape( entry.shapeId, 'Group', sections, `<Shapes>${members.join( '' )}</Shapes>` );
    }

function visioTableTitle(
        node,
        ids
        ) {
    const lines = node.table.kind === 'view'
        ? [`◇ ${node.titleLines[0]}`, ...node.titleLines.slice( 1 )]
        : node.titleLines;
    const region = visioLocalRegion(
            node,
            {x: 0, y: 0, width: node.width, height: node.headerHeight}
            );

    return visioTextShape(
            visioNextId( ids ),
            region,
            [{text: lines.join( '\n' ), char: 0}],
            {
                chars: [{size: VISIO_SIZES.title, color: VISIO_COLORS.title, bold: true}],
                align: 0
                }
            );
    }

function visioTableBody(
        model,
        node,
        ids
        ) {
    const notation = model.display.notation || 'idef1x';
    const radius = notation === 'idef1x' ? (node.dependent ? 12 : 0) : 10;
    const region = visioLocalRegion(
            node,
            {
                x: 0,
                y: node.headerHeight,
                width: node.width,
                height: node.height - node.headerHeight
                }
            );
    const colors = visioHueColors( node.table.color );
    const sections = visioXForm( region.pin, region.width, region.height )
        + visioLineSection( {color: colors.line, weight: 1, rounding: visioInches( radius )} )
        + visioFillSection( colors.fill, true )
        + visioRectangleGeometry( 0, region.width, region.height );

    return visioShape( visioNextId( ids ), 'Shape', sections );
    }

/** The element's hue as the same border and almost-white fill the canvas shows. */
function visioHueColors( hue ) {
    if (hue === null || hue === undefined) {
        return {line: VISIO_COLORS.border, fill: VISIO_COLORS.white};
        }

    return {line: visioHexFromHSL( hue, 55, 40 ), fill: visioHexFromHSL( hue, 65, 97 )};
    }

/** Visio wants #RRGGBB; the canvas speaks hsl(), so convert once here. */
function visioHexFromHSL(
        hue,
        saturation,
        lightness
        ) {
    const s = saturation / 100;
    const l = lightness / 100;
    const chroma = (1 - Math.abs( 2 * l - 1 )) * s;
    const x = chroma * (1 - Math.abs( (hue / 60) % 2 - 1 ));
    const m = l - chroma / 2;
    const sector = Math.floor( hue / 60 ) % 6;
    const [r, g, b] = [
        [chroma, x, 0], [x, chroma, 0], [0, chroma, x],
        [0, x, chroma], [x, 0, chroma], [chroma, 0, x]
        ][sector];
    const channel = value => Math.round( (value + m) * 255 ).toString( 16 ).padStart( 2, '0' );

    return `#${channel( r )}${channel( g )}${channel( b )}`;
    }

/** The line under the last primary key row, as the canvas draws it. */
function visioTableDivider(
        node,
        ids
        ) {
    const lastKey = node.rows.findLast( row => row.field.primary );

    if (!lastKey) {
        return [];
        }

    const y = lastKey.y + lastKey.height;
    const region = visioLocalRegion( node, {x: 0, y: y - 1, width: node.width, height: 2} );
    const sections = visioXForm( region.pin, region.width, region.height )
        + visioLineSection( {color: VISIO_COLORS.divider, weight: 1} )
        + visioFillSection( VISIO_COLORS.white, false )
        + visioPolylineGeometry(
                0,
                [{x: 0, y: region.height / 2}, {x: region.width, y: region.height / 2}],
                {}
                );

    return [visioShape( visioNextId( ids ), 'Shape', sections )];
    }

function visioTableRow(
        model,
        node,
        row,
        ids
        ) {
    const field = row.field;
    const keys = model.display.keys ? sceneColumnKeys( model, node.table, field ) : [];
    const keyLines = keys.length > 3 ? [...keys.slice( 0, 2 ), `+${keys.length - 2}`] : keys;
    const names = [...row.nameLines];
    const shapes = [];

    if (model.display.required && field.required) {
        names[names.length - 1] += ' *';
        }

    if (keyLines.length) {
        shapes.push( visioTextShape(
                visioNextId( ids ),
                visioLocalRegion( node, {x: 8, y: row.y, width: 60, height: row.height} ),
                [{text: keyLines.join( '\n' ), char: 0}],
                {chars: [{size: VISIO_SIZES.key, color: VISIO_COLORS.key, bold: true}], align: 0}
                ) );
        }

    const runs = [{text: names.join( '\n' ), char: 0}];

    if (model.display.types) {
        runs.push( {text: `\n${field.type}`, char: 1} );
        }

    shapes.push( visioTextShape(
            visioNextId( ids ),
            visioLocalRegion( node, {x: 72, y: row.y, width: node.width - 80, height: row.height} ),
            runs,
            {
                chars: [
                    {size: VISIO_SIZES.field, color: VISIO_COLORS.text, bold: Boolean( field.required )},
                    {size: VISIO_SIZES.type, color: VISIO_COLORS.type}
                    ],
                align: 0
                }
            ) );

    return shapes;
    }

function visioTableEmptyNote(
        node,
        ids
        ) {
    return visioTextShape(
            visioNextId( ids ),
            visioLocalRegion(
                    node,
                    {x: 18, y: node.headerHeight, width: node.width - 18, height: 40}
                    ),
            [{text: 'Sin columnas', char: 0}],
            {chars: [{size: VISIO_SIZES.note, color: VISIO_COLORS.note, italic: true}], align: 0}
            );
    }

/* ---------- foreign keys ---------- */

function visioEdgeShapes(
        model,
        entry,
        bounds,
        ids
        ) {
    const edge = entry.edge;
    const marks = visioEdgeMarks( model, edge );
    const frame = visioConnectorFrame(
            visioPagePoint( bounds, edge.points[0] ),
            visioPagePoint( bounds, edge.points.at( -1 ) )
            );
    const connectorId = visioNextId( ids );
    const marksId = visioNextId( ids );

    entry.shapeIds = [connectorId, marksId];

    return [
        visioConnector( connectorId, entry, frame, bounds, marks ),
        visioConnectorMarks( marksId, entry, frame, bounds, marks ),
        ...visioEdgeCaption( edge, bounds, ids )
        ];
    }

function visioConnector(
        id,
        entry,
        frame,
        bounds,
        marks
        ) {
    const edge = entry.edge;
    const points = visioShortenedPoints( edge.points, marks.clearance.begin, marks.clearance.end );
    const local = points.map( point => visioConnectorLocal( frame, visioPagePoint( bounds, point ) ) );
    const sections = visioConnectorXForm( entry, frame )
        + visioLineSection( {color: VISIO_COLORS.line, weight: 1.2, dashed: !edge.relation.identifying} )
        + visioFillSection( VISIO_COLORS.white, false )
        + visioConnectorGeometry( local, marks.clearance );

    return visioShape( id, 'Shape', sections );
    }

/** Marks and the cardinality code share the connector's frame and glue, with a solid line. */
function visioConnectorMarks(
        id,
        entry,
        frame,
        bounds,
        marks
        ) {
    const toLocal = point => visioConnectorLocal( frame, visioPagePoint( bounds, point ) );
    const geometry = [];

    for (const polyline of marks.polylines) {
        geometry.push( visioPolylineGeometry(
                geometry.length,
                polyline.points.map( toLocal ),
                {closed: polyline.closed}
                ) );
        }

    for (const circle of marks.circles) {
        geometry.push( visioEllipseGeometry(
                geometry.length,
                toLocal( circle.center ),
                visioInches( circle.radius ),
                circle.filled
                ) );
        }

    const sections = visioConnectorXForm( entry, frame )
        + visioLineSection( {color: VISIO_COLORS.line, weight: 1.2} )
        + visioFillSection( VISIO_COLORS.line, true )
        + (marks.code ? visioConnectorText( frame, toLocal( marks.code.point ), marks.code.text ) : '')
        + geometry.join( '' );

    return visioShape( id, 'Shape', sections );
    }

function visioEdgeConnects( entry ) {
    return entry.shapeIds.flatMap(
            shapeId => [
                visioConnect( shapeId, 'BeginX', VISIO_GLUE_BEGIN, entry.begin ),
                visioConnect( shapeId, 'EndX', VISIO_GLUE_END, entry.end )
                ]
            );
    }

function visioConnect(
        shapeId,
        cell,
        part,
        glue
        ) {
    return `<Connect FromSheet="${shapeId}" FromCell="${cell}" FromPart="${part}"`
        + ` ToSheet="${glue.table.shapeId}" ToCell="Connections.X${glue.connection + 1}"`
        + ` ToPart="${VISIO_GLUE_CONNECTION + glue.connection}"/>`;
    }

function visioGlueFormula( glue ) {
    const sheet = `Sheet.${glue.table.shapeId}`;
    const row = glue.connection + 1;

    return `PAR(PNT(${sheet}!Connections.X${row},${sheet}!Connections.Y${row}))`;
    }

/** Captions of the relationship: name and cardinality labels with their leader. */
function visioEdgeCaption(
        edge,
        bounds,
        ids
        ) {
    const shapes = [];

    if (edge.caption) {
        shapes.push( visioBoxShape(
                visioNextId( ids ),
                visioPageRegion( bounds, edge.caption.bounds ),
                {line: VISIO_COLORS.caption, fill: VISIO_COLORS.white}
                ) );
        shapes.push( visioLeaderShape(
                visioNextId( ids ),
                edge.caption.leader.map( point => visioPagePoint( bounds, point ) )
                ) );
        }

    for (const label of edge.labels) {
        shapes.push( visioTextShape(
                visioNextId( ids ),
                visioPageRegion( bounds, label.bounds ),
                [{text: label.text, char: 0}],
                {chars: [{size: VISIO_SIZES.label, color: VISIO_COLORS.text}], align: 1}
                ) );
        }

    return shapes;
    }

/* ---------- marks of a foreign key, in scene pixels ---------- */

/**
 * What the notation draws at both ends: polylines and circles in scene
 * pixels, how far the line must stay away from a hollow mark, and the
 * cardinality code of IDEF1X.
 */
function visioEdgeMarks(
        model,
        edge
        ) {
    const notation = model.display.notation || 'idef1x';
    const marks = {polylines: [], circles: [], clearance: {begin: 0, end: 0}, code: null};

    if (notation === 'idef1x') {
        visioIDEFMarks( edge, marks );
        }
    else if (notation === 'crows-foot') {
        visioCrowFootMarks( edge, marks );
        }

    return marks;
    }

function visioIDEFMarks(
        edge,
        marks
        ) {
    const relation = edge.relation;
    const parent = edge.markers[0];
    const child = edge.markers[1];

    if (relation.optional && !relation.identifying) {
        const frame = visioSegmentFrame( edge.points[0], edge.points[1] );

        marks.polylines.push( {
            closed: true,
            points: [
                {x: parent.x, y: parent.y - 7},
                {x: parent.x + 7, y: parent.y},
                {x: parent.x, y: parent.y + 7},
                {x: parent.x - 7, y: parent.y}
                ]
            } );
        marks.polylines.push( {
            closed: false,
            points: [edge.points[0], visioSegmentPoint( frame, 3, 0 )]
            } );
        marks.clearance.begin = 17;
        }

    marks.circles.push( {center: child, radius: 4.5, filled: true} );

    const code = {
        'one-many': 'P',
        'zero-one': 'Z',
        'one-one': '1'
        }[relation.cardinality];

    if (code) {
        const frame = visioSegmentFrame( edge.points.at( -1 ), edge.points.at( -2 ) );
        const outward = frame.u;

        marks.code = {
            text: code,
            point: {
                x: child.x + outward.x * 14 - outward.y * 10,
                y: child.y + outward.y * 14 + outward.x * 10
                }
            };
        }
    }

function visioCrowFootMarks(
        edge,
        marks
        ) {
    const relation = edge.relation;
    const begin = visioCrowFootEnd(
            visioSegmentFrame( edge.points[0], edge.points[1] ),
            false,
            relation.optional
            );
    const end = visioCrowFootEnd(
            visioSegmentFrame( edge.points.at( -1 ), edge.points.at( -2 ) ),
            relation.cardinality.endsWith( 'many' ),
            relation.cardinality.startsWith( 'zero' )
            );

    marks.polylines.push( ...begin.polylines, ...end.polylines );
    marks.circles.push( ...begin.circles, ...end.circles );
    marks.clearance.begin = begin.clearance;
    marks.clearance.end = end.clearance;
    }

/** One crow's foot end: the maximum mark next to the table, the minimum mark after it. */
function visioCrowFootEnd(
        frame,
        many,
        optional
        ) {
    const at = (x, y) => visioSegmentPoint( frame, x, y );
    const polylines = many
        ? [
            {closed: false, points: [at( 0, -8 ), at( 14, 0 ), at( 0, 8 )]},
            {closed: false, points: [at( 14, 0 ), at( 0, 0 )]}
            ]
        : [{closed: false, points: [at( 6, -8 ), at( 6, 8 )]}];

    if (optional) {
        polylines.push( {closed: false, points: [at( 0, 0 ), at( 21.5, 0 )]} );

        return {polylines, circles: [{center: at( 26, 0 ), radius: 4.5, filled: false}], clearance: 31};
        }

    polylines.push( {closed: false, points: [at( 24, -8 ), at( 24, 8 )]} );
    return {polylines, circles: [], clearance: 0};
    }

/** Axes along a segment: u points from the endpoint to its neighbour, v is perpendicular. */
function visioSegmentFrame(
        endpoint,
        neighbor
        ) {
    const length = Math.hypot( neighbor.x - endpoint.x, neighbor.y - endpoint.y ) || 1;
    const u = {x: (neighbor.x - endpoint.x) / length, y: (neighbor.y - endpoint.y) / length};

    return {origin: endpoint, u, v: {x: -u.y, y: u.x}, length};
    }

function visioSegmentPoint(
        frame,
        along,
        across
        ) {
    return {
        x: frame.origin.x + frame.u.x * along + frame.v.x * across,
        y: frame.origin.y + frame.u.y * along + frame.v.y * across
        };
    }

/** The route without the stretches hidden under a hollow mark at either end. */
function visioShortenedPoints(
        points,
        beginClearance,
        endClearance
        ) {
    const result = points.map( point => ({...point}) );
    const first = visioSegmentFrame( points[0], points[1] );
    const last = visioSegmentFrame( points.at( -1 ), points.at( -2 ) );

    result[0] = visioSegmentPoint( first, Math.min( beginClearance, first.length ), 0 );
    result[result.length - 1] = visioSegmentPoint( last, Math.min( endClearance, last.length ), 0 );
    return result;
    }

/* ---------- 1-D geometry ---------- */

/** The local frame of a 1-D shape: x runs from Begin to End, y across it. */
function visioConnectorFrame(
        begin,
        end
        ) {
    const width = Math.hypot( end.x - begin.x, end.y - begin.y );

    return {
        begin,
        end,
        width,
        height: VISIO_CONNECTOR_HEIGHT,
        angle: width ? Math.atan2( end.y - begin.y, end.x - begin.x ) : 0,
        pin: {x: (begin.x + end.x) / 2, y: (begin.y + end.y) / 2}
        };
    }

function visioConnectorLocal(
        frame,
        point
        ) {
    const dx = point.x - frame.begin.x;
    const dy = point.y - frame.begin.y;
    const cos = Math.cos( -frame.angle );
    const sin = Math.sin( -frame.angle );

    return {
        x: dx * cos - dy * sin,
        y: dx * sin + dy * cos + frame.height / 2
        };
    }

function visioConnectorXForm(
        entry,
        frame
        ) {
    const begin = visioGlueFormula( entry.begin );
    const end = visioGlueFormula( entry.end );

    return `<XForm1D>${visioCell( 'BeginX', frame.begin.x, begin )}${visioCell( 'BeginY', frame.begin.y, begin )}`
        + `${visioCell( 'EndX', frame.end.x, end )}${visioCell( 'EndY', frame.end.y, end )}</XForm1D>`
        + `<XForm>${visioCell( 'PinX', frame.pin.x, '(BeginX+EndX)/2' )}`
        + `${visioCell( 'PinY', frame.pin.y, '(BeginY+EndY)/2' )}`
        + `${visioCell( 'Width', frame.width, 'SQRT((EndX-BeginX)^2+(EndY-BeginY)^2)' )}`
        + `${visioCell( 'Height', frame.height )}`
        + `${visioCell( 'LocPinX', frame.width / 2, 'Width*0.5' )}`
        + `${visioCell( 'LocPinY', frame.height / 2, 'Height*0.5' )}`
        + `${visioCell( 'Angle', frame.angle, 'ATAN2(EndY-BeginY,EndX-BeginX)' )}`
        + `<FlipX>0</FlipX><FlipY>0</FlipY><ResizeMode>0</ResizeMode></XForm>`;
    }

/**
 * The route in local inches. An end that sits exactly on the glue point
 * follows Width and Height when Visio moves the table; a shortened end
 * keeps its literal position.
 */
function visioConnectorGeometry(
        local,
        clearance
        ) {
    const last = local.length - 1;
    const rows = local.map(
            (point, index) => {
                if (index === 0) {
                    return visioGeometryRow( 'MoveTo', 1, point, clearance.begin ? {} : {y: 'Height*0.5'} );
                    }

                if (index === last) {
                    return visioGeometryRow(
                            'LineTo',
                            index + 1,
                            point,
                            clearance.end ? {} : {x: 'Width', y: 'Height*0.5'}
                            );
                    }

                return visioGeometryRow( 'LineTo', index + 1, point, {} );
                }
            );

    return `<Geom IX="0"><NoFill>1</NoFill><NoLine>0</NoLine><NoShow>0</NoShow><NoSnap>0</NoSnap>`
        + `${rows.join( '' )}</Geom>`;
    }

/** Horizontal text at a point of the connector's local frame. */
function visioConnectorText(
        frame,
        point,
        text
        ) {
    const width = 0.4;
    const height = 0.2;

    return `<TextXForm>${visioCell( 'TxtPinX', point.x )}${visioCell( 'TxtPinY', point.y )}`
        + `${visioCell( 'TxtWidth', width )}${visioCell( 'TxtHeight', height )}`
        + `${visioCell( 'TxtLocPinX', width / 2, 'TxtWidth*0.5' )}`
        + `${visioCell( 'TxtLocPinY', height / 2, 'TxtHeight*0.5' )}`
        + `${visioCell( 'TxtAngle', -frame.angle, '-Angle' )}</TextXForm>`
        + visioTextBlock( {left: 0, vertical: 1} )
        + visioParaRow( 0, 1 )
        + visioCharRow( 0, {size: VISIO_SIZES.code, color: VISIO_COLORS.text, bold: true} )
        + visioTextSection( [{text, char: 0}] );
    }

/* ---------- coordinates ---------- */

function visioInches( pixels ) {
    return pixels / VISIO_PIXELS_PER_INCH;
    }

function visioPointSize( points ) {
    return points / VISIO_POINTS_PER_INCH;
    }

/** Page inches from the bottom-left corner, for a scene point in pixels. */
function visioPagePoint(
        bounds,
        point
        ) {
    return {
        x: visioInches( point.x - bounds.x ),
        y: visioInches( bounds.y + bounds.height - point.y )
        };
    }

/** A page rectangle as the pin and size of a 2-D shape. */
function visioPageRegion(
        bounds,
        rectangle
        ) {
    return {
        pin: visioPagePoint(
                bounds,
                {x: rectangle.x + rectangle.width / 2, y: rectangle.y + rectangle.height / 2}
                ),
        width: visioInches( rectangle.width ),
        height: visioInches( rectangle.height )
        };
    }

/** Group inches from the bottom-left corner of a table, for a point in node pixels. */
function visioLocalPoint(
        node,
        point
        ) {
    return {
        x: visioInches( point.x ),
        y: visioInches( node.height - point.y )
        };
    }

function visioLocalRegion(
        node,
        rectangle
        ) {
    return {
        pin: visioLocalPoint(
                node,
                {x: rectangle.x + rectangle.width / 2, y: rectangle.y + rectangle.height / 2}
                ),
        width: visioInches( rectangle.width ),
        height: visioInches( rectangle.height )
        };
    }

/* ---------- shapes ---------- */

function visioShape(
        id,
        type,
        sections,
        children = ''
        ) {
    return `<Shape ID="${id}" NameU="Sheet.${id}" Type="${type}" LineStyle="0" FillStyle="0" TextStyle="0">`
        + `${sections}${children}</Shape>`;
    }

/** A text block without border: runs are {text, char} and chars give the Char rows. */
function visioTextShape(
        id,
        region,
        runs,
        options
        ) {
    const chars = options.chars.map( (style, index) => visioCharRow( index, style ) ).join( '' );
    const sections = visioXForm( region.pin, region.width, region.height )
        + visioLineSection( {color: VISIO_COLORS.text, visible: false} )
        + visioFillSection( VISIO_COLORS.white, false )
        + visioTextBlock( {left: visioInches( options.left ?? 0 ), vertical: options.vertical ?? 1} )
        + visioParaRow( 0, options.align )
        + chars
        + visioTextSection( runs );

    return visioShape( id, 'Shape', sections );
    }

function visioBoxShape(
        id,
        region,
        colors
        ) {
    const sections = visioXForm( region.pin, region.width, region.height )
        + visioLineSection( {color: colors.line, weight: 0.8, rounding: visioInches( 4 )} )
        + visioFillSection( colors.fill, true )
        + visioRectangleGeometry( 0, region.width, region.height );

    return visioShape( id, 'Shape', sections );
    }

/** A thin open polyline in page inches, used for caption leaders. */
function visioLeaderShape(
        id,
        points
        ) {
    const xs = points.map( point => point.x );
    const ys = points.map( point => point.y );
    const left = Math.min( ...xs );
    const bottom = Math.min( ...ys );
    const width = Math.max( ...xs ) - left || 0.01;
    const height = Math.max( ...ys ) - bottom || 0.01;
    const local = points.map( point => ({x: point.x - left, y: point.y - bottom}) );
    const sections = visioXForm( {x: left + width / 2, y: bottom + height / 2}, width, height )
        + visioLineSection( {color: VISIO_COLORS.caption, weight: 0.8, dashed: true} )
        + visioFillSection( VISIO_COLORS.white, false )
        + visioPolylineGeometry( 0, local, {} );

    return visioShape( id, 'Shape', sections );
    }

/* ---------- sections and cells ---------- */

function visioXForm(
        pin,
        width,
        height,
        angle = 0
        ) {
    return `<XForm>${visioCell( 'PinX', pin.x )}${visioCell( 'PinY', pin.y )}`
        + `${visioCell( 'Width', width )}${visioCell( 'Height', height )}`
        + `${visioCell( 'LocPinX', width / 2, 'Width*0.5' )}`
        + `${visioCell( 'LocPinY', height / 2, 'Height*0.5' )}`
        + `${visioCell( 'Angle', angle )}<FlipX>0</FlipX><FlipY>0</FlipY><ResizeMode>0</ResizeMode></XForm>`;
    }

function visioLineSection( options ) {
    const pattern = options.visible === false ? 0 : options.dashed ? 2 : 1;

    return `<Line>${visioCell( 'LineWeight', visioPointSize( options.weight ?? 1 ) )}`
        + `<LineColor>${options.color}</LineColor><LinePattern>${pattern}</LinePattern>`
        + `${visioCell( 'Rounding', options.rounding ?? 0 )}`
        + `<BeginArrow>0</BeginArrow><EndArrow>0</EndArrow></Line>`;
    }

function visioFillSection(
        color,
        visible
        ) {
    return `<Fill><FillForegnd>${color}</FillForegnd><FillBkgnd>${VISIO_COLORS.white}</FillBkgnd>`
        + `<FillPattern>${visible ? 1 : 0}</FillPattern></Fill>`;
    }

function visioTextBlock( options ) {
    return `<TextBlock>${visioCell( 'LeftMargin', options.left )}${visioCell( 'RightMargin', 0 )}`
        + `${visioCell( 'TopMargin', 0 )}${visioCell( 'BottomMargin', 0 )}`
        + `<VerticalAlign>${options.vertical}</VerticalAlign><TextBkgnd>0</TextBkgnd></TextBlock>`;
    }

/** HorzAlign: 0 left, 1 centre. */
function visioParaRow(
        index,
        align
        ) {
    return `<Para IX="${index}"><HorzAlign>${align}</HorzAlign></Para>`;
    }

/** Style bit 1 is bold and bit 2 italic; Size is in inches, like every length. */
function visioCharRow(
        index,
        style
        ) {
    const flags = (style.bold ? 1 : 0) + (style.italic ? 2 : 0);

    return `<Char IX="${index}"><Color>${style.color}</Color><Style>${flags}</Style>`
        + `${visioCell( 'Size', visioPointSize( style.size ) )}</Char>`;
    }

function visioTextSection( runs ) {
    const body = runs.map(
            run => `<cp IX="${run.char}"/>${visioEscape( run.text ).replaceAll( '\n', '&#10;' )}`
            ).join( '' );

    return `<Text><pp IX="0"/>${body}</Text>`;
    }

function visioConnectionRow(
        index,
        point
        ) {
    return `<Connection IX="${index}">${visioCell( 'X', point.x )}${visioCell( 'Y', point.y )}`
        + `<DirX>0</DirX><DirY>0</DirY><Type>0</Type><AutoGen>0</AutoGen></Connection>`;
    }

/** A rectangle whose corners follow the shape's Width and Height. */
function visioRectangleGeometry(
        index,
        width,
        height
        ) {
    return `<Geom IX="${index}"><NoFill>0</NoFill><NoLine>0</NoLine><NoShow>0</NoShow><NoSnap>0</NoSnap>`
        + visioGeometryRow( 'MoveTo', 1, {x: 0, y: 0}, {} )
        + visioGeometryRow( 'LineTo', 2, {x: width, y: 0}, {x: 'Width'} )
        + visioGeometryRow( 'LineTo', 3, {x: width, y: height}, {x: 'Width', y: 'Height'} )
        + visioGeometryRow( 'LineTo', 4, {x: 0, y: height}, {y: 'Height'} )
        + visioGeometryRow( 'LineTo', 5, {x: 0, y: 0}, {} )
        + `</Geom>`;
    }

function visioPolylineGeometry(
        index,
        points,
        options
        ) {
    const rows = points.map(
            (point, position) => visioGeometryRow( position ? 'LineTo' : 'MoveTo', position + 1, point, {} )
            );

    if (options.closed) {
        rows.push( visioGeometryRow( 'LineTo', points.length + 1, points[0], {} ) );
        }

    return `<Geom IX="${index}"><NoFill>1</NoFill><NoLine>0</NoLine><NoShow>0</NoShow><NoSnap>0</NoSnap>`
        + `${rows.join( '' )}</Geom>`;
    }

/** A circle: Visio wants the centre and one point on each axis. */
function visioEllipseGeometry(
        index,
        center,
        radius,
        filled
        ) {
    return `<Geom IX="${index}"><NoFill>${filled ? 0 : 1}</NoFill><NoLine>0</NoLine>`
        + `<NoShow>0</NoShow><NoSnap>0</NoSnap>`
        + `<Ellipse IX="1">${visioCell( 'X', center.x )}${visioCell( 'Y', center.y )}`
        + `${visioCell( 'A', center.x + radius )}${visioCell( 'B', center.y )}`
        + `${visioCell( 'C', center.x )}${visioCell( 'D', center.y + radius )}</Ellipse></Geom>`;
    }

function visioGeometryRow(
        name,
        index,
        point,
        formulas
        ) {
    return `<${name} IX="${index}">${visioCell( 'X', point.x, formulas.x )}`
        + `${visioCell( 'Y', point.y, formulas.y )}</${name}>`;
    }

/** A cell: the value in internal units, with the formula Visio keeps when it recalculates. */
function visioCell(
        name,
        value,
        formula = null
        ) {
    const attribute = formula ? ` F="${visioEscape( formula )}"` : '';

    return `<${name}${attribute}>${visioNumber( value )}</${name}>`;
    }

function visioNumber( value ) {
    return String( Number( value.toFixed( 5 ) ) );
    }

function visioEscape( text ) {
    return String( text )
        .replaceAll( '&', '&amp;' )
        .replaceAll( '<', '&lt;' )
        .replaceAll( '>', '&gt;' )
        .replaceAll( '"', '&quot;' );
    }

/* ---------- document ---------- */

function visioDocument(
        name,
        page
        ) {
    return `<?xml version="1.0" encoding="utf-8"?>\n`
        + `<VisioDocument xmlns="${VISIO_NAMESPACE}" xml:space="preserve">`
        + `<DocumentProperties><Title>${visioEscape( name )}</Title>`
        + `<Creator>DataBasic</Creator></DocumentProperties>`
        + `<DocumentSettings TopPage="0" DefaultTextStyle="0" DefaultLineStyle="0"`
        + ` DefaultFillStyle="0" DefaultGuideStyle="0"/>`
        + visioStyleSheets()
        + `<Pages>${page}</Pages></VisioDocument>`;
    }

/** The one style every shape names; the shapes set their own cells on top of it. */
function visioStyleSheets() {
    return `<StyleSheets><StyleSheet ID="0" NameU="No Style" Name="No Style">`
        + visioLineSection( {color: '#000000', weight: 0.75} )
        + visioFillSection( VISIO_COLORS.white, true )
        + visioTextBlock( {left: 0.0556, vertical: 1} )
        + visioCharRow( 0, {size: 12, color: '#000000'} )
        + visioParaRow( 0, 1 )
        + `</StyleSheet></StyleSheets>`;
    }
