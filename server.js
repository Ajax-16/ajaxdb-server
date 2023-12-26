import net from 'net';
import { DB, dropDb, describeDatabase } from 'ajaxdb-core';
import { verifySyntax } from './syntax.js';
import { cleanColumns } from './utils.js';

const PORT = 3000;

let currentDB = 'placeholder';

const server = net.createServer(async (socket) => {

  socket.on('data', async (data) => {
    const command = data.toString().trim();

    try {
      const result = await executeCommand(command);
      socket.write(JSON.stringify(result));
    } catch (error) {
      console.error('Error executing command:', error.message);
      socket.write(JSON.stringify({ error: error.message }));
    }
  });

  socket.on('end', () => {
  });
});

async function executeCommand(command) {

  verifySyntax(command);

  const commandParts = command.split(' ');
  const action = commandParts[0].toUpperCase();
  const tableName = commandParts[2];

  switch (action) {
    case 'INIT':
      const dbName = commandParts[1].split(';').shift();
      currentDB = new DB(dbName);
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
      const valuesStartIndex = command.indexOf('(') + 1;
      const valuesEndIndex = command.lastIndexOf(')');
      const values = command.substring(valuesStartIndex, valuesEndIndex)
        .split(',')
        .map(val => {
          const trimmedValue = val.trim();
          return clean(trimmedValue);
        });
      return await currentDB.insert({ tableName, values });

      case 'FIND':
  if (!(currentDB instanceof DB)) {
    throw new Error('No database initialized. Use "INIT <database_name>" to initialize a database.');
  }

  const where = commandParts[3];
  const limitMatch = command.match(/LIMIT (\d+)/i);
  const limit = limitMatch ? parseInt(limitMatch[1]) : undefined;

  const conditionStartIndex = command.indexOf(where) + 6;

  if (conditionStartIndex === 5) {
    return await currentDB.showOneTable(tableName);
  }

  const conditionMatch = command.match(/WHERE\s+(.+?)\s*=\s*('[^']*'|\b[^' ]+\b)/i);

  if (!conditionMatch) {
    throw new Error('Invalid FIND command format.');
  }

  const condition = conditionMatch[1];
  const conditionValue = conditionMatch[2];
  const cleanConditionValue = clean(conditionValue);

  return await currentDB.find({ tableName, condition, conditionValue: cleanConditionValue, limit });

    case 'DESCRIBE':

      const describeElement = commandParts[1];

      switch (describeElement.toUpperCase()) {

        case 'TABLE':
          if (!(currentDB instanceof DB)) {
            throw new Error('No database intialized. Use "INIT <database_name>" to initialize a database.');
          }

          return await currentDB.describeOneTable(commandParts[2].trim());

        case 'DATABASE':

          return await describeDatabase(currentDB, commandParts[2].trim())

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
      
        const deleteTableName = commandParts[2];
        const deleteWhere = commandParts[3];
      
        const deleteConditionStartIndex = command.indexOf(deleteWhere) + deleteWhere.length + 1;
      
        if (deleteConditionStartIndex === deleteWhere.length) {
          return await currentDB.showOneTable(deleteTableName);
        }
      
        const deleteConditionEndIndex = command.lastIndexOf('=');
        const deleteConditionValueStartIndex = command.indexOf('=') + 1;
      
        const deleteCondition = command.substring(deleteConditionStartIndex, deleteConditionEndIndex).trim();
        const deleteConditionValue = clean(command.substring(deleteConditionValueStartIndex).trim());
      
        return await currentDB.delete({ tableName: deleteTableName, condition: deleteCondition, conditionValue: deleteConditionValue });
      

      case 'UPDATE':
        if (!(currentDB instanceof DB)) {
          throw new Error('No database intialized. Use "INIT <database_name>" to initialize a database.');
        }
        const updateRegex = /^UPDATE\s+(\w+)\s+SET\s+((?:\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^'",]*)(?:\s*,\s*\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^'",]*))*\s*)+)\s*WHERE\s+(\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^'",]*))/ui;

        const match = command.match(updateRegex);
    
          const updateTableName = match[1];
          const setClause = match[2];
          const updateConditionClause = match[3];
      
          const setArray = setClause.split(',').map(entry => {
              return entry.split('=').shift().trim()
          });

          let setValuesArray = setClause.split(',').map(entry => {
            return clean(entry.split('=').pop().trim())
          });

          setValuesArray = setValuesArray.map(value => clean(value));
    
          const updateCondition = updateConditionClause.split('=').shift().trim();

          const updateConditionValue = updateConditionClause.split('=').pop().trim();

          return await currentDB.update({
            tableName: updateTableName,
            set: setArray,
            setValues: setValuesArray,
            condition: updateCondition,
            conditionValue: clean(updateConditionValue)
          });


    default:

      throw new Error('Invalid command action');

  }
}

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

function clean(value) {
  if (typeof value !== 'string') {
    return value;
  }
  if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
    return value.substring(1, value.length - 1);
  } else {
    const parsedValue = parseFloat(value);
    return !isNaN(parsedValue) ? parsedValue : value;
  }
}