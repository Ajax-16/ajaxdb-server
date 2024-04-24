export function isValidType(value, expectedType) {
    switch (expectedType) {
        case Boolean:
            return value === "true" || value === "false";
        case String:
            return typeof value === "string";
        case Number:
            return !isNaN(parseFloat(value)) && isFinite(value);
        case Object:
            return typeof value === "object" && value !== null && !Array.isArray(value);
        case Array:
            return Array.isArray(value);
        case Function:
            return typeof value === "function";
        case Symbol:
            return typeof value === "symbol";
        case BigInt:
            return typeof value === "bigint";
        case Date:
            return value instanceof Date && !isNaN(value.getTime());
        default:
            return false;
    }
}

export function convertToType(value, expectedType) {
    if (expectedType === Boolean) {
        return value === "true";
    } else if (expectedType === Number) {
        return parseFloat(value);
    } else if (expectedType === Object) {
        return JSON.parse(value);
    } else if (expectedType === Array) {
        return value.split(",").map(item => item.trim());
    } else if (expectedType === Function) {
        return eval(`(${value})`);
    } else if (expectedType === Symbol) {
        return Symbol(value);
    } else if (expectedType === BigInt) {
        return BigInt(value);
    } else if (expectedType === Date) {
        return new Date(value);
    } else if (expectedType === String) {
        return value;
    } else {
        throw new Error(`Conversion not implemented for type: ${expectedType.name}`);
    }
}