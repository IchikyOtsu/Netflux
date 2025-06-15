import React, { useState, useEffect } from 'react'
import { API_URL } from '../config'
import { Link } from 'react-router-dom'
import { Play, Calendar, Clock, Star, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react'
import { getSeries } from '../services/api'

const SeriesPage = () => {
  const [series, setSeries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedSeries, setSelectedSeries] = useState(null)

  useEffect(() => {
    loadSeries()
  }, [])

  const loadSeries = async () => {
    try {
      setLoading(true)
      const data = await getSeries()
      setSeries(data)
      setError(null)
    } catch (err) {
      console.error('Erreur lors du chargement des séries:', err)
      setError('Impossible de charger les séries')
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds) => {
    if (!seconds) return 'Durée inconnue'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-netflix-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-netflix-red mx-auto mb-4"></div>
          <p className="text-white">Chargement des séries...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-netflix-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button 
            onClick={loadSeries}
            className="bg-netflix-red text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  if (selectedSeries) {
    return (
      <div className="min-h-screen bg-netflix-black text-white">
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={() => setSelectedSeries(null)}
            className="mb-6 flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Retour aux séries
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden">
              <img
                src={selectedSeries.posterPath ? `${API_URL}/image/${selectedSeries.posterPath}?type=poster` : '/placeholder-poster.svg'}
                alt={selectedSeries.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error('Erreur chargement poster détail:', selectedSeries.posterPath, e)
                  e.target.src = '/placeholder-poster.svg'
                }}
                onLoad={() => {
                  console.log('✅ Poster détail chargé avec succès:', `${API_URL}/image/${selectedSeries.posterPath}?type=poster`)
                }}
              />
            </div>

            <div>
              <h1 className="text-4xl font-bold mb-4">{selectedSeries.name}</h1>
              <div className="space-y-6">
                {selectedSeries.seasons.map((season) => (
                  <div key={season.name} className="bg-gray-900 rounded-lg p-4">
                    <h2 className="text-xl font-semibold mb-4 text-netflix-red">
                      {season.name}
                    </h2>
                    <div className="grid gap-4">
                      {season.episodes.map((episode) => (
                        <Link
                          key={episode.filename}
                          to={`/video/${encodeURIComponent(episode.filename)}`}
                          className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <Play className="w-5 h-5 text-netflix-red group-hover:text-red-400" />
                                <h4 className="font-medium">{episode.displayName}</h4>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-gray-400">
                                <span className="flex items-center space-x-1">
                                  <Clock className="w-4 h-4" />
                                  <span>{formatDuration(episode.duration)}</span>
                                </span>
                                {episode.fileSize && (
                                  <span>{(episode.fileSize / (1024 * 1024 * 1024)).toFixed(1)} GB</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-netflix-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Mes Séries</h1>
          <div className="text-gray-400">
            {series.length} série{series.length > 1 ? 's' : ''}
          </div>
        </div>

        {series.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg mb-4">Aucune série trouvée</p>
            <p className="text-gray-500">
              Organisez vos séries dans des dossiers : Séries/NomSérie/Saison X/
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {series.map((serie) => {
              const posterUrl = serie.posterPath 
                ? `${API_URL}/image/${serie.posterPath}?type=poster`
                : '/placeholder-poster.svg'
              
              console.log('🖼️ URL poster pour', serie.name, ':', posterUrl)
              
              return (
                <div
                  key={serie.name}
                  className="group cursor-pointer bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-colors duration-300"
                  onClick={() => setSelectedSeries(serie)}
                >
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-2">
                    <img
                      src={posterUrl}
                      alt={serie.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        console.error('Erreur chargement poster:', serie.posterPath, e)
                        e.target.src = '/placeholder-poster.svg'
                      }}
                      onLoad={() => {
                        console.log('✅ Poster chargé avec succès:', posterUrl)
                      }}
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="text-white font-medium text-sm mb-1 line-clamp-2">
                      {serie.name}
                    </h3>
                    <p className="text-gray-400 text-xs">
                      {serie.seasons.length} saison{serie.seasons.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default SeriesPage 