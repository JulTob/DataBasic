import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    addRelationship,
    addTable,
    exampleDocument,
    setDiagramMode,
    updateRelationship,
    updateTable
    } from '../src/domain/model.js';
import {
    sceneTableHeight,
    sceneTableWidth
    } from '../src/ui/scene.js';
import { diagramBounds } from '../src/ui/diagram.js';
import { exportVDX } from '../src/io/visio.js';
import { unbalancedTag } from './support/xml.js';

const PIXELS_PER_INCH = 96;

/** The text of one Shape element by ID, with its nested shapes. */
function shapeById(
        xml,
        id
        ) {
    const start = xml.indexOf( `<Shape ID="${id}" ` );
    const depth = {open: 0};
    let position = start;

    assert.ok( start >= 0, `shape ${id} exists` );

    for (const match of xml.slice( start ).matchAll( /<(\/?)Shape\b[^>]*>/g )) {
        depth.open += match[1] ? -1 : 1;

        if (depth.open === 0) {
            position = start + match.index + match[0].length;
            break;
            }
        }

    return xml.slice( start, position );
    }

function shapesWith(
        xml,
        marker
        ) {
    return [...xml.matchAll( /<Shape ID="(\d+)" /g )]
        .map( match => shapeById( xml, match[1] ) )
        .filter( shape => shape.includes( marker ) );
    }

function cellValue(
        fragment,
        name
        ) {
    const match = fragment.match( new RegExp( `<${name}(?: F="[^"]*")?>([^<]+)</${name}>` ) );

    assert.ok( match, `cell ${name} present` );
    return Number( match[1] );
    }

function cellFormula(
        fragment,
        name
        ) {
    return fragment.match( new RegExp( `<${name} F="([^"]*)">` ) )?.[1] || null;
    }

function connectors( xml ) {
    return shapesWith( xml, '<XForm1D>' ).filter( shape => !shape.includes( '<Shapes>' ) );
    }

test( 'the example document becomes a well-formed drawing with one group per table and glued connectors', () => {
    const model = exampleDocument();
    const xml = exportVDX( model );

    assert.equal( unbalancedTag( xml ), null );
    assert.match( xml, /^<\?xml version="1.0" encoding="utf-8"\?>\n<VisioDocument xmlns="http:\/\/schemas.microsoft.com\/visio\/2003\/core"/ );
    assert.equal( (xml.match( /Type="Group"/g ) || []).length, model.tables.length );
    assert.equal( connectors( xml ).length, model.relationships.length * 2 );

    const connects = [...xml.matchAll( /<Connect FromSheet="(\d+)" FromCell="(BeginX|EndX)" FromPart="(9|12)" ToSheet="(\d+)" ToCell="Connections\.X(\d+)" ToPart="(\d+)"\/>/g )];

    assert.equal( connects.length, model.relationships.length * 4 );

    for (const [, from, cell, part, to, row, toPart] of connects) {
        assert.ok( shapeById( xml, from ).includes( '<XForm1D>' ), 'a connector glues' );
        assert.ok( shapeById( xml, to ).startsWith( `<Shape ID="${to}" NameU="Sheet.${to}" Type="Group"` ), 'to a table group' );
        assert.equal( part, cell === 'BeginX' ? '9' : '12' );
        assert.equal( Number( toPart ), 99 + Number( row ) );
        assert.match( shapeById( xml, from ), new RegExp( `PAR\\(PNT\\(Sheet\\.${to}!Connections\\.X${row},Sheet\\.${to}!Connections\\.Y${row}\\)\\)` ) );
        assert.match( shapeById( xml, to ), new RegExp( `<Connection IX="${Number( row ) - 1}">` ) );
        }
    } );

test( 'scene pixels become page inches with the y axis pointing up', () => {
    const model = exampleDocument();
    const bounds = diagramBounds( model );
    const socio = model.tables.find( table => table.name === 'Socio' );
    const xml = exportVDX( model );
    const group = shapeById( xml, 1 );
    const page = xml.match( /<PageProps>.*?<\/PageProps>/ )[0];
    const width = sceneTableWidth( socio );
    const height = sceneTableHeight( socio );

    assert.ok( group.includes( 'Socio' ) );
    assert.ok( Math.abs( cellValue( group, 'PinX' ) - (socio.x + width / 2 - bounds.x) / PIXELS_PER_INCH ) < 1e-4 );
    assert.ok( Math.abs( cellValue( group, 'PinY' ) - (bounds.y + bounds.height - socio.y - height / 2) / PIXELS_PER_INCH ) < 1e-4 );
    assert.ok( Math.abs( cellValue( group, 'Width' ) - width / PIXELS_PER_INCH ) < 1e-4 );
    assert.ok(
            Math.abs( cellValue( page, 'PageWidth' ) - (bounds.width / PIXELS_PER_INCH + 4.4) ) < 1e-4,
            'the page adds the legend column (margin, 3.6 in, margin) to the right of the drawing'
            );
    assert.ok( cellValue( page, 'PageHeight' ) >= bounds.height / PIXELS_PER_INCH - 1e-4 );

    const libro = shapeById( xml, 3 );

    assert.ok( libro.includes( 'Libro' ) );
    assert.ok( cellValue( libro, 'PinX' ) > cellValue( group, 'PinX' ), 'Libro sits to the right of Socio' );
    } );

test( 'a non-identifying relationship is dashed, an identifying one solid and an optional one keeps the diamond clear of the line', () => {
    let model = exampleDocument();
    const [first, second] = model.relationships;

    model = updateRelationship( model, first.id, {optional: true} );
    model = updateRelationship( model, second.id, {identifying: true} );

    const xml = exportVDX( model );
    const [optionalLine, optionalMarks, identifyingLine, identifyingMarks] = connectors( xml );

    assert.ok( optionalLine.includes( '<LinePattern>2</LinePattern>' ), 'dashed' );
    assert.ok( identifyingLine.includes( '<LinePattern>1</LinePattern>' ), 'solid' );
    assert.ok( optionalMarks.includes( '<LinePattern>1</LinePattern>' ), 'marks are always solid' );
    assert.equal( cellFormula( optionalLine.match( /<MoveTo IX="1">.*?<\/MoveTo>/ )[0], 'Y' ), null, 'the shortened start is literal' );
    assert.equal( cellFormula( identifyingLine.match( /<MoveTo IX="1">.*?<\/MoveTo>/ )[0], 'Y' ), 'Height*0.5' );
    assert.match( identifyingLine, /<LineTo IX="4"><X F="Width">/ );
    assert.ok( optionalMarks.includes( '<LineTo IX="5">' ), 'the diamond closes on its first point' );
    assert.ok( !identifyingMarks.includes( '<LineTo IX="5">' ), 'no diamond without an optional reference' );
    assert.equal( (optionalMarks.match( /<Ellipse IX="1">/g ) || []).length, 1, 'one child dot' );
    } );

test( 'the IDEF1X cardinality code travels with the marks as horizontal text', () => {
    let model = exampleDocument();

    model = updateRelationship( model, model.relationships[0].id, {cardinality: 'one-many'} );

    const xml = exportVDX( model );
    const [, marks, , otherMarks] = connectors( xml );

    assert.ok( marks.includes( '<Text><pp IX="0"/><cp IX="0"/>P</Text>' ) );
    assert.equal( cellFormula( marks, 'TxtAngle' ), '-Angle' );
    assert.ok( !otherMarks.includes( '<Text>' ), 'zero-many has no code' );
    } );

test( 'a self-reference glues both ends to the same table on two connection points', () => {
    let model = exampleDocument();
    const socio = model.tables.find( table => table.name === 'Socio' );

    model = addRelationship( model, socio.id, socio.id );

    const xml = exportVDX( model );
    const self = connectors( xml ).at( -2 );
    const id = self.match( /<Shape ID="(\d+)"/ )[1];
    const connects = [...xml.matchAll( new RegExp( `<Connect FromSheet="${id}" [^>]*ToSheet="(\\d+)" ToCell="Connections\\.X(\\d+)"`, 'g' ) )];

    assert.equal( connects.length, 2 );
    assert.equal( connects[0][1], connects[1][1], 'same table' );
    assert.notEqual( connects[0][2], connects[1][2], 'different points' );
    assert.ok( cellValue( self, 'Width' ) > 0 );
    } );

test( 'crow\'s foot draws feet and the plain relational notation draws no marks', () => {
    const model = exampleDocument();
    const crow = structuredClone( model );
    const plain = structuredClone( model );

    crow.display.notation = 'crows-foot';
    plain.display.notation = 'relational';

    const [, crowMarks] = connectors( exportVDX( crow ) );
    const [, plainMarks] = connectors( exportVDX( plain ) );

    assert.ok( (crowMarks.match( /<Geom IX="\d+">/g ) || []).length >= 4, 'a foot, a bar and the stubs' );
    assert.ok( !plainMarks.includes( '<Geom' ) );
    } );

test( 'a Chen document still exports the relational diagram', () => {
    const model = setDiagramMode( exampleDocument(), 'chen' );
    const xml = exportVDX( model );

    assert.equal( (xml.match( /Type="Group"/g ) || []).length, 3 );
    assert.ok( xml.includes( 'Prestamo' ) );
    assert.ok( xml.includes( 'VARCHAR(100)' ), 'column types are listed' );
    } );

test( 'names with XML characters are escaped and the drawing stays well formed', () => {
    let model = exampleDocument();
    const socio = model.tables.find( table => table.name === 'Socio' );

    model = updateTable( model, socio.id, {name: 'Socio & "Amigo" <x>'} );

    const xml = exportVDX( model );

    assert.ok( xml.includes( 'Socio &amp; &quot;Amigo&quot; &lt;x&gt;' ) );
    assert.ok( !xml.includes( '<x>' ) );
    assert.equal( unbalancedTag( xml ), null );
    } );

test( 'views, empty tables and hidden types follow the canvas', () => {
    let model = exampleDocument();

    model = addTable( model, 'view', {x: 100, y: 420} );
    model = updateTable( model, model.tables.at( -1 ).id, {name: 'VistaSocios'} );
    model = addTable( model, 'entity', {x: 450, y: 620} );
    model = updateTable( model, model.tables.at( -1 ).id, {name: 'Vacia'} );

    const xml = exportVDX( model );

    assert.ok( xml.includes( '◇ VistaSocios' ) );
    assert.ok( xml.includes( 'Sin columnas' ) );
    assert.ok( xml.includes( '<cp IX="0"/>PK</Text>' ) );
    assert.ok( xml.includes( '<cp IX="0"/>FK1</Text>' ) );

    const bare = structuredClone( model );

    bare.display.types = false;
    bare.display.keys = false;

    const quiet = exportVDX( bare );
    const drawing = quiet.match( /<Page ID="0"[\s\S]*?<\/Page>/ )[0];

    assert.ok( !drawing.includes( 'VARCHAR(100)' ), 'the drawing hides the types' );
    assert.ok( !drawing.includes( '>PK</Text>' ) );
    assert.ok( quiet.includes( 'VARCHAR(100)' ), 'the data dictionary still lists them' );
    assert.equal( unbalancedTag( quiet ), null );
    } );

test( 'the Visio file carries a legend and a data dictionary page with what the relational model must show', async () => {
    const { readFile } = await import( 'node:fs/promises' );
    const { parseDocument } = await import( '../src/domain/serialization.js' );
    const model = parseDocument( await readFile( new URL( '../examples/curso-lonja.databasic.json', import.meta.url ), 'utf8' ) );
    const xml = exportVDX( model );
    const pages = xml.match( /<Page ID="\d+" NameU="[^"]+" Name="[^"]+">/g );

    assert.deepEqual( pages, [
        '<Page ID="0" NameU="Page-1" Name="Modelo relacional">',
        '<Page ID="1" NameU="Page-2" Name="Diccionario de datos">'
        ] );
    assert.equal( unbalancedTag( xml ), null );

    const drawing = xml.match( /<Page ID="0"[\s\S]*?<\/Page>/ )[0];
    const dictionary = xml.match( /<Page ID="1"[\s\S]*?<\/Page>/ )[0];

    assert.match( drawing, /Leyenda/ );
    assert.match( drawing, /Línea continua: relación identificadora/ );
    assert.match( dictionary, /Diccionario de datos · Lonja de Santa Pola/ );
    assert.match( dictionary, /Lote — tabla independiente/ );
    assert.match( dictionary, /Credito — tabla dependiente/ );
    assert.match( dictionary, /importe_acumulado NUMBER\(10,2\) · NOT NULL · DEFAULT 0 · mínimo 0/, 'nulos, predeterminado y dominio' );
    assert.match( dictionary, /estado VARCHAR\(9\) · NULL · DEFAULT &apos;pendiente&apos; · valores pendiente, pagada|estado VARCHAR\(9\) · NULL · DEFAULT 'pendiente' · valores pendiente, pagada/ );
    assert.match( dictionary, /AK1 AK_Comprador_dni_cif: UNIQUE \(dni_cif\), NOT NULL/ );
    assert.match( dictionary, /FK1 \(especie_cod_especie\) → Especie\(cod_especie\): Especie 1 — 0\.\.N Lote, no identificadora, obligatoria, ON DELETE NO ACTION, ON UPDATE NO ACTION/ );
    } );
