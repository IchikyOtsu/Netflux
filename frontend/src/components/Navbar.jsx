import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Home, Film, PlayCircle, Tv } from 'lucide-react'

const Navbar = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  return (
    <nav className="bg-netflix-black bg-opacity-95 backdrop-blur-sm border-b border-gray-800 px-6 py-4 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link 
            to="/" 
            className="flex items-center space-x-2 text-netflix-red font-bold text-2xl hover:text-red-400 transition-colors"
          >
            <Film className="w-8 h-8" />
            <span>Netflux</span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-6">
            <Link 
              to="/" 
              className={`flex items-center space-x-2 transition-colors ${
                isActive('/') 
                  ? 'text-white border-b-2 border-netflix-red pb-1' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Accueil</span>
            </Link>
            
            <Link 
              to="/films" 
              className={`flex items-center space-x-2 transition-colors ${
                isActive('/films') 
                  ? 'text-white border-b-2 border-netflix-red pb-1' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <PlayCircle className="w-4 h-4" />
              <span>Films</span>
            </Link>

            <Link 
              to="/series" 
              className={`flex items-center space-x-2 transition-colors ${
                isActive('/series') 
                  ? 'text-white border-b-2 border-netflix-red pb-1' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>Séries</span>
            </Link>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-400">
            Streaming Personnel
          </span>
        </div>
      </div>
    </nav>
  )
}

export default Navbar 