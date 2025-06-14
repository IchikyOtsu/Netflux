import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Volume2, VolumeX, Maximize, Minimize, AlertCircle, Star, Calendar, Clock, Languages, Subtitles } from 'lucide-react'
import { getVideoStreamUrl, getVideoMetadata } from '../services/api'

const VideoPlayer = () => {
  const { filename } = useParams() // filename est maintenant le chemin complet encodé
  const navigate = useNavigate()
  const videoRef = useRef(null)
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
    `http://localhost:5000/api/image/${encodeURIComponent(filename)}?type=fanart` : 
    null

  // Préparer les pistes de sous-titres (exclure les "unknown")
  const subtitleTracks = metadata?.subtitles
    ?.filter(sub => sub.language !== 'unknown')
    ?.map(sub => ({
      kind: 'subtitles',
      src: `http://localhost:5000/api/subtitles/${encodeURIComponent(filename)}?file=${encodeURIComponent(sub.file)}`,
      srcLang: sub.language,
      label: `${sub.language.toUpperCase()} (${sub.format})`,
      default: sub.language === 'fr' // Français par défaut si disponible
    })) || []

  // Debug des sous-titres (une seule fois)
  useEffect(() => {
    if (metadata?.subtitles) {
      console.log('🔤 Sous-titres détectés:', metadata.subtitles)
      console.log('🔤 Pistes de sous-titres préparées:', subtitleTracks)
      
      // Tester l'accessibilité des URLs de sous-titres
      subtitleTracks.forEach((track, index) => {
        fetch(track.src)
          .then(response => {
            if (response.ok) {
              console.log(`✅ Sous-titre ${index} accessible:`, track.label)
              return response.text()
            } else {
              console.error(`❌ Sous-titre ${index} non accessible:`, response.status, track.src)
            }
          })
          .then(content => {
            if (content) {
              console.log(`📝 Contenu sous-titre ${index} (100 premiers caractères):`, content.substring(0, 100))
            }
          })
          .catch(error => {
            console.error(`❌ Erreur fetch sous-titre ${index}:`, error)
          })
      })
    }
  }, [metadata])

  // Fonction pour charger et ajouter les sous-titres
  const loadSubtitles = async (videoElement) => {
    if (!metadata?.subtitles || metadata.subtitles.length === 0) return

    console.log('🔤 Chargement des sous-titres...')
    
    // Nettoyer les pistes existantes
    while (videoElement.textTracks.length > 0) {
      const track = videoElement.textTracks[0]
      if (track.mode !== undefined) {
        track.mode = 'disabled'
      }
    }

    // Ajouter les pistes de sous-titres une par une
    for (let i = 0; i < metadata.subtitles.length; i++) {
      const subtitle = metadata.subtitles[i]
      if (subtitle.language === 'unknown') continue

      try {
        // Créer la piste directement via l'API
        const track = videoElement.addTextTrack(
          'subtitles',
          `${subtitle.language.toUpperCase()} (${subtitle.format})`,
          subtitle.language
        )
        
        // Charger le contenu du fichier SRT
        const response = await fetch(`http://localhost:5000/api/subtitles/${encodeURIComponent(metadata.path)}?index=${i}`)
        if (response.ok) {
          const srtContent = await response.text()
          console.log(`✅ Sous-titre ${i} chargé:`, subtitle.language, `(${srtContent.length} caractères)`)
          
          // Parser le contenu SRT et ajouter les cues
          const cues = parseSRT(srtContent)
          cues.forEach(cue => {
            try {
              const vttCue = new VTTCue(cue.start, cue.end, cue.text)
              track.addCue(vttCue)
            } catch (error) {
              console.warn('⚠️ Erreur ajout cue:', error)
            }
          })
          
          // Activer la première piste par défaut
          if (i === 0) {
            track.mode = 'showing'
            console.log(`✅ Piste ${i} activée par défaut:`, subtitle.language)
          } else {
            track.mode = 'disabled'
          }
          
          // Ajouter événement pour debug
          track.oncuechange = () => {
            if (track.activeCues.length > 0) {
              console.log(`📝 Sous-titre actif (${subtitle.language}):`, track.activeCues[0].text)
            }
          }
          
        } else {
          console.error(`❌ Erreur chargement sous-titre ${i}:`, response.status)
        }
      } catch (error) {
        console.error(`❌ Erreur création piste ${i}:`, error)
      }
    }
    
    console.log(`🔤 ${videoElement.textTracks.length} pistes de sous-titres ajoutées`)
  }

  // Fonction pour parser le contenu SRT
  const parseSRT = (srtContent) => {
    const cues = []
    const blocks = srtContent.trim().split(/\n\s*\n/)
    
    blocks.forEach(block => {
      const lines = block.trim().split('\n')
      if (lines.length >= 3) {
        const timeMatch = lines[1].match(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/)
        if (timeMatch) {
          const startTime = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000
          const endTime = parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 + parseInt(timeMatch[7]) + parseInt(timeMatch[8]) / 1000
          const text = lines.slice(2).join('\n').replace(/<[^>]*>/g, '') // Nettoyer les balises HTML
          
          cues.push({
            start: startTime,
            end: endTime,
            text: text
          })
        }
      }
    })
    
    return cues
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
              
              {/* Bouton de test des sous-titres */}
              {metadata?.subtitles && metadata.subtitles.length > 0 && (
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      console.log('🔤 Test manuel - Pistes disponibles:', videoRef.current.textTracks.length)
                      for (let i = 0; i < videoRef.current.textTracks.length; i++) {
                        const track = videoRef.current.textTracks[i]
                        track.mode = i === 0 ? 'showing' : 'disabled'
                        console.log(`🔤 Piste ${i} ${i === 0 ? 'activée' : 'désactivée'}:`, track.label, 'Mode:', track.mode)
                        console.log(`🔤 Piste ${i} cues:`, track.cues ? track.cues.length : 'pas de cues')
                      }
                      
                      // Test d'affichage forcé
                      if (videoRef.current.textTracks.length > 0) {
                        const firstTrack = videoRef.current.textTracks[0]
                        firstTrack.mode = 'hidden'
                        setTimeout(() => {
                          firstTrack.mode = 'showing'
                          console.log('🔄 Piste forcée à showing, cues:', firstTrack.cues?.length || 0)
                        }, 100)
                      }
                    }
                  }}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors"
                >
                  <Subtitles className="w-5 h-5" />
                  <span>Test ST</span>
                </button>
              )}
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
                
                {metadata?.originalLanguage && (
                  <div className="flex items-center space-x-2">
                    <Languages className="w-5 h-5 text-blue-400" />
                    <span className="text-white">{metadata.originalLanguage.toUpperCase()}</span>
                  </div>
                )}
                
                {metadata?.subtitles && metadata.subtitles.length > 0 && 
                 metadata.subtitles.some(sub => sub.language !== 'unknown') && (
                  <div className="flex items-center space-x-2">
                    <Subtitles className="w-5 h-5 text-green-400" />
                    <span className="text-white">{metadata.subtitles.filter(sub => sub.language !== 'unknown').length} sous-titres</span>
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
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              width="100%"
              height="100%"
              volume={volume}
              muted={muted}
              crossOrigin="anonymous"
              onLoadedMetadata={async () => {
                if (videoRef.current) {
                  setDuration(videoRef.current.duration)
                  
                  // Charger les sous-titres après que la vidéo soit prête
                  await loadSubtitles(videoRef.current)
                  
                  // Debug des pistes finales
                  const textTracks = videoRef.current.textTracks
                  console.log('🔤 Pistes finales chargées:', textTracks.length)
                  for (let i = 0; i < textTracks.length; i++) {
                    const track = textTracks[i]
                    console.log(`🔤 Piste finale ${i}:`, {
                      kind: track.kind,
                      language: track.language,
                      label: track.label,
                      mode: track.mode,
                      cues: track.cues ? track.cues.length : 'pas de cues'
                    })
                  }
                }
              }}
              onTimeUpdate={() => {
                if (videoRef.current) {
                  setPlayed(videoRef.current.currentTime / videoRef.current.duration)
                }
              }}
              onError={(error) => {
                console.error('❌ Erreur vidéo:', error)
                setError(`Erreur lors de la lecture: Format non supporté`)
              }}
              style={{ 
                backgroundColor: 'black'
              }}
            >
              {/* Les pistes sont maintenant ajoutées dynamiquement via l'API TextTrack */}
              Votre navigateur ne supporte pas la lecture vidéo HTML5.
            </video>
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