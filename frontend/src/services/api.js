import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
})

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Erreur API:', error)
    return Promise.reject(error)
  }
)

// Récupérer la liste des vidéos
export const getVideos = async () => {
  try {
    const response = await api.get('/api/videos')
    console.log('📺 Vidéos récupérées:', response.data.length)
    return response.data
  } catch (error) {
    console.error('Erreur lors de la récupération des vidéos:', error)
    throw error
  }
}

// Récupérer les métadonnées d'une vidéo spécifique
export const getVideoMetadata = async (videoPath) => {
  try {
    // videoPath est maintenant le chemin relatif complet (ex: "films/Final Destination/Final.mp4")
    const response = await api.get(`/api/videos/${encodeURIComponent(videoPath)}/metadata`)
    return response.data
  } catch (error) {
    console.error('Erreur lors de la récupération des métadonnées:', error)
    throw error
  }
}

// Générer l'URL de streaming pour une vidéo
export const getVideoStreamUrl = (videoPath) => {
  // videoPath est maintenant le chemin relatif complet
  return `${API_URL}/api/video/${encodeURIComponent(videoPath)}`
}

export default api 