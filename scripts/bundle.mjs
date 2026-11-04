import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The fixed dependency order keeps the build offline and double-clickable.
// Imports are removed, so private top-level names must remain unique.
const modules = [
    'domain/model.js',
    'domain/serialization.js',
    'io/sql.js',
    'ui/html.js',
    'io/report.js',
    'ui/scene.js',
    'ui/diagram.js',
    'io/visio.js',
    'ui/properties.js',
    'ui/layout.js',
    'ui/dialogs.js',
    'app.js'
    ];

/** Returns the same classic script for distribution and application tests. */
export async function bundleSource( projectRoot ) {
    const root = projectRoot instanceof URL
        ? fileURLToPath( projectRoot )
        : projectRoot;
    const fragments = [];

    for (const name of modules) {
        const source = await readFile( resolve( root, 'src', name ), 'utf8' );
        const browserCode = source
            .replace( /^import\s+[\s\S]*?\s+from\s+['"][^'"]+['"];\s*/gm, '' )
            .replace( /^export\s+/gm, '' );

        fragments.push( `// ${name}\n${browserCode}` );
        }

    return `(() => {\n'use strict';\n${fragments.join( '\n' )}\n})();\n`;
    }
