import net from 'net';
import dotenv from 'dotenv';
import { createHttpResponse, getHttpRequest, router } from './handlers/http/httpHandler.js';
import { executeCommand } from './handlers/ajx/commandHandler.js';

let PORT, CHUNK_SIZE;

if (process.env.PORT !== undefined || process.env.CHUNK_SIZE !== undefined) {
  PORT = process.env.PORT || 3000;
  CHUNK_SIZE = process.env.CHUNK_SIZE || 16384; // Tamaño máximo de cada fragmento en bytes
} else {
  dotenv.config({ path: './.env' || './.env.example' })
  PORT = process.env.PORT || 3000;
  CHUNK_SIZE = process.env.CHUNK_SIZE || 16384; // Tamaño máximo de cada fragmento en bytes
}

const server = net.createServer(async (socket) => {
  socket.on('data', async (data) => {

    const isHttpRequest = data.toString().includes('HTTP');
    const isAjxRequest = data.toString().includes('AJX');

    if (isHttpRequest) {
      await handleHTTP(socket, data);
    } else if (isAjxRequest) {
      await handleTCP(socket, data);
    }

    socket.on('end', () => { });
  });
});

async function handleTCP(socket, data) {
  let command = data.toString().trim();
  try {
    command = command.replace(/AJX\r\n\r\n/g, '');
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
}

async function handleHTTP(socket, data) {

  try {

    const request = getHttpRequest(data);

    const routedRequest = await router({ method: request.method, route: request.route, params: request.params, body: request.body })

    const result = await executeCommand(routedRequest);

    socket.write(createHttpResponse({ payload: result, statusCode: 200 }));

  } catch (error) {
    console.error('Error executing:', error.message);
    socket.write(createHttpResponse({ payload: { error: error.message }, statusCode: 400 }));
  }

}

function sendLargeResponse(socket, response) {
  for (let i = 0; i < response.length; i += CHUNK_SIZE) {
    const chunk = response.slice(i, i + CHUNK_SIZE);
    socket.write(chunk);
  }
  // Agrega una marca para indicar que se ha completado la transmisión de datos
  socket.write('END_OF_RESPONSE');
}

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
