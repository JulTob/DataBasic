import {
    reportAuthorLine
    } from './report.js';
import { zipArchive } from './zip.js';

/*
 * The design report as a Word document (Office Open XML, readable by Word
 * 2007 and later, Word 2010 included, and by LibreOffice). A .docx is a ZIP
 * of XML parts:
 *   [Content_Types].xml        what kind of file each part is;
 *   _rels/.rels                where the document and its properties are;
 *   word/document.xml          the text: cover, figures and sections;
 *   word/styles.xml            Title, Heading 1/2, Caption, List and Table styles;
 *   word/numbering.xml         the bullet used by lists;
 *   word/settings.xml          compatibility with Word 2010;
 *   word/_rels/document.xml.rels  links from the text to styles and images;
 *   word/media/figuraN.png     the diagrams, rasterized by the caller;
 *   docProps/core.xml          title and author.
 * The report model stays the same one the HTML and Markdown memos use.
 */

const DOCX_NS = {
    w: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    wp: 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
    a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
    pic: 'http://schemas.openxmlformats.org/drawingml/2006/picture',
    rels: 'http://schemas.openxmlformats.org/package/2006/relationships',
    types: 'http://schemas.openxmlformats.org/package/2006/content-types'
    };

const DOCX_RELATION = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

/*
 * A4 portrait with 2.5 cm margins. Word measures the page in twips (1/20 pt,
 * 567 per cm) and drawings in EMU (360000 per cm).
 */
const DOCX_PAGE = {
    width: 11906,
    height: 16838,
    margin: 1418,
    contentWidth: 9070
    };
const EMU_PER_CM = 360000;
const DOCX_FIGURE_LIMIT = {width: 16 * EMU_PER_CM, height: 22 * EMU_PER_CM};

function xmlText( value ) {
    return String( value )
        .replace( /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '' )
        .replaceAll( '&', '&amp;' )
        .replaceAll( '<', '&lt;' )
        .replaceAll( '>', '&gt;' )
        .replaceAll( '"', '&quot;' );
    }

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

/* ---------- text: runs, paragraphs, lists and tables ---------- */

function docxRun(
        text,
        {bold = false, size = null} = {}
        ) {
    const properties = `${bold ? '<w:b/>' : ''}${size ? `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>` : ''}`;

    return `<w:r>${properties ? `<w:rPr>${properties}</w:rPr>` : ''}`
        + `<w:t xml:space="preserve">${xmlText( text )}</w:t></w:r>`;
    }

function docxParagraph(
        text,
        {style = null, bold = false, center = false, pageBreakBefore = false, size = null} = {}
        ) {
    const properties = `${style ? `<w:pStyle w:val="${style}"/>` : ''}`
        + `${pageBreakBefore ? '<w:pageBreakBefore/>' : ''}`
        + `${center ? '<w:jc w:val="center"/>' : ''}`;

    return `<w:p>${properties ? `<w:pPr>${properties}</w:pPr>` : ''}${text ? docxRun( text, {bold, size} ) : ''}</w:p>`;
    }

function docxListItem( text ) {
    return '<w:p><w:pPr><w:pStyle w:val="ListParagraph"/>'
        + '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>'
        + `${docxRun( text )}</w:p>`;
    }

function docxCell(
        text,
        width,
        header
        ) {
    return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${header ? '<w:shd w:val="clear" w:color="auto" w:fill="EDF7F2"/>' : ''}</w:tcPr>`
        + `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>${docxRun( text, {bold: header, size: 18} )}</w:p></w:tc>`;
    }

/** A table as wide as the text, with equal columns and a header row repeated on every page. */
function docxTable(
        header,
        rows
        ) {
    const width = Math.floor( DOCX_PAGE.contentWidth / Math.max( header.length, 1 ) );
    const row = (cells, isHeader) => `<w:tr>${isHeader ? '<w:trPr><w:tblHeader/></w:trPr>' : ''}`
        + `${cells.map( cell => docxCell( cell, width, isHeader ) ).join( '' )}</w:tr>`;

    return '<w:tbl><w:tblPr><w:tblStyle w:val="TablaMemoria"/>'
        + `<w:tblW w:w="${DOCX_PAGE.contentWidth}" w:type="dxa"/><w:tblLook w:val="04A0"/></w:tblPr>`
        + `<w:tblGrid>${header.map( () => `<w:gridCol w:w="${width}"/>` ).join( '' )}</w:tblGrid>`
        + row( header, true )
        + rows.map( cells => row( cells.map( String ), false ) ).join( '' )
        + '</w:tbl>'
        + docxParagraph( '' );
    }

function docxBlock( block ) {
    switch (block.kind) {
        case 'list':
            return block.items.map( docxListItem ).join( '' );
        case 'table':
            return docxTable( block.header, block.rows );
        case 'heading':
            return docxParagraph( block.text, {style: 'Heading2'} );
        default:
            return docxParagraph( block.text );
        }
    }

/* ---------- figures ---------- */

/** Width and height of a PNG, read from its header; anything else is rejected. */
export function pngSize( bytes ) {
    const signature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    if (!(bytes instanceof Uint8Array) || bytes.length < 24
        || signature.some( (value, index) => bytes[index] !== value )) {
        throw new Error( 'Memoria .docx: cada figura debe ser una imagen PNG.' );
        }

    const view = new DataView( bytes.buffer, bytes.byteOffset, bytes.byteLength );
    const size = {width: view.getUint32( 16 ), height: view.getUint32( 20 )};

    if (!size.width || !size.height) {
        throw new Error( 'Memoria .docx: la figura PNG no tiene tamaño.' );
        }

    return size;
    }

/** The figure fills the text width, unless that makes it taller than the page allows. */
function docxFigureExtent( size ) {
    const byWidth = {cx: DOCX_FIGURE_LIMIT.width, cy: Math.round( DOCX_FIGURE_LIMIT.width * size.height / size.width )};

    if (byWidth.cy <= DOCX_FIGURE_LIMIT.height) {
        return byWidth;
        }

    return {cx: Math.round( DOCX_FIGURE_LIMIT.height * size.width / size.height ), cy: DOCX_FIGURE_LIMIT.height};
    }

function docxFigure(
        figure,
        index
        ) {
    const extent = docxFigureExtent( pngSize( figure.png ) );
    const id = index + 1;
    const name = xmlText( figure.title );

    return '<w:p><w:pPr><w:keepNext/><w:jc w:val="center"/></w:pPr><w:r><w:drawing>'
        + '<wp:inline distT="0" distB="0" distL="0" distR="0">'
        + `<wp:extent cx="${extent.cx}" cy="${extent.cy}"/>`
        + `<wp:docPr id="${id}" name="Figura ${id}" descr="${name}"/>`
        + '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>'
        + '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
        + `<pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="figura${id}.png"/><pic:cNvPicPr/></pic:nvPicPr>`
        + `<pic:blipFill><a:blip r:embed="rIdFigura${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>`
        + `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${extent.cx}" cy="${extent.cy}"/></a:xfrm>`
        + '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>'
        + '</a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>'
        + docxParagraph( `Figura ${id}. ${figure.title}`, {style: 'Caption', center: true} );
    }

/* ---------- the document ---------- */

/** The cover answers the statement: who delivers (DNI, name and surnames) and what. */
function docxCover( report ) {
    const author = report.author || {dni: '', nombre: '', apellidos: ''};
    const name = `${author.nombre} ${author.apellidos}`.trim();

    return docxParagraph( 'Memoria del diseño de la base de datos', {style: 'Title'} )
        + docxParagraph( report.title, {style: 'Subtitle'} )
        + docxTable(
                ['Dato del alumno', 'Valor'],
                [['DNI', author.dni || ''], ['Nombre y apellidos', name]]
                )
        + docxParagraph( 'Contenido: diagramas, diseño conceptual (entidades, relaciones y especializaciones), '
            + 'supuestos semánticos, semántica perdida, esquema relacional y diseño físico.' );
    }

function docxFigures( figures ) {
    if (!figures.length) {
        return '';
        }

    return docxParagraph( 'Diagramas', {style: 'Heading1', pageBreakBefore: true} )
        + docxParagraph( 'Amplía las figuras para leer los detalles; el paquete de entrega incluye además los diagramas en SVG.' )
        + figures.map( docxFigure ).join( '' );
    }

function docxSections( report ) {
    return report.sections.map(
            (section, index) => docxParagraph( section.heading, {style: 'Heading1', pageBreakBefore: index === 0} )
                + section.blocks.map( docxBlock ).join( '' )
            ).join( '' );
    }

function docxDocument(
        report,
        figures
        ) {
    return XML_DECLARATION
        + `<w:document xmlns:w="${DOCX_NS.w}" xmlns:r="${DOCX_NS.r}" xmlns:wp="${DOCX_NS.wp}" `
        + `xmlns:a="${DOCX_NS.a}" xmlns:pic="${DOCX_NS.pic}"><w:body>`
        + docxCover( report )
        + docxFigures( figures )
        + docxSections( report )
        + `<w:sectPr><w:pgSz w:w="${DOCX_PAGE.width}" w:h="${DOCX_PAGE.height}"/>`
        + `<w:pgMar w:top="${DOCX_PAGE.margin}" w:right="${DOCX_PAGE.margin}" w:bottom="${DOCX_PAGE.margin}" `
        + `w:left="${DOCX_PAGE.margin}" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>`
        + '</w:body></w:document>';
    }

/* ---------- fixed parts ---------- */

function docxStyle(
        id,
        name,
        {type = 'paragraph', paragraph = '', run = '', basedOn = 'Normal', extra = ''} = {}
        ) {
    return `<w:style w:type="${type}" w:styleId="${id}"><w:name w:val="${name}"/>`
        + `${basedOn && id !== 'Normal' ? `<w:basedOn w:val="${basedOn}"/>` : ''}<w:qFormat/>`
        + `${paragraph ? `<w:pPr>${paragraph}</w:pPr>` : ''}${run ? `<w:rPr>${run}</w:rPr>` : ''}${extra}</w:style>`;
    }

const DOCX_BORDER = '<w:top w:val="single" w:sz="4" w:space="0" w:color="B8CEC2"/>'
    + '<w:left w:val="single" w:sz="4" w:space="0" w:color="B8CEC2"/>'
    + '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="B8CEC2"/>'
    + '<w:right w:val="single" w:sz="4" w:space="0" w:color="B8CEC2"/>'
    + '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="B8CEC2"/>'
    + '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="B8CEC2"/>';

function docxStyles() {
    return XML_DECLARATION
        + `<w:styles xmlns:w="${DOCX_NS.w}">`
        + '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri" w:eastAsia="Calibri"/>'
        + '<w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="es-ES" w:eastAsia="es-ES" w:bidi="ar-SA"/></w:rPr></w:rPrDefault>'
        + '<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'
        + docxStyle( 'Normal', 'Normal' )
        + docxStyle( 'Title', 'Title', {
            paragraph: '<w:spacing w:before="2400" w:after="240"/><w:jc w:val="center"/>',
            run: '<w:b/><w:color w:val="1F2D27"/><w:sz w:val="48"/><w:szCs w:val="48"/>'
            } )
        + docxStyle( 'Subtitle', 'Subtitle', {
            paragraph: '<w:spacing w:after="960"/><w:jc w:val="center"/>',
            run: '<w:color w:val="526E60"/><w:sz w:val="32"/><w:szCs w:val="32"/>'
            } )
        + docxStyle( 'Heading1', 'heading 1', {
            paragraph: '<w:keepNext/><w:spacing w:before="360" w:after="160"/><w:outlineLvl w:val="0"/>',
            run: '<w:b/><w:color w:val="1F4D3A"/><w:sz w:val="32"/><w:szCs w:val="32"/>'
            } )
        + docxStyle( 'Heading2', 'heading 2', {
            paragraph: '<w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="1"/>',
            run: '<w:b/><w:sz w:val="26"/><w:szCs w:val="26"/>'
            } )
        + docxStyle( 'Caption', 'caption', {
            paragraph: '<w:spacing w:after="240"/>',
            run: '<w:i/><w:color w:val="526E60"/><w:sz w:val="18"/><w:szCs w:val="18"/>'
            } )
        + docxStyle( 'ListParagraph', 'List Paragraph', {
            paragraph: '<w:spacing w:after="60"/><w:ind w:left="720"/><w:contextualSpacing/>'
            } )
        + `<w:style w:type="table" w:styleId="TablaMemoria"><w:name w:val="Table Grid"/>`
        + `<w:tblPr><w:tblBorders>${DOCX_BORDER}</w:tblBorders>`
        + '<w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>'
        + '</w:styles>';
    }

function docxNumbering() {
    return XML_DECLARATION
        + `<w:numbering xmlns:w="${DOCX_NS.w}">`
        + '<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/>'
        + '<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/>'
        + '<w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>'
        + '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>'
        + '</w:numbering>';
    }

function docxSettings() {
    return XML_DECLARATION
        + `<w:settings xmlns:w="${DOCX_NS.w}"><w:defaultTabStop w:val="708"/>`
        + '<w:characterSpacingControl w:val="doNotCompress"/>'
        + '<w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="14"/></w:compat>'
        + '</w:settings>';
    }

function docxRelationship(
        id,
        type,
        target
        ) {
    return `<Relationship Id="${id}" Type="${DOCX_RELATION}/${type}" Target="${target}"/>`;
    }

function docxDocumentRelationships( figures ) {
    return XML_DECLARATION
        + `<Relationships xmlns="${DOCX_NS.rels}">`
        + docxRelationship( 'rIdStyles', 'styles', 'styles.xml' )
        + docxRelationship( 'rIdNumbering', 'numbering', 'numbering.xml' )
        + docxRelationship( 'rIdSettings', 'settings', 'settings.xml' )
        + figures.map( (figure, index) => docxRelationship( `rIdFigura${index + 1}`, 'image', `media/figura${index + 1}.png` ) ).join( '' )
        + '</Relationships>';
    }

function docxPackageRelationships() {
    return XML_DECLARATION
        + `<Relationships xmlns="${DOCX_NS.rels}">`
        + docxRelationship( 'rIdDocument', 'officeDocument', 'word/document.xml' )
        + '<Relationship Id="rIdCore" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
        + '</Relationships>';
    }

function docxContentTypes() {
    const main = 'application/vnd.openxmlformats-officedocument.wordprocessingml';

    return XML_DECLARATION
        + `<Types xmlns="${DOCX_NS.types}">`
        + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        + '<Default Extension="xml" ContentType="application/xml"/>'
        + '<Default Extension="png" ContentType="image/png"/>'
        + `<Override PartName="/word/document.xml" ContentType="${main}.document.main+xml"/>`
        + `<Override PartName="/word/styles.xml" ContentType="${main}.styles+xml"/>`
        + `<Override PartName="/word/numbering.xml" ContentType="${main}.numbering+xml"/>`
        + `<Override PartName="/word/settings.xml" ContentType="${main}.settings+xml"/>`
        + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
        + '</Types>';
    }

function docxCoreProperties( report ) {
    const author = report.author ? `${report.author.nombre} ${report.author.apellidos}`.trim() : '';

    return XML_DECLARATION
        + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
        + 'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" '
        + 'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
        + `<dc:title>${xmlText( `Memoria del diseño: ${report.title}` )}</dc:title>`
        + `<dc:creator>${xmlText( author || 'DataBasic' )}</dc:creator>`
        + `<dc:description>${xmlText( reportAuthorLine( report.author ) || '' )}</dc:description>`
        + '<dc:language>es-ES</dc:language>'
        + '</cp:coreProperties>';
    }

/** The parts of the Word document, in the order a ZIP reader expects them. */
export function docxParts(
        report,
        figures = []
        ) {
    return [
        {name: '[Content_Types].xml', data: docxContentTypes()},
        {name: '_rels/.rels', data: docxPackageRelationships()},
        {name: 'word/document.xml', data: docxDocument( report, figures )},
        {name: 'word/styles.xml', data: docxStyles()},
        {name: 'word/numbering.xml', data: docxNumbering()},
        {name: 'word/settings.xml', data: docxSettings()},
        {name: 'word/_rels/document.xml.rels', data: docxDocumentRelationships( figures )},
        ...figures.map( (figure, index) => ({name: `word/media/figura${index + 1}.png`, data: figure.png}) ),
        {name: 'docProps/core.xml', data: docxCoreProperties( report )}
        ];
    }

/**
 * The memo as .docx bytes. `figures` are [{title, png}] with PNG bytes; the
 * caller rasterizes the diagrams (in the browser, through a canvas).
 */
export function reportToDocx(
        report,
        figures = [],
        date = new Date()
        ) {
    return zipArchive( docxParts( report, figures ), date );
    }
