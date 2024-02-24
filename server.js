import net from 'net';
import { DB, dropDb, describeDatabase } from 'ajaxdb-core';
import { verifySyntax } from './syntax.js';
import { cleanColumns } from './utils.js';

const PORT = process.env.PORT || 3000;
const CHUNK_SIZE = process.env.CHUNK_SIZE || 16384; // Tamaño máximo de cada fragmento en bytes

let currentDB = 'placeholder';

const server = net.createServer(async (socket) => {
  socket.on('data', async (data) => {
    const command = data.toString().trim();
    try {
      const result = await executeCommand(command);
      if (result.length <= CHUNK_SIZE) {
        socket.write(JSON.stringify(result));
        socket.write('END_OF_RESPONSE');
      } else {
        sendLargeResponse(socket, JSON.stringify(result));
      }
    } catch (error) {
      console.error('Error executing command:', error.message);
      sendLargeResponse(socket, JSON.stringify({ error: error.message }));
    }
  });

  socket.on('end', () => { });
});

function sendLargeResponse(socket, response) {
  for (let i = 0; i < response.length; i += CHUNK_SIZE) {
    const chunk = response.slice(i, i + CHUNK_SIZE);
    socket.write(chunk);
  }
  // Agrega una marca para indicar que se ha completado la transmisión de datos
  socket.write('END_OF_RESPONSE');
}


async function executeCommand(command) {

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

      const regex = /INSERT\s+INTO\s+\w+\s*\(\s*((?:(['"])(?:(?:(?!\2)[^\\]|\\.)*)\2|[^'",]+)\s*(?:,\s*(?:(['"])(?:(?:(?!\3)[^\\]|\\.)*)\3|[^'",]+)\s*)*)\)/i;

      const insertMatch = command.match(regex);

      let cleanedParams = [];

      if (insertMatch) {
        const paramsText = insertMatch[1];

        let currentParam = '';
        let inQuote = false;

        for (let char of paramsText) {
          if (char === "'" || char === '"') {
            inQuote = !inQuote;
            currentParam += char;
          } else if (char === ',' && !inQuote) {
            cleanedParams.push(currentParam.trim());
            currentParam = '';
          } else {
            currentParam += char;
          }
        }

        if (currentParam.trim() !== '') {
          cleanedParams.push(currentParam.trim());
        }
      }

      cleanedParams = cleanedParams.map(element => {
        return clean(element);
      })

      return await currentDB.insert({ tableName, values: cleanedParams });

      case 'FIND':
        if (!(currentDB instanceof DB)) {
            throw new Error('No database initialized. Use "INIT <database_name>" to initialize a database.');
        }
    
        let condition, conditionValue, offset, limit;
        let findColumns = [];
    
        const parts = command.split(/\bIN\b/ui);
        if (parts.length !== 2) {
            throw new Error('Invalid format for finding command');
        }
    
        const findTableName = parts[1].trim().split(" ")[0];
        const findCommand = parts[0].trim();
        const whereIndex = command.search(/\bWHERE\b/ui);
        const limitIndex = command.search(/\bLIMIT\b/ui);
        const offsetIndex = command.search(/\bOFFSET\b/ui);
    
        // Buscar el índice de la palabra clave "IN" para obtener las columnas seleccionadas
        const columnsMatch = findCommand.substring(findCommand.indexOf('FIND') + 5).trim();
        if (columnsMatch) {
            if (columnsMatch === '*') {
                findColumns = undefined; // Si el valor es "*", no se pasa ninguna columna
            } else {
                findColumns = columnsMatch.split(',').map(column => column.trim());
            }
        }

        console.log(findCommand)
    
        if (whereIndex !== -1) {
            const conditionMatch = command.match(/WHERE\s+(.+?)\s*=\s*('[^']*'|\b[^' ]+\b)/ui);
            if (conditionMatch) {
                condition = conditionMatch[1];
                conditionValue = conditionMatch[2];
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
    
        const cleanConditionValue = conditionValue ? clean(conditionValue) : undefined;
    
        console.log(findTableName, condition, conditionValue)
        
        if (condition) {
            return await currentDB.find({ tableName: findTableName, columns: findColumns, condition, conditionValue: cleanConditionValue, offset, limit });
        } else {
            return currentDB.showOneTable(findTableName, findColumns, offset, limit);
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
        throw new Error('No database initialized. Use "INIT <database_name>" to initialize a database.');
      }

      const updateRegex = /^UPDATE\s+(\w+)\s+SET\s+((?:\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^'",]*)(?:\s*,\s*\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^'",]*))*\s*)+)\s*WHERE\s+(\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^'",]*))/ui;

      const match = command.match(updateRegex);

      if (!match) {
        throw new Error('Invalid UPDATE command format.');
      }

      const updateTableName = match[1];
      const setClause = match[2];
      const updateConditionClause = match[3];

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

      // Parse WHERE condition
      const updateCondition = updateConditionClause.split('=').shift().trim();
      const updateConditionValue = clean(updateConditionClause.split('=').pop().trim());

      // Perform the update operation
      return await currentDB.update({
        tableName: updateTableName,
        set: setArray,
        setValues: cleanedSetValuesArray,
        condition: updateCondition,
        conditionValue: updateConditionValue
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