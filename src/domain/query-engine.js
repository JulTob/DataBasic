import { tableRows } from './model.js';

// Only the current schema and datasheets enter the disposable SQL database.
function querySnapshot( model ) {
    return model.tables.map( table => ({
        name: table.name,
        namespace: table.namespace || '',
        kind: table.kind,
        definition: table.definition,
        columns: table.columns.map( column => ({
            name: column.name,
            type: column.type
            }) ),
        rows: tableRows( model, table.id ).map(
                row => table.columns.map( column => row[column.id] ?? null )
                )
        }) );
    }

let offlineQueryLoader;

function offlineQueryWorker( workerURL ) {
    if (!offlineQueryLoader) {
        offlineQueryLoader = new Promise( (resolve, reject) => {
            const script = document.createElement( 'script' );
            script.src = new URL( './offline-query-worker.js', workerURL ).href;
            script.onload = () => resolve( globalThis.dataBasicQueryWorkerURL );
            script.onerror = () => reject( new Error( 'No se pudo cargar el motor SQL local.' ) );
            document.head.append( script );
            } ).catch( error => {
                offlineQueryLoader = undefined;
                throw error;
                } );
        }

    return offlineQueryLoader.then( url => new Worker( url ) );
    }

async function createQueryWorker() {
    if (typeof document === 'undefined') {
        const { nodeQueryWorker } = await import( '../../scripts/query-node.mjs' );
        return nodeQueryWorker();
        }

    const path = document.querySelector( 'meta[name="databasic-query-worker"]' ).content;
    const url = new URL( path, document.baseURI );
    return url.protocol === 'file:'
        ? offlineQueryWorker( url )
        : new Worker( url );
    }

/** Execute one read-only SQLite query against the current document. */
export async function queryModel(
        model,
        sql
        ) {
    if (typeof sql !== 'string' || !sql.trim()) {
        throw new Error( 'Escribe una consulta SELECT o WITH.' );
        }

    if (sql.includes( '\0' )) {
        throw new Error( 'La consulta contiene un carácter nulo.' );
        }

    const snapshot = querySnapshot( model );
    const worker = await createQueryWorker();
    try {
        return await new Promise( (resolve, reject) => {
            // A first visit can still be loading the local SQLite asset.
            // Start the execution budget once the engine is ready.
            let timer = setTimeout(
                    () => reject( new Error( 'El motor SQL no terminó de cargarse.' ) ),
                    45000
                    );

            function receive( reply ) {
                clearTimeout( timer );
                if (reply.ready) {
                    timer = setTimeout(
                            () => reject( new Error( 'La consulta superó el límite de 5 segundos.' ) ),
                            5000
                            );
                    return;
                    }
                if (reply.error) {
                    reject( new Error( reply.error ) );
                    }
                else {
                    resolve( reply.result );
                    }
                }

            function failed( event ) {
                clearTimeout( timer );
                reject( new Error( event.message || 'No se pudo ejecutar la consulta.' ) );
                }

            if (typeof worker.addEventListener === 'function') {
                worker.addEventListener( 'message', event => receive( event.data ) );
                worker.addEventListener( 'error', failed, {once: true} );
                }
            else {
                worker.on( 'message', receive );
                worker.once( 'error', failed );
                }
            worker.postMessage( {tables: snapshot, sql} );
            } );
        }
    finally {
        worker.terminate();
        }
    }
