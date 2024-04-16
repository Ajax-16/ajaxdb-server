import net from 'net';
import dotenv from 'dotenv';
import { createHttpResponse, getHttpRequest, router } from './handlers/http/httpHandler.js';
import { executeCommand } from './handlers/nue/commandHandler.js';

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
    
    const isHandShake = data.toString().startsWith('NUE\r\n\r\nClient Hello')
    const isHttpRequest = data.toString().startsWith('HTTP');
    const isNueRequest = data.toString().startsWith('NUE');

    if(isHandShake) {
      await handleHandShake(socket, data);
    } else if (isHttpRequest) {
      await handleHTTP(socket, data);
    } else if (isNueRequest) {
      await handleTCP(socket, data);
    }

    socket.on('end', () => { });
  });
});

async function handleHandShake(socket, data) {
    let message = data.toString().trim().replace(/NUE\r\n\r\n/g, '');
    // TODO -> Comprobar cabeceras de conexión inicial (credenciales, archivos...) en las cabeceras en un futuro en vez de unicamente el mensaje.
    if(message === 'Client Hello') {
      socket.write('Server Hello');
    }else {
      socket.write('Connection rejected');
    }
}

async function handleTCP(socket, data) {
  let command = data.toString().trim();
  try {
    command = command.replace(/NUE\r\n\r\n/g, '');
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

    if(request.route !== '/favicon.ico') {

      const routedRequest = await router({ method: request.method, route: request.route, params: request.params, body: request.body })

      const result = await executeCommand(routedRequest);
  
      socket.write(createHttpResponse({ payload: result, statusCode: 200 }));
    
    }else {
      socket.write(createHttpResponse({payload: 'none', statusCode: 400}));
    }

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
  socket.write('END_OF_RESPONSE');
}

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
