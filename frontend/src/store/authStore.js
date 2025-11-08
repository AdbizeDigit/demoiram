import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

const API_URL = '/api/auth'

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
          const response = await axios.get(`${API_URL}/me`)
          set({ user: response.data.user })
          return { success: true }
        } catch (error) {
          console.error('Error fetching user data:', error)
          return { success: false, error: error.response?.data?.message || 'Error al obtener datos del usuario' }
        }
      },

      initializeAuth: () => {
        const state = useAuthStore.getState()
        if (state.token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`
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
