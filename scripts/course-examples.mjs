/*
 * Builds the course exercises as DataBasic documents through the domain API,
 * so every file is a valid, fully materialized model. Run it with
 * `node scripts/course-examples.mjs`; it rewrites examples/curso-*.databasic.json
 * (identifiers are generated anew on each run).
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as domain from '../src/domain/model.js';
import { serializeDocument } from '../src/domain/serialization.js';
import { exportSQL } from '../src/io/sql.js';
import { fillWithSampleData } from '../src/sql/sample.js';

const OUT = fileURLToPath( new URL( '../examples', import.meta.url ) );

/* ---------- small helpers over the domain API ---------- */

function entity( state, name, position, options = {} ) {
    state.model = domain.addConceptualEntity( state.model, {name, ...options}, position );
    const created = state.model.conceptual.entities.at( -1 );

    state.ids[name] = created.id;
    return created.id;
    }

/** Every new entity is born with a generated key attribute «id»; this returns it. */
function defaultKeyAttribute( state, entityName ) {
    return state.model.conceptual.attributes.find(
            item => item.ownerKind === 'entity' && item.ownerId === state.ids[entityName] && item.name === 'id'
            );
    }

/** The entity's identifier: the generated «id» renamed and typed as the statement says. */
function key( state, entityName, name, type, options = {} ) {
    const generated = defaultKeyAttribute( state, entityName );

    state.model = domain.updateConceptualAttribute( state.model, generated.id, {name, type, primary: true, ...options} );
    return generated.id;
    }

/** A weak entity's partial key: the generated «id» becomes the partial key instead of a full one. */
function partialKey( state, entityName, name, type, options = {} ) {
    const generated = defaultKeyAttribute( state, entityName );

    state.model = domain.updateConceptualAttribute( state.model, generated.id, {name, type, primary: false, partialKey: true, ...options} );
    return generated.id;
    }

/** A subclass has no identifier of its own: it inherits the superclass key. */
function withoutKey( state, entityName ) {
    const generated = defaultKeyAttribute( state, entityName );

    state.model = domain.removeConceptualElement( state.model, generated.id );
    }

function attribute( state, owner, name, type, options = {} ) {
    state.model = domain.addConceptualAttribute( state.model, {
        ownerKind: options.ownerKind || 'entity',
        ownerId: state.ids[owner],
        name,
        type,
        ...options
        } );
    return state.model.conceptual.attributes.at( -1 ).id;
    }

function relation( state, name, participations ) {
    state.model = domain.addConceptualRelationship( state.model, {
        name,
        participations: participations.map( ([entityName, role, min, max, cardinality]) => ({
            entityId: state.ids[entityName], role, min, max,
            ...(cardinality ? {cardinality} : {})
            }) )
        } );
    const created = state.model.conceptual.relationships.at( -1 );

    state.ids[name] = created.id;
    return created;
    }

/** Binary relationship as a foreign key in the child's table. */
function foreignKey( state, relationName, childEntity, identifying = false ) {
    const created = state.model.conceptual.relationships.find( item => item.id === state.ids[relationName] );
    const child = created.participations.find( part => part.entityId === state.ids[childEntity] );

    state.model = domain.updateConceptualRelationship( state.model, created.id, {
        translation: {kind: 'foreign-key', childParticipationId: child.id, identifying}
        } );
    }

/**
 * N:N (or a relationship with its own table) as an association table. The key
 * is every participation unless `keyRoles` names the roles that form it.
 */
function association( state, relationName, tableName, attributeIds = [], keyRoles = null ) {
    const created = state.model.conceptual.relationships.find( item => item.id === state.ids[relationName] );
    const parts = keyRoles
        ? keyRoles.map( role => created.participations.find( part => part.role === role ) )
        : created.participations;

    state.model = domain.updateConceptualRelationship( state.model, created.id, {
        translation: {
            kind: 'association',
            tableName,
            key: {participationIds: parts.map( part => part.id ), attributeIds}
            }
        } );
    }

/** A unique key over columns of any table, generated ones included. */
function tableAlternateKey( state, tableName, keyName, columnNames ) {
    const table = state.model.tables.find( item => item.name === tableName );
    const columns = columnNames.map( name => table.columns.find( column => column.name === name ).id );

    state.model = domain.setAlternateKey( state.model, table.id, {name: keyName, columns} );
    }

/** Grid cell of the drawing, the same for the Diagrama and Relacional views. */
function at( column, row ) {
    return {x: 120 + column * 640, y: 140 + row * 560};
    }

const DOMAIN = (extra) => ({minimum: null, maximum: null, values: [], check: '', ...extra});

function weak( state, entityName, relationName ) {
    state.model = domain.updateConceptualEntity( state.model, state.ids[entityName], {
        translation: {kind: 'weak', relationshipId: state.ids[relationName]}
        } );
    }

function generalization( state, supertype, subtypes, options ) {
    state.model = domain.addConceptualGeneralization( state.model, {
        supertypeId: state.ids[supertype],
        subtypeIds: subtypes.map( name => state.ids[name] ),
        ...options
        } );
    const created = state.model.conceptual.generalizations.at( -1 );

    state.model = domain.updateConceptualGeneralization( state.model, created.id, {translation: {kind: 'class-tables'}} );
    }

function assume( state, kind, text, elementName = null ) {
    state.model = domain.addAssumption( state.model, {
        kind, text, elementId: elementName ? state.ids[elementName] : null
        } );
    }

/** A unique index on an optional column: no repeated values, but several rows may leave it empty. */
function uniqueIndex( state, entityName, indexName, columnNames ) {
    const table = tableOf( state, entityName );
    const columns = columnNames.map( name => table.columns.find( column => column.name === name ).id );

    state.model = domain.updateTable( state.model, table.id, {
        indexes: [...table.indexes, {id: domain.newId(), name: indexName, columns, unique: true}]
        } );
    }

function alternateKey( state, entityName, keyName, attributeNames ) {
    const table = tableOf( state, entityName );
    const columns = attributeNames.map( name => table.columns.find( column => column.name === name ).id );

    state.model = domain.setAlternateKey( state.model, table.id, {name: keyName, columns} );
    }

function tableOf( state, entityName ) {
    const trace = state.model.traces.find( item => item.sourceKind === 'entity' && item.sourceId === state.ids[entityName] );

    return state.model.tables.find( table => table.id === trace.targetId );
    }

/** Generated tables (associations, multivalued) get a relational position of their own. */
function placeTable( state, tableName, position ) {
    const table = state.model.tables.find( item => item.name === tableName );

    state.model = domain.moveDiagramElement( state.model, table.id, position, 'relational' );
    }

/**
 * The Diagrama view draws every attribute as an ellipse around its entity, so
 * it needs more room than the tables: spread the entities further apart there.
 */
const CHEN_SPREAD = 1.5;

function spreadChenEntities( state ) {
    for (const item of state.model.conceptual.entities) {
        const table = state.model.tables.find( candidate => candidate.id === item.id
            || state.model.traces.some( trace => trace.sourceId === item.id && trace.targetId === candidate.id ) );
        const origin = state.model.presentation.chen[item.id] || {x: table.x, y: table.y};

        state.model = domain.moveDiagramElement( state.model, item.id, {
            x: Math.round( 120 + (origin.x - 120) * CHEN_SPREAD ),
            y: Math.round( 140 + (origin.y - 140) * CHEN_SPREAD )
            }, 'chen' );
        }
    }

function finish( state, filename ) {
    spreadChenEntities( state );
    // Sample rows that keep every rule, so the SQL console has something to query.
    state.model = fillWithSampleData( state.model, {rowsPerTable: 8} );
    state.model = domain.setDiagramMode( state.model, 'chen' );
    const errors = domain.validateDocument( state.model ).filter( issue => issue.level === 'error' );

    if (errors.length) {
        throw new Error( `${filename}: ${errors[0].message}` );
        }

    const sql = exportSQL( state.model );

    writeFileSync( `${OUT}/${filename}`, serializeDocument( state.model ) );
    console.log( `${filename}: ${state.model.tables.length} tablas, ${state.model.relationships.length} FKs, ${state.model.conceptual.relationships.length} relaciones, ${(sql.match( /CREATE TABLE/g ) || []).length} CREATE TABLE` );

    for (const table of state.model.tables) {
        console.log( '   ', table.name, '(', table.columns.map( column => `${column.name}${column.primary ? '*' : ''}` ).join( ', ' ), ')' );
        }
    }

function start( name ) {
    const model = domain.emptyDocument( 'course' );

    model.name = name;
    return {model, ids: {}};
    }

/* ---------- Ejercicio 3 del guion ERE: cadena hotelera ---------- */

function hoteles() {
    const s = start( 'Cadena hotelera · ejercicio 3 (guion ERE)' );

    entity( s, 'Hotel', {x: 120, y: 160} );
    key( s, 'Hotel', 'codigo_hotel', 'NUMBER' );
    attribute( s, 'Hotel', 'nombre', 'VARCHAR(80)', {required: true} );
    attribute( s, 'Hotel', 'direccion', 'VARCHAR(120)' );
    attribute( s, 'Hotel', 'categoria', 'NUMBER(1)', {required: true, domain: {minimum: 1, maximum: 5, values: [], check: ''}} );
    alternateKey( s, 'Hotel', 'AK_Hotel_nombre', ['nombre'] );

    entity( s, 'Habitacion', {x: 720, y: 160}, {weak: true, ownerEntityId: s.ids.Hotel} );
    partialKey( s, 'Habitacion', 'numero', 'NUMBER(4)' );

    entity( s, 'Cliente', {x: 120, y: 640} );
    key( s, 'Cliente', 'dni', 'CHAR(9)' );
    attribute( s, 'Cliente', 'nombre', 'VARCHAR(80)', {required: true} );
    attribute( s, 'Cliente', 'direccion', 'VARCHAR(120)' );
    attribute( s, 'Cliente', 'telefono', 'VARCHAR(15)' );

    entity( s, 'Reserva', {x: 720, y: 640} );
    key( s, 'Reserva', 'codigo_reserva', 'NUMBER' );
    attribute( s, 'Reserva', 'fecha_inicio', 'DATE', {required: true} );
    attribute( s, 'Reserva', 'fecha_fin', 'DATE', {required: true, domain: {minimum: null, maximum: null, values: [], check: 'fecha_fin >= fecha_inicio'}} );
    attribute( s, 'Reserva', 'num_personas', 'NUMBER(2)', {required: true, domain: {minimum: 1, maximum: null, values: [], check: ''}} );

    entity( s, 'Factura', {x: 720, y: 1120}, {weak: true, ownerEntityId: s.ids.Reserva} );
    partialKey( s, 'Factura', 'numero', 'NUMBER(4)' );
    attribute( s, 'Factura', 'importe_total', 'NUMBER(8,2)', {required: true, domain: {minimum: 0, maximum: null, values: [], check: ''}} );
    attribute( s, 'Factura', 'fecha_emision', 'DATE', {required: true} );

    entity( s, 'Empleado', {x: 1360, y: 640} );
    key( s, 'Empleado', 'dni', 'CHAR(9)' );
    attribute( s, 'Empleado', 'nombre', 'VARCHAR(80)', {required: true} );
    attribute( s, 'Empleado', 'fecha_contratacion', 'DATE', {required: true} );

    entity( s, 'Recepcionista', {x: 1160, y: 1040} );
    withoutKey( s, 'Recepcionista' );
    attribute( s, 'Recepcionista', 'idioma_principal', 'VARCHAR(30)' );
    entity( s, 'Camarero', {x: 1600, y: 1040} );
    withoutKey( s, 'Camarero' );
    attribute( s, 'Camarero', 'area_asignada', 'VARCHAR(30)' );

    relation( s, 'Contiene', [['Hotel', 'hotel', 1, null], ['Habitacion', 'habitacion', 1, 1]] );
    foreignKey( s, 'Contiene', 'Habitacion', true );
    weak( s, 'Habitacion', 'Contiene' );

    relation( s, 'Hace', [['Cliente', 'cliente', 0, null], ['Reserva', 'reserva', 1, 1]] );
    foreignKey( s, 'Hace', 'Reserva' );

    relation( s, 'Incluye', [['Reserva', 'reserva', 1, null], ['Habitacion', 'habitacion', 0, null]] );
    association( s, 'Incluye', 'Reserva_Habitacion' );

    // The subclasses inherit Empleado's key once the hierarchy is materialized; Gestiona needs it.
    generalization( s, 'Empleado', ['Recepcionista', 'Camarero'], {disjoint: true, total: true} );

    relation( s, 'Gestiona', [['Recepcionista', 'recepcionista', 0, null], ['Reserva', 'reserva', 1, 1]] );
    foreignKey( s, 'Gestiona', 'Reserva' );

    relation( s, 'Emite', [['Reserva', 'reserva', 0, null], ['Factura', 'factura', 1, 1]] );
    foreignKey( s, 'Emite', 'Factura', true );
    weak( s, 'Factura', 'Emite' );

    placeTable( s, 'Reserva_Habitacion', {x: 1360, y: 160} );

    assume( s, 'enunciado', 'Cada hotel tiene un nombre único: clave alternativa sobre el nombre.', 'Hotel' );
    assume( s, 'enunciado', 'Las habitaciones se identifican por su número dentro de cada hotel: entidad débil con clave parcial.', 'Habitacion' );
    assume( s, 'enunciado', 'La factura se identifica por un número correlativo dentro de la reserva: entidad débil de Reserva.', 'Factura' );
    assume( s, 'supuesto', 'Se añade un código de reserva porque el enunciado no identifica las reservas.', 'Reserva' );
    assume( s, 'supuesto', 'Una habitación puede aparecer en varias reservas en intervalos distintos; la relación es N:N.', 'Incluye' );
    assume( s, 'supuesto', 'Todo empleado es recepcionista o camarero: clasificación total y disjunta.', 'Empleado' );
    assume( s, 'perdida', 'Que dos reservas no solapen fechas sobre la misma habitación no se expresa con claves; queda como restricción documental.', 'Incluye' );
    assume( s, 'perdida', 'Que la categoría sea de 1 a 5 estrellas y que la fecha de fin no preceda a la de inicio quedan como dominios (CHECK).', 'Reserva' );

    finish( s, 'curso-hoteles.databasic.json' );
    }

/* ---------- Ejercicio 3 de Tema 2: videoclub ---------- */

function videoclub() {
    const s = start( 'Videoclub · ejercicio 3 (Tema 2)' );

    entity( s, 'Pelicula', {x: 160, y: 200} );
    key( s, 'Pelicula', 'titulo', 'VARCHAR(120)' );
    attribute( s, 'Pelicula', 'anio_estreno', 'NUMBER(4)', {primary: true} );
    attribute( s, 'Pelicula', 'tema', 'VARCHAR(40)' );
    attribute( s, 'Pelicula', 'actor_principal', 'VARCHAR(80)', {multivalued: true, translation: {kind: 'multivalued-table', tableName: 'Actores'}} );

    entity( s, 'Copia', {x: 760, y: 200}, {weak: true, ownerEntityId: s.ids.Pelicula} );
    partialKey( s, 'Copia', 'numero_copia', 'NUMBER(3)' );
    attribute( s, 'Copia', 'formato', 'CHAR(3)', {required: true, domain: {minimum: null, maximum: null, values: ['DVD', 'BR'], check: ''}} );

    entity( s, 'Cliente', {x: 760, y: 700} );
    key( s, 'Cliente', 'dni', 'CHAR(9)' );
    attribute( s, 'Cliente', 'nombre', 'VARCHAR(80)', {required: true} );
    attribute( s, 'Cliente', 'direccion', 'VARCHAR(120)' );
    attribute( s, 'Cliente', 'telefono', 'VARCHAR(15)' );

    relation( s, 'Tiene', [['Pelicula', 'pelicula', 1, null], ['Copia', 'copia', 1, 1]] );
    foreignKey( s, 'Tiene', 'Copia', true );
    weak( s, 'Copia', 'Tiene' );

    relation( s, 'Alquila', [['Cliente', 'cliente', 0, null], ['Copia', 'copia', 0, null]] );
    const fecha = attribute( s, 'Alquila', 'fecha', 'DATE', {ownerKind: 'relationship', required: true} );

    // A copy goes out once a day at most: (copia, fecha) identifies the rental; the client is a plain FK.
    association( s, 'Alquila', 'Alquiler', [fecha], ['copia'] );

    placeTable( s, 'Actores', {x: 160, y: 560} );
    placeTable( s, 'Alquiler', {x: 1340, y: 420} );

    assume( s, 'enunciado', 'Puede haber películas con igual título pero distinto año: la clave es (título, año de estreno).', 'Pelicula' );
    assume( s, 'enunciado', 'Las copias se numeran dentro de cada película: entidad débil con clave parcial.', 'Copia' );
    assume( s, 'supuesto', 'Los actores principales se guardan como atributo multivaluado, traducido a la tabla Actores.', 'Pelicula' );
    assume( s, 'supuesto', 'Una misma copia se alquila como mucho una vez al día: la clave del alquiler es (copia, fecha) y el cliente es una clave ajena obligatoria fuera de la clave.', 'Alquila' );
    assume( s, 'enunciado', 'Un cliente puede realizar varios alquileres en un día: el cliente no forma parte de la clave, así que puede repetirse con la misma fecha.', 'Alquila' );
    assume( s, 'perdida', 'La devolución del alquiler no figura en el enunciado y no se modela.', 'Alquila' );

    finish( s, 'curso-videoclub.databasic.json' );
    }

/* ---------- Práctica 1 del curso 2025-2026: lonja de Santa Pola ---------- */

/*
 * Starts from the author's solution (repository BasesDeDatos, Practica/P1) and
 * corrects it against the statement and the course notes: Comprador has two
 * subclasses (total and disjoint), Factura generalizes the boat and buyer
 * invoices, the totals are derived attributes, the fishing period is a
 * composite attribute of the ternary Faena, and one Pago settles any invoice.
 */
function lonja() {
    const s = start( 'Lonja de Santa Pola · práctica 1 (2025-2026)' );

    entity( s, 'Caladero', at( 0, 0 ) );
    key( s, 'Caladero', 'nombre', 'VARCHAR(40)' );
    attribute( s, 'Caladero', 'extension', 'NUMBER(8,2)', {domain: DOMAIN( {minimum: 0} )} );
    const ubicacion = attribute( s, 'Caladero', 'ubicacion', 'VARCHAR(50)', {structure: 'composite', translation: {kind: 'flatten'}} );
    attribute( s, 'Caladero', 'latitud', 'NUMBER(9,6)', {parentAttributeId: ubicacion, required: true, domain: DOMAIN( {minimum: -90, maximum: 90} )} );
    attribute( s, 'Caladero', 'longitud', 'NUMBER(9,6)', {parentAttributeId: ubicacion, required: true, domain: DOMAIN( {minimum: -180, maximum: 180} )} );

    entity( s, 'Especie', at( 1, 0 ) );
    key( s, 'Especie', 'cod_especie', 'VARCHAR(5)' );
    attribute( s, 'Especie', 'nombre', 'VARCHAR(40)', {required: true} );
    attribute( s, 'Especie', 'tipo', 'VARCHAR(30)', {required: true} );

    entity( s, 'Barco', at( 0, 1 ) );
    key( s, 'Barco', 'matricula', 'CHAR(10)' );
    attribute( s, 'Barco', 'nombre', 'VARCHAR(40)', {required: true} );
    attribute( s, 'Barco', 'clase', 'VARCHAR(30)' );
    attribute( s, 'Barco', 'capitan', 'VARCHAR(60)' );
    attribute( s, 'Barco', 'armador', 'VARCHAR(60)' );
    attribute( s, 'Barco', 'cif', 'CHAR(9)', {required: true} );

    entity( s, 'Lote', at( 1, 1 ) );
    key( s, 'Lote', 'cod_lote', 'CHAR(5)' );
    attribute( s, 'Lote', 'num_cajas', 'NUMBER(4)', {required: true, domain: DOMAIN( {minimum: 1} )} );
    attribute( s, 'Lote', 'kilos_total', 'NUMBER(8,2)', {required: true, domain: DOMAIN( {minimum: 0} )} );
    attribute( s, 'Lote', 'fecha_llegada', 'DATE', {required: true} );
    attribute( s, 'Lote', 'precio_kg_salida', 'NUMBER(8,2)', {required: true, domain: DOMAIN( {minimum: 0} )} );
    attribute( s, 'Lote', 'precio_total_salida', 'NUMBER(10,2)', {
        required: true, derived: true, derivation: 'kilos_total × precio_kg_salida', translation: {kind: 'stored'}, domain: DOMAIN( {minimum: 0} )
        } );

    entity( s, 'Comprador', at( 2, 1 ) );
    key( s, 'Comprador', 'cod_comprador', 'CHAR(5)' );
    attribute( s, 'Comprador', 'nombre', 'VARCHAR(40)', {required: true} );
    attribute( s, 'Comprador', 'direccion', 'VARCHAR(60)' );
    attribute( s, 'Comprador', 'dni_cif', 'CHAR(9)', {required: true} );
    attribute( s, 'Comprador', 'cuota_anual', 'NUMBER(8,2)', {required: true, domain: DOMAIN( {minimum: 0} )} );
    alternateKey( s, 'Comprador', 'AK_Comprador_dni_cif', ['dni_cif'] );

    entity( s, 'Credito', at( 3, 0 ) );
    withoutKey( s, 'Credito' );
    attribute( s, 'Credito', 'num_cuenta', 'CHAR(24)', {required: true} );
    attribute( s, 'Credito', 'importe_acumulado', 'NUMBER(10,2)', {required: true, defaultValue: '0', domain: DOMAIN( {minimum: 0} )} );
    attribute( s, 'Credito', 'fecha_vencimiento', 'DATE', {required: true} );
    entity( s, 'Contado', at( 3, 1 ) );
    withoutKey( s, 'Contado' );
    generalization( s, 'Comprador', ['Credito', 'Contado'], {disjoint: true, total: true} );

    entity( s, 'Factura', at( 1, 3 ) );
    key( s, 'Factura', 'num_factura', 'CHAR(10)' );
    attribute( s, 'Factura', 'fecha_emision', 'DATE', {required: true} );
    attribute( s, 'Factura', 'importe_total', 'NUMBER(10,2)', {
        required: true, derived: true, derivation: 'Suma de los importes de los lotes que incluye', translation: {kind: 'stored'}, domain: DOMAIN( {minimum: 0} )
        } );
    entity( s, 'Factura_barco', at( 0, 2 ) );
    withoutKey( s, 'Factura_barco' );
    entity( s, 'Factura_comprador', at( 2, 2 ) );
    withoutKey( s, 'Factura_comprador' );
    attribute( s, 'Factura_comprador', 'estado', 'VARCHAR(9)', {defaultValue: "'pendiente'", domain: DOMAIN( {values: ['pendiente', 'pagada']} )} );
    generalization( s, 'Factura', ['Factura_barco', 'Factura_comprador'], {disjoint: true, total: true} );

    entity( s, 'Pago', at( 1, 4 ) );
    key( s, 'Pago', 'cod_pago', 'CHAR(5)' );
    attribute( s, 'Pago', 'fecha', 'DATE', {required: true} );
    attribute( s, 'Pago', 'importe', 'NUMBER(10,2)', {required: true, domain: DOMAIN( {minimum: 0} )} );

    relation( s, 'De_especie', [['Especie', 'especie', 0, null], ['Lote', 'lote', 1, 1]] );
    foreignKey( s, 'De_especie', 'Lote' );
    relation( s, 'Capturado_por', [['Barco', 'barco', 1, null], ['Lote', 'lote', 1, 1]] );
    foreignKey( s, 'Capturado_por', 'Lote' );

    relation( s, 'Faena', [
        ['Barco', 'barco', 0, null, 'many'],
        ['Caladero', 'caladero', 0, null, 'many'],
        ['Especie', 'especie', 0, null, 'many']
        ] );
    const periodo = attribute( s, 'Faena', 'periodo', 'VARCHAR(30)', {ownerKind: 'relationship', structure: 'composite', translation: {kind: 'flatten'}} );
    const inicio = attribute( s, 'Faena', 'fecha_inicio', 'DATE', {ownerKind: 'relationship', parentAttributeId: periodo, required: true} );
    attribute( s, 'Faena', 'fecha_fin', 'DATE', {ownerKind: 'relationship', parentAttributeId: periodo, domain: DOMAIN( {check: 'fecha_fin >= fecha_inicio'} )} );
    attribute( s, 'Faena', 'kg_especie', 'NUMBER(8,2)', {ownerKind: 'relationship', required: true, domain: DOMAIN( {minimum: 0} )} );
    association( s, 'Faena', 'Faena', [inicio] );

    relation( s, 'Adjudicacion', [['Lote', 'lote', 1, 1], ['Comprador', 'comprador', 0, null]] );
    attribute( s, 'Adjudicacion', 'precio_kg_compra', 'NUMBER(8,2)', {ownerKind: 'relationship', required: true, domain: DOMAIN( {minimum: 0} )} );
    attribute( s, 'Adjudicacion', 'precio_total_adjudicacion', 'NUMBER(10,2)', {
        ownerKind: 'relationship', required: true, derived: true, derivation: 'kilos_total del lote × precio_kg_compra', translation: {kind: 'stored'}, domain: DOMAIN( {minimum: 0} )
        } );
    association( s, 'Adjudicacion', 'Adjudicacion', [], ['lote'] );

    relation( s, 'Emitida_a', [['Comprador', 'comprador', 0, null], ['Factura_comprador', 'factura', 1, 1]] );
    foreignKey( s, 'Emitida_a', 'Factura_comprador' );
    relation( s, 'Incluye', [['Factura_comprador', 'factura', 1, null], ['Lote', 'lote', 1, 1]] );
    association( s, 'Incluye', 'Incluye' );
    tableAlternateKey( s, 'Incluye', 'AK_Incluye_lote', ['lote_cod_lote'] );

    relation( s, 'Emitida_por', [['Barco', 'barco', 0, null], ['Factura_barco', 'factura', 1, 1]] );
    foreignKey( s, 'Emitida_por', 'Factura_barco' );
    relation( s, 'Provision', [['Factura_barco', 'factura', 1, null], ['Lote', 'lote', 1, 1]] );
    association( s, 'Provision', 'Provision' );
    tableAlternateKey( s, 'Provision', 'AK_Provision_lote', ['lote_cod_lote'] );

    relation( s, 'Salda', [['Factura', 'factura', 0, null], ['Pago', 'pago', 1, 1]] );
    foreignKey( s, 'Salda', 'Pago' );

    placeTable( s, 'Faena', at( 0, -1 ) );
    placeTable( s, 'Adjudicacion', at( 2, 0 ) );
    placeTable( s, 'Provision', at( 0, 3 ) );
    placeTable( s, 'Incluye', at( 2, 3 ) );

    assume( s, 'enunciado', 'Cada lote tiene un código único, es de una sola especie y lo capturó un barco.', 'Lote' );
    assume( s, 'enunciado', 'La relación ternaria es Faena: qué barcos capturan qué especies en qué caladeros, con los kilos y el periodo (fecha de inicio y de fin).', 'Faena' );
    assume( s, 'enunciado', 'Un comprador es de crédito o de contado, nunca ambos: especialización disjunta. Como todo comprador es de uno de los dos tipos, es total.', 'Comprador' );
    assume( s, 'enunciado', 'Las facturas de los barcos guardan "además de los datos mencionados de la factura" su barco y sus lotes: generalización Factura con lo común (número, fecha, importe) y dos subclases.', 'Factura' );
    assume( s, 'enunciado', 'Solo las facturas a compradores sin crédito necesitan el estado (pendiente o pagada).', 'Factura_comprador' );
    assume( s, 'enunciado', 'De la adjudicación se guardan el precio de compra por kilo y el precio total de adjudicación.', 'Adjudicacion' );
    assume( s, 'supuesto', 'El número de factura es el registro que asigna la lonja, único para todas las facturas que guarda, también las recibidas de los barcos.', 'Factura' );
    assume( s, 'supuesto', 'Los precios totales y el importe de la factura son derivados (se calculan de kilos, precios y lotes), pero se guardan porque el enunciado pide conocerlos y guardarlos.', 'Lote' );
    assume( s, 'supuesto', 'La fecha de inicio forma parte de la clave de Faena: el mismo barco puede faenar la misma especie en el mismo caladero en periodos distintos.', 'Faena' );
    assume( s, 'supuesto', 'No se guardan las pujas, solo la adjudicación ganadora; guardar todas encarecería el sistema sin uso posterior. Debería confirmarlo el cliente.', 'Adjudicacion' );
    assume( s, 'supuesto', 'El CIF del barco se guarda en Barco y la factura del barco lo obtiene por su relación, sin repetirlo.', 'Barco' );
    assume( s, 'supuesto', 'El número de cuenta bancaria es un IBAN y se guarda como CHAR(24) porque lleva letras de país.', 'Credito' );
    assume( s, 'supuesto', 'Contado no tiene atributos propios: su tabla solo guarda la clave. Alternativa válida: omitirla y entender que paga al contado quien no está en Credito; ahorra una tabla pero la cobertura total deja de verse.', 'Contado' );
    assume( s, 'supuesto', 'Cada pago salda una factura, sea del barco (pago de la lonja) o del comprador (cobro); el tipo de factura dice quién paga. Un comprador con crédito registra al final de mes un pago por cada factura.', 'Salda' );
    assume( s, 'supuesto', 'Incluye y Provision son tablas propias para que un lote pueda existir antes de facturarse; la clave alternativa sobre el lote impide que esté en dos facturas.', 'Incluye' );
    assume( s, 'perdida', 'Las pujas no se registran: solo queda la ganadora.', 'Adjudicacion' );
    assume( s, 'perdida', 'Adjudicación, Incluye y Provision están en tablas aparte: un lote sin adjudicar o sin facturar no aparece en ellas, así que su participación total (1,1) no se impone.', 'Adjudicacion' );
    assume( s, 'perdida', 'Que los valores derivados guardados coincidan con su cálculo no lo impone ninguna clave.', 'Lote' );
    assume( s, 'perdida', 'Que el estado solo se use en facturas de compradores al contado, y que los lotes de una factura sean los adjudicados a su comprador o capturados por su barco, no se impone con claves.', 'Factura_comprador' );
    assume( s, 'perdida', 'Que cada comprador esté exactamente en Credito o en Contado (disjunta y total) no lo imponen las claves primarias y ajenas.', 'Comprador' );
    assume( s, 'perdida', 'Que la especie de un lote sea una de las que su barco faena no lo impone ninguna clave ajena.', 'De_especie' );

    finish( s, 'curso-lonja.databasic.json' );
    }

/* ---------- Guion ERE, ejercicio 1: agencia de viajes ---------- */

function agencia() {
    const s = start( 'Agencia de viajes · ejercicio 1 (guion ERE)' );

    entity( s, 'Cliente', at( 0, 0 ) );
    key( s, 'Cliente', 'dni', 'CHAR(9)' );
    attribute( s, 'Cliente', 'nombre', 'VARCHAR(80)', {required: true} );
    attribute( s, 'Cliente', 'direccion', 'VARCHAR(120)' );
    attribute( s, 'Cliente', 'telefono', 'VARCHAR(15)', {multivalued: true, translation: {kind: 'multivalued-table', tableName: 'Telefonos_cliente'}} );

    entity( s, 'Reserva', at( 1, 0 ) );
    key( s, 'Reserva', 'codigo_reserva', 'NUMBER' );
    attribute( s, 'Reserva', 'fecha_reserva', 'DATE', {required: true} );
    attribute( s, 'Reserva', 'num_plazas', 'NUMBER(3)', {required: true, domain: DOMAIN( {minimum: 1} )} );

    entity( s, 'Viaje', at( 2, 0 ) );
    key( s, 'Viaje', 'codigo', 'NUMBER' );
    attribute( s, 'Viaje', 'destino', 'VARCHAR(80)', {required: true} );
    attribute( s, 'Viaje', 'fecha_salida', 'DATE', {required: true} );
    attribute( s, 'Viaje', 'precio', 'NUMBER(8,2)', {required: true, domain: DOMAIN( {minimum: 0} )} );

    entity( s, 'Empleado', at( 2, 1 ) );
    key( s, 'Empleado', 'dni', 'CHAR(9)' );
    attribute( s, 'Empleado', 'nombre', 'VARCHAR(80)', {required: true} );
    attribute( s, 'Empleado', 'fecha_contratacion', 'DATE', {required: true} );

    entity( s, 'Agente', at( 1, 2 ) );
    withoutKey( s, 'Agente' );
    attribute( s, 'Agente', 'codigo_empleado', 'NUMBER(5)', {required: true} );
    attribute( s, 'Agente', 'area_especializacion', 'VARCHAR(40)' );
    entity( s, 'Administrativo', at( 3, 2 ) );
    withoutKey( s, 'Administrativo' );
    generalization( s, 'Empleado', ['Agente', 'Administrativo'], {disjoint: true, total: true} );
    alternateKey( s, 'Agente', 'AK_Agente_codigo', ['codigo_empleado'] );

    relation( s, 'Realiza', [['Cliente', 'cliente', 0, null], ['Reserva', 'reserva', 1, 1]] );
    foreignKey( s, 'Realiza', 'Reserva' );
    relation( s, 'Reserva_de', [['Viaje', 'viaje', 0, null], ['Reserva', 'reserva', 1, 1]] );
    foreignKey( s, 'Reserva_de', 'Reserva' );
    relation( s, 'Gestiona', [['Agente', 'agente', 0, null], ['Reserva', 'reserva', 1, 1]] );
    foreignKey( s, 'Gestiona', 'Reserva' );

    placeTable( s, 'Telefonos_cliente', at( 0, 1 ) );

    assume( s, 'enunciado', 'Los viajes se identifican por un código único.', 'Viaje' );
    assume( s, 'enunciado', 'Un agente gestiona muchas reservas y cada reserva la gestiona un único agente.', 'Gestiona' );
    assume( s, 'supuesto', 'La reserva es una entidad con código propio: tiene atributos y participa en Gestiona, cosa que una relación Cliente–Viaje no podría hacer sin agregación.', 'Reserva' );
    assume( s, 'supuesto', 'Los teléfonos del cliente son un atributo multivaluado.', 'Cliente' );
    assume( s, 'supuesto', 'Todo empleado es agente o administrativo, nunca ambos: especialización total y disjunta.', 'Empleado' );
    assume( s, 'supuesto', 'El código de empleado del agente es único: clave alternativa.', 'Agente' );
    assume( s, 'perdida', 'Que las plazas reservadas de un viaje no superen su capacidad no se puede expresar (el enunciado no da la capacidad).', 'Reserva' );

    finish( s, 'curso-agencia.databasic.json' );
    }

/* ---------- Guion ERE, ejercicio 2: empresa ---------- */

function empresa() {
    const s = start( 'Empresa · ejercicio 2 (guion ERE)' );

    entity( s, 'Departamento', at( 0, 0 ) );
    key( s, 'Departamento', 'numero', 'NUMBER(3)' );
    attribute( s, 'Departamento', 'nombre', 'VARCHAR(60)', {required: true} );
    attribute( s, 'Departamento', 'lugar', 'VARCHAR(60)', {multivalued: true, translation: {kind: 'multivalued-table', tableName: 'Lugares_departamento'}} );
    attribute( s, 'Departamento', 'num_empleados', 'NUMBER(5)', {derived: true, derivation: 'Número de empleados que trabajan para el departamento', translation: {kind: 'omit'}} );
    alternateKey( s, 'Departamento', 'AK_Departamento_nombre', ['nombre'] );

    entity( s, 'Proyecto', at( 2, 0 ) );
    key( s, 'Proyecto', 'numero', 'NUMBER(4)' );
    attribute( s, 'Proyecto', 'nombre', 'VARCHAR(60)', {required: true} );
    attribute( s, 'Proyecto', 'lugar', 'VARCHAR(60)', {required: true} );
    alternateKey( s, 'Proyecto', 'AK_Proyecto_nombre', ['nombre'] );

    entity( s, 'Empleado', at( 1, 1 ) );
    key( s, 'Empleado', 'dni', 'CHAR(9)' );
    attribute( s, 'Empleado', 'nombre', 'VARCHAR(80)', {required: true} );
    attribute( s, 'Empleado', 'direccion', 'VARCHAR(120)' );
    attribute( s, 'Empleado', 'salario', 'NUMBER(8,2)', {domain: DOMAIN( {minimum: 0} )} );
    attribute( s, 'Empleado', 'sexo', 'CHAR(1)', {domain: DOMAIN( {values: ['H', 'M']} )} );
    attribute( s, 'Empleado', 'fecha_nacimiento', 'DATE' );

    entity( s, 'Familiar', at( 1, 2 ), {weak: true, ownerEntityId: s.ids.Empleado} );
    partialKey( s, 'Familiar', 'nombre', 'VARCHAR(80)' );
    attribute( s, 'Familiar', 'sexo', 'CHAR(1)', {domain: DOMAIN( {values: ['H', 'M']} )} );
    attribute( s, 'Familiar', 'fecha_nacimiento', 'DATE' );
    attribute( s, 'Familiar', 'parentesco', 'VARCHAR(20)', {required: true} );

    relation( s, 'Dirige', [['Empleado', 'gerente', 0, 1], ['Departamento', 'dirigido', 1, 1]] );
    attribute( s, 'Dirige', 'fecha_inicio', 'DATE', {ownerKind: 'relationship', required: true} );
    foreignKey( s, 'Dirige', 'Departamento' );
    relation( s, 'Trabaja_para', [['Departamento', 'departamento', 1, null], ['Empleado', 'empleado', 1, 1]] );
    foreignKey( s, 'Trabaja_para', 'Empleado' );
    relation( s, 'Controla', [['Departamento', 'departamento', 0, null], ['Proyecto', 'proyecto', 1, 1]] );
    foreignKey( s, 'Controla', 'Proyecto' );
    relation( s, 'Supervision', [['Empleado', 'supervisor', 0, null], ['Empleado', 'supervisado', 0, 1]] );
    const supervision = s.model.conceptual.relationships.find( item => item.id === s.ids.Supervision );

    s.model = domain.updateConceptualRelationship( s.model, supervision.id, {
        translation: {kind: 'foreign-key', childParticipationId: supervision.participations[1].id, identifying: false}
        } );
    relation( s, 'Trabaja_en', [['Empleado', 'empleado', 1, null], ['Proyecto', 'proyecto', 1, null]] );
    attribute( s, 'Trabaja_en', 'horas_semana', 'NUMBER(4,1)', {ownerKind: 'relationship', required: true, domain: DOMAIN( {minimum: 0, maximum: 60} )} );
    association( s, 'Trabaja_en', 'Trabaja_en' );
    relation( s, 'Familiares_de', [['Empleado', 'empleado', 0, null], ['Familiar', 'familiar', 1, 1]] );
    foreignKey( s, 'Familiares_de', 'Familiar', true );
    weak( s, 'Familiar', 'Familiares_de' );

    placeTable( s, 'Lugares_departamento', at( 0, 1 ) );
    placeTable( s, 'Trabaja_en', at( 2, 1 ) );

    assume( s, 'enunciado', 'Departamento y proyecto tienen nombre y número únicos: el número es la clave primaria y el nombre una clave alternativa.', 'Departamento' );
    assume( s, 'enunciado', 'Un departamento puede estar en varios lugares: atributo multivaluado; un proyecto, en uno solo.', 'Departamento' );
    assume( s, 'enunciado', 'Participaciones del apartado b: Dirige total para el departamento, Trabaja_para total en ambos lados, Controla total para el proyecto, Supervision parcial en ambos, Trabaja_en total en ambos y Familiares_de total para el familiar.', 'Trabaja_en' );
    assume( s, 'enunciado', 'Apartado c: la fecha en que el jefe empieza a dirigir es un atributo de Dirige y viaja a la tabla Departamento.', 'Dirige' );
    assume( s, 'enunciado', 'Dirige es 1:1: la clave ajena del gerente en Departamento es además clave alternativa, así que un empleado dirige como mucho un departamento.', 'Dirige' );
    assume( s, 'supuesto', 'El número total de empleados del departamento es un atributo derivado: se calcula contando Trabaja_para y no se almacena.', 'Departamento' );
    assume( s, 'supuesto', 'El familiar se identifica por su nombre dentro de cada empleado: entidad débil con clave parcial.', 'Familiar' );
    assume( s, 'perdida', 'La participación total del departamento en Trabaja_para y de ambos lados en Trabaja_en no se impone con claves ajenas.', 'Trabaja_en' );
    assume( s, 'perdida', 'Que el gerente trabaje en el departamento que dirige, y que nadie se supervise a sí mismo, quedan fuera de las claves.', 'Dirige' );

    finish( s, 'curso-empresa.databasic.json' );
    }

/* ---------- Guion ERE, ejercicio 4: restaurante ---------- */

function restaurante() {
    const s = start( 'Restaurante · ejercicio 4 (guion ERE)' );

    entity( s, 'Empleado', at( 0, 0 ) );
    key( s, 'Empleado', 'dni', 'CHAR(9)' );
    attribute( s, 'Empleado', 'num_ss', 'CHAR(12)', {required: true} );
    attribute( s, 'Empleado', 'nombre', 'VARCHAR(40)', {required: true} );
    attribute( s, 'Empleado', 'apellidos', 'VARCHAR(80)', {required: true} );
    attribute( s, 'Empleado', 'telefono', 'VARCHAR(15)', {multivalued: true, translation: {kind: 'multivalued-table', tableName: 'Telefonos_empleado'}} );
    alternateKey( s, 'Empleado', 'AK_Empleado_num_ss', ['num_ss'] );

    entity( s, 'Cocinero', at( 0, 1 ) );
    withoutKey( s, 'Cocinero' );
    attribute( s, 'Cocinero', 'fecha_alta', 'DATE', {required: true} );
    entity( s, 'Pinche', at( 0, 2 ) );
    withoutKey( s, 'Pinche' );
    attribute( s, 'Pinche', 'fecha_nacimiento', 'DATE', {required: true} );
    generalization( s, 'Empleado', ['Cocinero', 'Pinche'], {disjoint: true, total: false} );

    entity( s, 'Plato', at( 1, 1 ) );
    key( s, 'Plato', 'nombre', 'VARCHAR(60)' );
    attribute( s, 'Plato', 'precio', 'NUMBER(6,2)', {required: true, domain: DOMAIN( {minimum: 0} )} );
    attribute( s, 'Plato', 'tipo', 'VARCHAR(10)', {required: true, domain: DOMAIN( {values: ['entrante', 'primero', 'segundo', 'postre']} )} );

    entity( s, 'Ingrediente', at( 2, 1 ) );
    key( s, 'Ingrediente', 'nombre', 'VARCHAR(40)' );
    attribute( s, 'Ingrediente', 'precio_kg', 'NUMBER(6,2)', {required: true, domain: DOMAIN( {minimum: 0} )} );

    entity( s, 'Almacen', at( 3, 0 ) );
    key( s, 'Almacen', 'numero', 'NUMBER(3)' );
    attribute( s, 'Almacen', 'nombre', 'VARCHAR(40)', {required: true} );
    attribute( s, 'Almacen', 'descripcion', 'VARCHAR(200)' );

    entity( s, 'Estante', at( 3, 1 ), {weak: true, ownerEntityId: s.ids.Almacen} );
    partialKey( s, 'Estante', 'letra', 'CHAR(1)', {domain: DOMAIN( {values: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split( '' )} )} );
    attribute( s, 'Estante', 'tamano_cm', 'NUMBER(4)', {required: true, domain: DOMAIN( {minimum: 1} )} );

    entity( s, 'Consumo', at( 1, 2 ), {weak: true, ownerEntityId: s.ids.Plato} );
    partialKey( s, 'Consumo', 'fecha', 'DATE' );
    attribute( s, 'Consumo', 'turno', 'VARCHAR(6)', {partialKey: true, domain: DOMAIN( {values: ['comida', 'cena']} )} );
    attribute( s, 'Consumo', 'raciones', 'NUMBER(4)', {required: true, domain: DOMAIN( {minimum: 0} )} );

    relation( s, 'Contiene', [['Almacen', 'almacen', 1, null], ['Estante', 'estante', 1, 1]] );
    foreignKey( s, 'Contiene', 'Estante', true );
    weak( s, 'Estante', 'Contiene' );
    relation( s, 'Ubicado', [['Estante', 'estante', 0, null], ['Ingrediente', 'ingrediente', 1, 1]] );
    attribute( s, 'Ubicado', 'cantidad', 'NUMBER(7,2)', {ownerKind: 'relationship', required: true, domain: DOMAIN( {minimum: 0} )} );
    foreignKey( s, 'Ubicado', 'Ingrediente' );
    relation( s, 'Compone', [['Plato', 'plato', 1, null], ['Ingrediente', 'ingrediente', 0, null]] );
    attribute( s, 'Compone', 'cantidad', 'NUMBER(6,3)', {ownerKind: 'relationship', required: true, domain: DOMAIN( {minimum: 0} )} );
    association( s, 'Compone', 'Compone' );
    relation( s, 'Prepara', [['Cocinero', 'cocinero', 0, null], ['Plato', 'plato', 1, null]] );
    association( s, 'Prepara', 'Prepara' );
    relation( s, 'Asignado', [['Cocinero', 'cocinero', 0, 1], ['Pinche', 'pinche', 1, 1]] );
    foreignKey( s, 'Asignado', 'Pinche' );
    relation( s, 'Registra', [['Plato', 'plato', 0, null], ['Consumo', 'consumo', 1, 1]] );
    foreignKey( s, 'Registra', 'Consumo', true );
    weak( s, 'Consumo', 'Registra' );

    placeTable( s, 'Telefonos_empleado', at( 1, 0 ) );
    placeTable( s, 'Compone', at( 2, 2 ) );
    placeTable( s, 'Prepara', at( 0, 3 ) );

    assume( s, 'enunciado', 'El número de la Seguridad Social es único: clave alternativa. Los teléfonos son un atributo multivaluado.', 'Empleado' );
    assume( s, 'enunciado', 'Los estantes se nombran con letras de la A a la Z dentro de cada almacén: entidad débil de Almacen.', 'Estante' );
    assume( s, 'enunciado', 'Un ingrediente está en un solo estante y un estante guarda varios; la cantidad guardada es un atributo de la relación.', 'Ubicado' );
    assume( s, 'enunciado', 'Un cocinero tiene como máximo un pinche y todo pinche tiene su cocinero: 1:1 con la clave ajena en Pinche, única.', 'Asignado' );
    assume( s, 'supuesto', 'Los empleados comunes no tienen atributos propios: son los que no están en ninguna subclase. Especialización parcial y disjunta.', 'Empleado' );
    assume( s, 'supuesto', 'El tipo de plato es un dominio y no una especialización, porque los tipos no tienen atributos propios.', 'Plato' );
    assume( s, 'supuesto', 'Prepara es N:N porque el enunciado pide «qué cocineros preparan cada plato»: varios cocineros pueden compartir especialidad y un cocinero prepara varios platos.', 'Prepara' );
    assume( s, 'enunciado', 'Prepara registra la especialidad: «solamente pueden preparar ellos» se cumple porque solo los cocineros relacionados con un plato en Prepara lo preparan.', 'Prepara' );
    assume( s, 'supuesto', 'El consumo diario es una entidad débil del plato identificada por fecha y turno (comida o cena), con el número de raciones.', 'Consumo' );
    assume( s, 'perdida', 'Que todo plato tenga al menos un cocinero que lo prepare no se impone con claves: nada obliga a que el plato aparezca en Prepara.', 'Prepara' );
    assume( s, 'supuesto', 'La letra del estante se limita a la lista A–Z como dominio.', 'Estante' );

    finish( s, 'curso-restaurante.databasic.json' );
    }

/* ---------- Guion ERE, ejercicio 5: inmobiliaria ---------- */

function inmobiliaria() {
    const s = start( 'Inmobiliaria · ejercicio 5 (guion ERE)' );

    entity( s, 'Persona', at( 0, 0 ) );
    key( s, 'Persona', 'codigo', 'NUMBER(6)' );
    attribute( s, 'Persona', 'dni', 'CHAR(9)', {required: true} );
    attribute( s, 'Persona', 'nombre', 'VARCHAR(40)', {required: true} );
    attribute( s, 'Persona', 'apellidos', 'VARCHAR(80)', {required: true} );
    attribute( s, 'Persona', 'direccion', 'VARCHAR(120)' );
    attribute( s, 'Persona', 'telefono', 'VARCHAR(15)', {multivalued: true, translation: {kind: 'multivalued-table', tableName: 'Telefonos_persona'}} );
    alternateKey( s, 'Persona', 'AK_Persona_dni', ['dni'] );

    entity( s, 'Cliente', at( 0, 1 ) );
    withoutKey( s, 'Cliente' );
    entity( s, 'Trabajador', at( 0, 2 ) );
    withoutKey( s, 'Trabajador' );
    attribute( s, 'Trabajador', 'fecha_ingreso', 'DATE', {required: true} );
    generalization( s, 'Persona', ['Cliente', 'Trabajador'], {disjoint: false, total: true} );

    entity( s, 'Inmueble', at( 2, 0 ) );
    key( s, 'Inmueble', 'codigo', 'NUMBER(6)' );
    attribute( s, 'Inmueble', 'superficie_m2', 'NUMBER(7,2)', {required: true, domain: DOMAIN( {minimum: 0} )} );
    attribute( s, 'Inmueble', 'descripcion', 'VARCHAR(200)' );
    attribute( s, 'Inmueble', 'direccion', 'VARCHAR(120)', {required: true} );

    entity( s, 'Piso', at( 3, 0 ) );
    withoutKey( s, 'Piso' );
    attribute( s, 'Piso', 'codigo_piso', 'VARCHAR(10)', {required: true} );
    entity( s, 'Local', at( 3, 1 ) );
    withoutKey( s, 'Local' );
    attribute( s, 'Local', 'uso', 'VARCHAR(40)' );
    attribute( s, 'Local', 'servicio', 'CHAR(1)', {required: true, defaultValue: "'N'", domain: DOMAIN( {values: ['S', 'N']} )} );
    entity( s, 'Garaje', at( 4, 0 ) );
    withoutKey( s, 'Garaje' );
    attribute( s, 'Garaje', 'numero', 'NUMBER(4)', {required: true} );
    attribute( s, 'Garaje', 'planta', 'NUMBER(2)' );
    generalization( s, 'Inmueble', ['Piso', 'Local', 'Garaje'], {disjoint: true, total: false} );
    alternateKey( s, 'Piso', 'AK_Piso_codigo', ['codigo_piso'] );

    entity( s, 'Compra', at( 1, 1 ) );
    key( s, 'Compra', 'codigo', 'NUMBER(8)' );
    attribute( s, 'Compra', 'fecha', 'DATE', {required: true} );
    attribute( s, 'Compra', 'valor', 'NUMBER(12,2)', {required: true, domain: DOMAIN( {minimum: 0} )} );

    entity( s, 'Alquiler', at( 2, 2 ), {weak: true, ownerEntityId: s.ids.Inmueble} );
    partialKey( s, 'Alquiler', 'numero', 'NUMBER(5)' );

    entity( s, 'Pago', at( 2, 3 ), {weak: true, ownerEntityId: s.ids.Alquiler} );
    partialKey( s, 'Pago', 'anio', 'NUMBER(4)' );
    attribute( s, 'Pago', 'mes', 'NUMBER(2)', {partialKey: true, domain: DOMAIN( {minimum: 1, maximum: 12} )} );
    attribute( s, 'Pago', 'valor', 'NUMBER(8,2)', {required: true, domain: DOMAIN( {minimum: 0} )} );

    relation( s, 'Asociado', [['Piso', 'piso', 0, null], ['Garaje', 'garaje', 0, 1]] );
    foreignKey( s, 'Asociado', 'Garaje' );
    relation( s, 'Se_compra', [['Inmueble', 'inmueble', 0, null], ['Compra', 'compra', 1, 1]] );
    foreignKey( s, 'Se_compra', 'Compra' );
    relation( s, 'Titular', [['Compra', 'compra', 1, null], ['Cliente', 'titular', 0, null]] );
    association( s, 'Titular', 'Titulares' );
    relation( s, 'Se_alquila', [['Inmueble', 'inmueble', 0, null], ['Alquiler', 'alquiler', 1, 1]] );
    foreignKey( s, 'Se_alquila', 'Alquiler', true );
    weak( s, 'Alquiler', 'Se_alquila' );
    relation( s, 'Inquilino', [['Cliente', 'inquilino', 0, null], ['Alquiler', 'alquiler', 1, 1]] );
    foreignKey( s, 'Inquilino', 'Alquiler' );
    relation( s, 'Gestiona', [['Trabajador', 'agente', 0, null], ['Alquiler', 'alquiler', 1, 1]] );
    foreignKey( s, 'Gestiona', 'Alquiler' );
    relation( s, 'Paga', [['Alquiler', 'alquiler', 0, null], ['Pago', 'pago', 1, 1]] );
    foreignKey( s, 'Paga', 'Pago', true );
    weak( s, 'Pago', 'Paga' );

    placeTable( s, 'Telefonos_persona', at( 1, 0 ) );
    placeTable( s, 'Titulares', at( 1, 2 ) );

    assume( s, 'enunciado', 'Clientes y trabajadores comparten datos y un código personal, y un trabajador puede ser también cliente: especialización solapada de Persona.', 'Persona' );
    assume( s, 'enunciado', 'Puede haber inmuebles que no sean ni pisos, ni locales, ni garajes: especialización parcial y disjunta de Inmueble.', 'Inmueble' );
    assume( s, 'enunciado', 'El número de alquiler se repite entre inmuebles pero no en el mismo: Alquiler es entidad débil de Inmueble.', 'Alquiler' );
    assume( s, 'enunciado', 'Cada pago de un alquiler se identifica por su año y mes: Pago es entidad débil de Alquiler.', 'Pago' );
    assume( s, 'enunciado', 'Una compra puede tener varios titulares: N:N entre Compra y Cliente.', 'Titular' );
    assume( s, 'supuesto', 'Todo registro de Persona es cliente, trabajador o ambos: especialización total.', 'Persona' );
    assume( s, 'supuesto', 'El DNI es único: clave alternativa. El código de piso, también.', 'Persona' );
    assume( s, 'supuesto', 'El agente que gestiona el alquiler es un trabajador; su nombre se obtiene de Persona.', 'Gestiona' );
    assume( s, 'supuesto', 'Un garaje se asocia como mucho a un piso, y un piso puede tener varios garajes asociados: «el garaje» se lee como cada garaje asociado al piso. Si cada piso tuviera un solo garaje, Piso pasaría a (0,1) y la clave ajena del garaje sería única.', 'Asociado' );
    assume( s, 'perdida', 'Que al alquilar un piso se incluya su garaje es un comportamiento de la aplicación, no una restricción del modelo.', 'Asociado' );
    assume( s, 'perdida', 'Que el número de garaje no se repita dentro de un mismo edificio no se puede expresar: no hay entidad Edificio.', 'Garaje' );

    finish( s, 'curso-inmobiliaria.databasic.json' );
    }

/* ---------- Guion ERE, ejercicio 6: consumo de fármacos en un hospital ---------- */

function farmacos() {
    const s = start( 'Hospital: consumo de fármacos · ejercicio 6 (guion ERE)' );

    entity( s, 'Paciente', at( 0, 0 ) );
    key( s, 'Paciente', 'num_historia', 'NUMBER(8)' );
    attribute( s, 'Paciente', 'nombre', 'VARCHAR(80)', {required: true} );
    attribute( s, 'Paciente', 'num_ss', 'CHAR(12)' );
    attribute( s, 'Paciente', 'direccion', 'VARCHAR(120)' );
    attribute( s, 'Paciente', 'telefono', 'VARCHAR(15)' );
    attribute( s, 'Paciente', 'fecha_nacimiento', 'DATE', {required: true} );

    entity( s, 'Ingreso', at( 1, 0 ), {weak: true, ownerEntityId: s.ids.Paciente} );
    partialKey( s, 'Ingreso', 'num_secuencia', 'NUMBER(3)' );
    attribute( s, 'Ingreso', 'diagnostico', 'VARCHAR(8)', {required: true} );
    attribute( s, 'Ingreso', 'fecha_ingreso', 'DATE', {required: true} );
    attribute( s, 'Ingreso', 'fecha_alta', 'DATE', {domain: DOMAIN( {check: 'fecha_alta >= fecha_ingreso'} )} );

    entity( s, 'Servicio', at( 1, 1 ) );
    key( s, 'Servicio', 'codigo', 'NUMBER(3)' );
    attribute( s, 'Servicio', 'nombre', 'VARCHAR(40)', {required: true} );
    attribute( s, 'Servicio', 'gasto_pacientes', 'NUMBER(12,2)', {derived: true, derivation: 'Suma de num_dosis × precio_dosis de los consumos de los ingresos del servicio', translation: {kind: 'omit'}} );
    attribute( s, 'Servicio', 'gasto_total', 'NUMBER(12,2)', {derived: true, derivation: 'gasto_pacientes más la suma de num_dosis × precio_dosis de los consumos propios del servicio', translation: {kind: 'omit'}} );
    alternateKey( s, 'Servicio', 'AK_Servicio_nombre', ['nombre'] );

    entity( s, 'Farmaco', at( 2, 0 ) );
    key( s, 'Farmaco', 'num_registro', 'NUMBER(8)' );
    attribute( s, 'Farmaco', 'nombre', 'VARCHAR(80)', {required: true} );
    attribute( s, 'Farmaco', 'compuesto', 'VARCHAR(80)' );
    attribute( s, 'Farmaco', 'ubicacion', 'VARCHAR(40)' );
    attribute( s, 'Farmaco', 'dosis_envase', 'NUMBER(4)', {required: true, domain: DOMAIN( {minimum: 1} )} );
    attribute( s, 'Farmaco', 'precio_dosis', 'NUMBER(8,2)', {required: true, domain: DOMAIN( {minimum: 0} )} );
    attribute( s, 'Farmaco', 'precio_envase', 'NUMBER(10,2)', {derived: true, derivation: 'dosis_envase × precio_dosis', translation: {kind: 'omit'}} );

    relation( s, 'Ingresa', [['Paciente', 'paciente', 0, null], ['Ingreso', 'ingreso', 1, 1]] );
    foreignKey( s, 'Ingresa', 'Ingreso', true );
    weak( s, 'Ingreso', 'Ingresa' );
    relation( s, 'En_servicio', [['Servicio', 'servicio', 0, null], ['Ingreso', 'ingreso', 1, 1]] );
    foreignKey( s, 'En_servicio', 'Ingreso' );

    relation( s, 'Consume', [['Ingreso', 'ingreso', 0, null], ['Farmaco', 'farmaco', 0, null]] );
    const fechaPaciente = attribute( s, 'Consume', 'fecha', 'DATE', {ownerKind: 'relationship', required: true} );
    attribute( s, 'Consume', 'num_dosis', 'NUMBER(4)', {ownerKind: 'relationship', required: true, domain: DOMAIN( {minimum: 1} )} );
    association( s, 'Consume', 'Consumo_paciente', [fechaPaciente] );

    relation( s, 'Gasta', [['Servicio', 'servicio', 0, null], ['Farmaco', 'farmaco', 0, null]] );
    const fechaServicio = attribute( s, 'Gasta', 'fecha', 'DATE', {ownerKind: 'relationship', required: true} );
    attribute( s, 'Gasta', 'num_dosis', 'NUMBER(4)', {ownerKind: 'relationship', required: true, domain: DOMAIN( {minimum: 1} )} );
    association( s, 'Gasta', 'Consumo_servicio', [fechaServicio] );

    placeTable( s, 'Consumo_paciente', at( 2, 1 ) );
    placeTable( s, 'Consumo_servicio', at( 2, 2 ) );
    uniqueIndex( s, 'Paciente', 'UX_Paciente_num_ss', ['num_ss'] );

    assume( s, 'enunciado', 'El paciente se identifica por su número de historia clínica; cada ingreso, por un número de secuencia dentro de ella.', 'Ingreso' );
    assume( s, 'enunciado', 'Hay consumos por paciente (de un ingreso) y consumos generales de cada servicio con su fecha.', 'Gasta' );
    assume( s, 'enunciado', 'El precio total por envase se obtiene de las dosis por envase y el precio por dosis: atributo derivado que no se almacena.', 'Farmaco' );
    assume( s, 'supuesto', 'El servicio se identifica por un código; su nombre es único.', 'Servicio' );
    assume( s, 'supuesto', 'El consumo de un paciente también lleva fecha, que forma parte de la clave: el mismo fármaco puede darse en días distintos del ingreso.', 'Consume' );
    assume( s, 'supuesto', 'El número de la Seguridad Social es opcional («si lo tuviera»): no es clave alternativa, que exigiría valor, sino un índice sin duplicados que admite pacientes sin número.', 'Paciente' );
    assume( s, 'enunciado', 'Apartado f: el gasto de los pacientes de cada servicio y el total del servicio se calculan a partir de los consumos: atributos derivados de Servicio que no se almacenan.', 'Servicio' );
    assume( s, 'supuesto', 'El diagnóstico se registra codificado (por ejemplo, con la clasificación CIE-10) para poder agrupar los informes por diagnóstico.', 'Ingreso' );
    assume( s, 'perdida', 'Los informes de gasto por paciente, servicio o diagnóstico y los atributos derivados de Servicio son consultas sobre estas tablas: no se guardan ni se comprueban.', 'Servicio' );

    finish( s, 'curso-farmacos.databasic.json' );
    }

/* ---------- Tema 2, ejercicio 1: escuela de idiomas ---------- */

function idiomas() {
    const s = start( 'Escuela de idiomas · ejercicio 1 (Tema 2)' );

    entity( s, 'Alumno', at( 0, 1 ) );
    key( s, 'Alumno', 'dni', 'CHAR(9)' );
    attribute( s, 'Alumno', 'nombre', 'VARCHAR(80)', {required: true} );
    attribute( s, 'Alumno', 'telefono', 'VARCHAR(15)' );

    entity( s, 'Idioma', at( 1, 0 ) );
    key( s, 'Idioma', 'codigo', 'CHAR(3)' );
    attribute( s, 'Idioma', 'nombre', 'VARCHAR(30)', {required: true} );
    alternateKey( s, 'Idioma', 'AK_Idioma_nombre', ['nombre'] );

    entity( s, 'Nivel', at( 3, 0 ) );
    key( s, 'Nivel', 'codigo', 'CHAR(2)' );
    attribute( s, 'Nivel', 'descripcion', 'VARCHAR(60)' );

    entity( s, 'Curso', at( 2, 1 ) );
    key( s, 'Curso', 'codigo', 'NUMBER(5)' );

    relation( s, 'De_idioma', [['Idioma', 'idioma', 0, null], ['Curso', 'curso', 1, 1]] );
    foreignKey( s, 'De_idioma', 'Curso' );
    relation( s, 'De_nivel', [['Nivel', 'nivel', 0, null], ['Curso', 'curso', 1, 1]] );
    foreignKey( s, 'De_nivel', 'Curso' );
    tableAlternateKey( s, 'Curso', 'AK_Curso_idioma_nivel', ['idioma_codigo', 'nivel_codigo'] );

    relation( s, 'Matricula', [['Alumno', 'alumno', 1, null], ['Curso', 'curso', 0, null]] );
    attribute( s, 'Matricula', 'calificacion', 'NUMBER(4,2)', {ownerKind: 'relationship', domain: DOMAIN( {minimum: 0, maximum: 10} )} );
    association( s, 'Matricula', 'Matricula' );

    placeTable( s, 'Matricula', at( 1, 2 ) );

    assume( s, 'enunciado', 'Un mismo nivel puede existir para idiomas distintos y la escuela no oferta todos los niveles de todos los idiomas.', 'Curso' );
    assume( s, 'supuesto', 'Cada combinación ofertada de idioma y nivel es un Curso con código propio; la pareja idioma–nivel es clave alternativa para no repetirla.', 'Curso' );
    assume( s, 'supuesto', 'El alumno se matricula en cursos, no en idiomas y niveles sueltos; la calificación es un atributo de la matrícula.', 'Matricula' );
    assume( s, 'supuesto', 'Un alumno se matricula al menos de un curso.', 'Alumno' );
    assume( s, 'perdida', 'Si un alumno repite curso en años distintos haría falta el año en la clave de la matrícula; el enunciado no lo pide.', 'Matricula' );

    finish( s, 'curso-idiomas.databasic.json' );
    }

/* ---------- Tema 2, ejercicio 2: funcionarios y contratados ---------- */

function personal() {
    const s = start( 'Funcionarios y contratados · ejercicio 2 (Tema 2)' );

    entity( s, 'Empleado', at( 1, 0 ) );
    key( s, 'Empleado', 'nrp', 'VARCHAR(16)' );
    attribute( s, 'Empleado', 'nombre', 'VARCHAR(80)', {required: true} );
    attribute( s, 'Empleado', 'direccion', 'VARCHAR(120)' );
    attribute( s, 'Empleado', 'telefono', 'VARCHAR(15)' );

    entity( s, 'Funcionario', at( 0, 1 ) );
    withoutKey( s, 'Funcionario' );
    attribute( s, 'Funcionario', 'nivel', 'VARCHAR(10)', {required: true} );
    attribute( s, 'Funcionario', 'fecha_ingreso', 'DATE', {required: true} );
    entity( s, 'Laboral', at( 1, 1 ) );
    withoutKey( s, 'Laboral' );
    attribute( s, 'Laboral', 'grupo', 'VARCHAR(10)', {required: true} );
    attribute( s, 'Laboral', 'especialidad', 'VARCHAR(40)' );
    generalization( s, 'Empleado', ['Funcionario', 'Laboral'], {disjoint: true, total: true} );

    entity( s, 'Docente', at( 2, 1 ) );
    withoutKey( s, 'Docente' );
    attribute( s, 'Docente', 'creditos', 'NUMBER(4,1)', {required: true, domain: DOMAIN( {minimum: 0} )} );
    entity( s, 'Servicios', at( 3, 1 ) );
    withoutKey( s, 'Servicios' );
    attribute( s, 'Servicios', 'servicio', 'VARCHAR(40)', {required: true} );
    generalization( s, 'Empleado', ['Docente', 'Servicios'], {disjoint: true, total: true} );

    assume( s, 'enunciado', 'Hay dos clasificaciones independientes del mismo empleado: por su vínculo (funcionario o laboral) y por su función (docencia o servicios).', 'Empleado' );
    assume( s, 'supuesto', 'Cada clasificación es total y disjunta: todo empleado tiene exactamente un vínculo y exactamente una función.', 'Empleado' );
    assume( s, 'supuesto', 'El NRP es un código de registro con letras y cifras, no una cantidad: se guarda como texto (VARCHAR).', 'Empleado' );
    assume( s, 'perdida', 'Que cada empleado aparezca en una y solo una subtabla de cada clasificación no lo imponen las claves ajenas; queda documentado.', 'Empleado' );

    finish( s, 'curso-personal.databasic.json' );
    }

/* ---------- Tema 2, ejercicio 4: taller de muebles ---------- */

function muebles() {
    const s = start( 'Taller de muebles · ejercicio 4 (Tema 2)' );

    entity( s, 'Mueble', at( 1, 0 ) );
    key( s, 'Mueble', 'nombre', 'VARCHAR(60)' );
    attribute( s, 'Mueble', 'precio', 'NUMBER(8,2)', {required: true, domain: DOMAIN( {minimum: 0} )} );

    entity( s, 'Pieza', at( 0, 1 ) );
    key( s, 'Pieza', 'codigo', 'NUMBER(6)' );
    attribute( s, 'Pieza', 'descripcion', 'VARCHAR(120)' );

    // Only single-piece furniture is kept on shelves: a subset of Mueble that must be on one shelf or more.
    entity( s, 'Mueble_una_pieza', at( 1, 1 ) );
    withoutKey( s, 'Mueble_una_pieza' );
    generalization( s, 'Mueble', ['Mueble_una_pieza'], {disjoint: true, total: false} );

    entity( s, 'Estanteria', at( 2, 1 ) );
    key( s, 'Estanteria', 'pasillo', 'NUMBER(3)' );
    attribute( s, 'Estanteria', 'altura', 'NUMBER(2)', {primary: true} );

    relation( s, 'Compone', [['Mueble', 'mueble', 1, null], ['Pieza', 'pieza', 0, null]] );
    attribute( s, 'Compone', 'unidades', 'NUMBER(3)', {ownerKind: 'relationship', required: true, domain: DOMAIN( {minimum: 1} )} );
    association( s, 'Compone', 'Compone' );
    relation( s, 'Almacena', [['Mueble_una_pieza', 'mueble', 1, null], ['Estanteria', 'estanteria', 0, null]] );
    attribute( s, 'Almacena', 'unidades', 'NUMBER(4)', {ownerKind: 'relationship', required: true, domain: DOMAIN( {minimum: 1} )} );
    association( s, 'Almacena', 'Almacena' );

    placeTable( s, 'Compone', at( 0, 0 ) );
    placeTable( s, 'Almacena', at( 2, 0 ) );

    assume( s, 'enunciado', 'Una pieza forma parte de varios muebles y un mueble está formado por una o más piezas, con las unidades de cada una.', 'Compone' );
    assume( s, 'enunciado', 'La estantería se identifica por pasillo y altura: clave compuesta.', 'Estanteria' );
    assume( s, 'enunciado', 'Los muebles de una sola pieza se encuentran en una o más estanterías: subclase Mueble_una_pieza (especialización parcial de Mueble) con participación (1,N) en Almacena.', 'Mueble_una_pieza' );
    assume( s, 'supuesto', 'Una pieza puede estar en el catálogo sin formar parte todavía de ningún mueble: participación (0,N) en Compone.', 'Pieza' );
    assume( s, 'supuesto', 'Una estantería puede estar vacía: participación (0,N) en Almacena.', 'Estanteria' );
    assume( s, 'supuesto', 'Las unidades valen al menos 1: si un mueble no tiene unidades en una estantería, no hay fila en Almacena.', 'Almacena' );
    assume( s, 'perdida', 'Que Mueble_una_pieza contenga exactamente los muebles con una sola pieza depende de contar sus filas en Compone: no se impone con claves.', 'Mueble_una_pieza' );

    finish( s, 'curso-muebles.databasic.json' );
    }

/* ---------- Tema 2, ejercicio 5 (Tema 1, ejercicio 5 en tus apuntes): salas de un hospital ---------- */

function salas() {
    const s = start( 'Salas de un hospital · ejercicio 5 (Tema 2)' );

    entity( s, 'Personal', at( 0, 0 ) );
    key( s, 'Personal', 'num_empleado', 'NUMBER(6)' );
    attribute( s, 'Personal', 'nombre', 'VARCHAR(80)', {required: true} );
    attribute( s, 'Personal', 'direccion', 'VARCHAR(120)' );
    attribute( s, 'Personal', 'telefono', 'VARCHAR(15)' );

    entity( s, 'Sala', at( 1, 0 ) );
    key( s, 'Sala', 'nombre', 'VARCHAR(40)' );
    attribute( s, 'Sala', 'num_camas', 'NUMBER(3)', {required: true, domain: DOMAIN( {minimum: 0} )} );

    entity( s, 'Paciente', at( 2, 0 ) );
    key( s, 'Paciente', 'num_registro', 'NUMBER(8)' );
    attribute( s, 'Paciente', 'nombre', 'VARCHAR(80)', {required: true} );

    relation( s, 'Trabaja_en', [['Sala', 'sala', 0, null], ['Personal', 'empleado', 1, 1]] );
    foreignKey( s, 'Trabaja_en', 'Personal' );
    relation( s, 'Internado_en', [['Sala', 'sala', 0, null], ['Paciente', 'paciente', 1, 1]] );
    foreignKey( s, 'Internado_en', 'Paciente' );

    assume( s, 'enunciado', 'Un empleado trabaja en una única sala y un paciente está en una única sala; en una sala hay varios de cada.', 'Sala' );
    assume( s, 'supuesto', 'Una sala puede no tener todavía personal ni pacientes: participación (0,N).', 'Sala' );
    assume( s, 'perdida', 'Que los pacientes internados no superen las camas de la sala no se puede expresar con claves.', 'Internado_en' );

    finish( s, 'curso-salas.databasic.json' );
    }

/* ---------- Tema 2, ejercicio 6: empresa de transporte ---------- */

function transporte() {
    const s = start( 'Empresa de transporte · ejercicio 6 (Tema 2)' );

    entity( s, 'Vehiculo', at( 2, 0 ) );
    key( s, 'Vehiculo', 'matricula', 'VARCHAR(10)' );
    attribute( s, 'Vehiculo', 'marca', 'VARCHAR(30)', {required: true} );
    attribute( s, 'Vehiculo', 'anio_compra', 'NUMBER(4)', {required: true} );

    entity( s, 'Camion', at( 2, 1 ) );
    withoutKey( s, 'Camion' );
    attribute( s, 'Camion', 'capacidad_kg', 'NUMBER(6)', {required: true, domain: DOMAIN( {minimum: 0} )} );
    entity( s, 'Furgoneta', at( 3, 1 ) );
    withoutKey( s, 'Furgoneta' );
    attribute( s, 'Furgoneta', 'volumen_m3', 'NUMBER(5,2)', {required: true, domain: DOMAIN( {minimum: 0} )} );
    entity( s, 'Coche', at( 4, 1 ) );
    withoutKey( s, 'Coche' );
    attribute( s, 'Coche', 'num_plazas', 'NUMBER(2)', {required: true, domain: DOMAIN( {minimum: 1} )} );
    generalization( s, 'Vehiculo', ['Camion', 'Furgoneta', 'Coche'], {disjoint: true, total: true} );

    entity( s, 'Empleado', at( 0, 0 ) );
    key( s, 'Empleado', 'dni', 'CHAR(9)' );
    attribute( s, 'Empleado', 'nombre', 'VARCHAR(40)', {required: true} );
    attribute( s, 'Empleado', 'apellidos', 'VARCHAR(80)', {required: true} );
    attribute( s, 'Empleado', 'salario', 'NUMBER(8,2)', {domain: DOMAIN( {minimum: 0} )} );

    entity( s, 'Conductor', at( 1, 1 ) );
    withoutKey( s, 'Conductor' );
    attribute( s, 'Conductor', 'tipo_carnet', 'VARCHAR(5)', {required: true} );
    attribute( s, 'Conductor', 'anios_experiencia', 'NUMBER(2)', {domain: DOMAIN( {minimum: 0} )} );
    entity( s, 'Administrativo', at( 0, 1 ) );
    withoutKey( s, 'Administrativo' );
    attribute( s, 'Administrativo', 'area', 'VARCHAR(40)' );
    generalization( s, 'Empleado', ['Conductor', 'Administrativo'], {disjoint: true, total: false} );

    entity( s, 'Departamento', at( 0, 2 ) );
    key( s, 'Departamento', 'codigo', 'NUMBER(3)' );
    attribute( s, 'Departamento', 'nombre', 'VARCHAR(40)', {required: true} );
    alternateKey( s, 'Departamento', 'AK_Departamento_nombre', ['nombre'] );

    relation( s, 'Pertenece', [['Departamento', 'departamento', 0, null], ['Empleado', 'empleado', 1, 1]] );
    foreignKey( s, 'Pertenece', 'Empleado' );
    relation( s, 'Asignado', [['Conductor', 'conductor', 0, null], ['Vehiculo', 'vehiculo', 0, null]] );
    const turno = attribute( s, 'Asignado', 'turno', 'VARCHAR(6)', {ownerKind: 'relationship', required: true, domain: DOMAIN( {values: ['mañana', 'tarde', 'noche']} )} );
    // A vehicle has one driver per shift: (vehiculo, turno) is the key and the driver a plain FK.
    association( s, 'Asignado', 'Asignacion', [turno], ['vehiculo'] );

    placeTable( s, 'Asignacion', at( 1, 2 ) );
    tableAlternateKey( s, 'Asignacion', 'AK_Asignacion_conductor_turno', ['conductor_Empleado_dni', 'turno'] );

    assume( s, 'enunciado', 'Todos los vehículos son camión, furgoneta o coche de empresa, cada uno con su dato propio: especialización total y disjunta.', 'Vehiculo' );
    assume( s, 'enunciado', 'Todo empleado pertenece obligatoriamente a un departamento, cuyo nombre no se repite.', 'Pertenece' );
    assume( s, 'supuesto', 'Los empleados "pueden ser" conductores o administrativos: especialización parcial y disjunta.', 'Empleado' );
    assume( s, 'enunciado', 'Un vehículo lo usan conductores distintos en turnos distintos: en cada turno tiene un solo conductor, así que la clave de la asignación es (vehículo, turno) y el conductor es una clave ajena obligatoria fuera de la clave.', 'Asignado' );
    assume( s, 'supuesto', 'Un conductor lleva un solo vehículo en cada turno: clave alternativa (conductor, turno).', 'Asignado' );
    assume( s, 'supuesto', 'Los turnos (mañana, tarde, noche) son un horario fijo que se repite cada día; si la asignación cambiara de un día a otro, la fecha entraría en la clave.', 'Asignado' );
    assume( s, 'perdida', 'Que todo vehículo sea exactamente de un tipo (especialización total y disjunta) no lo imponen las claves: un vehículo podría quedar sin subtabla o en dos.', 'Vehiculo' );

    finish( s, 'curso-transporte.databasic.json' );
    }

/* ---------- Tema 2, ejercicio 7: concesionario ---------- */

function concesionario() {
    const s = start( 'Concesionario · ejercicio 7 (Tema 2)' );

    entity( s, 'Cliente', at( 0, 0 ) );
    key( s, 'Cliente', 'dni', 'CHAR(9)' );
    attribute( s, 'Cliente', 'nombre', 'VARCHAR(40)', {required: true} );
    attribute( s, 'Cliente', 'apellidos', 'VARCHAR(80)', {required: true} );
    attribute( s, 'Cliente', 'direccion', 'VARCHAR(120)' );
    attribute( s, 'Cliente', 'telefono', 'VARCHAR(15)' );

    entity( s, 'Coche', at( 1, 0 ) );
    key( s, 'Coche', 'matricula', 'VARCHAR(10)' );
    attribute( s, 'Coche', 'marca', 'VARCHAR(30)', {required: true} );
    attribute( s, 'Coche', 'modelo', 'VARCHAR(40)', {required: true} );
    attribute( s, 'Coche', 'color', 'VARCHAR(20)' );

    entity( s, 'Nuevo', at( 1, 1 ) );
    withoutKey( s, 'Nuevo' );
    attribute( s, 'Nuevo', 'unidades', 'NUMBER(3)', {required: true, domain: DOMAIN( {minimum: 0} )} );
    entity( s, 'Usado', at( 2, 1 ) );
    withoutKey( s, 'Usado' );
    attribute( s, 'Usado', 'kilometros', 'NUMBER(7)', {required: true, domain: DOMAIN( {minimum: 0} )} );
    generalization( s, 'Coche', ['Nuevo', 'Usado'], {disjoint: true, total: false} );

    entity( s, 'Mecanico', at( 3, 0 ) );
    key( s, 'Mecanico', 'dni', 'CHAR(9)' );
    attribute( s, 'Mecanico', 'nombre', 'VARCHAR(40)', {required: true} );
    attribute( s, 'Mecanico', 'apellidos', 'VARCHAR(80)', {required: true} );
    attribute( s, 'Mecanico', 'fecha_contratacion', 'DATE', {required: true} );
    attribute( s, 'Mecanico', 'salario', 'NUMBER(8,2)', {domain: DOMAIN( {minimum: 0} )} );

    relation( s, 'Compra', [['Cliente', 'cliente', 1, null], ['Coche', 'coche', 0, 1]] );
    foreignKey( s, 'Compra', 'Coche' );
    relation( s, 'Repara', [['Mecanico', 'mecanico', 0, null], ['Coche', 'coche', 0, null]] );
    const fecha = attribute( s, 'Repara', 'fecha', 'DATE', {ownerKind: 'relationship', required: true} );
    attribute( s, 'Repara', 'horas', 'NUMBER(4,1)', {ownerKind: 'relationship', required: true, domain: DOMAIN( {minimum: 0} )} );
    association( s, 'Repara', 'Reparacion', [fecha] );

    placeTable( s, 'Reparacion', at( 2, 0 ) );

    assume( s, 'enunciado', 'Los coches que el concesionario vende son nuevos o usados, con sus datos propios: especialización disjunta.', 'Coche' );
    assume( s, 'supuesto', 'La especialización es parcial: los coches de clientes que llegan al taller sin haberse vendido aquí se registran solo como Coche.', 'Coche' );
    assume( s, 'enunciado', 'Un mecánico repara varios coches y un coche lo reparan varios mecánicos; se guarda la fecha y las horas.', 'Repara' );
    assume( s, 'supuesto', 'La fecha forma parte de la clave de la reparación: el mismo mecánico puede reparar el mismo coche en días distintos.', 'Repara' );
    assume( s, 'supuesto', 'Un coche aún no vendido, o que solo pasa por el taller, no tiene comprador: la clave ajena al cliente admite nulos.', 'Compra' );
    assume( s, 'supuesto', 'El cliente solo se registra cuando compra: participación (1,N) en Compra.', 'Cliente' );
    assume( s, 'supuesto', 'Las unidades de un coche nuevo se leen como las existencias de ese mismo modelo en el concesionario, como pide el apartado d; un diseño más fino separaría una entidad Modelo.', 'Nuevo' );
    assume( s, 'perdida', 'Que un coche no esté a la vez en Nuevo y en Usado (especialización disjunta) no lo imponen las claves.', 'Coche' );

    finish( s, 'curso-concesionario.databasic.json' );
    }

/* ---------- Tema 2, ejercicio 8: gestión universitaria ---------- */

function universidad() {
    const s = start( 'Gestión universitaria · ejercicio 8 (Tema 2)' );

    entity( s, 'Departamento', at( 0, 0 ) );
    key( s, 'Departamento', 'codigo', 'NUMBER(3)' );
    attribute( s, 'Departamento', 'nombre', 'VARCHAR(60)', {required: true} );

    entity( s, 'Profesor', at( 1, 0 ) );
    key( s, 'Profesor', 'nrp', 'VARCHAR(16)' );
    attribute( s, 'Profesor', 'nombre', 'VARCHAR(80)', {required: true} );
    attribute( s, 'Profesor', 'area', 'VARCHAR(60)' );
    attribute( s, 'Profesor', 'categoria', 'VARCHAR(30)' );

    entity( s, 'Asignatura', at( 3, 0 ) );
    key( s, 'Asignatura', 'codigo', 'NUMBER(6)' );
    attribute( s, 'Asignatura', 'nombre', 'VARCHAR(80)', {required: true} );
    attribute( s, 'Asignatura', 'creditos', 'NUMBER(4,1)', {required: true, domain: DOMAIN( {minimum: 0} )} );
    attribute( s, 'Asignatura', 'caracter', 'VARCHAR(12)', {required: true, domain: DOMAIN( {values: ['basica', 'obligatoria', 'optativa']} )} );
    attribute( s, 'Asignatura', 'curso', 'NUMBER(1)', {required: true, domain: DOMAIN( {minimum: 1, maximum: 6} )} );

    entity( s, 'Grupo', at( 2, 1 ), {weak: true, ownerEntityId: s.ids.Asignatura} );
    partialKey( s, 'Grupo', 'codigo', 'CHAR(3)' );
    attribute( s, 'Grupo', 'tipo', 'VARCHAR(9)', {required: true, domain: DOMAIN( {values: ['teoria', 'practicas']} )} );
    attribute( s, 'Grupo', 'max_alumnos', 'NUMBER(3)', {required: true, domain: DOMAIN( {minimum: 1} )} );

    entity( s, 'Aula', at( 3, 2 ) );
    key( s, 'Aula', 'codigo', 'VARCHAR(10)' );
    attribute( s, 'Aula', 'capacidad', 'NUMBER(4)', {required: true, domain: DOMAIN( {minimum: 1} )} );

    entity( s, 'Alumno', at( 1, 2 ) );
    key( s, 'Alumno', 'dni', 'CHAR(9)' );
    attribute( s, 'Alumno', 'nombre', 'VARCHAR(80)', {required: true} );
    attribute( s, 'Alumno', 'fecha_nacimiento', 'DATE' );
    attribute( s, 'Alumno', 'direccion', 'VARCHAR(120)' );

    relation( s, 'Pertenece', [['Departamento', 'departamento', 1, null], ['Profesor', 'profesor', 1, 1]] );
    foreignKey( s, 'Pertenece', 'Profesor' );
    relation( s, 'Dirige', [['Profesor', 'director', 0, 1], ['Departamento', 'departamento', 1, 1]] );
    foreignKey( s, 'Dirige', 'Departamento' );
    relation( s, 'Tiene', [['Asignatura', 'asignatura', 1, null], ['Grupo', 'grupo', 1, 1]] );
    foreignKey( s, 'Tiene', 'Grupo', true );
    weak( s, 'Grupo', 'Tiene' );
    relation( s, 'Imparte', [['Profesor', 'profesor', 0, null], ['Grupo', 'grupo', 1, null]] );
    association( s, 'Imparte', 'Imparte' );
    relation( s, 'Clase', [['Grupo', 'grupo', 1, null], ['Aula', 'aula', 0, null]] );
    const dia = attribute( s, 'Clase', 'dia', 'VARCHAR(9)', {ownerKind: 'relationship', required: true, domain: DOMAIN( {values: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']} )} );
    const hora = attribute( s, 'Clase', 'hora', 'CHAR(5)', {ownerKind: 'relationship', required: true} );
    // A group is in one room at a time: (grupo, dia, hora) is the key; the room is a plain FK.
    association( s, 'Clase', 'Horario', [dia, hora], ['grupo'] );
    relation( s, 'Matricula', [['Alumno', 'alumno', 1, null], ['Grupo', 'grupo', 0, null]] );
    association( s, 'Matricula', 'Matricula' );

    placeTable( s, 'Imparte', at( 1, 1 ) );
    placeTable( s, 'Horario', at( 3, 1 ) );
    placeTable( s, 'Matricula', at( 2, 2 ) );
    tableAlternateKey( s, 'Horario', 'AK_Horario_aula_dia_hora', ['aula_codigo', 'dia', 'hora'] );

    assume( s, 'enunciado', 'Un profesor pertenece a un solo departamento y todo departamento tiene un director, que es un profesor.', 'Dirige' );
    assume( s, 'enunciado', 'Un grupo lo imparte al menos un profesor y un profesor imparte varios grupos.', 'Imparte' );
    assume( s, 'supuesto', 'El grupo se identifica por su código dentro de la asignatura: entidad débil de Asignatura.', 'Grupo' );
    assume( s, 'supuesto', 'Teoría y prácticas no tienen atributos propios: el tipo de grupo es un dominio, no una especialización.', 'Grupo' );
    assume( s, 'supuesto', 'Las clases se dan en un día de la semana y una hora; ambos forman parte de la clave del horario.', 'Clase' );
    assume( s, 'supuesto', 'Un grupo está en una sola aula a la vez y un aula acoge un solo grupo a la vez: la clave de Horario es (grupo, día, hora), el aula es una clave ajena obligatoria fuera de la clave y (aula, día, hora) es clave alternativa.', 'Clase' );
    assume( s, 'enunciado', 'A los grupos se les imparten clases en días, horas y aulas determinadas: todo grupo participa en Clase (1,N).', 'Clase' );
    assume( s, 'enunciado', 'Los alumnos se matriculan de varias asignaturas (al menos una), siempre en un grupo: Matricula N:N entre Alumno (1,N) y Grupo.', 'Matricula' );
    assume( s, 'perdida', 'Que el alumno esté en un solo grupo por asignatura no se impone: con la clave (alumno, grupo) una restricción UNIQUE (alumno, asignatura) dejaría la clave primaria sin ser mínima. El diseño que sí lo impone es Matricula(alumno, asignatura, grupo) con clave (alumno, asignatura); si hubiera grupos de teoría y de prácticas, la regla sería uno por asignatura y tipo.', 'Matricula' );
    assume( s, 'supuesto', 'El número de registro personal es un código con letras y cifras: se guarda como texto (VARCHAR).', 'Profesor' );
    assume( s, 'perdida', 'Que el grupo no supere su máximo de alumnos ni la capacidad del aula, y que el director pertenezca a su departamento, no se imponen con claves.', 'Matricula' );
    assume( s, 'perdida', 'Departamento y Profesor se referencian mutuamente con claves ajenas obligatorias: al cargar datos hay que insertar uno con la referencia pendiente.', 'Dirige' );

    finish( s, 'curso-universidad.databasic.json' );
    }

/* ---------- Tema 2, mini-ejercicio 2: biblioteca ---------- */

function biblioteca() {
    const s = start( 'Biblioteca · mini-ejercicio 2 (Tema 2)' );

    entity( s, 'Autor', at( 0, 0 ) );
    key( s, 'Autor', 'codigo', 'NUMBER(6)' );
    attribute( s, 'Autor', 'nombre', 'VARCHAR(80)', {required: true} );

    entity( s, 'Libro', at( 1, 0 ) );
    key( s, 'Libro', 'isbn', 'CHAR(13)' );
    attribute( s, 'Libro', 'titulo', 'VARCHAR(120)', {required: true} );
    attribute( s, 'Libro', 'anio_publicacion', 'NUMBER(4)' );

    entity( s, 'Usuario', at( 2, 0 ) );
    key( s, 'Usuario', 'dni', 'CHAR(9)' );
    attribute( s, 'Usuario', 'nombre', 'VARCHAR(80)', {required: true} );
    attribute( s, 'Usuario', 'telefono', 'VARCHAR(15)' );

    relation( s, 'Escribe', [['Autor', 'autor', 1, null], ['Libro', 'libro', 1, null]] );
    association( s, 'Escribe', 'Autoria' );
    relation( s, 'Prestamo', [['Usuario', 'usuario', 0, null], ['Libro', 'libro', 0, null]] );
    const fecha = attribute( s, 'Prestamo', 'fecha_prestamo', 'DATE', {ownerKind: 'relationship', required: true} );
    attribute( s, 'Prestamo', 'fecha_devolucion', 'DATE', {ownerKind: 'relationship', domain: DOMAIN( {check: 'fecha_devolucion >= fecha_prestamo'} )} );
    association( s, 'Prestamo', 'Prestamo', [fecha] );

    placeTable( s, 'Autoria', at( 0, 1 ) );
    placeTable( s, 'Prestamo', at( 2, 1 ) );

    assume( s, 'enunciado', 'Entidades: libros, autores y usuarios. Relaciones: un autor escribe libros y un usuario toma libros en préstamo.', 'Libro' );
    assume( s, 'supuesto', 'Un libro tiene uno o varios autores y un autor escribe uno o varios libros: N:N.', 'Escribe' );
    assume( s, 'supuesto', 'El préstamo guarda las fechas; la de préstamo forma parte de la clave para que un usuario pueda volver a tomar el mismo libro.', 'Prestamo' );
    assume( s, 'perdida', 'Se presta el libro, no un ejemplar concreto: con varios ejemplares haría falta la entidad débil Ejemplar.', 'Prestamo' );
    assume( s, 'perdida', 'Que un mismo libro no esté prestado a dos usuarios a la vez no se impone con claves.', 'Prestamo' );

    finish( s, 'curso-biblioteca.databasic.json' );
    }

hoteles();
videoclub();
lonja();
agencia();
empresa();
restaurante();
inmobiliaria();
farmacos();
idiomas();
personal();
muebles();
salas();
transporte();
concesionario();
universidad();
biblioteca();
