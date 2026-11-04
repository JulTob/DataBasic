/**
 * Public operations return a new document; a rejected operation never changes
 * the input. References use stable IDs, so renaming cannot break foreign keys.
 * @typedef {{id:string, name:string, type:string, required:boolean,
 * primary:boolean, notes:string, defaultValue:string}} Column
 * @typedef {{id:string, name:string, conceptualName:string, syncNames:boolean,
 * namespace:string, kind:'entity'|'view', x:number, y:number,
 * columns:Column[], notes:string, definition:string,
 * indexes:{id:string,name:string,columns:string[],unique:boolean}[]}} Entity
 * @typedef {{id:string,entityId:string,role:string,min:number,max:number|null,
 * cardinality?:'one'|'many'|null}} Participation
 * @typedef {{id:string,parentId:string,childId:string,name:string,
 * forward:string,inverse:string,cardinality:string,identifying:boolean,
 * optional:boolean,onDelete:string,onUpdate:string,
 * mappings:{parentColumnId:string,childColumnId:string}[]}} Relationship
 * @typedef {{id:string,kind:'enunciado'|'supuesto'|'perdida',text:string,
 * elementId:string|null}} Assumption
 * @typedef {{format:'databasic',version:2,profile:'course'|'general',
 * name:string,tables:Entity[],conceptual:Object,traces:Object[],
 * assumptions?:Assumption[],
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

/**
 * The course's three kinds of semantics: what the statement says, what the
 * author assumes beyond it, and what the model cannot express.
 */
export const ASSUMPTION_KINDS = [
    ['enunciado', 'Semántica del enunciado'],
    ['supuesto', 'Supuesto semántico'],
    ['perdida', 'Semántica perdida']
    ];

export const ASSUMPTION_TEXT_LIMIT = 2000;

export function assumptionKindLabel( kind ) {
    return ASSUMPTION_KINDS.find( ([value]) => value === kind )?.[1] || kind;
    }

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
        assumptions: [],
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
    synchronizeMaterializedConcepts( next );

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

                rejectGeneratedStructure( next, 'column', columnId );

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
                detachOrphanAssumptions( next );
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

/** Generated FKs expose referential actions; their source owns the structure. */
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

                const policyOnly = Object.keys( patch ).every(
                        key => ['onDelete', 'onUpdate'].includes( key )
                        );

                if (!policyOnly) {
                    rejectGeneratedStructure( next, 'foreign-key', relationshipId );
                    }

                const wasIdentifying = relation.identifying;

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

                if (wasIdentifying && !relation.identifying) {
                    releaseIdentifyingColumns( next, relation );
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

/**
 * A relationship that stops being identifying takes its FK columns out of the
 * child PK, as Visio 2010 does. A column stays in the PK only while another
 * identifying relationship of the same child still needs it.
 */
function releaseIdentifyingColumns(
        model,
        relation
        ) {
    const child = requireTable( model, relation.childId );
    const keptByOthers = new Set(
            model.relationships
                .filter(
                        other => other.id !== relation.id
                            && other.childId === relation.childId
                            && other.identifying
                        )
                .flatMap( other => other.mappings.map( pair => pair.childColumnId ) )
            );

    for (const pair of relation.mappings) {
        const field = child.columns.find( item => item.id === pair.childColumnId );

        if (field && !keptByOthers.has( field.id )) {
            field.primary = false;
            }
        }
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
                detachOrphanAssumptions( next );
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
        issues.push( ...validateAssumptions( model ) );
        }

    return issues;
    }

/** Shape checks already passed; here each assumption must point to a live element. */
function validateAssumptions( model ) {
    const ids = documentElementIds( model );
    const issues = [];

    for (const assumption of documentAssumptions( model )) {
        if (!assumption.text.trim()) {
            issues.push({level: 'error', message: 'Un supuesto necesita texto.', elementId: assumption.id});
            }

        if (assumption.elementId !== null && !ids.has( assumption.elementId )) {
            issues.push({
                level: 'error',
                message: 'Un supuesto referencia un elemento inexistente.',
                elementId: assumption.id
                });
            }
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

                if (item.translation) {
                    demand(
                            !Object.hasOwn( item.translation, 'onDelete' )
                                && !Object.hasOwn( item.translation, 'onUpdate' ),
                            'Las acciones referenciales se editan en la FK concreta, '
                                + 'no dentro de translation.'
                            );
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
                        || ['column', 'flatten', 'stored', 'omit', 'multivalued-table'].includes(
                                attribute.translation?.kind
                                ),
                    'Estrategia de atributo no válida.'
                    );
            if (attribute.translation?.kind === 'multivalued-table') {
                text( attribute.translation, 'tableName', 160 );
                }
            }

        for (const relation of model.conceptual.relationships) {
            list( relation.participations, 3, 'Participaciones' );

            for (const part of relation.participations) {
                identify( part );
                text( part, 'entityId', 100 );
                text( part, 'role', 160 );
                demand(
                        part.cardinality === undefined || part.cardinality === null
                            || ['one', 'many'].includes( part.cardinality ),
                        'Cardinalidad por combinación no válida.'
                        );
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
                    const context = relation.translation.cardinalityContextAttributeIds;

                    if (context !== undefined && context !== null) {
                        list( context, 200, 'Contexto de cardinalidad' );
                        demand(
                                context.every( id => typeof id === 'string' ),
                                'El contexto necesita identificadores de atributos.'
                                );
                        }

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
            demand(
                    generalization.translation === null
                        || generalization.translation?.kind === 'class-tables',
                    'Estrategia de jerarquía no válida.'
                    );
            }

        if ('assumptions' in model) {
            list( model.assumptions, 500, 'Supuestos' );

            for (const assumption of model.assumptions) {
                identify( assumption );
                text( assumption, 'text', ASSUMPTION_TEXT_LIMIT );
                demand(
                        ASSUMPTION_KINDS.some( ([kind]) => kind === assumption.kind ),
                        'Supuesto: la clase debe ser enunciado, supuesto o perdida.'
                        );
                demand(
                        assumption.elementId === null || typeof assumption.elementId === 'string',
                        'Supuesto: el elemento asociado debe ser un identificador o null.'
                        );
                }
            }

        list( model.traces, 10000, 'Trazas' );

        for (const trace of model.traces) {
            demand(
                    ['entity', 'attribute', 'relationship', 'participation', 'generalization'].includes( trace.sourceKind )
                        && ['table', 'column', 'foreign-key', 'alternate-key'].includes( trace.targetKind ),
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

/** Every identifier a position, a trace or an assumption may point to. */
export function documentElementIds( model ) {
    const ids = new Set( model.relationships.map( relation => relation.id ) );

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

    return ids;
    }

/** Called only by removals; malformed imports still fail validation unchanged. */
function removeOrphanDiagramPositions( model ) {
    if (!model.presentation) {
        return;
        }

    const ids = documentElementIds( model );
    const foreignKeyIds = new Set( model.relationships.map( relation => relation.id ) );

    for (const [mode, existing] of [['chen', ids], ['relational', foreignKeyIds]]) {
        for (const id of Object.keys( model.presentation[mode] || {} )) {
            if (!existing.has( id )) {
                delete model.presentation[mode][id];
                }
            }
        }
    }

/** An assumption whose element was removed keeps its text and becomes global. */
function detachOrphanAssumptions( model ) {
    const ids = documentElementIds( model );

    for (const assumption of documentAssumptions( model )) {
        if (assumption.elementId !== null && !ids.has( assumption.elementId )) {
            assumption.elementId = null;
            }
        }
    }

/** Older format 2 files have no list; they read as having no assumptions. */
export function documentAssumptions( model ) {
    return model.assumptions || [];
    }

/** A readable name for the element an assumption refers to, or null. */
export function elementLabel(
        model,
        id
        ) {
    const native = model.conceptual || {
        entities: [], attributes: [], relationships: [], generalizations: []
        };
    const entity = native.entities.find( item => item.id === id );

    if (entity) {
        return `Entidad ${entity.name}`;
        }

    const attribute = native.attributes.find( item => item.id === id );

    if (attribute) {
        return `Atributo ${attribute.name}`;
        }

    const relation = native.relationships.find( item => item.id === id );

    if (relation) {
        return `Relación ${relation.name}`;
        }

    for (const item of native.relationships) {
        const participation = item.participations.find( part => part.id === id );

        if (participation) {
            return `Participación ${item.name} · ${participation.role || participation.entityId}`;
            }
        }

    const generalization = native.generalizations.find( item => item.id === id );

    if (generalization) {
        const supertype = model.tables.find( item => item.id === generalization.supertypeId )
            || native.entities.find( item => item.id === generalization.supertypeId );

        return `Especialización de ${supertype?.name || generalization.supertypeId}`;
        }

    const table = model.tables.find( item => item.id === id );

    if (table) {
        return `${table.kind === 'view' ? 'Vista' : 'Entidad'} ${table.name}`;
        }

    for (const owner of model.tables) {
        const field = owner.columns.find( item => item.id === id );

        if (field) {
            return `Columna ${owner.name}.${field.name}`;
            }
        }

    const foreignKey = model.relationships.find( item => item.id === id );

    if (foreignKey) {
        return `Relación ${foreignKey.name}`;
        }

    return null;
    }

function normalizeAssumptionPatch(
        model,
        patch
        ) {
    const normalized = {};

    if ('kind' in patch) {
        if (!ASSUMPTION_KINDS.some( ([kind]) => kind === patch.kind )) {
            throw new Error( 'Elige la clase del supuesto: enunciado, supuesto o perdida.' );
            }

        normalized.kind = patch.kind;
        }

    if ('text' in patch) {
        const value = String( patch.text ?? '' ).trim();

        if (!value) {
            throw new Error( 'Escribe el texto del supuesto.' );
            }

        if (value.length > ASSUMPTION_TEXT_LIMIT) {
            throw new Error( `El supuesto admite hasta ${ASSUMPTION_TEXT_LIMIT} caracteres.` );
            }

        normalized.text = value;
        }

    if ('elementId' in patch) {
        const elementId = patch.elementId || null;

        if (elementId !== null && !documentElementIds( model ).has( elementId )) {
            throw new Error( 'El elemento asociado al supuesto ya no existe.' );
            }

        normalized.elementId = elementId;
        }

    return normalized;
    }

export function addAssumption(
        model,
        definition
        ) {
    return changeDocument(
            model,
            next => {
                const assumption = {
                    id: newId(),
                    kind: 'supuesto',
                    text: '',
                    elementId: null,
                    ...normalizeAssumptionPatch( next, {
                        kind: definition.kind ?? 'supuesto',
                        text: definition.text,
                        elementId: definition.elementId ?? null
                        } )
                    };

                next.assumptions = [...documentAssumptions( next ), assumption];
                }
            );
    }

export function updateAssumption(
        model,
        id,
        patch
        ) {
    return changeDocument(
            model,
            next => {
                const assumption = documentAssumptions( next ).find( item => item.id === id );

                if (!assumption) {
                    throw new Error( 'El supuesto seleccionado ya no existe.' );
                    }

                Object.assign( assumption, normalizeAssumptionPatch( next, patch ) );
                }
            );
    }

export function removeAssumption(
        model,
        id
        ) {
    return changeDocument(
            model,
            next => {
                if (!documentAssumptions( next ).some( item => item.id === id )) {
                    throw new Error( 'El supuesto seleccionado ya no existe.' );
                    }

                next.assumptions = documentAssumptions( next ).filter( item => item.id !== id );
                }
            );
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
                && ['relationship', 'participation', 'attribute', 'generalization'].includes( item.sourceKind )
            );

    if (trace) {
        const relationship = trace.sourceKind === 'participation'
            ? model.conceptual.relationships.find(
                    item => item.participations.some( part => part.id === trace.sourceId )
                    )
            : null;
        const originId = relationship?.id || trace.sourceId;

        throw new Error(
                `Estructura generada: edita su origen Chen ${originId} en Conceptual.`
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
    for (const relation of model.relationships) {
        if (traces.some( trace => trace.targetKind === 'foreign-key' && trace.targetId === relation.id )) {
            relation.mappings.forEach( pair => tracedColumns.add( pair.childColumnId ) );
            }
        }

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
            identifying: relation.identifying,
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
    if (attribute.parentAttributeId) {
        const parent = requireConceptualObject( model, 'attributes', attribute.parentAttributeId );

        if (parent.multivalued) {
            const trace = model.traces.find(
                    item => item.sourceKind === 'attribute'
                        && item.sourceId === parent.id && item.targetKind === 'table'
                    );

            return model.tables.find( item => item.id === trace?.targetId ) || null;
            }
        }

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
    if (attribute.multivalued) {
        materializeMultivaluedAttribute( model, attribute );
        return;
        }

    const table = nativeAttributeTable( model, attribute );

    if (table && (attribute.derived && attribute.translation?.kind === 'omit'
        || attribute.structure === 'composite')) {
        removeStoredAttributeColumn( model, attribute, table );
        }

    if (!table || attribute.structure === 'composite') {
        return;
        }

    if (attribute.derived && attribute.translation?.kind !== 'stored') {
        return;
        }

    if (attribute.parentAttributeId) {
        const parent = requireConceptualObject( model, 'attributes', attribute.parentAttributeId );

        if (parent.translation?.kind !== 'flatten'
            && parent.translation?.kind !== 'multivalued-table') {
            return;
            }
        }

    materializeAttributeColumn( model, attribute, table );
    }

function materializeAttributeColumn(
        model,
        attribute,
        table,
        asValue = false
        ) {
    const trace = model.traces.find(
            item => item.sourceKind === 'attribute' && item.sourceId === attribute.id
                && item.targetKind === 'column'
            );
    let field = table.columns.find( item => item.id === trace?.targetId );

    if (!field) {
        field = column( attribute.name, attribute.type );
        table.columns.push( field );
        traceDomainTarget( model, 'attribute', attribute.id, 'column', field.id );
        }

    for (const key of ['name', 'type', 'notes', 'defaultValue', 'domain']) {
        field[key] = structuredClone( attribute[key] );
        }

    field.primary = asValue || attribute.primary || attribute.partialKey;
    field.required = attribute.required || field.primary;
    propagateColumnType( model, field.id, field.type );

    return field;
    }

function generatedTable(
        model,
        name,
        conceptualName
        ) {
    return {
        id: newId(),
        name,
        conceptualName,
        syncNames: false,
        namespace: '',
        kind: 'entity',
        x: 160 + model.tables.length * 30,
        y: 180 + model.tables.length * 25,
        columns: [],
        notes: '',
        definition: '',
        indexes: []
        };
    }

function generatedForeignKey(
        model,
        sourceKind,
        sourceId,
        parent,
        child,
        name
        ) {
    const trace = model.traces.find(
            item => item.sourceKind === sourceKind && item.sourceId === sourceId
                && item.targetKind === 'foreign-key'
                && model.relationships.some(
                        relation => relation.id === item.targetId && relation.childId === child.id
                        )
            );
    let foreignKey = model.relationships.find( item => item.id === trace?.targetId );

    if (!foreignKey) {
        foreignKey = {
            id: newId(),
            parentId: parent.id,
            childId: child.id,
            name,
            forward: '',
            inverse: '',
            cardinality: 'zero-many',
            identifying: true,
            optional: false,
            onDelete: 'NO ACTION',
            onUpdate: 'NO ACTION',
            mappings: []
            };
        model.relationships.push( foreignKey );
        traceDomainTarget( model, sourceKind, sourceId, 'foreign-key', foreignKey.id );
        }

    const keys = parent.columns.filter( item => item.primary );

    if (!keys.length) {
        throw new Error( `${parent.name}: define la PK completa antes de transformar.` );
        }

    if (foreignKey.mappings.some( pair => !keys.some( key => key.id === pair.parentColumnId ) )) {
        throw new Error( `${parent.name}: resuelve las referencias a la PK anterior antes de retirar sus componentes.` );
        }

    foreignKey.parentId = parent.id;
    foreignKey.name = name;
    foreignKey.identifying = true;
    foreignKey.optional = false;
    foreignKey.cardinality = 'zero-many';
    foreignKey.mappings = keys.map(
            key => {
                const oldPair = foreignKey.mappings.find( item => item.parentColumnId === key.id );
                let target = child.columns.find( item => item.id === oldPair?.childColumnId );

                if (!target) {
                    target = column(
                            uniqueColumnName( child, `${parent.name}_${key.name}` ),
                            key.type,
                            true
                            );
                    child.columns.push( target );
                    if (sourceKind === 'generalization') {
                        traceDomainTarget( model, sourceKind, sourceId, 'column', target.id );
                        }
                    }

                target.name = `${parent.name}_${key.name}`;
                target.type = key.type;
                target.primary = true;
                target.required = true;

                return {parentColumnId: key.id, childColumnId: target.id};
                }
            );

    return foreignKey;
    }

function multivaluedComponents(
        model,
        attribute
        ) {
    return attribute.structure === 'simple'
        ? [attribute]
        : model.conceptual.attributes.filter( item => item.parentAttributeId === attribute.id );
    }

function materializeMultivaluedAttribute(
        model,
        attribute
        ) {
    const owner = nativeAttributeTable( model, attribute );
    const tableTrace = model.traces.find(
            item => item.sourceKind === 'attribute' && item.sourceId === attribute.id
                && item.targetKind === 'table'
            );

    if (!tableTrace && owner) {
        removeStoredAttributeColumn( model, attribute, owner );
        }

    if (attribute.translation?.kind !== 'multivalued-table') {
        return;
        }

    const values = multivaluedComponents( model, attribute );

    if (!owner || attribute.derived || attribute.parentAttributeId
        || attribute.primary || attribute.partialKey || !values.length
        || values.some( item => item.structure !== 'simple' || item.derived
                || item !== attribute && item.multivalued )) {
        throw new Error(
                `${attribute.name}: la tabla auxiliar requiere propietaria con PK `
                    + 'y valores simples almacenados, sin clave propia ni derivación.'
                );
        }

    let table = model.tables.find( item => item.id === tableTrace?.targetId );

    if (!table) {
        for (const value of values.filter( item => item !== attribute )) {
            removeStoredAttributeColumn( model, value, owner );
            }

        table = generatedTable( model, attribute.translation.tableName, attribute.name );
        model.tables.push( table );
        traceDomainTarget( model, 'attribute', attribute.id, 'table', table.id );
        }

    table.name = attribute.translation.tableName;
    table.conceptualName = attribute.name;
    table.notes = attribute.notes;
    generatedForeignKey(
            model,
            'attribute',
            attribute.id,
            owner,
            table,
            `FK_${table.name}_${owner.name}`
            );

    for (const value of values) {
        materializeAttributeColumn( model, value, table, true );
        }
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

    if (!field) {
        return;
        }

    const foreignKey = model.relationships.find(
            relation => relation.mappings.some(
                    pair => pair.parentColumnId === field.id || pair.childColumnId === field.id
                    )
            );
    const key = [...table.indexes, ...(table.alternateKeys || [])].find(
            item => item.columns.includes( field.id )
            );

    if (foreignKey || key || field.primary) {
        const reference = foreignKey?.name || key?.name || `PK de ${table.name}`;

        throw new Error(
                `Resuelve las claves y referencias (${reference}) `
                    + 'antes de omitir o descomponer este atributo.'
                );
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

    if (attribute.translation?.kind === 'multivalued-table'
        && ('translation' in patch && patch.translation?.kind !== 'multivalued-table'
            || patch.multivalued === false || patch.structure && patch.structure !== attribute.structure)) {
        throw new Error( 'Elimina el origen multivaluado antes de cambiar su estrategia materializada.' );
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

    if (attribute.parentAttributeId) {
        const parent = requireConceptualObject( model, 'attributes', attribute.parentAttributeId );

        if (parent.multivalued) {
            materializeMultivaluedAttribute( model, parent );
            }
        }

    if (attribute.structure === 'composite' && !attribute.multivalued) {
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

/** Applies a coherent source decision; incompatible references reject atomically. */
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
                                max: part.max ?? null,
                                ...(part.cardinality !== undefined
                                    ? {cardinality: part.cardinality} : {})
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

                applyDomainPatch( part, patch, ['role', 'min', 'max', 'cardinality'] );
                materializeConceptualRelationship( next, relation );
                }
            );
    }

/**
 * Course notation: the letter next to the diamond on a branch is the
 * cardinality ratio of that branch. In a binary relationship it is the
 * maximum of the other participation. In a ternary it is the cardinality
 * per combination of the other roles chosen by the author ('one' or 'many');
 * while undecided there is no letter to draw.
 */
export function participationCardinalityLetter(
        relation,
        participation
        ) {
    const others = relation.participations.filter( item => item.id !== participation.id );

    if (others.length === 1) {
        return others[0].max === 1 ? '1' : 'N';
        }

    if (participation.cardinality === 'one') {
        return '1';
        }

    return participation.cardinality === 'many' ? 'N' : null;
    }

/** A weak entity's chosen link, or an identifying FK strategy, is an identifying link. */
export function isIdentifyingLink(
        model,
        relationshipId
        ) {
    const relation = model.conceptual?.relationships.find( item => item.id === relationshipId );

    if (relation?.translation?.kind === 'foreign-key'
        && relation.translation.identifying === true) {
        return true;
        }

    return (model.conceptual?.entities || []).some(
            entity => entity.weak
                && entity.translation?.kind === 'weak'
                && entity.translation.relationshipId === relationshipId
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

    if (relation.translation.kind !== 'association') {
        throw new Error( 'Estrategia de relación no válida.' );
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
    materializeCombinationKeys( model, relation, table );
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
                const generalization = {
                    id: newId(),
                    supertypeId: definition.supertypeId,
                    subtypeIds: structuredClone( definition.subtypeIds || [] ),
                    disjoint: definition.disjoint ?? true,
                    total: definition.total ?? false,
                    notes: definition.notes || '',
                    translation: structuredClone( definition.translation ?? null )
                    };

                next.conceptual.generalizations.push( generalization );
                materializeClassTables( next, generalization );
                }
            );
    }

/** Inheritance preserves local fields; an incompatible local PK must be resolved. */
export function updateConceptualGeneralization(
        model,
        id,
        patch
        ) {
    return changeDocument(
            model,
            next => {
                const item = requireConceptualObject( next, 'generalizations', id );

                if (item.translation && (
                    'supertypeId' in patch && patch.supertypeId !== item.supertypeId
                        || 'subtypeIds' in patch
                            && JSON.stringify( patch.subtypeIds ) !== JSON.stringify( item.subtypeIds )
                        || 'translation' in patch && patch.translation?.kind !== 'class-tables'
                    )) {
                    throw new Error( 'Elimina primero la jerarquía materializada para cambiar sus clases o estrategia.' );
                    }

                applyDomainPatch(
                        item,
                        patch,
                        ['supertypeId', 'subtypeIds', 'disjoint', 'total', 'notes', 'translation']
                        );
                materializeClassTables( next, item );
                }
            );
    }

function materializeClassTables(
        model,
        generalization
        ) {
    if (!generalization.translation) {
        return;
        }

    if (generalization.translation.kind !== 'class-tables') {
        throw new Error( 'Estrategia de jerarquía no válida.' );
        }

    const parent = conceptualEntityTable( model, generalization.supertypeId );

    for (const subtypeId of generalization.subtypeIds) {
        const child = conceptualEntityTable( model, subtypeId );
        const inherited = new Set( model.traces.filter(
                trace => trace.sourceKind === 'generalization'
                    && trace.sourceId === generalization.id && trace.targetKind === 'column'
                ).map( trace => trace.targetId ) );
        const incompatible = child.columns.some( field => field.primary && !inherited.has( field.id ) );

        if (incompatible && model.traces.some(
                trace => trace.sourceKind === 'generalization'
                    && trace.sourceId !== generalization.id
                    && child.columns.some( field => field.id === trace.targetId && field.primary )
                )) {
            throw new Error(
                    `${child.name}: herencia múltiple con identidades incompatibles; `
                        + 'resuelve explícitamente qué identidad hereda antes de materializar.'
                    );
            }

        if (incompatible) {
            throw new Error(
                    `${child.name}: resuelve explícitamente su PK local `
                        + `antes de heredar la PK de ${parent.name}; `
                        + 'desmarca la clave o crea la subclase sin identificador.'
                    );
            }

        const foreignKey = generatedForeignKey(
                model,
                'generalization',
                generalization.id,
                parent,
                child,
                `FK_${child.name}_${parent.name}`
                );

        foreignKey.cardinality = 'zero-one';
        }
    }

function combinationKeyColumns(
        model,
        relation,
        selected
        ) {
    const columns = [];

    for (const part of relation.participations.filter( item => item.id !== selected.id )) {
        const trace = model.traces.find(
                item => item.sourceKind === 'participation' && item.sourceId === part.id
                    && item.targetKind === 'foreign-key'
                );
        const foreignKey = model.relationships.find( item => item.id === trace?.targetId );

        if (foreignKey) {
            columns.push( ...foreignKey.mappings.map( item => item.childColumnId ) );
            }
        }

    for (const id of relation.translation.cardinalityContextAttributeIds || []) {
        const trace = model.traces.find(
                item => item.sourceKind === 'attribute' && item.sourceId === id
                    && item.targetKind === 'column'
                );

        if (trace) {
            columns.push( trace.targetId );
            }
        }

    return columns;
    }

function materializeCombinationKeys(
        model,
        relation,
        table
        ) {
    if (relation.participations.length !== 3) {
        return;
        }

    const context = relation.translation.cardinalityContextAttributeIds;

    for (const part of relation.participations) {
        const trace = model.traces.find(
                item => item.sourceKind === 'participation' && item.sourceId === part.id
                    && item.targetKind === 'alternate-key'
                );
        const complete = part.cardinality === 'one' && Array.isArray( context );

        if (!complete) {
            if (trace) {
                table.alternateKeys = (table.alternateKeys || []).filter( item => item.id !== trace.targetId );
                model.traces = model.traces.filter( item => item !== trace );
                }
            continue;
            }

        let key = table.alternateKeys?.find( item => item.id === trace?.targetId );

        if (!key) {
            key = {id: newId(), name: '', columns: []};
            table.alternateKeys ||= [];
            table.alternateKeys.push( key );
            traceDomainTarget( model, 'participation', part.id, 'alternate-key', key.id );
            }

        const ordinal = relation.participations.indexOf( part ) + 1;

        key.name = `AK_${table.name}_${part.role || 'rol'}_${ordinal}_combinacion`;
        key.columns = combinationKeyColumns( model, relation, part );
        }
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

                if (definition.id) {
                    rejectGeneratedStructure( next, 'alternate-key', definition.id );
                    }

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

                rejectGeneratedStructure( next, 'alternate-key', keyId );
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
                    const components = native.attributes.filter( item => item.parentAttributeId === id );

                    if (components.length && attribute.translation?.kind !== 'multivalued-table') {
                        throw new Error( 'Elimina primero los componentes del atributo.' );
                        }

                    components.forEach( item => removedSources.add( item.id ) );

                    if (native.relationships.some(
                            item => item.translation?.key?.attributeIds.includes( id )
                                || item.translation?.cardinalityContextAttributeIds?.includes( id )
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

                for (const table of next.tables.filter( item => !removedTables.has( item.id ) )) {
                    const dependent = [...table.indexes, ...(table.alternateKeys || [])].find(
                            key => key.columns.some( columnId => removedColumns.has( columnId ) )
                            );

                    if (dependent) {
                        throw new Error( `La clave o índice ${dependent.name} usa columnas generadas; resuelve esa referencia antes de borrar el origen Chen.` );
                        }
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
                detachOrphanAssumptions( next );
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
            const materialized = attribute.translation?.kind === 'multivalued-table';

            report(
                    materialized ? 'documentary' : 'pending',
                    `${attribute.name}: ${materialized
                        ? 'tabla auxiliar materializada; la FK no exige un mínimo de valores por propietaria'
                        : 'multivaluado pendiente de una transformación explícita a tabla auxiliar'}.`,
                    attribute.id
                    );
            }
        if (attribute.structure === 'composite' && !attribute.multivalued) {
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

    for (const relation of model.conceptual.relationships.filter(
            item => item.participations.length === 3
            )) {
        const legacy = relation.participations.every( part => part.cardinality === undefined );
        const incomplete = relation.participations.some( part => !['one', 'many'].includes( part.cardinality ) );
        const needsContext = relation.participations.some( part => part.cardinality === 'one' );
        const context = relation.translation?.cardinalityContextAttributeIds;

        if (legacy) {
            report(
                    'documentary',
                    `${relation.name}: cardinalidad por combinación desconocida en el archivo anterior; no se deduce desde mínimos/máximos ni desde la PK.`,
                    relation.id
                    );
            }
        else if (incomplete || needsContext && !Array.isArray( context )) {
            report(
                    'pending',
                    `${relation.name}: elige cardinalidad one/many de cada rol y contexto global o temporal explícito para las ramas one.`,
                    relation.id
                    );
            }
        }

    const entityName = id => model.conceptual.entities.find( item => item.id === id )?.name
        || model.tables.find( item => item.id === id )?.conceptualName
        || 'Entidad sin nombre';

    for (const item of model.conceptual.generalizations) {
        const materialized = item.translation?.kind === 'class-tables';
        const supertype = entityName( item.supertypeId );
        const subtypes = item.subtypeIds.map( entityName ).join( ', ' );
        const decision = materialized
            ? 'tablas de superclase y subclases materializadas; '
                + `${item.disjoint ? 'disjunta' : 'solapada'}, `
                + `${item.total ? 'total' : 'parcial'}. `
                + 'PK/FK no imponen exclusión ni cobertura entre subclases'
            : 'superclase, subclases, disyunción y totalidad conservadas; '
                + 'elige tablas de superclase y subclases para materializar';

        report(
                materialized ? 'documentary' : 'pending',
                `Jerarquía ${supertype} → ${subtypes}: ${decision}.`,
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
        if (!item.subtypeIds.length || !entities.has( item.supertypeId )
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
                ) ),
        generalization: new Set( native.generalizations.map( item => item.id ) )
        };
    const targets = {
        table: new Set( model.tables.map( item => item.id ) ),
        column: new Set( model.tables.flatMap( item => item.columns.map( field => field.id ) ) ),
        'foreign-key': new Set( model.relationships.map( item => item.id ) ),
        'alternate-key': new Set( model.tables.flatMap( item => (item.alternateKeys || []).map( key => key.id ) ) )
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

    validateConceptualOwnership( model, add );
    validateGeneralizationGraph( model, add );
    validateGeneratedArtifacts( model, add );
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

function synchronizeMaterializedConcepts( model ) {
    if (model.version !== 2 || !model.conceptual) {
        return;
        }

    const completed = new Set();
    const active = new Set();
    const visit = item => {
        if (completed.has( item.id ) || active.has( item.id )) {
            return;
            }

        active.add( item.id );

        for (const parent of model.conceptual.generalizations.filter(
                candidate => candidate.subtypeIds.includes( item.supertypeId )
                )) {
            visit( parent );
            }

        materializeClassTables( model, item );
        completed.add( item.id );
        active.delete( item.id );
        };

    for (const item of model.conceptual.generalizations) {
        visit( item );
        }

    for (const relation of model.conceptual.relationships) {
        materializeConceptualRelationship( model, relation );
        }

    for (const attribute of model.conceptual.attributes.filter( item => item.multivalued )) {
        materializeMultivaluedAttribute( model, attribute );
        }
    }

function validateGeneralizationGraph(
        model,
        add
        ) {
    const edges = new Map();

    for (const item of model.conceptual.generalizations) {
        const children = edges.get( item.supertypeId ) || [];

        children.push( ...item.subtypeIds );
        edges.set( item.supertypeId, children );
        }

    const active = new Set();
    const complete = new Set();
    const visit = id => {
        if (active.has( id )) {
            return false;
            }
        if (complete.has( id )) {
            return true;
            }

        active.add( id );

        for (const child of edges.get( id ) || []) {
            if (!visit( child )) {
                return false;
                }
            }

        active.delete( id );
        complete.add( id );
        return true;
        };

    for (const id of edges.keys()) {
        if (!visit( id )) {
            add( 'La jerarquía no puede contener ciclos de herencia.', id );
            return;
            }
        }
    }

function validateConceptualOwnership(
        model,
        add
        ) {
    const native = model.conceptual;
    const permitted = {
        entity: ['table'],
        attribute: ['column', 'table', 'foreign-key'],
        relationship: ['table', 'foreign-key'],
        participation: ['foreign-key', 'alternate-key'],
        generalization: ['column', 'foreign-key']
        };
    const tableForColumn = id => model.tables.find(
            table => table.columns.some( field => field.id === id )
            );

    for (const trace of model.traces) {
        if (!permitted[trace.sourceKind]?.includes( trace.targetKind )) {
            add( 'El par de origen y destino de la traza no está permitido.', trace.sourceId );
            }
        }

    const tableOwners = new Map();

    for (const trace of model.traces.filter( item => item.targetKind === 'table' )) {
        if (tableOwners.has( trace.targetId )) {
            add( 'La tabla generada no puede tener varios orígenes propietarios.', trace.sourceId );
            }
        tableOwners.set( trace.targetId, trace.sourceId );
        }

    const ownedTables = new Set();

    for (const entity of native.entities) {
        const traces = model.traces.filter(
                item => item.sourceKind === 'entity' && item.sourceId === entity.id
                );
        const table = model.tables.find( item => item.id === traces[0]?.targetId );

        if (traces.length !== 1 || traces[0]?.targetKind !== 'table'
            || !table || table.kind !== 'entity' || ownedTables.has( table.id )
            || table.conceptualName !== entity.name || table.notes !== entity.notes) {
            add( 'La entidad necesita una única tabla propia coherente; la traza no puede apuntar a una tabla ajena.', entity.id );
            }

        if (table) {
            ownedTables.add( table.id );
            }
        }

    for (const attribute of native.attributes) {
        const traces = model.traces.filter(
                item => item.sourceKind === 'attribute' && item.sourceId === attribute.id
                );
        const columnTraces = traces.filter( item => item.targetKind === 'column' );
        const auxiliary = attribute.translation?.kind === 'multivalued-table';
        const strategy = attribute.translation?.kind;
        const compatible = strategy === undefined
            || strategy === 'multivalued-table' && attribute.multivalued
            || strategy === 'flatten'
                && attribute.structure === 'composite'
                && !attribute.multivalued
            || ['stored', 'omit'].includes( strategy )
                && attribute.derived
                && !attribute.multivalued
            || strategy === 'column'
                && attribute.structure === 'simple'
                && !attribute.multivalued
                && !attribute.derived;

        if (!compatible) {
            add( 'La estrategia del atributo no corresponde a su estructura y derivación.', attribute.id );
            }

        if (auxiliary && (traces.filter( item => item.targetKind === 'table' ).length !== 1
            || traces.filter( item => item.targetKind === 'foreign-key' ).length !== 1
            || columnTraces.length !== (attribute.structure === 'simple' ? 1 : 0))) {
            add( 'El multivaluado necesita una auxiliar, una FK y sólo las columnas de sus valores simples.', attribute.id );
            }

        if (!auxiliary && traces.some( item => item.targetKind !== 'column' )) {
            add( 'Sólo un multivaluado materializado puede originar una tabla auxiliar y su FK.', attribute.id );
            }

        if (columnTraces.length > 1) {
            add( 'Cada valor simple necesita una única columna propia.', attribute.id );
            }

        let expected;

        try {
            expected = auxiliary
                ? model.tables.find( item => traces.some(
                        trace => trace.targetKind === 'table' && trace.targetId === item.id
                        ) )
                : nativeAttributeTable( model, attribute );
            }
        catch (error) {
            add( error.message, attribute.id );
            continue;
            }

        for (const trace of columnTraces) {
            if (tableForColumn( trace.targetId )?.id !== expected?.id) {
                add( 'La columna del atributo debe pertenecer a su propietaria o auxiliar elegida.', attribute.id );
                }
            }

        const parent = native.attributes.find( item => item.id === attribute.parentAttributeId );
        const stored = attribute.structure === 'simple' && !attribute.multivalued
            && (!attribute.derived || attribute.translation?.kind === 'stored')
            && (!parent || ['flatten', 'multivalued-table'].includes( parent.translation?.kind ));

        if (stored && expected && columnTraces.length !== 1) {
            add( 'El atributo almacenado necesita su columna y traza completas.', attribute.id );
            }
        if ((!stored && !auxiliary) && columnTraces.length) {
            add( 'Un atributo no almacenado no puede conservar una copia escalar residual.', attribute.id );
            }
        }

    for (const item of native.generalizations) {
        if (!item.translation && model.traces.some(
                trace => trace.sourceKind === 'generalization' && trace.sourceId === item.id
                )) {
            add( 'La jerarquía pendiente no puede conservar artefactos materializados.', item.id );
            }
        }

    for (const relation of native.relationships) {
        const context = relation.translation?.cardinalityContextAttributeIds;

        if (Array.isArray( context )) {
            if (new Set( context ).size !== context.length || context.some(
                    id => !native.attributes.some(
                            attribute => attribute.id === id
                                && attribute.ownerKind === 'relationship'
                                && attribute.ownerId === relation.id
                                && attribute.structure === 'simple'
                                && !attribute.multivalued && !attribute.derived
                                && attribute.required
                            )
                    )) {
                add( 'El contexto de cardinalidad exige atributos propios simples almacenados, obligatorios y sin duplicados.', relation.id );
                }
            }

        for (const part of relation.participations) {
            const traces = model.traces.filter(
                    trace => trace.sourceKind === 'participation' && trace.sourceId === part.id
                    );
            const expectedForeignKey = relation.translation?.kind === 'association'
                || relation.translation?.kind === 'foreign-key'
                    && part.id !== relation.translation.childParticipationId;

            if (!expectedForeignKey && traces.length) {
                add( 'La participación pendiente o hija no puede originar estos artefactos.', part.id );
                }

            if (traces.filter( trace => trace.targetKind === 'foreign-key' ).length > 1
                || traces.filter( trace => trace.targetKind === 'alternate-key' ).length > 1) {
                add( 'La participación no puede duplicar sus artefactos.', part.id );
                }
            }
        }
    }

/** Recompute on a copy: missing or divergent artifacts are errors, never repairs. */
function validateGeneratedArtifacts(
        model,
        add
        ) {
    const expected = structuredClone( model );

    try {
        synchronizeMaterializedConcepts( expected );
        }
    catch (error) {
        add( error.message );
        return;
        }

    const generatedSources = new Set( [
        ...model.conceptual.attributes.filter(
                item => item.translation?.kind === 'multivalued-table'
                ).map( item => item.id ),
        ...model.conceptual.generalizations.filter( item => item.translation ).map( item => item.id ),
        ...model.conceptual.relationships.flatMap( item => item.participations.map( part => part.id ) )
        ] );
    const relevant = document => document.traces.filter(
            trace => generatedSources.has( trace.sourceId )
            );
    const signatures = traces => traces.map( trace => artifactSignature( trace ) ).sort();

    if (JSON.stringify( signatures( relevant( model ) ) )
        !== JSON.stringify( signatures( relevant( expected ) ) )) {
        add( 'La materialización necesita todas sus trazas, sin duplicados ni destinos ajenos.' );
        }

    for (const trace of relevant( expected )) {
        const find = document => {
            if (trace.targetKind === 'table') {
                const table = document.tables.find( item => item.id === trace.targetId );

                return table && {
                    name: table.name,
                    conceptualName: table.conceptualName,
                    notes: table.notes,
                    columns: table.columns
                    };
                }
            if (trace.targetKind === 'column') {
                return document.tables.flatMap( item => item.columns ).find(
                        item => item.id === trace.targetId
                        );
                }
            if (trace.targetKind === 'alternate-key') {
                return document.tables.flatMap( item => item.alternateKeys || [] ).find(
                        item => item.id === trace.targetId
                        );
                }

            return document.relationships.find( item => item.id === trace.targetId );
            };

        if (artifactSignature( find( model ) ) !== artifactSignature( find( expected ) )) {
            add( 'El artefacto generado diverge de su decisión conceptual.', trace.sourceId );
            }
        }

    for (const attribute of model.conceptual.attributes.filter(
            item => item.translation?.kind === 'multivalued-table'
            )) {
        const traces = model.traces.filter(
                trace => trace.sourceKind === 'attribute' && trace.sourceId === attribute.id
                );
        const tableTrace = traces.find( trace => trace.targetKind === 'table' );
        const table = model.tables.find( item => item.id === tableTrace?.targetId );
        const foreignTrace = traces.find( trace => trace.targetKind === 'foreign-key' );
        const foreignKey = model.relationships.find( item => item.id === foreignTrace?.targetId );
        const valueIds = new Set( multivaluedComponents( model, attribute ).flatMap(
                value => model.traces.filter(
                        trace => trace.sourceKind === 'attribute' && trace.sourceId === value.id
                            && trace.targetKind === 'column'
                        ).map( trace => trace.targetId )
                ) );
        const expectedIds = new Set( [
            ...valueIds,
            ...(foreignKey?.mappings || []).map( pair => pair.childColumnId )
            ] );

        if (!table || !foreignKey || foreignKey.childId !== table.id
            || table.columns.length !== expectedIds.size
            || table.columns.some( field => !expectedIds.has( field.id ) || !field.primary || !field.required )) {
            add( 'La auxiliar debe contener exactamente la PK propietaria y todos los valores como PK obligatoria.', attribute.id );
            }
        }

    for (const item of model.conceptual.generalizations.filter( value => value.translation )) {
        const traces = model.traces.filter(
                trace => trace.sourceKind === 'generalization' && trace.sourceId === item.id
                );
        const foreignKeys = traces.filter( trace => trace.targetKind === 'foreign-key' ).map(
                trace => model.relationships.find( relation => relation.id === trace.targetId )
                );
        const inheritedIds = foreignKeys.flatMap( foreignKey => (foreignKey?.mappings || []).map(
                pair => pair.childColumnId
                ) );
        const columnTraces = traces.filter( trace => trace.targetKind === 'column' );

        if (foreignKeys.length !== item.subtypeIds.length
            || columnTraces.length !== inheritedIds.length
            || columnTraces.some( trace => !inheritedIds.includes( trace.targetId ) )) {
            add( 'La jerarquía necesita exactamente las FKs y columnas heredadas de sus subclases.', item.id );
            }

        for (const subtypeId of item.subtypeIds) {
            let table;

            try {
                table = conceptualEntityTable( model, subtypeId );
                }
            catch (error) {
                add( error.message, item.id );
                continue;
                }

            const inherited = new Set( traces.filter( trace => trace.targetKind === 'column' ).map(
                    trace => trace.targetId
                    ) );

            if (table.columns.filter( field => field.primary ).some( field => !inherited.has( field.id ) )) {
                add( 'La PK de la subclase debe ser exactamente la clave heredada.', item.id );
                }
            }
        }
    }

function artifactSignature( value ) {
    const canonical = item => {
        if (Array.isArray( item )) {
            return item.map( canonical );
            }
        if (item && typeof item === 'object') {
            return Object.fromEntries(
                    Object.keys( item ).sort().map(
                            key => [key, canonical( item[key] )]
                            )
                    );
            }

        return item;
        };

    return JSON.stringify( canonical( value ) );
    }
