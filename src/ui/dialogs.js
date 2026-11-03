import {
    changeDocument,
    setAlternateKey,
    removeAlternateKey,
    formatDataType,
    getConceptualProjection,
    conceptualStatus,
    addConceptualAttribute,
    updateConceptualAttribute,
    addConceptualRelationship,
    updateConceptualRelationship,
    addConceptualGeneralization,
    updateConceptualGeneralization,
    newId,
    updateColumn,
    validateDocument
    } from '../domain/model.js';
import { typeFields } from './properties.js';
import {
    options,
    check,
    command,
    escapeHTML,
    icon
    } from './html.js';

export function closeDialog() {
    document.querySelector( '#dialog' ).close();
    }

export function openDialog(
        title,
        content,
        onSubmit = null,
        submitLabel = 'Aceptar'
        ) {
    const dialog = document.querySelector( '#dialog' );

    dialog.innerHTML = `<div class="dialog-titlebar"><strong id="dialog-title">${title}</strong>
        <button type="button" data-action="close-dialog" aria-label="Cerrar">${icon( 'x' )}</button></div>
        <form id="dialog-form"><div class="dialog-content">${content}</div>
        <p id="dialog-error" role="alert" hidden></p>
        <footer class="dialog-footer"><button type="button" data-action="close-dialog">
        ${onSubmit ? 'Cancelar' : 'Cerrar'}</button>
        ${onSubmit ? `<button type="submit" class="primary-button">${submitLabel}</button>` : ''}
        </footer></form>`;

    const form = dialog.querySelector( 'form' );
    const synchronizeFields = () => {
        const degree = form.querySelector( '[name="degree"]' );

        for (const row of dialog.querySelectorAll?.( '[data-third-participant="true"]' ) || []) {
            row.hidden = degree?.value !== '3';
            }

        const family = form.querySelector( '[name="typeFamily"]' )?.value;

        for (const group of dialog.querySelectorAll?.( '[data-type-for]' ) || []) {
            const applicable = group.dataset.typeFor === 'characters'
                ? ['CHAR', 'VARCHAR'].includes( family )
                : ['NUMBER', 'DECIMAL'].includes( family );

            group.hidden = !applicable;

            for (const input of group.querySelectorAll( 'input' )) {
                input.disabled = !applicable;
                }
            }

        const rule = form.querySelector( '[name="translationKind"]' )?.value;

        for (const group of dialog.querySelectorAll?.( '[data-translation-for]' ) || []) {
            group.hidden = group.dataset.translationFor !== rule;

            for (const input of group.querySelectorAll( 'input, select' )) {
                input.disabled = group.hidden;
                }
            }
        };

    form.onchange = synchronizeFields;
    synchronizeFields();
    form.onsubmit = event => {
        event.preventDefault();

        try {
            onSubmit?.( new FormData( event.currentTarget ) );
            dialog.close();
            }
        catch (error) {
            const message = dialog.querySelector( '#dialog-error' );

            message.textContent = error.message;
            message.hidden = false;
            }
        };

    if (!dialog.open) {
        dialog.showModal();
        }

    globalThis.lucide?.createIcons();
    }

export function showDisplayOptions(
        state,
        commit
        ) {
    const display = state.model.display;
    const toggle = (label, key) => check(
            label,
            key,
            display[key],
            `name="${key}"`
            );

    openDialog(
            'Opciones del documento de base de datos',
            `<div class="dialog-tabs" role="tablist" aria-label="Opciones del documento">
            <button type="button" role="tab" aria-selected="true" data-modal-tab="general">General</button>
            <button type="button" role="tab" aria-selected="false" data-modal-tab="tables">Tablas</button>
            <button type="button" role="tab" aria-selected="false" data-modal-tab="relations">Relaciones</button></div>
            <section data-modal-panel="general"><fieldset><legend>Nombres que se muestran</legend>
            <label class="check"><input type="radio" name="names" value="physical"
                ${display.conceptual ? '' : 'checked'}>Nombres físicos</label>
            <label class="check"><input type="radio" name="names" value="conceptual"
                ${display.conceptual ? 'checked' : ''}>Nombres conceptuales</label></fieldset>
            <fieldset><legend>Dibujo</legend>${toggle( 'Mostrar cuadrícula', 'grid' )}</fieldset></section>
            <section data-modal-panel="tables" hidden><fieldset><legend>Mostrar</legend>
            ${toggle( 'Tipos de datos', 'types' )}${toggle( 'Claves primarias y foráneas', 'keys' )}
            ${toggle( 'Marcar columnas requeridas con *', 'required' )}</fieldset></section>
            <section data-modal-panel="relations" hidden><fieldset><legend>Mostrar</legend>
            <label>Notación<select name="notation">${options(
                    [['idef1x', 'IDEF1X'], ['crows-foot', 'Patas de cuervo'], ['relational', 'Flecha relacional']],
                    display.notation
                    )}</select></label>${toggle( 'Cardinalidad numérica', 'cardinality' )}
            ${toggle( 'Texto directo de la relación', 'relationshipNames' )}</fieldset></section>`,
            values => commit(
                    changeDocument(
                            state.model,
                            next => {
                                for (const key of [
                                    'types', 'keys', 'required', 'conceptual',
                                    'crowsFeet', 'cardinality', 'relationshipNames', 'grid'
                                    ]) {
                                    next.display[key] = key === 'conceptual'
                                        ? values.get( 'names' ) === 'conceptual'
                                        : values.has( key );
                                    }
                                next.display.notation = values.get( 'notation' );
                                next.display.crowsFeet = next.display.notation === 'crows-foot';
                                }
                            )
                    )
            );
    }

export function showColumnDialog(
        state,
        commit
        ) {
    const table = state.model.tables.find( item => item.id === state.selectedId );
    const field = table?.columns.find( item => item.id === state.selectedColumnId );

    if (!field) {
        return;
        }

    openDialog(
            'Propiedades de columna',
            `<div class="dialog-fields">
            <label>Nombre físico<input name="name" value="${escapeHTML( field.name )}" required maxlength="160"></label>
            ${typeFields( field.type, state.model.profile )}
            ${check( 'Clave primaria (PK)', 'primary', field.primary, `name="primary" ${table.kind === 'view' ? 'disabled' : ''}` )}
            ${check( 'Requerido (NOT NULL)', 'required', field.required, 'name="required"' )}
            <label>Valor predeterminado (expresión SQL)<input name="defaultValue"
                value="${escapeHTML( field.defaultValue )}" maxlength="500" placeholder="Ej.: 0, CURRENT_DATE o 'pendiente'"></label>
            ${domainFields( field.domain )}
            <label>Notas<textarea name="notes" rows="3">${escapeHTML( field.notes )}</textarea></label></div>`,
            values => commit(
                    updateColumn(
                            state.model,
                            table.id,
                            field.id,
                            {
                                name: values.get( 'name' ).trim(),
                                type: dialogDataType( values ),
                                domain: dialogDomain( values ),
                                primary: values.has( 'primary' ),
                                required: values.has( 'required' ),
                                defaultValue: values.get( 'defaultValue' ),
                                notes: values.get( 'notes' )
                                }
                            )
                    )
            );
    }

export function showIndexDialog(
        state,
        commit,
        indexId = null
        ) {
    const table = state.model.tables.find( item => item.id === state.selectedId );

    if (!table) {
        return;
        }

    const index = table.indexes.find( item => item.id === indexId );

    state.editingIndexId = index?.id || null;

    openDialog(
            index ? 'Propiedades del índice' : 'Nuevo índice',
            `<div class="dialog-fields"><label>Nombre<input name="name" required maxlength="160"
                value="${escapeHTML( index?.name || `IX_${table.name}_${table.indexes.length + 1}` )}"></label>
            ${check( 'Índice único', 'unique', index?.unique || false, 'name="unique"' )}
            <fieldset><legend>Columnas del índice</legend>
            ${table.columns.map(
                    field => check(
                            escapeHTML( field.name ),
                            'index-column',
                            index?.columns.includes( field.id ),
                            `name="columns" value="${field.id}"`
                            )
                    ).join( '' )}</fieldset>
            ${index ? command( 'remove-index', 'Eliminar índice', 'trash-2', 'class="danger-button"' ) : ''}</div>`,
            values => commit(
                    changeDocument(
                            state.model,
                            next => {
                                const entity = next.tables.find( item => item.id === table.id );
                                const updated = {
                                    id: index?.id || newId(),
                                    name: values.get( 'name' ).trim(),
                                    unique: values.has( 'unique' ),
                                    columns: values.getAll( 'columns' )
                                    };

                                entity.indexes = entity.indexes.filter( item => item.id !== updated.id );
                                entity.indexes.push( updated );
                                }
                            )
                    )
            );
    }

export function showValidation( model ) {
    const issues = [...validateDocument( model ), ...conceptualStatus( model )];

    openDialog(
            'Comprobación del modelo',
            issues.length
                ? `<div class="validation-list">${issues.map(
                        issue => `<div class="validation-item ${issue.level}">
                            ${icon( issue.level === 'error' ? 'circle-x' : 'triangle-alert' )}
                            <span>${escapeHTML( issue.message )}</span>${issue.elementId ? `<button type="button" data-origin="${issue.elementId}">Ver origen</button>` : ''}</div>`
                        ).join( '' )}</div>`
                : `<div class="validation-success">${icon( 'circle-check' )}
                    <strong>El modelo supera las comprobaciones de DataBasic.</strong>
                    <p>Revisa también las reglas de negocio de tu ejercicio:</p>
                    <ul><li>¿Cada entidad representa el concepto adecuado?</li>
                    <li>¿Las claves identifican cada registro?</li>
                    <li>¿La cardinalidad y la opcionalidad reflejan el enunciado?</li></ul></div>`
            );
    }

export function showHelp() {
    openDialog(
            'DataBasic · Guía de práctica',
            `<div class="help-content"><p>DataBasic es un modelador educativo independiente.
            Su guía toma como referencia el flujo de modelado de bases de datos de Visio 2010.</p>
            <p>No está afiliado a Microsoft ni cuenta con su patrocinio.
                No se afirma contar con autorización de Microsoft.
                Visio es una marca de Microsoft.</p>
            <p><strong>Dos representaciones, un documento.</strong> Relacional conserva
                el recorrido de propiedades de Visio 2010; Chen es una ampliación educativa
                de DataBasic. Cambiar representación no transforma ni reconstruye el significado.</p>
            <p>Los archivos anteriores aparecen en Chen como proyección parcial.
                No se deduce automáticamente una relación N:N de una tabla con dos FKs.</p>
            <ol><li><strong>Crea entidades.</strong> Arrastra Entidad desde Formas al lienzo.</li>
            <li><strong>Define columnas.</strong> Haz doble clic en una entidad. Introduce nombre,
                tipo, requerido y PK en el panel inferior.</li>
            <li><strong>Conecta las tablas.</strong> Pulsa Relación, selecciona el padre y después
                el hijo. Se incorporará su clave foránea.</li>
            <li><strong>Ajusta las reglas.</strong> Selecciona la relación y abre Varios para
                cambiar cardinalidad, tipo y opcionalidad.</li>
            <li><strong>Guarda tu ejercicio.</strong> Archivo → Guardar descarga un archivo
                DataBasic. El último ejercicio se recupera también desde este navegador.</li></ol>
            <p><strong>Crear una N:N o ternaria.</strong> En Chen, pulsa Relación,
                elige participantes y roles y guarda pendiente. Añade sus atributos en
                Atributos; en Correspondencias elige la clave y materializa la tabla asociativa.
                Incluye un período si distingue ocurrencias repetidas. La relación sigue
                conservando roles y límites que el SQL no pueda expresar.</p>
            <p><strong>Tipos del curso.</strong> El perfil del curso usa VARCHAR, CHAR,
                NUMBER y DATE. En Columnas → Editar se eligen familia, parámetros,
                predeterminado y dominio. El perfil general conserva tipos de documentos anteriores.</p>
            <p><strong>Claves alternativas.</strong> Índices / Claves alternativas distingue
                una clave candidata de un índice único. Una clave alternativa obliga sus columnas.</p>
            <p><strong>Estados pendientes.</strong> Revisar modelo muestra restricciones
                documentales o sin traducción. Guardar permite conservar el trabajo pendiente;
                SQL completo exige resolver sus decisiones. Una edición estructural ambigua
                se resuelve desde el objeto conceptual de origen.</p>
            <p><strong>Mover el dibujo:</strong> arrastra el fondo. Usa la rueda para desplazarlo;
                Ctrl/⌘ + rueda para ampliar. También puedes usar el control inferior.</p>
            <p><strong>Atajos:</strong> Ctrl/⌘ + S guarda, Ctrl/⌘ + Z deshace,
                Ctrl/⌘ + Mayús + Z rehace, Supr elimina, Escape cancela un conector.</p>
            <p>Los archivos VSD de Visio todavía no se pueden abrir ni guardar.
                Las opciones de impresión permiten obtener un PDF.</p>
            <p>Las contribuciones originales de DataBasic se ofrecen bajo la licencia MIT.
                Los materiales de terceros conservan sus propios derechos y licencias.
                <a href="./legal.html" target="_blank" rel="noreferrer">Licencias y avisos</a>.</p>
            <p class="help-sources">Referencias:
                <a href="https://support.microsoft.com/en-us/visio/database-properties-for-entity-and-view-shapes-definition"
                    target="_blank" rel="noreferrer">Propiedades de entidades · Microsoft</a> ·
                <a href="https://support.microsoft.com/en-us/visio/preserve-referential-integrity-in-database-model-diagrams"
                    target="_blank" rel="noreferrer">Integridad referencial · Microsoft</a></p></div>`
            );
    }


function optionalNumber( value ) {
    return value === '' || value === null ? null : Number( value );
    }

function dialogDataType( values ) {
    const family = values.get( 'typeFamily' );

    if (['NUMBER', 'DECIMAL'].includes( family )
        && values.get( 'typeScale' )
        && !values.get( 'typePrecision' )) {
        throw new Error( 'Indica la precisión antes de elegir una escala.' );
        }

    return formatDataType({
        family,
        length: ['CHAR', 'VARCHAR'].includes( family )
            ? optionalNumber( values.get( 'typeLength' ) )
            : null,
        precision: ['NUMBER', 'DECIMAL'].includes( family )
            ? optionalNumber( values.get( 'typePrecision' ) )
            : null,
        scale: ['NUMBER', 'DECIMAL'].includes( family )
            ? optionalNumber( values.get( 'typeScale' ) )
            : null
        });
    }

function domainFields( domain ) {
    return `<fieldset><legend>Dominio declarativo</legend>
        <div class="parameter-fields">
        <label>Mínimo<input name="domainMinimum" type="number" step="any"
            value="${domain?.minimum ?? ''}"></label>
        <label>Máximo<input name="domainMaximum" type="number" step="any"
            value="${domain?.maximum ?? ''}"></label></div>
        <label>Valores permitidos · uno por línea<textarea name="domainValues" rows="2">${escapeHTML( (domain?.values || []).join( '\n' ) )}</textarea></label>
        <label>Condición adicional<input name="domainCheck"
            value="${escapeHTML( domain?.check || '' )}" placeholder="Condición documentada"></label>
        <p class="field-hint">Se conserva el dominio. La revisión explica qué restricciones
            son documentales y cuáles se traducen al SQL.</p></fieldset>`;
    }

function dialogDomain( values ) {
    const domain = {
        minimum: optionalNumber( values.get( 'domainMinimum' ) ),
        maximum: optionalNumber( values.get( 'domainMaximum' ) ),
        values: String( values.get( 'domainValues' ) || '' ).split( '\n' )
            .map( value => value.trim() ).filter( Boolean ),
        check: String( values.get( 'domainCheck' ) || '' ).trim()
        };

    return domain.minimum === null && domain.maximum === null
        && !domain.values.length && !domain.check ? null : domain;
    }

export function showConceptualAttributeDialog(
        state,
        commit,
        attributeId = null
        ) {
    const semantic = state.model.conceptual;
    const attribute = semantic.attributes.find( item => item.id === attributeId );
    const entities = getConceptualProjection( state.model ).entities;
    const owners = [
        ...entities.map( item => [`entity:${item.id}`, item.name] ),
        ...semantic.relationships.map( item => [`relationship:${item.id}`, `${item.name} · relación`] )
        ];

    if (!owners.length) {
        throw new Error( 'Crea primero una entidad o una relación conceptual.' );
        }

    const selectedOwner = attribute
        ? `${attribute.ownerKind}:${attribute.ownerId}`
        : owners.find( ([value]) => value.endsWith( `:${state.selectedId}` ) )?.[0] || owners[0][0];

    openDialog(
            attribute ? 'Propiedades del atributo' : 'Nuevo atributo conceptual',
            `<div class="dialog-fields">
            <label>Propietario<select name="owner" ${attribute ? 'disabled' : ''}>${options( owners, selectedOwner )}</select></label>
            <label>Nombre<input name="name" required maxlength="160"
                value="${escapeHTML( attribute?.name || 'atributo' )}"></label>
            ${typeFields( attribute?.type || 'NUMBER', state.model.profile )}
            <div class="choice-fields">
            ${check( 'Clave', 'primary', attribute?.primary, 'name="primary"' )}
            ${check( 'Clave parcial', 'partialKey', attribute?.partialKey, 'name="partialKey"' )}
            ${check( 'Requerido', 'required', attribute?.required, 'name="required"' )}
            ${check( 'Multivaluado', 'multivalued', attribute?.multivalued, 'name="multivalued"' )}
            ${check( 'Derivado', 'derived', attribute?.derived, 'name="derived"' )}</div>
            <label>Estructura<select name="structure">${options(
                    [['simple', 'Simple'], ['composite', 'Compuesto']],
                    attribute?.structure || 'simple'
                    )}</select></label>
            <label>Componente de<select name="parentAttributeId">${options(
                    [['', 'Atributo independiente'], ...semantic.attributes
                        .filter( item => item.id !== attributeId && item.structure === 'composite' )
                        .map( item => [item.id, item.name] )],
                    attribute?.parentAttributeId || ''
                    )}</select></label>
            <label>Traducción del atributo<select name="attributeTranslation">${options(
                    [
                        ['', 'Pendiente · conservar sin decidir'],
                        ['flatten', 'Compuesto · descomponer en componentes'],
                        ['omit', 'Derivado · omitir columna'],
                        ['stored', 'Derivado · almacenar valor sin calcularlo']
                        ],
                    ['flatten', 'omit', 'stored'].includes( attribute?.translation?.kind )
                        ? attribute.translation.kind
                        : ''
                    )}</select></label>
            <p class="field-hint">La elección se aplica a atributos compuestos o derivados.
                Un multivaluado conserva su semántica y sigue pendiente de transformación.</p>
            <label>Regla de derivación<input name="derivation"
                value="${escapeHTML( attribute?.derivation || '' )}"></label>
            <label>Predeterminado · expresión SQL<input name="defaultValue"
                value="${escapeHTML( attribute?.defaultValue || '' )}"></label>
            ${domainFields( attribute?.domain )}
            <label>Notas<textarea name="notes" rows="2">${escapeHTML( attribute?.notes || '' )}</textarea></label>
            <p class="field-hint">Los hechos sin traducción implementada se guardan
                como pendientes o documentales; Revisar modelo muestra su estado.</p></div>`,
            values => {
                const [ownerKind, ownerId] = selectedOwner.split( ':' );
                const chosen = attribute ? [ownerKind, ownerId] : values.get( 'owner' ).split( ':' );
                const definition = {
                    name: values.get( 'name' ).trim(),
                    type: dialogDataType( values ),
                    required: values.has( 'required' ),
                    primary: values.has( 'primary' ),
                    partialKey: values.has( 'partialKey' ),
                    multivalued: values.has( 'multivalued' ),
                    derived: values.has( 'derived' ),
                    structure: values.get( 'structure' ),
                    parentAttributeId: values.get( 'parentAttributeId' ) || null,
                    derivation: values.get( 'derivation' ),
                    defaultValue: values.get( 'defaultValue' ),
                    domain: dialogDomain( values ),
                    notes: values.get( 'notes' )
                    };
                const strategy = values.get( 'attributeTranslation' );

                if (strategy === 'flatten' && definition.structure !== 'composite') {
                    throw new Error( 'Descomponer requiere atributo compuesto.' );
                    }

                if (['omit', 'stored'].includes( strategy ) && !definition.derived) {
                    throw new Error( 'Omitir o almacenar requiere atributo derivado.' );
                    }

                if (definition.structure === 'composite' || definition.derived) {
                    definition.translation = strategy ? {kind: strategy} : null;
                    }
                else if (strategy) {
                    throw new Error( 'La estrategia elegida requiere atributo compuesto o derivado.' );
                    }

                const next = attribute
                    ? updateConceptualAttribute( state.model, attribute.id, definition )
                    : addConceptualAttribute(
                            state.model,
                            {...definition, ownerKind: chosen[0], ownerId: chosen[1]}
                            );

                state.selectedId = attribute?.id || next.conceptual.attributes.at( -1 ).id;
                state.category = 'definition';
                commit( next );
                }
            );
    }

export function showConceptualRelationshipDialog(
        state,
        commit
        ) {
    const entities = getConceptualProjection( state.model ).entities;

    if (!entities.length) {
        throw new Error( 'Crea primero las entidades participantes.' );
        }

    openDialog(
            'Nueva relación conceptual',
            `<div class="dialog-fields">
            <label>Nombre<input name="name" required value="Participa"></label>
            <label>Grado<select name="degree">${options(
                    [[2, 'Binaria · 2 participaciones'], [3, 'Ternaria · 3 participaciones']],
                    2
                    )}</select></label>
            ${[0, 1, 2].map(
                    index => `<fieldset data-third-participant="${index === 2}">
                        <legend>Participación ${index + 1}${index === 2 ? ' · sólo ternaria' : ''}</legend>
                        <label>Entidad<select name="entity${index}">${options(
                                entities.map( entity => [entity.id, entity.name] ),
                                entities[Math.min( index, entities.length - 1 )].id
                                )}</select></label>
                        <label>Rol<input name="role${index}" value="${escapeHTML( `rol${index + 1}` )}"></label>
                        <div class="parameter-fields">
                        <label>Mínimo<input type="number" min="0" name="min${index}" value="0"></label>
                        <label>Máximo<input name="max${index}" value="N"></label></div></fieldset>`
                    ).join( '' )}
            <p class="field-hint">Una entidad puede participar varias veces con roles distintos.
                La relación se crea pendiente: añade sus atributos y elige después su clave.</p></div>`,
            values => {
                const participations = Array.from(
                        {length: Number( values.get( 'degree' ) )},
                        (_, index) => ({
                            entityId: values.get( `entity${index}` ),
                            role: values.get( `role${index}` ).trim(),
                            min: Number( values.get( `min${index}` ) ),
                            max: values.get( `max${index}` ).trim().toUpperCase() === 'N'
                                ? null
                                : Number( values.get( `max${index}` ) )
                            })
                        );
                const next = addConceptualRelationship(
                        state.model,
                        {name: values.get( 'name' ).trim(), participations, translation: null}
                        );

                state.selectedId = next.conceptual.relationships.at( -1 ).id;
                state.category = 'misc';
                commit( next );
                },
            'Crear pendiente'
            );
    }

export function showMaterializationDialog(
        state,
        commit
        ) {
    const relation = state.model.conceptual.relationships.find(
            item => item.id === state.selectedId
            );

    if (!relation) {
        throw new Error( 'Selecciona una relación conceptual nativa.' );
        }

    const attributes = state.model.conceptual.attributes.filter(
            item => item.ownerKind === 'relationship' && item.ownerId === relation.id
            );
    const key = relation.translation?.key;

    openDialog(
            'Clave y materialización de la relación',
            `<div class="dialog-fields">
            <label>Regla de transformación<select name="translationKind">${options(
                    [
                        ['association', 'Tabla asociativa · N:N / ternaria'],
                        ...(relation.participations.length === 2
                            ? [['foreign-key', 'FK binaria · elegir lado receptor']]
                            : [])
                        ],
                    relation.translation?.kind || 'association'
                    )}</select></label>
            ${relation.participations.length === 2 ? `<div data-translation-for="foreign-key"><label>Participación receptora de la FK<select name="childParticipationId">${options(
                    relation.participations.map( part => [part.id, part.role] ),
                    relation.translation?.childParticipationId || relation.participations[0].id
                    )}</select></label>
                ${check(
                        'Identificadora · incorpora la FK a la clave hija',
                        'identifying',
                        relation.translation?.identifying || false,
                        'name="identifying"'
                        )}</div>` : ''}
            <div data-translation-for="association"><label>Tabla asociativa<input name="tableName" required
                value="${escapeHTML( relation.translation?.tableName || relation.name )}"></label>
            <fieldset><legend>Identidad de cada ocurrencia · elección explícita</legend>
            ${relation.participations.map(
                    part => check(
                            escapeHTML( `Clave de ${part.role}` ),
                            'participationKey',
                            key?.participationIds.includes( part.id ) || false,
                            `name="participationIds" value="${part.id}"`
                            )
                    ).join( '' )}
            ${attributes.map(
                    attribute => check(
                            escapeHTML( attribute.name ),
                            'attributeKey',
                            key?.attributeIds.includes( attribute.id ) || false,
                            `name="attributeIds" value="${attribute.id}"`
                            )
                    ).join( '' )}</fieldset></div>
            <p>¿Puede repetirse la misma combinación en otro período?
                Añade primero ese atributo y selecciónalo si distingue la ocurrencia.</p>
            <p class="field-hint">No se supone que todas las claves participantes basten.
                La materialización y sus referencias se guardan en una sola operación.</p></div>`,
            values => commit(
                    updateConceptualRelationship(
                            state.model,
                            relation.id,
                            {translation: values.get( 'translationKind' ) === 'foreign-key'
                                ? {
                                    kind: 'foreign-key',
                                    childParticipationId: values.get( 'childParticipationId' ),
                                    identifying: values.has( 'identifying' )
                                    }
                                : {
                                kind: 'association',
                                tableName: values.get( 'tableName' ).trim(),
                                key: {
                                    participationIds: values.getAll( 'participationIds' ),
                                    attributeIds: values.getAll( 'attributeIds' )
                                    }
                                }}
                            )
                    ),
            'Materializar'
            );
    }

export function showGeneralizationDialog(
        state,
        commit,
        id = null
        ) {
    const projection = getConceptualProjection( state.model );
    const existing = state.model.conceptual.generalizations.find( item => item.id === id );

    if (projection.entities.length < 2) {
        throw new Error( 'Una especialización necesita superclase y al menos una subclase.' );
        }

    openDialog(
            'Generalización / Especialización',
            `<div class="dialog-fields">
            <label>Superclase<select name="supertypeId">${options(
                    projection.entities.map( entity => [entity.id, entity.name] ),
                    existing?.supertypeId || projection.entities[0].id
                    )}</select></label>
            <fieldset><legend>Subclases</legend>${projection.entities.map(
                    entity => check(
                            escapeHTML( entity.name ),
                            'subtypeIds',
                            existing?.subtypeIds.includes( entity.id ) || false,
                            `name="subtypeIds" value="${entity.id}"`
                            )
                    ).join( '' )}</fieldset>
            ${check( 'Disjunta · una sola subclase', 'disjoint', existing?.disjoint ?? true, 'name="disjoint"' )}
            ${check( 'Total · toda ocurrencia pertenece a alguna subclase', 'total', existing?.total || false, 'name="total"' )}
            <label>Notas<textarea name="notes" rows="2">${escapeHTML( existing?.notes || '' )}</textarea></label>
            <p class="field-hint">Se conserva la jerarquía conceptual. Su estado documental
                o pendiente aparece en Revisar modelo.</p></div>`,
            values => {
                const definition = {
                    supertypeId: values.get( 'supertypeId' ),
                    subtypeIds: values.getAll( 'subtypeIds' ),
                    disjoint: values.has( 'disjoint' ),
                    total: values.has( 'total' ),
                    notes: values.get( 'notes' ),
                    translation: null
                    };
                const next = existing
                    ? updateConceptualGeneralization( state.model, existing.id, definition )
                    : addConceptualGeneralization( state.model, definition );

                state.selectedId = existing?.id || next.conceptual.generalizations.at( -1 ).id;
                state.category = 'definition';
                commit( next );
                }
            );
    }


export function showAlternateKeyDialog(
        state,
        commit,
        keyId = null
        ) {
    const table = state.model.tables.find( item => item.id === state.selectedId );

    if (!table) {
        throw new Error( 'Selecciona una tabla relacional.' );
        }

    const key = (table.alternateKeys || []).find( item => item.id === keyId );

    openDialog(
            key ? 'Editar clave alternativa' : 'Nueva clave alternativa',
            `<div class="dialog-fields">
            <label>Nombre<input name="name" required
                value="${escapeHTML( key?.name || `AK_${table.name}` )}"></label>
            <fieldset><legend>Columnas de la clave candidata</legend>
            ${table.columns.map(
                    field => check(
                            escapeHTML( field.name ),
                            'key-column',
                            key?.columns.includes( field.id ) || false,
                            `name="columns" value="${field.id}"`
                            )
                    ).join( '' )}</fieldset>
            ${key ? check( 'Eliminar esta clave alternativa', 'remove', false, 'name="remove"' ) : ''}
            <p class="field-hint">La clave identifica cada fila y sus columnas pasan a ser
                requeridas. Un índice único de rendimiento se edita por separado.</p></div>`,
            values => commit(
                    key && values.has( 'remove' )
                        ? removeAlternateKey( state.model, table.id, key.id )
                        : setAlternateKey(
                                state.model,
                                table.id,
                                {
                                    ...(key ? {id: key.id} : {}),
                                    name: values.get( 'name' ).trim(),
                                    columns: values.getAll( 'columns' )
                                    }
                                )
                    )
            );
    }
