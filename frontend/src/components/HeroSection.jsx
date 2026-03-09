import { useState, useEffect, useRef } from 'react'
import LavaLamp from './LavaLamp'
import LazyImage from './LazyImage'

function HeroSection() {
  const [transform, setTransform] = useState({ rotateX: 0, rotateY: 0, translateX: 0, translateY: 0 })
  const imageRef = useRef(null)
  const requestRef = useRef(null)

  useEffect(() => {
    const isMobile = window.innerWidth <= 768
    let throttleTimer = null

    if (isMobile) {
      // Mobile: Use device orientation (gyroscope)
      const handleOrientation = (event) => {
        if (event.beta !== null && event.gamma !== null) {
          // beta: front-to-back tilt (-180 to 180)
          // gamma: left-to-right tilt (-90 to 90)
          const beta = event.beta // Front to back
          const gamma = event.gamma // Left to right

          // Normalize and limit the tilt
          const rotateX = Math.max(-15, Math.min(15, beta / 6))
          const rotateY = Math.max(-15, Math.min(15, gamma / 3))

          setTransform({ rotateX: -rotateX, rotateY: rotateY, translateX: 0, translateY: 0 })
        }
      }

      // Request permission for iOS 13+
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
          .then(permissionState => {
            if (permissionState === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation)
            }
          })
          .catch(() => {})
      } else {
        // Non-iOS or older browsers
        window.addEventListener('deviceorientation', handleOrientation)
      }

      return () => {
        window.removeEventListener('deviceorientation', handleOrientation)
      }
    } else {
      // Desktop: Use mouse movement with parallax effect (throttled)
      const handleMouseMove = (e) => {
        if (!imageRef.current || throttleTimer) return

        throttleTimer = setTimeout(() => {
          throttleTimer = null
        }, 16) // ~60fps throttle

        // Use viewport center instead of element center for more fluid movement
        const centerX = window.innerWidth / 2
        const centerY = window.innerHeight / 2

        const mouseX = e.clientX
        const mouseY = e.clientY

        // Calculate distance from viewport center (normalized -1 to 1)
        const deltaX = (mouseX - centerX) / centerX
        const deltaY = (mouseY - centerY) / centerY

        // Apply tilt with max angle of 20 degrees (increased for more effect)
        const rotateY = deltaX * 20
        const rotateX = -deltaY * 20

        // Apply translation for parallax effect (move the image towards the cursor)
        const translateX = deltaX * 30 // pixels
        const translateY = deltaY * 30 // pixels

        // Use CSS transform directly for better performance
        if (requestRef.current) {
          cancelAnimationFrame(requestRef.current)
        }

        requestRef.current = requestAnimationFrame(() => {
          setTransform({ rotateX, rotateY, translateX, translateY })
        })
      }

      window.addEventListener('mousemove', handleMouseMove, { passive: true })

      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        if (requestRef.current) {
          cancelAnimationFrame(requestRef.current)
        }
        if (throttleTimer) {
          clearTimeout(throttleTimer)
        }
      }
    }
  }, [])

  return (
    <section className="hero-section">
      {/* Lava Lamp Background */}
      <LavaLamp />

      {/* Hero Content */}
      <div className="relative h-full w-full flex items-center justify-center px-4 sm:px-6 lg:px-8" style={{ zIndex: 10 }}>
        <div className="max-w-[1400px] mx-auto w-full text-center relative">
          {/* Character Behind Title - Optimized with responsive images */}
          <div
            ref={imageRef}
            className="absolute top-1/2 left-1/2 w-[400px] h-[400px] md:w-[600px] md:h-[600px] pointer-events-none"
            style={{
              zIndex: 1,
              transform: `translate(calc(-50% + ${transform.translateX}px), calc(-50% + ${transform.translateY}px)) perspective(1000px) rotateX(${transform.rotateX}deg) rotateY(${transform.rotateY}deg)`,
              transition: 'transform 0.15s cubic-bezier(0.23, 1, 0.32, 1)',
              transformStyle: 'preserve-3d',
              willChange: 'transform'
            }}
          >
            <picture>
              <source
                media="(max-width: 768px)"
                srcSet="/personajes/Generated Image November 04, 2025 - 11_09AM-mobile.png"
              />
              <LazyImage
                src="/personajes/Generated Image November 04, 2025 - 11_09AM.png"
                alt="AI Character"
                className="w-full h-full object-contain drop-shadow-2xl"
                priority={true}
              />
            </picture>
          </div>

          {/* Title */}
          <h1
            className="hero-title text-white relative px-4 leading-tight"
            style={{
              textShadow: '0 4px 12px rgba(0, 0, 0, 0.5), 0 2px 6px rgba(0, 0, 0, 0.6)',
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
