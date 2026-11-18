import { relationalDictionary, dictionaryTableLines } from './dictionary.js';
import { zipArchive, zipBytes } from './zip.js';

/*
 * The professional database template stores its model in a private format.
 * Feed it a real ACE catalog through Visio's own reverse-engineering wizard.
 * Windows Script Host uses classic JScript; keep this function ES3 compatible.
 * The return value of the browser exporter is a transfer kit, not a .vsd.
 */
function visioNativeWindowsImport( objects, relations ) {
    var files = new ActiveXObject( 'Scripting.FileSystemObject' );
    var shell = new ActiveXObject( 'WScript.Shell' );
    var root = files.GetParentFolderName( WScript.ScriptFullName );
    var source = files.BuildPath( root, 'Origen.accdb' );

    function notice( message, buttons ) {
        return shell.Popup( message, 0, 'DataBasic - Visio 2010', buttons );
    }

    function openTemplate( visio ) {
        try {
            return visio.Documents.Add( 'DBMODL_M.VST' );
        } catch (metricError) {
            return visio.Documents.Add( 'DBMODL_U.VST' );
        }
    }

    function shapeWords( shape ) {
        var text = String( shape.Characters.Text );
        var count = shape.Shapes.Count;
        for (var i = 1; i <= count; i++) {
            text += '\n' + shapeWords( shape.Shapes.Item( i ) );
        }
        return text.toLowerCase();
    }

    function mentions( text, name ) {
        var quoted = name.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
        return new RegExp( '(^|[^\\w\\u00c0-\\uffff])' + quoted
            + '($|[^\\w\\u00c0-\\uffff])', 'i' ).test( text );
    }

    function covers( text, table ) {
        if (!mentions( text, table.name )) return false;
        for (var i = 0; i < table.columns.length; i++) {
            if (!mentions( text, table.columns[i] )) return false;
        }
        return true;
    }

    function pairKey( a, b ) {
        return a <= b ? a + ':' + b : b + ':' + a;
    }

    function tableAtEndpoint( shape, ids ) {
        while (shape && shape.ID > 0) {
            if (typeof ids['s' + shape.ID] === 'number') return ids['s' + shape.ID];
            var container = shape.ContainingShape;
            if (!container || container.ID === shape.ID) return -1;
            shape = container;
        }
        return -1;
    }

    // Count independent connector shapes, rather than counting the two ends
    // that Visio exposes for each relationship. Self-references have two ends.
    function pageRelations( page, ids, edges ) {
        for (var i = 1; i <= page.Shapes.Count; i++) {
            var shape = page.Shapes.Item( i );
            if (!shape.OneD) continue;
            var ends = {};
            for (var j = 1; j <= shape.Connects.Count; j++) {
                var glue = shape.Connects.Item( j );
                var cell = String( glue.FromCell.NameU ).toLowerCase();
                if (cell === 'beginx' || cell === 'endx') {
                    ends[cell] = tableAtEndpoint( glue.ToSheet, ids );
                }
            }
            if (!(ends.beginx >= 0 && ends.endx >= 0)) continue;
            var key = pairKey( ends.beginx, ends.endx );
            edges[key] = (edges[key] || 0) + 1;
        }
    }

    function missingObjects( doc ) {
        var found = {}, edges = {}, missing = [];
        for (var p = 1; p <= doc.Pages.Count; p++) {
            var page = doc.Pages.Item( p ), ids = {};
            for (var s = 1; s <= page.Shapes.Count; s++) {
                var shape = page.Shapes.Item( s );
                if (shape.OneD || !shape.Master) continue;
                var text = shapeWords( shape );
                var master = String( shape.Master.NameU );
                for (var t = 0; t < objects.length; t++) {
                    if (master === objects[t].master && covers( text, objects[t] )) {
                        ids['s' + shape.ID] = t;
                        found[t] = true;
                        break;
                    }
                }
            }
            pageRelations( page, ids, edges );
        }
        for (var k = 0; k < objects.length; k++) {
            if (!found[k]) missing.push( objects[k].name );
        }
        for (var n = 0; n < relations.length; n++) {
            var relation = relations[n], pair = pairKey( relation[0], relation[1] );
            if (edges[pair] > 0) edges[pair]--;
            else missing.push( objects[relation[0]].name + ' / ' + objects[relation[1]].name );
        }
        return missing;
    }

    try {
        if (!files.FileExists( source )) throw new Error( 'Extrae primero todo el ZIP, incluido Origen.accdb.' );

        var visio = new ActiveXObject( 'Visio.Application' );
        visio.Visible = true;
        if (parseInt( visio.Version, 10 ) !== 14) {
            throw new Error( 'Este asistente requiere Visio 2010 Professional o Premium (versión 14).' );
        }
        var doc = openTemplate( visio );
        var folder = files.CreateFolder( files.BuildPath( root, 'Visio-' + files.GetBaseName( files.GetTempName() ) ) ).Path;
        var dsn = files.BuildPath( folder, 'Origen.dsn' );
        var stream = files.CreateTextFile( dsn, false, false );
        stream.WriteLine( '[ODBC]' );
        stream.WriteLine( 'DRIVER=Microsoft Access Driver (*.mdb, *.accdb)' );
        stream.WriteLine( 'DBQ=' + source );
        stream.WriteLine( 'READONLY=1' );
        stream.Close();

        var instructions = 'En la ventana de Visio abierta, usa Base de datos > Ingeniería inversa.\n'
            + 'Selecciona el controlador de Access y el archivo de origen de datos:\n' + dsn + '\n'
            + 'También puedes elegir el origen MS Access Database y examinar Origen.accdb.\n\n'
            + 'Extrae todas las tablas y vistas, claves primarias, índices y claves externas. '
            + 'Marca la opción de añadir automáticamente las formas a la página.\n\n'
            + 'En las opciones de documento selecciona IDEF1X, nombres físicos y todas las columnas. '
            + 'En Propiedades de base de datos, contrasta las cardinalidades con Diccionario.txt. '
            + 'Para cada vista, comprueba el SQL y el orden de las columnas con la consulta de Access.\n\n'
            + 'Al terminar la importación, vuelve a esta ventana y pulsa Aceptar.';
        while (notice( instructions, 1 ) === 1) {
            var absent = missingObjects( doc );
            if (!absent.length) {
                var output = files.BuildPath( folder, 'Modelo_nativo.vsd' );
                if (files.FileExists( output )) throw new Error( 'Ya existe el archivo de destino.' );
                doc.SaveAs( output );
                notice( 'Modelo de la plantilla guardado en:\n' + output, 64 );
                return;
            }
            instructions = 'Faltan tablas o vistas con sus columnas visibles, o conexiones entre tablas:\n'
                + absent.join( ', ' ) + '\n\nCompleta el diagrama en Visio y pulsa Aceptar para reintentar. '
                + 'Cancelar termina el asistente.';
        }
    } catch (error) {
        notice( 'No se completó la generación. ' + (error.description || error.message)
            + '\nConsulta LEEME.txt para ejecutar la importación manual.', 16 );
        WScript.Quit( 1 );
    }
}

// Windows Script Host can read ASCII consistently across regional settings.
// Encode every non-ASCII UTF-16 code unit, including JavaScript line separators.
function visioNativeScript(
        tables,
        views,
        relationships
        ) {
    function entry( object, master ) {
        return {
            name: object.name,
            master,
            columns: object.columns.map( column => column.name )
            };
        }

    const manifest = [
        ...tables.map( table => entry( table, 'Entity' ) ),
        ...views.map( view => entry( view, 'View' ) )
        ];
    const parameters = [manifest, relationships].map( item => JSON.stringify( item ) ).join( ', ' );
    const source = '(' + visioNativeWindowsImport.toString() + ')(' + parameters + ');\n';

    return source.replace( /[^\x00-\x7F]/g,
            character => '\\u' + character.charCodeAt( 0 ).toString( 16 ).padStart( 4, '0' )
            ).replace( /\r?\n/g, '\r\n' );
    }

const VISIO_NATIVE_GUIDE = [
    'MODELO DE BASE DE DATOS EN VISIO 2010',
    '',
    'Extrae los archivos juntos en una carpeta local. Origen.accdb contiene la base generada por DataBasic.',
    'En Windows con Visio 2010 Professional o Premium y el controlador ODBC de Access de la misma',
    'arquitectura que Visio, ejecuta CrearModelo.js con Windows Script Host. El asistente prepara un DSN',
    'de archivo y abre la plantilla de bases de datos. Completa las selecciones en la cinta de Visio.',
    'Antes de guardar Modelo_nativo.vsd, el asistente comprueba que cada tabla use el maestro Entity',
    'y cada vista el maestro View, que se lean sus nombres y columnas declaradas y que las tablas',
    'estén conectadas. El orden de las columnas, el SQL y las cardinalidades se revisan en las',
    'propiedades de Visio según los pasos 5 y 6.',
    '',
    'IMPORTACIÓN MANUAL',
    '1. Archivo > Nuevo > Software y bases de datos > Diagrama de modelo de base de datos.',
    '2. Base de datos > Ingeniería inversa. Elige Microsoft Access y el origen MS Access Database.',
    '   Selecciona Origen.accdb. Si no aparece el controlador *.accdb, comprueba la arquitectura de ODBC.',
    '3. Incluye tablas, vistas, claves primarias, índices y claves externas. Selecciona todas las tablas',
    '   y vistas. Activa la creación del dibujo y completa el asistente.',
    '4. Base de datos > Opciones de presentación del documento > General > IDEF1X. Muestra los',
    '   nombres físicos, columnas y claves. Abre Propiedades de base de datos en entidades y relaciones.',
    '5. Contrasta los campos, dominios, claves, participaciones y acciones con Diccionario.txt.',
    '   Access y ODBC exponen tipos físicos. Ajusta los tipos portables del curso en Visio y verifica',
    '   en cada relación, el número de hijos que admite cada padre y la obligatoriedad de la referencia.',
    '6. En las propiedades de cada vista, coteja el SELECT y el orden de las columnas con la consulta',
    '   guardada de Origen.accdb. Compara los tipos y la nulabilidad inferidos por ODBC con la declaración',
    '   lógica de Diccionario.txt. Si no hay columnas declaradas, usa la proyección de la consulta de Access.',
    '7. Guarda el documento de la plantilla como Visio Drawing (*.vsd). Ábrelo otra vez y revisa',
    '   Propiedades de base de datos. Para entregar, utiliza ese archivo y la base/documento solicitados.',
    '',
    'Microsoft: https://support.microsoft.com/es-es/visio/reverse-engineer-an-existing-database-into-a-database-model',
    ''
    ];

function visioViewLines( view ) {
    return [
        `VISTA ${view.name}`,
        ...view.columns.map( column =>
            `${column.name} ${column.type} · ${column.required || column.primary ? 'NOT NULL' : 'NULL'}`
            ),
        'SELECT del modelo:',
        view.definition
        ].join( '\r\n' );
    }

/** Prepare the ACE catalog and the bridge to the native, installed DBMODL solution. */
export function buildVisioNativeKit(
        model,
        accessBytes
        ) {
    const access = zipBytes( accessBytes );
    if (access.length < 4096 || new TextDecoder().decode( access.subarray( 4, 19 ) ) !== 'Standard ACE DB') {
        throw new Error( 'La plantilla necesita una base .accdb generada por el exportador local.' );
        }
    const tables = relationalDictionary( model );
    if (!tables.length) {
        throw new Error( 'Crea al menos una tabla antes de importar en Visio.' );
        }
    const indexes = new Map( tables.map( (table, index) => [table.name, index] ) );
    const relationships = tables.flatMap(
            (table, index) => table.foreignKeys.map( key => [indexes.get( key.parent ), index] )
            );
    const views = model.tables.filter( table => table.kind === 'view' );
    const dictionary = [
        ...tables.map( table => [
            table.name,
            ...dictionaryTableLines( table )
            ].join( '\r\n' ) ),
        ...views.map( visioViewLines )
        ].join( '\r\n\r\n' );

    return zipArchive( [
        {name: 'Origen.accdb', data: access},
        {name: 'CrearModelo.js', data: visioNativeScript( tables, views, relationships )},
        {name: 'Diccionario.txt', data: '\uFEFF' + dictionary},
        {name: 'LEEME.txt', data: '\uFEFF' + VISIO_NATIVE_GUIDE.join( '\r\n' )}
        ] );
    }
