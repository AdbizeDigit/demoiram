import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { useAuthStore } from './store/authStore'

// Eager load critical components
import Layout from './components/Layout'
import LandingPage from './pages/LandingPage'

// Lazy load non-critical components
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const ChatbotDemo = lazy(() => import('./pages/demos/ChatbotDemo'))
const CustomChatbotDemo = lazy(() => import('./pages/demos/CustomChatbotDemo'))
const VisionDemo = lazy(() => import('./pages/demos/VisionDemo'))
const AgentGeneratorDemo = lazy(() => import('./pages/demos/AgentGeneratorDemo'))
const OpportunityDetectionDemo = lazy(() => import('./pages/demos/OpportunityDetectionDemo'))
const SentimentDemo = lazy(() => import('./pages/demos/SentimentDemo'))
const TranscriptionDemo = lazy(() => import('./pages/demos/TranscriptionDemo'))
const DocumentDemo = lazy(() => import('./pages/demos/DocumentDemo'))
const PredictorDemo = lazy(() => import('./pages/demos/PredictorDemo'))
const ScrapingIntelDemo = lazy(() => import('./pages/demos/ScrapingIntelDemo'))

// Automation pages
const AutomationDashboard = lazy(() => import('./pages/AutomationDashboard'))
const ScheduledSearchesPage = lazy(() => import('./pages/ScheduledSearchesPage'))
const CRMPage = lazy(() => import('./pages/CRMPage'))
const MetricsPage = lazy(() => import('./pages/MetricsPage'))
const WebhooksPage = lazy(() => import('./pages/WebhooksPage'))

// Advanced scraping pages
const AdvancedScrapingPage = lazy(() => import('./pages/AdvancedScrapingPage'))
const CompetitiveIntelligencePage = lazy(() => import('./pages/CompetitiveIntelligencePage'))
const ScrapingMapPage = lazy(() => import('./pages/ScrapingMapPage'))

// PAC 3.0 Admin Panel
const PAC3AdminPanel = lazy(() => import('./pages/PAC3AdminPanel'))

// Internal Tools
const InternalToolsPage = lazy(() => import('./pages/InternalToolsPage'))

// Admin Section - Detection Engine
const AdminLayout = lazy(() => import('./components/AdminLayout'))
const DetectionEnginePage = lazy(() => import('./pages/DetectionEnginePage'))
const EmailOutreachPage = lazy(() => import('./pages/EmailOutreachPage'))
const WhatsAppOutreachPage = lazy(() => import('./pages/WhatsAppOutreachPage'))

// Loading component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="mt-4 text-gray-600">Cargando...</p>
    </div>
  </div>
)

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? children : <Navigate to="/login" />
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/dashboard" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="demo/chatbot" element={<ChatbotDemo />} />
            <Route path="demo/custom-chatbot" element={<CustomChatbotDemo />} />
            <Route path="demo/vision" element={<VisionDemo />} />
            <Route path="demo/agent-generator" element={<AgentGeneratorDemo />} />
            <Route path="demo/opportunity-detection" element={<OpportunityDetectionDemo />} />
            <Route path="demo/scraping-intel" element={<ScrapingIntelDemo />} />
            <Route path="demo/sentiment" element={<SentimentDemo />} />
            <Route path="demo/transcription" element={<TranscriptionDemo />} />
            <Route path="demo/document" element={<DocumentDemo />} />
            <Route path="demo/predictor" element={<PredictorDemo />} />

            {/* Automation Routes */}
            <Route path="automation" element={<AutomationDashboard />} />
            <Route path="automation/scheduled-searches" element={<ScheduledSearchesPage />} />
            <Route path="automation/crm" element={<CRMPage />} />
            <Route path="automation/metrics" element={<MetricsPage />} />
            <Route path="automation/webhooks" element={<WebhooksPage />} />

            {/* Advanced Scraping Routes */}
            <Route path="advanced-scraping" element={<AdvancedScrapingPage />} />
            <Route path="competitive-intelligence" element={<CompetitiveIntelligencePage />} />
            <Route path="scraping-map" element={<ScrapingMapPage />} />

            {/* PAC 3.0 Admin Panel */}
            <Route path="pac-3.0" element={<PAC3AdminPanel />} />

            {/* Internal Tools */}
            <Route path="internal-tools" element={<InternalToolsPage />} />

          </Route>

          {/* Admin Section - separate layout with sidebar */}
          <Route path="/admin" element={<PrivateRoute><AdminLayout /></PrivateRoute>}>
            <Route index element={<DetectionEnginePage />} />
            <Route path="email-outreach" element={<EmailOutreachPage />} />
            <Route path="whatsapp-outreach" element={<WhatsAppOutreachPage />} />
            <Route path="*" element={<DetectionEnginePage />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  )
}

export default App
