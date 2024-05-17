export function countCaracters(string, caracter) {
    let counter = 0;
    for (let i = 0; i < string.length; i++) {
        if (string[i] === caracter) counter++;
    }
    return counter;
}

export function filterCaracters(string, caracter, limit) {
    let numCaracters = 0;
    let counter = 0;
    while (numCaracters < limit + 1 && counter < string.length) {
        if (string[counter] === caracter) {
            numCaracters++;
        }
        counter++;
    }
    if (numCaracters === 0) return true;
    return numCaracters === limit;
}

export function cleanColumns(columns) {
    return columns
        .replace(/\s+/g, ' ')
        .replace(/,\s*/g, ',')
        .replace(/\(\s*/g, '(')
        .replace(/\s*\)/g, ')')
        .trim()
        .split(',');
}

export function pascalCaseToCamelCase(input) {
    const camelCaseString = input.replace(/-/g, '');
    return camelCaseString.charAt(0).toLowerCase() + camelCaseString.slice(1);
}


export function clean(value) {
    if (typeof value === 'string') {
        if (value.toUpperCase() === 'UNDEFINED') {
            return undefined;
        }
        if (value.toUpperCase() === 'NULL') {
            return null;
        }
        if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
            return value.substring(1, value.length - 1);
        } else {
            const parsedValue = parseFloat(value);
            return !isNaN(parsedValue) ? parsedValue : value;
        }
    } else {
        return value;
    }
}

export function retainSplit(str, ...delimiters) {
    let result = [];
    let startIndex = 0;

    for (let i = 0; i < str.length; i++) {
        for (const delimiter of delimiters) {
            if (typeof delimiter === 'string') {
                if (str.substring(i, i + delimiter.length) === delimiter) {
                    result.push(str.substring(startIndex, i));
                    result.push(delimiter.trim());
                    startIndex = i + delimiter.length;
                }
            } else if (delimiter instanceof RegExp) {
                const match = str.substring(i).match(delimiter);
                if (match && match.index === 0) {
                    result.push(str.substring(startIndex, i));
                    result.push(match[0].trim());
                    startIndex = i + match[0].length;
                }
            }
        }
    }

    // Se agrega la parte restante de la cadena al resultado
    result.push(str.substring(startIndex));

    return result;
}
