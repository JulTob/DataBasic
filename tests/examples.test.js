import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import * as domain from '../src/domain/model.js';
import {
    parseDocument,
    serializeDocument
    } from '../src/domain/serialization.js';
import { exportSQL } from '../src/io/sql.js';
import { exportVDX } from '../src/io/visio.js';
import { exportAccessVBA } from '../src/io/access.js';
import { buildDiagramScene } from '../src/ui/scene.js';

const examplesURL = new URL( '../examples/', import.meta.url );
const filenames = (await readdir( examplesURL )).filter(
        name => name.endsWith( '.databasic.json' )
        );

async function openExample( name ) {
    return parseDocument(
            await readFile(
                    new URL( `${name}.databasic.json`, examplesURL ),
                    'utf8'
                    )
            );
    }

function tableNamed( model, name ) {
    const table = model.tables.find( item => item.name === name );

    assert.ok( table, `Falta la tabla ${name}.` );

    return table;
    }

function columnNames( table, columnIds ) {
    return columnIds.map(
            id => table.columns.find( item => item.id === id ).name
            );
    }

function primaryNames( table ) {
    return table.columns.filter( item => item.primary ).map( item => item.name );
    }

function attributeNamed( model, name, ownerId ) {
    const attribute = model.conceptual.attributes.find(
            item => item.name === name && (!ownerId || item.ownerId === ownerId)
            );

    assert.ok( attribute, `Falta el atributo ${name}.` );

    return attribute;
    }

for (const filename of filenames) {
    test( `Ejemplo entregado: ${filename} abre y conserva IDs y decisiones`, async () => {
        const contents = await readFile( new URL( filename, examplesURL ), 'utf8' );
        const model = parseDocument( contents );
        const reopened = parseDocument( serializeDocument( model ) );

        assert.deepEqual( reopened, model );
        assert.equal( model.version, 2 );
        assert.equal( model.profile, 'course' );
        assert.deepEqual(
                domain.validateDocument( model ).filter( item => item.level === 'error' ),
                []
                );

        if (filename.includes( 'pendiente' )) {
            assert.throws( () => exportSQL( model ), /SQL incompleto/ );
            return;
            }

        const sql = exportSQL( model );
        const relational = domain.setDiagramMode( model, 'relational' );
        const chen = domain.setDiagramMode( relational, 'chen' );

        assert.match( sql, /CREATE TABLE "/ );
        assert.equal( exportSQL( chen ), sql );
        assert.deepEqual( chen.traces, model.traces );
        assert.deepEqual( chen.conceptual, model.conceptual );
        } );
    }

test( 'Núcleo entregado: cuatro tipos, PK/AK, dominio y FK obligatoria', async () => {
    assert.equal( filenames.filter( name => !name.startsWith( 'curso-' ) ).length, 11 );

    const model = await openExample( '00-nucleo' );
    const instrument = tableNamed( model, 'Instrumento' );
    const session = tableNamed( model, 'Sesion' );
    const sql = exportSQL( model );

    assert.equal( model.tables.length, 3 );
    assert.equal( model.conceptual.relationships.length, 1 );
    assert.deepEqual( primaryNames( instrument ), ['codigoInstrumento'] );
    assert.deepEqual(
            columnNames( instrument, instrument.alternateKeys[0].columns ),
            ['serie']
            );
    assert.deepEqual(
            new Set( model.tables.flatMap( table => table.columns.map( item => item.type ) ) ),
            new Set( ['NUMBER', 'VARCHAR(60)', 'CHAR(12)', 'DATE', 'NUMBER(8,2)'] )
            );
    assert.ok( session.columns.find( item => item.name === 'coordinadora_codigoPersona' ).required );
    assert.match( sql, /"valor" NUMERIC\(8,2\) NOT NULL DEFAULT 0/ );
    assert.match( sql, /CHECK \("valor" >= 0\)/ );
    assert.match( sql, /CONSTRAINT "AK_Instrumento_serie" UNIQUE \("serie"\)/ );
    } );

test( 'Ternaria entregada: identidad repetible y unicidad por contexto son distintas', async () => {
    let pending = await openExample( '02-ternaria-pendiente' );
    const resolved = await openExample( '02-ternaria-resuelta' );
    const relation = pending.conceptual.relationships.find( item => item.name === 'Utiliza' );
    const instant = attributeNamed( pending, 'instante', relation.id );

    for (const part of relation.participations) {
        pending = domain.updateConceptualParticipation(
                pending, relation.id, part.id,
                {cardinality: part.role === 'instrumento' ? 'one' : 'many'}
                );
        }

    const withoutContext = domain.updateConceptualRelationship(
            pending,
            relation.id,
            {
                translation: {
                    kind: 'association', tableName: 'Utilizacion',
                    key: {
                        participationIds: relation.participations.map( item => item.id ),
                        attributeIds: [instant.id]
                        }
                    }
                }
            );

    assert.throws( () => exportSQL( withoutContext ), /contexto/ );
    assert.equal( tableNamed( withoutContext, 'Utilizacion' ).alternateKeys?.length || 0, 0 );

    const decision = resolved.conceptual.relationships.find( item => item.id === relation.id ).translation;
    const completed = domain.updateConceptualRelationship(
            withoutContext, relation.id, {translation: decision}
            );
    const utilization = tableNamed( completed, 'Utilizacion' );

    assert.deepEqual( primaryNames( utilization ), [
        'persona_codigoPersona', 'instrumento_codigoInstrumento',
        'sesion_codigoSesion', 'instante'
        ] );
    assert.deepEqual(
            columnNames( utilization, utilization.alternateKeys[0].columns ),
            ['persona_codigoPersona', 'sesion_codigoSesion', 'instante']
            );
    assert.equal( exportSQL( completed ), exportSQL( resolved ) );

    const repeated = domain.updateConceptualRelationship(
            completed, relation.id, {translation: decision}
            );

    assert.deepEqual( repeated, completed );
    } );

test( 'Multivaluados entregados: PK propietaria completa y sin copia escalar', async () => {
    let model = await openExample( '03-multivaluados-pendiente' );
    const resolved = await openExample( '03-multivaluados-resuelto' );

    for (const [name, tableName] of [
        ['etiqueta', 'Etiquetas'],
        ['calibracion', 'Calibraciones']
        ]) {
        model = domain.updateConceptualAttribute(
                model,
                attributeNamed( model, name ).id,
                {translation: {kind: 'multivalued-table', tableName}}
                );
        }

    assert.equal( exportSQL( model ), exportSQL( resolved ) );
    assert.deepEqual( primaryNames( tableNamed( model, 'Etiquetas' ) ), [
        'Instrumento_codigoInstrumento', 'Instrumento_sede', 'etiqueta'
        ] );
    assert.deepEqual( primaryNames( tableNamed( model, 'Calibraciones' ) ), [
        'Instrumento_codigoInstrumento', 'Instrumento_sede',
        'fechaCalibracion', 'patron'
        ] );

    const owner = tableNamed( model, 'Instrumento' );

    assert.ok( !owner.columns.some(
            item => ['etiqueta', 'calibracion', 'fechaCalibracion', 'patron'].includes( item.name )
            ) );

    for (const name of ['Etiquetas', 'Calibraciones']) {
        const child = tableNamed( model, name );
        const foreignKey = model.relationships.find( item => item.childId === child.id );

        assert.equal( foreignKey.mappings.length, 2 );
        assert.deepEqual(
                columnNames( owner, foreignKey.mappings.map( item => item.parentColumnId ) ),
                ['codigoInstrumento', 'sede']
                );
        }
    } );

test( 'Jerarquía entregada: rechazo atómico, corrección local e identidad heredada', async () => {
    let model = await openExample( '04-jerarquia-pendiente' );
    const before = serializeDocument( model );
    const generalization = model.conceptual.generalizations[0];
    const decision = {translation: {kind: 'class-tables'}};

    assert.throws(
            () => domain.updateConceptualGeneralization( model, generalization.id, decision ),
            /PK local/
            );
    assert.equal( serializeDocument( model ), before );

    for (const ownerId of generalization.subtypeIds) {
        const local = attributeNamed( model, 'id', ownerId );
        const trace = model.traces.find(
                item => item.sourceId === local.id && item.targetKind === 'column'
                );

        model = domain.updateConceptualAttribute(
                model, local.id, {name: 'referenciaLocal', primary: false}
                );
        assert.ok( model.tables.some(
                table => table.columns.some(
                        field => field.id === trace.targetId && field.name === 'referenciaLocal'
                        )
                ) );
        }

    model = domain.updateConceptualGeneralization( model, generalization.id, decision );
    const resolved = await openExample( '04-jerarquia-resuelta' );

    assert.equal( exportSQL( model ), exportSQL( resolved ) );

    for (const name of ['Manual', 'Automatizado']) {
        const child = tableNamed( model, name );

        assert.deepEqual( primaryNames( child ), ['Instrumento_codigoInstrumento'] );
        assert.ok( child.columns.some( item => item.name === 'referenciaLocal' && !item.primary ) );
        }

    for (const disjoint of [true, false]) {
        for (const total of [true, false]) {
            const variant = domain.updateConceptualGeneralization(
                    model, generalization.id, {disjoint, total}
                    );

            assert.deepEqual( variant.relationships, model.relationships );
            assert.deepEqual( variant.traces, model.traces );
            assert.doesNotThrow( () => exportSQL( variant ) );
            assert.ok( domain.conceptualStatus( variant ).some(
                    item => item.elementId === generalization.id && item.code === 'documentary'
                    ) );
            }
        }
    } );

test( 'Débil entregada: clave parcial local; compuestos de entidad y relación; recursiva', async () => {
    const weak = await openExample( '05-debil' );
    const port = tableNamed( weak, 'Puerto' );

    assert.deepEqual( primaryNames( port ), ['numero', 'instrumento_codigoInstrumento'] );
    assert.equal( domain.isIdentifierDependent( weak, port.id ), true );

    const model = await openExample( '06-compuestos-recursiva' );
    const accreditation = attributeNamed( model, 'acreditacion' );
    const qualification = model.conceptual.relationships.find( item => item.name === 'Habilitacion' );
    const mentors = model.conceptual.relationships.find( item => item.name === 'Orienta' );
    const sql = exportSQL( model );

    assert.equal( accreditation.ownerKind, 'relationship' );
    assert.equal( accreditation.ownerId, qualification.id );
    assert.ok( tableNamed( model, 'Habilitacion' ).columns.some( item => item.name === 'emisor' ) );
    assert.ok( tableNamed( model, 'Habilitacion' ).columns.some( item => item.name === 'referencia' ) );
    assert.ok( tableNamed( model, 'Sesion' ).columns.some( item => item.name === 'edificio' ) );
    assert.ok( tableNamed( model, 'Sesion' ).columns.some( item => item.name === 'sala' ) );
    assert.doesNotMatch( sql, /"acreditacion"|"ubicacion"|"antiguedad"/ );
    assert.equal( mentors.participations[0].entityId, mentors.participations[1].entityId );
    assert.notEqual( mentors.participations[0].id, mentors.participations[1].id );
    assert.deepEqual( primaryNames( tableNamed( model, 'Orientacion' ) ), [
        'orientador_codigoPersona', 'orientado_codigoPersona'
        ] );
    } );

test( 'Ejercicio del curso: cadena hotelera con débiles, AK, N:N y especialización', async () => {
    const model = await openExample( 'curso-hoteles' );
    const hotel = tableNamed( model, 'Hotel' );
    const room = tableNamed( model, 'Habitacion' );
    const invoice = tableNamed( model, 'Factura' );
    const booking = tableNamed( model, 'Reserva' );
    const receptionist = tableNamed( model, 'Recepcionista' );
    const association = tableNamed( model, 'Reserva_Habitacion' );
    const sql = exportSQL( model );

    assert.equal( model.tables.length, 9 );
    assert.deepEqual( columnNames( hotel, hotel.alternateKeys[0].columns ), ['nombre'] );
    assert.deepEqual( primaryNames( room ), ['numero', 'hotel_codigo_hotel'] );
    assert.deepEqual( primaryNames( invoice ), ['numero', 'reserva_codigo_reserva'] );
    assert.equal( domain.isIdentifierDependent( model, room.id ), true );
    assert.equal( domain.isIdentifierDependent( model, invoice.id ), true );
    assert.deepEqual( primaryNames( association ), ['reserva_codigo_reserva', 'habitacion_numero', 'habitacion_hotel_codigo_hotel'] );
    assert.deepEqual( primaryNames( receptionist ), ['Empleado_dni'] );
    assert.ok( booking.columns.some( column => column.name === 'recepcionista_Empleado_dni' ) );
    assert.match( sql, /CHECK \("categoria" >= 1 AND "categoria" <= 5\)/ );
    assert.match( sql, /CHECK \(\(fecha_fin >= fecha_inicio\)\)/ );
    assert.equal( model.conceptual.generalizations.length, 1 );
    assert.deepEqual( [model.conceptual.generalizations[0].disjoint, model.conceptual.generalizations[0].total], [true, true] );
    assert.equal( domain.documentAssumptions( model ).length, 8 );
    assert.equal( model.display.mode, 'chen' );
    } );

test( 'Ejercicio del curso: videoclub con clave compuesta, copia débil, multivaluado y alquiler fechado', async () => {
    const model = await openExample( 'curso-videoclub' );
    const film = tableNamed( model, 'Pelicula' );
    const copy = tableNamed( model, 'Copia' );
    const actors = tableNamed( model, 'Actores' );
    const rental = tableNamed( model, 'Alquiler' );
    const sql = exportSQL( model );

    assert.equal( model.tables.length, 5 );
    assert.deepEqual( primaryNames( film ), ['titulo', 'anio_estreno'] );
    assert.deepEqual( primaryNames( copy ), ['numero_copia', 'pelicula_titulo', 'pelicula_anio_estreno'] );
    assert.deepEqual( primaryNames( actors ), ['Pelicula_titulo', 'Pelicula_anio_estreno', 'actor_principal'] );
    assert.deepEqual( primaryNames( rental ), ['cliente_dni', 'copia_numero_copia', 'copia_pelicula_titulo', 'copia_pelicula_anio_estreno', 'fecha'] );
    assert.match( sql, /CHECK \("formato" IN \('DVD', 'BR'\)\)/ );
    assert.equal( attributeNamed( model, 'actor_principal' ).multivalued, true );
    assert.equal( attributeNamed( model, 'fecha' ).ownerKind, 'relationship' );
    assert.equal( domain.documentAssumptions( model ).length, 5 );
    } );

/** Two boxes of the same drawing touch or overlap (with a small margin). */
function boxesOverlap(
        first,
        second
        ) {
    return first.x < second.x + second.width + 8 && first.x + first.width + 8 > second.x
        && first.y < second.y + second.height + 8 && first.y + first.height + 8 > second.y;
    }

const courseFiles = filenames.filter( name => name.startsWith( 'curso-' ) );
const exampleIndex = JSON.parse( await readFile( new URL( 'index.json', examplesURL ), 'utf8' ) );

test( 'Los ejercicios del curso están en Ayuda → Ejemplos', () => {
    const listed = exampleIndex.examples.map( item => item.file );

    assert.equal( courseFiles.length, 16 );

    for (const filename of courseFiles) {
        assert.ok( listed.includes( filename ), `${filename} debe aparecer en index.json` );
        }
    } );

for (const filename of courseFiles) {
    test( `Ejercicio del curso ${filename}: tres vistas sin solapes, archivos y supuestos`, async () => {
        const model = await openExample( filename.replace( '.databasic.json', '' ) );
        const kinds = new Set( domain.documentAssumptions( model ).map( item => item.kind ) );

        assert.ok( domain.documentAssumptions( model ).length >= 3 );
        assert.ok( kinds.has( 'enunciado' ) && kinds.has( 'perdida' ), 'enunciado y semántica perdida' );

        for (const mode of ['chen', 'relational', 'tables']) {
            const nodes = buildDiagramScene( domain.setDiagramMode( model, mode ) ).nodes;

            for (let first = 0; first < nodes.length; first += 1) {
                for (let second = first + 1; second < nodes.length; second += 1) {
                    assert.equal( boxesOverlap( nodes[first], nodes[second] ), false, `${mode}: ${nodes[first].id} y ${nodes[second].id} se solapan` );
                    }
                }
            }

        assert.match( exportVDX( model ), /<VisioDocument / );
        assert.match( exportAccessVBA( model ), /Public Sub CrearEsquema\(\)/ );
        } );
    }

test( 'Ejercicio del curso: la Lonja sigue la solución del autor', async () => {
    const model = await openExample( 'curso-lonja' );
    const sql = exportSQL( model );

    assert.equal( model.tables.length, 14 );
    assert.deepEqual( primaryNames( tableNamed( model, 'Faena' ) ), ['barco_matricula', 'caladero_nombre', 'especie_cod_especie', 'fecha_inicio'] );
    assert.deepEqual( primaryNames( tableNamed( model, 'Adjudicacion' ) ), ['lote_cod_lote'] );
    assert.deepEqual( primaryNames( tableNamed( model, 'Creditor' ) ), ['Comprador_cod_comprador'] );
    assert.equal( model.conceptual.generalizations[0].subtypeIds.length, 1, 'especialización por predicado: solo Creditor' );
    assert.equal( model.conceptual.generalizations[0].total, false );

    for (const name of ['Incluye', 'Provision']) {
        const table = tableNamed( model, name );

        assert.deepEqual( columnNames( table, table.alternateKeys[0].columns ), ['lote_cod_lote'], `${name}: un lote en una sola factura` );
        }

    assert.deepEqual( tableNamed( model, 'Caladero' ).columns.map( column => column.name ), ['nombre', 'extension', 'latitud', 'longitud'] );
    assert.equal( model.conceptual.relationships.find( item => item.name === 'Faena' ).participations.length, 3, 'la ternaria' );
    assert.match( sql, /"pendiente" NUMERIC\(1\) NOT NULL DEFAULT 0/ );
    assert.match( sql, /CHECK \("pendiente" IN \(0, 1\)\)/ );
    } );

test( 'Ejercicios del curso: recursiva, débil de débil, clave parcial doble y dos especializaciones', async () => {
    const company = await openExample( 'curso-empresa' );
    const employee = tableNamed( company, 'Empleado' );
    const department = tableNamed( company, 'Departamento' );

    assert.ok( employee.columns.some( column => column.name === 'supervisor_dni' && !column.required ) );
    assert.ok( department.columns.some( column => column.name === 'fecha_inicio' ) );
    assert.ok( !department.columns.some( column => column.name === 'num_empleados' ), 'derivado sin almacenar' );

    const estate = await openExample( 'curso-inmobiliaria' );

    assert.deepEqual( primaryNames( tableNamed( estate, 'Pago' ) ), ['anio', 'mes', 'alquiler_numero', 'alquiler_inmueble_codigo'] );
    assert.equal( estate.conceptual.generalizations.find( item => item.subtypeIds.length === 2 ).disjoint, false, 'Persona solapada' );

    const restaurant = await openExample( 'curso-restaurante' );

    assert.deepEqual( primaryNames( tableNamed( restaurant, 'Consumo' ) ), ['fecha', 'turno', 'plato_nombre'] );
    assert.deepEqual( columnNames( tableNamed( restaurant, 'Pinche' ), tableNamed( restaurant, 'Pinche' ).alternateKeys[0].columns ), ['cocinero_Empleado_dni'] );

    const staff = await openExample( 'curso-personal' );

    assert.equal( staff.conceptual.generalizations.length, 2 );
    assert.equal( staff.tables.length, 5 );
    } );
