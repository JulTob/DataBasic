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

export const LIBRARY_TITLE = 'Biblioteca';

const libraryAssignment = 'Una biblioteca necesita organizar su catálogo. El personal quiere consultar '
    + 'quién escribió cada libro y encontrar otros libros sobre el mismo tema. Un libro puede tener '
    + 'varios autores y tratar varios temas. Un autor puede escribir varios libros y un tema puede '
    + 'aparecer en libros de distintos autores.'
    + '\n\n'
    + 'El catálogo ya está cargado. La biblioteca quiere dar de alta a sus usuarios y entregar '
    + 'a cada uno un carné con un número único. Amplía el modelo para que el personal pueda '
    + 'registrar a un usuario y encontrarlo por su número de carné. Decide qué datos deben '
    + 'conservarse de cada persona.';

const catalogEntities = [
    {
        name: 'Libro',
        notes: 'Cada libro tiene una ficha. El año y el ISBN corresponden a la edición de referencia.',
        position: {x: 530, y: 70},
        chenPosition: {x: 665, y: 225},
        attributesY: 40,
        fields: [
            ['id', 'NUMBER(4)'],
            ['titulo', 'VARCHAR(160)'],
            ['genero', 'VARCHAR(24)'],
            ['anio_edicion', 'NUMBER(4)'],
            ['isbn', 'CHAR(13)', {required: false}]
            ]
        },
    {
        name: 'Autor',
        notes: 'El catálogo conserva la coautoría y admite libros anónimos.',
        position: {x: 70, y: 70},
        chenPosition: {x: 120, y: 225},
        attributesY: 380,
        fields: [
            ['id', 'NUMBER(4)'],
            ['nombre', 'VARCHAR(80)']
            ]
        },
    {
        name: 'Tema',
        notes: 'Un tema agrupa los libros que tratan una misma materia.',
        position: {x: 990, y: 70},
        chenPosition: {x: 1210, y: 225},
        attributesY: 380,
        fields: [
            ['id', 'NUMBER(4)'],
            ['nombre', 'VARCHAR(60)']
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

function addCatalogAssociation(
        model,
        name,
        participants,
        tableName
        ) {
    const participations = participants.map( entityName => {
        const entity = model.conceptual.entities.find( item => item.name === entityName );
        return {entityId: entity.id, role: entityName.toLowerCase(), min: 0, max: null};
        } );
    const next = addConceptualRelationship( model, {name, participations} );
    const relation = next.conceptual.relationships.at( -1 );

    return updateConceptualRelationship( next, relation.id, {
        translation: {
            kind: 'association',
            tableName,
            key: {
                participationIds: relation.participations.map( part => part.id ),
                attributeIds: []
                }
            }
        } );
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

/** Every new library starts with the same catalogue and fresh model identifiers. */
export function libraryDocument() {
    let model = emptyDocument();
    model.name = LIBRARY_TITLE;

    for (const entity of catalogEntities) {
        model = addCatalogEntity( model, entity );
        }

    model = addCatalogAssociation( model, 'Escribe', ['Autor', 'Libro'], 'Autoria' );
    model = addCatalogAssociation( model, 'Trata', ['Libro', 'Tema'], 'LibroTema' );

    for (const [name, x, y] of [
        ['Autoria', 300, 420],
        ['LibroTema', 760, 420]
        ]) {
        const table = model.tables.find( item => item.name === name );
        model = moveDiagramElement( model, table.id, {x, y}, 'relational' );
        }

    for (const contents of libraryContents()) {
        model = addCatalogRows( model, contents );
        }

    return addAssumption( model, {
        kind: 'enunciado',
        text: libraryAssignment
        } );
    }
