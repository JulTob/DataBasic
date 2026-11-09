/*
 * Reads a ZIP archive: the one DataBasic writes (stored entries) and the ones
 * Windows, macOS or a browser write (deflated entries, method 8), through the
 * browser's DecompressionStream. The central directory at the end says where
 * each entry is; directories (names ending in /) are skipped.
 */

const ZIP_END_SIGNATURE = 0x06054B50;
const ZIP_CENTRAL_SIGNATURE = 0x02014B50;
const ZIP_LOCAL_SIGNATURE = 0x04034B50;
const ZIP_READ_LIMIT = 50 * 1024 * 1024;

function findEndRecord( view ) {
    // The end record is 22 bytes plus an optional comment of up to 65535 bytes.
    for (let offset = view.byteLength - 22; offset >= Math.max( 0, view.byteLength - 22 - 65535 ); offset -= 1) {
        if (view.getUint32( offset, true ) === ZIP_END_SIGNATURE) {
            return offset;
            }
        }

    throw new Error( 'El archivo no es un .zip válido: falta su índice final.' );
    }

async function inflateRaw( bytes ) {
    if (typeof DecompressionStream !== 'function') {
        throw new Error( 'Este navegador no sabe descomprimir el .zip; guárdalo sin compresión o abre la carpeta.' );
        }

    const stream = new Blob( [bytes] ).stream().pipeThrough( new DecompressionStream( 'deflate-raw' ) );

    return new Uint8Array( await new Response( stream ).arrayBuffer() );
    }

/** Every file of the archive as {name, data}, in the order of its index. */
export async function readZip( input ) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array( input );

    if (bytes.length > ZIP_READ_LIMIT) {
        throw new Error( 'El .zip supera los 50 MB admitidos.' );
        }

    const view = new DataView( bytes.buffer, bytes.byteOffset, bytes.byteLength );
    const end = findEndRecord( view );
    const count = view.getUint16( end + 10, true );
    let cursor = view.getUint32( end + 16, true );
    const files = [];

    for (let index = 0; index < count; index += 1) {
        if (cursor + 46 > bytes.length || view.getUint32( cursor, true ) !== ZIP_CENTRAL_SIGNATURE) {
            throw new Error( 'El índice del .zip está dañado.' );
            }

        const method = view.getUint16( cursor + 10, true );
        const compressedSize = view.getUint32( cursor + 20, true );
        const nameLength = view.getUint16( cursor + 28, true );
        const extraLength = view.getUint16( cursor + 30, true );
        const commentLength = view.getUint16( cursor + 32, true );
        const localOffset = view.getUint32( cursor + 42, true );
        const name = new TextDecoder().decode( bytes.subarray( cursor + 46, cursor + 46 + nameLength ) );

        cursor += 46 + nameLength + extraLength + commentLength;

        if (name.endsWith( '/' )) {
            continue;
            }

        if (view.getUint32( localOffset, true ) !== ZIP_LOCAL_SIGNATURE) {
            throw new Error( `${name}: la entrada del .zip está dañada.` );
            }

        const start = localOffset + 30 + view.getUint16( localOffset + 26, true ) + view.getUint16( localOffset + 28, true );
        const raw = bytes.subarray( start, start + compressedSize );

        if (method === 0) {
            files.push( {name, data: raw} );
            }
        else if (method === 8) {
            files.push( {name, data: await inflateRaw( raw )} );
            }
        else {
            throw new Error( `${name}: método de compresión ${method} no admitido.` );
            }
        }

    return files;
    }
