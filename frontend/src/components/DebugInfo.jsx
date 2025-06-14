import { useState, useEffect } from 'react'

const DebugInfo = () => {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchVideos()
  }, [])

  const fetchVideos = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/videos')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('❌ Réponse non-JSON:', text.substring(0, 200))
        throw new Error('Réponse non-JSON reçue')
      }
      
      const data = await response.json()
      console.log('🧪 Debug - Données API reçues:', data)
      setVideos(data)
      setError(null)
    } catch (error) {
      console.error('❌ Erreur fetch videos:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const testPosterUrl = (video) => {
    const url = `/api/image/${encodeURIComponent(video.path)}?type=poster`
    console.log('🧪 Test URL poster:', url)
    
    // Test avec fetch pour voir la réponse exacte
    fetch(url)
      .then(response => {
        console.log('🧪 Réponse poster:', response.status, response.statusText)
        if (!response.ok) {
          return response.text().then(text => {
            console.error('❌ Erreur poster détails:', text)
          })
        }
        console.log('✅ Poster OK pour:', video.name)
      })
      .catch(err => console.error('❌ Erreur réseau poster:', err))
  }

  const debugImagePath = (video) => {
    // Utiliser le port backend directement
    const debugUrl = `http://localhost:5000/api/debug/images/${encodeURIComponent(video.path)}?type=poster`
    console.log('🧪 Debug URL:', debugUrl)
    
    fetch(debugUrl)
      .then(response => response.json())
      .then(data => {
        console.log('🧪 Debug images:', data)
        console.log('🧪 Debug détaillé:')
        console.log('   - moviePath:', data.debug.moviePath)
        console.log('   - movieDir:', data.debug.movieDir)
        console.log('   - imagePath:', data.debug.imagePath)
        console.log('   - imageExists:', data.debug.imageExists)
        console.log('   - folderExists:', data.debug.folderExists)
        console.log('   - folderContents:', data.debug.folderContents)
        alert(`Debug Images:\n${JSON.stringify(data.debug, null, 2)}`)
      })
      .catch(err => console.error('❌ Erreur debug:', err))
  }

  if (loading) return <div className="text-white">Chargement debug...</div>

  return (
    <div className="bg-gray-900 text-white p-4 m-4 rounded">
      <h2 className="text-xl font-bold mb-4">🧪 Debug Info</h2>
      
      {error && (
        <div className="bg-red-900 p-3 rounded mb-4">
          <strong>Erreur:</strong> {error}
        </div>
      )}
      
      <div className="mb-4">
        <strong>Nombre de vidéos:</strong> {videos.length}
      </div>
      
      {videos.slice(0, 2).map((video, index) => (
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
              <button 
                onClick={() => testPosterUrl(video)}
                className="ml-2 bg-blue-600 px-2 py-1 rounded text-xs"
              >
                Tester URL
              </button>
              <button 
                onClick={() => debugImagePath(video)}
                className="ml-2 bg-green-600 px-2 py-1 rounded text-xs"
              >
                Debug Chemin
              </button>
              <div className="mt-1 text-xs text-gray-400">
                URL: /api/image/{encodeURIComponent(video.path)}?type=poster
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