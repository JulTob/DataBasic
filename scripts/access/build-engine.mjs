import {execFileSync} from 'node:child_process';
import {mkdtemp, mkdir, cp, readdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const upstream = 'be0a2139b087a227d14cafd4ea231306a5a3a862';
const here = fileURLToPath( new URL( './', import.meta.url ) );
const source = resolve( process.argv[2] || '.' );
const revision = execFileSync( 'git', ['-C', source, 'rev-parse', 'HEAD'], {encoding: 'utf8'} ).trim();
if (revision !== upstream || execFileSync( 'git', ['-C', source, 'status', '--porcelain', '--untracked-files=no'], {encoding: 'utf8'} ).trim()) {
    throw new Error( `Use un checkout limpio de https://github.com/jahlborn/jackcess en ${upstream}.` );
    }
const scratch = await mkdtemp( join( tmpdir(), 'databasic-java-' ) );
try {
    const classes = join( scratch, 'classes' );
    const javaRoot = join( source, 'src', 'main', 'java' );
    const files = (await readdir( javaRoot, {recursive: true} ))
        .filter( f => f.endsWith( '.java' ) && !f.endsWith( 'CompoundOleUtil.java' ) )
        .sort().map( f => join( javaRoot, f ) );
    files.push( join( here, 'NativeAccess.java' ), join( here, 'SavedSelect.java' ) );
    const argument = path => '"' + path.replaceAll( '\\', '/' ).replaceAll( '"', '\\"' ) + '"';
    const list = join( scratch, 'sources' );
    await writeFile( list, files.map( argument ).join( '\n' ) );
    await mkdir( classes );
    execFileSync( 'javac', ['--release', '17', '-encoding', 'UTF-8', '-d', classes, '@' + list], {stdio: 'inherit'} );
    await cp( join( source, 'src/main/resources' ), classes, {recursive: true} );
    await mkdir( join( classes, 'META-INF' ), {recursive: true} );
    for (const name of ['LICENSE', 'NOTICE']) {
        await cp( join( source, name + '.txt' ), join( classes, 'META-INF', name + '-jackcess.txt' ) );
        }
    await cp( join( here, '../../LICENSE' ), join( classes, 'META-INF/LICENSE-DataBasic' ) );
    await writeFile( join( classes, 'META-INF/BUILD.txt' ),
        `Jackcess ${upstream}. CompoundOleUtil (optional POI compound document decoding) omitted. Built with DataBasic NativeAccess.java.\n` );
    execFileSync( 'jar', ['--create', '--date=2026-01-01T00:00:00Z', '--file',
        join( here, 'databasic-access.jar' ), '--main-class', 'NativeAccess', '-C', classes, '.'], {stdio: 'inherit'} );
    }
finally {
    await rm( scratch, {recursive: true, force: true} );
    }
