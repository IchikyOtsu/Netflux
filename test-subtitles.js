const fs = require('fs')
const path = require('path')

// Chemin vers le dossier média (même que dans le serveur)
const MEDIA_PATH = process.env.MEDIA_PATH || '/media'

console.log('🧪 Test des sous-titres')
console.log('📁 Dossier média:', MEDIA_PATH)

// Créer des exemples de sous-titres pour tester
const createTestSubtitles = async () => {
  const testMovies = [
    'Final Destination Bloodlines (2025)',
    'Big Buck Bunny (2008)'
  ]
  
  for (const movieFolder of testMovies) {
    const moviePath = path.join(MEDIA_PATH, 'films', movieFolder)
    const subsPath = path.join(moviePath, 'Subs')
    
    console.log(`\n🎬 Test pour: ${movieFolder}`)
    console.log(`📁 Dossier film: ${moviePath}`)
    console.log(`📁 Existe: ${fs.existsSync(moviePath)}`)
    
    if (fs.existsSync(moviePath)) {
      // Créer le dossier Subs s'il n'existe pas
      if (!fs.existsSync(subsPath)) {
        fs.mkdirSync(subsPath, { recursive: true })
        console.log(`📁 Dossier Subs créé: ${subsPath}`)
      }
      
      // Créer des fichiers de sous-titres d'exemple
      let subtitleFiles = []
      
      // Créer des fichiers SRT complets et valides
      const createSRTContent = (language) => {
        const texts = {
          fr: [
            'Bonjour, ceci est le premier sous-titre en français.',
            'Voici le deuxième sous-titre pour tester.',
            'Et voici le troisième sous-titre de test.',
            'Fin des sous-titres de démonstration.'
          ],
          en: [
            'Hello, this is the first subtitle in English.',
            'Here is the second subtitle for testing.',
            'And here is the third test subtitle.',
            'End of demonstration subtitles.'
          ],
          es: [
            'Hola, este es el primer subtítulo en español.',
            'Aquí está el segundo subtítulo para probar.',
            'Y aquí está el tercer subtítulo de prueba.',
            'Fin de los subtítulos de demostración.'
          ]
        }
        
        const langTexts = texts[language] || texts.en
        let content = ''
        
        langTexts.forEach((text, index) => {
          const start = index * 5 + 1
          const end = start + 4
          content += `${index + 1}\n`
          content += `00:00:${start.toString().padStart(2, '0')},000 --> 00:00:${end.toString().padStart(2, '0')},000\n`
          content += `${text}\n\n`
        })
        
        return content
      }
      
      if (movieFolder.includes('Final Destination')) {
        subtitleFiles = [
          { name: 'Final.Destination.Bloodlines.2025.720p.WEBRip.x264.AAC-[YTS.MX].fr.srt', content: createSRTContent('fr') },
          { name: 'Final.Destination.Bloodlines.2025.720p.WEBRip.x264.AAC-[YTS.MX].en.srt', content: createSRTContent('en') },
          { name: 'Final.Destination.Bloodlines.2025.720p.WEBRip.x264.AAC-[YTS.MX].es.srt', content: createSRTContent('es') }
        ]
      } else {
        subtitleFiles = [
          { name: 'movie.fr.srt', content: createSRTContent('fr') },
          { name: 'movie.en.srt', content: createSRTContent('en') },
          { name: 'movie.es.srt', content: createSRTContent('es') }
        ]
      }
      
      for (const sub of subtitleFiles) {
        const subPath = path.join(subsPath, sub.name)
        if (!fs.existsSync(subPath)) {
          fs.writeFileSync(subPath, sub.content)
          console.log(`📝 Sous-titre créé: ${sub.name}`)
        } else {
          console.log(`📝 Sous-titre existe déjà: ${sub.name}`)
        }
      }
      
      // Lister le contenu du dossier Subs
      const subsContents = fs.readdirSync(subsPath)
      console.log(`📝 Contenu Subs:`, subsContents)
    }
  }
}

// Tester la fonction de détection des sous-titres (copie de celle du serveur)
const getMovieSubtitles = (movieDir) => {
  const subtitles = []
  
  try {
    const subsDir = path.join(movieDir, 'Subs')
    console.log(`🔤 Recherche sous-titres dans: ${subsDir}`)
    
    if (fs.existsSync(subsDir)) {
      const subFiles = fs.readdirSync(subsDir)
      console.log(`📝 Fichiers trouvés dans Subs:`, subFiles)
      
      subFiles.forEach(file => {
        const ext = path.extname(file).toLowerCase()
        if (['.srt', '.vtt', '.ass', '.ssa', '.sub'].includes(ext)) {
          // Extraire la langue du nom de fichier (ex: "movie.fr.srt" -> "fr")
          const baseName = path.basename(file, ext)
          const parts = baseName.split('.')
          const language = parts.length > 1 ? parts[parts.length - 1] : 'unknown'
          
          subtitles.push({
            file: file,
            path: path.join('Subs', file),
            language: language,
            format: ext.substring(1) // Enlever le point
          })
        }
      })
    }
    
    console.log(`🔤 Sous-titres trouvés:`, subtitles.map(s => `${s.language} (${s.format})`))
  } catch (error) {
    console.error('❌ Erreur lors de la recherche de sous-titres:', error)
  }
  
  return subtitles
}

// Exécuter les tests
const runTests = async () => {
  console.log('🚀 Création des sous-titres de test...')
  await createTestSubtitles()
  
  console.log('\n🧪 Test de détection des sous-titres...')
  const testMovies = [
    'Final Destination Bloodlines (2025)',
    'Big Buck Bunny (2008)'
  ]
  
  for (const movieFolder of testMovies) {
    const moviePath = path.join(MEDIA_PATH, 'films', movieFolder)
    console.log(`\n🎬 Test détection pour: ${movieFolder}`)
    const subtitles = getMovieSubtitles(moviePath)
    console.log(`✅ Résultat:`, subtitles)
  }
}

runTests().catch(console.error) 