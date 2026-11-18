// Each record describes one work and one print edition. Copy triples give campus, shelf and optional inventory number.
// Existing editions keep their identifiers; the historical 1912 edition is recorded separately.
const catalogWorks = [
    // Catálogo inicial.
    {
        id: 1,
        title: 'Campos de Castilla',
        authors: ['Antonio Machado'],
        genre: 'Poesía',
        cdu: '821.134.2-1',
        subjects: [1],
        year: 2006,
        isbn: '9788437608662',
        shelfmark: 'P MAC cam',
        copies: [[1, 'A', 101], [2, 'A', 102], [3, 'B', 103], [4, 'B', 115]]
        },
    {
        id: 2,
        title: 'La Lola se va a los puertos',
        authors: ['Manuel Machado', 'Antonio Machado'],
        genre: 'Teatro',
        cdu: '821.134.2-2',
        subjects: [1, 2],
        year: 1929,
        shelfmark: 'T MAC lol',
        copies: [[1, 'A', 104]]
        },
    {
        id: 3,
        title: 'Don Quijote de la Mancha, primera parte',
        authors: ['Miguel de Cervantes'],
        genre: 'Novela',
        cdu: '821.134.2-3',
        subjects: [1],
        year: 1605,
        shelfmark: 'N CER don',
        copies: [[2, 'B', 106]]
        },
    {
        id: 4,
        title: 'Lazarillo de Tormes',
        authors: [],
        genre: 'Novela',
        cdu: '821.134.2-3',
        subjects: [1],
        year: 2006,
        isbn: '9788437606606',
        shelfmark: 'N laz',
        copies: [[3, 'B', 105]]
        },
    {
        id: 5,
        title: 'The Story of Art',
        authors: ['Ernst H. Gombrich'],
        genre: 'Ensayo',
        cdu: '7',
        subjects: [2],
        year: 1950,
        shelfmark: '7 GOM sto',
        copies: [[1, 'A', 107]]
        },
    {
        id: 6,
        title: 'La fotografía como documento social',
        authors: ['Gisèle Freund'],
        genre: 'Ensayo',
        cdu: '77',
        subjects: [2, 3],
        year: 2017,
        isbn: '9788425229947',
        shelfmark: '77 FRE fot',
        copies: [[1, 'B', 108]]
        },
    {
        id: 7,
        title: 'On the Origin of Species',
        authors: ['Charles Darwin'],
        genre: 'Tratado',
        cdu: '57',
        subjects: [4],
        year: 1859,
        shelfmark: '57 DAR ori',
        copies: [[2, 'A', 109]]
        },
    {
        id: 8,
        title: 'The Variation of Animals and Plants under Domestication',
        authors: ['Charles Darwin'],
        genre: 'Tratado',
        cdu: '63',
        subjects: [4, 5],
        year: 1868,
        shelfmark: '63 DAR var',
        copies: [[3, 'A', 110]]
        },
    {
        id: 9,
        title: 'Reglas y consejos sobre investigación científica',
        authors: ['Santiago Ramón y Cajal'],
        genre: 'Ensayo',
        cdu: '001.8',
        subjects: [7, 6],
        year: 1923,
        shelfmark: '001 CAJ reg',
        copies: [[4, 'A', 111]]
        },
    {
        id: 10,
        title: 'Textura del sistema nervioso del hombre y de los vertebrados',
        authors: ['Santiago Ramón y Cajal'],
        genre: 'Tratado',
        cdu: '611.8',
        subjects: [6],
        year: 1899,
        shelfmark: '611 CAJ tex',
        copies: [[4, 'B', 112]]
        },
    {
        id: 11,
        title: 'Fundamentos de bases de datos',
        authors: ['Abraham Silberschatz', 'Henry F. Korth', 'S. Sudarshan'],
        genre: 'Manual',
        cdu: '004.65',
        subjects: [8],
        year: 2006,
        isbn: '9788448146443',
        shelfmark: '004 SIL fun',
        copies: [[2, 'A', 113], [3, 'A', 116]]
        },
    {
        id: 12,
        title: 'Notes on Nursing: What It Is, and What It Is Not',
        authors: ['Florence Nightingale'],
        genre: 'Manual',
        cdu: '616-083',
        subjects: [6],
        year: 1860,
        shelfmark: '616 NIG not',
        copies: [[4, 'B', 114]]
        },
    // Historia natural, salud, artes y letras.
    {
        id: 13,
        title: 'De humani corporis fabrica',
        authors: ['Andreas Vesalius'],
        genre: 'Tratado',
        cdu: '611',
        subjects: [6, 2],
        year: 1543,
        copies: [[4, 'B'], [4, 'A']]
        },
    {
        id: 14,
        title: 'Exercitatio anatomica de motu cordis',
        authors: ['William Harvey'],
        genre: 'Tratado',
        cdu: '612.1',
        subjects: [6, 15],
        year: 1628,
        copies: [[4, 'A']]
        },
    {
        id: 15,
        title: 'An Account of the Foxglove',
        authors: ['William Withering'],
        genre: 'Tratado',
        cdu: '615',
        subjects: [6, 4],
        year: 1785,
        copies: [[4, 'B'], [3, 'A']]
        },
    {
        id: 16,
        title: 'An Inquiry into the Causes and Effects of the Variolae Vaccinae',
        authors: ['Edward Jenner'],
        genre: 'Tratado',
        cdu: '614',
        subjects: [6, 15],
        year: 1798,
        copies: [[4, 'A']]
        },
    {
        id: 17,
        title: 'Obra de agricultura',
        authors: ['Gabriel Alonso de Herrera'],
        genre: 'Tratado',
        cdu: '63',
        subjects: [5],
        year: 1513,
        copies: [[3, 'B']]
        },
    {
        id: 18,
        title: 'Species plantarum',
        authors: ['Carl Linnaeus'],
        genre: 'Tratado',
        cdu: '58',
        subjects: [4, 5],
        year: 1753,
        copies: [[3, 'A']]
        },
    {
        id: 19,
        title: 'Insectivorous Plants',
        authors: ['Charles Darwin'],
        genre: 'Tratado',
        cdu: '58',
        subjects: [4, 13],
        year: 1875,
        copies: [[3, 'B'], [4, 'A']]
        },
    {
        id: 20,
        title: 'The Different Forms of Flowers on Plants of the Same Species',
        authors: ['Charles Darwin'],
        genre: 'Tratado',
        cdu: '58',
        subjects: [4, 5],
        year: 1877,
        copies: [[3, 'A']]
        },
    {
        id: 21,
        title: 'The Formation of Vegetable Mould, through the Action of Worms',
        authors: ['Charles Darwin'],
        genre: 'Tratado',
        cdu: '631.4',
        subjects: [5, 13],
        year: 1881,
        copies: [[3, 'B']]
        },
    {
        id: 22,
        title: 'Man and Nature',
        authors: ['George Perkins Marsh'],
        genre: 'Ensayo',
        cdu: '502',
        subjects: [13],
        year: 1864,
        copies: [[3, 'A'], [2, 'B']]
        },
    {
        id: 23,
        title: 'The Mountains of California',
        authors: ['John Muir'],
        genre: 'Ensayo',
        cdu: '502',
        subjects: [13, 1],
        year: 1898,
        copies: [[3, 'B']]
        },
    {
        id: 24,
        title: 'Our National Parks',
        authors: ['John Muir'],
        genre: 'Ensayo',
        cdu: '502',
        subjects: [13],
        year: 1901,
        copies: [[3, 'A']]
        },
    {
        id: 25,
        title: 'My First Summer in the Sierra',
        authors: ['John Muir'],
        genre: 'Diario',
        cdu: '502',
        subjects: [13, 1],
        year: 1911,
        copies: [[3, 'B']]
        },
    {
        id: 26,
        title: 'Underweysung der messung mit dem zirckel un richt scheyt',
        authors: ['Albrecht Dürer'],
        genre: 'Tratado',
        cdu: '514',
        subjects: [2, 10],
        year: 1525,
        copies: [[1, 'A']]
        },
    {
        id: 27,
        title: 'Vier Bücher von menschlicher Proportion',
        authors: ['Albrecht Dürer'],
        genre: 'Tratado',
        cdu: '7.02',
        subjects: [2, 10],
        year: 1528,
        copies: [[1, 'B']]
        },
    {
        id: 28,
        title: 'Notes on Hospitals',
        authors: ['Florence Nightingale'],
        genre: 'Ensayo',
        cdu: '614.2',
        subjects: [6, 14],
        year: 1863,
        copies: [[4, 'A']]
        },
    {
        id: 29,
        title: 'Observaciones sobre la historia natural, geografía, agricultura, población y frutos del Reyno de Valencia',
        authors: ['Antonio José Cavanilles'],
        genre: 'Tratado',
        cdu: '63',
        subjects: [5, 4, 13],
        year: 1795,
        copies: [[3, 'B']]
        },
    {
        id: 30,
        title: 'I quattro libri dell’architettura',
        authors: ['Andrea Palladio'],
        genre: 'Tratado',
        cdu: '72',
        subjects: [14, 2],
        year: 1570,
        copies: [[1, 'A']]
        },
    {
        id: 31,
        title: 'De re aedificatoria',
        authors: ['Leon Battista Alberti'],
        genre: 'Tratado',
        cdu: '72',
        subjects: [14, 2],
        year: 1485,
        copies: [[1, 'B']]
        },
    {
        id: 32,
        title: 'La Tribuna',
        authors: ['Emilia Pardo Bazán'],
        genre: 'Novela',
        cdu: '821.134.2-3',
        subjects: [1],
        year: 1883,
        copies: [[1, 'A'], [3, 'B']]
        },
    {
        id: 33,
        title: 'La madre naturaleza',
        authors: ['Emilia Pardo Bazán'],
        genre: 'Novela',
        cdu: '821.134.2-3',
        subjects: [1],
        year: 1887,
        copies: [[1, 'B']]
        },
    {
        id: 34,
        title: 'Insolación',
        authors: ['Emilia Pardo Bazán'],
        genre: 'Novela',
        cdu: '821.134.2-3',
        subjects: [1],
        year: 1889,
        copies: [[1, 'A']]
        },
    {
        id: 35,
        title: 'La piedra angular',
        authors: ['Emilia Pardo Bazán'],
        genre: 'Novela',
        cdu: '821.134.2-3',
        subjects: [1],
        year: 1891,
        copies: [[1, 'B']]
        },
    // Física, matemáticas e ingeniería de señales.
    {
        id: 36,
        title: 'Science and the Common Understanding',
        authors: ['J. Robert Oppenheimer'],
        genre: 'Ensayo',
        cdu: '53',
        subjects: [9, 15],
        year: 1954,
        copies: [[2, 'A'], [1, 'B']]
        },
    {
        id: 37,
        title: 'The Open Mind',
        authors: ['J. Robert Oppenheimer'],
        genre: 'Ensayo',
        cdu: '001',
        subjects: [9, 15],
        year: 1955,
        copies: [[2, 'B']]
        },
    {
        id: 38,
        title: 'The Feynman Lectures on Physics',
        authors: ['Richard P. Feynman', 'Robert B. Leighton', 'Matthew Sands'],
        genre: 'Manual',
        cdu: '53',
        subjects: [9],
        year: 2011,
        isbn: '9780465023820',
        copies: [[2, 'A'], [4, 'B']]
        },
    {
        id: 39,
        title: 'The Character of Physical Law',
        authors: ['Richard P. Feynman'],
        genre: 'Ensayo',
        cdu: '53',
        subjects: [9],
        year: 2017,
        isbn: '9780262533416',
        copies: [[2, 'B'], [3, 'A']]
        },
    {
        id: 40,
        title: 'Introduction to Analytic Number Theory',
        authors: ['Tom M. Apostol'],
        genre: 'Manual',
        cdu: '511',
        subjects: [10],
        year: 1976,
        isbn: '9780387901633',
        copies: [[2, 'A']]
        },
    {
        id: 41,
        title: 'Modular Functions and Dirichlet Series in Number Theory',
        authors: ['Tom M. Apostol'],
        genre: 'Manual',
        cdu: '511',
        subjects: [10],
        year: 1976,
        copies: [[2, 'B']]
        },
    {
        id: 42,
        title: 'Foundations of the Theory of Probability',
        authors: ['Andrei N. Kolmogorov'],
        genre: 'Tratado',
        cdu: '519.2',
        subjects: [10, 11],
        year: 1950,
        copies: [[2, 'A'], [4, 'B']]
        },
    {
        id: 43,
        title: 'Introductory Real Analysis',
        authors: ['Andrei N. Kolmogorov', 'Sergei V. Fomin'],
        genre: 'Manual',
        cdu: '517',
        subjects: [10],
        year: 1975,
        isbn: '9780486612263',
        copies: [[2, 'B']]
        },
    {
        id: 44,
        title: 'Signals and Systems',
        authors: ['Alan V. Oppenheim', 'Alan S. Willsky', 'S. Hamid Nawab'],
        genre: 'Manual',
        cdu: '621.3',
        subjects: [12, 10],
        year: 1996,
        isbn: '9780138147570',
        copies: [[2, 'A']]
        },
    {
        id: 45,
        title: 'New Horizons in Geometry',
        authors: ['Tom M. Apostol', 'Mamikon A. Mnatsakanian'],
        genre: 'Manual',
        cdu: '514',
        subjects: [10, 14],
        year: 2012,
        isbn: '9780883853542',
        copies: [[2, 'B'], [1, 'A']]
        },
    {
        id: 46,
        title: 'Calculus, Volume 1',
        authors: ['Tom M. Apostol'],
        genre: 'Manual',
        cdu: '517',
        subjects: [10],
        year: 1967,
        isbn: '9780471000051',
        copies: [[2, 'A'], [3, 'B']]
        },
    {
        id: 47,
        title: 'Feynman Lectures on Computation',
        authors: ['Richard P. Feynman'],
        genre: 'Manual',
        cdu: '004',
        subjects: [8, 9],
        year: 1996,
        isbn: '9780201489910',
        copies: [[2, 'B']]
        },
    {
        id: 48,
        title: 'QED: The Strange Theory of Light and Matter',
        authors: ['Richard P. Feynman'],
        genre: 'Ensayo',
        cdu: '53',
        subjects: [9],
        year: 2014,
        isbn: '9780691164090',
        copies: [[2, 'A']]
        },
    {
        id: 49,
        title: 'Discrete-Time Signal Processing',
        authors: ['Alan V. Oppenheim', 'Ronald W. Schafer'],
        genre: 'Manual',
        cdu: '621.3',
        subjects: [12],
        year: 2009,
        isbn: '9780131988422',
        copies: [[2, 'B'], [4, 'A']]
        },
    {
        id: 50,
        title: 'Feynman’s Tips on Physics',
        authors: ['Richard P. Feynman', 'Michael A. Gottlieb', 'Ralph Leighton'],
        genre: 'Manual',
        cdu: '53',
        subjects: [9],
        year: 2013,
        isbn: '9780465027972',
        copies: [[2, 'A']]
        },
    // Literatura, comunicación y métodos cuantitativos.
    {
        id: 51,
        title: 'Novelas ejemplares',
        authors: ['Miguel de Cervantes'],
        genre: 'Narrativa',
        cdu: '821.134.2-3',
        subjects: [1],
        year: 1613,
        copies: [[1, 'B']]
        },
    {
        id: 52,
        title: 'Los trabajos de Persiles y Sigismunda',
        authors: ['Miguel de Cervantes'],
        genre: 'Novela',
        cdu: '821.134.2-3',
        subjects: [1],
        year: 1617,
        copies: [[1, 'A'], [3, 'B']]
        },
    {
        id: 53,
        title: 'Bodas de sangre',
        authors: ['Federico García Lorca'],
        genre: 'Teatro',
        cdu: '821.134.2-2',
        subjects: [1, 2],
        year: 2005,
        isbn: '9788437605609',
        copies: [[1, 'B']]
        },
    {
        id: 54,
        title: 'Yerma',
        authors: ['Federico García Lorca'],
        genre: 'Teatro',
        cdu: '821.134.2-2',
        subjects: [1, 2],
        year: 2006,
        isbn: '9788437600727',
        copies: [[1, 'A']]
        },
    {
        id: 55,
        title: 'La casa de Bernarda Alba',
        authors: ['Federico García Lorca'],
        genre: 'Teatro',
        cdu: '821.134.2-2',
        subjects: [1, 2],
        year: 2006,
        isbn: '9788437622453',
        copies: [[1, 'B']]
        },
    {
        id: 56,
        title: 'The Visual Display of Quantitative Information',
        authors: ['Edward R. Tufte'],
        genre: 'Ensayo',
        cdu: '003',
        subjects: [3, 11, 14],
        year: 2001,
        copies: [[1, 'A'], [1, 'B']]
        },
    {
        id: 57,
        title: 'Envisioning Information',
        authors: ['Edward R. Tufte'],
        genre: 'Ensayo',
        cdu: '003',
        subjects: [3, 14],
        year: 1990,
        copies: [[1, 'B']]
        },
    {
        id: 58,
        title: 'Algorithms Unlocked',
        authors: ['Thomas H. Cormen'],
        genre: 'Manual',
        cdu: '004.4',
        subjects: [8],
        year: 2013,
        isbn: '9780262518802',
        copies: [[2, 'A']]
        },
    {
        id: 59,
        title: 'Introduction to Algorithms',
        authors: ['Thomas H. Cormen', 'Charles E. Leiserson', 'Ronald L. Rivest', 'Clifford Stein'],
        genre: 'Manual',
        cdu: '004.4',
        subjects: [8, 10],
        year: 2022,
        isbn: '9780262046305',
        copies: [[2, 'B']]
        },
    {
        id: 60,
        title: 'Concrete Mathematics: A Foundation for Computer Science',
        authors: ['Ronald L. Graham', 'Donald E. Knuth', 'Oren Patashnik'],
        genre: 'Manual',
        cdu: '51',
        subjects: [8, 10],
        year: 1994,
        isbn: '9780201558029',
        copies: [[2, 'A'], [3, 'B']]
        },
    {
        id: 61,
        title: 'Micrographia',
        authors: ['Robert Hooke'],
        genre: 'Tratado',
        cdu: '57',
        subjects: [4, 15],
        year: 1665,
        copies: [[4, 'B'], [3, 'A']]
        },
    {
        id: 62,
        title: 'On the Mode of Communication of Cholera',
        authors: ['John Snow'],
        genre: 'Tratado',
        cdu: '614',
        subjects: [6, 7],
        year: 1855,
        copies: [[4, 'A']]
        },
    {
        id: 63,
        title: 'The Principles of Psychology',
        authors: ['William James'],
        genre: 'Tratado',
        cdu: '159.9',
        subjects: [6],
        year: 1890,
        copies: [[4, 'B'], [2, 'A']]
        },
    {
        id: 64,
        title: 'An Introduction to Statistical Learning with Applications in R',
        authors: ['Gareth James', 'Daniela Witten', 'Trevor Hastie', 'Robert Tibshirani'],
        genre: 'Manual',
        cdu: '519.2',
        subjects: [8, 11],
        year: 2022,
        isbn: '9781071614204',
        copies: [[3, 'A'], [4, 'B']]
        },
    {
        id: 65,
        title: 'The Elements of Statistical Learning',
        authors: ['Trevor Hastie', 'Robert Tibshirani', 'Jerome Friedman'],
        genre: 'Manual',
        cdu: '519.2',
        subjects: [8, 11],
        year: 2009,
        isbn: '9780387848570',
        copies: [[4, 'B'], [2, 'A']]
        }
    ];

const catalogCampuses = [
    [1, 'Altea'],
    [2, 'Elche'],
    [3, 'Orihuela'],
    [4, 'Sant Joan d’Alacant']
    ];

const catalogSubjects = [
    [1, 'Literatura'],
    [2, 'Bellas artes'],
    [3, 'Comunicación'],
    [4, 'Biología'],
    [5, 'Agronomía'],
    [6, 'Ciencias de la salud'],
    [7, 'Metodología de la investigación'],
    [8, 'Informática'],
    [9, 'Física'],
    [10, 'Matemáticas'],
    [11, 'Probabilidad y estadística'],
    [12, 'Ingeniería de señales'],
    [13, 'Ciencias ambientales'],
    [14, 'Arquitectura y diseño'],
    [15, 'Historia de la ciencia']
    ];

// Collection interests are illustrative. They do not restrict where copies may be housed.
const catalogProfiles = [
    [1, [1, 2, 3, 14]],
    [2, [3, 4, 7, 8, 9, 10, 11, 12, 13]],
    [3, [4, 5, 11, 13]],
    [4, [4, 6, 7, 11, 15]]
    ];

const catalogFields = {
    Libro: ['id', 'titulo', 'genero', 'cdu'],
    Autor: ['id', 'nombre'],
    Autoria: ['autor_id', 'libro_id'],
    Edicion: ['id', 'libro_id', 'anio', 'isbn'],
    Campus: ['id', 'nombre'],
    Materia: ['id', 'nombre'],
    LibroMateria: ['libro_id', 'materia_id'],
    CampusMateria: ['campus_id', 'materia_id'],
    Ejemplar: ['registro', 'edicion_id', 'campus_id', 'signatura', 'estante']
    };

function firstCatalogEdition( work ) {
    return work.id * 10 + 1;
    }

function catalogCopyRows( work ) {
    // The original shelf marks and registration numbers also appear in existing classroom examples.
    const shelfmark = work.shelfmark || work.cdu + ' ' + String( work.id ).padStart( 3, '0' );

    return work.copies.map( ([campusId, shelf, originalNumber], index) => [
        originalNumber ?? 1000 + work.id * 10 + index,
        firstCatalogEdition( work ),
        campusId,
        shelfmark,
        shelf
        ] );
    }

/** Normalize the teaching collection once per document from work-level bibliography and physical holdings. */
export function libraryContents() {
    const authorNames = [...new Set( catalogWorks.flatMap( work => work.authors ) )];
    const authorIds = new Map( authorNames.map( (name, index) => [name, index + 1] ) );

    const rows = {
        Libro: catalogWorks.map( work => [work.id, work.title, work.genre, work.cdu] ),
        Autor: authorNames.map( name => [authorIds.get( name ), name] ),
        Autoria: catalogWorks.flatMap( work => work.authors.map( name => [authorIds.get( name ), work.id] ) ),
        Edicion: [
            ...catalogWorks.map( work => [firstCatalogEdition( work ), work.id, work.year, work.isbn ?? null] ),
            [12, 1, 1912, null]
            ],
        Campus: catalogCampuses,
        Materia: catalogSubjects,
        LibroMateria: catalogWorks.flatMap( work => work.subjects.map( id => [work.id, id] ) ),
        CampusMateria: catalogProfiles.flatMap( ([campus, subjects]) => subjects.map( id => [campus, id] ) ),
        Ejemplar: catalogWorks.flatMap( catalogCopyRows ).sort( (a, b) => a[0] - b[0] )
        };

    return Object.entries( catalogFields ).map( ([table, fields]) => ({table, fields, rows: rows[table]} ) );
    }
