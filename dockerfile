FROM node:latest

WORKDIR /opt/nuedb

COPY src .

RUN npm install

EXPOSE 3000

# Ejecutar la aplicación
CMD ["node", "server.js"]