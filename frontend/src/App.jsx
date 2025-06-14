import { Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import HomePage from './pages/HomePage'
import FilmsPage from './pages/FilmsPage'
import VideoPlayer from './pages/VideoPlayer'
import Navbar from './components/Navbar'
import { getVideos } from './services/api'

function App() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadVideos()
  }, [])

  const loadVideos = async () => {
    try {
      setLoading(true)
      const data = await getVideos()
      setVideos(data)
      setError(null)
    } catch (err) {
      console.error('Erreur lors du chargement des vidéos:', err)
      setError('Impossible de charger les vidéos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-netflix-black">
      <Navbar />
      <main>
        <Routes>
          <Route 
            path="/" 
            element={
              <HomePage 
                videos={videos} 
                loading={loading} 
                error={error} 
                onRefresh={loadVideos}
              />
            } 
          />
          <Route 
            path="/films" 
            element={
              <FilmsPage 
                videos={videos} 
                loading={loading} 
                error={error} 
                onRefresh={loadVideos}
              />
            } 
          />
          <Route path="/video/:filename" element={<VideoPlayer />} />
        </Routes>
      </main>
    </div>
  )
}

export default App 