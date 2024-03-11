import { pascalCaseToCamelCase } from "../../utils/string.js";
import { statusCodes } from "./lib/httpStatusCodes.js";
import { ormParse } from "../../utils/array.js";
import { executeCommand } from "../ajx/commandHandler.js";

export function getHttpRequest(payload) {
    payload = payload.toString();
    const request = {};

    const [headers, ...bodyParts] = payload.split('\r\n\r\n');

    request.method = headers.split(' ').shift();

    const routeAndParams = headers.split(' ')[1];
    const route = routeAndParams.split('?').shift();
    request.route = route;

    if (routeAndParams.split('?').length > 1) {
        request.params = {};
        const params = routeAndParams.split('?').pop().split('&');
        params.map(param => {
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

    if (bodyParts[0] !== '') {
        try {
            request.body = JSON.parse(bodyParts.join('\r\n\r\n'));
        } catch (error) {
            console.error('Error parsing JSON body:', error.message);
        }
    } else {
        request.body = '';
    }

    return request;
}


export function getHttpResponse(plainResponse) {

    const response = {};

    const [headers, ...bodyParts] = plainResponse.split('\r\n\r\n');

    response.version = headers.split('/')[1].split(' ').shift();

    response.statusCode = headers.split(' ')[1];

    response.statusMessage = headers.split(' ')[2].split('/').pop().split('\r\n').shift();

    const remainingHeaders = headers.split('\r\n').slice(1);
    remainingHeaders.forEach(header => {
        const [name, value] = header.split(': ');
        response[pascalCaseToCamelCase(name)] = value;
    });

    response.body = JSON.parse(bodyParts.join('\r\n\r\n')) || '';

    return response;

}

export function createHttpResponse({ payload, version = '1.1', statusCode = '200', contentType = 'application/json; charset=UTF-8', connection = 'keep-alive' }) {
    const statusMessage = statusCodes[statusCode];

    payload = ormParse(payload);
    payload = JSON.stringify(payload);

    const contentLength = payload.length;

    const responseHeader = `HTTP/${version} ${statusCode} ${statusMessage}\r\nContent-Type: ${contentType}\r\nContent-Length: ${contentLength}\r\nConnection: ${connection}\r\n\r\n`;
    const response = `${responseHeader}${payload}`;

    return response;
}


export async function router({ method, route = '/', params, body }) {

    let command = '';

    const database = route.split('/')[1];
    const table = route.split('/')[2];

    if(!database) {
        throw new Error('No database specified');
    }

    await executeCommand(`INIT ${database}`);

    switch (method) {

        case 'GET':
            command = 'FIND ';

            if (!table) {
                throw new Error('No table specified');
            }

            if (body || params) {
                let columns = '*';

                if (body && body.columns) {
                    columns = body.columns.join(', ');
                } else if (params && params.columns) {
                    columns = decodeURIComponent(params.columns);
                }

                command += columns + ' IN ';

                if (route.split('/')[3]) {

                    throw new Error('Invalid format for GET method');

                }

                command += table;

                const whereClause = body ? body.where || null : params && params.where || null;

                if (whereClause) {
                    command += ' WHERE ' + decodeURIComponent(whereClause);
                }

                const offsetClause = body ? body.offset || null : params && params.offset || null;

                if (offsetClause) {
                    command += ' OFFSET ' + decodeURIComponent(offsetClause);
                }

                const limitClause = body ? body.limit || null : params && params.limit || null;

                if (limitClause) {
                    command += ' LIMIT ' + decodeURIComponent(limitClause);
                }

            } else {

                command += '* IN ' + table;

                if (route.split('/')[3]) {

                    command += ' WHERE PRIMARY_KEY = ' + route.split('/')[3]

                }

            }

            return command;

        case 'POST':

            if(!table) {
                if(!body) {
                    throw new Error('No table specifications');
                }else{

                    if(!body.name) {
                        throw new Error('No name specification for new table');
                    }

                    command += `CREATE TABLE ${body.name} (${body.primaryKey} as PRIMARY_KEY`

                    if(!body.columns) {
                        throw new Error('There must be at least one column');
                    }else {
                        body.columns.forEach((column)=>{
                            command += `, ${column}`
                        })
    
                        command += ')';
                    }

                }
            }else {
                command = `INSERT INTO ${table} (`

                let manyElements = false;

                for (const key in body) {
                    if(manyElements) {
                        command += `, ${key}`;
                    }else{
                        command += `${key}`;
                        manyElements = true;
                    }
                }

                manyElements = false;

                command += `) VALUES (`;

                for (const key in body) {
                    if(manyElements) {
                        command += `, '${body[key]}'`;
                    }else {
                        command += `'${body[key]}'`;
                        manyElements = true;
                    }
                    
                }

                command += ')';

            }

            return command;

        case 'PUT':

        if(!body) {
            throw new Error('Invalid format for PUT method');
        }

        if(!table) {
                throw new Error('Invalid format for PUT method');
                // TODO: Edición de una tabla (Edición de las columnas de una tabla)
        }else {
            
            command = `UPDATE ${table} SET `

            let manyElements = false;

            for (const key in body) {
                if(manyElements) {
                    command += `, ${key} = '${body[key]}'`;
                }else{
                    command += `${key} = '${body[key]}'`;
                    manyElements = true;
                }
            }

            if(route.split('/')[3]) {
                command += ` WHERE PRIMARY_KEY = '${route.split('/')[3]}'`;
            }else if(params) {
                command += ` WHERE ${decodeURIComponent(params.where)}`;
            }else {
                throw new Error('No elements selected for updating');
            }

            console.log(command);

        }

        return command;

        case 'DELETE':

        if(!table) {
            command = `DROP DATABASE ${database}`;
        }else {
            
            command = `DELETE FROM ${table}`

            if(route.split('/')[3]) {
                command += ` WHERE PRIMARY_KEY = '${route.split('/')[3]}'`;
            }else if(params && params.where) {
                command += ` WHERE ${decodeURIComponent(params.where)}`;
            }
            else if(body && body.where) {
                command += ` WHERE ${body.where}`;
            }else {
                throw new Error('No elements selected for deleting');
            }

        }

        console.log(command)

            return command;

        default:
            throw new Error(`Unsupported method ${method}`);
    }


}
