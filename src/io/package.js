import {
    authorFullName,
    documentAuthor
    } from '../domain/delivery.js';
import { serializeDocument } from '../domain/serialization.js';
import {
    accessModuleBytes,
    exportAccessSQL,
    exportAccessXML
    } from './access.js';
import { reportToDocx } from './docx.js';
import {
    buildDesignReport,
    reportAuthorLine
    } from './report.js';
import { exportVDX } from './visio.js';
import { zipArchive } from './zip.js';

/*
 * The delivery package of the practice, one ZIP whose folders answer the
 * three parts of the statement:
 *   Memoria.docx               a) DNI, name and surnames, conceptual design,
 *                                 semantic assumptions and lost semantics;
 *   Modelo_relacional.vdx      b) the relational model for Visio 2010 (IDEF1X);
 *   Access/                    c) what Access needs to build the database;
 *   Diagramas/                 the full-size drawings (SVG);
 *   Proyecto.databasic.json    the project, to open it again in DataBasic;
 *   LEEME.txt                  what each file is and the steps left to the student.
 * DataBasic cannot write the .accdb itself; LEEME.txt explains how to build it.
 */

export const DELIVERY_FILES = {
    memo: 'Memoria.docx',
    visio: 'Modelo_relacional.vdx',
    accessModule: 'BaseDeDatos/CrearBaseDeDatos.bas',
    accessSQL: 'BaseDeDatos/Esquema.sql',
    accessXML: 'BaseDeDatos/Esquema.xml',
    project: 'Proyecto.databasic.json',
    readme: 'LEEME.txt'
    };

/** A file name made of letters, digits and underscores, keeping accents. */
function deliveryNamePart( text ) {
    return String( text || '' )
        .normalize( 'NFC' )
        .replace( /[^\p{L}\p{N}]+/gu, '_' )
        .replace( /^_+|_+$/g, '' );
    }

/** «Practica_Apellidos_Nombre.zip», or the document name while the student is not given. */
export function deliveryFilename( model ) {
    const author = documentAuthor( model );
    const student = [author.apellidos, author.nombre].map( deliveryNamePart ).filter( Boolean ).join( '_' );

    return `${student ? `Practica_${student}` : deliveryNamePart( model.name ) || 'Entrega'}.zip`;
    }

function deliveryReadme(
        model,
        diagramNames
        ) {
    const authorLine = reportAuthorLine( documentAuthor( model ) ) || 'Alumno: completa Archivo → Alumno en DataBasic.';

    // The byte order mark lets the Notepad of older Windows read the accents as UTF-8.
    return '\uFEFF' + [
        `Paquete de entrega · ${model.name}`,
        authorLine,
        '',
        'CONTENIDO',
        `- ${DELIVERY_FILES.memo}: apartado a). DNI, nombre y apellidos; diagramas; diseño conceptual con`,
        '  entidades, relaciones (tipo, participación y cardinalidad) y especializaciones; supuestos',
        '  semánticos; semántica perdida; esquema relacional y diseño físico. Si se pide PDF: ábrelo en tu procesador de textos,',
        '  Archivo → Guardar como → PDF.',
        `- ${DELIVERY_FILES.visio}: apartado b). Modelo relacional con notación IDEF1X (dibujo .vdx, compatible con Visio 2010).`,
        '  Página 1: diagrama y leyenda. Página 2: diccionario de datos (dominios, nulos, predeterminados,',
        '  claves y acciones referenciales). Si se pide el formato de Visio, ábrelo y guárdalo como .vsd.',
        '- BaseDeDatos/: apartado c). Archivos para crear la base de datos (compatibles con Access 2010):',
        `    ${DELIVERY_FILES.accessModule.replace( 'BaseDeDatos/', '' )}  módulo VBA (DAO) que crea tablas, claves, relaciones y filas de ejemplo;`,
        `    ${DELIVERY_FILES.accessSQL.replace( 'BaseDeDatos/', '' )}  el mismo esquema en SQL, una instrucción por consulta;`,
        `    ${DELIVERY_FILES.accessXML.replace( 'BaseDeDatos/', '' )}  XML con esquema para Datos externos → XML.`,
        ...diagramNames.map( name => `- ${name}: diagrama a tamaño completo.` ),
        `- ${DELIVERY_FILES.project}: el proyecto, para volver a abrirlo en DataBasic.`,
        '',
        'ANTES DE ENTREGAR: CREA LA BASE DE DATOS DE ACCESS (.accdb)',
        '1. Abre Access 2010 y crea una base de datos en blanco con el nombre que pida la práctica.',
        '2. Pulsa Alt+F11 y, en el editor de Visual Basic, usa Archivo → Importar archivo para traer',
        `   ${DELIVERY_FILES.accessModule.replace( 'BaseDeDatos/', '' )}.`,
        '3. Sitúa el cursor dentro de CrearEsquema y pulsa F5. Acepta habilitar el contenido si Access lo pide.',
        '4. Revisa Herramientas de base de datos → Relaciones y compara con el diagrama relacional.',
        '5. Cierra Access y añade el archivo .accdb a este paquete (o a la carpeta que comprimas).',
        '',
        'Revisa también la memoria: DataBasic reúne lo que escribiste y lo que detecta, pero la justificación',
        'de cada supuesto es tuya.',
        ''
        ].join( '\r\n' );
    }

/**
 * The package as ZIP bytes.
 * - figures: [{title, png}] PNG bytes of the diagrams for the Word memo;
 * - diagrams: [{name, svg}] SVG texts saved in Diagramas/.
 */
export function buildDeliveryPackage(
        model,
        {figures = [], diagrams = [], date = new Date()} = {}
        ) {
    const report = buildDesignReport( model );
    const diagramNames = diagrams.map( item => `Diagramas/${item.name}` );

    return zipArchive(
            [
                {name: DELIVERY_FILES.readme, data: deliveryReadme( model, diagramNames )},
                {name: DELIVERY_FILES.memo, data: reportToDocx( report, figures, date )},
                {name: DELIVERY_FILES.visio, data: exportVDX( model )},
                {name: DELIVERY_FILES.accessModule, data: accessModuleBytes( model )},
                {name: DELIVERY_FILES.accessSQL, data: exportAccessSQL( model )},
                {name: DELIVERY_FILES.accessXML, data: exportAccessXML( model )},
                ...diagrams.map( (item, index) => ({name: diagramNames[index], data: item.svg}) ),
                {name: DELIVERY_FILES.project, data: serializeDocument( model )}
                ],
            date
            );
    }

/** The memo's file name, with the student when given. */
export function memoFilename( model ) {
    const student = deliveryNamePart( authorFullName( model ) );

    return student ? `Memoria_${student}.docx` : `${deliveryNamePart( model.name ) || 'Memoria'}.docx`;
    }
