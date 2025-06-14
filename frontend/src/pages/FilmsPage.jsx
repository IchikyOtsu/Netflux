import { useState, useEffect, useMemo } from 'react'
import { Search, Filter, SortAsc, SortDesc, X, Languages, Calendar, Star, Clock, Tag } from 'lucide-react'
import VideoCard from '../components/VideoCard'
import { getFilms } from '../services/api'

const FilmsPage = () => {
  const [films, setFilms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [sortBy, setSortBy] = useState('title') // title, year, rating, duration
  const [sortOrder, setSortOrder] = useState('asc') // asc, desc
  const [showFilters, setShowFilters] = useState(false)

  // Charger les films au montage du composant
  useEffect(() => {
    loadFilms()
  }, [])

  const loadFilms = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getFilms()
      setFilms(data)
    } catch (err) {
      console.error('Erreur lors du chargement des films:', err)
      setError('Impossible de charger les films')
    } finally {
      setLoading(false)
    }
  }

  // Fonction pour convertir les codes de langue
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
      'nl': 'Néerlandais'
    }
    return languages[code] || code?.toUpperCase() || 'Inconnu'
  }

  // Extraire les options de filtrage des films
  const filterOptions = useMemo(() => {
    const languages = new Set()
    const genres = new Set()
    const years = new Set()

    films.forEach(film => {
      // Langues
      if (film.originalLanguage) {
        languages.add(film.originalLanguage)
      }
      
      // Genres
      if (film.genres && film.genres.length > 0) {
        film.genres.forEach(genre => {
          if (genre.name) genres.add(genre.name)
        })
      }
      
      // Années
      if (film.year) {
        years.add(film.year)
      }
    })

    return {
      languages: Array.from(languages).sort(),
      genres: Array.from(genres).sort(),
      years: Array.from(years).sort((a, b) => b - a) // Plus récent en premier
    }
  }, [films])

  // Filtrer et trier les films
  const filteredAndSortedFilms = useMemo(() => {
    let filtered = films.filter(film => {
      // Recherche textuelle
      const matchesSearch = !searchTerm || 
        film.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        film.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        film.overview?.toLowerCase().includes(searchTerm.toLowerCase())

      // Filtre par langue
      const matchesLanguage = !selectedLanguage || film.originalLanguage === selectedLanguage

      // Filtre par genre
      const matchesGenre = !selectedGenre || 
        (film.genres && film.genres.some(genre => genre.name === selectedGenre))

      // Filtre par année
      const matchesYear = !selectedYear || film.year === parseInt(selectedYear)

      return matchesSearch && matchesLanguage && matchesGenre && matchesYear
    })

    // Tri
    filtered.sort((a, b) => {
      let aValue, bValue

      switch (sortBy) {
        case 'title':
          aValue = (a.title || a.displayName || '').toLowerCase()
          bValue = (b.title || b.displayName || '').toLowerCase()
          break
        case 'year':
          aValue = a.year || 0
          bValue = b.year || 0
          break
        case 'rating':
          aValue = a.rating || 0
          bValue = b.rating || 0
          break
        case 'duration':
          aValue = a.duration || 0
          bValue = b.duration || 0
          break
        default:
          return 0
      }

      if (sortOrder === 'desc') {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
      }
    })

    return filtered
  }, [films, searchTerm, selectedLanguage, selectedGenre, selectedYear, sortBy, sortOrder])

  // Réinitialiser les filtres
  const clearFilters = () => {
    setSearchTerm('')
    setSelectedLanguage('')
    setSelectedGenre('')
    setSelectedYear('')
    setSortBy('title')
    setSortOrder('asc')
  }

  // Compter les filtres actifs
  const activeFiltersCount = [searchTerm, selectedLanguage, selectedGenre, selectedYear].filter(Boolean).length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-netflix-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg">Chargement des films...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 text-red-500 mx-auto mb-4">⚠️</div>
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
    <div className="min-h-screen bg-netflix-black">
      <div className="py-8 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Films</h1>
            <p className="text-gray-400">
              {filteredAndSortedFilms.length} film{filteredAndSortedFilms.length !== 1 ? 's' : ''} 
              {activeFiltersCount > 0 && ` (${films.length} au total)`}
            </p>
          </div>

          {/* Barre de recherche et filtres */}
          <div className="bg-netflix-gray rounded-lg p-6 mb-8">
            {/* Barre de recherche */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher un film..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-netflix-black text-white pl-10 pr-4 py-3 rounded-lg border border-gray-600 focus:border-netflix-red focus:outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Boutons de contrôle */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  showFilters ? 'bg-netflix-red text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Filtres</span>
                {activeFiltersCount > 0 && (
                  <span className="bg-white text-netflix-red text-xs px-2 py-1 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              <div className="flex items-center space-x-2">
                <span className="text-gray-400 text-sm">Trier par:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-netflix-red focus:outline-none"
                >
                  <option value="title">Titre</option>
                  <option value="year">Année</option>
                  <option value="rating">Note</option>
                  <option value="duration">Durée</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                >
                  {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                </button>
              </div>

              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Effacer</span>
                </button>
              )}
            </div>

            {/* Filtres détaillés */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-600">
                {/* Filtre par langue */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Languages className="w-4 h-4 inline mr-1" />
                    Langue originale
                  </label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-netflix-red focus:outline-none"
                  >
                    <option value="">Toutes les langues</option>
                    {filterOptions.languages.map(lang => (
                      <option key={lang} value={lang}>
                        {getLanguageName(lang)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtre par genre */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Tag className="w-4 h-4 inline mr-1" />
                    Genre
                  </label>
                  <select
                    value={selectedGenre}
                    onChange={(e) => setSelectedGenre(e.target.value)}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-netflix-red focus:outline-none"
                  >
                    <option value="">Tous les genres</option>
                    {filterOptions.genres.map(genre => (
                      <option key={genre} value={genre}>
                        {genre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtre par année */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Année
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-netflix-red focus:outline-none"
                  >
                    <option value="">Toutes les années</option>
                    {filterOptions.years.map(year => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Tags actifs */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {searchTerm && (
                <span className="inline-flex items-center space-x-2 bg-netflix-red text-white px-3 py-1 rounded-full text-sm">
                  <Search className="w-3 h-3" />
                  <span>"{searchTerm}"</span>
                  <button onClick={() => setSearchTerm('')}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedLanguage && (
                <span className="inline-flex items-center space-x-2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
                  <Languages className="w-3 h-3" />
                  <span>{getLanguageName(selectedLanguage)}</span>
                  <button onClick={() => setSelectedLanguage('')}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedGenre && (
                <span className="inline-flex items-center space-x-2 bg-purple-600 text-white px-3 py-1 rounded-full text-sm">
                  <Tag className="w-3 h-3" />
                  <span>{selectedGenre}</span>
                  <button onClick={() => setSelectedGenre('')}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedYear && (
                <span className="inline-flex items-center space-x-2 bg-green-600 text-white px-3 py-1 rounded-full text-sm">
                  <Calendar className="w-3 h-3" />
                  <span>{selectedYear}</span>
                  <button onClick={() => setSelectedYear('')}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Grille des films */}
          {filteredAndSortedFilms.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 text-gray-600 mx-auto mb-4">🎬</div>
              <h2 className="text-2xl font-semibold text-gray-300 mb-2">
                {activeFiltersCount > 0 ? 'Aucun film trouvé' : 'Aucun film disponible'}
              </h2>
              <p className="text-gray-500 mb-6">
                {activeFiltersCount > 0 
                  ? 'Essayez de modifier vos critères de recherche'
                  : 'Ajoutez des fichiers vidéo dans le dossier /media pour commencer'
                }
              </p>
              {activeFiltersCount > 0 ? (
                <button
                  onClick={clearFilters}
                  className="bg-netflix-red hover:bg-red-600 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  Effacer les filtres
                </button>
              ) : (
                <button
                  onClick={loadFilms}
                  className="bg-netflix-red hover:bg-red-600 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  Actualiser
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredAndSortedFilms.map((film, index) => (
                <VideoCard key={`${film.name}-${index}`} video={film} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FilmsPage 