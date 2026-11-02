export function escapeHTML( value ) {
    return String( value )
        .replaceAll( '&', '&amp;' )
        .replaceAll( '<', '&lt;' )
        .replaceAll( '>', '&gt;' )
        .replaceAll( '"', '&quot;' )
        .replaceAll( "'", '&#39;' );
    }

export function icon( name ) {
    return `<i data-lucide="${name}" aria-hidden="true"></i>`;
    }

export function command(
        action,
        label,
        glyph,
        extra = ''
        ) {
    return `<button type="button" data-action="${action}" ${extra}>
        ${icon( glyph )}<span>${label}</span></button>`;
    }

export function check(
        label,
        key,
        checked,
        extra = ''
        ) {
    return `<label class="check"><input type="checkbox"
        data-field="${key}" ${checked ? 'checked' : ''} ${extra}>
        ${label}</label>`;
    }

export function options(
        values,
        selected
        ) {
    return values.map(
            item => {
                const [value, label] = Array.isArray( item ) ? item : [item, item];

                return `<option value="${escapeHTML( value )}"
                    ${value === selected ? 'selected' : ''}>${escapeHTML( label )}</option>`;
                }
            ).join( '' );
    }
