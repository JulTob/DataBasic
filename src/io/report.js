import {
    CARDINALITIES,
    conceptualStatus,
    documentAssumptions,
    elementLabel,
    getConceptualProjection,
    participationCardinalityLetter
    } from '../domain/model.js';
import { escapeHTML } from '../ui/html.js';

/**
 * The design report is a small algebra: `buildDesignReport` turns a document
 * into a report model (sections made of paragraphs, lists and tables), and
 * each renderer only gives that model a format. Nothing here mutates the
 * document or invents decisions the author did not take.
 * @typedef {{kind:'paragraph',text:string}
 *   |{kind:'list',items:string[]}
 *   |{kind:'table',header:string[],rows:string[][]}} ReportBlock
 * @typedef {{heading:string,blocks:ReportBlock[]}} ReportSection
 * @typedef {{title:string,sections:ReportSection[]}} DesignReport
 */

function reportParagraph( text ) {
    return {kind: 'paragraph', text};
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

function reportDomainSummary( domain ) {
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

function reportAttributeIdentity( attribute ) {
    if (attribute.primary) {
        return 'Clave';
        }

    if (attribute.partialKey) {
        return 'Clave parcial';
        }

    return attribute.required ? 'Requerido' : 'Opcional';
    }

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

        blocks.push( reportParagraph( reportEntityHeading( projection, entity ) ) );

        if (entity.notes?.trim()) {
            blocks.push( reportParagraph( `Notas: ${entity.notes.trim()}` ) );
            }

        blocks.push( reportTable(
                ['Atributo', 'Tipo', 'Identidad', 'Tipología', 'Dominio', 'Notas'],
                attributes.map(
                        attribute => [
                            attribute.name,
                            attribute.type || '—',
                            reportAttributeIdentity( attribute ),
                            reportAttributeTypology( attribute ),
                            reportDomainSummary( attribute.domain ),
                            attribute.notes?.trim() || '—'
                            ]
                        )
                ) );
        }

    if (!blocks.length) {
        blocks.push( reportParagraph( 'El documento todavía no tiene entidades.' ) );
        }

    return {heading: 'Entidades y atributos', blocks};
    }

function reportDegree( relation ) {
    return {2: 'binaria', 3: 'ternaria'}[relation.participations.length] || `de grado ${relation.participations.length}`;
    }

function reportRelationshipDecision(
        model,
        relation
        ) {
    if (relation.projected) {
        const foreignKey = model.relationships.find( item => item.id === relation.foreignKeyId );
        const cardinality = CARDINALITIES.find( item => item[0] === foreignKey?.cardinality );

        return `Procede de la clave foránea ${foreignKey?.name || ''}: ${cardinality ? cardinality[1] : ''}`
            + `${foreignKey?.identifying ? ', identificadora' : ''}${foreignKey?.optional ? ', padre opcional' : ''}.`;
        }

    const decision = relation.translation;

    if (!decision) {
        return 'Transformación pendiente: todavía no se ha elegido estrategia ni clave.';
        }

    if (decision.kind === 'foreign-key') {
        const child = relation.participations.find( item => item.id === decision.childParticipationId );

        return `Transformación: clave foránea en el lado ${child?.role || 'receptor'}`
            + `${decision.identifying ? ', identificadora (entra en la clave hija)' : ''}.`;
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

        blocks.push( reportParagraph( `${relation.name} — relación ${reportDegree( relation )}` ) );
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
            blocks.push( reportParagraph(
                    `Atributos propios: ${ownAttributes.map( item => `${item.name} (${item.type})` ).join( ', ' )}.`
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

    return {heading: 'Semántica perdida', blocks};
    }

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
                    + `${relation.optional ? ', padre opcional' : ', padre obligatorio'}`
                    + `${relation.identifying ? ', identificadora' : ''}`
                    + `; al borrar ${relation.onDelete}, al actualizar ${relation.onUpdate}.`;
                }
            );

    return {
        heading: 'Esquema relacional resultante',
        blocks: [
            tables.length ? reportList( tables ) : reportParagraph( 'Todavía no hay tablas.' ),
            reportParagraph( 'Claves foráneas:' ),
            foreignKeys.length ? reportList( foreignKeys ) : reportParagraph( 'Ninguna.' )
            ]
        };
    }

export function buildDesignReport( model ) {
    return {
        title: model.name,
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
            reportRelationalSection( model )
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

export function reportToMarkdown( report ) {
    const parts = [`# Memoria del diseño: ${report.title}`];

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
    h1, h2 { line-height: 1.25; }
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

    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Memoria del diseño: ${escapeHTML( report.title )}</title>
<style>${REPORT_STYLES}</style>
</head>
<body>
<h1>Memoria del diseño: ${escapeHTML( report.title )}</h1>
${figures}
${sections}
</body>
</html>
`;
    }
