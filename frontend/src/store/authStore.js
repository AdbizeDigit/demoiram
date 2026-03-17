import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

const API_URL = '/api/auth'

// Helper to get token from persisted storage directly
function getPersistedToken() {
  try {
    const raw = localStorage.getItem('auth-storage')
    if (raw) {
      const { state } = JSON.parse(raw)
      return state?.token || null
    }
  } catch {}
  return null
}

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        try {
          const response = await axios.post(`${API_URL}/login`, { email, password })
          const { token, user } = response.data

          set({ user, token, isAuthenticated: true })
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

          return { success: true }
        } catch (error) {
          return { success: false, error: error.response?.data?.message || 'Error al iniciar sesión' }
        }
      },

      register: async (name, email, password) => {
        try {
          const response = await axios.post(`${API_URL}/register`, { name, email, password })
          const { token, user } = response.data

          set({ user, token, isAuthenticated: true })
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

          return { success: true }
        } catch (error) {
          return { success: false, error: error.response?.data?.message || 'Error al registrarse' }
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false })
        delete axios.defaults.headers.common['Authorization']
      },

      fetchUserData: async () => {
        try {
          // Read token directly from localStorage to avoid hydration timing issues
          const token = getPersistedToken() || useAuthStore.getState().token
          if (!token) return { success: false, error: 'No token' }
          const response = await axios.get(`${API_URL}/me`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          set({ user: response.data.user })
          return { success: true }
        } catch (error) {
          console.error('Error fetching user data:', error)
          return { success: false, error: error.response?.data?.message || 'Error al obtener datos del usuario' }
        }
      },

      initializeAuth: () => {
        // Read directly from localStorage to avoid zustand hydration timing
        const token = getPersistedToken()
        if (token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        }
      }
    }),
    {
      name: 'auth-storage',
    }
  )
)

// Initialize auth on app load
useAuthStore.getState().initializeAuth()
