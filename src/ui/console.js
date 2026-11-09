import {
    command,
    escapeHTML,
    icon
    } from './html.js';
import { displayValue } from '../sql/values.js';

/*
 * The SQL console in the left column, laid out like a classic query window:
 * the SQL view above, the datasheet of the result below with its record
 * count, and the objects of the database at the side. Each run adds an entry
 * to the history: the statement, then its datasheet, what it changed or the
 * error, and the query in relational algebra.
 */

export const CONSOLE_DISPLAY_LIMIT = 200;
export const CONSOLE_HISTORY_LIMIT = 20;

/** Ready-made statements over the document's own tables, to start from. */
export function sqlTemplates( model ) {
    const tables = model.tables.filter( table => table.kind === 'entity' );
    const first = tables[0];
    const related = model.relationships[0];
    const child = related && model.tables.find( table => table.id === related.childId );
    const parent = related && model.tables.find( table => table.id === related.parentId );
    const name = text => /^[\p{L}_][\p{L}\p{N}_]*$/u.test( text ) ? text : `[${text}]`;
    const templates = [];

    if (first) {
        const columns = first.columns.slice( 0, 3 ).map( column => name( column.name ) );

        templates.push( ['Todos los registros', `SELECT *\nFROM ${name( first.name )};`] );
        templates.push( ['Campos y condición', `SELECT ${columns.join( ', ' )}\nFROM ${name( first.name )}\nWHERE ${columns[0]} IS NOT NULL\nORDER BY ${columns[0]};`] );
        }

    if (child && parent) {
        const pairs = related.mappings.map( pair => {
            const childColumn = child.columns.find( column => column.id === pair.childColumnId );
            const parentColumn = parent.columns.find( column => column.id === pair.parentColumnId );

            return `${name( child.name )}.${name( childColumn.name )} = ${name( parent.name )}.${name( parentColumn.name )}`;
            } );

        templates.push( [
            'Combinación (INNER JOIN)',
            `SELECT *\nFROM ${name( child.name )} INNER JOIN ${name( parent.name )}\n    ON ${pairs.join( ' AND ' )};`
            ] );
        templates.push( [
            'Totales (GROUP BY)',
            `SELECT ${pairs[0].split( ' = ' )[1]}, Count(*) AS registros\nFROM ${name( child.name )} INNER JOIN ${name( parent.name )}\n    ON ${pairs.join( ' AND ' )}\nGROUP BY ${pairs[0].split( ' = ' )[1]}\nORDER BY Count(*) DESC;`
            ] );
        }

    if (first) {
        const values = first.columns.map( column => (/NUMBER|INT|DECIMAL|NUMERIC/i.test( column.type ) ? '0' : /DATE/i.test( column.type ) ? '#2026-01-31#' : '\'texto\'') );

        templates.push( ['Agregar un registro (INSERT)', `INSERT INTO ${name( first.name )} (${first.columns.map( column => name( column.name ) ).join( ', ' )})\nVALUES (${values.join( ', ' )});`] );
        templates.push( ['Cambiar registros (UPDATE)', `UPDATE ${name( first.name )}\nSET ${name( first.columns.at( -1 ).name )} = ${values.at( -1 )}\nWHERE ${name( first.columns[0].name )} = ${values[0]};`] );
        templates.push( ['Eliminar registros (DELETE)', `DELETE FROM ${name( first.name )}\nWHERE ${name( first.columns[0].name )} = ${values[0]};`] );
        }

    templates.push( [
        'Crear una tabla (CREATE TABLE)',
        'CREATE TABLE Nueva (\n    codigo NUMBER(6) PRIMARY KEY,\n    nombre VARCHAR(60) NOT NULL,\n    alta DATE DEFAULT Date()\n);'
        ] );
    templates.push( ['Guardar una consulta (CREATE VIEW)', `CREATE VIEW Consulta1 AS\nSELECT *\nFROM ${first ? name( first.name ) : 'Tabla'};`] );
    return templates;
    }

function objectsPanel( model ) {
    const tables = model.tables.filter( table => table.kind === 'entity' );
    const views = model.tables.filter( table => table.kind === 'view' );
    const rows = id => (model.data?.[id] || []).length;

    return `<details class="console-objects"><summary>Tablas y campos para insertar</summary>
        <h4>Tablas</h4>
        ${tables.map( table => `<details><summary><button type="button" data-sql-insert="${escapeHTML( table.name )}"
            title="Insertar el nombre en el SQL">${escapeHTML( table.name )}</button><small>${rows( table.id )}</small></summary>
            <ul>${table.columns.map( column => `<li><button type="button" data-sql-insert="${escapeHTML( column.name )}"
                title="${escapeHTML( column.type )}">${column.primary ? '🔑 ' : ''}${escapeHTML( column.name )}</button></li>` ).join( '' )}</ul>
            </details>` ).join( '' ) || '<p class="console-empty">Sin tablas.</p>'}
        <h4>Consultas</h4>
        ${views.map( view => `<button type="button" class="console-saved" data-sql-load="${escapeHTML( view.id )}"
            title="Abrir su SQL en el editor">${icon( 'panels-top-left' )}${escapeHTML( view.name )}</button>` ).join( '' )
            || '<p class="console-empty">Ninguna guardada.</p>'}
        </details>`;
    }

function datasheet( output ) {
    const shown = output.rows.slice( 0, CONSOLE_DISPLAY_LIMIT );
    const numeric = output.kinds.map( kind => ['number', 'boolean'].includes( kind ) );
    const header = output.columns.map(
            (name, index) => `<th class="${numeric[index] ? 'number' : ''}">${escapeHTML( name )}</th>`
            ).join( '' );
    const body = shown.map(
            (row, rowIndex) => `<tr><td class="record">${rowIndex + 1}</td>${row.map(
                    (value, index) => `<td class="${numeric[index] ? 'number' : ''}${value === null ? ' null' : ''}">${escapeHTML( displayValue( value ) )}</td>`
                    ).join( '' )}</tr>`
            ).join( '' );
    const more = output.total > shown.length ? ` · se muestran los ${shown.length} primeros` : '';

    return `<div class="console-datasheet"><table><thead><tr><th class="record" aria-label="Selector de registro"></th>${header}</tr></thead>
        <tbody>${body || `<tr><td class="record"></td><td colspan="${Math.max( 1, output.columns.length )}" class="console-no-rows">Ningún registro.</td></tr>`}</tbody></table></div>
        <footer class="console-records">Registros: ${output.total}${more}</footer>`;
    }

/** The algebra with its subscripts: «σ_{a > 1}(R)» shows a > 1 as a subscript of σ. */
function algebraHTML( text ) {
    let html = '';
    let depth = 0;

    for (let index = 0; index < text.length; index += 1) {
        if (text[index] === '_' && text[index + 1] === '{' && depth === 0) {
            html += '<sub>';
            depth = 1;
            index += 1;
            continue;
            }

        if (depth > 0 && text[index] === '{') {
            depth += 1;
            }

        if (depth > 0 && text[index] === '}') {
            depth -= 1;

            if (depth === 0) {
                html += '</sub>';
                continue;
                }
            }

        html += escapeHTML( text[index] );
        }

    return html;
    }

function outputHTML(
        output,
        showAlgebra
        ) {
    switch (output.kind) {
        case 'rows':
            return datasheet( output )
                + (showAlgebra && output.algebra ? `<p class="console-algebra" title="La consulta en álgebra relacional">${algebraHTML( output.algebra )}</p>` : '');
        case 'done':
            return `<p class="console-done">${icon( 'circle-check' )}<span>${escapeHTML( output.message )}</span></p>`;
        default:
            return `<p class="console-error" role="alert">${icon( 'circle-x' )}<span>${escapeHTML( output.message )}</span></p>`;
        }
    }

function historyHTML(
        history,
        showAlgebra
        ) {
    if (!history.length) {
        return `<div class="console-welcome">${icon( 'terminal' )}
            <p>Escribe SQL (fechas entre #, IIf, Nz, comodines * y ?) y pulsa <kbd>Ctrl</kbd> + <kbd>Intro</kbd> o <strong>Ejecutar</strong>.
            Las consultas muestran su hoja de datos; INSERT, UPDATE y DELETE cambian las filas de ejemplo;
            CREATE, ALTER y DROP cambian las tablas. Todo se puede deshacer.</p></div>`;
        }

    return history.map(
            entry => entry.outputs.map(
                    output => `<article class="console-entry console-kind-${output.kind}">
                        <pre class="console-statement">${escapeHTML( output.statement )}</pre>${outputHTML( output, showAlgebra )}</article>`
                    ).join( '' )
            ).join( '' );
    }

export function consoleContents( state ) {
    const consoleState = state.console;
    const templates = sqlTemplates( state.model );

    return `<div class="console-panel">
        <div class="console-workspace">
            <div class="console-editor">
                <div class="console-toolbar" role="toolbar" aria-label="Consola SQL">
                    ${command( 'sql-run', 'Ejecutar', 'play', 'class="primary-button" title="Ejecutar · Ctrl+Intro"' )}
                    ${command( 'sql-save-view', 'Guardar como consulta…', 'save' )}
                    ${command( 'sample-data', 'Datos de ejemplo', 'wand-sparkles', 'title="Rellena las tablas vacías con filas que cumplen sus reglas"' )}
                    <label class="console-template">Plantilla<select data-sql-template aria-label="Plantillas de SQL">
                        <option value="">Elige…</option>
                        ${templates.map( ([label], index) => `<option value="${index}">${escapeHTML( label )}</option>` ).join( '' )}
                    </select></label>
                    <label class="console-algebra-toggle"><input type="checkbox" data-sql-algebra ${consoleState.showAlgebra ? 'checked' : ''}>Álgebra</label>
                    ${command( 'sql-clear', 'Limpiar', 'eraser', 'title="Vaciar el historial de la consola"' )}
                </div>
                <textarea id="sql-input" data-sql-input spellcheck="false" autocomplete="off"
                    aria-label="Instrucciones SQL" placeholder="SELECT * FROM Tabla;">${escapeHTML( consoleState.text )}</textarea>
            </div>
            ${objectsPanel( state.model )}
        </div>
        <div class="console-output" aria-live="polite">${historyHTML( consoleState.history, consoleState.showAlgebra )}</div>
        </div>`;
    }
