/*
 * A public folder of GitHub as the files of a project, without an account:
 * the contents API lists the folder (api.github.com, which answers browsers
 * of any site) and each file is downloaded from its raw address. Without an
 * account GitHub answers 60 listings per hour from one network; the raw
 * downloads do not count.
 *
 * The link is the one the browser shows on the folder's page:
 *   https://github.com/OWNER/REPOSITORY/tree/BRANCH/PATH/TO/FOLDER
 *   https://github.com/OWNER/REPOSITORY            (the top of the default branch)
 */

const GITHUB_API = 'https://api.github.com';
const GITHUB_FILE_LIMIT = 20 * 1024 * 1024;

function linkError() {
    return new Error( 'Pega el enlace de una carpeta de GitHub, como https://github.com/usuario/repositorio/tree/main/carpeta.' );
    }

/** The parts of a folder link: {owner, repository, rest, branchGiven}; rest holds the branch and the path. */
export function parseGitHubLink( text ) {
    let url;

    try {
        url = new URL( String( text ).trim() );
        }
    catch {
        throw linkError();
        }

    if (!['github.com', 'www.github.com'].includes( url.hostname ) || url.protocol !== 'https:') {
        throw linkError();
        }

    const parts = url.pathname.split( '/' ).filter( Boolean ).map( part => decodeURIComponent( part ) );

    if (parts.length < 2) {
        throw linkError();
        }

    const [owner, repositoryPart, kind, ...rest] = parts;
    const repository = repositoryPart.replace( /\.git$/, '' );

    if (kind === 'blob') {
        throw new Error( 'Ese enlace es de un archivo: copia el enlace de la carpeta que lo contiene.' );
        }

    if (kind && kind !== 'tree') {
        throw linkError();
        }

    if (kind === 'tree' && !rest.length) {
        throw linkError();
        }

    return {owner, repository, rest, branchGiven: kind === 'tree'};
    }

/**
 * The ways to split «BRANCH/PATH» into a branch and a path: a branch name
 * may hold slashes (feature/x), so the shortest branch is tried first.
 */
function locations( link ) {
    if (!link.branchGiven) {
        return [{branch: null, path: ''}];
        }

    const choices = [];

    for (let length = 1; length <= Math.min( 3, link.rest.length ); length += 1) {
        choices.push( {branch: link.rest.slice( 0, length ).join( '/' ), path: link.rest.slice( length ).join( '/' )} );
        }

    return choices;
    }

function contentsAddress(
        link,
        location
        ) {
    const path = location.path.split( '/' ).filter( Boolean ).map( encodeURIComponent ).join( '/' );
    const query = location.branch ? `?ref=${encodeURIComponent( location.branch )}` : '';

    return `${GITHUB_API}/repos/${encodeURIComponent( link.owner )}/${encodeURIComponent( link.repository )}/contents/${path}${query}`;
    }

function answerError(
        response,
        link
        ) {
    if (response.status === 403 || response.status === 429) {
        return new Error( 'GitHub limita las consultas sin cuenta (60 por hora): espera un rato, o descarga la carpeta como .zip y ábrela.' );
        }

    if (response.status === 404) {
        return new Error( `No se encuentra la carpeta en ${link.owner}/${link.repository}: comprueba el enlace y que el repositorio sea público.` );
        }

    return new Error( `GitHub no respondió (${response.status}).` );
    }

/** The listing of the folder, trying each split of branch and path until one exists. */
async function folderListing(
        link,
        fetcher
        ) {
    let last = null;

    for (const location of locations( link )) {
        const response = await fetcher( contentsAddress( link, location ), {headers: {Accept: 'application/vnd.github+json'}} );

        if (response.ok) {
            const listing = await response.json();

            if (!Array.isArray( listing )) {
                throw new Error( 'Ese enlace no es una carpeta: copia el enlace de la carpeta del proyecto.' );
                }

            return {listing, location};
            }

        last = response;

        if (response.status !== 404) {
            break;
            }
        }

    throw answerError( last, link );
    }

/**
 * The folder of a GitHub link: {name, files: [{name, data}]}, with the files
 * whose names `wanted(name)` accepts. The name is the folder's (the
 * repository's for its top). `fetcher` is the browser's fetch, or a double.
 */
export async function fetchGitHubFolder(
        text,
        wanted,
        fetcher = globalThis.fetch
        ) {
    const link = parseGitHubLink( text );
    const {listing, location} = await folderListing( link, fetcher );
    const items = listing.filter( item => item.type === 'file' && typeof item.download_url === 'string' && wanted( item.name ) );

    if (!items.length) {
        throw new Error( 'La carpeta no tiene archivos de proyecto (esquema.sql, proyecto.databasic.json, README.md…).' );
        }

    if (items.some( item => item.size > GITHUB_FILE_LIMIT )) {
        throw new Error( 'Un archivo de la carpeta supera los 20 MB admitidos.' );
        }

    const files = await Promise.all( items.map( async item => {
        const response = await fetcher( item.download_url );

        if (!response.ok) {
            throw new Error( `No se pudo descargar ${item.name} (${response.status}).` );
            }

        return {name: item.name, data: new Uint8Array( await response.arrayBuffer() )};
        } ) );

    return {name: location.path.split( '/' ).filter( Boolean ).at( -1 ) || link.repository, files};
    }
