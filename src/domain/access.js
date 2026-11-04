import {
    conceptualStatus,
    documentPhysical,
    parseDataType,
    validateDocument,
    validType
    } from './model.js';

/*
 * The physical layer for Microsoft Access, derived from the relational model.
 *
 * Nothing here is stored. A column, a relationship or a table gets its Access
 * definition from the relational data; the document's `physical` overrides
 * replace single properties on top. The exporters (io/access.js) and the
 * Tablas view read these definitions, and the issues list says what Access
 * cannot express so the memo can record it as lost semantics.
 */

const PHYSICAL_TEXT_FAMILIES = ['VARCHAR', 'CHAR', 'TEXT'];

/** Everything an Access database needs, ready for any writer. */
export function accessSchema( model ) {
    const issues = [];
    const tables = model.tables
        .filter( table => table.kind === 'entity' )
        .map( table => physicalTable( model, table, issues ) );
    const views = model.tables
        .filter( table => table.kind === 'view' )
        .map( view => physicalView( model, view, issues ) );
    const relationships = model.relationships.map(
            relation => physicalRelationship( model, relation, issues )
            );

    return {name: model.name, tables, views, relationships, issues};
    }

/** What Access cannot express, as warnings with the same shape as the conceptual status. */
export function accessStatus( model ) {
    return accessSchema( model ).issues;
    }

/** The effective Access definition of one column (derived, then overridden). */
export function accessColumnDefinition(
        model,
        table,
        column
        ) {
    return physicalField( model, table, column, [] );
    }

/** The effective Access definition of one table (fields, keys, indexes, rule). */
export function accessTableDefinition(
        model,
        table
        ) {
    return physicalTable( model, table, [] );
    }

/** The effective Access definition of one relationship. */
export function accessRelationshipDefinition(
        model,
        relation
        ) {
    return physicalRelationship( model, relation, [] );
    }

/** Exporters need a complete, decided document, like the SQL export. */
export function requireExportableForAccess( model ) {
    const errors = validateDocument( model ).filter( issue => issue.level === 'error' );

    if (errors.length) {
        throw new Error( errors[0].message );
        }

    const pending = conceptualStatus( model ).find( item => item.code === 'pending' );

    if (pending) {
        throw new Error( `Access incompleto: ${pending.message}` );
        }

    for (const table of model.tables.filter( item => item.kind === 'entity' )) {
        if (!table.columns.length) {
            throw new Error( `${table.name}: añade al menos una columna antes de exportar a Access.` );
            }
        }
    }

/* ---------- tables ---------- */

function physicalTable(
        model,
        table,
        issues
        ) {
    const overrides = documentPhysical( model ).tables[table.id] || {};
    const fields = table.columns.map( column => physicalField( model, table, column, issues ) );
    const checks = table.columns
        .filter( column => column.domain?.check?.trim() )
        .map( column => `(${column.domain.check.trim()})` );

    if (checks.length && overrides.validationRule === undefined) {
        issues.push( physicalIssue(
                `${table.name}: la regla de validación de tabla se copia del CHECK; revisa su sintaxis en Access.`,
                table.id
                ) );
        }

    return {
        tableId: table.id,
        name: table.name,
        description: overrides.description ?? table.notes,
        validationRule: overrides.validationRule ?? checks.join( ' And ' ),
        validationText: overrides.validationText ?? '',
        fields,
        primaryKey: fields.filter( field => field.primary ).map( field => field.name ),
        indexes: physicalIndexes( table, fields ),
        overridden: Object.keys( overrides )
        };
    }

function physicalView(
        model,
        view,
        issues
        ) {
    const overrides = documentPhysical( model ).tables[view.id] || {};

    issues.push( physicalIssue(
            `${view.name}: la vista se exporta como consulta guardada; revisa la sintaxis SQL en Access.`,
            view.id
            ) );

    return {
        tableId: view.id,
        name: view.name,
        definition: view.definition.trim().replace( /;+$/, '' ),
        description: overrides.description ?? view.notes
        };
    }

/** Unique keys and indexes beyond the primary key, by field name. */
function physicalIndexes(
        table,
        fields
        ) {
    const names = new Map( table.columns.map( column => [column.id, column.name] ) );
    const indexes = [];
    const covered = new Set();

    for (const key of table.alternateKeys || []) {
        indexes.push( {name: key.name, columns: key.columns.map( id => names.get( id ) ), unique: true} );
        key.columns.forEach( id => covered.add( id ) );
        }

    for (const index of table.indexes) {
        indexes.push( {
            name: index.name,
            columns: index.columns.map( id => names.get( id ) ),
            unique: index.unique
            } );
        index.columns.forEach( id => covered.add( id ) );
        }

    for (const field of fields) {
        const wantsIndex = field.overridden.includes( 'indexed' ) && field.indexed !== 'no';

        if (wantsIndex && !field.primary && !covered.has( field.columnId )) {
            indexes.push( {
                name: `IX_${table.name}_${field.name}`,
                columns: [field.name],
                unique: field.indexed === 'unique'
                } );
            }
        }

    return indexes;
    }

/* ---------- fields ---------- */

function physicalField(
        model,
        table,
        column,
        issues
        ) {
    const overrides = documentPhysical( model ).columns[column.id] || {};
    const type = physicalTypeFor( column.type );
    const rule = physicalRuleFor( column.domain );
    const derived = {
        accessType: type.accessType,
        fieldSize: type.fieldSize,
        decimalPlaces: type.decimalPlaces,
        required: column.required || column.primary,
        allowZeroLength: false,
        indexed: physicalIndexedFor( model, table, column ),
        validationRule: rule.rule,
        validationText: rule.text,
        defaultValue: physicalDefaultFor( column.defaultValue, `${table.name}.${column.name}`, column.id, issues ),
        caption: '',
        description: column.notes,
        format: ''
        };
    const definition = {...derived, ...overrides};

    if (type.note && overrides.accessType === undefined) {
        issues.push( physicalIssue( `${table.name}.${column.name}: ${type.note}`, column.id ) );
        }

    return {
        columnId: column.id,
        name: column.name,
        ...definition,
        primary: column.primary,
        foreignKey: physicalIsForeignKey( model, table, column ),
        autonumber: definition.accessType === 'Autonumeración',
        derived,
        overridden: Object.keys( overrides )
        };
    }

/** The Access type, size and decimals that stand for a relational type. */
function physicalTypeFor( type ) {
    if (!validType( type )) {
        return physicalShortText( 255, 'tipo no reconocido; se exporta como Texto corto (255).' );
        }

    const parsed = parseDataType( type );

    switch (parsed.family) {
        case 'VARCHAR':
        case 'CHAR':
            return parsed.length <= 255
                ? physicalShortText( parsed.length )
                : physicalPlain( 'Texto largo', 'supera los 255 caracteres de Texto corto; se exporta como Texto largo.' );
        case 'TEXT':
            return physicalPlain( 'Texto largo' );
        case 'NUMBER':
        case 'DECIMAL':
        case 'NUMERIC':
            return physicalNumberFor( parsed );
        case 'INTEGER':
        case 'INT':
            return physicalNumber( 'Entero largo' );
        case 'SMALLINT':
            return physicalNumber( 'Entero' );
        case 'BIGINT':
            return physicalNumber( 'Doble', 'BIGINT no existe en Access 2010-2013; se exporta como Número Doble.' );
        case 'REAL':
            return physicalNumber( 'Simple' );
        case 'FLOAT':
        case 'DOUBLE':
            return physicalNumber( 'Doble' );
        case 'DATE':
        case 'TIME':
        case 'TIMESTAMP':
        case 'DATETIME':
            return physicalPlain( 'Fecha/Hora' );
        case 'BOOLEAN':
        case 'BOOL':
            return physicalPlain( 'Sí/No' );
        case 'BLOB':
            return physicalPlain( 'Objeto OLE' );
        case 'UUID':
            return physicalShortText( 36 );
        default:
            return physicalShortText( 255, 'tipo no reconocido; se exporta como Texto corto (255).' );
        }
    }

/** NUMBER(p,s) and friends: whole numbers by digit count, decimals as Doble. */
function physicalNumberFor( parsed ) {
    if (parsed.precision === null) {
        return physicalNumber( 'Entero largo' );
        }

    if (parsed.scale !== null && parsed.scale !== 0) {
        return {
            accessType: 'Número',
            fieldSize: 'Doble',
            decimalPlaces: parsed.scale > 0 ? Math.min( parsed.scale, 15 ) : null,
            note: 'los decimales se exportan como Número Doble; elige Moneda o Decimal si el curso lo pide.'
            };
        }

    if (parsed.precision <= 4) {
        return physicalNumber( 'Entero' );
        }

    if (parsed.precision <= 9) {
        return physicalNumber( 'Entero largo' );
        }

    return physicalNumber( 'Doble', 'más de 9 dígitos no caben en Entero largo; se exporta como Número Doble.' );
    }

function physicalShortText(
        length,
        note = null
        ) {
    return {accessType: 'Texto corto', fieldSize: length, decimalPlaces: null, note};
    }

function physicalNumber(
        size,
        note = null
        ) {
    return {accessType: 'Número', fieldSize: size, decimalPlaces: null, note};
    }

function physicalPlain(
        accessType,
        note = null
        ) {
    return {accessType, fieldSize: null, decimalPlaces: null, note};
    }

/** Access shows an index on a single-column key; a foreign key gets one with duplicates. */
function physicalIndexedFor(
        model,
        table,
        column
        ) {
    const singlePrimary = column.primary && table.columns.filter( field => field.primary ).length === 1;
    const singleAlternate = (table.alternateKeys || []).some(
            key => key.columns.length === 1 && key.columns[0] === column.id
            );

    if (singlePrimary || singleAlternate) {
        return 'unique';
        }

    return physicalIsForeignKey( model, table, column ) ? 'duplicates' : 'no';
    }

function physicalIsForeignKey(
        model,
        table,
        column
        ) {
    return model.relationships.some(
            relation => relation.childId === table.id
                && relation.mappings.some( pair => pair.childColumnId === column.id )
            );
    }

/** Field-level rule without the field name, as Access expects, and a message for the user. */
function physicalRuleFor( domain ) {
    if (!domain) {
        return {rule: '', text: ''};
        }

    const parts = [];
    const reasons = [];

    if (domain.minimum !== null && domain.maximum !== null) {
        parts.push( `>=${domain.minimum} And <=${domain.maximum}` );
        reasons.push( `entre ${domain.minimum} y ${domain.maximum}` );
        }
    else if (domain.minimum !== null) {
        parts.push( `>=${domain.minimum}` );
        reasons.push( `mayor o igual que ${domain.minimum}` );
        }
    else if (domain.maximum !== null) {
        parts.push( `<=${domain.maximum}` );
        reasons.push( `menor o igual que ${domain.maximum}` );
        }

    if (domain.values.length) {
        parts.push( `In (${domain.values.map( physicalLiteral ).join( ', ' )})` );
        reasons.push( `uno de: ${domain.values.join( ', ' )}` );
        }

    return {
        rule: parts.join( ' And ' ),
        text: reasons.length ? `El valor debe ser ${reasons.join( ' y ' )}.` : ''
        };
    }

function physicalLiteral( value ) {
    return typeof value === 'number'
        ? String( value )
        : `"${String( value ).replaceAll( '"', '""' )}"`;
    }

/** SQL default literals become Access expressions; the rest is passed through with a warning. */
function physicalDefaultFor(
        sql,
        label,
        columnId,
        issues
        ) {
    const trimmed = String( sql || '' ).trim();

    if (!trimmed || /^null$/i.test( trimmed )) {
        return '';
        }

    const quoted = /^'([\s\S]*)'$/.exec( trimmed );

    if (quoted) {
        return `"${quoted[1].replaceAll( "''", "'" ).replaceAll( '"', '""' )}"`;
        }

    if (/^current_date$/i.test( trimmed )) {
        return 'Date()';
        }

    if (/^(current_timestamp|now\(\))$/i.test( trimmed )) {
        return 'Now()';
        }

    if (/^current_time$/i.test( trimmed )) {
        return 'Time()';
        }

    if (/^(true|false)$/i.test( trimmed )) {
        return trimmed.charAt( 0 ).toUpperCase() + trimmed.slice( 1 ).toLowerCase();
        }

    if (/^[+-]?\d+(\.\d+)?$/.test( trimmed )) {
        return trimmed;
        }

    issues.push( physicalIssue(
            `${label}: el valor predeterminado «${trimmed}» se copia tal cual; revisa su sintaxis en Access.`,
            columnId
            ) );
    return trimmed;
    }

/* ---------- relationships ---------- */

function physicalRelationship(
        model,
        relation,
        issues
        ) {
    const overrides = documentPhysical( model ).relationships[relation.id] || {};
    const parent = model.tables.find( table => table.id === relation.parentId );
    const child = model.tables.find( table => table.id === relation.childId );
    const columnName = (table, id) => table.columns.find( field => field.id === id )?.name ?? '';
    const pairs = relation.mappings.map(
            pair => ({
                parentColumn: columnName( parent, pair.parentColumnId ),
                childColumn: columnName( child, pair.childColumnId )
                })
            );
    const displayColumnId = overrides.displayColumnId ?? physicalDisplayColumn( parent )?.id ?? null;
    const single = relation.mappings.length === 1;
    const derived = {
        enforce: true,
        cascadeUpdate: relation.onUpdate === 'CASCADE',
        cascadeDelete: relation.onDelete === 'CASCADE',
        lookup: single && displayColumnId !== null,
        hideKey: true
        };
    const definition = {...derived, ...overrides, displayColumnId};

    physicalRelationshipIssues( relation, parent, child, single, definition, issues );

    return {
        relationshipId: relation.id,
        name: relation.name,
        parentTableId: parent.id,
        childTableId: child.id,
        parentTable: parent.name,
        childTable: child.name,
        pairs,
        oneToOne: ['zero-one', 'one-one'].includes( relation.cardinality ),
        ...definition,
        lookup: definition.lookup && single,
        displayColumn: displayColumnId === null ? null : columnName( parent, displayColumnId ),
        childColumnId: single ? relation.mappings[0].childColumnId : null,
        derived,
        overridden: Object.keys( overrides )
        };
    }

/** The first text column of the referenced table that is not part of its key. */
function physicalDisplayColumn( table ) {
    return table.columns.find(
            column => !column.primary
                && validType( column.type )
                && PHYSICAL_TEXT_FAMILIES.includes( parseDataType( column.type ).family )
            ) || null;
    }

function physicalRelationshipIssues(
        relation,
        parent,
        child,
        single,
        definition,
        issues
        ) {
    const label = `${child.name} → ${parent.name} (${relation.name})`;

    for (const [action, key] of [['onDelete', 'eliminar'], ['onUpdate', 'actualizar']]) {
        if (['SET NULL', 'SET DEFAULT'].includes( relation[action] )) {
            issues.push( physicalIssue(
                    `${label}: Access no admite ${relation[action]} al ${key}; se exporta como ${key === 'eliminar' ? 'eliminación' : 'actualización'} restringida.`,
                    relation.id
                    ) );
            }
        }

    if (!single) {
        issues.push( physicalIssue(
                `${label}: clave ajena compuesta; se crea la relación directamente, sin campo de búsqueda.`,
                relation.id
                ) );
        }
    else if (definition.lookup && definition.displayColumnId === null) {
        issues.push( physicalIssue(
                `${label}: ${parent.name} no tiene una columna de texto que mostrar; la búsqueda muestra la clave.`,
                relation.id
                ) );
        }

    if (!definition.enforce) {
        issues.push( physicalIssue(
                `${label}: la relación se exporta sin exigir integridad referencial; el curso la pide siempre.`,
                relation.id
                ) );
        }
    }

function physicalIssue(
        message,
        elementId
        ) {
    return {level: 'warning', code: 'access', message, elementId};
    }
