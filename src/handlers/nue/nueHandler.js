import { DB, dropDb, describeDatabase, createDb } from 'nuedb_core';
import { verifySyntax } from '../syntaxHandler.js';
import { clean } from "../../utils/string.js";
import { createNueResponse } from './nueMessageHandler.js';
import { ormParse } from '../../utils/orm.js';
import bcryptjs from "bcryptjs";
import { getConditions, parsePrivs } from './nueUtils.js';

let currentDB = 'placeholder';
const sysDB = new DB();
await sysDB.init('system', 'nue');
let dbName = ''
let user = { userData: null, hasAccess: false }
let result;

export async function handleNueRequest(headers, body) {
    try {
        await handlePreRequestHeaders(headers);
        if (body) {
            const allRequests = body.split(';')
            const allResponses = []
            for (const req of allRequests) {
                allResponses.push(await executeCommand(req))
            }
            const finalRes = createNueResponse({ Status: "OK" }, allResponses);
            await handlePostRequestHeaders(headers);
            return finalRes;
        }
        const res = createNueResponse({ Status: "OK" });
        await handlePostRequestHeaders(headers);
        user = { userData: null, hasAccess: false }
        return res;
    } catch (err) {
        return createNueResponse({ Status: "ERROR" }, [err.message]);
    }
}

async function handlePreRequestHeaders(headers) {
    for (const [header, value] of Object.entries(headers)) {

        switch (header) {
            case "HandShake":

                break;
            case "Authorization":

                const [authType, auth] = value.split(" ");

                switch (authType) {
                    case 'Classic':
                        const [username, password] = auth.split(':');

                        let currentUser = await sysDB.find({
                            tableName: 'user',
                            conditions: [
                                {
                                    condition: 'username',
                                    operator: '=',
                                    conditionValue: username
                                }
                            ]
                        })

                        const userFromDB = ormParse(currentUser);

                        if (userFromDB.id !== undefined) {
                            if (!userFromDB.password) {
                                user.userData = userFromDB;
                                user.hasAccess = true;
                            } else {
                                const uncrpyptedPasswd = bcryptjs.compareSync(password, userFromDB.password);
                                if (uncrpyptedPasswd) {
                                    user.userData = userFromDB;
                                    user.hasAccess = true;
                                } else {
                                    throw new Error('auth failed!')
                                }
                            }
                        }else {
                            throw new Error(`User ${username} does't exist!`)
                        }
                        break;
                }
                break;
        }
    }
}

async function handlePostRequestHeaders(headers) {
    for (const header in headers) {
        switch (header) {
            case "Save":
                if (user.hasAccess) {
                    if (currentDB instanceof DB) {
                        await currentDB.save();
                    }
                    await sysDB.save();
                } else {
                    throw new Error('auth failed!')
                }

                break;
        }
    }
}

export async function executeCommand(rawCommand) {

    if (!user.hasAccess) {
        throw new Error('Authorization failed! You can\'t access any resource!');
    }

    let { commandMatch, command } = verifySyntax(rawCommand);

    const commandParts = command.split(' ');
    const action = commandParts[0].toUpperCase().trim();

    switch (action) {

        case 'INIT':
        case 'USE':
            dbName = commandParts[1].split(';').shift();
            currentDB = new DB();
            const init = await currentDB.init('data', dbName);
            if (init) {
                result = `Using database: ${dbName}`;
            } else {
                throw new Error(`Database ${dbName} doesn't exist.`);
            }
            break;

        case 'WHOAMI':

            result = user.userData.username;

        break;

        case 'CREATE':
            if (!user.userData.can_create) {
                throw new Error(`User ${user.userData.username} has not privileges to perform this action.`)
            }

            const element = commandMatch[1];
            const elementName = commandMatch[2].trim();

            let parameters = commandMatch[3];

            if (element && (element.toUpperCase() === 'DATABASE' || element.toUpperCase() === 'DB')) {
                if (parameters) {
                    throw new Error('Unexpected parameters on "CREATE DATABASE" instruction.');
                }

                const isDb = ormParse(sysDB.find({
                    tableName: 'database',
                    conditions: [
                        { condition: 'name', operator: '=', conditionValue: elementName }
                    ]
                }));

                if (isDb.id === undefined) {
                    await sysDB.insert({ tableName: 'database', values: [elementName] })
                }

                result = await createDb('data', elementName);

            } else if (element && (element.toUpperCase() === 'TABLE' || element.toUpperCase() === 'TB')) {
                if (!(currentDB instanceof DB)) {
                    throw new Error('No database intialized. Use "INIT/USE <database_name>" to initialize a database.');
                }
                if (!parameters) {
                    throw new Error('No parameters specified for create table command.')
                }
                parameters = parameters.split(',');
                let primaryKeyCount = 0;
                let pk, pkPos;
                for (let i = 0; i < parameters.length; i++) {
                    const pkMatch = parameters[i].match(/^\s*(\w+)\s+as\s+primary_key\s*$/ui);
                    if (pkMatch) {
                        primaryKeyCount++;
                        pk = pkMatch[1]
                        pkPos = i;
                    } else {
                        parameters[i] = parameters[i].trim();
                    }
                }
                if (primaryKeyCount > 0) {
                    parameters.splice(pkPos, 1)
                }
                if (primaryKeyCount > 1) {
                    throw new Error('Unable to specify more than one primary key by table.')
                }

                result = await currentDB.createTable({ tableName: elementName, primaryKey: pk, columns: parameters })
            }

            break;

        case 'ADD':

            if (!user.userData.can_create) {
                throw new Error(`User ${user.userData.username} has not privileges to perform this action.`)
            }

            const addUsername = commandMatch[1];
            let addPassword = commandMatch[2];
            let addPrivs = commandMatch[3];

            // verify username doesn't exist

            const addUserExist = ormParse(await sysDB.find({
                tableName: 'user',
                conditions: [{
                    condition: 'username',
                    operator: '=',
                    conditionValue: clean(addUsername)
                }]
            }))

            if (addUserExist.id !== undefined) {
                throw new Error(`User ${addUsername} already exist!`);
            }

            let newUser = [addUsername]

            if (addPassword) {
                addPassword = bcryptjs.hashSync(addPassword, 8);
            }

            if (addPrivs) {
                if (/^NULL$/ui.test(addPrivs)) {
                    addPrivs = [false, false, false, false];
                } else {
                    addPrivs = parsePrivs(addPrivs);
                }
            }

            newUser.push(addPassword)

            newUser = newUser.concat(addPrivs);

            result = await sysDB.insert({
                tableName: 'user',
                values: newUser
            });

            break;

        case 'CHANGE':

            if (!user.userData.can_create) {
                throw new Error(`User ${user.userData.username} has not privileges to perform this action.`)
            }

            let changePrivs = commandMatch[1];
            const grantUsername = commandMatch[2];

            // verify username doesn't exist

            const grantUserExist = ormParse(await sysDB.find({
                tableName: 'user',
                conditions: [{
                    condition: 'username',
                    operator: '=',
                    conditionValue: clean(grantUsername)
                }]
            }));

            if (grantUserExist.id === undefined) {
                throw new Error(`User ${grantUsername} doesn't exist!`);
            }else {
                if(grantUserExist.id === 0) {
                    throw new Error('root user privileges cannot be changed!')
                }
            }
            if (/^NULL$/ui.test(changePrivs)) {
                changePrivs = [false, false, false, false];
            } else {
                changePrivs = parsePrivs(changePrivs);
            }

            result = await sysDB.update({
                tableName: 'user',
                set: ["can_create", "can_read", "can_update", "can_delete"],
                setValues: changePrivs,
                conditions: [{
                    condition: undefined,
                    operator: '=',
                    conditionValue: grantUserExist.id
                }]
            });

            break;

        case 'INSERT':
            if (!(currentDB instanceof DB)) {
                throw new Error('No database intialized. Use "INIT/USE <database_name>" to initialize a database.');
            }
            if (!user.userData.can_create) {
                throw new Error(`User ${user.userData.username} has not privileges to perform this action.`)
            }

            const insertTableName = commandMatch[1];
            const insertColumns = commandMatch[2];
            const insertValues = commandMatch[3];

            const cleanValues = (values) => {
                const regex = /(?:'([^']+)'|"([^"]+)")|([^,]+)/g;
                const matches = values.matchAll(regex);
                const cleanedValues = [];
                for (const match of matches) {
                    const value = match[0] || match[1] || match[2];
                    cleanedValues.push(clean(value.trim()));
                }
                return cleanedValues;
            };

            if (insertValues === undefined) {
                const valuesIndex = command.search(/\bVALUES\b/ui);
                if (valuesIndex !== -1) {
                    throw new Error('INSERT command requires a VALUES clause with parameters.');
                }
                const cleanedValues = cleanValues(insertColumns);
                result = await currentDB.insert({ tableName: insertTableName, values: cleanedValues });
            } else {
                const cleanedColumns = insertColumns.split(',').map(value => clean(value.trim()));
                const cleanedValues = cleanValues(insertValues);
                result = await currentDB.insert({ tableName: insertTableName, columns: cleanedColumns, values: cleanedValues });
            }
            break;

        case 'FIND':
        case 'SELECT':
            if (!(currentDB instanceof DB)) {
                throw new Error('No database intialized. Use "INIT/USE <database_name>" to initialize a database.');
            }
            if (!user.userData.can_read) {
                throw new Error(`User ${user.userData.username} has not privileges to perform this action.`)
            }

            const findQueryObject = {
                distinct: Boolean(commandMatch[1]),
                columns: commandMatch[2] === '*' ? undefined : commandMatch[2].split(',').map(column => column.trim()),
                tableName: commandMatch[3],
                operator: commandMatch[6],
                orderBy: commandMatch[8],
                limit: commandMatch[10],
                offset: commandMatch[11]
            }

            if (commandMatch[4]) {
                const joins = commandMatch[4].split(/\w+\s*\sjoin\s\s*/i).splice(1).map(join => {
                    const divisorElement = join.split(/\s*\son\s\s*/i);
                    const joinElement = {
                        referenceTable: [...divisorElement].shift(),
                        firstColumn: [...divisorElement].pop().split('=').shift().trim(),
                        secondColumn: [...divisorElement].pop().split('=').pop().trim(),
                    }
                    return joinElement
                });
                findQueryObject.joins = joins;
            }

            if (commandMatch[5]) {
                findQueryObject.conditions = getConditions(commandMatch[5]);
            }

            // Asignación de valor asociado al match que representa la orientación del ordenamiento (ORDER BY) del FIND
            if (commandMatch[9] === undefined || commandMatch[9].toUpperCase() === 'ASC') {
                findQueryObject.asc = true;
            } else {
                findQueryObject.asc = false;
            }

            result = await currentDB.find(findQueryObject);
            break;

        case 'DESCRIBE':
        case 'LS':
            if (!user.userData.can_read) {
                throw new Error(`User ${user.userData.username} has not privileges to perform this action.`)
            }

            const describeElement = commandParts[1];
            if (!commandParts[2]) {
                throw new Error("No parameter specified for describe command.")
            }
            switch (describeElement.toUpperCase()) {

                case 'TABLE':
                case 'TB':
                    if (!(currentDB instanceof DB)) {
                        throw new Error('No database intialized. Use "INIT/USE <database_name>" to initialize a database.');
                    }

                    result = currentDB.describeOneTable(commandParts[2].trim());
                    break;
                case 'DATABASE':
                case 'DB':

                    result = describeDatabase(currentDB, commandParts[2].trim())
                    break;
            }
            break;

        case 'SHOW':
            if (!user.userData.can_read) {
                throw new Error(`User ${user.userData.username} has not privileges to perform this action.`)
            }

            const target = commandMatch[1];
            const likeClause = commandMatch[2];
            let tableName = '';
            let condition = '';

            if (/^DBS$/ui.test(target) || /^DATABASES$/ui.test(target)) {
                tableName = 'database';
                condition = 'name';
            } else if (/^USERS$/ui.test(target)) {
                tableName = 'user';
                condition = 'username';
            }

            if (likeClause) {
                result = sysDB.find({
                    tableName,
                    conditions: [{
                        condition,
                        operator: 'LIKE',
                        conditionValue: clean(likeClause.trim())
                    }]
                });
            } else {
                result = sysDB.find({
                    tableName
                });
            }

            break;

        case 'DROP':

            if (!user.userData.can_delete) {
                throw new Error(`User ${user.userData.username} has not privileges to perform this action.`)
            }

            const dropElement = commandParts[1];

            switch (dropElement.toUpperCase()) {
                case 'DATABASE':
                case 'DB':
                    await sysDB.delete({
                        tableName: 'database',
                        conditions: [{
                            condition: 'name',
                            operator: '=',
                            conditionValue: clean(commandParts[2].trim())
                        }]
                    });

                    result = await dropDb('data', commandParts[2].trim());
                    break;
                case 'TABLE':
                case 'TB':
                    if (!(currentDB instanceof DB)) {
                        throw new Error('No database intialized. Use "INIT/USE <database_name>" to initialize a database.');
                    }

                    result = await currentDB.dropTable(commandParts[2].trim());
                    break;

                case 'USER':
                    const dropUsername = commandParts[2].trim();
                    const dropUserExist = ormParse(await sysDB.find({
                        tableName: 'user',
                        conditions: [{
                            condition: 'username',
                            operator: '=',
                            conditionValue: clean(dropUsername)
                        }]
                    }));

                    if (dropUserExist.id === undefined) {
                        throw new Error(`User ${dropUsername} doesn't exist!`);
                    }else {
                        if(dropUserExist.id === 0) {
                            throw new Error('root user cannot be dropped!')
                        }
                    }

                    result = await sysDB.delete({
                        tableName: 'user',
                        conditions: [{
                            condition: undefined,
                            operator: '=',
                            conditionValue: dropUserExist.id
                        }]
                    })

                break;
            }
            break;

        case 'DELETE':
            if (!(currentDB instanceof DB)) {
                throw new Error('No database intialized. Use "INIT/USE <database_name>" to initialize a database.');
            }
            if (!user.userData.can_delete) {
                throw new Error(`User ${user.userData.username} has not privileges to perform this action.`)
            }

            const deleteMatch = commandMatch;

            const deleteObj = {
                tableName: deleteMatch[1]
            }

            if (deleteMatch[2]) {
                deleteObj.conditions = getConditions(deleteMatch[2])
            }

            result = await currentDB.delete(deleteObj);

            break;

        case 'UPDATE':
            if (!(currentDB instanceof DB)) {
                throw new Error('No database intialized. Use "INIT/USE <database_name>" to initialize a database.');
            }
            if (!user.userData.can_update) {
                throw new Error(`User ${user.userData.username} has not privileges to perform this action.`)
            }

            const updateMatch = commandMatch;

            const updateObj = {
                tableName: updateMatch[1]
            }

            const setClause = updateMatch[2]
            // Parse SET clause
            const setKeyValuePairs = setClause.match(/\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^'",]*)/g) || [];
            const setArray = setKeyValuePairs.map(entry => entry.split('=').shift().trim());
            const setValuesArray = setKeyValuePairs.map(entry => clean(entry.split('=').pop().trim()));

            // Apply additional cleaning for SET values
            const cleanedSetValuesArray = setValuesArray.map(value => {
                if (/^['"]/.test(value) && /['"]$/.test(value)) {
                    return value.slice(1, -1).replace(/\\(["'])/g, "$1");
                } else {
                    return value;
                }
            });
            updateObj.set = setArray;
            updateObj.setValues = cleanedSetValuesArray;
            if (updateMatch[3]) {
                updateObj.conditions = getConditions(updateMatch[3])
            }

            result = await currentDB.update(updateObj);

            break;

        default:
            throw new Error('Invalid command action');
    }

    return result;

}
