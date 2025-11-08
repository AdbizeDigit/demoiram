import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { LogOut, Home, Sparkles } from 'lucide-react'
import GooeyWaves from './GooeyWaves'

function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen">
      <nav className="nav-glass sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-8">
              <Link to="/dashboard" className="flex items-center space-x-3 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity"></div>
                  <img
                    src="/logo2023 (1).png"
                    alt="Adbize Logo"
                    className="relative h-9 w-auto object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="hidden w-12 h-12 rounded-2xl items-center justify-center liquid-gradient">
                    <Sparkles className="text-white" size={24} />
                  </div>
                </div>
                <span className="text-2xl font-bold liquid-text">Adbize Demos</span>
              </Link>

              <Link to="/dashboard" className="flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 group">
                <Home size={20} className="text-gray-600 group-hover:text-purple-600 transition-colors" />
                <span className="text-gray-700 group-hover:text-purple-700 font-medium">Inicio</span>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50">
                <span className="text-gray-700">Hola, <span className="font-bold liquid-text">{user?.name}</span></span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl transition-all duration-300 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105"
              >
                <LogOut size={18} />
                <span>Salir</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <Outlet />
      </main>

      {/* Olas líquidas gomosas 3D */}
      <GooeyWaves />
    </div>
  )
}

export default Layout
