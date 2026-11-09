import { parseDataType } from '../domain/model.js';
import { SqlError } from './lexer.js';

/*
 * The values a statement works with, and an algebra of operations on them in
 * which every operation knows NULL:
 *   null      an empty cell (SQL NULL);
 *   number    NUMBER and the other numeric types, numeric literals;
 *   string    VARCHAR and CHAR, text literals;
 *   boolean   the result of a comparison, TRUE and FALSE;
 *   SqlDate   DATE, #…# literals.
 * Comparisons and logic use three values (true, false, null = unknown), as
 * SQL does. Text compares without telling capitals apart, as Access does.
 */

const DAY_MILLISECONDS = 86400000;

export class SqlDate {
    constructor( day ) {
        if (!Number.isInteger( day )) {
            throw new SqlError( 'Fecha no válida.' );
            }

        this.day = day;
        this.iso = new Date( day * DAY_MILLISECONDS ).toISOString().slice( 0, 10 );
        Object.freeze( this );
        }

    toString() {
        return this.iso;
        }
    }

/** An ISO date text (AAAA-MM-DD) as a date, or null when it is not a real date. */
export function dateFromText( text ) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec( String( text ).trim() );

    if (!match) {
        return null;
        }

    const [year, month, day] = match.slice( 1 ).map( Number );
    const time = Date.UTC( year, month - 1, day );
    const date = new Date( time );

    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        return null;
        }

    return new SqlDate( Math.round( time / DAY_MILLISECONDS ) );
    }

export function today() {
    const now = new Date();

    return new SqlDate( Math.round( Date.UTC( now.getFullYear(), now.getMonth(), now.getDate() ) / DAY_MILLISECONDS ) );
    }

/* ---------- kinds and conversions ---------- */

export function valueKind( value ) {
    if (value === null || value === undefined) {
        return 'null';
        }

    if (value instanceof SqlDate) {
        return 'date';
        }

    return {number: 'number', string: 'text', boolean: 'boolean'}[typeof value] || 'text';
    }

const VALUE_NUMBER_FAMILIES = ['NUMBER', 'DECIMAL', 'NUMERIC', 'INTEGER', 'INT', 'SMALLINT', 'BIGINT', 'REAL', 'FLOAT', 'DOUBLE'];
const VALUE_DATE_FAMILIES = ['DATE', 'TIMESTAMP', 'DATETIME'];
const VALUE_BOOLEAN_FAMILIES = ['BOOLEAN', 'BOOL'];
const NUMBER_TEXT = /^[+-]?(\d+\.?\d*|\.\d+)$/;

/** What kind of value a column type holds: number, date, boolean or text. */
export function typeKind( type ) {
    let family = '';

    try {
        family = parseDataType( type ).family;
        }
    catch {
        family = String( type || '' ).toUpperCase();
        }

    if (VALUE_NUMBER_FAMILIES.includes( family )) {
        return 'number';
        }

    if (VALUE_DATE_FAMILIES.includes( family )) {
        return 'date';
        }

    return VALUE_BOOLEAN_FAMILIES.includes( family ) ? 'boolean' : 'text';
    }

/** The text of a datasheet cell as a value of its column's type; an empty cell is NULL. */
export function valueFromCell(
        text,
        type
        ) {
    const cell = String( text ?? '' ).trim();

    if (cell === '') {
        return null;
        }

    switch (typeKind( type )) {
        case 'number':
            return NUMBER_TEXT.test( cell ) ? Number( cell ) : cell;
        case 'date':
            return dateFromText( cell.slice( 0, 10 ) ) ?? cell;
        case 'boolean':
            return ['true', 'sí', 'si', '1', 'verdadero'].includes( cell.toLowerCase() );
        default:
            return String( text );
        }
    }

function numberText( value ) {
    return String( Number( value.toFixed( 10 ) ) );
    }

function mismatch( detail ) {
    return new SqlError( `No coinciden los tipos de datos: ${detail}.` );
    }

/** A value stored in a cell of the given type, as the datasheet keeps it (text). */
export function cellFromValue(
        value,
        type
        ) {
    if (value === null || value === undefined) {
        return '';
        }

    switch (typeKind( type )) {
        case 'number':
            if (typeof value === 'number') {
                return numberText( value );
                }
            if (typeof value === 'boolean') {
                return value ? '-1' : '0';
                }
            if (typeof value === 'string' && NUMBER_TEXT.test( value.trim() )) {
                return numberText( Number( value ) );
                }
            throw mismatch( `${displayValue( value )} no es un número para ${type}` );
        case 'date':
            if (value instanceof SqlDate) {
                return value.iso;
                }
            if (typeof value === 'string' && dateFromText( value )) {
                return dateFromText( value ).iso;
                }
            throw mismatch( `${displayValue( value )} no es una fecha para ${type}; escribe #AAAA-MM-DD#` );
        case 'boolean':
            return truth( value ) ? 'sí' : 'no';
        default:
            return typeof value === 'number' ? numberText( value )
                : value instanceof SqlDate ? value.iso
                    : typeof value === 'boolean' ? (value ? 'Verdadero' : 'Falso')
                        : String( value );
        }
    }

/** A number from a value, for arithmetic: True is -1 and False 0, as in Access. */
function numeric(
        value,
        operator
        ) {
    if (typeof value === 'number') {
        return value;
        }

    if (typeof value === 'boolean') {
        return value ? -1 : 0;
        }

    if (typeof value === 'string' && NUMBER_TEXT.test( value.trim() )) {
        return Number( value );
        }

    throw mismatch( `«${displayValue( value )}» no es un número en la operación ${operator}` );
    }

/* ---------- logic of three values ---------- */

/** true, false or null (unknown); a number is true when it is not 0. */
export function truth( value ) {
    if (value === null || value === undefined) {
        return null;
        }

    if (typeof value === 'boolean') {
        return value;
        }

    if (typeof value === 'number') {
        return value !== 0;
        }

    throw mismatch( `«${displayValue( value )}» no es verdadero ni falso` );
    }

export function and3(
        left,
        right
        ) {
    if (left === false || right === false) {
        return false;
        }

    return left === null || right === null ? null : true;
    }

export function or3(
        left,
        right
        ) {
    if (left === true || right === true) {
        return true;
        }

    return left === null || right === null ? null : false;
    }

export function not3( value ) {
    return value === null ? null : !value;
    }

/* ---------- order ---------- */

const TEXT_COLLATOR = new Intl.Collator( 'es', {sensitivity: 'accent', numeric: false} );

/**
 * -1, 0 or 1; null when one side is NULL (unknown). Numbers and texts with a
 * number compare as numbers, dates with texts as dates, and texts ignore
 * capitals. Anything else is a type mismatch, as Access reports it.
 */
export function compareValues(
        left,
        right
        ) {
    if (left === null || left === undefined || right === null || right === undefined) {
        return null;
        }

    const sign = number => (number > 0) - (number < 0);

    if (left instanceof SqlDate || right instanceof SqlDate) {
        const asDate = value => value instanceof SqlDate ? value
            : typeof value === 'string' ? dateFromText( value )
                : typeof value === 'number' ? null : null;
        const a = asDate( left );
        const b = asDate( right );

        if (!a || !b) {
            throw mismatch( `no se puede comparar ${displayValue( left )} con ${displayValue( right )}` );
            }

        return sign( a.day - b.day );
        }

    if (typeof left === 'string' && typeof right === 'string') {
        return sign( TEXT_COLLATOR.compare( left, right ) );
        }

    return sign( numeric( left, 'de comparación' ) - numeric( right, 'de comparación' ) );
    }

/** Order for ORDER BY: NULL goes first, as in Access; values of different kinds keep a fixed order. */
export function sortCompare(
        left,
        right
        ) {
    const leftNull = left === null || left === undefined;
    const rightNull = right === null || right === undefined;

    if (leftNull || rightNull) {
        return leftNull && rightNull ? 0 : leftNull ? -1 : 1;
        }

    try {
        return compareValues( left, right );
        }
    catch {
        return TEXT_COLLATOR.compare( displayValue( left ), displayValue( right ) );
        }
    }

/** The identity of a value for DISTINCT, GROUP BY and UNION: NULLs group together, texts ignore capitals. */
export function groupKey( value ) {
    switch (valueKind( value )) {
        case 'null':
            return 'null';
        case 'number':
            return `n:${value}`;
        case 'date':
            return `d:${value.iso}`;
        case 'boolean':
            return `b:${value}`;
        default:
            return `s:${String( value ).toLocaleLowerCase( 'es' ).normalize( 'NFC' )}`;
        }
    }

/* ---------- arithmetic and text ---------- */

/** + - * / \ Mod ^ with NULL in, NULL out. Dates move by days; two dates subtract to days. */
export function arithmetic(
        operator,
        left,
        right
        ) {
    if (left === null || left === undefined || right === null || right === undefined) {
        return null;
        }

    if (operator === '+' && typeof left === 'string' && typeof right === 'string') {
        return left + right;
        }

    if (left instanceof SqlDate || right instanceof SqlDate) {
        return dateArithmetic( operator, left, right );
        }

    const a = numeric( left, operator );
    const b = numeric( right, operator );

    switch (operator) {
        case '+':
            return a + b;
        case '-':
            return a - b;
        case '*':
            return a * b;
        case '/':
            if (b === 0) {
                throw new SqlError( 'División por cero.' );
                }
            return a / b;
        case '\\':
            if (Math.round( b ) === 0) {
                throw new SqlError( 'División por cero.' );
                }
            return Math.trunc( Math.round( a ) / Math.round( b ) );
        case 'MOD':
            if (Math.round( b ) === 0) {
                throw new SqlError( 'División por cero.' );
                }
            return Math.round( a ) % Math.round( b );
        case '^':
            return a ** b;
        default:
            throw new SqlError( `Operador desconocido ${operator}.` );
        }
    }

function dateArithmetic(
        operator,
        left,
        right
        ) {
    if (operator === '-' && left instanceof SqlDate && right instanceof SqlDate) {
        return left.day - right.day;
        }

    if (operator === '+' && left instanceof SqlDate && !(right instanceof SqlDate)) {
        return new SqlDate( left.day + Math.round( numeric( right, '+' ) ) );
        }

    if (operator === '+' && right instanceof SqlDate && !(left instanceof SqlDate)) {
        return new SqlDate( right.day + Math.round( numeric( left, '+' ) ) );
        }

    if (operator === '-' && left instanceof SqlDate) {
        return new SqlDate( left.day - Math.round( numeric( right, '-' ) ) );
        }

    throw mismatch( `no se puede usar ${operator} con una fecha` );
    }

/** & joins texts and treats NULL as empty, as Access does; NULL & NULL is NULL. */
export function concatenate(
        left,
        right
        ) {
    if ((left === null || left === undefined) && (right === null || right === undefined)) {
        return null;
        }

    const text = value => value === null || value === undefined ? '' : cellFromValue( value, 'VARCHAR' );

    return text( left ) + text( right );
    }

/*
 * LIKE with the wildcards of Access: * any text, ? one character, # one
 * digit, [abc] one of them, [!abc] none of them, [a-z] a range. % also
 * stands for any text. Capitals do not matter.
 */
export function likeMatches(
        value,
        pattern
        ) {
    if (value === null || value === undefined || pattern === null || pattern === undefined) {
        return null;
        }

    let expression = '';
    const source = String( pattern );

    for (let index = 0; index < source.length; index += 1) {
        const character = source[index];

        if (character === '*' || character === '%') {
            expression += '.*';
            }
        else if (character === '?') {
            expression += '.';
            }
        else if (character === '#') {
            expression += '\\d';
            }
        else if (character === '[') {
            const end = source.indexOf( ']', index + 1 );

            if (end < 0) {
                throw new SqlError( `Patrón LIKE no válido: falta cerrar [ en «${source}».` );
                }

            const inside = source.slice( index + 1, end );
            const negated = inside.startsWith( '!' );
            const body = (negated ? inside.slice( 1 ) : inside).replace( /[\\\]^]/g, '\\$&' );

            expression += `[${negated ? '^' : ''}${body}]`;
            index = end;
            }
        else {
            expression += character.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
            }
        }

    return new RegExp( `^${expression}$`, 'isu' ).test( cellFromValue( value, 'VARCHAR' ) );
    }

/* ---------- display ---------- */

/** The value as an Access datasheet in Spanish shows it: 12,5 · 31/01/2026 · Verdadero. */
export function displayValue( value ) {
    switch (valueKind( value )) {
        case 'null':
            return '';
        case 'number':
            return value.toLocaleString( 'es-ES', {maximumFractionDigits: 10, useGrouping: false} );
        case 'date': {
            const [year, month, day] = value.iso.split( '-' );

            return `${day}/${month}/${year}`;
            }
        case 'boolean':
            return value ? 'Verdadero' : 'Falso';
        default:
            return String( value );
        }
    }
