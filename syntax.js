import { cleanColumns, filterCaracters } from "./utils.js";

export function verifySyntax(command) {

    const commandParts = command.split(' ');
    const action = commandParts[0];

    switch (action.toUpperCase()) {

        case 'INIT':
            const databaseName = commandParts[1];
            const dbIsNumber = parseInt(databaseName);
            if (!isNaN(dbIsNumber)) {
                execError('Invalid database name -> ' + databaseName);
            }
            if (commandParts.length > 2) {
                execError('1 argument expected (database name) but got: ' + (commandParts.length - 1).toString());
            }
            return command;

        case 'DROP':

            const dropElement = commandParts[1];

            if (commandParts.length < 2) {
                execError('Not enough arguments for the DROP command.');
            }

            if (commandParts.length > 3) {
                execError('2 arguments expected (database or table name) but got: ' + (commandParts.length - 1).toString());
            }

            switch (dropElement.toUpperCase()) {
                case 'DATABASE':
                case 'TABLE':
                    return command;

                default:
                    execError('Element: ' + dropElement + ' does not support the DROP command.');
            }

        case 'CREATE':

            const createElement = commandParts[1];

            switch (createElement.toUpperCase()) {
                case 'TABLE':

                    break;

                default:
                    execError('Element: ' + createElement + ' does not support the CREATE command.');
            }

            const tableName = commandParts[1];
            const tableIsNumber = parseInt(tableName);
            if (!isNaN(tableIsNumber)) {
                execError('Invalid table name -> ' + tableName);
            }

            if (!filterCaracters(command, "(", 1) || !filterCaracters(command, ")", 1)) {
                execError('Too many "(" or ")" characters in the command');
            }

            const createColumnsStartIndex = command.indexOf('(');
            const createColumnsEndIndex = command.indexOf(')');

            if (createColumnsStartIndex > createColumnsEndIndex || (createColumnsStartIndex === -1 || createColumnsEndIndex === -1)) {
                execError('Column parameters on invalid format');
            }

            if (command.trim().length - createColumnsEndIndex !== 1) {
                execError('Invalid final section');
            }

            const columns = cleanColumns(command
                .substring(createColumnsStartIndex + 1, createColumnsEndIndex));

            columns.forEach((column, index) => {
                const words = column.trim().split(' ');

                if (words.length > 1) {
                    const modifier = words[1];

                    if (modifier == 'as') {
                        const modValue = words[2];

                        if (modValue != 'PRIMARY_KEY') {
                            execError('Unknown modifier value ' + modValue);
                        }
                    } else {
                        execError(modifier + ' is not a valid modifier');
                    }
                } else if (words.length >= 4) {
                    execError('Too many words in column ' + (index + 1).toString());
                }
            });

            return command;

        case 'INSERT':

        const regex = /INSERT\s+INTO\s+\w+\s*\(\s*((?:(['"])(?:(?:(?!\2)[^\\]|\\.)*)\2|[^'",]+)\s*(?:,\s*(?:(['"])(?:(?:(?!\3)[^\\]|\\.)*)\3|[^'",]+)\s*)*)\)/i;

            const match = command.match(regex);

            if (match) {
                
                return command;

            } else {
                execError('INSERT command has an unexpected format.');
            }

        case 'FIND':

        const findRegex = /^FIND(?: [*,\w\s,]+)? IN \w+(?: WHERE \w+ = ['"]?[\w\s]+['"]?)?(?: OFFSET \d+)?(?: LIMIT \d+)?$/ui;

            // REGEX GENERADA CON INTELIGENCIA ARTIFICIAL

            if (!findRegex.test(command)) {
                execError('Invalid formate for finding command');
            }

            return command;

        case 'DESCRIBE':

            const describeElement = commandParts[1];

            if (commandParts.length < 2) {
                execError('Not enough arguments for the DESCRIBE command.');
            }

            if (commandParts.length > 3) {
                execError('2 arguments expected (database or table name) but got: ' + (commandParts.length - 1).toString());
            }

            switch (describeElement.toUpperCase()) {
                case 'DATABASE':
                case 'TABLE':
                    return command;

                default:
                    execError('Element: ' + describeElement + ' does not support the DESCRIBE command.');
            }

        case 'DELETE':

            const deleteRegex = /^DELETE FROM \w+(?: WHERE \w+ = ['"]?[\w\s]+['"]?)?$/ui;

            if (!deleteRegex.test(command)) {
                execError('Invalid format for delete command');
            }

            return command;

        case 'UPDATE':

            const updateRegex = /^UPDATE\s+(\w+)\s+SET\s+((?:\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^'",]*)(?:\s*,\s*\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^'",]*))*\s*)+)\s*WHERE\s+(\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^'",]*))/ui;


            if (!updateRegex.test(command)) {
                execError('Invalid format for update command');
            }

            return command;

        default:
            execError('Invalid command action: "' + action + '"')
    }

}

function execError(error) {
    throw new Error(`You have an error on your command syntax: ${error}`);
}