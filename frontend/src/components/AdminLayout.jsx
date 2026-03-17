import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  Radar, Radio, Globe, Target, Cpu, GitBranch, Users,
  ChevronLeft, ChevronRight, LogOut, ArrowLeft, Activity,
  Shield, Search, Settings, BarChart3, Mail, MessageCircle,
} from 'lucide-react'

const navItems = [
  { path: '/admin', icon: Radar, label: 'Motor de Deteccion', end: true },
  { path: '/admin/radar', icon: Radio, label: 'Radar' },
  { path: '/admin/fuentes', icon: Globe, label: 'Fuentes' },
  { path: '/admin/oportunidades', icon: Target, label: 'Oportunidades' },
  { path: '/admin/reglas', icon: Cpu, label: 'Reglas' },
  { path: '/admin/pipeline', icon: GitBranch, label: 'Pipeline' },
  { path: '/admin/leads', icon: Users, label: 'Leads' },
  { path: '/admin/email-outreach', icon: Mail, label: 'Email Outreach' },
  { path: '/admin/whatsapp-outreach', icon: MessageCircle, label: 'WhatsApp Outreach' },
  { path: '/admin/logs', icon: Activity, label: 'Actividad' },
]

export default function AdminLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  // Redirect non-admin (check role or email)
  const isAdmin = user?.role === 'admin' || user?.email === 'contacto@adbize.com'
  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard')
    }
  }, [isAdmin, navigate])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className="h-screen flex flex-col fixed left-0 top-0 z-30 bg-white border-r border-gray-100 shadow-sm transition-all duration-300"
        style={{ width: collapsed ? 80 : 280 }}
      >
        {/* Logo */}
        <div className="h-20 flex items-center px-5 border-b border-gray-100">
          {!collapsed ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                  <Radar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-800">Adbize</h1>
                  <p className="text-xs text-gray-400">Panel Admin</p>
                </div>
              </div>
              <button
                onClick={() => setCollapsed(true)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center mx-auto cursor-pointer" onClick={() => setCollapsed(false)}>
              <Radar className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = item.end
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path)
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${collapsed ? 'mx-auto' : ''}`} />
                {!collapsed && (
                  <span className={`whitespace-nowrap text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>
                    {item.label}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-3 border-t border-gray-100 space-y-1.5">
          {/* Back to dashboard */}
          <button
            onClick={() => navigate('/dashboard')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            <ArrowLeft className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Volver al Dashboard</span>}
          </button>

          {/* User info + logout */}
          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-50 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {(user?.name || 'A').charAt(0).toUpperCase()}
              </span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{user?.name || 'Admin'}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Cerrar sesion"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Expand button when collapsed */}
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="w-full flex items-center justify-center p-2.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main
        className="min-h-screen transition-all duration-300"
        style={{ marginLeft: collapsed ? 80 : 280 }}
      >
        {/* Top bar */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b border-gray-100 h-16 flex items-center px-8">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700">Panel Administrativo</span>
            <span className="text-gray-300 mx-2">|</span>
            <span className="text-sm text-gray-500">Solo acceso admin</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <NavLink
              to="/dashboard"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Dashboard
            </NavLink>
          </div>
        </div>

        {/* Page content */}
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
