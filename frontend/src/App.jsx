import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'
import LandingPage from './pages/LandingPage'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ChatbotDemo from './pages/demos/ChatbotDemo'
import VisionDemo from './pages/demos/VisionDemo'
import AgentGeneratorDemo from './pages/demos/AgentGeneratorDemo'
import MarketplaceDemo from './pages/demos/MarketplaceDemo'
import SentimentDemo from './pages/demos/SentimentDemo'
import TranscriptionDemo from './pages/demos/TranscriptionDemo'
import DocumentDemo from './pages/demos/DocumentDemo'
import PredictorDemo from './pages/demos/PredictorDemo'

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? children : <Navigate to="/login" />
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/dashboard" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="demo/chatbot" element={<ChatbotDemo />} />
          <Route path="demo/vision" element={<VisionDemo />} />
          <Route path="demo/agent-generator" element={<AgentGeneratorDemo />} />
          <Route path="demo/marketplace" element={<MarketplaceDemo />} />
          <Route path="demo/sentiment" element={<SentimentDemo />} />
          <Route path="demo/transcription" element={<TranscriptionDemo />} />
          <Route path="demo/document" element={<DocumentDemo />} />
          <Route path="demo/predictor" element={<PredictorDemo />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
