import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    addColumn,
    addRelationship,
    addTable,
    emptyDocument,
    exampleDocument,
    removeColumn,
    removeElement,
    setAlternateKey,
    updateColumn,
    updatePhysicalColumn,
    updatePhysicalRelationship,
    updatePhysicalTable,
    updateRelationship,
    updateTable,
    validateDocument
    } from '../src/domain/model.js';
import {
    parseDocument,
    serializeDocument
    } from '../src/domain/serialization.js';
import {
    accessColumnDefinition,
    accessRelationshipDefinition,
    accessSchema,
    accessStatus
    } from '../src/domain/access.js';
import {
    exportAccessSQL,
    exportAccessVBA,
    exportAccessXML
    } from '../src/io/access.js';
import { unbalancedTag } from './support/xml.js';

/** The USUARIO / TELEFONO / CONTACTO example of the course notes on Access. */
function courseDocument() {
    let model = emptyDocument( 'course' );

    model = addTable( model, 'entity', {x: 100, y: 100} );
    const usuario = model.tables.at( -1 );
    model = updateTable( model, usuario.id, {name: 'USUARIO'} );
    model = addColumn( model, usuario.id );
    model = updateColumn( model, usuario.id, model.tables[0].columns.at( -1 ).id, {name: 'nombre', type: 'VARCHAR(50)', required: true} );
    model = addColumn( model, usuario.id );
    model = updateColumn( model, usuario.id, model.tables[0].columns.at( -1 ).id, {name: 'fechaNac', type: 'DATE'} );

    model = addTable( model, 'entity', {x: 500, y: 100} );
    const telefono = model.tables.at( -1 );
    model = updateTable( model, telefono.id, {name: 'TELEFONO'} );
    model = updateColumn( model, telefono.id, telefono.columns[0].id, {name: 'ord', type: 'NUMBER(2)'} );
    model = addColumn( model, telefono.id );
    model = updateColumn( model, telefono.id, model.tables[1].columns.at( -1 ).id, {name: 'numero', type: 'VARCHAR(15)', required: true} );

    model = addRelationship( model, usuario.id, telefono.id );
    model = updateRelationship( model, model.relationships[0].id, {identifying: true, onDelete: 'CASCADE'} );

    return model;
    }

function table(
        model,
        name
        ) {
    return model.tables.find( item => item.name === name );
    }

function columnOf(
        model,
        tableName,
        columnName
        ) {
    return table( model, tableName ).columns.find( item => item.name === columnName );
    }

test( 'the Access definition of a column is derived from its relational type and constraints', () => {
    const model = courseDocument();
    const usuario = table( model, 'USUARIO' );
    const id = accessColumnDefinition( model, usuario, columnOf( model, 'USUARIO', 'id' ) );
    const nombre = accessColumnDefinition( model, usuario, columnOf( model, 'USUARIO', 'nombre' ) );
    const fecha = accessColumnDefinition( model, usuario, columnOf( model, 'USUARIO', 'fechaNac' ) );
    const ord = accessColumnDefinition( model, table( model, 'TELEFONO' ), columnOf( model, 'TELEFONO', 'ord' ) );

    assert.deepEqual(
            [id.accessType, id.fieldSize, id.required, id.indexed, id.primary],
            ['Número', 'Entero largo', true, 'unique', true]
            );
    assert.deepEqual(
            [nombre.accessType, nombre.fieldSize, nombre.required, nombre.allowZeroLength, nombre.indexed],
            ['Texto corto', 50, true, false, 'no']
            );
    assert.deepEqual( [fecha.accessType, fecha.fieldSize, fecha.required], ['Fecha/Hora', null, false] );
    assert.deepEqual( [ord.accessType, ord.fieldSize, ord.primary], ['Número', 'Entero', true] );
    assert.deepEqual( nombre.overridden, [] );
    } );

test( 'types without an exact Access equivalent are mapped and reported', () => {
    let model = emptyDocument( 'general' );

    model = addTable( model, 'entity', {x: 100, y: 100} );
    const entity = model.tables[0];
    const expectations = [
        ['NUMBER(10,2)', 'Número', 'Doble', 2],
        ['NUMBER(12)', 'Número', 'Doble', null],
        ['BIGINT', 'Número', 'Doble', null],
        ['SMALLINT', 'Número', 'Entero', null],
        ['VARCHAR(300)', 'Texto largo', null, null],
        ['BOOLEAN', 'Sí/No', null, null],
        ['TEXT', 'Texto largo', null, null],
        ['UUID', 'Texto corto', 36, null]
        ];

    for (const [type] of expectations) {
        model = addColumn( model, entity.id );
        model = updateColumn( model, entity.id, model.tables[0].columns.at( -1 ).id, {name: `c_${type.replace( /\W/g, '' )}`, type} );
        }

    const definitions = model.tables[0].columns.slice( 1 ).map(
            column => accessColumnDefinition( model, model.tables[0], column )
            );

    assert.deepEqual(
            definitions.map( item => [item.accessType, item.fieldSize, item.decimalPlaces] ),
            expectations.map( ([, accessType, size, decimals]) => [accessType, size, decimals] )
            );

    const messages = accessStatus( model ).map( issue => issue.message );

    assert.ok( messages.some( message => message.includes( 'BIGINT' ) ) );
    assert.ok( messages.some( message => message.includes( '255 caracteres' ) ) );
    assert.ok( messages.some( message => message.includes( 'más de 9 dígitos' ) ) );
    } );

test( 'domains become field validation rules with a message and CHECK text goes to the table rule', () => {
    let model = courseDocument();
    const telefono = table( model, 'TELEFONO' );
    const ord = columnOf( model, 'TELEFONO', 'ord' );

    model = updateColumn( model, telefono.id, ord.id, {domain: {minimum: 1, maximum: 9, values: [], check: ''}} );
    model = updateColumn( model, telefono.id, columnOf( model, 'TELEFONO', 'numero' ).id, {
        domain: {minimum: null, maximum: null, values: ['fijo', 'móvil'], check: 'numero <> "0"'}
        } );

    const schema = accessSchema( model );
    const definition = schema.tables.find( item => item.name === 'TELEFONO' );
    const [ordField, numeroField] = ['ord', 'numero'].map( name => definition.fields.find( field => field.name === name ) );

    assert.equal( ordField.validationRule, '>=1 And <=9' );
    assert.equal( ordField.validationText, 'El valor debe ser entre 1 y 9.' );
    assert.equal( numeroField.validationRule, 'In ("fijo", "móvil")' );
    assert.equal( definition.validationRule, '(numero <> "0")' );
    assert.ok( schema.issues.some( issue => issue.message.includes( 'regla de validación de tabla' ) ) );
    } );

test( 'SQL default literals become Access expressions', () => {
    let model = courseDocument();
    const usuario = table( model, 'USUARIO' );
    const cases = [["'Sevilla'", '"Sevilla"'], ['CURRENT_DATE', 'Date()'], ['now()', 'Now()'], ['TRUE', 'True'], ['0', '0'], ['NULL', '']];

    for (const [sql] of cases) {
        model = addColumn( model, usuario.id );
        model = updateColumn( model, usuario.id, model.tables[0].columns.at( -1 ).id, {
            name: `d_${model.tables[0].columns.length}`, type: 'VARCHAR(20)', defaultValue: sql
            } );
        }

    const fields = accessSchema( model ).tables[0].fields.slice( -cases.length );

    assert.deepEqual( fields.map( field => field.defaultValue ), cases.map( ([, access]) => access ) );
    } );

test( 'a relationship derives integrity, cascades and a lookup that shows the first text column', () => {
    const model = courseDocument();
    const relation = accessRelationshipDefinition( model, model.relationships[0] );

    assert.deepEqual(
            [relation.enforce, relation.cascadeUpdate, relation.cascadeDelete, relation.oneToOne, relation.lookup],
            [true, false, true, false, true]
            );
    assert.equal( relation.displayColumn, 'nombre' );
    assert.equal( relation.hideKey, true );
    assert.deepEqual( relation.pairs, [{parentColumn: 'id', childColumn: 'id'}] );
    } );

test( 'what Access cannot express is reported: SET NULL, composite keys and views', () => {
    let model = exampleDocument();
    const [first] = model.relationships;

    model = updateRelationship( model, first.id, {optional: true, onDelete: 'SET NULL'} );
    model = addTable( model, 'view', {x: 100, y: 500} );
    model = updateTable( model, model.tables.at( -1 ).id, {name: 'Vista', definition: 'SELECT * FROM Socio'} );

    const messages = accessStatus( model ).map( issue => issue.message );

    assert.ok( messages.some( message => message.includes( 'SET NULL' ) && message.includes( 'restringida' ) ) );
    assert.ok( messages.some( message => message.includes( 'consulta guardada' ) ) );

    const telefono = courseDocument();
    let composite = addTable( telefono, 'entity', {x: 900, y: 100} );

    composite = updateTable( composite, composite.tables.at( -1 ).id, {name: 'CONTACTO'} );
    composite = addRelationship( composite, table( composite, 'TELEFONO' ).id, composite.tables.at( -1 ).id );

    assert.ok( accessStatus( composite ).some( issue => issue.message.includes( 'clave ajena compuesta' ) ) );
    assert.equal( accessRelationshipDefinition( composite, composite.relationships[1] ).lookup, false );
    } );

test( 'overrides replace single derived properties, null restores them and removals drop them', () => {
    let model = courseDocument();
    const usuario = table( model, 'USUARIO' );
    const id = columnOf( model, 'USUARIO', 'id' );
    const relation = model.relationships[0];

    model = updatePhysicalColumn( model, id.id, {accessType: 'Autonumeración', caption: 'Código'} );
    model = updatePhysicalRelationship( model, relation.id, {cascadeDelete: false, displayColumnId: columnOf( model, 'USUARIO', 'fechaNac' ).id} );
    model = updatePhysicalTable( model, usuario.id, {description: 'Usuarios del sistema'} );

    const column = accessColumnDefinition( model, usuario, id );
    const link = accessRelationshipDefinition( model, relation );
    const schema = accessSchema( model );

    assert.deepEqual( [column.accessType, column.autonumber, column.caption, column.derived.accessType], ['Autonumeración', true, 'Código', 'Número'] );
    assert.deepEqual( column.overridden, ['accessType', 'caption'] );
    assert.deepEqual( [link.cascadeDelete, link.displayColumn, link.derived.cascadeDelete], [false, 'fechaNac', true] );
    assert.equal( schema.tables[0].description, 'Usuarios del sistema' );

    assert.throws( () => updatePhysicalColumn( model, id.id, {accessType: 'Texto'} ), /tipo de datos físico/ );
    assert.throws( () => updatePhysicalColumn( model, id.id, {fieldSize: 300} ), /tamaño de campo/ );
    assert.throws( () => updatePhysicalColumn( model, id.id, {indexed: 'maybe'} ), /indexado/ );
    assert.throws( () => updatePhysicalColumn( model, 'missing', {caption: 'x'} ), /Columna no encontrada/ );
    assert.throws( () => updatePhysicalRelationship( model, relation.id, {displayColumnId: columnOf( model, 'TELEFONO', 'ord' ).id} ), /tabla referenciada/ );

    model = updatePhysicalColumn( model, id.id, {accessType: null, caption: null} );
    assert.equal( model.physical.columns[id.id], undefined );

    const fecha = columnOf( model, 'USUARIO', 'fechaNac' );

    model = removeColumn( model, usuario.id, fecha.id );
    assert.equal( model.physical.relationships[relation.id].displayColumnId, undefined );
    assert.equal( accessRelationshipDefinition( model, relation ).displayColumn, 'nombre' );

    model = removeElement( model, relation.id );
    assert.deepEqual( model.physical.relationships, {} );
    } );

test( 'the physical layer survives save and open, and older files open without it', () => {
    let model = courseDocument();
    const id = columnOf( model, 'USUARIO', 'id' );

    model = updatePhysicalColumn( model, id.id, {accessType: 'Autonumeración'} );

    const reopened = parseDocument( serializeDocument( model ) );

    assert.deepEqual( reopened.physical.columns[id.id], {accessType: 'Autonumeración'} );

    const older = structuredClone( reopened );

    delete older.physical;
    assert.deepEqual( validateDocument( older ).filter( issue => issue.level === 'error' ), [] );
    assert.equal( accessColumnDefinition( older, older.tables[0], older.tables[0].columns[0] ).accessType, 'Número' );

    const broken = structuredClone( reopened );

    broken.physical.columns.ghost = {caption: 'x'};
    assert.throws( () => parseDocument( JSON.stringify( broken ) ), /columna inexistente/ );

    const malformed = structuredClone( reopened );

    malformed.physical.columns[id.id] = {accessType: 'Lo que sea'};
    assert.throws( () => parseDocument( JSON.stringify( malformed ) ), /tipo de datos físico/ );
    } );

test( 'the VBA module builds tables, keys, relationships and lookups with DAO', () => {
    let model = courseDocument();
    const id = columnOf( model, 'USUARIO', 'id' );

    model = updatePhysicalColumn( model, id.id, {accessType: 'Autonumeración'} );
    model = updatePhysicalColumn( model, columnOf( model, 'USUARIO', 'nombre' ).id, {caption: 'Nombre "completo"'} );
    model = setAlternateKey( model, table( model, 'USUARIO' ).id, {name: 'AK_nombre', columns: [columnOf( model, 'USUARIO', 'nombre' ).id]} );

    const vba = exportAccessVBA( model );

    assert.match( vba, /^Attribute VB_Name = "DataBasic_Esquema"\nOption Compare Database\nOption Explicit\n/ );
    assert.match( vba, /Public Sub CrearEsquema\(\)[\s\S]*CrearTabla_USUARIO db\n    CrearTabla_TELEFONO db\n    CrearRelaciones db/ );
    assert.match( vba, /Set fld = tdf\.CreateField\("id", dbLong\)\n    fld\.Attributes = fld\.Attributes Or dbAutoIncrField\n    tdf\.Fields\.Append fld/ );
    assert.match( vba, /Set fld = tdf\.CreateField\("nombre", dbText, 50\)\n    fld\.Required = True\n    fld\.AllowZeroLength = False/ );
    assert.match( vba, /CreateField\("fechaNac", dbDate\)/ );
    assert.match( vba, /CreateField\("ord", dbInteger\)/ );
    assert.match( vba, /Set idx = tdf\.CreateIndex\("PrimaryKey"\)\n    idx\.Fields\.Append idx\.CreateField\("ord"\)\n    idx\.Fields\.Append idx\.CreateField\("id"\)\n    idx\.Primary = True/ );
    assert.match( vba, /CreateIndex\("AK_nombre"\)[\s\S]*?idx\.Unique = True/ );
    assert.match( vba, /EstablecerPropiedad tdf\.Fields\("nombre"\), "Caption", dbText, "Nombre ""completo"""/ );
    assert.match( vba, /EstablecerPropiedad tdf\.Fields\("id"\), "DisplayControl", dbInteger, 111/ );
    assert.match( vba, /"RowSource", dbText, "SELECT \[id\], \[nombre\] FROM \[USUARIO\] ORDER BY \[nombre\];"/ );
    assert.match( vba, /Set rel = db\.CreateRelation\("FK_TELEFONO_USUARIO", "USUARIO", "TELEFONO", dbRelationDeleteCascade\)\n    Set fld = rel\.CreateField\("id"\)\n    fld\.ForeignName = "id"\n    rel\.Fields\.Append fld\n    db\.Relations\.Append rel/ );
    assert.match( vba, /Private Sub EstablecerPropiedad\(objeto As Object/ );
    assert.equal( exportAccessVBA( model ), vba, 'deterministic' );
    } );

test( 'the Access SQL script writes one statement per block and lists what design view must set', () => {
    let model = courseDocument();

    model = updateColumn( model, table( model, 'TELEFONO' ).id, columnOf( model, 'TELEFONO', 'ord' ).id, {
        domain: {minimum: 1, maximum: null, values: [], check: ''}
        } );
    model = updateRelationship( model, model.relationships[0].id, {cardinality: 'zero-one', onUpdate: 'CASCADE'} );

    const sql = exportAccessSQL( model );

    assert.match( sql, /^DataBasic · SQL de «Modelo de base de datos» para Microsoft Access\n=+\n/ );
    assert.match( sql, /CREATE TABLE \[USUARIO\] \(\n    \[id\] LONG NOT NULL,\n    \[nombre\] TEXT\(50\) NOT NULL,\n    \[fechaNac\] DATETIME,\n    CONSTRAINT \[PK_USUARIO\] PRIMARY KEY \(\[id\]\)\n\);/ );
    assert.match( sql, /CONSTRAINT \[PK_TELEFONO\] PRIMARY KEY \(\[ord\], \[id\]\)/ );
    assert.match( sql, /CREATE UNIQUE INDEX \[FK_TELEFONO_USUARIO_unico\] ON \[TELEFONO\] \(\[id\]\);/ );
    assert.match( sql, /ALTER TABLE \[TELEFONO\]\n    ADD CONSTRAINT \[FK_TELEFONO_USUARIO\]\n    FOREIGN KEY \(\[id\]\)\n    REFERENCES \[USUARIO\] \(\[id\]\) ON UPDATE CASCADE ON DELETE CASCADE;/ );
    assert.match( sql, /Por establecer en la vista Diseño de cada tabla:\n  TELEFONO\.ord: Regla de validación «>=1»; Texto de validación «El valor debe ser mayor o igual que 1\.»/ );
    assert.match( sql, /TELEFONO\.id: Asistente para búsquedas sobre USUARIO, mostrando nombre/ );
    } );

test( 'the XML file embeds a schema with Access types, keys and field properties', () => {
    let model = courseDocument();

    model = updatePhysicalColumn( model, columnOf( model, 'USUARIO', 'id' ).id, {accessType: 'Autonumeración'} );
    model = updateTable( model, table( model, 'USUARIO' ).id, {name: 'Usuario & Co'} );

    const xml = exportAccessXML( model );

    assert.equal( unbalancedTag( xml ), null );
    assert.match( xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<!-- DataBasic/ );
    assert.ok( xml.includes( '<root xmlns:od="urn:schemas-microsoft-com:officedata" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><xsd:schema>' ) );
    assert.ok( xml.includes( '<xsd:element ref="Usuario_x0020__x0026__x0020_Co" minOccurs="0" maxOccurs="unbounded"/>' ) );
    assert.ok( xml.includes( '<od:index index-name="PrimaryKey" index-key="id " primary="yes" unique="yes" clustered="no" order="asc"/>' ) );
    assert.ok( xml.includes( 'index-key="ord id "' ) );
    assert.ok( xml.includes( '<xsd:element name="id" minOccurs="1" od:jetType="autonumber" od:sqlSType="int" od:autoUnique="yes" od:nonNullable="yes" type="xsd:int">' ) );
    assert.ok( xml.includes( '<xsd:element name="nombre" minOccurs="1" od:jetType="text" od:sqlSType="nvarchar" od:nonNullable="yes"><xsd:annotation><xsd:appinfo><od:fieldProperty name="Required" type="1" value="1"/><od:fieldProperty name="AllowZeroLength" type="1" value="0"/></xsd:appinfo></xsd:annotation><xsd:simpleType><xsd:restriction base="xsd:string"><xsd:maxLength value="50"/></xsd:restriction></xsd:simpleType></xsd:element>' ) );
    assert.ok( xml.includes( 'od:jetType="datetime"' ) );
    assert.ok( xml.includes( 'od:jetType="integer" od:sqlSType="smallint"' ) );
    assert.ok( xml.includes( '<dataroot xmlns:od="urn:schemas-microsoft-com:officedata"></dataroot></root>' ) );
    } );

test( 'the Access exports refuse documents with errors or pending conceptual decisions', () => {
    const model = structuredClone( courseDocument() );

    model.tables[0].name = '';

    for (const exporter of [exportAccessVBA, exportAccessSQL, exportAccessXML]) {
        assert.throws( () => exporter( model ), /nombre físico único/ );
        }

    const empty = addTable( courseDocument(), 'entity', {x: 900, y: 400} );

    empty.tables.at( -1 ).columns = [];
    assert.throws( () => exportAccessVBA( empty ), /al menos una columna/ );
    } );
