import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The fixed dependency order keeps the build offline and double-clickable.
// Imports are removed, so private top-level names must remain unique.
const modules = [
    'domain/model.js',
    'domain/data.js',
    'domain/access.js',
    'domain/delivery.js',
    'domain/serialization.js',
    'sql/lexer.js',
    'sql/parser.js',
    'sql/values.js',
    'sql/expressions.js',
    'sql/query.js',
    'sql/dml.js',
    'sql/ddl.js',
    'sql/console.js',
    'io/sql.js',
    'io/access.js',
    'ui/html.js',
    'ui/scene.js',
    'io/dictionary.js',
    'io/report.js',
    'io/zip.js',
    'io/docx.js',
    'ui/diagram.js',
    'io/visio.js',
    'io/package.js',
    'ui/raster.js',
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
