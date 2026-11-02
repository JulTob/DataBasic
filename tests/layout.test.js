import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

test( 'La distribución incluida de Viz.js calcula posiciones sin descargas', async () => {
    const script = new URL( '../public/vendor/viz.js', import.meta.url );
    const source = await readFile( script, 'utf8' );
    const module = {exports: {}};

    runInNewContext(
            source,
            {
                module,
                exports: module.exports,
                require: createRequire( script ),
                __filename: fileURLToPath( script ),
                process,
                Buffer,
                TextDecoder,
                TextEncoder,
                atob,
                btoa,
                console,
                setTimeout,
                clearTimeout
                }
            );

    const viz = await module.exports.instance();
    const result = viz.renderJSON(
            'digraph { graph [rankdir=LR]; node [shape=box]; parent -> child; }'
            );

    assert.equal( result.objects.length, 2 );

    const parent = result.objects.find( item => item.name === 'parent' );
    const child = result.objects.find( item => item.name === 'child' );

    assert.ok( Number( parent.pos.split( ',' )[0] ) < Number( child.pos.split( ',' )[0] ) );
    } );
