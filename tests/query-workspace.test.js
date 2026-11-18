import test from 'node:test';
import assert from 'node:assert/strict';
import { queryResultDifference } from '../src/ui/query-workspace.js';
import { applicationHarness } from './support/application.js';
import { emptyDocument } from '../src/domain/model.js';

test( 'la comprobación del reto de renombrado exige la cabecera solicitada', () => {
    const expected = {columns: ['dato'], rows: [[1], [2]]};
    assert.match( queryResultDifference( {columns: ['id'], rows: [[2], [1]]}, expected, true ), /dato/ );
    assert.equal( queryResultDifference( {columns: ['DATO'], rows: [[2], [1]]}, expected, true ), '' );
    } );

test( 'la comparación respeta multiplicidad y distingue NULL, cero y texto', () => {
    const result = rows => ({columns: ['n'], rows});
    const expected = result( [[1], [1], [null], [0]] );
    assert.equal( queryResultDifference( result( [[0], [1], [null], [1]] ), expected ), '' );
    assert.match( queryResultDifference( result( [[1], ['1'], [null], [0]] ), expected ), /Filas ausentes: 1. Filas adicionales: 1/ );
    } );

test( 'al deshacer y rehacer el cambio de vista, la cinta sigue al programa de referencia', async () => {
    const app = await applicationHarness( 500, JSON.stringify( emptyDocument() ) );
    await app.click( {mode: 'tables'} );
    assert.match( app.element( '#ribbon' ).innerHTML, /Hoja de datos/ );
    await app.click( {action: 'undo'} );
    assert.match( app.element( '#ribbon' ).innerHTML, /data-action="entity"/ );
    assert.doesNotMatch( app.element( '#ribbon' ).innerHTML, /Hoja de datos/ );
    await app.click( {action: 'redo'} );
    assert.match( app.element( '#ribbon' ).innerHTML, /Hoja de datos/ );
    } );
