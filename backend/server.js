const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const path = require('path')
const fs = require('fs')
const ffprobe = require('ffprobe')
const ffprobeStatic = require('ffprobe-static')
const mime = require('mime-types')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 5000
const MEDIA_PATH = process.env.MEDIA_PATH || '/media'

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false
}))
app.use(cors())
app.use(morgan('combined'))
app.use(express.json())

// Extensions vidéo supportées
const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v']

// Fonction pour vérifier si un fichier est une vidéo
const isVideoFile = (filename) => {
  const ext = path.extname(filename).toLowerCase()
  return VIDEO_EXTENSIONS.includes(ext)
}

// Fonction pour convertir les codes de langue en noms lisibles
const getLanguageName = (code) => {
  const languages = {
    'en': 'Anglais',
    'fr': 'Français',
    'es': 'Espagnol',
    'de': 'Allemand',
    'it': 'Italien',
    'pt': 'Portugais',
    'ru': 'Russe',
    'ja': 'Japonais',
    'ko': 'Coréen',
    'zh': 'Chinois',
    'ar': 'Arabe',
    'hi': 'Hindi',
    'th': 'Thaï',
    'tr': 'Turc',
    'pl': 'Polonais',
    'nl': 'Néerlandais',
    'sv': 'Suédois',
    'da': 'Danois',
    'no': 'Norvégien',
    'fi': 'Finnois'
  }
  return languages[code] || code.toUpperCase()
}

// Fonction pour lire les métadonnées TMDB depuis le fichier movie.nfo
const getMovieInfo = (movieDir) => {
  try {
    const nfoPath = path.join(movieDir, 'movie.nfo')
    console.log(`🔍 Recherche NFO dans: ${movieDir}`)
    console.log(`📄 Chemin NFO: ${nfoPath}`)
    console.log(`📄 NFO existe: ${fs.existsSync(nfoPath)}`)
    
    if (fs.existsSync(nfoPath)) {
      const nfoContent = fs.readFileSync(nfoPath, 'utf8')
      console.log(`📄 Contenu NFO (${nfoContent.length} caractères):`, nfoContent.substring(0, 200) + '...')
      const parsed = JSON.parse(nfoContent)
      console.log(`✅ NFO parsé avec succès:`, {
        displayTitle: parsed.displayTitle,
        year: parsed.displayYear,
        tmdbTitle: parsed.tmdb?.title
      })
      return parsed
    }
  } catch (error) {
    console.error('❌ Erreur lecture movie.nfo:', error.message)
  }
  return null
}

// Fonction pour vérifier si des images existent
const getMovieImages = (movieDir) => {
  const images = {}
  
  const posterPath = path.join(movieDir, 'poster.jpg')
  const fanartPath = path.join(movieDir, 'fanart.jpg')
  
  console.log(`🖼️ Recherche images dans: ${movieDir}`)
  console.log(`📸 Poster existe: ${fs.existsSync(posterPath)}`)
  console.log(`🖼️ Fanart existe: ${fs.existsSync(fanartPath)}`)
  
  if (fs.existsSync(posterPath)) {
    images.poster = 'poster.jpg'
  }
  if (fs.existsSync(fanartPath)) {
    images.fanart = 'fanart.jpg'
  }
  
  console.log(`🖼️ Images trouvées:`, Object.keys(images))
  return images
}

// Fonction pour détecter les sous-titres
const getMovieSubtitles = (movieDir) => {
  const subtitles = []
  
  try {
    const subsDir = path.join(movieDir, 'Subs')
    console.log(`🔤 Recherche sous-titres dans: ${subsDir}`)
    
    if (fs.existsSync(subsDir)) {
      const subFiles = fs.readdirSync(subsDir)
      console.log(`📝 Fichiers trouvés dans Subs:`, subFiles)
      
      subFiles.forEach(file => {
        const ext = path.extname(file).toLowerCase()
        if (['.srt', '.vtt', '.ass', '.ssa', '.sub'].includes(ext)) {
          // Extraire la langue du nom de fichier
          const baseName = path.basename(file, ext)
          let language = 'unknown'
          
          // Méthode 1: Chercher un code de langue dans le nom (ex: "movie.fr.srt" -> "fr")
          const parts = baseName.split('.')
          if (parts.length > 1) {
            const lastPart = parts[parts.length - 1].toLowerCase()
            // Vérifier si c'est un code de langue valide (2-3 caractères)
            if (/^[a-z]{2,3}$/.test(lastPart)) {
              language = lastPart
            }
          }
          
          // Méthode 2: Si pas trouvé, chercher dans le nom complet
          if (language === 'unknown') {
            const fileName = baseName.toLowerCase()
            if (fileName.includes('french') || fileName.includes('francais') || fileName.includes('fr')) {
              language = 'fr'
            } else if (fileName.includes('english') || fileName.includes('anglais') || fileName.includes('en')) {
              language = 'en'
            } else if (fileName.includes('spanish') || fileName.includes('espagnol') || fileName.includes('es')) {
              language = 'es'
            } else if (fileName.includes('german') || fileName.includes('allemand') || fileName.includes('de')) {
              language = 'de'
            } else if (fileName.includes('italian') || fileName.includes('italien') || fileName.includes('it')) {
              language = 'it'
            } else {
              // Utiliser le nom du fichier comme langue si aucun code trouvé
              language = baseName.replace(/[^a-zA-Z]/g, '').toLowerCase().substring(0, 10)
            }
          }
          
          subtitles.push({
            file: file,
            path: path.join('Subs', file),
            language: language,
            format: ext.substring(1) // Enlever le point
          })
        }
      })
    }
    
    console.log(`🔤 Sous-titres trouvés:`, subtitles.map(s => `${s.language} (${s.format})`))
  } catch (error) {
    console.error('❌ Erreur lors de la recherche de sous-titres:', error)
  }
  
  return subtitles
}

// Fonction pour obtenir les métadonnées d'une vidéo avec ffprobe
const getVideoMetadata = async (filePath) => {
  try {
    // Récupérer la taille du fichier depuis le système de fichiers
    const stats = fs.statSync(filePath)
    const fileSize = stats.size
    
    // Essayer d'obtenir les métadonnées avec ffprobe
    let duration = 0
    let bitrate = 0
    let resolution = null
    let codec = null
    let fps = null
    
    try {
      const metadata = await ffprobe(filePath, { path: ffprobeStatic.path })
      
      if (metadata && metadata.streams) {
        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video')
        const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio')
        
        // Durée depuis le format ou le stream vidéo
        if (metadata.format?.duration) {
          duration = parseFloat(metadata.format.duration)
        } else if (videoStream?.duration) {
          duration = parseFloat(videoStream.duration)
        }
        
        // Bitrate
        if (metadata.format?.bit_rate) {
          bitrate = parseInt(metadata.format.bit_rate)
        }
        
        // Résolution
        if (videoStream && videoStream.width && videoStream.height) {
          resolution = `${videoStream.width}x${videoStream.height}`
        }
        
        // Codec
        if (videoStream?.codec_name) {
          codec = videoStream.codec_name
        }
        
        // FPS
        if (videoStream?.r_frame_rate) {
          try {
            fps = eval(videoStream.r_frame_rate)
          } catch (e) {
            fps = null
          }
        }
      }
    } catch (ffprobeError) {
      console.warn('Erreur ffprobe pour', path.basename(filePath), ':', ffprobeError.message)
      // Continuer avec les valeurs par défaut
    }
    
    return {
      duration: duration,
      size: fileSize, // Toujours depuis fs.statSync
      bitrate: bitrate,
      resolution: resolution,
      codec: codec,
      fps: fps
    }
  } catch (error) {
    console.error('Erreur lors de l\'analyse des métadonnées pour', path.basename(filePath), ':', error.message)
    
    // Fallback : au moins récupérer la taille du fichier
    try {
      const stats = fs.statSync(filePath)
      return {
        duration: 0,
        size: stats.size,
        bitrate: 0,
        resolution: null,
        codec: null,
        fps: null
      }
    } catch (statError) {
      return {
        duration: 0,
        size: 0,
        bitrate: 0,
        resolution: null,
        codec: null,
        fps: null
      }
    }
  }
}

// Fonction pour lister les fichiers récursivement avec filtrage
const getVideoFiles = (dirPath, baseDir = dirPath, options = {}) => {
  let files = []
  
  try {
    const items = fs.readdirSync(dirPath)
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        const relativeDirPath = path.relative(baseDir, fullPath)
        
        // Filtrer les dossiers selon les options
        if (options.excludeDownloads && (item.toLowerCase() === 'downloads' || relativeDirPath.toLowerCase().includes('downloads'))) {
          console.log(`📁 Dossier exclu: ${relativeDirPath}`)
          continue
        }
        
        if (options.onlyFilms && !relativeDirPath.toLowerCase().startsWith('films')) {
          continue
        }
        
        // Récursion dans les sous-dossiers
        files = files.concat(getVideoFiles(fullPath, baseDir, options))
      } else if (stat.isFile() && isVideoFile(item)) {
        const relativePath = path.relative(baseDir, fullPath)
        const movieDir = path.dirname(fullPath)
        const relativeDir = path.dirname(relativePath)
        
        // Filtrer les fichiers selon les options
        if (options.excludeDownloads && relativeDir.toLowerCase().includes('downloads')) {
          console.log(`🎬 Fichier exclu (downloads): ${relativePath}`)
          continue
        }
        
        if (options.onlyFilms && !relativeDir.toLowerCase().startsWith('films')) {
          continue
        }
        
        // Lire les métadonnées TMDB si disponibles
        const movieInfo = getMovieInfo(movieDir)
        const images = getMovieImages(movieDir)
        const subtitles = getMovieSubtitles(movieDir)
        
        // Utiliser le chemin relatif comme identifiant unique
        files.push({
          name: item, // Nom du fichier seulement
          path: relativePath, // Chemin relatif complet depuis media/
          fullPath: fullPath,
          displayName: movieInfo?.displayTitle || path.parse(item).name, // Nom TMDB ou nom de fichier
          directory: relativeDir, // Dossier parent
          size: stat.size, // Taille du fichier depuis fs.statSync
          modified: stat.mtime,
          
          // Métadonnées TMDB
          movieInfo: movieInfo,
          images: images,
          subtitles: subtitles,
          
          // Informations d'affichage améliorées
          title: movieInfo?.displayTitle || path.parse(item).name,
          year: movieInfo?.displayYear || movieInfo?.extractedYear,
          overview: movieInfo?.tmdb?.overview,
          rating: movieInfo?.tmdb?.voteAverage,
          genres: movieInfo?.tmdb?.genres || [],
          originalLanguage: movieInfo?.tmdb?.originalLanguage || null,
          spokenLanguages: movieInfo?.tmdb?.spokenLanguages || []
        })
      }
    }
  } catch (error) {
    console.error('Erreur lors de la lecture du dossier:', error)
  }
  
  return files
}

// Route: Lister toutes les vidéos (exclut downloads)
app.get('/api/videos', async (req, res) => {
  try {
    console.log('Scanning media directory (excluding downloads):', MEDIA_PATH)
    
    if (!fs.existsSync(MEDIA_PATH)) {
      return res.status(404).json({ 
        error: 'Dossier média non trouvé',
        path: MEDIA_PATH 
      })
    }
    
    const videoFiles = getVideoFiles(MEDIA_PATH, MEDIA_PATH, { excludeDownloads: true })
    console.log(`📁 Fichiers trouvés (hors downloads):`)
    videoFiles.forEach(file => {
      console.log(`   - ${file.path} (dans ${file.directory})`)
      console.log(`     Taille: ${(file.size / 1024 / 1024).toFixed(2)} MB`)
      console.log(`     Métadonnées TMDB: ${file.movieInfo ? 'Oui' : 'Non'}`)
      console.log(`     Images: ${Object.keys(file.images || {}).join(', ') || 'Aucune'}`)
    })
    
    // Ajouter seulement les métadonnées techniques (FFProbe)
    const videosWithMetadata = await Promise.all(
      videoFiles.map(async (file) => {
        const technicalMetadata = await getVideoMetadata(file.fullPath)
        
        return {
          ...file, // Inclut déjà movieInfo, images, title, year, overview, rating, genres, size
          // Fusionner les métadonnées techniques en préservant la taille du fichier
          duration: technicalMetadata.duration,
          bitrate: technicalMetadata.bitrate,
          resolution: technicalMetadata.resolution,
          codec: technicalMetadata.codec,
          fps: technicalMetadata.fps,
          // Garder la taille du fichier originale si elle est plus fiable
          size: file.size || technicalMetadata.size
        }
      })
    )
    
    // Trier par date de modification (plus récent en premier)
    videosWithMetadata.sort((a, b) => new Date(b.modified) - new Date(a.modified))
    
    res.json(videosWithMetadata)
  } catch (error) {
    console.error('Erreur lors de la récupération des vidéos:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Route: Lister uniquement les films (dossier films)
app.get('/api/films', async (req, res) => {
  try {
    console.log('Scanning films directory:', MEDIA_PATH)
    
    if (!fs.existsSync(MEDIA_PATH)) {
      return res.status(404).json({ 
        error: 'Dossier média non trouvé',
        path: MEDIA_PATH 
      })
    }
    
    const filmFiles = getVideoFiles(MEDIA_PATH, MEDIA_PATH, { onlyFilms: true })
    console.log(`🎬 Films trouvés:`)
    filmFiles.forEach(file => {
      console.log(`   - ${file.path} (dans ${file.directory})`)
      console.log(`     Taille: ${(file.size / 1024 / 1024).toFixed(2)} MB`)
      console.log(`     Métadonnées TMDB: ${file.movieInfo ? 'Oui' : 'Non'}`)
      console.log(`     Images: ${Object.keys(file.images || {}).join(', ') || 'Aucune'}`)
    })
    
    // Ajouter seulement les métadonnées techniques (FFProbe)
    const filmsWithMetadata = await Promise.all(
      filmFiles.map(async (file) => {
        const technicalMetadata = await getVideoMetadata(file.fullPath)
        
        return {
          ...file, // Inclut déjà movieInfo, images, title, year, overview, rating, genres, size
          // Fusionner les métadonnées techniques en préservant la taille du fichier
          duration: technicalMetadata.duration,
          bitrate: technicalMetadata.bitrate,
          resolution: technicalMetadata.resolution,
          codec: technicalMetadata.codec,
          fps: technicalMetadata.fps,
          // Garder la taille du fichier originale si elle est plus fiable
          size: file.size || technicalMetadata.size
        }
      })
    )
    
    // Trier par date de modification (plus récent en premier)
    filmsWithMetadata.sort((a, b) => new Date(b.modified) - new Date(a.modified))
    
    res.json(filmsWithMetadata)
  } catch (error) {
    console.error('Erreur lors de la récupération des films:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Route: Obtenir les métadonnées d'une vidéo spécifique
app.get('/api/videos/:filename/metadata', async (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename)
    const filePath = path.join(MEDIA_PATH, filename) // filename est maintenant le chemin relatif complet
    
    console.log('🔍 Recherche métadonnées pour:', filename)
    console.log('   - Chemin complet:', filePath)
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        error: 'Fichier non trouvé',
        path: filePath,
        filename: filename
      })
    }
    
    const stats = fs.statSync(filePath)
    const metadata = await getVideoMetadata(filePath)
    
    // Récupérer les métadonnées TMDB et images
    const movieDir = path.dirname(filePath)
    const movieInfo = getMovieInfo(movieDir)
    const images = getMovieImages(movieDir)
    const subtitles = getMovieSubtitles(movieDir)
    
    res.json({
      name: path.basename(filename),
      path: filename,
      displayName: movieInfo?.displayTitle || path.parse(path.basename(filename)).name,
      directory: path.dirname(filename),
      size: stats.size, // Taille du fichier depuis fs.statSync
      modified: stats.mtime,
      
      // Métadonnées techniques FFProbe
      duration: metadata.duration,
      bitrate: metadata.bitrate,
      resolution: metadata.resolution,
      codec: metadata.codec,
      fps: metadata.fps,
      
      // Métadonnées TMDB
      movieInfo: movieInfo,
      images: images,
      subtitles: subtitles,
      
      // Informations d'affichage
      title: movieInfo?.displayTitle || path.parse(path.basename(filename)).name,
      year: movieInfo?.displayYear || movieInfo?.extractedYear,
      overview: movieInfo?.tmdb?.overview,
      rating: movieInfo?.tmdb?.voteAverage,
      genres: movieInfo?.tmdb?.genres || [],
      originalLanguage: movieInfo?.tmdb?.originalLanguage || null,
      spokenLanguages: movieInfo?.tmdb?.spokenLanguages || []
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des métadonnées:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Route: Streaming vidéo avec support du range
app.get('/api/video/:filename(*)', (req, res) => { // (*) pour capturer les slashes dans le chemin
  try {
    const filename = decodeURIComponent(req.params.filename)
    const filePath = path.join(MEDIA_PATH, filename) // filename est maintenant le chemin relatif complet
    
    console.log('🔍 Tentative de lecture du fichier:')
    console.log('   - Nom du fichier (chemin relatif):', filename)
    console.log('   - Chemin complet:', filePath)
    console.log('   - Dossier média:', MEDIA_PATH)
    console.log('   - Le fichier existe:', fs.existsSync(filePath))
    
    if (!fs.existsSync(filePath)) {
      console.error('❌ Fichier non trouvé:', filePath)
      return res.status(404).json({ 
        error: 'Fichier non trouvé',
        path: filePath,
        filename: filename
      })
    }
    
    const stat = fs.statSync(filePath)
    const fileSize = stat.size
    const range = req.headers.range
    
    console.log('📊 Informations du fichier:')
    console.log('   - Taille:', fileSize, 'bytes')
    console.log('   - Type MIME:', mime.lookup(filePath))
    console.log('   - Range demandé:', range)
    
    if (range) {
      // Support du streaming progressif
      const parts = range.replace(/bytes=/, "").split("-")
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunksize = (end - start) + 1
      
      const file = fs.createReadStream(filePath, { start, end })
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': mime.lookup(filePath) || 'video/mp4',
      }
      
      console.log('📤 Envoi du stream avec headers:', head)
      res.writeHead(206, head)
      file.pipe(res)
    } else {
      // Streaming complet
      const head = {
        'Content-Length': fileSize,
        'Content-Type': mime.lookup(filePath) || 'video/mp4',
      }
      
      console.log('📤 Envoi du fichier complet avec headers:', head)
      res.writeHead(200, head)
      fs.createReadStream(filePath).pipe(res)
    }
  } catch (error) {
    console.error('❌ Erreur lors du streaming:', error)
    res.status(500).json({ 
      error: 'Erreur serveur',
      details: error.message
    })
  }
})

// Route: Générer/servir les miniatures (optionnel)
app.get('/api/thumbnail/:filename', (req, res) => {
  // Pour l'instant, retourner une image par défaut ou une erreur 404
  res.status(404).json({ error: 'Miniatures non implémentées' })
})

// Route: Servir les fichiers de sous-titres
app.get('/api/subtitles/:moviePath(*)', (req, res) => {
  try {
    const moviePath = decodeURIComponent(req.params.moviePath)
    const subtitleFile = req.query.file // Nom du fichier de sous-titre
    const subtitleIndex = req.query.index // Index du sous-titre
    
    let subtitlePath
    
    if (subtitleFile) {
      // Méthode par nom de fichier
      const movieDir = path.join(MEDIA_PATH, path.dirname(moviePath))
      subtitlePath = path.join(movieDir, 'Subs', subtitleFile)
    } else if (subtitleIndex !== undefined) {
      // Méthode par index
      const movieDir = path.join(MEDIA_PATH, path.dirname(moviePath))
      const subtitles = getMovieSubtitles(movieDir)
      
      const index = parseInt(subtitleIndex)
      if (index < 0 || index >= subtitles.length) {
        return res.status(400).json({ 
          error: 'Index de sous-titre invalide',
          index: index,
          available: subtitles.length
        })
      }
      
      subtitlePath = path.join(movieDir, 'Subs', subtitles[index].file)
    } else {
      return res.status(400).json({ error: 'Paramètre file ou index manquant' })
    }
    

    
    if (!fs.existsSync(subtitlePath)) {
      return res.status(404).json({ 
        error: 'Fichier de sous-titre non trouvé',
        path: subtitlePath,
        file: subtitleFile
      })
    }
    
    // Servir le fichier de sous-titre avec les bons headers
    const stat = fs.statSync(subtitlePath)
    const mimeType = mime.lookup(subtitlePath) || 'text/plain'
    
    res.set({
      'Content-Type': mimeType,
      'Content-Length': stat.size,
      'Cache-Control': 'public, max-age=3600', // Cache 1h
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type'
    })
    
    fs.createReadStream(subtitlePath).pipe(res)
    
  } catch (error) {
    console.error('Erreur lors du service de sous-titre:', error)
    res.status(500).json({ 
      error: 'Erreur serveur',
      details: error.message
    })
  }
})

// Route: Servir les images des films (poster, fanart)
app.get('/api/image/:moviePath(*)', (req, res) => {
  try {
    const moviePath = decodeURIComponent(req.params.moviePath)
    const imageType = req.query.type || 'poster'
    
    // Construire le chemin vers le dossier du film
    const movieDir = path.join(MEDIA_PATH, path.dirname(moviePath))
    const imageName = imageType === 'fanart' ? 'fanart.jpg' : 'poster.jpg'
    const imagePath = path.join(movieDir, imageName)
    
    console.log('🖼️ Demande d\'image:')
    console.log('   - Chemin film:', moviePath)
    console.log('   - Type:', imageType)
    console.log('   - Dossier film:', movieDir)
    console.log('   - Chemin image:', imagePath)
    console.log('   - MEDIA_PATH:', MEDIA_PATH)
    console.log('   - path.dirname(moviePath):', path.dirname(moviePath))
    console.log('   - Dossier existe:', fs.existsSync(movieDir))
    console.log('   - Image existe:', fs.existsSync(imagePath))
    
    // Lister le contenu du dossier pour debug
    if (fs.existsSync(movieDir)) {
      try {
        const contents = fs.readdirSync(movieDir)
        console.log('   - Contenu du dossier:', contents)
      } catch (e) {
        console.log('   - Erreur lecture dossier:', e.message)
      }
    }
    
    if (!fs.existsSync(imagePath)) {
      console.error('❌ Image non trouvée:', imagePath)
      return res.status(404).json({ 
        error: 'Image non trouvée',
        path: imagePath,
        type: imageType,
        movieDir: movieDir,
        moviePath: moviePath,
        mediaPath: MEDIA_PATH
      })
    }
    
    // Servir l'image avec les bons headers
    const stat = fs.statSync(imagePath)
    const mimeType = mime.lookup(imagePath) || 'image/jpeg'
    
    console.log('✅ Servir image:', imagePath, `(${stat.size} bytes)`)
    
    res.set({
      'Content-Type': mimeType,
      'Content-Length': stat.size,
      'Cache-Control': 'public, max-age=86400', // Cache 24h
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type'
    })
    
    fs.createReadStream(imagePath).pipe(res)
    
  } catch (error) {
    console.error('❌ Erreur lors du service d\'image:', error)
    res.status(500).json({ 
      error: 'Erreur serveur',
      details: error.message
    })
  }
})

// Route: Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    mediaPath: MEDIA_PATH,
    mediaExists: fs.existsSync(MEDIA_PATH)
  })
})

// Route: Debug pour tester les images
app.get('/api/debug/images/:moviePath(*)', (req, res) => {
  try {
    const moviePath = decodeURIComponent(req.params.moviePath)
    const imageType = req.query.type || 'poster'
    
    // Construire le chemin vers le dossier du film
    const movieDir = path.join(MEDIA_PATH, path.dirname(moviePath))
    const imageName = imageType === 'fanart' ? 'fanart.jpg' : 'poster.jpg'
    const imagePath = path.join(movieDir, imageName)
    
    // Lister le contenu du dossier
    let folderContents = []
    try {
      folderContents = fs.readdirSync(movieDir)
    } catch (e) {
      folderContents = ['Erreur lecture dossier: ' + e.message]
    }
    
    res.json({
      debug: {
        moviePath: moviePath,
        imageType: imageType,
        movieDir: movieDir,
        imageName: imageName,
        imagePath: imagePath,
        imageExists: fs.existsSync(imagePath),
        folderExists: fs.existsSync(movieDir),
        folderContents: folderContents,
        mediaPath: MEDIA_PATH
      }
    })
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      stack: error.stack
    })
  }
})

// Middleware de gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Erreur serveur interne' })
})

// Middleware pour les routes non trouvées
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' })
})

// Démarrage du serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur Netflux démarré sur le port ${PORT}`)
  console.log(`📁 Dossier média: ${MEDIA_PATH}`)
  console.log(`🎬 Extensions supportées: ${VIDEO_EXTENSIONS.join(', ')}`)
  
  // Vérifier si le dossier média existe
  if (fs.existsSync(MEDIA_PATH)) {
    const videoFiles = getVideoFiles(MEDIA_PATH)
    console.log(`📺 ${videoFiles.length} fichier(s) vidéo trouvé(s)`)
  } else {
    console.warn(`⚠️  Le dossier média ${MEDIA_PATH} n'existe pas`)
  }
}) 