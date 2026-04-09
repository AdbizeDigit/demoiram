import axios from 'axios'

// Create axios instance with default configuration
const api = axios.create({
  baseURL: '/',
  // Hard cap so a slow/hung backend can never freeze the UI forever.
  // Long-running endpoints (AI generation, etc.) should set their own timeout.
  timeout: 45000,
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
    // Don't auto-logout on 401 - let components handle auth errors
    // This prevents detection/scraping API calls from logging out the user
    return Promise.reject(error)
  }
)

export default api
