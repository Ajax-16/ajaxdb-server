import net from 'net';
import dotenv from 'dotenv';
import { createHttpResponse, getHttpRequest, router } from './handlers/http/httpHandler.js';
import { handleNueRequest } from './handlers/nue/nueHandler.js';
import { createNueResponse, parseNueRequest } from './handlers/nue/messageHandler.js';

let PORT, CHUNK_SIZE;

if (process.env.PORT !== undefined || process.env.CHUNK_SIZE !== undefined) {
  PORT = process.env.PORT || 3000;
  CHUNK_SIZE = process.env.CHUNK_SIZE || 16384; // Tamaño máximo de cada fragmento en bytes
} else {
  dotenv.config({ path: '../.env' || '../.env.example' })
  PORT = process.env.PORT || 3000;
  CHUNK_SIZE = process.env.CHUNK_SIZE || 16384; // Tamaño máximo de cada fragmento en bytes
}

const server = net.createServer(async (socket) => {

  const handleData = async (data) => {
    const isHttpRequest = data.toString().split('\r\n').shift().includes('HTTP');
    const isNueRequest = data.toString().startsWith('NUE');

    if (isHttpRequest) {
      await handleHTTP(socket, data);
    } else if (isNueRequest) {
      await handleNUE(socket, data);
    }
  };

  socket.on('data', handleData);

  socket.on('end', () => { });

  socket.on('error', ()=> { })

});

async function handleNUE(socket, data) {
  try {
    const { headers, body } = parseNueRequest(data);
    const result = await handleNueRequest(headers, body);
    if (result.length <= CHUNK_SIZE) {
      socket.write(result.toString());
      socket.write('END_OF_RESPONSE');
    } else {
      sendLargeResponse(socket, result.toString());
    }
  }catch (err) {
    const errResult = createNueResponse({ Status: "ERROR" }, [err.message]);
    socket.write(errResult.toString());
    socket.write('END_OF_RESPONSE');
  }

}

async function handleHTTP(socket, data) {

  try {

    const request = getHttpRequest(data);

    if (request.method === 'OPTIONS') {
      socket.write(createHttpResponse({ statusCode: 200, customHeaders: { Allow: 'GET, POST, DELETE, PUT' } }))
    }
    else if (request.method === 'HEAD') {
      socket.write(createHttpResponse({ statusCode: 200 }));
    }
    else {
      if (request.route !== '/favicon.ico') {

        const routedRequest = await router({ method: request.method, route: request.route, params: request.params, body: request.body })

        const result = await handleNueRequest([], routedRequest);

        socket.write(createHttpResponse({ payload: result, statusCode: 200 }));

      } else {
        socket.write(createHttpResponse({ statusCode: 400 }));
      }
    }

  } catch (error) {
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
