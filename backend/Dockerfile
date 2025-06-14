FROM node:18-alpine

# Installer ffmpeg pour l'analyse vidéo
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le code source
COPY . .

# Exposer le port
EXPOSE 5000

# Commande de démarrage
CMD ["npm", "run", "dev"] 