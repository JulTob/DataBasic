import {
    FORM_LAYOUTS,
    changeDocument,
    newId
    } from './model.js';

/*
 * Forms of the document, as a form wizard builds them: a source (a table or
 * a saved query), the fields it shows, a layout and a title. The form only
 * describes how to look at the records; the records stay in the datasheets.
 */

export const FORM_LAYOUT_LABELS = {
    columnar: 'En columnas · un registro cada vez',
    tabular: 'Tabular · un registro por fila',
    datasheet: 'Hoja de datos · cuadrícula'
    };

export function documentForms( model ) {
    return model.forms || [];
    }

function cleanForm(
        model,
        definition
        ) {
    const source = model.tables.find( table => table.id === definition.sourceId );

    if (!source) {
        throw new Error( 'Elige la tabla o consulta del formulario.' );
        }

    if (!FORM_LAYOUTS.includes( definition.layout )) {
        throw new Error( 'Elige una distribución: en columnas, tabular u hoja de datos.' );
        }

    if (!Array.isArray( definition.fields ) || !definition.fields.length) {
        throw new Error( 'Elige al menos un campo para el formulario.' );
        }

    const name = String( definition.name || '' ).trim();

    if (!/^[\p{L}_][\p{L}\p{N}_]*$/u.test( name )) {
        throw new Error( 'El nombre del formulario empieza por una letra y solo lleva letras, cifras y _.' );
        }

    return {
        name,
        title: String( definition.title || name ).trim() || name,
        sourceId: source.id,
        fields: [...definition.fields],
        layout: definition.layout
        };
    }

export function addForm(
        model,
        definition
        ) {
    return changeDocument(
            model,
            next => {
                next.forms ||= [];
                next.forms.push( {id: newId(), ...cleanForm( next, definition )} );
                }
            );
    }

export function updateForm(
        model,
        formId,
        definition
        ) {
    return changeDocument(
            model,
            next => {
                const index = (next.forms || []).findIndex( form => form.id === formId );

                if (index < 0) {
                    throw new Error( 'Ese formulario ya no existe.' );
                    }

                next.forms[index] = {id: formId, ...cleanForm( next, {...next.forms[index], ...definition} )};
                }
            );
    }

export function removeForm(
        model,
        formId
        ) {
    return changeDocument(
            model,
            next => {
                next.forms = (next.forms || []).filter( form => form.id !== formId );

                if (!next.forms.length) {
                    delete next.forms;
                    }
                }
            );
    }

/** A free name for a new form over the source: Formulario_Socio, Formulario_Socio_2… */
export function suggestedFormName(
        model,
        source
        ) {
    const base = `Formulario_${String( source?.name || 'datos' ).replace( /[^\p{L}\p{N}_]/gu, '_' )}`;
    const taken = new Set( documentForms( model ).map( form => form.name.toLowerCase() ) );
    let name = base;
    let number = 2;

    while (taken.has( name.toLowerCase() )) {
        name = `${base}_${number}`;
        number += 1;
        }

    return name;
    }
