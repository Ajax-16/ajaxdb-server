#!/bin/bash

echo "Parando docker compose..."
docker-compose down

# Eliminar la imagen ajax16/nuedb:latest
echo "Eliminando la imagen ajax16/nuedb:latest..."
docker rmi ajax16/nuedb:latest

# Ejecutar un nuevo contenedor con la imagen actualizada
echo "Ejecutando un nuevo contenedor con la imagen actualizada..."
docker compose up -d

echo "¡Operación completada!"