import {
    AUTHOR_FIELDS,
    changeDocument,
    conceptualStatus,
    documentAssumptions,
    validCourseType
    } from './model.js';

/*
 * What a practice delivery needs beyond a valid model. The practice asks for
 * a .zip with (a) a Word or PDF document with the student's DNI, name and
 * surnames and the conceptual design, including the semantic assumptions and
 * the lost semantics; (b) the Visio file of the relational model; (c) the
 * Access database. This module keeps who delivers and checks the model
 * against that statement; the files themselves are written in io/.
 */

/** The student, always with the three texts (empty when not given yet). */
export function documentAuthor( model ) {
    const author = model.author || {};

    return Object.fromEntries( AUTHOR_FIELDS.map( key => [key, author[key] || ''] ) );
    }

/** "Nombre Apellidos", or an empty text when neither is given. */
export function authorFullName( model ) {
    const author = documentAuthor( model );

    return `${author.nombre} ${author.apellidos}`.trim();
    }

function cleanAuthorText(
        key,
        value
        ) {
    if (value === undefined || value === null) {
        return '';
        }

    if (typeof value !== 'string') {
        throw new Error( `${key}: se necesita texto.` );
        }

    return value.trim().replace( /\s+/g, ' ' );
    }

/** Stores the student's data; the DNI is kept in capitals and without spaces or hyphens. */
export function setDocumentAuthor(
        model,
        author
        ) {
    return changeDocument(
            model,
            next => {
                const clean = Object.fromEntries(
                        AUTHOR_FIELDS.map( key => [key, cleanAuthorText( key, author[key] )] )
                        );

                clean.dni = clean.dni.toUpperCase().replace( /[\s-]/g, '' );
                next.author = clean;
                }
            );
    }

const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

/*
 * A Spanish DNI is eight digits and a check letter; a NIE replaces the first
 * digit with X, Y or Z (worth 0, 1 and 2). The letter is the one at position
 * (number mod 23) of DNI_LETTERS. Returns the problem, or null when correct.
 */
export function identityDocumentProblem( value ) {
    const text = String( value || '' ).toUpperCase().replace( /[\s-]/g, '' );

    if (!text) {
        return 'Falta el DNI o NIE del alumno.';
        }

    const dni = /^(\d{8})([A-Z])$/.exec( text );
    const nie = /^([XYZ])(\d{7})([A-Z])$/.exec( text );

    if (!dni && !nie) {
        return `${text}: el DNI son 8 cifras y una letra; el NIE, X, Y o Z, 7 cifras y una letra.`;
        }

    const number = dni ? Number( dni[1] ) : Number( `${'XYZ'.indexOf( nie[1] )}${nie[2]}` );
    const letter = dni ? dni[2] : nie[3];
    const expected = DNI_LETTERS[number % 23];

    return letter === expected
        ? null
        : `${text}: la letra no corresponde al número; debería ser ${expected}.`;
    }

function authorChecks( model ) {
    const author = documentAuthor( model );
    const checks = [];
    const missing = [
        ...(author.nombre ? [] : ['el nombre']),
        ...(author.apellidos ? [] : ['los apellidos'])
        ];

    if (missing.length) {
        checks.push( {level: 'error', message: `Faltan ${missing.join( ' y ' )} del alumno (Archivo → Alumno).`} );
        }

    const problem = identityDocumentProblem( author.dni );

    if (problem) {
        checks.push( {level: 'error', message: problem} );
        }

    return checks;
    }

function conceptualChecks( model ) {
    const native = model.conceptual;
    const checks = [];
    const pending = conceptualStatus( model ).filter( item => item.code === 'pending' );

    if (!native?.entities.length) {
        checks.push( {level: 'error', message: 'El diagrama entidad-relación no tiene entidades.'} );
        return checks;
        }

    if (pending.length) {
        checks.push( {
            level: 'error',
            message: `Quedan ${pending.length} decisiones de transformación pendientes; la primera: ${pending[0].message}`
            } );
        }

    if (!native.relationships.some( item => item.participations.length === 3 )) {
        checks.push( {level: 'warning', message: 'La práctica pide una relación ternaria y el diagrama no tiene ninguna.'} );
        }

    if (!native.generalizations.length) {
        checks.push( {level: 'warning', message: 'La práctica pide una generalización–especialización y el diagrama no tiene ninguna.'} );
        }

    return checks;
    }

function assumptionChecks( model ) {
    const kinds = new Set( documentAssumptions( model ).map( item => item.kind ) );
    const checks = [];

    if (!kinds.has( 'supuesto' )) {
        checks.push( {level: 'warning', message: 'La memoria no tiene supuestos semánticos escritos por el alumno (Insertar → Supuesto).'} );
        }

    if (!kinds.has( 'perdida' )) {
        checks.push( {level: 'warning', message: 'La memoria no tiene semántica perdida escrita por el alumno; solo la que DataBasic detecta.'} );
        }

    return checks;
    }

/** The practice allows VARCHAR, CHAR, NUMBER and DATE only. */
function typeChecks( model ) {
    const outside = model.tables.flatMap(
            table => table.columns
                .filter( column => !validCourseType( column.type ) )
                .map( column => `${table.name}.${column.name} (${column.type})` )
            );

    return outside.length
        ? [{level: 'warning', message: `La práctica solo admite VARCHAR, CHAR, NUMBER y DATE; revisa ${outside.slice( 0, 5 ).join( ', ' )}${outside.length > 5 ? '…' : ''}.`}]
        : [];
    }

/** Errors stop a correct delivery; warnings point at what the statement asks for. */
export function deliveryChecklist( model ) {
    const checks = [
        ...authorChecks( model ),
        ...conceptualChecks( model ),
        ...assumptionChecks( model ),
        ...typeChecks( model )
        ];

    if (!model.tables.length) {
        checks.push( {level: 'error', message: 'El modelo relacional no tiene tablas.'} );
        }

    return checks;
    }
