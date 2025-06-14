import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Clock, HardDrive, Folder, Star, Calendar } from 'lucide-react'

const VideoCard = ({ video }) => {
  const navigate = useNavigate()
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const handlePlay = () => {
    navigate(`/video/${encodeURIComponent(video.path)}`)
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A'
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  // Utiliser le poster TMDB si disponible
  const posterUrl = video.images?.poster ? 
    `http://localhost:5000/api/image/${encodeURIComponent(video.path)}?type=poster` : 
    null

  // Debug logs
  console.log('VideoCard Debug:', {
    videoName: video.name,
    videoPath: video.path,
    hasImages: !!video.images,
    images: video.images,
    posterUrl: posterUrl,
    title: video.title,
    year: video.year,
    rating: video.rating
  })

  return (
    <div className="group relative bg-netflix-gray rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 cursor-pointer">
      <div className="aspect-[2/3] bg-gray-800 relative overflow-hidden">
        {posterUrl && !imageError ? (
          <img
            src={posterUrl}
            alt={video.title || video.displayName}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => {
              console.log('✅ Poster chargé avec succès:', posterUrl)
              setImageLoaded(true)
            }}
            onError={(e) => {
              console.error('❌ Erreur chargement poster:', posterUrl, e)
              setImageError(true)
            }}
          />
        ) : (
          (() => {
            console.log('⚠️ Pas de poster URL:', { posterUrl, hasImages: !!video.images, images: video.images })
            return null
          })()
        )}
        
        {/* Overlay par défaut si pas d'image */}
        <div className={`absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center ${
          imageError || !posterUrl || !imageLoaded ? 'opacity-100' : 'opacity-0'
        } transition-opacity duration-300`}>
          <div className="text-center p-4">
            <Play className="w-12 h-12 text-white opacity-60 mx-auto mb-2" />
            <p className="text-white text-sm font-medium line-clamp-3">
              {video.title || video.displayName}
            </p>
            {/* Debug info */}
            <p className="text-xs text-gray-500 mt-2">
              {posterUrl ? 'Poster en cours...' : 'Pas de poster'}
            </p>
          </div>
        </div>

        {/* Overlay de hover */}
        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <button
            onClick={handlePlay}
            className="bg-netflix-red hover:bg-red-600 text-white p-4 rounded-full shadow-lg transform hover:scale-110 transition-all duration-200"
          >
            <Play className="w-8 h-8 ml-1" />
          </button>
        </div>

        {/* Badge de note TMDB */}
        {video.rating && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-70 rounded-full px-2 py-1 flex items-center space-x-1">
            <Star className="w-3 h-3 text-yellow-400 fill-current" />
            <span className="text-white text-xs font-medium">
              {Math.round(video.rating * 10) / 10}
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2 group-hover:text-netflix-red transition-colors">
          {video.title || video.displayName}
        </h3>
        
        {/* Année et dossier */}
        <div className="flex items-center justify-between mb-2">
          {video.year && (
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-400">{video.year}</span>
            </div>
          )}
          
          {video.directory && video.directory !== '.' && (
            <div className="flex items-center space-x-1">
              <Folder className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-500 truncate max-w-20">
                {video.directory}
              </span>
            </div>
          )}
        </div>

        {/* Description TMDB */}
        {video.overview && (
          <p className="text-sm text-gray-400 line-clamp-2 mb-3">
            {video.overview}
          </p>
        )}
        
        <div className="flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(video.duration)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <HardDrive className="w-4 h-4" />
              <span>{formatFileSize(video.size)}</span>
            </div>
          </div>
        </div>

        {video.resolution && (
          <div className="mt-2">
            <span className="inline-block bg-gray-700 text-xs px-2 py-1 rounded">
              {video.resolution}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default VideoCard 