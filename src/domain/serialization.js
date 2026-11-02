import {
    ACTIONS,
    CARDINALITIES,
    validateDocument
    } from './model.js';

function expect(
        condition,
        message
        ) {
    if (!condition) {
        throw new Error( `Archivo DataBasic no válido: ${message}` );
        }
    }

function textField(
        object,
        key,
        limit = 20000
        ) {
    expect(
            typeof object[key] === 'string' && object[key].length <= limit,
            `el campo ${key} debe ser texto de hasta ${limit} caracteres.`
            );
    }

function flag(
        object,
        key
        ) {
    expect( typeof object[key] === 'boolean', `${key} debe ser verdadero o falso.` );
    }

/** Only versioned DataBasic JSON is accepted, never scripts or Visio binaries. */
export function parseDocument( contents ) {
    expect( contents.length <= 5_000_000, 'el archivo supera los 5 MB.' );

    const model = JSON.parse( contents );

    expect(
            model?.format === 'databasic' && model.version === 1,
            'se necesita un documento DataBasic versión 1.'
            );
    textField( model, 'name', 160 );
    expect( Array.isArray( model.tables ) && model.tables.length <= 200, 'máximo 200 entidades.' );
    expect( Array.isArray( model.relationships ) && model.relationships.length <= 500, 'máximo 500 relaciones.' );

    const ids = new Set();
    const checkId = item => {
        textField( item, 'id', 100 );
        expect(
                /^[A-Za-z0-9_-]+$/.test( item.id ) && !ids.has( item.id ),
                'los identificadores deben ser únicos y usar letras, números o guiones.'
                );
        ids.add( item.id );
        };

    for (const table of model.tables) {
        checkId( table );

        for (const key of ['name', 'conceptualName', 'namespace']) {
            textField( table, key, 160 );
            }

        textField( table, 'notes' );
        textField( table, 'definition' );
        flag( table, 'syncNames' );
        expect( ['entity', 'view'].includes( table.kind ), 'tipo de entidad desconocido.' );

        for (const axis of ['x', 'y']) {
            expect(
                    Number.isFinite( table[axis] ) && table[axis] >= 0 && table[axis] <= 20000,
                    'las posiciones deben estar entre 0 y 20000.'
                    );
            }

        expect( Array.isArray( table.columns ) && table.columns.length <= 200, 'máximo 200 columnas por entidad.' );
        expect( Array.isArray( table.indexes ) && table.indexes.length <= 100, 'máximo 100 índices por entidad.' );

        for (const field of table.columns) {
            checkId( field );
            textField( field, 'name', 160 );
            textField( field, 'type', 100 );
            textField( field, 'notes' );
            textField( field, 'defaultValue', 500 );
            flag( field, 'primary' );
            flag( field, 'required' );
            }

        for (const index of table.indexes) {
            checkId( index );
            textField( index, 'name', 160 );
            flag( index, 'unique' );
            expect(
                    Array.isArray( index.columns )
                        && index.columns.every( id => typeof id === 'string' ),
                    'columnas de índice no válidas.'
                    );
            }
        }

    for (const relation of model.relationships) {
        checkId( relation );

        for (const key of ['name', 'forward', 'inverse', 'parentId', 'childId']) {
            textField( relation, key, 160 );
            }

        flag( relation, 'identifying' );
        flag( relation, 'optional' );
        expect( CARDINALITIES.some( option => option[0] === relation.cardinality ), 'cardinalidad no válida.' );
        expect( ACTIONS.includes( relation.onDelete ) && ACTIONS.includes( relation.onUpdate ), 'acción referencial no válida.' );
        expect( Array.isArray( relation.mappings ) && relation.mappings.length <= 200, 'mapeo no válido.' );

        for (const pair of relation.mappings) {
            textField( pair, 'parentColumnId', 100 );
            textField( pair, 'childColumnId', 100 );
            }
        }

    expect( model.display && typeof model.display === 'object', 'faltan las opciones del documento.' );

    for (const key of [
        'conceptual', 'types', 'keys', 'required', 'crowsFeet',
        'cardinality', 'relationshipNames', 'grid'
        ]) {
        flag( model.display, key );
        }

    const errors = validateDocument( model ).filter( issue => issue.level === 'error' );

    expect( errors.length === 0, errors[0]?.message );

    return model;
    }

export function serializeDocument( model ) {
    return JSON.stringify( model, null, 2 );
    }
