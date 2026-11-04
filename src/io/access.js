import {
    accessSchema,
    requireExportableForAccess
    } from '../domain/access.js';

/*
 * Three ways to carry the physical layer into Microsoft Access, all read from
 * the same schema (domain/access.js):
 *
 *   - a VBA module with DAO that builds the whole database: tables, fields and
 *     their properties, keys, indexes, relationships with integrity and
 *     cascades, lookup fields and saved queries for the views;
 *   - an Access SQL script, one statement per query, for the SQL view;
 *   - an XML file with an embedded schema for Datos externos → Archivo XML,
 *     which creates the tables but not the relationships.
 *
 * Access cannot be driven from the browser, so each file is an input the
 * student runs; the header of each one says how.
 */

/* ---------- VBA module with DAO ---------- */

const VBA_MODULE_NAME = 'DataBasic_Esquema';

const VBA_TYPES = {
    'Texto corto': {constant: 'dbText', sized: true},
    'Texto largo': {constant: 'dbMemo'},
    'Fecha/Hora': {constant: 'dbDate'},
    'Moneda': {constant: 'dbCurrency'},
    'Autonumeración': {constant: 'dbLong', attribute: 'dbAutoIncrField'},
    'Sí/No': {constant: 'dbBoolean'},
    'Objeto OLE': {constant: 'dbLongBinary'},
    'Hipervínculo': {constant: 'dbMemo', attribute: 'dbHyperlinkField'}
    };

const VBA_NUMBER_SIZES = {
    'Byte': 'dbByte',
    'Entero': 'dbInteger',
    'Entero largo': 'dbLong',
    'Simple': 'dbSingle',
    'Doble': 'dbDouble',
    'Decimal': 'dbDecimal'
    };

/** A .bas module: import it in the VBA editor of a blank database and run CrearEsquema. */
export function exportAccessVBA( model ) {
    requireExportableForAccess( model );

    const schema = accessSchema( model );
    const subNames = vbaSubNames( schema.tables );
    const sections = [
        vbaHeader( schema ),
        vbaMain( schema, subNames ),
        vbaBlankCheck( schema ),
        ...schema.tables.map( table => vbaTableSub( schema, table, subNames.get( table.tableId ) ) ),
        vbaRelationsSub( schema ),
        vbaQueriesSub( schema ),
        vbaPropertyHelper()
        ];

    return `${sections.join( '\n\n' )}\n`;
    }

function vbaHeader( schema ) {
    const lines = [
        `Attribute VB_Name = "${VBA_MODULE_NAME}"`,
        'Option Compare Database',
        'Option Explicit',
        '',
        `' ===== DataBasic · esquema de «${schema.name}» para Microsoft Access (DAO) =====`,
        "' Cómo usarlo:",
        "'   1. Abre Access y crea una base de datos en blanco.",
        "'   2. Pulsa Alt+F11 y usa Archivo → Importar archivo para traer este módulo.",
        "'      (Si prefieres pegar el texto en un módulo nuevo, borra antes la primera línea «Attribute VB_Name».)",
        "'   3. Sitúa el cursor dentro de CrearEsquema y pulsa F5. Acepta habilitar el contenido si Access lo pide.",
        "'   4. Revisa Herramientas de base de datos → Relaciones.",
        `'   Crea ${schema.tables.length} tablas, ${schema.relationships.length} relaciones y ${schema.views.length} consultas.`
        ];

    if (schema.issues.length) {
        lines.push( "' Avisos de DataBasic (lo que Access expresa de otra manera):" );
        lines.push( ...schema.issues.map( issue => `'   - ${vbaComment( issue.message )}` ) );
        }

    return lines.join( '\n' );
    }

function vbaMain(
        schema,
        subNames
        ) {
    const calls = schema.tables.map( table => `    ${subNames.get( table.tableId )} db` );

    return [
        'Public Sub CrearEsquema()',
        '    Dim db As DAO.Database',
        '',
        '    Set db = CurrentDb',
        '    If Not BaseEnBlanco(db) Then Exit Sub',
        ...calls,
        '    CrearRelaciones db',
        '    CrearConsultas db',
        '    Application.RefreshDatabaseWindow',
        `    MsgBox ${vbaString( `DataBasic: ${schema.tables.length} tablas, ${schema.relationships.length} relaciones y ${schema.views.length} consultas creadas. Revisa Herramientas de base de datos → Relaciones.` )}, vbInformation, "DataBasic"`,
        'End Sub'
        ].join( '\n' );
    }

/** Refuses to run twice: the student is told to use a blank database. */
function vbaBlankCheck( schema ) {
    const cases = schema.tables.map( table => `        Case ${vbaString( table.name )}: TablaDelEsquema = True` );

    return [
        'Private Function BaseEnBlanco(db As DAO.Database) As Boolean',
        '    Dim tdf As DAO.TableDef',
        '',
        '    For Each tdf In db.TableDefs',
        '        If TablaDelEsquema(tdf.Name) Then',
        '            MsgBox "Ya existe la tabla " & tdf.Name & ". Ejecuta el módulo en una base de datos en blanco.", vbExclamation, "DataBasic"',
        '            Exit Function',
        '        End If',
        '    Next tdf',
        '    BaseEnBlanco = True',
        'End Function',
        '',
        'Private Function TablaDelEsquema(nombre As String) As Boolean',
        '    Select Case nombre',
        ...cases,
        '    End Select',
        'End Function'
        ].join( '\n' );
    }

function vbaTableSub(
        schema,
        table,
        subName
        ) {
    const lines = [
        `Private Sub ${subName}(db As DAO.Database)`,
        '    Dim tdf As DAO.TableDef',
        '    Dim fld As DAO.Field',
        '    Dim idx As DAO.Index',
        '',
        `    Set tdf = db.CreateTableDef(${vbaString( table.name )})`
        ];

    for (const field of table.fields) {
        lines.push( '', ...vbaFieldLines( field ) );
        }

    if (table.validationRule) {
        lines.push( '', `    tdf.ValidationRule = ${vbaString( table.validationRule )}` );

        if (table.validationText) {
            lines.push( `    tdf.ValidationText = ${vbaString( table.validationText )}` );
            }
        }

    lines.push( '', '    db.TableDefs.Append tdf' );

    if (table.primaryKey.length) {
        lines.push( '', ...vbaIndexLines( 'PrimaryKey', table.primaryKey, true, true ) );
        }

    for (const index of table.indexes) {
        lines.push( '', ...vbaIndexLines( index.name, index.columns, index.unique, false ) );
        }

    for (const relation of schema.relationships.filter( item => item.childTableId === table.tableId && item.oneToOne )) {
        lines.push( '', ...vbaIndexLines(
                `${relation.name}_unico`,
                relation.pairs.map( pair => pair.childColumn ),
                true,
                false
                ) );
        }

    lines.push( ...vbaTablePropertyLines( table ) );

    for (const field of table.fields) {
        lines.push( ...vbaFieldPropertyLines( field ) );
        }

    for (const relation of schema.relationships.filter( item => item.childTableId === table.tableId && item.lookup )) {
        lines.push( '', ...vbaLookupLines( relation ) );
        }

    lines.push( 'End Sub' );
    return lines.join( '\n' );
    }

function vbaFieldLines( field ) {
    const type = vbaFieldType( field );
    const summary = [
        field.accessType + (type.size ? ` (${type.size})` : ''),
        field.accessType === 'Número' ? field.fieldSize : null,
        field.required && !field.autonumber ? 'requerido' : null,
        field.primary ? 'PK' : null,
        field.foreignKey ? 'FK' : null
        ].filter( Boolean ).join( ' · ' );
    const lines = [
        `    ' ${vbaComment( field.name )} · ${vbaComment( summary )}`,
        `    Set fld = tdf.CreateField(${vbaString( field.name )}, ${type.constant}${type.size ? `, ${type.size}` : ''})`
        ];

    if (type.attribute) {
        lines.push( `    fld.Attributes = fld.Attributes Or ${type.attribute}` );
        }

    if (field.required && !field.autonumber) {
        lines.push( '    fld.Required = True' );
        }

    if (['Texto corto', 'Texto largo', 'Hipervínculo'].includes( field.accessType )) {
        lines.push( `    fld.AllowZeroLength = ${field.allowZeroLength ? 'True' : 'False'}` );
        }

    if (field.validationRule) {
        lines.push( `    fld.ValidationRule = ${vbaString( field.validationRule )}` );

        if (field.validationText) {
            lines.push( `    fld.ValidationText = ${vbaString( field.validationText )}` );
            }
        }

    if (field.defaultValue) {
        lines.push( `    fld.DefaultValue = ${vbaString( field.defaultValue )}` );
        }

    lines.push( '    tdf.Fields.Append fld' );
    return lines;
    }

function vbaFieldType( field ) {
    if (field.accessType === 'Número') {
        return {constant: VBA_NUMBER_SIZES[field.fieldSize] || 'dbLong', size: null, attribute: null};
        }

    const type = VBA_TYPES[field.accessType] || VBA_TYPES['Texto corto'];

    return {
        constant: type.constant,
        size: type.sized ? (Number.isInteger( field.fieldSize ) ? field.fieldSize : 255) : null,
        attribute: type.attribute || null
        };
    }

function vbaIndexLines(
        name,
        columns,
        unique,
        primary
        ) {
    return [
        `    Set idx = tdf.CreateIndex(${vbaString( name )})`,
        ...columns.map( column => `    idx.Fields.Append idx.CreateField(${vbaString( column )})` ),
        ...(primary ? ['    idx.Primary = True'] : []),
        `    idx.Unique = ${unique ? 'True' : 'False'}`,
        '    tdf.Indexes.Append idx'
        ];
    }

function vbaTablePropertyLines( table ) {
    return table.description
        ? ['', `    EstablecerPropiedad tdf, "Description", dbText, ${vbaString( table.description )}`]
        : [];
    }

/** Caption, Description, Format and DecimalPlaces live in the Properties collection. */
function vbaFieldPropertyLines( field ) {
    const target = `tdf.Fields(${vbaString( field.name )})`;
    const lines = [];

    if (field.caption) {
        lines.push( `    EstablecerPropiedad ${target}, "Caption", dbText, ${vbaString( field.caption )}` );
        }

    if (field.description) {
        lines.push( `    EstablecerPropiedad ${target}, "Description", dbText, ${vbaString( field.description )}` );
        }

    if (field.format) {
        lines.push( `    EstablecerPropiedad ${target}, "Format", dbText, ${vbaString( field.format )}` );
        }

    if (field.decimalPlaces !== null && field.decimalPlaces !== undefined) {
        lines.push( `    EstablecerPropiedad ${target}, "DecimalPlaces", dbByte, ${field.decimalPlaces}` );
        }

    return lines.length ? ['', ...lines] : [];
    }

/** The same properties the Asistente para búsquedas sets on a foreign key field. */
function vbaLookupLines( relation ) {
    const pair = relation.pairs[0];
    const target = `tdf.Fields(${vbaString( pair.childColumn )})`;
    const columns = relation.displayColumn
        ? [pair.parentColumn, relation.displayColumn]
        : [pair.parentColumn];
    const widths = relation.displayColumn
        ? (relation.hideKey ? '0;2880' : '1440;2880')
        : '1440';
    const order = relation.displayColumn || pair.parentColumn;
    const select = `SELECT ${columns.map( jetIdentifier ).join( ', ' )} FROM ${jetIdentifier( relation.parentTable )} ORDER BY ${jetIdentifier( order )};`;

    return [
        `    ' Campo de búsqueda: ${vbaComment( pair.childColumn )} muestra ${vbaComment( `${relation.parentTable}.${order}` )}`,
        `    EstablecerPropiedad ${target}, "DisplayControl", dbInteger, 111`,
        `    EstablecerPropiedad ${target}, "RowSourceType", dbText, "Table/Query"`,
        `    EstablecerPropiedad ${target}, "RowSource", dbText, ${vbaString( select )}`,
        `    EstablecerPropiedad ${target}, "BoundColumn", dbInteger, 1`,
        `    EstablecerPropiedad ${target}, "ColumnCount", dbInteger, ${columns.length}`,
        `    EstablecerPropiedad ${target}, "ColumnWidths", dbText, ${vbaString( widths )}`,
        `    EstablecerPropiedad ${target}, "LimitToList", dbBoolean, True`
        ];
    }

function vbaRelationsSub( schema ) {
    const lines = [
        'Private Sub CrearRelaciones(db As DAO.Database)',
        '    Dim rel As DAO.Relation',
        '    Dim fld As DAO.Field'
        ];

    for (const relation of schema.relationships) {
        lines.push( '', ...vbaRelationLines( relation ) );
        }

    lines.push( 'End Sub' );
    return lines.join( '\n' );
    }

function vbaRelationLines( relation ) {
    const attributes = [];

    if (!relation.enforce) {
        attributes.push( 'dbRelationDontEnforce' );
        }
    else {
        if (relation.cascadeUpdate) {
            attributes.push( 'dbRelationUpdateCascade' );
            }

        if (relation.cascadeDelete) {
            attributes.push( 'dbRelationDeleteCascade' );
            }
        }

    const summary = [
        relation.enforce ? 'integridad referencial' : 'sin integridad referencial',
        relation.enforce && relation.cascadeUpdate ? 'actualizar en cascada' : null,
        relation.enforce && relation.cascadeDelete ? 'eliminar en cascada' : 'eliminación restringida',
        relation.oneToOne ? 'uno a uno' : 'uno a varios'
        ].filter( Boolean ).join( ' · ' );
    const lines = [
        `    ' ${vbaComment( relation.parentTable )} (1) → ${vbaComment( relation.childTable )} (${relation.oneToOne ? '1' : '∞'}) · ${vbaComment( summary )}`,
        `    Set rel = db.CreateRelation(${vbaString( relation.name )}, ${vbaString( relation.parentTable )}, ${vbaString( relation.childTable )}, ${attributes.join( ' + ' ) || '0'})`
        ];

    for (const pair of relation.pairs) {
        lines.push(
                `    Set fld = rel.CreateField(${vbaString( pair.parentColumn )})`,
                `    fld.ForeignName = ${vbaString( pair.childColumn )}`,
                '    rel.Fields.Append fld'
                );
        }

    lines.push( '    db.Relations.Append rel' );
    return lines;
    }

function vbaQueriesSub( schema ) {
    const lines = ['Private Sub CrearConsultas(db As DAO.Database)'];

    for (const view of schema.views) {
        lines.push(
                `    ' Vista ${vbaComment( view.name )} como consulta guardada`,
                `    db.CreateQueryDef ${vbaString( view.name )}, ${vbaString( view.definition )}`
                );
        }

    lines.push( 'End Sub' );
    return lines.join( '\n' );
    }

function vbaPropertyHelper() {
    return [
        "' Las propiedades de la vista Diseño (Título, Descripción, Búsqueda...) no existen hasta que se crean.",
        'Private Sub EstablecerPropiedad(objeto As Object, nombre As String, tipo As Integer, valor As Variant)',
        '    On Error GoTo Crear',
        '    objeto.Properties(nombre) = valor',
        '    Exit Sub',
        'Crear:',
        '    objeto.Properties.Append objeto.CreateProperty(nombre, tipo, valor)',
        'End Sub'
        ].join( '\n' );
    }

/** A VBA identifier for each table, unique within the module. */
function vbaSubNames( tables ) {
    const names = new Map();
    const used = new Set();

    for (const table of tables) {
        let base = `CrearTabla_${table.name.normalize( 'NFD' ).replace( /[^A-Za-z0-9_]/g, '_' ).slice( 0, 50 )}`;
        let candidate = base;
        let counter = 2;

        while (used.has( candidate )) {
            candidate = `${base}_${counter}`;
            counter += 1;
            }

        used.add( candidate );
        names.set( table.tableId, candidate );
        }

    return names;
    }

function vbaString( text ) {
    return `"${String( text ).replace( /[\r\n]+/g, ' ' ).replaceAll( '"', '""' )}"`;
    }

function vbaComment( text ) {
    return String( text ).replace( /[\r\n]+/g, ' ' );
    }

/* ---------- Access SQL, one statement per query ---------- */

const JET_TYPES = {
    'Texto largo': 'LONGTEXT',
    'Fecha/Hora': 'DATETIME',
    'Moneda': 'CURRENCY',
    'Autonumeración': 'COUNTER',
    'Sí/No': 'BIT',
    'Objeto OLE': 'LONGBINARY',
    'Hipervínculo': 'LONGTEXT'
    };

const JET_NUMBER_SIZES = {
    'Byte': 'BYTE',
    'Entero': 'SHORT',
    'Entero largo': 'LONG',
    'Simple': 'SINGLE',
    'Doble': 'DOUBLE',
    'Decimal': 'DECIMAL'
    };

/** The statements Access runs one at a time in the SQL view of a query. */
export function exportAccessSQL( model ) {
    requireExportableForAccess( model );

    const schema = accessSchema( model );
    const statements = [
        ...schema.tables.map( jetCreateTable ),
        ...schema.tables.flatMap( jetCreateIndexes ),
        ...schema.relationships.flatMap( jetRelationshipStatements )
        ];

    return [
        jetHeader( schema ),
        ...statements,
        jetDesignViewNotes( schema )
        ].join( '\n\n' ) + '\n';
    }

function jetHeader( schema ) {
    const lines = [
        `DataBasic · SQL de «${schema.name}» para Microsoft Access`,
        '='.repeat( 70 ),
        'Cómo usarlo: Crear → Diseño de consulta, cierra Mostrar tabla y pasa a la Vista SQL.',
        'Pega UNA instrucción cada vez, sin estas líneas de ayuda, y pulsa Ejecutar; sigue el orden del archivo.',
        'Las cláusulas ON UPDATE / ON DELETE CASCADE necesitan la sintaxis ANSI 92 (Archivo → Opciones → Diseñadores de objetos).',
        'Si Access las rechaza, crea la relación sin ellas y marca la cascada en Herramientas de base de datos → Relaciones.',
        'Reglas de validación, valores predeterminados y campos de búsqueda se fijan en la vista Diseño: ver la lista final.'
        ];

    if (schema.issues.length) {
        lines.push( 'Avisos:', ...schema.issues.map( issue => `  - ${issue.message}` ) );
        }

    lines.push( '-'.repeat( 70 ) );
    return lines.join( '\n' );
    }

function jetCreateTable( table ) {
    const lines = table.fields.map(
            field => `    ${jetIdentifier( field.name )} ${jetType( field )}`
                + (field.required ? ' NOT NULL' : '')
            );

    if (table.primaryKey.length) {
        lines.push( `    CONSTRAINT ${jetIdentifier( `PK_${table.name}` )} PRIMARY KEY (${table.primaryKey.map( jetIdentifier ).join( ', ' )})` );
        }

    for (const index of table.indexes.filter( item => item.unique )) {
        lines.push( `    CONSTRAINT ${jetIdentifier( index.name )} UNIQUE (${index.columns.map( jetIdentifier ).join( ', ' )})` );
        }

    return `CREATE TABLE ${jetIdentifier( table.name )} (\n${lines.join( ',\n' )}\n);`;
    }

function jetCreateIndexes( table ) {
    return table.indexes
        .filter( index => !index.unique )
        .map( index => `CREATE INDEX ${jetIdentifier( index.name )} ON ${jetIdentifier( table.name )} (${index.columns.map( jetIdentifier ).join( ', ' )});` );
    }

function jetRelationshipStatements( relation ) {
    const childColumns = relation.pairs.map( pair => jetIdentifier( pair.childColumn ) ).join( ', ' );
    const parentColumns = relation.pairs.map( pair => jetIdentifier( pair.parentColumn ) ).join( ', ' );
    const statements = [];

    if (relation.oneToOne) {
        statements.push( `CREATE UNIQUE INDEX ${jetIdentifier( `${relation.name}_unico` )} ON ${jetIdentifier( relation.childTable )} (${childColumns});` );
        }

    const cascades = relation.enforce
        ? (relation.cascadeUpdate ? ' ON UPDATE CASCADE' : '') + (relation.cascadeDelete ? ' ON DELETE CASCADE' : '')
        : '';

    statements.push(
            `ALTER TABLE ${jetIdentifier( relation.childTable )}\n`
                + `    ADD CONSTRAINT ${jetIdentifier( relation.name )}\n`
                + `    FOREIGN KEY (${childColumns})\n`
                + `    REFERENCES ${jetIdentifier( relation.parentTable )} (${parentColumns})${cascades};`
            );
    return statements;
    }

/** What SQL cannot set in Access: the student does it in the table design view. */
function jetDesignViewNotes( schema ) {
    const lines = ['-'.repeat( 70 ), 'Por establecer en la vista Diseño de cada tabla:'];

    for (const table of schema.tables) {
        for (const field of table.fields) {
            const items = [
                field.validationRule ? `Regla de validación «${field.validationRule}»` : null,
                field.validationText ? `Texto de validación «${field.validationText}»` : null,
                field.defaultValue ? `Valor predeterminado «${field.defaultValue}»` : null,
                field.caption ? `Título «${field.caption}»` : null,
                field.allowZeroLength ? 'Permitir longitud cero: Sí' : null
                ].filter( Boolean );

            if (items.length) {
                lines.push( `  ${table.name}.${field.name}: ${items.join( '; ' )}` );
                }
            }

        if (table.validationRule) {
            lines.push( `  ${table.name}: Regla de validación de tabla «${table.validationRule}»` );
            }
        }

    for (const relation of schema.relationships.filter( item => item.lookup )) {
        lines.push( `  ${relation.childTable}.${relation.pairs[0].childColumn}: Asistente para búsquedas sobre ${relation.parentTable}, mostrando ${relation.displayColumn || relation.pairs[0].parentColumn}` );
        }

    for (const view of schema.views) {
        lines.push( `  Consulta «${view.name}»: crea una consulta nueva, pega este SELECT en la Vista SQL y guárdala con ese nombre:`, `    ${view.definition}` );
        }

    if (lines.length === 2) {
        lines.push( '  (nada pendiente)' );
        }

    return lines.join( '\n' );
    }

function jetType( field ) {
    if (field.accessType === 'Número') {
        const size = JET_NUMBER_SIZES[field.fieldSize] || 'LONG';

        return size === 'DECIMAL' ? `DECIMAL(18, ${field.decimalPlaces ?? 2})` : size;
        }

    if (field.accessType === 'Texto corto') {
        return `TEXT(${Number.isInteger( field.fieldSize ) ? field.fieldSize : 255})`;
        }

    return JET_TYPES[field.accessType] || 'TEXT(255)';
    }

function jetIdentifier( name ) {
    return `[${String( name ).replaceAll( ']', '' )}]`;
    }

/* ---------- XML with an embedded schema ---------- */

const ODX_NAMESPACE = 'urn:schemas-microsoft-com:officedata';

const ODX_TYPES = {
    'Texto corto': {jet: 'text', sql: 'nvarchar', xsd: 'xsd:string', sized: true},
    'Texto largo': {jet: 'memo', sql: 'ntext', xsd: 'xsd:string'},
    'Fecha/Hora': {jet: 'datetime', sql: 'datetime', xsd: 'xsd:dateTime'},
    'Moneda': {jet: 'currency', sql: 'money', xsd: 'xsd:double'},
    'Autonumeración': {jet: 'autonumber', sql: 'int', xsd: 'xsd:int', auto: true},
    'Sí/No': {jet: 'yesno', sql: 'bit', xsd: 'xsd:boolean'},
    'Objeto OLE': {jet: 'oleobject', sql: 'image', xsd: 'xsd:base64Binary'},
    'Hipervínculo': {jet: 'hyperlink', sql: 'ntext', xsd: 'xsd:string'}
    };

const ODX_NUMBER_SIZES = {
    'Byte': {jet: 'byte', sql: 'tinyint', xsd: 'xsd:byte'},
    'Entero': {jet: 'integer', sql: 'smallint', xsd: 'xsd:short'},
    'Entero largo': {jet: 'longinteger', sql: 'int', xsd: 'xsd:int'},
    'Simple': {jet: 'single', sql: 'real', xsd: 'xsd:float'},
    'Doble': {jet: 'double', sql: 'float', xsd: 'xsd:double'},
    'Decimal': {jet: 'decimal', sql: 'decimal', xsd: 'xsd:decimal'}
    };

/** Property types as DAO numbers them: 1 boolean, 2 byte, 3 integer, 10 text. */
const ODX_PROPERTY_TYPES = {boolean: 1, byte: 2, integer: 3, text: 10};

/** Tables with their fields, properties and indexes; Access does not import relationships. */
export function exportAccessXML( model ) {
    requireExportableForAccess( model );

    const schema = accessSchema( model );
    const references = schema.tables.map(
            table => `<xsd:element ref="${odxName( table.name )}" minOccurs="0" maxOccurs="unbounded"/>`
            );

    return `<?xml version="1.0" encoding="UTF-8"?>\n`
        + `<!-- DataBasic · tablas de «${odxComment( schema.name )}» para Access: Datos externos → Nuevo origen de datos → Desde archivo → Archivo XML.`
        + ` Importa con «Estructura y datos» o «Solo estructura». Las relaciones se dibujan después en Herramientas de base de datos → Relaciones.`
        + (schema.issues.length ? ` Avisos: ${schema.issues.map( issue => odxComment( issue.message ) ).join( ' | ' )}` : '')
        + ` -->\n`
        + `<root xmlns:od="${ODX_NAMESPACE}" xmlns:xsd="http://www.w3.org/2001/XMLSchema">`
        + `<xsd:schema>`
        + `<xsd:element name="dataroot"><xsd:complexType><xsd:sequence>${references.join( '' )}</xsd:sequence>`
        + `<xsd:attribute name="generated" type="xsd:dateTime"/></xsd:complexType></xsd:element>`
        + schema.tables.map( odxTable ).join( '' )
        + `</xsd:schema>`
        + `<dataroot xmlns:od="${ODX_NAMESPACE}"/>`
        + `</root>\n`;
    }

function odxTable( table ) {
    const indexes = [];
    const properties = [];

    if (table.primaryKey.length) {
        indexes.push( odxIndex( 'PrimaryKey', table.primaryKey, true, true ) );
        }

    for (const index of table.indexes) {
        indexes.push( odxIndex( index.name, index.columns, index.unique, false ) );
        }

    if (table.description) {
        properties.push( odxProperty( 'tableProperty', 'Description', 'text', table.description ) );
        }

    if (table.validationRule) {
        properties.push( odxProperty( 'tableProperty', 'ValidationRule', 'text', table.validationRule ) );

        if (table.validationText) {
            properties.push( odxProperty( 'tableProperty', 'ValidationText', 'text', table.validationText ) );
            }
        }

    return `<xsd:element name="${odxName( table.name )}">`
        + `<xsd:annotation><xsd:appinfo>${indexes.join( '' )}${properties.join( '' )}</xsd:appinfo></xsd:annotation>`
        + `<xsd:complexType><xsd:sequence>${table.fields.map( odxField ).join( '' )}</xsd:sequence></xsd:complexType>`
        + `</xsd:element>`;
    }

function odxIndex(
        name,
        columns,
        unique,
        primary
        ) {
    const key = columns.map( column => `${odxName( column )} ` ).join( '' );

    return `<od:index index-name="${odxAttribute( name )}" index-key="${key}" primary="${primary ? 'yes' : 'no'}"`
        + ` unique="${unique ? 'yes' : 'no'}" clustered="no" order="asc"/>`;
    }

function odxField( field ) {
    const type = odxFieldType( field );
    const properties = odxFieldProperties( field );
    const attributes = `name="${odxName( field.name )}" minOccurs="${field.required ? 1 : 0}"`
        + ` od:jetType="${type.jet}" od:sqlSType="${type.sql}"`
        + (type.auto ? ' od:autoUnique="yes"' : '')
        + (field.required ? ' od:nonNullable="yes"' : '');
    const annotation = properties.length
        ? `<xsd:annotation><xsd:appinfo>${properties.join( '' )}</xsd:appinfo></xsd:annotation>`
        : '';
    const restriction = type.sized
        ? `<xsd:simpleType><xsd:restriction base="xsd:string"><xsd:maxLength value="${type.size}"/></xsd:restriction></xsd:simpleType>`
        : '';

    return type.sized
        ? `<xsd:element ${attributes}>${annotation}${restriction}</xsd:element>`
        : `<xsd:element ${attributes} type="${type.xsd}">${annotation}</xsd:element>`;
    }

function odxFieldType( field ) {
    if (field.accessType === 'Número') {
        return ODX_NUMBER_SIZES[field.fieldSize] || ODX_NUMBER_SIZES['Entero largo'];
        }

    const type = ODX_TYPES[field.accessType] || ODX_TYPES['Texto corto'];

    return {
        ...type,
        size: type.sized ? (Number.isInteger( field.fieldSize ) ? field.fieldSize : 255) : null
        };
    }

function odxFieldProperties( field ) {
    const properties = [];
    const textual = ['Texto corto', 'Texto largo', 'Hipervínculo'].includes( field.accessType );

    if (field.required && !field.autonumber) {
        properties.push( odxProperty( 'fieldProperty', 'Required', 'boolean', '1' ) );
        }

    if (textual) {
        properties.push( odxProperty( 'fieldProperty', 'AllowZeroLength', 'boolean', field.allowZeroLength ? '1' : '0' ) );
        }

    for (const [key, name] of [
        ['validationRule', 'ValidationRule'],
        ['validationText', 'ValidationText'],
        ['defaultValue', 'DefaultValue'],
        ['caption', 'Caption'],
        ['description', 'Description'],
        ['format', 'Format']
        ]) {
        if (field[key]) {
            properties.push( odxProperty( 'fieldProperty', name, 'text', field[key] ) );
            }
        }

    if (field.decimalPlaces !== null && field.decimalPlaces !== undefined) {
        properties.push( odxProperty( 'fieldProperty', 'DecimalPlaces', 'byte', String( field.decimalPlaces ) ) );
        }

    return properties;
    }

function odxProperty(
        element,
        name,
        kind,
        value
        ) {
    return `<od:${element} name="${name}" type="${ODX_PROPERTY_TYPES[kind]}" value="${odxAttribute( value )}"/>`;
    }

/** Element names as Access writes them: letters, digits and underscore; the rest as _xHHHH_. */
function odxName( name ) {
    const encoded = [...String( name )].map(
            (character, index) => /[\p{L}\p{N}_]/u.test( character ) && !(index === 0 && /\p{N}/u.test( character ))
                ? character
                : `_x${character.codePointAt( 0 ).toString( 16 ).toUpperCase().padStart( 4, '0' )}_`
            ).join( '' );

    return encoded || '_x0020_';
    }

function odxAttribute( value ) {
    return String( value )
        .replaceAll( '&', '&amp;' )
        .replaceAll( '<', '&lt;' )
        .replaceAll( '"', '&quot;' )
        .replaceAll( '\n', '&#10;' )
        .replaceAll( '\r', '' );
    }

function odxComment( text ) {
    return String( text ).replaceAll( '--', '- -' ).replaceAll( '>', '&gt;' );
    }
