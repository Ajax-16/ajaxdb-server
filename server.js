import net from 'net';
import { DB, dropDb } from 'ajax16-db';
import { verifySyntax } from './syntax.js';
import { cleanColumns } from './utils.js';

const PORT = 3000;

let currentDB = 'placeholder';

const server = net.createServer(async (socket) => {
  console.log('Client connected');

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
    console.log('Client disconnected');
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
        throw new Error('No database intialized. Use "INIT <database_name>" to initialize a database.');
      }
      const conditionStartIndex = command.indexOf('WHERE') + 6;
      const conditionEndIndex = command.lastIndexOf('=');
      const conditionValueStartIndex = command.indexOf('=') + 1;

      const condition = command.substring(conditionStartIndex, conditionEndIndex).trim();
      const conditionValue = clean(command.substring(conditionValueStartIndex, command.length).trim());

      return await currentDB.find({ tableName, condition, conditionValue });

    case 'DROP':

      const element = commandParts[1];

      switch (element) {
        case 'DATABASE':

        return await dropDb(commandParts[2].trim());

        case 'TABLE':
          if (!(currentDB instanceof DB)) {
            throw new Error('No database intialized. Use "INIT <database_name>" to initialize a database.');
          }

        return await currentDB.dropTable(commandParts[2].trim());

      }

  }
}

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

function clean(string) {
  if ((string.startsWith("'") && string.endsWith("'")) ||
    (string.startsWith('"') && string.endsWith('"'))) {
    return string.substring(1, string.length - 1);
  } else {
    const parsedValue = parseFloat(string);
    return isNaN(parsedValue) ? string : parsedValue;
  }
}