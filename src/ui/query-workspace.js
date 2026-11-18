import { algebraOperators, compileAlgebra, algebraIdentifier } from '../domain/query-algebra.js';
import { compatibleChallenges } from '../domain/query-challenges.js';
import { queryModel } from '../domain/query-engine.js';
import { escapeHTML } from './html.js';

export function queryResultDifference(
        actual,
        expected,
        checkNames = false
        ) {
    if (actual.columns.length !== expected.columns.length) {
        return `Se esperaban ${expected.columns.length} columnas y se obtuvieron ${actual.columns.length}.`;
        }

    if (checkNames && actual.columns.some( (name, index) =>
        name.toLowerCase() !== expected.columns[index].toLowerCase() )) {
        return 'El reto pide estos nombres de columna: ' + expected.columns.join( ', ' ) + '.';
        }

    // SQL preserves multiplicity. Without ORDER BY, row order is immaterial.
    const counts = new Map();
    for (const row of expected.rows) {
        const key = JSON.stringify( row );
        counts.set( key, (counts.get( key ) || 0) + 1 );
        }

    let extra = 0;
    for (const row of actual.rows) {
        const key = JSON.stringify( row );
        const count = counts.get( key ) || 0;
        if (count) counts.set( key, count - 1 );
        else extra++;
        }

    const missing = [...counts.values()].reduce( (sum, count) => sum + count, 0 );
    return extra || missing ? `Filas ausentes: ${missing}. Filas adicionales: ${extra}. Revisa también las repeticiones.` : '';
    }

function queryResultTable( result ) {
    const row = cells => '<tr>' + cells.map( value =>
        `<td>${value === null ? '<i>NULL</i>' : escapeHTML( value )}</td>`
        ).join( '' ) + '</tr>';
    const maximum = 150;
    return `<p>${result.rows.length} ${result.rows.length === 1 ? 'fila' : 'filas'}${result.rows.length > maximum ? ' · primeras 150 visibles' : ''}</p>
        <div class="query-grid" tabindex="0"><table><thead><tr>${result.columns.map(
            name => '<th scope="col">' + escapeHTML( name ) + '</th>'
            ).join( '' )}</tr></thead><tbody>${result.rows.slice( 0, maximum ).map( row ).join( '' )}</tbody></table></div>`;
    }

function insertQueryButton( text, label, hint = label ) {
    return `<button type="button" draggable="true" data-query-insert="${escapeHTML( text )}"
        title="${escapeHTML( hint )}">${escapeHTML( label )}</button>`;
    }

function queryEditor( language, draft ) {
    const algebra = language === 'algebra';
    const name = algebra ? 'Álgebra relacional' : 'SQL';
    return `<section class="query-card"><header><h2>${name}</h2>
        <small>${algebra ? 'Conjuntos' : 'SQLite · lectura'}</small></header>
        <textarea id="query-${language}" data-editor="${language}" aria-label="${name}"
            spellcheck="false" maxlength="${algebra ? 16000 : 20000}">${escapeHTML( draft || '' )}</textarea>
        <div class="query-commands"><button class="query-run" data-query-run="${language}">Ejecutar</button>
        ${algebra ? '<button data-query-step>Ejecutar selección</button>' : ''}</div>
        <details class="query-insert"><summary>${algebra ? 'Operadores' : 'Cláusulas SQL'}</summary>
        ${algebra ? '<label><input type="checkbox" data-bind-operator> Rellenar con mis tablas</label>' : ''}
        <div>
        ${algebra ? algebraOperators.map( op => insertQueryButton( op.template, op.symbol + ' ' + op.label ) ).join( '' )
            : ['SELECT ', 'DISTINCT ', 'FROM ', 'WHERE ', 'JOIN ', 'ON ', 'GROUP BY ', 'HAVING ', 'ORDER BY ', 'IS NULL'].map(
                word => insertQueryButton( word, word.trim() ) ).join( '' )}
        </div></details><div class="query-output" id="result-${language}" aria-live="polite"></div></section>`;
    }

function querySchema( model ) {
    return `<details class="query-reference"><summary>Tablas y campos</summary>
        ${model.tables.filter( table => table.kind === 'entity' ).map( table =>
            `<div>${insertQueryButton(
                [table.namespace, table.name].filter( Boolean ).map( algebraIdentifier ).join( '.' ),
                [table.namespace, table.name].filter( Boolean ).join( '.' )
                )}
                ${table.columns.map( col => insertQueryButton(
                    algebraIdentifier( col.name ), col.name, table.name + ' · ' + col.type
                    ) ).join( '' )}</div>`
            ).join( '' )}</details>`;
    }

function bibliographyExercises( candidates ) {
    const examples = candidates.filter( item => item.id.includes( ':biblioteca-' ) );
    if (!examples.length) return '';
    return `<div><label>Preguntas de la biblioteca
        <select data-catalog-exercise><option value="">Elige una pregunta…</option>
        ${examples.map( item => `<option value="${escapeHTML( item.id )}">${escapeHTML( item.prompt )}</option>`).join( '' )}
        </select></label></div>`;
    }

/** Holds transient results for the active project; only editor text belongs to its document. */
export function createQueryWorkspace( host, getModel, saveDraft ) {
    let challenge = null;
    let available = [];
    let expectedRows = null;
    let family = '';
    let finding = false;
    let free = true;
    let restoredDraft = '';
    const results = {algebra: null, sql: null};
    let lastSchema = '';
    let activeEditor = 'algebra';
    let epoch = 0;
    const revisions = {algebra: 0, sql: 0};
    const editor = language => host.querySelector( '#query-' + language );
    const output = language => host.querySelector( '#result-' + language );

    function persist() {
        const draft = {
            algebra: editor( 'algebra' ).value,
            sql: editor( 'sql' ).value,
            challengeId: challenge?.id || null,
            family
            };
        restoredDraft = JSON.stringify( draft );
        saveDraft( draft );
        }

    function clearResults() {
        for (const language of ['algebra', 'sql']) {
            results[language] = null;
            output( language ).replaceChildren();
            }
        host.querySelector( '#query-comparison' ).hidden = true;
        }

    async function choose( preferred = null ) {
        const turn = ++epoch;
        const previous = challenge;
        free = false;
        challenge = null;
        expectedRows = null;
        const model = getModel();
        const pool = available.filter( item => !family || item.family === family );
        const remaining = pool.filter( item => item.id === preferred?.id || item.id !== previous?.id );
        if (!remaining.length && previous && pool.length) remaining.push( previous );
        const triedFamilies = new Set();
        finding = remaining.length > 0;
        setPrompt();
        // Try each binding at most once. A typed schema may still contain rows
        // SQLite cannot load or two headings which become ambiguous in a join.
        for (let trial = 0; remaining.length && trial < 8; trial++) {
            const families = [...new Set( remaining.map( item => item.family ) )];
            const fresh = families.filter( value => !triedFamilies.has( value ) && value !== previous?.family );
            const options = fresh.length ? fresh : families;
            const type = options[Math.floor( Math.random() * options.length )];
            triedFamilies.add( type );
            const variants = remaining.filter( item => item.family === type );
            const item = trial === 0 && preferred
                ? remaining.find( choice => choice.id === preferred.id ) || variants[0]
                : variants[Math.floor( Math.random() * variants.length )];
            remaining.splice( remaining.indexOf( item ), 1 );
            try {
                const [result, reference] = await Promise.all( [
                    queryModel( model, compileAlgebra( item.algebra, model ) ),
                    queryModel( model, item.sql )
                    ] );
                if (turn !== epoch) return;
                if (reference.rows.length && !queryResultDifference( result, reference, true )) {
                    challenge = item;
                    expectedRows = reference;
                    break;
                    }
                }
            catch {
                if (turn !== epoch) return;
                }
            }
        finding = false;
        persist();
        setPrompt();
        }

    function setPrompt() {
        const prompt = host.querySelector( '#query-prompt' );
        const message = free ? 'Consulta libre. Usa las tablas del proyecto o pulsa Nuevo reto.'
            : finding ? 'Comprobando un reto con tus datos…'
            : family ? 'Esta operación necesita otra combinación de campos o filas. Puedes practicar libremente.'
                : 'Introduce una consulta libre o añade filas en Tablas para generar un reto.';
        prompt.innerHTML = challenge
            ? '<strong>Reto</strong><p>' + escapeHTML( challenge.prompt ) + '</p>'
                + '<button data-query-hint>Ver la expresión de álgebra</button><button data-query-free>Consulta libre</button>'
            : '<p>' + message + '</p>';
        }

    function show() {
        const model = getModel();
        const schema = JSON.stringify( [model.tables, model.relationships, model.data] );
        const draft = model.queryDraft || {};
        if (host.childElementCount && lastSchema === schema && restoredDraft === JSON.stringify( draft )) return;
        lastSchema = schema;
        restoredDraft = JSON.stringify( draft );
        epoch++;
        results.algebra = null;
        results.sql = null;
        challenge = null;
        expectedRows = null;
        available = compatibleChallenges( model );
        family = algebraOperators.some( op => op.id === draft.family ) ? draft.family : '';
        host.innerHTML = `<div class="query-body"><section class="query-prompt" id="query-prompt"></section>
            <div class="query-editors">${queryEditor( 'algebra', draft.algebra )}${queryEditor( 'sql', draft.sql )}</div>
            <div id="query-comparison" class="query-reference" hidden>
                <button data-query-compare>Comparar mis resultados</button>
                <span aria-live="polite"></span></div>
            ${querySchema( model )}
            <details class="query-reference"><summary>Familia de retos</summary><div>
            <label>Operación <select data-query-family><option value="">Todas las disponibles</option>
            ${algebraOperators.map( op => `<option value="${op.id}"
                ${available.some( item => item.family === op.id ) ? '' : 'disabled'}>${op.symbol} ${op.label}</option>` ).join( '' )}
            </select></label></div>
            ${bibliographyExercises( available )}</details></div>`;
        host.querySelector( '[data-query-family]' ).value = family;
        const saved = available.find( item => item.id === draft.challengeId );
        if (saved) choose( saved );
        else {
            free = true;
            setPrompt();
            if (draft.challengeId) {
                host.querySelector( '#query-prompt' ).textContent =
                    'El reto guardado ya no encaja con los datos actuales. Puedes consultar libremente o elegir otro.';
                }
            }
        }

    function next() {
        clearResults();
        choose();
        }

    function solution( includeSQL ) {
        if (!challenge) return;
        const prompt = host.querySelector( '#query-prompt' );
        prompt.querySelector( 'pre' )?.remove();
        const sample = document.createElement( 'pre' );
        sample.textContent = challenge.algebra + (includeSQL ? '\n\n' + challenge.sql : '');
        prompt.append( sample );
        }

    async function execute( language, selectionOnly = false ) {
        const request = ++revisions[language];
        const start = epoch;
        const element = editor( language );
        const text = selectionOnly ? element.value.slice( element.selectionStart, element.selectionEnd ) : element.value;
        const panel = output( language );
        if (!text.trim()) {
            panel.textContent = selectionOnly ? 'Selecciona una expresión completa en el editor.' : 'Escribe una consulta para ejecutarla.';
            return;
            }

        const model = getModel();
        panel.textContent = 'Ejecutando…';
        try {
            const sql = language === 'algebra' ? compileAlgebra( text, model ) : text;
            const result = await queryModel( model, sql );
            if (start !== epoch || request !== revisions[language]) return;
            let feedback = '';
            if (challenge && expectedRows && !selectionOnly) {
                const difference = queryResultDifference( result, expectedRows,
                        ['rename', 'group'].includes( challenge.family ) );
                feedback = '<p class="query-feedback">' + escapeHTML( difference || 'Coincide con el resultado del reto en estos datos.' ) + '</p>';
                }
            panel.innerHTML = queryResultTable( result ) + feedback;
            if (!selectionOnly) {
                results[language] = result;
                host.querySelector( '#query-comparison' ).hidden = !(results.algebra && results.sql);
                }
            }
        catch (error) {
            if (start === epoch && request === revisions[language]) {
                panel.innerHTML = '<p class="query-error">' + escapeHTML( error.message ) + '</p>';
                }
            }
        }

    function insertionText( button ) {
        const text = button.dataset.queryInsert;
        const card = button.closest( '.query-card' );
        if (!card?.querySelector( '[data-bind-operator]' )?.checked) return text;
        const op = algebraOperators.find( item => item.template === text );
        return available.find( item => item.family === op?.id )?.algebra || text;
        }

    function insert( value, field ) {
        const start = field.selectionStart;
        field.setRangeText( value, start, field.selectionEnd, 'end' );
        field.focus();
        field.dispatchEvent( new Event( 'input', {bubbles: true} ) );
        }

    host.addEventListener( 'focusin', event => {
        if (event.target.dataset.editor) activeEditor = event.target.dataset.editor;
        } );
    host.addEventListener( 'input', event => {
        const language = event.target.dataset.editor;
        if (!language) return;
        revisions[language]++;
        output( language ).replaceChildren();
        results[language] = null;
        host.querySelector( '#query-comparison' ).hidden = true;
        host.querySelector( '#query-comparison span' ).textContent = '';
        persist();
        } );
    host.addEventListener( 'click', event => {
        const button = event.target.closest( 'button' );
        if (!button) return;
        const data = button.dataset;
        if (data.queryRun) execute( data.queryRun );
        else if (data.queryStep !== undefined) execute( 'algebra', true );
        else if (data.queryHint !== undefined) solution( false );
        else if (data.queryCompare !== undefined && results.sql && results.algebra) {
            host.querySelector( '#query-comparison span' ).textContent =
                queryResultDifference( results.sql, results.algebra ) || 'Mismas filas y multiplicidades.';
            }
        else if (data.queryFree !== undefined) {
            epoch++;
            challenge = null;
            expectedRows = null;
            free = true;
            family = '';
            host.querySelector( '[data-query-family]' ).value = '';
            clearResults();
            setPrompt();
            persist();
            }
        else if (data.queryInsert !== undefined) {
            const card = button.closest( '.query-card' );
            const input = card ? card.querySelector( 'textarea' ) : editor( activeEditor );
            insert( insertionText( button ), input );
            }
        } );
    host.addEventListener( 'change', event => {
        if (event.target.hasAttribute( 'data-catalog-exercise' )) {
            const item = available.find( candidate => candidate.id === event.target.value );
            if (item) {
                family = item.family;
                host.querySelector( '[data-query-family]' ).value = family;
                clearResults();
                choose( item );
                }
            event.target.value = '';
            }
        else if (event.target.hasAttribute( 'data-query-family' )) {
            family = event.target.value;
            next();
            }
        } );
    host.addEventListener( 'dragstart', event => {
        const button = event.target.closest( '[data-query-insert]' );
        if (button) {
            event.dataTransfer.setData( 'text/plain', insertionText( button ) );
            event.dataTransfer.effectAllowed = 'copy';
            }
        } );
    host.addEventListener( 'keydown', event => {
        if (event.target.dataset.editor && event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            execute( event.target.dataset.editor );
            }
        } );

    function reset() {
        lastSchema = '';
        epoch++;
        }
    return {show, next, solution, reset};
    }
