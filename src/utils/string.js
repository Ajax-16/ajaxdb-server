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
