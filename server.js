import net from 'net';
import { DB } from 'ajax16-db';

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
  const commandParts = command.split(' ');
  const action = commandParts[0].toUpperCase();
  const tableName = commandParts[2];

  switch (action) {
    case 'USE':
      const dbName = commandParts[1].split(';').shift();
      currentDB = new DB(dbName);
      await currentDB.init();
      return `Using database: ${dbName}`;

    case 'CREATE':
      if (!(currentDB instanceof DB)) {
        throw new Error('No database selected. Use "USE <database_name>" to select a database.');
      }

      const columnsStartIndex = command.indexOf('(');
      const columnsEndIndex = command.lastIndexOf(')');
      let primaryKey = 'id';
      const columns = command.substring(columnsStartIndex + 1, columnsEndIndex).split(',').map(col => col.trim());
      const searchPrimaryKey = command.substring(columnsStartIndex + 1, columnsEndIndex).split(',');
      searchPrimaryKey.forEach(element => {
        if (element.split(' ')[2] === 'PRIMARY_KEY') {
          primaryKey = element.split(' ')[0];
          columns.splice(columns.indexOf(element), 1);
        }
      });
      return await currentDB.createTable({ tableName, primaryKey, columns });

    case 'INSERT':
      if (!(currentDB instanceof DB)) {
        throw new Error('No database selected. Use "USE <database_name>" to select a database.');
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

    case 'SELECT':
      if (!(currentDB instanceof DB)) {
        throw new Error('No database selected. Use "USE <database_name>" to select a database.');
      }
      const conditionStartIndex = command.indexOf('WHERE') + 6;
      const conditionEndIndex = command.lastIndexOf('=');
      const conditionValueStartIndex = command.indexOf('=') + 1;

      const condition = command.substring(conditionStartIndex, conditionEndIndex).trim();
      const conditionValue = clean(command.substring(conditionValueStartIndex, command.length).trim());

      return await currentDB.find({ tableName, condition, conditionValue });

    case 'DROP':
      if (!(currentDB instanceof DB)) {
        throw new Error('No database selected. Use "USE <database_name>" to select a database.');
      }

      return await currentDB.dropTable(tableName);

    default:
      throw new Error('Unsupported command');
  }
}

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

function clean(string) {
  if ((string.startsWith("'") && string.endsWith("'")) ||
    (string.startsWith('"') && string.endsWith('"'))) {
      return string.substring(1, string.length - 1);
  }else{
    const parsedValue = parseFloat(string);
    return isNaN(parsedValue) ? string : parsedValue;
  }
}