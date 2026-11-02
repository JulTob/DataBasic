import {
    command,
    escapeHTML,
    icon
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

export function ribbonContents( state ) {
    const disabled = state.selectedId ? '' : 'disabled';
    const entitySelected = state.model.tables.some( table => table.id === state.selectedId );
    const tableDisabled = entitySelected ? '' : 'disabled';
    const shapes = ribbonGroup(
            'Modelo',
            command( 'entity', 'Entidad', 'table-2', 'class="ribbon-large"' )
                + command( 'view-shape', 'Vista', 'panels-top-left', 'class="ribbon-large"' )
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
                            + command( 'sql', 'SQL', 'file-code-2', 'class="ribbon-large"' )
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
                        + command( 'example', 'Ejemplo de biblioteca', 'book-open', 'class="ribbon-large"' )
                        + command( 'validate', 'Revisar modelo', 'list-checks', 'class="ribbon-large"' )
                    );
        default:
            return windows + shapes + ribbonGroup(
                    'Modelo de base de datos',
                    command( 'validate', 'Comprobar', 'list-checks', 'class="ribbon-large"' )
                        + command( 'sql', 'Ver SQL', 'file-code-2', 'class="ribbon-large"' )
                        + command( 'layout', 'Distribuir', 'network', 'class="ribbon-large"' )
                    );
        }
    }

export function initialLayout( state ) {
    return `<header class="titlebar"><div class="app-mark">${icon( 'database' )}</div>
        <nav class="quick-access" aria-label="Acceso rápido">
        ${command( 'save', 'Guardar', 'save', 'title="Guardar archivo · ⌘/Ctrl+S"' )}
        ${command( 'undo', 'Deshacer', 'undo-2', 'title="Deshacer · ⌘/Ctrl+Z"' )}
        ${command( 'redo', 'Rehacer', 'redo-2', 'title="Rehacer · ⌘/Ctrl+Mayús+Z"' )}</nav>
        <button class="document-title" data-action="rename">
            DataBasic — <span id="document-name"></span></button>
        <span class="titlebar-note">Modelo de base de datos</span></header>
        <nav class="ribbon-tabs" aria-label="Cinta de comandos">
        ${RIBBON_TABS.map(
                ([id, label]) => `<button data-tab="${id}" class="${id === 'file' ? 'file-tab' : ''}"
                    aria-pressed="${id === state.tab}">${label}</button>`
                ).join( '' )}
        <span class="ribbon-spacer"></span>
        <button data-action="help" class="help-button" title="Ayuda">${icon( 'circle-help' )}</button></nav>
        <section id="ribbon" class="ribbon" aria-label="Herramientas"></section>
        <main class="workspace"><aside class="shapes-panel" aria-label="Formas">
        <div class="pane-heading">Formas ${icon( 'panel-left' )}</div>
        <div class="stencil-heading">Relación entre entidades</div>
        <div class="shape-palette">
        <button draggable="true" data-shape="entity" data-action="entity" title="Arrastra al lienzo o pulsa para crear">
            <span class="shape-preview entity-preview"><b></b><i></i><i></i></span><span>Entidad</span></button>
        <button data-action="relationship" title="Selecciona el padre y después el hijo">
            <span class="shape-preview relation-preview">─┤─&lt;</span><span>Relación</span></button>
        <button draggable="true" data-shape="view" data-action="view-shape">
            <span class="shape-preview view-preview"><b></b><i></i><i></i></span><span>Vista</span></button>
        </div>
        <div class="stencil-tip">Arrastra una entidad al dibujo.<br>Haz doble clic para editar columnas.</div>
        <div class="model-explorer"><div class="pane-heading">Tablas y vistas</div>
        <div id="entity-list"></div></div>
        <div class="shapes-footer">${icon( 'graduation-cap' )}<span>DataBasic · Práctica de bases de datos</span></div>
        </aside>
        <section class="drawing-area" aria-label="Área de dibujo">
        <div class="drawing-heading"><span>${icon( 'file-spreadsheet' )} Diagrama relacional</span>
            <span id="save-status">Recuperando ejercicio…</span></div>
        <div class="canvas-host"><div class="ruler-top"></div><div class="ruler-left"></div>
        <svg id="canvas" xmlns="http://www.w3.org/2000/svg" aria-label="Lienzo del modelo de base de datos">
            <g id="viewport"></g></svg>
        <div id="canvas-empty" class="canvas-empty" hidden>${icon( 'table-2' )}
            <strong>Empieza con una entidad</strong><span>Arrástrala desde el panel Formas o pulsa aquí.</span>
            ${command( 'entity', 'Crear entidad', 'plus' )}</div>
        <div id="tool-hint" class="tool-hint" hidden></div></div>
        <div class="page-tabs"><span class="page-tab">Página-1</span>
            <span class="page-caption">${icon( 'lock-keyhole' )} Tus ejercicios se guardan en este navegador</span></div>
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
    return state.model.tables.map(
            table => `<button data-select="${table.id}" class="${table.id === state.selectedId ? 'active' : ''}">
                ${icon( table.kind === 'view' ? 'panels-top-left' : 'table-2' )}
                <span>${escapeHTML( table.name )}</span><small>${table.columns.length}</small></button>`
            ).join( '' ) || '<p class="explorer-empty">Todavía no hay entidades.</p>';
    }
