/** Every opened element must be closed by the same name, in order; null when balanced. */
export function unbalancedTag( xml ) {
    const stack = [];

    for (const match of xml.matchAll( /<(\/?)([A-Za-z][\w.:-]*)[^>]*?(\/?)>/g )) {
        const [, closing, name, selfClosing] = match;

        if (selfClosing) {
            continue;
            }

        if (!closing) {
            stack.push( name );
            continue;
            }

        if (stack.pop() !== name) {
            return name;
            }
        }

    return stack.length ? stack.at( -1 ) : null;
    }
