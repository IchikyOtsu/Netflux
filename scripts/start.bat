@echo off
title Netflux - Streaming Personnel

echo 🎬 Démarrage de Netflux...
echo.

REM Vérifier si Docker est installé
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker n'est pas installé. Veuillez l'installer avant de continuer.
    pause
    exit /b 1
)

REM Vérifier si Docker Compose est installé
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose n'est pas installé. Veuillez l'installer avant de continuer.
    pause
    exit /b 1
)

REM Créer le dossier media s'il n'existe pas
if not exist "media" (
    echo 📁 Création du dossier media...
    mkdir media
)

REM Créer le dossier qbittorrent config s'il n'existe pas
if not exist "qbittorrent\config" (
    echo 📁 Création du dossier de configuration qBittorrent...
    mkdir qbittorrent\config
)

echo 🚀 Lancement des conteneurs Docker...
docker-compose up -d

echo.
echo ✅ Netflux est en cours de démarrage !
echo.
echo 🌐 Accès aux services :
echo    Frontend:    http://localhost:3000
echo    Backend API: http://localhost:5000
echo    qBittorrent: http://localhost:8080 (optionnel)
echo.
echo 📁 Pour ajouter des vidéos, placez-les dans le dossier './media/'
echo.
echo 🔧 Commandes utiles :
echo    Voir les logs:        docker-compose logs -f
echo    Arrêter les services: docker-compose down
echo    Redémarrer:          docker-compose restart
echo.
echo 🎉 Profitez de votre streaming personnel !
echo.
pause 