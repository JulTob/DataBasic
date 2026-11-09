import { documentData } from '../domain/model.js';
import { parseQuery } from './parser.js';
import {
    executeQuery,
    openDatabase
    } from './query.js';
import {
    displayValue,
    typeKind
    } from './values.js';

/*
 * What a form shows: its fields (with what each needs to be typed: kind,
 * required, the values of its domain, the rows a foreign key can point to)
 * and its records. A form over a table edits its records; a form over a
 * saved query shows the query's result and is read-only.
 */

function fieldOfColumn(
        model,
        table,
        column
        ) {
    const relation = model.relationships.find(
            item => item.childId === table.id && item.mappings.length === 1 && item.mappings[0].childColumnId === column.id
            );
    let choices = null;

    if (relation) {
        const parent = model.tables.find( item => item.id === relation.parentId );
        const key = relation.mappings[0].parentColumnId;
        const label = parent.columns.find( item => !item.primary && typeKind( item.type ) === 'text' );

        choices = (documentData( model )[parent.id] || []).map(
                row => [row[key] ?? '', label && row[label.id] ? `${row[key]} · ${row[label.id]}` : String( row[key] ?? '' )]
                );
        }

    return {
        key: column.id,
        name: column.name,
        type: column.type,
        kind: typeKind( column.type ),
        required: column.required || column.primary,
        primary: column.primary,
        values: column.domain?.values || [],
        choices,
        reference: relation ? model.tables.find( item => item.id === relation.parentId )?.name : null
        };
    }

/** Every field a source offers to a form: the columns of a table, or the result fields of a query. */
export function sourceFields(
        model,
        sourceId
        ) {
    const source = model.tables.find( item => item.id === sourceId );

    if (!source) {
        return [];
        }

    if (source.kind === 'entity') {
        return source.columns.map( column => fieldOfColumn( model, source, column ) );
        }

    try {
        const result = executeQuery( openDatabase( model ), parseQuery( source.definition ) );

        return result.columns.map( column => ({key: column.name, name: column.name, kind: 'text', required: false, primary: false, values: [], choices: null}) );
        }
    catch {
        return [];
        }
    }

/** The form ready to draw: its fields in order and its records as texts. */
export function formRecords(
        model,
        form
        ) {
    const source = model.tables.find( item => item.id === form.sourceId );
    const available = sourceFields( model, form.sourceId );
    const fields = form.fields.map( key => available.find( field => field.key === key ) ).filter( Boolean );

    if (source?.kind === 'entity') {
        return {
            editable: true,
            source,
            fields,
            rows: (documentData( model )[source.id] || []).map(
                    (row, index) => ({index, cells: Object.fromEntries( fields.map( field => [field.key, row[field.key] ?? ''] ) )})
                    )
            };
        }

    let result = {columns: [], rows: []};
    let error = null;

    try {
        result = executeQuery( openDatabase( model ), parseQuery( source.definition ) );
        }
    catch (problem) {
        error = problem.message;
        }

    return {
        editable: false,
        source,
        fields,
        error,
        rows: result.rows.map(
                (values, index) => ({
                    index,
                    cells: Object.fromEntries( fields.map( field => [field.key, displayValue( values[result.columns.findIndex( column => column.name === field.key )] ?? null )] ) )
                    })
                )
        };
    }
