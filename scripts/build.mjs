import {
    cp,
    mkdir,
    readFile,
    writeFile
    } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath( new URL( '../', import.meta.url ) );
const output = resolve( root, 'dist' );

// This fixed module order also produces a local, double-clickable application.
// No dependency downloads, CDN, transpiler or network are needed for a build.
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
const fragments = [];

for (const name of modules) {
    const source = await readFile( resolve( root, 'src', name ), 'utf8' );
    const browserCode = source
        .replace( /^import\s+[\s\S]*?\s+from\s+['"][^'"]+['"];\s*/gm, '' )
        .replace( /^export\s+/gm, '' );

    fragments.push( `// ${name}\n${browserCode}` );
    }

const bundle = `(() => {\n'use strict';\n${fragments.join( '\n' )}\n})();\n`;
const html = (await readFile( resolve( root, 'index.html' ), 'utf8' ))
    .replaceAll( './public/', './' )
    .replace( './src/styles.css', './styles.css' )
    .replace( '<script type="module" src="./src/app.js"></script>', '<script src="./app.bundle.js"></script>' );
const legalSource = await readFile(
        resolve( root, 'legal.html' ),
        'utf8'
        );
const legalHtml = legalSource.replaceAll(
        './public/',
        './'
        );

await mkdir( output, {recursive: true} );
await cp( resolve( root, 'public' ), output, {recursive: true} );
await writeFile( resolve( output, 'index.html' ), html );
await writeFile(
        resolve( output, 'legal.html' ),
        legalHtml
        );

for (const name of [
        'LICENSE',
        'NOTICE.md'
        ]) {
    await cp(
            resolve( root, name ),
            resolve( output, name )
            );
    }

await writeFile( resolve( output, 'app.bundle.js' ), bundle );
await cp( resolve( root, 'src/styles.css' ), resolve( output, 'styles.css' ) );
await writeFile( resolve( output, '.nojekyll' ), '' );

console.log( `DataBasic preparada en ${output}` );
