import {
    CARDINALITIES,
    conceptualStatus,
    documentAssumptions,
    elementLabel,
    getConceptualProjection,
    participationCardinalityLetter
    } from '../domain/model.js';
import {
    accessSchema,
    accessStatus
    } from '../domain/access.js';
import {
    dataStatus,
    tableDataRows
    } from '../domain/data.js';
import { documentAuthor } from '../domain/delivery.js';
import {
    dictionaryForeignKeyLine,
    domainSummary,
    relationalDictionary
    } from './dictionary.js';
import { escapeHTML } from '../ui/html.js';

/**
 * The design report is a small algebra: `buildDesignReport` turns a document
 * into a report model (sections made of paragraphs, lists and tables), and
 * each renderer only gives that model a format. Nothing here mutates the
 * document or invents decisions the author did not take.
 * @typedef {{kind:'paragraph',text:string}
 *   |{kind:'heading',text:string}
 *   |{kind:'list',items:string[]}
 *   |{kind:'table',header:string[],rows:string[][]}} ReportBlock
 * @typedef {{heading:string,blocks:ReportBlock[]}} ReportSection
 * @typedef {{dni:string,nombre:string,apellidos:string}} ReportAuthor
 * @typedef {{title:string,author:ReportAuthor,sections:ReportSection[]}} DesignReport
 */

function reportParagraph( text ) {
    return {kind: 'paragraph', text};
    }

/** The title of one element inside a section (an entity, a relationship, a table). */
function reportHeading( text ) {
    return {kind: 'heading', text};
    }

function reportList( items ) {
    return {kind: 'list', items};
    }

function reportTable(
        header,
        rows
        ) {
    return {kind: 'table', header, rows};
    }

function reportPair( participation ) {
    return `(${participation.min},${participation.max === null ? 'N' : participation.max})`;
    }

/** The column that stores an attribute: traced from a native attribute, or the column itself in a projection. */
function reportAttributeColumn(
        model,
        attribute
        ) {
    const trace = model.traces?.find(
            item => item.sourceKind === 'attribute' && item.sourceId === attribute.id
                && item.targetKind === 'column'
            );
    const columnId = trace?.targetId || attribute.id;
    const table = model.tables.find( item => item.columns.some( field => field.id === columnId ) );

    return table ? {table, columnId} : null;
    }

/** Alternate keys and unique indexes are part of the identity the statement asks to show. */
function reportUniqueness(
        model,
        attribute
        ) {
    const stored = reportAttributeColumn( model, attribute );

    if (!stored) {
        return null;
        }

    const alternate = (stored.table.alternateKeys || []).find( key => key.columns.includes( stored.columnId ) );

    if (alternate) {
        return alternate.columns.length === 1 ? 'Clave alternativa' : `Parte de la clave alternativa ${alternate.name}`;
        }

    const unique = stored.table.indexes.find(
            index => index.unique && index.columns.length === 1 && index.columns[0] === stored.columnId
            );

    return unique ? 'Único, admite vacíos' : null;
    }

function reportAttributeIdentity(
        model,
        attribute,
        keyAttributeIds = []
        ) {
    if (attribute.primary || keyAttributeIds.includes( attribute.id )) {
        return attribute.ownerKind === 'relationship' ? 'Parte de la clave de la tabla' : 'Clave';
        }

    if (attribute.partialKey) {
        return 'Clave parcial';
        }

    const uniqueness = reportUniqueness( model, attribute );
    const presence = attribute.required ? 'Requerido' : 'Opcional';

    return uniqueness ? `${uniqueness} · ${presence}` : presence;
    }

function reportAttributeRow(
        model,
        attribute,
        keyAttributeIds = []
        ) {
    return [
        attribute.name,
        attribute.type || '—',
        reportAttributeIdentity( model, attribute, keyAttributeIds ),
        reportAttributeTypology( attribute ),
        domainSummary( attribute.domain ),
        attribute.notes?.trim() || '—'
        ];
    }

const REPORT_ATTRIBUTE_HEADER = ['Atributo', 'Tipo', 'Identidad', 'Tipología', 'Dominio', 'Notas'];

function reportAttributeTypology( attribute ) {
    const marks = [];

    if (attribute.structure === 'composite') {
        marks.push( 'Compuesto' );
        }

    if (attribute.parentAttributeId) {
        marks.push( 'Componente' );
        }

    if (attribute.multivalued) {
        marks.push( 'Multivaluado' );
        }

    if (attribute.derived) {
        marks.push( attribute.derivation ? `Derivado: ${attribute.derivation}` : 'Derivado' );
        }

    return marks.join( ', ' ) || 'Simple';
    }

function reportEntityHeading(
        projection,
        entity
        ) {
    const hierarchy = projection.generalizations.find( item => item.subtypeIds.includes( entity.id ) );

    if (hierarchy) {
        const supertype = projection.entities.find( item => item.id === hierarchy.supertypeId );

        return `${entity.name} — subclase de ${supertype?.name || 'una superclase'} (hereda su clave)`;
        }

    if (!entity.weak) {
        return `${entity.name} — entidad fuerte${entity.projected ? ' (proyección de una tabla)' : ''}`;
        }

    const owner = projection.entities.find( item => item.id === entity.ownerEntityId );

    return `${entity.name} — entidad débil${owner ? ` de ${owner.name}` : ', propietaria pendiente'}`;
    }

function reportEntitiesSection( model ) {
    const projection = getConceptualProjection( model );
    const blocks = [];

    for (const entity of projection.entities) {
        const attributes = projection.attributes.filter( item => item.ownerId === entity.id );

        blocks.push( reportHeading( reportEntityHeading( projection, entity ) ) );

        if (entity.notes?.trim()) {
            blocks.push( reportParagraph( `Notas: ${entity.notes.trim()}` ) );
            }

        blocks.push( reportTable(
                REPORT_ATTRIBUTE_HEADER,
                attributes.map( attribute => reportAttributeRow( model, attribute ) )
                ) );
        }

    if (!blocks.length) {
        blocks.push( reportParagraph( 'El documento todavía no tiene entidades.' ) );
        }

    return {heading: 'Entidades y atributos', blocks};
    }

function reportDegree( relation ) {
    const degree = {2: 'binaria', 3: 'ternaria'}[relation.participations.length] || `de grado ${relation.participations.length}`;
    const recursive = new Set( relation.participations.map( item => item.entityId ) ).size < relation.participations.length;

    return recursive ? `${degree} recursiva` : degree;
    }

/*
 * The type of a relationship from the letters drawn by its diamond, written
 * with the ones first: 1:1, 1:N, N:N for binaries and, for a ternary, one
 * letter per branch (1:N:N, N:N:N...). Null while a letter is undecided.
 */
export function relationshipType( relation ) {
    const letters = relation.participations.map(
            participation => participationCardinalityLetter( relation, participation )
            );

    if (letters.some( letter => !letter )) {
        return null;
        }

    return [...letters.filter( letter => letter === '1' ), ...letters.filter( letter => letter !== '1' )].join( ':' );
    }

function reportRelationshipDecision(
        model,
        relation
        ) {
    if (relation.projected) {
        const foreignKey = model.relationships.find( item => item.id === relation.foreignKeyId );
        const cardinality = CARDINALITIES.find( item => item[0] === foreignKey?.cardinality );

        return `Procede de la clave foránea ${foreignKey?.name || ''}: ${cardinality ? cardinality[1] : ''}`
            + `${foreignKey?.identifying ? ', identificadora' : ''}${foreignKey?.optional ? ', referencia opcional' : ''}.`;
        }

    const decision = relation.translation;

    if (!decision) {
        return 'Transformación pendiente: todavía no se ha elegido estrategia ni clave.';
        }

    if (decision.kind === 'foreign-key') {
        const child = relation.participations.find( item => item.id === decision.childParticipationId );

        return `Transformación: clave foránea en el lado ${child?.role || 'receptor'}`
            + `${decision.identifying ? ', identificadora (entra en la clave de la tabla que referencia)' : ''}.`;
        }

    const keyRoles = relation.participations
        .filter( item => decision.key?.participationIds.includes( item.id ) )
        .map( item => item.role || item.entityId );
    const keyAttributes = model.conceptual.attributes
        .filter( item => decision.key?.attributeIds.includes( item.id ) )
        .map( item => item.name );

    return `Transformación: tabla asociativa ${decision.tableName} con clave formada por `
        + `${[...keyRoles, ...keyAttributes].join( ', ' ) || 'una decisión pendiente'}.`;
    }

function reportRelationshipsSection( model ) {
    const projection = getConceptualProjection( model );
    const blocks = [];

    for (const relation of projection.relationships) {
        const ownAttributes = projection.attributes.filter(
                item => item.ownerKind === 'relationship' && item.ownerId === relation.id
                );

        blocks.push( reportHeading(
                `${relation.name} — relación ${reportDegree( relation )} ${relationshipType( relation ) || '(tipo sin decidir)'}`
                ) );
        blocks.push( reportTable(
                ['Entidad', 'Rol', 'Participación (mín,máx)', 'Cardinalidad'],
                relation.participations.map(
                        participation => [
                            projection.entities.find( item => item.id === participation.entityId )?.name
                                || participation.entityId,
                            participation.role || '—',
                            reportPair( participation ),
                            participationCardinalityLetter( relation, participation ) || 'sin decidir'
                            ]
                        )
                ) );

        if (ownAttributes.length) {
            const keyAttributeIds = relation.translation?.key?.attributeIds || [];

            blocks.push( reportParagraph( 'Atributos propios de la relación:' ) );
            blocks.push( reportTable(
                    REPORT_ATTRIBUTE_HEADER,
                    ownAttributes.map( attribute => reportAttributeRow( model, attribute, keyAttributeIds ) )
                    ) );
            }

        blocks.push( reportParagraph( reportRelationshipDecision( model, relation ) ) );

        if (!relation.projected && relation.notes?.trim()) {
            blocks.push( reportParagraph( `Notas: ${relation.notes.trim()}` ) );
            }
        }

    if (!blocks.length) {
        blocks.push( reportParagraph( 'El documento todavía no tiene relaciones.' ) );
        }

    return {heading: 'Relaciones', blocks};
    }

function reportGeneralizationsSection( model ) {
    const projection = getConceptualProjection( model );
    const name = id => projection.entities.find( item => item.id === id )?.name || id;
    const blocks = projection.generalizations.map(
            generalization => reportParagraph(
                    `${name( generalization.supertypeId )} se especializa en `
                        + `${generalization.subtypeIds.map( name ).join( ', ' )}: `
                        + `${generalization.disjoint ? 'disjunta' : 'solapada'} y `
                        + `${generalization.total ? 'total' : 'parcial'}. `
                        + (generalization.translation
                            ? 'Transformación: tablas de superclase y subclases.'
                            : 'Transformación pendiente.')
                        + (generalization.notes?.trim() ? ` Notas: ${generalization.notes.trim()}` : '')
                    )
            );

    if (!blocks.length) {
        blocks.push( reportParagraph( 'No hay especializaciones.' ) );
        }

    return {heading: 'Especializaciones', blocks};
    }

function reportAssumptionItems(
        model,
        kind
        ) {
    return documentAssumptions( model )
        .filter( item => item.kind === kind )
        .map(
                item => {
                    const label = item.elementId ? elementLabel( model, item.elementId ) : null;

                    return label ? `${item.text} (${label})` : item.text;
                    }
                );
    }

function reportAuthoredSection(
        model,
        kind,
        heading,
        emptyText
        ) {
    const items = reportAssumptionItems( model, kind );

    return {
        heading,
        blocks: [items.length ? reportList( items ) : reportParagraph( emptyText )]
        };
    }

function reportLostSemanticsSection( model ) {
    const authored = reportAssumptionItems( model, 'perdida' );
    const statuses = conceptualStatus( model );
    const documentary = statuses.filter( item => item.code === 'documentary' ).map( item => item.message );
    const pending = statuses.filter( item => item.code === 'pending' ).map( item => item.message );
    const blocks = [];

    blocks.push( reportParagraph( 'Escrito por el autor:' ) );
    blocks.push( authored.length ? reportList( authored ) : reportParagraph( 'Sin entradas.' ) );
    blocks.push( reportParagraph( 'Restricciones que el modelo relacional conserva solo como documentación:' ) );
    blocks.push( documentary.length ? reportList( documentary ) : reportParagraph( 'Ninguna detectada.' ) );

    if (pending.length) {
        blocks.push( reportParagraph( 'Decisiones todavía pendientes:' ) );
        blocks.push( reportList( pending ) );
        }

    const access = accessStatus( model ).map( item => item.message );

    blocks.push( reportParagraph( 'Lo que el diseño físico expresa de otra manera:' ) );
    blocks.push( access.length ? reportList( access ) : reportParagraph( 'Nada: todo tiene equivalente directo en el diseño físico.' ) );

    return {heading: 'Semántica perdida', blocks};
    }

function reportAccessSize( field ) {
    if (field.accessType === 'Número') {
        return field.fieldSize + (field.decimalPlaces === null || field.decimalPlaces === undefined ? '' : ` · ${field.decimalPlaces} decimales`);
        }

    return Number.isInteger( field.fieldSize ) ? String( field.fieldSize ) : '—';
    }

/** The tables as Access will hold them: fields with their properties, then the relationships. */
function reportPhysicalSection( model ) {
    const schema = accessSchema( model );
    const blocks = [];
    const indexLabel = value => ACCESS_INDEX_LABELS[value] || value;

    for (const table of schema.tables) {
        blocks.push( reportHeading( `${table.name}${table.description ? ` — ${table.description}` : ''}` ) );
        blocks.push( reportTable(
                ['Campo', 'Tipo de datos', 'Tamaño', 'Requerido', 'Indexado', 'Regla de validación', 'Predeterminado'],
                table.fields.map(
                        field => [
                            `${field.name}${field.primary ? ' (PK)' : ''}`,
                            field.accessType,
                            reportAccessSize( field ),
                            field.required ? 'Sí' : 'No',
                            indexLabel( field.indexed ),
                            field.validationRule || '—',
                            field.defaultValue || '—'
                            ]
                        )
                ) );

        if (table.validationRule) {
            blocks.push( reportParagraph( `Regla de validación de la tabla: ${table.validationRule}` ) );
            }
        }

    if (!schema.tables.length) {
        blocks.push( reportParagraph( 'Todavía no hay tablas.' ) );
        }

    const relations = schema.relationships.map(
            relation => `${relation.childTable} → ${relation.parentTable} (${relation.oneToOne ? 'uno a uno' : 'uno a varios'}): `
                + `${relation.enforce ? 'exigir integridad referencial' : 'sin integridad referencial'}`
                + `${relation.enforce && relation.cascadeUpdate ? ', actualizar en cascada' : ''}`
                + `${relation.enforce && relation.cascadeDelete ? ', eliminar en cascada' : ', eliminación restringida'}`
                + `${relation.lookup ? `; campo de búsqueda que muestra ${relation.displayColumn || relation.pairs[0].parentColumn}` : ''}.`
            );

    blocks.push( reportParagraph( 'Relaciones del diseño físico:' ) );
    blocks.push( relations.length ? reportList( relations ) : reportParagraph( 'Ninguna.' ) );

    return {heading: 'Diseño físico', blocks};
    }

/** The datasheets the author filled in, and what the rules say about them. */
function reportSampleDataSection( model ) {
    const blocks = [];
    const issues = dataStatus( model ).map( item => item.message );

    for (const table of model.tables.filter( item => item.kind === 'entity' )) {
        const rows = tableDataRows( model, table );

        if (!rows.length) {
            continue;
            }

        blocks.push( reportHeading( `${table.name} (${rows.length} filas)` ) );
        blocks.push( reportTable(
                table.columns.map( column => column.name ),
                rows.map( row => table.columns.map( column => row[column.id] ?? '' ) )
                ) );
        }

    if (!blocks.length) {
        blocks.push( reportParagraph( 'Sin filas de ejemplo.' ) );
        }

    blocks.push( reportParagraph( 'Comprobación de las filas frente a las reglas de las tablas:' ) );
    blocks.push( issues.length ? reportList( issues ) : reportParagraph( 'Sin incidencias.' ) );

    return {heading: 'Datos de ejemplo', blocks};
    }

const ACCESS_INDEX_LABELS = {
    no: 'No',
    duplicates: 'Sí (Con duplicados)',
    unique: 'Sí (Sin duplicados)'
    };

function reportColumnMarks(
        model,
        table,
        field
    ) {
    const marks = [];

    if (field.primary) {
        marks.push( 'PK' );
        }

    if (model.relationships.some(
            relation => relation.childId === table.id
                && relation.mappings.some( pair => pair.childColumnId === field.id )
            )) {
        marks.push( 'FK' );
        }

    if ((table.alternateKeys || []).some( key => key.columns.includes( field.id ) )) {
        marks.push( 'AK' );
        }

    return marks.length ? ` ${marks.join( ' ' )}` : '';
    }

function reportRelationalSection( model ) {
    const tables = model.tables.filter( item => item.kind === 'entity' ).map(
            table => `${table.name}(${table.columns.map(
                    field => `${field.name}${reportColumnMarks( model, table, field )}`
                    ).join( ', ' )})`
            );
    const foreignKeys = model.relationships.map(
            relation => {
                const parent = model.tables.find( item => item.id === relation.parentId );
                const child = model.tables.find( item => item.id === relation.childId );
                const cardinality = CARDINALITIES.find( item => item[0] === relation.cardinality );

                return `${child?.name} → ${parent?.name}: ${cardinality ? cardinality[2] : relation.cardinality}`
                    + `${relation.optional ? ', referencia opcional' : ', referencia obligatoria'}`
                    + `${relation.identifying ? ', identificadora' : ''}`
                    + `; al borrar ${relation.onDelete}, al actualizar ${relation.onUpdate}.`;
                }
            );

    return {
        heading: 'Esquema relacional resultante',
        blocks: [
            reportParagraph( 'Notación compacta (PK clave primaria, FK clave ajena, AK clave alternativa):' ),
            tables.length ? reportList( tables ) : reportParagraph( 'Todavía no hay tablas.' ),
            reportParagraph( 'Claves ajenas (FK), de la tabla que referencia a la referenciada:' ),
            foreignKeys.length ? reportList( foreignKeys ) : reportParagraph( 'Ninguna.' ),
            ...reportDictionaryBlocks( model )
            ]
        };
    }

/** Every table with its domains, nulls, defaults and keys, as the data dictionary of Visio's second page. */
function reportDictionaryBlocks( model ) {
    return relationalDictionary( model ).flatMap(
            table => [
                reportHeading( `${table.name} — tabla ${table.dependent ? 'dependiente' : 'independiente'}` ),
                reportTable(
                        ['Columna', 'Tipo', 'Claves', 'Nulos', 'Predeterminado', 'Dominio'],
                        table.columns.map(
                                column => [
                                    column.name,
                                    column.type,
                                    column.keys.join( ', ' ) || '—',
                                    column.nullable ? 'Admite nulos' : 'NOT NULL',
                                    column.defaultValue || '—',
                                    column.domain
                                    ]
                                )
                        ),
                ...(table.alternateKeys.length || table.uniqueIndexes.length || table.foreignKeys.length
                    ? [reportList( [
                        ...table.alternateKeys.map( key => `${key.label} ${key.name}: única y obligatoria sobre (${key.columns.join( ', ' )}).` ),
                        ...table.uniqueIndexes.map( index => `Índice único ${index.name} sobre (${index.columns.join( ', ' )}); admite nulos.` ),
                        ...table.foreignKeys.map( foreignKey => `${dictionaryForeignKeyLine( table, foreignKey )}.` )
                        ] )]
                    : [])
                ]
            );
    }

export function buildDesignReport( model ) {
    return {
        title: model.name,
        author: documentAuthor( model ),
        sections: [
            reportEntitiesSection( model ),
            reportRelationshipsSection( model ),
            reportGeneralizationsSection( model ),
            reportAuthoredSection(
                    model,
                    'enunciado',
                    'Semántica reflejada del enunciado',
                    'No se han registrado afirmaciones del enunciado.'
                    ),
            reportAuthoredSection(
                    model,
                    'supuesto',
                    'Supuestos semánticos',
                    'No se han registrado supuestos.'
                    ),
            reportLostSemanticsSection( model ),
            reportRelationalSection( model ),
            reportPhysicalSection( model ),
            reportSampleDataSection( model )
            ]
        };
    }

function reportMarkdownCell( text ) {
    return String( text ).replaceAll( '|', '\\|' ).replace( /\s*\n\s*/g, ' ' );
    }

function reportMarkdownBlock( block ) {
    switch (block.kind) {
        case 'list':
            return block.items.map( item => `- ${reportMarkdownCell( item )}` ).join( '\n' );
        case 'heading':
            return `### ${reportMarkdownCell( block.text )}`;
        case 'table':
            return [
                `| ${block.header.map( reportMarkdownCell ).join( ' | ' )} |`,
                `| ${block.header.map( () => '---' ).join( ' | ' )} |`,
                ...block.rows.map( row => `| ${row.map( reportMarkdownCell ).join( ' | ' )} |` )
                ].join( '\n' );
        default:
            return block.text;
        }
    }

/** "Alumno: Nombre Apellidos · DNI: …", or null while no field is filled in. */
export function reportAuthorLine( author ) {
    if (!author || !Object.values( author ).some( Boolean )) {
        return null;
        }

    const name = `${author.nombre} ${author.apellidos}`.trim() || '—';

    return `Alumno: ${name} · DNI: ${author.dni || '—'}`;
    }

export function reportToMarkdown( report ) {
    const parts = [`# Memoria del diseño: ${report.title}`];
    const authorLine = reportAuthorLine( report.author );

    if (authorLine) {
        parts.push( authorLine );
        }

    for (const section of report.sections) {
        parts.push( `## ${section.heading}` );
        parts.push( ...section.blocks.map( reportMarkdownBlock ) );
        }

    return `${parts.join( '\n\n' )}\n`;
    }

function reportHTMLBlock( block ) {
    switch (block.kind) {
        case 'list':
            return `<ul>${block.items.map( item => `<li>${escapeHTML( item )}</li>` ).join( '' )}</ul>`;
        case 'heading':
            return `<h3>${escapeHTML( block.text )}</h3>`;
        case 'table':
            return `<table><thead><tr>${block.header.map( cell => `<th>${escapeHTML( cell )}</th>` ).join( '' )}</tr></thead>`
                + `<tbody>${block.rows.map(
                        row => `<tr>${row.map( cell => `<td>${escapeHTML( cell )}</td>` ).join( '' )}</tr>`
                        ).join( '' )}</tbody></table>`;
        default:
            return `<p>${escapeHTML( block.text )}</p>`;
        }
    }

const REPORT_STYLES = `
    body { font-family: system-ui, sans-serif; line-height: 1.5; max-width: 60rem; margin: 2rem auto; padding: 0 1rem; color: #1f2d27; }
    h1, h2, h3 { line-height: 1.25; }
    h3 { font-size: 1.05em; margin: 1.2rem 0 0.4rem; }
    table { border-collapse: collapse; width: 100%; margin: 0.5rem 0 1rem; font-size: 0.95em; }
    th, td { border: 1px solid #b8cec2; padding: 0.3rem 0.5rem; text-align: left; vertical-align: top; }
    th { background: #edf7f2; }
    figure { margin: 1rem 0; }
    figure svg { max-width: 100%; height: auto; }
    figcaption { font-size: 0.9em; color: #526e60; }
    `;

/** Diagrams are given by the caller as SVG text; the report stays independent of the canvas. */
export function reportToHTML(
        report,
        diagrams = []
        ) {
    const figures = diagrams.map(
            diagram => `<figure>${diagram.svg}<figcaption>${escapeHTML( diagram.title )}</figcaption></figure>`
            ).join( '' );
    const sections = report.sections.map(
            section => `<section><h2>${escapeHTML( section.heading )}</h2>${section.blocks.map( reportHTMLBlock ).join( '' )}</section>`
            ).join( '' );
    const authorLine = reportAuthorLine( report.author );
    const author = authorLine ? `<p class="author">${escapeHTML( authorLine )}</p>` : '';

    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Memoria del diseño: ${escapeHTML( report.title )}</title>
<style>${REPORT_STYLES}</style>
</head>
<body>
<h1>Memoria del diseño: ${escapeHTML( report.title )}</h1>
${author}
${figures}
${sections}
</body>
</html>
`;
    }
