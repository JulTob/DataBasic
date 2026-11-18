import { createServer } from 'node:http';
import { exportAccdb } from './export-accdb.mjs';
import {
    readFile,
    stat
    } from 'node:fs/promises';
import {
    extname,
    relative,
    resolve,
    sep
    } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath( new URL( '../', import.meta.url ) );
const port = Number( process.env.PORT || 4173 );
const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.json': 'application/json'
    };

let activeExports = 0;

function textResponse( response, status, message ) {
    response.writeHead( status, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
        } );
    response.end( message );
    }

export async function sendAccess( request, response ) {
    const host = request.headers.host;
    const origin = request.headers.origin;

    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/i.test( host || '' )
            || (origin !== undefined && origin !== 'http://' + host)) {
        return textResponse( response, 403, 'La exportación sólo está disponible desde el servidor local.' );
        }
    if (request.method !== 'POST') {
        response.setHeader( 'Allow', 'POST' );
        return textResponse( response, 405, 'Use POST con el documento DataBasic.' );
        }
    if (!/^application\/json(?:\s*;|$)/i.test( request.headers['content-type'] || '' )) {
        return textResponse( response, 415, 'Se necesita un documento application/json.' );
        }
    if (activeExports >= 2) {
        return textResponse( response, 429, 'Hay dos exportaciones en curso. Vuelva a intentarlo al terminar.' );
        }

    activeExports++;
    try {
        const chunks = [];
        let size = 0;
        for await (const chunk of request) {
            size += chunk.length;
            // parseDocument also limits the decoded JSON to five million characters.
            if (size > 20_000_000) return textResponse( response, 413, 'El documento excede el máximo admitido.' );
            chunks.push( chunk );
            }
        const bytes = await exportAccdb( Buffer.concat( chunks ).toString( 'utf8' ) );
        response.writeHead( 200, {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': 'attachment; filename="DataBasic.accdb"',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff'
            } );
        response.end( bytes );
        }
    catch (error) {
        textResponse( response, 422, error.message );
        }
    finally {
        activeExports--;
        }
    }

const server = createServer(
        async (request, response) => {
            try {
                const path = decodeURIComponent( new URL( request.url, 'http://localhost' ).pathname );
                const local = path.replace( /^\/DataBasic(?=\/|$)/, '' );
                if (local === '/api/export/accdb') {
                    await sendAccess( request, response );
                    return;
                    }

                let target = resolve( root, `.${local || '/'}` );

                if (target !== root.slice( 0, -1 ) && !target.startsWith( root )) {
                    response.writeHead( 403 );
                    response.end( 'Acceso no permitido.' );
                    return;
                    }

                if (relative( root, target ).split( sep ).some(
                        part => part.startsWith( '.' )
                        )) {
                    response.writeHead( 403 );
                    response.end( 'Acceso no permitido.' );
                    return;
                    }

                if ((await stat( target )).isDirectory()) {
                    target = resolve( target, 'index.html' );
                    }

                const body = await readFile( target );

                response.writeHead(
                        200,
                        {
                            'Content-Type': mimeTypes[extname( target )] || 'application/octet-stream',
                            'Cache-Control': 'no-store',
                            'X-Content-Type-Options': 'nosniff'
                            }
                        );
                response.end( body );
                }
            catch {
                response.writeHead( 404 );
                response.end( 'Archivo no encontrado.' );
                }
            }
        );

server.on(
        'error',
        error => {
            console.error( `No se pudo iniciar DataBasic: ${error.message}` );
            process.exitCode = 1;
            }
        );

if (process.argv[1] && pathToFileURL( process.argv[1] ).href === import.meta.url) {
    server.listen(
            port,
            '127.0.0.1',
            () => console.log( `DataBasic: http://127.0.0.1:${server.address().port}/DataBasic/` )
            );
    }
