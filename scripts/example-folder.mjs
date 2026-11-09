/*
 * Writes an example as a project folder, examples/<name>/, with the files
 * DataBasic reads (README.md, esquema.sql, proyecto.databasic.json) and the
 * two drawings, which GitHub shows inside the README. The outputs for other
 * programs (.vdx, .bas, .sql and .xml of the database) are left to Guardar:
 * they derive from the rest and would multiply the size of the repository.
 *
 * Run it alone (`node scripts/example-folder.mjs`) to turn the old
 * examples/*.databasic.json files into folders and rewrite examples/index.json.
 */
import {
    existsSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    rmSync,
    writeFileSync
    } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { setDiagramMode } from '../src/domain/model.js';
import { parseDocument } from '../src/domain/serialization.js';
import {
    PROJECT_FILES,
    projectFiles
    } from '../src/io/project.js';
import { exportSVG } from '../src/ui/diagram.js';

export const EXAMPLES = fileURLToPath( new URL( '../examples/', import.meta.url ) );
export const EXAMPLE_OUTPUTS = ['diagrama.svg', 'relacional.svg'];

/** The folder name of an example file: curso-lonja.databasic.json → curso-lonja. */
export function exampleSlug( filename ) {
    return filename.replace( /\.databasic\.json$/, '' );
    }

/** Writes the folder of one example, replacing the project files it had. */
export function writeExampleFolder(
        slug,
        model
        ) {
    const folder = `${EXAMPLES}${slug}/`;
    const project = projectFiles( model, {
        diagrams: {
            chen: exportSVG( setDiagramMode( model, 'chen' ) ),
            relational: exportSVG( setDiagramMode( model, 'relational' ) )
            },
        outputs: EXAMPLE_OUTPUTS
        } );

    mkdirSync( folder, {recursive: true} );

    for (const file of PROJECT_FILES) {
        rmSync( `${folder}${file.name}`, {force: true} );
        }

    for (const file of project.files) {
        writeFileSync( `${folder}${file.name}`, file.data );
        }

    return project.files.map( file => file.name );
    }

/** The document of an example folder. */
export function readExampleModel( slug ) {
    return parseDocument( readFileSync( `${EXAMPLES}${slug}/proyecto.databasic.json`, 'utf8' ) );
    }

/** The list the app reads: each folder, its title and the files it holds. */
export function writeExampleIndex( entries ) {
    const examples = entries.map( entry => ({
        folder: entry.folder,
        name: entry.name,
        files: PROJECT_FILES.map( file => file.name ).filter( name => existsSync( `${EXAMPLES}${entry.folder}/${name}` ) )
        }) );

    writeFileSync( `${EXAMPLES}index.json`, `${JSON.stringify( {examples}, null, 2 )}\n` );
    }

function convertOldFiles() {
    const index = JSON.parse( readFileSync( `${EXAMPLES}index.json`, 'utf8' ) );
    const entries = index.examples.map( item => ({folder: item.folder || exampleSlug( item.file ), name: item.name}) );

    for (const file of readdirSync( EXAMPLES ).filter( name => name.endsWith( '.databasic.json' ) )) {
        const slug = exampleSlug( file );

        writeExampleFolder( slug, parseDocument( readFileSync( `${EXAMPLES}${file}`, 'utf8' ) ) );
        rmSync( `${EXAMPLES}${file}` );
        console.log( `${file} → ${slug}/` );
        }

    writeExampleIndex( entries );
    }

if (process.argv[1] && fileURLToPath( import.meta.url ) === process.argv[1]) {
    convertOldFiles();
    }
