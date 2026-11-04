import test from 'node:test';
import assert from 'node:assert/strict';
import * as domain from '../src/domain/model.js';
import {
    parseDocument,
    serializeDocument
    } from '../src/domain/serialization.js';
import {
    buildDesignReport,
    reportToHTML,
    reportToMarkdown
    } from '../src/io/report.js';

function assumptionsFixture() {
    let model = domain.addConceptualEntity( domain.emptyDocument( 'course' ), {name: 'Persona'} );

    model = domain.addConceptualEntity( model, {name: 'Vivienda'} );

    const [persona, vivienda] = model.conceptual.entities.map( entity => entity.id );

    model = domain.addConceptualRelationship( model, {
        name: 'Habita',
        participations: [
            {entityId: persona, role: 'habitante', min: 1, max: 1},
            {entityId: vivienda, role: 'hogar', min: 0, max: null}
            ],
        translation: null
        } );

    return model;
    }

test( 'Los supuestos se añaden, editan y eliminan sin mutar el documento anterior', () => {
    const model = assumptionsFixture();
    const persona = model.conceptual.entities[0].id;
    const before = JSON.stringify( model );
    const added = domain.addAssumption( model, {
        kind: 'enunciado',
        text: '  Cada persona habita en una sola vivienda.  ',
        elementId: persona
        } );

    assert.equal( JSON.stringify( model ), before );
    assert.equal( added.assumptions.length, 1 );
    assert.equal( added.assumptions[0].text, 'Cada persona habita en una sola vivienda.' );
    assert.equal( added.assumptions[0].elementId, persona );
    assert.deepEqual( domain.validateDocument( added ).filter( issue => issue.level === 'error' ), [] );

    const global = domain.addAssumption( added, {text: 'Suponemos un único municipio.'} );

    assert.equal( global.assumptions[1].kind, 'supuesto', 'la clase por defecto es supuesto' );
    assert.equal( global.assumptions[1].elementId, null );

    const edited = domain.updateAssumption( global, global.assumptions[1].id, {
        kind: 'perdida',
        elementId: model.conceptual.relationships[0].id
        } );

    assert.equal( edited.assumptions[1].kind, 'perdida' );
    assert.equal( edited.assumptions[1].text, 'Suponemos un único municipio.' );
    assert.equal( global.assumptions[1].kind, 'supuesto', 'el documento anterior no cambia' );

    const removed = domain.removeAssumption( edited, edited.assumptions[0].id );

    assert.equal( removed.assumptions.length, 1 );
    assert.deepEqual( parseDocument( serializeDocument( removed ) ), removed );
    } );

test( 'Un supuesto exige clase válida, texto y un elemento existente', () => {
    const model = assumptionsFixture();

    assert.throws( () => domain.addAssumption( model, {kind: 'duda', text: 'x'} ), /enunciado, supuesto o perdida/ );
    assert.throws( () => domain.addAssumption( model, {text: '   '} ), /Escribe el texto/ );
    assert.throws( () => domain.addAssumption( model, {text: 'x'.repeat( 2001 )} ), /2000/ );
    assert.throws( () => domain.addAssumption( model, {text: 'ok', elementId: 'inexistente'} ), /ya no existe/ );
    assert.throws( () => domain.updateAssumption( model, 'nadie', {text: 'ok'} ), /ya no existe/ );
    assert.throws( () => domain.removeAssumption( model, 'nadie' ), /ya no existe/ );
    assert.equal( domain.documentAssumptions( model ).length, 0 );

    const broken = JSON.parse( serializeDocument( domain.addAssumption( model, {text: 'ok'} ) ) );

    broken.assumptions[0].elementId = 'fantasma';
    assert.throws( () => parseDocument( JSON.stringify( broken ) ), /elemento inexistente/ );
    broken.assumptions[0].elementId = null;
    broken.assumptions[0].kind = 'otra';
    assert.throws( () => parseDocument( JSON.stringify( broken ) ), /clase debe ser/ );
    } );

test( 'Un formato 2 anterior sin supuestos abre y las etiquetas nombran cada elemento', () => {
    const legacy = JSON.parse( serializeDocument( assumptionsFixture() ) );

    delete legacy.assumptions;

    const opened = parseDocument( JSON.stringify( legacy ) );

    assert.equal( opened.assumptions, undefined );
    assert.deepEqual( domain.documentAssumptions( opened ), [] );

    const relation = opened.conceptual.relationships[0];
    const attribute = opened.conceptual.attributes[0];

    assert.equal( domain.elementLabel( opened, opened.conceptual.entities[0].id ), 'Entidad Persona' );
    assert.equal( domain.elementLabel( opened, relation.id ), 'Relación Habita' );
    assert.equal( domain.elementLabel( opened, relation.participations[1].id ), 'Participación Habita · hogar' );
    assert.equal( domain.elementLabel( opened, attribute.id ), 'Atributo id' );
    assert.equal( domain.elementLabel( opened, opened.tables[0].columns[0].id ), 'Columna Persona.id' );
    assert.equal( domain.elementLabel( opened, 'nadie' ), null );
    } );

test( 'Borrar el elemento de un supuesto conserva el texto como supuesto global', () => {
    let model = assumptionsFixture();
    const vivienda = model.conceptual.entities[1].id;
    const attribute = model.conceptual.attributes.find( item => item.ownerId === vivienda );

    model = domain.addAssumption( model, {
        kind: 'supuesto',
        text: 'El identificador es la referencia catastral.',
        elementId: attribute.id
        } );
    model = domain.removeConceptualElement( model, attribute.id );

    assert.equal( model.assumptions.length, 1 );
    assert.equal( model.assumptions[0].elementId, null );
    assert.deepEqual( domain.validateDocument( model ).filter( issue => issue.level === 'error' ), [] );

    let relational = domain.addTable( domain.emptyDocument( 'course' ) );
    const column = relational.tables[0].columns[0];

    relational = domain.addAssumption( relational, {text: 'La clave es un código interno.', elementId: column.id} );
    relational = domain.removeElement( relational, relational.tables[0].id );
    assert.equal( relational.assumptions[0].elementId, null );
    } );

test( 'La memoria reúne entidades, relaciones con letras, supuestos y semántica perdida', () => {
    let model = assumptionsFixture();
    const persona = model.conceptual.entities[0].id;

    model = domain.addAssumption( model, {kind: 'enunciado', text: 'Una persona | vive en una casa <b>.', elementId: persona} );
    model = domain.addAssumption( model, {kind: 'supuesto', text: 'Suponemos un único municipio.'} );
    model = domain.addAssumption( model, {kind: 'perdida', text: 'No se exige que toda vivienda esté habitada.'} );

    const report = buildDesignReport( model );
    const headings = report.sections.map( section => section.heading );

    assert.deepEqual( headings, [
        'Entidades y atributos',
        'Relaciones',
        'Especializaciones',
        'Semántica reflejada del enunciado',
        'Supuestos semánticos',
        'Semántica perdida',
        'Esquema relacional resultante',
        'Diseño físico en Access',
        'Datos de ejemplo'
        ] );

    const relationTable = report.sections[1].blocks.find( block => block.kind === 'table' );

    assert.deepEqual( relationTable.header, ['Entidad', 'Rol', 'Participación (mín,máx)', 'Cardinalidad'] );
    assert.deepEqual( relationTable.rows, [
        ['Persona', 'habitante', '(1,1)', 'N'],
        ['Vivienda', 'hogar', '(0,N)', '1']
        ] );
    assert.match( report.sections[1].blocks[0].text, /Habita — relación binaria/ );
    assert.match( report.sections[1].blocks.at( -1 ).text, /pendiente/ );
    assert.deepEqual( report.sections[3].blocks[0].items, ['Una persona | vive en una casa <b>. (Entidad Persona)'] );
    assert.deepEqual( report.sections[4].blocks[0].items, ['Suponemos un único municipio.'] );

    const lost = report.sections[5].blocks.flatMap( block => block.items || [] );

    assert.ok( lost.includes( 'No se exige que toda vivienda esté habitada.' ) );
    assert.ok( lost.some( item => item.includes( 'participación (1,1) conservada' ) ), 'avisos documentales' );
    assert.ok( lost.some( item => item.includes( 'pendiente de estrategia' ) ), 'decisiones pendientes' );
    assert.equal( JSON.stringify( buildDesignReport( model ) ), JSON.stringify( report ), 'informe determinista' );

    const markdown = reportToMarkdown( report );

    assert.match( markdown, /^# Memoria del diseño: Modelo de base de datos/ );
    assert.match( markdown, /\| Persona \| habitante \| \(1,1\) \| N \|/ );
    assert.match( markdown, /Una persona \\\| vive en una casa <b>\./, 'la barra se escapa en Markdown' );

    const html = reportToHTML( report, [{title: 'Diagrama <ERE>', svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>'}] );

    assert.match( html, /<figure><svg[^>]*><\/svg><figcaption>Diagrama &lt;ERE&gt;<\/figcaption><\/figure>/ );
    assert.match( html, /&lt;b&gt;/, 'el texto se escapa en HTML' );
    assert.doesNotMatch( html, /<b>\./ );
    assert.match( html, /<th>Cardinalidad<\/th>/ );
    assert.match( html, /<h2>Semántica perdida<\/h2>/ );
    } );

test( 'La memoria del ejemplo y de un documento vacío se generan sin errores', () => {
    const example = buildDesignReport( domain.exampleDocument() );

    assert.ok( reportToMarkdown( example ).includes( 'Socio' ) );
    assert.match( reportToMarkdown( example ), /Prestamo → Socio: 0\.\.N, referencia obligatoria/ );

    const empty = buildDesignReport( domain.emptyDocument() );

    assert.match( reportToMarkdown( empty ), /todavía no tiene entidades/ );
    assert.doesNotThrow( () => reportToHTML( empty ) );
    } );
