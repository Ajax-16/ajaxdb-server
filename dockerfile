FROM node:latest

WORKDIR /nuedb

COPY src .

RUN npm install

EXPOSE 3000

# Ejecutar la aplicación
CMD ["node", "server.js"]