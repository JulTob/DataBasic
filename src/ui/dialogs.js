import {
    changeDocument,
    newId,
    updateColumn,
    validateDocument
    } from '../domain/model.js';
import {
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

    dialog.querySelector( 'form' ).onsubmit = event => {
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
            ${toggle( 'Patas de cuervo', 'crowsFeet' )}${toggle( 'Cardinalidad numérica', 'cardinality' )}
            ${toggle( 'Texto directo de la relación', 'relationshipNames' )}</fieldset></section>`,
            values => commit(
                    changeDocument(
                            state.model,
                            next => {
                                for (const key of Object.keys( next.display )) {
                                    next.display[key] = key === 'conceptual'
                                        ? values.get( 'names' ) === 'conceptual'
                                        : values.has( key );
                                    }
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
            <label>Tipo de datos<input name="type" value="${escapeHTML( field.type )}" list="data-types" required></label>
            ${check( 'Clave primaria (PK)', 'primary', field.primary, `name="primary" ${table.kind === 'view' ? 'disabled' : ''}` )}
            ${check( 'Requerido (NOT NULL)', 'required', field.required, 'name="required"' )}
            <label>Valor predeterminado (expresión SQL)<input name="defaultValue"
                value="${escapeHTML( field.defaultValue )}" maxlength="500" placeholder="Ej.: 0, CURRENT_DATE o 'pendiente'"></label>
            <label>Notas<textarea name="notes" rows="3">${escapeHTML( field.notes )}</textarea></label></div>`,
            values => commit(
                    updateColumn(
                            state.model,
                            table.id,
                            field.id,
                            {
                                name: values.get( 'name' ).trim(),
                                type: values.get( 'type' ).trim().toUpperCase(),
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
    const issues = validateDocument( model );

    openDialog(
            'Comprobación del modelo',
            issues.length
                ? `<div class="validation-list">${issues.map(
                        issue => `<div class="validation-item ${issue.level}">
                            ${icon( issue.level === 'error' ? 'circle-x' : 'triangle-alert' )}
                            <span>${escapeHTML( issue.message )}</span></div>`
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
            `<div class="help-content"><p>Un modelador de bases de datos para practicar
            con el flujo de trabajo de Visio 2010.</p>
            <ol><li><strong>Crea entidades.</strong> Arrastra Entidad desde Formas al lienzo.</li>
            <li><strong>Define columnas.</strong> Haz doble clic en una entidad. Introduce nombre,
                tipo, requerido y PK en el panel inferior.</li>
            <li><strong>Conecta las tablas.</strong> Pulsa Relación, selecciona el padre y después
                el hijo. Se incorporará su clave foránea.</li>
            <li><strong>Ajusta las reglas.</strong> Selecciona la relación y abre Varios para
                cambiar cardinalidad, tipo y opcionalidad.</li>
            <li><strong>Guarda tu ejercicio.</strong> Archivo → Guardar descarga un archivo
                DataBasic. El último ejercicio se recupera también desde este navegador.</li></ol>
            <p><strong>Mover el dibujo:</strong> arrastra el fondo. Usa la rueda para desplazarlo;
                Ctrl/⌘ + rueda para ampliar. También puedes usar el control inferior.</p>
            <p><strong>Atajos:</strong> Ctrl/⌘ + S guarda, Ctrl/⌘ + Z deshace,
                Ctrl/⌘ + Mayús + Z rehace, Supr elimina, Escape cancela un conector.</p>
            <p>Los archivos VSD de Visio todavía no se pueden abrir ni guardar.
                Las opciones de impresión permiten obtener un PDF.</p>
            <p class="help-sources">Referencias:
                <a href="https://support.microsoft.com/en-us/visio/database-properties-for-entity-and-view-shapes-definition"
                    target="_blank" rel="noreferrer">Propiedades de entidades · Microsoft</a> ·
                <a href="https://support.microsoft.com/en-us/visio/preserve-referential-integrity-in-database-model-diagrams"
                    target="_blank" rel="noreferrer">Integridad referencial · Microsoft</a></p></div>`
            );
    }
