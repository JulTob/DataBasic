import {
    addColumn,
    addConceptualEntity,
    conceptualStatus,
    getConceptualProjection,
    moveDiagramElement,
    removeConceptualElement,
    setDiagramMode,
    setModelProfile,
    updateConceptualEntity,
    updateConceptualAttribute,
    updateConceptualRelationship,
    updateConceptualParticipation,
    updateConceptualGeneralization,
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
    updateTable,
    updatePhysicalColumn,
    updatePhysicalRelationship,
    updatePhysicalTable,
    documentPhysical,
    ACCESS_NUMBER_SIZES
    } from './domain/model.js';
import {
    parseDocument,
    serializeDocument
    } from './domain/serialization.js';
import { exportSQL } from './io/sql.js';
import { exportVDX } from './io/visio.js';
import {
    exportAccessSQL,
    exportAccessVBA,
    exportAccessXML
    } from './io/access.js';
import {
    diagramContents,
    exportSVG,
    diagramScene,
    diagramBounds,
    findFreePosition,
    resolveDiagramPosition,
    SCENE_BOUNDS_MARGIN
    } from './ui/diagram.js';
import {
    command,
    escapeHTML
    } from './ui/html.js';
import {
    explorerContents,
    initialLayout,
    paletteContents,
    ribbonContents
    } from './ui/layout.js';
import {
    OTHER_TYPE_OPTION,
    renderProperties
    } from './ui/properties.js';
import {
    closeDialog,
    openDialog,
    showColumnDialog,
    showDisplayOptions,
    showHelp,
    showIndexDialog,
    showValidation,
    showConceptualAttributeDialog,
    showConceptualRelationshipDialog,
    showMaterializationDialog,
    showGeneralizationDialog,
    showAlternateKeyDialog,
    showAssumptionDialog,
    showAssumptionsOverview,
    showAccessDialog
    } from './ui/dialogs.js';
import {
    buildDesignReport,
    reportToHTML,
    reportToMarkdown
    } from './io/report.js';

const practiceId = globalThis.location
    ? new URLSearchParams( globalThis.location.search || '' ).get( 'practica' )
    : null;
const independentPractice = practiceId !== null;
const validPracticeId = practiceId !== null
    && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test( practiceId );
const autosaveKey = independentPractice
    ? validPracticeId ? `databasic.document.v1.practica.${practiceId}` : null
    : 'databasic.document.v1';

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
    viewport: {x: 35, y: 105, zoom: 1},
    viewports: {},
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
        model = moveDiagramElement(
                model,
                state.drag.id,
                state.drag.preview,
                model.display.mode
                );
        }

    const viewport = document.querySelector( '#viewport' );
    const view = state.viewport;

    viewport.innerHTML = diagramContents( model, state.selectedId, state.parentId );
    viewport.setAttribute( 'transform', `translate(${view.x},${view.y}) scale(${view.zoom})` );
    canvas.style.backgroundSize = `${20 * view.zoom}px ${20 * view.zoom}px`;
    canvas.style.backgroundPosition = `${view.x}px ${view.y}px`;
    canvas.classList.toggle( 'without-grid', !model.display.grid );
    canvas.classList.toggle( 'connecting', state.tool === 'relationship' );
    document.querySelector( '#canvas-empty' ).hidden = diagramScene( model ).nodes.length !== 0;

    const hint = document.querySelector( '#tool-hint' );

    hint.hidden = state.tool !== 'relationship';
    hint.textContent = state.parentId
        ? 'Ahora selecciona la tabla que recibe la clave ajena (FK). Escape para cancelar.'
        : 'Selecciona la tabla referenciada (la que aporta la clave primaria).';
    document.querySelector( '#zoom' ).value = String( Math.round( view.zoom * 100 ) );
    document.querySelector( '#zoom-label' ).textContent = `${Math.round( view.zoom * 100 )} %`;
    }

function selectedNative() {
    const semantic = state.model.conceptual;

    return [
        ...semantic.entities,
        ...semantic.attributes,
        ...semantic.relationships,
        ...semantic.generalizations
        ].find( item => item.id === state.selectedId );
    }

function visibleDiagramArea() {
    const bounds = canvas.getBoundingClientRect();
    const view = state.viewport;
    const top = Math.min( 100, bounds.height / 3 );

    return {
        x: (20 - view.x) / view.zoom,
        y: (top - view.y) / view.zoom,
        width: Math.max( 1, bounds.width - 40 ) / view.zoom,
        height: Math.max( 1, bounds.height - top - 20 ) / view.zoom
        };
    }

function revealSelected() {
    const node = diagramScene( state.model ).nodes.find(
            item => item.ref.id === state.selectedId
            );

    if (!node) {
        return;
        }

    const area = visibleDiagramArea();
    const view = state.viewport;

    if (node.x < area.x || node.width > area.width) {
        view.x += (area.x - node.x) * view.zoom;
        }
    else if (node.x + node.width > area.x + area.width) {
        view.x -= (node.x + node.width - area.x - area.width) * view.zoom;
        }

    if (node.y < area.y || node.height > area.height) {
        view.y += (area.y - node.y) * view.zoom;
        }
    else if (node.y + node.height > area.y + area.height) {
        view.y -= (node.y + node.height - area.y - area.height) * view.zoom;
        }

    renderDiagram();
    }

/** Labels placed just above the focused shape stay visible below the floating ribbon. */
function focusedTop(
        scene,
        node
        ) {
    const contentTop = scene.bounds.y + SCENE_BOUNDS_MARGIN;

    return Math.max( contentTop, node.y - 90 );
    }

function focusDiagram() {
    const scene = diagramScene( state.model );
    const node = scene.nodes.find( item => item.ref.id === state.selectedId )
        || scene.nodes[0];
    const bounds = canvas.getBoundingClientRect();

    state.viewport = {
        x: node ? 20 - node.x : 0,
        y: node ? Math.min( 100, bounds.height / 3 ) - focusedTop( scene, node ) : 100,
        zoom: 1
        };
    renderDiagram();
    }

function renderPropertyPane() {
    const selected = state.model.tables.find( item => item.id === state.selectedId )
        || state.model.relationships.find( item => item.id === state.selectedId )
        || selectedNative();
    const supertype = selected?.supertypeId
        ? getConceptualProjection( state.model ).entities.find(
                item => item.id === selected.supertypeId
                )
        : null;
    const selectedName = selected?.name
        || (supertype ? `Especialización de ${supertype.name}` : 'Especialización');

    document.querySelector( '#properties-body' ).innerHTML = renderProperties( state.model, state );
    document.querySelector( '#properties-name' ).textContent = selected ? `— ${selectedName}` : '';
    document.querySelector( '#properties-pane' ).hidden = !state.propertiesShown;
    document.querySelector( '#pane-splitter' ).hidden = !state.propertiesShown;
    document.querySelector( '.drawing-area' ).classList.toggle( 'properties-hidden', !state.propertiesShown );
    }

function render( preserveEditors = false ) {
    document.querySelector( '#document-name' ).textContent = state.model.name;
    document.querySelector( '#diagram-mode-label' ).textContent =
        state.model.display.mode === 'chen'
            ? 'Conceptual · ERE–Chen'
            : state.model.display.mode === 'tables'
                ? 'Tablas · Access'
                : `Relacional · ${state.model.display.notation === 'idef1x' ? 'IDEF1X' : 'Patas de cuervo'}`;
    document.querySelector( '#profile-select' ).value = state.model.profile;
    document.querySelector( '#explorer-heading' ).textContent =
        state.model.display.mode === 'chen'
            ? 'Entidades y relaciones'
            : state.model.display.mode === 'tables' ? 'Tablas de Access' : 'Tablas y vistas';
    document.querySelector( '#stencil-tip' ).textContent =
        state.model.display.mode === 'chen'
            ? 'Crea objetos conceptuales. Las restricciones pendientes también se guardan.'
            : state.model.display.mode === 'tables'
                ? 'Las mismas tablas del relacional con los tipos y propiedades de Access. Selecciona un campo para ajustarlos.'
                : 'Arrastra una entidad al lienzo. Doble clic para editar sus columnas.';

    for (const button of document.querySelectorAll( '[data-mode]' )) {
        button.setAttribute(
                'aria-pressed',
                String( button.dataset.mode === state.model.display.mode )
                );
        }

    const statuses = conceptualStatus( state.model );

    document.querySelector( '#model-status' ).textContent = statuses.length
        ? `${statuses.length} restricciones pendientes/documentales · Revisar modelo`
        : 'Un documento · representaciones vinculadas';
    document.title = `${state.model.name} — DataBasic`;
    if (!preserveEditors) {
        document.querySelector( '#ribbon' ).innerHTML = ribbonContents( state );
        document.querySelector( '#entity-list' ).innerHTML = explorerContents( state );
        document.querySelector( '.shape-palette' ).innerHTML = paletteContents( state );
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

function showSaveStatus( message ) {
    document.querySelector( '#save-status' ).textContent = independentPractice
        ? `Práctica independiente · ${message}`
        : message;
    }

function scheduleSave() {
    clearTimeout( state.saveTimer );

    if (!autosaveKey) {
        showSaveStatus( 'Sin guardado automático · descarga una copia' );
        return;
        }

    const sequence = ++state.saveSequence;

    showSaveStatus( 'Guardando…' );
    state.saveTimer = setTimeout(
            async () => {
                try {
                    await globalThis.idbKeyval.set(
                            autosaveKey,
                            serializeDocument( state.model )
                            );

                    if (sequence === state.saveSequence) {
                        showSaveStatus( 'Guardado en este navegador' );
                        }
                    }
                catch {
                    showSaveStatus( 'Sin guardado automático' );
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
        && !next.relationships.some( item => item.id === state.selectedId )
        && !selectedNative()) {
        state.selectedId = null;
        }

    scheduleSave();
    render( preserveEditors );
    }

function selectElement(
        id,
        category = null,
        revealProperties = true
        ) {
    const previousWasRelation = state.model.relationships.some(
            item => item.id === state.selectedId
            );
    const nextIsRelation = state.model.relationships.some( item => item.id === id );

    state.selectedId = id;

    if (revealProperties) {
        state.propertiesShown = true;
        }

    if (category) {
        state.category = category;
        }
    else if (previousWasRelation !== nextIsRelation) {
        state.category = defaultCategory();
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
    const location = position || {x: 20, y: 20};
    const conceptual = state.model.display.mode === 'chen' && kind === 'entity';
    let next = conceptual
        ? addConceptualEntity( state.model, {}, location )
        : addTable( state.model, kind, location );

    state.selectedId = conceptual
        ? next.conceptual.entities.at( -1 ).id
        : next.tables.at( -1 ).id;

    const node = diagramScene( next ).nodes.find(
            item => item.ref.id === state.selectedId
            );
    const free = findFreePosition(
            state.model,
            location,
            {width: node.width, height: node.height},
            position ? undefined : visibleDiagramArea()
            );

    next = moveDiagramElement( next, state.selectedId, free );
    state.category = defaultCategory();
    state.tool = 'pointer';
    state.parentId = null;
    state.propertiesShown = true;
    commit( next );
    revealSelected();
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
    const scene = diagramScene( state.model );

    if (!scene.nodes.length) {
        focusDiagram();
        return;
        }

    const canvasBounds = canvas.getBoundingClientRect();
    const bounds = scene.bounds;
    const toolbarInset = Math.min( 86, canvasBounds.height / 3 );
    const contentHeight = Math.max( 100, canvasBounds.height - toolbarInset );
    const zoom = Math.min(
            1.1,
            canvasBounds.width / Math.max( 1, bounds.width ),
            contentHeight / Math.max( 1, bounds.height )
            );

    state.viewport = {
        zoom,
        x: (canvasBounds.width - bounds.width * zoom) / 2 - bounds.x * zoom,
        y: toolbarInset + (contentHeight - bounds.height * zoom) / 2 - bounds.y * zoom
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

    if (selectedNative()) {
        commit( removeConceptualElement( state.model, state.selectedId ) );
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
                Object.assign(
                        clone,
                        findFreePosition( state.model, {x: clone.x + 45, y: clone.y + 45} )
                        );

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

                for (const key of clone.alternateKeys || []) {
                    key.id = newId();
                    key.columns = key.columns.map( id => mapping.get( id ) );
                    }

                model.tables.push( clone );
                }
            );

    state.selectedId = clone.id;
    commit( next );
    }

async function autoLayout() {
    const scene = diagramScene( state.model );

    if (!scene.nodes.length) {
        return;
        }

    notify( 'Organizando el diagrama…' );
    state.layoutInstance ||= await globalThis.Viz.instance();

    const sourceModel = state.model;
    const nodes = scene.nodes;
    const quoted = value => JSON.stringify( value );
    const graph = [
        'digraph G { graph [rankdir=LR, nodesep=0.7, ranksep=1.2];',
        'node [shape=box, fixedsize=true, label=""];',
        ...nodes.map(
                node => `${quoted( node.id )} [width=${node.width / 72}, height=${node.height / 72}];`
                ),
        ...scene.edges.filter( edge => edge.sourceId && edge.targetId ).map(
                edge => `${quoted( edge.sourceId )} -> ${quoted( edge.targetId )};`
                ),
        '}'
        ].join( '\n' );
    const result = state.layoutInstance.renderJSON( graph );
    const height = Number( result.bb.split( ',' )[3] );

    if (state.model !== sourceModel) {
        notify( 'El modelo cambió mientras se organizaba. Vuelve a pulsar Distribuir.' );
        return;
        }

    let next = state.model;

    if (scene.mode === 'relational'
        && Object.keys( next.presentation.relational || {} ).length) {
        next = changeDocument(
                next,
                model => { model.presentation.relational = {}; }
                );
        }

    for (const placed of result.objects || []) {
        const node = nodes.find( item => item.id === placed.name );

        if (!node || !placed.pos) {
            continue;
            }

        const [x, y] = placed.pos.split( ',' ).map( Number );

        next = moveDiagramElement(
                next,
                node.ref.id,
                {
                    x: Math.max( 30, x - node.width / 2 + 50 ),
                    y: Math.max( 30, height - y - node.height / 2 + 50 )
                    }
                );
        }

    commit( next );
    fitDiagram();
    notify( 'Diagrama distribuido. Puedes deshacer para recuperar las posiciones anteriores.' );
    }

/** Both representations, drawn from the same document, illustrate the report. */
function designDiagrams() {
    return [
        {
            title: 'Diagrama entidad-relación extendido (Chen)',
            svg: exportSVG( setDiagramMode( state.model, 'chen' ) )
            },
        {
            title: 'Diagrama relacional',
            svg: exportSVG( setDiagramMode( state.model, 'relational' ) )
            }
        ];
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
    focusDiagram();
    }

async function act(
        action,
        target
        ) {
    if (state.drag) {
        state.drag = null;
        renderDiagram();
        }

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
        case 'conceptual-relationship':
            showConceptualRelationshipDialog( state, commit );
            break;
        case 'conceptual-attribute':
            showConceptualAttributeDialog( state, commit );
            break;
        case 'generalization':
            showGeneralizationDialog( state, commit );
            break;
        case 'materialize':
            showMaterializationDialog( state, commit );
            break;
        case 'edit-attribute':
            showConceptualAttributeDialog( state, commit, state.selectedId );
            break;
        case 'edit-generalization':
            showGeneralizationDialog( state, commit, state.selectedId );
            break;
        case 'relationship':
            if (state.model.display.mode === 'chen') {
                showConceptualRelationshipDialog( state, commit );
                break;
                }

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
        case 'vdx':
            download( exportVDX( state.model ), filename( 'vdx' ), 'application/xml' );
            break;
        case 'access':
            showAccessDialog( state.model );
            break;
        case 'reset-physical':
            resetPhysical( target.dataset.scope, target.dataset.target );
            break;
        case 'download-access-vba':
            download( exportAccessVBA( state.model ), filename( 'access.bas' ), 'text/plain' );
            notify( 'Módulo VBA descargado. Impórtalo en una base de datos en blanco y ejecuta CrearEsquema.' );
            break;
        case 'download-access-sql':
            download( exportAccessSQL( state.model ), filename( 'access.sql' ), 'text/plain' );
            break;
        case 'download-access-xml':
            download( exportAccessXML( state.model ), filename( 'access.xml' ), 'application/xml' );
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
            if (state.model.display.mode === 'chen' && selectedNative()) {
                showConceptualAttributeDialog( state, commit );
                break;
                }

            if (state.model.tables.some( table => table.id === state.selectedId )) {
                const next = addColumn( state.model, state.selectedId );

                state.selectedColumnId = next.tables.find( table => table.id === state.selectedId ).columns.at( -1 ).id;
                state.category = columnsCategory();
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
        case 'assumption':
            showAssumptionDialog( state, commit );
            break;
        case 'edit-assumption':
            showAssumptionDialog( state, commit, target?.dataset.assumptionId );
            break;
        case 'assumptions':
            showAssumptionsOverview( state.model );
            break;
        case 'report-html':
            download(
                    reportToHTML( buildDesignReport( state.model ), designDiagrams() ),
                    filename( 'memoria.html' ),
                    'text/html'
                    );
            notify( 'Memoria del diseño descargada. Word la abre como documento.' );
            break;
        case 'report-markdown':
            download(
                    reportToMarkdown( buildDesignReport( state.model ) ),
                    filename( 'memoria.md' ),
                    'text/markdown'
                    );
            break;
        case 'alternate-key':
            showAlternateKeyDialog( state, commit, target?.dataset.keyId );
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
    if (target.dataset.profile !== undefined) {
        commit( setModelProfile( state.model, target.value ) );
        return;
        }

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

    const native = selectedNative();

    if (native) {
        let next;

        if (target.dataset.participation) {
            const parsed = field === 'max' && String( value ).trim().toUpperCase() === 'N'
                ? null
                : field === 'cardinality'
                    ? value || null
                    : field === 'role' ? value : Number( value );

            next = updateConceptualParticipation(
                    state.model,
                    native.id,
                    target.dataset.participation,
                    {[field]: parsed}
                    );
            }
        else if (state.model.conceptual.entities.includes( native )) {
            next = updateConceptualEntity(
                    state.model,
                    native.id,
                    field === 'weakRelationshipId'
                        ? {translation: value ? {kind: 'weak', relationshipId: value} : null}
                        : {[field]: field === 'ownerEntityId' ? value || null : value}
                    );
            }
        else if (state.model.conceptual.attributes.includes( native )) {
            next = updateConceptualAttribute( state.model, native.id, {[field]: value} );
            }
        else if (state.model.conceptual.relationships.includes( native )) {
            next = updateConceptualRelationship( state.model, native.id, {[field]: value} );
            }
        else {
            next = updateConceptualGeneralization( state.model, native.id, {[field]: value} );
            }

        commit( next );
        return;
        }

    if (target.dataset.physical) {
        commit(
                physicalChange( target, field, value ),
                !['checkbox', 'select-one'].includes( target.type )
                );
        return;
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

/** One Access property of the selected column, relationship or table. */
function physicalChange(
        target,
        field,
        value
        ) {
    const scope = target.dataset.physical;
    const parsed = physicalValue( field, value, target.type );

    if (scope === 'column') {
        state.selectedColumnId = target.dataset.colId;
        return updatePhysicalColumn( state.model, target.dataset.colId, {[field]: parsed} );
        }

    if (scope === 'relationship') {
        return updatePhysicalRelationship( state.model, state.selectedId, {[field]: parsed} );
        }

    return updatePhysicalTable( state.model, state.selectedId, {[field]: parsed} );
    }

/** Form values become the kinds the physical layer stores; an empty choice means «derived». */
function physicalValue(
        field,
        value,
        type
        ) {
    if (type === 'checkbox') {
        return Boolean( value );
        }

    if (field === 'fieldSize') {
        if (ACCESS_NUMBER_SIZES.includes( value )) {
            return value;
            }

        return String( value ).trim() === '' ? null : Number( value );
        }

    if (field === 'decimalPlaces') {
        return String( value ).trim() === '' ? null : Number( value );
        }

    if (field === 'displayColumnId') {
        return value || null;
        }

    return value;
    }

/** Drops every override of a column, relationship or table so it derives again. */
function resetPhysical(
        scope,
        target
        ) {
    const section = {column: 'columns', relationship: 'relationships', table: 'tables'}[scope];
    const overrides = documentPhysical( state.model )[section][target] || {};
    const patch = Object.fromEntries( Object.keys( overrides ).map( key => [key, null] ) );
    const operation = {
        column: updatePhysicalColumn,
        relationship: updatePhysicalRelationship,
        table: updatePhysicalTable
        }[scope];

    commit( operation( state.model, target, patch ) );
    }

function relationshipPick( tableId ) {
    const table = state.model.tables.find( item => item.id === tableId );

    if (table.kind === 'view') {
        throw new Error( 'Selecciona una entidad. Las vistas no reciben claves ajenas (FK).' );
        }

    if (!state.parentId) {
        if (!table.columns.some( field => field.primary )) {
            throw new Error( 'La tabla referenciada necesita una clave primaria.' );
            }

        state.parentId = tableId;
        renderDiagram();
        return;
        }

    const next = addRelationship( state.model, state.parentId, tableId );

    state.selectedId = next.relationships.at( -1 ).id;
    state.parentId = null;
    state.tool = 'pointer';
    state.category = defaultCategory();
    commit( next );
    notify( 'Relación creada. Selecciona Varios para ajustar cardinalidad y opcionalidad.' );
    }

/** Column editing happens in Columnas, or in Campos de Access in the Tablas view. */
function columnsCategory() {
    return state.model.display.mode === 'tables' ? 'fields' : 'columns';
    }

/** A fresh selection opens on Definición, or on the Access categories in the Tablas view. */
function defaultCategory() {
    if (state.model.display.mode !== 'tables') {
        return 'definition';
        }

    return state.model.relationships.some( item => item.id === state.selectedId )
        ? 'access-relationship'
        : 'fields';
    }

/** The Tablas view opens on its own categories; leaving it falls back to the relational ones. */
function categoryForMode(
        mode,
        category
        ) {
    const accessCategories = ['fields', 'access-table', 'access-relationship'];
    const relation = state.model.relationships.some( item => item.id === state.selectedId );

    if (mode === 'tables' && !accessCategories.includes( category )) {
        return relation ? 'access-relationship' : 'fields';
        }

    if (mode !== 'tables' && accessCategories.includes( category )) {
        return category === 'access-relationship' ? 'definition' : 'columns';
        }

    return category;
    }

function changeRepresentation( mode ) {
    const previous = state.model.display.mode;

    if (mode === previous) {
        return;
        }

    state.drag = null;
    state.viewports[previous] = {...state.viewport};
    const id = ['columns', 'fields'].includes( state.category ) && state.selectedColumnId
        ? state.selectedColumnId
        : state.selectedId;
    const trace = state.model.traces.find(
            item => mode === 'chen' ? item.targetId === id : item.sourceId === id
            );

    if (trace) {
        const relatedId = mode === 'chen' ? trace.sourceId : trace.targetId;
        const table = state.model.tables.find(
                item => item.columns.some( field => field.id === relatedId )
                );

        state.selectedId = table ? table.id : relatedId;
        state.selectedColumnId = table ? relatedId : null;
        state.category = table ? columnsCategory() : defaultCategory();
        }

    state.tool = 'pointer';
    state.parentId = null;
    state.category = categoryForMode( mode, state.category );
    commit( setDiagramMode( state.model, mode ) );

    if (state.viewports[mode]) {
        state.viewport = {...state.viewports[mode]};
        renderDiagram();
        }
    else {
        focusDiagram();
        }
    }

function selectDiagramReference(
        ref,
        revealProperties = true
        ) {
    if (ref.kind === 'column') {
        const table = state.model.tables.find(
                item => item.columns.some( field => field.id === ref.id )
                );

        state.selectedColumnId = ref.id;
        selectElement( table.id, columnsCategory(), revealProperties );
        return;
        }

    if (ref.kind === 'participation') {
        const relation = state.model.conceptual.relationships.find(
                item => item.participations.some( part => part.id === ref.id )
                );

        selectElement( relation?.id || ref.ownerId, 'misc', revealProperties );
        return;
        }

    selectElement( ref.id, null, revealProperties );
    }

function pointerDown( event ) {
    if (![0, 1].includes( event.button )) {
        return;
        }

    const target = event.target.closest( '[data-diagram-kind]' );
    const tableNode = event.target.closest( '[data-table-id]' );
    const relationNode = event.target.closest( '[data-relation-id]' );
    const point = canvasPoint( event.clientX, event.clientY );

    try {
        if (tableNode && state.tool === 'relationship') {
            relationshipPick( tableNode.dataset.tableId );
            return;
            }

        const ref = target ? {
            kind: target.dataset.diagramKind,
            id: target.dataset.diagramId,
            ownerId: target.dataset.ownerId
            } : tableNode ? {kind: 'table', id: tableNode.dataset.tableId}
                : relationNode ? {kind: 'relationship', id: relationNode.dataset.relationId}
                    : null;

        if (ref && event.button === 0) {
            const previous = state.lastPick;
            const double = previous?.id === ref.id
                && performance.now() - previous.time < 350;

            state.lastPick = {id: ref.id, time: performance.now()};
            selectDiagramReference( ref, false );

            if (double && ref.kind === 'table') {
                state.category = columnsCategory();
                renderPropertyPane();
                }

            const scene = diagramScene( state.model );
            const node = scene.nodes.find(
                    item => item.ref.id === ref.id
                    );
            const caption = scene.edges.find(
                    item => item.ref.id === ref.id && item.caption
                    )?.caption.bounds;
            // A column row has no shape of its own: dragging it moves its table.
            const owner = !node && !caption && ref.kind === 'column'
                ? scene.nodes.find( item => item.ref.id === ref.ownerId )
                : null;
            const origin = node || caption || owner;

            if (!origin) {
                state.propertiesShown = true;
                render();
                return;
                }

            state.drag = {
                id: owner ? owner.ref.id : ref.id,
                startX: point.x,
                startY: point.y,
                originX: origin.x,
                originY: origin.y,
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

function snapDiagramCoordinate( value ) {
    return Math.max( 10, Math.min( 19000, Math.round( value / 10 ) * 10 ) );
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
            if (drag.preview) {
                drag.preview = null;
                renderDiagram();
                }

            return;
            }

        const preferred = {
            x: snapDiagramCoordinate( drag.originX + point.x - drag.startX ),
            y: snapDiagramCoordinate( drag.originY + point.y - drag.startY )
            };

        drag.preview = resolveDiagramPosition( state.model, drag.id, preferred );
        drag.moved = true;
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
        commit( moveDiagramElement( state.model, drag.id, drag.preview ) );
        }
    else if (drag?.id && !drag.moved) {
        state.propertiesShown = true;
        render();
        }
    }

function keyboard( event ) {
    if (document.querySelector( '#dialog' ).open) {
        return;
        }

    if (event.key === 'Escape') {
        state.drag = null;
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

            if (button.dataset.origin) {
                closeDialog();
                commit( setDiagramMode( state.model, 'chen' ) );
                selectElement( button.dataset.origin );
                focusDiagram();
                }
            else if (button.dataset.mode) {
                changeRepresentation( button.dataset.mode );
                }
            else if (button.dataset.tab) {
                state.tab = button.dataset.tab;
                render();
                }
            else if (button.dataset.select) {
                selectElement( button.dataset.select );
                revealSelected();
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

/** «Otro…» in the type list swaps the list for the text input of the same cell. */
function revealTypeInput( select ) {
    const cell = select.closest( '[data-type-cell]' );
    const input = cell?.querySelector( 'input[data-field="type"]' );

    if (!input) {
        return;
        }

    select.hidden = true;
    input.hidden = false;
    input.focus?.();
    input.select?.();
    }

document.addEventListener(
        'change',
        event => {
            if (event.target.dataset?.typeSelect !== undefined
                && event.target.value === OTHER_TYPE_OPTION) {
                revealTypeInput( event.target );
                return;
                }

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
                focusDiagram();
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
            const element = event.target.closest( '[data-diagram-kind]' );

            if (element && ['Enter', ' '].includes( event.key )) {
                event.preventDefault();
                selectDiagramReference({
                        kind: element.dataset.diagramKind,
                        id: element.dataset.diagramId,
                        ownerId: element.dataset.ownerId
                        });
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
        const contents = autosaveKey
            ? await globalThis.idbKeyval.get( autosaveKey )
            : null;

        if (contents && !state.past.length) {
            state.model = parseDocument( contents );
            }

        showSaveStatus(
                !autosaveKey
                    ? 'Enlace no válido · guarda una copia descargada'
                    : contents
                        ? 'Ejercicio recuperado de este navegador'
                        : 'Ejemplo de práctica · guarda tu primera edición'
                );
        }
    catch {
        showSaveStatus( 'Ejemplo de práctica' );
        notify( 'No se pudo recuperar el ejercicio anterior. Puedes abrir una copia con Archivo → Abrir.' );
        }

    state.selectedId = state.model.tables[0]?.id || null;
    render();
    focusDiagram();
    }

render();
restoreDocument();

window.addEventListener(
        'beforeprint',
        () => {
            const bounds = diagramBounds( state.model );

            canvas.setAttribute(
                    'viewBox',
                    `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`
                    );
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
