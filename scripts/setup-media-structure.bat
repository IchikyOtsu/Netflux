@echo off
title Configuration de la structure des dossiers média

echo 📁 Configuration de la structure des dossiers média...

REM Créer la structure de base
if not exist "media\films" mkdir media\films
if not exist "media\series" mkdir media\series
if not exist "media\documentaires" mkdir media\documentaires
if not exist "media\autres" mkdir media\autres

echo.
echo ✅ Structure créée :
echo    media\
echo    ├── films\           (pour vos films)
echo    ├── series\          (pour vos séries TV)
echo    ├── documentaires\   (pour vos documentaires)
echo    └── autres\          (pour autres contenus)
echo.
echo 💡 Organisation recommandée pour les films :
echo    films\
echo    ├── Final Destination Bloodlines\
echo    │   ├── Final Destination Bloodlines.mp4
echo    │   └── Final Destination Bloodlines.srt
echo    ├── Avatar\
echo    │   ├── Avatar.mkv
echo    │   └── Avatar.srt
echo    └── ...
echo.
echo 🎬 Chaque film devrait avoir son propre dossier avec :
echo    - Le fichier vidéo principal
echo    - Les sous-titres (.srt) s'ils existent
echo    - Eventuellement d'autres fichiers liés
echo.
echo 🔧 Netflux détectera automatiquement tous les fichiers vidéo
echo    dans cette structure et les organisera correctement !
echo.
pause 