import { documentForms } from '../domain/forms.js';
import {
    ASSUMPTION_TEXT_LIMIT,
    changeDocument,
    documentAssumptions,
    documentElementIds,
    documentPhysical,
    elementLabel,
    emptyPhysical,
    newId,
    replaceDocumentData,
    tableRows
    } from '../domain/model.js';
import {
    domainCheckText,
    projectSQLSignature
    } from './project-sql.js';

/*
 * One document from the two files that describe a project:
 *   esquema.sql              rules on tables, keys, relationships, queries and rows;
 *   proyecto.databasic.json  keeps what SQL cannot say: the entity-relationship
 *                            diagram, positions, colors, notes, cardinalities,
 *                            the physical design and the forms.
 * Both are compared through what they say in SQL (their signatures):
 *   same structure, same rows   → the JSON's document as it is;
 *   same structure, other rows  → the JSON's document with the rows of the SQL;
 *   other structure             → the SQL's document, with what the JSON says
 *                                 about the same names; the entity-relationship
 *                                 diagram no longer describes those tables and
 *                                 is left out.
 * Every finding is a note: {level: 'ok'|'info'|'warning', text}.
 */

export const MERGE_OUTCOMES = ['same', 'rows', 'structure', 'json-only', 'sql-only'];

function note(
        level,
        text
        ) {
    return {level, text};
    }

function byName(
        items,
        name
        ) {
    const wanted = String( name ).toLowerCase();

    return items.find( item => item.name.toLowerCase() === wanted ) || null;
    }

/* ---------- the ids of one document in the other, by name ---------- */

/** Maps from the ids of `source` to the ids of `target` for tables, fields and relationships with the same names. */
function idsByName(
        target,
        source
        ) {
    const maps = {tables: new Map(), columns: new Map(), relationships: new Map()};

    for (const table of source.tables) {
        const match = byName( target.tables, table.name );

        if (!match || match.kind !== table.kind) {
            continue;
            }

        maps.tables.set( table.id, match.id );

        for (const field of table.columns) {
            const twin = byName( match.columns, field.name );

            if (twin) {
                maps.columns.set( field.id, twin.id );
                }
            }
        }

    for (const relation of source.relationships) {
        const match = byName( target.relationships, relation.name );

        if (match && maps.tables.get( relation.childId ) === match.childId) {
            maps.relationships.set( relation.id, match.id );
            }
        }

    return maps;
    }

/* ---------- same structure: the rows of the SQL ---------- */

function remappedRow(
        row,
        maps
        ) {
    const copy = {};

    for (const [columnId, cell] of Object.entries( row )) {
        if (maps.columns.has( columnId )) {
            copy[maps.columns.get( columnId )] = cell;
            }
        }

    return copy;
    }

/** `target` with the rows of `source`, table by table and field by field through their names. */
function withRowsOf(
        target,
        source
        ) {
    const maps = idsByName( target, source );
    const data = {};

    for (const [sourceId, targetId] of maps.tables) {
        const rows = tableRows( source, sourceId );

        if (rows.length) {
            data[targetId] = rows.map( row => remappedRow( row, maps ) );
            }
        }

    return replaceDocumentData( target, data );
    }

/* ---------- other structure: what the JSON says about the same names ---------- */

/** One carried part: the change is kept when the model accepts it, and a note says so when it does not. */
function attempt(
        model,
        notes,
        what,
        operation
        ) {
    try {
        return changeDocument( model, operation );
        }
    catch (error) {
        notes.push( note( 'warning', `No se pudo conservar ${what}: ${error.message}` ) );
        return model;
        }
    }

function carryDocument(
        next,
        source
        ) {
    next.name = source.name;
    next.display = {...structuredClone( source.display ), mode: source.display.mode === 'chen' ? 'relational' : source.display.mode};

    if (source.author) {
        next.author = structuredClone( source.author );
        }

    if (source.profile === 'general') {
        next.profile = 'general';
        }
    }

function carryTable(
        table,
        sourceTable
        ) {
    for (const key of ['x', 'y', 'notes', 'conceptualName', 'syncNames', 'namespace', 'color']) {
        if (key in sourceTable) {
            table[key] = structuredClone( sourceTable[key] );
            }
        }

    for (const field of table.columns) {
        const twin = byName( sourceTable.columns, field.name );

        if (!twin) {
            continue;
            }

        field.notes = twin.notes;

        // A domain written as minimum, maximum and values reads back as one CHECK: keep its parts when the text is the same.
        if (twin.domain && field.domain && domainCheckText( twin ) === field.domain.check) {
            field.domain = structuredClone( twin.domain );
            }
        }
    }

function carryRelationship(
        next,
        relation,
        sourceRelation,
        sourcePositions
        ) {
    for (const key of ['cardinality', 'forward', 'inverse', 'identifying', 'color']) {
        if (key in sourceRelation) {
            relation[key] = structuredClone( sourceRelation[key] );
            }
        }

    if (sourcePositions[sourceRelation.id]) {
        next.presentation.relational = {...next.presentation.relational, [relation.id]: {...sourcePositions[sourceRelation.id]}};
        }
    }

function carriedOverrides(
        overrides,
        map
        ) {
    const carried = {};

    for (const [id, values] of Object.entries( overrides || {} )) {
        if (map.has( id )) {
            carried[map.get( id )] = structuredClone( values );
            }
        }

    return carried;
    }

function carryPhysical(
        next,
        source,
        maps
        ) {
    const physical = documentPhysical( source );
    const relationships = carriedOverrides( physical.relationships, maps.relationships );

    for (const values of Object.values( relationships )) {
        if (values.displayColumnId && !maps.columns.has( values.displayColumnId )) {
            delete values.displayColumnId;
            }
        else if (values.displayColumnId) {
            values.displayColumnId = maps.columns.get( values.displayColumnId );
            }
        }

    next.physical = {
        ...emptyPhysical(),
        columns: carriedOverrides( physical.columns, maps.columns ),
        tables: carriedOverrides( physical.tables, maps.tables ),
        relationships
        };
    }

/** The forms whose source still exists, with the fields that still exist; the names of those left out. */
function carriedForms(
        target,
        source,
        maps
        ) {
    const kept = [];
    const dropped = [];

    for (const form of documentForms( source )) {
        const sourceId = maps.tables.get( form.sourceId );
        const table = target.tables.find( item => item.id === sourceId );
        const fields = !table ? []
            : table.kind === 'entity' ? form.fields.map( id => maps.columns.get( id ) ).filter( Boolean )
                : [...form.fields];

        if (fields.length) {
            kept.push( {...structuredClone( form ), sourceId, fields} );
            }
        else {
            dropped.push( form.name );
            }
        }

    return {kept, dropped};
    }

/** Places the tables the JSON does not place in a grid below the ones it does. */
function placeNewTables(
        model,
        placedIds
        ) {
    const placed = model.tables.filter( table => placedIds.has( table.id ) );
    const loose = model.tables.filter( table => !placedIds.has( table.id ) );

    if (!loose.length) {
        return model;
        }

    const top = placed.length ? Math.max( ...placed.map( table => table.y + 60 + 26 * table.columns.length ) ) + 80 : 80;
    const perRow = Math.ceil( Math.sqrt( loose.length ) );

    return changeDocument( model, next => {
        let y = top;

        for (let start = 0; start < loose.length; start += perRow) {
            const row = loose.slice( start, start + perRow );

            row.forEach( (table, index) => {
                const target = next.tables.find( item => item.id === table.id );

                target.x = 80 + index * 320;
                target.y = Math.min( y, 19000 );
                } );

            y += 100 + 26 * Math.max( ...row.map( table => table.columns.length ) );
            }
        } );
    }

/** The SQL's document with what the JSON says about the same names. */
function carryOver(
        target,
        source,
        notes
        ) {
    const maps = idsByName( target, source );
    const sourcePositions = source.presentation?.relational || {};
    let model = attempt( target, notes, 'el nombre, el autor y la presentación', next => carryDocument( next, source ) );

    for (const [sourceId, targetId] of maps.tables) {
        const sourceTable = source.tables.find( item => item.id === sourceId );

        model = attempt( model, notes, `la presentación de ${sourceTable.name}`, next => {
            carryTable( next.tables.find( item => item.id === targetId ), sourceTable );
            } );
        }

    for (const [sourceId, targetId] of maps.relationships) {
        const sourceRelation = source.relationships.find( item => item.id === sourceId );

        model = attempt( model, notes, `la relación ${sourceRelation.name}`, next => {
            carryRelationship( next, next.relationships.find( item => item.id === targetId ), sourceRelation, sourcePositions );
            } );
        }

    model = attempt( model, notes, 'el diseño físico', next => carryPhysical( next, source, maps ) );

    const forms = carriedForms( model, source, maps );

    if (forms.dropped.length) {
        notes.push( note( 'warning', `Formularios sin su tabla o sus campos, que se quitan: ${forms.dropped.join( ', ' )}.` ) );
        }

    if (forms.kept.length) {
        model = attempt( model, notes, 'los formularios', next => { next.forms = forms.kept; } );
        }

    return placeNewTables( model, new Set( maps.tables.values() ) );
    }

/* ---------- the merge ---------- */

function hasConceptualDiagram( model ) {
    const conceptual = model.conceptual || {};

    return Boolean( conceptual.entities?.length || conceptual.relationships?.length );
    }

/**
 * The document of the project from the JSON's document and the SQL's, either
 * of which may be missing (not both). Returns {model, outcome, notes}.
 */
export function mergeProject(
        fromJSON,
        fromSQL
        ) {
    if (!fromJSON && !fromSQL) {
        throw new Error( 'La carpeta no tiene esquema.sql ni proyecto.databasic.json: no hay proyecto que abrir.' );
        }

    if (!fromSQL) {
        return {model: fromJSON, outcome: 'json-only', notes: []};
        }

    if (!fromJSON) {
        return {model: placeNewTables( fromSQL, new Set() ), outcome: 'sql-only', notes: []};
        }

    const json = projectSQLSignature( fromJSON );
    const sql = projectSQLSignature( fromSQL );

    if (json.structure === sql.structure) {
        return json.rows === sql.rows
            ? {model: fromJSON, outcome: 'same', notes: []}
            : {model: withRowsOf( fromJSON, fromSQL ), outcome: 'rows', notes: []};
        }

    const notes = [];
    const model = carryOver( fromSQL, fromJSON, notes );

    if (hasConceptualDiagram( fromJSON )) {
        notes.push( note(
                'warning',
                'El diagrama entidad-relación de proyecto.databasic.json ya no describe estas tablas y se deja fuera: dibújalo de nuevo, o vuelve a la versión anterior de esquema.sql.'
                ) );
        }

    return {model, outcome: 'structure', notes};
    }

/* ---------- assumptions ---------- */

/** The entries of a document with the label of their element, as README.md writes them. */
export function labeledAssumptions( model ) {
    return documentAssumptions( model ).map(
            item => ({kind: item.kind, text: item.text, label: item.elementId ? elementLabel( model, item.elementId ) : null})
            );
    }

function conceptualIds( model ) {
    const conceptual = model.conceptual || {};
    const ids = new Set();

    for (const key of ['entities', 'attributes', 'relationships', 'generalizations']) {
        for (const item of conceptual[key] || []) {
            ids.add( item.id );
            (item.participations || []).forEach( part => ids.add( part.id ) );
            }
        }

    return ids;
    }

/**
 * Each label of the document and its element. «Entidad Sala» names both the
 * entity of the diagram and its table: the entity wins, as the assumptions
 * written in the Diagrama view refer to it. Two elements of the same layer
 * with one label lead to none.
 */
function labelIndex( model ) {
    const conceptual = conceptualIds( model );
    const found = new Map();

    for (const id of documentElementIds( model )) {
        const label = elementLabel( model, id );
        const layer = conceptual.has( id ) ? 'conceptual' : 'relational';
        const previous = found.get( label );

        if (!label) {
            continue;
            }

        if (!previous || previous.layer === 'relational' && layer === 'conceptual') {
            found.set( label, {id, layer} );
            }
        else if (previous.layer === layer) {
            found.set( label, {id: null, layer} );
            }
        }

    return new Map( [...found].map( ([label, entry]) => [label, entry.id] ) );
    }

function sameText(
        one,
        other
        ) {
    return one.replace( /\r\n/g, '\n' ).trim() === other.replace( /\r\n/g, '\n' ).trim();
    }

/**
 * The same entry in `previous` (same kind, text and label), not yet taken
 * by another entry: the new entry keeps its id, and its element when the
 * element still has that label.
 */
function twinEntry(
        previous,
        entry,
        taken
        ) {
    if (!previous) {
        return null;
        }

    return documentAssumptions( previous ).find(
            item => !taken.has( item.id ) && item.kind === entry.kind && sameText( item.text, entry.text )
                && (item.elementId ? elementLabel( previous, item.elementId ) : null) === (entry.label || null)
            ) || null;
    }

/** The element of an entry: the twin's when it keeps the label, else the only element with that label; undefined when none. */
function entryElement(
        model,
        index,
        entry,
        twin
        ) {
    if (!entry.label) {
        return null;
        }

    if (twin?.elementId && elementLabel( model, twin.elementId ) === entry.label) {
        return twin.elementId;
        }

    return index.get( entry.label ) || undefined;
    }

function entryKey( entry ) {
    return `${entry.kind}\u0000${entry.text.replace( /\r\n/g, '\n' ).trim()}\u0000${entry.label || ''}`;
    }

/** True when the entries say exactly what the document's assumptions say, in any order. */
function sameEntries(
        model,
        entries
        ) {
    const own = labeledAssumptions( model ).map( entryKey ).sort();
    const given = entries.map( entryKey ).sort();

    return own.length === given.length && own.every( (key, position) => key === given[position] );
    }

/**
 * The document with these entries [{kind, text, label}] as its assumptions.
 * Entries the document already has keep their ids. Returns {model,
 * unmatched}: the labels that name no element (those entries stay, about
 * the whole design).
 */
export function withAssumptions(
        model,
        entries,
        previous = null
        ) {
    if (sameEntries( model, entries )) {
        return {model, unmatched: []};
        }

    const index = labelIndex( model );
    const taken = new Set();
    const unmatched = [];
    const assumptions = entries.map( entry => {
        const twin = twinEntry( previous, entry, taken );
        const elementId = entryElement( model, index, entry, twin );

        if (twin) {
            taken.add( twin.id );
            }

        if (elementId === undefined) {
            unmatched.push( entry.label );
            }

        return {
            id: twin?.id || newId(),
            kind: entry.kind,
            text: entry.text.slice( 0, ASSUMPTION_TEXT_LIMIT ),
            elementId: elementId || null
            };
        } );

    return {
        model: changeDocument( model, next => { next.assumptions = assumptions; } ),
        unmatched
        };
    }
