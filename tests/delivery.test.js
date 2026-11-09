import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as domain from '../src/domain/model.js';
import {
    authorFullName,
    deliveryChecklist,
    documentAuthor,
    identityDocumentProblem,
    setDocumentAuthor
    } from '../src/domain/delivery.js';
import {
    parseDocument,
    serializeDocument
    } from '../src/domain/serialization.js';
import {
    buildDesignReport,
    relationshipType,
    reportToHTML,
    reportToMarkdown
    } from '../src/io/report.js';
import {
    crc32,
    zipArchive
    } from '../src/io/zip.js';
import {
    docxParts,
    pngSize,
    reportToDocx
    } from '../src/io/docx.js';
import {
    DELIVERY_FILES,
    buildDeliveryPackage,
    deliveryFilename,
    memoFilename
    } from '../src/io/package.js';
import {
    accessModuleBytes,
    windows1252Bytes
    } from '../src/io/access.js';
import {
    rasterSize,
    svgSize
    } from '../src/ui/raster.js';
import { exportSVG } from '../src/ui/diagram.js';
import {
    readStoredZip,
    zipText
    } from './support/zip.js';
import { unbalancedTag } from './support/xml.js';

const PIXEL_PNG = new Uint8Array( Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        'base64'
        ) );
const FIXED_DATE = new Date( 2026, 10, 8, 12, 0, 0 );

async function lonja() {
    return parseDocument( await readFile( new URL( '../examples/curso-lonja.databasic.json', import.meta.url ), 'utf8' ) );
    }

function withStudent( model ) {
    return setDocumentAuthor( model, {dni: ' 12345678-z ', nombre: ' Ana ', apellidos: 'Pérez   García'} );
    }

test( 'El DNI y el NIE se comprueban con su letra de control', () => {
    assert.equal( identityDocumentProblem( '12345678Z' ), null );
    assert.equal( identityDocumentProblem( '12345678-z' ), null, 'admite minúsculas y guiones' );
    assert.equal( identityDocumentProblem( 'X1234567L' ), null, 'NIE: X vale 0' );
    assert.equal( identityDocumentProblem( 'Y1234567X' ), null, 'NIE: Y vale 1' );
    assert.match( identityDocumentProblem( '12345678A' ), /debería ser Z/ );
    assert.match( identityDocumentProblem( '1234567Z' ), /8 cifras y una letra/ );
    assert.match( identityDocumentProblem( '' ), /Falta el DNI/ );
    } );

test( 'Los datos del alumno se guardan limpios, viajan en el JSON y se validan al abrir', async () => {
    const model = withStudent( await lonja() );

    assert.deepEqual( documentAuthor( model ), {dni: '12345678Z', nombre: 'Ana', apellidos: 'Pérez García'} );
    assert.equal( authorFullName( model ), 'Ana Pérez García' );
    assert.deepEqual( parseDocument( serializeDocument( model ) ), model );
    assert.deepEqual( documentAuthor( domain.emptyDocument() ), {dni: '', nombre: '', apellidos: ''}, 'los archivos anteriores no traen alumno' );

    const tampered = JSON.parse( serializeDocument( model ) );

    tampered.author.clave = 'x';
    assert.throws( () => parseDocument( JSON.stringify( tampered ) ), /Datos del alumno no válidos/ );
    tampered.author = {dni: 'x'.repeat( 121 ), nombre: '', apellidos: ''};
    assert.throws( () => parseDocument( JSON.stringify( tampered ) ), /dni: se necesita texto de hasta 120/ );
    assert.throws( () => setDocumentAuthor( model, {dni: 7} ), /dni: se necesita texto/ );
    } );

test( 'La lista de entrega pide alumno, ternaria, especialización, supuestos y decisiones cerradas', async () => {
    const empty = deliveryChecklist( domain.emptyDocument() );

    assert.ok( empty.some( item => item.level === 'error' && /nombre y los apellidos/.test( item.message ) ) );
    assert.ok( empty.some( item => item.level === 'error' && /Falta el DNI/.test( item.message ) ) );
    assert.ok( empty.some( item => item.level === 'error' && /no tiene entidades/.test( item.message ) ) );

    const model = await lonja();

    assert.deepEqual(
            deliveryChecklist( model ).map( item => item.level ),
            ['error', 'error'],
            'a la Lonja solo le faltan los datos del alumno'
            );
    assert.deepEqual( deliveryChecklist( withStudent( model ) ), [] );

    const salas = parseDocument( await readFile( new URL( '../examples/curso-salas.databasic.json', import.meta.url ), 'utf8' ) );
    const warnings = deliveryChecklist( withStudent( salas ) ).map( item => item.message );

    assert.ok( warnings.some( message => /relación ternaria/.test( message ) ) );
    assert.ok( warnings.some( message => /generalización–especialización/.test( message ) ) );
    } );

test( 'La memoria lleva el alumno, el tipo de cada relación, las subclases y las claves alternativas', async () => {
    const model = withStudent( await lonja() );
    const report = buildDesignReport( model );
    const markdown = reportToMarkdown( report );
    const relation = name => model.conceptual.relationships.find( item => item.name === name );

    assert.deepEqual( report.author, {dni: '12345678Z', nombre: 'Ana', apellidos: 'Pérez García'} );
    assert.match( markdown, /^# Memoria del diseño: Lonja de Santa Pola[^\n]*\n\nAlumno: Ana Pérez García · DNI: 12345678Z\n/ );
    assert.match( reportToHTML( report ), /<p class="author">Alumno: Ana Pérez García · DNI: 12345678Z<\/p>/ );
    assert.equal( relationshipType( relation( 'Faena' ) ), 'N:N:N' );
    assert.equal( relationshipType( relation( 'Adjudicacion' ) ), '1:N' );
    assert.match( markdown, /### Faena — relación ternaria N:N:N/ );
    assert.match( markdown, /### Credito — subclase de Comprador \(hereda su clave\)/ );
    assert.match( markdown, /\| dni_cif \| CHAR\(9\) \| Clave alternativa · Requerido \|/ );
    assert.match( markdown, /\| fecha_inicio \| DATE \| Parte de la clave de la tabla \|/, 'atributos de relación con su papel en la clave' );
    assert.doesNotMatch( markdown, /conservada; la FK no impone/ );

    const company = parseDocument( await readFile( new URL( '../examples/curso-empresa.databasic.json', import.meta.url ), 'utf8' ) );

    assert.match( reportToMarkdown( buildDesignReport( company ) ), /### Supervision — relación binaria recursiva 1:N/ );
    assert.match( reportToMarkdown( buildDesignReport( company ) ), /### Dirige — relación binaria 1:1/ );
    } );

test( 'El ZIP guarda los archivos sin compresión, con CRC-32 y nombres UTF-8', () => {
    assert.equal( crc32( new TextEncoder().encode( '123456789' ) ), 0xCBF43926, 'valor de control del CRC-32' );

    const bytes = zipArchive( [{name: 'LEEME.txt', data: 'Año ñandú'}, {name: 'Access/a.bin', data: new Uint8Array( [0, 255] )}], FIXED_DATE );
    const entries = readStoredZip( bytes );

    assert.deepEqual( Object.keys( entries ), ['LEEME.txt', 'Access/a.bin'] );
    assert.equal( zipText( entries['LEEME.txt'] ), 'Año ñandú' );
    assert.deepEqual( [...entries['Access/a.bin']], [0, 255] );
    assert.deepEqual( zipArchive( [{name: 'a', data: 'x'}], FIXED_DATE ), zipArchive( [{name: 'a', data: 'x'}], FIXED_DATE ), 'determinista' );
    assert.throws( () => zipArchive( [{name: 'a', data: 'x'}, {name: 'a', data: 'y'}] ), /repetido/ );
    assert.throws( () => zipArchive( [{name: '../fuera', data: 'x'}] ), /nombre de archivo no válido/ );
    assert.throws( () => zipArchive( [{name: 'a', data: 3}] ), /texto o bytes/ );
    } );

test( 'La memoria Word es un .docx completo con portada, figuras y encabezados', async () => {
    const model = withStudent( await lonja() );
    const report = buildDesignReport( model );
    const figures = [{title: 'Diagrama entidad-relación extendido (Chen)', png: PIXEL_PNG}];
    const parts = Object.fromEntries( docxParts( report, figures ).map( part => [part.name, part.data] ) );

    assert.deepEqual( Object.keys( parts ), [
        '[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/styles.xml', 'word/numbering.xml',
        'word/settings.xml', 'word/_rels/document.xml.rels', 'word/media/figura1.png', 'docProps/core.xml'
        ] );

    for (const [name, data] of Object.entries( parts ).filter( ([name]) => name.endsWith( '.xml' ) || name.endsWith( '.rels' ) )) {
        assert.equal( unbalancedTag( data ), null, `${name} bien formado` );
        }

    const documentXML = parts['word/document.xml'];

    assert.match( documentXML, /<w:t xml:space="preserve">12345678Z<\/w:t>/ );
    assert.match( documentXML, /<w:t xml:space="preserve">Ana Pérez García<\/w:t>/ );
    assert.match( documentXML, /<a:blip r:embed="rIdFigura1"\/>/ );
    assert.match( documentXML, /<wp:extent cx="5760000" cy="5760000"\/>/, 'una figura cuadrada ocupa el ancho del texto' );
    assert.match( documentXML, /<w:pStyle w:val="Heading1"\/><w:pageBreakBefore\/><\/w:pPr><w:r><w:t xml:space="preserve">Entidades y atributos/ );
    assert.match( documentXML, /<w:pStyle w:val="Heading2"\/><\/w:pPr><w:r><w:t xml:space="preserve">Faena — relación ternaria N:N:N/ );
    assert.match( documentXML, /Supuestos semánticos/ );
    assert.match( documentXML, /Semántica perdida/ );
    assert.match( parts['word/settings.xml'], /w:val="14"/, 'compatibilidad con Word 2010' );
    assert.match( parts['word/_rels/document.xml.rels'], /Id="rIdFigura1"[^>]*Target="media\/figura1.png"/ );
    assert.match( parts['docProps/core.xml'], /<dc:creator>Ana Pérez García<\/dc:creator>/ );

    const archive = readStoredZip( reportToDocx( report, figures, FIXED_DATE ) );

    assert.deepEqual( [...archive['word/media/figura1.png']], [...PIXEL_PNG] );
    assert.deepEqual( pngSize( PIXEL_PNG ), {width: 1, height: 1} );
    assert.throws( () => pngSize( new TextEncoder().encode( '<svg/>' ) ), /imagen PNG/ );
    assert.throws( () => docxParts( report, [{title: 'x', png: new Uint8Array( 4 )}] ), /imagen PNG/ );
    } );

test( 'El paquete de entrega reúne memoria, Visio, Access, diagramas, proyecto y LEEME', async () => {
    const model = withStudent( await lonja() );
    const svg = exportSVG( domain.setDiagramMode( model, 'chen' ) );
    const entries = readStoredZip( buildDeliveryPackage( model, {
        figures: [{title: 'ERE', png: PIXEL_PNG}],
        diagrams: [{name: 'Diagrama_ERE.svg', svg}],
        date: FIXED_DATE
        } ) );

    assert.deepEqual( Object.keys( entries ), [
        DELIVERY_FILES.readme, DELIVERY_FILES.memo, DELIVERY_FILES.visio, DELIVERY_FILES.accessModule,
        DELIVERY_FILES.accessSQL, DELIVERY_FILES.accessXML, 'Diagramas/Diagrama_ERE.svg', DELIVERY_FILES.project
        ] );

    const readme = zipText( entries[DELIVERY_FILES.readme] );

    assert.match( readme, /Alumno: Ana Pérez García · DNI: 12345678Z/ );
    assert.match( readme, /CREA LA BASE DE DATOS DE ACCESS \(\.accdb\)/ );
    assert.match( readme, /CrearEsquema/ );
    assert.ok( readme.includes( '\r\n' ), 'LEEME con saltos de Windows' );
    assert.ok( readStoredZip( entries[DELIVERY_FILES.memo] )['word/document.xml'], 'la memoria es un .docx' );
    assert.match( zipText( entries[DELIVERY_FILES.visio] ), /^<\?xml version="1\.0" encoding="utf-8"\?>\n<VisioDocument / );
    assert.deepEqual( parseDocument( zipText( entries[DELIVERY_FILES.project] ) ), model );
    assert.equal( deliveryFilename( model ), 'Practica_Pérez_García_Ana.zip' );
    assert.equal( memoFilename( model ), 'Memoria_Ana_Pérez_García.docx' );
    assert.equal( deliveryFilename( domain.emptyDocument() ), 'Modelo_de_base_de_datos.zip' );
    } );

test( 'El módulo de Access se escribe en Windows-1252 con saltos CRLF, como lo importa Access 2010', async () => {
    const model = await lonja();
    const bytes = accessModuleBytes( model );
    const text = new TextDecoder( 'windows-1252' ).decode( bytes );

    assert.ok( text.startsWith( 'Attribute VB_Name = "DataBasic_Esquema"\r\n' ) );
    assert.ok( !/[^\r]\n/.test( text ), 'todas las líneas terminan en CRLF' );
    assert.ok( text.includes( 'práctica' ), 'las tildes llegan como un byte de Windows-1252' );
    assert.ok( bytes.includes( 0xE1 ) && !bytes.includes( 0xC3 ), 'á es 0xE1, sin secuencias UTF-8' );
    assert.ok( text.includes( 'Herramientas de base de datos > Relaciones' ), 'la flecha pasa a >' );
    assert.deepEqual( [...windows1252Bytes( '€—ñ' )], [0x80, 0x97, 0xF1] );
    assert.throws( () => windows1252Bytes( '漢' ), /no admite el carácter «漢»/ );
    } );

test( 'El tamaño de la imagen de un diagrama es el doble, sin pasar de 6000 píxeles', async () => {
    const svg = exportSVG( domain.setDiagramMode( await lonja(), 'chen' ) );
    const size = svgSize( svg );

    assert.ok( size.width > 0 && size.height > 0 );
    assert.deepEqual( rasterSize( {width: 800, height: 400} ), {width: 1600, height: 800} );
    assert.deepEqual( rasterSize( {width: 4000, height: 1000} ), {width: 6000, height: 1500} );
    assert.throws( () => svgSize( '<svg viewBox="0 0 1 1"></svg>' ), /no indica su tamaño/ );
    } );

test( 'La aplicación guarda el alumno y muestra la lista de entrega', async () => {
    const { applicationHarness } = await import( './support/application.js' );
    const app = await applicationHarness( 500 );

    await app.click({action: 'example'});
    await app.click({action: 'author'});
    assert.match( app.element( '#dialog' ).innerHTML, /Datos del alumno/ );
    app.submit( {dni: '12345678A', nombre: 'Ana', apellidos: 'Pérez'}, /debería ser Z/ );
    app.submit( {dni: '12345678z', nombre: 'Ana', apellidos: 'Pérez'} );
    await app.flushTimers();
    assert.deepEqual( JSON.parse( app.saved() ).author, {dni: '12345678Z', nombre: 'Ana', apellidos: 'Pérez'} );

    await app.click({action: 'delivery'});

    const dialog = app.element( '#dialog' ).innerHTML;

    assert.match( dialog, /Paquete de entrega/ );
    assert.match( dialog, /El diagrama entidad-relación no tiene entidades/, 'el ejemplo del club es solo relacional' );
    assert.match( dialog, /data-action="download-delivery"/ );
    assert.match( dialog, /data-action="report-html"/ );
    assert.doesNotMatch( dialog, /Faltan el nombre/ );
    } );
