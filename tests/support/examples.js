import { readFile, readdir } from 'node:fs/promises';
import { parseDocument } from '../../src/domain/serialization.js';

/*
 * The examples are project folders, examples/<name>/; the document of each
 * one is its proyecto.databasic.json.
 */

export const examplesURL = new URL( '../../examples/', import.meta.url );

/** The names of the example folders, in alphabetical order. */
export async function exampleFolders() {
    const entries = await readdir( examplesURL, {withFileTypes: true} );

    return entries.filter( entry => entry.isDirectory() ).map( entry => entry.name ).sort();
    }

export function exampleURL(
        folder,
        file = 'proyecto.databasic.json'
        ) {
    return new URL( `${folder}/${file}`, examplesURL );
    }

/** The text of one file of an example folder. */
export async function exampleText(
        folder,
        file = 'proyecto.databasic.json'
        ) {
    return readFile( exampleURL( folder, file ), 'utf8' );
    }

/** The document of an example folder. */
export async function readExample( folder ) {
    return parseDocument( await exampleText( folder ) );
    }
