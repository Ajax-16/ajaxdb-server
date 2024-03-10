import { pascalCaseToCamelCase } from "../utils/string.js";
import { statusCodes } from "./consts/httpStatusCodes.js";

export function getHttpRequest(payload) {

    payload = payload.toString();

    const request = {};

    const [headers, ...bodyParts] = payload.split('\r\n\r\n');

    request.method = headers.split(' ').shift();
    
    const routeAndParams = headers.split(' ')[1];

    const route = routeAndParams.split('?').shift();

    request.route = route;

    if(routeAndParams.split('?').length > 1) {
        request.params = {};
        const params = routeAndParams.split('?').pop().split('&');
        params.map(param=>{
            const [key, value] = param.split('=');
            request.params[key] = value;
        })
    }

    request.version = headers.split(' ')[2].split('/').pop().split('\r\n').shift();

    const remainingHeaders = headers.split('\r\n').slice(1); 
    remainingHeaders.forEach(header => {
        const [name, value] = header.split(': ');
        request[pascalCaseToCamelCase(name)] = value;
    });

    request.body = JSON.parse(bodyParts.join('\r\n\r\n')) || '';

    return request;

}

export function createHttpResponse({ payload, version = '1.1', statusCode = '200', contentType = 'application/json; charset=UTF-8', connection = 'keep-alive' }) {
    const statusMessage = statusCodes[statusCode];

    payload = JSON.stringify(payload);

    const contentLength = payload.length;

    const responseHeader = `HTTP/${version} ${statusCode} ${statusMessage}\r\nContent-Type: ${contentType}\r\nContent-Length: ${contentLength}\r\nConnection: ${connection}\r\n\r\n`;
    const response = `${responseHeader}${payload}`;

    return response;
}