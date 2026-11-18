import { readFile } from 'node:fs/promises';
import { Worker } from 'node:worker_threads';

let workerSource;

/** Node uses the same bundled SQLite library and request handler as the browser. */
export async function nodeQueryWorker() {
    workerSource ??= Promise.all(
            ['vendor/sql-wasm-inline.js', 'query-worker.js'].map(
                    path => readFile( new URL( '../public/' + path, import.meta.url ), 'utf8' )
                    )
            ).then( parts => [
                'const { parentPort } = require("node:worker_threads");',
                'const self = { postMessage: value => parentPort.postMessage(value) };',
                ...parts,
                'parentPort.once("message", data => self.onmessage({data}));'
                ].join( '\n' ) );

    return new Worker( await workerSource, {eval: true, execArgv: []} );
    }
