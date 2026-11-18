/*
 * ACE stores a saved SELECT as typed rows, rather than as an SQL string.
 * Accept one local SELECT, with scalar expressions, optional filters, grouping
 * and explicit equijoins. Refuse unrecognised clauses instead of changing them.
 */
const token = /\s+|'(?:''|[^'])*'|"(?:""|[^"])*"|\[(?:\]\]|[^\]])+\]|[\p{L}_][\p{L}\p{N}_]*|\d+(?:\.\d+)?|<>|>=|<=|[().,=*+\-/<>:&]/guy;
const name = /^(?:[\p{L}_][\p{L}\p{N}_]*|\[(?:\]\]|[^\]])+\])$/u;
const unquote = s => s.startsWith( '[' ) ? s.slice( 1, -1 ).replaceAll( ']]', ']' ) : s;
const upper = t => t?.value.toUpperCase();
const keywords = new Set( 'SELECT FROM WHERE GROUP BY HAVING ORDER UNION PARAMETERS TRANSFORM INTO IN JOIN ON DISTINCT DISTINCTROW TOP'.split( ' ' ) );

/** Visio's ACE ODBC driver cannot resolve the Access application function Nz. */
function odbcExpression(
        source,
        tokens
        ) {
    let start = tokens[0].start;
    let result = '';

    for (let i = 0; i < tokens.length; i++) {
        if (upper( tokens[i] ) !== 'NZ' || tokens[i - 1]?.value === '.') continue;
        const value = offset => upper( tokens[i + offset] );
        if (value( 1 ) !== '(' || value( 2 ) !== 'SUM' || value( 3 ) !== '(') continue;
        if (!name.test( tokens[i + 4]?.value ?? '' )) continue;

        let close = 5;
        if (value( close ) === '.' && name.test( tokens[i + close + 1]?.value ?? '' )) close += 2;
        if (value( close ) !== ')' || value( close + 1 ) !== ','
                || value( close + 2 ) !== '0' || value( close + 3 ) !== ')') continue;

        // Repeating a sum of a column is safe; leave arbitrary expressions untouched.
        const sum = source.slice( tokens[i + 2].start, tokens[i + close].end );
        result += source.slice( start, tokens[i].start ) + `IIf(${sum} Is Null, 0, ${sum})`;
        i += close + 3;
        start = tokens[i].end;
        }
    return result + source.slice( start, tokens.at( -1 ).end );
    }

export function selectRows( sql, tableNames ) {
    function invalid() {
        throw new Error( 'Esta consulta no pertenece al subconjunto SELECT local admitido por ACCDB. Use la exportación VBA/DAO.' );
        }
    const source = sql.trim().replace( /;$/, '' );
    const tokens = [];
    token.lastIndex = 0;
    while (token.lastIndex < source.length) {
        const match = token.exec( source );
        if (!match) invalid();
        if (match[0].trim()) tokens.push( {value: match[0], start: match.index, end: token.lastIndex} );
        }
    const rows = [];
    let pos = 0;
    const peek = () => upper( tokens[pos] );
    const take = value => peek() === value && (++pos, true);
    function need( value ) { if (!take( value )) invalid(); }
    function identifier() {
        const t = tokens[pos++];
        if (!t || !name.test( t.value ) || keywords.has( upper( t ) )) invalid();
        return unquote( t.value );
        }
    const raw = (begin, end) => source.slice( tokens[begin].start, tokens[end - 1].end );
    function expression( stops ) {
        const start = pos;
        let depth = 0;
        while (pos < tokens.length) {
            const word = peek();
            if (!depth && stops.includes( word )) break;
            if (['SELECT', 'FROM', 'INTO', 'UNION', 'PARAMETERS', 'TRANSFORM', 'ORDER', 'GROUP', 'HAVING', 'WHERE', 'AS'].includes( word )) invalid();
            if (word === '(') depth++;
            if (word === ')' && --depth < 0) invalid();
            pos++;
            }
        if (depth || pos === start) invalid();
        return odbcExpression( source, tokens.slice( start, pos ) );
        }
    function row( attribute, fields = {} ) {rows.push( {attribute, ...fields} );}
    need( 'SELECT' );
    row( 0, {flag: 0} );
    row( 1, {flag: 1} );
    const distinct = take( 'DISTINCT' );
    if (['TOP', 'DISTINCTROW'].includes( peek() )) invalid();
    const star = take( '*' );
    row( 3, {flag: (distinct ? 2 : 0) + (star ? 1 : 0)} );
    if (!star) {
        do {
            const expr = expression( [',', 'FROM', 'AS'] );
            const alias = take( 'AS' ) ? identifier() : undefined;
            row( 6, {expr, name1: alias, flag: 0} );
            } while (take( ',' ));
        }
    need( 'FROM' );
    const aliases = new Set();
    const local = new Map( tableNames.map( t => [t.toUpperCase(), t] ) );
    function table() {
        if (take( '(' )) {
            const result = joins();
            need( ')' );
            return result;
            }
        const actual = local.get( identifier().toUpperCase() );
        if (!actual) invalid();
        const alias = take( 'AS' ) ? identifier() : undefined;
        const key = (alias || actual).toUpperCase();
        if (aliases.has( key )) invalid();
        aliases.add( key );
        row( 5, {name1: actual, name2: alias} );
        return {names: new Set( [key] ), inner: false};
        }
    function qualified() {
        const alias = identifier();
        need( '.' );
        identifier();
        return alias;
        }
    function joins() {
        let left = table();
        while (['INNER', 'LEFT', 'RIGHT'].includes( peek() )) {
            const type = peek();
            pos++;
            need( 'JOIN' );
            const right = table();
            if (type !== 'INNER' && (left.inner || right.inner)) invalid();
            need( 'ON' );
            const start = pos;
            let first = qualified();
            need( '=' );
            let second = qualified();
            if (!left.names.has( first.toUpperCase() )) [first, second] = [second, first];
            if (!left.names.has( first.toUpperCase() ) || !right.names.has( second.toUpperCase() )) invalid();
            row( 7, {name1: first, name2: second, expr: raw( start, pos ), flag: {INNER: 1, LEFT: 2, RIGHT: 3}[type]} );
            left = {names: new Set( [...left.names, ...right.names] ), inner: left.inner || right.inner || type === 'INNER'};
            }
        return left;
        }
    joins();
    if (take( 'WHERE' )) row( 8, {expr: expression( ['GROUP', 'HAVING'] )} );
    if (take( 'GROUP' )) {
        need( 'BY' );
        do {row( 9, {expr: expression( [',', 'HAVING'] ), flag: 0} );} while (take( ',' ));
        }
    if (take( 'HAVING' )) row( 10, {expr: expression( [] )} );
    if (pos !== tokens.length) invalid();
    row( 255 );
    return rows;
    }
