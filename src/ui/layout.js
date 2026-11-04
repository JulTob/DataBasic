import { getConceptualProjection } from '../domain/model.js';
import {
    command,
    escapeHTML,
    icon,
    options
    } from './html.js';

const RIBBON_TABS = [
    ['file', 'Archivo'],
    ['home', 'Inicio'],
    ['insert', 'Insertar'],
    ['design', 'Diseño'],
    ['database', 'Base de datos'],
    ['view', 'Vista'],
    ['help', 'Ayuda']
    ];

function ribbonGroup(
        title,
        content
        ) {
    return `<div class="ribbon-group"><div class="ribbon-tools">${content}</div>
        <div class="ribbon-group-title">${title}</div></div>`;
    }

/** The three progressive views of one document, named for someone new to databases. */
export const VIEW_OPTIONS = [
    ['chen', 'Diagrama · entidad-relación'],
    ['relational', 'Relacional · tablas y claves'],
    ['tables', 'Tablas · Access']
    ];

/** The built-in example plus the files of examples/index.json once they are loaded. */
function exampleSelect( state ) {
    const files = (state.examples || []).map( item => [item.file, item.name] );

    return `<label class="ribbon-select">${icon( 'book-open' )}<span>Ejemplos</span>
        <select data-example aria-label="Abrir un ejemplo">${options(
                [['', 'Elegir un ejemplo…'], ['__biblioteca__', 'Biblioteca — práctica de relaciones'], ...files],
                ''
                )}</select></label>`;
    }

export function ribbonContents( state ) {
    const disabled = state.selectedId ? '' : 'disabled';
    const entitySelected = state.model.tables.some( table => table.id === state.selectedId );
    const tableDisabled = entitySelected ? '' : 'disabled';
    const chen = state.model.display.mode === 'chen';
    const shapes = ribbonGroup(
            'Modelo',
            command( 'entity', 'Entidad', 'table-2', 'class="ribbon-large"' )
                + (chen ? command( 'conceptual-attribute', 'Atributo', 'circle', 'class="ribbon-large"' )
                    : command( 'view-shape', 'Vista SQL', 'panels-top-left', 'class="ribbon-large"' ))
                + command( 'relationship', 'Relación', 'git-branch', `class="ribbon-large ${state.tool === 'relationship' ? 'pressed' : ''}"` )
            );
    const windows = ribbonGroup(
            'Mostrar u ocultar',
            command( 'properties', 'Propiedades de la base de datos', 'panel-bottom', `class="ribbon-wide ${state.propertiesShown ? 'pressed' : ''}"` )
                + command( 'display', 'Opciones de visualización', 'sliders-horizontal', 'class="ribbon-wide"' )
            );
    const history = ribbonGroup(
            'Edición',
            command( 'undo', 'Deshacer', 'undo-2', state.past.length ? '' : 'disabled' )
                + command( 'redo', 'Rehacer', 'redo-2', state.future.length ? '' : 'disabled' )
                + command( 'delete', 'Eliminar', 'trash-2', disabled )
            );

    switch (state.tab) {
        case 'file':
            return ribbonGroup(
                    'Documento',
                    command( 'new', 'Nuevo', 'file-plus-2', 'class="ribbon-large"' )
                        + command( 'open', 'Abrir', 'folder-open', 'class="ribbon-large"' )
                        + command( 'save', 'Guardar', 'save', 'class="ribbon-large"' )
                        + command( 'rename', 'Nombre', 'pencil' )
                    )
                + ribbonGroup(
                        'Exportar',
                        command( 'svg', 'Imagen SVG', 'image', 'class="ribbon-large"' )
                            + command( 'vdx', 'Visio 2010', 'file-box', 'class="ribbon-large"' )
                            + command( 'access', 'Access', 'database-zap', 'class="ribbon-large"' )
                            + command( 'sql', 'SQL', 'file-code-2', 'class="ribbon-large"' )
                            + command( 'report-html', 'Memoria HTML', 'file-text', 'class="ribbon-large"' )
                            + command( 'report-markdown', 'Memoria Markdown', 'scroll-text', 'class="ribbon-large"' )
                            + command( 'print', 'Imprimir / PDF', 'printer', 'class="ribbon-large"' )
                        )
                + ribbonGroup( 'Practicar', command( 'example', 'Abrir ejemplo', 'book-open', 'class="ribbon-large"' ) );
        case 'home':
            return ribbonGroup(
                    'Portapapeles',
                    command( 'paste', 'Pegar', 'clipboard-paste', `class="ribbon-large" ${state.clipboard ? '' : 'disabled'}` )
                        + `<div class="ribbon-stack">${command( 'copy', 'Copiar', 'copy', tableDisabled )}
                            ${command( 'duplicate', 'Duplicar', 'copy-plus', tableDisabled )}</div>`
                    ) + history + ribbonGroup(
                        'Herramientas',
                        command( 'pointer', 'Puntero', 'mouse-pointer-2', `class="ribbon-large ${state.tool === 'pointer' ? 'pressed' : ''}"` )
                            + command( 'relationship', 'Conector', 'git-branch', 'class="ribbon-large"' )
                        ) + windows;
        case 'insert':
            return shapes + ribbonGroup(
                    'Contenido',
                    command( 'add-column', 'Columna', 'list-plus', `class="ribbon-large" ${tableDisabled}` )
                        + command( 'notes', 'Notas', 'notebook-pen', `class="ribbon-large" ${tableDisabled}` )
                        + command( 'assumption', 'Supuesto', 'message-square-text', 'class="ribbon-large"' )
                    );
        case 'design':
            return ribbonGroup(
                    'Organizar',
                    command( 'layout', 'Distribuir automáticamente', 'network', 'class="ribbon-large"' )
                        + command( 'fit', 'Ajustar a la ventana', 'scan', 'class="ribbon-large"' )
                    ) + ribbonGroup(
                        'Página',
                        command( 'print', 'Imprimir / PDF', 'printer', 'class="ribbon-large"' )
                            + command( 'grid', 'Cuadrícula', 'grid-2x2', `class="ribbon-large ${state.model.display.grid ? 'pressed' : ''}"` )
                        );
        case 'view':
            return windows + ribbonGroup(
                    'Zoom',
                    command( 'fit', 'Ajustar', 'scan', 'class="ribbon-large"' )
                        + command( 'zoom-100', '100 %', 'zoom-in', 'class="ribbon-large"' )
                        + command( 'grid', 'Cuadrícula', 'grid-2x2', `class="ribbon-large ${state.model.display.grid ? 'pressed' : ''}"` )
                    );
        case 'help':
            return ribbonGroup(
                    'Aprender',
                    command( 'help', 'Guía de uso', 'circle-help', 'class="ribbon-large"' )
                        + exampleSelect( state )
                        + command( 'validate', 'Revisar modelo', 'list-checks', 'class="ribbon-large"' )
                    );
        default:
            return windows + shapes + ribbonGroup(
                    'Modelo de base de datos',
                    command( 'validate', 'Comprobar', 'list-checks', 'class="ribbon-large"' )
                        + command( 'assumptions', 'Supuestos', 'clipboard-list', 'class="ribbon-large"' )
                        + command( 'sql', 'Ver SQL', 'file-code-2', 'class="ribbon-large"' )
                        + command( 'layout', 'Distribuir', 'network', 'class="ribbon-large"' )
                    );
        }
    }

export function initialLayout( state ) {
    return `<header class="titlebar">
        <div class="app-brand"><div class="app-mark">${icon( 'database' )}</div>
            <strong>DataBasic</strong><span class="brand-label">Modelador</span></div>
        <button class="document-title" data-action="rename" title="Cambiar nombre del ejercicio">
            ${icon( 'file-spreadsheet' )}<span id="document-name"></span>${icon( 'chevron-down' )}</button>
        <nav class="quick-access" aria-label="Acceso rápido">
        ${command( 'undo', 'Deshacer', 'undo-2', 'title="Deshacer · ⌘/Ctrl+Z"' )}
        ${command( 'redo', 'Rehacer', 'redo-2', 'title="Rehacer · ⌘/Ctrl+Mayús+Z"' )}
        ${command( 'save', 'Guardar', 'save', 'class="save-button" title="Guardar archivo · ⌘/Ctrl+S"' )}
        </nav></header>
        <nav class="ribbon-tabs" aria-label="Cinta de comandos">
        ${RIBBON_TABS.map(
                ([id, label]) => `<button data-tab="${id}" class="${id === 'file' ? 'file-tab' : ''}"
                    aria-pressed="${id === state.tab}">${label}</button>`
                ).join( '' )}
        <span class="ribbon-spacer"></span>
        <button data-action="help" class="help-button" title="Ayuda">${icon( 'circle-help' )}</button></nav>
        <section class="model-controls" aria-label="Vista y tipos de datos">
        <label class="view-select-label">Vista<select id="view-select" data-view
            aria-label="Representación del documento">${options( VIEW_OPTIONS, state.model.display.mode )}</select></label>
        <label title="Qué tipos de datos admiten las columnas: los cuatro del curso o la lista general">Tipos<select id="profile-select" data-profile>
            <option value="course">Curso · VARCHAR, CHAR, NUMBER, DATE</option>
            <option value="general">General · todos los tipos</option></select></label>
        <button data-action="validate" id="model-status">Un documento · representaciones vinculadas</button>
        </section>
        <main class="workspace"><aside class="shapes-panel" aria-label="Formas">
        <div class="pane-heading">Formas ${icon( 'panel-left' )}</div>
        <div class="stencil-heading">Construye tu modelo</div>
        <div class="shape-palette">${paletteContents( state )}</div>
        <div id="stencil-tip" class="stencil-tip">Arrastra una forma al lienzo.<br>Doble clic para editar sus columnas.</div>
        <div class="model-explorer"><div id="explorer-heading" class="pane-heading">Tablas y vistas</div>
        <div id="entity-list"></div></div>
        <div class="shapes-footer">${icon( 'lock-keyhole' )}<span>Tus ejercicios se guardan<br>en este navegador</span></div>
        </aside>
        <section class="drawing-area" aria-label="Área de dibujo">
        <div class="canvas-host">
        <section id="ribbon" class="ribbon" aria-label="Herramientas"></section>
        <div class="drawing-heading"><span>${icon( 'file-spreadsheet' )}<span id="diagram-mode-label">Diagrama relacional</span></span>
            <span id="save-status">Recuperando ejercicio…</span></div>
        <svg id="canvas" xmlns="http://www.w3.org/2000/svg" aria-label="Lienzo del modelo de base de datos">
            <g id="viewport"></g></svg>
        <div id="canvas-empty" class="canvas-empty" hidden>${icon( 'table-2' )}
            <strong>Empieza con una entidad</strong><span>Arrástrala desde el panel Formas o pulsa aquí.</span>
            ${command( 'entity', 'Crear entidad', 'plus' )}</div>
        <div id="tool-hint" class="tool-hint" hidden></div></div>
        <div id="pane-splitter" class="pane-splitter" role="separator"
            aria-label="Cambiar altura de propiedades" aria-orientation="horizontal" tabindex="0"></div>
        <section id="properties-pane" class="properties-pane" aria-label="Propiedades de la base de datos">
            <div class="pane-heading"><span>Propiedades de la base de datos <span id="properties-name"></span></span>
            <button data-action="properties" title="Ocultar propiedades" aria-label="Ocultar propiedades">${icon( 'x' )}</button></div>
            <div id="properties-body" class="properties-body"></div>
        </section></section></main>
        <footer class="statusbar"><span id="model-count"></span><span id="selection-status"></span>
        <span class="status-spacer"></span>
        <button data-action="fit" title="Ajustar dibujo a la ventana">${icon( 'scan' )}</button>
        <button data-action="zoom-out" aria-label="Alejar">${icon( 'minus' )}</button>
        <input id="zoom" type="range" min="25" max="200" step="5" value="85" aria-label="Zoom">
        <button data-action="zoom-in" aria-label="Acercar">${icon( 'plus' )}</button>
        <button id="zoom-label" data-action="zoom-100">85 %</button></footer>`;
    }

export function explorerContents( state ) {
    if (state.model.display.mode === 'chen') {
        const projection = getConceptualProjection( state.model );

        return [...projection.entities, ...projection.relationships].map(
                item => `<button data-select="${item.id}" class="${item.id === state.selectedId ? 'active' : ''}">
                    ${icon( item.participations ? 'diamond' : 'square' )}
                    <span>${escapeHTML( item.name )}</span><small>${item.projected ? 'Proyección' : 'Nativo'}</small></button>`
                ).join( '' ) || '<p class="explorer-empty">Todavía no hay entidades.</p>';
        }

    return state.model.tables.map(
            table => `<button data-select="${table.id}" class="${table.id === state.selectedId ? 'active' : ''}">
                ${icon( table.kind === 'view' ? 'panels-top-left' : 'table-2' )}
                <span>${escapeHTML( table.name )}</span><small>${table.columns.length}</small></button>`
            ).join( '' ) || '<p class="explorer-empty">Todavía no hay entidades.</p>';
    }


export function paletteContents( state ) {
    const chen = state.model.display.mode === 'chen';
    const access = state.model.display.mode === 'tables';
    const forms = chen ? [
        ['entity', 'Entidad', 'Conceptual nativa', 'square'],
        ['conceptual-attribute', 'Atributo', 'Clave, compuesto, multivaluado…', 'circle'],
        ['conceptual-relationship', 'Relación', 'Binaria, N:N o ternaria', 'diamond'],
        ['generalization', 'Especialización', 'Superclase y subclases', 'git-fork']
        ] : access ? [
        ['entity', 'Tabla', 'Campos con tipos de Access', 'table-2'],
        ['relationship', 'Relación', 'Integridad referencial y búsqueda', 'git-branch'],
        ['view-shape', 'Consulta', 'Vista SQL guardada como consulta', 'panels-top-left']
        ] : [
        ['entity', 'Entidad', 'Tabla y columnas', 'table-2'],
        ['relationship', 'Relación', 'Referenciada y luego la de la FK', 'git-branch'],
        ['view-shape', 'Vista SQL', 'Consulta y columnas', 'panels-top-left']
        ];

    return forms.map(
            ([action, label, description, glyph]) => `<button data-action="${action}"
                ${action === 'entity' ? 'draggable="true" data-shape="entity"' : ''}>
                <span class="shape-preview">${icon( glyph )}</span>
                <span class="shape-label"><strong>${label}</strong><small>${description}</small></span>
                ${icon( 'plus' )}</button>`
            ).join( '' );
    }
