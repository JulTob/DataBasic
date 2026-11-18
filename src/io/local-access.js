/** Only the local DataBasic server can run the ACE writer on the user's computer. */
export function localAccessAvailable( location = globalThis.location ) {
    return location?.protocol === 'http:'
        && ['127.0.0.1', 'localhost'].includes( location.hostname );
    }

export async function requestLocalAccess( model ) {
    if (!localAccessAvailable()) {
        throw new Error( 'Abre la edición local de DataBasic con npm start para exportar un ACCDB.' );
        }

    const response = await fetch(
            '/api/export/accdb',
            {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify( model ),
                redirect: 'error'
                }
            );

    if (!response.ok) {
        if (response.status === 404 || response.status === 405) {
            throw new Error( 'El servidor local no incluye el exportador. Inicia esta versión con npm start.' );
            }

        throw new Error( await response.text() || 'El servidor no pudo crear la base Access.' );
        }

    const bytes = new Uint8Array( await response.arrayBuffer() );
    const signature = new TextDecoder().decode( bytes.subarray( 4, 19 ) );

    if (signature !== 'Standard ACE DB') {
        throw new Error( 'El servidor no devolvió una base de datos Access.' );
        }

    return bytes;
    }
