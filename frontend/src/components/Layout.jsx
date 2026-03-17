import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { LogOut, Radar } from 'lucide-react'

function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/dashboard" className="flex items-center group">
              <img
                src="/logo2023.png"
                alt="Adbize Logo"
                className="h-8 w-auto object-contain transition-opacity duration-200 group-hover:opacity-80"
              />
            </Link>

            <div className="flex items-center space-x-3">
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                >
                  <Radar size={16} />
                  <span className="hidden md:inline">Motor de Deteccion</span>
                </Link>
              )}
              <span className="text-sm text-gray-600 hidden sm:block">{user?.name}</span>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors duration-200"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8 relative z-10">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
