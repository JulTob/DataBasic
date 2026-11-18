import assert from 'node:assert/strict';
import test from 'node:test';
import {localAccessAvailable} from '../src/io/local-access.js';
import {buildCoursePackage} from '../src/io/package.js';
import {emptyDocument} from '../src/domain/model.js';
import {readStoredZip} from './support/zip.js';

test( 'native export is local to the app origin', () => {
    for (const hostname of ['127.0.0.1', 'localhost']) {
        assert.ok( localAccessAvailable( {protocol: 'http:', hostname} ) );
        }

    assert.equal( localAccessAvailable( {protocol: 'https:', hostname: 'jultob.github.io'} ), false );
    assert.equal( localAccessAvailable( {protocol: 'file:', hostname: ''} ), false );
    } );

test( 'the course ZIP contains exactly the assessed files and preserves database bytes', () => {
    const database = new Uint8Array( [0, 1, 2, 255] );
    const archive = readStoredZip( buildCoursePackage( emptyDocument(), [], database ) );

    assert.deepEqual(
            Object.keys( archive ),
            ['Memoria.docx', 'Modelo_relacional.vdx', 'Base_de_datos.accdb']
            );
    assert.deepEqual( archive['Base_de_datos.accdb'], database );
    } );
