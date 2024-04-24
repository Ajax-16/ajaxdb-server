import { requestHeaderDictionary } from "./lib/nueHeaderDictionary.js";
import { convertToType, isValidType } from "./lib/typeChecker.js";

export function parseNueRequest(rawRequest) {

    rawRequest = rawRequest.toString();

    const requestRegex = /^(NUE)(?:\r\n((?:\s*\w+\s*=\s*\w+\s*\r\n)*))\r+\n+([\s\S]*)$/ui;
    let headers, body;
    const requestMatch = rawRequest.match(requestRegex);

    headers = requestMatch[2].split("\r\n");
    
    headers.pop();

    if (headers.length > 0) {
        headers = parseRequestHeaders(headers);
    }
    if(requestMatch[3]) {
        body = requestMatch[3].trim();
    }

    return { headers, body }

}

export function createNueResponse(resHeaders, resBody) {
    let response = "NUE\r\n";
    for (const [key, value] of Object.entries(resHeaders)) {
        response = response.concat(`${key} = ${value}\r\n`);
    }
    response = response.concat("\r\n");
    if (resBody) {
        resBody = JSON.stringify(resBody);
        response = response.concat(resBody);
    }

    return response;
}

export function parseRequestHeaders(headers) {
    const headersObject = {};
    for (const header of headers) {
        const [key, value] = header.split("=").map(item => item.trim());
        if (key in requestHeaderDictionary) {
            const expectedType = requestHeaderDictionary[key].type;
            if (isValidType(value, expectedType)) {
                headersObject[key] = convertToType(value, expectedType);
            } else {
                throw new Error(`The value type for the "${key}" header is not the expected type. Expected value type: ${expectedType.name}`);
            }
        } else {
            throw new Error(`Unknown "${key}" header for request headers`);
        }
    }
    return headersObject;
}
