import { createServer } from 'node:http';
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
import { fileURLToPath } from 'node:url';

const root = fileURLToPath( new URL( '../', import.meta.url ) );
const port = Number( process.env.PORT || 4173 );
const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.json': 'application/json'
    };

const server = createServer(
        async (request, response) => {
            try {
                const path = decodeURIComponent( new URL( request.url, 'http://localhost' ).pathname );
                const local = path.replace( /^\/DataBasic(?=\/|$)/, '' );
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

server.listen(
        port,
        '127.0.0.1',
        () => console.log( `DataBasic: http://127.0.0.1:${port}/DataBasic/` )
        );
