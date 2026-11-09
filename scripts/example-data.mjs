/*
 * Gives sample rows to the examples whose tables have none, keeping their
 * identifiers: `node scripts/example-data.mjs`. The course exercises get
 * theirs when scripts/course-examples.mjs builds them. Tables that already
 * have rows keep them, so running it twice changes nothing.
 */
import { readdirSync } from 'node:fs';
import { dataStatus } from '../src/domain/data.js';
import { fillWithSampleData } from '../src/sql/sample.js';
import {
    EXAMPLES,
    readExampleModel,
    writeExampleFolder
    } from './example-folder.mjs';

const folders = readdirSync( EXAMPLES, {withFileTypes: true} )
    .filter( entry => entry.isDirectory() && !entry.name.startsWith( 'curso-' ) )
    .map( entry => entry.name );

for (const slug of folders) {
    const filled = fillWithSampleData( readExampleModel( slug ), {rowsPerTable: 8} );
    const issues = dataStatus( filled );

    if (issues.length) {
        throw new Error( `${slug}: ${issues[0].message}` );
        }

    writeExampleFolder( slug, filled );
    console.log( `${slug}/: filas de ejemplo listas.` );
    }
