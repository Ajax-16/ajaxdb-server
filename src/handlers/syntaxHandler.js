export function verifySyntax(command) {

    const commandParts = command.split(' ');
    const action = commandParts[0];

    switch (action.toUpperCase()) {

        case 'INIT':
        case 'USE':
            const databaseName = commandParts[1];
            const dbIsNumber = parseInt(databaseName);
            if (!isNaN(dbIsNumber)) {
                execError('Invalid database name -> ' + databaseName);
            }
            if (commandParts.length > 2) {
                execError('1 argument expected (database name) but got: ' + (commandParts.length - 1).toString());
            }
            return { command };

        case 'WHOAMI':

        const whoamiRegex = /^\s*WHOAMI\s*$/ui;

        if (!whoamiRegex.test(command)) {
            execError('Invalid format for create command')
        }

        return { command };

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
                case 'TB':
                case 'DB':
                case 'USER':
                    return { command };

                default:
                    execError('Element: ' + dropElement + ' does not support the DROP command.');
            }

        case 'CREATE':

            const createRegex = /^\s*CREATE\s+(DATABASE|TABLE|DB|TB)\s+([-a-zA-Z0-9()@:%_\+.~#?&//=]+)\s*(?:\((\w+\s*(?:as\s+PRIMARY_KEY\s*)?(?:,\s*\w+\s*(?:as\s+PRIMARY_KEY\s*)?)*\s*)\))?$/ui;

            if (!createRegex.test(command)) {
                execError('Invalid format for create command')
            }

            const createMatch = command.match(createRegex);

            return { command, commandMatch: createMatch };

        case 'ADD':

            const addRegex = /^\s*ADD\s+USER\s+['"]?([-a-zA-Z0-9()@:%_\+.~#?&//=]+)["']?(?:\s+WITH\s+PASSWORD\s+([-a-zA-Z0-9()@:%_\+.~#?&//=]+))?(?:\s+(?:SET|GRANT)\s+PRIVILEGE\s+([crud]{1,4}|NULL))?$/ui;

            if (!addRegex.test(command)) {
                execError('Invalid format for add command');
            }

            const addMatch = command.match(addRegex);

            return { command, commandMatch: addMatch }

        case 'SET':

            const setRegex = /^\s*SET\s+(PRIVILEGE|PASSWORD)\s+([crud]{1,4}|NULL|[-a-zA-Z0-9()@:%_\+.~#?&//=]+)\s+TO\s+([-a-zA-Z0-9()@:%_\+.~#?&//=]+)$/ui;

            if (!setRegex.test(command)) {
                execError('Invalid format for grant command');
            }

            const setMatch = command.match(setRegex);

            return { command, commandMatch: setMatch };

        case 'INSERT':

            const insertRegex = /^\s*INSERT\s+INTO\s+([-a-zA-Z0-9()@:%_\+.~#?&//=]+)\s*(?:\(([^()]+)\))?\s*(?:VALUES\s*\(([^()]+)\))?\s*/ui;

            if (!insertRegex.test(command)) {
                execError('Invalid format for insert command');
            }

            const insertMatch = command.match(insertRegex);

            return { command, commandMatch: insertMatch };

        case 'FETCH':

            const fetchRegex = /^\s*FETCH\s+FROM\s+\((https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=\/?&\s,]+)\)(?:\s+WITH\s+CREDENTIALS\s+\(([^()]+)\))?\s+ROOT\s+TABLE\s*=\s*(\w+)\s*(?:\s+(SPIDEY))?$/ui;

            if(!fetchRegex.test(command)) {
                execError('Invalid format for fetch command');
            }

            const fetchMatch = command.match(fetchRegex);

            return { command, commandMatch: fetchMatch };

        case 'DESCRIBE':
        case 'LS':

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
                case 'TB':
                case 'DB':
                    return { command };

                default:
                    execError('Element: ' + describeElement + ' does not support the DESCRIBE command.');
            }

        case 'SHOW':

            const showRegex = /^\s*(?:SHOW|LS)\s+(DATABASES|DBS|USERS)(?:\s+LIKE\s+['"](%?[\w\s]+%?)['"])?$/ui;

            if (!showRegex.test(command)) {
                execError('Invalid format for show command');
            }

            const showMatch = command.match(showRegex);

            return { command, commandMatch: showMatch };

        case 'FIND':
        case 'SELECT':

            const findRegex = /^\s*(?:FIND|SELECT)\s+((?:DISTINCT\s+)?)((?:[\w.\s,*]+)?)\s+(?:IN|FROM)\s+([-a-zA-Z0-9()@:%_\+.~#?&//=]+)\s*((?:INNER\s+JOIN\s+\w+\s+(?:ON\s+(?:\w+\.\w+|\w+)\s*=\s*(?:\w+\.\w+|\w+)\s*)*)*)(?:\s*WHERE\s+((?:(?:\w+\.\w+|\w+))\s*(?:=|!=|>|<|>=|<=|\s+LIKE\s+|\s+ILIKE\s+|\s+NOT\s+LIKE\s+|\s+NOT\s+ILIKE\s+|IN|\s+NOT\s+IN\s+)\s*(?:(?:\(\s*['"]?[\w\s,]+['"]?(?:\s*,\s*['"]?[\w\s,]+['"]?|\d*\.?\d*)*\s*\)|(?:\s*['"]?[%]?[\w\s,]+[%]?['"]?|\d*\.?\d*)))?(?:\s*(?:AND|OR)\s+(?:(?:\w+\.\w+|\w+))\s*(?:=|!=|>|<|>=|<=|\s+LIKE\s+|\s+ILIKE\s+|\s+NOT\s+LIKE\s+|\s+NOT\s+ILIKE\s+|IN|\s+NOT\s+IN\s+)\s*(?:\(\s*['"]?[\w\s,]+['"]?(?:\s*,\s*['"]?[\w\s,]+['"]?|\d*\.?\d*)*\s*\)|(?:\s*['"]?[%]?[\w,\s]+[%]?['"]?|\d*\.?\d*))?)*\s*)?)?(?:ORDER\s+BY\s+((?:\w+\.\w+|\w+))\s*)?((?:ASC|DESC|))?\s*(?:LIMIT\s+(\d+))?\s*(?:OFFSET\s+(\d+))?$/ui;

            if (!findRegex.test(command)) {
                execError('Invalid format for finding command');
            }

            const findMatch = command.match(findRegex);

            return { command, commandMatch: findMatch };

        case 'DELETE':

            const deleteRegex = /^\s*DELETE\s*FROM\s*([-a-zA-Z0-9()@:%_\+.~#?&//=]+)\s*(?:\s*WHERE\s+((?:(?:\w+\.\w+|\w+))\s*(?:=|!=|>|<|>=|<=|\s+LIKE\s+|\s+ILIKE\s+|\s+NOT\s+LIKE\s+|\s+NOT\s+ILIKE\s+|IN|\s+NOT\s+IN\s+)\s*(?:(?:\(\s*['"]?[\w\s,]+['"]?(?:\s*,\s*['"]?[\w\s,]+['"]?|\d*\.?\d*)*\s*\)|(?:\s*['"]?[%]?[\w]+[%]?['"]?|\d*\.?\d*)))?(?:\s*(?:AND|OR)\s+(?:(?:\w+\.\w+|\w+))\s*(?:=|!=|>|<|>=|<=|\s+LIKE\s+|\s+ILIKE\s+|\s+NOT\s+LIKE\s+|\s+NOT\s+ILIKE\s+|IN|\s+NOT\s+IN\s+)\s*(?:\(\s*['"]?[\w\s,]+['"]?(?:\s*,\s*['"]?[\w\s,]+['"]?|\d*\.?\d*)*\s*\)|(?:\s*['"]?[%]?[\w]+[%]?['"]?|\d*\.?\d*))?)*\s*)?)?$/ui;

            if (!deleteRegex.test(command)) {
                execError('Invalid format for delete command');
            }

            const deleteMatch = command.match(deleteRegex);

            return { command, commandMatch: deleteMatch };

        case 'UPDATE':

        const updateRegex = /^\s*UPDATE\s+([-a-zA-Z0-9()@:%_\+.~#?&//=]+)\s+SET\s+((?:\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^'",]*)(?:\s*,\s*\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^'",]*)|\d*\.?\d*)*)\s*)\s+(?:\s*WHERE\s+((?:(?:\w+\.\w+|\w+|\b["'][^"']*["']\b))\s*(?:=|!=|>|<|>=|<=|\s+LIKE\s+|\s+ILIKE\s+|\s+NOT\s+LIKE\s+|\s+NOT\s+ILIKE\s+|IN|\s+NOT\s+IN\s+)\s*(?:(?:\(\s*['"]?[\w\s,]+['"]?(?:\s*,\s*['"]?[\w\s,]+['"]?|\d*\.?\d*)*\s*\)|(?:\s*['"]?[%]?[\w]+[%]?['"]?|\d*\.?\d*)))?(?:\s*(?:AND|OR)\s+(?:(?:\w+\.\w+|\w+|\b["'][^"']*["']\b))\s*(?:=|!=|>|<|>=|<=|\s+LIKE\s+|\s+ILIKE\s+|\s+NOT\s+LIKE\s+|\s+NOT\s+ILIKE\s+|IN|\s+NOT\s+IN\s+)\s*(?:\(\s*['"]?[\w\s,]+['"]?(?:\s*,\s*['"]?[\w\s,]+['"]?|\d*\.?\d*)*\s*\)|(?:\s*['"]?[%]?[\w]+[%]?['"]?|\d*\.?\d*))?)*\s*)?)?$/ui;

            if (!updateRegex.test(command)) {
                execError('Invalid format for update command');
            }

            const updateMatch = command.match(updateRegex);

            return { command, commandMatch: updateMatch };

        default:
            execError('Invalid command action: "' + action + '"')
    }

}

function execError(error) {
    throw new Error(`You have an error on your command syntax: ${error}`);
}