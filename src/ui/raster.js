/*
 * Word 2010 cannot show SVG, so the memo carries its diagrams as PNG. The
 * browser draws the SVG text on a canvas, on a white background, at twice
 * its size so it stays readable when zoomed, and never wider or taller than
 * RASTER_MAX_SIDE pixels (large diagrams would exhaust the canvas).
 */
const RASTER_SCALE = 2;
const RASTER_MAX_SIDE = 6000;

/** The width and height written on the root <svg> by exportSVG. */
export function svgSize( svg ) {
    const root = /<svg\b[^>]*>/.exec( svg )?.[0] || '';
    const width = Number( /\swidth="([\d.]+)"/.exec( root )?.[1] );
    const height = Number( /\sheight="([\d.]+)"/.exec( root )?.[1] );

    if (!(width > 0) || !(height > 0)) {
        throw new Error( 'El diagrama no indica su tamaño; no se puede convertir en imagen.' );
        }

    return {width, height};
    }

/** The pixel size of the picture: twice the drawing, capped on its longest side. */
export function rasterSize( size ) {
    const scale = Math.min( RASTER_SCALE, RASTER_MAX_SIDE / Math.max( size.width, size.height ) );

    return {
        width: Math.max( 1, Math.round( size.width * scale ) ),
        height: Math.max( 1, Math.round( size.height * scale ) )
        };
    }

function loadImage( url ) {
    return new Promise(
            (resolve, reject) => {
                const image = new Image();

                image.onload = () => resolve( image );
                image.onerror = () => reject( new Error( 'El navegador no pudo dibujar el diagrama como imagen.' ) );
                image.src = url;
                }
            );
    }

function canvasPNG( canvas ) {
    return new Promise(
            (resolve, reject) => canvas.toBlob(
                    blob => blob ? resolve( blob ) : reject( new Error( 'El navegador no pudo crear la imagen PNG.' ) ),
                    'image/png'
                    )
            );
    }

/** PNG bytes of an SVG diagram. */
export async function svgToPNG( svg ) {
    const pixels = rasterSize( svgSize( svg ) );
    const url = URL.createObjectURL( new Blob( [svg], {type: 'image/svg+xml'} ) );

    try {
        const image = await loadImage( url );
        const canvas = document.createElement( 'canvas' );

        canvas.width = pixels.width;
        canvas.height = pixels.height;

        const context = canvas.getContext( '2d' );

        if (!context) {
            throw new Error( 'El navegador no ofrece un lienzo para crear la imagen.' );
            }

        context.fillStyle = '#ffffff';
        context.fillRect( 0, 0, pixels.width, pixels.height );
        context.drawImage( image, 0, 0, pixels.width, pixels.height );

        return new Uint8Array( await (await canvasPNG( canvas )).arrayBuffer() );
        }
    finally {
        URL.revokeObjectURL( url );
        }
    }
