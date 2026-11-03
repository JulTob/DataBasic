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
import { tableHeight, diagramScene } from '../src/ui/diagram.js';

// A DOM double exercises application events without a browser or a server.
// It does not verify CSS layout, rendering, hit testing or native file dialogs.
async function applicationHarness(
        canvasHeight = 500,
        initialDocument = null,
        canvasRectangle = {},
        storageOptions = {}
        ) {
    const source = await bundleSource( new URL( '../', import.meta.url ) );
    const elements = new Map();
    const listeners = new Map();
    const pendingTimers = new Map();
    let timerId = 0;
    let savedDocument = initialDocument;
    const store = storageOptions.store || new Map();
    const reads = [];
    const writes = [];

    if (initialDocument !== null) {
        store.set( 'databasic.document.v1', initialDocument );
        }

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
                            height: canvasHeight,
                            ...canvasRectangle
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
        URLSearchParams,
        ...(storageOptions.search === undefined
            ? {}
            : {location: {search: storageOptions.search}}),
        console,
        setTimeout: callback => {
            const id = ++timerId;

            pendingTimers.set( id, callback );
            return id;
            },
        clearTimeout: id => pendingTimers.delete( id ),
        lucide: {createIcons() {}},
        idbKeyval: {
            get: async key => {
                reads.push( key );
                savedDocument = storageOptions.read
                    ? await storageOptions.read( key )
                    : store.get( key ) ?? null;
                return savedDocument;
                },
            set: async (key, value) => {
                writes.push( key );
                store.set( key, value );
                savedDocument = value;
                }
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
        store,
        reads,
        writes,
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


for (const viewportWidth of [963, 1280]) {
    test( `Tres altas visibles y conector por IDs a ${viewportWidth}px`, async () => {
        const left = viewportWidth <= 1100 ? 215 : 247;
        const rectangle = {left, top: 200, width: viewportWidth - left - 13, height: 528};
        const app = await applicationHarness( rectangle.height, null, rectangle );

        await app.click({action: 'new'});

        for (let index = 0; index < 3; index += 1) {
            await app.click({action: 'entity'});
            }

        await app.flushTimers();
        const created = JSON.parse( app.saved() );
        const nodes = diagramScene( created ).nodes;
        const transform = app.element( '#viewport' ).attributes.transform.match(
                /translate\(([^,]+),([^\)]+)\) scale\(([^\)]+)\)/
                );
        const view = {x: Number( transform[1] ), y: Number( transform[2] ), zoom: Number( transform[3] )};
        const visible = nodes.map( node => ({
            node,
            left: view.x + node.x * view.zoom,
            top: view.y + node.y * view.zoom,
            right: view.x + (node.x + node.width) * view.zoom,
            bottom: view.y + (node.y + node.height) * view.zoom
            }) );

        assert.equal( view.zoom, 1, 'Crear conserva tipos a escala legible.' );

        for (const card of visible) {
            assert.ok( card.left >= 20, 'El título debe estar dentro del borde izquierdo.' );
            assert.ok( card.right <= rectangle.width - 20, 'La tarjeta debe caber por la derecha.' );
            assert.ok( card.top >= 100, 'El título debe quedar bajo las herramientas.' );
            assert.ok( card.bottom <= rectangle.height - 20, 'La tarjeta debe caber por abajo.' );
            }

        for (let index = 0; index < visible.length; index += 1) {
            for (const other of visible.slice( index + 1 )) {
                const card = visible[index];

                assert.ok(
                        card.right <= other.left || other.right <= card.left
                            || card.bottom <= other.top || other.bottom <= card.top,
                        'Las tarjetas visibles deben poder seleccionarse por separado.'
                        );
                }
            }

        await app.click({action: 'relationship'});

        for (const table of created.tables.slice( 0, 2 )) {
            const card = visible.find( item => item.node.ref.id === table.id );
            const clientX = rectangle.left + (card.left + card.right) / 2;
            const clientY = rectangle.top + card.top + 16;
            const hits = visible.filter(
                    item => clientX >= rectangle.left + item.left
                        && clientX <= rectangle.left + item.right
                        && clientY >= rectangle.top + item.top
                        && clientY <= rectangle.top + item.bottom
                    );

            assert.equal( hits.length, 1, 'Cada punto debe seleccionar una única tarjeta.' );
            assert.equal( hits[0].node.ref.id, table.id );
            app.listeners.get( '#canvas:pointerdown' )({
                button: 0, clientX, clientY, pointerId: 1,
                preventDefault() {},
                target: {
                    closest: selector => selector === '[data-diagram-kind]'
                        ? {dataset: {diagramKind: 'table', diagramId: hits[0].node.ref.id}}
                        : selector === '[data-table-id]'
                            ? {dataset: {tableId: hits[0].node.ref.id}}
                            : null
                    }
                });
            }

        await app.flushTimers();
        const connected = JSON.parse( app.saved() );
        const relation = connected.relationships[0];

        assert.equal( relation.parentId, created.tables[0].id );
        assert.equal( relation.childId, created.tables[1].id );
        assert.notEqual( relation.parentId, relation.childId );

        await app.click({action: 'fit'});
        const overview = app.element( '#viewport' ).attributes.transform;

        await app.click({mode: 'chen'});
        await app.click({mode: 'relational'});
        await app.flushTimers();

        assert.equal( app.element( '#viewport' ).attributes.transform, overview );
        assert.deepEqual(
                JSON.parse( app.saved() ).tables.map( table => ({id: table.id, x: table.x, y: table.y}) ),
                connected.tables.map( table => ({id: table.id, x: table.x, y: table.y}) )
                );
        } );
    }

test( 'Al recuperar el legado se enfoca la primera tarjeta a escala 100%', async () => {
    const initial = exampleDocument();
    const app = await applicationHarness( 528, JSON.stringify( initial ), {width: 735, left: 215} );
    const transform = app.element( '#viewport' ).attributes.transform.match(
            /translate\(([^,]+),([^\)]+)\) scale\(([^\)]+)\)/
            );
    const first = diagramScene( initial ).nodes[0];

    assert.equal( Number( transform[3] ), 1 );
    assert.equal( Number( transform[1] ) + first.x, 20 );
    assert.equal( Number( transform[2] ) + first.y, 100 );
    } );


test( 'Sin práctica conserva exactamente la clave legacy, incluso con otros parámetros', async () => {
    const main = emptyDocument();

    main.name = 'Ejercicio principal';

    for (const search of [undefined, '', '?otra=opcion']) {
        const options = search === undefined ? {} : {search};
        const app = await applicationHarness( 500, JSON.stringify( main ), {}, options );

        assert.deepEqual( app.reads, ['databasic.document.v1'] );
        assert.equal( app.element( '#document-name' ).textContent, main.name );
        assert.doesNotMatch( app.element( '#save-status' ).textContent, /independiente/ );

        await app.click({action: 'entity'});
        await app.flushTimers();

        assert.deepEqual( app.writes, ['databasic.document.v1'] );
        assert.equal( app.store.size, 1 );
        }
    } );

test( 'Dos prácticas comparten almacén sin leer ni sobrescribir el ejercicio principal', async () => {
    const main = emptyDocument();

    main.name = 'Trabajo de Julio';
    const original = JSON.stringify( main );
    const store = new Map( [['databasic.document.v1', original]] );
    const firstOptions = {store, search: '?practica=revision-uno'};
    const secondOptions = {store, search: '?practica=revision-dos'};
    const first = await applicationHarness( 500, null, {}, firstOptions );
    const second = await applicationHarness( 500, null, {}, secondOptions );

    assert.deepEqual( first.reads, ['databasic.document.v1.practica.revision-uno'] );
    assert.deepEqual( second.reads, ['databasic.document.v1.practica.revision-dos'] );
    assert.notEqual( first.element( '#document-name' ).textContent, main.name );
    assert.notEqual( second.element( '#document-name' ).textContent, main.name );

    for (const app of [first, second]) {
        assert.match( app.element( '#save-status' ).textContent, /Práctica independiente/ );
        assert.doesNotMatch( app.element( '#save-status' ).textContent, /revision-uno|revision-dos/ );
        await app.click({action: 'new'});
        await app.click({action: 'entity'});
        }

    await second.click({action: 'entity'});
    await first.flushTimers();
    await second.flushTimers();

    assert.equal( store.get( 'databasic.document.v1' ), original );
    assert.deepEqual( first.writes, ['databasic.document.v1.practica.revision-uno'] );
    assert.deepEqual( second.writes, ['databasic.document.v1.practica.revision-dos'] );

    const firstReload = await applicationHarness( 500, null, {}, firstOptions );
    const secondReload = await applicationHarness( 500, null, {}, secondOptions );

    assert.equal( JSON.parse( firstReload.saved() ).tables.length, 1 );
    assert.equal( JSON.parse( secondReload.saved() ).tables.length, 2 );
    assert.match( firstReload.element( '#save-status' ).textContent, /recuperado/ );
    assert.match( secondReload.element( '#save-status' ).textContent, /recuperado/ );
    assert.equal( store.get( 'databasic.document.v1' ), original );
    } );

test( 'Una práctica inválida no cae sobre la clave principal', async () => {
    const original = JSON.stringify( emptyDocument() );
    const store = new Map( [['databasic.document.v1', original]] );

    for (const search of ['?practica=', '?practica=../principal', `?practica=${'x'.repeat( 65 )}`]) {
        const app = await applicationHarness( 500, null, {}, {store, search} );

        await app.click({action: 'entity'});
        await app.flushTimers();

        assert.deepEqual( app.reads, [] );
        assert.deepEqual( app.writes, [] );
        assert.match( app.element( '#save-status' ).textContent, /Práctica independiente/ );
        assert.equal( store.size, 1 );
        assert.equal( store.get( 'databasic.document.v1' ), original );
        }
    } );


test( 'La recuperación inicial diferida conserva un JSON abierto manualmente', async () => {
    const old = exampleDocument();

    old.name = 'Guardado anterior';
    let resolveRead;
    const delayedRead = new Promise( resolve => { resolveRead = resolve; } );
    const app = await applicationHarness(
            500,
            null,
            {},
            {read: () => delayedRead}
            );
    const imported = addConceptualEntity( emptyDocument(), {name: 'Entidad importada'} );

    imported.name = 'Abierto desde archivo';
    const contents = JSON.stringify( imported );

    await app.listeners.get( '#open-file:change' )({target: {
        files: [{size: contents.length, text: async () => contents}],
        value: 'ejercicio.databasic.json'
        }});

    assert.equal( app.element( '#document-name' ).textContent, imported.name );
    assert.match( app.element( '#viewport' ).innerHTML, /Entidad importada/ );

    resolveRead( JSON.stringify( old ) );
    await delayedRead;

    for (let index = 0; index < 4; index += 1) {
        await Promise.resolve();
        }

    assert.match(
            app.element( '#save-status' ).textContent,
            /Ejercicio recuperado/,
            'La lectura diferida debe terminar antes de comprobar el documento activo.'
            );
    assert.equal( app.element( '#document-name' ).textContent, imported.name );
    assert.match( app.element( '#viewport' ).innerHTML, /Entidad importada/ );
    assert.doesNotMatch( app.element( '#viewport' ).innerHTML, /Socio/ );

    await app.flushTimers();
    assert.deepEqual( JSON.parse( app.saved() ), imported );
    } );
