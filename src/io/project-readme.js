import { documentAuthor } from '../domain/delivery.js';
import {
    ASSUMPTION_KINDS,
    documentAssumptions,
    elementLabel,
    tableRows
    } from '../domain/model.js';
import { reportAuthorLine } from './report.js';

/*
 * README.md of a project folder. Its first part is the author's: the three
 * kinds of semantics of the course, one list item per entry, each one with
 * the element it speaks about in _(italics)_ at the end. That part rules the
 * assumptions of the project. After a marker comes a part DataBasic writes
 * on every save (the drawings, the files of the folder, the tables); opening
 * the folder does not read it.
 *
 *   ## Supuestos semánticos
 *   - Un socio no tiene más de tres préstamos abiertos. _(Entidad Socio)_
 */

export const PROJECT_README_NAME = 'README.md';

const README_MARKER = '<!-- DataBasic: lo que sigue se escribe al guardar; al abrir solo se leen los supuestos de arriba. -->';

const README_HEADINGS = {
    enunciado: 'Semántica del enunciado',
    supuesto: 'Supuestos semánticos',
    perdida: 'Semántica perdida'
    };

/* ---------- writing ---------- */

/** One entry as a list item; its following lines are indented so that they stay in the item. */
function assumptionItem(
        model,
        assumption
        ) {
    const label = assumption.elementId ? elementLabel( model, assumption.elementId ) : null;
    const [first, ...rest] = assumption.text.split( /\r?\n/ );
    const lines = [`- ${first}`, ...rest.map( line => (line ? `  ${line}` : '') )];
    const text = lines.join( '\n' );

    return label ? `${text} _(${label})_` : text;
    }

function assumptionSection(
        model,
        kind
        ) {
    const items = documentAssumptions( model ).filter( item => item.kind === kind );
    const body = items.length ? items.map( item => assumptionItem( model, item ) ).join( '\n' ) : '_Ninguna entrada._';

    return `## ${README_HEADINGS[kind]}\n\n${body}`;
    }

function tableSummary( model ) {
    const tables = model.tables.filter( table => table.kind === 'entity' );

    if (!tables.length) {
        return '_Sin tablas._';
        }

    const lines = tables.map( table => {
        const key = table.columns.filter( field => field.primary ).map( field => field.name ).join( ', ' ) || '—';

        return `| ${table.name} | ${table.columns.length} | ${key} | ${tableRows( model, table.id ).length} |`;
        } );

    return ['| Tabla | Campos | Clave principal | Filas |', '| --- | ---: | --- | ---: |', ...lines].join( '\n' );
    }

/**
 * The README of the folder.
 * - files: [{name, description}] the files the folder holds, in order;
 * - drawings: [{name, title}] the diagrams to show (SVG files of the folder);
 * - later: names of outputs this folder leaves for DataBasic to write on save;
 * - skipped: [{name, reason}] outputs the design cannot give yet.
 */
export function projectReadme(
        model,
        {files = [], drawings = [], later = [], skipped = []} = {}
        ) {
    const author = reportAuthorLine( documentAuthor( model ) );
    const authored = [
        `# ${model.name}`,
        ...(author ? [author] : []),
        'Proyecto de DataBasic. Escribe aquí la semántica del diseño: una entrada por línea que empieza por «- »,'
            + ' y al final, entre _(paréntesis)_, el elemento al que se refiere. Al abrir la carpeta, DataBasic lee estas'
            + ' tres secciones; las tablas y las filas las toma de `esquema.sql`.',
        ...ASSUMPTION_KINDS.map( ([kind]) => assumptionSection( model, kind ) )
        ];
    const generated = [
        README_MARKER,
        ...drawings.map( drawing => `## ${drawing.title}\n\n![${drawing.title}](${encodeURI( drawing.name )})` ),
        '## Archivos de la carpeta',
        ['| Archivo | Contenido |', '| --- | --- |', ...files.map( file => `| \`${file.name}\` | ${file.description} |` )].join( '\n' ),
        ...(later.length ? [`Al guardar desde DataBasic se escriben también: ${later.map( name => `\`${name}\`` ).join( ', ' )}.`] : []),
        ...skipped.map( item => `No se escribió \`${item.name}\`: ${item.reason}` ),
        '## Tablas',
        tableSummary( model ),
        'Para abrir la carpeta: DataBasic → Archivo → Abrir, y elige el .zip, la carpeta o el enlace de GitHub.'
        ];

    return `${[...authored, ...generated].join( '\n\n' )}\n`;
    }

/* ---------- reading ---------- */

/** The kind of a heading, whatever its accents and case: enunciado, supuesto or perdida. */
function headingKind( title ) {
    const plain = title.normalize( 'NFD' ).replace( /\p{M}/gu, '' ).toLowerCase();

    if (plain.includes( 'enunciado' )) {
        return 'enunciado';
        }

    if (plain.includes( 'perdida' )) {
        return 'perdida';
        }

    return plain.includes( 'supuesto' ) ? 'supuesto' : null;
    }

/** The element written at the end of an entry, _(like this)_, apart from its text. */
function splitLabel( text ) {
    const trimmed = text.trimEnd();
    const start = trimmed.lastIndexOf( '_(' );

    if (start < 0 || !trimmed.endsWith( ')_' )) {
        return {text: trimmed.trim(), label: null};
        }

    return {text: trimmed.slice( 0, start ).trim(), label: trimmed.slice( start + 2, -2 ).trim() || null};
    }

/** The lines before the marker: the part the author writes. */
function authoredLines( text ) {
    const lines = String( text ).replace( /^﻿/, '' ).split( /\r?\n/ );
    const end = lines.findIndex( line => line.trim().startsWith( '<!-- DataBasic:' ) );

    return end < 0 ? lines : lines.slice( 0, end );
    }

/**
 * The entries of the README as [{kind, text, label}], or null when it has
 * none of the three headings (then it says nothing about the semantics).
 */
export function readmeAssumptions( text ) {
    const entries = [];
    let kind = null;
    let found = false;
    let current = null;

    const finish = () => {
        if (current) {
            const entry = splitLabel( current.lines.join( '\n' ) );

            if (entry.text) {
                entries.push( {kind: current.kind, ...entry} );
                }
            }

        current = null;
        };

    for (const line of authoredLines( text )) {
        const heading = /^(#{1,6})\s+(.*)$/.exec( line );
        const item = /^[-*]\s+(.*)$/.exec( line );

        if (heading) {
            // The title (#) names the project; only sections (## and below) hold entries.
            finish();
            kind = heading[1].length > 1 ? headingKind( heading[2] ) : null;
            found ||= kind !== null;
            }
        else if (kind && item) {
            finish();
            current = {kind, lines: [item[1]]};
            }
        else if (current) {
            current.lines.push( line.replace( /^ {1,4}/, '' ) );
            }
        }

    finish();
    return found ? entries : null;
    }
