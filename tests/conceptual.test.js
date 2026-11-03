import test from 'node:test';
import assert from 'node:assert/strict';
import * as domain from '../src/domain/model.js';
import {
    parseDocument,
    serializeDocument
    } from '../src/domain/serialization.js';
import { exportSQL } from '../src/io/sql.js';

function nativeFixture( count = 2 ) {
    let model = domain.emptyDocument();

    for (let index = 0; index < count; index += 1) {
        model = domain.addConceptualEntity( model, {name: `Entidad${index + 1}`} );
        }

    return model;
    }

function pendingRelation( count = 2 ) {
    const model = nativeFixture( count );

    return domain.addConceptualRelationship( model, {
        name: 'Participa',
        participations: model.conceptual.entities.map(
                entity => ({entityId: entity.id, role: entity.name, min: 0, max: null})
                )
        });
    }

function materializeAssociation(
        model,
        attributeIds = []
        ) {
    const relation = model.conceptual.relationships[0];

    return domain.updateConceptualRelationship( model, relation.id, {
        translation: {
            kind: 'association',
            tableName: 'Asociacion',
            key: {
                participationIds: relation.participations.map( part => part.id ),
                attributeIds
                }
            }
        });
    }

test( 'La ruta id/id crea una FK distinta y conserva cardinalidad efectiva muchos', () => {
    let model = domain.addTable( domain.addTable( domain.emptyDocument() ) );

    model = domain.addRelationship( model, model.tables[0].id, model.tables[1].id );

    const child = model.tables[1];
    const foreignId = model.relationships[0].mappings[0].childColumnId;

    assert.notEqual( foreignId, child.columns.find( field => field.primary ).id );
    assert.equal( domain.hasUniqueColumns( child, [foreignId] ), false );
    assert.deepEqual( domain.validateDocument( model ), [] );
    assert.equal( child.columns[0].type, 'NUMBER' );
    } );

test( 'La validación distingue FK única de FK que sólo es parte de PK compuesta', () => {
    let model = domain.addTable( domain.addTable( domain.emptyDocument() ) );

    model = domain.addRelationship( model, model.tables[0].id, model.tables[1].id );
    const fieldId = model.relationships[0].mappings[0].childColumnId;

    model = domain.updateRelationship( model, model.relationships[0].id, {optional: false} );
    model = domain.updateColumn( model, model.tables[1].id, fieldId, {primary: true} );

    assert.equal( domain.validateDocument( model ).some(
            issue => issue.message.includes( 'limita a un hijo' )
            ), false );

    model = domain.setAlternateKey( model, model.tables[1].id, {
        name: 'AK_padre', columns: [fieldId]
        });

    assert.ok( domain.validateDocument( model ).some(
            issue => issue.level === 'warning' && issue.message.includes( 'limita a un hijo' )
            ) );
    } );

test( 'IDs y estructura no pueden editarse mediante parches de propiedades', () => {
    const model = domain.addTable( domain.addTable( domain.emptyDocument() ) );
    const snapshot = serializeDocument( model );

    assert.throws(
            () => domain.updateTable( model, model.tables[0].id, {id: model.tables[1].id} ),
            /no se puede editar/
            );
    assert.throws(
            () => domain.updateColumn( model, model.tables[0].id, model.tables[0].columns[0].id, {id: 'otro'} ),
            /no se puede editar/
            );
    assert.equal( serializeDocument( model ), snapshot );
    } );

test( 'v1 se conserva como general v2 sin inferir entidades ni asociaciones nativas', () => {
    const model = domain.exampleDocument();

    model.version = 1;
    delete model.profile;
    delete model.conceptual;
    delete model.traces;
    delete model.presentation;
    delete model.display.mode;
    delete model.display.notation;
    model.tables[0].columns[1].type = 'TEXT';

    const restored = parseDocument( JSON.stringify( model ) );

    assert.equal( restored.version, 2 );
    assert.equal( restored.profile, 'general' );
    assert.deepEqual( restored.tables, model.tables );
    assert.deepEqual( restored.relationships, model.relationships );
    assert.equal( restored.conceptual.entities.length, 0 );
    assert.equal( domain.getConceptualProjection( restored ).entities.length, 3 );
    assert.throws( () => domain.setModelProfile( restored, 'course' ), /perfil del curso/ );
    } );

test( 'N:N nativa admite atributo pendiente, clave explícita, SQL y JSON', () => {
    let model = pendingRelation();
    const relation = model.conceptual.relationships[0];

    assert.throws( () => exportSQL( model ), /pendiente/ );

    model = domain.addConceptualAttribute( model, {
        ownerKind: 'relationship', ownerId: relation.id,
        name: 'fecha', type: 'DATE', required: true
        });
    model = materializeAssociation( model );

    assert.equal( model.tables.length, 3 );
    assert.equal( model.relationships.length, 2 );
    assert.ok( model.tables.at( -1 ).columns.some( field => field.name === 'fecha' ) );
    assert.match( exportSQL( model ), /CREATE TABLE "Asociacion"/ );
    assert.equal( domain.getConceptualProjection( model ).entities.length, 2 );
    assert.deepEqual( parseDocument( serializeDocument( model ) ), model );
    } );

test( 'Una ternaria conserva tres roles y período dentro de su clave elegida', () => {
    let model = pendingRelation( 3 );

    model = domain.addConceptualAttribute( model, {
        ownerKind: 'relationship', ownerId: model.conceptual.relationships[0].id,
        name: 'periodo', type: 'DATE'
        });

    const periodId = model.conceptual.attributes.at( -1 ).id;

    model = materializeAssociation( model, [periodId] );

    assert.equal( model.relationships.length, 3 );
    assert.equal( model.tables.at( -1 ).columns.filter( field => field.primary ).length, 4 );
    assert.match( exportSQL( model ), /PRIMARY KEY \([^\n]+"periodo"\)/ );
    assert.equal( model.conceptual.relationships[0].participations.length, 3 );
    assert.deepEqual( parseDocument( serializeDocument( model ) ), model );
    } );

test( 'N:N nueva puede usar tablas proyectadas de un documento general sin duplicarlas', () => {
    let model = domain.addTable( domain.addTable( domain.emptyDocument( 'general' ) ) );
    const oldTables = structuredClone( model.tables );

    model = domain.addConceptualRelationship( model, {
        name: 'Nueva',
        participations: model.tables.map(
                (table, index) => ({entityId: table.id, role: `rol${index}`, min: 0, max: null})
                )
        });
    model = materializeAssociation( model );

    assert.deepEqual( model.tables.slice( 0, 2 ), oldTables );
    assert.equal( model.tables.length, 3 );
    assert.match( exportSQL( model ), /INTEGER/ );
    } );

test( 'Participaciones recursivas tienen IDs y roles propios y rechazo atómico', () => {
    let model = nativeFixture( 1 );
    const entityId = model.conceptual.entities[0].id;

    model = domain.addConceptualRelationship( model, {
        name: 'Enlaza',
        participations: [
            {entityId, role: 'origen', min: 0, max: null},
            {entityId, role: 'destino', min: 0, max: null}
            ]
        });
    model = materializeAssociation( model );

    const relation = model.conceptual.relationships[0];
    const snapshot = serializeDocument( model );

    assert.notEqual( relation.participations[0].id, relation.participations[1].id );
    assert.equal( new Set( model.tables.at( -1 ).columns.map( field => field.name ) ).size, 2 );
    assert.throws(
            () => domain.updateConceptualParticipation( model, relation.id, relation.participations[0].id, {min: -1} ),
            /mínimo/
            );
    assert.equal( serializeDocument( model ), snapshot );
    } );

test( 'Proyección Chen expresa min/max en la rama de la entidad correcta', () => {
    let model = domain.addTable( domain.addTable( domain.emptyDocument() ) );

    model = domain.addRelationship( model, model.tables[0].id, model.tables[1].id );
    const parts = domain.getConceptualProjection( model ).relationships[0].participations;

    assert.deepEqual( [parts[0].entityId, parts[0].min, parts[0].max], [model.tables[0].id, 0, null] );
    assert.deepEqual( [parts[1].entityId, parts[1].min, parts[1].max], [model.tables[1].id, 0, 1] );
    } );

test( 'Diez alternancias conservan IDs, SQL, semántica y posiciones independientes', () => {
    let model = materializeAssociation( pendingRelation() );
    const entityId = model.conceptual.entities[0].id;

    model = domain.moveDiagramElement( model, entityId, {x: 500, y: 600}, 'chen' );
    const original = structuredClone( model );
    const sql = exportSQL( model );

    for (let index = 0; index < 10; index += 1) {
        model = domain.setDiagramMode( model, index % 2 === 0 ? 'chen' : 'relational' );
        }

    assert.deepEqual( model, original );
    assert.equal( exportSQL( model ), sql );
    assert.deepEqual( model.presentation.chen[entityId], {x: 500, y: 600} );
    assert.notEqual( model.tables[0].x, 500 );
    } );

test( 'Mover el rótulo FK conserva semántica, SQL y posición Chen al guardar', () => {
    let model = domain.exampleDocument();
    const relationId = model.relationships[0].id;

    model = domain.moveDiagramElement( model, relationId, {x: 300, y: 400}, 'chen' );
    const before = serializeDocument( model );
    const sql = exportSQL( model );
    let moved = domain.moveDiagramElement( model, relationId, {x: 900, y: 650} );

    for (const property of ['tables', 'relationships', 'conceptual', 'traces']) {
        assert.deepEqual( moved[property], model[property] );
        }

    assert.deepEqual( moved.presentation.chen, model.presentation.chen );
    assert.deepEqual( moved.presentation.relational[relationId], {x: 900, y: 650} );
    assert.equal( exportSQL( moved ), sql );
    assert.equal( serializeDocument( model ), before );

    moved = domain.setDiagramMode( moved, 'chen' );
    moved = domain.setDiagramMode( moved, 'relational' );

    assert.deepEqual( parseDocument( serializeDocument( moved ) ), moved );
    assert.deepEqual( moved.presentation.chen[relationId], {x: 300, y: 400} );
    assert.deepEqual( moved.presentation.relational[relationId], {x: 900, y: 650} );
    } );

test( 'Un formato 2 anterior sin posiciones relacionales se abre y puede mover una FK', () => {
    const old = domain.exampleDocument();

    delete old.presentation.relational;
    const restored = parseDocument( JSON.stringify( old ) );

    assert.deepEqual( restored, old );
    const relationId = restored.relationships[0].id;
    const moved = domain.moveDiagramElement( restored, relationId, {x: 120, y: 240} );

    assert.equal( moved.version, 2 );
    assert.deepEqual( moved.presentation.relational[relationId], {x: 120, y: 240} );
    assert.deepEqual( parseDocument( serializeDocument( moved ) ), moved );
    } );

test( 'Mover exige coordenadas válidas y referencia existente sin mutar el original', () => {
    const model = domain.exampleDocument();
    const before = serializeDocument( model );
    const ids = [model.tables[0].id, model.relationships[0].id];

    for (const id of ids) {
        for (const position of [
            null,
            {x: -1, y: 0},
            {x: 0, y: 20001},
            {x: Infinity, y: 0},
            {x: 0, y: NaN}
            ]) {
            assert.throws(
                    () => domain.moveDiagramElement( model, id, position ),
                    /coordenadas entre 0 y 20000/
                    );
            assert.equal( serializeDocument( model ), before );
            }
        }

    assert.throws(
            () => domain.moveDiagramElement( model, 'missing', {x: 0, y: 0} ),
            /no existe/
            );
    assert.throws(
            () => domain.moveDiagramElement( model, ids[0], {x: 0, y: 0}, 'missing' ),
            /Representación del diagrama no válida/
            );
    assert.equal( serializeDocument( model ), before );
    } );

test( 'JSON rechaza posiciones relacionales inválidas en lugar de descartarlas', () => {
    const model = domain.exampleDocument();
    const relationId = model.relationships[0].id;

    for (const positions of [
        null,
        [],
        'invalid',
        {missing: {x: 10, y: 20}},
        {[model.tables[0].id]: {x: 10, y: 20}},
        {[relationId]: {x: -10, y: 20}},
        {[relationId]: {x: 10, y: 20001}}
        ]) {
        const copy = structuredClone( model );

        copy.presentation.relational = positions;
        const contents = JSON.stringify( copy );

        assert.throws( () => parseDocument( contents ), /relacional/ );
        assert.equal( JSON.stringify( copy ), contents );
        }
    } );

test( 'Borrar FK o tabla retira sus posiciones sin perder las de otros elementos', () => {
    let model = domain.exampleDocument();
    const table = model.tables[0];
    const affected = model.relationships.filter(
            relation => relation.parentId === table.id || relation.childId === table.id
            );
    const affectedIds = new Set( affected.map( relation => relation.id ) );
    const retained = model.tables.find( item => item.id !== table.id );

    for (const relation of model.relationships) {
        model = domain.moveDiagramElement( model, relation.id, {x: 400, y: 500} );
        model = domain.moveDiagramElement( model, relation.id, {x: 700, y: 800}, 'chen' );
        }

    for (const item of [table, ...table.columns, retained]) {
        model = domain.moveDiagramElement( model, item.id, {x: 100, y: 200}, 'chen' );
        }

    const removedFK = domain.removeElement( model, affected[0].id );

    assert.equal( removedFK.presentation.relational[affected[0].id], undefined );
    assert.equal( removedFK.presentation.chen[affected[0].id], undefined );
    assert.deepEqual( removedFK.presentation.chen[table.columns[0].id], {x: 100, y: 200} );

    const removedTable = domain.removeElement( model, table.id );

    for (const item of [table, ...table.columns, ...affected]) {
        assert.equal( removedTable.presentation.chen[item.id], undefined );
        assert.equal( removedTable.presentation.relational[item.id], undefined );
        }

    for (const relation of model.relationships.filter( item => !affectedIds.has( item.id ) )) {
        assert.deepEqual( removedTable.presentation.relational[relation.id], {x: 400, y: 500} );
        assert.deepEqual( removedTable.presentation.chen[relation.id], {x: 700, y: 800} );
        }

    assert.deepEqual( removedTable.presentation.chen[retained.id], {x: 100, y: 200} );
    assert.deepEqual( parseDocument( serializeDocument( removedFK ) ), removedFK );
    assert.deepEqual( parseDocument( serializeDocument( removedTable ) ), removedTable );
    } );

test( 'Borrar una asociación materializada limpia posiciones físicas y conserva entidades', () => {
    let model = materializeAssociation( pendingRelation() );
    const relation = model.conceptual.relationships[0];
    const association = model.tables.at( -1 );
    const retainedEntity = model.conceptual.entities[0];

    for (const item of [relation, ...relation.participations, association, ...association.columns]) {
        model = domain.moveDiagramElement( model, item.id, {x: 100, y: 200}, 'chen' );
        }

    model = domain.moveDiagramElement( model, retainedEntity.id, {x: 600, y: 700}, 'chen' );

    for (const foreignKey of model.relationships) {
        model = domain.moveDiagramElement( model, foreignKey.id, {x: 800, y: 900} );
        model = domain.moveDiagramElement( model, foreignKey.id, {x: 300, y: 400}, 'chen' );
        }

    const retainedPositions = Object.fromEntries(
            model.conceptual.entities.map(
                    entity => [entity.id, model.presentation.chen[entity.id]]
                    )
            );
    const removed = domain.removeConceptualElement( model, relation.id );

    assert.deepEqual( removed.presentation.relational, {} );
    assert.deepEqual( removed.presentation.chen, retainedPositions );
    assert.deepEqual( parseDocument( serializeDocument( removed ) ), removed );
    } );

test( 'Borrar una columna proyectada retira sólo su posición Chen', () => {
    let model = domain.addTable( domain.emptyDocument() );
    const tableId = model.tables[0].id;

    model = domain.addColumn( model, tableId );
    const fieldId = model.tables[0].columns.at( -1 ).id;

    model = domain.moveDiagramElement( model, tableId, {x: 600, y: 700}, 'chen' );
    model = domain.moveDiagramElement( model, fieldId, {x: 300, y: 400}, 'chen' );
    const removed = domain.removeColumn( model, tableId, fieldId );

    assert.deepEqual( removed.presentation.chen, {[tableId]: {x: 600, y: 700}} );
    assert.deepEqual( parseDocument( serializeDocument( removed ) ), removed );
    } );

test( 'Ediciones simples comparten origen desde Chen y columna sin romper FKs', () => {
    let model = materializeAssociation( pendingRelation() );
    const attribute = model.conceptual.attributes[0];
    const columnTrace = model.traces.find( trace => trace.sourceId === attribute.id );
    const table = model.tables.find( item => item.columns.some( field => field.id === columnTrace.targetId ) );

    model = domain.updateConceptualAttribute( model, attribute.id, {name: 'codigo', type: 'NUMBER(10)'} );
    model = domain.updateColumn( model, table.id, columnTrace.targetId, {notes: 'Identificador del negocio', type: 'NUMBER(12)'} );

    assert.equal( model.conceptual.attributes[0].type, 'NUMBER(12)' );
    assert.equal( model.conceptual.attributes[0].notes, 'Identificador del negocio' );
    assert.equal( model.tables[0].columns[0].name, 'codigo' );
    assert.ok( model.tables.at( -1 ).columns.some( field => field.type === 'NUMBER(12)' ) );
    assert.deepEqual( parseDocument( serializeDocument( model ) ), model );
    assert.throws( () => domain.addColumn( model, model.tables.at( -1 ).id ), /origen Chen/ );
    assert.throws( () => domain.updateRelationship( model, model.relationships[0].id, {optional: true} ), /origen Chen/ );
    } );

test( 'Entidad débil usa clave parcial y vínculo identificador elegidos explícitamente', () => {
    let model = nativeFixture( 1 );
    const ownerId = model.conceptual.entities[0].id;

    model = domain.addConceptualEntity( model, {name: 'Dependiente', weak: true, ownerEntityId: ownerId} );
    const childId = model.conceptual.entities[1].id;

    model = domain.addConceptualRelationship( model, {
        name: 'Identifica',
        participations: [
            {entityId: ownerId, role: 'propietario', min: 0, max: null},
            {entityId: childId, role: 'dependiente', min: 1, max: 1}
            ]
        });
    const relation = model.conceptual.relationships[0];

    model = domain.updateConceptualRelationship( model, relation.id, {
        translation: {kind: 'foreign-key', childParticipationId: relation.participations[1].id, identifying: true}
        });
    model = domain.updateConceptualEntity( model, childId, {
        translation: {kind: 'weak', relationshipId: relation.id}
        });

    assert.equal( model.tables[1].columns.filter( field => field.primary ).length, 2 );
    assert.equal( domain.isIdentifierDependent( model, model.tables[1].id ), true );
    assert.doesNotThrow( () => exportSQL( model ) );
    assert.deepEqual( parseDocument( serializeDocument( model ) ), model );
    } );

test( 'Compuesto con flatten explícito y derivado omitido conservan semántica', () => {
    let model = nativeFixture( 1 );
    const ownerId = model.conceptual.entities[0].id;

    model = domain.addConceptualAttribute( model, {
        ownerKind: 'entity', ownerId, name: 'direccion', structure: 'composite',
        translation: {kind: 'flatten'}
        });
    const parentId = model.conceptual.attributes.at( -1 ).id;

    model = domain.addConceptualAttribute( model, {
        ownerKind: 'entity', ownerId, name: 'calle', parentAttributeId: parentId
        });
    model = domain.addConceptualAttribute( model, {
        ownerKind: 'entity', ownerId, name: 'edad', type: 'NUMBER', derived: true,
        derivation: 'Años completos desde nacimiento', translation: {kind: 'omit'}
        });

    const sql = exportSQL( model );

    assert.match( sql, /"calle" VARCHAR/ );
    assert.doesNotMatch( sql, /"direccion"|"edad"/ );
    assert.deepEqual( parseDocument( serializeDocument( model ) ), model );
    } );

test( 'Multivaluados y generalización se guardan pendientes y no simulan SQL completo', () => {
    let model = nativeFixture();
    const [parent, child] = model.conceptual.entities;

    model = domain.addConceptualAttribute( model, {
        ownerKind: 'entity', ownerId: parent.id, name: 'telefonos', multivalued: true
        });
    model = domain.addConceptualGeneralization( model, {
        supertypeId: parent.id, subtypeIds: [child.id], disjoint: true, total: true
        });

    assert.throws( () => exportSQL( model ), /multivaluado/ );
    const restored = parseDocument( serializeDocument( model ) );

    assert.equal( restored.conceptual.generalizations[0].total, true );
    assert.equal( restored.conceptual.generalizations[0].disjoint, true );
    } );

test( 'Dominios y claves alternativas conservan obligaciones y exportan SQL', () => {
    let model = domain.addTable( domain.emptyDocument() );

    model = domain.addColumn( model, model.tables[0].id );
    const tableId = model.tables[0].id;
    const fieldId = model.tables[0].columns[1].id;

    model = domain.updateColumn( model, tableId, fieldId, {
        name: 'codigo', type: 'CHAR(3)',
        domain: {minimum: null, maximum: null, values: ['A', "B'C"], check: ''}
        });
    model = domain.setAlternateKey( model, tableId, {name: 'AK_codigo', columns: [fieldId]} );

    assert.equal( model.tables[0].columns[1].required, true );
    assert.match( exportSQL( model ), /CONSTRAINT "AK_codigo" UNIQUE \("codigo"\)/ );
    assert.match( exportSQL( model ), /IN \('A', 'B''C'\)/ );
    assert.deepEqual( parseDocument( serializeDocument( model ) ), model );
    } );

test( 'Borrar una relación nativa elimina su materialización en una transacción', () => {
    const model = materializeAssociation( pendingRelation() );
    const relationId = model.conceptual.relationships[0].id;
    const removed = domain.removeConceptualElement( model, relationId );

    assert.equal( model.tables.length, 3 );
    assert.equal( removed.tables.length, 2 );
    assert.equal( removed.relationships.length, 0 );
    assert.equal( removed.conceptual.relationships.length, 0 );
    assert.deepEqual( parseDocument( serializeDocument( removed ) ), removed );
    } );

test( 'JSON rechaza referencias e identidad conceptual inválidas', () => {
    const model = materializeAssociation( pendingRelation() );

    for (const corrupt of [
        copy => { copy.conceptual.attributes[0].ownerId = 'missing'; },
        copy => { copy.conceptual.entities[1].id = copy.conceptual.entities[0].id; },
        copy => { copy.traces[0].targetId = 'missing'; },
        copy => { copy.conceptual.relationships[0].participations[0].max = -1; },
        copy => { copy.conceptual.relationships[0].translation.key.attributeIds = ['missing']; },
        copy => { copy.conceptual.relationships[0].translation = null; },
        copy => { copy.tables.at( -1 ).columns[0].primary = false; }
        ]) {
        const copy = structuredClone( model );

        corrupt( copy );
        assert.throws( () => parseDocument( JSON.stringify( copy ) ) );
        assert.ok( domain.validateDocument( copy ).some( issue => issue.level === 'error' ) );
        }
    } );

test( 'La materialización rechaza una clave ausente sin mutar la relación pendiente', () => {
    const model = pendingRelation( 3 );
    const relation = model.conceptual.relationships[0];
    const snapshot = serializeDocument( model );

    assert.throws(
            () => domain.updateConceptualRelationship( model, relation.id, {
                translation: {
                    kind: 'association', tableName: 'Incompleta',
                    key: {participationIds: [], attributeIds: []}
                    }
                }),
            /Elige la clave/
            );
    assert.equal( serializeDocument( model ), snapshot );
    assert.deepEqual( parseDocument( snapshot ), model );
    } );

test( 'Cambiar la clave de asociación conserva identidades de tablas, columnas y FKs', () => {
    let model = materializeAssociation( pendingRelation( 3 ) );
    const tableIds = model.tables.map( table => table.id );
    const foreignIds = model.relationships.map( foreignKey => foreignKey.id );

    model = domain.addConceptualAttribute( model, {
        ownerKind: 'relationship', ownerId: model.conceptual.relationships[0].id,
        name: 'periodo', type: 'DATE'
        });
    const attributeId = model.conceptual.attributes.at( -1 ).id;
    const columnIds = model.tables.at( -1 ).columns.map( field => field.id );

    model = materializeAssociation( model, [attributeId] );

    assert.deepEqual( model.tables.map( table => table.id ), tableIds );
    assert.deepEqual( model.relationships.map( foreignKey => foreignKey.id ), foreignIds );
    assert.deepEqual( model.tables.at( -1 ).columns.map( field => field.id ), columnIds );
    assert.equal( model.tables.at( -1 ).columns.filter( field => field.primary ).length, 4 );
    assert.deepEqual( parseDocument( serializeDocument( model ) ), model );
    } );

test( 'La letra de cardinalidad se deduce en binarias y se elige en ternarias', () => {
    const binary = pendingRelation( 2 );
    const relation = binary.conceptual.relationships[0];

    assert.equal( domain.participationCardinalityLetter( relation, relation.participations[0] ), 'N' );
    assert.equal( relation.participations[0].cardinality, null );

    const limited = domain.updateConceptualParticipation(
            binary,
            relation.id,
            relation.participations[1].id,
            {max: 1}
            );
    const updated = limited.conceptual.relationships[0];

    // The letter on a branch is the maximum of the other branch.
    assert.equal( domain.participationCardinalityLetter( updated, updated.participations[0] ), '1' );
    assert.equal( domain.participationCardinalityLetter( updated, updated.participations[1] ), 'N' );

    const ternary = pendingRelation( 3 );
    const three = ternary.conceptual.relationships[0];

    assert.equal( domain.participationCardinalityLetter( three, three.participations[0] ), 'N' );

    const chosen = domain.updateConceptualParticipation(
            ternary,
            three.id,
            three.participations[0].id,
            {cardinality: '1'}
            );
    const chosenRelation = chosen.conceptual.relationships[0];

    assert.equal( chosenRelation.participations[0].cardinality, '1' );
    assert.equal( domain.participationCardinalityLetter( chosenRelation, chosenRelation.participations[0] ), '1' );
    assert.throws(
            () => domain.updateConceptualParticipation( ternary, three.id, three.participations[0].id, {cardinality: 'M'} ),
            /1 o N/
            );
    assert.equal( ternary.conceptual.relationships[0].participations[0].cardinality, null );

    const cleared = domain.updateConceptualParticipation(
            chosen,
            three.id,
            three.participations[0].id,
            {cardinality: ''}
            );

    assert.equal( cleared.conceptual.relationships[0].participations[0].cardinality, null );
    assert.deepEqual( parseDocument( serializeDocument( chosen ) ), chosen );

    const broken = structuredClone( chosen );

    broken.conceptual.relationships[0].participations[0].cardinality = 'M';
    assert.throws( () => parseDocument( JSON.stringify( broken ) ), /letra de cardinalidad/ );
    } );

test( 'Un formato 2 anterior sin letras abre y deduce la letra automática', () => {
    const legacy = JSON.parse( serializeDocument( pendingRelation( 2 ) ) );

    for (const part of legacy.conceptual.relationships[0].participations) {
        delete part.cardinality;
        }

    const opened = parseDocument( JSON.stringify( legacy ) );
    const relation = opened.conceptual.relationships[0];

    assert.equal( relation.participations[0].cardinality, undefined );
    assert.equal( domain.participationCardinalityLetter( relation, relation.participations[0] ), 'N' );
    } );

test( 'El vínculo identificador se reconoce por la débil o por la FK identificadora', () => {
    let model = nativeFixture( 1 );
    const ownerId = model.conceptual.entities[0].id;

    model = domain.addConceptualEntity( model, {name: 'Pago', weak: true, ownerEntityId: ownerId} );

    const childId = model.conceptual.entities[1].id;

    model = domain.addConceptualRelationship( model, {
        name: 'Realiza',
        participations: [
            {entityId: ownerId, role: 'pagador', min: 0, max: null},
            {entityId: childId, role: 'abono', min: 1, max: 1}
            ]
        });

    const relation = model.conceptual.relationships[0];

    assert.equal( domain.isIdentifyingLink( model, relation.id ), false );

    const identifying = domain.updateConceptualRelationship( model, relation.id, {
        translation: {kind: 'foreign-key', childParticipationId: relation.participations[1].id, identifying: true}
        });

    assert.equal( domain.isIdentifyingLink( identifying, relation.id ), true );

    const declared = domain.updateConceptualEntity( model, childId, {
        translation: {kind: 'weak', relationshipId: relation.id}
        });

    assert.equal( domain.isIdentifyingLink( declared, relation.id ), true );
    assert.equal( domain.isIdentifyingLink( pendingRelation( 2 ), pendingRelation( 2 ).conceptual.relationships[0].id ), false );
    } );
