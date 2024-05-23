FROM node:latest

RUN useradd nuedb

WORKDIR /opt/nuedb

COPY src .

RUN npm install

EXPOSE 3000

RUN mkdir /var/nuedb

RUN chown nuedb /var/nuedb & \
    chown nuedb /opt/nuedb

USER nuedb

RUN node sys_setup.js

# Ejecutar la aplicación
CMD ["node", "server.js"]