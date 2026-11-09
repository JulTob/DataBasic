import { documentData } from '../domain/model.js';
import { SqlError } from './lexer.js';
import { parseQuery } from './parser.js';
import {
    AGGREGATES,
    containsAggregate,
    evaluate,
    expressionChildren,
    expressionText
    } from './expressions.js';
import {
    groupKey,
    sortCompare,
    truth,
    valueFromCell,
    valueKind
    } from './values.js';

/*
 * A SELECT is answered with the operations of relational algebra, in the
 * order SQL defines:
 *   FROM      the relations, combined with × (product) or ⋈ (join);
 *   WHERE     σ, the rows that meet the condition;
 *   GROUP BY  γ, one row per group, with its aggregates;
 *   HAVING    σ over the groups;
 *   SELECT    π, the fields and expressions asked for;
 *   DISTINCT  δ, without repeated rows;
 *   ORDER BY  τ, sorted; TOP keeps the first ones (and their ties, as Access does).
 * A relation is {columns: [{name, table}], rows: [[value…]], plan}; the plan
 * records the operations so the console can show the query in algebra.
 */

/* ---------- the database: tables and saved queries of the document ---------- */

/** The tables (with their sample rows as typed values) and the views of a document, read once. */
export function openDatabase( model ) {
    const data = documentData( model );
    const cache = new Map();
    const byName = name => model.tables.find( table => table.name.toLowerCase() === String( name ).toLowerCase() );

    const database = {
        model,
        hasRelation( name ) {
            return Boolean( byName( name ) );
            },
        relation(
                name,
                stack = []
                ) {
            const table = byName( name );

            if (!table) {
                throw new SqlError( `No se encuentra la tabla o consulta de entrada «${name}».` );
                }

            if (cache.has( table.id )) {
                return cache.get( table.id );
                }

            const relation = table.kind === 'view'
                ? viewRelation( database, table, stack )
                : {
                    columns: table.columns.map( column => ({name: column.name, table: table.name}) ),
                    rows: (data[table.id] || []).map(
                            row => table.columns.map( column => valueFromCell( row[column.id], column.type ) )
                            ),
                    plan: {op: 'relation', name: table.name}
                    };

            cache.set( table.id, relation );
            return relation;
            }
        };

    return database;
    }

function viewRelation(
        database,
        view,
        stack
        ) {
    if (stack.includes( view.id )) {
        throw new SqlError( `La consulta «${view.name}» se usa a sí misma: no puede ejecutarse.` );
        }

    if (!view.definition.trim()) {
        throw new SqlError( `La consulta «${view.name}» todavía no tiene SQL.` );
        }

    let query;

    try {
        query = parseQuery( view.definition );
        }
    catch (error) {
        throw new SqlError( `La consulta guardada «${view.name}» tiene un error: ${error.message}` );
        }

    let result;

    try {
        result = executeQuery( database, query, null, [...stack, view.id] );
        }
    catch (error) {
        throw stack.length ? error : new SqlError( `La consulta guardada «${view.name}» no se puede ejecutar: ${error.message}` );
        }

    return {
        columns: result.columns.map( column => ({name: column.name, table: view.name}) ),
        rows: result.rows,
        plan: {op: 'relation', name: view.name}
        };
    }

/* ---------- scopes: what a name means in one row ---------- */

function sameName(
        left,
        right
        ) {
    return String( left ).toLowerCase() === String( right ).toLowerCase();
    }

/**
 * The scope of one row: its columns and values, the scope around it (for
 * correlated subqueries), and, inside GROUP BY, the rows of its group.
 */
function rowScope(
        context,
        columns,
        values,
        outer = null,
        groupRows = null
        ) {
    const scope = {
        groupRows,
        lookup( reference ) {
            const matches = [];

            columns.forEach( (column, index) => {
                if (sameName( column.name, reference.name ) && (!reference.table || sameName( column.table, reference.table ))) {
                    matches.push( index );
                    }
                } );

            if (matches.length === 1) {
                return values[matches[0]];
                }

            if (matches.length > 1) {
                throw new SqlError(
                        `El campo «${reference.name}» puede referirse a más de una tabla de FROM; escribe Tabla.${reference.name}.`,
                        reference.start
                        );
                }

            if (outer) {
                return outer.lookup( reference );
                }

            const known = reference.table && !columns.some( column => sameName( column.table, reference.table ) );

            throw new SqlError(
                    known
                        ? `No se encuentra la tabla «${reference.table}» en FROM para «${reference.table}.${reference.name}».`
                        : `No se encuentra el campo «${reference.table ? `${reference.table}.` : ''}${reference.name}». Access lo pediría como parámetro.`,
                    reference.start
                    );
            },
        subquery( query ) {
            return executeQuery( context.database, query, scope, context.stack );
            }
        };

    return scope;
    }

/** The scope of one row of a relation, for statements that work row by row (UPDATE, DELETE, CHECK). */
export function rowScopeFor(
        database,
        columns,
        values
        ) {
    return rowScope( {database, stack: []}, columns, values );
    }

/* ---------- FROM: relations, products and joins ---------- */

function renamed(
        relation,
        alias
        ) {
    return {
        columns: relation.columns.map( column => ({name: column.name, table: alias}) ),
        rows: relation.rows,
        plan: {op: 'rename', alias, input: relation.plan}
        };
    }

function product(
        left,
        right
        ) {
    const rows = [];

    for (const leftRow of left.rows) {
        for (const rightRow of right.rows) {
            rows.push( [...leftRow, ...rightRow] );
            }
        }

    return {columns: [...left.columns, ...right.columns], rows, plan: {op: 'product', inputs: [left.plan, right.plan]}};
    }

/** INNER, LEFT or RIGHT JOIN: the pairs that meet ON; an outer join keeps its side's rows without a partner. */
function join(
        context,
        left,
        right,
        kind,
        condition,
        outer
        ) {
    const columns = [...left.columns, ...right.columns];
    const rows = [];
    const matchedRight = new Set();
    const empty = relation => relation.columns.map( () => null );

    left.rows.forEach( leftRow => {
        let matched = false;

        right.rows.forEach( (rightRow, rightIndex) => {
            const values = [...leftRow, ...rightRow];

            if (truth( evaluate( condition, rowScope( context, columns, values, outer ) ) ) === true) {
                rows.push( values );
                matched = true;
                matchedRight.add( rightIndex );
                }
            } );

        if (!matched && kind === 'left') {
            rows.push( [...leftRow, ...empty( right )] );
            }
        } );

    if (kind === 'right') {
        right.rows.forEach( (rightRow, rightIndex) => {
            if (!matchedRight.has( rightIndex )) {
                rows.push( [...empty( left ), ...rightRow] );
                }
            } );
        }

    return {
        columns,
        rows,
        plan: {op: 'join', kind, condition: expressionText( condition ), inputs: [left.plan, right.plan]}
        };
    }

function fromItem(
        context,
        item,
        outer
        ) {
    switch (item.type) {
        case 'table': {
            const relation = context.database.relation( item.name, context.stack );

            return item.alias ? renamed( relation, item.alias ) : relation;
            }
        case 'derived':
            return renamed( executeQuery( context.database, item.query, outer, context.stack ), item.alias );
        default:
            return join(
                    context,
                    fromItem( context, item.left, outer ),
                    fromItem( context, item.right, outer ),
                    item.join,
                    item.on,
                    outer
                    );
        }
    }

function fromRelation(
        context,
        items,
        outer
        ) {
    if (!items.length) {
        return {columns: [], rows: [[]], plan: {op: 'one-row'}};
        }

    return items.map( item => fromItem( context, item, outer ) ).reduce( product );
    }

/* ---------- GROUP BY ---------- */

function sameExpression(
        left,
        right
        ) {
    return expressionText( left ).toLowerCase() === expressionText( right ).toLowerCase();
    }

/** Outside aggregates, a grouped query may only use the GROUP BY expressions. */
function requireGrouped(
        expr,
        groupBy
        ) {
    if (groupBy.some( key => sameExpression( key, expr ) )) {
        return;
        }

    if (expr.type === 'call' && AGGREGATES.has( expr.name )) {
        return;
        }

    if (expr.type === 'column') {
        throw new SqlError(
                `Ha intentado ejecutar una consulta que no incluye la expresión «${expressionText( expr )}» como parte de una función de agregado ni en GROUP BY.`,
                expr.start
                );
        }

    if (['subquery', 'exists'].includes( expr.type )) {
        return;
        }

    expressionChildren( expr ).forEach( child => requireGrouped( child, groupBy ) );
    }

function collectAggregates(
        expr,
        found
        ) {
    if (expr.type === 'call' && AGGREGATES.has( expr.name )) {
        found.add( expressionText( expr ) );
        return found;
        }

    expressionChildren( expr ).forEach( child => collectAggregates( child, found ) );
    return found;
    }

/** The groups as scopes: each answers names from its first row and aggregates over all its rows. */
function groupScopes(
        context,
        source,
        rowScopes,
        groupBy,
        outer
        ) {
    const groups = new Map();

    rowScopes.forEach( scope => {
        const key = groupBy.map( expr => groupKey( evaluate( expr, scope ) ) ).join( '\u0001' );

        if (!groups.has( key )) {
            groups.set( key, [] );
            }

        groups.get( key ).push( scope );
        } );

    if (!groupBy.length && !groups.size) {
        groups.set( '', [] );
        }

    return [...groups.values()].map( rows => {
        const first = rows[0];
        const scope = rowScope( context, source.columns, first ? first.values : source.columns.map( () => null ), outer, rows );

        return scope;
        } );
    }

/* ---------- SELECT list ---------- */

/** Access names: the alias, the field's name, or Expr1000, Expr1001… for the rest. */
function outputColumns(
        items,
        source
        ) {
    const columns = [];
    let expressionNumber = 1000;

    for (const item of items) {
        if (item.type === 'all') {
            source.columns.forEach( (column, index) => {
                if (!item.table || sameName( column.table, item.table )) {
                    columns.push( {name: column.name, table: column.table, sourceIndex: index} );
                    }
                } );

            if (item.table && !source.columns.some( column => sameName( column.table, item.table ) )) {
                throw new SqlError( `No se encuentra la tabla «${item.table}» en FROM para ${item.table}.*.`, item.start );
                }

            continue;
            }

        const name = item.alias
            || (item.expr.type === 'column' ? item.expr.name : `Expr${expressionNumber++}`);

        columns.push( {name, table: item.expr.type === 'column' ? item.expr.table : null, expr: item.expr, alias: item.alias} );
        }

    return columns;
    }

/** When two output fields share a name, Access shows them as Tabla.campo. */
function displayNames(
        columns,
        source
        ) {
    return columns.map( column => {
        const twins = columns.filter( other => sameName( other.name, column.name ) ).length;
        const table = column.table ?? (column.sourceIndex === undefined ? null : source.columns[column.sourceIndex].table);

        return twins > 1 && table && !column.alias ? `${table}.${column.name}` : column.name;
        } );
    }

function projectRow(
        columns,
        scope
        ) {
    return columns.map( column => column.sourceIndex === undefined
        ? evaluate( column.expr, scope )
        : scope.values[column.sourceIndex] );
    }

/* ---------- ORDER BY, DISTINCT and TOP ---------- */

/** A key of ORDER BY: a position (1, 2…), a name of the result, or an expression of the source rows. */
function orderKeyReader(
        key,
        names,
        canUseSource
        ) {
    if (key.expr.type === 'number') {
        const position = key.expr.value;

        if (!Number.isInteger( position ) || position < 1 || position > names.length) {
            throw new SqlError( `ORDER BY ${position}: la consulta solo tiene ${names.length} campos.`, key.expr.start );
            }

        return entry => entry.values[position - 1];
        }

    if (key.expr.type === 'column') {
        const index = names.findIndex(
                name => sameName( name, key.expr.table ? `${key.expr.table}.${key.expr.name}` : key.expr.name )
                    || !key.expr.table && sameName( name, key.expr.name )
                );

        if (index >= 0) {
            return entry => entry.values[index];
            }
        }

    if (!canUseSource) {
        throw new SqlError(
                `ORDER BY «${expressionText( key.expr )}» debe ser un campo del resultado en una consulta con DISTINCT o UNION.`,
                key.expr.start
                );
        }

    return entry => evaluate( key.expr, entry.scope );
    }

function sortEntries(
        entries,
        orderBy,
        names,
        canUseSource
        ) {
    if (!orderBy.length) {
        return entries;
        }

    const readers = orderBy.map( key => ({read: orderKeyReader( key, names, canUseSource ), descending: key.descending}) );
    const decorated = entries.map( (entry, index) => ({entry, index, keys: readers.map( reader => reader.read( entry ) )}) );

    decorated.sort( (left, right) => {
        for (let position = 0; position < readers.length; position += 1) {
            const order = sortCompare( left.keys[position], right.keys[position] );

            if (order) {
                return readers[position].descending ? -order : order;
                }
            }

        return left.index - right.index;
        } );

    return decorated.map( item => ({...item.entry, keys: item.keys}) );
    }

function distinctEntries( entries ) {
    const seen = new Set();

    return entries.filter( entry => {
        const key = entry.values.map( groupKey ).join( '\u0001' );

        if (seen.has( key )) {
            return false;
            }

        seen.add( key );
        return true;
        } );
    }

/** TOP n [PERCENT]; with ORDER BY, rows tied with the last one stay, as Access returns them. */
function topEntries(
        entries,
        top,
        ordered
        ) {
    if (!top) {
        return entries;
        }

    const count = top.percent ? Math.ceil( entries.length * top.count / 100 ) : top.count;

    if (count >= entries.length || !count) {
        return count ? entries : [];
        }

    let end = count;

    if (ordered) {
        const sameKeys = (left, right) => left.keys.every( (value, index) => sortCompare( value, right.keys[index] ) === 0 );

        while (end < entries.length && sameKeys( entries[end], entries[count - 1] )) {
            end += 1;
            }
        }

    return entries.slice( 0, end );
    }

/* ---------- SELECT and UNION ---------- */

function executeSelect(
        context,
        select,
        outer
        ) {
    const source = fromRelation( context, select.from, outer );
    let plan = source.plan;
    let scopes = source.rows.map( values => Object.assign( rowScope( context, source.columns, values, outer ), {values} ) );

    if (select.where) {
        if (containsAggregate( select.where )) {
            throw new SqlError( 'No se puede usar una función de agregado en WHERE: usa HAVING.', select.where.start );
            }

        scopes = scopes.filter( scope => truth( evaluate( select.where, scope ) ) === true );
        plan = {op: 'select', condition: expressionText( select.where ), input: plan};
        }

    const grouped = select.groupBy.length > 0
        || select.items.some( item => item.type === 'item' && containsAggregate( item.expr ) )
        || Boolean( select.having && containsAggregate( select.having ) )
        || select.orderBy.some( key => containsAggregate( key.expr ) );

    if (grouped) {
        for (const item of select.items) {
            if (item.type === 'all') {
                throw new SqlError( 'Una consulta de totales no puede usar *: escribe los campos de GROUP BY y los agregados.', item.start );
                }

            requireGrouped( item.expr, select.groupBy );
            }

        if (select.having) {
            requireGrouped( select.having, select.groupBy );
            }

        const aggregates = new Set();

        [...select.items.map( item => item.expr ), select.having, ...select.orderBy.map( key => key.expr )]
            .filter( Boolean )
            .forEach( expr => collectAggregates( expr, aggregates ) );

        scopes = groupScopes( context, source, scopes, select.groupBy, outer )
            .map( scope => Object.assign( scope, {values: scope.groupRows[0]?.values ?? source.columns.map( () => null )} ) );
        plan = {op: 'group', keys: select.groupBy.map( expressionText ), aggregates: [...aggregates], input: plan};

        if (select.having) {
            scopes = scopes.filter( scope => truth( evaluate( select.having, scope ) ) === true );
            plan = {op: 'select', condition: expressionText( select.having ), input: plan};
            }
        }
    else if (select.having) {
        throw new SqlError( 'HAVING necesita GROUP BY o una función de agregado.', select.having.start );
        }

    const columns = outputColumns( select.items, source );
    const names = displayNames( columns, source );
    let entries = scopes.map( scope => ({values: projectRow( columns, scope ), scope}) );

    plan = {
        op: 'project',
        items: columns.map( (column, index) => column.expr
            ? `${expressionText( column.expr )}${column.alias ? ` → ${column.alias}` : ''}`
            : names[index] ),
        all: select.items.length === 1 && select.items[0].type === 'all' && !select.items[0].table,
        input: plan
        };

    if (select.distinct) {
        entries = distinctEntries( entries );
        plan = {op: 'distinct', input: plan};
        }

    entries = sortEntries( entries, select.orderBy, names, !select.distinct );

    if (select.orderBy.length) {
        plan = {op: 'sort', keys: select.orderBy.map( key => `${expressionText( key.expr )}${key.descending ? ' DESC' : ''}` ), input: plan};
        }

    entries = topEntries( entries, select.top, select.orderBy.length > 0 );

    if (select.top) {
        plan = {op: 'top', count: select.top.count, percent: select.top.percent, input: plan};
        }

    return {
        columns: names.map( name => ({name}) ),
        rows: entries.map( entry => entry.values ),
        plan
        };
    }

function executeUnion(
        context,
        union,
        outer
        ) {
    const left = executeBranch( context, union.left, outer );
    const right = executeBranch( context, union.right, outer );

    if (left.columns.length !== right.columns.length) {
        throw new SqlError(
                `El número de campos de las consultas de la UNION no coincide (${left.columns.length} y ${right.columns.length}).`,
                union.start
                );
        }

    let entries = [...left.rows, ...right.rows].map( values => ({values, scope: null}) );

    if (!union.all) {
        entries = distinctEntries( entries );
        }

    return {
        columns: left.columns,
        rows: entries.map( entry => entry.values ),
        plan: {op: 'union', all: union.all, inputs: [left.plan, right.plan]}
        };
    }

function executeBranch(
        context,
        query,
        outer
        ) {
    return query.type === 'union' ? executeUnion( context, query, outer ) : executeSelect( context, query, outer );
    }

/**
 * Runs a query (SELECT or UNION) against the database. `outer` is the scope
 * of the row that asks, for correlated subqueries; `stack` lists the views
 * being expanded, so a view that uses itself is reported instead of looping.
 */
export function executeQuery(
        database,
        query,
        outer = null,
        stack = []
        ) {
    const context = {database, stack};

    if (query.type === 'select') {
        return executeSelect( context, query, outer );
        }

    const union = executeUnion( context, query, outer );

    if (!query.orderBy.length) {
        return union;
        }

    const names = union.columns.map( column => column.name );
    const entries = sortEntries( union.rows.map( values => ({values, scope: null}) ), query.orderBy, names, false );

    return {
        columns: union.columns,
        rows: entries.map( entry => entry.values ),
        plan: {op: 'sort', keys: query.orderBy.map( key => `${expressionText( key.expr )}${key.descending ? ' DESC' : ''}` ), input: union.plan}
        };
    }

/** The kind of each result column (number, date, text…), from its first value, so the datasheet aligns it. */
export function columnKinds( result ) {
    return result.columns.map(
            (column, index) => valueKind( result.rows.map( row => row[index] ).find( value => value !== null && value !== undefined ) ?? null )
            );
    }

/* ---------- the plan in relational algebra ---------- */

/**
 * The plan in the notation of the course, with subscripts written _{…}:
 * π_{nombre}(σ_{precio > 10}(Plato)), R ⋈_{R.id = S.id} S, γ_{…}, τ_{…}, δ, ∪, ρ.
 */
export function algebraText( plan ) {
    const inner = node => algebraText( node );

    switch (plan.op) {
        case 'relation':
            return plan.name;
        case 'one-row':
            return '{()}';
        case 'rename':
            return `ρ_{${plan.alias}}(${inner( plan.input )})`;
        case 'product':
            return `(${inner( plan.inputs[0] )} × ${inner( plan.inputs[1] )})`;
        case 'join': {
            const symbol = {inner: '⋈', left: '⟕', right: '⟖'}[plan.kind];

            return `(${inner( plan.inputs[0] )} ${symbol}_{${plan.condition}} ${inner( plan.inputs[1] )})`;
            }
        case 'select':
            return `σ_{${plan.condition}}(${inner( plan.input )})`;
        case 'group':
            return `γ_{${[...plan.keys, ...plan.aggregates].join( ', ' )}}(${inner( plan.input )})`;
        case 'project':
            return plan.all ? inner( plan.input ) : `π_{${plan.items.join( ', ' )}}(${inner( plan.input )})`;
        case 'distinct':
            return `δ(${inner( plan.input )})`;
        case 'sort':
            return `τ_{${plan.keys.join( ', ' )}}(${inner( plan.input )})`;
        case 'top':
            return `TOP_{${plan.count}${plan.percent ? ' %' : ''}}(${inner( plan.input )})`;
        case 'union':
            return `(${inner( plan.inputs[0] )} ${plan.all ? '∪ (ALL)' : '∪'} ${inner( plan.inputs[1] )})`;
        default:
            return '?';
        }
    }
