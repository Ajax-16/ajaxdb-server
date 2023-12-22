import { cleanColumns, countCaracters, filterCaracters } from "./utils.js";

export function verifySyntax(command) {

    const commandParts = command.split(' ');
    const action = commandParts[0];

    switch(action.toUpperCase()) {

    case 'INIT':
        const databaseName = commandParts[1];
        const dbIsNumber = parseInt(databaseName);
        if(!isNaN(dbIsNumber)){
            execError('Invalid database name -> ' + databaseName);
        }
        if(commandParts.length > 2) {
            execError('1 argument expected (database name) but got: ' + (commandParts.length - 1).toString());
        }
        return command;

    case 'DROP':

        const dropElement = commandParts[1];

        if(commandParts.length > 3) {
            execError('2 argument expected (database or table name) but got: ' + (commandParts.length - 1).toString());
        }

        switch(dropElement) {
            case 'DATABASE':
            case 'TABLE':
        
            return command;

            default:
                execError('Element: ' + dropElement + ' does not support the DROP command.');
        }

    case 'CREATE':

    const createElement = commandParts[1];

    switch(createElement){
        case 'TABLE':
        
        break;

        default:
            execError('Element: ' + createElement + ' does not support the CREATE command.');
    }
    
    const tableName = commandParts[1];
    const tableIsNumber = parseInt(tableName);
    if(!isNaN(tableIsNumber)){
        execError('Invalid table name -> ' + tableName);
    }

    if(!filterCaracters(command, "(", 1) || !filterCaracters(command, ")", 1)) {
        execError('Too many "(" or ")" characters in the command');
    }

    const columnsStartIndex = command.indexOf('(');
    const columnsEndIndex = command.indexOf(')');

    if(columnsStartIndex > columnsEndIndex || (columnsStartIndex === -1 || columnsEndIndex === -1)) {
        execError('Column parameters on invalid format');
    }

    const columns = cleanColumns(command
    .substring(columnsStartIndex + 1, columnsEndIndex));

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
        } else if(words.length >= 4){
            execError('Too many words in column ' + (index + 1).toString());
        }
    });
    
    return command;

    case 'FIND':
    case 'INSERT':
    case 'SHOW':
    case 'DELETE':
    case 'UPDATE':
        
    return command;

    default: 
    execError('Invalid command action: "' + action + '"')
    }

}

function execError(error) {
    throw new Error(`You have an error on your command syntax: ${error}`);
}