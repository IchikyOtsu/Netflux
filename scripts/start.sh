#!/bin/bash

# Script de démarrage pour Netflux
# Ce script facilite le lancement de la plateforme de streaming

echo "🎬 Démarrage de Netflux..."
echo ""

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Veuillez l'installer avant de continuer."
    exit 1
fi

# Vérifier si Docker Compose est installé
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé. Veuillez l'installer avant de continuer."
    exit 1
fi

# Créer le dossier media s'il n'existe pas
if [ ! -d "media" ]; then
    echo "📁 Création du dossier media..."
    mkdir -p media
fi

# Créer le dossier qbittorrent config s'il n'existe pas
if [ ! -d "qbittorrent/config" ]; then
    echo "📁 Création du dossier de configuration qBittorrent..."
    mkdir -p qbittorrent/config
fi

echo "🚀 Lancement des conteneurs Docker..."
docker-compose up -d

echo ""
echo "✅ Netflux est en cours de démarrage !"
echo ""
echo "🌐 Accès aux services :"
echo "   Frontend:    http://localhost:3000"
echo "   Backend API: http://localhost:5000"
echo "   qBittorrent: http://localhost:8080 (optionnel)"
echo ""
echo "📁 Pour ajouter des vidéos, placez-les dans le dossier './media/'"
echo ""
echo "🔧 Commandes utiles :"
echo "   Voir les logs:        docker-compose logs -f"
echo "   Arrêter les services: docker-compose down"
echo "   Redémarrer:          docker-compose restart"
echo ""
echo "🎉 Profitez de votre streaming personnel !" 