import { validateDocument } from '../domain/model.js';

function identifier( name ) {
    return `"${name.replaceAll( '"', '""' )}"`;
    }

function sqlTableName( table ) {
    return table.namespace
        ? `${identifier( table.namespace )}.${identifier( table.name )}`
        : identifier( table.name );
    }

function sqlDataType( type ) {
    // The course's NUMBER notation stays in the model; the SQL target uses
    // NUMERIC. Explicit precision and scale are preserved, not inferred.
    return type.trim().toUpperCase().replace(
            /^NUMBER(?=\(|$)/,
            'NUMERIC'
            );
    }

export function exportSQL( model ) {
    const errors = validateDocument( model ).filter( issue => issue.level === 'error' );

    if (errors.length) {
        throw new Error( errors[0].message );
        }

    const sections = [
        '-- DataBasic · SQL de estudio (sintaxis tipo PostgreSQL / SQL estándar)',
        '-- Revisar el resultado para el motor de base de datos elegido.',
        '-- NUMBER se exporta como NUMERIC; escalas negativas requieren PostgreSQL 15 o posterior.',
        '-- Los mínimos de participación de los hijos no se imponen con una FK.'
        ];

    for (const table of model.tables.filter( item => item.kind === 'entity' )) {
        if (!table.columns.length) {
            throw new Error( `${table.name}: añade al menos una columna antes de exportar SQL.` );
            }

        const lines = table.columns.map(
                field => `    ${identifier( field.name )} ${sqlDataType( field.type )}`
                    + (field.required ? ' NOT NULL' : '')
                    + (field.defaultValue.trim() ? ` DEFAULT ${field.defaultValue.trim()}` : '')
                );

        const primary = table.columns.filter( field => field.primary );

        if (primary.length) {
            lines.push(
                    `    PRIMARY KEY (${primary.map( field => identifier( field.name ) ).join( ', ' )})`
                    );
            }

        sections.push( `CREATE TABLE ${sqlTableName( table )} (\n${lines.join( ',\n' )}\n);` );
        }

    for (const table of model.tables.filter( item => item.kind === 'entity' )) {
        for (const index of table.indexes) {
            const fields = index.columns.map(
                    id => identifier( table.columns.find( field => field.id === id ).name )
                    );

            sections.push(
                    `CREATE ${index.unique ? 'UNIQUE ' : ''}INDEX ${identifier( index.name )}`
                        + ` ON ${sqlTableName( table )} (${fields.join( ', ' )});`
                    );
            }
        }

    for (const relation of model.relationships) {
        const parent = model.tables.find( table => table.id === relation.parentId );
        const child = model.tables.find( table => table.id === relation.childId );
        const parentColumns = relation.mappings.map(
                pair => identifier( parent.columns.find( field => field.id === pair.parentColumnId ).name )
                );
        const childColumns = relation.mappings.map(
                pair => identifier( child.columns.find( field => field.id === pair.childColumnId ).name )
                );

        if (['zero-one', 'one-one'].includes( relation.cardinality )) {
            sections.push(
                    `ALTER TABLE ${sqlTableName( child )}\n`
                        + `    ADD CONSTRAINT ${identifier( `${relation.name}_unique` )}`
                        + ` UNIQUE (${childColumns.join( ', ' )});`
                    );
            }

        sections.push(
                `ALTER TABLE ${sqlTableName( child )}\n`
                    + `    ADD CONSTRAINT ${identifier( relation.name )}\n`
                    + `    FOREIGN KEY (${childColumns.join( ', ' )})\n`
                    + `    REFERENCES ${sqlTableName( parent )} (${parentColumns.join( ', ' )})\n`
                    + `    ON DELETE ${relation.onDelete}\n`
                    + `    ON UPDATE ${relation.onUpdate};`
                );
        }

    for (const view of model.tables.filter( item => item.kind === 'view' )) {
        if (!view.definition.trim()) {
            throw new Error( `${view.name}: falta la consulta de definición de la vista.` );
            }

        sections.push(
                `CREATE VIEW ${sqlTableName( view )} AS\n${view.definition.trim().replace( /;+$/, '' )};`
                );
        }

    return `${sections.join( '\n\n' )}\n`;
    }
