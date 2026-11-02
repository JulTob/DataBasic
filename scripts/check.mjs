import { spawnSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

async function checkDirectory( directory ) {
    for (const entry of await readdir( directory, {withFileTypes: true} )) {
        const path = resolve( directory, entry.name );

        if (entry.isDirectory()) {
            await checkDirectory( path );
            }
        else if (/\.(js|mjs)$/.test( path )) {
            const result = spawnSync( process.execPath, ['--check', path], {stdio: 'inherit'} );

            if (result.status !== 0) {
                process.exit( 1 );
                }
            }
        }
    }

await checkDirectory( 'src' );
await checkDirectory( 'scripts' );
await checkDirectory( 'tests' );

console.log( 'Sintaxis JavaScript verificada.' );
