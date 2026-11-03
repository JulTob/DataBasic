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
 * @typedef {{format:'databasic',version:2,profile:'course'|'general',
 * name:string,tables:Entity[],conceptual:Object,traces:Object[],
 * presentation:{chen:Record<string,{x:number,y:number}>,
 * relational?:Record<string,{x:number,y:number}>},
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

export const COURSE_TYPES = ['VARCHAR', 'CHAR', 'NUMBER', 'DATE'];

export function emptyDocument( profile = 'course' ) {
    if (!['course', 'general'].includes( profile )) {
        throw new Error( 'Perfil de tipos no válido.' );
        }

    return {
        format: 'databasic',
        version: 2,
        profile,
        name: 'Modelo de base de datos',
        tables: [],
        relationships: [],
        conceptual: {
            entities: [],
            attributes: [],
            relationships: [],
            generalizations: []
            },
        traces: [],
        presentation: {
            chen: {},
            relational: {}
            },
        display: {
            mode: 'relational',
            notation: 'idef1x',
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
        type = 'NUMBER',
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
    if (typeof value !== 'string') {
        return false;
        }

    const normalized = value.trim().toUpperCase();
    const basicTypes = [
        'INTEGER', 'INT', 'SMALLINT', 'BIGINT', 'REAL', 'FLOAT', 'DOUBLE',
        'BOOLEAN', 'BOOL', 'DATE', 'TIME', 'TIMESTAMP', 'DATETIME',
        'TEXT', 'BLOB', 'UUID', 'NUMBER'
        ];

    if (basicTypes.includes( normalized )) {
        return true;
        }

    if (/^(VAR)?CHAR\(\s*[1-9]\d*\s*\)$/.test( normalized )) {
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
                    columns: kind === 'view' ? [] : [column(
                            'id',
                            next.profile === 'course' ? 'NUMBER' : 'INTEGER',
                            true
                            )],
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

                applyDomainPatch(
                        table,
                        patch,
                        [
                            'name', 'conceptualName', 'syncNames', 'namespace',
                            'x', 'y', 'notes', 'definition', 'indexes', 'alternateKeys'
                            ]
                        );

                if (table.syncNames && 'name' in patch) {
                    table.conceptualName = patch.name;
                    }

                if (table.syncNames && 'conceptualName' in patch) {
                    table.name = patch.conceptualName;
                    }

                syncNativeTableProperties( next, table, patch );
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
                rejectGeneratedStructure( next, 'table', tableId );
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

                const origin = nativeAttributeForColumn( next, columnId );

                if (origin) {
                    applyNativeAttributePatch( next, origin, patch );
                    return;
                    }

                const generatedForeignKey = next.traces?.some(
                        trace => trace.targetKind === 'foreign-key'
                            && next.relationships.some(
                                    relation => relation.id === trace.targetId
                                        && relation.mappings.some(
                                                pair => pair.childColumnId === columnId
                                                )
                                    )
                        );

                if (generatedForeignKey && ('primary' in patch || 'required' in patch)) {
                    throw new Error( 'Edita la clave o participación en el origen Chen de esta FK.' );
                    }

                applyDomainPatch(
                        field,
                        patch,
                        ['name', 'type', 'required', 'primary', 'notes', 'defaultValue', 'domain']
                        );

                if (field.primary) {
                    field.required = true;
                    }

                if ('type' in patch) {
                    propagateColumnType( next, columnId, patch.type );
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
                rejectGeneratedStructure( next, 'column', columnId );
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
                removeOrphanDiagramPositions( next );
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
                                        && !field.primary
                                        && !hasUniqueColumns( child, [field.id] )
                                    );

                            if (target && !sameType( target.type, key.type )) {
                                throw new Error(
                                        `La columna ${targetName} existe con un tipo incompatible.`
                                        );
                                }

                            if (!target) {
                                const availableName = uniqueColumnName(
                                        child,
                                        targetName,
                                        `${parent.name}_${targetName}`
                                        );

                                target = column( availableName, key.type );
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

                rejectGeneratedStructure( next, 'foreign-key', relationshipId );
                applyDomainPatch(
                        relation,
                        patch,
                        [
                            'name', 'forward', 'inverse', 'cardinality',
                            'identifying', 'optional', 'onDelete', 'onUpdate', 'mappings'
                            ]
                        );

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
                rejectGeneratedStructure( next, 'table', selectedId );
                rejectGeneratedStructure( next, 'foreign-key', selectedId );
                const nativeEntity = next.traces?.find(
                        trace => trace.sourceKind === 'entity'
                            && trace.targetId === selectedId
                        );

                if (nativeEntity) {
                    throw new Error(
                            `Edita el origen Chen ${nativeEntity.sourceId} para eliminar esta entidad.`
                            );
                    }

                const usedByConceptual = next.conceptual?.relationships.some(
                        relation => relation.participations.some(
                                part => part.entityId === selectedId
                                )
                        );

                if (usedByConceptual) {
                    throw new Error( 'La entidad participa en Chen. Elimina primero esa relación.' );
                    }

                next.tables = next.tables.filter( table => table.id !== selectedId );
                next.relationships = next.relationships.filter(
                        relation => relation.id !== selectedId
                            && relation.parentId !== selectedId
                            && relation.childId !== selectedId
                        );
                removeOrphanDiagramPositions( next );
                }
            );
    }

export function validateDocument( model ) {
    const shapeIssues = validateDocumentShape( model );

    if (shapeIssues.length) {
        return shapeIssues;
        }

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

            if (model.profile === 'course' && !validCourseType( field.type )) {
                add(
                        'error',
                        `${table.name}.${field.name}: el perfil del curso sólo admite VARCHAR, CHAR, NUMBER y DATE.`,
                        table.id
                        );
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

        const alternateNames = new Set();

        for (const key of table.alternateKeys || []) {
            if (!key.name.trim() || alternateNames.has( key.name.toLowerCase() )
                || !key.columns.length
                || new Set( key.columns ).size !== key.columns.length
                || key.columns.some( id => !table.columns.some(
                        field => field.id === id && field.required
                        ) )) {
                add( 'error', `${table.name}: clave alternativa con columnas inválidas.`, table.id );
                }

            alternateNames.add( key.name.toLowerCase() );
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

        if (relation.cardinality.endsWith( 'many' )
            && hasUniqueColumns( child, childIds )) {
            add(
                    'warning',
                    `${relation.name}: la PK o unicidad de la FK limita a un hijo por padre, aunque se han declarado muchos.`,
                    relation.id
                    );
            }

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

    if (model.version === 2) {
        issues.push( ...validateConceptualDocument( model ) );
        }

    return issues;
    }

export function exampleDocument() {
    let model = emptyDocument();

    model.name = 'Biblioteca — práctica de relaciones';

    for (const [name, x, y, fields] of [
        ['Socio', 100, 110, [column( 'id_socio', 'NUMBER', true ), column( 'nombre', 'VARCHAR(100)' ), column( 'email', 'VARCHAR(100)' )]],
        ['Prestamo', 450, 180, [column( 'id_prestamo', 'NUMBER', true ), column( 'fecha', 'DATE' ), column( 'devolucion', 'DATE' )]],
        ['Libro', 810, 110, [column( 'id_libro', 'NUMBER', true ), column( 'titulo', 'VARCHAR(100)' ), column( 'isbn', 'VARCHAR(50)' )]]
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

/** Returns parameters without guessing a physical DBMS representation. */
export function parseDataType( value ) {
    if (!validType( value )) {
        throw new Error( 'Tipo inválido: revisa familia y parámetros.' );
        }

    const match = /^([A-Z]+)(?:\(\s*([+-]?\d+)\s*(?:,\s*([+-]?\d+)\s*)?\))?$/.exec(
            value.trim().toUpperCase()
            );
    const result = {family: match[1], length: null, precision: null, scale: null};

    if (['VARCHAR', 'CHAR'].includes( result.family )) {
        result.length = Number( match[2] );
        }
    else if (match[2] !== undefined) {
        result.precision = Number( match[2] );
        result.scale = match[3] === undefined ? null : Number( match[3] );
        }

    return result;
    }

export function formatDataType( parameters ) {
    const family = String( parameters.family ).trim().toUpperCase();
    let value = family;

    if (['VARCHAR', 'CHAR'].includes( family )) {
        value += `(${parameters.length})`;
        }
    else if (parameters.precision !== null && parameters.precision !== undefined
        && parameters.precision !== '') {
        value += parameters.scale === null || parameters.scale === undefined
            || parameters.scale === ''
            ? `(${parameters.precision})`
            : `(${parameters.precision},${parameters.scale})`;
        }

    if (!validType( value )) {
        throw new Error( 'Tipo inválido: revisa longitud, precisión y escala.' );
        }

    return value;
    }

export function validCourseType( value ) {
    return validType( value )
        && /^(?:VARCHAR|CHAR|NUMBER)(?:\(|$)|^DATE$/.test(
                value.trim().toUpperCase()
                );
    }

export function setModelProfile(
        model,
        profile
        ) {
    return changeDocument( model, next => { next.profile = profile; } );
    }

/** Promotes v1 conservatively; no conceptual intent is inferred from FKs. */
export function upgradeDocument( model ) {
    if (model.version === 2) {
        return structuredClone( model );
        }

    if (model.version !== 1 || model.conceptual) {
        throw new Error( 'Se necesita un documento DataBasic versión 1 o 2.' );
        }

    const next = structuredClone( model );
    const defaults = emptyDocument( 'general' );

    next.version = 2;
    next.profile = 'general';
    next.conceptual = defaults.conceptual;
    next.traces = [];
    next.presentation = defaults.presentation;
    next.display.mode = 'relational';
    next.display.notation = next.display.crowsFeet ? 'crows-foot' : 'relational';

    return next;
    }

function applyDomainPatch(
        target,
        patch,
        allowed
        ) {
    for (const key of Object.keys( patch )) {
        if (!allowed.includes( key )) {
            throw new Error( `El campo ${key} no se puede editar con este comando.` );
            }
        }

    Object.assign( target, structuredClone( patch ) );
    }

function uniqueColumnName(
        table,
        preferred,
        fallback = preferred
        ) {
    let name = preferred;
    let suffix = 1;

    while (table.columns.some(
            item => item.name.toLowerCase() === name.toLowerCase()
            )) {
        name = suffix === 1 ? fallback : `${fallback}_${suffix}`;
        suffix += 1;
        }

    return name;
    }

export function hasUniqueColumns(
        table,
        columnIds
        ) {
    const keys = [
        table.columns.filter( item => item.primary ).map( item => item.id ),
        ...(table.alternateKeys || []).map( item => item.columns ),
        ...table.indexes.filter( item => item.unique ).map( item => item.columns )
        ];

    return keys.some(
            key => key.length > 0 && key.every( id => columnIds.includes( id ) )
            );
    }

export function isIdentifierDependent(
        model,
        tableId
        ) {
    const table = requireTable( model, tableId );

    return model.relationships.some(
            relation => relation.childId === tableId
                && relation.mappings.length > 0
                && relation.mappings.every(
                        pair => table.columns.some(
                                field => field.id === pair.childColumnId && field.primary
                                )
                        )
            );
    }

function validateDocumentShape( model ) {
    const ids = new Set();
    const demand = (condition, message) => {
        if (!condition) {
            throw new Error( message );
            }
        };
    const list = (value, limit, label) => demand(
            Array.isArray( value ) && value.length <= limit,
            `${label}: lista no válida o demasiado extensa.`
            );
    const text = (object, key, limit = 20000) => demand(
            object && typeof object[key] === 'string' && object[key].length <= limit,
            `${key}: se necesita texto de hasta ${limit} caracteres.`
            );
    const flag = (object, key) => demand(
            typeof object[key] === 'boolean',
            `${key}: se necesita verdadero o falso.`
            );
    const identify = item => {
        text( item, 'id', 100 );
        demand(
                /^[A-Za-z0-9_-]+$/.test( item.id )
                    && !['__proto__', 'constructor', 'prototype'].includes( item.id )
                    && !ids.has( item.id ),
                'Los identificadores deben ser válidos y únicos.'
                );
        ids.add( item.id );
        };
    const domain = value => {
        if (value === null || value === undefined) {
            return;
            }

        demand( typeof value === 'object', 'Dominio no válido.' );

        for (const bound of ['minimum', 'maximum']) {
            demand(
                    value[bound] === null || Number.isFinite( value[bound] ),
                    'Los límites de dominio deben ser números finitos o null.'
                    );
            }

        demand(
                value.minimum === null || value.maximum === null
                    || value.minimum <= value.maximum,
                'El mínimo del dominio no puede superar su máximo.'
                );
        list( value.values, 500, 'Valores del dominio' );
        demand(
                value.values.every(
                        item => typeof item === 'string' && item.length <= 500
                            || typeof item === 'number' && Number.isFinite( item )
                        ),
                'Los valores del dominio deben ser textos o números.'
                );
        text( value, 'check', 2000 );
        };

    try {
        demand(
                model?.format === 'databasic' && [1, 2].includes( model.version ),
                'Se necesita un documento DataBasic versión 1 o 2.'
                );
        text( model, 'name', 160 );
        list( model.tables, 200, 'Entidades' );
        list( model.relationships, 500, 'Relaciones' );

        for (const table of model.tables) {
            identify( table );

            for (const key of ['name', 'conceptualName', 'namespace']) {
                text( table, key, 160 );
                }

            for (const key of ['notes', 'definition']) {
                text( table, key );
                }

            flag( table, 'syncNames' );
            demand( ['entity', 'view'].includes( table.kind ), 'Tipo de entidad no válido.' );
            list( table.columns, 200, 'Columnas' );
            list( table.indexes, 100, 'Índices' );

            for (const field of table.columns) {
                identify( field );
                text( field, 'name', 160 );
                text( field, 'type', 100 );
                text( field, 'notes' );
                text( field, 'defaultValue', 500 );
                flag( field, 'primary' );
                flag( field, 'required' );
                domain( field.domain );
                }

            for (const index of [...table.indexes, ...(table.alternateKeys || [])]) {
                identify( index );
                text( index, 'name', 160 );
                list( index.columns, 200, 'Columnas de clave o índice' );
                demand( index.columns.every( id => typeof id === 'string' ), 'Columnas no válidas.' );

                if (table.indexes.includes( index )) {
                    flag( index, 'unique' );
                    }
                }
            }

        for (const relation of model.relationships) {
            identify( relation );

            for (const key of ['name', 'forward', 'inverse', 'parentId', 'childId']) {
                text( relation, key, 160 );
                }

            flag( relation, 'identifying' );
            flag( relation, 'optional' );
            list( relation.mappings, 200, 'Correspondencias' );

            for (const pair of relation.mappings) {
                text( pair, 'parentColumnId', 100 );
                text( pair, 'childColumnId', 100 );
                }
            }

        demand( model.display && typeof model.display === 'object', 'Faltan opciones del documento.' );

        for (const key of [
            'conceptual', 'types', 'keys', 'required', 'crowsFeet',
            'cardinality', 'relationshipNames', 'grid'
            ]) {
            flag( model.display, key );
            }

        if (model.version === 1) {
            return [];
            }

        demand( ['course', 'general'].includes( model.profile ), 'Perfil de tipos no válido.' );
        demand( ['relational', 'chen'].includes( model.display.mode ), 'Modo de diagrama no válido.' );
        demand(
                ['idef1x', 'crows-foot', 'relational'].includes( model.display.notation ),
                'Notación relacional no válida.'
                );
        demand( model.conceptual && typeof model.conceptual === 'object', 'Falta la semántica conceptual.' );

        for (const [key, limit] of [
            ['entities', 200], ['attributes', 2000],
            ['relationships', 500], ['generalizations', 200]
            ]) {
            list( model.conceptual[key], limit, key );

            for (const item of model.conceptual[key]) {
                identify( item );
                text( item, 'notes' );

                if (key !== 'generalizations') {
                    text( item, 'name', 160 );
                    }
                }
            }

        for (const entity of model.conceptual.entities) {
            flag( entity, 'weak' );
            demand(
                    entity.ownerEntityId === null || typeof entity.ownerEntityId === 'string',
                    'Propietario de entidad débil no válido.'
                    );
            demand(
                    entity.translation === null
                        || ['table', 'weak'].includes( entity.translation?.kind ),
                    'Estrategia de entidad no válida.'
                    );
            }

        for (const attribute of model.conceptual.attributes) {
            demand( ['entity', 'relationship'].includes( attribute.ownerKind ), 'Propietario de atributo no válido.' );
            text( attribute, 'ownerId', 100 );
            text( attribute, 'type', 100 );
            text( attribute, 'defaultValue', 500 );
            text( attribute, 'derivation', 2000 );
            demand( ['simple', 'composite'].includes( attribute.structure ), 'Estructura de atributo no válida.' );
            demand(
                    attribute.parentAttributeId === null || typeof attribute.parentAttributeId === 'string',
                    'Componente de atributo no válido.'
                    );

            for (const key of ['required', 'primary', 'partialKey', 'multivalued', 'derived']) {
                flag( attribute, key );
                }

            domain( attribute.domain );
            demand(
                    attribute.translation === null
                        || ['column', 'flatten', 'stored', 'omit'].includes(
                                attribute.translation?.kind
                                ),
                    'Estrategia de atributo no válida.'
                    );
            }

        for (const relation of model.conceptual.relationships) {
            list( relation.participations, 3, 'Participaciones' );

            for (const part of relation.participations) {
                identify( part );
                text( part, 'entityId', 100 );
                text( part, 'role', 160 );
                demand(
                        Number.isSafeInteger( part.min ) && part.min >= 0
                            && (part.max === null
                                || Number.isSafeInteger( part.max ) && part.max >= part.min),
                        'Participación: exige 0 <= mínimo <= máximo; null representa N.'
                        );
                }

            if (relation.translation !== null) {
                demand(
                        ['association', 'foreign-key'].includes( relation.translation?.kind ),
                        'Estrategia de relación no válida.'
                        );

                if (relation.translation.kind === 'association') {
                    text( relation.translation, 'tableName', 160 );

                    for (const key of ['participationIds', 'attributeIds']) {
                        list( relation.translation.key?.[key], 200, 'Clave elegida' );
                        }
                    }
                else {
                    text( relation.translation, 'childParticipationId', 100 );

                    if ('identifying' in relation.translation) {
                        flag( relation.translation, 'identifying' );
                        }
                    }
                }
            }

        for (const generalization of model.conceptual.generalizations) {
            text( generalization, 'supertypeId', 100 );
            list( generalization.subtypeIds, 50, 'Subclases' );
            flag( generalization, 'disjoint' );
            flag( generalization, 'total' );
            }

        list( model.traces, 10000, 'Trazas' );

        for (const trace of model.traces) {
            demand(
                    ['entity', 'attribute', 'relationship', 'participation'].includes( trace.sourceKind )
                        && ['table', 'column', 'foreign-key'].includes( trace.targetKind ),
                    'Clase de traza no válida.'
                    );
            text( trace, 'sourceId', 100 );
            text( trace, 'targetId', 100 );
            }

        demand( model.presentation?.chen && typeof model.presentation.chen === 'object', 'Faltan posiciones Chen.' );

        for (const [id, position] of Object.entries( model.presentation.chen )) {
            demand(
                    ids.has( id ) && domainPositionValid( position ),
                    'La posición Chen necesita un elemento existente y coordenadas entre 0 y 20000.'
                    );
            }

        if ('relational' in model.presentation) {
            const positions = model.presentation.relational;

            demand(
                    positions
                        && typeof positions === 'object'
                        && !Array.isArray( positions ),
                    'Las posiciones relacionales necesitan un mapa de relaciones.'
                    );
            const foreignKeyIds = new Set( model.relationships.map( relation => relation.id ) );

            for (const [id, position] of Object.entries( positions )) {
                demand(
                        foreignKeyIds.has( id ) && domainPositionValid( position ),
                        'La posición relacional necesita una relación existente y coordenadas entre 0 y 20000.'
                        );
                }
            }

        return [];
        }
    catch (error) {
        return [{level: 'error', message: error.message}];
        }
    }

function domainPositionValid( position ) {
    return position && [position.x, position.y].every(
            value => Number.isFinite( value ) && value >= 0 && value <= 20000
            );
    }

/** Called only by removals; malformed imports still fail validation unchanged. */
function removeOrphanDiagramPositions( model ) {
    if (!model.presentation) {
        return;
        }

    const ids = new Set( model.relationships.map( relation => relation.id ) );
    const foreignKeyIds = new Set( ids );

    for (const table of model.tables) {
        const tableItems = [
            table,
            ...table.columns,
            ...table.indexes,
            ...(table.alternateKeys || [])
            ];

        for (const item of tableItems) {
            ids.add( item.id );
            }
        }

    for (const collection of ['entities', 'attributes', 'relationships', 'generalizations']) {
        for (const item of model.conceptual?.[collection] || []) {
            ids.add( item.id );

            for (const participation of item.participations || []) {
                ids.add( participation.id );
                }
            }
        }

    for (const [mode, existing] of [['chen', ids], ['relational', foreignKeyIds]]) {
        for (const id of Object.keys( model.presentation[mode] || {} )) {
            if (!existing.has( id )) {
                delete model.presentation[mode][id];
                }
            }
        }
    }

function requireConceptualObject(
        model,
        collection,
        id
        ) {
    const item = model.conceptual[collection].find( value => value.id === id );

    if (!item) {
        throw new Error( `El objeto Chen ${id} ya no existe.` );
        }

    return item;
    }

function conceptualEntityTable(
        model,
        entityId
        ) {
    const trace = model.traces.find(
            item => item.sourceKind === 'entity' && item.sourceId === entityId
                && item.targetKind === 'table'
            );
    const table = model.tables.find( item => item.id === (trace?.targetId || entityId) );

    if (!table || table.kind !== 'entity') {
        throw new Error( `La entidad Chen ${entityId} no tiene una tabla existente.` );
        }

    return table;
    }

function traceDomainTarget(
        model,
        sourceKind,
        sourceId,
        targetKind,
        targetId
        ) {
    if (!model.traces.some(
            item => item.sourceId === sourceId && item.targetId === targetId
                && item.sourceKind === sourceKind && item.targetKind === targetKind
            )) {
        model.traces.push({sourceKind, sourceId, targetKind, targetId});
        }
    }

function nativeAttributeForColumn(
        model,
        columnId
        ) {
    const trace = model.traces?.find(
            item => item.sourceKind === 'attribute'
                && item.targetKind === 'column' && item.targetId === columnId
            );

    return model.conceptual?.attributes.find( item => item.id === trace?.sourceId );
    }

function rejectGeneratedStructure(
        model,
        targetKind,
        targetId
        ) {
    const trace = model.traces?.find(
            item => item.targetKind === targetKind && item.targetId === targetId
                && ['relationship', 'participation', 'attribute'].includes( item.sourceKind )
            );

    if (trace) {
        throw new Error(
                `Estructura generada: edita su origen Chen ${trace.sourceId} en Conceptual.`
                );
        }
    }

function syncNativeTableProperties(
        model,
        table,
        patch
        ) {
    const trace = model.traces?.find(
            item => item.targetKind === 'table' && item.targetId === table.id
            );

    if (trace?.sourceKind === 'entity') {
        const entity = requireConceptualObject( model, 'entities', trace.sourceId );

        if ('conceptualName' in patch || table.syncNames && 'name' in patch) {
            entity.name = table.conceptualName;
            }

        if ('notes' in patch) {
            entity.notes = table.notes;
            }
        }

    if (trace?.sourceKind === 'relationship' && 'name' in patch) {
        const relation = requireConceptualObject( model, 'relationships', trace.sourceId );

        relation.translation.tableName = table.name;
        }
    }

function propagateColumnType(
        model,
        columnId,
        type
        ) {
    const visited = new Set();
    const pending = [columnId];

    while (pending.length) {
        const id = pending.pop();

        if (visited.has( id )) {
            continue;
            }

        visited.add( id );

        for (const table of model.tables) {
            const field = table.columns.find( item => item.id === id );

            if (field) {
                field.type = type;
                const attribute = nativeAttributeForColumn( model, id );

                if (attribute) {
                    attribute.type = type;
                    }
                }
            }

        for (const relation of model.relationships) {
            for (const pair of relation.mappings) {
                if (pair.parentColumnId === id) {
                    pending.push( pair.childColumnId );
                    }
                if (pair.childColumnId === id) {
                    pending.push( pair.parentColumnId );
                    }
                }
            }
        }
    }

export function setDiagramMode(
        model,
        mode
        ) {
    return changeDocument(
            model,
            next => { next.display.mode = mode; }
            );
    }

/** Moves presentation only, requiring existing references and finite coordinates. */
export function moveDiagramElement(
        model,
        id,
        position,
        mode = model.display.mode
        ) {
    return changeDocument(
            model,
            next => {
                if (!['chen', 'relational'].includes( mode )) {
                    throw new Error( 'Representación del diagrama no válida.' );
                    }

                if (!domainPositionValid( position )) {
                    throw new Error( 'La posición necesita coordenadas entre 0 y 20000.' );
                    }

                if (mode === 'chen') {
                    next.presentation.chen = {
                        ...next.presentation.chen,
                        [id]: {x: position.x, y: position.y}
                        };
                    return;
                    }

                if (next.relationships.some( relation => relation.id === id )) {
                    next.presentation.relational = {
                        ...next.presentation.relational,
                        [id]: {x: position.x, y: position.y}
                        };
                    return;
                    }

                const table = requireTable( next, id );

                table.x = position.x;
                table.y = position.y;
                }
            );
    }

/** Pure conservative view: a junction table remains an entity unless declared. */
export function getConceptualProjection( model ) {
    const native = model.conceptual || {
        entities: [], attributes: [], relationships: [], generalizations: []
        };
    const traces = model.traces || [];
    const tracedTables = new Set(
            traces.filter( item => item.targetKind === 'table' ).map( item => item.targetId )
            );
    const tracedColumns = new Set(
            traces.filter( item => item.targetKind === 'column' ).map( item => item.targetId )
            );
    const entityForTable = id => traces.find(
            item => item.sourceKind === 'entity' && item.targetId === id
            )?.sourceId || id;
    const entities = [...native.entities];
    const attributes = [...native.attributes];
    const relationships = [...native.relationships];

    for (const table of model.tables.filter( item => item.kind === 'entity' )) {
        if (!tracedTables.has( table.id )) {
            entities.push({
                id: table.id,
                name: table.conceptualName || table.name,
                notes: table.notes,
                weak: false,
                ownerEntityId: null,
                projected: true,
                tableId: table.id
                });
            }
        else if (!traces.some(
                item => item.sourceKind === 'entity' && item.targetId === table.id
                )) {
            continue;
            }

        for (const field of table.columns) {
            if (!tracedColumns.has( field.id )) {
                attributes.push({
                    ...field,
                    ownerKind: 'entity',
                    ownerId: entityForTable( table.id ),
                    projected: true,
                    tableId: table.id,
                    columnId: field.id,
                    structure: 'simple',
                    partialKey: false,
                    multivalued: false,
                    derived: false,
                    parentAttributeId: null
                    });
                }
            }
        }

    for (const relation of model.relationships) {
        if (traces.some(
                item => item.targetKind === 'foreign-key' && item.targetId === relation.id
                )) {
            continue;
            }

        relationships.push({
            id: relation.id,
            name: relation.forward || relation.name,
            notes: 'Proyección parcial desde una FK; no reconstruye el ERE original.',
            projected: true,
            foreignKeyId: relation.id,
            translation: null,
            participations: [
                {
                    id: `${relation.id}_parent`,
                    entityId: entityForTable( relation.parentId ),
                    role: 'padre',
                    min: relation.cardinality.startsWith( 'one' ) ? 1 : 0,
                    max: relation.cardinality.endsWith( 'many' ) ? null : 1
                    },
                {
                    id: `${relation.id}_child`,
                    entityId: entityForTable( relation.childId ),
                    role: 'hijo',
                    min: relation.optional ? 0 : 1,
                    max: 1
                    }
                ]
            });
        }

    return {entities, attributes, relationships, generalizations: native.generalizations};
    }

export function addConceptualEntity(
        model,
        definition = {},
        position = {x: 130, y: 100}
        ) {
    const withTable = addTable( model, 'entity', position );

    return changeDocument(
            withTable,
            next => {
                const table = next.tables.at( -1 );
                const entity = {
                    id: newId(),
                    name: definition.name || table.name,
                    notes: definition.notes || '',
                    weak: definition.weak || false,
                    ownerEntityId: definition.ownerEntityId || null,
                    translation: definition.translation ?? (definition.weak ? null : {kind: 'table'})
                    };

                table.name = entity.name;
                table.conceptualName = entity.name;
                table.notes = entity.notes;
                table.columns = [];
                next.conceptual.entities.push( entity );
                traceDomainTarget( next, 'entity', entity.id, 'table', table.id );
                next.presentation.chen[entity.id] = {...position};

                if (definition.withIdentifier !== false) {
                    insertNativeAttribute( next, {
                        ownerKind: 'entity',
                        ownerId: entity.id,
                        name: 'id',
                        type: next.profile === 'course' ? 'NUMBER' : 'INTEGER',
                        primary: !entity.weak,
                        partialKey: entity.weak
                        });
                    }
                }
            );
    }

export function updateConceptualEntity(
        model,
        id,
        patch
        ) {
    return changeDocument(
            model,
            next => {
                const entity = requireConceptualObject( next, 'entities', id );

                applyDomainPatch(
                        entity,
                        patch,
                        ['name', 'notes', 'weak', 'ownerEntityId', 'translation']
                        );

                const table = conceptualEntityTable( next, id );

                table.conceptualName = entity.name;
                table.notes = entity.notes;

                if (table.syncNames) {
                    table.name = entity.name;
                    }
                }
            );
    }

function insertNativeAttribute(
        model,
        definition
        ) {
    const attribute = {
        id: newId(),
        ownerKind: 'entity',
        ownerId: '',
        name: 'atributo',
        type: 'VARCHAR(50)',
        required: false,
        primary: false,
        partialKey: false,
        notes: '',
        defaultValue: '',
        structure: 'simple',
        multivalued: false,
        derived: false,
        parentAttributeId: null,
        derivation: '',
        domain: null,
        translation: {kind: 'column'}
        };

    applyDomainPatch(
            attribute,
            definition,
            Object.keys( attribute ).filter( key => key !== 'id' )
            );

    if (attribute.primary || attribute.partialKey) {
        attribute.required = true;
        }

    if ((attribute.structure !== 'simple' || attribute.multivalued || attribute.derived)
        && !('translation' in definition)) {
        attribute.translation = null;
        }

    model.conceptual.attributes.push( attribute );
    materializeNativeAttribute( model, attribute );

    return attribute;
    }

export function addConceptualAttribute(
        model,
        definition
        ) {
    return changeDocument(
            model,
            next => { insertNativeAttribute( next, definition ); }
            );
    }

function nativeAttributeTable(
        model,
        attribute
        ) {
    if (attribute.ownerKind === 'entity') {
        return conceptualEntityTable( model, attribute.ownerId );
        }

    const relation = requireConceptualObject( model, 'relationships', attribute.ownerId );
    const trace = model.traces.find(
            item => item.sourceKind === 'relationship' && item.sourceId === relation.id
            );

    if (!trace) {
        return null;
        }

    if (trace.targetKind === 'table') {
        return requireTable( model, trace.targetId );
        }

    const foreignKey = model.relationships.find( item => item.id === trace.targetId );

    return requireTable( model, foreignKey.childId );
    }

function materializeNativeAttribute(
        model,
        attribute
        ) {
    const table = nativeAttributeTable( model, attribute );

    if (table && (attribute.derived && attribute.translation?.kind === 'omit'
        || attribute.structure === 'composite' && attribute.translation?.kind === 'flatten')) {
        removeStoredAttributeColumn( model, attribute, table );
        }

    if (!table || attribute.structure === 'composite' || attribute.multivalued) {
        return;
        }

    if (attribute.derived && attribute.translation?.kind !== 'stored') {
        return;
        }

    if (attribute.parentAttributeId) {
        const parent = requireConceptualObject( model, 'attributes', attribute.parentAttributeId );

        if (parent.translation?.kind !== 'flatten') {
            return;
            }
        }

    const trace = model.traces.find(
            item => item.sourceKind === 'attribute' && item.sourceId === attribute.id
                && item.targetKind === 'column'
            );
    let field = table.columns.find( item => item.id === trace?.targetId );

    if (!field) {
        field = column( attribute.name, attribute.type, attribute.primary || attribute.partialKey );
        table.columns.push( field );
        traceDomainTarget( model, 'attribute', attribute.id, 'column', field.id );
        }

    for (const key of ['name', 'type', 'notes', 'defaultValue', 'domain']) {
        field[key] = structuredClone( attribute[key] );
        }

    field.primary = attribute.primary || attribute.partialKey;
    field.required = attribute.required || field.primary;
    propagateColumnType( model, field.id, field.type );
    }

function removeStoredAttributeColumn(
        model,
        attribute,
        table
        ) {
    const trace = model.traces.find(
            item => item.sourceKind === 'attribute' && item.sourceId === attribute.id
                && item.targetKind === 'column'
            );

    if (!trace) {
        return;
        }

    const field = table.columns.find( item => item.id === trace.targetId );
    const referenced = model.relationships.some(
            relation => relation.mappings.some(
                    pair => pair.parentColumnId === field.id || pair.childColumnId === field.id
                    )
            ) || table.indexes.some( index => index.columns.includes( field.id ) )
        || (table.alternateKeys || []).some( key => key.columns.includes( field.id ) );

    if (referenced || field.primary) {
        throw new Error( 'Resuelve las claves y referencias antes de omitir o descomponer este atributo.' );
        }

    table.columns = table.columns.filter( item => item.id !== field.id );
    model.traces = model.traces.filter( item => item !== trace );
    }

function applyNativeAttributePatch(
        model,
        attribute,
        patch
        ) {
    if (attribute.ownerKind === 'relationship' && 'primary' in patch
        && patch.primary !== attribute.primary) {
        throw new Error( 'Elige la clave de la relación en su estrategia Chen; no mediante una columna generada.' );
        }

    applyDomainPatch(
            attribute,
            patch,
            [
                'name', 'type', 'required', 'primary', 'partialKey', 'notes',
                'defaultValue', 'structure', 'multivalued', 'derived',
                'parentAttributeId', 'derivation', 'domain', 'translation'
                ]
            );

    if (attribute.primary || attribute.partialKey) {
        attribute.required = true;
        }

    materializeNativeAttribute( model, attribute );

    if (attribute.structure === 'composite') {
        for (const component of model.conceptual.attributes.filter(
                item => item.parentAttributeId === attribute.id
                )) {
            materializeNativeAttribute( model, component );
            }
        }

    if (attribute.ownerKind === 'relationship') {
        materializeConceptualRelationship(
                model,
                requireConceptualObject( model, 'relationships', attribute.ownerId )
                );
        }
    }

export function updateConceptualAttribute(
        model,
        id,
        patch
        ) {
    return changeDocument(
            model,
            next => applyNativeAttributePatch(
                    next,
                    requireConceptualObject( next, 'attributes', id ),
                    patch
                    )
            );
    }

export function addConceptualRelationship(
        model,
        definition
        ) {
    return changeDocument(
            model,
            next => {
                const relation = {
                    id: newId(),
                    name: definition.name || 'Relacion',
                    notes: definition.notes || '',
                    participations: (definition.participations || []).map(
                            part => ({
                                id: part.id || newId(),
                                entityId: part.entityId,
                                role: part.role || '',
                                min: part.min ?? 0,
                                max: part.max ?? null
                                })
                            ),
                    translation: structuredClone( definition.translation ?? null )
                    };

                next.conceptual.relationships.push( relation );
                materializeConceptualRelationship( next, relation );
                }
            );
    }

export function updateConceptualRelationship(
        model,
        id,
        patch
        ) {
    return changeDocument(
            model,
            next => {
                const relation = requireConceptualObject( next, 'relationships', id );

                if ('translation' in patch && relation.translation
                    && relation.translation.kind !== patch.translation?.kind) {
                    throw new Error(
                            `La relación ${id} ya está materializada. Elimina el origen Chen antes de cambiar de estrategia.`
                            );
                    }

                applyDomainPatch( relation, patch, ['name', 'notes', 'translation'] );
                materializeConceptualRelationship( next, relation );
                }
            );
    }

export function updateConceptualParticipation(
        model,
        relationshipId,
        participationId,
        patch
        ) {
    return changeDocument(
            model,
            next => {
                const relation = requireConceptualObject( next, 'relationships', relationshipId );
                const part = relation.participations.find( item => item.id === participationId );

                if (!part) {
                    throw new Error( 'La participación Chen ya no existe.' );
                    }

                applyDomainPatch( part, patch, ['role', 'min', 'max'] );
                materializeConceptualRelationship( next, relation );
                }
            );
    }

function participationCardinality( part ) {
    if (part.max === 1) {
        return part.min === 0 ? 'zero-one' : 'one-one';
        }

    return part.min === 0 ? 'zero-many' : 'one-many';
    }

function materializedParticipation(
        model,
        relation,
        part,
        child,
        optional = false
        ) {
    const parent = conceptualEntityTable( model, part.entityId );
    const keys = parent.columns.filter( item => item.primary );

    if (!keys.length) {
        throw new Error( `${parent.name}: define su PK antes de materializar la relación Chen.` );
        }

    const oldTrace = model.traces.find(
            item => item.sourceKind === 'participation' && item.sourceId === part.id
            );
    let foreignKey = model.relationships.find( item => item.id === oldTrace?.targetId );

    if (!foreignKey) {
        foreignKey = {
            id: newId(),
            parentId: parent.id,
            childId: child.id,
            name: `FK_${relation.name}_${part.role || parent.name}`,
            forward: relation.name,
            inverse: part.role,
            cardinality: participationCardinality( part ),
            identifying: false,
            optional,
            onDelete: 'NO ACTION',
            onUpdate: 'NO ACTION',
            mappings: []
            };
        model.relationships.push( foreignKey );
        traceDomainTarget( model, 'participation', part.id, 'foreign-key', foreignKey.id );
        }

    foreignKey.forward = relation.name;
    foreignKey.inverse = part.role;
    foreignKey.cardinality = participationCardinality( part );
    foreignKey.optional = optional;
    foreignKey.mappings = keys.map(
            key => {
                const oldPair = foreignKey.mappings.find( item => item.parentColumnId === key.id );
                let target = child.columns.find( item => item.id === oldPair?.childColumnId );

                if (!target) {
                    const prefix = part.role || parent.name;

                    target = column(
                            uniqueColumnName( child, `${prefix}_${key.name}` ),
                            key.type
                            );
                    child.columns.push( target );
                    }

                target.type = key.type;
                target.required = target.primary || !optional;

                return {parentColumnId: key.id, childColumnId: target.id};
                }
            );

    return foreignKey;
    }

function materializeConceptualRelationship(
        model,
        relation
        ) {
    if (!relation.translation) {
        return;
        }

    if (relation.participations.length < 2 || relation.participations.length > 3) {
        throw new Error( 'Materializar requiere dos o tres participaciones.' );
        }

    if (relation.translation.kind === 'foreign-key') {
        materializeBinaryForeignKey( model, relation );
        return;
        }

    const decision = relation.translation;
    const parts = decision.key?.participationIds || [];
    const attributes = decision.key?.attributeIds || [];
    const owners = model.conceptual.attributes.filter(
            item => item.ownerKind === 'relationship' && item.ownerId === relation.id
            );

    if (!parts.length && !attributes.length) {
        throw new Error( 'Elige la clave de la asociación antes de materializarla.' );
        }

    if (new Set( parts ).size !== parts.length
        || new Set( attributes ).size !== attributes.length
        || parts.some( id => !relation.participations.some( item => item.id === id ) )
        || attributes.some( id => !owners.some( item => item.id === id ) )) {
        throw new Error( 'La clave elegida contiene participaciones o atributos ajenos.' );
        }

    const oldTrace = model.traces.find(
            item => item.sourceKind === 'relationship' && item.sourceId === relation.id
                && item.targetKind === 'table'
            );
    let table = model.tables.find( item => item.id === oldTrace?.targetId );

    if (!table) {
        table = {
            id: newId(),
            name: decision.tableName,
            conceptualName: relation.name,
            syncNames: false,
            namespace: '',
            kind: 'entity',
            x: 160 + model.tables.length * 30,
            y: 180 + model.tables.length * 25,
            columns: [],
            notes: relation.notes,
            definition: '',
            indexes: []
            };
        model.tables.push( table );
        traceDomainTarget( model, 'relationship', relation.id, 'table', table.id );
        }

    table.name = decision.tableName;
    table.conceptualName = relation.name;
    table.notes = relation.notes;

    for (const field of table.columns) {
        field.primary = false;
        }

    for (const part of relation.participations) {
        const foreignKey = materializedParticipation( model, relation, part, table );

        foreignKey.identifying = parts.includes( part.id );

        for (const pair of foreignKey.mappings) {
            const field = table.columns.find( item => item.id === pair.childColumnId );

            field.primary = foreignKey.identifying;
            }
        }

    for (const attribute of owners) {
        materializeNativeAttribute( model, attribute );

        if (attributes.includes( attribute.id )) {
            const trace = model.traces.find(
                    item => item.sourceKind === 'attribute' && item.sourceId === attribute.id
                    );
            const field = table.columns.find( item => item.id === trace?.targetId );

            if (!field) {
                throw new Error( 'La clave requiere un atributo simple almacenado y materializado.' );
                }

            field.primary = true;
            field.required = true;
            attribute.required = true;
            }
        }
    }

function materializeBinaryForeignKey(
        model,
        relation
        ) {
    const childPart = relation.participations.find(
            item => item.id === relation.translation.childParticipationId
            );

    if (relation.participations.length !== 2 || !childPart || childPart.max !== 1) {
        throw new Error( 'La estrategia FK requiere una binaria y máximo uno en el rol hijo elegido.' );
        }

    const parentPart = relation.participations.find( item => item.id !== childPart.id );
    const child = conceptualEntityTable( model, childPart.entityId );
    const foreignKey = materializedParticipation(
            model,
            relation,
            parentPart,
            child,
            childPart.min === 0
            );

    foreignKey.identifying = relation.translation.identifying === true;

    if (foreignKey.identifying) {
        if (childPart.min !== 1) {
            throw new Error( 'Un vínculo identificador requiere participación hija (1,1).' );
            }

        for (const pair of foreignKey.mappings) {
            const field = child.columns.find( item => item.id === pair.childColumnId );

            field.primary = true;
            field.required = true;
            }
        }

    traceDomainTarget( model, 'relationship', relation.id, 'foreign-key', foreignKey.id );

    for (const attribute of model.conceptual.attributes.filter(
            item => item.ownerKind === 'relationship' && item.ownerId === relation.id
            )) {
        materializeNativeAttribute( model, attribute );
        }
    }

export function addConceptualGeneralization(
        model,
        definition
        ) {
    return changeDocument(
            model,
            next => {
                next.conceptual.generalizations.push({
                    id: newId(),
                    supertypeId: definition.supertypeId,
                    subtypeIds: structuredClone( definition.subtypeIds || [] ),
                    disjoint: definition.disjoint ?? true,
                    total: definition.total ?? false,
                    notes: definition.notes || '',
                    translation: structuredClone( definition.translation ?? null )
                    });
                }
            );
    }

export function updateConceptualGeneralization(
        model,
        id,
        patch
        ) {
    return changeDocument(
            model,
            next => applyDomainPatch(
                    requireConceptualObject( next, 'generalizations', id ),
                    patch,
                    ['supertypeId', 'subtypeIds', 'disjoint', 'total', 'notes', 'translation']
                    )
            );
    }

export function setAlternateKey(
        model,
        tableId,
        definition
        ) {
    return changeDocument(
            model,
            next => {
                const table = requireTable( next, tableId );
                const keys = table.alternateKeys || [];
                let key = keys.find( item => item.id === definition.id );

                if (definition.id && !key) {
                    throw new Error( 'La clave alternativa ya no existe.' );
                    }

                if (!key) {
                    key = {id: newId(), name: '', columns: []};
                    keys.push( key );
                    }

                key.name = definition.name;
                key.columns = structuredClone( definition.columns );
                table.alternateKeys = keys;

                for (const id of key.columns) {
                    const field = table.columns.find( item => item.id === id );

                    if (!field) {
                        throw new Error( 'La clave alternativa necesita columnas existentes.' );
                        }

                    field.required = true;
                    const attribute = nativeAttributeForColumn( next, id );

                    if (attribute) {
                        attribute.required = true;
                        }
                    }
                }
            );
    }

export function removeAlternateKey(
        model,
        tableId,
        keyId
        ) {
    return changeDocument(
            model,
            next => {
                const table = requireTable( next, tableId );

                table.alternateKeys = (table.alternateKeys || []).filter(
                        item => item.id !== keyId
                        );
                }
            );
    }

export function removeConceptualElement(
        model,
        id
        ) {
    return changeDocument(
            model,
            next => {
                const native = next.conceptual;
                const entity = native.entities.find( item => item.id === id );
                const relation = native.relationships.find( item => item.id === id );
                const attribute = native.attributes.find( item => item.id === id );
                const removedSources = new Set( [id] );
                const removedTables = new Set();
                const removedForeignKeys = new Set();

                if (entity) {
                    const referenced = native.relationships.some(
                            item => item.participations.some( part => part.entityId === id )
                            ) || native.entities.some( item => item.ownerEntityId === id )
                        || native.generalizations.some(
                                item => item.supertypeId === id || item.subtypeIds.includes( id )
                                );

                    if (referenced) {
                        throw new Error( 'La entidad Chen tiene relaciones, dependencias o jerarquías. Resuélvelas primero.' );
                        }

                    removedTables.add( conceptualEntityTable( next, id ).id );
                    }

                if (relation) {
                    relation.participations.forEach( part => removedSources.add( part.id ) );
                    }

                if (attribute) {
                    if (native.attributes.some( item => item.parentAttributeId === id )) {
                        throw new Error( 'Elimina primero los componentes del atributo.' );
                        }

                    if (native.relationships.some(
                            item => item.translation?.key?.attributeIds.includes( id )
                            )) {
                        throw new Error( 'El atributo pertenece a una clave de asociación. Revisa primero esa clave en Chen.' );
                        }
                    }

                for (const item of native.attributes) {
                    if (item.ownerId === id) {
                        removedSources.add( item.id );
                        }
                    }

                for (const trace of next.traces.filter(
                        item => removedSources.has( item.sourceId )
                        )) {
                    if (trace.targetKind === 'table') {
                        removedTables.add( trace.targetId );
                        }
                    if (trace.targetKind === 'foreign-key') {
                        removedForeignKeys.add( trace.targetId );
                        }
                    }

                const removedColumns = new Set(
                        next.traces.filter(
                                item => removedSources.has( item.sourceId )
                                    && item.targetKind === 'column'
                                ).map( item => item.targetId )
                        );

                for (const table of next.tables.filter( item => removedTables.has( item.id ) )) {
                    table.columns.forEach( field => removedColumns.add( field.id ) );
                    }

                if (next.relationships.some(
                        item => !removedForeignKeys.has( item.id )
                            && (removedTables.has( item.parentId )
                                || removedTables.has( item.childId )
                                || item.mappings.some(
                                        pair => removedColumns.has( pair.parentColumnId )
                                            || removedColumns.has( pair.childColumnId )
                                        ))
                        )) {
                    throw new Error( 'El origen Chen tiene referencias externas. Elimina primero esas relaciones.' );
                    }

                next.tables = next.tables.filter( item => !removedTables.has( item.id ) );
                next.relationships = next.relationships.filter(
                        item => !removedForeignKeys.has( item.id )
                        );

                for (const table of next.tables) {
                    table.columns = table.columns.filter( item => !removedColumns.has( item.id ) );
                    table.indexes = table.indexes.filter(
                            item => !item.columns.some( columnId => removedColumns.has( columnId ) )
                            );
                    table.alternateKeys = (table.alternateKeys || []).filter(
                            item => !item.columns.some( columnId => removedColumns.has( columnId ) )
                            );
                    }

                for (const collection of ['entities', 'attributes', 'relationships', 'generalizations']) {
                    native[collection] = native[collection].filter(
                            item => !removedSources.has( item.id )
                            );
                    }

                next.traces = next.traces.filter( item => !removedSources.has( item.sourceId ) );

                removeOrphanDiagramPositions( next );
                }
            );
    }

/** Pending decisions block complete SQL; documentary limits remain visible. */
export function conceptualStatus( model ) {
    const statuses = [];
    const report = (code, message, elementId) => statuses.push({
        level: 'warning', code, message, elementId
        });

    if (!model.conceptual) {
        return statuses;
        }

    for (const entity of model.conceptual.entities) {
        if (entity.weak) {
            const decision = entity.translation;
            const identifying = model.conceptual.relationships.find(
                    item => item.id === decision?.relationshipId
                    );
            const child = identifying?.participations.find(
                    part => part.id === identifying.translation?.childParticipationId
                    );
            const owner = identifying?.participations.find( part => part.id !== child?.id );
            const partial = model.conceptual.attributes.some(
                    item => item.ownerId === entity.id && item.partialKey
                    );

            if (decision?.kind !== 'weak' || !identifying?.translation?.identifying
                || child?.entityId !== entity.id || owner?.entityId !== entity.ownerEntityId
                || !partial) {
                report(
                        'pending',
                        `${entity.name}: entidad débil pendiente; elige propietario, clave parcial y vínculo FK identificador en Chen.`,
                        entity.id
                        );
                }
            }
        }

    for (const relation of model.conceptual.relationships) {
        if (!relation.translation) {
            report(
                    'pending',
                    `${relation.name}: relación Chen pendiente de estrategia y clave de materialización.`,
                    relation.id
                    );
            }

        for (const part of relation.participations) {
            if (part.min > 0 || part.max !== null && part.max !== 1) {
                report(
                        'documentary',
                        `${relation.name}, rol ${part.role || part.entityId}: participación (${part.min},${part.max ?? 'N'}) conservada; la FK no impone todos estos límites.`,
                        relation.id
                        );
                }
            }
        }

    for (const attribute of model.conceptual.attributes) {
        if (attribute.multivalued) {
            report(
                    'pending',
                    `${attribute.name}: multivaluado conservado; falta una transformación explícita a tabla auxiliar.`,
                    attribute.id
                    );
            }
        if (attribute.structure === 'composite') {
            const components = model.conceptual.attributes.filter(
                    item => item.parentAttributeId === attribute.id
                    );

            if (attribute.translation?.kind !== 'flatten' || !components.length) {
                report(
                        'pending',
                        `${attribute.name}: compuesto pendiente; añade componentes y elige translation.kind = flatten.`,
                        attribute.id
                        );
                }
            }
        if (attribute.derived) {
            const translated = ['stored', 'omit'].includes( attribute.translation?.kind );

            report(
                    translated ? 'documentary' : 'pending',
                    `${attribute.name}: derivación conservada como explicación; ${translated ? 'no se genera ni valida una fórmula SQL' : 'elige omitir o almacenar explícitamente'}.`,
                    attribute.id
                    );
            }
        }

    for (const item of model.conceptual.generalizations) {
        report(
                'pending',
                `Jerarquía ${item.id}: se conservan superclase, subclases, disyunción y totalidad; su transformación requiere una estrategia aún no implementada.`,
                item.id
                );
        }

    return statuses;
    }

function validateConceptualDocument( model ) {
    const issues = [];
    const add = (message, elementId) => issues.push({level: 'error', message, elementId});
    const native = model.conceptual;
    const entities = new Set( [
        ...native.entities.map( item => item.id ),
        ...model.tables.filter( item => item.kind === 'entity' ).map( item => item.id )
        ] );
    const relationships = new Set( native.relationships.map( item => item.id ) );

    for (const entity of native.entities) {
        if (!entity.name.trim()) {
            add( 'La entidad Chen necesita un nombre.', entity.id );
            }
        if (entity.ownerEntityId !== null
            && (!entities.has( entity.ownerEntityId ) || entity.ownerEntityId === entity.id)) {
            add( 'La entidad propietaria debe existir y ser distinta de la débil.', entity.id );
            }
        }

    const names = new Set();

    for (const attribute of native.attributes) {
        const ownerExists = attribute.ownerKind === 'entity'
            ? entities.has( attribute.ownerId )
            : relationships.has( attribute.ownerId );
        const name = `${attribute.ownerKind}.${attribute.ownerId}.${attribute.name.toLowerCase()}`;

        if (!ownerExists || !attribute.name.trim() || names.has( name )) {
            add( 'El atributo Chen necesita propietario existente y nombre único.', attribute.id );
            }

        names.add( name );

        if (!validType( attribute.type )
            || model.profile === 'course' && !validCourseType( attribute.type )) {
            add( `${attribute.name}: tipo incompatible con el perfil elegido.`, attribute.id );
            }

        if ((attribute.primary || attribute.partialKey) && !attribute.required) {
            add( `${attribute.name}: un atributo clave no admite nulos.`, attribute.id );
            }

        const visited = new Set( [attribute.id] );
        let current = attribute;

        while (current.parentAttributeId) {
            const parent = native.attributes.find( item => item.id === current.parentAttributeId );

            if (!parent || parent.structure !== 'composite'
                || parent.ownerKind !== attribute.ownerKind || parent.ownerId !== attribute.ownerId
                || visited.has( parent.id )) {
                add( 'Los componentes necesitan un padre compuesto del mismo propietario, sin ciclos.', attribute.id );
                break;
                }

            visited.add( parent.id );
            current = parent;
            }
        }

    for (const relation of native.relationships) {
        const repeated = new Set();

        if (!relation.name.trim()) {
            add( 'La relación Chen necesita un nombre.', relation.id );
            }

        for (const part of relation.participations) {
            const role = `${part.entityId}.${part.role.trim().toLowerCase()}`;

            if (!entities.has( part.entityId ) || repeated.has( role )) {
                add( 'Cada participación requiere una entidad existente y un rol distinguible si se repite.', relation.id );
                }

            repeated.add( role );
            }

        if (relation.translation && relation.participations.length < 2) {
            add( 'La materialización necesita al menos dos participaciones.', relation.id );
            }

        validateRelationshipMaterialization( model, relation, add );
        }

    for (const item of native.generalizations) {
        if (!entities.has( item.supertypeId )
            || item.subtypeIds.some( id => !entities.has( id ) || id === item.supertypeId )
            || new Set( item.subtypeIds ).size !== item.subtypeIds.length) {
            add( 'La jerarquía requiere superclase y subclases existentes y distintas.', item.id );
            }
        }

    const sources = {
        entity: new Set( native.entities.map( item => item.id ) ),
        attribute: new Set( native.attributes.map( item => item.id ) ),
        relationship: relationships,
        participation: new Set( native.relationships.flatMap(
                item => item.participations.map( part => part.id )
                ) )
        };
    const targets = {
        table: new Set( model.tables.map( item => item.id ) ),
        column: new Set( model.tables.flatMap( item => item.columns.map( field => field.id ) ) ),
        'foreign-key': new Set( model.relationships.map( item => item.id ) )
        };
    const traceKeys = new Set();

    for (const trace of model.traces) {
        const key = `${trace.sourceKind}.${trace.sourceId}.${trace.targetKind}.${trace.targetId}`;

        if (!sources[trace.sourceKind].has( trace.sourceId )
            || !targets[trace.targetKind].has( trace.targetId ) || traceKeys.has( key )) {
            add( 'La traza tiene un origen/destino inexistente o está duplicada.', trace.sourceId );
            }

        traceKeys.add( key );

        if (trace.sourceKind === 'attribute' && trace.targetKind === 'column') {
            const attribute = native.attributes.find( item => item.id === trace.sourceId );
            const field = model.tables.flatMap( item => item.columns ).find(
                    item => item.id === trace.targetId
                    );

            if (attribute && field
                && (attribute.name !== field.name || !sameType( attribute.type, field.type )
                    || attribute.notes !== field.notes)) {
                add( 'El atributo y su columna trazada no pueden divergir.', trace.sourceId );
                }
            }
        }

    for (const entity of native.entities) {
        if (!model.traces.some(
                item => item.sourceKind === 'entity' && item.sourceId === entity.id
                    && item.targetKind === 'table'
                )) {
            add( 'La entidad nativa necesita su correspondencia a tabla.', entity.id );
            }
        }

    issues.push( ...conceptualStatus( model ) );

    return issues;
    }

function validateRelationshipMaterialization(
        model,
        relation,
        add
        ) {
    const traces = model.traces.filter(
            item => item.sourceKind === 'relationship' && item.sourceId === relation.id
            );
    const fail = message => add( `${relation.name}: ${message}`, relation.id );

    if (!relation.translation) {
        if (traces.length) {
            fail( 'una relación pendiente no puede conservar materialización sin estrategia.' );
            }
        return;
        }

    if (traces.length !== 1) {
        fail( 'la estrategia debe tener una única materialización trazada.' );
        return;
        }

    const decision = relation.translation;
    const entityTableId = entityId => model.traces.find(
            item => item.sourceKind === 'entity' && item.sourceId === entityId
                && item.targetKind === 'table'
            )?.targetId || entityId;

    if (decision.kind === 'foreign-key') {
        const child = relation.participations.find( item => item.id === decision.childParticipationId );
        const parent = relation.participations.find( item => item.id !== decision.childParticipationId );
        const foreignKey = model.relationships.find( item => item.id === traces[0].targetId );

        if (relation.participations.length !== 2 || !child || !parent || child.max !== 1
            || !foreignKey || traces[0].targetKind !== 'foreign-key'
            || foreignKey.childId !== entityTableId( child.entityId )
            || foreignKey.parentId !== entityTableId( parent.entityId )
            || foreignKey.optional !== (child.min === 0)
            || foreignKey.cardinality !== participationCardinality( parent )
            || foreignKey.identifying !== (decision.identifying === true)) {
            fail( 'la FK y las participaciones Chen deben coincidir.' );
            }
        return;
        }

    const table = model.tables.find( item => item.id === traces[0].targetId );

    if (!table || traces[0].targetKind !== 'table' || table.name !== decision.tableName) {
        fail( 'la tabla asociativa debe coincidir con su estrategia.' );
        return;
        }

    const parts = decision.key.participationIds;
    const attributes = decision.key.attributeIds;
    const primaryIds = new Set();

    if (!parts.length && !attributes.length
        || new Set( parts ).size !== parts.length
        || new Set( attributes ).size !== attributes.length
        || parts.some( id => !relation.participations.some( item => item.id === id ) )) {
        fail( 'la clave explícita contiene participaciones inválidas o está vacía.' );
        }

    for (const part of relation.participations) {
        const trace = model.traces.find(
                item => item.sourceKind === 'participation' && item.sourceId === part.id
                    && item.targetKind === 'foreign-key'
                );
        const foreignKey = model.relationships.find( item => item.id === trace?.targetId );

        if (!foreignKey || foreignKey.parentId !== entityTableId( part.entityId )
            || foreignKey.childId !== table.id || foreignKey.optional
            || foreignKey.identifying !== parts.includes( part.id )
            || foreignKey.cardinality !== participationCardinality( part )) {
            fail( 'cada participación debe conservar su FK, cardinalidad e identificación.' );
            continue;
            }

        if (parts.includes( part.id )) {
            foreignKey.mappings.forEach( pair => primaryIds.add( pair.childColumnId ) );
            }
        }

    for (const id of attributes) {
        const attribute = model.conceptual.attributes.find(
                item => item.id === id && item.ownerKind === 'relationship'
                    && item.ownerId === relation.id
                );
        const trace = model.traces.find(
                item => item.sourceKind === 'attribute' && item.sourceId === id
                    && item.targetKind === 'column'
                );

        if (!attribute || !trace || !table.columns.some( field => field.id === trace.targetId )) {
            fail( 'la clave requiere atributos propios simples y materializados.' );
            continue;
            }

        primaryIds.add( trace.targetId );
        }

    const actual = table.columns.filter( field => field.primary ).map( field => field.id );

    if (actual.length !== primaryIds.size || actual.some( id => !primaryIds.has( id ) )) {
        fail( 'la PK de la asociación debe coincidir con la clave elegida en Chen.' );
        }
    }
