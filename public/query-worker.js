// Each worker owns one disposable SQLite database; the caller can interrupt
// an expensive join without blocking the interface or changing the datasheet.
if (typeof initSqlJs === 'undefined') {
    importScripts( './vendor/sql-wasm-inline.js' );
    }

function quoteQueryName( name ) {
    return '"' + name.replaceAll( '"', '""' ) + '"';
    }

function qualifiedQueryName( table ) {
    return [table.namespace, table.name].filter( Boolean ).map( quoteQueryName ).join( '.' );
    }

function queryAffinity( type ) {
    const family = type.trim().toUpperCase().split( '(' )[0].trim();
    if (['BOOLEAN', 'BOOL'].includes( family )) {
        return 'BOOLEAN';
        }
    if (['NUMBER', 'DECIMAL', 'NUMERIC', 'INTEGER', 'INT', 'SMALLINT', 'BIGINT',
            'REAL', 'FLOAT', 'DOUBLE'].includes( family )) {
        return 'NUMERIC';
        }

    // Dates use the datasheet's ISO text. Text identifiers keep leading zeroes.
    return 'TEXT';
    }

function queryCell(
        value,
        affinity
        ) {
    if (value === null || String( value ).trim() === '') {
        return null;
        }
    if (affinity === 'BOOLEAN') {
        const normalized = String( value ).trim().toLowerCase();
        if (['sí', 'si', 'verdadero', 'true', '1'].includes( normalized )) {
            return 1;
            }
        if (['no', 'falso', 'false', '0'].includes( normalized )) {
            return 0;
            }
        }

    // SQLite applies NUMERIC affinity directly to the original decimal text.
    return String( value );
    }

function populateQueryTable(
        database,
        table
        ) {
    if (!table.columns.length) {
        return;
        }
    const name = qualifiedQueryName( table );
    const affinities = table.columns.map( field => queryAffinity( field.type ) );
    const fields = table.columns.map(
            (field, index) => quoteQueryName( field.name ) + ' ' + affinities[index]
            );
    database.run( 'CREATE TABLE ' + name + ' (' + fields.join( ', ' ) + ')' );

    const places = table.columns.map( () => '?' ).join( ', ' );
    const insert = database.prepare( 'INSERT INTO ' + name + ' VALUES (' + places + ')' );
    try {
        for (const row of table.rows) {
            insert.run( row.map( (value, index) => queryCell( value, affinities[index] ) ) );
            }
        }
    finally {
        insert.free();
        }
    }

function prepareQuerySnapshot(
        database,
        tables
        ) {
    const namespaces = new Set( tables.map( table => table.namespace ).filter( Boolean ) );
    for (const name of namespaces) {
        if (!['temp', 'main'].includes( name.toLowerCase() )) {
            database.run( "ATTACH DATABASE ':memory:' AS " + quoteQueryName( name ) );
            }
        }

    for (const table of tables.filter( item => item.kind === 'entity' )) {
        populateQueryTable( database, table );
        }

    const unfinished = new Map();
    for (const view of tables.filter( item => item.kind === 'view' )) {
        if (!view.definition?.trim()) {
            unfinished.set( view.name.toLowerCase(), 'falta la definición SQL' );
            continue;
            }
        try {
            // prepare runs only the CREATE VIEW statement, even when a saved
            // definition contains a semicolon followed by another statement.
            const create = database.prepare(
                    'CREATE VIEW ' + qualifiedQueryName( view ) + ' AS ' + view.definition
                    );
            try {
                create.step();
                }
            finally {
                create.free();
                }
            }
        catch (error) {
            unfinished.set( view.name.toLowerCase(), error.message );
            }
        }

    database.run( 'PRAGMA query_only = ON' );
    return unfinished;
    }

function displayedQueryValue( value ) {
    if (typeof value === 'bigint') {
        return value < BigInt( Number.MIN_SAFE_INTEGER ) || value > BigInt( Number.MAX_SAFE_INTEGER )
            ? String( value )
            : Number( value );
        }
    if (value instanceof Uint8Array) {
        return '0x' + Array.from( value, byte => byte.toString( 16 ).padStart( 2, '0' ) ).join( '' );
        }

    return value;
    }

function evaluateReadQuery(
        database,
        sql
        ) {
    const source = sql.replace( /^(?:\s+|--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)+/, '' );
    if (!/^(SELECT|WITH)\b/i.test( source )) {
        throw new Error( 'Escribe una única consulta de lectura SELECT o WITH.' );
        }

    const result = {columns: [], rows: []};
    let size = 0;
    for (const statement of database.iterateStatements( source )) {
        if (result.columns.length) {
            throw new Error( 'Ejecuta una sola consulta cada vez.' );
            }
        result.columns = statement.getColumnNames();
        if (!result.columns.length) {
            throw new Error( 'La consulta debe devolver columnas.' );
            }
        while (statement.step()) {
            const values = statement.get( null, {useBigInt: true} );
            size += values.reduce( (sum, value) => sum + (value?.length ?? 8), 0 );
            if (result.rows.length >= 5000 || size > 4_000_000) {
                throw new Error( 'Resultado demasiado grande. Reduce las filas con WHERE o LIMIT.' );
                }
            result.rows.push( values.map( displayedQueryValue ) );
            }
        }

    return result;
    }

self.onmessage = async ({data}) => {
    let database;
    try {
        const engine = await initSqlJs();
        self.postMessage( {ready: true} );
        database = new engine.Database();
        database.run( 'PRAGMA hard_heap_limit = 67108864' );
        const unfinished = prepareQuerySnapshot( database, data.tables );
        try {
            self.postMessage( {result: evaluateReadQuery( database, data.sql )} );
            }
        catch (error) {
            const name = /^no such table: (.+)$/.exec( error.message )?.[1];
            const reason = name && unfinished.get( name.toLowerCase() );
            if (reason) {
                throw new Error( 'Revisa la vista ' + name + ': ' + reason );
                }
            throw error;
            }
        }
    catch (error) {
        self.postMessage( {error: error.message || String( error )} );
        }
    finally {
        database?.close();
        }
    };
