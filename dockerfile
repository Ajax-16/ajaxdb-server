FROM node:latest

WORKDIR /ajaxdb_server

RUN git clone https://github.com/Ajax-16/ajaxdb-server.git .

RUN npm install

EXPOSE 3000

# Ejecutar la aplicación
CMD ["node", "server.js"]