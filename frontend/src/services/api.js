import axios from 'axios'

// Create axios instance with default configuration
const api = axios.create({
  baseURL: '/',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const authData = localStorage.getItem('auth-storage')
    if (authData) {
      try {
        const { state } = JSON.parse(authData)
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`
        }
      } catch (error) {
        console.error('Error parsing auth data:', error)
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || ''
      // Only force logout on auth endpoints (login/me), not on every 401
      // This prevents admin panel API calls from logging out the user
      if (url.includes('/api/auth/') && !url.includes('/api/auth/login')) {
        localStorage.removeItem('auth-storage')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
