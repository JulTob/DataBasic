import {accessSchema, requireExportableForAccess} from '../../src/domain/access.js';
import {dataInsertOrder, tableDataRows} from '../../src/domain/data.js';
import {selectRows} from './select.mjs';
import {parseDataType} from '../../src/domain/model.js';

const numericTypes = {
    Byte: 'BYTE',
    Entero: 'INT',
    'Entero largo': 'LONG',
    Simple: 'FLOAT',
    Doble: 'DOUBLE',
    Decimal: 'NUMERIC'
    };

const fieldTypes = {
    'Texto corto': 'TEXT',
    'Texto largo': 'MEMO',
    'Fecha/Hora': 'SHORT_DATE_TIME',
    Moneda: 'MONEY',
    Autonumeración: 'LONG',
    'Sí/No': 'BOOLEAN',
    'Objeto OLE': 'OLE',
    Hipervínculo: 'MEMO'
    };

function escape( value ) {
    const source = String( value );

    if (/[^\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]/u.test( source )) {
        throw new Error( 'El documento contiene caracteres que el puente ACCDB no admite.' );
        }

    return source.replaceAll( '&', '&amp;' )
        .replaceAll( '<', '&lt;' )
        .replaceAll( '"', '&quot;' )
        .replaceAll( '\r', '&#13;' )
        .replaceAll( '\n', '&#10;' )
        .replaceAll( '\t', '&#9;' );
    }

function tag( name, attributes, body = '' ) {
    const pairs = Object.entries( attributes )
        .filter( ([, value]) => value !== null && value !== undefined )
        .map( ([key, value]) => ` ${key}="${escape( value )}"` )
        .join( '' );

    return `<${name}${pairs}>${body}</${name}>`;
    }

function properties( entries ) {
    return entries.filter( ([, , value]) => value !== '' && value !== null && value !== undefined )
        .map( ([name, type, value]) => tag( 'property', {name, type, value} ) )
        .join( '' );
    }

const identifier = name => '[' + name.replaceAll( ']', ']]' ) + ']';

function lookupProperties( relation ) {
    if (!relation) return '';

    const key = relation.pairs[0].parentColumn;
    const display = relation.displayColumn;
    const columns = display ? [key, display] : [key];
    const sql = `SELECT ${columns.map( identifier ).join( ', ' )} FROM ${identifier( relation.parentTable )} ORDER BY ${identifier( display || key )};`;

    return properties( [
        ['DisplayControl', 'INT', 111],
        ['RowSourceType', 'TEXT', 'Table/Query'],
        ['RowSource', 'TEXT', sql],
        ['BoundColumn', 'INT', 1],
        ['ColumnCount', 'INT', columns.length],
        ['ColumnWidths', 'TEXT', display ? (relation.hideKey ? '0;2880' : '1440;2880') : '1440'],
        ['LimitToList', 'BOOLEAN', true]
        ] );
    }

function fieldXML( field, logical, relations ) {
    const type = field.accessType === 'Número'
        ? numericTypes[field.fieldSize]
        : fieldTypes[field.accessType];

    if (!type) throw new Error( `${field.name}: tipo físico de Access no admitido.` );
    const {precision, scale} = parseDataType( logical.type );
    const rule = field.validationRule;
    // A NULL optional field must satisfy the automatically translated domain.
    const nullableDomain = rule && !field.required && !field.overridden.includes( 'validationRule' );
    const lookup = relations.findLast( r => r.lookup && r.childColumnId === field.columnId );
    const attrs = {
        name: field.name,
        type,
        size: type === 'TEXT' ? field.fieldSize : null,
        precision: type === 'NUMERIC' ? (precision ?? 28) : null,
        scale: type === 'NUMERIC' ? (scale ?? field.decimalPlaces ?? 0) : null,
        auto: field.autonumber,
        hyperlink: field.accessType === 'Hipervínculo'
        };
    const metadata = properties( [
        ['Required', 'BOOLEAN', field.autonumber ? null : field.required],
        ['AllowZeroLength', 'BOOLEAN', ['TEXT', 'MEMO'].includes( type ) ? field.allowZeroLength : null],
        ['Caption', 'TEXT', field.caption],
        ['Description', 'TEXT', field.description],
        ['Format', 'TEXT', field.format],
        ['DefaultValue', 'TEXT', field.defaultValue],
        ['DecimalPlaces', 'BYTE', field.decimalPlaces],
        ['ValidationRule', 'TEXT', nullableDomain ? `Is Null Or (${rule})` : rule],
        ['ValidationText', 'TEXT', field.validationText]
        ] );

    return tag( 'field', attrs, metadata + lookupProperties( lookup ) );
    }

function keyXML( key ) {
    return tag( 'key', {name: key.name, primary: !!key.primary, unique: key.unique},
        key.columns.map( name => tag( 'col', {name} ) ).join( '' ) );
    }

function tableXML( table, logical, relations ) {
    const keys = [...table.indexes];
    if (table.primaryKey.length) {
        keys.unshift( {name: 'PrimaryKey', primary: true, unique: true, columns: table.primaryKey} );
        }

    for (const relation of relations.filter( r => r.oneToOne )) {
        const columns = relation.pairs.map( pair => pair.childColumn );
        const covered = keys.some( k => k.unique && k.columns.length === columns.length
            && k.columns.every( c => columns.includes( c ) ) );

        if (!covered) keys.push( {name: `${relation.name}_unico`, columns, unique: true} );
        }

    const metadata = properties( [
        ['Description', 'TEXT', table.description],
        ['ValidationRule', 'TEXT', table.validationRule],
        ['ValidationText', 'TEXT', table.validationText]
        ] );

    return tag( 'table', {name: table.name},
        metadata + table.fields.map( (f, i) => fieldXML( f, logical.columns[i], relations ) ).join( '' )
        + keys.map( keyXML ).join( '' ) );
    }

function relationXML( relation, logical ) {
    if (['SET NULL', 'SET DEFAULT'].includes( logical.onUpdate ) || logical.onDelete === 'SET DEFAULT') {
        throw new Error( `${relation.name}: el escritor ACCDB no puede representar la acción referencial solicitada.` );
        }

    return tag( 'relation', {
        name: relation.name,
        from: relation.parentTable,
        to: relation.childTable,
        enforce: relation.enforce,
        cascadeUpdate: relation.cascadeUpdate,
        cascadeDelete: relation.cascadeDelete,
        nullOnDelete: logical.onDelete === 'SET NULL'
        }, relation.pairs.map( ({parentColumn, childColumn}) => tag( 'pair', {parentColumn, childColumn} ) ).join( '' ) );
    }

/** Project the same effective schema as the Access editor, including overrides. */
export function nativeSchema( model ) {
    requireExportableForAccess( model );
    const schema = accessSchema( model );
    const queries = schema.views.map( view => tag(
            'query', {name: view.name},
            selectRows( view.definition, schema.tables.map( table => table.name ) )
                .map( row => tag( 'part', row ) ).join( '' )
            ) );
    if (!schema.tables.length) throw new Error( 'Añada al menos una tabla para exportar a Access.' );

    const tablesById = new Map( model.tables.map( t => [t.id, t] ) );
    const tables = schema.tables.map( t => {
        const logical = tablesById.get( t.tableId );
        if (logical.namespace) throw new Error( `${t.name}: Access no admite espacios de nombres.` );
        return tableXML( t, logical, schema.relationships.filter( r => r.childTableId === t.tableId ) );
        } );
    const relations = schema.relationships.map( (r, i) => relationXML( r, model.relationships[i] ) );
    const rows = dataInsertOrder( model ).flatMap( table => tableDataRows( model, table ).map(
            row => tag( 'row', {table: table.name}, table.columns.filter(
                c => row[c.id] !== undefined && row[c.id] !== null && row[c.id] !== ''
                ).map( c => tag( 'cell', {name: c.name, value: row[c.id]} ) ).join( '' ) )
            ) );

    return tag( 'schema', {}, [...tables, ...relations, ...rows, ...queries].join( '\n' ) );
    }
