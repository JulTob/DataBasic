import {tableRows} from './model.js';
import {algebraIdentifier} from './query-algebra.js';

function challengeName( name ) {
    return /^[\p{L}_][\p{L}\p{N}_]*$/u.test( name ) && !/^([σπρℱγ]|(?:NOT|NULL)$)/iu.test( name )
        ? name : algebraIdentifier( name );
    }

function challengeLiteral( value ) {
    return "'" + String( value ).replaceAll( "'", "''" ) + "'";
    }

// Sample only to discover useful questions. Both answer queries always see the entire database.
function challengeSample( items, limit, prefix = 0 ) {
    if (items.length <= limit) {
        return items;
        }
    const last = items.length - prefix - 1;
    const intervals = limit - prefix - 1;
    return Array.from( {length: limit}, (_, i) =>
        items[i < prefix ? i : prefix + Math.floor( (i - prefix) * last / intervals )]
        );
    }

function challengeExamples( model ) {
    const tables = model.tables.filter( table =>
        table.kind === 'entity' && table.columns.length && tableRows( model, table.id ).length
        );
    return challengeSample( tables, 16 ).map( table => ({
        table,
        columns: challengeSample( table.columns, 16 ),
        // Retain an exercise’s initial witnesses when the learner appends a larger collection.
        rows: challengeSample( tableRows( model, table.id ), 80, 16 ),
        variants: new Map(),
        name: [table.namespace, table.name].filter( Boolean ).map( challengeName ).join( '.' ),
        quoted: [table.namespace, table.name].filter( Boolean ).map( algebraIdentifier ).join( '.' )
        }) );
    }

function challengeCell( row, column ) {
    const value = row[column.id];
    if (value == null || String( value ).trim() === '') {
        return null;
        }
    if (/^(NUMBER|NUMERIC|DECIMAL|INTEGER|INT|SMALLINT|BIGINT|FLOAT|DOUBLE|REAL)(\(|$)/i.test( column.type )) {
        const text = String( value ).trim();
        const number = Number( text );
        return Number.isFinite( number ) && (Number.isSafeInteger( number ) || !Number.isInteger( number ))
            ? number : text;
        }
    if (/^(BOOL|BOOLEAN)$/i.test( column.type )) {
        const text = String( value ).trim().toLowerCase();
        if (['true', 'verdadero', 'sí', 'si', '1'].includes( text )) {
            return 1;
            }
        if (['false', 'falso', 'no', '0'].includes( text )) {
            return 0;
            }
        }
    return String( value );
    }

function challengeSqlValue( value ) {
    return typeof value === 'number' ? String( value ) : challengeLiteral( value );
    }

function challengeVariants( source, column ) {
    if (!source.variants.has( column.id )) {
        source.variants.set( column.id, new Set( source.rows.map( row => challengeCell( row, column ) ) ) );
        }
    return source.variants.get( column.id );
    }

function challengeSingleTable( source, add ) {
    const {table, rows, name, quoted} = source;
    const projectable = source.columns.find( column => challengeVariants( source, column ).size < rows.length );
    if (projectable) {
        const field = challengeName( projectable.name );
        add( 'project', projectable.id,
            '¿Qué valores distintos contiene ' + projectable.name + ' en ' + table.name + '?',
            'π[' + field + '](' + name + ')',
            'SELECT DISTINCT ' + algebraIdentifier( projectable.name ) + ' FROM ' + quoted );
        const total = projectable.name.toLowerCase() === 'cantidad' ? 'numero_filas' : 'cantidad';
        const quotedField = algebraIdentifier( projectable.name );
        const counts = 'ℱ[' + field + '; COUNT(*) AS ' + total + '](' + name + ')';
        const rawCounts = 'SELECT ' + quotedField + ', COUNT(*) AS ' + total
            + ' FROM (SELECT DISTINCT * FROM ' + quoted + ') GROUP BY ' + quotedField;
        add( 'group', projectable.id + '-COUNT',
            'Cuenta las filas de ' + table.name + ' para cada valor de ' + projectable.name
                + '. Llama ' + total + ' al recuento.',
            counts, rawCounts );

        // The size of a group is a meaningful measure even when a table's only numbers are identifiers.
        for (const [fn, description] of [
            ['SUM', 'la suma de los tamaños de los grupos'],
            ['AVG', 'el tamaño medio de los grupos'],
            ['MIN', 'el tamaño del grupo más pequeño'],
            ['MAX', 'el tamaño del grupo más grande']
            ]) {
            add( 'group', projectable.id + '-' + fn,
                'Agrupa las filas de ' + table.name + ' por ' + projectable.name
                    + '. A partir de los recuentos, devuelve ' + description + ' con el nombre medida.',
                'ℱ[; ' + fn + '(' + total + ') AS medida](' + counts + ')',
                'SELECT ' + fn + '(' + total + ') AS medida FROM (' + rawCounts + ')' );
            }
        }

    const first = table.columns[0];
    const alias = first.name === 'dato' ? 'valor' : 'dato';
    add( 'rename', first.id,
        'Muestra los valores distintos de ' + first.name + ' de ' + table.name + ' con el encabezado ' + alias + '.',
        'ρ[' + alias + ' ← ' + challengeName( first.name ) + '](π[' + challengeName( first.name ) + '](' + name + '))',
        'SELECT DISTINCT ' + algebraIdentifier( first.name ) + ' AS ' + alias + ' FROM ' + quoted );

    for (const column of source.columns) {
        const values = challengeVariants( source, column );
        if (values.size < 2) {
            continue;
            }
        const targets = [...values].filter( value => value !== null ).slice( 0, 1 );
        if (values.has( null )) {
            targets.push( null );
            }
        for (const target of targets) {
            const condition = target === null ? ' IS NULL' : ' = ' + challengeSqlValue( target );
            add( 'select', column.id + '-' + String( target ),
                'Muestra todas las columnas de ' + table.name + ' para las filas cuyo '
                    + column.name + (target === null ? ' carece de valor.' : ' vale ' + String( target ) + '.'),
                'σ[' + challengeName( column.name ) + condition + '](' + name + ')',
                'SELECT DISTINCT * FROM ' + quoted + ' WHERE ' + algebraIdentifier( column.name ) + condition );
            }
        }
    }

/** Observed pairs grouped by their first value. Nulls cannot witness a positive association. */
function challengeGroups( rows, keyColumn, memberColumn ) {
    const groups = new Map();
    for (const row of rows) {
        const key = challengeCell( row, keyColumn );
        const member = challengeCell( row, memberColumn );
        if (key === null || member === null) {
            continue;
            }
        if (!groups.has( key )) {
            groups.set( key, new Set() );
            }
        groups.get( key ).add( member );
        }
    return groups;
    }

function challengeSetExamples( source, add ) {
    const {table, rows, name, quoted} = source;

    // A witness in each region distinguishes union, intersection and both directions of difference.
    const columns = challengeSample( source.columns, 8 );
    for (const group of columns) {
        for (const value of columns.filter( column => column !== group )) {
            const buckets = challengeGroups( rows, group, value );
            const keys = challengeSample( [...buckets.keys()].filter( key => buckets.get( key ).size >= 2 ), 12 );
            for (let i = 0; i < keys.length; i++) {
                for (const other of keys.slice( i + 1 )) {
                    const one = keys[i];
                    const first = buckets.get( one );
                    const second = buckets.get( other );
                    if (![...first].some( member => second.has( member ) )) {
                        continue;
                        }
                    if (![...first].some( member => !second.has( member ) )
                        || ![...second].some( member => !first.has( member ) )) {
                        continue;
                        }

                    const g = challengeName( group.name );
                    const v = challengeName( value.name );
                    const valueSQL = algebraIdentifier( value.name );
                    const groupSQL = algebraIdentifier( group.name );
                    const project = key => 'π[' + v + '](σ[' + g + ' = ' + challengeSqlValue( key )
                        + '](' + name + '))';
                    const select = key => 'SELECT DISTINCT ' + valueSQL + ' FROM ' + quoted
                        + ' WHERE ' + groupSQL + ' = ' + challengeSqlValue( key );
                    for (const [family, op, sqlOp, text] of [
                        ['union', '∪', 'UNION', 'en al menos uno de los dos grupos'],
                        ['intersect', '∩', 'INTERSECT', 'en ambos grupos'],
                        ['difference', '−', 'EXCEPT', 'en el primer grupo y ausentes del segundo']
                        ]) {
                        add( family, group.id + '-' + value.id,
                            'En ' + table.name + ', compara los grupos ' + group.name + ' = '
                                + challengeSqlValue( one ) + ' y ' + challengeSqlValue( other )
                                + '. Devuelve los valores de ' + value.name + ' presentes ' + text + '.',
                            op + '(' + project( one ) + ', ' + project( other ) + ')',
                            select( one ) + ' ' + sqlOp + ' ' + select( other ) );
                        }

                    // Full outer join has witnesses on both sides, even when all declared FKs are valid.
                    const firstSet = 'ρ[A](' + project( one ) + ')';
                    const secondSet = 'ρ[B](' + project( other ) + ')';
                    const headings = ['A.', 'B.'].map( prefix => algebraIdentifier( prefix + value.name ) );
                    const where = 'A.' + v + ' = B.' + v;
                    for (const [family, op, sqlOp, task] of [
                        ['left', '⟕', 'LEFT', 'conserva todos los del primer grupo'],
                        ['right', '⟖', 'RIGHT', 'conserva todos los del segundo grupo'],
                        ['full', '⟗', 'FULL', 'conserva todos los de ambos grupos']
                        ]) {
                        add( family, group.id + '-' + value.id,
                            'En ' + table.name + ', toma los valores distintos de ' + value.name + ' para '
                                + group.name + ' = ' + challengeSqlValue( one ) + ' (A) y ' + challengeSqlValue( other )
                                + ' (B). Empareja los iguales y ' + task + '; muestra una columna por grupo.',
                            op + '[' + where + '](' + firstSet + ', ' + secondSet + ')',
                            'SELECT DISTINCT A.' + valueSQL + ' AS ' + headings[0] + ', B.' + valueSQL + ' AS '
                                + headings[1] + ' FROM (' + select( one ) + ') AS A ' + sqlOp + ' JOIN ('
                                + select( other ) + ') AS B ON A.' + valueSQL + ' = B.' + valueSQL );
                        }
                    return;
                    }
                }
            }
        }
    }

function challengeDivision( source, add ) {
    const {table, rows, name, quoted} = source;

    const columns = challengeSample( source.columns, 8 );
    for (const x of columns) {
        for (const y of columns.filter( column => column !== x )) {
            const pairs = challengeGroups( rows, x, y );
            const bundles = challengeSample( [...pairs.values()].filter( set => set.size >= 2 ), 12 );
            for (const together of bundles) {
                const selected = challengeSample( [...together], 8 );
                for (let i = 0; i < selected.length; i++) {
                    for (const b of selected.slice( i + 1 )) {
                        const a = selected[i];
                        const incomplete = [...pairs.values()].some( set => set.has( a ) !== set.has( b ) );
                        if (!incomplete) {
                            continue;
                            }
                        const ax = challengeName( x.name );
                        const ay = challengeName( y.name );
                        const [va, vb] = [a, b].map( challengeSqlValue );
                        const rawX = algebraIdentifier( x.name );
                        const rawY = algebraIdentifier( y.name );
                        add( 'divide', x.id + '-' + y.id,
                            'En ' + table.name + ', ¿qué valores de ' + x.name + ' están asociados a todos '
                                + 'los valores de ' + y.name + ' de esta selección: ' + va + ' y ' + vb + '?',
                            '÷(π[' + ax + ', ' + ay + '](' + name + '), π[' + ay + '](σ[' + ay + ' = '
                                + va + ' OR ' + ay + ' = ' + vb + '](' + name + ')))',
                            'SELECT ' + rawX + ' FROM ' + quoted + ' WHERE ' + rawY + ' IN (' + va + ', ' + vb
                                + ') GROUP BY ' + rawX + ' HAVING COUNT(DISTINCT ' + rawY + ') = 2' );
                        return;
                        }
                    }
                }
            }
        }
    }

function challengeRelationships( model, sources, add ) {
    const sourceIds = new Set( sources.map( source => source.table.id ) );
    const links = model.relationships.filter( item => sourceIds.has( item.parentId ) && sourceIds.has( item.childId ) );
    for (const relation of challengeSample( links, 32 )) {
        const parent = sources.find( item => item.table.id === relation.parentId );
        const child = sources.find( item => item.table.id === relation.childId );
        if (!parent || !child || !relation.mappings?.length) {
            continue;
            }
        const keys = relation.mappings.map( mapping => ({
            key: parent.table.columns.find( column => column.id === mapping.parentColumnId ),
            ref: child.table.columns.find( column => column.id === mapping.childColumnId )
            }) );
        if (keys.some( pair => !pair.key || !pair.ref )) {
            continue;
            }
        const tuple = (row, columns) => columns.map( column => challengeCell( row, column ) );
        const refs = new Set( child.rows.map( row => tuple( row, keys.map( pair => pair.ref ) ) )
            .filter( values => values.every( value => value !== null ) ).map( values => JSON.stringify( values ) ) );
        if (!parent.rows.some( row => refs.has( JSON.stringify( tuple( row, keys.map( pair => pair.key ) ) ) ) )) {
            continue;
            }
        const conditions = keys.map( ({key, ref}) => 'A.' + challengeName( key.name ) + ' = B.' + challengeName( ref.name ) );
        const matches = keys.map( ({key, ref}) => 'A.' + algebraIdentifier( key.name ) + ' = B.' + algebraIdentifier( ref.name ) );
        const selectKeys = keys.map( ({key}) => 'A.' + algebraIdentifier( key.name ) );
        const sql = 'SELECT DISTINCT ' + selectKeys.join( ', ' ) + ' FROM ' + parent.quoted + ' AS A JOIN '
            + child.quoted + ' AS B ON ' + matches.join( ' AND ' );
        const prompt = 'Recupera las claves de ' + parent.table.name + ' que aparecen referenciadas en '
            + child.table.name + ' mediante ' + relation.name + '.';
        const parentKeys = keys.map( ({key}) => challengeName( key.name ) );
        const sameName = keys.some( ({key}) => child.table.columns.some( c =>
            c.name.toLowerCase() === key.name.toLowerCase() ) );
        // Alias the projected result explicitly when a joined heading needed qualification.
        let theta = 'π[' + keys.map( ({key}) => 'A.' + challengeName( key.name ) ).join( ', ' )
            + '](⋈[' + conditions.join( ' ∧ ' ) + '](ρ[A](' + parent.name + '), ρ[B](' + child.name + ')))';
        if (sameName) {
            for (const {key} of keys) {
                if (child.table.columns.some( c => c.name.toLowerCase() === key.name.toLowerCase() )) {
                    theta = 'ρ[' + challengeName( key.name ) + ' ← A.' + challengeName( key.name ) + '](' + theta + ')';
                    }
                }
            }
        add( 'join', relation.id, prompt + ' Utiliza la reunión por condición.', theta, sql );

        const leftFields = parentKeys.join( ', ' );
        const rightFields = keys.map( ({ref}) => challengeName( ref.name ) ).join( ', ' );
        const left = 'π[' + leftFields + '](' + parent.name + ')';
        let right = 'π[' + rightFields + '](' + child.name + ')';
        const renamed = keys.filter( ({key, ref}) => key.name !== ref.name );
        // Swapped names in a composite key must move through temporary headings.
        const overlap = renamed.some( ({key}) => keys.some( ({ref}) =>
            key.name.toLowerCase() === ref.name.toLowerCase() ) );
        const occupied = new Set( [...parent.table.columns, ...child.table.columns]
            .map( column => column.name.toLowerCase() ) );
        let temporary = [];
        if (overlap) {
            temporary = renamed.map( ({ref}, index) => {
                let field = 'clave_comun_' + (index + 1);
                while (occupied.has( field )) {
                    field += '_';
                    }
                right = 'ρ[' + field + ' ← ' + challengeName( ref.name ) + '](' + right + ')';
                return field;
                } );
            }
        renamed.forEach( ({key, ref}, i) => {
            const oldName = temporary[i] || challengeName( ref.name );
            right = 'ρ[' + challengeName( key.name ) + ' ← ' + oldName + '](' + right + ')';
            } );
        const natural = '⋈(' + left + ', ' + right + ')';
        add( 'natural', relation.id, prompt + ' Aplica una reunión natural a las proyecciones de claves.', natural, sql );
        }
    }

function challengeCoverage( model, sources, add ) {
    const byId = new Map( sources.map( source => [source.table.id, source] ) );
    const links = challengeSample( model.relationships.filter( rel => rel.mappings?.length === 1
        && byId.has( rel.parentId ) && byId.has( rel.childId ) ), 32 );

    for (const across of links) {
        const bridge = byId.get( across.childId );
        const dimension = byId.get( across.parentId );
        const [reference] = across.mappings;
        const key = dimension.table.columns.find( column => column.id === reference.parentColumnId );
        const y = bridge.table.columns.find( column => column.id === reference.childColumnId );
        if (!key || !y) {
            continue;
            }
        const universe = [...challengeVariants( dimension, key )].filter( v => v !== null );
        if (universe.length < 2) {
            continue;
            }
        for (const candidate of links.filter( rel => rel.childId === across.childId && rel !== across )) {
            const x = bridge.table.columns.find( column => column.id === candidate.mappings[0].childColumnId );
            if (!x || x === y) {
                continue;
                }
            const coverage = challengeGroups( bridge.rows, x, y );
            const sets = [...coverage.values()];
            const complete = set => universe.every( value => set.has( value ) );
            if (!sets.some( complete ) || sets.every( complete )) {
                continue;
                }
            const ax = challengeName( x.name );
            const ay = challengeName( y.name );
            const ak = challengeName( key.name );
            const dimensionKeys = 'π[' + ak + '](' + dimension.name + ')';
            const divisor = key.name === y.name ? dimensionKeys : 'ρ[' + ay + ' ← ' + ak + '](' + dimensionKeys + ')';
            const qx = algebraIdentifier( x.name );
            const qy = algebraIdentifier( y.name );
            const qk = algebraIdentifier( key.name );
            add( 'divide', 'coverage-' + across.id + '-' + candidate.id,
                '¿Qué claves de ' + byId.get( candidate.parentId ).table.name + ' aparecen en '
                    + bridge.table.name + ' para todos los registros de ' + dimension.table.name
                    + '? Devuelve ' + x.name + '.',
                '÷(π[' + ax + ', ' + ay + '](' + bridge.name + '), ' + divisor + ')',
                'SELECT DISTINCT c.' + qx + ' FROM ' + bridge.quoted + ' AS c WHERE NOT EXISTS ('
                    + 'SELECT ' + qk + ' FROM ' + dimension.quoted + ' EXCEPT SELECT b.' + qy
                    + ' FROM ' + bridge.quoted + ' AS b WHERE b.' + qx + ' IS c.' + qx + ')' );
            }
        }
    }

// Catalog tasks use familiar words once their required tables, columns and references are identified.
function challengeLibrary( model, sources, add ) {
    const named = name => sources.find( source => source.table.name === name && !source.table.namespace );
    function link( from, to ) {
        if (!from || !to) {
            return null;
            }
        const found = model.relationships.filter( relation =>
            relation.parentId === from.table.id && relation.childId === to.table.id && relation.mappings?.length === 1
            );
        if (found.length !== 1) {
            return null;
            }
        const [mapping] = found[0].mappings;
        const key = from.table.columns.find( col => col.id === mapping.parentColumnId );
        const ref = to.table.columns.find( col => col.id === mapping.childColumnId );
        if (!key || !ref) {
            return null;
            }
        return {
            key, ref,
            condition: from.name + '.' + challengeName( key.name ) + ' = ' + to.name + '.' + challengeName( ref.name ),
            on: (a, b) => a + '.' + algebraIdentifier( key.name ) + ' = ' + b + '.' + algebraIdentifier( ref.name )
            };
        }

    const copies = named( 'Ejemplar' );
    const campus = named( 'Campus' );
    const editions = named( 'Edicion' );
    const place = link( campus, copies );
    const edition = link( editions, copies );
    const campusName = campus?.table.columns.find( field => field.name === 'nombre' );
    if (place && edition && campusName) {
        const sites = challengeGroups( copies.rows, edition.ref, place.ref );
        const validCampus = challengeVariants( campus, place.key );
        const chosen = [...sites].find( ([, set]) => [...set].filter( value => validCampus.has( value ) ).length >= 2 );
        if (chosen && challengeVariants( editions, edition.key ).has( chosen[0] )) {
            const constant = challengeSqlValue( chosen[0] );
            const expression = 'π[' + campus.name + '.' + challengeName( campusName.name ) + '](⋈['
                + place.condition + '](' + campus.name + ', σ['
                + challengeName( edition.ref.name ) + ' = ' + constant + '](' + copies.name + ')))';
            add( 'join', 'biblioteca-campus-' + edition.ref.id,
                '¿En qué campus hay ejemplares de la edición ' + constant
                    + '? Muestra el nombre de cada campus una sola vez.',
                expression,
                'SELECT DISTINCT c.' + algebraIdentifier( campusName.name ) + ' FROM ' + campus.quoted
                    + ' AS c JOIN ' + copies.quoted + ' AS e ON ' + place.on( 'c', 'e' )
                    + ' WHERE e.' + algebraIdentifier( edition.ref.name ) + ' = ' + constant );
            }
        }

    const books = named( 'Libro' );
    const authors = named( 'Autor' );
    const credits = named( 'Autoria' );
    const book = link( books, credits );
    const author = link( authors, credits );
    const title = books?.table.columns.find( field => field.name === 'titulo' );
    const person = authors?.table.columns.find( field => field.name === 'nombre' );
    if (!book || !author || !title || !person) {
        return;
        }
    const coauthors = challengeGroups( credits.rows, book.ref, author.ref );
    const validAuthors = challengeVariants( authors, author.key );
    const validBooks = challengeVariants( books, book.key );
    const worksByAuthor = challengeGroups( credits.rows, author.ref, book.ref );
    const repeated = [...worksByAuthor].some( ([id, works]) =>
        validAuthors.has( id ) && [...works].filter( work => validBooks.has( work ) ).length > 1
        );
    if (repeated) {
        const authorKey = credits.name + '.' + challengeName( author.ref.name );
        const bookKey = credits.name + '.' + challengeName( book.ref.name );
        const signed = '⋈[' + book.condition + '](' + books.name + ', ' + credits.name + ')';
        const distinctWorks = 'π[' + authorKey + ', ' + bookKey + '](' + signed + ')';
        const counts = 'ℱ[' + authorKey + '; COUNT(*) AS obras](' + distinctWorks + ')';
        const selected = 'σ[obras > 1](' + counts + ')';
        const withNames = '⋈[' + author.condition + '](' + authors.name + ', ' + selected + ')';
        const name = algebraIdentifier( person.name );
        const tally = 'COUNT(DISTINCT l.' + algebraIdentifier( book.key.name ) + ')';
        add( 'group', 'biblioteca-obras-' + author.ref.id,
            '¿Qué autores firman más de una obra? Devuelve su nombre y el número de obras distintas '
                + 'en la columna obras.',
            'π[' + authors.name + '.' + challengeName( person.name ) + ', obras](' + withNames + ')',
            'SELECT DISTINCT a.' + name + ', ' + tally + ' AS obras FROM ' + authors.quoted
                + ' AS a JOIN ' + credits.quoted + ' AS c ON ' + author.on( 'a', 'c' )
                + ' JOIN ' + books.quoted + ' AS l ON ' + book.on( 'l', 'c' )
                + ' GROUP BY a.' + algebraIdentifier( author.key.name ) + ', a.' + name
                + ' HAVING ' + tally + ' > 1' );
        }
    const shared = books.rows.find( row => {
        const set = coauthors.get( challengeCell( row, book.key ) ) || [];
        return challengeCell( row, title ) !== null && [...set].filter( value => validAuthors.has( value ) ).length >= 2;
        } );
    if (shared) {
        const value = challengeCell( shared, title );
        const selected = 'σ[' + challengeName( title.name ) + ' = ' + challengeSqlValue( value ) + '](' + books.name + ')';
        const signed = '⋈[' + book.condition + '](' + selected + ', ' + credits.name + ')';
        add( 'join', 'biblioteca-autores-' + book.ref.id,
            '¿Quiénes escribieron «' + value + '»? Devuelve una fila con el nombre de cada autor.',
            'π[' + authors.name + '.' + challengeName( person.name ) + '](⋈[' + author.condition
                + '](' + authors.name + ', ' + signed + '))',
            'SELECT DISTINCT a.' + algebraIdentifier( person.name ) + ' FROM ' + authors.quoted
                + ' AS a JOIN ' + credits.quoted + ' AS c ON ' + author.on( 'a', 'c' )
                + ' JOIN ' + books.quoted + ' AS l ON ' + book.on( 'l', 'c' )
                + ' WHERE l.' + algebraIdentifier( title.name ) + ' = ' + challengeSqlValue( value ) );
        }
    }

function challengeProductFields( left, right ) {
    for (const x of left.columns) {
        const width = challengeVariants( left, x ).size;
        if (width < 2 || width > 40) {
            continue;
            }
        const y = right.columns.find( field => {
            const height = challengeVariants( right, field ).size;
            return field.name.toLowerCase() !== x.name.toLowerCase() && height > 1 && width * height <= 80;
            } );
        if (y) {
            return [x, y];
            }
        }
    return [];
    }

function challengeCross( sources, add ) {
    for (const a of sources) {
        for (const b of sources) {
            if (a === b) {
                continue;
                }
            const [x, y] = challengeProductFields( a, b );
            if (!x) {
                continue;
                }
            const left = 'π[' + challengeName( x.name ) + '](' + a.name + ')';
            const right = 'π[' + challengeName( y.name ) + '](' + b.name + ')';
            add( 'product', x.id + '-' + y.id,
                'Forma todas las parejas posibles de valores distintos de ' + a.table.name + '.' + x.name
                    + ' y ' + b.table.name + '.' + y.name + '.',
                '×(' + left + ', ' + right + ')',
                'SELECT DISTINCT A.' + algebraIdentifier( x.name ) + ', B.' + algebraIdentifier( y.name )
                    + ' FROM ' + a.quoted + ' AS A CROSS JOIN ' + b.quoted + ' AS B' );
            return;
            }
        }
    }

/** A finite list of feasible exercises, using live names, keys, domains and records. */
export function compatibleChallenges( model ) {
    const candidates = [];
    function add( family, variant, prompt, algebra, sql ) {
        candidates.push( {id: family + ':' + variant, family, prompt, algebra, sql} );
        }

    const sources = challengeExamples( model );
    for (const source of sources) {
        challengeSingleTable( source, add );
        challengeSetExamples( source, add );
        challengeDivision( source, add );
        }
    challengeRelationships( model, sources, add );
    challengeCoverage( model, sources, add );
    challengeCross( sources, add );
    challengeLibrary( model, sources, add );
    return candidates;
    }

/** Prefer a different operator, then draw among bindings of that operator. */
export function newChallenge( model, previous = null, random = Math.random ) {
    const all = compatibleChallenges( model );
    if (!all.length) {
        return null;
        }
    const id = typeof previous === 'string' ? previous : previous?.id;
    const rest = all.filter( item => item.id !== id );
    const choices = rest.length ? rest : all;
    const oldFamily = all.find( item => item.id === id )?.family;
    const others = choices.filter( item => item.family !== oldFamily );
    const pool = others.length ? others : choices;
    const families = [...new Set( pool.map( item => item.family ) )];
    const pick = options => options[Math.min( options.length - 1, Math.floor( random() * options.length ) )];
    const family = pick( families );
    return pick( pool.filter( item => item.family === family ) );
    }
