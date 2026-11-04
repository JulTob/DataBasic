import {
    documentData,
    parseDataType,
    tableRows,
    validType
    } from './model.js';

/*
 * Checks of the sample rows against the table's own rules, the way Access
 * refuses a record in the datasheet: required fields, the shape a type
 * demands, the domain, duplicate keys and references to rows that do not
 * exist. Every finding is a warning with the table, the row (1-based, as the
 * datasheet numbers them) and, when it concerns one cell, the column.
 */

/** All findings of the document, table by table. */
export function dataStatus( model ) {
    const issues = [];

    for (const table of model.tables.filter( item => item.kind === 'entity' )) {
        issues.push( ...tableDataStatus( model, table ) );
        }

    return issues;
    }

/** The findings of one table: cells first, then keys, then references. */
export function tableDataStatus(
        model,
        table
        ) {
    const rows = tableRows( model, table.id );
    const issues = [];

    rows.forEach( (row, index) => {
        for (const column of table.columns) {
            const problem = cellProblem( column, row[column.id] ?? '' );

            if (problem) {
                issues.push( dataIssue( table, index, column, `${column.name}: ${problem}` ) );
                }
            }
        } );

    issues.push( ...duplicateKeyIssues( table, rows ) );
    issues.push( ...referenceIssues( model, table, rows ) );
    return issues;
    }

/** The problem with one cell, or null when the value fits the column. */
export function cellProblem(
        column,
        value
        ) {
    const text = String( value ?? '' ).trim();

    if (text === '') {
        return column.required || column.primary ? 'es obligatorio.' : null;
        }

    const typeProblem = typeProblemFor( column.type, text );

    if (typeProblem) {
        return typeProblem;
        }

    return domainProblemFor( column, text );
    }

/* ---------- types ---------- */

const DATA_NUMBER_FAMILIES = ['NUMBER', 'DECIMAL', 'NUMERIC', 'INTEGER', 'INT', 'SMALLINT', 'BIGINT', 'REAL', 'FLOAT', 'DOUBLE'];
const DATA_WHOLE_FAMILIES = ['INTEGER', 'INT', 'SMALLINT', 'BIGINT'];

function typeProblemFor(
        type,
        text
        ) {
    if (!validType( type )) {
        return null;
        }

    const parsed = parseDataType( type );

    if (['VARCHAR', 'CHAR'].includes( parsed.family )) {
        return text.length > parsed.length
            ? `supera los ${parsed.length} caracteres de ${type}.`
            : null;
        }

    if (DATA_NUMBER_FAMILIES.includes( parsed.family )) {
        return numberProblemFor( parsed, text );
        }

    if (parsed.family === 'DATE') {
        return validDate( text ) ? null : 'debe ser una fecha AAAA-MM-DD.';
        }

    if (parsed.family === 'TIME') {
        return /^\d{2}:\d{2}(:\d{2})?$/.test( text ) ? null : 'debe ser una hora HH:MM.';
        }

    if (['TIMESTAMP', 'DATETIME'].includes( parsed.family )) {
        const [date, time] = text.split( /[ T]/ );

        return validDate( date ) && (time === undefined || /^\d{2}:\d{2}(:\d{2})?$/.test( time ))
            ? null
            : 'debe ser una fecha y hora AAAA-MM-DD HH:MM.';
        }

    if (['BOOLEAN', 'BOOL'].includes( parsed.family )) {
        return isBooleanText( text ) ? null : 'debe ser sí o no.';
        }

    return null;
    }

function numberProblemFor(
        parsed,
        text
        ) {
    if (!/^[+-]?\d+(\.\d+)?$/.test( text )) {
        return 'debe ser un número.';
        }

    const [whole, decimals = ''] = text.replace( /^[+-]/, '' ).split( '.' );
    const scale = parsed.scale ?? 0;

    if (DATA_WHOLE_FAMILIES.includes( parsed.family ) || parsed.precision !== null && scale <= 0) {
        if (decimals.length) {
            return 'debe ser un número entero.';
            }
        }

    if (parsed.precision !== null) {
        if (scale > 0 && decimals.length > scale) {
            return `admite ${scale} decimales como máximo.`;
            }

        const digits = whole.replace( /^0+(?=\d)/, '' ).length + Math.min( decimals.length, Math.max( scale, 0 ) );

        if (digits > parsed.precision) {
            return `supera los ${parsed.precision} dígitos del tipo.`;
            }
        }

    return null;
    }

function validDate( text ) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test( text || '' )) {
        return false;
        }

    const [year, month, day] = text.split( '-' ).map( Number );
    const date = new Date( Date.UTC( year, month - 1, day ) );

    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
    }

export function isBooleanText( text ) {
    return ['true', 'false', 'sí', 'si', 'no', '1', '0', 'verdadero', 'falso'].includes( String( text ).trim().toLowerCase() );
    }

/* ---------- domain ---------- */

function domainProblemFor(
        column,
        text
        ) {
    const domain = column.domain;

    if (!domain) {
        return null;
        }

    const number = /^[+-]?\d+(\.\d+)?$/.test( text ) ? Number( text ) : null;

    if (domain.minimum !== null && (number === null || number < domain.minimum)) {
        return `debe ser mayor o igual que ${domain.minimum}.`;
        }

    if (domain.maximum !== null && (number === null || number > domain.maximum)) {
        return `debe ser menor o igual que ${domain.maximum}.`;
        }

    if (domain.values.length && !domain.values.some( value => String( value ) === text )) {
        return `debe ser uno de: ${domain.values.join( ', ' )}.`;
        }

    return null;
    }

/* ---------- keys ---------- */

/** Primary key, alternate keys and unique indexes: the same values twice are reported once. */
function duplicateKeyIssues(
        table,
        rows
        ) {
    const keys = [];
    const primary = table.columns.filter( column => column.primary ).map( column => column.id );

    if (primary.length) {
        keys.push( {label: 'la clave primaria', columns: primary} );
        }

    for (const key of table.alternateKeys || []) {
        keys.push( {label: `la clave alternativa ${key.name}`, columns: key.columns} );
        }

    for (const index of table.indexes.filter( item => item.unique )) {
        keys.push( {label: `el índice único ${index.name}`, columns: index.columns} );
        }

    const issues = [];

    for (const key of keys) {
        const seen = new Map();

        rows.forEach( (row, index) => {
            const values = key.columns.map( id => String( row[id] ?? '' ).trim() );

            if (values.some( value => value === '' )) {
                return;
            }

            const signature = JSON.stringify( values );

            if (seen.has( signature )) {
                issues.push( dataIssue(
                        table,
                        index,
                        null,
                        `repite ${key.label} de la fila ${seen.get( signature ) + 1} (${values.join( ', ' )}).`
                        ) );
                }
            else {
                seen.set( signature, index );
                }
            } );
        }

    return issues;
    }

/* ---------- references ---------- */

/** Every complete foreign key value must exist as a key in the referenced table. */
function referenceIssues(
        model,
        table,
        rows
        ) {
    const issues = [];

    for (const relation of model.relationships.filter( item => item.childId === table.id )) {
        const parent = model.tables.find( item => item.id === relation.parentId );
        const parentRows = tableRows( model, parent.id );
        const parentKeys = new Set( parentRows.map(
                row => JSON.stringify( relation.mappings.map( pair => String( row[pair.parentColumnId] ?? '' ).trim() ) )
                ) );

        rows.forEach( (row, index) => {
            const values = relation.mappings.map( pair => String( row[pair.childColumnId] ?? '' ).trim() );

            if (values.some( value => value === '' )) {
                return;
                }

            if (!parentKeys.has( JSON.stringify( values ) )) {
                const columns = relation.mappings.map(
                        pair => table.columns.find( column => column.id === pair.childColumnId )?.name
                        ).join( ', ' );

                issues.push( dataIssue(
                        table,
                        index,
                        null,
                        `${columns} = ${values.join( ', ' )} no existe en ${parent.name}${parentRows.length ? '' : ' (sin filas de ejemplo)'}.`
                        ) );
                }
            } );
        }

    return issues;
    }

function dataIssue(
        table,
        rowIndex,
        column,
        detail
        ) {
    return {
        level: 'warning',
        code: 'data',
        message: `${table.name}, fila ${rowIndex + 1}: ${detail}`,
        elementId: table.id,
        rowIndex,
        columnId: column ? column.id : null
        };
    }

/* ---------- order for exports ---------- */

/** Tables whose rows must be inserted first: referenced tables before the ones that reference them. */
export function dataInsertOrder( model ) {
    const tables = model.tables.filter( item => item.kind === 'entity' );
    const pending = new Map( tables.map( table => [table.id, table] ) );
    const ordered = [];
    const dependsOn = table => model.relationships
        .filter( relation => relation.childId === table.id && relation.parentId !== table.id )
        .map( relation => relation.parentId );

    while (pending.size) {
        const ready = [...pending.values()].filter(
                table => dependsOn( table ).every( id => !pending.has( id ) )
                );
        const next = ready.length ? ready : [pending.values().next().value];

        for (const table of next) {
            ordered.push( table );
            pending.delete( table.id );
            }
        }

    return ordered;
    }

/** The rows of a table with only its live columns, for the writers. */
export function tableDataRows(
        model,
        table
        ) {
    const ids = new Set( table.columns.map( column => column.id ) );

    return tableRows( model, table.id ).map(
            row => Object.fromEntries( Object.entries( row ).filter( ([id]) => ids.has( id ) ) )
            );
    }

export function documentHasData( model ) {
    return Object.values( documentData( model ) ).some( rows => rows.length );
    }
