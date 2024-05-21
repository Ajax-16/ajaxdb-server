import { DB, dropDb, describeDatabase, createDb } from 'nuedb_core';
import { verifySyntax } from '../syntaxHandler.js';
import { clean, retainSplit } from "../../utils/string.js";
import { createNueResponse } from './messageHandler.js';
import { ormParse } from '../../utils/orm.js';
import bcrypt from "bcrypt";

let currentDB = 'placeholder';
const sysDB = new DB();
let dbName = ''
let user = { userData: null, hasAccess: false }
let result;

export async function handleNueRequest(headers, body) {
    try {
        await sysDB.init('system', 'nue');
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

                        if (userFromDB) {
                            const uncrpyptedPasswd = bcrypt.compareSync(password, userFromDB.password);
                            if (uncrpyptedPasswd) {
                                user.userData = userFromDB;
                                user.hasAccess = true;
                            } else {
                                throw new Error('auth failed!')
                            }
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
                if (currentDB instanceof DB) {
                    await currentDB.save();
                }
                await sysDB.save();

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
    const tableName = commandParts[2];

    switch (action) {

        case 'INIT':
        case 'USE':

            if (!user.userData.can_read) {
                throw new Error(`User ${user.userData.username}/${user.userData.host} has not privileges to perform this action.`)
            }
            dbName = commandParts[1].split(';').shift();
            currentDB = new DB();
            const init = await currentDB.init('data', dbName);
            if (init) {
                result = `Using database: ${dbName}`;
            } else {
                throw new Error(`Database ${dbName} doesn't exist.`);
            }
            break;


        case 'CREATE':
            if (!user.userData.can_create) {
                throw new Error(`User ${user.userData.username}/${user.userData.host} has not privileges to perform this action.`)
            }

            const element = commandMatch[1];
            const elementName = commandMatch[2].trim();

            let parameters = commandMatch[3];

            if (element && (element.toUpperCase() === 'DATABASE' || element.toUpperCase() === 'DB')) {
                if (parameters) {
                    throw new Error('Unexpected parameters on "CREATE DATABASE" instruction.');
                }

                await sysDB.insert({ tableName: 'database', values: [elementName] })

                result = await createDb('data', elementName);

            } else if (element && (element.toUpperCase() === 'TABLE' || element.toUpperCase() === 'TB')) {
                if (!(currentDB instanceof DB)) {
                    throw new Error('No database intialized. Use "INIT <database_name>" to initialize a database.');
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

        case 'INSERT':
            if (!(currentDB instanceof DB)) {
                throw new Error('No database intialized. Use "INIT <database_name>" to initialize a database.');
            }
            if (!user.userData.can_create) {
                throw new Error(`User ${user.userData.username}/${user.userData.host} has not privileges to perform this action.`)
            }

            const insertColumns = commandMatch[1];
            const insertValues = commandMatch[2];

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
                result = await currentDB.insert({ tableName, values: cleanedValues });
            } else {
                const cleanedColumns = insertColumns.split(',').map(value => clean(value.trim()));
                const cleanedValues = cleanValues(insertValues);
                result = await currentDB.insert({ tableName, columns: cleanedColumns, values: cleanedValues });
            }
            break;

        case 'FIND':
        case 'SELECT':
            if (!(currentDB instanceof DB)) {
                throw new Error('No database initialized. Use "INIT <database_name>" to initialize a database.');
            }
            if (!user.userData.can_read) {
                throw new Error(`User ${user.userData.username}/${user.userData.host} has not privileges to perform this action.`)
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
                let conditionsArray = retainSplit(commandMatch[5], /\s+AND\s+/ui, /\s+OR\s+/ui)
                const conditions = []
                for (let i = 0; i < conditionsArray.length; i++) {
                    if (conditionsArray[i].toUpperCase() === 'AND') {
                        const completeCondition = conditionsArray[i + 1].match(/^(\w+\.\w+|\w+)\s*(=|!=|>|<|>=|<=|\s+LIKE\s+|\s+ILIKE\s+|\s+NOT\s+LIKE\s+|\s+NOT\s+ILIKE\s+|IN|\s+NOT\s+IN\s+)\s*((?:\(\s*['"]?[\w\s,]+['"]?(?:\s*,\s*['"]?[\w\s,]+['"]?|\d*\.?\d*)*\s*\)|(?:\s*['"]?[%]?[\w]+[%]?['"]?|\d*\.?\d*)))$/ui)
                        let condition = completeCondition[1]
                        let operator = completeCondition[2].trim();
                        let conditionValue = clean(completeCondition[3])

                        if (condition === 'PRIMARY_KEY') {
                            condition = undefined;
                        }
                        if (operator) {
                            if (operator.toUpperCase() === 'IN' || operator.toUpperCase() === 'NOT IN') {

                                conditionValue = completeCondition[3].replace(/\(|\)/g, '').split(',').map(value => clean(value.trim()));

                            } else {
                                conditionValue = clean(completeCondition[3]);
                            }
                        }

                        conditions.push({
                            logicalOperator: 'AND',
                            condition,
                            operator,
                            conditionValue
                        })
                        i++;
                    } else if (conditionsArray[i].toUpperCase() === 'OR') {
                        const completeCondition = conditionsArray[i + 1].match(/^(\w+\.\w+|\w+)\s*(=|!=|>|<|>=|<=|\s+LIKE\s+|\s+ILIKE\s+|\s+NOT\s+LIKE\s+|\s+NOT\s+ILIKE\s+|IN|\s+NOT\s+IN\s+)\s*((?:\(\s*['"]?[\w\s,]+['"]?(?:\s*,\s*['"]?[\w\s,]+['"]?|\d*\.?\d*)*\s*\)|(?:\s*['"]?[%]?[\w]+[%]?['"]?|\d*\.?\d*)))$/ui)
                        let condition = completeCondition[1]
                        let operator = completeCondition[2].trim();
                        let conditionValue = clean(completeCondition[3])
                        if (condition === 'PRIMARY_KEY') {
                            condition = undefined;
                        }
                        if (operator) {
                            if (operator.toUpperCase() === 'IN' || operator.toUpperCase() === 'NOT IN') {

                                conditionValue = completeCondition[3].replace(/\(|\)/g, '').split(',').map(value => clean(value.trim()));
                            } else {
                                conditionValue = clean(completeCondition[3]);
                            }
                        }

                        conditions.push({
                            logicalOperator: 'OR',
                            condition,
                            operator,
                            conditionValue,
                        })
                        i++;
                    } else {
                        const completeCondition = conditionsArray[i].match(/^(\w+\.\w+|\w+)\s*(=|!=|>|<|>=|<=|\s+LIKE\s+|\s+ILIKE\s+|\s+NOT\s+LIKE\s+|\s+NOT\s+ILIKE\s+|IN|\s+NOT\s+IN\s+)\s*((?:\(\s*['"]?[\w\s,]+['"]?(?:\s*,\s*['"]?[\w\s,]+['"]?|\d*\.?\d*)*\s*\)|(?:\s*['"]?[%]?[\w]+[%]?['"]?|\d*\.?\d*)))$/ui)
                        let condition = completeCondition[1]
                        let operator = completeCondition[2].trim();
                        let conditionValue = clean(completeCondition[3])
                        if (condition === 'PRIMARY_KEY') {
                            condition = undefined;
                        }
                        if (operator) {
                            if (operator.toUpperCase() === 'IN' || operator.toUpperCase() === 'NOT IN') {

                                conditionValue = completeCondition[3].replace(/\(|\)/g, '').split(',').map(value => clean(value.trim()));

                            } else {
                                conditionValue = clean(completeCondition[3]);
                            }
                        }

                        conditions.push({
                            condition,
                            operator,
                            conditionValue
                        })
                    }
                }
                findQueryObject.conditions = conditions;
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
                throw new Error(`User ${user.userData.username}/${user.userData.host} has not privileges to perform this action.`)
            }

            const describeElement = commandParts[1];
            if (!commandParts[2]) {
                throw new Error("No parameter specified for describe command.")
            }
            switch (describeElement.toUpperCase()) {

                case 'TABLE':
                case 'TB':
                    if (!(currentDB instanceof DB)) {
                        throw new Error('No database intialized. Use "INIT <database_name>" to initialize a database.');
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
        case 'LS':
            if (!user.userData.can_read) {
                throw new Error(`User ${user.userData.username}/${user.userData.host} has not privileges to perform this action.`)
            }

            const likeClause = commandMatch[1];

            if (likeClause) {
                result = sysDB.find({
                    tableName: 'database',
                    condition: 'name',
                    operator: 'LIKE',
                    conditionValue: likeClause.trim()
                })
            } else {
                result = sysDB.find({
                    tableName: 'database'
                })
            }

            break;

        case 'DROP':

        if (!user.userData.can_delete) {
            throw new Error(`User ${user.userData.username}/${user.userData.host} has not privileges to perform this action.`)
        }

            const dropElement = commandParts[1];

            switch (dropElement.toUpperCase()) {
                case 'DATABASE':
                case 'DB':

                    await sysDB.delete({
                        tableName: 'database',
                        condition: 'name',
                        operator: '=',
                        conditionValue: commandParts[2].trim()
                    });

                    result = await dropDb('data', commandParts[2].trim());
                    break;
                case 'TABLE':
                case 'TB':
                    if (!(currentDB instanceof DB)) {
                        throw new Error('No database intialized. Use "INIT <database_name>" to initialize a database.');
                    }

                    result = await currentDB.dropTable(commandParts[2].trim());
                    break;
            }
            break;

        case 'DELETE':
            if (!(currentDB instanceof DB)) {
                throw new Error('No database initialized. Use "INIT <database_name>" to initialize a database.');
            }
            if (!user.userData.can_delete) {
                throw new Error(`User ${user.userData.username}/${user.userData.host} has not privileges to perform this action.`)
            }

            const deleteMatch = commandMatch;

            const deleteTableName = deleteMatch[1];
            const deleteWhereField = deleteMatch[2];
            const deleteOperator = deleteMatch[3];
            let deleteConditionValue;

            if (deleteMatch[4]) {
                if (deleteOperator.toUpperCase() === 'IN' || deleteOperator.toUpperCase() === 'NOT IN') {
                    deleteConditionValue = deleteMatch[4].replace(/\(|\)/g, '').split(',').map(value => clean(value.trim()));
                } else {
                    deleteConditionValue = clean(deleteMatch[4]);
                }
            } else {
                throw new Error('You must specify a condition value for WHERE clause.');
            }

            if (deleteWhereField === 'PRIMARY_KEY') {
                result = await currentDB.delete({
                    tableName: deleteTableName,
                    condition: undefined,
                    operator: deleteOperator,
                    conditionValue: deleteConditionValue
                });
            } else {
                result = await currentDB.delete({
                    tableName: deleteTableName,
                    condition: deleteWhereField,
                    operator: deleteOperator,
                    conditionValue: deleteConditionValue
                });
            }
            break;

        case 'UPDATE':
            if (!(currentDB instanceof DB)) {
                throw new Error('No database initialized. Use "INIT <database_name>" to initialize a database.');
            }
            if (!user.userData.can_update) {
                throw new Error(`User ${user.userData.username}/${user.userData.host} has not privileges to perform this action.`)
            }

            const updateMatch = commandMatch;

            const updateTableName = updateMatch[1];
            const setClause = updateMatch[2];
            const updateCondition = updateMatch[3];
            const updateOperator = updateMatch[4];
            let updateConditionValue;

            if (updateOperator.toUpperCase() === 'IN' || updateOperator.toUpperCase() === 'NOT IN') {
                updateConditionValue = updateMatch[5].replace(/\(|\)/g, '').split(',').map(value => clean(value.trim()));
            } else {
                updateConditionValue = clean(updateMatch[5]);
            }

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

            // Perform the update operation
            if (updateCondition === 'PRIMARY_KEY') {
                result = await currentDB.update({
                    tableName: updateTableName,
                    set: setArray,
                    setValues: cleanedSetValuesArray,
                    condition: undefined,
                    operator: updateOperator,
                    conditionValue: updateConditionValue
                });
            } else {
                result = await currentDB.update({
                    tableName: updateTableName,
                    set: setArray,
                    setValues: cleanedSetValuesArray,
                    condition: updateCondition,
                    operator: updateOperator,
                    conditionValue: updateConditionValue
                });
            }
            break;

        default:
            throw new Error('Invalid command action');
    }

    user = { userData: null, hasAccess: false }

    return result;

}
