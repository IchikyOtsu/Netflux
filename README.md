# 🎬 Netflux - Plateforme de Streaming Personnel

Netflux est une plateforme de streaming personnel moderne construite avec React, Express et Docker. Elle permet d'organiser et de regarder vos films personnels avec une interface élégante inspirée de Netflix.

## ✨ Fonctionnalités

### 🎥 **Streaming Vidéo**
- Lecture de vidéos avec support des formats MP4, MKV, AVI, MOV, WMV, FLV, WebM, M4V
- Streaming progressif avec support HTTP Range
- Interface de lecture moderne avec contrôles personnalisés
- Support du plein écran

### 🎨 **Interface Moderne**
- Design inspiré de Netflix avec Tailwind CSS
- Interface responsive (mobile, tablette, desktop)
- Cartes de films avec posters TMDB
- Affichage des métadonnées (titre, année, note, description)
- Bannières de films sur la page de lecture

### 🤖 **Organisation Automatique**
- **Surveillance automatique** des dossiers de téléchargement
- **Extraction intelligente** du titre et année depuis les noms de fichiers
- **Recherche automatique** des métadonnées sur TMDB
- **Téléchargement automatique** des posters et bannières
- **Organisation** dans des dossiers propres : `Film (Année)/`
- **Déplacement complet** des dossiers (vidéo + sous-titres + extras)

### 📊 **Métadonnées Enrichies**
- Intégration avec l'API TMDB (The Movie Database)
- Posters haute qualité automatiquement téléchargés
- Bannières/fanarts pour les pages de lecture
- Informations détaillées : synopsis, note, année, genres
- Fichiers NFO avec métadonnées complètes

## 🚀 Installation et Configuration

### Prérequis
- Docker et Docker Compose
- Clé API TMDB (gratuite sur [themoviedb.org](https://www.themoviedb.org/settings/api))

### 1. Cloner le projet
```bash
git clone <repository-url>
cd Netflux
```

### 2. Configuration TMDB
Créer un fichier `.env` à la racine :
```env
# Configuration TMDB pour les métadonnées de films
TMDB_API_KEY=your_tmdb_api_key_here

# Chemins des médias (Docker)
MEDIA_PATH=/media
DOWNLOADS_PATH=/media/downloads
MOVIES_PATH=/media/films
```

### 3. Lancer avec Docker
```bash
docker-compose up -d
```

### 4. Accès aux services
- **Frontend** : http://localhost:3000
- **Backend API** : http://localhost:5000
- **qBittorrent** : http://localhost:8080 (admin/adminadmin)

## 📁 Structure des Dossiers

```
Netflux/
├── frontend/          # Application React
├── backend/           # API Express
├── media-organizer/   # Service d'organisation automatique
├── media/             # Dossier des médias (monté en volume)
│   ├── downloads/     # Téléchargements (surveillé)
│   ├── incoming/      # Dossier d'arrivée (surveillé)
│   ├── films/         # Films organisés
│   └── series/        # Séries (futur)
└── qbittorrent/       # Configuration qBittorrent
```

## 🎬 Organisation Automatique

Le service `media-organizer` surveille les dossiers de téléchargement et :

1. **Détecte** les nouveaux fichiers vidéo
2. **Extrait** le titre et l'année du nom de fichier
3. **Recherche** les métadonnées sur TMDB
4. **Télécharge** poster.jpg et fanart.jpg
5. **Crée** un dossier propre : `Film (Année)/`
6. **Déplace** tout le contenu (vidéo + sous-titres + extras)
7. **Génère** un fichier movie.nfo avec les métadonnées

### Exemple de transformation :
```
Avant:
downloads/The.Matrix.1999.1080p.BluRay/
├── The.Matrix.1999.1080p.BluRay.mkv
├── The.Matrix.1999.1080p.BluRay.srt
└── info.txt

Après:
films/The Matrix (1999)/
├── The Matrix (1999).mkv
├── The.Matrix.1999.1080p.BluRay.srt
├── info.txt
├── poster.jpg          # ← Téléchargé depuis TMDB
├── fanart.jpg          # ← Téléchargé depuis TMDB
└── movie.nfo           # ← Métadonnées TMDB
```

## 🔧 API Endpoints

### Vidéos
- `GET /api/videos` - Liste des vidéos avec métadonnées
- `GET /api/videos/:path/metadata` - Métadonnées d'une vidéo
- `GET /api/video/:path` - Streaming vidéo
- `GET /api/image/:path?type=poster|fanart` - Images des films

### Santé
- `GET /api/health` - État du service

## 🎨 Interface Utilisateur

### Page d'Accueil
- Grille de films avec posters TMDB
- Informations enrichies (titre, année, note, synopsis)
- Recherche et filtrage (à venir)

### Lecteur Vidéo
- Bannière de film en arrière-plan
- Métadonnées détaillées (synopsis, note, durée)
- Contrôles de lecture avancés
- Informations techniques

## 🔄 Développement

### Structure du projet
- **Frontend** : React + Vite + Tailwind CSS
- **Backend** : Express.js + FFProbe
- **Organizer** : Node.js + Chokidar + TMDB API
- **Orchestration** : Docker Compose

### Commandes utiles
```bash
# Logs en temps réel
docker-compose logs -f

# Redémarrer un service
docker-compose restart media-organizer

# Reconstruire après modifications
docker-compose up --build
```

## 🚧 Fonctionnalités à venir

- [ ] Support des séries TV
- [ ] Recherche et filtrage avancés
- [ ] Playlists personnalisées
- [ ] Sous-titres intégrés
- [ ] Transcoding automatique
- [ ] Interface d'administration
- [ ] Support multi-utilisateurs

## 📝 Notes

- Les fichiers médias ne sont pas versionnés (voir `.gitignore`)
- La clé API TMDB est requise pour les métadonnées
- Le service surveille automatiquement les nouveaux téléchargements
- Compatible avec qBittorrent et autres clients torrent

---

**Netflux** - Votre cinéma personnel, organisé automatiquement ! 🍿
