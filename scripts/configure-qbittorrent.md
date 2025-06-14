# Configuration qBittorrent pour l'organisation automatique

## 🔧 Configuration automatique des téléchargements

### 1. Accéder à l'interface qBittorrent
- Ouvrez http://localhost:8080
- Connectez-vous avec :
  - Utilisateur : `admin`
  - Mot de passe : `adminadmin`

### 2. Configurer le dossier de téléchargement
1. Allez dans **Outils** → **Options**
2. Dans l'onglet **Téléchargements** :
   - **Dossier par défaut** : `/downloads`
   - ✅ Cochez "Conserver le dossier incomplet"
   - **Dossier des téléchargements incomplets** : `/downloads/.incomplete`

### 3. Configuration pour l'organisation automatique
1. Dans l'onglet **Téléchargements** :
   - ✅ Cochez "Pré-allouer l'espace disque pour tous les fichiers"
   - ✅ Cochez "Lancer le script externe à la fin du téléchargement"

### 4. Sécurité recommandée
1. Dans l'onglet **Interface Web** :
   - Changez le mot de passe par défaut
   - ✅ Cochez "Utiliser l'authentification"

### 5. Comment ça fonctionne

```
Processus automatique :
1. qBittorrent télécharge dans /downloads
2. Le Media Organizer détecte le nouveau fichier
3. Il attend que le téléchargement soit terminé
4. Il recherche les métadonnées sur TMDB
5. Il crée le dossier organisé dans /films
6. Il déplace le fichier et télécharge poster/fanart
7. Le film apparaît automatiquement dans Netflux
```

### 6. Structure finale
```
media/
├── downloads/           # Téléchargements qBittorrent
│   └── .incomplete/    # Téléchargements en cours
└── films/              # Films organisés automatiquement
    ├── Avatar (2009)/
    │   ├── Avatar (2009).mp4
    │   ├── poster.jpg
    │   ├── fanart.jpg
    │   └── movie.nfo
    └── Final Destination Bloodlines (2025)/
        ├── Final Destination Bloodlines (2025).mp4
        ├── Final Destination Bloodlines (2025).srt
        ├── poster.jpg
        └── fanart.jpg
```

## 🎯 Résultat
- **Zéro intervention manuelle** nécessaire
- **Organisation parfaite** avec métadonnées
- **Détection automatique** des nouveaux films
- **Intégration complète** avec Netflux 

## 🔧 **Corrections apportées :**

### 1. **Filtrage des types de fichiers**
- **Fichiers vidéo uniquement** : Seuls les fichiers `.mp4`, `.mkv`, `.avi`, etc. sont traités comme des films
- **Fichiers associés** : Les `.srt`, `.jpg`, `.txt` sont maintenant gérés comme des fichiers associés
- **Ignorer les autres** : Les fichiers non supportés sont ignorés

### 2. **Gestion des fichiers associés**
- Les sous-titres et autres fichiers sont automatiquement associés au film correspondant
- Ils sont déplacés dans le même dossier que le film principal

### 3. **Amélioration de la logique**
- Séparation claire entre fichiers vidéo et fichiers associés
- Meilleure organisation des dossiers
- Évite la création de "films" pour les sous-titres

### 4. **Problème API TMDB (Erreur 401)**
Pour résoudre l'erreur d'authentification TMDB, vous devez :

1. **Créer/vérifier votre fichier `.env`** dans le répertoire racine :
```env
TMDB_API_KEY=votre_clé_api_tmdb_ici
DOWNLOADS_PATH=/downloads
MOVIES_PATH=/movies
```

2. **Obtenir une clé API TMDB** :
   - Allez sur https://www.themoviedb.org/
   - Créez un compte
   - Allez dans Paramètres > API
   - Demandez une clé API

3. **Reconstruire les conteneurs** :
```bash
docker compose down
docker compose up --build
```

Maintenant le système devrait :
- ✅ Traiter uniquement les fichiers vidéo comme des films
- ✅ Associer automatiquement les sous-titres aux films
- ✅ Ignorer les fichiers non pertinents
- ✅ Fonctionner avec l'API TMDB une fois la clé configurée 