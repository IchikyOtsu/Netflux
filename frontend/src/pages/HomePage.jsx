import { RefreshCw, AlertCircle, Film } from 'lucide-react'
import VideoCard from '../components/VideoCard'

const HomePage = ({ videos, loading, error, onRefresh }) => {
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-netflix-red mx-auto mb-4" />
          <p className="text-gray-300 text-lg">Chargement des vidéos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-300 text-lg mb-4">{error}</p>
          <button
            onClick={onRefresh}
            className="bg-netflix-red hover:bg-red-600 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-netflix-black to-netflix-gray py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <Film className="w-16 h-16 text-netflix-red mx-auto mb-6" />
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              Bienvenue sur Netflux
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Votre plateforme de streaming personnel
            </p>
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-400">
              <span>{videos.length} vidéo{videos.length !== 1 ? 's' : ''} disponible{videos.length !== 1 ? 's' : ''}</span>
              <button
                onClick={onRefresh}
                className="flex items-center space-x-2 hover:text-white transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Actualiser</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Videos Grid */}
      <div className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          {videos.length === 0 ? (
            <div className="text-center py-16">
              <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-300 mb-2">
                Aucune vidéo trouvée
              </h2>
              <p className="text-gray-500 mb-6">
                Ajoutez des fichiers vidéo dans le dossier /media pour commencer
              </p>
              <button
                onClick={onRefresh}
                className="bg-netflix-red hover:bg-red-600 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Actualiser
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-white">
                  Ma Bibliothèque
                </h2>
                <div className="text-sm text-gray-400">
                  {videos.length} vidéo{videos.length !== 1 ? 's' : ''}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {videos.map((video, index) => (
                  <VideoCard key={`${video.name}-${index}`} video={video} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default HomePage 