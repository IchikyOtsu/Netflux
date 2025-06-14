const axios = require('axios')

const testSubtitles = async () => {
  console.log('🧪 Test des sous-titres via API')
  
  const baseUrl = 'http://localhost:5000'
  
  // Test 1: Récupérer les métadonnées d'un film
  try {
    console.log('\n📋 Test 1: Récupération des métadonnées...')
    const response = await axios.get(`${baseUrl}/api/videos`)
    const videos = response.data
    
    if (videos.length > 0) {
      const video = videos[0]
      console.log(`🎬 Film testé: ${video.title}`)
      console.log(`📝 Sous-titres détectés:`, video.subtitles)
      
      if (video.subtitles && video.subtitles.length > 0) {
        // Test 2: Télécharger un fichier de sous-titre
        console.log('\n📝 Test 2: Téléchargement d\'un sous-titre...')
        const subtitle = video.subtitles[0]
        const subtitleUrl = `${baseUrl}/api/subtitles/${encodeURIComponent(video.path)}?file=${encodeURIComponent(subtitle.file)}`
        
        console.log(`🔗 URL: ${subtitleUrl}`)
        
        try {
          const subResponse = await axios.get(subtitleUrl)
          console.log(`✅ Sous-titre téléchargé avec succès`)
          console.log(`📄 Content-Type: ${subResponse.headers['content-type']}`)
          console.log(`📏 Taille: ${subResponse.data.length} caractères`)
          console.log(`📝 Contenu (100 premiers caractères):`)
          console.log(subResponse.data.substring(0, 100))
          
          // Vérifier le format SRT
          if (subtitle.format === 'srt') {
            const lines = subResponse.data.split('\n')
            console.log(`📊 Nombre de lignes: ${lines.length}`)
            if (lines.length >= 3) {
              console.log(`✅ Format SRT valide détecté`)
            } else {
              console.log(`⚠️ Format SRT peut-être invalide`)
            }
          }
          
        } catch (subError) {
          console.error(`❌ Erreur téléchargement sous-titre:`, subError.message)
        }
      } else {
        console.log('⚠️ Aucun sous-titre trouvé pour ce film')
      }
    } else {
      console.log('⚠️ Aucun film trouvé')
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message)
  }
}

// Test 3: Créer un fichier SRT valide pour test
const createValidSRT = () => {
  return `1
00:00:01,000 --> 00:00:05,000
Bonjour, ceci est le premier sous-titre.

2
00:00:06,000 --> 00:00:10,000
Voici le deuxième sous-titre en français.

3
00:00:11,000 --> 00:00:15,000
Et voici le troisième sous-titre.

`
}

console.log('📝 Exemple de fichier SRT valide:')
console.log(createValidSRT())

testSubtitles().catch(console.error) 