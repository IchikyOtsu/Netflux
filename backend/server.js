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

// Fonction pour obtenir les métadonnées d'une vidéo avec ffprobe
const getVideoMetadata = async (filePath) => {
  try {
    const metadata = await ffprobe(filePath, { path: ffprobeStatic.path })
    
    const videoStream = metadata.streams.find(stream => stream.codec_type === 'video')
    const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio')
    
    return {
      duration: parseFloat(metadata.format.duration) || 0,
      size: parseInt(metadata.format.size) || 0,
      bitrate: parseInt(metadata.format.bit_rate) || 0,
      resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : null,
      codec: videoStream ? videoStream.codec_name : null,
      fps: videoStream ? eval(videoStream.r_frame_rate) : null
    }
  } catch (error) {
    console.error('Erreur lors de l\'analyse ffprobe:', error)
    return null
  }
}

// Fonction pour lister les fichiers récursivement
const getVideoFiles = (dirPath, baseDir = dirPath) => {
  let files = []
  
  try {
    const items = fs.readdirSync(dirPath)
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        // Récursion dans les sous-dossiers
        files = files.concat(getVideoFiles(fullPath, baseDir))
      } else if (stat.isFile() && isVideoFile(item)) {
        const relativePath = path.relative(baseDir, fullPath)
        const movieDir = path.dirname(fullPath)
        
        // Lire les métadonnées TMDB si disponibles
        const movieInfo = getMovieInfo(movieDir)
        const images = getMovieImages(movieDir)
        
        // Utiliser le chemin relatif comme identifiant unique
        files.push({
          name: item, // Nom du fichier seulement
          path: relativePath, // Chemin relatif complet depuis media/
          fullPath: fullPath,
          displayName: movieInfo?.displayTitle || path.parse(item).name, // Nom TMDB ou nom de fichier
          directory: path.dirname(relativePath), // Dossier parent
          size: stat.size,
          modified: stat.mtime,
          
          // Métadonnées TMDB
          movieInfo: movieInfo,
          images: images,
          
          // Informations d'affichage améliorées
          title: movieInfo?.displayTitle || path.parse(item).name,
          year: movieInfo?.displayYear || movieInfo?.extractedYear,
          overview: movieInfo?.tmdb?.overview,
          rating: movieInfo?.tmdb?.voteAverage,
          genres: movieInfo?.tmdb?.genres || []
        })
      }
    }
  } catch (error) {
    console.error('Erreur lors de la lecture du dossier:', error)
  }
  
  return files
}

// Route: Lister les vidéos
app.get('/api/videos', async (req, res) => {
  try {
    console.log('Scanning media directory:', MEDIA_PATH)
    
    if (!fs.existsSync(MEDIA_PATH)) {
      return res.status(404).json({ 
        error: 'Dossier média non trouvé',
        path: MEDIA_PATH 
      })
    }
    
    const videoFiles = getVideoFiles(MEDIA_PATH)
    console.log(`📁 Fichiers trouvés:`)
    videoFiles.forEach(file => {
      console.log(`   - ${file.path} (dans ${file.directory})`)
      console.log(`     Métadonnées TMDB: ${file.movieInfo ? 'Oui' : 'Non'}`)
      console.log(`     Images: ${Object.keys(file.images || {}).join(', ') || 'Aucune'}`)
    })
    
    // Ajouter seulement les métadonnées techniques (FFProbe)
    const videosWithMetadata = await Promise.all(
      videoFiles.map(async (file) => {
        const technicalMetadata = await getVideoMetadata(file.fullPath)
        
        return {
          ...file, // Inclut déjà movieInfo, images, title, year, overview, rating, genres
          ...technicalMetadata // Ajoute duration, resolution, codec, etc.
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
    
    res.json({
      name: path.basename(filename),
      path: filename,
      displayName: movieInfo?.displayTitle || path.parse(path.basename(filename)).name,
      directory: path.dirname(filename),
      size: stats.size,
      modified: stats.mtime,
      
      // Métadonnées techniques
      ...metadata,
      
      // Métadonnées TMDB
      movieInfo: movieInfo,
      images: images,
      
      // Informations d'affichage
      title: movieInfo?.displayTitle || path.parse(path.basename(filename)).name,
      year: movieInfo?.displayYear || movieInfo?.extractedYear,
      overview: movieInfo?.tmdb?.overview,
      rating: movieInfo?.tmdb?.voteAverage,
      genres: movieInfo?.tmdb?.genres || []
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

// Route: Servir les images des films (poster, fanart)
app.get('/api/image/:moviePath(*)', (req, res) => {
  try {
    const moviePath = decodeURIComponent(req.params.moviePath)
    const imageType = req.query.type || 'poster' // poster ou fanart
    
    // Construire le chemin vers le dossier du film
    const movieDir = path.join(MEDIA_PATH, path.dirname(moviePath))
    const imageName = imageType === 'fanart' ? 'fanart.jpg' : 'poster.jpg'
    const imagePath = path.join(movieDir, imageName)
    
    console.log('🖼️ Demande d\'image:')
    console.log('   - Chemin film:', moviePath)
    console.log('   - Type:', imageType)
    console.log('   - Dossier film:', movieDir)
    console.log('   - Chemin image:', imagePath)
    console.log('   - Existe:', fs.existsSync(imagePath))
    
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ 
        error: 'Image non trouvée',
        path: imagePath,
        type: imageType
      })
    }
    
    // Servir l'image avec les bons headers
    const stat = fs.statSync(imagePath)
    const mimeType = mime.lookup(imagePath) || 'image/jpeg'
    
    res.set({
      'Content-Type': mimeType,
      'Content-Length': stat.size,
      'Cache-Control': 'public, max-age=86400' // Cache 24h
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