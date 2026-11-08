import { crc32 } from '../../src/io/zip.js';

/*
 * Reads a stored (uncompressed) ZIP back through its central directory, as
 * an unzip tool does, so the tests check the archive rather than trust it.
 * Returns {name: Uint8Array} and throws when an offset, size or CRC lies.
 */
export function readStoredZip( bytes ) {
    const view = new DataView( bytes.buffer, bytes.byteOffset, bytes.byteLength );
    const end = bytes.length - 22;

    if (view.getUint32( end, true ) !== 0x06054B50) {
        throw new Error( 'Falta el registro final del ZIP.' );
        }

    const count = view.getUint16( end + 10, true );
    let cursor = view.getUint32( end + 16, true );
    const entries = {};

    for (let index = 0; index < count; index += 1) {
        if (view.getUint32( cursor, true ) !== 0x02014B50) {
            throw new Error( 'Cabecera central del ZIP no válida.' );
            }

        const crc = view.getUint32( cursor + 16, true );
        const size = view.getUint32( cursor + 24, true );
        const nameLength = view.getUint16( cursor + 28, true );
        const local = view.getUint32( cursor + 42, true );
        const name = new TextDecoder().decode( bytes.subarray( cursor + 46, cursor + 46 + nameLength ) );

        if (view.getUint32( local, true ) !== 0x04034B50) {
            throw new Error( `${name}: cabecera local no válida.` );
            }

        const start = local + 30 + view.getUint16( local + 26, true ) + view.getUint16( local + 28, true );
        const data = bytes.subarray( start, start + size );

        if (crc32( data ) !== crc) {
            throw new Error( `${name}: el CRC-32 no coincide.` );
            }

        entries[name] = data;
        cursor += 46 + nameLength + view.getUint16( cursor + 30, true ) + view.getUint16( cursor + 32, true );
        }

    return entries;
    }

export function zipText( data ) {
    return new TextDecoder().decode( data );
    }
