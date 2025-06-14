import { useState, useEffect } from 'react'

const DebugInfo = () => {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVideos()
  }, [])

  const fetchVideos = async () => {
    try {
      const response = await fetch('/api/videos')
      const data = await response.json()
      console.log('🧪 Debug - Données API reçues:', data)
      setVideos(data)
    } catch (error) {
      console.error('❌ Erreur fetch videos:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="text-white">Chargement debug...</div>

  return (
    <div className="bg-gray-900 text-white p-4 m-4 rounded">
      <h2 className="text-xl font-bold mb-4">🧪 Debug Info</h2>
      
      <div className="mb-4">
        <strong>Nombre de vidéos:</strong> {videos.length}
      </div>
      
      {videos.slice(0, 3).map((video, index) => (
        <div key={index} className="border border-gray-700 p-3 mb-3 rounded">
          <h3 className="font-semibold text-lg">{video.name}</h3>
          
          <div className="grid grid-cols-2 gap-2 text-sm mt-2">
            <div><strong>Path:</strong> {video.path}</div>
            <div><strong>Title:</strong> {video.title || 'N/A'}</div>
            <div><strong>Year:</strong> {video.year || 'N/A'}</div>
            <div><strong>Rating:</strong> {video.rating || 'N/A'}</div>
            <div><strong>Has MovieInfo:</strong> {video.movieInfo ? '✅' : '❌'}</div>
            <div><strong>Images:</strong> {video.images ? Object.keys(video.images).join(', ') : 'Aucune'}</div>
          </div>
          
          {video.images?.poster && (
            <div className="mt-3">
              <strong>Test Poster:</strong>
              <div className="mt-1">
                <img 
                  src={`/api/image/${encodeURIComponent(video.path)}?type=poster`}
                  alt="Poster test"
                  className="w-20 h-30 object-cover border"
                  onLoad={() => console.log('✅ Poster chargé:', video.name)}
                  onError={(e) => console.error('❌ Erreur poster:', video.name, e)}
                />
              </div>
            </div>
          )}
          
          {video.overview && (
            <div className="mt-2">
              <strong>Synopsis:</strong> {video.overview.substring(0, 100)}...
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default DebugInfo 