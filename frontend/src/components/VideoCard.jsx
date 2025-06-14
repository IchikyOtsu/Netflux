import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Clock, HardDrive } from 'lucide-react'

const VideoCard = ({ video }) => {
  const navigate = useNavigate()
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const handlePlay = () => {
    navigate(`/video/${encodeURIComponent(video.name)}`)
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

  return (
    <div className="group relative bg-netflix-gray rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 cursor-pointer">
      <div className="aspect-video bg-gray-800 relative overflow-hidden">
        {!imageError ? (
          <img
            src={`/api/thumbnail/${encodeURIComponent(video.name)}`}
            alt={video.name}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        ) : null}
        
        {/* Overlay par défaut si pas d'image */}
        <div className={`absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center ${
          imageError || !imageLoaded ? 'opacity-100' : 'opacity-0'
        } transition-opacity duration-300`}>
          <Play className="w-12 h-12 text-white opacity-60" />
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
      </div>

      <div className="p-4">
        <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2 group-hover:text-netflix-red transition-colors">
          {video.displayName || video.name}
        </h3>
        
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