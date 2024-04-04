FROM node:latest

WORKDIR /nuedb

RUN git clone https://github.com/Ajax-16/nuedb-server.git .

RUN npm install

EXPOSE 3000

# Ejecutar la aplicación
CMD ["node", "server.js"]