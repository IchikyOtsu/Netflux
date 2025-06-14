import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactPlayer from 'react-player'
import { ArrowLeft, Volume2, VolumeX, Maximize, Minimize, AlertCircle, Star, Calendar, Clock } from 'lucide-react'
import { getVideoStreamUrl, getVideoMetadata } from '../services/api'

const VideoPlayer = () => {
  const { filename } = useParams() // filename est maintenant le chemin complet encodé
  const navigate = useNavigate()
  const [videoUrl, setVideoUrl] = useState('')
  const [metadata, setMetadata] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [muted, setMuted] = useState(false)
  const [played, setPlayed] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (filename) {
      loadVideo()
    }
  }, [filename])

  const loadVideo = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Décoder le chemin complet
      const videoPath = decodeURIComponent(filename)
      console.log('🎥 Chargement de la vidéo:', videoPath)
      
      // Générer l'URL de streaming avec le chemin complet
      const url = getVideoStreamUrl(videoPath)
      console.log('🎥 URL de streaming:', url)
      setVideoUrl(url)
      
      // Charger les métadonnées avec le chemin complet
      try {
        const meta = await getVideoMetadata(videoPath)
        console.log('📋 Métadonnées chargées:', meta)
        setMetadata(meta)
      } catch (metaError) {
        console.warn('⚠️ Impossible de charger les métadonnées:', metaError)
      }
      
    } catch (err) {
      console.error('❌ Erreur lors du chargement de la vidéo:', err)
      setError(`Impossible de charger la vidéo: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    navigate('/')
  }

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
    setIsFullscreen(!isFullscreen)
  }

  const formatTime = (seconds) => {
    if (!seconds) return '0:00'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // URL de la bannière si disponible
  const fanartUrl = metadata?.images?.fanart ? 
    `/api/image/${encodeURIComponent(filename)}?type=fanart` : 
    null

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-netflix-red mx-auto mb-4"></div>
          <p className="text-white text-lg">Chargement de la vidéo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="relative">
        {/* Header avec bannière en arrière-plan */}
        <div className="relative">
          {fanartUrl && (
            <div className="absolute inset-0 z-0">
              <img 
                src={fanartUrl} 
                alt="Bannière" 
                className="w-full h-full object-cover opacity-30"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black via-black/50 to-black"></div>
            </div>
          )}
          
          <div className="relative z-10 p-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={handleBack}
                className="flex items-center space-x-2 text-white hover:text-netflix-red transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
                <span>Retour</span>
              </button>
            </div>
            
            <div className="max-w-4xl">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {metadata?.title || metadata?.displayName || (metadata?.name && metadata.name.replace(/\.[^/.]+$/, "")) || 'Vidéo'}
              </h1>
              
              <div className="flex items-center space-x-6 mb-4">
                {metadata?.year && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <span className="text-white">{metadata.year}</span>
                  </div>
                )}
                
                {metadata?.rating && (
                  <div className="flex items-center space-x-2">
                    <Star className="w-5 h-5 text-yellow-400 fill-current" />
                    <span className="text-white">{Math.round(metadata.rating * 10) / 10}/10</span>
                  </div>
                )}
                
                {metadata?.duration && (
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <span className="text-white">{formatTime(metadata.duration)}</span>
                  </div>
                )}
              </div>
              
              {metadata?.overview && (
                <p className="text-gray-300 text-lg leading-relaxed max-w-3xl">
                  {metadata.overview}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Video Player */}
        <div className="aspect-video bg-black">
          {error ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center p-6">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-500 text-lg mb-4">{error}</p>
                <div className="text-sm text-gray-400 mb-4">
                  <p>Chemin: {decodeURIComponent(filename)}</p>
                </div>
                <button
                  onClick={handleBack}
                  className="bg-netflix-red hover:bg-red-600 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  Retour à l'accueil
                </button>
              </div>
            </div>
          ) : (
            <ReactPlayer
              url={videoUrl}
              width="100%"
              height="100%"
              controls={true}
              volume={volume}
              muted={muted}
              onProgress={({ played }) => setPlayed(played)}
              onDuration={setDuration}
              onError={(error) => {
                console.error('❌ Erreur ReactPlayer:', error)
                setError(`Erreur lors de la lecture: ${error.message || 'Format non supporté'}`)
              }}
              config={{
                file: {
                  attributes: {
                    controlsList: 'nodownload',
                    disablePictureInPicture: false,
                  }
                }
              }}
            />
          )}
        </div>

        {/* Video Info détaillées */}
        {metadata && (
          <div className="p-6 bg-netflix-black">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-xl font-bold text-white mb-6">Informations techniques</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-gray-300">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">DURÉE</h3>
                  <p>{formatTime(metadata.duration)}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">TAILLE</h3>
                  <p>{metadata.size ? `${(metadata.size / 1024 / 1024 / 1024).toFixed(2)} GB` : 'N/A'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">RÉSOLUTION</h3>
                  <p>{metadata.resolution || 'N/A'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">CODEC</h3>
                  <p>{metadata.codec || 'N/A'}</p>
                </div>
              </div>
              
              {metadata.directory && metadata.directory !== '.' && (
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">DOSSIER</h3>
                  <p className="text-gray-300">{metadata.directory}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default VideoPlayer 