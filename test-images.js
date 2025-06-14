const fs = require('fs')
const path = require('path')

// Chemin vers le dossier média (même que dans le serveur)
const MEDIA_PATH = process.env.MEDIA_PATH || '/media'

console.log('🧪 Test des images de films')
console.log('📁 Dossier média:', MEDIA_PATH)
console.log('📁 Existe:', fs.existsSync(MEDIA_PATH))

if (!fs.existsSync(MEDIA_PATH)) {
  console.error('❌ Le dossier média n\'existe pas!')
  process.exit(1)
}

// Lister le contenu du dossier films
const filmsPath = path.join(MEDIA_PATH, 'films')
console.log('\n📁 Dossier films:', filmsPath)
console.log('📁 Existe:', fs.existsSync(filmsPath))

if (fs.existsSync(filmsPath)) {
  const filmFolders = fs.readdirSync(filmsPath)
  console.log('\n🎬 Dossiers de films trouvés:')
  
  filmFolders.forEach(folder => {
    const folderPath = path.join(filmsPath, folder)
    const stat = fs.statSync(folderPath)
    
    if (stat.isDirectory()) {
      console.log(`\n📂 ${folder}`)
      
      // Lister le contenu du dossier
      const contents = fs.readdirSync(folderPath)
      contents.forEach(file => {
        const filePath = path.join(folderPath, file)
        const fileStat = fs.statSync(filePath)
        const type = fileStat.isDirectory() ? '📁' : '📄'
        const size = fileStat.isFile() ? ` (${Math.round(fileStat.size / 1024)}KB)` : ''
        console.log(`   ${type} ${file}${size}`)
      })
      
      // Vérifier spécifiquement les images
      const posterPath = path.join(folderPath, 'poster.jpg')
      const fanartPath = path.join(folderPath, 'fanart.jpg')
      const nfoPath = path.join(folderPath, 'movie.nfo')
      
      console.log(`   🖼️  poster.jpg: ${fs.existsSync(posterPath) ? '✅' : '❌'}`)
      console.log(`   🖼️  fanart.jpg: ${fs.existsSync(fanartPath) ? '✅' : '❌'}`)
      console.log(`   📄 movie.nfo: ${fs.existsSync(nfoPath) ? '✅' : '❌'}`)
    }
  })
}

// Test des URLs d'API
console.log('\n🧪 Test des URLs d\'API:')
const testPaths = [
  'films/Final Destination Bloodlines (2025)/Final.Destination.Bloodlines.2025.720p.WEBRip.x264.AAC-[YTS.MX].mp4',
  'films/Big Buck Bunny (2008)/Big Buck Bunny.mp4'
]

testPaths.forEach(testPath => {
  console.log(`\n🔍 Test pour: ${testPath}`)
  
  // Simuler la logique de l'API
  const movieDir = path.join(MEDIA_PATH, path.dirname(testPath))
  const posterPath = path.join(movieDir, 'poster.jpg')
  const fanartPath = path.join(movieDir, 'fanart.jpg')
  
  console.log(`   📁 Dossier film: ${movieDir}`)
  console.log(`   📁 Dossier existe: ${fs.existsSync(movieDir)}`)
  console.log(`   🖼️  Poster: ${posterPath}`)
  console.log(`   🖼️  Poster existe: ${fs.existsSync(posterPath)}`)
  console.log(`   🖼️  Fanart: ${fanartPath}`)
  console.log(`   🖼️  Fanart existe: ${fs.existsSync(fanartPath)}`)
}) 