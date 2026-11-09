/*
 * A small ZIP writer: entries are stored without compression, which every
 * unzip tool, Windows Explorer and Word read. It serves the parts of a Word
 * document (.docx is a ZIP of XML files) and the delivery package.
 *
 * Layout of the archive, in order:
 *   for each entry: local header (30 bytes + name) and the bytes themselves;
 *   the central directory: one header per entry (46 bytes + name);
 *   the end record (22 bytes), which says where the directory starts.
 * Names are UTF-8 (flag bit 11) and every entry carries its CRC-32.
 */

const ZIP_LIMITS = {entries: 65535, bytes: 0xFFFFFFFF};

/** CRC-32 table for the polynomial 0xEDB88320 (the one ZIP uses). */
const ZIP_CRC_TABLE = (() => {
    const table = new Uint32Array( 256 );

    for (let n = 0; n < 256; n += 1) {
        let value = n;

        for (let bit = 0; bit < 8; bit += 1) {
            value = value & 1 ? 0xEDB88320 ^ (value >>> 1) : value >>> 1;
            }

        table[n] = value >>> 0;
        }

    return table;
    })();

export function crc32( bytes ) {
    let crc = 0xFFFFFFFF;

    for (const byte of bytes) {
        crc = ZIP_CRC_TABLE[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
        }

    return (crc ^ 0xFFFFFFFF) >>> 0;
    }

/** Text becomes UTF-8; bytes stay as they are. */
export function zipBytes( data ) {
    if (typeof data === 'string') {
        return new TextEncoder().encode( data );
        }

    if (data instanceof Uint8Array) {
        return data;
        }

    if (data instanceof ArrayBuffer) {
        return new Uint8Array( data );
        }

    throw new Error( 'ZIP: cada archivo necesita texto o bytes.' );
    }

/** MS-DOS time and date, the only timestamp a plain ZIP entry has. */
function zipDosTimestamp( date ) {
    const year = Math.min( Math.max( date.getFullYear(), 1980 ), 2107 );

    return {
        time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor( date.getSeconds() / 2 ),
        date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
        };
    }

/** A little-endian writer over a growing list of byte chunks. */
function zipWriter() {
    const chunks = [];
    let length = 0;

    return {
        get length() {
            return length;
            },
        bytes( value ) {
            chunks.push( value );
            length += value.length;
            },
        u16( value ) {
            this.bytes( new Uint8Array( [value & 0xFF, (value >>> 8) & 0xFF] ) );
            },
        u32( value ) {
            this.bytes( new Uint8Array( [value & 0xFF, (value >>> 8) & 0xFF, (value >>> 16) & 0xFF, (value >>> 24) & 0xFF] ) );
            },
        result() {
            const output = new Uint8Array( length );
            let offset = 0;

            for (const chunk of chunks) {
                output.set( chunk, offset );
                offset += chunk.length;
                }

            return output;
            }
        };
    }

function checkZipEntries( entries ) {
    const names = new Set();

    if (!Array.isArray( entries ) || entries.length > ZIP_LIMITS.entries) {
        throw new Error( `ZIP: se admiten hasta ${ZIP_LIMITS.entries} archivos.` );
        }

    for (const entry of entries) {
        const name = entry?.name;

        if (typeof name !== 'string' || !name || name.startsWith( '/' ) || name.split( '/' ).includes( '..' )
            || name.includes( '\\' )) {
            throw new Error( `ZIP: nombre de archivo no válido: ${name}.` );
            }

        if (names.has( name )) {
            throw new Error( `ZIP: el archivo ${name} está repetido.` );
            }

        names.add( name );
        }
    }

const ZIP_SIGNATURES = {local: 0x04034B50, central: 0x02014B50, end: 0x06054B50};
const ZIP_VERSION = 20;
const ZIP_UTF8_FLAG = 0x0800;

/**
 * Builds the archive from [{name, data}], where data is text or bytes.
 * `date` stamps every entry; give a fixed one for reproducible files.
 */
export function zipArchive(
        entries,
        date = new Date()
        ) {
    checkZipEntries( entries );

    const stamp = zipDosTimestamp( date );
    const writer = zipWriter();
    const directory = [];

    for (const entry of entries) {
        const name = new TextEncoder().encode( entry.name );
        const data = zipBytes( entry.data );
        const record = {name, size: data.length, crc: crc32( data ), offset: writer.length};

        writer.u32( ZIP_SIGNATURES.local );
        writer.u16( ZIP_VERSION );
        writer.u16( ZIP_UTF8_FLAG );
        writer.u16( 0 );
        writer.u16( stamp.time );
        writer.u16( stamp.date );
        writer.u32( record.crc );
        writer.u32( record.size );
        writer.u32( record.size );
        writer.u16( name.length );
        writer.u16( 0 );
        writer.bytes( name );
        writer.bytes( data );
        directory.push( record );
        }

    const directoryOffset = writer.length;

    for (const record of directory) {
        writer.u32( ZIP_SIGNATURES.central );
        writer.u16( ZIP_VERSION );
        writer.u16( ZIP_VERSION );
        writer.u16( ZIP_UTF8_FLAG );
        writer.u16( 0 );
        writer.u16( stamp.time );
        writer.u16( stamp.date );
        writer.u32( record.crc );
        writer.u32( record.size );
        writer.u32( record.size );
        writer.u16( record.name.length );
        writer.u16( 0 );
        writer.u16( 0 );
        writer.u16( 0 );
        writer.u16( 0 );
        writer.u32( 0 );
        writer.u32( record.offset );
        writer.bytes( record.name );
        }

    const directorySize = writer.length - directoryOffset;

    writer.u32( ZIP_SIGNATURES.end );
    writer.u16( 0 );
    writer.u16( 0 );
    writer.u16( directory.length );
    writer.u16( directory.length );
    writer.u32( directorySize );
    writer.u32( directoryOffset );
    writer.u16( 0 );

    if (writer.length > ZIP_LIMITS.bytes) {
        throw new Error( 'ZIP: el paquete supera 4 GB.' );
        }

    return writer.result();
    }
