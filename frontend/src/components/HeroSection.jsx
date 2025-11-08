import LavaLamp from './LavaLamp'
import LazyImage from './LazyImage'

function HeroSection() {
  return (
    <section className="hero-section">
      {/* Lava Lamp Background */}
      <LavaLamp />

      {/* Hero Content */}
      <div className="relative h-full w-full flex items-center justify-center px-4 sm:px-6 lg:px-8" style={{ zIndex: 10 }}>
        <div className="max-w-[1400px] mx-auto w-full text-center relative">
          {/* Character Behind Title */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] md:w-[700px] md:h-[700px] opacity-60 pointer-events-none animate-pulse" style={{ animationDuration: '5s', zIndex: 1 }}>
            <LazyImage
              src="/personajes/Generated Image November 04, 2025 - 11_09AM.png"
              alt="AI Character"
              className="w-full h-full object-contain drop-shadow-2xl"
            />
          </div>

          {/* Title */}
          <h1
            className="hero-title text-white relative px-4 leading-tight"
            style={{
              textShadow: '0 4px 12px rgba(0, 0, 0, 0.5), 0 8px 24px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.6), 0 0 40px rgba(255, 255, 255, 0.3)',
              zIndex: 10
            }}
          >
            CREAMOS SOLUCIONES INTELIGENTES.
          </h1>

          {/* Subtitle */}
          <p className="text-white text-xl md:text-2xl font-semibold mt-8 relative max-w-3xl mx-auto" style={{
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
            zIndex: 10
          }}>
            Transformamos ideas innovadoras en realidad con IA y desarrollo de software
          </p>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce" style={{ zIndex: 20 }}>
        <div className="w-6 h-10 border-2 border-white rounded-full flex items-start justify-center p-2">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
        </div>
      </div>
    </section>
  )
}

export default HeroSection
