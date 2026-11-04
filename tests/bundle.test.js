import test from 'node:test';
import assert from 'node:assert/strict';
import {
    cp,
    mkdtemp,
    readFile,
    rm
    } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import {
    createHash,
    webcrypto
    } from 'node:crypto';
import { tmpdir } from 'node:os';
import {
    join,
    resolve
    } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { bundleSource } from '../scripts/bundle.mjs';

const projectURL = new URL( '../', import.meta.url );
const projectRoot = fileURLToPath( projectURL );

function runNode(
        nodeArguments,
        cwd
        ) {
    const result = spawnSync(
            process.execPath,
            nodeArguments,
            {cwd, encoding: 'utf8'}
            );

    assert.equal( result.status, 0, result.stderr || result.error?.message );
    }

// This smoke double only verifies startup, mode commands and persisted data.
// CSS, hit testing and real browser storage remain browser acceptance checks.
async function startBuiltApplication( source ) {
    const elements = new Map();
    const listeners = new Map();
    const timers = new Map();
    let timerId = 0;
    let saved = null;

    function element( selector ) {
        if (!elements.has( selector )) {
            elements.set(
                    selector,
                    {
                        innerHTML: '',
                        textContent: '',
                        value: '',
                        classList: {add() {}, remove() {}, toggle() {}},
                        style: {setProperty() {}},
                        setAttribute() {},
                        removeAttribute() {},
                        getBoundingClientRect: () => ({
                            left: 0,
                            top: 0,
                            width: 1000,
                            height: 500
                            }),
                        addEventListener: (name, callback) => listeners.set(
                                `${selector}:${name}`,
                                callback
                                ),
                        querySelector: query => element( `${selector} ${query}` )
                        }
                    );
            }

        return elements.get( selector );
        }

    runInNewContext(
            source,
            {
                document: {
                    querySelector: element,
                    querySelectorAll: () => [],
                    addEventListener: (name, callback) => listeners.set(
                            `document:${name}`,
                            callback
                            ),
                    activeElement: null
                    },
                window: {addEventListener() {}},
                crypto: webcrypto,
                performance,
                structuredClone,
                console,
                setTimeout: callback => {
                    const id = ++timerId;

                    timers.set( id, callback );
                    return id;
                    },
                clearTimeout: id => timers.delete( id ),
                lucide: {createIcons() {}},
                idbKeyval: {
                    get: async () => null,
                    set: async (key, value) => { saved = value; }
                    }
                },
            {filename: 'dist/app.bundle.js', timeout: 5000}
            );

    await Promise.resolve();

    return {
        element,
        saved: () => JSON.parse( saved ),
        click: async dataset => {
            const button = {dataset, disabled: false};

            listeners.get( 'document:click' )({
                target: {closest: () => button}
                });
            await Promise.resolve();

            const callbacks = [...timers.values()];

            timers.clear();

            for (const callback of callbacks) {
                await callback();
                }
            }
        };
    }

test( 'El artefacto offline conserva recursos y arranca con el bundle común', async t => {
    const temporaryRoot = await mkdtemp( join( tmpdir(), 'databasic-bundle-' ) );

    t.after( () => rm( temporaryRoot, {recursive: true, force: true} ) );

    for (const name of [
        'src',
        'scripts',
        'public',
        'examples',
        'index.html',
        'legal.html',
        'LICENSE',
        'NOTICE.md',
        'package.json'
        ]) {
        await cp(
                resolve( projectRoot, name ),
                resolve( temporaryRoot, name ),
                {recursive: true}
                );
        }

    runNode( ['scripts/build.mjs'], temporaryRoot );

    const output = resolve( temporaryRoot, 'dist' );
    const source = await readFile( resolve( output, 'app.bundle.js' ), 'utf8' );

    runNode( ['--check', resolve( output, 'app.bundle.js' )], temporaryRoot );
    assert.equal( source, await bundleSource( projectURL ) );
    assert.equal( source, await bundleSource( projectRoot ) );

    const html = await readFile( resolve( output, 'index.html' ), 'utf8' );
    const metadata = JSON.parse( await readFile(
            resolve( temporaryRoot, 'package.json' ),
            'utf8'
            ) );
    const pageURL = new URL( 'https://example.test/DataBasic/index.html' );

    assert.ok( html.includes( `<meta name="databasic-version" content="${metadata.version}">` ) );
    assert.equal( metadata.version, '0.4.2' );
    assert.deepEqual(
            await readFile( resolve( output, 'examples/00-nucleo.databasic.json' ) ),
            await readFile( resolve( projectRoot, 'examples/00-nucleo.databasic.json' ) )
            );

    for (const match of html.matchAll( /(?:src|href)="([^"]+)"/g )) {
        const resourceURL = new URL( match[1], pageURL );

        assert.equal( resourceURL.origin, pageURL.origin );
        assert.ok( resourceURL.pathname.startsWith( '/DataBasic/' ) );
        await readFile(
                resolve( output, resourceURL.pathname.slice( '/DataBasic/'.length ) )
                );
        }

    for (const name of ['app.bundle.js', 'styles.css']) {
        const contents = await readFile( resolve( output, name ) );
        const version = createHash( 'sha256' )
            .update( contents )
            .digest( 'hex' )
            .slice( 0, 12 );

        assert.ok( html.includes( `./${name}?v=${version}` ) );
        }

    for (const name of ['LICENSE', 'NOTICE.md']) {
        assert.deepEqual(
                await readFile( resolve( output, name ) ),
                await readFile( resolve( temporaryRoot, name ) )
                );
        }

    await readFile( resolve( output, 'legal.html' ) );
    await readFile( resolve( output, '.nojekyll' ) );

    const app = await startBuiltApplication( source );

    assert.match( app.element( '#viewport' ).innerHTML, /Socio/ );
    assert.match( app.element( '#diagram-mode-label' ).textContent, /Relacional/ );

    await app.click({mode: 'chen'});

    const chenDocument = app.saved();

    assert.equal( chenDocument.display.mode, 'chen' );
    assert.match( app.element( '#diagram-mode-label' ).textContent, /Chen/ );

    await app.click({mode: 'relational'});

    const relationalDocument = app.saved();

    assert.equal( relationalDocument.display.mode, 'relational' );
    assert.deepEqual( relationalDocument.tables, chenDocument.tables );
    assert.deepEqual( relationalDocument.relationships, chenDocument.relationships );

    await app.click({action: 'entity'});

    assert.equal( app.saved().tables.length, relationalDocument.tables.length + 1 );
    assert.match( app.element( '#save-status' ).textContent, /Guardado/ );
    } );
