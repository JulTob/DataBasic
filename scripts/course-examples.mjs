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
function partialKey( state, entityName, name, type ) {
    const generated = defaultKeyAttribute( state, entityName );

    state.model = domain.updateConceptualAttribute( state.model, generated.id, {name, type, primary: false, partialKey: true} );
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
        participations: participations.map( ([entityName, role, min, max]) => ({
            entityId: state.ids[entityName], role, min, max
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

/** N:N (or with attributes) as an association table keyed by the chosen parts. */
function association( state, relationName, tableName, attributeIds = [] ) {
    const created = state.model.conceptual.relationships.find( item => item.id === state.ids[relationName] );

    state.model = domain.updateConceptualRelationship( state.model, created.id, {
        translation: {
            kind: 'association',
            tableName,
            key: {participationIds: created.participations.map( part => part.id ), attributeIds}
            }
        } );
    }

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

function finish( state, filename ) {
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

    association( s, 'Alquila', 'Alquiler', [fecha] );

    placeTable( s, 'Actores', {x: 160, y: 560} );
    placeTable( s, 'Alquiler', {x: 1340, y: 420} );

    assume( s, 'enunciado', 'Puede haber películas con igual título pero distinto año: la clave es (título, año de estreno).', 'Pelicula' );
    assume( s, 'enunciado', 'Las copias se numeran dentro de cada película: entidad débil con clave parcial.', 'Copia' );
    assume( s, 'supuesto', 'Los actores principales se guardan como atributo multivaluado, traducido a la tabla Actores.', 'Pelicula' );
    assume( s, 'supuesto', 'Una misma copia se alquila como mucho una vez al día: la fecha forma parte de la clave del alquiler.', 'Alquila' );
    assume( s, 'perdida', 'La devolución del alquiler no figura en el enunciado y no se modela.', 'Alquila' );

    finish( s, 'curso-videoclub.databasic.json' );
    }

hoteles();
videoclub();
