import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as domain from '../src/domain/model.js';
import {
    parseDocument,
    serializeDocument
    } from '../src/domain/serialization.js';
import { exportSQL } from '../src/io/sql.js';

function fixture(
        count = 1,
        composite = false
        ) {
    let model = domain.emptyDocument();

    for (let index = 0; index < count; index += 1) {
        model = domain.addConceptualEntity( model, {name: `Entidad${index}`} );

        if (composite) {
            model = domain.addConceptualAttribute(
                    model,
                    {
                        ownerId: model.conceptual.entities.at( -1 ).id,
                        name: 'sede',
                        type: 'CHAR(3)',
                        primary: true
                        }
                    );
            }
        }

    return model;
    }

function tableFor(
        model,
        sourceId
        ) {
    const trace = model.traces.find(
            item => item.sourceId === sourceId && item.targetKind === 'table'
            );

    return model.tables.find( item => item.id === trace?.targetId );
    }

function materializedMultivalue(
        composite = false
        ) {
    let model = fixture( 1, true );

    model = domain.addConceptualAttribute(
            model,
            {
                ownerId: model.conceptual.entities[0].id,
                name: 'contactos',
                multivalued: true,
                structure: composite ? 'composite' : 'simple'
                }
            );
    const attributeId = model.conceptual.attributes.at( -1 ).id;

    if (composite) {
        for (const name of ['prefijo', 'numero']) {
            model = domain.addConceptualAttribute(
                    model,
                    {
                        ownerId: model.conceptual.entities[0].id,
                        name,
                        parentAttributeId: attributeId
                        }
                    );
            }
        }

    return domain.updateConceptualAttribute(
            model,
            attributeId,
            {translation: {kind: 'multivalued-table', tableName: 'Contactos'}}
            );
    }

function hierarchy(
        disjoint = true,
        total = false
        ) {
    let model = fixture( 1, true );

    model = domain.addConceptualEntity( model, {name: 'Subclase', withIdentifier: false} );
    model = domain.addConceptualGeneralization(
            model,
            {
                supertypeId: model.conceptual.entities[0].id,
                subtypeIds: [model.conceptual.entities[1].id],
                disjoint,
                total,
                translation: {kind: 'class-tables'}
                }
            );

    return model;
    }

function ternary(
        context = true,
        recursive = false
        ) {
    let model = fixture( recursive ? 2 : 3, true );
    const entities = model.conceptual.entities;
    const participants = recursive ? [entities[0], entities[0], entities[1]] : entities;

    model = domain.addConceptualRelationship(
            model,
            {
                name: 'Observa',
                participations: participants.map(
                        (entity, index) => ({
                            entityId: entity.id,
                            role: `rol${index}`,
                            min: 0,
                            max: index === 0 ? 1 : null,
                            cardinality: index === 0 ? 'one' : 'many'
                            })
                        )
                }
            );
    const relation = model.conceptual.relationships[0];

    model = domain.addConceptualAttribute(
            model,
            {
                ownerKind: 'relationship',
                ownerId: relation.id,
                name: 'periodo',
                type: 'DATE',
                required: true
                }
            );
    const period = model.conceptual.attributes.at( -1 ).id;

    return domain.updateConceptualRelationship(
            model,
            relation.id,
            {
                translation: {
                    kind: 'association',
                    tableName: 'Observaciones',
                    key: {
                        participationIds: relation.participations.map( part => part.id ),
                        attributeIds: [period]
                        },
                    cardinalityContextAttributeIds: context ? [period] : null
                    }
                }
            );
    }

function assertRejectedJSON(
        model,
        mutations
        ) {
    for (const mutate of mutations) {
        const corrupt = structuredClone( model );

        mutate( corrupt );
        assert.ok( domain.validateDocument( corrupt ).some( issue => issue.level === 'error' ) );
        assert.throws( () => parseDocument( JSON.stringify( corrupt ) ) );
        }
    }

for (const composite of [false, true]) {
    test( `Multivaluado ${composite ? 'compuesto' : 'simple'} conserva PK/FK completas e identidad`, () => {
        let model = materializedMultivalue( composite );
        const attribute = model.conceptual.attributes.find( item => item.multivalued );
        const auxiliary = tableFor( model, attribute.id );
        const owner = tableFor( model, attribute.ownerId );
        const foreignKey = model.relationships[0];

        assert.equal( owner.columns.length, 2 );
        assert.equal( auxiliary.columns.length, composite ? 4 : 3 );
        assert.ok( auxiliary.columns.every( field => field.primary && field.required ) );
        assert.equal( foreignKey.mappings.length, 2 );
        assert.equal( foreignKey.identifying, true );
        assert.equal( foreignKey.optional, false );
        const initial = serializeDocument( model );

        model = domain.updateConceptualAttribute( model, attribute.id, {translation: attribute.translation} );
        assert.equal( serializeDocument( model ), initial );

        model = domain.updateConceptualEntity( model, attribute.ownerId, {name: 'Propietaria'} );
        model = domain.updateConceptualAttribute( model, attribute.id, {name: 'Contactos elegidos'} );
        const value = composite
            ? model.conceptual.attributes.find( item => item.parentAttributeId === attribute.id )
            : model.conceptual.attributes.find( item => item.id === attribute.id );

        model = domain.updateConceptualAttribute( model, value.id, {type: 'VARCHAR(80)', notes: 'Elegido'} );
        assert.equal( tableFor( model, attribute.id ).id, auxiliary.id );
        assert.deepEqual( tableFor( model, attribute.id ).columns.map( field => field.id ), auxiliary.columns.map( field => field.id ) );
        assert.deepEqual( parseDocument( serializeDocument( model ) ), model );
        assert.match( exportSQL( model ), /PRIMARY KEY \("Propietaria_id", "Propietaria_sede"/ );
        assert.equal( domain.conceptualStatus( model ).some( issue => issue.code === 'pending' ), false );
        } );
    }

test( 'Transición escalar retira su copia; una referencia externa rechaza sin mutar', () => {
    let model = fixture();
    const owner = model.conceptual.entities[0];

    model = domain.addConceptualAttribute( model, {ownerId: owner.id, name: 'telefono'} );
    const attribute = model.conceptual.attributes.at( -1 );
    const changed = domain.updateConceptualAttribute(
            model,
            attribute.id,
            {multivalued: true, translation: null}
            );

    assert.equal( tableFor( changed, owner.id ).columns.some( field => field.name === 'telefono' ), false );
    assert.throws( () => exportSQL( changed ), /multivaluado pendiente/ );
    const field = tableFor( model, owner.id ).columns.find( item => item.name === 'telefono' );

    model = domain.setAlternateKey(
            model,
            tableFor( model, owner.id ).id,
            {name: 'AK_telefono', columns: [field.id]}
            );
    const before = serializeDocument( model );

    assert.throws(
            () => domain.updateConceptualAttribute( model, attribute.id, {multivalued: true, translation: null} ),
            /claves y referencias/
            );
    assert.equal( serializeDocument( model ), before );
    } );

test( 'Multivaluados adulterados rechazan columnas, PK, FK y trazas divergentes', () => {
    const model = materializedMultivalue( true );
    const source = model.conceptual.attributes.find( item => item.multivalued );
    const auxiliary = tableFor( model, source.id );

    assertRejectedJSON( model, [
        copy => { copy.relationships = []; },
        copy => { copy.traces = copy.traces.filter( trace => trace.sourceId !== source.id ); },
        copy => { copy.tables.find( item => item.id === auxiliary.id ).columns[0].primary = false; },
        copy => { copy.tables.find( item => item.id === auxiliary.id ).columns[0].type = 'DATE'; },
        copy => { copy.tables.find( item => item.id === auxiliary.id ).columns.push( domain.column( 'extra' ) ); },
        copy => { copy.traces.push( {...copy.traces.find( trace => trace.sourceId === source.id )} ); },
        copy => {
            const table = copy.tables.find( item => item.id === auxiliary.id );
            const value = table.columns.pop();

            copy.tables[0].columns.push( value );
            }
        ] );
    } );

test( 'Borrar multivaluado compuesto elimina su auxiliar y hojas, preserva propietaria', () => {
    let model = materializedMultivalue( true );
    const source = model.conceptual.attributes.find( item => item.multivalued );
    const owner = tableFor( model, source.ownerId );

    model = domain.removeConceptualElement( model, source.id );
    assert.equal( model.tables.length, 1 );
    assert.equal( model.tables[0].id, owner.id );
    assert.equal( model.relationships.length, 0 );
    assert.equal( model.conceptual.attributes.some( item => item.parentAttributeId === source.id ), false );
    assert.deepEqual( parseDocument( serializeDocument( model ) ), model );
    } );

for (const disjoint of [false, true]) {
    for (const total of [false, true]) {
        test( `Tablas de clases ${disjoint}/${total} heredan PK compuesta y explican residuos`, () => {
            let model = hierarchy( disjoint, total );
            const source = model.conceptual.generalizations[0];
            const foreignKey = model.relationships[0];
            const child = tableFor( model, source.subtypeIds[0] );

            assert.equal( child.columns.length, 2 );
            assert.ok( child.columns.every( field => field.primary && field.required ) );
            assert.equal( foreignKey.mappings.length, 2 );
            assert.equal( foreignKey.identifying, true );
            assert.equal( foreignKey.optional, false );
            const initial = serializeDocument( model );

            const {id, ...unchanged} = source;

            model = domain.updateConceptualGeneralization( model, id, unchanged );
            assert.equal( serializeDocument( model ), initial );
            const sql = exportSQL( model );

            assert.equal( /no imponen la exclusión/.test( sql ), disjoint, 'only a disjoint hierarchy loses exclusion' );
            assert.equal( /la cobertura/.test( sql ), total, 'only a total hierarchy loses coverage' );
            assert.deepEqual( parseDocument( serializeDocument( model ) ), model );
            } );
        }
    }

test( 'PK local exige resolución expresa y conserva su columna', () => {
    let model = fixture( 2 );
    const [parent, child] = model.conceptual.entities;

    model = domain.addConceptualGeneralization( model, {supertypeId: parent.id, subtypeIds: [child.id]} );
    const source = model.conceptual.generalizations[0];
    const initial = serializeDocument( model );

    assert.throws(
            () => domain.updateConceptualGeneralization( model, source.id, {translation: {kind: 'class-tables'}} ),
            /resuelve explícitamente su PK local/
            );
    assert.equal( serializeDocument( model ), initial );
    const local = model.conceptual.attributes.find( item => item.ownerId === child.id );
    const fieldId = tableFor( model, child.id ).columns[0].id;

    model = domain.updateConceptualAttribute( model, local.id, {primary: false} );
    model = domain.updateConceptualGeneralization( model, source.id, {translation: {kind: 'class-tables'}} );
    const retained = tableFor( model, child.id ).columns.find( field => field.id === fieldId );

    assert.equal( retained.name, 'id' );
    assert.equal( retained.primary, false );
    assert.equal( tableFor( model, child.id ).columns.filter( field => field.primary ).length, 1 );
    } );

test( 'Herencia multinivel conserva IDs al renombrar y rechaza retiradas referenciadas', () => {
    let model = hierarchy();
    const source = model.conceptual.generalizations[0];
    const first = model.conceptual.entities[0];
    const second = model.conceptual.entities[1];

    model = domain.addConceptualEntity( model, {name: 'Nieto', withIdentifier: false} );
    model = domain.addConceptualGeneralization(
            model,
            {
                supertypeId: second.id,
                subtypeIds: [model.conceptual.entities[2].id],
                translation: {kind: 'class-tables'}
                }
            );
    const ids = model.relationships.map( item => item.mappings.map( pair => pair.childColumnId ) );

    model = domain.updateConceptualEntity( model, first.id, {name: 'Base'} );
    const key = model.conceptual.attributes.find( item => item.ownerId === first.id && item.primary );

    model = domain.updateConceptualAttribute( model, key.id, {type: 'NUMBER(8)'} );
    assert.deepEqual( model.relationships.map( item => item.mappings.map( pair => pair.childColumnId ) ), ids );
    assert.equal( tableFor( model, model.conceptual.entities[2].id ).columns[0].type, 'NUMBER(8)' );
    const before = serializeDocument( model );

    assert.throws( () => domain.removeConceptualElement( model, source.id ), /referencias externas/ );
    assert.equal( serializeDocument( model ), before );
    } );

test( 'Borrar jerarquía preserva entidades, atributos propios y permite reabrir', () => {
    let model = hierarchy();
    const source = model.conceptual.generalizations[0];
    const child = model.conceptual.entities[1];

    model = domain.addConceptualAttribute( model, {ownerId: child.id, name: 'especialidad'} );
    const ownField = tableFor( model, child.id ).columns.find( field => field.name === 'especialidad' );

    model = domain.removeConceptualElement( model, source.id );
    assert.equal( model.tables.length, 2 );
    assert.equal( model.conceptual.entities.length, 2 );
    assert.equal( model.relationships.length, 0 );
    assert.deepEqual( tableFor( model, child.id ).columns, [ownField] );
    assert.deepEqual( parseDocument( serializeDocument( model ) ), model );
    } );

test( 'Jerarquías vacías, cíclicas o con estrategia desconocida se rechazan atómicamente', () => {
    let model = fixture( 3 );
    const [a, b, c] = model.conceptual.entities;

    for (const definition of [
        {supertypeId: a.id, subtypeIds: []},
        {supertypeId: a.id, subtypeIds: [b.id], translation: {kind: 'invented'}}
        ]) {
        const before = serializeDocument( model );

        assert.throws( () => domain.addConceptualGeneralization( model, definition ) );
        assert.equal( serializeDocument( model ), before );
        }

    model = domain.addConceptualGeneralization( model, {supertypeId: a.id, subtypeIds: [b.id]} );
    model = domain.addConceptualGeneralization( model, {supertypeId: b.id, subtypeIds: [c.id]} );
    const before = serializeDocument( model );

    assert.throws( () => domain.addConceptualGeneralization( model, {supertypeId: c.id, subtypeIds: [a.id]} ), /ciclos/ );
    assert.equal( serializeDocument( model ), before );
    assertRejectedJSON( model, [
        copy => { copy.conceptual.generalizations[0].translation = {kind: 'invented'}; },
        copy => { copy.conceptual.generalizations[0].subtypeIds = []; }
        ] );
    } );

test( 'Trazas de entidad ajena y herencia adulterada se rechazan antes de abrir', () => {
    const model = hierarchy();
    const source = model.conceptual.generalizations[0];

    assertRejectedJSON( model, [
        copy => { copy.traces[0].targetId = copy.tables[1].id; },
        copy => { copy.relationships = []; },
        copy => { copy.traces = copy.traces.filter( trace => trace.sourceId !== source.id ); },
        copy => { copy.tables[1].columns[0].primary = false; },
        copy => { copy.tables[1].columns[0].type = 'DATE'; },
        copy => { copy.conceptual.generalizations[0].translation = null; }
        ] );
    } );

test( 'Ternaria separa unicidad de otros roles, contexto temporal y máximo absoluto', () => {
    let model = ternary();
    const relation = model.conceptual.relationships[0];
    const table = tableFor( model, relation.id );
    const selected = relation.participations[0];
    const ownTrace = model.traces.find(
            trace => trace.sourceId === selected.id && trace.targetKind === 'foreign-key'
            );
    const own = model.relationships.find( item => item.id === ownTrace.targetId );
    const ownColumns = own.mappings.map( pair => pair.childColumnId );
    const key = table.alternateKeys[0];

    assert.equal( key.columns.length, 5 );
    assert.ok( ownColumns.every( id => !key.columns.includes( id ) ) );
    assert.equal( own.cardinality, 'zero-one' );
    const sql = exportSQL( model );

    assert.match( sql, /UNIQUE \("rol1_id", "rol1_sede", "rol2_id", "rol2_sede", "periodo"\)/ );
    assert.match( sql, /UNIQUE \("rol0_id", "rol0_sede"\)/ );
    const before = serializeDocument( model );

    model = domain.updateConceptualRelationship( model, relation.id, {translation: relation.translation} );
    assert.equal( serializeDocument( model ), before );
    assert.deepEqual( parseDocument( before ), model );
    } );

test( 'Contexto global y temporal son decisiones diferentes; cardinalidad no se deduce de PK', () => {
    let model = ternary();
    const relation = model.conceptual.relationships[0];

    model = domain.updateConceptualRelationship(
            model,
            relation.id,
            {translation: {...relation.translation, cardinalityContextAttributeIds: []}}
            );
    assert.equal( tableFor( model, relation.id ).alternateKeys[0].columns.length, 4 );
    assert.match( exportSQL( model ), /UNIQUE \("rol1_id", "rol1_sede", "rol2_id", "rol2_sede"\)/ );
    } );

test( 'Dos ramas one y roles recursivos conservan FKs completas distinguibles', () => {
    let model = ternary( true, true );
    const relation = model.conceptual.relationships[0];

    model = domain.updateConceptualParticipation(
            model,
            relation.id,
            relation.participations[1].id,
            {cardinality: 'one'}
            );
    const table = tableFor( model, relation.id );

    assert.equal( table.alternateKeys.length, 2 );
    assert.ok( table.alternateKeys.every( key => key.columns.length === 5 ) );
    assert.notDeepEqual( table.alternateKeys[0].columns, table.alternateKeys[1].columns );
    model = domain.updateConceptualParticipation(
            model,
            relation.id,
            relation.participations[0].id,
            {cardinality: 'many'}
            );
    assert.equal( tableFor( model, relation.id ).alternateKeys.length, 1 );
    assert.deepEqual( parseDocument( serializeDocument( model ) ), model );
    } );

test( 'Decisión ternaria incompleta es pendiente; legacy sin campos conserva SQL válido', () => {
    let model = ternary( false );

    assert.equal( tableFor( model, model.conceptual.relationships[0].id ).alternateKeys?.length || 0, 0 );
    assert.throws( () => exportSQL( model ), /contexto global o temporal/ );
    model = parseDocument( serializeDocument( model ) );
    const relation = model.conceptual.relationships[0];

    relation.participations.forEach( part => { delete part.cardinality; } );
    delete relation.translation.cardinalityContextAttributeIds;
    const legacy = parseDocument( JSON.stringify( model ) );

    assert.match( exportSQL( legacy ), /cardinalidad por combinación desconocida/ );
    assert.equal( domain.conceptualStatus( legacy ).some( issue => issue.code === 'pending' ), false );
    } );

test( 'Contextos ajenos, opcionales, duplicados y AK adulteradas se rechazan', () => {
    const model = ternary();
    const relation = model.conceptual.relationships[0];
    const contextId = relation.translation.cardinalityContextAttributeIds[0];
    const before = serializeDocument( model );

    for (const context of [['missing'], [contextId, contextId], [model.conceptual.attributes[0].id]]) {
        assert.throws( () => domain.updateConceptualRelationship(
                model,
                relation.id,
                {translation: {...relation.translation, cardinalityContextAttributeIds: context}}
                ) );
        assert.equal( serializeDocument( model ), before );
        }
    assertRejectedJSON( model, [
        copy => { tableFor( copy, relation.id ).alternateKeys[0].columns.pop(); },
        copy => { tableFor( copy, relation.id ).alternateKeys = []; },
        copy => { copy.traces = copy.traces.filter( trace => trace.targetKind !== 'alternate-key' ); },
        copy => { copy.conceptual.attributes.find( item => item.id === contextId ).required = false; },
        copy => { copy.conceptual.relationships[0].participations[0].cardinality = 'bogus'; }
        ] );
    } );

test( 'La proyección nativa no inventa atributos a partir de PK/FK generadas', () => {
    for (const model of [hierarchy(), materializedMultivalue( true ), ternary()]) {
        const projection = domain.getConceptualProjection( model );

        assert.deepEqual( projection.attributes, model.conceptual.attributes );
        assert.deepEqual( projection.relationships, model.conceptual.relationships );
        assert.deepEqual( projection.entities, model.conceptual.entities );
        }
    } );

test( 'Borrado con AK consumidora y edición física de clave heredada se rechazan', () => {
    let model = hierarchy();
    const source = model.conceptual.generalizations[0];
    const child = tableFor( model, source.subtypeIds[0] );

    assert.throws(
            () => domain.updateColumn( model, child.id, child.columns[0].id, {name: 'otra'} ),
            /origen Chen/
            );
    model = domain.setAlternateKey(
            model,
            child.id,
            {name: 'AK_consumidora', columns: child.columns.map( field => field.id )}
            );
    const before = serializeDocument( model );

    assert.throws( () => domain.removeConceptualElement( model, source.id ), /AK_consumidora/ );
    assert.equal( serializeDocument( model ), before );
    } );

test( 'FK binaria nativa no reaparece como atributo proyectado; FK legada se conserva', () => {
    let model = fixture( 2 );

    model = domain.addConceptualRelationship(
            model,
            {
                name: 'Coordina',
                participations: model.conceptual.entities.map(
                        (entity, index) => ({entityId: entity.id, min: 1, max: index === 1 ? 1 : null})
                        )
                }
            );
    const relation = model.conceptual.relationships[0];

    model = domain.updateConceptualRelationship(
            model,
            relation.id,
            {
                translation: {
                    kind: 'foreign-key',
                    childParticipationId: relation.participations[1].id
                    }
                }
            );
    assert.deepEqual( domain.getConceptualProjection( model ).attributes, model.conceptual.attributes );
    const legacy = domain.exampleDocument();

    assert.equal(
            domain.getConceptualProjection( legacy ).attributes.length,
            legacy.tables.reduce( (total, table) => total + table.columns.length, 0 )
            );
    } );


function referentialPolicyFixture( kind ) {
    if (kind === 'auxiliary') {
        return materializedMultivalue();
        }
    if (kind === 'inheritance') {
        return hierarchy();
        }

    return parseDocument( readFileSync(
            new URL( '../examples/00-nucleo/proyecto.databasic.json', import.meta.url ),
            'utf8'
            ) );
    }

function replayPolicySource(
        model,
        kind
        ) {
    if (kind === 'auxiliary') {
        const source = model.conceptual.attributes.find( item => item.multivalued );

        return domain.updateConceptualAttribute(
                model,
                source.id,
                {translation: source.translation}
                );
        }
    if (kind === 'inheritance') {
        const source = model.conceptual.generalizations[0];

        return domain.updateConceptualGeneralization(
                model,
                source.id,
                {translation: source.translation}
                );
        }

    const source = model.conceptual.relationships[0];

    return domain.updateConceptualRelationship(
            model,
            source.id,
            {translation: source.translation}
            );
    }

for (const kind of ['native', 'auxiliary', 'inheritance']) {
    test( `Acciones referenciales ${kind}: replay, renombre, JSON y SQL conservan política`, () => {
        let model = referentialPolicyFixture( kind );
        const foreignKeyId = model.relationships[0].id;
        const traces = structuredClone( model.traces );
        const mappings = structuredClone( model.relationships[0].mappings );

        model = domain.updateRelationship(
                model,
                foreignKeyId,
                {onDelete: 'CASCADE', onUpdate: 'CASCADE'}
                );
        model = replayPolicySource( model, kind );
        model = domain.updateConceptualEntity(
                model,
                model.conceptual.entities[0].id,
                {name: 'OrigenRenombrado'}
                );
        model = parseDocument( serializeDocument( model ) );
        const foreignKey = model.relationships.find( item => item.id === foreignKeyId );

        assert.equal( foreignKey.onDelete, 'CASCADE' );
        assert.equal( foreignKey.onUpdate, 'CASCADE' );
        assert.deepEqual( foreignKey.mappings, mappings );
        assert.deepEqual( model.traces, traces );
        assert.match( exportSQL( model ), /ON DELETE CASCADE/ );
        assert.match( exportSQL( model ), /ON UPDATE CASCADE/ );

        model = domain.updateRelationship( model, foreignKeyId, {onDelete: 'NO ACTION'} );
        model = replayPolicySource( model, kind );
        assert.equal( model.relationships.find( item => item.id === foreignKeyId ).onDelete, 'NO ACTION' );
        assert.equal( model.relationships.find( item => item.id === foreignKeyId ).onUpdate, 'CASCADE' );
        assert.match( exportSQL( parseDocument( serializeDocument( model ) ) ), /ON DELETE NO ACTION/ );
        } );

    test( `Acciones referenciales ${kind}: política inválida o estructura rechazan sin mutar`, () => {
        const model = referentialPolicyFixture( kind );
        const foreignKey = model.relationships[0];
        const before = serializeDocument( model );

        for (const patch of [
            {onDelete: 'SET NULL'},
            {onUpdate: 'SET NULL'},
            {onDelete: 'SET DEFAULT'},
            {onDelete: 'UNKNOWN'},
            {optional: true},
            {onDelete: 'CASCADE', optional: false}
            ]) {
            assert.throws( () => domain.updateRelationship( model, foreignKey.id, patch ) );
            assert.equal( serializeDocument( model ), before );
            }

        if (kind === 'native') {
            assert.throws(
                    () => domain.updateRelationship( model, foreignKey.id, {optional: true} ),
                    new RegExp( model.conceptual.relationships[0].id )
                    );
            }
        } );
    }

test( 'Acciones dentro de translation se rechazan con ruta explícita a la FK concreta', () => {
    for (const kind of ['native', 'auxiliary', 'inheritance']) {
        const model = referentialPolicyFixture( kind );
        const source = kind === 'auxiliary'
            ? model.conceptual.attributes.find( item => item.multivalued )
            : kind === 'inheritance'
                ? model.conceptual.generalizations[0]
                : model.conceptual.relationships[0];
        const setter = kind === 'auxiliary'
            ? domain.updateConceptualAttribute
            : kind === 'inheritance'
                ? domain.updateConceptualGeneralization
                : domain.updateConceptualRelationship;
        const before = serializeDocument( model );

        for (const action of ['onDelete', 'onUpdate']) {
            assert.throws(
                    () => setter(
                            model,
                            source.id,
                            {translation: {...source.translation, [action]: 'CASCADE'}}
                            ),
                    /FK concreta.*translation/
                    );
            const corrupt = structuredClone( model );
            const collection = kind === 'auxiliary' ? 'attributes'
                : kind === 'inheritance' ? 'generalizations' : 'relationships';

            corrupt.conceptual[collection].find( item => item.id === source.id ).translation[action] = 'CASCADE';
            assert.throws( () => parseDocument( JSON.stringify( corrupt ) ), /FK concreta.*translation/ );
            assert.equal( serializeDocument( model ), before );
            }
        }
    } );
