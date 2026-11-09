import { CARDINALITIES } from '../domain/model.js';
import { sceneColumnKeys } from '../ui/scene.js';

/*
 * The data dictionary of the relational model: what the practice asks the
 * relational model to show, table by table.
 *   columns       type, keys (PK, FKn, AKn as the diagram labels them), nulls,
 *                 default value and domain;
 *   keys          alternate keys and unique indexes;
 *   foreign keys  referenced table, dependency (identifying or not),
 *                 cardinality, optional reference and referential actions.
 * Visio prints it on its second page and the memo as tables. It only reads.
 */

/** "mínimo 0; valores a, b; condición x > 0", or «—» without a domain. */
export function domainSummary( domain ) {
    if (!domain) {
        return '—';
        }

    const parts = [];

    if (domain.minimum !== null) {
        parts.push( `mínimo ${domain.minimum}` );
        }

    if (domain.maximum !== null) {
        parts.push( `máximo ${domain.maximum}` );
        }

    if (domain.values.length) {
        parts.push( `valores ${domain.values.join( ', ' )}` );
        }

    if (domain.check.trim()) {
        parts.push( `condición ${domain.check.trim()}` );
        }

    return parts.join( '; ' ) || '—';
    }

function dictionaryColumnName(
        table,
        columnId
        ) {
    return table?.columns.find( item => item.id === columnId )?.name || '?';
    }

function dictionaryForeignKey(
        model,
        relation,
        index
        ) {
    const parent = model.tables.find( item => item.id === relation.parentId );
    const child = model.tables.find( item => item.id === relation.childId );
    const cardinality = CARDINALITIES.find( item => item[0] === relation.cardinality );

    return {
        label: `FK${index + 1}`,
        name: relation.name,
        columns: relation.mappings.map( pair => dictionaryColumnName( child, pair.childColumnId ) ),
        parent: parent?.name || '?',
        parentColumns: relation.mappings.map( pair => dictionaryColumnName( parent, pair.parentColumnId ) ),
        parentSide: relation.optional ? '0..1' : '1',
        childSide: cardinality ? cardinality[2] : relation.cardinality,
        identifying: relation.identifying,
        optional: relation.optional,
        onDelete: relation.onDelete,
        onUpdate: relation.onUpdate
        };
    }

function dictionaryTable(
        model,
        table
        ) {
    const name = id => dictionaryColumnName( table, id );

    return {
        name: table.name,
        dependent: model.relationships.some( relation => relation.childId === table.id && relation.identifying ),
        columns: table.columns.map(
                column => ({
                    name: column.name,
                    type: column.type,
                    keys: sceneColumnKeys( model, table, column ),
                    nullable: !column.required && !column.primary,
                    defaultValue: column.defaultValue?.trim() || '',
                    domain: domainSummary( column.domain )
                    })
                ),
        alternateKeys: (table.alternateKeys || []).map(
                (key, index) => ({label: `AK${index + 1}`, name: key.name, columns: key.columns.map( name )})
                ),
        uniqueIndexes: table.indexes.filter( index => index.unique ).map(
                index => ({name: index.name, columns: index.columns.map( name )})
                ),
        foreignKeys: model.relationships
            .filter( relation => relation.childId === table.id )
            .map( (relation, index) => dictionaryForeignKey( model, relation, index ) )
        };
    }

/** Every table of the relational model, in the order of the document. */
export function relationalDictionary( model ) {
    return model.tables
        .filter( table => table.kind === 'entity' )
        .map( table => dictionaryTable( model, table ) );
    }

/** «cod_lote CHAR(5) · PK · NOT NULL · DEFAULT 0 · mínimo 1». */
export function dictionaryColumnLine( column ) {
    return [
        `${column.name} ${column.type}`,
        ...(column.keys.length ? [column.keys.join( ', ' )] : []),
        column.nullable ? 'NULL' : 'NOT NULL',
        ...(column.defaultValue ? [`DEFAULT ${column.defaultValue}`] : []),
        ...(column.domain !== '—' ? [column.domain] : [])
        ].join( ' · ' );
    }

/** «FK1 especie_cod_especie → Especie(cod_especie): Especie 1 — 0..N Lote, no identificadora, ON DELETE NO ACTION…». */
export function dictionaryForeignKeyLine(
        table,
        foreignKey
        ) {
    return `${foreignKey.label} (${foreignKey.columns.join( ', ' )}) → ${foreignKey.parent}(${foreignKey.parentColumns.join( ', ' )}): `
        + `${foreignKey.parent} ${foreignKey.parentSide} — ${foreignKey.childSide} ${table.name}, `
        + `${foreignKey.identifying ? 'identificadora' : 'no identificadora'}, `
        + `${foreignKey.optional ? 'admite nulos' : 'obligatoria'}, `
        + `ON DELETE ${foreignKey.onDelete}, ON UPDATE ${foreignKey.onUpdate}`;
    }

/** The lines of one table as the Visio page prints them, constraints after the columns. */
export function dictionaryTableLines( table ) {
    return [
        ...table.columns.map( dictionaryColumnLine ),
        ...table.alternateKeys.map( key => `${key.label} ${key.name}: UNIQUE (${key.columns.join( ', ' )}), NOT NULL` ),
        ...table.uniqueIndexes.map( index => `UNIQUE ${index.name} (${index.columns.join( ', ' )}), admite nulos` ),
        ...table.foreignKeys.map( foreignKey => dictionaryForeignKeyLine( table, foreignKey ) )
        ];
    }
