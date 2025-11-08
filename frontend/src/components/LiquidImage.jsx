import { useEffect, useRef, useState } from 'react'

function LiquidImage() {
  const timeRef = useRef(0)
  const animationRef = useRef(null)
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    const animate = () => {
      timeRef.current += 0.01

      const turbulence = document.getElementById('liquid-turbulence')
      if (turbulence) {
        const baseFrequency = 0.02 + Math.sin(timeRef.current) * 0.005
        turbulence.setAttribute('baseFrequency', `${baseFrequency} ${baseFrequency}`)
      }

      // Rotación lenta de la imagen (completa 360° cada 60 segundos)
      setRotation(prev => (prev + 0.05) % 360)

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <div
        style={{
          width: '200%',
          height: '200%',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
          transformOrigin: 'center center'
        }}
      >
        <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
          <defs>
            <filter id="liquid-filter">
              <feTurbulence
                id="liquid-turbulence"
                type="fractalNoise"
                baseFrequency="0.02 0.02"
                numOctaves="3"
                seed="2"
                result="turbulence"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="turbulence"
                scale="15"
                xChannelSelector="R"
                yChannelSelector="G"
                result="displacement"
              />
              <feGaussianBlur in="displacement" stdDeviation="1" result="blur" />
            </filter>

            {/* Filtro de brillo adicional */}
            <filter id="brightness-filter">
              <feColorMatrix
                type="matrix"
                values="1.2 0 0 0 0
                        0 1.2 0 0 0
                        0 0 1.2 0 0
                        0 0 0 1 0"
              />
              <feGaussianBlur stdDeviation="2" />
            </filter>

            {/* Gradiente radial para overlay de luz */}
            <radialGradient id="light-overlay">
              <stop offset="0%" style={{ stopColor: 'rgba(255, 255, 255, 0.3)' }} />
              <stop offset="70%" style={{ stopColor: 'rgba(255, 255, 255, 0)' }} />
            </radialGradient>
          </defs>

          <image
            href="/fondos/Generated Image October 30, 2025 - 2_25PM.png"
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid slice"
            filter="url(#liquid-filter) url(#brightness-filter)"
            style={{ opacity: 0.95 }}
          />

          {/* Overlay de luz */}
          <ellipse
            cx="50%"
            cy="50%"
            rx="50%"
            ry="50%"
            fill="url(#light-overlay)"
          />
        </svg>
      </div>
    </div>
  )
}

export default LiquidImage
