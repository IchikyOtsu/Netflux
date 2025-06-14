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

const MEDIA_PATH = process.env.MEDIA_PATH || '/media'
const TMDB_API_KEY = process.env.TMDB_API_KEY
const WATCH_FOLDERS = (process.env.WATCH_FOLDERS || '/media/downloads').split(',')

// Extensions vidéo supportées
const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v']
const SUBTITLE_EXTENSIONS = ['.srt', '.vtt', '.ass', '.ssa', '.sub']

// Configuration TMDB
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500'

console.log('🎬 Netflux Media Organizer démarré')
console.log(`📁 Dossier média: ${MEDIA_PATH}`)
console.log(`👀 Surveillance des dossiers: ${WATCH_FOLDERS.join(', ')}`)
console.log(`🔑 TMDB API: ${TMDB_API_KEY ? 'Configurée' : 'Non configurée'}`)

class MediaOrganizer {
  constructor() {
    this.processingQueue = new Set()
    this.init()
  }

  async init() {
    await this.setupDirectories()
    this.startWatching()
  }

  // Créer les dossiers nécessaires
  async setupDirectories() {
    const dirs = [
      path.join(MEDIA_PATH, 'films'),
      path.join(MEDIA_PATH, 'series'),
      path.join(MEDIA_PATH, 'downloads'),
      path.join(MEDIA_PATH, 'incoming'),
      path.join(MEDIA_PATH, 'processing')
    ]

    for (const dir of dirs) {
      await fs.ensureDir(dir)
    }
    console.log('📂 Dossiers créés/vérifiés')
  }

  // Démarrer la surveillance des dossiers
  startWatching() {
    const watcher = chokidar.watch(WATCH_FOLDERS, {
      ignored: /(^|[\/\\])\../, // Ignorer les fichiers cachés
      persistent: true,
      ignoreInitial: false
    })

    watcher
      .on('add', filePath => this.handleNewFile(filePath))
      .on('ready', () => console.log('👁️ Surveillance active des nouveaux fichiers'))
      .on('error', error => console.error('❌ Erreur de surveillance:', error))
  }

  // Gérer un nouveau fichier détecté
  async handleNewFile(filePath) {
    try {
      const ext = path.extname(filePath).toLowerCase()
      
      if (!VIDEO_EXTENSIONS.includes(ext)) {
        return // Ignorer les fichiers non-vidéo
      }

      // Éviter le traitement en double
      if (this.processingQueue.has(filePath)) {
        return
      }

      console.log(`🎬 Nouveau fichier détecté: ${path.basename(filePath)}`)
      this.processingQueue.add(filePath)

      // Attendre que le fichier soit complètement téléchargé
      await this.waitForStability(filePath)
      
      // Traiter le film
      await this.processMovie(filePath)

    } catch (error) {
      console.error(`❌ Erreur lors du traitement de ${filePath}:`, error)
    } finally {
      this.processingQueue.delete(filePath)
    }
  }

  // Attendre que le fichier soit stable (téléchargement terminé)
  async waitForStability(filePath) {
    console.log('⏳ Attente stabilité...')
    // Attendre 30 secondes pour s'assurer que le téléchargement est fini
    await new Promise(resolve => setTimeout(resolve, 30000))
  }

  // Traiter un film
  async processMovie(filePath) {
    try {
      console.log(`🔍 Traitement du film: ${path.basename(filePath)}`)

      // Extraire le nom du film du nom de fichier
      const movieInfo = this.extractMovieInfo(path.basename(filePath))
      console.log(`📝 Info extraite:`, movieInfo)

      // Rechercher des métadonnées
      let metadata = null
      if (TMDB_API_KEY) {
        metadata = await this.getMovieMetadata(movieInfo.title)
      }

      // Créer le nom de dossier final
      const finalFolderName = this.createFolderName(movieInfo, metadata)
      const finalMovieDir = path.join(MEDIA_PATH, 'films', finalFolderName)

      // Créer le dossier du film
      await fs.ensureDir(finalMovieDir)

      // Déplacer le fichier vidéo
      const finalVideoPath = path.join(finalMovieDir, this.createFileName(movieInfo, metadata, path.extname(filePath)))
      await fs.move(filePath, finalVideoPath)
      console.log(`📦 Fichier déplacé: ${finalVideoPath}`)

      // Rechercher et déplacer les sous-titres associés
      await this.moveAssociatedFiles(path.dirname(filePath), finalMovieDir, path.basename(filePath, path.extname(filePath)))

      // Télécharger les métadonnées supplémentaires
      if (metadata) {
        await this.downloadAssets(metadata, finalMovieDir)
      }

      // Créer un fichier d'informations
      await this.createInfoFile(finalMovieDir, movieInfo, metadata)

      console.log(`✅ Film organisé avec succès: ${finalFolderName}`)

    } catch (error) {
      console.error(`❌ Erreur lors du traitement du film:`, error)
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
    if (!moviedb) {
      console.log('⚠️ Clé API TMDB non configurée')
      return null
    }
    
    try {
      console.log(`🔍 Recherche TMDB: "${title}"`)
      const searchResult = await moviedb.searchMovie({ query: title })
      
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

  // Créer le nom du dossier final
  createFolderName(movieInfo, metadata) {
    if (metadata) {
      const year = metadata.release_date ? metadata.release_date.split('-')[0] : movieInfo.year
      return sanitize(`${metadata.title} (${year})`)
    }

    const year = movieInfo.year ? ` (${movieInfo.year})` : ''
    return sanitize(`${movieInfo.title}${year}`)
  }

  // Créer le nom du fichier final
  createFileName(movieInfo, metadata, extension) {
    if (metadata) {
      const year = metadata.release_date ? metadata.release_date.split('-')[0] : movieInfo.year
      return sanitize(`${metadata.title} (${year})${extension}`)
    }

    const year = movieInfo.year ? ` (${movieInfo.year})` : ''
    return sanitize(`${movieInfo.title}${year}${extension}`)
  }

  // Déplacer les fichiers associés (sous-titres, etc.)
  async moveAssociatedFiles(sourceDir, destDir, baseName) {
    try {
      const files = await fs.readdir(sourceDir)
      
      for (const file of files) {
        const filePath = path.join(sourceDir, file)
        const ext = path.extname(file).toLowerCase()
        
        // Vérifier si c'est un fichier associé
        if (file.startsWith(baseName) && SUBTITLE_EXTENSIONS.includes(ext)) {
          const destPath = path.join(destDir, file)
          await fs.move(filePath, destPath)
          console.log(`📄 Fichier associé déplacé: ${file}`)
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors du déplacement des fichiers associés:', error)
    }
  }

  // Télécharger les assets du film (poster, backdrop)
  async downloadAssets(metadata, movieDir) {
    try {
      // Télécharger le poster
      if (metadata.poster_path) {
        const posterUrl = `${TMDB_IMAGE_BASE_URL}${metadata.poster_path}`
        const posterPath = path.join(movieDir, 'poster.jpg')
        await this.downloadImage(posterUrl, posterPath)
        console.log('🖼️ Poster téléchargé')
      }

      // Télécharger le backdrop
      if (metadata.backdrop_path) {
        const backdropUrl = `${TMDB_IMAGE_BASE_URL}${metadata.backdrop_path}`
        const backdropPath = path.join(movieDir, 'fanart.jpg')
        await this.downloadImage(backdropUrl, backdropPath)
        console.log('🖼️ Fanart téléchargé')
      }
    } catch (error) {
      console.error('❌ Erreur lors du téléchargement des assets:', error)
    }
  }

  // Télécharger une image
  async downloadImage(url, filePath) {
    try {
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream'
      })

      const writer = fs.createWriteStream(filePath)
      response.data.pipe(writer)

      return new Promise((resolve, reject) => {
        writer.on('finish', resolve)
        writer.on('error', reject)
      })
    } catch (error) {
      console.error(`❌ Erreur téléchargement image ${url}:`, error.message)
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