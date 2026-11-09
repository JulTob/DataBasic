import {
    changeDocument,
    column,
    documentData,
    isGeneratedTable,
    newId,
    removeColumn,
    removeElement,
    sameType
    } from '../domain/model.js';
import { cellProblem } from '../domain/data.js';
import { defaultCell } from './dml.js';
import { SqlError } from './lexer.js';
import { parseExpression } from './parser.js';
import {
    executeQuery,
    openDatabase
    } from './query.js';

/*
 * CREATE, ALTER and DROP change the relational model of the document, through
 * the same rules as the editor: a change the model refuses is refused here
 * with the model's own message. Two rules are the console's own:
 *   - a table generated from the Chen diagram keeps its structure there, so
 *     ALTER and DROP send the student to the Diagrama view;
 *   - a field marked UNIQUE becomes an alternate key when it is NOT NULL
 *     (the course's definition) and a unique index when it admits nulls.
 * Tables created here are relational only: they have no Chen origin.
 */

function findTable(
        model,
        name
        ) {
    return model.tables.find( item => item.name.toLowerCase() === String( name ).toLowerCase() ) || null;
    }

function requireEntity(
        model,
        name
        ) {
    const table = findTable( model, name );

    if (!table) {
        throw new SqlError( `No se encuentra la tabla «${name}».` );
        }

    if (table.kind !== 'entity') {
        throw new SqlError( `«${table.name}» es una consulta guardada, no una tabla.` );
        }

    return table;
    }

function requireOwnStructure(
        model,
        table
        ) {
    if (isGeneratedTable( model, table.id )) {
        throw new SqlError(
                `La tabla «${table.name}» se genera desde el diagrama entidad-relación: cambia su estructura en la vista Diagrama.`
                );
        }
    }

function findColumn(
        table,
        name
        ) {
    const field = table.columns.find( item => item.name.toLowerCase() === String( name ).toLowerCase() );

    if (!field) {
        throw new SqlError( `La tabla «${table.name}» no tiene el campo «${name}».` );
        }

    return field;
    }

/** Runs a change on a copy of the document; the model's validation turns its errors into SQL errors. */
function change(
        model,
        operation
        ) {
    try {
        return changeDocument( model, operation );
        }
    catch (error) {
        throw error instanceof SqlError ? error : new SqlError( error.message );
        }
    }

/** A free spot to the right of the drawing, for a table or query created from the console. */
function freePosition( model ) {
    const right = model.tables.reduce( (edge, table) => Math.max( edge, table.x + 320 ), 120 );

    return {x: Math.min( right, 19000 ), y: 140};
    }

function checkExpression(
        text,
        where
        ) {
    try {
        parseExpression( text );
        }
    catch (error) {
        throw new SqlError( `${where}: ${error.message}` );
        }
    }

/* ---------- fields and constraints ---------- */

/** A field of the model from a definition: name, type, NOT NULL, DEFAULT and CHECK. */
function fieldFromDefinition( definition ) {
    const field = column( definition.name, definition.dataType, definition.primary );

    field.required = definition.primary || definition.notNull;

    if (definition.defaultText) {
        checkExpression( definition.defaultText, `DEFAULT de ${definition.name}` );
        field.defaultValue = definition.defaultText;
        }

    if (definition.check) {
        field.domain = {minimum: null, maximum: null, values: [], check: definition.check.text};
        }

    return field;
    }

/** UNIQUE: an alternate key when every field is NOT NULL, otherwise a unique index. */
function addUnique(
        table,
        fields,
        name
        ) {
    const required = fields.every( field => field.required || field.primary );
    const label = name || `${required ? 'AK' : 'UX'}_${table.name}_${fields.map( field => field.name ).join( '_' )}`;

    if (required) {
        table.alternateKeys ||= [];
        table.alternateKeys.push( {id: newId(), name: label, columns: fields.map( field => field.id )} );
        }
    else {
        table.indexes.push( {id: newId(), name: label, columns: fields.map( field => field.id ), unique: true} );
        }
    }

/** FOREIGN KEY (fields) REFERENCES Table (key): the referenced fields must be its whole primary key. */
function addForeignKey(
        model,
        table,
        fields,
        reference,
        name
        ) {
    const parent = requireEntity( model, reference.table );
    const parentKey = parent.columns.filter( field => field.primary );
    const referenced = reference.columns
        ? reference.columns.map( fieldName => findColumn( parent, fieldName ) )
        : parentKey;

    if (!parentKey.length) {
        throw new SqlError( `«${parent.name}» no tiene clave principal: una clave ajena necesita una.` );
        }

    if (referenced.length !== parentKey.length || referenced.some( field => !field.primary )) {
        throw new SqlError(
                `La clave ajena debe referenciar la clave principal completa de «${parent.name}» (${parentKey.map( field => field.name ).join( ', ' )}).`
                );
        }

    if (fields.length !== referenced.length) {
        throw new SqlError( `La clave ajena tiene ${fields.length} campos y la clave de «${parent.name}» tiene ${referenced.length}.` );
        }

    fields.forEach( (field, index) => {
        if (!sameType( field.type, referenced[index].type )) {
            throw new SqlError(
                    `${table.name}.${field.name} (${field.type}) no tiene el mismo tipo que ${parent.name}.${referenced[index].name} (${referenced[index].type}).`
                    );
            }
        } );

    model.relationships.push( {
        id: newId(),
        parentId: parent.id,
        childId: table.id,
        name: name || `FK_${table.name}_${parent.name}`,
        forward: 'tiene',
        inverse: 'pertenece a',
        cardinality: 'zero-many',
        identifying: fields.every( field => field.primary ),
        optional: !fields.every( field => field.required || field.primary ),
        onDelete: reference.onDelete,
        onUpdate: reference.onUpdate,
        mappings: fields.map( (field, index) => ({parentColumnId: referenced[index].id, childColumnId: field.id}) )
        } );
    }

/** A table-level CHECK is kept in the domain of the first field it names. */
function addTableCheck(
        table,
        check
        ) {
    const names = [...check.text.matchAll( /\[([^\]]+)\]|[\p{L}_][\p{L}\p{N}_]*/gu )].map( match => match[1] || match[0] );
    const field = names
        .map( name => table.columns.find( item => item.name.toLowerCase() === name.toLowerCase() ) )
        .find( Boolean );

    if (!field) {
        throw new SqlError( `CHECK (${check.text}) no nombra ningún campo de «${table.name}».` );
        }

    const previous = field.domain?.check?.trim();

    field.domain = {
        minimum: field.domain?.minimum ?? null,
        maximum: field.domain?.maximum ?? null,
        values: field.domain?.values ?? [],
        check: previous ? `(${previous}) AND (${check.text})` : check.text
        };

    return field;
    }

function applyConstraint(
        model,
        table,
        constraint
        ) {
    const fields = (constraint.columns || []).map( name => findColumn( table, name ) );

    switch (constraint.kind) {
        case 'primary':
            if (table.columns.some( field => field.primary ) && model.relationships.some( relation => relation.parentId === table.id )) {
                throw new SqlError( `«${table.name}» ya tiene una clave principal referenciada por otras tablas.` );
                }

            table.columns.forEach( field => { field.primary = fields.includes( field ); } );
            fields.forEach( field => { field.required = true; } );
            return null;
        case 'unique':
            addUnique( table, fields, constraint.name );
            return null;
        case 'foreign':
            addForeignKey( model, table, fields, constraint.references, constraint.name );
            return null;
        default:
            return addTableCheck( table, constraint.check );
        }
    }

function applyColumnConstraints(
        model,
        table,
        definition,
        field
        ) {
    if (definition.unique && !definition.primary) {
        addUnique( table, [field], null );
        }

    if (definition.references) {
        addForeignKey( model, table, [field], definition.references, null );
        }
    }

/* ---------- statements ---------- */

function createTable(
        model,
        statement
        ) {
    if (findTable( model, statement.name )) {
        throw new SqlError( `Ya existe una tabla o consulta «${statement.name}».` );
        }

    const position = freePosition( model );
    const next = change( model, document => {
        const table = {
            id: newId(),
            name: statement.name,
            conceptualName: statement.name,
            syncNames: true,
            namespace: '',
            kind: 'entity',
            x: position.x,
            y: position.y,
            columns: [],
            notes: '',
            definition: '',
            indexes: [],
            alternateKeys: []
            };

        document.tables.push( table );
        statement.columns.forEach( definition => table.columns.push( fieldFromDefinition( definition ) ) );
        statement.columns.forEach( (definition, index) => applyColumnConstraints( document, table, definition, table.columns[index] ) );
        statement.constraints.forEach( constraint => applyConstraint( document, table, constraint ) );
        } );

    return {model: next, message: `Tabla ${statement.name} creada con ${statement.columns.length} campos.`};
    }

function addColumnToTable(
        model,
        table,
        definition
        ) {
    const rows = documentData( model )[table.id] || [];

    if (table.columns.some( field => field.name.toLowerCase() === definition.name.toLowerCase() )) {
        throw new SqlError( `«${table.name}» ya tiene un campo «${definition.name}».` );
        }

    if (rows.length && (definition.notNull || definition.primary) && !definition.defaultText) {
        throw new SqlError(
                `«${table.name}» tiene ${rows.length} registros: un campo NOT NULL nuevo necesita DEFAULT para rellenarlos.`
                );
        }

    return change( model, document => {
        const target = document.tables.find( item => item.id === table.id );
        const field = fieldFromDefinition( definition );

        target.columns.push( field );
        applyColumnConstraints( document, target, definition, field );

        if (definition.defaultText && document.data?.[table.id]) {
            const value = defaultCell( openDatabase( model ), field );

            document.data[table.id].forEach( row => { row[field.id] = value; } );
            }
        } );
    }

function alterColumn(
        model,
        table,
        definition
        ) {
    const field = findColumn( table, definition.name );
    const rows = documentData( model )[table.id] || [];
    const replacement = {...fieldFromDefinition( definition ), id: field.id, primary: field.primary, notes: field.notes};

    replacement.required = replacement.required || field.primary;

    rows.forEach( (row, index) => {
        const problem = cellProblem( replacement, row[field.id] ?? '' );

        if (problem) {
            throw new SqlError( `${table.name}, registro ${index + 1}: con el nuevo tipo, ${field.name} ${problem}` );
            }
        } );

    return change( model, document => {
        const target = document.tables.find( item => item.id === table.id );

        target.columns = target.columns.map( item => item.id === field.id ? {...item, ...replacement} : item );
        } );
    }

/** DROP CONSTRAINT: a foreign key, an alternate key, an index, or PrimaryKey (the name Access gives it). */
function dropConstraint(
        model,
        table,
        name
        ) {
    const lower = name.toLowerCase();
    const relation = model.relationships.find( item => item.childId === table.id && item.name.toLowerCase() === lower );

    if (relation) {
        try {
            return removeElement( model, relation.id );
            }
        catch (error) {
            throw new SqlError( error.message );
            }
        }

    return change( model, document => {
        const target = document.tables.find( item => item.id === table.id );
        const keys = target.alternateKeys || [];
        const before = keys.length + target.indexes.length;

        if (lower === 'primarykey') {
            if (document.relationships.some( item => item.parentId === table.id )) {
                throw new SqlError( `La clave principal de «${table.name}» está referenciada por otras tablas.` );
                }

            target.columns.forEach( field => { field.primary = false; } );
            return;
            }

        target.alternateKeys = keys.filter( key => key.name.toLowerCase() !== lower );
        target.indexes = target.indexes.filter( index => index.name.toLowerCase() !== lower );

        if (before === target.alternateKeys.length + target.indexes.length) {
            throw new SqlError( `«${table.name}» no tiene ninguna restricción llamada «${name}».` );
            }
        } );
    }

function alterTable(
        model,
        statement
        ) {
    const table = requireEntity( model, statement.table );
    const action = statement.action;

    requireOwnStructure( model, table );

    switch (action.kind) {
        case 'add-column':
            return {model: addColumnToTable( model, table, action.column ), message: `Campo ${action.column.name} agregado a ${table.name}.`};
        case 'drop-column': {
            const field = findColumn( table, action.name );

            if (field.primary) {
                throw new SqlError( `${field.name} forma parte de la clave principal de «${table.name}»: cambia antes la clave.` );
                }

            try {
                return {model: removeColumn( model, table.id, field.id ), message: `Campo ${field.name} eliminado de ${table.name}.`};
                }
            catch (error) {
                throw new SqlError( error.message );
                }
            }
        case 'alter-column':
            return {model: alterColumn( model, table, action.column ), message: `Campo ${action.column.name} de ${table.name} modificado.`};
        case 'add-constraint': {
            let moved = null;
            const next = change( model, document => {
                moved = applyConstraint( document, document.tables.find( item => item.id === table.id ), action.constraint );
                } );

            return {
                model: next,
                message: `Restricción agregada a ${table.name}${moved ? `; la regla CHECK se guarda en el dominio de ${moved.name}` : ''}.`
                };
            }
        default:
            return {model: dropConstraint( model, table, action.name ), message: `Restricción ${action.name} eliminada de ${table.name}.`};
        }
    }

function dropTable(
        model,
        statement
        ) {
    const table = requireEntity( model, statement.name );
    const referencing = model.relationships.filter( item => item.parentId === table.id && item.childId !== table.id );

    requireOwnStructure( model, table );

    if (referencing.length) {
        const names = referencing.map( relation => model.tables.find( item => item.id === relation.childId )?.name );

        throw new SqlError(
                `No se puede eliminar «${table.name}»: la referencian ${names.join( ', ' )}. Elimina antes esas relaciones (ALTER TABLE … DROP CONSTRAINT).`
                );
        }

    try {
        return {model: removeElement( model, table.id ), message: `Tabla ${table.name} eliminada.`};
        }
    catch (error) {
        throw new SqlError( error.message );
        }
    }

function createIndex(
        model,
        statement
        ) {
    const table = requireEntity( model, statement.table );
    const fields = statement.columns.map( name => findColumn( table, name ) );
    const next = change( model, document => {
        document.tables.find( item => item.id === table.id ).indexes.push(
                {id: newId(), name: statement.name, columns: fields.map( field => field.id ), unique: statement.unique}
                );
        } );

    return {model: next, message: `Índice ${statement.name} creado en ${table.name}.`};
    }

function dropIndex(
        model,
        statement
        ) {
    const table = requireEntity( model, statement.table );

    if (!table.indexes.some( index => index.name.toLowerCase() === statement.name.toLowerCase() )) {
        throw new SqlError( `«${table.name}» no tiene el índice «${statement.name}».` );
        }

    const next = change( model, document => {
        const target = document.tables.find( item => item.id === table.id );

        target.indexes = target.indexes.filter( index => index.name.toLowerCase() !== statement.name.toLowerCase() );
        } );

    return {model: next, message: `Índice ${statement.name} eliminado de ${table.name}.`};
    }

/** CREATE VIEW keeps a SELECT as a saved query (an Access query); it must run before it is saved. */
export function createView(
        model,
        name,
        query
        ) {
    const existing = findTable( model, name );

    if (existing && existing.kind !== 'view') {
        throw new SqlError( `Ya existe una tabla «${existing.name}»; elige otro nombre para la consulta.` );
        }

    executeQuery( openDatabase( model ), query );

    const position = freePosition( model );
    const next = change( model, document => {
        const view = existing && document.tables.find( item => item.id === existing.id );

        if (view) {
            view.definition = query.text;
            return;
            }

        document.tables.push( {
            id: newId(),
            name,
            conceptualName: name,
            syncNames: true,
            namespace: '',
            kind: 'view',
            x: position.x,
            y: position.y,
            columns: [],
            notes: '',
            definition: query.text,
            indexes: [],
            alternateKeys: []
            } );
        } );

    return {model: next, message: `Consulta ${name} ${existing ? 'actualizada' : 'guardada'}.`};
    }

function dropView(
        model,
        statement
        ) {
    const view = findTable( model, statement.name );

    if (!view || view.kind !== 'view') {
        throw new SqlError( `No se encuentra la consulta «${statement.name}».` );
        }

    return {model: removeElement( model, view.id ), message: `Consulta ${view.name} eliminada.`};
    }

/** Runs one schema statement; returns the new document and what happened. */
export function executeSchemaStatement(
        model,
        statement
        ) {
    switch (statement.type) {
        case 'create-table':
            return createTable( model, statement );
        case 'alter-table':
            return alterTable( model, statement );
        case 'drop-table':
            return dropTable( model, statement );
        case 'create-index':
            return createIndex( model, statement );
        case 'drop-index':
            return dropIndex( model, statement );
        case 'create-view':
            return createView( model, statement.name, statement.query );
        default:
            return dropView( model, statement );
        }
    }
