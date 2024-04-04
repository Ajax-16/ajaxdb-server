import { DB, dropDb, describeDatabase } from 'nuedb_core';
import { verifySyntax } from '../syntaxHandler.js';
import { cleanColumns } from "../../utils/string.js";
import { clean } from "../../utils/string.js";

let currentDB = 'placeholder';

export async function executeCommand(command) {

    verifySyntax(command);

    const commandParts = command.split(' ');
    const action = commandParts[0].toUpperCase();
    const tableName = commandParts[2];

    switch (action) {
        case 'INIT':
            const dbName = commandParts[1].split(';').shift();
            currentDB = new DB(dbName, 4);
            await currentDB.init();
            return `Using database: ${dbName}`;

        case 'CREATE':
            if (!(currentDB instanceof DB)) {
                throw new Error('No database intialized. Use "INIT <database_name>" to initialize a database.');
            }

            const columnsStartIndex = command.indexOf('(');
            const columnsEndIndex = command.lastIndexOf(')');
            let primaryKey = 'id';

            const columns = cleanColumns(command.substring(columnsStartIndex + 1, columnsEndIndex));

            const searchPrimaryKey = cleanColumns(command.substring(columnsStartIndex + 1, columnsEndIndex));

            searchPrimaryKey.forEach(element => {
                if (element.trim().split(' ')[2] === 'PRIMARY_KEY') {
                    primaryKey = element.trim().split(' ')[0];
                    columns.splice(columns.indexOf(element), 1);
                }
            });
            return await currentDB.createTable({ tableName, primaryKey, columns });

        case 'INSERT':
            if (!(currentDB instanceof DB)) {
                throw new Error('No database intialized. Use "INIT <database_name>" to initialize a database.');
            }

            const regex = /INSERT\s+INTO\s+\w+\s*(?:\((\s*.+?\s*(?:,\s*.+?\s*)*)\))?\s*(?:VALUES\s*\((\s*.+?\s*(?:,\s*.+?\s*)*)\))?\s*/ui;

            const insertMatch = command.match(regex);

            const insertColumns = insertMatch[1];
            const insertValues = insertMatch[2];

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
                return await currentDB.insert({ tableName, values: cleanedValues });
            } else {
                const cleanedColumns = insertColumns.split(',').map(value => clean(value.trim()));
                const cleanedValues = cleanValues(insertValues);
                return await currentDB.insert({ tableName, columns: cleanedColumns, values: cleanedValues });
            }

        case 'FIND':
            if (!(currentDB instanceof DB)) {
                throw new Error('No database initialized. Use "INIT <database_name>" to initialize a database.');
            }

            let condition, findOperator, conditionValue, offset, limit, distinct, orderBy, asc;
            let findColumns = [];

            const parts = command.split(/\bIN\b/ui);

            const findTableName = parts[1].trim().split(" ")[0];
            let findCommand = parts[0].trim();
            const whereIndex = command.search(/\bWHERE\b/ui);
            const limitIndex = command.search(/\bLIMIT\b/ui);
            const offsetIndex = command.search(/\bOFFSET\b/ui);
            const orderByIndex = command.search(/\bORDER BY\b/ui);

            if (findCommand.match(/\bDISTINCT\b/i)) {
                distinct = true;
                findCommand = findCommand.replace(/\bDISTINCT\b/i, "").trim();
            } else {
                distinct = false;
            }

            // Buscar el índice de la palabra clave "IN" para obtener las columnas seleccionadas
            const columnsMatch = findCommand.substring(findCommand.indexOf('FIND') + 5).trim();
            if (columnsMatch) {
                if (columnsMatch === '*') {
                    findColumns = undefined; // Si el valor es "*", no se pasa ninguna columna
                } else {
                    findColumns = columnsMatch.split(',').map(column => column.trim());
                }
            }

            if (whereIndex !== -1) {
                const conditionMatch = command.match(/WHERE\s+(.+?)\s*(=|!=|>|<|>=|<=|LIKE|NOT LIKE|IN|NOT IN)\s*((?:\([^)]*\))|('[^']*'|\b[^' ]+\b))/ui);
                if (conditionMatch) {
                    condition = conditionMatch[1];
                    findOperator = conditionMatch[2];
                    if (findOperator.toUpperCase() === 'IN' || findOperator.toUpperCase() === 'NOT IN') {
                        // Extraer valores entre paréntesis y separarlos por coma
                        conditionValue = conditionMatch[3].replace(/\(|\)/g, '').split(',').map(value => clean(value.trim()));
                    } else {
                        conditionValue = conditionMatch[3];
                    }
                }
            }

            if (offsetIndex !== -1) {
                const offsetMatch = command.match(/OFFSET\s+(\d+)/ui);
                if (offsetMatch) {
                    offset = parseInt(offsetMatch[1]);
                }
            }

            if (limitIndex !== -1) {
                const limitMatch = command.match(/LIMIT\s+(\d+)/ui);
                if (limitMatch) {
                    limit = parseInt(limitMatch[1]);
                }
            }
            if (orderByIndex !== -1) {
                const orderByMatch = command.match(/ORDER BY\s+(\w+)(?:\s+(ASC|DESC))?/ui);
                if(orderByMatch) {
                    orderBy = clean(orderByMatch[1]);
                    if(orderByMatch[2]) {
                        asc = orderByMatch[2].toUpperCase() === 'DESC' ? false : true;
                    }else {
                        asc = true;
                    }
                }
            }

            const cleanConditionValue = conditionValue ? clean(conditionValue) : undefined;

            if (condition === 'PRIMARY_KEY') {
                return await currentDB.find({
                    tableName: findTableName,
                    distinct,
                    columns: findColumns,
                    condition: undefined,
                    operator: findOperator,
                    conditionValue: cleanConditionValue,
                    offset,
                    limit,
                    orderBy,
                    asc
                });
            } else {
                return await currentDB.find({
                    tableName: findTableName,
                    distinct,
                    columns: findColumns,
                    condition,
                    operator: findOperator,
                    conditionValue: cleanConditionValue,
                    offset,
                    limit,
                    orderBy,
                    asc
                });
            }

        case 'DESCRIBE':

            const describeElement = commandParts[1];

            switch (describeElement.toUpperCase()) {

                case 'TABLE':
                    if (!(currentDB instanceof DB)) {
                        throw new Error('No database intialized. Use "INIT <database_name>" to initialize a database.');
                    }

                    return currentDB.describeOneTable(commandParts[2].trim());

                case 'DATABASE':

                    return describeDatabase(currentDB, commandParts[2].trim())

            }

        case 'DROP':

            const dropElement = commandParts[1];

            switch (dropElement.toUpperCase()) {
                case 'DATABASE':

                    return await dropDb(commandParts[2].trim());

                case 'TABLE':
                    if (!(currentDB instanceof DB)) {
                        throw new Error('No database intialized. Use "INIT <database_name>" to initialize a database.');
                    }

                    return await currentDB.dropTable(commandParts[2].trim());

            }

        case 'DELETE':
            if (!(currentDB instanceof DB)) {
                throw new Error('No database initialized. Use "INIT <database_name>" to initialize a database.');
            }

            const deleteRegex = /^DELETE FROM (\w+) WHERE (\w+)\s?((?:=|!=|>|<|>=|<=|LIKE|NOT LIKE|IN|NOT IN))\s?((?:\(\s*['"]?[\w\s,]+['"]?(?:\s*,\s*['"]?[\w\s,]+['"]?|\d*\.?\d*)*\s*\)|(?: ['"]?[%]?[\w\s,]+[%]?['"]?|\d*\.?\d*)))$/ui;
            const deleteMatch = command.match(deleteRegex);

            const deleteTableName = deleteMatch[1];
            const deleteWhereField = deleteMatch[2];
            const deleteOperator = deleteMatch[3];
            let deleteConditionValue;

            if(deleteMatch[4]) {
                if(deleteOperator.toUpperCase() === 'IN' || deleteOperator.toUpperCase() === 'NOT IN') {
                    deleteConditionValue = deleteMatch[4].replace(/\(|\)/g, '').split(',').map(value => clean(value.trim()));
                }else {
                    deleteConditionValue = clean(deleteMatch[4]);
                }
            }else {
                throw new Error('You must specify a condition value for WHERE clause.');
            }

            if(deleteWhereField === 'PRIMARY_KEY') {
                return await currentDB.delete({
                    tableName: deleteTableName,
                    condition: undefined,
                    operator: deleteOperator,
                    conditionValue: deleteConditionValue
                });
            }else {
                return await currentDB.delete({
                    tableName: deleteTableName,
                    condition: deleteWhereField,
                    operator: deleteOperator,
                    conditionValue: deleteConditionValue
                });
            }

        case 'UPDATE':
            if (!(currentDB instanceof DB)) {
                throw new Error('No database initialized. Use "INIT <database_name>" to initialize a database.');
            }

            const updateRegex = /^UPDATE\s+(\w+)\s+SET\s+(\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^'",]*)(?:\s*,\s*\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^'",]*)|\d*\.?\d*)*)\s*WHERE (\w+)\s?((?:=|!=|>|<|>=|<=|LIKE|NOT LIKE|IN|NOT IN))\s?((?:\(\s*['"]?[\w\s,]+['"]?(?:\s*,\s*['"]?[\w\s,]+['"]?|\d*\.?\d*)*\s*\)|(?: ['"]?[%]?[\w\s,]+[%]?['"]?|\d*\.?\d*)))/ui;

            const updateMatch = command.match(updateRegex);

            if (!updateMatch) {
                throw new Error('Invalid UPDATE command format.');
            }

            const updateTableName = updateMatch[1];
            const setClause = updateMatch[2];
            const updateCondition = updateMatch[3];
            const updateOperator = updateMatch[4];
            let updateConditionValue;

            if(updateOperator.toUpperCase() === 'IN' || updateOperator.toUpperCase() === 'NOT IN') {
                updateConditionValue = updateMatch[5].replace(/\(|\)/g, '').split(',').map(value => clean(value.trim()));
            }else {
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
                return await currentDB.update({
                    tableName: updateTableName,
                    set: setArray,
                    setValues: cleanedSetValuesArray,
                    condition: undefined,
                    operator: updateOperator,
                    conditionValue: updateConditionValue
                });
            }else {
                return await currentDB.update({
                    tableName: updateTableName,
                    set: setArray,
                    setValues: cleanedSetValuesArray,
                    condition: updateCondition,
                    operator: updateOperator,
                    conditionValue: updateConditionValue
                });
            }

        default:

            throw new Error('Invalid command action');

    }
}
