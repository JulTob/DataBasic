import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import * as domain from '../src/domain/model.js';
import { addForm } from '../src/domain/forms.js';
import { serializeDocument } from '../src/domain/serialization.js';
import { crc32 } from '../src/io/zip.js';
import { readZip } from '../src/io/zipread.js';
import {
    modelFromProjectSQL,
    projectSQL,
    projectSQLSignature
    } from '../src/io/project-sql.js';
import {
    projectReadme,
    readmeAssumptions
    } from '../src/io/project-readme.js';
import {
    PROJECT_FILES,
    isProjectFile,
    openProject,
    projectFiles,
    projectFolder,
    projectFolderName,
    projectZip
    } from '../src/io/project.js';
import {
    fetchGitHubFolder,
    parseGitHubLink
    } from '../src/io/github.js';
import { buildDeliveryPackage } from '../src/io/package.js';
import { exportSVG } from '../src/ui/diagram.js';
import {
    exampleFolders,
    exampleText,
    readExample
    } from './support/examples.js';
import { applicationHarness } from './support/application.js';

const FIXED_DATE = new Date( 2026, 10, 9, 12, 0, 0 );
const folders = await exampleFolders();

function diagrams( model ) {
    return {
        chen: exportSVG( domain.setDiagramMode( model, 'chen' ) ),
        relational: exportSVG( domain.setDiagramMode( model, 'relational' ) )
        };
    }

/** A folder as projectFolder gives it, from [{name, data}] with text or bytes. */
function folderOf(
        files,
        name = 'Carpeta'
        ) {
    return projectFolder(
            files.map( file => ({name: file.name, data: typeof file.data === 'string' ? new TextEncoder().encode( file.data ) : file.data}) ),
            name
            );
    }

/** The files DataBasic writes for a document, with some of them replaced or left out. */
function savedFiles(
        model,
        {replace = {}, omit = []} = {}
        ) {
    return projectFiles( model, {diagrams: diagrams( model )} ).files
        .filter( file => !omit.includes( file.name ) )
        .map( file => (file.name in replace ? {name: file.name, data: replace[file.name]} : file) );
    }

function textOf(
        files,
        name
        ) {
    return files.find( file => file.name === name ).data;
    }

function statusOf(
        report,
        name
        ) {
    return report.files.find( file => file.name === name );
    }

/* ---------- esquema.sql ---------- */

test( 'esquema.sql: escribir y leer dan el mismo SQL en todos los ejemplos', async () => {
    for (const folder of folders) {
        const model = await readExample( folder );
        const fromSQL = modelFromProjectSQL( projectSQL( model ) );

        assert.deepEqual( projectSQLSignature( fromSQL ), projectSQLSignature( model ), folder );
        assert.equal( fromSQL.profile, 'course', `${folder}: los tipos del curso dan el perfil del curso` );
        }
    } );

test( 'esquema.sql es SQL legible: claves en la tabla, FK con acciones, una fila por línea', async () => {
    const sql = projectSQL( await readExample( 'curso-biblioteca' ) );

    assert.match( sql, /CREATE TABLE Prestamo \(\n {4}usuario_dni CHAR\(9\) NOT NULL,/ );
    assert.match( sql, /fecha_devolucion DATE CHECK \(fecha_devolucion >= fecha_prestamo\)/ );
    assert.match( sql, /PRIMARY KEY \(usuario_dni, libro_isbn, fecha_prestamo\)/ );
    assert.match( sql, /ALTER TABLE Prestamo ADD CONSTRAINT FK_Prestamo_usuario\n {4}FOREIGN KEY \(usuario_dni\) REFERENCES Usuario \(dni\)\n {4}ON DELETE NO ACTION ON UPDATE NO ACTION;/ );
    assert.match( sql, /INSERT INTO Autor \(codigo, nombre\) VALUES \(1, 'Marta Sánchez'\);\nINSERT INTO Autor/ );
    assert.match( sql, /INSERT INTO Prestamo \([^)]*\) VALUES \('\d{8}[A-Z]', '\d+', #\d{4}-\d{2}-\d{2}#, (NULL|#\d{4}-\d{2}-\d{2}#)\);/ );
    } );

test( 'esquema.sql escrito a mano: tipos, DEFAULT, nombres entre corchetes, filas y perfil general', () => {
    const model = modelFromProjectSQL( `
        -- Un proyecto escrito a mano
        CREATE TABLE Cliente (
            id INTEGER NOT NULL,
            [nombre completo] VARCHAR(60) NOT NULL,
            estado VARCHAR(10) DEFAULT 'activo',
            PRIMARY KEY (id)
        );
        CREATE TABLE Pedido (id INTEGER NOT NULL PRIMARY KEY, cliente INTEGER NOT NULL, total DECIMAL(10,2) CHECK (total >= 0));
        ALTER TABLE Pedido ADD CONSTRAINT FK_Pedido_Cliente FOREIGN KEY (cliente) REFERENCES Cliente (id) ON DELETE CASCADE;
        CREATE VIEW Grandes AS SELECT * FROM Pedido WHERE total > 100;
        INSERT INTO Cliente (id, [nombre completo]) VALUES (1, 'Ana Ruiz'), (2, 'Luis Gil');
        INSERT INTO Pedido VALUES (10, 1, 250.5);
        ` );
    const client = model.tables.find( table => table.name === 'Cliente' );
    const rows = domain.tableRows( model, client.id );
    const status = client.columns.find( field => field.name === 'estado' );

    assert.equal( model.profile, 'general' );
    assert.deepEqual( model.tables.map( table => [table.name, table.kind] ), [['Cliente', 'entity'], ['Pedido', 'entity'], ['Grandes', 'view']] );
    assert.equal( model.relationships[0].onDelete, 'CASCADE' );
    assert.equal( rows.length, 2 );
    assert.equal( rows[0][status.id], 'activo', 'un campo que INSERT no nombra toma su DEFAULT' );
    assert.equal( rows[1][client.columns[1].id], 'Luis Gil' );
    assert.match( projectSQL( model ), /\[nombre completo\] VARCHAR\(60\) NOT NULL/ );
    } );

test( 'esquema.sql: los errores dicen la línea, y solo describe la base de datos', () => {
    assert.throws( () => modelFromProjectSQL( 'CREATE TABLE T (id NUMBER NOT NULL,\n  PRIMARY KEY (id);' ), /esquema\.sql: Error de sintaxis.*\(línea 2, columna \d+\)/ );
    assert.throws( () => modelFromProjectSQL( 'CREATE TABLE T (id NUMBER);\nSELECT * FROM T;' ), /esquema\.sql, línea 2: .*una consulta SELECT/ );
    assert.throws( () => modelFromProjectSQL( 'CREATE TABLE T (id NUMBER);\n\nINSERT INTO U VALUES (1);' ), /esquema\.sql, línea 3: No se encuentra la tabla «U»/ );
    assert.throws( () => modelFromProjectSQL( 'CREATE TABLE T (id NUMBER);\nINSERT INTO T VALUES (1, 2);' ), /línea 2: INSERT da 2 valores para 1 campos/ );
    } );

test( 'esquema.sql guarda las filas tal como se escriben: una que rompe una regla se abre y se señala', () => {
    const model = modelFromProjectSQL( `
        CREATE TABLE A (id NUMBER NOT NULL, PRIMARY KEY (id));
        CREATE TABLE B (id NUMBER NOT NULL, a NUMBER, PRIMARY KEY (id));
        ALTER TABLE B ADD CONSTRAINT FK_B_A FOREIGN KEY (a) REFERENCES A (id);
        INSERT INTO A VALUES (1);
        INSERT INTO B VALUES (1, 7);
        ` );
    const opened = openProject( folderOf( [{name: 'esquema.sql', data: projectSQL( model )}] ) );

    assert.equal( domain.tableRows( model, model.tables[1].id ).length, 1 );
    assert.match( opened.report.notes.map( item => item.text ).join( ' ' ), /1 aviso .*Comprobar/ );
    } );

/* ---------- README.md ---------- */

test( 'README.md escribe y lee la semántica: tres secciones, etiquetas y entradas de varias líneas', () => {
    let model = domain.exampleDocument();
    const loan = model.tables.find( table => table.name === 'Prestamo' );

    model = domain.addAssumption( model, {kind: 'supuesto', text: 'Un socio tiene a la vez\ncomo mucho tres préstamos.', elementId: loan.id} );
    model = domain.addAssumption( model, {kind: 'perdida', text: 'La fecha de devolución no se comprueba.'} );

    const readme = projectReadme( model );
    const entries = readmeAssumptions( readme );

    assert.match( readme, /## Supuestos semánticos\n\n- Un socio tiene a la vez\n {2}como mucho tres préstamos\. _\(Entidad Prestamo\)_/ );
    assert.match( readme, /## Semántica del enunciado\n\n_Ninguna entrada\._/ );
    assert.deepEqual( entries, [
        {kind: 'supuesto', text: 'Un socio tiene a la vez\ncomo mucho tres préstamos.', label: 'Entidad Prestamo'},
        {kind: 'perdida', text: 'La fecha de devolución no se comprueba.', label: null}
        ] );
    } );

test( 'README.md escrito a mano: encabezados sin tildes, viñetas *, y lo generado no se lee', () => {
    const entries = readmeAssumptions( [
        '# Supuestos de mi práctica',
        'Texto libre.',
        '### SEMANTICA DEL ENUNCIADO',
        '* Cada socio tiene un carné. _(Entidad Socio)_',
        '## supuestos',
        '- Primera línea',
        '    segunda línea',
        '',
        '<!-- DataBasic: lo que sigue se escribe al guardar -->',
        '## Semántica perdida',
        '- Esto no se lee.'
        ].join( '\n' ) );

    assert.deepEqual( entries, [
        {kind: 'enunciado', text: 'Cada socio tiene un carné.', label: 'Entidad Socio'},
        {kind: 'supuesto', text: 'Primera línea\nsegunda línea', label: null}
        ] );
    assert.equal( readmeAssumptions( '# Mi proyecto\n\nSin secciones.' ), null );
    } );

/* ---------- the folder: saving and opening ---------- */

test( 'Cada carpeta de ejemplo es congruente: fuentes coinciden, dibujos al día, mismo documento', async () => {
    for (const folder of folders) {
        const model = await readExample( folder );
        const files = await Promise.all( PROJECT_FILES.map( async file => {
            try {
                return {name: file.name, data: await exampleText( folder, file.name )};
                }
            catch {
                return null;
                }
            } ) );
        const opened = openProject( folderOf( files.filter( Boolean ), folder ), {diagrams, name: null} );

        assert.equal( serializeDocument( opened.model ), serializeDocument( model ), folder );
        assert.equal( opened.report.outcome, 'same', folder );

        for (const name of ['README.md', 'esquema.sql', 'proyecto.databasic.json', 'diagrama.svg', 'relacional.svg']) {
            assert.equal( statusOf( opened.report, name ).level, 'ok', `${folder}/${name}: ${statusOf( opened.report, name ).text}` );
            }
        }
    } );

test( 'Guardar escribe un .zip con la carpeta dentro, y abrirlo devuelve el mismo documento', async () => {
    const model = await readExample( 'curso-salas' );
    const zip = projectZip( model, {diagrams: diagrams( model ), date: FIXED_DATE} );
    const entries = await readZip( zip.bytes );
    const folder = projectFolderName( model );

    assert.equal( zip.filename, `${folder}.zip` );
    assert.deepEqual( entries.map( entry => entry.name ), PROJECT_FILES.map( file => `${folder}/${file.name}` ) );
    assert.deepEqual( zip.skipped, [] );

    const opened = openProject( projectFolder( entries, 'otro' ), {diagrams} );

    assert.equal( serializeDocument( opened.model ), serializeDocument( model ) );
    assert.ok( opened.report.files.every( file => file.level === 'ok' ), JSON.stringify( opened.report.files ) );
    } );

test( 'Un diseño pendiente se guarda igualmente: faltan solo los archivos de la base de datos', async () => {
    const model = await readExample( '02-ternaria-pendiente' );
    const zip = projectZip( model, {diagrams: diagrams( model )} );

    assert.deepEqual( zip.skipped.map( item => item.name ), ['base_de_datos.bas', 'base_de_datos.sql', 'base_de_datos.xml'] );
    assert.match( new TextDecoder().decode( (await readZip( zip.bytes )).find( entry => entry.name.endsWith( 'README.md' ) ).data ), /No se escribió `base_de_datos\.bas`/ );
    } );

test( 'Solo cambian las filas del SQL: mandan sus filas y se conserva todo lo demás', async () => {
    const model = await readExample( 'curso-salas' );
    const files = savedFiles( model );
    const sql = textOf( files, 'esquema.sql' ).replace( /INSERT INTO Sala \(nombre, num_camas\) VALUES \('([^']+)', (\d+)\);/, "INSERT INTO Sala (nombre, num_camas) VALUES ('$1', 99);" );
    const opened = openProject( folderOf( files.map( file => (file.name === 'esquema.sql' ? {...file, data: sql} : file) ) ), {diagrams, name: null} );
    const room = opened.model.tables.find( table => table.name === 'Sala' );
    const beds = room.columns.find( field => field.name === 'num_camas' );

    assert.notEqual( sql, textOf( files, 'esquema.sql' ) );
    assert.equal( opened.report.outcome, 'rows' );
    assert.equal( domain.tableRows( opened.model, room.id )[0][beds.id], '99' );
    assert.deepEqual( opened.model.conceptual, model.conceptual, 'el diagrama entidad-relación se conserva' );
    assert.equal( statusOf( opened.report, 'esquema.sql' ).level, 'info' );
    assert.equal( statusOf( opened.report, 'relacional.vdx' ).level, 'ok', 'las filas no salen en el dibujo' );
    assert.equal( statusOf( opened.report, 'base_de_datos.bas' ).level, 'warning', 'el módulo lleva las filas' );
    } );

test( 'Cambia la estructura del SQL: manda el SQL y se conserva por nombre lo que el SQL no dice', async () => {
    let model = await readExample( 'curso-salas' );
    const room = model.tables.find( table => table.name === 'Sala' );

    model = domain.changeDocument( model, next => {
        next.tables.find( table => table.id === room.id ).color = 200;
        } );
    model = addForm( model, {name: 'Salas', title: 'Salas', sourceId: room.id, fields: room.columns.map( field => field.id ), layout: 'columnar'} );

    const files = savedFiles( model );
    const sql = textOf( files, 'esquema.sql' ).replace( 'num_camas NUMBER(3)', 'num_camas NUMBER(3),\n    planta NUMBER(2)' );
    const opened = openProject( folderOf( files.map( file => (file.name === 'esquema.sql' ? {...file, data: sql} : file) ) ), {diagrams, name: null} );
    const kept = opened.model.tables.find( table => table.name === 'Sala' );
    const relation = opened.model.relationships[0];
    const original = model.relationships.find( item => item.name === relation.name );

    assert.notEqual( sql, textOf( files, 'esquema.sql' ) );
    assert.equal( opened.report.outcome, 'structure' );
    assert.deepEqual( kept.columns.map( field => field.name ), ['nombre', 'num_camas', 'planta'] );
    assert.deepEqual( [kept.x, kept.y, kept.color], [room.x, room.y, 200], 'posición y color por nombre' );
    assert.equal( relation.cardinality, original.cardinality );
    assert.equal( relation.forward, original.forward );
    assert.equal( opened.model.conceptual.entities.length, 0, 'el diagrama entidad-relación se deja fuera' );
    assert.equal( opened.model.forms[0].sourceId, kept.id );
    assert.deepEqual( opened.model.forms[0].fields, kept.columns.slice( 0, 2 ).map( field => field.id ) );
    assert.equal( opened.model.name, model.name );
    assert.equal( statusOf( opened.report, 'esquema.sql' ).level, 'warning' );
    assert.match( opened.report.notes.map( item => item.text ).join( ' ' ), /diagrama entidad-relación .* se deja fuera/ );
    assert.equal( domain.documentAssumptions( opened.model ).length, domain.documentAssumptions( model ).length );
    assert.ok(
            domain.documentAssumptions( opened.model ).some( item => item.elementId === kept.id ),
            '«Entidad Sala» encuentra la tabla Sala'
            );
    assert.match( statusOf( opened.report, 'README.md' ).text, /Quedan sin elemento .*Relación Internado_en/ );
    } );

test( 'README.md manda en los supuestos; sin secciones, se quedan los del proyecto', async () => {
    const model = await readExample( 'curso-salas' );
    const files = savedFiles( model );
    const readme = textOf( files, 'README.md' ).replace( '## Semántica perdida\n', '## Semántica perdida\n\n- Nueva entrada escrita en GitHub. _(Entidad Paciente)_' );
    const changed = openProject( folderOf( files.map( file => (file.name === 'README.md' ? {...file, data: readme} : file) ) ), {name: null} );
    const patient = changed.model.conceptual.entities.find( entity => entity.name === 'Paciente' );
    const lost = domain.documentAssumptions( changed.model ).filter( item => item.kind === 'perdida' );
    const plain = openProject( folderOf( files.map( file => (file.name === 'README.md' ? {...file, data: '# Salas\n\nNotas libres.'} : file) ) ), {name: null} );

    assert.equal( lost.length, 2 );
    assert.equal( lost[0].text, 'Nueva entrada escrita en GitHub.' );
    assert.equal( lost[0].elementId, patient.id, '«Entidad Paciente» es la entidad del diagrama antes que su tabla' );
    assert.deepEqual(
            domain.documentAssumptions( changed.model ).filter( item => item.kind !== 'perdida' ),
            domain.documentAssumptions( model ).filter( item => item.kind !== 'perdida' ),
            'las entradas que no cambian conservan su id'
            );
    assert.deepEqual( domain.documentAssumptions( plain.model ), domain.documentAssumptions( model ) );
    assert.equal( statusOf( plain.report, 'README.md' ).level, 'info' );
    } );

test( 'Solo esquema.sql: tablas en cuadrícula sin solapes; solo el JSON: se abre como antes', async () => {
    const model = await readExample( 'curso-lonja' );
    const files = savedFiles( model );
    const fromSQL = openProject( folderOf( files.filter( file => file.name === 'esquema.sql' ), 'Lonja' ) );
    const fromJSON = openProject( folderOf( files.filter( file => file.name === 'proyecto.databasic.json' ) ), {name: null} );
    const boxes = fromSQL.model.tables.map( table => ({x: table.x, y: table.y, height: 60 + 26 * table.columns.length}) );

    assert.equal( fromSQL.report.outcome, 'sql-only' );
    assert.equal( fromSQL.model.name, 'Lonja', 'el nombre es el de la carpeta' );
    assert.deepEqual( projectSQLSignature( fromSQL.model ), projectSQLSignature( model ) );
    assert.equal( statusOf( fromSQL.report, 'proyecto.databasic.json' ).level, 'missing' );

    for (const [index, box] of boxes.entries()) {
        for (const other of boxes.slice( index + 1 )) {
            assert.ok( box.x !== other.x || box.y + box.height <= other.y || other.y + other.height <= box.y, 'sin solapes' );
            }
        }

    assert.equal( fromJSON.report.outcome, 'json-only' );
    assert.equal( serializeDocument( fromJSON.model ), serializeDocument( model ) );
    assert.equal( statusOf( fromJSON.report, 'esquema.sql' ).level, 'missing' );
    } );

test( 'Un esquema.sql con errores: con JSON se abre el JSON y se avisa; sin JSON no se abre', async () => {
    const model = await readExample( 'curso-salas' );
    const broken = 'CREATE TABLE Sala (\n  nombre VARCHAR(30)\n  num_camas NUMBER(3)\n);';
    const withJSON = openProject( folderOf( savedFiles( model, {replace: {'esquema.sql': broken}} ) ), {name: null} );

    assert.equal( serializeDocument( withJSON.model ), serializeDocument( model ) );
    assert.equal( statusOf( withJSON.report, 'esquema.sql' ).level, 'error' );
    assert.match( statusOf( withJSON.report, 'esquema.sql' ).text, /línea 3.*Se abre proyecto\.databasic\.json/ );
    assert.throws( () => openProject( folderOf( [{name: 'esquema.sql', data: broken}] ) ), /esquema\.sql: Error de sintaxis.*línea 3/ );
    } );

test( 'Un archivo de salida editado aparece como desactualizado', async () => {
    const model = await readExample( 'curso-salas' );
    const files = savedFiles( model, {replace: {'relacional.svg': '<svg xmlns="http://www.w3.org/2000/svg"/>'}} );
    const opened = openProject( folderOf( files ), {diagrams, name: null} );

    assert.equal( statusOf( opened.report, 'relacional.svg' ).level, 'warning' );
    assert.equal( statusOf( opened.report, 'diagrama.svg' ).level, 'ok' );
    } );

test( 'El nombre del proyecto es el de la carpeta, salvo que sea el mismo nombre escrito para archivos', async () => {
    const model = domain.changeDocument( await readExample( 'curso-salas' ), next => { next.name = 'Salas: hospital / planta 2'; } );
    const files = savedFiles( model );

    assert.equal( projectFolderName( model ), 'Salas_ hospital _ planta 2' );
    assert.equal( openProject( folderOf( files ), {name: projectFolderName( model )} ).model.name, 'Salas: hospital / planta 2' );
    const renamed = openProject( folderOf( files ), {diagrams, name: 'Hospital-Norte'} );

    assert.equal( renamed.model.name, 'Hospital-Norte' );
    assert.equal( statusOf( renamed.report, 'diagrama.svg' ).level, 'ok', 'cambiar el nombre de la carpeta no desactualiza los dibujos' );
    } );

test( 'La carpeta se encuentra dentro del .zip; el paquete de entrega también se abre', async () => {
    const model = await readExample( 'curso-salas' );
    const nested = folderOf( [
        {name: '__MACOSX/Practica/._esquema.sql', data: 'basura'},
        {name: 'Practica/notas.txt', data: 'nada'},
        ...savedFiles( model ).map( file => ({name: `Practica/Salas/${file.name}`, data: file.data}) )
        ] );
    const delivery = projectFolder( await readZip( buildDeliveryPackage( model, {date: FIXED_DATE} ) ), 'Practica_Ruiz_Ana' );

    assert.equal( nested.name, 'Salas' );
    assert.equal( nested.files.size, PROJECT_FILES.length );
    assert.equal( delivery.name, 'Practica_Ruiz_Ana' );
    assert.deepEqual( [...delivery.files.keys()], ['proyecto.databasic.json'] );
    assert.equal( isProjectFile( 'carpeta/README.md' ), true );
    assert.equal( isProjectFile( 'carpeta/foto.png' ), false );
    assert.throws( () => projectFolder( [{name: 'a/README.md', data: new Uint8Array()}] ), /falta esquema\.sql o proyecto\.databasic\.json/ );
    } );

/** A ZIP with one deflated entry, as Windows, macOS or a browser write them. */
function deflatedZip(
        name,
        text
        ) {
    const data = new TextEncoder().encode( text );
    const packed = deflateRawSync( data );
    const nameBytes = new TextEncoder().encode( name );
    const local = Buffer.alloc( 30 );
    const central = Buffer.alloc( 46 );
    const end = Buffer.alloc( 22 );

    local.writeUInt32LE( 0x04034B50, 0 );
    local.writeUInt16LE( 20, 4 );
    local.writeUInt16LE( 8, 8 );
    local.writeUInt32LE( crc32( data ), 14 );
    local.writeUInt32LE( packed.length, 18 );
    local.writeUInt32LE( data.length, 22 );
    local.writeUInt16LE( nameBytes.length, 26 );
    central.writeUInt32LE( 0x02014B50, 0 );
    central.writeUInt16LE( 20, 4 );
    central.writeUInt16LE( 20, 6 );
    central.writeUInt16LE( 8, 10 );
    central.writeUInt32LE( crc32( data ), 16 );
    central.writeUInt32LE( packed.length, 20 );
    central.writeUInt32LE( data.length, 24 );
    central.writeUInt16LE( nameBytes.length, 28 );
    central.writeUInt32LE( 0, 42 );

    const directoryOffset = local.length + nameBytes.length + packed.length;

    end.writeUInt32LE( 0x06054B50, 0 );
    end.writeUInt16LE( 1, 8 );
    end.writeUInt16LE( 1, 10 );
    end.writeUInt32LE( central.length + nameBytes.length, 12 );
    end.writeUInt32LE( directoryOffset, 16 );

    return new Uint8Array( Buffer.concat( [local, nameBytes, packed, central, nameBytes, end] ) );
    }

test( 'readZip lee entradas comprimidas (deflate) y rechaza lo que no es un .zip', async () => {
    const entries = await readZip( deflatedZip( 'Proyecto/esquema.sql', 'CREATE TABLE T (id NUMBER);\n'.repeat( 50 ) ) );

    assert.equal( entries[0].name, 'Proyecto/esquema.sql' );
    assert.equal( new TextDecoder().decode( entries[0].data ), 'CREATE TABLE T (id NUMBER);\n'.repeat( 50 ) );
    await assert.rejects( readZip( new TextEncoder().encode( 'no soy un zip' ) ), /no es un \.zip válido/ );
    } );

/* ---------- GitHub ---------- */

test( 'Enlaces de GitHub: carpeta, repositorio, archivo y otros sitios', () => {
    assert.deepEqual(
            parseGitHubLink( 'https://github.com/ana/practicas/tree/main/bases%20de%20datos/Lonja' ),
            {owner: 'ana', repository: 'practicas', rest: ['main', 'bases de datos', 'Lonja'], branchGiven: true}
            );
    assert.deepEqual( parseGitHubLink( 'https://github.com/ana/practicas.git' ), {owner: 'ana', repository: 'practicas', rest: [], branchGiven: false} );
    assert.throws( () => parseGitHubLink( 'https://github.com/ana/practicas/blob/main/esquema.sql' ), /enlace es de un archivo/ );
    assert.throws( () => parseGitHubLink( 'https://gitlab.com/ana/practicas' ), /enlace de una carpeta de GitHub/ );
    assert.throws( () => parseGitHubLink( 'no es un enlace' ), /enlace de una carpeta de GitHub/ );
    } );

/** A double of fetch: the listing of one folder of one branch, and its raw files. */
function gitHubDouble(
        files,
        {branch = 'main', path = 'Lonja', status = 404} = {}
        ) {
    const asked = [];
    const fetcher = async address => {
        asked.push( address );

        if (address.startsWith( 'https://raw.example/' )) {
            const file = files.find( item => address.endsWith( `/${item.name}` ) );

            return {ok: true, status: 200, arrayBuffer: async () => new TextEncoder().encode( file.data ).buffer};
            }

        const wanted = `https://api.github.com/repos/ana/practicas/contents/${path.split( '/' ).map( encodeURIComponent ).join( '/' )}?ref=${encodeURIComponent( branch )}`;

        if (address !== wanted) {
            return {ok: false, status};
            }

        return {
            ok: true,
            status: 200,
            json: async () => [
                ...files.map( file => ({type: 'file', name: file.name, size: file.data.length, download_url: `https://raw.example/${file.name}`}) ),
                {type: 'file', name: 'foto.png', size: 10, download_url: 'https://raw.example/foto.png'},
                {type: 'dir', name: 'otra', download_url: null}
                ]
            };
        };

    return {fetcher, asked};
    }

test( 'Una carpeta pública de GitHub se lee sin cuenta, también con ramas que llevan barra', async () => {
    const model = await readExample( 'curso-salas' );
    const files = savedFiles( model ).map( file => ({name: file.name, data: typeof file.data === 'string' ? file.data : ''}) )
        .filter( file => file.data );
    const plain = gitHubDouble( files );
    const folder = await fetchGitHubFolder( 'https://github.com/ana/practicas/tree/main/Lonja', isProjectFile, plain.fetcher );
    const slashed = gitHubDouble( files, {branch: 'curso/2026', path: 'Lonja'} );
    const second = await fetchGitHubFolder( 'https://github.com/ana/practicas/tree/curso/2026/Lonja', isProjectFile, slashed.fetcher );

    assert.equal( folder.name, 'Lonja' );
    assert.deepEqual( folder.files.map( file => file.name ), files.map( file => file.name ) );
    assert.ok( !plain.asked.some( address => address.endsWith( 'foto.png' ) ), 'solo se descargan los archivos del proyecto' );
    assert.equal( second.name, 'Lonja' );
    assert.equal( slashed.asked.filter( address => address.startsWith( 'https://api.github.com' ) ).length, 2 );

    const opened = openProject( projectFolder( folder.files, folder.name ) );

    assert.equal( opened.model.name, 'Lonja' );
    assert.deepEqual( projectSQLSignature( opened.model ), projectSQLSignature( model ) );
    } );

test( 'GitHub: carpeta que no existe, límite de consultas y carpeta sin proyecto', async () => {
    const missing = gitHubDouble( [] );
    const limited = gitHubDouble( [], {status: 403} );
    const empty = gitHubDouble( [{name: 'notas.txt', data: 'x'}] );

    await assert.rejects( fetchGitHubFolder( 'https://github.com/ana/practicas/tree/main/Otra', isProjectFile, missing.fetcher ), /No se encuentra la carpeta.*público/ );
    await assert.rejects( fetchGitHubFolder( 'https://github.com/ana/practicas/tree/main/Otra', isProjectFile, limited.fetcher ), /60 por hora/ );
    await assert.rejects( fetchGitHubFolder( 'https://github.com/ana/practicas/tree/main/Lonja', isProjectFile, empty.fetcher ), /no tiene archivos de proyecto/ );
    } );

/* ---------- the application ---------- */

test( 'Aplicación: Guardar descarga la carpeta en .zip y Abrir la recupera con su informe', async () => {
    const app = await applicationHarness();

    await app.flushTimers();
    await app.click({action: 'save'});

    const blob = app.downloads.at( -1 );
    const bytes = new Uint8Array( await blob.arrayBuffer() );
    const entries = await readZip( bytes );
    const saved = JSON.parse( new TextDecoder().decode( entries.find( entry => entry.name.endsWith( '/proyecto.databasic.json' ) ).data ) );

    assert.equal( blob.type, 'application/zip' );
    assert.ok( entries.some( entry => /\/esquema\.sql$/.test( entry.name ) ) );
    assert.ok( entries.some( entry => /\/README\.md$/.test( entry.name ) ) );
    assert.ok( saved.tables.length > 0 );

    await app.click({action: 'new'});
    await app.flushTimers();
    assert.equal( JSON.parse( app.saved() ).tables.length, 0 );

    await app.listeners.get( '#open-file:change' )({target: {
        files: [{name: 'Biblioteca.zip', size: bytes.length, arrayBuffer: async () => bytes.buffer}],
        value: 'Biblioteca.zip'
        }});
    await app.flushTimers();

    const reopened = JSON.parse( app.saved() );

    assert.deepEqual( projectSQLSignature( reopened ), projectSQLSignature( saved ) );
    assert.match( app.element( '#dialog' ).innerHTML, /Proyecto abierto/ );
    assert.match( app.element( '#dialog' ).innerHTML, /esquema\.sql/ );
    } );
