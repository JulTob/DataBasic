/*
 * Gives sample rows to the examples whose tables have none, keeping their
 * identifiers: `node scripts/example-data.mjs`. The course exercises get
 * theirs when scripts/course-examples.mjs builds them. Tables that already
 * have rows keep them, so running it twice changes nothing.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dataStatus } from '../src/domain/data.js';
import {
    parseDocument,
    serializeDocument
    } from '../src/domain/serialization.js';
import { fillWithSampleData } from '../src/sql/sample.js';

const EXAMPLES = fileURLToPath( new URL( '../examples/', import.meta.url ) );

for (const file of readdirSync( EXAMPLES ).filter( name => name.endsWith( '.databasic.json' ) && !name.startsWith( 'curso-' ) )) {
    const model = parseDocument( readFileSync( `${EXAMPLES}${file}`, 'utf8' ) );
    const filled = fillWithSampleData( model, {rowsPerTable: 8} );
    const issues = dataStatus( filled );

    if (issues.length) {
        throw new Error( `${file}: ${issues[0].message}` );
        }

    writeFileSync( `${EXAMPLES}${file}`, serializeDocument( filled ) );
    console.log( `${file}: filas de ejemplo listas.` );
    }
