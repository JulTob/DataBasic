import {
    ACTIONS,
    CARDINALITIES,
    DATA_TYPES
    } from '../domain/model.js';
import {
    check,
    command,
    escapeHTML,
    icon,
    options
    } from './html.js';

function propertyInput(
        label,
        field,
        value,
        extra = ''
        ) {
    return `<label class="property-field"><span>${label}</span>
        <input data-field="${field}" value="${escapeHTML( value )}"
            maxlength="160" ${extra}></label>`;
    }

function tableDefinition( table ) {
    return `<div class="definition-fields">
        ${propertyInput( 'Nombre físico:', 'name', table.name )}
        ${propertyInput( 'Nombre conceptual:', 'conceptualName', table.conceptualName )}
        ${propertyInput( 'Espacio de nombres:', 'namespace', table.namespace )}
        ${check( 'Sincronizar nombres al escribir', 'syncNames', table.syncNames )}
        <div class="read-only-fields">
            <label>Propietario: <input value="" disabled></label>
            <label>Base de datos de origen: <input value="" disabled></label>
            <small>Disponible en modelos extraídos de una base de datos.</small>
        </div></div>`;
    }

function tableColumns(
        table,
        selectedColumnId
        ) {
    const fields = table.columns.map(
            field => `<tr data-column-row="${field.id}"
                class="${field.id === selectedColumnId ? 'active-row' : ''}">
                <td class="row-pointer">${field.id === selectedColumnId ? '▸' : ''}</td>
                <td><input aria-label="Nombre de columna" data-col-id="${field.id}"
                    data-field="name" value="${escapeHTML( field.name )}" maxlength="160"></td>
                <td><input aria-label="Tipo de datos" data-col-id="${field.id}"
                    data-field="type" value="${escapeHTML( field.type )}" list="data-types"></td>
                <td class="checkbox-cell"><input type="checkbox" aria-label="Requerido"
                    data-col-id="${field.id}" data-field="required"
                    ${field.required ? 'checked' : ''} ${field.primary ? 'disabled' : ''}></td>
                <td class="checkbox-cell"><input type="checkbox" aria-label="Clave primaria"
                    data-col-id="${field.id}" data-field="primary" ${field.primary ? 'checked' : ''}
                    ${table.kind === 'view' ? 'disabled' : ''}></td>
                <td><input aria-label="Notas de columna" data-col-id="${field.id}"
                    data-field="notes" value="${escapeHTML( field.notes )}"></td>
                </tr>`
            ).join( '' );

    return `<div class="columns-panel"><div class="property-grid-wrap">
        <table class="property-grid"><thead><tr><th></th><th>Nombre físico</th>
        <th>Tipo de datos</th><th title="No admite valores nulos">Req.</th><th>PK</th><th>Notas</th>
        </tr></thead><tbody>${fields}</tbody></table>
        ${fields ? '' : '<div class="no-fields">Pulsa Agregar para definir la primera columna.</div>'}
        </div><div class="column-actions">
        ${command( 'add-column', 'Agregar', 'plus' )}
        ${command( 'remove-column', 'Quitar', 'minus', selectedColumnId ? '' : 'disabled' )}
        ${command( 'edit-column', 'Editar…', 'pencil', selectedColumnId ? '' : 'disabled' )}
        <hr>
        ${command( 'column-up', 'Subir', 'arrow-up', selectedColumnId ? '' : 'disabled' )}
        ${command( 'column-down', 'Bajar', 'arrow-down', selectedColumnId ? '' : 'disabled' )}
        </div></div>
        <datalist id="data-types">${DATA_TYPES.map( type => `<option value="${type}"></option>` ).join( '' )}</datalist>`;
    }

function tablePrimary( table ) {
    return `<div class="primary-panel"><p>Columnas del identificador principal:</p>
        ${table.columns.map(
                field => check(
                        escapeHTML( field.name ),
                        'primary',
                        field.primary,
                        `data-col-id="${field.id}"`
                        )
                ).join( '' )}
        <p class="field-hint">Selecciona varias columnas para una clave compuesta.
            Las columnas de la clave primaria son obligatorias.</p></div>`;
    }

function tableIndexes( table ) {
    return `<div class="indexes-panel"><div class="index-list">
        ${table.indexes.map(
                index => `<button data-action="edit-index" data-index-id="${index.id}" class="index-item">
                    ${icon( index.unique ? 'key-round' : 'list-ordered' )}
                    <span><strong>${escapeHTML( index.name )}</strong><small>
                    ${index.columns.map(
                            id => escapeHTML( table.columns.find( field => field.id === id )?.name || '' )
                            ).join( ', ' )}${index.unique ? ' · Único' : ''}
                    </small></span>${icon( 'pencil' )}</button>`
                ).join( '' ) || '<p class="field-hint">No hay índices adicionales definidos.</p>'}
        </div>${command( 'new-index', 'Agregar índice…', 'plus', table.columns.length ? '' : 'disabled' )}
        </div>`;
    }

function relationshipDefinition(
        model,
        relation
        ) {
    const parent = model.tables.find( table => table.id === relation.parentId );
    const child = model.tables.find( table => table.id === relation.childId );

    return `<div class="mapping-panel"><div class="mapping-titles">
        <strong>Tabla principal: ${escapeHTML( parent.name )}</strong>
        ${icon( 'arrow-right' )}<strong>Tabla secundaria: ${escapeHTML( child.name )}</strong>
        </div><table class="property-grid mapping-grid"><thead><tr>
        <th>Columna principal (PK)</th><th>Columna secundaria (FK)</th></tr></thead><tbody>
        ${relation.mappings.map(
                (pair, index) => `<tr><td>${escapeHTML( parent.columns.find(
                        field => field.id === pair.parentColumnId
                        ).name )}</td><td><select data-mapping="${index}" aria-label="Columna secundaria">
                    ${options( child.columns.map( field => [field.id, `${field.name} · ${field.type}`] ), pair.childColumnId )}
                    </select></td></tr>`
                ).join( '' )}</tbody></table>
        <p class="field-hint">Las columnas relacionadas se mantienen por identificador,
            incluso si cambias sus nombres.</p></div>`;
    }

function relationshipMisc( relation ) {
    return `<div class="relationship-misc"><fieldset><legend>Cardinalidad</legend>
        ${CARDINALITIES.map(
                ([value, label, code]) => `<label class="check"><input type="radio"
                    name="cardinality" data-field="cardinality" value="${value}"
                    ${relation.cardinality === value ? 'checked' : ''}>${label}
                    <span class="radio-code">${code}</span></label>`
                ).join( '' )}</fieldset>
        <div><fieldset><legend>Tipo de relación</legend>
        ${[false, true].map(
                identifying => `<label class="check"><input type="radio" name="identifying"
                    data-field="identifying" data-boolean="true" value="${identifying}"
                    ${relation.identifying === identifying ? 'checked' : ''}>
                    ${identifying ? 'Identificadora' : 'No identificadora'}</label>`
                ).join( '' )}</fieldset>
        <fieldset><legend>El hijo tiene un padre</legend>
        ${check( 'Opcional', 'optional', relation.optional, relation.identifying ? 'disabled' : '' )}
        </fieldset></div>
        <p class="field-hint">La cardinalidad indica cuántos hijos puede tener un padre.
            «Opcional» indica si un hijo puede existir sin padre.</p></div>`;
    }

function relationshipActions( relation ) {
    return `<div class="referential-panel"><fieldset><legend>Acción referencial</legend>
        <label>Al eliminar el padre:<select data-field="onDelete">${options( ACTIONS, relation.onDelete )}</select></label>
        <label>Al actualizar su clave:<select data-field="onUpdate">${options( ACTIONS, relation.onUpdate )}</select></label>
        </fieldset><p class="field-hint">Estas reglas se documentan y se incluyen en el SQL exportado.
            SET NULL requiere una FK que admita nulos.</p></div>`;
    }

export function renderProperties(
        model,
        state
        ) {
    const table = model.tables.find( item => item.id === state.selectedId );
    const relation = model.relationships.find( item => item.id === state.selectedId );

    if (!table && !relation) {
        return `<div class="properties-empty">${icon( 'mouse-pointer-2' )}
            <strong>Selecciona una entidad o una relación</strong>
            <span>Sus propiedades aparecerán aquí. Haz doble clic en una entidad para editar sus columnas.</span></div>`;
        }

    const categories = table
        ? [
            ['definition', 'Definición'],
            ...(table.kind === 'view' ? [['query', 'Definición SQL']] : []),
            ['columns', 'Columnas'],
            ...(table.kind === 'entity' ? [['primary', 'Identificador principal'], ['indexes', 'Índices']] : []),
            ['notes', 'Notas']
            ]
        : [
            ['definition', 'Definición'],
            ['name', 'Nombre'],
            ['misc', 'Varios'],
            ['referential', 'Acción referencial']
            ];
    const category = categories.some( item => item[0] === state.category )
        ? state.category
        : 'definition';
    let content = '';

    if (table) {
        switch (category) {
            case 'columns':
                content = tableColumns( table, state.selectedColumnId );
                break;
            case 'primary':
                content = tablePrimary( table );
                break;
            case 'indexes':
                content = tableIndexes( table );
                break;
            case 'notes':
                content = `<label class="notes-field">Notas de la entidad
                    <textarea data-field="notes" rows="6">${escapeHTML( table.notes )}</textarea></label>`;
                break;
            case 'query':
                content = `<label class="notes-field">Consulta de definición de la vista
                    <textarea class="sql-editor" data-field="definition" rows="6"
                        placeholder="SELECT ... FROM ...">${escapeHTML( table.definition )}</textarea></label>`;
                break;
            default:
                content = tableDefinition( table );
            }
        }
    else {
        switch (category) {
            case 'name':
                content = `<div class="definition-fields">
                    ${propertyInput( 'Nombre físico:', 'name', relation.name )}
                    ${propertyInput( 'Texto directo:', 'forward', relation.forward )}
                    ${propertyInput( 'Texto inverso:', 'inverse', relation.inverse )}</div>`;
                break;
            case 'misc':
                content = relationshipMisc( relation );
                break;
            case 'referential':
                content = relationshipActions( relation );
                break;
            default:
                content = relationshipDefinition( model, relation );
            }
        }

    return `<nav class="categories" aria-label="Categorías de propiedades"><strong>Categorías:</strong>
        ${categories.map(
                ([id, label]) => `<button data-category="${id}"
                    aria-pressed="${id === category}" class="${id === category ? 'active' : ''}">${label}</button>`
                ).join( '' )}</nav><div class="property-content">${content}</div>`;
    }
