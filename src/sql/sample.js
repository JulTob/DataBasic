import {
    DATA_ROW_LIMIT,
    documentData,
    parseDataType,
    replaceDocumentData
    } from '../domain/model.js';
import {
    cellProblem,
    dataInsertOrder
    } from '../domain/data.js';
import { parseExpression } from './parser.js';
import { evaluate } from './expressions.js';
import {
    openDatabase,
    rowScopeFor
    } from './query.js';
import {
    cellFromValue,
    truth,
    valueFromCell
    } from './values.js';

/*
 * Sample rows that keep every rule of the tables, so the console has
 * something to query from the first minute. The generator fills tables in
 * the order of their references (referenced tables first) and builds each
 * row in three steps:
 *   1. the foreign keys take the key of an existing row of the other table;
 *   2. the other fields take a value of their type, their domain and their
 *      name (a DNI with its letter, a phone, a fish species…);
 *   3. the row is checked like the datasheet checks it, plus its CHECK
 *      rules and its unique keys; a row that fails is drawn again.
 * The same document always gives the same rows: the draws come from a
 * seeded sequence, not from Math.random.
 */

/* ---------- a seeded sequence of draws ---------- */

/** Mulberry32: a small, well-known generator of numbers in [0, 1) from a seed. */
function seededRandom( seed ) {
    let state = seed >>> 0;

    return () => {
        state = (state + 0x6D2B79F5) >>> 0;

        let value = state;

        value = Math.imul( value ^ (value >>> 15), value | 1 );
        value ^= value + Math.imul( value ^ (value >>> 7), value | 61 );
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
        };
    }

function drawInteger(
        random,
        low,
        high
        ) {
    return low + Math.floor( random() * (high - low + 1) );
    }

function drawItem(
        random,
        list
        ) {
    return list[Math.floor( random() * list.length )];
    }

/* ---------- vocabulary ---------- */

const FIRST_NAMES = ['Ana', 'Luis', 'Marta', 'Javier', 'Lucía', 'Carlos', 'Elena', 'Pablo', 'Sara', 'Diego', 'Paula', 'Andrés', 'Irene', 'Raúl', 'Clara', 'Hugo', 'Nuria', 'Óscar', 'Alba', 'Rubén'];
const SURNAMES = ['García López', 'Martínez Ruiz', 'Sánchez Pérez', 'Gómez Navarro', 'Fernández Gil', 'López Molina', 'Díaz Serrano', 'Moreno Ortega', 'Álvarez Castro', 'Romero Rubio', 'Torres Marín', 'Navarro Soler'];
const STREETS = ['C/ Mayor', 'Av. de la Libertad', 'C/ del Mar', 'Pl. de España', 'C/ San Vicente', 'Av. de Elche', 'C/ Reina Victoria', 'Paseo Marítimo'];
const CITIES = ['Elche', 'Alicante', 'Santa Pola', 'Orihuela', 'Murcia', 'Valencia', 'Torrevieja', 'Crevillente'];
const PERSON_TABLES = /socio|cliente|empleado|persona|alumno|profesor|paciente|comprador|mecanico|mecánico|personal|usuario|autor|agente|familiar|conductor|trabajador|recepcionista|camarero|cocinero|pinche|capitan|armador|titular|inquilino|director|gerente|supervisor/i;

/** Names of things, by the table that holds them. The first rule that matches the table name wins. */
const THING_NAMES = [
    [/especie/i, ['Merluza', 'Gamba roja', 'Sardina', 'Pulpo', 'Dorada', 'Lubina', 'Boquerón', 'Calamar', 'Sepia', 'Rape', 'Salmonete', 'Jurel']],
    [/barco/i, ['Virgen del Mar', 'Nuevo Amanecer', 'Rosa de Tabarca', 'Hermanos Pérez', 'Mar de Santa Pola', 'Estrella del Sur', 'Cabo Cervera', 'La Paloma']],
    [/caladero/i, ['Cabo de Santa Pola', 'Isla de Tabarca', 'Bajo de la Nao', 'Golfo de Alicante', 'Banco de Torrevieja', 'Cabo de Palos', 'Fondo de Calpe', 'Placer de las Hormigas']],
    [/hotel/i, ['Hotel Mediterráneo', 'Hotel Las Palmeras', 'Hotel Costa Blanca', 'Hotel Bahía', 'Hotel Faro', 'Hotel Albufera']],
    [/departamento/i, ['Logística', 'Administración', 'Mantenimiento', 'Ventas', 'Recursos Humanos', 'Informática', 'Calidad', 'Compras']],
    [/proyecto/i, ['Proyecto Alfa', 'Proyecto Brisa', 'Proyecto Coral', 'Proyecto Delta', 'Proyecto Eco', 'Proyecto Faro']],
    [/plato/i, ['Paella valenciana', 'Gazpacho', 'Arroz a banda', 'Tortilla de patatas', 'Flan casero', 'Ensalada mixta', 'Merluza a la plancha', 'Crema catalana', 'Croquetas', 'Fideuá']],
    [/ingrediente/i, ['Arroz', 'Tomate', 'Aceite de oliva', 'Ajo', 'Cebolla', 'Huevo', 'Patata', 'Merluza', 'Leche', 'Azúcar', 'Harina', 'Pimiento']],
    [/almac/i, ['Cámara frigorífica', 'Despensa', 'Bodega', 'Congelador', 'Almacén seco']],
    [/asignatura/i, ['Bases de datos', 'Programación', 'Redes', 'Estadística', 'Sistemas operativos', 'Matemáticas', 'Física', 'Ingeniería del software']],
    [/idioma/i, ['Inglés', 'Francés', 'Alemán', 'Italiano', 'Chino', 'Portugués', 'Árabe', 'Japonés']],
    [/servicio/i, ['Oncología', 'Traumatología', 'Pediatría', 'Cardiología', 'Urgencias', 'Neurología', 'Digestivo']],
    [/farmaco|fármaco/i, ['Paracetamol', 'Ibuprofeno', 'Amoxicilina', 'Omeprazol', 'Metformina', 'Enalapril', 'Salbutamol', 'Atorvastatina']],
    [/pelicula|película/i, ['El sur', 'Volver', 'Mar adentro', 'La lengua de las mariposas', 'Los otros', 'Ocho apellidos vascos', 'El orfanato', 'Celda 211']],
    [/libro/i, ['Cien años de soledad', 'La sombra del viento', 'El Quijote', 'Nada', 'Patria', 'La colmena', 'Rayuela', 'Fortunata y Jacinta']],
    [/mueble/i, ['Mesa de roble', 'Silla nórdica', 'Estantería', 'Armario ropero', 'Cómoda', 'Mesita de noche', 'Banco de pino', 'Aparador']],
    [/sala/i, ['Sala Azul', 'Sala Verde', 'Sala Norte', 'Sala Sur', 'Sala Mar', 'Sala Sol']],
    [/viaje/i, ['Ruta de los castillos', 'Escapada a Roma', 'Costa Azul', 'Norte de Portugal', 'Islas Baleares', 'Valle del Jerte']],
    [/vehiculo|vehículo|coche/i, ['Furgón blanco', 'Turismo gris', 'Camión azul', 'Coche de empresa']],
    [/nivel|curso/i, ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']]
    ];

const FIELD_LISTS = [
    [/^tipo$/i, /especie/i, ['pescado blanco', 'pescado azul', 'marisco', 'cefalópodo']],
    [/^tipo$/i, null, ['general', 'especial', 'básico']],
    [/^clase$/i, /barco/i, ['arrastre', 'cerco', 'palangre', 'artes menores']],
    [/^clase$/i, null, ['A', 'B', 'C']],
    [/^color$/i, null, ['blanco', 'negro', 'gris', 'rojo', 'azul']],
    [/^marca$/i, null, ['Seat', 'Renault', 'Ford', 'Toyota', 'Peugeot', 'Iveco']],
    [/^modelo$/i, null, ['Ibiza', 'Clio', 'Transit', 'Corolla', 'Partner', 'Daily']],
    [/^tema$/i, null, ['drama', 'comedia', 'suspense', 'ciencia ficción', 'animación']],
    [/^parentesco$/i, null, ['hijo', 'hija', 'cónyuge', 'padre', 'madre']],
    [/^categoria$|^categoría$/i, null, ['titular', 'asociado', 'ayudante', 'catedrático']],
    [/^area|^área|especialidad|uso$/i, null, ['gestión', 'docencia', 'investigación', 'atención al público', 'mantenimiento']],
    [/idioma_principal/i, null, ['inglés', 'francés', 'alemán', 'italiano']],
    [/compuesto/i, null, ['paracetamol', 'ibuprofeno', 'amoxicilina', 'omeprazol']],
    [/ubicacion|ubicación|lugar|destino|sede|edificio/i, null, CITIES],
    [/diagnostico|diagnóstico/i, null, ['J18.9', 'S72.0', 'I21.9', 'K35.8', 'C50.9', 'E11.9']],
    [/tipo_carnet/i, null, ['B', 'C', 'C+E', 'D']],
    [/servicio/i, null, ['limpieza', 'secretaría', 'biblioteca', 'conserjería']],
    [/grupo|nivel/i, null, ['A1', 'A2', 'C1', 'C2']],
    [/caracter|carácter/i, null, ['básica', 'obligatoria', 'optativa']]
    ];

const DNI_CONTROL = 'TRWAGMYFPDXBNJZSQVHLCKE';

function dniText( number ) {
    const digits = String( number ).padStart( 8, '0' ).slice( -8 );

    return `${digits}${DNI_CONTROL[Number( digits ) % 23]}`;
    }

function plain( text ) {
    return text.normalize( 'NFD' ).replace( /[̀-ͯ]/g, '' ).toLowerCase().replace( /[^a-z0-9]+/g, '.' );
    }

/* ---------- values by type and name ---------- */

function typeShape( column ) {
    try {
        const parsed = parseDataType( column.type );

        return {family: parsed.family, length: parsed.length ?? null, precision: parsed.precision ?? null, scale: parsed.scale ?? 0};
        }
    catch {
        return {family: 'VARCHAR', length: 50, precision: null, scale: 0};
        }
    }

function fitText(
        text,
        shape
        ) {
    return shape.length ? String( text ).slice( 0, shape.length ) : String( text );
    }

/** The range a number takes, from its domain, its name and what its precision allows. */
function numberRange(
        column,
        shape
        ) {
    const name = column.name.toLowerCase();
    const hint = /latitud/.test( name ) ? [38.1, 38.3]
        : /longitud/.test( name ) ? [-0.7, -0.4]
            : /^anio|^año|anio_|año_/.test( name ) ? [1995, 2025]
                : /salario|sueldo/.test( name ) ? [1100, 3500]
                    : /importe|valor|total|cuota/.test( name ) ? [20, 2000]
                        : /precio/.test( name ) ? [1, 60]
                            : /kilo|kg|peso|capacidad|volumen|superficie|extension|kilometros/.test( name ) ? [5, 500]
                                : /hora|minuto/.test( name ) ? [1, 40]
                                    : /calificacion|nota/.test( name ) ? [0, 10]
                                        : /num_|cantidad|unidades|raciones|plazas|camas|dosis|creditos|planta|altura|pasillo|mes|curso/.test( name ) ? [1, 30]
                                            : [1, 100];
    const domain = column.domain || {};
    const capacity = shape.precision ? 10 ** (shape.precision - Math.max( shape.scale, 0 )) - 1 : Infinity;
    const lowest = Math.max( domain.minimum ?? -capacity, -capacity );
    const highest = Math.min( domain.maximum ?? capacity, capacity );
    const low = Math.max( hint[0], lowest );
    const high = Math.min( hint[1], highest );

    // The name's usual range, inside what the domain and the type allow; the domain alone when they do not meet.
    return low <= high ? [low, high] : [lowest, Math.max( lowest, Math.min( highest, lowest + 100 ) )];
    }

function numberValue(
        context,
        shape
        ) {
    const [low, high] = numberRange( context.column, shape );
    const scale = Math.max( shape.scale, 0 );
    const value = scale
        ? low + context.random() * (high - low)
        : drawInteger( context.random, Math.ceil( low ), Math.floor( high ) );

    return Number( value.toFixed( scale ) );
    }

/** Dates run forward along the row: a later date field (fin, devolución, salida…) comes after the ones before it. */
function dateValue( context ) {
    const name = context.column.name.toLowerCase();

    if (/nacimiento/.test( name )) {
        return `${drawInteger( context.random, 1955, 2005 )}-${String( drawInteger( context.random, 1, 12 ) ).padStart( 2, '0' )}-${String( drawInteger( context.random, 1, 28 ) ).padStart( 2, '0' )}`;
        }

    const earlier = context.table.columns
        .slice( 0, context.table.columns.indexOf( context.column ) )
        .filter( column => typeShape( column ).family === 'DATE' && context.row[column.id] && !/nacimiento/.test( column.name ) )
        .map( column => Date.parse( context.row[column.id] ) );
    const start = earlier.length ? Math.max( ...earlier ) : Date.UTC( 2024, 0, 1 );
    const span = earlier.length ? drawInteger( context.random, 1, 60 ) : drawInteger( context.random, 0, 900 );

    return new Date( start + span * 86400000 ).toISOString().slice( 0, 10 );
    }

function personName(
        context,
        withSurname
        ) {
    const first = FIRST_NAMES[(context.index * 7 + drawInteger( context.random, 0, 3 )) % FIRST_NAMES.length];

    return withSurname ? `${first} ${drawItem( context.random, SURNAMES ).split( ' ' )[0]}` : first;
    }

function thingName(
        context,
        shape
        ) {
    const list = THING_NAMES.find( ([pattern]) => pattern.test( context.table.name ) )?.[1];

    if (list) {
        const item = list[context.index % list.length];

        return context.index < list.length ? item : `${item} ${Math.floor( context.index / list.length ) + 1}`;
        }

    return `${context.table.name} ${context.index + 1}`;
    }

/** A code that fits the field: the table's initials and a number, as long as the type allows. */
function codeValue(
        context,
        shape
        ) {
    const prefix = context.table.name.replace( /[^A-Za-z]/g, '' ).slice( 0, 3 ).toUpperCase() || 'C';
    const width = shape.length ? Math.max( 1, shape.length - prefix.length ) : 4;
    const number = String( context.index + 1 ).padStart( Math.min( width, 4 ), '0' );

    return shape.length && prefix.length + number.length > shape.length
        ? String( context.index + 1 ).padStart( shape.length, '0' ).slice( -shape.length )
        : `${prefix}${number}`;
    }

function textValue(
        context,
        shape
        ) {
    const name = context.column.name.toLowerCase();
    const values = context.column.domain?.values || [];
    const list = FIELD_LISTS.find( ([field, table]) => field.test( name ) && (!table || table.test( context.table.name )) );
    const hasSurnames = context.table.columns.some( column => /apellido/i.test( column.name ) );

    if (values.length) {
        return drawItem( context.random, values );
        }

    if (/^(dni|nif|dni_cif)$|_dni$/.test( name )) {
        return dniText( 10000000 + context.index * 7919 + drawInteger( context.random, 0, 999 ) );
        }

    if (/cif/.test( name )) {
        return `B${String( 40000000 + context.index * 9173 + drawInteger( context.random, 0, 99 ) ).slice( -8 )}`;
        }

    if (/num_ss|seguridad/.test( name )) {
        return String( 280000000000 + context.index * 104729 + drawInteger( context.random, 0, 999 ) ).slice( 0, shape.length || 12 );
        }

    if (/num_cuenta|iban|cuenta/.test( name )) {
        return `ES${String( drawInteger( context.random, 10, 99 ) )}${String( 21000000000000000000n + BigInt( context.index * 7777 ) ).slice( 0, 20 )}`.slice( 0, shape.length || 24 );
        }

    if (/matricula/.test( name )) {
        return fitText( /barco/i.test( context.table.name ) ? `AT-${3 + context.index % 5}-${1000 + context.index}` : `${1000 + context.index * 37} ${['BCD', 'FGH', 'JKL', 'MNP'][context.index % 4]}`, shape );
        }

    if (/telefono|teléfono|movil|fijo/.test( name )) {
        return `6${String( 10000000 + context.index * 811 + drawInteger( context.random, 0, 99 ) ).slice( -8 )}`;
        }

    if (/email|correo/.test( name )) {
        const owner = context.table.columns.find( column => /^nombre$/i.test( column.name ) );

        return fitText( `${plain( context.row[owner?.id] || `usuario${context.index + 1}` )}${context.index + 1}@correo.es`, shape );
        }

    if (/direccion|dirección/.test( name )) {
        return fitText( `${drawItem( context.random, STREETS )} ${drawInteger( context.random, 1, 90 )}, ${drawItem( context.random, CITIES )}`, shape );
        }

    if (/apellido/.test( name )) {
        return drawItem( context.random, SURNAMES );
        }

    if (/^hora$/.test( name )) {
        return `${String( 8 + context.index % 12 ).padStart( 2, '0' )}:00`;
        }

    if (/isbn/.test( name )) {
        return String( 9788400000000 + context.index * 1371 ).slice( 0, shape.length || 13 );
        }

    if (/^(nombre|titulo|título|descripcion|descripción)$/.test( name )) {
        return fitText(
                /descripcion|descripción/.test( name ) ? `Descripción de ${context.table.name.toLowerCase()} ${context.index + 1}`
                    : PERSON_TABLES.test( context.table.name ) ? personName( context, !hasSurnames )
                        : thingName( context, shape ),
                shape
                );
        }

    if (PERSON_TABLES.test( name ) && !/cod|num/.test( name )) {
        return fitText( personName( context, true ), shape );
        }

    if (list) {
        return fitText( drawItem( context.random, list[2] ), shape );
        }

    if (/cod|codigo|código|numero|número|referencia|serie|registro|^id/.test( name ) || shape.family === 'CHAR') {
        return codeValue( context, shape );
        }

    return fitText( `${context.column.name} ${context.index + 1}`, shape );
    }

/** A number in a key: a sequence (a year from 2018, or from the domain's minimum) so keys do not repeat. */
function keyNumber(
        context,
        shape
        ) {
    const domain = context.column.domain || {};
    const start = /anio|año|year/i.test( context.column.name ) ? 2018 : domain.minimum ?? 1;
    const size = domain.maximum !== null && domain.maximum !== undefined ? domain.maximum - start + 1 : Infinity;
    const value = start + (size === Infinity ? context.index : context.index % Math.max( 1, size ));

    return String( shape.precision ? Math.min( value, 10 ** (shape.precision - Math.max( shape.scale, 0 )) - 1 ) : value );
    }

/** One field of the row that no foreign key fills. */
function fieldValue( context ) {
    const shape = typeShape( context.column );

    if (['NUMBER', 'DECIMAL', 'NUMERIC', 'INTEGER', 'INT', 'SMALLINT', 'BIGINT', 'REAL', 'FLOAT', 'DOUBLE'].includes( shape.family )) {
        if (context.column.domain?.values?.length) {
            return String( drawItem( context.random, context.column.domain.values ) );
            }

        return context.key ? keyNumber( context, shape ) : String( numberValue( context, shape ) );
        }

    if (['DATE', 'TIMESTAMP', 'DATETIME'].includes( shape.family )) {
        return dateValue( context );
        }

    if (['BOOLEAN', 'BOOL'].includes( shape.family )) {
        return context.random() < 0.5 ? 'sí' : 'no';
        }

    return textValue( context, shape );
    }

/* ---------- the rules of a table ---------- */

function keySets( table ) {
    const primary = table.columns.filter( column => column.primary ).map( column => column.id );

    return [
        ...(primary.length ? [primary] : []),
        ...(table.alternateKeys || []).map( key => key.columns ),
        ...table.indexes.filter( index => index.unique ).map( index => index.columns )
        ];
    }

function signature(
        row,
        columns
        ) {
    const values = columns.map( id => String( row[id] ?? '' ).trim().toLowerCase() );

    return values.some( value => value === '' ) ? null : JSON.stringify( values );
    }

/** The CHECK rules of the table's fields, read once. */
function checksOf( table ) {
    return table.columns
        .filter( column => column.domain?.check?.trim() )
        .map( column => {
            try {
                return parseExpression( column.domain.check );
                }
            catch {
                return null;
                }
            } )
        .filter( Boolean );
    }

function rowFits(
        database,
        table,
        row,
        checks,
        taken,
        deferred
        ) {
    for (const column of table.columns) {
        if (deferred.has( column.id )) {
            continue;
            }

        if (cellProblem( column, row[column.id] ?? '' )) {
            return false;
            }
        }

    if (checks.length) {
        const scope = rowScopeFor(
                database,
                table.columns.map( column => ({name: column.name, table: table.name}) ),
                table.columns.map( column => valueFromCell( row[column.id], column.type ) )
                );

        for (const check of checks) {
            try {
                if (truth( evaluate( check, scope ) ) === false) {
                    return false;
                    }
                }
            catch {
                return false;
                }
            }
        }

    return taken.every( ({columns, seen}) => {
        const key = signature( row, columns );

        return key === null || columns.some( id => deferred.has( id ) ) || !seen.has( key );
        } );
    }

/** A stored derived field whose derivation is a formula of the row (kilos_total × precio_kg_salida) gets its value. */
function derivedFormulas(
        model,
        table
        ) {
    const formulas = new Map();

    for (const column of table.columns) {
        const trace = (model.traces || []).find( item => item.targetKind === 'column' && item.targetId === column.id && item.sourceKind === 'attribute' );
        const attribute = model.conceptual?.attributes.find( item => item.id === trace?.sourceId );

        if (!attribute?.derived || !attribute.derivation) {
            continue;
            }

        try {
            const expression = parseExpression( attribute.derivation.replaceAll( '×', '*' ).replaceAll( '·', '*' ) );

            formulas.set( column.id, expression );
            }
        catch {
            // A derivation written in words stays a description; the field gets an ordinary value.
            }
        }

    return formulas;
    }

/* ---------- foreign keys ---------- */

/** Every foreign key of the table, with the rows it can point to now (or deferred when they come later). */
function referencesOf(
        model,
        table,
        data,
        filled
        ) {
    return model.relationships
        .filter( relation => relation.childId === table.id )
        .map( relation => ({
            relation,
            self: relation.parentId === table.id,
            ready: relation.parentId === table.id || filled.has( relation.parentId ),
            parentRows: () => data[relation.parentId] || []
            }) );
    }

function chooseParent(
        context,
        reference,
        row
        ) {
    const candidates = reference.parentRows().filter( parent => parent !== row );
    const assigned = reference.relation.mappings.filter( pair => row[pair.childColumnId] );

    const compatible = candidates.filter(
            parent => assigned.every( pair => String( parent[pair.parentColumnId] ) === String( row[pair.childColumnId] ) )
            );

    return compatible.length ? drawItem( context.random, compatible ) : null;
    }

/* ---------- the generator ---------- */

function generateRow(
        model,
        database,
        table,
        index,
        ordinal,
        random,
        references,
        formulas
        ) {
    const row = Object.fromEntries( table.columns.map( column => [column.id, ''] ) );
    const fromReference = new Set();
    const deferred = new Set();
    const context = {table, index, random, row, column: null, key: false};

    for (const reference of references) {
        const columns = reference.relation.mappings.map( pair => pair.childColumnId );
        const required = columns.some( id => table.columns.find( column => column.id === id )?.required );

        columns.forEach( id => fromReference.add( id ) );

        if (!reference.ready) {
            if (required) {
                columns.forEach( id => deferred.add( id ) );
                }

            continue;
            }

        if (!reference.fixedRows && !required && random() < (reference.self ? 0.4 : 0.15)) {
            continue;
            }

        const parent = reference.fixedRows ? reference.fixedRows[ordinal] : chooseParent( context, reference, row );

        if (parent) {
            reference.relation.mappings.forEach( pair => { row[pair.childColumnId] = parent[pair.parentColumnId]; } );
            }
        }

    for (const column of table.columns) {
        if (fromReference.has( column.id ) || formulas.has( column.id )) {
            continue;
            }

        const optional = !column.required && !column.primary;

        if (optional && random() < 0.12) {
            continue;
            }

        context.column = column;
        context.key = column.primary;
        row[column.id] = fieldValue( context );
        }

    for (const [columnId, expression] of formulas) {
        const column = table.columns.find( item => item.id === columnId );

        try {
            const scope = rowScopeFor(
                    database,
                    table.columns.map( item => ({name: item.name, table: table.name}) ),
                    table.columns.map( item => valueFromCell( row[item.id], item.type ) )
                    );
            const shape = typeShape( column );
            const value = evaluate( expression, scope );

            row[columnId] = typeof value === 'number'
                ? cellFromValue( Number( value.toFixed( Math.max( shape.scale, 0 ) ) ), column.type )
                : cellFromValue( value, column.type );
            }
        catch {
            context.column = column;
            row[columnId] = fieldValue( context );
            }
        }

    return {row, deferred};
    }

/** Fills the foreign keys that waited for their table (references in a cycle), keeping unique keys unique. */
function fillDeferred(
        model,
        data,
        pending,
        random
        ) {
    for (const {table, row, deferred} of pending) {
        for (const relation of model.relationships.filter( item => item.childId === table.id )) {
            const columns = relation.mappings.map( pair => pair.childColumnId );

            if (!columns.some( id => deferred.has( id ) )) {
                continue;
                }

            const keys = keySets( table ).filter( key => key.some( id => columns.includes( id ) ) );
            const parents = [...(data[relation.parentId] || [])].sort( () => random() - 0.5 );
            const parent = parents.find( candidate => {
                const trial = {...row};

                relation.mappings.forEach( pair => { trial[pair.childColumnId] = candidate[pair.parentColumnId]; } );
                return keys.every( key => {
                    const value = signature( trial, key );

                    return value === null || !data[table.id].some( other => other !== row && signature( other, key ) === value );
                    } );
                } );

            if (parent) {
                relation.mappings.forEach( pair => { row[pair.childColumnId] = parent[pair.parentColumnId]; } );
                }
            }
        }

    for (const {table, row} of pending) {
        if (table.columns.some( column => cellProblem( column, row[column.id] ?? '' ) )) {
            data[table.id] = data[table.id].filter( item => item !== row );
            }
        }
    }

/* ---------- specializations ---------- */

function entityTableId(
        model,
        entityId
        ) {
    return (model.traces || []).find( trace => trace.sourceKind === 'entity' && trace.sourceId === entityId && trace.targetKind === 'table' )?.targetId
        || entityId;
    }

function shuffled(
        random,
        list
        ) {
    const copy = [...list];

    for (let index = copy.length - 1; index > 0; index -= 1) {
        const other = Math.floor( random() * (index + 1) );

        [copy[index], copy[other]] = [copy[other], copy[index]];
        }

    return copy;
    }

/*
 * The rows of a supertype go to its subtypes as the specialization says:
 * disjoint, each row in one subtype at most; overlapping, a row may be in
 * several; total, every row in some subtype; partial, about a quarter in none.
 */
function shareRows(
        generalization,
        superRows,
        subtypeIds,
        random
        ) {
    const rows = shuffled( random, superRows );
    const covered = generalization.total ? rows : rows.slice( 0, Math.ceil( rows.length * 0.75 ) );
    const shares = new Map( subtypeIds.map( id => [id, []] ) );

    if (generalization.disjoint) {
        covered.forEach( (row, index) => shares.get( subtypeIds[index % subtypeIds.length] ).push( row ) );
        return shares;
        }

    covered.forEach( (row, index) => {
        shares.get( subtypeIds[index % subtypeIds.length] ).push( row );
        subtypeIds.filter( (id, position) => position !== index % subtypeIds.length && random() < 0.35 )
            .forEach( id => shares.get( id ).push( row ) );
        } );

    return shares;
    }

/** When the table is a subtype of a materialized specialization, the rows of its supertype it receives. */
function subclassShare(
        model,
        table,
        data,
        random,
        shares
        ) {
    for (const generalization of model.conceptual?.generalizations || []) {
        if (generalization.translation?.kind !== 'class-tables') {
            continue;
            }

        const superId = entityTableId( model, generalization.supertypeId );
        const subtypeIds = generalization.subtypeIds.map( id => entityTableId( model, id ) );
        const relation = model.relationships.find( item => item.childId === table.id && item.parentId === superId && item.identifying );

        if (!subtypeIds.includes( table.id ) || !relation) {
            continue;
            }

        if (!shares.has( generalization.id )) {
            shares.set( generalization.id, shareRows( generalization, data[superId] || [], subtypeIds, random ) );
            }

        return {relationId: relation.id, rows: shares.get( generalization.id ).get( table.id )};
        }

    return null;
    }

const SAMPLE_ATTEMPTS = 40;

/**
 * Sample rows for the tables of the document that have none (tables that
 * already have rows keep them and serve as references). Returns the rows of
 * every table, ready for replaceDocumentData.
 */
export function sampleData(
        model,
        {rowsPerTable = 8, seed = 20261109} = {}
        ) {
    const data = structuredClone( documentData( model ) );
    const database = openDatabase( model );
    const random = seededRandom( seed );
    const filled = new Set( Object.keys( data ).filter( id => data[id]?.length ) );
    const pending = [];
    const shares = new Map();
    const count = Math.min( Math.max( 1, Math.trunc( rowsPerTable ) ), DATA_ROW_LIMIT );

    for (const table of dataInsertOrder( model )) {
        if (filled.has( table.id )) {
            continue;
            }

        const references = referencesOf( model, table, data, filled );
        const formulas = derivedFormulas( model, table );
        const checks = checksOf( table );
        const taken = keySets( table ).map( columns => ({columns, seen: new Set()}) );
        const share = subclassShare( model, table, data, random, shares );

        if (share) {
            references.find( reference => reference.relation.id === share.relationId ).fixedRows = share.rows;
            }

        data[table.id] = [];

        for (let index = 0; index < (share ? share.rows.length : count); index += 1) {
            for (let attempt = 0; attempt < SAMPLE_ATTEMPTS; attempt += 1) {
                const {row, deferred} = generateRow( model, database, table, index + attempt * count, index, random, references, formulas );

                if (!rowFits( database, table, row, checks, taken, deferred )) {
                    continue;
                    }

                taken.forEach( ({columns, seen}) => {
                    const key = signature( row, columns );

                    if (key !== null) {
                        seen.add( key );
                        }
                    } );
                data[table.id].push( row );

                if (deferred.size) {
                    pending.push( {table, row, deferred} );
                    }

                break;
                }
            }

        filled.add( table.id );
        }

    fillDeferred( model, data, pending, random );

    for (const id of Object.keys( data )) {
        if (!data[id].length) {
            delete data[id];
            }
        }

    return data;
    }

/** The document with sample rows in its empty tables, as one operation the editor can undo. */
export function fillWithSampleData(
        model,
        options = {}
        ) {
    return replaceDocumentData( model, sampleData( model, options ) );
    }
