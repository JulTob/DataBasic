// Prefix notation keeps operator arguments editable by keyboard as well as by the palette.
export const algebraOperators = [
    {id: 'select', label: 'Selección', symbol: 'σ', template: 'σ[campo = valor](Tabla)'},
    {id: 'project', label: 'Proyección', symbol: 'π', template: 'π[campo](Tabla)'},
    {id: 'join', label: 'Reunión por condición', symbol: '⋈', template: '⋈[A.clave = B.referencia](A, B)'},
    {id: 'natural', label: 'Reunión natural', symbol: '⋈', template: '⋈(A, B)'},
    {id: 'rename', label: 'Renombrar', symbol: 'ρ', template: 'ρ[nuevo ← campo](Tabla)'},
    {id: 'union', label: 'Unión', symbol: '∪', template: '∪(A, B)'},
    {id: 'intersect', label: 'Intersección', symbol: '∩', template: '∩(A, B)'},
    {id: 'difference', label: 'Diferencia', symbol: '−', template: '−(A, B)'},
    {id: 'product', label: 'Producto cartesiano', symbol: '×', template: '×(A, B)'},
    {id: 'divide', label: 'División', symbol: '÷', template: '÷(R, S)'},
    {id: 'left', label: 'Reunión externa izquierda', symbol: '⟕', template: '⟕[A.clave = B.referencia](A, B)'},
    {id: 'right', label: 'Reunión externa derecha', symbol: '⟖', template: '⟖[A.clave = B.referencia](A, B)'},
    {id: 'full', label: 'Reunión externa completa', symbol: '⟗', template: '⟗[A.clave = B.referencia](A, B)'},
    {id: 'group', label: 'Agrupación', symbol: 'ℱ', template: 'ℱ[campo; COUNT(*) AS total](Tabla)'}
    ];

export function algebraIdentifier( name ) {
    return '"' + String( name ).replaceAll( '"', '""' ) + '"';
    }

function algebraDomain( type ) {
    const family = String( type ).split( '(' )[0].toUpperCase();

    if (/^(INT|SMALLINT|INTEGER|BIGINT|FLOAT|REAL|DOUBLE|DECIMAL|NUMBER|NUMERIC|CURRENCY)$/.test( family )) {
        return 'número';
        }
    if (/CHAR|TEXT|MEMO/.test( family )) {
        return 'texto';
        }
    return family;
    }

function algebraTokens( input ) {
    if (typeof input !== 'string' || input.length > 16000) {
        throw new Error( 'La expresión debe tener como máximo 16 000 caracteres.' );
        }

    const pattern = /\s+|"(?:[^"]|"")*"|'(?:[^']|'')*'|<=|>=|<>|!=|[σπρℱγ⋈⟕⟖⟗∪∩−×÷←(),;.*\[\]=<>¬∧∨≠≤≥]|[+-]?(?:\d+\.\d+|\d+)(?:[eE][+-]?\d+)?|[\p{L}_][\p{L}\p{N}_]*/guy;
    const tokens = [];
    let position = 0;

    while (position < input.length) {
        pattern.lastIndex = position;
        const match = pattern.exec( input );
        if (!match) {
            throw new Error( 'Símbolo desconocido en la posición ' + (position + 1) + '.' );
            }
        position = pattern.lastIndex;
        if (!/^\s/.test( match[0] )) {
            tokens.push( match[0] );
            }
        }
    return tokens;
    }

class AlgebraTokens {
    constructor( tokens ) {
        this.tokens = tokens;
        this.index = 0;
        }

    peek() {
        return this.tokens[this.index];
        }

    take() {
        return this.tokens[this.index++];
        }

    accept( value ) {
        if (this.peek()?.toUpperCase() !== value.toUpperCase()) {
            return false;
            }
        this.take();
        return true;
        }

    expect( value ) {
        if (!this.accept( value )) {
            throw new Error( 'Se esperaba «' + value + '»; se encontró «' + (this.peek() ?? 'fin') + '».' );
            }
        }

    name() {
        const value = this.take();
        if (value?.startsWith( '"' )) {
            return value.slice( 1, -1 ).replaceAll( '""', '"' );
            }
        if (!value || !/^[\p{L}_][\p{L}\p{N}_]*$/u.test( value )) {
            throw new Error( 'Se esperaba el nombre de una tabla o un campo.' );
            }
        return value;
        }

    reference() {
        const name = this.name();
        return this.accept( '.' ) ? [name, this.name()] : [name];
        }

    end() {
        if (this.peek() !== undefined) {
            throw new Error( 'Comprueba la expresión junto a «' + this.peek() + '».' );
            }
        }
    }

function algebraField( name, type, origin ) {
    return {name, type, origins: origin ? [[origin, name]] : []};
    }

function algebraSameName( a, b ) {
    return a.toLowerCase() === b.toLowerCase();
    }

function algebraColumn( fields, ref ) {
    const matches = fields.filter( field => {
        if (ref.length === 1) {
            return algebraSameName( field.name, ref[0] )
                || field.origins.some( ([, name]) => algebraSameName( name, ref[0] ) );
            }
        return field.origins.some( ([table, name]) =>
            algebraSameName( table, ref[0] ) && algebraSameName( name, ref[1] )
            );
        } );

    if (matches.length !== 1) {
        throw new Error( (matches.length ? 'Campo ambiguo: ' : 'Campo desconocido: ') + ref.join( '.' ) + '.' );
        }
    return matches[0];
    }

function algebraSource( relation, alias = 'r' ) {
    return '(' + relation.sql + ') AS ' + alias;
    }

function algebraScope( relation, alias = 'r' ) {
    return relation.fields.map( field => ({
        ...field,
        expr: alias + '.' + algebraIdentifier( field.name )
        }) );
    }

function algebraNamedList( fields ) {
    return fields.map( field => field.expr + ' AS ' + algebraIdentifier( field.name ) ).join( ', ' );
    }

function algebraReadTable( ref, model ) {
    const name = ref.at( -1 );
    const matches = model.tables.filter( item =>
        item.kind === 'entity' && algebraSameName( item.name, name )
            && (ref.length === 1 || algebraSameName( item.namespace || 'main', ref[0] ))
        );
    if (matches.length > 1) {
        throw new Error( 'Elige la tabla con su espacio de nombres: ' + name + '.' );
        }
    const table = matches[0];
    if (!table || !table.columns.length) {
        throw new Error( 'Tabla sin campos o desconocida: ' + name + '.' );
        }
    return {
        sql: 'SELECT DISTINCT ' + table.columns.map( column => algebraIdentifier( column.name ) ).join( ', ' )
            + ' FROM ' + [table.namespace, table.name].filter( Boolean ).map( algebraIdentifier ).join( '.' ),
        fields: table.columns.map( column => algebraField( column.name, algebraDomain( column.type ), table.name ) )
        };
    }

function algebraPredicate( tokens, fields ) {
    const comparisons = new Map( [
        ['=', '='], ['≠', '<>'], ['!=', '<>'], ['<>', '<>'], ['>', '>'], ['<', '<'],
        ['>=', '>='], ['<=', '<='], ['≥', '>='], ['≤', '<='], ['LIKE', 'LIKE']
        ] );

    function operand() {
        const token = tokens.peek();
        if (token?.startsWith( "'" ) || /^[+-]?\d/.test( token ?? '' )) {
            return tokens.take();
            }
        if (tokens.accept( 'NULL' )) {
            return 'NULL';
            }
        return algebraColumn( fields, tokens.reference() ).expr;
        }

    function comparison( depth ) {
        if (depth > 45) {
            throw new Error( 'La condición tiene demasiados niveles.' );
            }
        if (tokens.accept( 'NOT' ) || tokens.accept( '¬' )) {
            return '(NOT ' + comparison( depth + 1 ) + ')';
            }
        if (tokens.accept( '(' )) {
            const nested = disjunction( depth + 1 );
            tokens.expect( ')' );
            return '(' + nested + ')';
            }

        const left = operand();
        if (tokens.accept( 'IS' )) {
            const negated = tokens.accept( 'NOT' );
            tokens.expect( 'NULL' );
            return left + (negated ? ' IS NOT NULL' : ' IS NULL');
            }
        const operator = comparisons.get( tokens.take()?.toUpperCase() );
        if (!operator) {
            throw new Error( 'Indica una comparación entre dos valores o IS NULL.' );
            }
        return left + ' ' + operator + ' ' + operand();
        }

    function conjunction( depth ) {
        const parts = [comparison( depth )];
        while (tokens.accept( 'AND' ) || tokens.accept( '∧' )) {
            parts.push( comparison( depth ) );
            }
        return parts.join( ' AND ' );
        }

    function disjunction( depth ) {
        const parts = [conjunction( depth )];
        while (tokens.accept( 'OR' ) || tokens.accept( '∨' )) {
            parts.push( conjunction( depth ) );
            }
        return parts.join( ' OR ' );
        }

    const sql = disjunction( 0 );
    tokens.end();
    return sql;
    }

function algebraHeading( fields ) {
    const seen = new Set();
    for (const field of fields) {
        const key = field.name.toLowerCase();
        if (seen.has( key )) {
            throw new Error( 'Campo repetido en el resultado: ' + field.name + '. Usa ρ para renombrarlo.' );
            }
        seen.add( key );
        }
    return fields;
    }

function algebraProjection( args, relation ) {
    const scope = algebraScope( relation );
    const fields = [];
    do {
        fields.push( algebraColumn( scope, args.reference() ) );
        } while (args.accept( ',' ));
    args.end();
    algebraHeading( fields );
    return {fields, sql: 'SELECT DISTINCT ' + algebraNamedList( fields ) + ' FROM ' + algebraSource( relation )};
    }

function algebraRename( args, relation ) {
    const name = args.name();
    if (!args.accept( '←' )) {
        args.end();
        return {...relation, fields: relation.fields.map( field => ({
            ...field, origins: [[name, field.name]]
            }) )};
        }
    const scope = algebraScope( relation );
    const from = algebraColumn( scope, args.reference() );
    args.end();
    const fields = scope.map( field => field === from
        ? {...field, name, origins: field.origins.map( ([table]) => [table, name] )} : field );
    algebraHeading( fields );
    return {fields, sql: 'SELECT ' + algebraNamedList( fields ) + ' FROM ' + algebraSource( relation )};
    }

function algebraGrouping( args, relation ) {
    const source = algebraScope( relation );
    const groups = [];

    if (!args.accept( ';' )) {
        do {
            groups.push( algebraColumn( source, args.reference() ) );
            } while (args.accept( ',' ));
        args.expect( ';' );
        }

    const fields = [...groups];
    do {
        const fn = args.name().toUpperCase();
        if (!['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'].includes( fn )) {
            throw new Error( 'Agregación desconocida: ' + fn + '.' );
            }
        args.expect( '(' );
        const field = args.accept( '*' ) ? null : algebraColumn( source, args.reference() );
        if (!field && fn !== 'COUNT') {
            throw new Error( fn + ' requiere el nombre de un campo.' );
            }
        if (['SUM', 'AVG'].includes( fn ) && field.type !== 'número') {
            throw new Error( fn + ' requiere un campo numérico.' );
            }
        args.expect( ')' );
        args.expect( 'AS' );
        fields.push( {
            ...algebraField( args.name(), ['MIN', 'MAX'].includes( fn ) ? field.type : 'número' ),
            expr: fn + '(' + (field?.expr ?? '*') + ')'
            } );
        } while (args.accept( ',' ));
    args.end();
    algebraHeading( fields );
    const groupBy = groups.length ? ' GROUP BY ' + groups.map( field => field.expr ).join( ', ' ) : '';
    return {fields, sql: 'SELECT ' + algebraNamedList( fields ) + ' FROM ' + algebraSource( relation ) + groupBy};
    }

function algebraSet( operation, a, b ) {
    if (a.fields.length !== b.fields.length || a.fields.some( (field, i) => field.type !== b.fields[i].type )) {
        throw new Error( 'Los operandos de conjuntos requieren igual número de campos y dominios compatibles en el mismo orden.' );
        }
    return {
        fields: a.fields,
        sql: 'SELECT * FROM ' + algebraSource( a ) + ' ' + operation + ' SELECT * FROM ' + algebraSource( b )
        };
    }

function algebraJoin( symbol, args, a, b ) {
    const left = algebraScope( a, 'a' );
    const right = algebraScope( b, 'b' );
    const scope = [...left, ...right];
    const natural = !args.peek() && symbol !== '×';
    const common = natural ? left.filter( l => right.some( r => algebraSameName( l.name, r.name ) ) ) : [];
    const pairs = common.map( l => [l, right.find( r => algebraSameName( l.name, r.name ) )] );
    if (pairs.some( ([l, r]) => l.type !== r.type )) {
        throw new Error( 'Los campos comunes de la reunión natural deben tener dominios compatibles.' );
        }
    const family = {'×': 'CROSS', '⋈': 'INNER', '⟕': 'LEFT', '⟖': 'RIGHT', '⟗': 'FULL'}[symbol];
    let condition = '';
    if (symbol === '×') {
        args.end();
        }
    else if (natural) {
        condition = pairs.map( ([l, r]) => l.expr + ' = ' + r.expr ).join( ' AND ' ) || '1 = 1';
        }
    else {
        condition = algebraPredicate( args, scope );
        }

    const fields = [];
    for (const field of scope) {
        const pair = pairs.find( ([l, r]) => field === l || field === r );
        if (pair) {
            if (field === pair[0]) {
                fields.push( {
                    ...field,
                    expr: 'COALESCE(' + pair[0].expr + ', ' + pair[1].expr + ')',
                    origins: [...pair[0].origins, ...pair[1].origins]
                    } );
                }
            continue;
            }
        const collision = scope.some( other => field !== other && algebraSameName( field.name, other.name ) );
        // A qualified heading permits subsequent projections on either side of a theta join.
        const origin = field.origins[0]?.[0];
        const name = collision && origin ? origin + '.' + field.name : field.name;
        fields.push( {...field, name} );
        }
    algebraHeading( fields );
    return {
        fields,
        sql: 'SELECT DISTINCT ' + algebraNamedList( fields ) + ' FROM ' + algebraSource( a, 'a' )
            + ' ' + family + ' JOIN ' + algebraSource( b, 'b' ) + (condition ? ' ON ' + condition : '')
        };
    }

function algebraDivision( a, b ) {
    const dividend = algebraScope( a, 'a' );
    const checks = b.fields.map( divisor => {
        const common = dividend.find( field => algebraSameName( field.name, divisor.name ) );
        if (!common || common.type !== divisor.type) {
            throw new Error( 'Cada campo del divisor debe aparecer con el mismo nombre y dominio en el dividendo.' );
            }
        return common;
        } );
    const quotient = dividend.filter( field => !checks.includes( field ) );
    if (!quotient.length) {
        throw new Error( 'El dividendo necesita al menos un campo que no esté en el divisor.' );
        }
    const sameCandidate = quotient.map( f => 'd.' + algebraIdentifier( f.name ) + ' IS ' + f.expr );
    const sameDivisor = checks.map( (f, i) =>
        'd.' + algebraIdentifier( f.name ) + ' IS b.' + algebraIdentifier( b.fields[i].name )
        );
    return {
        fields: quotient,
        sql: 'SELECT DISTINCT ' + algebraNamedList( quotient ) + ' FROM ' + algebraSource( a, 'a' )
            + ' WHERE NOT EXISTS (SELECT 1 FROM ' + algebraSource( b, 'b' )
            + ' WHERE NOT EXISTS (SELECT 1 FROM ' + algebraSource( a, 'd' )
            + ' WHERE ' + [...sameCandidate, ...sameDivisor].join( ' AND ' ) + '))'
        };
    }

function algebraExpression( reader, model, depth ) {
    if (depth > 32) {
        throw new Error( 'La expresión tiene demasiados niveles.' );
        }
    const symbol = reader.peek();
    if (!algebraOperators.some( op => op.symbol === symbol ) && symbol !== 'γ') {
        return algebraReadTable( reader.reference(), model );
        }
    reader.take();
    const parameters = [];
    if (reader.accept( '[' )) {
        while (reader.peek() !== ']' && reader.peek() !== undefined) {
            parameters.push( reader.take() );
            }
        reader.expect( ']' );
        }
    const args = new AlgebraTokens( parameters );
    reader.expect( '(' );
    const left = algebraExpression( reader, model, depth + 1 );
    if (left.sql.length > 32000) {
        throw new Error( 'Divide la consulta en expresiones más pequeñas.' );
        }
    const binary = '⋈⟕⟖⟗∪∩−×÷'.includes( symbol );
    let right;
    if (binary) {
        reader.expect( ',' );
        right = algebraExpression( reader, model, depth + 1 );
        }
    reader.expect( ')' );
    if (symbol === 'σ') {
        const where = algebraPredicate( args, algebraScope( left ) );
        return {...left, sql: 'SELECT * FROM ' + algebraSource( left ) + ' WHERE ' + where};
        }
    if (symbol === 'π') {
        return algebraProjection( args, left );
        }
    if (symbol === 'ρ') {
        return algebraRename( args, left );
        }
    if (symbol === 'γ' || symbol === 'ℱ') {
        return algebraGrouping( args, left );
        }
    if ('⋈⟕⟖⟗×'.includes( symbol )) {
        return algebraJoin( symbol, args, left, right );
        }
    args.end();
    if (symbol === '÷') {
        return algebraDivision( left, right );
        }
    return algebraSet( {'∪': 'UNION', '∩': 'INTERSECT', '−': 'EXCEPT'}[symbol], left, right );
    }

/** Translates a typed teaching expression; only known operators and model identifiers reach SQL. */
export function compileAlgebra( text, model ) {
    const reader = new AlgebraTokens( algebraTokens( text ) );
    const relation = algebraExpression( reader, model, 0 );
    reader.end();
    if (relation.sql.length > 64000) {
        throw new Error( 'Divide la consulta en expresiones más pequeñas.' );
        }
    return relation.sql;
    }
