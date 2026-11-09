import { dataStatus } from '../domain/data.js';
import { changeDocument } from '../domain/model.js';
import {
    parseDocument,
    serializeDocument
    } from '../domain/serialization.js';
import {
    accessModuleBytes,
    exportAccessSQL,
    exportAccessXML
    } from './access.js';
import {
    labeledAssumptions,
    mergeProject,
    withAssumptions
    } from './project-merge.js';
import {
    PROJECT_README_NAME,
    projectReadme,
    readmeAssumptions
    } from './project-readme.js';
import {
    PROJECT_SQL_NAME,
    modelFromProjectSQL,
    projectSQL
    } from './project-sql.js';
import { exportVDX } from './visio.js';
import { zipArchive } from './zip.js';

/*
 * A project folder: the files that describe one database design. Each file
 * can be read and changed on its own, with any editor or on GitHub;
 * DataBasic writes all of them on save (a ZIP with the folder inside) and,
 * on open, reads the folder back from a ZIP, a folder of the computer or a
 * public GitHub link. The project's name is the folder's name.
 *
 *   The sources, which DataBasic reads:
 *     esquema.sql              tables, keys, relationships, queries and rows (it rules);
 *     README.md                the semantics: statement, assumptions, lost semantics;
 *     proyecto.databasic.json  what SQL cannot say: ER diagram, positions, forms…
 *   The outputs, written from them to look at or to take to other programs;
 *   on open DataBasic only checks that they are up to date:
 *     diagrama.svg, relacional.svg, relacional.vdx,
 *     base_de_datos.bas, base_de_datos.sql, base_de_datos.xml.
 */

export const PROJECT_JSON_NAME = 'proyecto.databasic.json';

export const PROJECT_FILES = [
    {name: PROJECT_README_NAME, role: 'source', description: 'La semántica del diseño: enunciado, supuestos y semántica perdida. Manda en los supuestos.'},
    {name: PROJECT_SQL_NAME, role: 'source', description: 'Tablas, claves, relaciones, consultas y filas en el SQL de DataBasic. Manda en tablas y datos.'},
    {name: PROJECT_JSON_NAME, role: 'source', description: 'Lo que el SQL no dice: diagrama entidad-relación, posiciones, colores, cardinalidades, diseño físico y formularios.'},
    {name: 'diagrama.svg', role: 'output', description: 'Diagrama entidad-relación, como imagen.'},
    {name: 'relacional.svg', role: 'output', description: 'Modelo relacional, como imagen.'},
    {name: 'relacional.vdx', role: 'output', description: 'Modelo relacional con leyenda y diccionario de datos, como dibujo editable (compatible con Visio 2010).'},
    {name: 'base_de_datos.bas', role: 'output', description: 'Módulo VBA que crea la base de datos con sus filas y formularios (compatible con Access).'},
    {name: 'base_de_datos.sql', role: 'output', description: 'El esquema en SQL, una instrucción por consulta (compatible con Access).'},
    {name: 'base_de_datos.xml', role: 'output', description: 'XML con esquema para importar las tablas (compatible con Access).'}
    ];

const PROJECT_DRAWINGS = [
    {name: 'diagrama.svg', title: 'Diagrama entidad-relación', key: 'chen'},
    {name: 'relacional.svg', title: 'Modelo relacional', key: 'relational'}
    ];

const PROJECT_OUTPUT_NAMES = PROJECT_FILES.filter( file => file.role === 'output' ).map( file => file.name );

/** The .bas module is Windows-1252, as Access reads it; every other file is UTF-8. */
const PROJECT_ENCODINGS = {'base_de_datos.bas': 'windows-1252'};

const PROJECT_SIZE_LIMIT = 50 * 1024 * 1024;

/* ---------- names ---------- */

/** The folder's name: the project's name without the characters a file name cannot hold. */
export function projectFolderName( model ) {
    const name = String( model.name || '' )
        .normalize( 'NFC' )
        .replace( /[\u0000-\u001f<>:"/\\|?*]+/g, '_' )
        .replace( /\s+/g, ' ' )
        .trim()
        .replace( /[. ]+$/, '' )
        .slice( 0, 80 )
        .trim();

    return name || 'Proyecto';
    }

/** The project takes the folder's name, unless the folder is just its name written for the file system. */
function withFolderName(
        model,
        name
        ) {
    if (!name || projectFolderName( model ) === name) {
        return model;
        }

    return changeDocument( model, next => { next.name = name.slice( 0, 160 ); } );
    }

/* ---------- saving ---------- */

/** The outputs named in `include`, skipping the ones the design cannot give yet (with the reason). */
function projectOutputs(
        model,
        diagrams,
        include = PROJECT_OUTPUT_NAMES
        ) {
    const files = [];
    const skipped = [];
    const makers = [
        ['diagrama.svg', () => diagrams.chen ?? null],
        ['relacional.svg', () => diagrams.relational ?? null],
        ['relacional.vdx', () => exportVDX( model )],
        ['base_de_datos.bas', () => accessModuleBytes( model )],
        ['base_de_datos.sql', () => exportAccessSQL( model )],
        ['base_de_datos.xml', () => exportAccessXML( model )]
        ];

    for (const [name, make] of makers.filter( ([name]) => include.includes( name ) )) {
        try {
            const data = make();

            if (data !== null) {
                files.push( {name, data} );
                }
            }
        catch (error) {
            skipped.push( {name, reason: error.message} );
            }
        }

    return {files, skipped};
    }

/**
 * The files of the folder as [{name, data}], and the outputs the design
 * cannot give yet as [{name, reason}].
 * - diagrams: {chen, relational} the SVG texts of the two drawings;
 * - outputs: the names of the outputs to write (all of them by default).
 */
export function projectFiles(
        model,
        {diagrams = {}, outputs: include = PROJECT_OUTPUT_NAMES} = {}
        ) {
    const outputs = projectOutputs( model, diagrams, include );
    const sources = [
        {name: PROJECT_SQL_NAME, data: projectSQL( model )},
        {name: PROJECT_JSON_NAME, data: serializeDocument( model )}
        ];
    const names = new Set( [PROJECT_README_NAME, ...sources.map( file => file.name ), ...outputs.files.map( file => file.name )] );
    const readme = projectReadme( model, {
        files: PROJECT_FILES.filter( file => names.has( file.name ) ),
        drawings: PROJECT_DRAWINGS.filter( drawing => names.has( drawing.name ) ),
        later: PROJECT_OUTPUT_NAMES.filter( name => !include.includes( name ) ),
        skipped: outputs.skipped
        } );

    return {
        files: [{name: PROJECT_README_NAME, data: readme}, ...sources, ...outputs.files],
        skipped: outputs.skipped
        };
    }

/** The ZIP to download: {filename, bytes, skipped}, with the folder inside so that unzipping gives the folder. */
export function projectZip(
        model,
        {diagrams = {}, date = new Date()} = {}
        ) {
    const folder = projectFolderName( model );
    const project = projectFiles( model, {diagrams} );

    return {
        filename: `${folder}.zip`,
        bytes: zipArchive( project.files.map( file => ({name: `${folder}/${file.name}`, data: file.data}) ), date ),
        skipped: project.skipped
        };
    }

/* ---------- finding the folder among some files ---------- */

/** The name a file takes in the project folder, or null when it is not one of its files. */
function canonicalName( base ) {
    const lower = base.toLowerCase();
    const known = PROJECT_FILES.find( file => file.name.toLowerCase() === lower );

    if (known) {
        return known.name;
        }

    // A project saved with another name (the delivery package's Proyecto.databasic.json) is the project too.
    return lower.endsWith( '.databasic.json' ) ? PROJECT_JSON_NAME : null;
    }

/** True for the files of the format: worth reading when a folder of the computer or of GitHub is opened. */
export function isProjectFile( name ) {
    return canonicalName( splitPath( name ).base ) !== null;
    }

function splitPath( path ) {
    const parts = String( path ).replaceAll( '\\', '/' ).split( '/' ).filter( Boolean );

    return {directory: parts.slice( 0, -1 ).join( '/' ), base: parts.at( -1 ) || ''};
    }

function folderScore( names ) {
    return names.reduce( (score, name) => score + (name === PROJECT_SQL_NAME || name === PROJECT_JSON_NAME ? 3 : 1), 0 );
    }

/**
 * The project among some files [{name: path, data: bytes}] (the entries of
 * a ZIP, a folder of the computer, a GitHub folder): {name, files}, where
 * files maps each project file name to its bytes. When several folders hold
 * project files, the one with esquema.sql or the JSON wins; the name is that
 * folder's, or `fallbackName` when the files are at the top.
 */
export function projectFolder(
        entries,
        fallbackName = 'Proyecto'
        ) {
    const folders = new Map();

    for (const entry of entries) {
        const {directory, base} = splitPath( entry.name );
        const name = canonicalName( base );

        if (!name || directory.split( '/' ).some( part => part.startsWith( '.' ) || part === '__MACOSX' )) {
            continue;
            }

        const files = folders.get( directory ) || new Map();

        if (!files.has( name ) || base === name) {
            files.set( name, entry.data );
            }

        folders.set( directory, files );
        }

    const ranked = [...folders.entries()].sort(
            (one, other) => folderScore( [...other[1].keys()] ) - folderScore( [...one[1].keys()] ) || one[0].length - other[0].length
            );

    if (!ranked.length || ![...ranked[0][1].keys()].some( name => name === PROJECT_SQL_NAME || name === PROJECT_JSON_NAME )) {
        throw new Error( 'No hay ningún proyecto: falta esquema.sql o proyecto.databasic.json.' );
        }

    const [directory, files] = ranked[0];
    const size = [...files.values()].reduce( (total, data) => total + data.length, 0 );

    if (size > PROJECT_SIZE_LIMIT) {
        throw new Error( 'Los archivos del proyecto superan los 50 MB admitidos.' );
        }

    return {name: directory ? directory.split( '/' ).at( -1 ) : fallbackName, files};
    }

/* ---------- opening: each source, then the outputs ---------- */

function decoded(
        name,
        data
        ) {
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode( String( data ) );

    return new TextDecoder( PROJECT_ENCODINGS[name] || 'utf-8' ).decode( bytes ).replace( /^﻿/, '' );
    }

function comparable( text ) {
    return text.replace( /\r\n?/g, '\n' ).trimEnd();
    }

function fileStatus(
        name,
        level,
        text
        ) {
    return {name, role: PROJECT_FILES.find( file => file.name === name ).role, level, text};
    }

function readJSONSource( texts ) {
    if (!texts.has( PROJECT_JSON_NAME )) {
        return {model: null, error: null};
        }

    try {
        return {model: parseDocument( texts.get( PROJECT_JSON_NAME ) ), error: null};
        }
    catch (error) {
        return {model: null, error: `${PROJECT_JSON_NAME}: ${error.message}`};
        }
    }

function readSQLSource( texts ) {
    if (!texts.has( PROJECT_SQL_NAME )) {
        return {model: null, error: null};
        }

    try {
        return {model: modelFromProjectSQL( texts.get( PROJECT_SQL_NAME ) ), error: null};
        }
    catch (error) {
        return {model: null, error: error.message};
        }
    }

const SQL_OUTCOME_TEXT = {
    same: ['ok', 'Coincide con proyecto.databasic.json.'],
    rows: ['info', 'Manda en las filas: sustituyen a las de proyecto.databasic.json.'],
    structure: ['warning', 'Manda: su estructura no coincide con proyecto.databasic.json.'],
    'sql-only': ['ok', 'Manda en tablas, claves, relaciones y filas.']
    };

const JSON_OUTCOME_TEXT = {
    same: ['ok', 'Coincide con esquema.sql.'],
    rows: ['info', 'Su estructura coincide; las filas salen de esquema.sql.'],
    structure: ['warning', 'Se conservan por nombre posiciones, colores, notas, cardinalidades, diseño físico y formularios.'],
    'json-only': ['ok', 'Es la única descripción del proyecto.']
    };

function sqlStatus(
        texts,
        sql,
        outcome
        ) {
    if (sql.error) {
        return fileStatus( PROJECT_SQL_NAME, 'error', `${sql.error} Se abre proyecto.databasic.json: corrige el SQL y vuelve a abrir la carpeta.` );
        }

    if (!texts.has( PROJECT_SQL_NAME )) {
        return fileStatus( PROJECT_SQL_NAME, 'missing', 'Falta: se escribe al guardar, desde proyecto.databasic.json.' );
        }

    const [level, text] = SQL_OUTCOME_TEXT[outcome];

    return fileStatus( PROJECT_SQL_NAME, level, text );
    }

function jsonStatus(
        texts,
        json,
        outcome
        ) {
    if (json.error) {
        return fileStatus( PROJECT_JSON_NAME, 'error', `${json.error} Se usa solo esquema.sql.` );
        }

    if (!texts.has( PROJECT_JSON_NAME )) {
        return fileStatus(
                PROJECT_JSON_NAME,
                'missing',
                'Falta: las tablas se colocan en cuadrícula y no hay diagrama entidad-relación. Se escribe al guardar.'
                );
        }

    const [level, text] = JSON_OUTCOME_TEXT[outcome];

    return fileStatus( PROJECT_JSON_NAME, level, text );
    }

/**
 * The assumptions: README.md rules when it has the three sections; without
 * it, the JSON's stay (found again by their labels when the tables changed).
 */
function applyReadme(
        model,
        texts,
        fromJSON,
        outcome
        ) {
    const entries = texts.has( PROJECT_README_NAME ) ? readmeAssumptions( texts.get( PROJECT_README_NAME ) ) : null;
    const carried = outcome === 'structure' && fromJSON ? labeledAssumptions( fromJSON ) : null;
    const source = entries ?? carried;
    const applied = source ? withAssumptions( model, source, fromJSON ) : {model, unmatched: []};
    const unmatched = [...new Set( applied.unmatched )];
    const lost = unmatched.length ? ` Quedan sin elemento (ya no existe o se repite): ${unmatched.join( ', ' )}.` : '';
    let status;

    if (!texts.has( PROJECT_README_NAME )) {
        status = fileStatus( PROJECT_README_NAME, 'missing', `Falta: los supuestos salen de proyecto.databasic.json. Se escribe al guardar.${lost}` );
        }
    else if (!entries) {
        status = fileStatus( PROJECT_README_NAME, 'info', `No tiene las secciones de semántica: se mantienen los supuestos de proyecto.databasic.json.${lost}` );
        }
    else {
        status = fileStatus( PROJECT_README_NAME, lost ? 'warning' : 'ok', `Manda en los supuestos: ${entries.length} ${entries.length === 1 ? 'entrada leída' : 'entradas leídas'}.${lost}` );
        }

    return {model: applied.model, status};
    }

/** Each output: up to date, out of date (rewritten on save) or missing. */
function outputStatuses(
        model,
        texts,
        diagrams
        ) {
    const fresh = new Map( projectOutputs( model, diagrams ).files.map( file => [file.name, file.data] ) );

    return PROJECT_FILES.filter( file => file.role === 'output' ).map( file => {
        if (!texts.has( file.name )) {
            return fileStatus( file.name, 'missing', 'Falta: se escribe al guardar.' );
            }

        if (!fresh.has( file.name )) {
            return fileStatus( file.name, 'info', 'Se rehace al guardar.' );
            }

        return comparable( texts.get( file.name ) ) === comparable( decoded( file.name, fresh.get( file.name ) ) )
            ? fileStatus( file.name, 'ok', 'Al día.' )
            : fileStatus( file.name, 'warning', 'Desactualizado: se rehace al guardar.' );
        } );
    }

function dataNotes( model ) {
    const count = dataStatus( model ).length;

    return count
        ? [{level: 'warning', text: `Las filas tienen ${count} ${count === 1 ? 'aviso' : 'avisos'} (tipos, claves o referencias): revísalos en Tablas · datos → Comprobar.`}]
        : [];
    }

/**
 * Opens a project folder (as projectFolder gives it). Returns {model, report}:
 * the document, and for each file of the format what DataBasic did with it.
 * - diagrams: model => {chen, relational}, to check the drawings;
 * - name: the project's name (the folder's); null keeps the JSON's.
 */
export function openProject(
        folder,
        {diagrams = () => ({}), name = folder.name} = {}
        ) {
    const texts = new Map( [...folder.files].map( ([fileName, data]) => [fileName, decoded( fileName, data )] ) );
    const json = readJSONSource( texts );
    const sql = readSQLSource( texts );

    if (!json.model && !sql.model) {
        throw new Error( sql.error || json.error || 'La carpeta no tiene esquema.sql ni proyecto.databasic.json.' );
        }

    const merged = mergeProject( json.model, sql.model );
    const readme = applyReadme( merged.model, texts, json.model, merged.outcome );
    const model = withFolderName( readme.model, name );

    // The outputs are checked against the design before it takes the folder's name: renaming the folder changes no drawing.

    return {
        model,
        report: {
            name: model.name,
            outcome: merged.outcome,
            files: [
                readme.status,
                sqlStatus( texts, sql, merged.outcome ),
                jsonStatus( texts, json, merged.outcome ),
                ...outputStatuses( readme.model, texts, diagrams( readme.model ) )
                ],
            notes: [...merged.notes, ...dataNotes( model )]
            }
        };
    }
