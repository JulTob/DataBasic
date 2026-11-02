/**
 * Public operations return a new document; a rejected operation never changes
 * the input. References use stable IDs, so renaming cannot break foreign keys.
 * @typedef {{id:string, name:string, type:string, required:boolean,
 * primary:boolean, notes:string, defaultValue:string}} Column
 * @typedef {{id:string, name:string, conceptualName:string, syncNames:boolean,
 * namespace:string, kind:'entity'|'view', x:number, y:number,
 * columns:Column[], notes:string, definition:string,
 * indexes:{id:string,name:string,columns:string[],unique:boolean}[]}} Entity
 * @typedef {{id:string,parentId:string,childId:string,name:string,
 * forward:string,inverse:string,cardinality:string,identifying:boolean,
 * optional:boolean,onDelete:string,onUpdate:string,
 * mappings:{parentColumnId:string,childColumnId:string}[]}} Relationship
 * @typedef {{format:'databasic',version:1,name:string,tables:Entity[],
 * relationships:Relationship[],display:{conceptual:boolean,types:boolean,
 * keys:boolean,required:boolean,crowsFeet:boolean,cardinality:boolean,
 * relationshipNames:boolean,grid:boolean}}} Document
 */

export const DATA_TYPES = [
    'NUMBER',
    'NUMBER(10)',
    'NUMBER(10,2)',
    'INTEGER',
    'SMALLINT',
    'BIGINT',
    'VARCHAR(50)',
    'VARCHAR(100)',
    'CHAR(10)',
    'DECIMAL(10,2)',
    'REAL',
    'BOOLEAN',
    'DATE',
    'TIMESTAMP',
    'TEXT'
    ];

export const CARDINALITIES = [
    ['zero-many', 'Cero o más', '0..N'],
    ['one-many', 'Uno o más', '1..N'],
    ['zero-one', 'Cero o uno', '0..1'],
    ['one-one', 'Exactamente uno', '1..1']
    ];

export const ACTIONS = [
    'NO ACTION',
    'CASCADE',
    'SET NULL',
    'SET DEFAULT'
    ];

export function newId() {
    return crypto.randomUUID();
    }

export function emptyDocument() {
    return {
        format: 'databasic',
        version: 1,
        name: 'Modelo de base de datos',
        tables: [],
        relationships: [],
        display: {
            conceptual: false,
            types: true,
            keys: true,
            required: true,
            crowsFeet: true,
            cardinality: false,
            relationshipNames: true,
            grid: true
            }
        };
    }

export function column(
        name = 'id',
        type = 'INTEGER',
        primary = false
        ) {
    return {
        id: newId(),
        name,
        type,
        required: primary,
        primary,
        notes: '',
        defaultValue: ''
        };
    }

export function requireTable(
        model,
        tableId
        ) {
    const table = model.tables.find( item => item.id === tableId );

    if (!table) {
        throw new Error( 'La tabla seleccionada ya no existe.' );
        }

    return table;
    }

export function sameType(
        first,
        second
        ) {
    return first.replace( /\s/g, '' ).toUpperCase()
        === second.replace( /\s/g, '' ).toUpperCase();
    }

export function validType( value ) {
    const normalized = value.trim().toUpperCase();
    const basicTypes = [
        'INTEGER', 'INT', 'SMALLINT', 'BIGINT', 'REAL', 'FLOAT', 'DOUBLE',
        'BOOLEAN', 'BOOL', 'DATE', 'TIME', 'TIMESTAMP', 'DATETIME',
        'TEXT', 'BLOB', 'UUID', 'NUMBER'
        ];

    if (basicTypes.includes( normalized )) {
        return true;
        }

    if (/^(VAR)?CHAR\([1-9]\d*\)$/.test( normalized )) {
        return true;
        }

    const number = /^NUMBER\(\s*([1-9]\d*)\s*(?:,\s*([+-]?\d+)\s*)?\)$/.exec(
            normalized
            );

    if (number) {
        const precision = Number( number[1] );
        const scale = number[2] === undefined ? 0 : Number( number[2] );

        return precision <= 38
            && scale >= -84
            && scale <= 127;
        }

    const decimal = /^(DECIMAL|NUMERIC)\(([1-9]\d*),\s*(\d+)\)$/.exec(
            normalized
            );

    return decimal !== null && Number( decimal[3] ) <= Number( decimal[2] );
    }

/** Runs an atomic operation. Public invariants are checked before commit. */
export function changeDocument(
        model,
        operation
        ) {
    const next = structuredClone( model );

    operation( next );

    const errors = validateDocument( next )
        .filter( issue => issue.level === 'error' );

    if (errors.length) {
        throw new Error( errors[0].message );
        }

    return next;
    }

export function addTable(
        model,
        kind = 'entity',
        position = {x: 130, y: 100}
        ) {
    return changeDocument(
            model,
            next => {
                const prefix = kind === 'view' ? 'Vista' : 'Entidad';
                let number = 1;

                while (next.tables.some( table => table.name === `${prefix}${number}` )) {
                    number += 1;
                    }

                next.tables.push({
                    id: newId(),
                    name: `${prefix}${number}`,
                    conceptualName: `${prefix}${number}`,
                    syncNames: true,
                    namespace: '',
                    kind,
                    x: Math.max( 20, position.x ),
                    y: Math.max( 20, position.y ),
                    columns: kind === 'view' ? [] : [column( 'id', 'INTEGER', true )],
                    notes: '',
                    definition: '',
                    indexes: []
                    });
                }
            );
    }

export function updateTable(
        model,
        tableId,
        patch
        ) {
    return changeDocument(
            model,
            next => {
                const table = requireTable( next, tableId );

                Object.assign( table, patch );

                if (table.syncNames && 'name' in patch) {
                    table.conceptualName = patch.name;
                    }

                if (table.syncNames && 'conceptualName' in patch) {
                    table.name = patch.conceptualName;
                    }
                }
            );
    }

export function addColumn(
        model,
        tableId
        ) {
    return changeDocument(
            model,
            next => {
                const table = requireTable( next, tableId );
                let number = 1;

                while (table.columns.some( item => item.name === `columna${number}` )) {
                    number += 1;
                    }

                table.columns.push( column( `columna${number}`, 'VARCHAR(50)' ) );
                }
            );
    }

export function updateColumn(
        model,
        tableId,
        columnId,
        patch
        ) {
    return changeDocument(
            model,
            next => {
                const table = requireTable( next, tableId );
                const field = table.columns.find( item => item.id === columnId );

                if (!field) {
                    throw new Error( 'La columna seleccionada ya no existe.' );
                    }

                Object.assign( field, patch );

                if (field.primary) {
                    field.required = true;
                    }
                }
            );
    }

export function removeColumn(
        model,
        tableId,
        columnId
        ) {
    return changeDocument(
            model,
            next => {
                const referenced = next.relationships.some(
                        relation => relation.mappings.some(
                                pair => pair.parentColumnId === columnId
                                    || pair.childColumnId === columnId
                                )
                        );

                if (referenced) {
                    throw new Error(
                            'La columna participa en una relación. Elimina primero esa relación.'
                            );
                    }

                const table = requireTable( next, tableId );

                table.columns = table.columns.filter( item => item.id !== columnId );

                for (const index of table.indexes) {
                    index.columns = index.columns.filter( id => id !== columnId );
                    }

                table.indexes = table.indexes.filter( index => index.columns.length );
                }
            );
    }

export function moveColumn(
        model,
        tableId,
        columnId,
        direction
        ) {
    return changeDocument(
            model,
            next => {
                const columns = requireTable( next, tableId ).columns;
                const index = columns.findIndex( item => item.id === columnId );
                const target = index + direction;

                if (index < 0 || target < 0 || target >= columns.length) {
                    return;
                    }

                [columns[index], columns[target]] = [columns[target], columns[index]];
                }
            );
    }

/** Parent must have a primary key. Missing child fields are migrated together. */
export function addRelationship(
        model,
        parentId,
        childId
        ) {
    return changeDocument(
            model,
            next => {
                const parent = requireTable( next, parentId );
                const child = requireTable( next, childId );
                const keys = parent.columns.filter( item => item.primary );

                if (parent.kind !== 'entity' || child.kind !== 'entity') {
                    throw new Error( 'Las relaciones se crean entre entidades, no entre vistas.' );
                    }

                if (!keys.length) {
                    throw new Error( 'Define primero una clave primaria en la entidad padre.' );
                    }

                const mappings = keys.map(
                        key => {
                            const targetName = parentId === childId
                                ? `${key.name}_padre`
                                : key.name;

                            let target = child.columns.find(
                                    field => field.name.toLowerCase()
                                        === targetName.toLowerCase()
                                    );

                            if (target && !sameType( target.type, key.type )) {
                                throw new Error(
                                        `La columna ${targetName} existe con un tipo incompatible.`
                                        );
                                }

                            if (!target) {
                                target = column( targetName, key.type );
                                child.columns.push( target );
                                }

                            return {
                                parentColumnId: key.id,
                                childColumnId: target.id
                                };
                            }
                        );

                const duplicate = next.relationships.some(
                        relation => relation.parentId === parentId
                            && relation.childId === childId
                            && relation.mappings.every(
                                    (pair, index) => pair.childColumnId
                                        === mappings[index]?.childColumnId
                                    )
                        );

                if (duplicate) {
                    throw new Error( 'Ya existe esa relación entre las mismas columnas.' );
                    }

                next.relationships.push({
                    id: newId(),
                    parentId,
                    childId,
                    name: `FK_${child.name}_${parent.name}`,
                    forward: 'tiene',
                    inverse: 'pertenece a',
                    cardinality: 'zero-many',
                    identifying: false,
                    optional: !mappings.every(
                            pair => child.columns.find(
                                    item => item.id === pair.childColumnId
                                    ).required
                            ),
                    onDelete: 'NO ACTION',
                    onUpdate: 'NO ACTION',
                    mappings
                    });
                }
            );
    }

export function updateRelationship(
        model,
        relationshipId,
        patch
        ) {
    return changeDocument(
            model,
            next => {
                const relation = next.relationships.find(
                        item => item.id === relationshipId
                        );

                if (!relation) {
                    throw new Error( 'La relación seleccionada ya no existe.' );
                    }

                Object.assign( relation, patch );

                const child = requireTable( next, relation.childId );

                if (relation.identifying) {
                    relation.optional = false;
                    }

                for (const pair of relation.mappings) {
                    const field = child.columns.find(
                            item => item.id === pair.childColumnId
                            );

                    if (!field) {
                        throw new Error( 'La columna hija seleccionada no existe.' );
                        }

                    if (relation.identifying) {
                        field.primary = true;
                        }

                    field.required = field.primary || !relation.optional;
                    }
                }
            );
    }

/** Removal retains migrated columns: they may hold data or serve another FK. */
export function removeElement(
        model,
        selectedId
        ) {
    return changeDocument(
            model,
            next => {
                next.tables = next.tables.filter( table => table.id !== selectedId );
                next.relationships = next.relationships.filter(
                        relation => relation.id !== selectedId
                            && relation.parentId !== selectedId
                            && relation.childId !== selectedId
                        );
                }
            );
    }

export function validateDocument( model ) {
    const issues = [];
    const add = (level, message, elementId) => issues.push({level, message, elementId});
    const names = new Set();

    for (const table of model.tables) {
        const tableName = `${table.namespace}.${table.name}`.toLowerCase();

        if (!table.name.trim() || names.has( tableName )) {
            add( 'error', 'Cada entidad necesita un nombre físico único en su espacio de nombres.', table.id );
            }

        names.add( tableName );

        if (![table.x, table.y].every(
                coordinate => Number.isFinite( coordinate )
                    && coordinate >= 0
                    && coordinate <= 20000
                )) {
            add( 'error', `${table.name}: la posición está fuera del lienzo admitido.`, table.id );
            }

        const columnNames = new Set();

        for (const field of table.columns) {
            const name = field.name.toLowerCase();

            if (!field.name.trim() || columnNames.has( name )) {
                add( 'error', `${table.name}: cada columna necesita un nombre único.`, table.id );
                }

            columnNames.add( name );

            if (!validType( field.type )) {
                add( 'error', `${table.name}.${field.name}: tipo de datos no admitido.`, table.id );
                }

            if (field.primary && !field.required) {
                add( 'error', `${table.name}.${field.name}: una clave primaria no admite nulos.`, table.id );
                }
            }

        if (table.kind === 'entity' && !table.columns.some( field => field.primary )) {
            add( 'warning', `${table.name}: falta definir la clave primaria.`, table.id );
            }

        if (table.kind === 'view' && !table.definition.trim()) {
            add( 'warning', `${table.name}: escribe la consulta que define la vista.`, table.id );
            }

        const indexNames = new Set();

        for (const index of table.indexes) {
            if (!index.name.trim() || indexNames.has( index.name.toLowerCase() )
                || !index.columns.length || new Set( index.columns ).size !== index.columns.length
                || index.columns.some( id => !table.columns.some( field => field.id === id ) )) {
                add( 'error', `${table.name}: el índice debe tener nombre único y columnas válidas.`, table.id );
                }

            indexNames.add( index.name.toLowerCase() );
            }
        }

    const constraintNames = new Set();

    for (const relation of model.relationships) {
        const constraintName = `${relation.childId}.${relation.name}`.toLowerCase();

        if (!relation.name.trim() || constraintNames.has( constraintName )) {
            add( 'error', 'Cada relación necesita un nombre físico único en su tabla hija.', relation.id );
            }

        constraintNames.add( constraintName );

        if (!CARDINALITIES.some( item => item[0] === relation.cardinality )
            || !ACTIONS.includes( relation.onDelete )
            || !ACTIONS.includes( relation.onUpdate )) {
            add( 'error', `${relation.name}: cardinalidad o acción referencial no admitida.`, relation.id );
            }

        const parent = model.tables.find( table => table.id === relation.parentId );
        const child = model.tables.find( table => table.id === relation.childId );

        if (!parent || !child || parent.kind !== 'entity' || child.kind !== 'entity') {
            add( 'error', 'Una relación referencia entidades inexistentes o vistas.', relation.id );
            continue;
            }

        const keys = parent.columns.filter( field => field.primary );
        const referenced = relation.mappings.map( pair => pair.parentColumnId );
        const childIds = relation.mappings.map( pair => pair.childColumnId );

        if (!keys.length || referenced.length !== keys.length
            || new Set( referenced ).size !== referenced.length
            || new Set( childIds ).size !== childIds.length
            || keys.some( key => !referenced.includes( key.id ) )) {
            add( 'error', `${relation.name}: la relación debe incluir toda la clave primaria del padre.`, relation.id );
            }

        for (const pair of relation.mappings) {
            const source = parent.columns.find( field => field.id === pair.parentColumnId );
            const target = child.columns.find( field => field.id === pair.childColumnId );

            if (!source || !target || !sameType( source.type, target.type )) {
                add( 'error', `${relation.name}: las columnas relacionadas deben existir y tener tipos compatibles.`, relation.id );
                continue;
                }

            if (relation.identifying && (!target.primary || relation.optional)) {
                add( 'error', `${relation.name}: una relación identificadora requiere una FK obligatoria dentro de la PK hija.`, relation.id );
                }

            if (target.required === relation.optional) {
                add( 'error', `${relation.name}: la opcionalidad debe coincidir con los nulos de la FK.`, relation.id );
                }

            if ((relation.onDelete === 'SET NULL' || relation.onUpdate === 'SET NULL')
                && target.required) {
                add( 'error', `${relation.name}: SET NULL requiere columnas que admitan nulos.`, relation.id );
                }

            if ((relation.onDelete === 'SET DEFAULT' || relation.onUpdate === 'SET DEFAULT')
                && !target.defaultValue.trim()) {
                add( 'error', `${relation.name}: SET DEFAULT requiere valores predeterminados en la FK.`, relation.id );
                }
            }
        }

    return issues;
    }

export function exampleDocument() {
    let model = emptyDocument();

    model.name = 'Biblioteca — práctica de relaciones';

    for (const [name, x, y, fields] of [
        ['Socio', 100, 110, [column( 'id_socio', 'INTEGER', true ), column( 'nombre', 'VARCHAR(100)' ), column( 'email', 'VARCHAR(100)' )]],
        ['Prestamo', 450, 180, [column( 'id_prestamo', 'INTEGER', true ), column( 'fecha', 'DATE' ), column( 'devolucion', 'DATE' )]],
        ['Libro', 810, 110, [column( 'id_libro', 'INTEGER', true ), column( 'titulo', 'VARCHAR(100)' ), column( 'isbn', 'VARCHAR(50)' )]]
        ]) {
        model = addTable( model, 'entity', {x, y} );

        const table = model.tables.at( -1 );

        Object.assign( table, {name, conceptualName: name, columns: fields} );
        }

    model = addRelationship( model, model.tables[0].id, model.tables[1].id );
    model = updateRelationship( model, model.relationships[0].id, {optional: false} );
    model = addRelationship( model, model.tables[2].id, model.tables[1].id );
    model = updateRelationship( model, model.relationships[1].id, {optional: false} );

    return model;
    }
