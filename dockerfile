FROM node:latest

WORKDIR /nuedb

COPY src .

RUN npm install

EXPOSE 3000

RUN node sys_setup.js

# Ejecutar la aplicación
CMD ["node", "server.js"]