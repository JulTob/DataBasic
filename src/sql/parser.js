import {
    SqlError,
    tokenize
    } from './lexer.js';

/*
 * The grammar of the SQL the console accepts, written as one function per
 * rule (recursive descent). Each function reads the tokens of its rule and
 * returns a node of the syntax tree; nothing is executed here.
 *
 *   script      statement { ; statement }
 *   statement   query | INSERT | UPDATE | DELETE | CREATE … | ALTER TABLE | DROP …
 *   query       select { UNION [ALL] select } [ORDER BY …]
 *   select      SELECT [DISTINCT] [TOP n [PERCENT]] items FROM from
 *               [WHERE e] [GROUP BY e, …] [HAVING e]
 *   from        term { , term }
 *   term        primary { [INNER|LEFT|RIGHT] [OUTER] JOIN primary ON e }
 *   primary     name [[AS] alias] | ( query ) [AS] alias | ( term )
 *
 * Expressions follow Access precedence, lowest first:
 *   OR, AND, NOT, comparisons (= <> < > <= >= LIKE BETWEEN IN IS),
 *   &, + -, MOD, \, * /, ^, unary -, and the primaries (literals, names,
 *   calls, parentheses, subqueries, EXISTS).
 */

const SQL_RESERVED = new Set( [
    'SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'HAVING', 'ORDER', 'UNION', 'ALL', 'DISTINCT', 'DISTINCTROW',
    'TOP', 'PERCENT', 'AS', 'ON', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'AND', 'OR', 'NOT', 'LIKE',
    'BETWEEN', 'IN', 'IS', 'NULL', 'EXISTS', 'ASC', 'DESC', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET',
    'DELETE', 'CREATE', 'ALTER', 'DROP', 'TABLE', 'INDEX', 'VIEW', 'MOD', 'TRUE', 'FALSE', 'CONSTRAINT',
    'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'UNIQUE', 'CHECK', 'DEFAULT', 'ADD', 'COLUMN'
    ] );

const SQL_COMPARISONS = ['=', '<>', '<', '>', '<=', '>='];
const SQL_ACTIONS = ['CASCADE', 'SET NULL', 'SET DEFAULT', 'NO ACTION', 'RESTRICT'];

/** A cursor over the tokens of one text, with the reading helpers every rule uses. */
function sqlCursor( text ) {
    const tokens = tokenize( text );
    let index = 0;

    const cursor = {
        text,
        get token() {
            return tokens[index];
            },
        peek( offset = 1 ) {
            return tokens[Math.min( index + offset, tokens.length - 1 )];
            },
        next() {
            const current = tokens[index];

            index = Math.min( index + 1, tokens.length - 1 );
            return current;
            },
        isWord( ...words ) {
            return cursor.token.kind === 'word' && words.includes( cursor.token.upper );
            },
        isSymbol( ...symbols ) {
            return cursor.token.kind === 'symbol' && symbols.includes( cursor.token.value );
            },
        acceptWord( ...words ) {
            return cursor.isWord( ...words ) ? cursor.next() : null;
            },
        acceptSymbol( ...symbols ) {
            return cursor.isSymbol( ...symbols ) ? cursor.next() : null;
            },
        expectWord( word, context = '' ) {
            if (!cursor.isWord( word )) {
                cursor.fail( `Se esperaba ${word}${context ? ` ${context}` : ''}` );
                }

            return cursor.next();
            },
        expectSymbol( symbol, context = '' ) {
            if (!cursor.isSymbol( symbol )) {
                cursor.fail( `Se esperaba «${symbol}»${context ? ` ${context}` : ''}` );
                }

            return cursor.next();
            },
        fail( message ) {
            const found = cursor.token.kind === 'end' ? 'el final' : `«${text.slice( cursor.token.start, cursor.token.end )}»`;

            throw new SqlError( `Error de sintaxis: ${message.charAt( 0 ).toLowerCase()}${message.slice( 1 )}, pero aparece ${found}.`, cursor.token.start );
            },
        slice( start, end ) {
            return text.slice( start, end ).trim();
            },
        get position() {
            return cursor.token.start;
            },
        get previousEnd() {
            return tokens[Math.max( 0, index - 1 )].end;
            }
        };

    return cursor;
    }

/* ---------- names ---------- */

/** A table, column or alias name: a plain word that is not reserved, or a [bracketed] name. */
function readName(
        cursor,
        what
        ) {
    const current = cursor.token;

    if (current.kind === 'name' || current.kind === 'word' && !SQL_RESERVED.has( current.upper )) {
        cursor.next();
        return current.value;
        }

    return cursor.fail( `Se esperaba ${what}` );
    }

function isNameToken( current ) {
    return current.kind === 'name' || current.kind === 'word' && !SQL_RESERVED.has( current.upper );
    }

function readNameList(
        cursor,
        what
        ) {
    cursor.expectSymbol( '(', `antes de la lista de ${what}` );

    const names = [readName( cursor, what )];

    while (cursor.acceptSymbol( ',' )) {
        names.push( readName( cursor, what ) );
        }

    cursor.expectSymbol( ')', `al cerrar la lista de ${what}` );
    return names;
    }

/* ---------- expressions ---------- */

function node(
        type,
        start,
        fields
        ) {
    return {type, start, ...fields};
    }

function readExpression( cursor ) {
    return readOr( cursor );
    }

function readOr( cursor ) {
    let left = readAnd( cursor );

    while (cursor.isWord( 'OR' )) {
        const start = cursor.next().start;

        left = node( 'binary', start, {operator: 'OR', left, right: readAnd( cursor )} );
        }

    return left;
    }

function readAnd( cursor ) {
    let left = readNot( cursor );

    while (cursor.isWord( 'AND' )) {
        const start = cursor.next().start;

        left = node( 'binary', start, {operator: 'AND', left, right: readNot( cursor )} );
        }

    return left;
    }

function readNot( cursor ) {
    if (cursor.isWord( 'NOT' ) && !cursor.peek().upper?.match( /^(EXISTS)$/ )) {
        const start = cursor.next().start;

        return node( 'unary', start, {operator: 'NOT', operand: readNot( cursor )} );
        }

    return readComparison( cursor );
    }

function readComparison( cursor ) {
    const start = cursor.position;
    const left = readConcatenation( cursor );

    if (cursor.isSymbol( ...SQL_COMPARISONS )) {
        const operator = cursor.next().value;

        return node( 'binary', start, {operator, left, right: readConcatenation( cursor )} );
        }

    if (cursor.isWord( 'IS' )) {
        cursor.next();

        const not = Boolean( cursor.acceptWord( 'NOT' ) );

        cursor.expectWord( 'NULL', 'después de IS' );
        return node( 'is-null', start, {not, value: left} );
        }

    const not = cursor.isWord( 'NOT' ) && ['LIKE', 'BETWEEN', 'IN'].includes( cursor.peek().upper );

    if (not) {
        cursor.next();
        }

    if (cursor.acceptWord( 'LIKE' )) {
        return node( 'like', start, {not, value: left, pattern: readConcatenation( cursor )} );
        }

    if (cursor.acceptWord( 'BETWEEN' )) {
        const low = readConcatenation( cursor );

        cursor.expectWord( 'AND', 'en BETWEEN … AND …' );
        return node( 'between', start, {not, value: left, low, high: readConcatenation( cursor )} );
        }

    if (cursor.acceptWord( 'IN' )) {
        cursor.expectSymbol( '(', 'después de IN' );

        if (cursor.isWord( 'SELECT' )) {
            const query = readQuery( cursor );

            cursor.expectSymbol( ')', 'al cerrar la subconsulta' );
            return node( 'in', start, {not, value: left, query} );
            }

        const list = [readExpression( cursor )];

        while (cursor.acceptSymbol( ',' )) {
            list.push( readExpression( cursor ) );
            }

        cursor.expectSymbol( ')', 'al cerrar la lista de IN' );
        return node( 'in', start, {not, value: left, list} );
        }

    return left;
    }

function readBinaryLevel(
        cursor,
        operators,
        readOperand,
        isWord = false
        ) {
    let left = readOperand( cursor );

    while (isWord ? cursor.isWord( ...operators ) : cursor.isSymbol( ...operators )) {
        const operatorToken = cursor.next();
        const operator = isWord ? operatorToken.upper : operatorToken.value;

        left = node( 'binary', operatorToken.start, {operator, left, right: readOperand( cursor )} );
        }

    return left;
    }

function readConcatenation( cursor ) {
    return readBinaryLevel( cursor, ['&'], readAdditive );
    }

function readAdditive( cursor ) {
    return readBinaryLevel( cursor, ['+', '-'], readModulo );
    }

function readModulo( cursor ) {
    return readBinaryLevel( cursor, ['MOD'], readIntegerDivision, true );
    }

function readIntegerDivision( cursor ) {
    return readBinaryLevel( cursor, ['\\'], readMultiplicative );
    }

function readMultiplicative( cursor ) {
    return readBinaryLevel( cursor, ['*', '/'], readPower );
    }

function readPower( cursor ) {
    return readBinaryLevel( cursor, ['^'], readUnary );
    }

function readUnary( cursor ) {
    if (cursor.isSymbol( '-', '+' )) {
        const operatorToken = cursor.next();
        const operand = readUnary( cursor );

        return operatorToken.value === '-'
            ? node( 'unary', operatorToken.start, {operator: '-', operand} )
            : operand;
        }

    return readPrimary( cursor );
    }

function readCall(
        cursor,
        nameToken
        ) {
    cursor.expectSymbol( '(' );

    const call = node( 'call', nameToken.start, {name: nameToken.upper || nameToken.value.toUpperCase(), args: [], distinct: false, star: false} );

    if (cursor.acceptSymbol( ')' )) {
        return call;
        }

    if (cursor.isSymbol( '*' )) {
        cursor.next();
        call.star = true;
        cursor.expectSymbol( ')', 'después de *' );
        return call;
        }

    call.distinct = Boolean( cursor.acceptWord( 'DISTINCT' ) );
    call.args.push( readExpression( cursor ) );

    while (cursor.acceptSymbol( ',' )) {
        call.args.push( readExpression( cursor ) );
        }

    cursor.expectSymbol( ')', `al cerrar ${call.name}(…)` );
    return call;
    }

function readColumnReference(
        cursor,
        start
        ) {
    const first = readName( cursor, 'un nombre' );

    if (cursor.isSymbol( '.' )) {
        cursor.next();

        if (cursor.isSymbol( '*' )) {
            cursor.next();
            return node( 'star', start, {table: first} );
            }

        return node( 'column', start, {table: first, name: readName( cursor, 'el nombre del campo' )} );
        }

    return node( 'column', start, {table: null, name: first} );
    }

function readPrimary( cursor ) {
    const current = cursor.token;
    const start = current.start;

    switch (current.kind) {
        case 'number':
            cursor.next();
            return node( 'number', start, {value: current.value} );
        case 'string':
            cursor.next();
            return node( 'string', start, {value: current.value} );
        case 'date':
            cursor.next();
            return node( 'date', start, {value: current.value} );
        default:
            break;
        }

    if (cursor.acceptWord( 'NULL' )) {
        return node( 'null', start, {} );
        }

    if (cursor.isWord( 'TRUE', 'FALSE' )) {
        return node( 'boolean', start, {value: cursor.next().upper === 'TRUE'} );
        }

    if (cursor.isWord( 'EXISTS' ) || cursor.isWord( 'NOT' ) && cursor.peek().upper === 'EXISTS') {
        const not = Boolean( cursor.acceptWord( 'NOT' ) );

        cursor.expectWord( 'EXISTS' );
        cursor.expectSymbol( '(', 'después de EXISTS' );

        const query = readQuery( cursor );

        cursor.expectSymbol( ')', 'al cerrar la subconsulta' );
        return node( 'exists', start, {not, query} );
        }

    if (cursor.acceptSymbol( '(' )) {
        if (cursor.isWord( 'SELECT' )) {
            const query = readQuery( cursor );

            cursor.expectSymbol( ')', 'al cerrar la subconsulta' );
            return node( 'subquery', start, {query} );
            }

        const inner = readExpression( cursor );

        cursor.expectSymbol( ')', 'al cerrar el paréntesis' );
        return inner;
        }

    if (cursor.isWord( 'CASE' )) {
        throw new SqlError( 'Este dialecto no tiene CASE: usa IIf(condición, si es verdad, si no) o Switch(condición, valor, …).', current.start );
        }

    if (current.kind === 'word' && cursor.peek().kind === 'symbol' && cursor.peek().value === '('
        && !SQL_RESERVED.has( current.upper )) {
        cursor.next();
        return readCall( cursor, current );
        }

    if (isNameToken( current )) {
        return readColumnReference( cursor, start );
        }

    return cursor.fail( 'Se esperaba un valor, un campo o una expresión' );
    }

/* ---------- queries ---------- */

function readSelectItems( cursor ) {
    const items = [];

    do {
        const start = cursor.position;

        if (cursor.isSymbol( '*' )) {
            cursor.next();
            items.push( node( 'all', start, {table: null} ) );
            continue;
            }

        const expression = readExpression( cursor );

        if (expression.type === 'star') {
            items.push( node( 'all', start, {table: expression.table} ) );
            continue;
            }

        let alias = null;

        if (cursor.acceptWord( 'AS' )) {
            alias = readName( cursor, 'el alias después de AS' );
            }
        else if (isNameToken( cursor.token )) {
            alias = readName( cursor, 'el alias' );
            }

        items.push( node( 'item', start, {expr: expression, alias} ) );
        }
    while (cursor.acceptSymbol( ',' ));

    return items;
    }

function readAlias( cursor ) {
    if (cursor.acceptWord( 'AS' )) {
        return readName( cursor, 'el alias después de AS' );
        }

    return isNameToken( cursor.token ) ? readName( cursor, 'el alias' ) : null;
    }

function readFromPrimary( cursor ) {
    const start = cursor.position;

    if (cursor.acceptSymbol( '(' )) {
        if (cursor.isWord( 'SELECT' )) {
            const query = readQuery( cursor );

            cursor.expectSymbol( ')', 'al cerrar la subconsulta de FROM' );

            const alias = readAlias( cursor );

            if (!alias) {
                cursor.fail( 'Una subconsulta en FROM necesita un alias. Se esperaba AS nombre' );
                }

            return node( 'derived', start, {query, alias} );
            }

        const inner = readFromTerm( cursor );

        cursor.expectSymbol( ')', 'al cerrar el paréntesis de FROM' );
        return inner;
        }

    const name = readName( cursor, 'el nombre de una tabla o consulta' );

    return node( 'table', start, {name, alias: readAlias( cursor )} );
    }

function readJoinKind( cursor ) {
    if (cursor.isWord( 'INNER' ) && cursor.peek().upper === 'JOIN') {
        cursor.next();
        cursor.next();
        return 'inner';
        }

    if (cursor.isWord( 'LEFT', 'RIGHT' )) {
        const kind = cursor.next().upper.toLowerCase();

        cursor.acceptWord( 'OUTER' );
        cursor.expectWord( 'JOIN', `después de ${kind === 'left' ? 'LEFT' : 'RIGHT'}` );
        return kind;
        }

    if (cursor.isWord( 'JOIN' )) {
        cursor.next();
        return 'inner';
        }

    return null;
    }

function readFromTerm( cursor ) {
    let left = readFromPrimary( cursor );

    for (;;) {
        const start = cursor.position;
        const kind = readJoinKind( cursor );

        if (!kind) {
            return left;
            }

        const right = readFromPrimary( cursor );

        cursor.expectWord( 'ON', 'para indicar la condición de la combinación' );
        left = node( 'join', start, {join: kind, left, right, on: readExpression( cursor )} );
        }
    }

function readFrom( cursor ) {
    const items = [readFromTerm( cursor )];

    while (cursor.acceptSymbol( ',' )) {
        items.push( readFromTerm( cursor ) );
        }

    return items;
    }

function readTop( cursor ) {
    if (!cursor.acceptWord( 'TOP' )) {
        return null;
        }

    const count = cursor.token;

    if (count.kind !== 'number' || !Number.isInteger( count.value ) || count.value < 0) {
        cursor.fail( 'TOP necesita un número entero. Se esperaba el número de registros' );
        }

    cursor.next();
    return {count: count.value, percent: Boolean( cursor.acceptWord( 'PERCENT' ) )};
    }

function readSelect( cursor ) {
    const start = cursor.expectWord( 'SELECT' ).start;
    const distinct = Boolean( cursor.acceptWord( 'DISTINCT', 'DISTINCTROW' ) );
    const top = readTop( cursor );
    const items = readSelectItems( cursor );
    const select = node( 'select', start, {distinct, top, items, from: [], where: null, groupBy: [], having: null, orderBy: []} );

    if (cursor.acceptWord( 'FROM' )) {
        select.from = readFrom( cursor );
        }

    if (cursor.acceptWord( 'WHERE' )) {
        select.where = readExpression( cursor );
        }

    if (cursor.acceptWord( 'GROUP' )) {
        cursor.expectWord( 'BY', 'después de GROUP' );
        select.groupBy = [readExpression( cursor )];

        while (cursor.acceptSymbol( ',' )) {
            select.groupBy.push( readExpression( cursor ) );
            }
        }

    if (cursor.acceptWord( 'HAVING' )) {
        select.having = readExpression( cursor );
        }

    return select;
    }

function readOrderBy( cursor ) {
    const keys = [];

    if (!cursor.acceptWord( 'ORDER' )) {
        return keys;
        }

    cursor.expectWord( 'BY', 'después de ORDER' );

    do {
        const expr = readExpression( cursor );
        const descending = Boolean( cursor.acceptWord( 'DESC' ) );

        if (!descending) {
            cursor.acceptWord( 'ASC' );
            }

        keys.push( {expr, descending} );
        }
    while (cursor.acceptSymbol( ',' ));

    return keys;
    }

/** SELECT … { UNION [ALL] SELECT … } [ORDER BY …]: the ORDER BY sorts the whole result. */
function readQuery( cursor ) {
    const start = cursor.position;
    let query = readSelect( cursor );

    while (cursor.isWord( 'UNION' )) {
        cursor.next();

        const all = Boolean( cursor.acceptWord( 'ALL' ) );

        query = node( 'union', start, {all, left: query, right: readSelect( cursor ), orderBy: []} );
        }

    query.orderBy = readOrderBy( cursor );
    query.text = cursor.slice( start, cursor.previousEnd );
    return query;
    }

/* ---------- data statements ---------- */

function readInsert( cursor ) {
    const start = cursor.expectWord( 'INSERT' ).start;

    cursor.expectWord( 'INTO', 'después de INSERT' );

    const table = readName( cursor, 'el nombre de la tabla' );
    const columns = cursor.isSymbol( '(' ) ? readNameList( cursor, 'campos' ) : null;

    if (cursor.isWord( 'SELECT' )) {
        return node( 'insert', start, {table, columns, rows: null, query: readQuery( cursor )} );
        }

    cursor.expectWord( 'VALUES', 'o SELECT después de la tabla' );

    const rows = [];

    do {
        cursor.expectSymbol( '(', 'antes de los valores' );

        const values = [readExpression( cursor )];

        while (cursor.acceptSymbol( ',' )) {
            values.push( readExpression( cursor ) );
            }

        cursor.expectSymbol( ')', 'al cerrar los valores' );
        rows.push( values );
        }
    while (cursor.acceptSymbol( ',' ));

    return node( 'insert', start, {table, columns, rows, query: null} );
    }

function readUpdate( cursor ) {
    const start = cursor.expectWord( 'UPDATE' ).start;
    const table = readName( cursor, 'el nombre de la tabla' );

    cursor.expectWord( 'SET', 'después de la tabla' );

    const assignments = [];

    do {
        const reference = readColumnReference( cursor, cursor.position );

        cursor.expectSymbol( '=', `después de ${reference.name}` );
        assignments.push( {column: reference.name, expr: readExpression( cursor )} );
        }
    while (cursor.acceptSymbol( ',' ));

    const where = cursor.acceptWord( 'WHERE' ) ? readExpression( cursor ) : null;

    return node( 'update', start, {table, assignments, where} );
    }

function readDelete( cursor ) {
    const start = cursor.expectWord( 'DELETE' ).start;

    if (cursor.acceptSymbol( '*' )) {
        // DELETE * FROM, as Access writes it.
        }
    else if (isNameToken( cursor.token ) && cursor.peek().value === '.') {
        readColumnReference( cursor, cursor.position );
        }

    cursor.expectWord( 'FROM', 'después de DELETE' );

    const table = readName( cursor, 'el nombre de la tabla' );
    const where = cursor.acceptWord( 'WHERE' ) ? readExpression( cursor ) : null;

    return node( 'delete', start, {table, where} );
    }

/* ---------- schema statements ---------- */

/** A type with its parameters as written: VARCHAR(40), NUMBER(8,2), DATE, DOUBLE PRECISION. */
function readDataType( cursor ) {
    const start = cursor.position;

    if (cursor.token.kind !== 'word') {
        cursor.fail( 'Se esperaba el tipo de datos' );
        }

    cursor.next();

    while (cursor.token.kind === 'word' && ['PRECISION', 'VARYING'].includes( cursor.token.upper )) {
        cursor.next();
        }

    if (cursor.acceptSymbol( '(' )) {
        do {
            if (cursor.token.kind !== 'number') {
                cursor.fail( 'Se esperaba un número entre los paréntesis del tipo' );
                }

            cursor.next();
            }
        while (cursor.acceptSymbol( ',' ));

        cursor.expectSymbol( ')', 'al cerrar los parámetros del tipo' );
        }

    return cursor.slice( start, cursor.previousEnd ).replace( /\s+/g, ' ' ).replace( /\s*([(),])\s*/g, '$1' ).toUpperCase();
    }

function readReferentialAction( cursor ) {
    for (const action of SQL_ACTIONS) {
        const words = action.split( ' ' );

        if (words.every( (word, index) => cursor.peek( index ).kind === 'word' && cursor.peek( index ).upper === word )) {
            words.forEach( () => cursor.next() );
            return action === 'RESTRICT' ? 'NO ACTION' : action;
            }
        }

    return cursor.fail( 'Se esperaba CASCADE, SET NULL, SET DEFAULT o NO ACTION' );
    }

function readReferences( cursor ) {
    cursor.expectWord( 'REFERENCES' );

    const reference = {table: readName( cursor, 'la tabla referenciada' ), columns: null, onDelete: 'NO ACTION', onUpdate: 'NO ACTION'};

    if (cursor.isSymbol( '(' )) {
        reference.columns = readNameList( cursor, 'campos referenciados' );
        }

    while (cursor.isWord( 'ON' )) {
        cursor.next();

        const event = cursor.acceptWord( 'DELETE', 'UPDATE' );

        if (!event) {
            cursor.fail( 'Se esperaba DELETE o UPDATE después de ON' );
            }

        reference[event.upper === 'DELETE' ? 'onDelete' : 'onUpdate'] = readReferentialAction( cursor );
        }

    return reference;
    }

/** CHECK (expresión): the tree validates it and the text is what the model keeps. */
function readCheck( cursor ) {
    cursor.expectWord( 'CHECK' );
    cursor.expectSymbol( '(', 'después de CHECK' );

    const start = cursor.position;
    const expr = readExpression( cursor );
    const text = cursor.slice( start, cursor.previousEnd );

    cursor.expectSymbol( ')', 'al cerrar CHECK' );
    return {expr, text};
    }

function readColumnDefinition( cursor ) {
    const start = cursor.position;
    const column = {
        name: readName( cursor, 'el nombre del campo' ),
        dataType: null,
        notNull: false,
        defaultText: null,
        primary: false,
        unique: false,
        references: null,
        check: null,
        start
        };

    column.dataType = readDataType( cursor );

    for (;;) {
        if (cursor.isWord( 'NOT' ) && cursor.peek().upper === 'NULL') {
            cursor.next();
            cursor.next();
            column.notNull = true;
            }
        else if (cursor.acceptWord( 'NULL' )) {
            column.notNull = false;
            }
        else if (cursor.acceptWord( 'DEFAULT' )) {
            const defaultStart = cursor.position;

            readUnary( cursor );
            column.defaultText = cursor.slice( defaultStart, cursor.previousEnd );
            }
        else if (cursor.isWord( 'PRIMARY' )) {
            cursor.next();
            cursor.expectWord( 'KEY', 'después de PRIMARY' );
            column.primary = true;
            }
        else if (cursor.acceptWord( 'UNIQUE' )) {
            column.unique = true;
            }
        else if (cursor.isWord( 'REFERENCES' )) {
            column.references = readReferences( cursor );
            }
        else if (cursor.isWord( 'CHECK' )) {
            column.check = readCheck( cursor );
            }
        else if (cursor.isWord( 'CONSTRAINT' )) {
            cursor.next();
            readName( cursor, 'el nombre de la restricción' );
            }
        else {
            return column;
            }
        }
    }

function readTableConstraint( cursor ) {
    const start = cursor.position;
    const name = cursor.acceptWord( 'CONSTRAINT' ) ? readName( cursor, 'el nombre de la restricción' ) : null;

    if (cursor.isWord( 'PRIMARY' )) {
        cursor.next();
        cursor.expectWord( 'KEY', 'después de PRIMARY' );
        return {kind: 'primary', name, columns: readNameList( cursor, 'campos de la clave' ), start};
        }

    if (cursor.acceptWord( 'UNIQUE' )) {
        return {kind: 'unique', name, columns: readNameList( cursor, 'campos únicos' ), start};
        }

    if (cursor.isWord( 'FOREIGN' )) {
        cursor.next();
        cursor.expectWord( 'KEY', 'después de FOREIGN' );

        const columns = readNameList( cursor, 'campos de la clave ajena' );

        return {kind: 'foreign', name, columns, references: readReferences( cursor ), start};
        }

    if (cursor.isWord( 'CHECK' )) {
        return {kind: 'check', name, check: readCheck( cursor ), start};
        }

    return cursor.fail( 'Se esperaba PRIMARY KEY, UNIQUE, FOREIGN KEY o CHECK' );
    }

function isConstraintStart( cursor ) {
    return cursor.isWord( 'CONSTRAINT', 'PRIMARY', 'FOREIGN', 'CHECK' )
        || cursor.isWord( 'UNIQUE' ) && cursor.peek().kind === 'symbol' && cursor.peek().value === '(';
    }

function readCreateTable(
        cursor,
        start
        ) {
    const name = readName( cursor, 'el nombre de la tabla' );
    const columns = [];
    const constraints = [];

    cursor.expectSymbol( '(', 'antes de la lista de campos' );

    do {
        if (isConstraintStart( cursor )) {
            constraints.push( readTableConstraint( cursor ) );
            }
        else {
            columns.push( readColumnDefinition( cursor ) );
            }
        }
    while (cursor.acceptSymbol( ',' ));

    cursor.expectSymbol( ')', 'al cerrar la lista de campos' );
    return node( 'create-table', start, {name, columns, constraints} );
    }

function readAlterTable(
        cursor,
        start
        ) {
    const table = readName( cursor, 'el nombre de la tabla' );

    if (cursor.acceptWord( 'ADD' )) {
        if (isConstraintStart( cursor )) {
            return node( 'alter-table', start, {table, action: {kind: 'add-constraint', constraint: readTableConstraint( cursor )}} );
            }

        cursor.acceptWord( 'COLUMN' );
        return node( 'alter-table', start, {table, action: {kind: 'add-column', column: readColumnDefinition( cursor )}} );
        }

    if (cursor.acceptWord( 'DROP' )) {
        if (cursor.acceptWord( 'CONSTRAINT' )) {
            return node( 'alter-table', start, {table, action: {kind: 'drop-constraint', name: readName( cursor, 'el nombre de la restricción' )}} );
            }

        cursor.acceptWord( 'COLUMN' );
        return node( 'alter-table', start, {table, action: {kind: 'drop-column', name: readName( cursor, 'el nombre del campo' )}} );
        }

    if (cursor.acceptWord( 'ALTER' )) {
        cursor.acceptWord( 'COLUMN' );
        return node( 'alter-table', start, {table, action: {kind: 'alter-column', column: readColumnDefinition( cursor )}} );
        }

    return cursor.fail( 'Se esperaba ADD, DROP o ALTER COLUMN' );
    }

function readCreate( cursor ) {
    const start = cursor.expectWord( 'CREATE' ).start;

    if (cursor.acceptWord( 'TABLE' )) {
        return readCreateTable( cursor, start );
        }

    const unique = Boolean( cursor.acceptWord( 'UNIQUE' ) );

    if (cursor.acceptWord( 'INDEX' )) {
        const name = readName( cursor, 'el nombre del índice' );

        cursor.expectWord( 'ON', 'después del nombre del índice' );

        const table = readName( cursor, 'el nombre de la tabla' );

        return node( 'create-index', start, {name, table, unique, columns: readNameList( cursor, 'campos del índice' )} );
        }

    if (!unique && cursor.acceptWord( 'VIEW' )) {
        const name = readName( cursor, 'el nombre de la consulta' );

        cursor.expectWord( 'AS', 'después del nombre de la consulta' );

        const query = readQuery( cursor );

        return node( 'create-view', start, {name, query} );
        }

    return cursor.fail( 'Se esperaba TABLE, INDEX o VIEW después de CREATE' );
    }

function readDrop( cursor ) {
    const start = cursor.expectWord( 'DROP' ).start;

    if (cursor.acceptWord( 'TABLE' )) {
        return node( 'drop-table', start, {name: readName( cursor, 'el nombre de la tabla' )} );
        }

    if (cursor.acceptWord( 'VIEW' )) {
        return node( 'drop-view', start, {name: readName( cursor, 'el nombre de la consulta' )} );
        }

    if (cursor.acceptWord( 'INDEX' )) {
        const name = readName( cursor, 'el nombre del índice' );

        cursor.expectWord( 'ON', 'después del nombre del índice' );
        return node( 'drop-index', start, {name, table: readName( cursor, 'el nombre de la tabla' )} );
        }

    return cursor.fail( 'Se esperaba TABLE, VIEW o INDEX después de DROP' );
    }

/* ---------- statements and scripts ---------- */

function readStatement( cursor ) {
    if (cursor.isWord( 'SELECT' )) {
        return readQuery( cursor );
        }

    if (cursor.isWord( 'INSERT' )) {
        return readInsert( cursor );
        }

    if (cursor.isWord( 'UPDATE' )) {
        return readUpdate( cursor );
        }

    if (cursor.isWord( 'DELETE' )) {
        return readDelete( cursor );
        }

    if (cursor.isWord( 'CREATE' )) {
        return readCreate( cursor );
        }

    if (cursor.isWord( 'ALTER' )) {
        const start = cursor.next().start;

        cursor.expectWord( 'TABLE', 'después de ALTER' );
        return readAlterTable( cursor, start );
        }

    if (cursor.isWord( 'DROP' )) {
        return readDrop( cursor );
        }

    return cursor.fail( 'Se esperaba SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER o DROP' );
    }

/**
 * Every statement of the text, with the piece of text it came from. A
 * syntax error stops the reading and names the place where it happened.
 */
export function parseScript( text ) {
    const cursor = sqlCursor( String( text ) );
    const statements = [];

    for (;;) {
        while (cursor.acceptSymbol( ';' )) {
            // Empty statements between semicolons are allowed.
            }

        if (cursor.token.kind === 'end') {
            return statements;
            }

        const start = cursor.position;
        const statement = readStatement( cursor );

        statement.source = cursor.slice( start, cursor.previousEnd );

        if (!cursor.isSymbol( ';' ) && cursor.token.kind !== 'end') {
            cursor.fail( 'Se esperaba «;» o el final de la instrucción' );
            }

        statements.push( statement );
        }
    }

/** One query, as a view keeps it: SELECT … (a trailing semicolon is allowed). */
export function parseQuery( text ) {
    const statements = parseScript( text );

    if (statements.length !== 1 || !['select', 'union'].includes( statements[0].type )) {
        throw new SqlError( 'Se esperaba una sola consulta SELECT.', 0 );
        }

    return statements[0];
    }

/** One expression alone, as a CHECK or a DEFAULT keeps it in the model. */
export function parseExpression( text ) {
    const cursor = sqlCursor( String( text ) );
    const expression = readExpression( cursor );

    if (cursor.token.kind !== 'end') {
        cursor.fail( 'Se esperaba el final de la expresión' );
        }

    return expression;
    }
