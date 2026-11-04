import assert from 'node:assert/strict';
import { bundleSource } from '../../scripts/bundle.mjs';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';

// A DOM double exercises application events without a browser or a server.
// It does not verify CSS layout, rendering, hit testing or native file dialogs.
export async function applicationHarness(
        canvasHeight = 500,
        initialDocument = null,
        canvasRectangle = {},
        storageOptions = {}
        ) {
    const source = await bundleSource( new URL( '../../', import.meta.url ) );
    const elements = new Map();
    const listeners = new Map();
    const pendingTimers = new Map();
    let timerId = 0;
    let savedDocument = initialDocument;
    const store = storageOptions.store || new Map();
    const reads = [];
    const writes = [];
    const downloads = [];
    const capturedPointers = new Set();

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
                        setPointerCapture: id => capturedPointers.add( id ),
                        hasPointerCapture: id => capturedPointers.has( id ),
                        releasePointerCapture: id => capturedPointers.delete( id )
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
        URL: {
            createObjectURL: blob => {
                downloads.push( blob );
                return `blob:download-${downloads.length}`;
                },
            revokeObjectURL() {}
            },
        URLSearchParams,
        ...(storageOptions.search === undefined
            ? {}
            : {location: {search: storageOptions.search}}),
        console,
        ...(storageOptions.viz ? {Viz: storageOptions.viz} : {}),
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
        downloads,
        pointer: (
                name,
                reference,
                point
                ) => {
            const transform = element( '#viewport' ).attributes.transform.match(
                    /translate\(([^,]+),([^\)]+)\) scale\(([^\)]+)\)/
                    );
            const bounds = element( '#canvas' ).getBoundingClientRect();
            const offsetX = bounds.left + Number( transform[1] );
            const offsetY = bounds.top + Number( transform[2] );
            const zoom = Number( transform[3] );

            listeners.get( `#canvas:${name}` )({
                button: 0,
                pointerId: 1,
                clientX: offsetX + point.x * zoom,
                clientY: offsetY + point.y * zoom,
                preventDefault() {},
                target: {
                    closest: selector => selector === '[data-diagram-kind]'
                        ? {dataset: {
                            diagramKind: reference.kind,
                            diagramId: reference.id,
                            ...(reference.ownerId ? {ownerId: reference.ownerId} : {})
                            }}
                        : null
                    }
                });
            },
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
