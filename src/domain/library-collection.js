const catalogWorks = [
    {
        id: 1,
        title: 'Campos de Castilla',
        authors: ['Antonio Machado'],
        genre: 'Poesía',
        subjects: [1],
        year: 2006,
        isbn: '9788437608662'
        },
    {
        id: 2,
        title: 'La Lola se va a los puertos',
        authors: ['Manuel Machado', 'Antonio Machado'],
        genre: 'Teatro',
        subjects: [1, 2],
        year: 1929
        },
    {
        id: 3,
        title: 'Don Quijote de la Mancha, primera parte',
        authors: ['Miguel de Cervantes'],
        genre: 'Novela',
        subjects: [1],
        year: 1605
        },
    {
        id: 4,
        title: 'Lazarillo de Tormes',
        authors: [],
        genre: 'Novela',
        subjects: [1],
        year: 2006,
        isbn: '9788437606606'
        },
    {
        id: 5,
        title: 'The Story of Art',
        authors: ['Ernst H. Gombrich'],
        genre: 'Ensayo',
        subjects: [2],
        year: 1950
        },
    {
        id: 6,
        title: 'La fotografía como documento social',
        authors: ['Gisèle Freund'],
        genre: 'Ensayo',
        subjects: [2, 3],
        year: 2017,
        isbn: '9788425229947'
        },
    {
        id: 7,
        title: 'On the Origin of Species',
        authors: ['Charles Darwin'],
        genre: 'Tratado',
        subjects: [4],
        year: 1859
        },
    {
        id: 8,
        title: 'The Variation of Animals and Plants under Domestication',
        authors: ['Charles Darwin'],
        genre: 'Tratado',
        subjects: [4, 5],
        year: 1868
        },
    {
        id: 9,
        title: 'Reglas y consejos sobre investigación científica',
        authors: ['Santiago Ramón y Cajal'],
        genre: 'Ensayo',
        subjects: [7, 6],
        year: 1923
        },
    {
        id: 10,
        title: 'Textura del sistema nervioso del hombre y de los vertebrados',
        authors: ['Santiago Ramón y Cajal'],
        genre: 'Tratado',
        subjects: [6],
        year: 1899
        },
    {
        id: 11,
        title: 'Fundamentos de bases de datos',
        authors: ['Abraham Silberschatz', 'Henry F. Korth', 'S. Sudarshan'],
        genre: 'Manual',
        subjects: [8],
        year: 2006,
        isbn: '9788448146443'
        },
    {
        id: 12,
        title: 'Notes on Nursing: What It Is, and What It Is Not',
        authors: ['Florence Nightingale'],
        genre: 'Manual',
        subjects: [6],
        year: 1860
        },
    // Historia natural, salud, artes y letras.
    {
        id: 13,
        title: 'De humani corporis fabrica',
        authors: ['Andreas Vesalius'],
        genre: 'Tratado',
        subjects: [6, 2],
        year: 1543
        },
    {
        id: 14,
        title: 'Exercitatio anatomica de motu cordis',
        authors: ['William Harvey'],
        genre: 'Tratado',
        subjects: [6, 15],
        year: 1628
        },
    {
        id: 15,
        title: 'An Account of the Foxglove',
        authors: ['William Withering'],
        genre: 'Tratado',
        subjects: [6, 4],
        year: 1785
        },
    {
        id: 16,
        title: 'An Inquiry into the Causes and Effects of the Variolae Vaccinae',
        authors: ['Edward Jenner'],
        genre: 'Tratado',
        subjects: [6, 15],
        year: 1798
        },
    {
        id: 17,
        title: 'Obra de agricultura',
        authors: ['Gabriel Alonso de Herrera'],
        genre: 'Tratado',
        subjects: [5],
        year: 1513
        },
    {
        id: 18,
        title: 'Species plantarum',
        authors: ['Carl Linnaeus'],
        genre: 'Tratado',
        subjects: [4, 5],
        year: 1753
        },
    {
        id: 19,
        title: 'Insectivorous Plants',
        authors: ['Charles Darwin'],
        genre: 'Tratado',
        subjects: [4, 13],
        year: 1875
        },
    {
        id: 20,
        title: 'The Different Forms of Flowers on Plants of the Same Species',
        authors: ['Charles Darwin'],
        genre: 'Tratado',
        subjects: [4, 5],
        year: 1877
        },
    {
        id: 21,
        title: 'The Formation of Vegetable Mould, through the Action of Worms',
        authors: ['Charles Darwin'],
        genre: 'Tratado',
        subjects: [5, 13],
        year: 1881
        },
    {
        id: 22,
        title: 'Man and Nature',
        authors: ['George Perkins Marsh'],
        genre: 'Ensayo',
        subjects: [13],
        year: 1864
        },
    {
        id: 23,
        title: 'The Mountains of California',
        authors: ['John Muir'],
        genre: 'Ensayo',
        subjects: [13, 1],
        year: 1898
        },
    {
        id: 24,
        title: 'Our National Parks',
        authors: ['John Muir'],
        genre: 'Ensayo',
        subjects: [13],
        year: 1901
        },
    {
        id: 25,
        title: 'My First Summer in the Sierra',
        authors: ['John Muir'],
        genre: 'Diario',
        subjects: [13, 1],
        year: 1911
        },
    {
        id: 26,
        title: 'Underweysung der messung mit dem zirckel un richt scheyt',
        authors: ['Albrecht Dürer'],
        genre: 'Tratado',
        subjects: [2, 10],
        year: 1525
        },
    {
        id: 27,
        title: 'Vier Bücher von menschlicher Proportion',
        authors: ['Albrecht Dürer'],
        genre: 'Tratado',
        subjects: [2, 10],
        year: 1528
        },
    {
        id: 28,
        title: 'Notes on Hospitals',
        authors: ['Florence Nightingale'],
        genre: 'Ensayo',
        subjects: [6, 14],
        year: 1863
        },
    {
        id: 29,
        title: 'Observaciones sobre la historia natural, geografía, agricultura, población y frutos del Reyno de Valencia',
        authors: ['Antonio José Cavanilles'],
        genre: 'Tratado',
        subjects: [5, 4, 13],
        year: 1795
        },
    {
        id: 30,
        title: 'I quattro libri dell’architettura',
        authors: ['Andrea Palladio'],
        genre: 'Tratado',
        subjects: [14, 2],
        year: 1570
        },
    {
        id: 31,
        title: 'De re aedificatoria',
        authors: ['Leon Battista Alberti'],
        genre: 'Tratado',
        subjects: [14, 2],
        year: 1485
        },
    {
        id: 32,
        title: 'La Tribuna',
        authors: ['Emilia Pardo Bazán'],
        genre: 'Novela',
        subjects: [1],
        year: 1883
        },
    {
        id: 33,
        title: 'La madre naturaleza',
        authors: ['Emilia Pardo Bazán'],
        genre: 'Novela',
        subjects: [1],
        year: 1887
        },
    {
        id: 34,
        title: 'Insolación',
        authors: ['Emilia Pardo Bazán'],
        genre: 'Novela',
        subjects: [1],
        year: 1889
        },
    {
        id: 35,
        title: 'La piedra angular',
        authors: ['Emilia Pardo Bazán'],
        genre: 'Novela',
        subjects: [1],
        year: 1891
        },
    // Física, matemáticas e ingeniería de señales.
    {
        id: 36,
        title: 'Science and the Common Understanding',
        authors: ['J. Robert Oppenheimer'],
        genre: 'Ensayo',
        subjects: [9, 15],
        year: 1954
        },
    {
        id: 37,
        title: 'The Open Mind',
        authors: ['J. Robert Oppenheimer'],
        genre: 'Ensayo',
        subjects: [9, 15],
        year: 1955
        },
    {
        id: 38,
        title: 'The Feynman Lectures on Physics',
        authors: ['Richard P. Feynman', 'Robert B. Leighton', 'Matthew Sands'],
        genre: 'Manual',
        subjects: [9],
        year: 2011,
        isbn: '9780465023820'
        },
    {
        id: 39,
        title: 'The Character of Physical Law',
        authors: ['Richard P. Feynman'],
        genre: 'Ensayo',
        subjects: [9],
        year: 2017,
        isbn: '9780262533416'
        },
    {
        id: 40,
        title: 'Introduction to Analytic Number Theory',
        authors: ['Tom M. Apostol'],
        genre: 'Manual',
        subjects: [10],
        year: 1976,
        isbn: '9780387901633'
        },
    {
        id: 41,
        title: 'Modular Functions and Dirichlet Series in Number Theory',
        authors: ['Tom M. Apostol'],
        genre: 'Manual',
        subjects: [10],
        year: 1976
        },
    {
        id: 42,
        title: 'Foundations of the Theory of Probability',
        authors: ['Andrei N. Kolmogorov'],
        genre: 'Tratado',
        subjects: [10, 11],
        year: 1950
        },
    {
        id: 43,
        title: 'Introductory Real Analysis',
        authors: ['Andrei N. Kolmogorov', 'Sergei V. Fomin'],
        genre: 'Manual',
        subjects: [10],
        year: 1975,
        isbn: '9780486612263'
        },
    {
        id: 44,
        title: 'Signals and Systems',
        authors: ['Alan V. Oppenheim', 'Alan S. Willsky', 'S. Hamid Nawab'],
        genre: 'Manual',
        subjects: [12, 10],
        year: 1996,
        isbn: '9780138147570'
        },
    {
        id: 45,
        title: 'New Horizons in Geometry',
        authors: ['Tom M. Apostol', 'Mamikon A. Mnatsakanian'],
        genre: 'Manual',
        subjects: [10, 14],
        year: 2012,
        isbn: '9780883853542'
        },
    {
        id: 46,
        title: 'Calculus, Volume 1',
        authors: ['Tom M. Apostol'],
        genre: 'Manual',
        subjects: [10],
        year: 1967,
        isbn: '9780471000051'
        },
    {
        id: 47,
        title: 'Feynman Lectures on Computation',
        authors: ['Richard P. Feynman'],
        genre: 'Manual',
        subjects: [8, 9],
        year: 1996,
        isbn: '9780201489910'
        },
    {
        id: 48,
        title: 'QED: The Strange Theory of Light and Matter',
        authors: ['Richard P. Feynman'],
        genre: 'Ensayo',
        subjects: [9],
        year: 2014,
        isbn: '9780691164090'
        },
    {
        id: 49,
        title: 'Discrete-Time Signal Processing',
        authors: ['Alan V. Oppenheim', 'Ronald W. Schafer'],
        genre: 'Manual',
        subjects: [12],
        year: 2009,
        isbn: '9780131988422'
        },
    {
        id: 50,
        title: 'Feynman’s Tips on Physics',
        authors: ['Richard P. Feynman', 'Michael A. Gottlieb', 'Ralph Leighton'],
        genre: 'Manual',
        subjects: [9],
        year: 2013,
        isbn: '9780465027972'
        },
    // Literatura, comunicación y métodos cuantitativos.
    {
        id: 51,
        title: 'Novelas ejemplares',
        authors: ['Miguel de Cervantes'],
        genre: 'Narrativa',
        subjects: [1],
        year: 1613
        },
    {
        id: 52,
        title: 'Los trabajos de Persiles y Sigismunda',
        authors: ['Miguel de Cervantes'],
        genre: 'Novela',
        subjects: [1],
        year: 1617
        },
    {
        id: 53,
        title: 'Bodas de sangre',
        authors: ['Federico García Lorca'],
        genre: 'Teatro',
        subjects: [1, 2],
        year: 2005,
        isbn: '9788437605609'
        },
    {
        id: 54,
        title: 'Yerma',
        authors: ['Federico García Lorca'],
        genre: 'Teatro',
        subjects: [1, 2],
        year: 2006,
        isbn: '9788437600727'
        },
    {
        id: 55,
        title: 'La casa de Bernarda Alba',
        authors: ['Federico García Lorca'],
        genre: 'Teatro',
        subjects: [1, 2],
        year: 2006,
        isbn: '9788437622453'
        },
    {
        id: 56,
        title: 'The Visual Display of Quantitative Information',
        authors: ['Edward R. Tufte'],
        genre: 'Ensayo',
        subjects: [3, 11, 14],
        year: 2001
        },
    {
        id: 57,
        title: 'Envisioning Information',
        authors: ['Edward R. Tufte'],
        genre: 'Ensayo',
        subjects: [3, 14],
        year: 1990
        },
    {
        id: 58,
        title: 'Algorithms Unlocked',
        authors: ['Thomas H. Cormen'],
        genre: 'Manual',
        subjects: [8],
        year: 2013,
        isbn: '9780262518802'
        },
    {
        id: 59,
        title: 'Introduction to Algorithms',
        authors: ['Thomas H. Cormen', 'Charles E. Leiserson', 'Ronald L. Rivest', 'Clifford Stein'],
        genre: 'Manual',
        subjects: [8, 10],
        year: 2022,
        isbn: '9780262046305'
        },
    {
        id: 60,
        title: 'Concrete Mathematics: A Foundation for Computer Science',
        authors: ['Ronald L. Graham', 'Donald E. Knuth', 'Oren Patashnik'],
        genre: 'Manual',
        subjects: [8, 10],
        year: 1994,
        isbn: '9780201558029'
        },
    {
        id: 61,
        title: 'Micrographia',
        authors: ['Robert Hooke'],
        genre: 'Tratado',
        subjects: [4, 15],
        year: 1665
        },
    {
        id: 62,
        title: 'On the Mode of Communication of Cholera',
        authors: ['John Snow'],
        genre: 'Tratado',
        subjects: [6, 7],
        year: 1855
        },
    {
        id: 63,
        title: 'The Principles of Psychology',
        authors: ['William James'],
        genre: 'Tratado',
        subjects: [6],
        year: 1890
        },
    {
        id: 64,
        title: 'An Introduction to Statistical Learning with Applications in R',
        authors: ['Gareth James', 'Daniela Witten', 'Trevor Hastie', 'Robert Tibshirani'],
        genre: 'Manual',
        subjects: [8, 11],
        year: 2022,
        isbn: '9781071614204'
        },
    {
        id: 65,
        title: 'The Elements of Statistical Learning',
        authors: ['Trevor Hastie', 'Robert Tibshirani', 'Jerome Friedman'],
        genre: 'Manual',
        subjects: [8, 11],
        year: 2009,
        isbn: '9780387848570'
        }
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

const catalogFields = {
    Libro: ['id', 'titulo', 'genero', 'anio_edicion', 'isbn'],
    Autor: ['id', 'nombre'],
    Tema: ['id', 'nombre'],
    Autoria: ['autor_id', 'libro_id'],
    LibroTema: ['libro_id', 'tema_id']
    };

/** Each title is represented by the print edition identified in the course bibliography. */
export function libraryContents() {
    const authorNames = [...new Set( catalogWorks.flatMap( work => work.authors ) )];
    const authorIds = new Map( authorNames.map( (name, index) => [name, index + 1] ) );

    const rows = {
        Libro: catalogWorks.map( work => [
            work.id, work.title, work.genre, work.year, work.isbn ?? null
            ] ),
        Autor: authorNames.map( name => [authorIds.get( name ), name] ),
        Tema: catalogSubjects,
        Autoria: catalogWorks.flatMap(
                work => work.authors.map( name => [authorIds.get( name ), work.id] )
                ),
        LibroTema: catalogWorks.flatMap(
                work => work.subjects.map( id => [work.id, id] )
                )
        };

    return Object.entries( catalogFields ).map(
            ([table, fields]) => ({table, fields, rows: rows[table]})
            );
    }
