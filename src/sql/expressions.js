import { SqlError } from './lexer.js';
import {
    SqlDate,
    and3,
    arithmetic,
    compareValues,
    concatenate,
    dateFromText,
    displayValue,
    likeMatches,
    not3,
    or3,
    today,
    truth
    } from './values.js';

/*
 * The value of an expression for one row. The scope answers the questions
 * an expression asks:
 *   scope.lookup(reference)   the value of a field (table.name or name);
 *   scope.groupRows           the rows of the group, inside GROUP BY;
 *   scope.subquery(query)     the result of a subquery seen from this row.
 * Functions follow Access: IIf, Nz, Len, Left, Year, DateAdd… Aggregates
 * (Count, Sum, Avg, Min, Max, First, Last) read the rows of the group.
 */

export const AGGREGATES = new Set( ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'FIRST', 'LAST'] );

/** True when the expression uses an aggregate outside any subquery. */
export function containsAggregate( expr ) {
    if (!expr || typeof expr !== 'object') {
        return false;
        }

    if (expr.type === 'call' && AGGREGATES.has( expr.name )) {
        return true;
        }

    if (['subquery', 'exists'].includes( expr.type ) || expr.type === 'in' && expr.query) {
        return expr.type === 'in' ? containsAggregate( expr.value ) : false;
        }

    return expressionChildren( expr ).some( containsAggregate );
    }

/** The sub-expressions of a node, outside subqueries. */
export function expressionChildren( expr ) {
    switch (expr.type) {
        case 'unary':
            return [expr.operand];
        case 'binary':
            return [expr.left, expr.right];
        case 'like':
            return [expr.value, expr.pattern];
        case 'between':
            return [expr.value, expr.low, expr.high];
        case 'in':
            return [expr.value, ...(expr.list || [])];
        case 'is-null':
            return [expr.value];
        case 'call':
            return expr.args;
        default:
            return [];
        }
    }

/* ---------- writing an expression back as text ---------- */

const TEXT_PRECEDENCE = {OR: 1, AND: 2, '=': 4, '<>': 4, '<': 4, '>': 4, '<=': 4, '>=': 4, '&': 5, '+': 6, '-': 6, MOD: 7, '\\': 8, '*': 9, '/': 9, '^': 10};

function nameText( name ) {
    return /^[\p{L}_][\p{L}\p{N}_]*$/u.test( name ) ? name : `[${name}]`;
    }

/** The expression in SQL, as the algebra and the messages show it. */
export function expressionText( expr ) {
    switch (expr.type) {
        case 'number':
            return String( expr.value );
        case 'string':
            return `'${expr.value.replaceAll( '\'', '\'\'' )}'`;
        case 'date':
            return `#${expr.value}#`;
        case 'boolean':
            return expr.value ? 'True' : 'False';
        case 'null':
            return 'Null';
        case 'column':
            return expr.table ? `${nameText( expr.table )}.${nameText( expr.name )}` : nameText( expr.name );
        case 'star':
            return expr.table ? `${nameText( expr.table )}.*` : '*';
        case 'unary':
            return expr.operator === 'NOT' ? `NOT ${expressionText( expr.operand )}` : `-${expressionText( expr.operand )}`;
        case 'binary': {
            const wrap = side => side.type === 'binary' && TEXT_PRECEDENCE[side.operator] < TEXT_PRECEDENCE[expr.operator]
                ? `(${expressionText( side )})`
                : expressionText( side );

            return `${wrap( expr.left )} ${expr.operator} ${wrap( expr.right )}`;
            }
        case 'like':
            return `${expressionText( expr.value )} ${expr.not ? 'NOT ' : ''}LIKE ${expressionText( expr.pattern )}`;
        case 'between':
            return `${expressionText( expr.value )} ${expr.not ? 'NOT ' : ''}BETWEEN ${expressionText( expr.low )} AND ${expressionText( expr.high )}`;
        case 'in':
            return `${expressionText( expr.value )} ${expr.not ? 'NOT ' : ''}IN (${expr.query ? expr.query.text : expr.list.map( expressionText ).join( ', ' )})`;
        case 'is-null':
            return `${expressionText( expr.value )} IS ${expr.not ? 'NOT ' : ''}NULL`;
        case 'exists':
            return `${expr.not ? 'NOT ' : ''}EXISTS (${expr.query.text})`;
        case 'subquery':
            return `(${expr.query.text})`;
        case 'call':
            return `${expr.name}(${expr.star ? '*' : expr.args.map( expressionText ).join( ', ' )})`;
        default:
            return '?';
        }
    }

/* ---------- evaluation ---------- */

function comparison(
        operator,
        left,
        right
        ) {
    const order = compareValues( left, right );

    if (order === null) {
        return null;
        }

    return {
        '=': order === 0,
        '<>': order !== 0,
        '<': order < 0,
        '>': order > 0,
        '<=': order <= 0,
        '>=': order >= 0
        }[operator];
    }

function evaluateBinary(
        expr,
        scope
        ) {
    if (expr.operator === 'AND') {
        const left = truth( evaluate( expr.left, scope ) );

        return left === false ? false : and3( left, truth( evaluate( expr.right, scope ) ) );
        }

    if (expr.operator === 'OR') {
        const left = truth( evaluate( expr.left, scope ) );

        return left === true ? true : or3( left, truth( evaluate( expr.right, scope ) ) );
        }

    const left = evaluate( expr.left, scope );
    const right = evaluate( expr.right, scope );

    if (['=', '<>', '<', '>', '<=', '>='].includes( expr.operator )) {
        return comparison( expr.operator, left, right );
        }

    return expr.operator === '&' ? concatenate( left, right ) : arithmetic( expr.operator, left, right );
    }

/** IN (list) or IN (subquery): unknown when nothing matches and a NULL is among the candidates. */
function evaluateIn(
        expr,
        scope
        ) {
    const value = evaluate( expr.value, scope );
    const candidates = expr.query
        ? singleColumn( scope.subquery( expr.query ), 'IN' )
        : expr.list.map( item => evaluate( item, scope ) );

    if (value === null) {
        return null;
        }

    let result = false;

    for (const candidate of candidates) {
        const equal = comparison( '=', value, candidate );

        if (equal === true) {
            result = true;
            break;
            }

        if (equal === null) {
            result = null;
            }
        }

    return expr.not ? not3( result ) : result;
    }

function singleColumn(
        relation,
        context
        ) {
    if (relation.columns.length !== 1) {
        throw new SqlError( `La subconsulta de ${context} debe devolver un solo campo y devuelve ${relation.columns.length}.` );
        }

    return relation.rows.map( row => row[0] );
    }

export function evaluate(
        expr,
        scope
        ) {
    switch (expr.type) {
        case 'number':
        case 'string':
        case 'boolean':
            return expr.value;
        case 'date':
            return dateFromText( expr.value );
        case 'null':
            return null;
        case 'column':
            return scope.lookup( expr );
        case 'star':
            throw new SqlError( 'El asterisco solo puede ir en la lista de SELECT o en Count(*).', expr.start );
        case 'unary': {
            const operand = evaluate( expr.operand, scope );

            return expr.operator === 'NOT' ? not3( truth( operand ) ) : arithmetic( '-', 0, operand );
            }
        case 'binary':
            return evaluateBinary( expr, scope );
        case 'like': {
            const result = likeMatches( evaluate( expr.value, scope ), evaluate( expr.pattern, scope ) );

            return expr.not ? not3( result ) : result;
            }
        case 'between': {
            const value = evaluate( expr.value, scope );
            const result = and3(
                    comparison( '>=', value, evaluate( expr.low, scope ) ),
                    comparison( '<=', value, evaluate( expr.high, scope ) )
                    );

            return expr.not ? not3( result ) : result;
            }
        case 'in':
            return evaluateIn( expr, scope );
        case 'is-null': {
            const result = evaluate( expr.value, scope ) === null;

            return expr.not ? !result : result;
            }
        case 'exists': {
            const result = scope.subquery( expr.query ).rows.length > 0;

            return expr.not ? !result : result;
            }
        case 'subquery': {
            const values = singleColumn( scope.subquery( expr.query ), 'la expresión' );

            if (values.length > 1) {
                throw new SqlError( 'Esta subconsulta puede devolver como mucho un registro, y devuelve varios.', expr.start );
                }

            return values.length ? values[0] : null;
            }
        case 'call':
            return AGGREGATES.has( expr.name ) ? evaluateAggregate( expr, scope ) : evaluateFunction( expr, scope );
        default:
            throw new SqlError( 'Expresión no reconocida.', expr.start );
        }
    }

/* ---------- aggregates ---------- */

function evaluateAggregate(
        expr,
        scope
        ) {
    if (!scope.groupRows) {
        throw new SqlError(
                `No se puede usar la función de agregado ${expr.name} aquí: va en SELECT, HAVING u ORDER BY de una consulta de totales.`,
                expr.start
                );
        }

    if (expr.distinct) {
        throw new SqlError(
                `Este dialecto no admite ${expr.name}(DISTINCT …): agrupa antes con una subconsulta SELECT DISTINCT.`,
                expr.start
                );
        }

    if (expr.star) {
        if (expr.name !== 'COUNT') {
            throw new SqlError( `Solo Count admite *; ${expr.name} necesita un campo.`, expr.start );
            }

        return scope.groupRows.length;
        }

    if (expr.args.length !== 1) {
        throw new SqlError( `${expr.name} necesita un argumento.`, expr.start );
        }

    if (containsAggregate( expr.args[0] )) {
        throw new SqlError( `No se puede poner una función de agregado dentro de ${expr.name}.`, expr.start );
        }

    const values = scope.groupRows.map( row => evaluate( expr.args[0], row ) );
    const present = values.filter( value => value !== null );

    switch (expr.name) {
        case 'COUNT':
            return present.length;
        case 'SUM':
            return present.length ? present.reduce( (sum, value) => arithmetic( '+', sum, value ), 0 ) : null;
        case 'AVG':
            return present.length
                ? arithmetic( '/', present.reduce( (sum, value) => arithmetic( '+', sum, value ), 0 ), present.length )
                : null;
        case 'MIN':
            return present.reduce( (best, value) => best === null || compareValues( value, best ) < 0 ? value : best, null );
        case 'MAX':
            return present.reduce( (best, value) => best === null || compareValues( value, best ) > 0 ? value : best, null );
        case 'FIRST':
            return values.length ? values[0] : null;
        default:
            return values.length ? values.at( -1 ) : null;
        }
    }

/* ---------- functions of Access ---------- */

/** Round half to even, as VBA's Round does: Round(2.5) = 2, Round(3.5) = 4. */
function bankersRound(
        value,
        digits = 0
        ) {
    const factor = 10 ** digits;
    const scaled = value * factor;
    const floor = Math.floor( scaled );
    const difference = scaled - floor;
    const rounded = Math.abs( difference - 0.5 ) < 1e-9 ? (floor % 2 === 0 ? floor : floor + 1) : Math.round( scaled );

    return rounded / factor;
    }

function textOf( value ) {
    return value === null ? null : value instanceof SqlDate ? value.iso : typeof value === 'number' ? String( value ) : String( value );
    }

function numberOf(
        value,
        name
        ) {
    if (value === null) {
        return null;
        }

    if (typeof value === 'number') {
        return value;
        }

    if (typeof value === 'string' && /^[+-]?(\d+\.?\d*|\.\d+)$/.test( value.trim() )) {
        return Number( value );
        }

    throw new SqlError( `${name} necesita un número y recibe «${displayValue( value )}».` );
    }

function dateOf(
        value,
        name
        ) {
    if (value === null) {
        return null;
        }

    if (value instanceof SqlDate) {
        return value;
        }

    const date = typeof value === 'string' ? dateFromText( value ) : null;

    if (!date) {
        throw new SqlError( `${name} necesita una fecha y recibe «${displayValue( value )}».` );
        }

    return date;
    }

function dateParts( date ) {
    const [year, month, day] = date.iso.split( '-' ).map( Number );

    return {year, month, day};
    }

function dateFromParts(
        year,
        month,
        day
        ) {
    const time = Date.UTC( year, month - 1, day );

    return new SqlDate( Math.round( time / 86400000 ) );
    }

const DATE_INTERVALS = {yyyy: 'year', q: 'quarter', m: 'month', d: 'day', y: 'day', w: 'day', ww: 'week'};

function dateInterval(
        value,
        name
        ) {
    const interval = DATE_INTERVALS[String( value ?? '' ).toLowerCase()];

    if (!interval) {
        throw new SqlError( `${name}: el intervalo debe ser "yyyy", "q", "m", "ww" o "d".` );
        }

    return interval;
    }

/** Each function: [minimum arguments, maximum arguments, body over the evaluated arguments]. */
const FUNCTIONS = {
    NZ: [1, 2, ([value, other]) => value === null ? (other === undefined ? 0 : other) : value],
    ISNULL: [1, 1, ([value]) => value === null],
    LEN: [1, 1, ([value]) => value === null ? null : textOf( value ).length],
    LEFT: [2, 2, ([value, count]) => value === null ? null : textOf( value ).slice( 0, numberOf( count, 'Left' ) )],
    RIGHT: [2, 2, ([value, count]) => {
        const length = numberOf( count, 'Right' );

        return value === null ? null : length === 0 ? '' : textOf( value ).slice( -length );
        }],
    MID: [2, 3, ([value, start, count]) => {
        if (value === null) {
            return null;
            }

        const from = numberOf( start, 'Mid' ) - 1;

        return textOf( value ).slice( from, count === undefined ? undefined : from + numberOf( count, 'Mid' ) );
        }],
    UCASE: [1, 1, ([value]) => value === null ? null : textOf( value ).toUpperCase()],
    LCASE: [1, 1, ([value]) => value === null ? null : textOf( value ).toLowerCase()],
    TRIM: [1, 1, ([value]) => value === null ? null : textOf( value ).trim()],
    LTRIM: [1, 1, ([value]) => value === null ? null : textOf( value ).trimStart()],
    RTRIM: [1, 1, ([value]) => value === null ? null : textOf( value ).trimEnd()],
    INSTR: [2, 3, args => {
        const [start, text, search] = args.length === 3 ? args : [1, ...args];

        if (text === null || search === null) {
            return null;
            }

        return textOf( text ).toLowerCase().indexOf( textOf( search ).toLowerCase(), numberOf( start, 'InStr' ) - 1 ) + 1;
        }],
    REPLACE: [3, 3, ([text, find, replacement]) => text === null ? null : textOf( text ).split( textOf( find ) ).join( textOf( replacement ) ?? '' )],
    YEAR: [1, 1, ([value]) => value === null ? null : dateParts( dateOf( value, 'Year' ) ).year],
    MONTH: [1, 1, ([value]) => value === null ? null : dateParts( dateOf( value, 'Month' ) ).month],
    DAY: [1, 1, ([value]) => value === null ? null : dateParts( dateOf( value, 'Day' ) ).day],
    DATE: [0, 0, () => today()],
    NOW: [0, 0, () => today()],
    DATESERIAL: [3, 3, ([year, month, day]) => dateFromParts( numberOf( year, 'DateSerial' ), numberOf( month, 'DateSerial' ), numberOf( day, 'DateSerial' ) )],
    DATEADD: [3, 3, ([interval, count, value]) => {
        const date = dateOf( value, 'DateAdd' );
        const amount = Math.trunc( numberOf( count, 'DateAdd' ) );

        if (date === null) {
            return null;
            }

        const unit = dateInterval( interval, 'DateAdd' );
        const parts = dateParts( date );

        if (unit === 'day' || unit === 'week') {
            return new SqlDate( date.day + amount * (unit === 'week' ? 7 : 1) );
            }

        const months = amount * (unit === 'year' ? 12 : unit === 'quarter' ? 3 : 1);
        const target = dateFromParts( parts.year, parts.month + months, 1 );
        const last = dateParts( dateFromParts( dateParts( target ).year, dateParts( target ).month + 1, 0 ) ).day;

        return dateFromParts( dateParts( target ).year, dateParts( target ).month, Math.min( parts.day, last ) );
        }],
    DATEDIFF: [3, 3, ([interval, first, second]) => {
        const a = dateOf( first, 'DateDiff' );
        const b = dateOf( second, 'DateDiff' );

        if (a === null || b === null) {
            return null;
            }

        const unit = dateInterval( interval, 'DateDiff' );
        const pa = dateParts( a );
        const pb = dateParts( b );

        return {
            day: b.day - a.day,
            week: Math.trunc( (b.day - a.day) / 7 ),
            month: (pb.year - pa.year) * 12 + pb.month - pa.month,
            quarter: (pb.year - pa.year) * 4 + Math.floor( (pb.month - 1) / 3 ) - Math.floor( (pa.month - 1) / 3 ),
            year: pb.year - pa.year
            }[unit];
        }],
    ROUND: [1, 2, ([value, digits]) => value === null ? null : bankersRound( numberOf( value, 'Round' ), digits === undefined ? 0 : numberOf( digits, 'Round' ) )],
    INT: [1, 1, ([value]) => value === null ? null : Math.floor( numberOf( value, 'Int' ) )],
    FIX: [1, 1, ([value]) => value === null ? null : Math.trunc( numberOf( value, 'Fix' ) )],
    ABS: [1, 1, ([value]) => value === null ? null : Math.abs( numberOf( value, 'Abs' ) )],
    SGN: [1, 1, ([value]) => value === null ? null : Math.sign( numberOf( value, 'Sgn' ) )],
    SQR: [1, 1, ([value]) => {
        const number = numberOf( value, 'Sqr' );

        if (number !== null && number < 0) {
            throw new SqlError( 'Sqr no admite números negativos.' );
            }

        return number === null ? null : Math.sqrt( number );
        }],
    VAL: [1, 1, ([value]) => {
        const match = /^\s*[+-]?(\d+\.?\d*|\.\d+)/.exec( textOf( value ) ?? '' );

        return match ? Number( match[0] ) : 0;
        }],
    STR: [1, 1, ([value]) => value === null ? null : String( numberOf( value, 'Str' ) )],
    CSTR: [1, 1, ([value]) => value === null ? null : displayValue( value )],
    CDBL: [1, 1, ([value]) => numberOf( value, 'CDbl' )],
    CINT: [1, 1, ([value]) => value === null ? null : bankersRound( numberOf( value, 'CInt' ) )],
    CLNG: [1, 1, ([value]) => value === null ? null : bankersRound( numberOf( value, 'CLng' ) )],
    CDATE: [1, 1, ([value]) => dateOf( value, 'CDate' )]
    };

/** IIf, Switch and Choose evaluate only the branch they need, as conditions. */
function evaluateConditional(
        expr,
        scope
        ) {
    const args = expr.args;

    if (expr.name === 'IIF') {
        if (args.length !== 3) {
            throw new SqlError( 'IIf necesita tres argumentos: IIf(condición, si es verdad, si no).', expr.start );
            }

        return truth( evaluate( args[0], scope ) ) ? evaluate( args[1], scope ) : evaluate( args[2], scope );
        }

    if (expr.name === 'SWITCH') {
        if (!args.length || args.length % 2) {
            throw new SqlError( 'Switch necesita parejas de condición y valor.', expr.start );
            }

        for (let index = 0; index < args.length; index += 2) {
            if (truth( evaluate( args[index], scope ) )) {
                return evaluate( args[index + 1], scope );
                }
            }

        return null;
        }

    const position = numberOf( evaluate( args[0], scope ), 'Choose' );

    return position >= 1 && position < args.length ? evaluate( args[Math.trunc( position )], scope ) : null;
    }

function evaluateFunction(
        expr,
        scope
        ) {
    if (['IIF', 'SWITCH', 'CHOOSE'].includes( expr.name )) {
        return evaluateConditional( expr, scope );
        }

    const definition = FUNCTIONS[expr.name];

    if (!definition) {
        throw new SqlError( `Función desconocida ${expr.name}. Revisa el nombre o usa una de las disponibles (IIf, Nz, Len, Left, Year…).`, expr.start );
        }

    const [minimum, maximum, body] = definition;

    if (expr.star || expr.args.length < minimum || expr.args.length > maximum) {
        throw new SqlError(
                `${expr.name} admite ${minimum === maximum ? minimum : `de ${minimum} a ${maximum}`} argumentos.`,
                expr.start
                );
        }

    return body( expr.args.map( arg => evaluate( arg, scope ) ) );
    }

/** The names of the scalar functions the console knows, for the help. */
export function functionNames() {
    return ['IIF', 'SWITCH', 'CHOOSE', ...Object.keys( FUNCTIONS )].sort();
    }
