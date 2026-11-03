import {
    ACTIONS,
    CARDINALITIES,
    DATA_TYPES,
    parseDataType,
    getConceptualProjection,
    conceptualStatus,
    participationCardinalityLetter
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
                <td><input aria-label="Tipo de datos" data-col-id="${field.id}"
                    data-field="type" value="${escapeHTML( field.type )}" list="data-types"
                    title="Tipo completo; Editar permite elegir familia y parámetros"></td>
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
        <datalist id="data-types">${(model.profile === 'course' ? ['VARCHAR(50)', 'CHAR(10)', 'NUMBER', 'NUMBER(10,2)', 'DATE'] : DATA_TYPES).map( type => `<option value="${type}"></option>` ).join( '' )}</datalist>`;
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

    const categories = table
        ? [
            ['definition', 'Definición'],
            ...(table.kind === 'view' ? [['query', 'Definición SQL']] : []),
            ['columns', 'Columnas'],
            ...(table.kind === 'entity' ? [['primary', 'Identificador principal'], ['indexes', 'Índices / Claves alternativas']] : []),
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
                content = tableColumns( model, table, state.selectedColumnId );
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

    const origin = model.traces.find( trace => trace.targetId === table?.id || trace.targetId === relation?.id );
    const provenance = origin
        ? `<p class="provenance">Materialización vinculada · <button data-origin="${origin.sourceId}">Editar origen Chen</button></p>`
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
    else if (category === 'attributes') {
        content = conceptualAttributeList( model, item.id );
        }
    else if (relation && category === 'misc') {
        const entities = getConceptualProjection( model ).entities;

        content = `<h3>Participaciones, roles y límites</h3>
            <p class="field-hint">Cada par (mín,máx) se lee junto a su entidad:
                cuántas ocurrencias de esta relación admite una ocurrencia de esa entidad.
                La letra 1/N junto al rombo es la razón de cardinalidad de esa rama.</p>
            <div class="participation-list">${relation.participations.map(
                    part => `<fieldset><legend>${escapeHTML( entities.find( entity => entity.id === part.entityId )?.name || part.entityId )}</legend>
                        <label>Rol<input data-participation="${part.id}" data-field="role"
                            value="${escapeHTML( part.role )}"></label>
                        <label>Mínimo<input type="number" min="0" data-participation="${part.id}"
                            data-field="min" value="${part.min}"></label>
                        <label>Máximo<input data-participation="${part.id}" data-field="max"
                            value="${part.max ?? 'N'}" title="N indica muchos"></label>
                        <label>Letra junto al rombo<select data-participation="${part.id}"
                            data-field="cardinality">${options(
                                [
                                    ['', `Automática · ${participationCardinalityLetter( relation, part )}`],
                                    ['1', '1'],
                                    ['N', 'N']
                                    ],
                                part.cardinality || ''
                                )}</select></label></fieldset>`
                    ).join( '' )}</div>
            <p class="field-hint">${relation.participations.length === 2
                ? 'En una binaria la letra automática es el máximo de la otra rama.'
                : 'En una ternaria la letra de cada rama la decide el autor; automática muestra N.'}</p>`;
        }
    else if (relation && category === 'translation') {
        content = `<p>${relation.translation
            ? 'Materialización elegida y vinculada mediante identificadores.'
            : 'Pendiente: el dibujo se guarda sin inventar una clave o tabla.'}</p>
            ${command( 'materialize', 'Elegir clave y materializar…', 'table-2' )}
            <p class="field-hint">Una N:N o ternaria usa una tabla asociativa.
                Una fecha/período puede formar parte de la identidad de cada ocurrencia.</p>`;
        }
    else if (entity) {
        content = `<div class="dialog-fields">
            ${propertyInput( 'Nombre:', 'name', entity.name )}
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
            <p><strong>${escapeHTML( attribute.type )}</strong>
                ${attribute.primary ? ' · Clave' : ''}${attribute.partialKey ? ' · Clave parcial' : ''}
                ${attribute.multivalued ? ' · Multivaluado' : ''}${attribute.derived ? ' · Derivado' : ''}
                ${attribute.structure === 'composite' ? ' · Compuesto' : ''}</p>
            ${command( 'edit-attribute', 'Editar atributo y dominio…', 'pencil' )}</div>`;
        }
    else if (generalization) {
        content = `<p>Especialización ${generalization.disjoint ? 'disjunta' : 'solapada'}
            · ${generalization.total ? 'total' : 'parcial'}.</p>
            ${command( 'edit-generalization', 'Editar especialización…', 'pencil' )}`;
        }
    else {
        content = `<div class="dialog-fields">${propertyInput( 'Nombre:', 'name', relation.name )}
            <p>Relación nativa con ${relation.participations.length} participaciones.</p>
            ${command( 'materialize', 'Elegir clave y materializar…', 'table-2' )}</div>`;
        }

    return `<nav class="categories" aria-label="Categorías de propiedades">
        ${categories.map(
                ([id, label]) => `<button data-category="${id}" aria-pressed="${id === category}"
                    class="${id === category ? 'active' : ''}">${label}</button>`
                ).join( '' )}</nav><div class="property-content">
        <p class="provenance">Conceptual nativo · ${model.traces.filter( trace => trace.sourceId === item.id ).length} correspondencias</p>
        ${content}${statuses.map( status => `<p class="pending-message">${escapeHTML( status.message )}</p>` ).join( '' )}</div>`;
    }
