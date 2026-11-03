import test from 'node:test';
import assert from 'node:assert/strict';
import {
    addRelationship,
    addTable,
    column,
    emptyDocument,
    validType
    } from '../src/domain/model.js';
import {
    parseDocument,
    serializeDocument
    } from '../src/domain/serialization.js';
import { exportSQL } from '../src/io/sql.js';

test( 'NUMBER admite precisión y escala, incluidos sus límites documentados', () => {
    for (const value of [
        'NUMBER',
        'number(3)',
        'NUMBER(10,2)',
        'NUMBER(38,127)',
        'NUMBER(1,-84)',
        'NUMBER(2,10)',
        'NUMBER( 10, 2 )'
        ]) {
        assert.equal( validType( value ), true, value );
        }
    } );

test( 'NUMBER rechaza parámetros fuera de rango y sintaxis no admitida', () => {
    for (const value of [
        'NUMBER(0)',
        'NUMBER(39)',
        'NUMBER(10,-85)',
        'NUMBER(10,128)',
        'NUMBER()',
        'NUMBER(10,2,1)',
        'NUMBER(3.5)',
        'NUMBER; DROP TABLE prueba'
        ]) {
        assert.equal( validType( value ), false, value );
        }
    } );

test( 'El formato de archivo conserva NUMBER y sigue abriendo tipos anteriores', () => {
    const model = addTable( emptyDocument( 'general' ) );

    model.tables[0].columns.push( column( 'precio', 'NUMBER(10,2)' ) );
    model.version = 1;
    delete model.profile;
    delete model.conceptual;
    delete model.traces;
    delete model.presentation;
    delete model.display.mode;
    delete model.display.notation;

    const restored = parseDocument( serializeDocument( model ) );

    assert.equal( restored.tables[0].columns[0].type, 'INTEGER' );
    assert.equal( restored.tables[0].columns[1].type, 'NUMBER(10,2)' );
    assert.equal( restored.version, 2 );
    assert.equal( restored.profile, 'general' );
    } );

test( 'La migración de una clave NUMBER conserva el tipo en la FK hija', () => {
    let model = addTable( emptyDocument() );

    model = addTable( model );
    model.tables[0].columns = [column( 'id_padre', 'NUMBER(10)', true )];

    const linked = addRelationship(
            model,
            model.tables[0].id,
            model.tables[1].id
            );

    assert.equal( linked.tables[1].columns.at( -1 ).type, 'NUMBER(10)' );
    } );

test( 'El SQL traduce NUMBER a NUMERIC sin modificar el modelo guardado', () => {
    const model = addTable( emptyDocument() );

    model.tables[0].columns = [
        column( 'id', 'NUMBER(10)', true ),
        column( 'precio', 'NUMBER(10,2)' ),
        column( 'importe', 'NUMBER' ),
        column( 'redondeado', 'NUMBER(10,-2)' )
        ];

    const original = serializeDocument( model );
    const sql = exportSQL( model );

    assert.match( sql, /"id" NUMERIC\(10\) NOT NULL/ );
    assert.match( sql, /"precio" NUMERIC\(10,2\)/ );
    assert.match( sql, /"importe" NUMERIC[,\n]/ );
    assert.match( sql, /"redondeado" NUMERIC\(10,-2\)/ );
    assert.equal( serializeDocument( model ), original );
    } );
