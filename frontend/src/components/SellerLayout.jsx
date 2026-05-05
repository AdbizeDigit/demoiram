import { useState, useEffect, useCallback, useRef } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import {
  LayoutDashboard, Users, GitBranch, Mail, MessageCircle, Phone,
  Linkedin, BarChart3, Sparkles, ChevronLeft, ChevronRight, LogOut,
  Bell, X, ExternalLink, Briefcase
} from 'lucide-react'

const navItems = [
  { path: '/vendedor', icon: LayoutDashboard, label: 'Mi Panel', end: true },
  { path: '/vendedor/recomendados', icon: Sparkles, label: 'Recomendados IA' },
  { path: '/vendedor/leads', icon: Users, label: 'Todos los Leads' },
  { path: '/vendedor/pipeline', icon: GitBranch, label: 'Mi Pipeline' },
  { path: '/vendedor/email', icon: Mail, label: 'Email' },
  { path: '/vendedor/whatsapp', icon: MessageCircle, label: 'WhatsApp' },
  { path: '/vendedor/llamadas', icon: Phone, label: 'Llamadas' },
  { path: '/vendedor/linkedin', icon: Linkedin, label: 'LinkedIn' },
  { path: '/vendedor/metricas', icon: BarChart3, label: 'Métricas' },
]

export default function SellerLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const [showNotifs, setShowNotifs] = useState(false)
  const notifRef = useRef(null)

  const loadNotifs = useCallback(async () => {
    try {
      const { data } = await api.get('/api/notifications')
      setNotifications(data.notifications || [])
      setUnread(data.unread || 0)
    } catch {}
  }, [])
  useEffect(() => { loadNotifs() }, [loadNotifs])
  useEffect(() => {
    const iv = setInterval(loadNotifs, 8000)
    return () => clearInterval(iv)
  }, [loadNotifs])
  useEffect(() => {
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Solo vendedores y admins entran acá
  const isAllowed = user?.role === 'seller' || user?.role === 'admin'
  useEffect(() => { if (user && !isAllowed) navigate('/dashboard') }, [user, isAllowed, navigate])

  async function markRead(id) {
    try { await api.patch(`/api/notifications/${id}/read`) } catch {}
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnread(prev => Math.max(0, prev - 1))
  }
  async function markAllRead() {
    try { await api.patch('/api/notifications/read-all') } catch {}
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnread(0)
  }

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="min-h-screen bg-gray-50">
      <aside
        className="h-screen flex flex-col fixed left-0 top-0 z-30 bg-white border-r border-gray-100 shadow-sm transition-all duration-300"
        style={{ width: collapsed ? 80 : 280 }}
      >
        <div className="h-20 flex items-center px-5 border-b border-gray-100">
          {!collapsed ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-800">Vendedores</h1>
                  <p className="text-xs text-gray-400">Adbize Sales</p>
                </div>
              </div>
              <button onClick={() => setCollapsed(true)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50">
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto cursor-pointer" onClick={() => setCollapsed(false)}>
              <Briefcase className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
                    isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-5 h-5 flex-shrink-0 ${collapsed ? 'mx-auto' : ''}`} />
                    {!collapsed && (
                      <span className={`whitespace-nowrap text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>
                        {item.label}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="p-3 border-t border-gray-100 space-y-1.5">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-50 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{(user?.name || 'V').charAt(0).toUpperCase()}</span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{user?.name || 'Vendedor'}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
            )}
            {!collapsed && (
              <button onClick={handleLogout} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50" title="Cerrar sesión">
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
          {collapsed && (
            <button onClick={() => setCollapsed(false)} className="w-full flex items-center justify-center p-2.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50">
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>

      <main className="min-h-screen transition-all duration-300" style={{ marginLeft: collapsed ? 80 : 280 }}>
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b border-gray-100 h-16 flex items-center px-8">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-semibold text-blue-700">Panel del Vendedor</span>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="relative" ref={notifRef}>
              <button onClick={() => setShowNotifs(!showNotifs)} className="relative p-2 rounded-xl hover:bg-gray-100">
                <Bell className="w-5 h-5 text-gray-500" />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
              {showNotifs && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800">Notificaciones</h3>
                    <div className="flex items-center gap-2">
                      {unread > 0 && (
                        <button onClick={markAllRead} className="text-[10px] text-blue-600 hover:text-blue-800 font-medium">
                          Marcar todas leídas
                        </button>
                      )}
                      <button onClick={() => setShowNotifs(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                        <X className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="text-center py-8">
                        <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Sin notificaciones</p>
                      </div>
                    ) : (
                      notifications.slice(0, 20).map(n => (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (!n.read) markRead(n.id)
                            setShowNotifs(false)
                            if (n.lead_id) navigate(`/vendedor/lead/${n.lead_id}`)
                          }}
                          className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 border-b border-gray-50 ${!n.read ? 'bg-blue-50/50' : ''}`}
                        >
                          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <ExternalLink className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!n.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
                            <p className="text-xs text-gray-500 truncate mt-0.5">{n.body}</p>
                          </div>
                          {!n.read && <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
