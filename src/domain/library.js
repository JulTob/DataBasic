import {libraryContents} from './library-collection.js';
import {
    addAssumption,
    addConceptualAttribute,
    addConceptualEntity,
    addConceptualRelationship,
    emptyDocument,
    moveDiagramElement,
    setDataRows,
    updateConceptualRelationship
    } from './model.js';

export const LIBRARY_TITLE = 'Biblioteca UMH';

const libraryAssignment = 'El catálogo ya está preparado. Antes de abrir al público, '
    + 'diseña el carné de socio y el préstamo de cada ejemplar. '
    + 'Conserva el historial cuando una persona vuelva a pedir la misma copia.';

export function restoredLibraryTitle( model ) {
    if (model.name !== 'Biblioteca UMH antes de abrir') return model.name;

    const originalAssignment = model.assumptions?.some(
            item => item.kind === 'enunciado' && item.text === libraryAssignment
            );
    return originalAssignment ? LIBRARY_TITLE : model.name;
    }

const catalogEntities = [
    {
        name: 'Libro',
        notes: 'La obra que se cataloga, con independencia de sus ediciones.',
        position: {x: 70, y: 100},
        chenPosition: {x: 870, y: 230},
        attributesY: 35,
        fields: [
            ['id', 'NUMBER(4)'],
            ['titulo', 'VARCHAR(160)'],
            ['genero', 'VARCHAR(24)'],
            ['cdu', 'VARCHAR(24)']
            ]
        },
    {
        name: 'Autor',
        notes: 'Una persona puede firmar varios libros o compartir la autoría.',
        position: {x: 70, y: 805},
        chenPosition: {x: 220, y: 230},
        attributesY: 35,
        fields: [
            ['id', 'NUMBER(4)'],
            ['nombre', 'VARCHAR(80)']
            ]
        },
    {
        name: 'Edicion',
        notes: 'Cada publicación se describe por separado. Las ediciones antiguas carecen de ISBN.',
        position: {x: 540, y: 450},
        chenPosition: {x: 220, y: 780},
        attributesY: 935,
        fields: [
            ['id', 'NUMBER(4)'],
            ['anio', 'NUMBER(4)'],
            ['isbn', 'CHAR(13)', {required: false}]
            ]
        },
    {
        name: 'Ejemplar',
        notes: 'El registro identifica cada copia. La signatura y el estante la localizan dentro de su campus.',
        position: {x: 540, y: 805},
        chenPosition: {x: 870, y: 780},
        attributesY: 935,
        fields: [
            ['registro', 'NUMBER(6)'],
            ['signatura', 'VARCHAR(20)'],
            ['estante', 'VARCHAR(12)']
            ]
        },
    {
        name: 'Materia',
        notes: 'Término temático del catálogo didáctico. Una obra puede tratar varias materias.',
        position: {x: 1010, y: 100},
        chenPosition: {x: 1520, y: 230},
        attributesY: 35,
        fields: [
            ['id', 'NUMBER(4)'],
            ['nombre', 'VARCHAR(60)']
            ]
        },
    {
        name: 'Campus',
        notes: 'La ubicación se agrupa por campus. Orihuela reúne las bibliotecas de la EPSO y de Las Salesas.',
        position: {x: 1010, y: 805},
        chenPosition: {x: 1520, y: 780},
        attributesY: 935,
        fields: [
            ['id', 'NUMBER(4)'],
            ['nombre', 'VARCHAR(40)']
            ]
        }
    ];

function addCatalogEntity(
        model,
        definition
        ) {
    const {name, notes, position, fields, chenPosition, attributesY} = definition;
    let next = addConceptualEntity( model, {name, notes, withIdentifier: false}, position );
    const ownerId = next.conceptual.entities.at( -1 ).id;
    next = moveDiagramElement( next, ownerId, chenPosition, 'chen' );

    for (const [index, [fieldName, type, options]] of fields.entries()) {
        next = addConceptualAttribute( next, {
            ownerId,
            name: fieldName,
            type,
            primary: index === 0,
            required: true,
            ...options
            } );

        // Reserve the middle of the diagram for relationships and place attributes on its outer edges.
        const attribute = next.conceptual.attributes.at( -1 );
        const offset = (index - (fields.length - 1) / 2) * 206;
        next = moveDiagramElement(
                next,
                attribute.id,
                {x: chenPosition.x + offset, y: attributesY},
                'chen'
                );
        }

    return next;
    }

function addCatalogRelationship(
        model,
        name,
        parent,
        child,
        associationTable
        ) {
    const participations = [parent, child].map( (entityName, index) => {
        const entity = model.conceptual.entities.find( item => item.name === entityName );
        const requiredOwner = index === 1 && !associationTable;

        return {
            entityId: entity.id,
            role: entityName.toLowerCase(),
            min: requiredOwner ? 1 : 0,
            max: requiredOwner ? 1 : null
            };
        } );
    const next = addConceptualRelationship( model, {name, participations} );
    const relation = next.conceptual.relationships.at( -1 );
    const translation = associationTable
        ? {
            kind: 'association',
            tableName: associationTable,
            key: {participationIds: relation.participations.map( part => part.id ), attributeIds: []}
            }
        : {
            kind: 'foreign-key',
            childParticipationId: relation.participations[1].id
            };

    return updateConceptualRelationship( next, relation.id, {translation} );
    }

function addCatalogRows(
        model,
        contents
        ) {
    const table = model.tables.find( item => item.name === contents.table );
    const ids = contents.fields.map( name => table.columns.find( field => field.name === name ).id );
    const rows = contents.rows.map( values => {
        const row = {};
        for (const [index, value] of values.entries()) {
            if (value !== null) {
                row[ids[index]] = String( value );
                }
            }

        return row;
        } );

    return setDataRows( model, table.id, rows );
    }

/** A populated catalogue awaiting its first member and loan; every opening gets fresh domain IDs. */
export function libraryDocument() {
    let model = emptyDocument();
    model.name = LIBRARY_TITLE;

    for (const entity of catalogEntities) {
        model = addCatalogEntity( model, entity );
        }

    model = addCatalogRelationship( model, 'Escribe', 'Autor', 'Libro', 'Autoria' );
    model = addCatalogRelationship( model, 'Se publica en', 'Libro', 'Edicion' );
    model = addCatalogRelationship( model, 'Tiene copias', 'Edicion', 'Ejemplar' );

    model = addCatalogRelationship( model, 'Se clasifica en', 'Libro', 'Materia', 'LibroMateria' );
    model = addCatalogRelationship( model, 'Desarrolla', 'Campus', 'Materia', 'CampusMateria' );
    model = addCatalogRelationship( model, 'Custodia', 'Campus', 'Ejemplar' );

    for (const [name, x, y] of [
        ['Autoria', 70, 450],
        ['LibroMateria', 540, 100],
        ['CampusMateria', 1010, 450]
        ]) {
        const table = model.tables.find( item => item.name === name );
        model = moveDiagramElement( model, table.id, {x, y}, 'relational' );
        }

    for (const contents of libraryContents()) {
        model = addCatalogRows( model, contents );
        }

    model = addAssumption( model, {
        kind: 'supuesto',
        text: 'El ejercicio usa los cuatro campus de la Universidad Miguel Hernández. Los ejemplares, las signaturas y los perfiles de materias son datos de práctica. Un campus puede custodiar libros sobre cualquier materia.'
        } );

    return addAssumption( model, {
        kind: 'enunciado',
        text: libraryAssignment
        } );
    }
