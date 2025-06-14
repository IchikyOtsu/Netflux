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
    this.pendingFiles = new Map()
    this.stabilityDelay = 10000 // 10 secondes pour s'assurer que le fichier est stable
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
    
    console.log(`📁 Nouveau fichier détecté: ${fileName}`)

    // Vérifier si le fichier existe encore (peut avoir été supprimé)
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ Fichier supprimé avant traitement: ${fileName}`)
      return
    }

    // Vérifier le type de fichier
    if (VIDEO_EXTENSIONS.includes(ext)) {
      console.log(`🎬 Fichier vidéo détecté: ${fileName}`)
      // Traiter directement car chokidar attend déjà la stabilité
      await this.processMovie(filePath)
    } else if (SUBTITLE_EXTENSIONS.includes(ext) || IMAGE_EXTENSIONS.includes(ext) || INFO_EXTENSIONS.includes(ext)) {
      console.log(`📎 Fichier associé détecté: ${fileName}`)
      await this.handleAssociatedFile(filePath)
    } else {
      console.log(`⚠️ Type de fichier non supporté: ${fileName}`)
    }
  }

  // Programmer le traitement d'un fichier vidéo
  async scheduleVideoProcessing(filePath) {
    const fileName = path.basename(filePath)
    
    // Annuler le traitement précédent s'il existe
    if (this.pendingFiles.has(filePath)) {
      clearTimeout(this.pendingFiles.get(filePath))
    }

    // Programmer le traitement après le délai de stabilité
    const timeoutId = setTimeout(async () => {
      try {
        console.log(`🔍 Vérification de la stabilité: ${fileName}`)
        
        // Vérifier plusieurs fois si le fichier est stable
        let isStable = false
        let attempts = 0
        const maxAttempts = 5
        
        while (!isStable && attempts < maxAttempts) {
          isStable = await this.isFileStable(filePath)
          if (!isStable) {
            console.log(`⏳ Fichier encore en cours de téléchargement, tentative ${attempts + 1}/${maxAttempts}`)
            await new Promise(resolve => setTimeout(resolve, 5000)) // Attendre 5 secondes de plus
          }
          attempts++
        }
        
        if (isStable) {
          console.log(`✅ Fichier stable, traitement en cours: ${fileName}`)
          await this.processMovie(filePath)
        } else {
          console.log(`⚠️ Fichier toujours instable après ${maxAttempts} tentatives: ${fileName}`)
        }
        
        this.pendingFiles.delete(filePath)
      } catch (error) {
        console.error('❌ Erreur lors du traitement du fichier:', error.message)
        this.pendingFiles.delete(filePath)
      }
    }, this.stabilityDelay)

    this.pendingFiles.set(filePath, timeoutId)
  }

  // Gérer les fichiers associés (sous-titres, images, etc.)
  async handleAssociatedFile(filePath) {
    const fileName = path.basename(filePath)
    const baseName = path.basename(filePath, path.extname(filePath))
    
    // Chercher un film correspondant dans les films traités
    let targetMovieFolder = null
    
    for (const [moviePath, movieInfo] of this.processedMovies.entries()) {
      const movieBaseName = path.basename(moviePath, path.extname(moviePath))
      
      // Vérifier si le nom de base correspond ou contient le nom du film
      if (baseName.includes(movieInfo.cleanTitle) || movieInfo.cleanTitle.includes(baseName)) {
        targetMovieFolder = movieInfo.targetFolder
        break
      }
    }
    
    if (targetMovieFolder) {
      try {
        const targetPath = path.join(targetMovieFolder, fileName)
        await fs.promises.copyFile(filePath, targetPath)
        await fs.promises.unlink(filePath)
        console.log(`📎 Fichier associé déplacé: ${targetPath}`)
      } catch (error) {
        console.error(`❌ Erreur lors du déplacement du fichier associé ${fileName}:`, error.message)
      }
    } else {
      console.log(`⚠️ Aucun film correspondant trouvé pour: ${fileName}`)
    }
  }

  // Vérifier si un fichier est stable (pas en cours d'écriture)
  async isFileStable(filePath) {
    try {
      const stats1 = await fs.promises.stat(filePath)
      await new Promise(resolve => setTimeout(resolve, 2000)) // Attendre 2 secondes
      const stats2 = await fs.promises.stat(filePath)
      
      // Vérifier si la taille et la date de modification sont identiques
      return stats1.size === stats2.size && 
             stats1.mtime.getTime() === stats2.mtime.getTime()
    } catch (error) {
      console.error('❌ Erreur lors de la vérification de stabilité:', error.message)
      return false
    }
  }

  // Traiter un film
  async processMovie(filePath) {
    try {
      console.log(`🔍 Traitement du film: ${path.basename(filePath)}`)
      
      // Extraire les informations du nom de fichier
      const movieInfo = this.extractMovieInfo(filePath)
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
      
      // Déplacer le fichier vidéo
      const fileExtension = path.extname(filePath)
      const targetFileName = `${sanitizedFolderName}${fileExtension}`
      const targetPath = path.join(targetFolder, targetFileName)
      
      await fs.promises.copyFile(filePath, targetPath)
      await fs.promises.unlink(filePath)
      
      console.log(`📦 Fichier déplacé: ${targetPath}`)
      
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
      
      console.log(`✅ Film organisé avec succès: ${folderName}`)
      
    } catch (error) {
      console.error('❌ Erreur lors du traitement du film:', error.message)
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
        
        return {
          title: movie.title,
          year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
          overview: movie.overview,
          poster_path: movie.poster_path,
          backdrop_path: movie.backdrop_path,
          genres: movie.genre_ids || [],
          rating: movie.vote_average
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
  async createInfoFile(movieDir, movieInfo, metadata) {
    try {
      const infoData = {
        originalName: movieInfo.originalName,
        extractedTitle: movieInfo.title,
        extractedYear: movieInfo.year,
        processedDate: new Date().toISOString(),
        ...(metadata && {
          tmdb: {
            id: metadata.id,
            title: metadata.title,
            originalTitle: metadata.original_title,
            overview: metadata.overview,
            releaseDate: metadata.release_date,
            voteAverage: metadata.vote_average,
            genres: metadata.genre_ids
          }
        })
      }

      const infoPath = path.join(movieDir, 'movie.nfo')
      await fs.writeJson(infoPath, infoData, { spaces: 2 })
      console.log('📋 Fichier d\'informations créé')

    } catch (error) {
      console.error('❌ Erreur création fichier info:', error)
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