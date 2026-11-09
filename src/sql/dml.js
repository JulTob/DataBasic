import {
    DATA_ROW_LIMIT,
    documentData,
    replaceDocumentData
    } from '../domain/model.js';
import { cellProblem } from '../domain/data.js';
import { SqlError } from './lexer.js';
import { parseExpression } from './parser.js';
import { evaluate } from './expressions.js';
import {
    executeQuery,
    openDatabase,
    rowScopeFor
    } from './query.js';
import {
    cellFromValue,
    truth,
    valueFromCell
    } from './values.js';

/*
 * INSERT, UPDATE and DELETE change the sample rows of the document, and
 * refuse what Access refuses: a value of the wrong type, an empty required
 * field, a value outside the domain or its CHECK, a repeated key, a
 * reference to a row that does not exist. Deleting or changing a referenced
 * key follows the relationship's action:
 *   NO ACTION    the statement is refused while related rows exist;
 *   CASCADE      the related rows are deleted or take the new key;
 *   SET NULL     the related rows keep no reference;
 *   SET DEFAULT  the related rows take the field's default value.
 * A statement applies completely or not at all.
 */

/* ---------- the working copy of the rows ---------- */

function workingCopy( model ) {
    const data = structuredClone( documentData( model ) );

    for (const table of model.tables.filter( item => item.kind === 'entity' )) {
        data[table.id] ||= [];
        }

    return data;
    }

function entityTable(
        model,
        name,
        verb
        ) {
    const table = model.tables.find( item => item.name.toLowerCase() === String( name ).toLowerCase() );

    if (!table) {
        throw new SqlError( `No se encuentra la tabla «${name}».` );
        }

    if (table.kind !== 'entity') {
        throw new SqlError( `«${table.name}» es una consulta guardada: no se puede ${verb} en ella.` );
        }

    return table;
    }

function columnNamed(
        table,
        name
        ) {
    const column = table.columns.find( item => item.name.toLowerCase() === String( name ).toLowerCase() );

    if (!column) {
        throw new SqlError( `La tabla «${table.name}» no tiene el campo «${name}».` );
        }

    return column;
    }

/** The row as values of its columns, for WHERE, SET and CHECK. */
function rowValues(
        table,
        row
        ) {
    return table.columns.map( column => valueFromCell( row[column.id], column.type ) );
    }

function scopeOfRow(
        database,
        table,
        row
        ) {
    return rowScopeFor(
            database,
            table.columns.map( column => ({name: column.name, table: table.name}) ),
            rowValues( table, row )
            );
    }

/** The default value of a field, as its DEFAULT expression gives it (the text itself when it is not an expression). */
export function defaultCell(
        database,
        column
        ) {
    const text = String( column.defaultValue || '' ).trim();

    if (!text) {
        return '';
        }

    try {
        return cellFromValue( evaluate( parseExpression( text ), rowScopeFor( database, [], [] ) ), column.type );
        }
    catch {
        return text;
        }
    }

function storedCell(
        column,
        value
        ) {
    try {
        return cellFromValue( value, column.type );
        }
    catch (error) {
        throw new SqlError( `Campo «${column.name}»: ${error.message}` );
        }
    }

/* ---------- the rules a changed row must keep ---------- */

function rowLabel(
        table,
        row
        ) {
    const keys = table.columns.filter( column => column.primary );
    const shown = (keys.length ? keys : table.columns.slice( 0, 1 ))
        .map( column => `${column.name} = ${row[column.id] || 'Nulo'}` );

    return `${table.name} (${shown.join( ', ' )})`;
    }

/** Type, required field, domain and CHECK of every field of a row. */
function checkRowFields(
        database,
        table,
        row
        ) {
    for (const column of table.columns) {
        const problem = cellProblem( column, row[column.id] ?? '' );

        if (problem) {
            throw new SqlError( `${rowLabel( table, row )}: el campo ${column.name} ${problem}` );
            }

        const check = column.domain?.check?.trim();

        if (check) {
            let expression;

            try {
                expression = parseExpression( check );
                }
            catch {
                continue;
                }

            let verdict;

            try {
                verdict = truth( evaluate( expression, scopeOfRow( database, table, row ) ) );
                }
            catch (error) {
                throw new SqlError( `La regla de validación de ${column.name} (${check}) no se puede evaluar: ${error.message}` );
                }

            if (verdict === false) {
                throw new SqlError( `${rowLabel( table, row )}: no cumple la regla de validación de ${column.name}: ${check}.` );
                }
            }
        }
    }

function keySignature(
        row,
        columnIds
        ) {
    const values = columnIds.map( id => String( row[id] ?? '' ).trim().toLowerCase() );

    return values.some( value => value === '' ) ? null : JSON.stringify( values );
    }

/** A changed row may not repeat the primary key, an alternate key or a unique index of another row. */
function checkUniqueKeys(
        table,
        rows,
        changed
        ) {
    const primary = table.columns.filter( column => column.primary ).map( column => column.id );
    const keys = [
        ...(primary.length ? [{label: 'la clave principal', columns: primary}] : []),
        ...(table.alternateKeys || []).map( key => ({label: `la clave alternativa ${key.name}`, columns: key.columns}) ),
        ...table.indexes.filter( index => index.unique ).map( index => ({label: `el índice único ${index.name}`, columns: index.columns}) )
        ];

    for (const key of keys) {
        const seen = new Map();

        for (const row of rows) {
            const signature = keySignature( row, key.columns );

            if (signature === null) {
                continue;
                }

            const other = seen.get( signature );

            if (other && (changed.has( row ) || changed.has( other ))) {
                const values = key.columns.map( id => row[id] ).join( ', ' );

                throw new SqlError(
                        `No se puede guardar ${rowLabel( table, row )}: repite ${key.label} (${values}) de otro registro.`
                        );
                }

            seen.set( signature, row );
            }
        }
    }

/** A changed row that references another table needs the referenced row to exist. */
function checkReferences(
        model,
        data,
        table,
        changed
        ) {
    for (const relation of model.relationships.filter( item => item.childId === table.id )) {
        const parent = model.tables.find( item => item.id === relation.parentId );
        const parentKeys = new Set(
                (data[parent.id] || []).map( row => keySignature( row, relation.mappings.map( pair => pair.parentColumnId ) ) )
                );

        for (const row of changed) {
            const signature = keySignature( row, relation.mappings.map( pair => pair.childColumnId ) );

            if (signature !== null && !parentKeys.has( signature )) {
                throw new SqlError(
                        `No se puede agregar o cambiar ${rowLabel( table, row )} porque se necesita un registro relacionado en la tabla «${parent.name}».`
                        );
                }
            }
        }
    }

/** Every rule, for the rows a statement wrote (inserted, updated or reached by a cascade). */
function checkChangedRows(
        model,
        database,
        data,
        changedByTable
        ) {
    for (const [tableId, changed] of changedByTable) {
        const table = model.tables.find( item => item.id === tableId );

        for (const row of changed) {
            checkRowFields( database, table, row );
            }

        checkUniqueKeys( table, data[tableId], changed );
        checkReferences( model, data, table, changed );
        }
    }

function markChanged(
        changedByTable,
        tableId,
        row
        ) {
    if (!changedByTable.has( tableId )) {
        changedByTable.set( tableId, new Set() );
        }

    changedByTable.get( tableId ).add( row );
    }

/* ---------- referential actions ---------- */

function related(
        data,
        relation,
        parentRow,
        excluded
        ) {
    const signature = keySignature( parentRow, relation.mappings.map( pair => pair.parentColumnId ) );

    if (signature === null) {
        return [];
        }

    return (data[relation.childId] || []).filter(
            row => !excluded.has( row ) && keySignature( row, relation.mappings.map( pair => pair.childColumnId ) ) === signature
            );
    }

function clearReference(
        model,
        database,
        relation,
        rows,
        action,
        changedByTable
        ) {
    const child = model.tables.find( item => item.id === relation.childId );

    for (const row of rows) {
        for (const pair of relation.mappings) {
            const column = child.columns.find( item => item.id === pair.childColumnId );

            row[pair.childColumnId] = action === 'SET DEFAULT' ? defaultCell( database, column ) : '';
            }

        markChanged( changedByTable, child.id, row );
        }
    }

function refuseRelated(
        model,
        relation,
        rows,
        verb
        ) {
    const child = model.tables.find( item => item.id === relation.childId );

    throw new SqlError(
            `No se puede ${verb} el registro porque la tabla «${child.name}» tiene ${rows.length} registro${rows.length === 1 ? '' : 's'} relacionado${rows.length === 1 ? '' : 's'} (${relation.name}, acción ${verb === 'eliminar' ? 'al eliminar' : 'al actualizar'}: NO ACTION).`
            );
    }

/** Deletes the rows and applies ON DELETE to the rows that reference them, as far as the cascade goes. */
function deleteWithActions(
        model,
        database,
        data,
        table,
        rows,
        changedByTable
        ) {
    const deleted = new Map( [[table.id, new Set( rows )]] );
    const queue = rows.map( row => ({tableId: table.id, row}) );
    const isDeleted = (tableId, row) => deleted.get( tableId )?.has( row );

    while (queue.length) {
        const {tableId, row} = queue.shift();

        for (const relation of model.relationships.filter( item => item.parentId === tableId )) {
            const excluded = deleted.get( relation.childId ) || new Set();
            const children = related( data, relation, row, excluded ).filter( child => !isDeleted( relation.childId, child ) );

            if (!children.length) {
                continue;
                }

            if (relation.onDelete === 'CASCADE') {
                if (!deleted.has( relation.childId )) {
                    deleted.set( relation.childId, new Set() );
                    }

                children.forEach( child => {
                    deleted.get( relation.childId ).add( child );
                    queue.push( {tableId: relation.childId, row: child} );
                    } );
                }
            else if (['SET NULL', 'SET DEFAULT'].includes( relation.onDelete )) {
                clearReference( model, database, relation, children, relation.onDelete, changedByTable );
                }
            else {
                refuseRelated( model, relation, children, 'eliminar' );
                }
            }
        }

    let count = 0;

    for (const [tableId, gone] of deleted) {
        data[tableId] = data[tableId].filter( row => !gone.has( row ) );
        changedByTable.get( tableId )?.forEach( row => gone.has( row ) && changedByTable.get( tableId ).delete( row ) );
        count += gone.size;
        }

    return count - rows.length;
    }

/** After rows changed their key, ON UPDATE carries the change to the rows that referenced the old key. */
function updateWithActions(
        model,
        database,
        data,
        changes,
        changedByTable
        ) {
    const queue = [...changes];

    while (queue.length) {
        const {tableId, before, row} = queue.shift();

        for (const relation of model.relationships.filter( item => item.parentId === tableId )) {
            const parentColumns = relation.mappings.map( pair => pair.parentColumnId );

            if (keySignature( before, parentColumns ) === keySignature( row, parentColumns )) {
                continue;
                }

            const children = related( data, relation, before, new Set( [row] ) );

            if (!children.length) {
                continue;
                }

            if (relation.onUpdate === 'CASCADE') {
                for (const child of children) {
                    const previous = {...child};

                    relation.mappings.forEach( pair => { child[pair.childColumnId] = row[pair.parentColumnId]; } );
                    markChanged( changedByTable, relation.childId, child );
                    queue.push( {tableId: relation.childId, before: previous, row: child} );
                    }
                }
            else if (['SET NULL', 'SET DEFAULT'].includes( relation.onUpdate )) {
                clearReference( model, database, relation, children, relation.onUpdate, changedByTable );
                }
            else {
                refuseRelated( model, relation, children, 'cambiar' );
                }
            }
        }
    }

/* ---------- the statements ---------- */

function commitRows(
        model,
        data,
        message
        ) {
    return {model: replaceDocumentData( model, data ), message};
    }

function plural(
        count,
        singular,
        pluralText
        ) {
    return `${count} ${count === 1 ? singular : pluralText}`;
    }

export function executeInsert(
        model,
        statement
        ) {
    const table = entityTable( model, statement.table, 'insertar' );
    const database = openDatabase( model );
    const data = workingCopy( model );
    const columns = statement.columns
        ? statement.columns.map( name => columnNamed( table, name ) )
        : table.columns;
    const valueRows = statement.query
        ? executeQuery( database, statement.query ).rows
        : statement.rows.map( values => values.map( expr => evaluate( expr, rowScopeFor( database, [], [] ) ) ) );

    if (new Set( columns.map( column => column.id ) ).size !== columns.length) {
        throw new SqlError( 'Un campo aparece dos veces en la lista de INSERT.' );
        }

    const changedByTable = new Map();

    for (const values of valueRows) {
        if (values.length !== columns.length) {
            throw new SqlError( `INSERT da ${values.length} valores para ${columns.length} campos de «${table.name}».` );
            }

        const row = Object.fromEntries( table.columns.map( column => [column.id, defaultCell( database, column )] ) );

        columns.forEach( (column, index) => { row[column.id] = storedCell( column, values[index] ); } );
        data[table.id].push( row );
        markChanged( changedByTable, table.id, row );
        }

    if (data[table.id].length > DATA_ROW_LIMIT) {
        throw new SqlError( `La tabla «${table.name}» admite hasta ${DATA_ROW_LIMIT} registros de ejemplo.` );
        }

    checkChangedRows( model, database, data, changedByTable );
    return commitRows( model, data, `${plural( valueRows.length, 'registro agregado', 'registros agregados' )} a ${table.name}.` );
    }

export function executeUpdate(
        model,
        statement
        ) {
    const table = entityTable( model, statement.table, 'actualizar' );
    const database = openDatabase( model );
    const data = workingCopy( model );
    const assignments = statement.assignments.map( item => ({column: columnNamed( table, item.column ), expr: item.expr}) );
    const changedByTable = new Map();
    const changes = [];

    for (const row of data[table.id]) {
        const scope = scopeOfRow( database, table, row );

        if (statement.where && truth( evaluate( statement.where, scope ) ) !== true) {
            continue;
            }

        const before = {...row};
        const values = assignments.map( item => evaluate( item.expr, scope ) );

        assignments.forEach( (item, index) => { row[item.column.id] = storedCell( item.column, values[index] ); } );
        markChanged( changedByTable, table.id, row );
        changes.push( {tableId: table.id, before, row} );
        }

    updateWithActions( model, database, data, changes, changedByTable );
    checkChangedRows( model, database, data, changedByTable );
    return commitRows( model, data, `${plural( changes.length, 'registro actualizado', 'registros actualizados' )} en ${table.name}.` );
    }

export function executeDelete(
        model,
        statement
        ) {
    const table = entityTable( model, statement.table, 'eliminar' );
    const database = openDatabase( model );
    const data = workingCopy( model );
    const changedByTable = new Map();
    const doomed = data[table.id].filter(
            row => !statement.where || truth( evaluate( statement.where, scopeOfRow( database, table, row ) ) ) === true
            );
    const cascaded = deleteWithActions( model, database, data, table, doomed, changedByTable );

    checkChangedRows( model, database, data, changedByTable );

    const extra = cascaded ? ` y ${plural( cascaded, 'registro relacionado', 'registros relacionados' )} en cascada` : '';

    return commitRows( model, data, `${plural( doomed.length, 'registro eliminado', 'registros eliminados' )} de ${table.name}${extra}.` );
    }
