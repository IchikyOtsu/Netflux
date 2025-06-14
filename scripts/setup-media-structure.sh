#!/bin/bash

# Script pour créer la structure recommandée des dossiers média
echo "📁 Configuration de la structure des dossiers média..."

# Créer la structure de base
mkdir -p media/films
mkdir -p media/series
mkdir -p media/documentaires
mkdir -p media/autres

echo "✅ Structure créée :"
echo "   media/"
echo "   ├── films/           (pour vos films)"
echo "   ├── series/          (pour vos séries TV)"
echo "   ├── documentaires/   (pour vos documentaires)"
echo "   └── autres/          (pour autres contenus)"
echo ""
echo "💡 Organisation recommandée pour les films :"
echo "   films/"
echo "   ├── Final Destination Bloodlines/"
echo "   │   ├── Final Destination Bloodlines.mp4"
echo "   │   └── Final Destination Bloodlines.srt"
echo "   ├── Avatar/"
echo "   │   ├── Avatar.mkv"
echo "   │   └── Avatar.srt"
echo "   └── ..."
echo ""
echo "🎬 Chaque film devrait avoir son propre dossier avec :"
echo "   - Le fichier vidéo principal"
echo "   - Les sous-titres (.srt) s'ils existent"
echo "   - Eventuellement d'autres fichiers liés"
echo ""
echo "🔧 Netflux détectera automatiquement tous les fichiers vidéo"
echo "   dans cette structure et les organisera correctement !" 