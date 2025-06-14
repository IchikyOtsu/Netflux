import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactPlayer from 'react-player'
import { ArrowLeft, Volume2, VolumeX, Maximize, Minimize, AlertCircle } from 'lucide-react'
import { getVideoStreamUrl, getVideoMetadata } from '../services/api'

const VideoPlayer = () => {
  const { filename } = useParams()
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
      
      // Générer l'URL de streaming
      const url = getVideoStreamUrl(filename)
      console.log('🎥 Tentative de lecture:', url)
      setVideoUrl(url)
      
      // Charger les métadonnées
      try {
        const meta = await getVideoMetadata(filename)
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
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black to-transparent p-6">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 text-white hover:text-netflix-red transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
              <span>Retour</span>
            </button>
            
            <div className="text-white">
              <h1 className="text-lg font-semibold">
                {metadata?.displayName || decodeURIComponent(filename)}
              </h1>
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

        {/* Video Info */}
        {metadata && (
          <div className="p-6 bg-netflix-black">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-white mb-4">
                {metadata.displayName || decodeURIComponent(filename)}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-gray-300">
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default VideoPlayer 