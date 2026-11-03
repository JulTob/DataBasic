import test from 'node:test';
import assert from 'node:assert/strict';
import { bundleSource } from '../scripts/bundle.mjs';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import {
    exampleDocument,
    emptyDocument,
    addConceptualEntity,
    addConceptualRelationship,
    setDiagramMode
    } from '../src/domain/model.js';
import { tableHeight } from '../src/ui/diagram.js';

// A DOM double exercises application events without a browser or a server.
// It does not verify CSS layout, rendering, hit testing or native file dialogs.
async function applicationHarness( canvasHeight = 500, initialDocument = null ) {
    const source = await bundleSource( new URL( '../', import.meta.url ) );
    const elements = new Map();
    const listeners = new Map();
    const pendingTimers = new Map();
    let timerId = 0;
    let savedDocument = initialDocument;

    function element( selector ) {
        if (!elements.has( selector )) {
            elements.set(
                    selector,
                    {
                        innerHTML: '',
                        textContent: '',
                        value: '',
                        hidden: false,
                        open: false,
                        attributes: {},
                        classList: {
                            add() {},
                            remove() {},
                            toggle() {}
                            },
                        style: {setProperty() {}},
                        setAttribute(
                                name,
                                value
                                ) {
                            this.attributes[name] = value;
                            },
                        removeAttribute() {},
                        append() {},
                        remove() {},
                        click() {},
                        showModal() { this.open = true; },
                        close() { this.open = false; },
                        getBoundingClientRect: () => ({
                            left: 0,
                            top: 0,
                            width: 1000,
                            height: canvasHeight
                            }),
                        addEventListener: (name, callback) => listeners.set( `${selector}:${name}`, callback ),
                        querySelector: query => element( `${selector} ${query}` ),
                        closest: () => null,
                        setPointerCapture() {},
                        hasPointerCapture: () => false
                        }
                    );
            }

        return elements.get( selector );
        }

    const document = {
        querySelector: element,
        querySelectorAll: () => [],
        addEventListener: (name, callback) => listeners.set( `document:${name}`, callback ),
        createElement: () => element( 'download' ),
        body: {append() {}},
        activeElement: null
        };
    const context = {
        document,
        FormData: class {
            constructor( form ) {
                this.values = form.values;
                }
            get( key ) {
                const value = this.values[key];

                return Array.isArray( value ) ? value[0] ?? null : value ?? null;
                }
            getAll( key ) {
                const value = this.values[key];

                return value === undefined ? [] : Array.isArray( value ) ? value : [value];
                }
            has( key ) {
                return Object.hasOwn( this.values, key );
                }
            },
        window: {addEventListener() {}, print() {}},
        crypto: webcrypto,
        performance,
        structuredClone,
        Blob,
        URL,
        console,
        setTimeout: callback => {
            const id = ++timerId;

            pendingTimers.set( id, callback );
            return id;
            },
        clearTimeout: id => pendingTimers.delete( id ),
        lucide: {createIcons() {}},
        idbKeyval: {
            get: async () => savedDocument,
            set: async (key, value) => { savedDocument = value; }
            }
        };

    runInNewContext( source, context );
    await Promise.resolve();
    await Promise.resolve();

    async function click( dataset ) {
        const button = {dataset, disabled: false, setAttribute() {}};

        listeners.get( 'document:click' )({target: {closest: () => button}});
        await Promise.resolve();
        }

    return {
        element,
        listeners,
        click,
        saved: () => savedDocument,
        change: (dataset, value, type = 'select-one') => {
            listeners.get( 'document:change' )({target: {
                dataset, value, type,
                checked: type === 'checkbox' && value,
                closest: () => null
                }});
            },
        submit: (values, expectedError = null) => {
            element( '#dialog #dialog-error' ).textContent = '';
            element( '#dialog form' ).onsubmit({
                preventDefault() {},
                currentTarget: {values}
                });

            const message = element( '#dialog #dialog-error' ).textContent;

            if (expectedError) {
                assert.match( message, expectedError );
                }
            else {
                assert.equal( message, '', message );
                }
            },
        flushTimers: async () => {
            const callbacks = [...pendingTimers.values()];

            pendingTimers.clear();

            for (const callback of callbacks) {
                await callback();
                }
            }
        };
    }

test( 'La aplicación arranca y permite crear, editar, deshacer, rehacer y guardar', async () => {
    const app = await applicationHarness();

    assert.match( app.element( '#model-count' ).textContent, /^3 tablas/ );
    assert.match( app.element( '#viewport' ).innerHTML, /Socio/ );

    await app.click({action: 'entity'});

    assert.match( app.element( '#model-count' ).textContent, /^4 tablas/ );

    await app.click({category: 'columns'});
    await app.click({action: 'add-column'});

    assert.match( app.element( '#properties-body' ).innerHTML, /columna1/ );

    await app.click({action: 'undo'});

    assert.ok( !app.element( '#viewport' ).innerHTML.includes( 'columna1' ) );

    await app.click({action: 'redo'});
    await app.flushTimers();

    const saved = JSON.parse( app.saved() );

    assert.equal( saved.tables.length, 4 );
    assert.equal( saved.tables.at( -1 ).columns.length, 2 );
    assert.match( app.element( '#save-status' ).textContent, /Guardado/ );
    } );

test(
        'Ajustar el dibujo deja visibles las tablas bajo la barra flotante',
        async () => {
            const height = 260;
            const app = await applicationHarness( height );

            await app.click({action: 'fit'});

            const transform = app.element( '#viewport' ).attributes.transform;
            const match = transform.match(
                    /translate\(([^,]+),([^\)]+)\) scale\(([^\)]+)\)/
                    );

            assert.ok(
                    match,
                    'El lienzo debe tener una transformación visible.'
                    );

            const offsetY = Number( match[2] );
            const zoom = Number( match[3] );

            for (const table of exampleDocument().tables) {
                const top = offsetY + table.y * zoom;
                const bottom = top + tableHeight( table ) * zoom;

                assert.ok(
                        top >= 76,
                        'Una tabla no debe quedar detrás de las herramientas.'
                        );
                assert.ok(
                        bottom <= height,
                        'Una tabla no debe quedar bajo el borde del lienzo.'
                        );
                }
            }
        );

test( 'La selección del lienzo permite crear una relación y abrir sus propiedades', async () => {
    const app = await applicationHarness();

    await app.click({action: 'entity'});
    await app.click({action: 'relationship'});

    const tableIds = [...app.element( '#viewport' ).innerHTML.matchAll( /data-table-id="([^"]+)"/g )]
        .map( match => match[1] );

    for (const id of [tableIds[0], tableIds.at( -1 )]) {
        app.listeners.get( '#canvas:pointerdown' )({
            button: 0,
            clientX: 300,
            clientY: 100,
            pointerId: 1,
            preventDefault() {},
            target: {
                closest: selector => selector === '[data-table-id]'
                    ? {dataset: {tableId: id}}
                    : null
                }
            });
        }

    assert.match( app.element( '#model-count' ).textContent, /3 relaciones/ );
    assert.match( app.element( '#properties-body' ).innerHTML, /Columna secundaria/ );

    await app.click({category: 'misc'});

    assert.match( app.element( '#properties-body' ).innerHTML, /Exactamente uno/ );
    } );

test( 'Las opciones del documento y la vista de SQL abren las ventanas correctas', async () => {
    const app = await applicationHarness();

    await app.click({action: 'display'});

    assert.equal( app.element( '#dialog' ).open, true );
    assert.match( app.element( '#dialog' ).innerHTML, /Opciones del documento/ );
    assert.match( app.element( '#dialog' ).innerHTML, /Patas de cuervo/ );

    await app.click({action: 'close-dialog'});
    await app.click({action: 'sql'});

    assert.match( app.element( '#dialog' ).innerHTML, /CREATE TABLE/ );
    assert.match( app.element( '#dialog' ).innerHTML, /FOREIGN KEY/ );
    } );


test( 'El arranque conserva escala legible y tres altas no se superponen', async () => {
    const app = await applicationHarness();

    assert.match( app.element( '#viewport' ).attributes.transform, /scale\(1\)/ );

    for (let index = 0; index < 3; index += 1) {
        await app.click({action: 'entity'});
        }

    await app.flushTimers();
    const added = JSON.parse( app.saved() ).tables.slice( -3 );

    assert.equal( new Set( added.map( table => `${table.x},${table.y}` ) ).size, 3 );
    } );

test( 'Opciones del documento conserva modo y notación como texto', async () => {
    const app = await applicationHarness();

    await app.click({mode: 'chen'});
    await app.click({action: 'display'});
    app.submit({
        names: 'physical',
        notation: 'idef1x',
        types: 'on',
        keys: 'on',
        required: 'on',
        grid: 'on'
        });
    await app.flushTimers();

    const saved = JSON.parse( app.saved() );

    assert.equal( saved.display.mode, 'chen' );
    assert.equal( saved.display.notation, 'idef1x' );
    assert.equal( typeof saved.display.types, 'boolean' );
    } );

test( 'Chen edita N:N entre tablas existentes y materializa una clave elegida', async () => {
    const original = exampleDocument();
    const app = await applicationHarness( 500, JSON.stringify( original ) );

    await app.click({mode: 'chen'});
    await app.click({action: 'conceptual-relationship'});
    app.submit({
        name: 'Lectura', degree: '2',
        entity0: original.tables[0].id, role0: 'lector', min0: '0', max0: 'N',
        entity1: original.tables[2].id, role1: 'obra', min1: '0', max1: 'N'
        });
    await app.flushTimers();

    let saved = JSON.parse( app.saved() );
    const relation = saved.conceptual.relationships.at( -1 );

    assert.equal( saved.tables.length, original.tables.length );
    assert.equal( relation.translation, null );
    assert.match( app.element( '#properties-body' ).innerHTML, /Participaciones, roles/ );

    await app.click({action: 'conceptual-attribute'});
    app.submit({
        owner: `relationship:${relation.id}`,
        name: 'periodo', typeFamily: 'DATE', structure: 'simple',
        parentAttributeId: '', derivation: '', defaultValue: '', notes: ''
        });
    await app.flushTimers();
    saved = JSON.parse( app.saved() );
    const attribute = saved.conceptual.attributes.at( -1 );

    await app.click({select: relation.id});
    await app.click({action: 'materialize'});
    app.submit({
        translationKind: 'association', tableName: 'Lectura',
        participationIds: relation.participations.map( part => part.id ),
        attributeIds: [attribute.id]
        });
    await app.flushTimers();
    const materialized = JSON.parse( app.saved() );

    assert.equal( materialized.tables.length, original.tables.length + 1 );
    assert.equal( materialized.tables.at( -1 ).name, 'Lectura' );
    assert.equal( materialized.conceptual.relationships.at( -1 ).translation.key.attributeIds[0], attribute.id );

    for (let index = 0; index < 10; index += 1) {
        await app.click({mode: index % 2 ? 'chen' : 'relational'});
        }

    await app.flushTimers();
    const alternated = JSON.parse( app.saved() );

    assert.deepEqual( alternated.tables, materialized.tables );
    assert.deepEqual( alternated.conceptual, materialized.conceptual );
    assert.deepEqual( alternated.traces, materialized.traces );
    } );


test( 'Las acciones de revisión y especialización abren y aplican el diálogo correcto', async () => {
    const initial = exampleDocument();
    const app = await applicationHarness( 500, JSON.stringify( initial ) );

    await app.click({mode: 'chen'});

    for (const [action, title] of [
        ['validate', 'Comprobación del modelo'],
        ['generalization', 'Generalización / Especialización'],
        ['conceptual-attribute', 'Nuevo atributo conceptual'],
        ['conceptual-relationship', 'Nueva relación conceptual'],
        ['alternate-key', 'Nueva clave alternativa']
        ]) {
        await app.click({action});
        assert.match( app.element( '#dialog' ).innerHTML, new RegExp( title ) );
        await app.click({action: 'close-dialog'});
        }

    await app.click({action: 'alternate-key'});
    app.submit({name: 'AK_Nombre', columns: [initial.tables[0].columns[1].id]});
    await app.flushTimers();
    const keyed = JSON.parse( app.saved() ).tables[0];

    assert.equal( keyed.alternateKeys[0].name, 'AK_Nombre' );
    assert.equal( keyed.columns[1].required, true );

    await app.click({action: 'generalization'});
    app.submit({
        supertypeId: initial.tables[0].id,
        subtypeIds: [initial.tables[2].id],
        disjoint: 'on', total: 'on', notes: 'Jerarquía documental'
        });
    await app.flushTimers();
    const created = JSON.parse( app.saved() ).conceptual.generalizations[0];

    assert.equal( created.total, true );
    assert.equal( created.disjoint, true );

    await app.click({action: 'edit-generalization'});
    assert.match( app.element( '#dialog' ).innerHTML, /Generalización \/ Especialización/ );
    app.submit({
        supertypeId: initial.tables[0].id,
        subtypeIds: [initial.tables[2].id], notes: 'Ahora parcial y solapada'
        });
    await app.flushTimers();

    const updated = JSON.parse( app.saved() ).conceptual.generalizations[0];

    assert.equal( updated.id, created.id );
    assert.equal( updated.total, false );
    assert.equal( updated.disjoint, false );

    await app.click({action: 'entity'});
    await app.flushTimers();
    const native = JSON.parse( app.saved() );

    assert.equal( native.conceptual.entities.length, 1 );
    assert.equal( native.tables.length, initial.tables.length + 1 );
    } );

test( 'Los controles GUI de débil conservan vínculo identificador y clave parcial', async () => {
    let initial = addConceptualEntity( emptyDocument(), {name: 'Hotel'} );
    const owner = initial.conceptual.entities[0].id;

    initial = addConceptualEntity(
            initial,
            {name: 'Habitacion'}
            );
    const dependent = initial.conceptual.entities[1].id;

    initial = addConceptualRelationship( initial, {
        name: 'Identifica',
        participations: [
            {entityId: owner, role: 'hotel', min: 0, max: null},
            {entityId: dependent, role: 'habitacion', min: 1, max: 1}
            ]
        });
    initial = setDiagramMode( initial, 'chen' );
    const relation = initial.conceptual.relationships[0];
    const app = await applicationHarness( 500, JSON.stringify( initial ) );

    await app.click({select: dependent});
    app.change( {field: 'weak'}, true, 'checkbox' );
    app.change( {field: 'ownerEntityId'}, owner );
    const identifier = initial.conceptual.attributes.find( item => item.ownerId === dependent );

    await app.click({select: identifier.id});
    await app.click({action: 'edit-attribute'});
    app.submit({
        name: 'numero', typeFamily: 'NUMBER', structure: 'simple',
        partialKey: 'on', required: 'on', parentAttributeId: '',
        derivation: '', defaultValue: '', notes: ''
        });
    await app.click({select: relation.id});
    await app.click({action: 'materialize'});
    assert.match( app.element( '#dialog' ).innerHTML, /name="identifying"/ );
    app.submit({
        translationKind: 'foreign-key',
        childParticipationId: relation.participations[1].id,
        identifying: 'on'
        });
    await app.click({select: dependent});
    assert.match( app.element( '#properties-body' ).innerHTML, /data-field="weakRelationshipId"/ );
    app.change( {field: 'weakRelationshipId'}, relation.id );
    await app.flushTimers();
    const saved = JSON.parse( app.saved() );

    assert.equal( saved.conceptual.entities[1].translation.kind, 'weak' );
    assert.equal( saved.conceptual.entities[1].translation.relationshipId, relation.id );
    assert.equal( saved.conceptual.relationships[0].translation.identifying, true );
    assert.equal( saved.tables[1].columns.filter( field => field.primary ).length, 2 );
    await app.click({action: 'sql'});
    assert.match( app.element( '#dialog' ).innerHTML, /FOREIGN KEY/ );
    } );

test( 'Compuesto y derivado aplican estrategias GUI y rechazan elección incompatible', async () => {
    const initial = setDiagramMode(
            addConceptualEntity( emptyDocument(), {name: 'Persona'} ),
            'chen'
            );
    const ownerId = initial.conceptual.entities[0].id;
    const app = await applicationHarness( 500, JSON.stringify( initial ) );
    const common = {
        owner: `entity:${ownerId}`, typeFamily: 'NUMBER',
        parentAttributeId: '', derivation: '', defaultValue: '', notes: ''
        };

    await app.click({action: 'conceptual-attribute'});
    app.submit({
        ...common, name: 'direccion', structure: 'composite',
        attributeTranslation: 'flatten'
        });
    await app.flushTimers();
    const composite = JSON.parse( app.saved() ).conceptual.attributes.at( -1 );

    assert.equal( composite.translation.kind, 'flatten' );

    await app.click({action: 'conceptual-attribute'});
    app.submit({
        ...common, name: 'calle', typeFamily: 'VARCHAR', typeLength: '100',
        structure: 'simple', parentAttributeId: composite.id
        });
    await app.click({action: 'conceptual-attribute'});
    app.submit({
        ...common, name: 'edad', structure: 'simple', derived: 'on',
        derivation: 'Años desde nacimiento', attributeTranslation: 'omit'
        });
    await app.flushTimers();
    const before = JSON.parse( app.saved() );
    const derived = before.conceptual.attributes.at( -1 );

    assert.equal( derived.translation.kind, 'omit' );
    assert.ok( !before.tables[0].columns.some( field => field.name === 'edad' ) );

    await app.click({action: 'conceptual-attribute'});
    app.submit({
        ...common, name: 'simple', structure: 'simple', attributeTranslation: 'flatten'
        }, /requiere atributo compuesto/ );
    await app.flushTimers();
    assert.deepEqual( JSON.parse( app.saved() ), before );

    await app.click({select: derived.id});
    await app.click({action: 'edit-attribute'});
    app.submit({
        ...common, name: 'edad', structure: 'simple', derived: 'on',
        derivation: 'Años desde nacimiento', attributeTranslation: 'stored'
        });
    await app.flushTimers();
    const stored = JSON.parse( app.saved() );

    assert.equal( stored.conceptual.attributes.at( -1 ).translation.kind, 'stored' );
    assert.ok( stored.tables[0].columns.some( field => field.name === 'edad' ) );
    } );


test( 'El editor de tipos guarda parámetros, dominio y predeterminado del perfil del curso', async () => {
    const app = await applicationHarness();

    await app.click({action: 'new'});
    await app.click({action: 'entity'});
    await app.click({action: 'add-column'});
    await app.click({action: 'edit-column'});
    app.submit({
        name: 'importe', typeFamily: 'NUMBER', typePrecision: '12', typeScale: '2',
        required: 'on', defaultValue: '0', domainMinimum: '0', domainMaximum: '',
        domainValues: '', domainCheck: '', notes: 'Importe no negativo'
        });
    await app.flushTimers();
    const saved = JSON.parse( app.saved() );
    const field = saved.tables[0].columns.at( -1 );

    assert.equal( saved.profile, 'course' );
    assert.equal( field.type, 'NUMBER(12,2)' );
    assert.equal( field.domain.minimum, 0 );
    assert.equal( field.defaultValue, '0' );

    await app.click({action: 'edit-column'});
    app.submit({
        name: 'importe', typeFamily: 'NUMBER', typePrecision: '', typeScale: '2',
        defaultValue: '0', domainMinimum: '0', notes: ''
        }, /Indica la precisión/ );
    await app.flushTimers();
    assert.deepEqual( JSON.parse( app.saved() ), saved );
    } );

test( 'Una ternaria GUI conserva sus tres roles y el período en la clave elegida', async () => {
    const initial = exampleDocument();
    const app = await applicationHarness( 500, JSON.stringify( initial ) );

    await app.click({mode: 'chen'});
    await app.click({action: 'conceptual-relationship'});
    app.submit({
        name: 'Participa', degree: '3',
        entity0: initial.tables[0].id, role0: 'socio', min0: '0', max0: 'N',
        entity1: initial.tables[1].id, role1: 'prestamo', min1: '0', max1: 'N',
        entity2: initial.tables[2].id, role2: 'libro', min2: '0', max2: 'N'
        });
    await app.flushTimers();
    const relation = JSON.parse( app.saved() ).conceptual.relationships[0];

    await app.click({action: 'conceptual-attribute'});
    app.submit({
        owner: `relationship:${relation.id}`, name: 'periodo', typeFamily: 'DATE',
        structure: 'simple', parentAttributeId: '', derivation: '', defaultValue: '', notes: ''
        });
    await app.flushTimers();
    const period = JSON.parse( app.saved() ).conceptual.attributes.at( -1 );

    await app.click({select: relation.id});
    await app.click({action: 'materialize'});
    app.submit({
        translationKind: 'association', tableName: 'Participa',
        participationIds: relation.participations.map( part => part.id ),
        attributeIds: [period.id]
        });
    await app.flushTimers();
    const saved = JSON.parse( app.saved() );
    const stored = saved.conceptual.relationships[0];

    assert.equal( stored.participations.length, 3 );
    assert.deepEqual( stored.participations.map( part => part.role ), ['socio', 'prestamo', 'libro'] );
    assert.deepEqual( stored.translation.key.attributeIds, [period.id] );
    assert.equal( saved.relationships.length, initial.relationships.length + 3 );
    assert.equal( saved.tables.at( -1 ).columns.filter( field => field.primary ).length, 4 );
    } );
