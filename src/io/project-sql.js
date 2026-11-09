import { dataInsertOrder } from '../domain/data.js';
import {
    emptyDocument,
    replaceDocumentData,
    setModelProfile,
    tableRows,
    validCourseType
    } from '../domain/model.js';
import { executeSchemaStatement } from '../sql/ddl.js';
import { defaultCell } from '../sql/dml.js';
import { evaluate } from '../sql/expressions.js';
import {
    SqlError,
    sqlErrorText,
    sqlLocation
    } from '../sql/lexer.js';
import {
    parseScript,
    sqlName
    } from '../sql/parser.js';
import {
    openDatabase,
    rowScopeFor
    } from '../sql/query.js';
import {
    SqlDate,
    cellFromValue,
    dateFromText,
    typeKind
    } from '../sql/values.js';

/*
 * esquema.sql, the SQL of a project folder: the tables with their keys,
 * domains and defaults, the relationships, the indexes, the saved queries
 * and the rows, written in the dialect of the SQL console so that DataBasic
 * reads it back. It is the file that rules the folder: what it says about
 * tables, keys, relationships and rows wins over the other files.
 *
 * Writing and reading undo each other: reading what was written gives a
 * document that writes the same statements. Comments only explain; reading
 * skips them. Two signatures (the structure and the rows, as statements)
 * tell whether two documents say the same thing in SQL.
 */

export const PROJECT_SQL_NAME = 'esquema.sql';

/* ---------- writing: one statement per idea ---------- */

/** The type as the console reads it: upper case, no spaces around the parameters. */
function typeText( type ) {
    return String( type ).trim().replace( /\s+/g, ' ' ).replace( /\s*([(),])\s*/g, '$1' ).toUpperCase();
    }

function textLiteral( text ) {
    return `'${String( text ).replaceAll( "'", "''" )}'`;
    }

function domainValueLiteral( value ) {
    return typeof value === 'number' ? String( value ) : textLiteral( value );
    }

/**
 * The CHECK of a field's domain: minimum, maximum, list of values and its own
 * rule, joined with AND. A rule alone is written as it is, so that reading it
 * back (a domain with only a rule) writes the same text.
 */
export function domainCheckText( field ) {
    const domain = field.domain;

    if (!domain) {
        return null;
        }

    const name = sqlName( field.name );
    const parts = [];
    const rule = String( domain.check || '' ).trim();

    if (domain.minimum !== null && domain.minimum !== undefined) {
        parts.push( `${name} >= ${domain.minimum}` );
        }

    if (domain.maximum !== null && domain.maximum !== undefined) {
        parts.push( `${name} <= ${domain.maximum}` );
        }

    if (domain.values?.length) {
        parts.push( `${name} IN (${domain.values.map( domainValueLiteral ).join( ', ' )})` );
        }

    if (rule) {
        parts.push( parts.length ? `(${rule})` : rule );
        }

    return parts.length ? parts.join( ' AND ' ) : null;
    }

function columnLine( field ) {
    const required = field.required || field.primary;
    const defaultText = String( field.defaultValue || '' ).trim();
    const check = domainCheckText( field );
    const parts = [`    ${sqlName( field.name )} ${typeText( field.type )}`];

    if (required) {
        parts.push( 'NOT NULL' );
        }

    if (defaultText) {
        parts.push( `DEFAULT ${defaultText}` );
        }

    if (check) {
        parts.push( `CHECK (${check})` );
        }

    return parts.join( ' ' );
    }

function namesOf(
        table,
        columnIds
        ) {
    return columnIds.map( id => sqlName( table.columns.find( field => field.id === id )?.name ?? id ) ).join( ', ' );
    }

function keyLines( table ) {
    const lines = [];
    const primary = table.columns.filter( field => field.primary );

    if (primary.length) {
        lines.push( `    PRIMARY KEY (${primary.map( field => sqlName( field.name ) ).join( ', ' )})` );
        }

    for (const key of table.alternateKeys || []) {
        lines.push( `    CONSTRAINT ${sqlName( key.name )} UNIQUE (${namesOf( table, key.columns )})` );
        }

    return lines;
    }

/** CREATE TABLE, or null for a table that has no fields yet (SQL cannot write it). */
function createTableStatement( table ) {
    if (!table.columns.length) {
        return null;
        }

    const lines = [...table.columns.map( columnLine ), ...keyLines( table )];

    return `CREATE TABLE ${sqlName( table.name )} (\n${lines.join( ',\n' )}\n);`;
    }

function foreignKeyStatement(
        model,
        relation
        ) {
    const parent = model.tables.find( table => table.id === relation.parentId );
    const child = model.tables.find( table => table.id === relation.childId );
    const childNames = namesOf( child, relation.mappings.map( pair => pair.childColumnId ) );
    const parentNames = namesOf( parent, relation.mappings.map( pair => pair.parentColumnId ) );

    return [
        `ALTER TABLE ${sqlName( child.name )} ADD CONSTRAINT ${sqlName( relation.name )}`,
        `    FOREIGN KEY (${childNames}) REFERENCES ${sqlName( parent.name )} (${parentNames})`,
        `    ON DELETE ${relation.onDelete} ON UPDATE ${relation.onUpdate};`
        ].join( '\n' );
    }

function indexStatement(
        table,
        index
        ) {
    return `CREATE ${index.unique ? 'UNIQUE ' : ''}INDEX ${sqlName( index.name )} ON ${sqlName( table.name )} (${namesOf( table, index.columns )});`;
    }

/** CREATE VIEW, or null for a query that has no definition yet. */
function createViewStatement( view ) {
    const definition = String( view.definition || '' ).trim().replace( /;+$/, '' ).trim();

    return definition ? `CREATE VIEW ${sqlName( view.name )} AS\n${definition};` : null;
    }

/** A number written plainly reads back as the same text; anything else is quoted. */
function isPlainNumber( text ) {
    return /^-?\d+(\.\d+)?$/.test( text ) && String( Number( text ) ) === text;
    }

/** A cell as a literal: NULL when empty, a number or #date# when its column has that type and the text is exact, text otherwise. */
function cellLiteral(
        field,
        cell
        ) {
    const text = String( cell ?? '' );
    const kind = typeKind( field.type );

    if (text === '') {
        return 'NULL';
        }

    if (kind === 'number' && isPlainNumber( text )) {
        return text;
        }

    if (kind === 'date' && dateFromText( text )?.iso === text) {
        return `#${text}#`;
        }

    return textLiteral( text );
    }

function insertStatement(
        table,
        row
        ) {
    const names = table.columns.map( field => sqlName( field.name ) ).join( ', ' );
    const values = table.columns.map( field => cellLiteral( field, row[field.id] ) ).join( ', ' );

    return `INSERT INTO ${sqlName( table.name )} (${names}) VALUES (${values});`;
    }

/* ---------- writing: the sections of the file ---------- */

function entityTables( model ) {
    return model.tables.filter( table => table.kind === 'entity' );
    }

function tableSection( model ) {
    return entityTables( model ).map( createTableStatement ).filter( Boolean );
    }

function relationshipSection( model ) {
    return model.relationships.map( relation => foreignKeyStatement( model, relation ) );
    }

function indexSection( model ) {
    return entityTables( model ).flatMap( table => table.indexes.map( index => indexStatement( table, index ) ) );
    }

function viewSection( model ) {
    return model.tables.filter( table => table.kind === 'view' ).map( createViewStatement ).filter( Boolean );
    }

/** One block per table with rows, a line per row; parents come before the tables that reference them. */
function rowSection( model ) {
    return dataInsertOrder( model )
        .map( table => tableRows( model, table.id ).map( row => insertStatement( table, row ) ).join( '\n' ) )
        .filter( Boolean );
    }

/** What a document says in SQL, without comments: its structure and its rows. */
export function projectSQLSignature( model ) {
    return {
        structure: [
            ...tableSection( model ),
            ...relationshipSection( model ),
            ...indexSection( model ),
            ...viewSection( model )
            ].join( '\n' ),
        rows: rowSection( model ).join( '\n' )
        };
    }

function sectionText(
        title,
        statements,
        empty
        ) {
    return [`-- ${title}`, ...(statements.length ? statements : [`-- ${empty}`])].join( '\n\n' );
    }

function unwrittenNotes( model ) {
    const tables = entityTables( model ).filter( table => !table.columns.length ).map( table => table.name );
    const views = model.tables.filter( table => table.kind === 'view' && !createViewStatement( table ) ).map( table => table.name );

    return [
        ...tables.map( name => `-- La tabla ${name} todavía no tiene campos: SQL no puede escribirla.` ),
        ...views.map( name => `-- La consulta ${name} todavía no tiene definición.` )
        ];
    }

/** The whole file: a header, then tables, relationships, indexes, queries and rows. */
export function projectSQL( model ) {
    const header = [
        `-- ${model.name}`,
        '-- SQL del proyecto, en el dialecto de la consola de DataBasic.',
        '-- Este archivo manda en tablas, claves, relaciones, consultas y filas: si lo cambias,',
        '-- DataBasic lo sigue al abrir la carpeta. Las líneas que empiezan por -- son comentarios.',
        ...unwrittenNotes( model )
        ].join( '\n' );

    return [
        header,
        sectionText( 'Tablas', tableSection( model ), 'Sin tablas.' ),
        sectionText( 'Relaciones (claves ajenas)', relationshipSection( model ), 'Sin relaciones.' ),
        sectionText( 'Índices', indexSection( model ), 'Sin índices.' ),
        sectionText( 'Consultas guardadas', viewSection( model ), 'Sin consultas.' ),
        sectionText( 'Filas', rowSection( model ), 'Sin filas.' )
        ].join( '\n\n' ) + '\n';
    }

/* ---------- reading ---------- */

const PROJECT_SCHEMA_STATEMENTS = new Set( [
    'create-table', 'alter-table', 'drop-table', 'create-index', 'drop-index', 'create-view', 'drop-view'
    ] );

/** An error of one statement, with its line in the file. */
function statementError(
        error,
        statement,
        text
        ) {
    const place = sqlLocation( text, statement.start );

    return new Error( `${PROJECT_SQL_NAME}, línea ${place.line}: ${error.message}` );
    }

function readStatements( text ) {
    try {
        return parseScript( text );
        }
    catch (error) {
        throw new Error( `${PROJECT_SQL_NAME}: ${sqlErrorText( error, text )}` );
        }
    }

function statementKindText( statement ) {
    const kinds = {select: 'una consulta SELECT', union: 'una consulta SELECT', update: 'un UPDATE', delete: 'un DELETE'};

    return kinds[statement.type] || 'otra instrucción';
    }

function insertTable(
        model,
        statement
        ) {
    const table = model.tables.find( item => item.name.toLowerCase() === statement.table.toLowerCase() );

    if (!table) {
        throw new SqlError( `No se encuentra la tabla «${statement.table}»: créala antes con CREATE TABLE.` );
        }

    if (table.kind !== 'entity') {
        throw new SqlError( `«${table.name}» es una consulta guardada: no lleva filas.` );
        }

    if (statement.query) {
        throw new SqlError( 'Aquí las filas se escriben con VALUES, no con INSERT … SELECT.' );
        }

    return table;
    }

function insertFields(
        table,
        statement
        ) {
    if (!statement.columns) {
        return table.columns;
        }

    const fields = statement.columns.map( name => {
        const field = table.columns.find( item => item.name.toLowerCase() === name.toLowerCase() );

        if (!field) {
            throw new SqlError( `La tabla «${table.name}» no tiene el campo «${name}».` );
            }

        return field;
        } );

    if (new Set( fields ).size !== fields.length) {
        throw new SqlError( 'Un campo aparece dos veces en la lista de INSERT.' );
        }

    return fields;
    }

/** The text a cell keeps for a value read from the file. */
function cellText(
        field,
        value
        ) {
    if (value === null || value === undefined) {
        return '';
        }

    if (typeof value === 'number') {
        return String( value );
        }

    if (value instanceof SqlDate) {
        return value.iso;
        }

    if (typeof value === 'boolean') {
        return cellFromValue( value, field.type );
        }

    return String( value );
    }

/** One row of an INSERT: every written value, and the default of the fields it leaves out. */
function insertedRow(
        database,
        table,
        fields,
        values
        ) {
    const scope = rowScopeFor( database, [], [] );
    const row = {};

    if (values.length !== fields.length) {
        throw new SqlError( `INSERT da ${values.length} valores para ${fields.length} campos de «${table.name}».` );
        }

    for (const field of table.columns) {
        const position = fields.indexOf( field );
        const cell = position < 0 ? defaultCell( database, field ) : cellText( field, evaluate( values[position], scope ) );

        if (cell !== '') {
            row[field.id] = cell;
            }
        }

    return row;
    }

/**
 * The rows are taken as written, without the checks of the console: a row
 * that breaks a rule stays, and the datasheet marks it, so that opening a
 * folder never loses what its file says.
 */
function readRows(
        model,
        inserts,
        text
        ) {
    const database = openDatabase( model );
    const data = {};

    for (const statement of inserts) {
        try {
            const table = insertTable( model, statement );
            const fields = insertFields( table, statement );

            data[table.id] ||= [];

            for (const values of statement.rows) {
                data[table.id].push( insertedRow( database, table, fields, values ) );
                }
            }
        catch (error) {
            throw statementError( error, statement, text );
            }
        }

    try {
        return replaceDocumentData( model, data );
        }
    catch (error) {
        throw new Error( `${PROJECT_SQL_NAME}: ${error.message}` );
        }
    }

/** The course's four type families when every field fits them; the general profile otherwise. */
function withNarrowestProfile( model ) {
    const fields = entityTables( model ).flatMap( table => table.columns );

    return fields.every( field => validCourseType( field.type ) ) ? setModelProfile( model, 'course' ) : model;
    }

/**
 * The document that the file describes: CREATE, ALTER and DROP build the
 * tables through the model's rules (as the console does), INSERT gives the
 * rows. Any other statement is refused, because the file describes the
 * database and does not work on it.
 */
export function modelFromProjectSQL( text ) {
    const source = String( text );
    const inserts = [];
    let model = emptyDocument( 'general' );

    for (const statement of readStatements( source )) {
        if (statement.type === 'insert') {
            inserts.push( statement );
            continue;
            }

        if (!PROJECT_SCHEMA_STATEMENTS.has( statement.type )) {
            throw statementError(
                    new Error( `${PROJECT_SQL_NAME} describe la base de datos con CREATE, ALTER, DROP e INSERT; aquí hay ${statementKindText( statement )}.` ),
                    statement,
                    source
                    );
            }

        try {
            model = executeSchemaStatement( model, statement ).model;
            }
        catch (error) {
            throw statementError( error, statement, source );
            }
        }

    return withNarrowestProfile( readRows( model, inserts, source ) );
    }
