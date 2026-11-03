import {
    addColumn,
    addRelationship,
    addTable,
    changeDocument,
    emptyDocument,
    exampleDocument,
    moveColumn,
    newId,
    removeColumn,
    removeElement,
    updateColumn,
    updateRelationship,
    updateTable
    } from './domain/model.js';
import {
    parseDocument,
    serializeDocument
    } from './domain/serialization.js';
import { exportSQL } from './io/sql.js';
import {
    diagramContents,
    exportSVG,
    TABLE_WIDTH,
    tableHeight
    } from './ui/diagram.js';
import {
    command,
    escapeHTML
    } from './ui/html.js';
import {
    explorerContents,
    initialLayout,
    ribbonContents
    } from './ui/layout.js';
import { renderProperties } from './ui/properties.js';
import {
    closeDialog,
    openDialog,
    showColumnDialog,
    showDisplayOptions,
    showHelp,
    showIndexDialog,
    showValidation
    } from './ui/dialogs.js';

const state = {
    model: exampleDocument(),
    selectedId: null,
    selectedColumnId: null,
    category: 'definition',
    tab: 'database',
    tool: 'pointer',
    parentId: null,
    propertiesShown: true,
    past: [],
    future: [],
    clipboard: null,
    viewport: {x: 25, y: 25, zoom: 0.85},
    drag: null,
    saveTimer: null,
    saveSequence: 0,
    toastTimer: null,
    lastPick: null,
    layoutInstance: null
    };

const app = document.querySelector( '#app' );

app.innerHTML = initialLayout( state );

const canvas = document.querySelector( '#canvas' );

function refreshIcons() {
    globalThis.lucide?.createIcons({
        attrs: {
            'stroke-width': 1.65
            }
        });
    }

function notify( message ) {
    const toast = document.querySelector( '#toast' );

    clearTimeout( state.toastTimer );
    toast.textContent = message;
    toast.classList.add( 'visible' );
    state.toastTimer = setTimeout( () => toast.classList.remove( 'visible' ), 5000 );
    }

function renderDiagram() {
    let model = state.model;

    if (state.drag?.preview) {
        model = {
            ...model,
            tables: model.tables.map(
                    table => table.id === state.drag.tableId
                        ? {...table, ...state.drag.preview}
                        : table
                    )
            };
        }

    const viewport = document.querySelector( '#viewport' );
    const view = state.viewport;

    viewport.innerHTML = diagramContents( model, state.selectedId, state.parentId );
    viewport.setAttribute( 'transform', `translate(${view.x},${view.y}) scale(${view.zoom})` );
    canvas.style.backgroundSize = `${20 * view.zoom}px ${20 * view.zoom}px`;
    canvas.style.backgroundPosition = `${view.x}px ${view.y}px`;
    canvas.classList.toggle( 'without-grid', !model.display.grid );
    canvas.classList.toggle( 'connecting', state.tool === 'relationship' );
    document.querySelector( '#canvas-empty' ).hidden = model.tables.length !== 0;

    const hint = document.querySelector( '#tool-hint' );

    hint.hidden = state.tool !== 'relationship';
    hint.textContent = state.parentId
        ? 'Ahora selecciona la entidad hija. Escape para cancelar.'
        : 'Selecciona la entidad padre (la que aporta la clave primaria).';
    document.querySelector( '#zoom' ).value = String( Math.round( view.zoom * 100 ) );
    document.querySelector( '#zoom-label' ).textContent = `${Math.round( view.zoom * 100 )} %`;
    }

function renderPropertyPane() {
    const selected = state.model.tables.find( item => item.id === state.selectedId )
        || state.model.relationships.find( item => item.id === state.selectedId );

    document.querySelector( '#properties-body' ).innerHTML = renderProperties( state.model, state );
    document.querySelector( '#properties-name' ).textContent = selected ? `— ${selected.name}` : '';
    document.querySelector( '#properties-pane' ).hidden = !state.propertiesShown;
    document.querySelector( '#pane-splitter' ).hidden = !state.propertiesShown;
    document.querySelector( '.drawing-area' ).classList.toggle( 'properties-hidden', !state.propertiesShown );
    }

function render( preserveEditors = false ) {
    document.querySelector( '#document-name' ).textContent = state.model.name;
    document.title = `${state.model.name} — DataBasic`;
    if (!preserveEditors) {
        document.querySelector( '#ribbon' ).innerHTML = ribbonContents( state );
        document.querySelector( '#entity-list' ).innerHTML = explorerContents( state );
        }

    for (const button of document.querySelectorAll( '[data-tab]' )) {
        button.setAttribute( 'aria-pressed', String( button.dataset.tab === state.tab ) );
        }

    for (const button of document.querySelectorAll( '[data-action="undo"]' )) {
        button.disabled = state.past.length === 0;
        }

    for (const button of document.querySelectorAll( '[data-action="redo"]' )) {
        button.disabled = state.future.length === 0;
        }

    const table = state.model.tables.find( item => item.id === state.selectedId );

    if (preserveEditors && table) {
        document.querySelector( '#properties-name' ).textContent = `— ${table.name}`;

        const explorerName = document.querySelector(
                `[data-select="${table.id}"] span`
                );

        if (explorerName) {
            explorerName.textContent = table.name;
            }

        for (const key of ['name', 'conceptualName']) {
            const input = document.querySelector(
                    `.definition-fields input[data-field="${key}"]`
                    );

            if (input && input !== document.activeElement) {
                input.value = table[key];
                }
            }
        }

    if (!table?.columns.some( item => item.id === state.selectedColumnId )) {
        state.selectedColumnId = table?.columns[0]?.id || null;
        }

    document.querySelector( '#model-count' ).textContent =
        `${state.model.tables.length} tablas y vistas · ${state.model.relationships.length} relaciones`;
    document.querySelector( '#selection-status' ).textContent = table
        ? `${table.name} · ${table.columns.length} columnas`
        : state.model.relationships.find( item => item.id === state.selectedId )?.name || 'Listo';

    renderDiagram();
    if (!preserveEditors) {
        renderPropertyPane();
        }
    refreshIcons();
    }

function scheduleSave() {
    clearTimeout( state.saveTimer );

    const sequence = ++state.saveSequence;

    document.querySelector( '#save-status' ).textContent = 'Guardando…';
    state.saveTimer = setTimeout(
            async () => {
                try {
                    await globalThis.idbKeyval.set(
                            'databasic.document.v1',
                            serializeDocument( state.model )
                            );

                    if (sequence === state.saveSequence) {
                        document.querySelector( '#save-status' ).textContent = 'Guardado en este navegador';
                        }
                    }
                catch {
                    document.querySelector( '#save-status' ).textContent = 'Sin guardado automático';
                    notify( 'El navegador no permite guardar aquí. Usa Archivo → Guardar para descargar tu ejercicio.' );
                    }
                },
            350
            );
    }

function commit(
        next,
        preserveEditors = false
        ) {
    if (serializeDocument( next ) === serializeDocument( state.model )) {
        return;
        }

    state.past.push( structuredClone( state.model ) );

    if (state.past.length > 100) {
        state.past.shift();
        }

    state.future = [];
    state.model = next;

    if (!next.tables.some( item => item.id === state.selectedId )
        && !next.relationships.some( item => item.id === state.selectedId )) {
        state.selectedId = null;
        }

    scheduleSave();
    render( preserveEditors );
    }

function selectElement(
        id,
        category = null
        ) {
    const previousWasRelation = state.model.relationships.some(
            item => item.id === state.selectedId
            );
    const nextIsRelation = state.model.relationships.some( item => item.id === id );

    state.selectedId = id;
    state.propertiesShown = true;

    if (category) {
        state.category = category;
        }
    else if (previousWasRelation !== nextIsRelation) {
        state.category = 'definition';
        }

    render();
    }

function download(
        contents,
        filename,
        type
        ) {
    const blob = new Blob( [contents], {type} );
    const link = document.createElement( 'a' );
    const url = URL.createObjectURL( blob );

    link.href = url;
    link.download = filename;
    document.body.append( link );
    link.click();
    link.remove();
    setTimeout( () => URL.revokeObjectURL( url ), 1000 );
    }

function filename( extension ) {
    const name = state.model.name.replace( /[^\p{L}\p{N}_ -]/gu, '' ).trim();

    return `${name || 'DataBasic'}.${extension}`;
    }

function canvasPoint(
        clientX,
        clientY
        ) {
    const bounds = canvas.getBoundingClientRect();
    const view = state.viewport;

    return {
        x: (clientX - bounds.left - view.x) / view.zoom,
        y: (clientY - bounds.top - view.y) / view.zoom
        };
    }

function createEntity(
        kind = 'entity',
        position = null
        ) {
    const bounds = canvas.getBoundingClientRect();
    const location = position || canvasPoint(
            bounds.left + bounds.width * 0.4,
            bounds.top + bounds.height * 0.25
            );
    const next = addTable( state.model, kind, location );

    state.selectedId = next.tables.at( -1 ).id;
    state.category = 'definition';
    state.tool = 'pointer';
    state.parentId = null;
    state.propertiesShown = true;
    commit( next );
    }

function zoomTo(
        zoom,
        anchor = null
        ) {
    const bounds = canvas.getBoundingClientRect();
    const center = anchor || {x: bounds.width / 2, y: bounds.height / 2};
    const oldZoom = state.viewport.zoom;
    const newZoom = Math.min( 2, Math.max( 0.25, zoom ) );

    state.viewport.x = center.x - (center.x - state.viewport.x) * newZoom / oldZoom;
    state.viewport.y = center.y - (center.y - state.viewport.y) * newZoom / oldZoom;
    state.viewport.zoom = newZoom;
    renderDiagram();
    }

function fitDiagram() {
    if (!state.model.tables.length) {
        state.viewport = {x: 35, y: 35, zoom: 0.85};
        renderDiagram();
        return;
        }

    const bounds = canvas.getBoundingClientRect();
    const left = Math.min( ...state.model.tables.map( table => table.x ) ) - 45;
    const top = Math.min( ...state.model.tables.map( table => table.y ) ) - 45;
    const right = Math.max( ...state.model.tables.map( table => table.x + TABLE_WIDTH ) ) + 70;
    const bottom = Math.max( ...state.model.tables.map( table => table.y + tableHeight( table ) ) ) + 60;
    const toolbarInset = Math.min( 76, bounds.height / 3 );
    const contentHeight = Math.max( 100, bounds.height - toolbarInset );
    const zoom = Math.min(
            1.1,
            bounds.width / (right - left),
            contentHeight / (bottom - top)
            );

    state.viewport = {
        zoom,
        x: (bounds.width - (right - left) * zoom) / 2 - left * zoom,
        y: toolbarInset + (contentHeight - (bottom - top) * zoom) / 2 - top * zoom
        };
    renderDiagram();
    }

function undo() {
    if (!state.past.length) {
        return;
        }

    state.future.push( structuredClone( state.model ) );
    state.model = state.past.pop();
    state.selectedId = null;
    scheduleSave();
    render();
    }

function redo() {
    if (!state.future.length) {
        return;
        }

    state.past.push( structuredClone( state.model ) );
    state.model = state.future.pop();
    state.selectedId = null;
    scheduleSave();
    render();
    }

function deleteSelected() {
    if (!state.selectedId) {
        return;
        }

    const element = state.model.tables.find( item => item.id === state.selectedId );

    if (!element) {
        commit( removeElement( state.model, state.selectedId ) );
        return;
        }

    const count = state.model.relationships.filter(
            relation => relation.parentId === element.id || relation.childId === element.id
            ).length;

    openDialog(
            'Eliminar entidad',
            `<p>¿Eliminar <strong>${escapeHTML( element.name )}</strong>${count ? ` y sus ${count} relaciones` : ''}?</p>
            <p>Las columnas de otras tablas se conservan. Puedes deshacer esta operación.</p>`,
            () => commit( removeElement( state.model, element.id ) ),
            'Eliminar'
            );
    }

function copySelected() {
    const table = state.model.tables.find( item => item.id === state.selectedId );

    if (table) {
        state.clipboard = structuredClone( table );
        notify( `Entidad ${table.name} copiada.` );
        render();
        }
    }

function pasteTable() {
    if (!state.clipboard) {
        return;
        }

    const clone = structuredClone( state.clipboard );
    const mapping = new Map();
    const next = changeDocument(
            state.model,
            model => {
                clone.id = newId();

                let number = 1;

                while (model.tables.some( table => table.name === `${clone.name}_copia${number}` )) {
                    number += 1;
                    }

                clone.name = `${clone.name}_copia${number}`;
                clone.conceptualName = clone.name;
                clone.x += 45;
                clone.y += 45;

                for (const field of clone.columns) {
                    const oldId = field.id;

                    field.id = newId();
                    mapping.set( oldId, field.id );
                    }

                for (const index of clone.indexes) {
                    index.id = newId();
                    index.name = `${index.name}_copia${number}`;
                    index.columns = index.columns.map( id => mapping.get( id ) );
                    }

                model.tables.push( clone );
                }
            );

    state.selectedId = clone.id;
    commit( next );
    }

async function autoLayout() {
    if (!state.model.tables.length) {
        return;
        }

    notify( 'Organizando el diagrama…' );

    state.layoutInstance ||= await globalThis.Viz.instance();

    const sourceModel = state.model;
    const graph = [
        'digraph G { graph [rankdir=LR, nodesep=0.8, ranksep=1.6]; node [shape=box, fixedsize=true, label=""];',
        ...sourceModel.tables.map(
                table => `"${table.id}" [width=${TABLE_WIDTH / 72}, height=${tableHeight( table ) / 72}];`
                ),
        ...sourceModel.relationships.map(
                relation => `"${relation.parentId}" -> "${relation.childId}";`
                ),
        '}'
        ].join( '\n' );
    const result = state.layoutInstance.renderJSON( graph );
    const height = Number( result.bb.split( ',' )[3] );

    if (state.model !== sourceModel) {
        notify( 'El modelo cambió mientras se organizaba. Vuelve a pulsar Distribuir.' );
        return;
        }

    commit(
            changeDocument(
                    state.model,
                    next => {
                        for (const node of result.objects || []) {
                            const table = next.tables.find( item => item.id === node.name );

                            if (!table || !node.pos) {
                                continue;
                                }

                            const [x, y] = node.pos.split( ',' ).map( Number );

                            table.x = Math.max( 30, x - TABLE_WIDTH / 2 + 50 );
                            table.y = Math.max( 30, height - y - tableHeight( table ) / 2 + 50 );
                            }
                        }
                    )
            );
    fitDiagram();
    notify( 'Diagrama distribuido. Puedes deshacer para recuperar las posiciones anteriores.' );
    }

function showSQL() {
    const sql = exportSQL( state.model );

    openDialog(
            'SQL del modelo',
            `<p>SQL de estudio. Revisa la sintaxis para el motor que utilices en clase.</p>
            <textarea class="sql-output" readonly aria-label="SQL generado">${escapeHTML( sql )}</textarea>
            ${command( 'download-sql', 'Descargar SQL', 'download' )}`
            );
    }

function removeIndex() {
    commit(
            changeDocument(
                    state.model,
                    next => {
                        const table = next.tables.find( item => item.id === state.selectedId );

                        table.indexes = table.indexes.filter( item => item.id !== state.editingIndexId );
                        }
                    )
            );
    closeDialog();
    }

function replaceCurrentDocument( model ) {
    state.selectedId = null;
    state.parentId = null;
    state.tool = 'pointer';
    commit( model );
    fitDiagram();
    }

async function act(
        action,
        target
        ) {
    switch (action) {
        case 'entity':
            createEntity();
            break;
        case 'view-shape':
            createEntity( 'view' );
            break;
        case 'pointer':
            state.tool = 'pointer';
            state.parentId = null;
            render();
            break;
        case 'relationship':
            state.tool = state.tool === 'relationship' ? 'pointer' : 'relationship';
            state.parentId = null;
            render();
            break;
        case 'save':
            download( serializeDocument( state.model ), filename( 'databasic.json' ), 'application/json' );
            notify( 'Copia del ejercicio descargada.' );
            break;
        case 'open':
            document.querySelector( '#open-file' ).click();
            break;
        case 'new':
            replaceCurrentDocument( emptyDocument() );
            break;
        case 'example':
            replaceCurrentDocument( exampleDocument() );
            break;
        case 'rename':
            openDialog(
                    'Nombre del documento',
                    `<label class="dialog-fields">Nombre<input name="name" required maxlength="160"
                        value="${escapeHTML( state.model.name )}"></label>`,
                    values => commit(
                            changeDocument( state.model, next => { next.name = values.get( 'name' ).trim(); } )
                            )
                    );
            break;
        case 'undo':
            undo();
            break;
        case 'redo':
            redo();
            break;
        case 'delete':
            deleteSelected();
            break;
        case 'copy':
            copySelected();
            break;
        case 'paste':
            pasteTable();
            break;
        case 'duplicate':
            copySelected();
            pasteTable();
            break;
        case 'properties':
            state.propertiesShown = !state.propertiesShown;
            render();
            break;
        case 'display':
            showDisplayOptions( state, commit );
            break;
        case 'validate':
            showValidation( state.model );
            break;
        case 'help':
            showHelp();
            break;
        case 'sql':
            showSQL();
            break;
        case 'download-sql':
            download( exportSQL( state.model ), filename( 'sql' ), 'text/plain' );
            break;
        case 'svg':
            download( exportSVG( state.model ), filename( 'svg' ), 'image/svg+xml' );
            break;
        case 'print':
            window.print();
            break;
        case 'fit':
            fitDiagram();
            break;
        case 'zoom-100':
            zoomTo( 1 );
            break;
        case 'zoom-in':
            zoomTo( state.viewport.zoom + 0.1 );
            break;
        case 'zoom-out':
            zoomTo( state.viewport.zoom - 0.1 );
            break;
        case 'layout':
            await autoLayout();
            break;
        case 'grid':
            commit( changeDocument( state.model, next => { next.display.grid = !next.display.grid; } ) );
            break;
        case 'add-column':
            if (state.model.tables.some( table => table.id === state.selectedId )) {
                const next = addColumn( state.model, state.selectedId );

                state.selectedColumnId = next.tables.find( table => table.id === state.selectedId ).columns.at( -1 ).id;
                state.category = 'columns';
                state.propertiesShown = true;
                commit( next );
                }
            break;
        case 'remove-column':
            if (state.selectedColumnId) {
                commit( removeColumn( state.model, state.selectedId, state.selectedColumnId ) );
                }
            break;
        case 'edit-column':
            showColumnDialog( state, commit );
            break;
        case 'column-up':
        case 'column-down':
            if (state.selectedColumnId) {
                commit( moveColumn( state.model, state.selectedId, state.selectedColumnId, action === 'column-up' ? -1 : 1 ) );
                }
            break;
        case 'notes':
            state.category = 'notes';
            state.propertiesShown = true;
            render();
            break;
        case 'new-index':
            showIndexDialog( state, commit );
            break;
        case 'edit-index':
            showIndexDialog( state, commit, target.dataset.indexId );
            break;
        case 'remove-index':
            removeIndex();
            break;
        case 'close-dialog':
            closeDialog();
            break;
        }
    }

function fieldChanged( target ) {
    if (target.closest( 'dialog' )) {
        return;
        }

    const relation = state.model.relationships.find( item => item.id === state.selectedId );

    if (target.dataset.mapping !== undefined && relation) {
        const mappings = structuredClone( relation.mappings );

        mappings[Number( target.dataset.mapping )].childColumnId = target.value;
        commit( updateRelationship( state.model, relation.id, {mappings} ) );
        return;
        }

    const field = target.dataset.field;

    if (!field) {
        return;
        }

    let value = target.type === 'checkbox' ? target.checked : target.value;

    if (target.dataset.boolean) {
        value = target.value === 'true';
        }

    if (target.dataset.colId) {
        state.selectedColumnId = target.dataset.colId;
        commit(
                updateColumn(
                        state.model,
                        state.selectedId,
                        target.dataset.colId,
                        {[field]: value}
                        ),
                target.type !== 'checkbox'
                );
        }
    else if (relation) {
        commit(
                updateRelationship( state.model, relation.id, {[field]: value} ),
                !['checkbox', 'radio', 'select-one'].includes( target.type )
                );
        }
    else if (state.model.tables.some( table => table.id === state.selectedId )) {
        commit(
                updateTable( state.model, state.selectedId, {[field]: value} ),
                target.type !== 'checkbox'
                );
        }
    }

function relationshipPick( tableId ) {
    const table = state.model.tables.find( item => item.id === tableId );

    if (table.kind === 'view') {
        throw new Error( 'Selecciona una entidad. Las vistas no reciben claves foráneas.' );
        }

    if (!state.parentId) {
        if (!table.columns.some( field => field.primary )) {
            throw new Error( 'La entidad padre necesita una clave primaria.' );
            }

        state.parentId = tableId;
        renderDiagram();
        return;
        }

    const next = addRelationship( state.model, state.parentId, tableId );

    state.selectedId = next.relationships.at( -1 ).id;
    state.parentId = null;
    state.tool = 'pointer';
    state.category = 'definition';
    commit( next );
    notify( 'Relación creada. Selecciona Varios para ajustar cardinalidad y opcionalidad.' );
    }

function pointerDown( event ) {
    if (![0, 1].includes( event.button )) {
        return;
        }

    const tableNode = event.target.closest( '[data-table-id]' );
    const relationNode = event.target.closest( '[data-relation-id]' );
    const point = canvasPoint( event.clientX, event.clientY );

    try {
        if (tableNode && state.tool === 'relationship') {
            relationshipPick( tableNode.dataset.tableId );
            return;
            }

        if (relationNode && event.button === 0) {
            selectElement( relationNode.dataset.relationId );
            return;
            }

        if (tableNode && event.button === 0) {
            const tableId = tableNode.dataset.tableId;
            const previous = state.lastPick;
            const double = previous?.id === tableId && performance.now() - previous.time < 350;
            const table = state.model.tables.find( item => item.id === tableId );

            state.lastPick = {id: tableId, time: performance.now()};
            selectElement( tableId, double ? 'columns' : null );
            state.drag = {
                tableId,
                startX: point.x,
                startY: point.y,
                originX: table.x,
                originY: table.y,
                preview: null
                };
            }
        else {
            state.selectedId = null;
            state.drag = {
                startX: event.clientX,
                startY: event.clientY,
                originX: state.viewport.x,
                originY: state.viewport.y,
                pan: true
                };
            render();
            }

        canvas.setPointerCapture( event.pointerId );
        event.preventDefault();
        }
    catch (error) {
        notify( error.message );
        }
    }

function pointerMove( event ) {
    const drag = state.drag;

    if (!drag) {
        return;
        }

    if (drag.pan) {
        state.viewport.x = drag.originX + event.clientX - drag.startX;
        state.viewport.y = drag.originY + event.clientY - drag.startY;
        }
    else {
        const point = canvasPoint( event.clientX, event.clientY );

        if (Math.abs( point.x - drag.startX ) + Math.abs( point.y - drag.startY ) < 4) {
            return;
            }

        drag.preview = {
            x: Math.max( 10, Math.min( 19000, Math.round( (drag.originX + point.x - drag.startX) / 10 ) * 10 ) ),
            y: Math.max( 10, Math.min( 19000, Math.round( (drag.originY + point.y - drag.startY) / 10 ) * 10 ) )
            };
        }

    renderDiagram();
    }

function pointerUp( event ) {
    const drag = state.drag;

    state.drag = null;

    if (canvas.hasPointerCapture( event.pointerId )) {
        canvas.releasePointerCapture( event.pointerId );
        }

    if (drag?.preview) {
        commit( updateTable( state.model, drag.tableId, drag.preview ) );
        }
    }

function keyboard( event ) {
    if (document.querySelector( '#dialog' ).open) {
        return;
        }

    if (event.key === 'Escape') {
        state.tool = 'pointer';
        state.parentId = null;
        render();
        return;
        }

    const editing = event.target.closest( 'input, textarea, select, [contenteditable]' );
    const modifier = event.ctrlKey || event.metaKey;
    let action = null;

    if (modifier && event.key.toLowerCase() === 's') {
        if (editing) {
            event.target.blur();
            }

        action = 'save';
        }
    else if (!editing && modifier && event.key.toLowerCase() === 'z') {
        action = event.shiftKey ? 'redo' : 'undo';
        }
    else if (!editing && modifier && event.key.toLowerCase() === 'y') {
        action = 'redo';
        }
    else if (!editing && modifier && event.key.toLowerCase() === 'd') {
        action = 'duplicate';
        }
    else if (!editing && ['Delete', 'Backspace'].includes( event.key )) {
        action = 'delete';
        }

    if (action) {
        event.preventDefault();
        act( action ).catch( error => notify( error.message ) );
        }
    }

document.addEventListener(
        'click',
        event => {
            const button = event.target.closest( 'button' );

            if (!button || button.disabled) {
                return;
                }

            if (button.dataset.tab) {
                state.tab = button.dataset.tab;
                render();
                }
            else if (button.dataset.select) {
                selectElement( button.dataset.select );
                }
            else if (button.dataset.category) {
                state.category = button.dataset.category;
                renderPropertyPane();
                refreshIcons();
                }
            else if (button.dataset.modalTab) {
                for (const panel of document.querySelectorAll( '[data-modal-panel]' )) {
                    panel.hidden = panel.dataset.modalPanel !== button.dataset.modalTab;
                    }

                for (const tab of document.querySelectorAll( '[data-modal-tab]' )) {
                    tab.setAttribute( 'aria-selected', String( tab === button ) );
                    }
                }
            else if (button.dataset.action) {
                act( button.dataset.action, button ).catch( error => notify( error.message ) );
                }
            }
        );

document.addEventListener(
        'change',
        event => {
            try {
                fieldChanged( event.target );
                }
            catch (error) {
                notify( error.message );
                render();
                }
            }
        );

document.querySelector( '#properties-body' ).addEventListener(
        'focusin',
        event => {
            const row = event.target.closest( '[data-column-row]' );

            if (row) {
                state.selectedColumnId = row.dataset.columnRow;

                for (const item of row.parentElement.children) {
                    item.classList.toggle( 'active-row', item === row );
                    item.querySelector( '.row-pointer' ).textContent = item === row ? '▸' : '';
                    }
                }
            }
        );

document.querySelector( '#open-file' ).addEventListener(
        'change',
        async event => {
            const file = event.target.files[0];

            if (!file) {
                return;
                }

            try {
                if (file.size > 5_000_000) {
                    throw new Error( 'El archivo supera los 5 MB admitidos.' );
                    }

                const model = parseDocument( await file.text() );

                state.selectedId = null;
                state.parentId = null;
                state.tool = 'pointer';
                commit( model );
                fitDiagram();
                notify( `Ejercicio abierto: ${model.name}` );
                }
            catch (error) {
                notify( `No se pudo abrir el ejercicio. ${error.message}` );
                }

            event.target.value = '';
            }
        );

canvas.addEventListener( 'pointerdown', pointerDown );
canvas.addEventListener( 'pointermove', pointerMove );
canvas.addEventListener( 'pointerup', pointerUp );
canvas.addEventListener(
        'pointercancel',
        () => {
            state.drag = null;
            renderDiagram();
            }
        );
canvas.addEventListener(
        'keydown',
        event => {
            const element = event.target.closest( '[data-table-id], [data-relation-id]' );

            if (element && ['Enter', ' '].includes( event.key )) {
                event.preventDefault();
                selectElement( element.dataset.tableId || element.dataset.relationId );
                }
            }
        );
canvas.addEventListener(
        'wheel',
        event => {
            event.preventDefault();

            if (event.ctrlKey || event.metaKey) {
                const bounds = canvas.getBoundingClientRect();

                zoomTo(
                        state.viewport.zoom * Math.exp( -event.deltaY * 0.005 ),
                        {x: event.clientX - bounds.left, y: event.clientY - bounds.top}
                        );
                }
            else {
                state.viewport.x -= event.deltaX;
                state.viewport.y -= event.deltaY;
                renderDiagram();
                }
            },
        {passive: false}
        );
document.querySelector( '#zoom' ).addEventListener(
        'input',
        event => zoomTo( Number( event.target.value ) / 100 )
        );
document.addEventListener( 'keydown', keyboard );
document.querySelector( '.shape-palette' ).addEventListener(
        'dragstart',
        event => {
            const shape = event.target.closest( '[data-shape]' );

            if (shape) {
                event.dataTransfer.setData( 'application/x-databasic-shape', shape.dataset.shape );
                event.dataTransfer.effectAllowed = 'copy';
                }
            }
        );
canvas.addEventListener( 'dragover', event => event.preventDefault() );
canvas.addEventListener(
        'drop',
        event => {
            event.preventDefault();

            const kind = event.dataTransfer.getData( 'application/x-databasic-shape' );

            if (['entity', 'view'].includes( kind )) {
                createEntity( kind, canvasPoint( event.clientX, event.clientY ) );
                }
            }
        );

const splitter = document.querySelector( '#pane-splitter' );
let resizeStart = null;

splitter.addEventListener(
        'pointerdown',
        event => {
            resizeStart = {
                y: event.clientY,
                height: document.querySelector( '#properties-pane' ).getBoundingClientRect().height
                };
            splitter.setPointerCapture( event.pointerId );
            }
        );
splitter.addEventListener(
        'pointermove',
        event => {
            if (resizeStart) {
                app.style.setProperty(
                        '--properties-height',
                        `${Math.max( 170, Math.min( window.innerHeight * 0.6, resizeStart.height + resizeStart.y - event.clientY ) )}px`
                        );
                }
            }
        );
splitter.addEventListener( 'pointerup', () => { resizeStart = null; } );
splitter.addEventListener(
        'keydown',
        event => {
            if (['ArrowUp', 'ArrowDown'].includes( event.key )) {
                event.preventDefault();

                const height = document.querySelector( '#properties-pane' ).getBoundingClientRect().height;

                app.style.setProperty(
                        '--properties-height',
                        `${Math.max( 170, Math.min( window.innerHeight * 0.6, height + (event.key === 'ArrowUp' ? 25 : -25) ) )}px`
                        );
                }
            }
        );

async function restoreDocument() {
    try {
        const contents = await globalThis.idbKeyval.get( 'databasic.document.v1' );

        if (contents && !state.past.length) {
            state.model = parseDocument( contents );
            }

        document.querySelector( '#save-status' ).textContent = contents
            ? 'Ejercicio recuperado de este navegador'
            : 'Ejemplo de práctica · guarda tu primera edición';
        }
    catch {
        document.querySelector( '#save-status' ).textContent = 'Ejemplo de práctica';
        notify( 'No se pudo recuperar el ejercicio anterior. Puedes abrir una copia con Archivo → Abrir.' );
        }

    state.selectedId = state.model.tables[0]?.id || null;
    render();
    fitDiagram();
    }

render();
restoreDocument();

window.addEventListener(
        'beforeprint',
        () => {
            const width = Math.max(
                    800,
                    ...state.model.tables.map( table => table.x + TABLE_WIDTH + 140 )
                    );
            const height = Math.max(
                    500,
                    ...state.model.tables.map( table => table.y + tableHeight( table ) + 80 )
                    );

            canvas.setAttribute( 'viewBox', `0 0 ${width} ${height}` );
            document.querySelector( '#viewport' ).removeAttribute( 'transform' );
            }
        );

window.addEventListener(
        'afterprint',
        () => {
            canvas.removeAttribute( 'viewBox' );
            renderDiagram();
            }
        );
