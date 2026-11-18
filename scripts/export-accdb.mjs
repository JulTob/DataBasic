import {execFile} from 'node:child_process';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {promisify} from 'node:util';
import {parseDocument} from '../src/domain/serialization.js';
import {nativeSchema} from './access/schema.mjs';

const run = promisify( execFile );
const engine = fileURLToPath( new URL( './access/databasic-access.jar', import.meta.url ) );

/** Generate in a private directory so a failed or simultaneous export cannot return partial data. */
export async function exportAccdb( contents ) {
    const xml = nativeSchema( parseDocument( contents ) );
    const folder = await mkdtemp( join( tmpdir(), 'databasic-accdb-' ) );

    try {
        const schema = join( folder, 'schema.xml' );
        const database = join( folder, 'database.accdb' );
        await writeFile( schema, xml );
        try {
            await run( 'java', ['-Xmx256m', '-jar', engine, schema, database],
                {timeout: 90_000, maxBuffer: 64 * 1024, windowsHide: true} );
            }
        catch (error) {
            if (error.code === 'ENOENT' || /UnsupportedClassVersionError|Unable to locate a Java Runtime/i.test( error.stderr || '' )) {
                throw new Error( 'Instale Java 17 o posterior para generar el archivo ACCDB.' );
                }
            throw new Error( 'No se pudo generar la base de Access. ' + (error.stderr?.trim() || error.message) );
            }
        return await readFile( database );
        }
    finally {
        await rm( folder, {recursive: true, force: true} );
        }
    }

if (process.argv[1] && pathToFileURL( process.argv[1] ).href === import.meta.url) {
    try {
        const [, , input, output] = process.argv;
        if (!input || !output) throw new Error( 'Uso: node scripts/export-accdb.mjs modelo.databasic.json salida.accdb' );
        const bytes = await exportAccdb( await readFile( input, 'utf8' ) );
        await writeFile( output, bytes, {flag: 'wx'} );
        }
    catch (error) {
        console.error( error.message );
        process.exitCode = 1;
        }
    }
