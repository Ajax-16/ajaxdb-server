export function getArrayDimensions(arr) {
    let dimensions = 0;
    let temp = [...arr];

    while (Array.isArray(temp)) {
        dimensions++;
        temp = temp[0];
    }

    return dimensions;
}