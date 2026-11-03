import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import { exampleDocument } from '../src/domain/model.js';
import { tableHeight } from '../src/ui/diagram.js';

// A DOM double exercises application events without a browser or a server.
// It does not verify CSS layout, rendering, hit testing or native file dialogs.
async function applicationHarness( canvasHeight = 500 ) {
    const modules = [
        'domain/model.js',
        'domain/serialization.js',
        'io/sql.js',
        'ui/html.js',
        'ui/diagram.js',
        'ui/properties.js',
        'ui/layout.js',
        'ui/dialogs.js',
        'app.js'
        ];
    const parts = [];

    for (const path of modules) {
        const source = await readFile( new URL( `../src/${path}`, import.meta.url ), 'utf8' );

        parts.push(
                source.replace( /^import\s+[\s\S]*?\s+from\s+['"][^'"]+['"];\s*/gm, '' )
                    .replace( /^export\s+/gm, '' )
                );
        }

    const elements = new Map();
    const listeners = new Map();
    const pendingTimers = new Map();
    let timerId = 0;
    let savedDocument = null;

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

    runInNewContext( `(() => {${parts.join( '\n' )}\n})();`, context );
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
