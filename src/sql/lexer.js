/*
 * The words of Access SQL. The lexer turns the text of a statement into a
 * list of tokens, each with its kind and its place in the text so errors can
 * point at the line and column:
 *   word     a keyword or a plain name: SELECT, Socio, id_socio, año;
 *   name     a name in brackets: [Fecha de alta];
 *   number   12, 12.5, .5;
 *   string   'texto' or "texto" (Access accepts both quotes);
 *   date     #2026-01-31# or #1/31/2026# (Access writes month/day/year);
 *   symbol   ( ) , ; . * + - / \ ^ & = <> != < > <= >=;
 *   end      the end of the text.
 * Comments (-- to the end of the line, and between /* and *\/) are skipped.
 */

export class SqlError extends Error {
    constructor(
            message,
            position = null
            ) {
        super( message );
        this.name = 'SqlError';
        this.position = position;
        }
    }

/** Line and column (both from 1) of a position in the text. */
export function sqlLocation(
        text,
        position
        ) {
    const before = text.slice( 0, Math.max( 0, position ) );
    const lines = before.split( '\n' );

    return {line: lines.length, column: lines.at( -1 ).length + 1};
    }

/** The error message with its place: «… (línea 2, columna 7)». */
export function sqlErrorText(
        error,
        text
        ) {
    if (!(error instanceof SqlError) || error.position === null || error.position === undefined) {
        return error.message;
        }

    const place = sqlLocation( text, error.position );

    return `${error.message.replace( /\.$/, '' )} (línea ${place.line}, columna ${place.column}).`;
    }

const SQL_SYMBOLS = ['<>', '!=', '<=', '>=', '(', ')', ',', ';', '.', '*', '+', '-', '/', '\\', '^', '&', '=', '<', '>'];

function isWordStart( character ) {
    return /[\p{L}_]/u.test( character );
    }

function isWordPart( character ) {
    return /[\p{L}\p{N}_]/u.test( character );
    }

function token(
        kind,
        value,
        start,
        end
        ) {
    return {kind, value, upper: kind === 'word' ? value.toUpperCase() : null, start, end};
    }

function readQuoted(
        text,
        start,
        quote
        ) {
    let value = '';
    let index = start + 1;

    while (index < text.length) {
        if (text[index] === quote) {
            if (text[index + 1] === quote) {
                value += quote;
                index += 2;
                continue;
                }

            return {value, end: index + 1};
            }

        value += text[index];
        index += 1;
        }

    throw new SqlError( `Falta cerrar el texto que empieza con ${quote}.`, start );
    }

/** #2026-01-31# (ISO) or #1/31/2026# (Access, month first) as an ISO date text. */
function readDate(
        text,
        start
        ) {
    const end = text.indexOf( '#', start + 1 );

    if (end < 0) {
        throw new SqlError( 'Falta cerrar la fecha que empieza con #.', start );
        }

    const inside = text.slice( start + 1, end ).trim();
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec( inside );
    const access = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec( inside );
    const parts = iso ? [iso[1], iso[2], iso[3]] : access ? [access[3], access[1], access[2]] : null;

    if (!parts) {
        throw new SqlError( `Fecha no válida #${inside}#: escribe #AAAA-MM-DD# o #M/D/AAAA#.`, start );
        }

    const [year, month, day] = parts.map( Number );
    const date = new Date( Date.UTC( year, month - 1, day ) );

    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        throw new SqlError( `La fecha #${inside}# no existe.`, start );
        }

    return {
        value: `${String( year ).padStart( 4, '0' )}-${String( month ).padStart( 2, '0' )}-${String( day ).padStart( 2, '0' )}`,
        end: end + 1
        };
    }

function skipComment(
        text,
        index
        ) {
    if (text.startsWith( '--', index )) {
        const end = text.indexOf( '\n', index );

        return end < 0 ? text.length : end + 1;
        }

    if (text.startsWith( '/*', index )) {
        const end = text.indexOf( '*/', index + 2 );

        if (end < 0) {
            throw new SqlError( 'Falta cerrar el comentario /* … */.', index );
            }

        return end + 2;
        }

    return index;
    }

export function tokenize( text ) {
    const tokens = [];
    let index = 0;

    while (index < text.length) {
        const character = text[index];
        const afterComment = skipComment( text, index );

        if (afterComment !== index) {
            index = afterComment;
            continue;
            }

        if (/\s/.test( character )) {
            index += 1;
            continue;
            }

        if (isWordStart( character )) {
            let end = index + 1;

            while (end < text.length && isWordPart( text[end] )) {
                end += 1;
                }

            tokens.push( token( 'word', text.slice( index, end ), index, end ) );
            index = end;
            continue;
            }

        if (/\d/.test( character ) || character === '.' && /\d/.test( text[index + 1] || '' )) {
            const match = /^\d*\.?\d+(?:[eE][+-]?\d+)?|^\d+\.?/.exec( text.slice( index ) );

            tokens.push( token( 'number', Number( match[0] ), index, index + match[0].length ) );
            index += match[0].length;
            continue;
            }

        if (character === '[') {
            const end = text.indexOf( ']', index + 1 );

            if (end < 0) {
                throw new SqlError( 'Falta cerrar el nombre que empieza con [.', index );
                }

            tokens.push( token( 'name', text.slice( index + 1, end ), index, end + 1 ) );
            index = end + 1;
            continue;
            }

        if (character === '\'' || character === '"') {
            const quoted = readQuoted( text, index, character );

            tokens.push( token( 'string', quoted.value, index, quoted.end ) );
            index = quoted.end;
            continue;
            }

        if (character === '#') {
            const date = readDate( text, index );

            tokens.push( token( 'date', date.value, index, date.end ) );
            index = date.end;
            continue;
            }

        const symbol = SQL_SYMBOLS.find( item => text.startsWith( item, index ) );

        if (!symbol) {
            throw new SqlError( `Carácter inesperado «${character}».`, index );
            }

        tokens.push( token( 'symbol', symbol === '!=' ? '<>' : symbol, index, index + symbol.length ) );
        index += symbol.length;
        }

    tokens.push( token( 'end', '', text.length, text.length ) );
    return tokens;
    }
