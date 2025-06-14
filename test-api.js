// Script de test pour vérifier l'API Netflux
const axios = require('axios')

const API_BASE = 'http://localhost:5000'

async function testAPI() {
  console.log('🧪 Test de l\'API Netflux...\n')
  
  try {
    // Test 1: Health check
    console.log('1️⃣ Test Health Check...')
    const health = await axios.get(`${API_BASE}/api/health`)
    console.log('✅ Health:', health.data)
    console.log('')
    
    // Test 2: Liste des vidéos
    console.log('2️⃣ Test Liste des vidéos...')
    const videos = await axios.get(`${API_BASE}/api/videos`)
    console.log(`✅ ${videos.data.length} vidéo(s) trouvée(s)`)
    
    if (videos.data.length > 0) {
      const firstVideo = videos.data[0]
      console.log('📋 Première vidéo:')
      console.log('   - Nom:', firstVideo.name)
      console.log('   - Titre:', firstVideo.title)
      console.log('   - Année:', firstVideo.year)
      console.log('   - Note:', firstVideo.rating)
      console.log('   - Images:', firstVideo.images)
      console.log('   - MovieInfo:', !!firstVideo.movieInfo)
      console.log('')
      
      // Test 3: Image du premier film
      if (firstVideo.images?.poster) {
        console.log('3️⃣ Test Image Poster...')
        const imageUrl = `${API_BASE}/api/image/${encodeURIComponent(firstVideo.path)}?type=poster`
        console.log('🖼️ URL Poster:', imageUrl)
        
        try {
          const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' })
          console.log('✅ Poster récupéré:', imageResponse.headers['content-type'], imageResponse.data.length, 'bytes')
        } catch (imageError) {
          console.error('❌ Erreur poster:', imageError.response?.status, imageError.response?.data)
        }
      } else {
        console.log('⚠️ Pas de poster disponible pour le premier film')
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur API:', error.message)
    if (error.response) {
      console.error('   Status:', error.response.status)
      console.error('   Data:', error.response.data)
    }
  }
}

testAPI() 