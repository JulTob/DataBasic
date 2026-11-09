import { getConceptualProjection } from '../domain/model.js';
import { documentForms } from '../domain/forms.js';
import {
    command,
    escapeHTML,
    icon,
    options
    } from './html.js';

/*
 * Each view has its own tabs: what you can do in the Chen diagram differs from
 * what you do with tables and keys, or with data. Archivo, Inicio, Diseño,
 * Vista and Ayuda are shared; the middle tabs belong to the view.
 */
const VIEW_TABS = {
    chen: [['insert', 'Insertar'], ['model', 'Modelo']],
    relational: [['insert', 'Insertar'], ['database', 'Base de datos']],
    tables: [['create', 'Crear'], ['data', 'Datos']]
    };

/** The tabs of the ribbon for the view that is open. */
export function ribbonTabsFor( mode ) {
    return [
        ['file', 'Archivo'],
        ['home', 'Inicio'],
        ...(VIEW_TABS[mode] || VIEW_TABS.relational),
        ['design', 'Diseño'],
        ['view', 'Vista'],
        ['help', 'Ayuda']
        ];
    }

/** The tab to show: the one asked for when the view has it, otherwise the view's first own tab. */
export function effectiveTab(
        mode,
        tab
        ) {
    const tabs = ribbonTabsFor( mode ).map( ([id]) => id );

    return tabs.includes( tab ) ? tab : tabs[2];
    }

export function ribbonTabsContents( state ) {
    const current = effectiveTab( state.model.display.mode, state.tab );

    return `${ribbonTabsFor( state.model.display.mode ).map(
            ([id, label]) => `<button data-tab="${id}" class="${id === 'file' ? 'file-tab' : ''}"
                aria-pressed="${id === current}">${label}</button>`
            ).join( '' )}
        <span class="ribbon-spacer"></span>
        <button data-action="help" class="help-button" title="Ayuda">${icon( 'circle-help' )}</button>`;
    }

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
    ['tables', 'Tablas · datos']
    ];

/** The built-in example plus the folders of examples/index.json once they are loaded. */
function exampleSelect( state ) {
    const files = (state.examples || []).map( item => [item.folder, item.name] );

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
    const mode = state.model.display.mode;
    const large = 'class="ribbon-large"';
    const history = ribbonGroup(
            'Edición',
            command( 'undo', 'Deshacer', 'undo-2', state.past.length ? '' : 'disabled' )
                + command( 'redo', 'Rehacer', 'redo-2', state.future.length ? '' : 'disabled' )
                + command( 'delete', 'Eliminar', 'trash-2', disabled )
            );
    const relationshipPressed = `class="ribbon-large ${state.tool === 'relationship' ? 'pressed' : ''}"`;

    switch (effectiveTab( mode, state.tab )) {
        case 'file':
            return ribbonGroup(
                    'Documento',
                    command( 'new', 'Nuevo', 'file-plus-2', large )
                        + command( 'open', 'Abrir', 'folder-open', large )
                        + command( 'save', 'Guardar', 'save', large )
                        + command( 'rename', 'Propiedades', 'settings-2', 'class="ribbon-large" title="Nombre del documento y tipos de datos admitidos"' )
                    )
                + ribbonGroup(
                        'Exportar',
                        command( 'export', 'Exportar…', 'file-output', 'class="ribbon-large" title="Todos los formatos: dibujo, base de datos y memoria"' )
                            + command( 'report-docx', 'Memoria (.docx)', 'file-text', large )
                            + command( 'print', 'Imprimir / PDF', 'printer', large )
                        )
                + ribbonGroup(
                        'Entrega',
                        command( 'author', 'Alumno', 'id-card', large )
                            + command( 'delivery', 'Paquete de entrega', 'package', large )
                        )
                + ribbonGroup( 'Practicar', command( 'example', 'Abrir ejemplo', 'book-open', large ) );
        case 'home':
            return ribbonGroup(
                    'Portapapeles',
                    command( 'paste', 'Pegar', 'clipboard-paste', `class="ribbon-large" ${state.clipboard ? '' : 'disabled'}` )
                        + `<div class="ribbon-stack">${command( 'copy', 'Copiar', 'copy', tableDisabled )}
                            ${command( 'duplicate', 'Duplicar', 'copy-plus', tableDisabled )}</div>`
                    ) + history + ribbonGroup(
                        'Herramientas',
                        command( 'pointer', 'Puntero', 'mouse-pointer-2', `class="ribbon-large ${state.tool === 'pointer' ? 'pressed' : ''}"` )
                            + command( 'relationship', 'Conector', 'git-branch', large )
                        );
        case 'insert':
            return mode === 'chen'
                ? ribbonGroup(
                        'Modelo conceptual',
                        command( 'entity', 'Entidad', 'square', large )
                            + command( 'conceptual-attribute', 'Atributo', 'circle', large )
                            + command( 'conceptual-relationship', 'Relación', 'diamond', large )
                            + command( 'generalization', 'Especialización', 'git-fork', large )
                        ) + ribbonGroup( 'Contenido', command( 'assumption', 'Supuesto', 'message-square-text', large ) )
                : ribbonGroup(
                        'Modelo relacional',
                        command( 'entity', 'Tabla', 'table-2', large )
                            + command( 'relationship', 'Relación', 'git-branch', relationshipPressed )
                            + command( 'view-shape', 'Vista SQL', 'panels-top-left', large )
                        ) + ribbonGroup(
                        'Contenido',
                        command( 'add-column', 'Columna', 'list-plus', `class="ribbon-large" ${tableDisabled}` )
                            + command( 'notes', 'Notas', 'notebook-pen', `class="ribbon-large" ${tableDisabled}` )
                            + command( 'assumption', 'Supuesto', 'message-square-text', large )
                        );
        case 'model':
            return ribbonGroup(
                    'Modelo conceptual',
                    command( 'validate', 'Comprobar', 'list-checks', large )
                        + command( 'assumptions', 'Supuestos', 'clipboard-list', large )
                        + command( 'sql', 'Ver SQL', 'file-code-2', large )
                        + command( 'layout', 'Distribuir', 'network', large )
                    );
        case 'database':
            return ribbonGroup(
                    'Modelo relacional',
                    command( 'validate', 'Comprobar', 'list-checks', large )
                        + command( 'assumptions', 'Supuestos', 'clipboard-list', large )
                        + command( 'sql', 'Ver SQL', 'file-code-2', large )
                        + command( 'display', 'Notación y opciones', 'sliders-horizontal', large )
                        + command( 'layout', 'Distribuir', 'network', large )
                    );
        case 'create':
            return ribbonGroup(
                    'Crear',
                    command( 'entity', 'Tabla', 'table-2', large )
                        + command( 'view-shape', 'Consulta', 'panels-top-left', large )
                        + command( 'form-wizard', 'Asistente para formularios', 'layout-template', large )
                    ) + ribbonGroup(
                    'Consultas',
                    command( 'sql-console', 'Consola SQL', 'square-terminal', large )
                    );
        case 'data':
            return ribbonGroup(
                    'Datos',
                    command( 'sample-data', 'Datos de ejemplo', 'wand-sparkles', large )
                        + command( 'sql-console', 'Consola SQL', 'square-terminal', large )
                        + command( 'forms', 'Formularios', 'layout-template', large )
                    ) + ribbonGroup(
                    'Revisar',
                    command( 'validate', 'Comprobar', 'list-checks', large )
                        + command( 'assumptions', 'Supuestos', 'clipboard-list', large )
                    );
        case 'design':
            return ribbonGroup(
                    'Organizar',
                    command( 'layout', 'Distribuir automáticamente', 'network', large )
                        + command( 'fit', 'Ajustar a la ventana', 'scan', large )
                    ) + ribbonGroup(
                        'Página',
                        command( 'print', 'Imprimir / PDF', 'printer', large )
                            + command( 'grid', 'Cuadrícula', 'grid-2x2', `class="ribbon-large ${state.model.display.grid ? 'pressed' : ''}"` )
                        );
        case 'view':
            return ribbonGroup(
                    'Zoom',
                    command( 'fit', 'Ajustar', 'scan', large )
                        + command( 'zoom-100', '100 %', 'zoom-in', large )
                        + command( 'grid', 'Cuadrícula', 'grid-2x2', `class="ribbon-large ${state.model.display.grid ? 'pressed' : ''}"` )
                    ) + ribbonGroup(
                        'Mostrar',
                        command( 'display', 'Opciones de visualización', 'sliders-horizontal', 'class="ribbon-wide"' )
                        );
        default:
            return ribbonGroup(
                    'Aprender',
                    command( 'help', 'Guía de uso', 'circle-help', large )
                        + exampleSelect( state )
                        + command( 'validate', 'Revisar modelo', 'list-checks', large )
                    );
        }
    }

/** The panels a person can show or hide, and the sections of the side column that fold. */
export const PANELS = [
    ['shapes', 'Formas', 'shapes'],
    ['sql', 'SQL', 'square-terminal'],
    ['properties', 'Propiedades', 'panel-bottom']
    ];

function panelToggles( state ) {
    return PANELS.map(
            ([id, label, glyph]) => `<button data-action="toggle-panel" data-panel="${id}" aria-pressed="${Boolean( state.panels?.[id] )}"
                title="Mostrar u ocultar ${label}">${icon( glyph )}<span>${label}</span></button>`
            ).join( '' );
    }

/** A foldable section of the side column: a heading that folds it and its body. */
function sideSection(
        state,
        id,
        title,
        body,
        extra = ''
        ) {
    const folded = Boolean( state.folded?.[id] );

    return `<section class="side-section side-${id}${folded ? ' folded' : ''}" data-section="${id}" ${extra}>
        <button class="side-heading" data-action="fold-section" data-section="${id}" aria-expanded="${!folded}">
            ${icon( folded ? 'chevron-right' : 'chevron-down' )}<span ${id === 'tables' ? 'id="explorer-heading"' : ''}>${title}</span></button>
        <div class="side-body">${body}</div></section>`;
    }

export function initialLayout( state ) {
    return `<header class="titlebar">
        <div class="app-brand"><div class="app-mark">${icon( 'database' )}</div>
            <strong>DataBasic</strong><span class="brand-label">Modelador</span></div>
        <label class="view-select-label" title="Representación del documento: cada vista tiene sus propias acciones en la cinta">
            <span class="visually-hidden">Vista</span><select id="view-select" data-view
            aria-label="Representación del documento">${options( VIEW_OPTIONS, state.model.display.mode )}</select></label>
        <button class="document-title" data-action="rename" title="Propiedades del documento: nombre y tipos de datos">
            ${icon( 'file-spreadsheet' )}<span id="document-name"></span>${icon( 'chevron-down' )}</button>
        <nav class="panel-toggles" id="panel-toggles" aria-label="Mostrar u ocultar paneles">${panelToggles( state )}</nav>
        <nav class="quick-access" aria-label="Acceso rápido">
        ${command( 'undo', 'Deshacer', 'undo-2', 'title="Deshacer · ⌘/Ctrl+Z"' )}
        ${command( 'redo', 'Rehacer', 'redo-2', 'title="Rehacer · ⌘/Ctrl+Mayús+Z"' )}
        ${command( 'save', 'Guardar', 'save', 'class="save-button" title="Guardar la carpeta del proyecto (.zip) · ⌘/Ctrl+S"' )}
        </nav></header>
        <nav class="ribbon-tabs" id="ribbon-tabs" aria-label="Cinta de comandos">${ribbonTabsContents( state )}</nav>
        <main class="workspace"><aside class="shapes-panel side-column" aria-label="Formas, tablas y consola SQL">
        ${sideSection(
                state,
                'shapes',
                'Formas',
                `<div class="stencil-heading">Construye tu modelo</div>
                <div class="shape-palette">${paletteContents( state )}</div>
                <div id="stencil-tip" class="stencil-tip">Arrastra una forma al lienzo.<br>Doble clic para editar sus columnas.</div>`,
                state.panels?.shapes ? '' : 'hidden'
                )}
        ${sideSection( state, 'tables', 'Tablas y vistas', '<div id="entity-list"></div>' )}
        ${sideSection( state, 'sql', 'Consola SQL', '<div id="sql-console"></div>', state.panels?.sql ? '' : 'hidden' )}
        <div class="shapes-footer">${icon( 'lock-keyhole' )}<span>Tus ejercicios se guardan<br>en este navegador</span></div>
        </aside>
        <div id="side-splitter" class="side-splitter" role="separator" tabindex="0"
            aria-label="Cambiar el ancho de la columna izquierda" aria-orientation="vertical"></div>
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
        <button data-action="validate" id="model-status" class="status-link">Un documento · representaciones vinculadas</button>
        <span class="status-spacer"></span>
        <button data-action="fit" title="Ajustar dibujo a la ventana">${icon( 'scan' )}</button>
        <button data-action="zoom-out" aria-label="Alejar">${icon( 'minus' )}</button>
        <input id="zoom" type="range" min="25" max="200" step="5" value="85" aria-label="Zoom">
        <button data-action="zoom-in" aria-label="Acercar">${icon( 'plus' )}</button>
        <button id="zoom-label" data-action="zoom-100">85 %</button></footer>`;
    }

/** The toggles of the title bar, drawn again when a panel opens or closes. */
export function panelTogglesContents( state ) {
    return panelToggles( state );
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

    const tables = state.model.tables.map(
            table => `<button data-select="${table.id}" class="${table.id === state.selectedId ? 'active' : ''}">
                ${icon( table.kind === 'view' ? 'panels-top-left' : 'table-2' )}
                <span>${escapeHTML( table.name )}</span><small>${table.columns.length}</small></button>`
            ).join( '' ) || '<p class="explorer-empty">Todavía no hay entidades.</p>';
    const forms = state.model.display.mode === 'tables' ? documentForms( state.model ) : [];

    return forms.length
        ? `${tables}<p class="explorer-subheading">Formularios</p>${forms.map(
                form => `<button data-form-open="${form.id}">${icon( 'layout-template' )}<span>${escapeHTML( form.title )}</span></button>`
                ).join( '' )}`
        : tables;
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
        ['entity', 'Tabla', 'Campos con tipos de datos', 'table-2'],
        ['relationship', 'Relación', 'Integridad referencial y búsqueda', 'git-branch'],
        ['view-shape', 'Consulta', 'Vista SQL guardada como consulta', 'panels-top-left'],
        ['form-wizard', 'Formulario', 'Asistente paso a paso', 'layout-template'],
        ['sql-console', 'Consola SQL', 'Consultas, datos y tablas en SQL', 'square-terminal'],
        ['sample-data', 'Datos de ejemplo', 'Filas que cumplen las reglas', 'wand-sparkles']
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
