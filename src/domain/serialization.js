import {
    upgradeDocument,
    validateDocument
    } from './model.js';

function requireSerializableDocument( model ) {
    const errors = validateDocument( model ).filter(
            issue => issue.level === 'error'
            );

    if (errors.length) {
        throw new Error( `Archivo DataBasic no válido: ${errors[0].message}` );
        }
    }

/** Accepts versioned JSON only; v1 keeps its types and becomes general v2. */
export function parseDocument( contents ) {
    if (typeof contents !== 'string' || contents.length > 5_000_000) {
        throw new Error( 'Archivo DataBasic no válido: máximo 5 MB de texto JSON.' );
        }

    const model = JSON.parse( contents );

    requireSerializableDocument( model );

    const upgraded = upgradeDocument( model );

    requireSerializableDocument( upgraded );

    return upgraded;
    }

/** An accepted in-memory document must also be recoverable from its JSON. */
export function serializeDocument( model ) {
    requireSerializableDocument( model );

    const contents = JSON.stringify( model, null, 2 );

    if (contents.length > 5_000_000) {
        throw new Error( 'El documento supera los 5 MB admitidos al abrir.' );
        }

    return contents;
    }
