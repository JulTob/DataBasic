import {
    FORM_LAYOUT_LABELS,
    documentForms
    } from '../domain/forms.js';
import { formRecords, sourceFields } from '../sql/records.js';
import {
    command,
    escapeHTML,
    icon
    } from './html.js';

/*
 * The form wizard, step by step as the classic one: 1. the table or query,
 * 2. its fields, 3. the layout, 4. the title. Then the form window, which
 * moves through the records (first, previous, next, last), edits the current
 * one, adds new ones and deletes them, always through the table's rules.
 */

export const WIZARD_STEPS = 4;

function sourceOptions(
        model,
        selected
        ) {
    const group = (label, kind) => {
        const items = model.tables.filter( table => table.kind === kind );

        return items.length
            ? `<optgroup label="${label}">${items.map(
                    table => `<option value="${table.id}" ${table.id === selected ? 'selected' : ''}>${escapeHTML( table.name )}</option>`
                    ).join( '' )}</optgroup>`
            : '';
        };

    return group( 'Tablas', 'entity' ) + group( 'Consultas', 'view' );
    }

function stepHeading( wizard ) {
    const names = ['Tabla o consulta', 'Campos', 'Distribución', 'Título'];

    return `<ol class="wizard-steps">${names.map(
            (name, index) => `<li class="${index + 1 === wizard.step ? 'current' : index + 1 < wizard.step ? 'done' : ''}">${index + 1}. ${name}</li>`
            ).join( '' )}</ol>`;
    }

/** The content of one step of the wizard, and the label of its button. */
export function wizardStep(
        model,
        wizard
        ) {
    const back = wizard.step > 1 ? command( 'form-wizard-back', 'Atrás', 'arrow-left' ) : '';
    let body = '';

    switch (wizard.step) {
        case 1:
            body = `<p>¿De qué tabla o consulta salen los datos del formulario? Un formulario sobre una
                    consulta muestra su resultado y no se edita.</p>
                <label class="dialog-fields">Tabla o consulta<select name="sourceId" required>${sourceOptions( model, wizard.sourceId )}</select></label>`;
            break;
        case 2: {
            const fields = sourceFields( model, wizard.sourceId );

            body = `<p>¿Qué campos muestra? Se presentan en este orden.</p>
                <fieldset class="wizard-fields">${fields.map(
                        field => `<label class="check"><input type="checkbox" name="field" value="${escapeHTML( field.key )}"
                            ${!wizard.fields.length || wizard.fields.includes( field.key ) ? 'checked' : ''}>
                            ${escapeHTML( field.name )}${field.required ? ' *' : ''}</label>`
                        ).join( '' ) || '<p>Este origen no tiene campos.</p>'}</fieldset>`;
            break;
            }
        case 3:
            body = `<p>¿Qué distribución quieres?</p>
                <fieldset class="wizard-layouts">${Object.entries( FORM_LAYOUT_LABELS ).map(
                        ([value, label]) => `<label class="wizard-layout"><input type="radio" name="layout" value="${value}"
                            ${wizard.layout === value ? 'checked' : ''}><span class="layout-preview layout-${value}" aria-hidden="true"></span>${escapeHTML( label )}</label>`
                        ).join( '' )}</fieldset>`;
            break;
        default:
            body = `<p>¿Qué título lleva el formulario? El nombre es el del objeto guardado.</p>
                <div class="dialog-fields">
                    <label>Título<input name="title" required maxlength="160" value="${escapeHTML( wizard.title )}"></label>
                    <label>Nombre<input name="name" required maxlength="64" value="${escapeHTML( wizard.name )}"></label>
                </div>`;
        }

    return {
        content: `${stepHeading( wizard )}${body}${back ? `<div class="dialog-actions">${back}</div>` : ''}`,
        submitLabel: wizard.step < WIZARD_STEPS ? 'Siguiente' : 'Finalizar'
        };
    }

/* ---------- the form window ---------- */

function fieldInput(
        field,
        value,
        editable,
        row = null
        ) {
    const name = row === null ? `name="${escapeHTML( field.key )}"` : `data-form-row="${row}" data-form-field="${escapeHTML( field.key )}"`;
    const attributes = `${name} aria-label="${escapeHTML( field.name )}" ${editable ? '' : 'readonly'}`;
    const choices = field.values.length ? field.values.map( item => [String( item ), String( item )] ) : field.choices;

    if (editable && choices) {
        return `<select ${attributes}><option value=""></option>${choices.map(
                ([option, label]) => `<option value="${escapeHTML( option )}" ${String( option ) === String( value ) ? 'selected' : ''}>${escapeHTML( label )}</option>`
                ).join( '' )}</select>`;
        }

    const type = editable && field.kind === 'date' ? 'date' : 'text';

    return `<input type="${type}" ${attributes} value="${escapeHTML( value )}" ${field.kind === 'number' ? 'inputmode="decimal"' : ''}>`;
    }

function navigation(
        position,
        total,
        editable
        ) {
    const label = position === null ? `Nuevo registro (${total} guardados)` : `Registro ${position + 1} de ${total}`;

    return `<nav class="form-navigation" aria-label="Registros">
        ${command( 'form-first', 'Primero', 'chevrons-left', position === null || position > 0 ? '' : 'disabled' )}
        ${command( 'form-previous', 'Anterior', 'chevron-left', position === null || position > 0 ? '' : 'disabled' )}
        <span>${label}</span>
        ${command( 'form-next', 'Siguiente', 'chevron-right', position !== null && position < total - 1 ? '' : 'disabled' )}
        ${command( 'form-last', 'Último', 'chevrons-right', position !== null && position < total - 1 ? '' : 'disabled' )}
        ${editable ? command( 'form-new', 'Nuevo', 'plus' ) + command( 'form-delete', 'Eliminar', 'trash-2', position === null ? 'disabled' : '' ) : ''}
        </nav>`;
    }

function columnarBody(
        records,
        position
        ) {
    const cells = position === null ? {} : records.rows[position]?.cells || {};

    return `<div class="form-columnar">${records.fields.map(
            field => `<label><span>${escapeHTML( field.name )}${field.required && records.editable ? ' *' : ''}</span>
                ${fieldInput( field, cells[field.key] ?? '', records.editable )}</label>`
            ).join( '' )}</div>`;
    }

function gridBody(
        records,
        layout,
        position
        ) {
    const header = records.fields.map( field => `<th>${escapeHTML( field.name )}</th>` ).join( '' );
    const rows = records.rows.map(
            row => `<tr class="${row.index === position ? 'current' : ''}">
                <td class="form-selector"><button type="button" data-form-goto="${row.index}" aria-label="Ir al registro ${row.index + 1}">${row.index === position ? '▸' : ''}</button></td>
                ${records.fields.map( field => `<td>${fieldInput( field, row.cells[field.key] ?? '', records.editable, row.index )}</td>` ).join( '' )}
                ${records.editable ? `<td>${command( 'form-save-row', 'Guardar', 'check', `data-row="${row.index}" title="Guardar este registro"` )}</td>` : ''}</tr>`
            ).join( '' );

    return `<div class="form-grid form-${layout}"><table><thead><tr><th></th>${header}${records.editable ? '<th></th>' : ''}</tr></thead>
        <tbody>${rows || `<tr><td></td><td colspan="${records.fields.length}">Ningún registro.</td></tr>`}</tbody></table></div>`;
    }

/** The window of a form: its records in the chosen layout, the navigation and the record being edited. */
export function formWindow(
        model,
        form,
        position
        ) {
    const records = formRecords( model, form );
    const total = records.rows.length;
    const current = position === null ? null : Math.min( Math.max( position, 0 ), Math.max( total - 1, 0 ) );
    const empty = total === 0 && current !== null;
    const note = records.editable
        ? 'Guardar aplica las reglas de la tabla: tipos, obligatorios (*), dominios, claves e integridad referencial.'
        : 'Formulario sobre una consulta: muestra su resultado y no se edita.';
    const body = form.layout === 'columnar' || current === null
        ? (empty ? '<p>La tabla no tiene registros: pulsa Nuevo.</p>' : columnarBody( records, current ))
        : gridBody( records, form.layout, current );

    return {
        position: empty ? null : current,
        content: `<div class="form-window form-layout-${form.layout}">
            ${records.error ? `<p class="dialog-error-inline">${escapeHTML( records.error )}</p>` : ''}
            ${body}
            ${navigation( empty ? null : current, total, records.editable )}
            <p class="field-hint">${escapeHTML( note )}</p></div>`,
        editable: records.editable && (form.layout === 'columnar' || current === null)
        };
    }

/** The forms of the document, to open or delete. */
export function formsList( model ) {
    const forms = documentForms( model );

    return forms.length
        ? `<ul class="forms-list">${forms.map(
                form => `<li><button type="button" data-form-open="${form.id}">${icon( 'layout-template' )}${escapeHTML( form.title )}</button>
                    <small>${escapeHTML( model.tables.find( table => table.id === form.sourceId )?.name || '' )} · ${escapeHTML( FORM_LAYOUT_LABELS[form.layout].split( ' · ' )[0] )}</small>
                    ${command( 'form-remove', 'Eliminar', 'trash-2', `data-form-id="${form.id}"` )}</li>`
                ).join( '' )}</ul>`
        : '<p>Todavía no hay formularios. Crea uno con el asistente.</p>';
    }
