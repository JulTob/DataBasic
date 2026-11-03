import {
    cp,
    mkdir,
    readFile,
    writeFile
    } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { bundleSource } from './bundle.mjs';

const root = fileURLToPath( new URL( '../', import.meta.url ) );
const output = resolve( root, 'dist' );

function versionedAssetURL(
        name,
        content
        ) {
    const version = createHash( 'sha256' )
        .update( content )
        .digest( 'hex' )
        .slice( 0, 12 );

    return `./${name}?v=${version}`;
    }

const bundle = await bundleSource( root );
const stylesheet = await readFile(
        resolve( root, 'src/styles.css' ),
        'utf8'
        );
const styleURL = versionedAssetURL(
        'styles.css',
        stylesheet
        );
const scriptURL = versionedAssetURL(
        'app.bundle.js',
        bundle
        );
const html = (await readFile( resolve( root, 'index.html' ), 'utf8' ))
    .replaceAll( './public/', './' )
    .replace( './src/styles.css', styleURL )
    .replace(
            '<script type="module" src="./src/app.js"></script>',
            `<script src="${scriptURL}"></script>`
            );
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
await writeFile(
        resolve( output, 'styles.css' ),
        stylesheet
        );
await writeFile( resolve( output, '.nojekyll' ), '' );

console.log( `DataBasic preparada en ${output}` );
