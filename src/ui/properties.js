import {
    ACCESS_INDEX_OPTIONS,
    ACCESS_NUMBER_SIZES,
    ACCESS_TYPES,
    ACTIONS,
    CARDINALITIES,
    DATA_TYPES,
    standardTypeGroups,
    parseDataType,
    getConceptualProjection,
    conceptualStatus,
    participationCardinalityLetter,
    documentAssumptions,
    assumptionKindLabel
    } from '../domain/model.js';
import {
    accessColumnDefinition,
    accessRelationshipDefinition,
    accessTableDefinition
    } from '../domain/access.js';
import {
    check,
    command,
    escapeHTML,
    icon,
    options
    } from './html.js';

/* ---------- the Tablas view: Access's design view vocabulary ---------- */

/** Whether a property keeps its derived value or the author adjusted it. */
function physicalState(
        overridden,
        key
        ) {
    return overridden.includes( key )
        ? '<small class="physical-state adjusted">ajustado</small>'
        : '<small class="physical-state">derivado</small>';
    }

function physicalResetButton(
        scope,
        target,
        overridden
        ) {
    return overridden.length
        ? `<button type="button" class="physical-reset" data-action="reset-physical"
            data-scope="${scope}" data-target="${target}">Restablecer lo derivado</button>`
        : '';
    }

/** Tamaño del campo: a list for Número, a number for Texto corto, nothing otherwise. */
function accessSizeCell(
        field,
        definition
        ) {
    const common = `data-physical="column" data-col-id="${field.id}" data-field="fieldSize"`;

    if (definition.accessType === 'Número') {
        return `<select aria-label="Tamaño del campo" ${common}>${options( ACCESS_NUMBER_SIZES, definition.fieldSize )}</select>`;
        }

    if (definition.accessType === 'Texto corto') {
        return `<input type="number" aria-label="Tamaño del campo" ${common} min="1" max="255"
            value="${Number.isInteger( definition.fieldSize ) ? definition.fieldSize : 255}">`;
        }

    return '<span class="muted">—</span>';
    }

function accessFieldsGrid(
        model,
        table,
        selectedColumnId
        ) {
    const rows = table.columns.map(
            field => {
                const definition = accessColumnDefinition( model, table, field );
                const active = field.id === selectedColumnId;

                return `<tr data-column-row="${field.id}" class="${active ? 'active-row' : ''}">
                    <td class="row-pointer">${field.primary ? icon( 'key-round' ) : (active ? '▸' : '')}</td>
                    <td><span class="field-name">${escapeHTML( field.name )}</span></td>
                    <td><select aria-label="Tipo de datos" data-physical="column" data-col-id="${field.id}"
                        data-field="accessType">${options( ACCESS_TYPES, definition.accessType )}</select></td>
                    <td>${accessSizeCell( field, definition )}</td>
                    <td><input aria-label="Descripción" data-physical="column" data-col-id="${field.id}"
                        data-field="description" value="${escapeHTML( definition.description )}" maxlength="500"></td>
                    <td class="physical-state-cell">${definition.overridden.length
                        ? physicalResetButton( 'column', field.id, definition.overridden )
                        : '<small class="physical-state">derivado</small>'}</td>
                    </tr>`;
                }
            ).join( '' );

    return `<div class="property-grid-wrap"><table class="property-grid access-grid"><thead><tr>
        <th></th><th>Nombre del campo</th><th>Tipo de datos</th><th>Tamaño</th><th>Descripción</th><th></th>
        </tr></thead><tbody>${rows}</tbody></table>
        ${rows ? '' : '<div class="no-fields">Añade columnas en la vista relacional; aquí se ven como campos de Access.</div>'}
        </div>`;
    }

/** The General tab of Access's field properties, for the selected field. */
function accessFieldProperties(
        model,
        table,
        field
        ) {
    const definition = accessColumnDefinition( model, table, field );
    const common = `data-physical="column" data-col-id="${field.id}"`;
    const text = (label, key, extra = '') => `<label class="property-field"><span>${label}</span>
        <input ${common} data-field="${key}" value="${escapeHTML( definition[key] )}" maxlength="500" ${extra}>
        ${physicalState( definition.overridden, key )}</label>`;
    const flag = (label, key, extra = '') => `<div class="physical-flag">${check( label, key, definition[key], `${common} ${extra}` )}
        ${physicalState( definition.overridden, key )}</div>`;
    const textual = ['Texto corto', 'Texto largo', 'Hipervínculo'].includes( definition.accessType );
    const decimals = definition.accessType === 'Número'
        ? `<label class="property-field"><span>Posiciones decimales:</span>
            <select ${common} data-field="decimalPlaces">${options(
                    [['', 'Automático'], ...[0, 1, 2, 3, 4, 5, 6].map( value => [String( value ), String( value )] )],
                    definition.decimalPlaces === null ? '' : String( definition.decimalPlaces )
                    )}</select>${physicalState( definition.overridden, 'decimalPlaces' )}</label>`
        : '';

    return `<fieldset class="access-field-properties"><legend>Propiedades del campo ${escapeHTML( field.name )} · General</legend>
        <div class="definition-fields">
        ${text( 'Formato:', 'format' )}
        ${decimals}
        ${text( 'Título:', 'caption' )}
        ${text( 'Valor predeterminado:', 'defaultValue' )}
        ${text( 'Regla de validación:', 'validationRule' )}
        ${text( 'Texto de validación:', 'validationText' )}
        ${flag( 'Requerido', 'required', field.primary || definition.autonumber ? 'disabled' : '' )}
        ${textual ? flag( 'Permitir longitud cero', 'allowZeroLength' ) : ''}
        <label class="property-field"><span>Indexado:</span>
            <select ${common} data-field="indexed" ${field.primary ? 'disabled' : ''}>${options( ACCESS_INDEX_OPTIONS, definition.indexed )}</select>
            ${physicalState( definition.overridden, 'indexed' )}</label>
        </div>
        <p class="field-hint">Los valores derivados vienen de la columna relacional (tipo, NOT NULL, dominio,
            predeterminado). Cambiar uno aquí no toca el relacional; «Restablecer» vuelve a derivarlo.</p>
        ${physicalResetButton( 'column', field.id, definition.overridden )}</fieldset>`;
    }

function accessFieldsPanel(
        model,
        table,
        selectedColumnId
        ) {
    const field = table.columns.find( item => item.id === selectedColumnId );

    return `<div class="columns-panel access-fields">${accessFieldsGrid( model, table, selectedColumnId )}
        ${field ? accessFieldProperties( model, table, field ) : '<p class="field-hint">Selecciona un campo para ver sus propiedades, como en la vista Diseño de Access.</p>'}</div>`;
    }

function accessTablePanel(
        model,
        table
        ) {
    const definition = accessTableDefinition( model, table );
    const text = (label, key) => `<label class="property-field"><span>${label}</span>
        <input data-physical="table" data-field="${key}" value="${escapeHTML( definition[key] )}" maxlength="500">
        ${physicalState( definition.overridden, key )}</label>`;
    const keys = definition.primaryKey.length ? definition.primaryKey.join( ', ' ) : 'sin clave principal';
    const indexes = definition.indexes.map(
            index => `${index.name} (${index.columns.join( ', ' )})${index.unique ? ' · sin duplicados' : ''}`
            );

    return `<div class="definition-fields access-table">
        ${text( 'Descripción:', 'description' )}
        ${text( 'Regla de validación de la tabla:', 'validationRule' )}
        ${text( 'Texto de validación:', 'validationText' )}
        <p class="field-hint">Clave principal: ${escapeHTML( keys )}. Índices: ${indexes.length ? escapeHTML( indexes.join( '; ' ) ) : 'ninguno'}.
            Las claves y los índices se definen en Identificador principal e Índices de la vista relacional.</p>
        ${physicalResetButton( 'table', table.id, definition.overridden )}</div>`;
    }

function accessRelationshipPanel(
        model,
        relation
        ) {
    const definition = accessRelationshipDefinition( model, relation );
    const parent = model.tables.find( table => table.id === relation.parentId );
    const composite = relation.mappings.length !== 1;
    const common = 'data-physical="relationship"';
    const flag = (label, key, extra = '') => `<div class="physical-flag">${check( label, key, definition[key], `${common} ${extra}` )}
        ${physicalState( definition.overridden, key )}</div>`;
    const candidates = parent.columns.filter( column => !column.primary ).map( column => [column.id, column.name] );
    const automatic = definition.derived.lookup && definition.displayColumnId && !definition.overridden.includes( 'displayColumnId' )
        ? definition.displayColumn
        : parent.columns.find( column => column.id === definition.displayColumnId && !definition.overridden.includes( 'displayColumnId' ) )?.name;

    return `<div class="access-relationship">
        <fieldset><legend>Integridad referencial</legend>
        ${flag( 'Exigir integridad referencial', 'enforce' )}
        ${flag( 'Actualizar en cascada los campos relacionados', 'cascadeUpdate', definition.enforce ? '' : 'disabled' )}
        ${flag( 'Eliminar en cascada los registros relacionados', 'cascadeDelete', definition.enforce ? '' : 'disabled' )}
        <p class="field-hint">Tipo de relación: ${definition.oneToOne ? 'Uno a uno' : 'Uno a varios'}, derivado de la
            cardinalidad relacional. Las cascadas se derivan de la acción referencial (CASCADE).</p></fieldset>
        <fieldset><legend>Campo de búsqueda (Asistente para búsquedas)</legend>
        ${flag( 'Mostrar la clave ajena como lista de valores de la tabla referenciada', 'lookup', composite ? 'disabled' : '' )}
        <label class="property-field"><span>Columna mostrada:</span>
            <select ${common} data-field="displayColumnId" ${composite || !definition.lookup ? 'disabled' : ''}>${options(
                    [['', `Automática · ${automatic || 'ninguna columna de texto'}`], ...candidates],
                    definition.overridden.includes( 'displayColumnId' ) ? definition.displayColumnId : ''
                    )}</select>
            ${physicalState( definition.overridden, 'displayColumnId' )}</label>
        ${flag( 'Ocultar la columna clave', 'hideKey', composite || !definition.lookup ? 'disabled' : '' )}
        ${composite ? '<p class="field-hint">Clave ajena compuesta: Access crea la relación directamente, sin campo de búsqueda.</p>' : ''}
        </fieldset>
        ${physicalResetButton( 'relationship', relation.id, definition.overridden )}</div>`;
    }

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

/** A hue of the spectrum for the element's border, with an almost white fill of the same hue. */
export function colorField( value ) {
    const hue = value ?? null;
    const swatch = hue === null
        ? ''
        : `style="--element-color: hsl(${hue} 55% 40%); --element-fill: hsl(${hue} 65% 96%)"`;

    return `<div class="color-field"><span>Color:</span>
        <input type="range" min="0" max="360" step="1" class="hue-slider" data-field="color"
            value="${hue ?? 200}" aria-label="Tono del color">
        <span class="color-swatch ${hue === null ? 'unset' : ''}" ${swatch}
            title="${hue === null ? 'Sin color' : `Tono ${hue}`}"></span>
        <button type="button" data-action="clear-color" ${hue === null ? 'disabled' : ''}>Sin color</button></div>`;
    }

function tableDefinition( table ) {
    return `<div class="definition-fields">
        ${propertyInput( 'Nombre físico:', 'name', table.name )}
        ${propertyInput( 'Nombre conceptual:', 'conceptualName', table.conceptualName )}
        ${propertyInput( 'Espacio de nombres:', 'namespace', table.namespace )}
        ${check( 'Sincronizar nombres al escribir', 'syncNames', table.syncNames )}
        ${colorField( table.color )}
        <div class="read-only-fields">
            <label>Propietario: <input value="" disabled></label>
            <label>Base de datos de origen: <input value="" disabled></label>
            <small>Disponible en modelos extraídos de una base de datos.</small>
        </div></div>`;
    }

/** Choosing this entry in the type list reveals the free text input beside it. */
export const OTHER_TYPE_OPTION = '__otro__';

/**
 * The type cell is a list of standard types grouped by category, as Visio
 * offers its portable types; the current value stays visible even when it
 * is not standard, and «Otro…» lets the author write any accepted type.
 */
function columnTypeCell(
        model,
        field
        ) {
    const groups = standardTypeGroups( model.profile );
    const standard = groups.some( group => group.types.includes( field.type ) );
    const option = type => `<option value="${escapeHTML( type )}"
        ${type === field.type ? 'selected' : ''}>${escapeHTML( type )}</option>`;

    return `<td data-type-cell><select aria-label="Tipo de datos" data-col-id="${field.id}"
            data-field="type" data-type-select title="Tipos estándar del perfil; Otro… permite escribirlo">
            ${standard ? '' : `<optgroup label="Actual">${option( field.type )}</optgroup>`}
            ${groups.map(
                    group => `<optgroup label="${escapeHTML( group.label )}">${group.types.map( option ).join( '' )}</optgroup>`
                    ).join( '' )}
            <option value="${OTHER_TYPE_OPTION}" class="type-other">Otro…</option></select>
        <input aria-label="Tipo de datos escrito" data-col-id="${field.id}" data-field="type"
            value="${escapeHTML( field.type )}" maxlength="100" hidden
            title="Escribe el tipo completo, por ejemplo NUMBER(8,2)"></td>`;
    }

function tableColumns(
        model,
        table,
        selectedColumnId
        ) {
    const fields = table.columns.map(
            field => `<tr data-column-row="${field.id}"
                class="${field.id === selectedColumnId ? 'active-row' : ''}">
                <td class="row-pointer">${field.id === selectedColumnId ? '▸' : ''}</td>
                <td><input aria-label="Nombre de columna" data-col-id="${field.id}"
                    data-field="name" value="${escapeHTML( field.name )}" maxlength="160"></td>
                ${columnTypeCell( model, field )}
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
        </div></div>`;
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
        ${command( 'alternate-key', 'Clave alternativa…', 'key-round', table.columns.length ? '' : 'disabled' )}
        ${(table.alternateKeys || []).map( key => `<button data-action="alternate-key" data-key-id="${key.id}" class="alternate-key-item">AK · ${escapeHTML( key.name )}: ${key.columns.map( id => escapeHTML( table.columns.find( field => field.id === id )?.name || '' ) ).join( ', ' )}</button>` ).join( '' )}
        </div>`;
    }

/** The assumptions attached to one element; the design report gathers them all. */
function assumptionsPanel(
        model,
        elementId
        ) {
    const items = documentAssumptions( model ).filter( item => item.elementId === elementId );

    return `<div class="assumptions-panel"><div class="conceptual-list">${items.map(
            item => `<button data-action="edit-assumption" data-assumption-id="${item.id}">
                <strong>${escapeHTML( assumptionKindLabel( item.kind ) )}</strong>
                <span>${escapeHTML( item.text )}</span></button>`
            ).join( '' ) || '<p>Este elemento todavía no tiene supuestos.</p>'}</div>
        ${command( 'assumption', 'Añadir supuesto…', 'message-square-text' )}
        <p class="field-hint">Semántica del enunciado: lo que dice el texto de la práctica.
            Supuesto: lo que añades para poder decidir. Semántica perdida: lo que el
            modelo no impone. La memoria del diseño reúne todas las entradas.</p></div>`;
    }

function relationshipDefinition(
        model,
        relation
        ) {
    const parent = model.tables.find( table => table.id === relation.parentId );
    const child = model.tables.find( table => table.id === relation.childId );

    return `<div class="mapping-panel"><div class="mapping-titles">
        <strong>Tabla referenciada: ${escapeHTML( parent.name )}</strong>
        ${icon( 'arrow-right' )}<strong>Tabla que referencia: ${escapeHTML( child.name )}</strong>
        </div><table class="property-grid mapping-grid"><thead><tr>
        <th>Clave primaria referenciada (PK)</th><th>Clave ajena (FK)</th></tr></thead><tbody>
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
    return `<div class="relationship-misc"><fieldset><legend>Cardinalidad y dependencia</legend>
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
        <fieldset><legend>Obligatoriedad de la referencia</legend>
        ${check( 'Opcional · la clave ajena admite nulos', 'optional', relation.optional, relation.identifying ? 'disabled' : '' )}
        </fieldset></div>
        <p class="field-hint">La cardinalidad indica cuántas filas con la clave ajena puede tener
            cada fila referenciada. «Opcional» indica si una fila puede no referenciar a ninguna.</p></div>`;
    }

function relationshipActions( relation ) {
    return `<div class="referential-panel"><fieldset><legend>Acción referencial</legend>
        <label>Al eliminar la fila referenciada:<select data-field="onDelete">${options( ACTIONS, relation.onDelete )}</select></label>
        <label>Al actualizar su clave:<select data-field="onUpdate">${options( ACTIONS, relation.onUpdate )}</select></label>
        </fieldset><p class="field-hint">Estas reglas se documentan y se incluyen en el SQL exportado.
            SET NULL requiere una FK que admita nulos.</p></div>`;
    }

export function renderProperties(
        model,
        state
        ) {
    const native = nativeProperties( model, state );

    if (native) {
        return native;
        }

    const table = model.tables.find( item => item.id === state.selectedId );
    const relation = model.relationships.find( item => item.id === state.selectedId );

    if (!table && !relation) {
        return `<div class="properties-empty">${icon( 'mouse-pointer-2' )}
            <strong>Selecciona una entidad o una relación</strong>
            <span>Sus propiedades aparecerán aquí. Haz doble clic en una entidad para editar sus columnas.</span></div>`;
        }

    const access = model.display.mode === 'tables';
    const categories = table
        ? [
            ...(access ? [['fields', 'Campos de Access'], ['access-table', 'Tabla de Access']] : []),
            ['definition', 'Definición'],
            ...(table.kind === 'view' ? [['query', 'Definición SQL']] : []),
            ['columns', 'Columnas'],
            ...(table.kind === 'entity' ? [['primary', 'Identificador principal'], ['indexes', 'Índices / Claves alternativas']] : []),
            ['assumptions', 'Supuestos'],
            ['notes', 'Notas']
            ]
        : [
            ...(access ? [['access-relationship', 'Relación en Access']] : []),
            ['definition', 'Definición'],
            ['name', 'Nombre'],
            ['misc', 'Varios'],
            ['referential', 'Acción referencial'],
            ['assumptions', 'Supuestos']
            ];
    const category = categories.some( item => item[0] === state.category )
        ? state.category
        : categories[0][0];
    let content = '';

    if (table) {
        switch (category) {
            case 'fields':
                content = accessFieldsPanel( model, table, state.selectedColumnId );
                break;
            case 'access-table':
                content = accessTablePanel( model, table );
                break;
            case 'columns':
                content = tableColumns( model, table, state.selectedColumnId );
                break;
            case 'primary':
                content = tablePrimary( table );
                break;
            case 'indexes':
                content = tableIndexes( table );
                break;
            case 'assumptions':
                content = assumptionsPanel( model, table.id );
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
            case 'access-relationship':
                content = accessRelationshipPanel( model, relation );
                break;
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
            case 'assumptions':
                content = assumptionsPanel( model, relation.id );
                break;
            default:
                content = relationshipDefinition( model, relation );
            }
        }

    const origin = model.traces.find( trace => trace.targetId === table?.id || trace.targetId === relation?.id );
    const originId = origin?.sourceKind === 'participation'
        ? model.conceptual.relationships.find(
                item => item.participations.some( part => part.id === origin.sourceId )
                )?.id || origin.sourceId
        : origin?.sourceId;
    const provenance = origin
        ? `<p class="provenance">Materialización vinculada · <button data-origin="${originId}">Editar origen en Diagrama</button></p>`
        : model.display.mode === 'chen'
            ? '<p class="provenance">Proyección relacional parcial · no se ha inferido intención ERE.</p>'
            : '';

    return `<nav class="categories" aria-label="Categorías de propiedades"><strong>Categorías:</strong>
        ${categories.map(
                ([id, label]) => `<button data-category="${id}"
                    aria-pressed="${id === category}" class="${id === category ? 'active' : ''}">${label}</button>`
                ).join( '' )}</nav><div class="property-content">${provenance}${content}</div>`;
    }


export function typeFields(
        type,
        profile = 'course'
        ) {
    const parsed = parseDataType( type ) || {family: 'NUMBER'};
    const families = profile === 'course'
        ? ['VARCHAR', 'CHAR', 'NUMBER', 'DATE']
        : [...new Set( DATA_TYPES.map( value => value.split( '(' )[0] ) )];

    if (!families.includes( parsed.family )) {
        families.unshift( parsed.family );
        }

    return `<fieldset class="type-editor"><legend>Tipo de datos · ${escapeHTML( profile === 'course' ? 'perfil del curso' : 'perfil general' )}</legend>
        <label>Familia<select name="typeFamily">${options( families, parsed.family )}</select></label>
        <div class="parameter-fields">
        <label data-type-for="characters">Longitud · CHAR/VARCHAR<input name="typeLength" type="number" min="1"
            value="${parsed.length ?? ''}" placeholder="Ej.: 50"></label>
        <label data-type-for="number">Precisión · NUMBER / DECIMAL<input name="typePrecision" type="number" min="1" max="38"
            value="${parsed.precision ?? ''}" placeholder="Sin límite explícito"></label>
        <label data-type-for="number">Escala · NUMBER / DECIMAL<input name="typeScale" type="number" min="-84" max="127"
            value="${parsed.scale ?? ''}" placeholder="Opcional"></label></div>
        <p class="field-hint">Longitud para caracteres; precisión y escala para números.
            DATE no lleva parámetros. Se conservan los parámetros aplicables.</p></fieldset>`;
    }

function conceptualAttributeList(
        model,
        ownerId
        ) {
    const attributes = model.conceptual.attributes.filter(
            item => item.ownerId === ownerId
            );

    return `<div class="conceptual-list">${attributes.map(
            item => `<button data-select="${item.id}"><strong>${escapeHTML( item.name )}</strong>
                <span>${escapeHTML( item.type )}</span></button>`
            ).join( '' ) || '<p>Todavía no hay atributos.</p>'}</div>
        ${command( 'conceptual-attribute', 'Agregar atributo…', 'plus' )}`;
    }

function nativeProperties(
        model,
        state
        ) {
    const semantic = model.conceptual;
    const entity = semantic.entities.find( item => item.id === state.selectedId );
    const attribute = semantic.attributes.find( item => item.id === state.selectedId );
    const relation = semantic.relationships.find( item => item.id === state.selectedId );
    const generalization = semantic.generalizations.find( item => item.id === state.selectedId );
    const item = entity || attribute || relation || generalization;

    if (!item) {
        return '';
        }

    const categories = [
        ['definition', 'Definición'],
        ...(entity || relation ? [['attributes', 'Atributos']] : []),
        ...(relation ? [['misc', 'Varios'], ['translation', 'Correspondencias']] : []),
        ['assumptions', 'Supuestos'],
        ['notes', 'Notas']
        ];
    const category = categories.some( entry => entry[0] === state.category )
        ? state.category
        : 'definition';
    const statuses = conceptualStatus( model ).filter(
            status => status.elementId === item.id
            );
    let content = '';

    if (category === 'notes') {
        content = `<label class="notes-field">Notas semánticas
            <textarea data-field="notes">${escapeHTML( item.notes )}</textarea></label>`;
        }
    else if (category === 'assumptions') {
        content = assumptionsPanel( model, item.id );
        }
    else if (category === 'attributes') {
        content = conceptualAttributeList( model, item.id );
        }
    else if (relation && category === 'misc') {
        const entities = getConceptualProjection( model ).entities;

        content = `<h3>Participaciones, roles y límites</h3>
            <p class="field-hint">Cada par se lee junto a su entidad:
                cuántas ocurrencias de esta relación admite una ocurrencia de esa entidad.
                La letra 1/N junto al rombo es la razón de cardinalidad de esa rama:
                en una binaria es el máximo de la otra rama; en una ternaria es la
                cardinalidad por combinación elegida más abajo.</p>
            <h4>Participación absoluta</h4>
            <div class="participation-list">${relation.participations.map(
                    part => `<fieldset><legend>${escapeHTML( entities.find( entity => entity.id === part.entityId )?.name || part.entityId )}</legend>
                        <label>Rol<input data-participation="${part.id}" data-field="role"
                            value="${escapeHTML( part.role )}"></label>
                        <label>Mínimo<input type="number" min="0" data-participation="${part.id}"
                            data-field="min" value="${part.min}"></label>
                        <label>Máximo<input data-participation="${part.id}" data-field="max"
                            value="${part.max ?? 'N'}" title="N indica muchos"></label>
                        ${relation.participations.length === 2
                            ? `<p class="field-hint">Letra junto al rombo: ${participationCardinalityLetter( relation, part )}</p>`
                            : ''}</fieldset>`
                    ).join( '' )}</div>
            ${relation.participations.length === 3 ? `<h4>Cardinalidad por combinación de los otros roles</h4>
                <p class="field-hint">Para una combinación fija de los otros dos roles y el
                    contexto elegido en Correspondencias, ¿cuántos valores admite este rol?</p>
                <div class="participation-list">${relation.participations.map(
                        part => `<label>${escapeHTML( part.role || 'Sin rol' )}
                            <select data-participation="${part.id}" data-field="cardinality">${options(
                                    [
                                        ['', 'Desconocida · documental si es anterior'],
                                        ['one', 'Uno · máximo por combinación'],
                                        ['many', 'Muchos · sin ese máximo']
                                        ],
                                    part.cardinality || ''
                                    )}</select></label>`
                        ).join( '' )}</div>
                <p class="field-hint">Estas decisiones no sustituyen los mínimos/máximos
                    absolutos ni eligen la identidad de cada ocurrencia.</p>` : ''}`;
        }
    else if (relation && category === 'translation') {
        content = `<p>${relation.translation
            ? 'Materialización elegida y vinculada mediante identificadores.'
            : 'Pendiente: el dibujo se guarda sin inventar una clave o tabla.'}</p>
            ${command( 'materialize', 'Elegir clave y materializar…', 'table-2' )}
            <p class="field-hint">Una N:N o ternaria usa una tabla asociativa.
                Una fecha/período puede formar parte de la identidad de cada ocurrencia.
                En ternarias, el contexto de cardinalidad se elige por separado.</p>
            ${conceptualMaterializationSummary( model, relation.id )}`;
        }
    else if (entity) {
        content = `<div class="dialog-fields">
            ${propertyInput( 'Nombre:', 'name', entity.name )}
            ${colorField( entity.color )}
            ${check( 'Entidad débil', 'weak', entity.weak )}
            <label>Entidad propietaria<select data-field="ownerEntityId">
                ${options( [['', 'Sin propietaria'], ...getConceptualProjection( model ).entities
                    .filter( other => other.id !== entity.id ).map( other => [other.id, other.name] )], entity.ownerEntityId || '' )}
                </select></label>
            ${entity.weak ? `<label>Vínculo identificador<select data-field="weakRelationshipId">
                ${options(
                        [['', 'Pendiente · elegir vínculo'], ...semantic.relationships
                            .filter( relation => relation.participations.length === 2
                                && relation.participations.some( part => part.entityId === entity.id )
                                && relation.participations.some( part => part.entityId === entity.ownerEntityId ))
                            .map( relation => [relation.id, relation.name] )],
                        entity.translation?.kind === 'weak' ? entity.translation.relationshipId : ''
                        )}</select></label>` : ''}
            <p class="field-hint">Para materializar una débil: marca su atributo clave parcial,
                materializa una FK binaria identificadora y elige aquí ese vínculo.
                La debilidad y clave parcial se conservan explícitamente;
                revisa su estado de traducción antes de exportar SQL.</p></div>`;
        }
    else if (attribute) {
        content = `<div class="dialog-fields">
            ${propertyInput( 'Nombre:', 'name', attribute.name )}
            ${colorField( attribute.color )}
            <p><strong>${escapeHTML( attribute.type )}</strong>
                ${attribute.primary ? ' · Clave' : ''}${attribute.partialKey ? ' · Clave parcial' : ''}
                ${attribute.multivalued ? ' · Multivaluado' : ''}${attribute.derived ? ' · Derivado' : ''}
                ${attribute.structure === 'composite' ? ' · Compuesto' : ''}</p>
            ${command( 'edit-attribute', 'Editar atributo y dominio…', 'pencil' )}
            ${attribute.multivalued
                ? command( 'materialize', 'Multivaluado → Tabla auxiliar…', 'table-2' )
                : ''}
            ${conceptualMaterializationSummary( model, attribute.id )}</div>`;
        }
    else if (generalization) {
        content = `<p>Especialización ${generalization.disjoint ? 'disjunta' : 'solapada'}
            · ${generalization.total ? 'total' : 'parcial'}.</p>
            ${command( 'edit-generalization', 'Editar especialización…', 'pencil' )}
            ${command( 'materialize', 'Tablas de superclase y subclases…', 'table-2' )}
            <p class="field-hint">Cada subclase hereda la PK completa como PK y FK.
                Una clave local incompatible debe resolverse en Editar atributo y dominio.
                Disjunta/solapada y total/parcial se conservan como restricciones documentales.</p>
            ${conceptualMaterializationSummary( model, generalization.id )}`;
        }
    else {
        content = `<div class="dialog-fields">${propertyInput( 'Nombre:', 'name', relation.name )}
            ${colorField( relation.color )}
            <p>Relación nativa con ${relation.participations.length} participaciones.</p>
            ${command( 'materialize', 'Elegir clave y materializar…', 'table-2' )}</div>`;
        }

    return `<nav class="categories" aria-label="Categorías de propiedades">
        ${categories.map(
                ([id, label]) => `<button data-category="${id}" aria-pressed="${id === category}"
                    class="${id === category ? 'active' : ''}">${label}</button>`
                ).join( '' )}</nav><div class="property-content">
        <p class="provenance">Conceptual nativo · ${model.traces.filter( trace => trace.sourceId === item.id ).length} correspondencias</p>
        ${content}${statuses.map(
                status => `<p class="pending-message"><strong>${status.code === 'pending'
                    ? 'Pendiente'
                    : status.code === 'documentary' ? 'Documental' : 'Aviso'}:</strong>
                    ${escapeHTML( status.message )}</p>`
                ).join( '' )}</div>`;
    }

function conceptualMaterializationSummary(
        model,
        sourceId
        ) {
    const traces = model.traces.filter( trace => trace.sourceId === sourceId );
    const association = model.conceptual.relationships.find( relation => relation.id === sourceId );
    const participationIds = association?.participations.map( part => part.id ) || [];
    const participationTraces = model.traces.filter(
            trace => trace.sourceKind === 'participation'
                && participationIds.includes( trace.sourceId )
            );
    const relations = model.relationships.filter(
            relation => [...traces, ...participationTraces].some(
                    trace => trace.targetId === relation.id
                    )
            );
    const tables = model.tables.filter(
            table => traces.some( trace => trace.targetId === table.id )
                || relations.some( relation => relation.childId === table.id )
            );

    if (!tables.length) {
        return '';
        }

    return `<div class="materialization-summary">${tables.map(
            table => `<p><strong>${escapeHTML( table.name )}</strong> · PK:
                ${table.columns.filter( column => column.primary ).map(
                        column => escapeHTML( column.name )
                        ).join( ', ' ) || 'sin clave'}</p>`
            ).join( '' )}${relations.map(
            relation => {
                const parent = model.tables.find( table => table.id === relation.parentId );
                const child = model.tables.find( table => table.id === relation.childId );

                return `<p>FK: ${escapeHTML( child.name )} (${
                    relation.mappings.map( pair => escapeHTML(
                            child.columns.find( column => column.id === pair.childColumnId ).name
                            ) ).join( ', ' )}) → ${escapeHTML( parent.name )}</p>`;
                }
            ).join( '' )}</div>`;
    }
