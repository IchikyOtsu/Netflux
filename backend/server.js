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
        // Utiliser le chemin relatif comme identifiant unique
        files.push({
          name: item, // Nom du fichier seulement
          path: relativePath, // Chemin relatif complet depuis media/
          fullPath: fullPath,
          displayName: path.parse(item).name, // Nom sans extension
          directory: path.dirname(relativePath), // Dossier parent
          size: stat.size,
          modified: stat.mtime
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
    })
    
    // Ajouter des métadonnées basiques
    const videosWithMetadata = await Promise.all(
      videoFiles.map(async (file) => {
        const metadata = await getVideoMetadata(file.fullPath)
        return {
          name: file.name,
          path: file.path, // Chemin relatif complet pour l'API
          displayName: file.displayName,
          directory: file.directory,
          size: file.size,
          modified: file.modified,
          ...metadata
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
    
    res.json({
      name: path.basename(filename),
      path: filename,
      displayName: path.parse(path.basename(filename)).name,
      directory: path.dirname(filename),
      size: stats.size,
      modified: stats.mtime,
      ...metadata
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