const fs = require('fs-extra')
const path = require('path')
const chokidar = require('chokidar')
const axios = require('axios')
const ffprobe = require('ffprobe')
const ffprobeStatic = require('ffprobe-static')
const sanitize = require('sanitize-filename')
const { exec } = require('child_process')
const { MovieDb } = require('moviedb-promise')
require('dotenv').config()

const DOWNLOADS_PATH = process.env.DOWNLOADS_PATH || '/downloads'
const MOVIES_PATH = process.env.MOVIES_PATH || '/movies'
const TMDB_API_KEY = process.env.TMDB_API_KEY

// Utiliser les chemins Docker corrects
const MEDIA_PATH = process.env.MEDIA_PATH || '/media'
const DOWNLOADS_FOLDER = path.join(MEDIA_PATH, 'downloads')
const MOVIES_FOLDER = path.join(MEDIA_PATH, 'films')
const WATCH_FOLDERS = process.env.WATCH_FOLDERS ? 
  process.env.WATCH_FOLDERS.split(',').map(f => f.trim()) : 
  [DOWNLOADS_FOLDER, path.join(MEDIA_PATH, 'incoming')]

// Extensions de fichiers vidéo supportées
const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v']

// Extensions de fichiers associés (sous-titres, images, etc.)
const SUBTITLE_EXTENSIONS = ['.srt', '.vtt', '.ass', '.ssa', '.sub']
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.bmp', '.gif']
const INFO_EXTENSIONS = ['.txt', '.nfo', '.info']

// Configuration TMDB
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500'

console.log('🎬 Netflux Media Organizer démarré')
console.log(`📁 Variables d'environnement:`)
console.log(`   - DOWNLOADS_PATH: ${DOWNLOADS_PATH}`)
console.log(`   - MOVIES_PATH: ${MOVIES_PATH}`)
console.log(`   - MEDIA_PATH: ${MEDIA_PATH}`)
console.log(`   - DOWNLOADS_FOLDER: ${DOWNLOADS_FOLDER}`)
console.log(`   - MOVIES_FOLDER: ${MOVIES_FOLDER}`)
console.log(`   - WATCH_FOLDERS: ${WATCH_FOLDERS.join(', ')}`)
console.log(`🔑 TMDB API: ${TMDB_API_KEY ? 'Configurée' : 'Non configurée'}`)

class MediaOrganizer {
  constructor() {
    this.processingQueue = new Set()
    this.processedMovies = new Map() // Pour associer les fichiers aux films
    
    // Initialiser TMDB
    this.moviedb = null
    if (TMDB_API_KEY) {
      this.moviedb = new MovieDb(TMDB_API_KEY)
      console.log('✅ API TMDB initialisée')
    } else {
      console.log('⚠️ Clé API TMDB non configurée - Les métadonnées ne seront pas récupérées')
    }

    this.init()
  }

  async init() {
    await this.setupDirectories()
    
    // Vérification initiale des fichiers existants
    console.log('🔍 Vérification des fichiers existants au démarrage...')
    await this.processExistingFiles()
    
    this.startWatching()
  }

  // Créer les dossiers nécessaires
  async setupDirectories() {
    const dirs = [
      MEDIA_PATH,
      DOWNLOADS_FOLDER,
      MOVIES_FOLDER,
      path.join(MEDIA_PATH, 'series'),
      path.join(MEDIA_PATH, 'incoming'),
      path.join(MEDIA_PATH, 'processing')
    ]

    for (const dir of dirs) {
      await fs.ensureDir(dir)
      console.log(`📂 Dossier créé/vérifié: ${dir}`)
    }
    console.log('📂 Tous les dossiers sont prêts')
  }

  // Traiter les fichiers existants au démarrage
  async processExistingFiles() {
    try {
      console.log('🔍 Vérification des fichiers existants au démarrage...')
      
      for (const folder of WATCH_FOLDERS) {
        if (await fs.pathExists(folder)) {
          console.log(`📂 Vérification du dossier: ${folder}`)
          await this.scanFolder(folder)
        } else {
          console.log(`⚠️ Dossier introuvable: ${folder}`)
        }
      }
      
      console.log('✅ Vérification initiale terminée')
    } catch (error) {
      console.error('❌ Erreur lors de la vérification initiale:', error.message)
    }
  }

  // Scanner un dossier pour les fichiers existants
  async scanFolder(folderPath) {
    try {
      const files = await fs.readdir(folderPath, { withFileTypes: true })
      
      for (const file of files) {
        const filePath = path.join(folderPath, file.name)
        
        if (file.isFile()) {
          const ext = path.extname(file.name).toLowerCase()
          if (VIDEO_EXTENSIONS.includes(ext)) {
            console.log(`🎬 Fichier vidéo existant trouvé: ${file.name}`)
            // Traitement immédiat pour les fichiers existants (ils sont déjà stables)
            await this.processMovie(filePath)
          }
        } else if (file.isDirectory()) {
          // Récursion dans les sous-dossiers
          await this.scanFolder(filePath)
        }
      }
    } catch (error) {
      console.error(`❌ Erreur lors du scan du dossier ${folderPath}:`, error.message)
    }
  }

  // Démarrer la surveillance des dossiers
  startWatching() {
    console.log('🔍 Démarrage de la surveillance...')
    
    // Vérifier que les dossiers existent
    const existingFolders = []
    for (const folder of WATCH_FOLDERS) {
      if (fs.existsSync(folder)) {
        existingFolders.push(folder)
        console.log(`👀 Surveillance activée pour: ${folder}`)
      } else {
        console.log(`⚠️ Dossier inexistant ignoré: ${folder}`)
      }
    }

    if (existingFolders.length === 0) {
      console.error('❌ Aucun dossier de téléchargement trouvé à surveiller!')
      console.error('📍 Dossiers recherchés:', WATCH_FOLDERS)
      return
    }

    const watcher = chokidar.watch(existingFolders, {
      ignored: [
        /(^|[\/\\])\../, // Ignorer les fichiers cachés
        /node_modules/,
        /\.git/,
        /\.tmp$/,
        /\.part$/,
        /\.crdownload$/ // Fichiers de téléchargement Chrome
      ],
      persistent: true,
      ignoreInitial: true, // Ignorer les fichiers existants car on les a déjà traités
      depth: 5, // Scanner jusqu'à 5 niveaux de profondeur
      awaitWriteFinish: {
        stabilityThreshold: 5000, // Attendre 5 secondes que le fichier soit stable
        pollInterval: 1000 // Vérifier chaque seconde
      }
    })

    watcher
      .on('add', filePath => {
        console.log(`📁 Nouveau fichier ajouté: ${path.basename(filePath)}`)
        console.log(`📍 Chemin complet: ${filePath}`)
        this.handleNewFile(filePath)
      })
      .on('ready', () => {
        console.log('👁️ Surveillance active des nouveaux fichiers')
        console.log(`📍 Dossiers surveillés: ${existingFolders.join(', ')}`)
      })
      .on('error', error => console.error('❌ Erreur de surveillance:', error))
  }

  // Gérer les nouveaux fichiers avec vérification de stabilité
  async handleNewFile(filePath) {
    const fileName = path.basename(filePath)
    const ext = path.extname(filePath).toLowerCase()
    const fileDir = path.dirname(filePath)
    
    console.log(`📁 Nouveau fichier détecté: ${fileName}`)

    // Vérifier si le fichier existe encore (peut avoir été supprimé)
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ Fichier supprimé avant traitement: ${fileName}`)
      return
    }

    // Vérifier le type de fichier
    if (VIDEO_EXTENSIONS.includes(ext)) {
      console.log(`🎬 Fichier vidéo détecté: ${fileName}`)
      
      // Vérifier si on traite déjà ce dossier
      const isInMovieFolder = this.isInMovieFolder(filePath)
      const folderKey = isInMovieFolder ? fileDir : filePath
      
      if (this.processingQueue.has(folderKey)) {
        console.log(`⏳ Dossier/fichier déjà en cours de traitement: ${path.basename(folderKey)}`)
        return
      }
      
      this.processingQueue.add(folderKey)
      
      try {
        // Traiter directement car chokidar attend déjà la stabilité
        await this.processMovie(filePath)
      } finally {
        this.processingQueue.delete(folderKey)
      }
      
    } else if (SUBTITLE_EXTENSIONS.includes(ext) || IMAGE_EXTENSIONS.includes(ext) || INFO_EXTENSIONS.includes(ext)) {
      console.log(`📎 Fichier associé détecté: ${fileName}`)
      // Les fichiers associés seront déplacés avec le dossier complet
      console.log(`📎 Fichier associé sera traité avec le dossier principal`)
    } else {
      console.log(`⚠️ Type de fichier non supporté: ${fileName}`)
    }
  }

  // Traiter un film
  async processMovie(filePath) {
    try {
      console.log(`🔍 Traitement du film: ${path.basename(filePath)}`)
      
      // Déterminer si le fichier est dans un dossier de film ou seul
      const fileDir = path.dirname(filePath)
      const fileName = path.basename(filePath)
      const isInMovieFolder = this.isInMovieFolder(filePath)
      
      console.log(`📁 Fichier dans dossier: ${isInMovieFolder ? 'Oui' : 'Non'}`)
      console.log(`📍 Répertoire source: ${fileDir}`)
      
      // Extraire les informations du nom de fichier ou dossier
      const movieInfo = isInMovieFolder ? 
        this.extractMovieInfo(path.basename(fileDir)) : 
        this.extractMovieInfo(filePath)
      
      console.log('📝 Info extraite:', movieInfo)
      
      // Rechercher les métadonnées sur TMDB
      let metadata = null
      if (this.moviedb) {
        metadata = await this.getMovieMetadata(movieInfo.title)
      }
      
      // Créer le dossier de destination
      const finalTitle = metadata ? metadata.title : movieInfo.title
      const year = metadata ? metadata.year : movieInfo.year
      const folderName = year ? `${finalTitle} (${year})` : finalTitle
      const sanitizedFolderName = sanitize(folderName)
      const targetFolder = path.join(MOVIES_FOLDER, sanitizedFolderName)
      
      // Créer le dossier s'il n'existe pas
      await fs.promises.mkdir(targetFolder, { recursive: true })
      
      if (isInMovieFolder) {
        // Déplacer tout le dossier du film
        console.log(`📦 Déplacement du dossier complet: ${path.basename(fileDir)}`)
        await this.moveMovieFolder(fileDir, targetFolder)
      } else {
        // Déplacer seulement le fichier vidéo
        console.log(`📦 Déplacement du fichier seul: ${fileName}`)
        const fileExtension = path.extname(filePath)
        const targetFileName = `${sanitizedFolderName}${fileExtension}`
        const targetPath = path.join(targetFolder, targetFileName)
        
        await fs.promises.copyFile(filePath, targetPath)
        await fs.promises.unlink(filePath)
        console.log(`📦 Fichier déplacé: ${targetPath}`)
      }
      
      // Enregistrer les informations du film traité
      this.processedMovies.set(filePath, {
        cleanTitle: movieInfo.title,
        targetFolder: targetFolder,
        metadata: metadata
      })
      
      // Créer le fichier d'informations
      await this.createInfoFile(targetFolder, {
        ...movieInfo,
        metadata,
        finalTitle,
        year
      })
      
      // Télécharger les images (poster et bannière) depuis TMDB
      if (metadata && (metadata.poster_path || metadata.backdrop_path)) {
        await this.downloadMovieImages(targetFolder, metadata, sanitizedFolderName)
      }
      
      console.log(`✅ Film organisé avec succès: ${folderName}`)
      
    } catch (error) {
      console.error('❌ Erreur lors du traitement du film:', error.message)
    }
  }

  // Vérifier si un fichier vidéo est dans un dossier de film
  isInMovieFolder(filePath) {
    const fileDir = path.dirname(filePath)
    const parentDir = path.dirname(fileDir)
    
    // Vérifier si on est dans un sous-dossier des dossiers surveillés
    const isInWatchFolder = WATCH_FOLDERS.some(watchFolder => 
      fileDir.startsWith(watchFolder) && fileDir !== watchFolder
    )
    
    return isInWatchFolder
  }

  // Déplacer tout un dossier de film
  async moveMovieFolder(sourceFolder, targetFolder) {
    try {
      console.log(`📁 Copie du dossier: ${sourceFolder} -> ${targetFolder}`)
      
      // Copier récursivement tout le contenu
      await fs.copy(sourceFolder, targetFolder, {
        overwrite: true,
        preserveTimestamps: true
      })
      
      // Supprimer le dossier source après copie réussie
      await fs.remove(sourceFolder)
      
      console.log(`✅ Dossier déplacé avec succès`)
      
    } catch (error) {
      console.error('❌ Erreur lors du déplacement du dossier:', error.message)
      throw error
    }
  }

  // Extraire les informations du nom de fichier
  extractMovieInfo(filename) {
    const name = path.parse(filename).name
    const yearMatch = name.match(/(\d{4})/)
    const year = yearMatch ? parseInt(yearMatch[1]) : null
    
    let title = name
      .replace(/\d{4}.*/, '')
      .replace(/[\.\-_]+/g, ' ')
      .trim()

    return { title, year, originalName: filename }
  }

  // Rechercher sur TMDB
  async getMovieMetadata(title) {
    if (!this.moviedb) {
      console.log('⚠️ Clé API TMDB non configurée')
      return null
    }
    
    try {
      console.log(`🔍 Recherche TMDB: "${title}"`)
      const searchResult = await this.moviedb.searchMovie({ query: title })
      
      if (searchResult.results && searchResult.results.length > 0) {
        const movie = searchResult.results[0]
        console.log(`✅ Film trouvé sur TMDB: ${movie.title} (${movie.release_date?.split('-')[0]})`)
        
        // Récupérer les détails complets du film pour avoir plus d'informations
        let detailedMovie = movie
        try {
          const details = await this.moviedb.movieInfo({ id: movie.id })
          detailedMovie = { ...movie, ...details }
          console.log(`📋 Détails complets récupérés pour: ${movie.title}`)
        } catch (detailError) {
          console.warn('⚠️ Impossible de récupérer les détails complets:', detailError.message)
        }
        
        return {
          title: detailedMovie.title,
          year: detailedMovie.release_date ? new Date(detailedMovie.release_date).getFullYear() : null,
          overview: detailedMovie.overview,
          poster_path: detailedMovie.poster_path,
          backdrop_path: detailedMovie.backdrop_path,
          genres: detailedMovie.genres || detailedMovie.genre_ids || [],
          rating: detailedMovie.vote_average,
          originalLanguage: detailedMovie.original_language,
          spokenLanguages: detailedMovie.spoken_languages || [],
          voteAverage: detailedMovie.vote_average,
          voteCount: detailedMovie.vote_count,
          popularity: detailedMovie.popularity,
          adult: detailedMovie.adult,
          tmdbId: detailedMovie.id
        }
      }
      
      console.log(`⚠️ Aucun résultat TMDB pour: ${title}`)
      return null
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des métadonnées TMDB:', error.message)
      return null
    }
  }

  // Créer un fichier d'informations
  async createInfoFile(movieDir, movieInfo) {
    try {
      const infoData = {
        // Informations de base
        originalName: movieInfo.originalName,
        extractedTitle: movieInfo.title,
        extractedYear: movieInfo.year,
        processedDate: new Date().toISOString(),
        
        // Informations finales pour le site
        displayTitle: movieInfo.finalTitle || movieInfo.title,
        displayYear: movieInfo.year,
        folderName: path.basename(movieDir),
        
        // Fichiers d'images
        images: {
          poster: 'poster.jpg',
          fanart: 'fanart.jpg'
        },
        
        // Métadonnées TMDB si disponibles
        ...(movieInfo.metadata && {
          tmdb: {
            id: movieInfo.metadata.tmdbId,
            title: movieInfo.metadata.title,
            originalTitle: movieInfo.metadata.original_title,
            overview: movieInfo.metadata.overview,
            releaseDate: movieInfo.metadata.release_date,
            year: movieInfo.metadata.year,
            voteAverage: movieInfo.metadata.voteAverage,
            voteCount: movieInfo.metadata.voteCount,
            popularity: movieInfo.metadata.popularity,
            adult: movieInfo.metadata.adult,
            genres: movieInfo.metadata.genres,
            posterPath: movieInfo.metadata.poster_path,
            backdropPath: movieInfo.metadata.backdrop_path,
            originalLanguage: movieInfo.metadata.originalLanguage,
            spokenLanguages: movieInfo.metadata.spokenLanguages
          }
        })
      }

      const infoPath = path.join(movieDir, 'movie.nfo')
      await fs.writeJson(infoPath, infoData, { spaces: 2 })
      console.log('📋 Fichier d\'informations créé avec métadonnées complètes')

    } catch (error) {
      console.error('❌ Erreur création fichier info:', error)
    }
  }

  // Télécharger les images (poster et bannière) depuis TMDB
  async downloadMovieImages(targetFolder, metadata, sanitizedFolderName) {
    try {
      console.log('🖼️ Téléchargement des images depuis TMDB...')
      
      // Télécharger le poster si disponible
      if (metadata.poster_path) {
        const posterUrl = `https://image.tmdb.org/t/p/w500${metadata.poster_path}`
        const posterResponse = await axios.get(posterUrl, { responseType: 'arraybuffer' })
        const posterPath = path.join(targetFolder, 'poster.jpg')
        await fs.promises.writeFile(posterPath, posterResponse.data)
        console.log('📸 Poster téléchargé: poster.jpg')
      }
      
      // Télécharger la bannière si disponible
      if (metadata.backdrop_path) {
        const backdropUrl = `https://image.tmdb.org/t/p/w1280${metadata.backdrop_path}`
        const backdropResponse = await axios.get(backdropUrl, { responseType: 'arraybuffer' })
        const backdropPath = path.join(targetFolder, 'fanart.jpg')
        await fs.promises.writeFile(backdropPath, backdropResponse.data)
        console.log('🖼️ Bannière téléchargée: fanart.jpg')
      }
      
      console.log('✅ Images téléchargées avec succès')
      
    } catch (error) {
      console.error('❌ Erreur lors du téléchargement des images:', error.message)
    }
  }
}

// Démarrer le service
const organizer = new MediaOrganizer()

// Gestion des signaux pour arrêt propre
process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt du service d\'organisation...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Arrêt du service d\'organisation...')
  process.exit(0)
}) 