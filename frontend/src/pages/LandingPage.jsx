import { lazy, Suspense } from 'react'
import AnimatedNav from '../components/AnimatedNav'
import HeroSection from '../components/HeroSection'

// Lazy load sections that are below the fold
const AboutSection = lazy(() => import('../components/AboutSection'))
const SolutionsSection = lazy(() => import('../components/SolutionsSection'))
const DevelopmentsSection = lazy(() => import('../components/DevelopmentsSection'))
const ContactSection = lazy(() => import('../components/ContactSection'))
const Footer = lazy(() => import('../components/Footer'))

// Loading component for better UX
function SectionLoader() {
  return (
    <div className="w-full py-20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="animate-pulse space-y-8">
          <div className="h-16 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg w-3/4 mx-auto"></div>
          <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-5/6 mx-auto"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function LandingPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Animated Navigation */}
      <AnimatedNav />

      {/* Hero Section - Load immediately as it's above the fold */}
      <div id="home">
        <HeroSection />
      </div>

      {/* Main Content Section - Lazy loaded */}
      <section className="min-h-screen bg-white/95 backdrop-blur-sm py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1400px] mx-auto">
          {/* About Section */}
          <div id="about">
            <Suspense fallback={<SectionLoader />}>
              <AboutSection />
            </Suspense>
          </div>

          {/* Solutions Section */}
          <div id="solutions">
            <Suspense fallback={<SectionLoader />}>
              <SolutionsSection />
            </Suspense>
          </div>

          {/* Developments Section */}
          <div id="developments">
            <Suspense fallback={<SectionLoader />}>
              <DevelopmentsSection />
            </Suspense>
          </div>

          {/* Contact Section */}
          <div id="contact">
            <Suspense fallback={<SectionLoader />}>
              <ContactSection />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Suspense fallback={<SectionLoader />}>
        <Footer />
      </Suspense>
    </div>
  )
}

export default LandingPage
