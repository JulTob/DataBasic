import { sqlErrorText } from './lexer.js';
import { parseScript } from './parser.js';
import {
    algebraText,
    columnKinds,
    executeQuery,
    openDatabase
    } from './query.js';
import {
    executeDelete,
    executeInsert,
    executeUpdate
    } from './dml.js';
import { executeSchemaStatement } from './ddl.js';

/*
 * The console runs a script: one or more statements separated by «;».
 *   - A syntax error anywhere stops the script before anything runs.
 *   - Statements run in order; each one sees what the previous ones did.
 *   - A statement that fails stops the script; the earlier ones stay done,
 *     and the editor's Deshacer reverts the whole run in one step.
 * Every statement leaves one output:
 *   {kind: 'rows', columns, kinds, rows, algebra}   a SELECT and its result;
 *   {kind: 'done', message}                         a change and what it did;
 *   {kind: 'error', message}                        why it stopped.
 */

const SQL_OUTPUT_ROW_LIMIT = 1000;

function runStatement(
        model,
        statement
        ) {
    switch (statement.type) {
        case 'select':
        case 'union': {
            const result = executeQuery( openDatabase( model ), statement );

            return {
                model,
                output: {
                    kind: 'rows',
                    columns: result.columns.map( column => column.name ),
                    kinds: columnKinds( result ),
                    rows: result.rows.slice( 0, SQL_OUTPUT_ROW_LIMIT ),
                    total: result.rows.length,
                    algebra: algebraText( result.plan )
                    }
                };
            }
        case 'insert':
            return asChange( executeInsert( model, statement ) );
        case 'update':
            return asChange( executeUpdate( model, statement ) );
        case 'delete':
            return asChange( executeDelete( model, statement ) );
        default:
            return asChange( executeSchemaStatement( model, statement ) );
        }
    }

function asChange( result ) {
    return {model: result.model, output: {kind: 'done', message: result.message}};
    }

/** True when a statement changes the document (anything but a query). */
export function changesDocument( statement ) {
    return !['select', 'union'].includes( statement.type );
    }

/**
 * Runs the text of the console against the document. Returns the document
 * after the statements that succeeded, one output per statement run, and
 * whether anything changed.
 */
export function runSql(
        model,
        text
        ) {
    let statements;

    try {
        statements = parseScript( text );
        }
    catch (error) {
        return {model, changed: false, outputs: [{statement: text.trim(), kind: 'error', message: sqlErrorText( error, text )}]};
        }

    let current = model;
    const outputs = [];

    for (const statement of statements) {
        try {
            const result = runStatement( current, statement );

            current = result.model;
            outputs.push( {statement: statement.source, ...result.output} );
            }
        catch (error) {
            const place = error.position !== null && error.position !== undefined ? ` (${locationIn( text, error.position )})` : '';

            outputs.push( {statement: statement.source, kind: 'error', message: place ? `${error.message.replace( /\.$/, '' )}${place}.` : error.message} );
            break;
            }
        }

    return {model: current, changed: current !== model, outputs};
    }

/** The place of a position of the whole script, «línea 2, columna 7». */
function locationIn(
        text,
        position
        ) {
    const before = text.slice( 0, position ).split( '\n' );

    return `línea ${before.length}, columna ${before.at( -1 ).length + 1}`;
    }
