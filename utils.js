export function countCaracters(string, caracter) {
    let counter = 0;
    for(let i = 0; i<string.length; i++) {
        if(string[i] === caracter) counter++;
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
    if(numCaracters === 0) return true;
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