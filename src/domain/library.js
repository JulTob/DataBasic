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

const catalogEntities = [
    {
        name: 'Libro',
        notes: 'La obra que se cataloga, con independencia de sus ediciones.',
        position: {x: 70, y: 100},
        chenPosition: {x: 870, y: 230},
        attributesY: 35,
        fields: [
            ['id', 'NUMBER(4)'],
            ['titulo', 'VARCHAR(100)'],
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

// Real titles and authors; local identifiers, classifications, holdings and collecting interests are examples.
const catalogContents = [
    {
        table: 'Libro',
        fields: ['id', 'titulo', 'genero', 'cdu'],
        rows: [
            [1, 'Campos de Castilla', 'Poesía', '821.134.2-1'],
            [2, 'La Lola se va a los puertos', 'Teatro', '821.134.2-2'],
            [3, 'Don Quijote de la Mancha, primera parte', 'Novela', '821.134.2-3'],
            [4, 'Lazarillo de Tormes', 'Novela', '821.134.2-3'],
            [5, 'The Story of Art', 'Ensayo', '7'],
            [6, 'La fotografía como documento social', 'Ensayo', '77'],
            [7, 'On the Origin of Species', 'Tratado', '57'],
            [8, 'The Variation of Animals and Plants under Domestication', 'Tratado', '63'],
            [9, 'Reglas y consejos sobre investigación científica', 'Ensayo', '001.8'],
            [10, 'Textura del sistema nervioso del hombre y de los vertebrados', 'Tratado', '611.8'],
            [11, 'Fundamentos de bases de datos', 'Manual', '004.65'],
            [12, 'Notes on Nursing: What It Is, and What It Is Not', 'Manual', '616-083']
            ]
        },
    {
        table: 'Autor',
        fields: ['id', 'nombre'],
        rows: [
            [1, 'Antonio Machado'],
            [2, 'Manuel Machado'],
            [3, 'Miguel de Cervantes'],
            [4, 'Ernst H. Gombrich'],
            [5, 'Gisèle Freund'],
            [6, 'Charles Darwin'],
            [7, 'Santiago Ramón y Cajal'],
            [8, 'Abraham Silberschatz'],
            [9, 'Henry F. Korth'],
            [10, 'S. Sudarshan'],
            [11, 'Florence Nightingale']
            ]
        },
    {
        table: 'Autoria',
        fields: ['autor_id', 'libro_id'],
        rows: [
            [1, 1],
            [2, 2],
            [1, 2],
            [3, 3],
            [4, 5],
            [5, 6],
            [6, 7],
            [6, 8],
            [7, 9],
            [7, 10],
            [8, 11],
            [9, 11],
            [10, 11],
            [11, 12]
            ]
        },
    {
        table: 'Edicion',
        fields: ['id', 'libro_id', 'anio', 'isbn'],
        rows: [
            [11, 1, 2006, '9788437608662'],
            [12, 1, 1912, null],
            [21, 2, 1929, null],
            [31, 3, 1605, null],
            [41, 4, 2006, '9788437606606'],
            [51, 5, 1950, null],
            [61, 6, 2017, '9788425229947'],
            [71, 7, 1859, null],
            [81, 8, 1868, null],
            [91, 9, 1923, null],
            [101, 10, 1899, null],
            [111, 11, 2006, '9788448146443'],
            [121, 12, 1860, null]
            ]
        },
    {
        table: 'Campus',
        fields: ['id', 'nombre'],
        rows: [
            [1, 'Altea'],
            [2, 'Elche'],
            [3, 'Orihuela'],
            [4, 'Sant Joan d’Alacant']
            ]
        },
    {
        table: 'Materia',
        fields: ['id', 'nombre'],
        rows: [
            [1, 'Literatura'],
            [2, 'Bellas artes'],
            [3, 'Comunicación'],
            [4, 'Biología'],
            [5, 'Agronomía'],
            [6, 'Ciencias de la salud'],
            [7, 'Metodología de la investigación'],
            [8, 'Informática']
            ]
        },
    {
        table: 'LibroMateria',
        fields: ['libro_id', 'materia_id'],
        rows: [
            [1, 1],
            [2, 1],
            [2, 2],
            [3, 1],
            [4, 1],
            [5, 2],
            [6, 2],
            [6, 3],
            [7, 4],
            [8, 4],
            [8, 5],
            [9, 7],
            [9, 6],
            [10, 6],
            [11, 8],
            [12, 6]
            ]
        },
    {
        table: 'CampusMateria',
        fields: ['campus_id', 'materia_id'],
        rows: [
            [1, 1],
            [1, 2],
            [1, 3],
            [2, 3],
            [2, 4],
            [2, 7],
            [2, 8],
            [3, 4],
            [3, 5],
            [4, 4],
            [4, 6],
            [4, 7]
            ]
        },
    {
        table: 'Ejemplar',
        fields: ['registro', 'edicion_id', 'campus_id', 'signatura', 'estante'],
        rows: [
            [101, 11, 1, 'P MAC cam', 'A'],
            [102, 11, 2, 'P MAC cam', 'A'],
            [103, 11, 3, 'P MAC cam', 'B'],
            [104, 21, 1, 'T MAC lol', 'A'],
            [105, 41, 3, 'N laz', 'B'],
            [106, 31, 2, 'N CER don', 'B'],
            [107, 51, 1, '7 GOM sto', 'A'],
            [108, 61, 1, '77 FRE fot', 'B'],
            [109, 71, 2, '57 DAR ori', 'A'],
            [110, 81, 3, '63 DAR var', 'A'],
            [111, 91, 4, '001 CAJ reg', 'A'],
            [112, 101, 4, '611 CAJ tex', 'B'],
            [113, 111, 2, '004 SIL fun', 'A'],
            [114, 121, 4, '616 NIG not', 'B'],
            [115, 11, 4, 'P MAC cam', 'B'],
            [116, 111, 3, '004 SIL fun', 'A']
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
    model.name = 'Biblioteca UMH antes de abrir';

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

    for (const contents of catalogContents) {
        model = addCatalogRows( model, contents );
        }

    model = addAssumption( model, {
        kind: 'supuesto',
        text: 'El ejercicio usa los cuatro campus de la Universidad Miguel Hernández. Los ejemplares, las signaturas y los perfiles de materias son datos de práctica. Un campus puede custodiar libros sobre cualquier materia.'
        } );

    return addAssumption( model, {
        kind: 'enunciado',
        text: 'El catálogo ya está preparado. Antes de abrir al público, diseña el carné de socio y el préstamo de cada ejemplar. Conserva el historial cuando una persona vuelva a pedir la misma copia.'
        } );
    }
