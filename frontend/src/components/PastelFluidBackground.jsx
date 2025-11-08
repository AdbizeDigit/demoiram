import { useEffect, useRef } from 'react'

function PastelFluidBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: false })

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Colores vibrantes multicolor pastel
    const colorPalette = [
      { r: 255, g: 105, b: 180 }, // Hot pink
      { r: 135, g: 206, b: 250 }, // Sky blue
      { r: 147, g: 112, b: 219 }, // Medium purple
      { r: 152, g: 251, b: 152 }, // Pale green
      { r: 255, g: 182, b: 193 }, // Light pink
      { r: 173, g: 216, b: 230 }, // Light blue
      { r: 255, g: 160, b: 122 }, // Light salmon
      { r: 221, g: 160, b: 221 }, // Plum
      { r: 176, g: 224, b: 230 }, // Powder blue
      { r: 255, g: 218, b: 185 }, // Peach
      { r: 230, g: 230, b: 250 }, // Lavender
      { r: 255, g: 228, b: 225 }  // Misty rose
    ]

    // Fluid blobs (metaballs)
    class FluidBlob {
      constructor(index) {
        this.x = Math.random() * canvas.width
        this.y = Math.random() * canvas.height
        this.baseVx = (Math.random() - 0.5) * 0.5
        this.baseVy = (Math.random() - 0.5) * 0.5
        this.vx = this.baseVx
        this.vy = this.baseVy
        this.radius = 200 + Math.random() * 300 // Blobs MUCHO más grandes
        this.color = colorPalette[index % colorPalette.length]
        this.phase = Math.random() * Math.PI * 2
      }

      update(time) {
        // Smooth organic movement
        this.x += this.vx
        this.y += this.vy

        // Add subtle wave motion
        this.x += Math.sin(time * 0.001 + this.phase) * 0.2
        this.y += Math.cos(time * 0.0008 + this.phase) * 0.2

        // Soft bounce off edges
        if (this.x - this.radius < 0 || this.x + this.radius > canvas.width) {
          this.vx *= -0.9
          this.baseVx *= -0.9
        }
        if (this.y - this.radius < 0 || this.y + this.radius > canvas.height) {
          this.vy *= -0.9
          this.baseVy *= -0.9
        }

        // Keep in bounds
        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x))
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y))

        // Gradually return to base velocity
        this.vx += (this.baseVx - this.vx) * 0.01
        this.vy += (this.baseVy - this.vy) * 0.01
      }
    }

    // Create fluid blobs - MUCHOS MÁS
    const blobCount = 35
    const blobs = []
    for (let i = 0; i < blobCount; i++) {
      blobs.push(new FluidBlob(i))
    }

    // Mouse interaction
    const mouse = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      radius: 250,
      influence: 0,
      active: false
    }

    const handleMouseMove = (e) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
      mouse.influence = 1
      mouse.active = true
    }

    const handleMouseLeave = () => {
      mouse.active = false
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseleave', handleMouseLeave)

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault()
      const touch = e.touches[0]
      handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY })
    }, { passive: false })

    canvas.addEventListener('touchend', handleMouseLeave)

    // Offscreen canvas for blur effect
    const offscreenCanvas = document.createElement('canvas')
    const offscreenCtx = offscreenCanvas.getContext('2d')
    offscreenCanvas.width = canvas.width
    offscreenCanvas.height = canvas.height

    // Animation
    let animationId
    let startTime = performance.now()

    const animate = () => {
      animationId = requestAnimationFrame(animate)
      const currentTime = performance.now() - startTime

      // Resize offscreen canvas if needed
      if (offscreenCanvas.width !== canvas.width || offscreenCanvas.height !== canvas.height) {
        offscreenCanvas.width = canvas.width
        offscreenCanvas.height = canvas.height
      }

      // Smooth mouse influence fade
      if (mouse.active) {
        mouse.influence = Math.min(mouse.influence + 0.1, 1)
      } else {
        mouse.influence *= 0.92
      }

      // Fondo blanco puro para que resalten los colores
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Update blobs
      blobs.forEach(blob => {
        blob.update(currentTime)

        // Mouse interaction - create ripple effect
        if (mouse.influence > 0.05) {
          const dx = mouse.x - blob.x
          const dy = mouse.y - blob.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < mouse.radius) {
            const force = (1 - dist / mouse.radius) * mouse.influence * 5
            // Push away from mouse
            blob.vx -= (dx / dist) * force
            blob.vy -= (dy / dist) * force
          }
        }

        // Apply friction
        blob.vx *= 0.985
        blob.vy *= 0.985
      })

      // Draw blobs on offscreen canvas
      offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height)

      blobs.forEach(blob => {
        const gradient = offscreenCtx.createRadialGradient(
          blob.x, blob.y, 0,
          blob.x, blob.y, blob.radius * 1.8
        )

        // Mucha más opacidad y cobertura
        gradient.addColorStop(0, `rgba(${blob.color.r}, ${blob.color.g}, ${blob.color.b}, 1)`)
        gradient.addColorStop(0.4, `rgba(${blob.color.r}, ${blob.color.g}, ${blob.color.b}, 0.9)`)
        gradient.addColorStop(0.7, `rgba(${blob.color.r}, ${blob.color.g}, ${blob.color.b}, 0.7)`)
        gradient.addColorStop(1, `rgba(${blob.color.r}, ${blob.color.g}, ${blob.color.b}, 0)`)

        offscreenCtx.fillStyle = gradient
        offscreenCtx.beginPath()
        offscreenCtx.arc(blob.x, blob.y, blob.radius * 1.8, 0, Math.PI * 2)
        offscreenCtx.fill()
      })

      // Draw mouse cursor influence
      if (mouse.influence > 0.1) {
        const cursorGradient = offscreenCtx.createRadialGradient(
          mouse.x, mouse.y, 0,
          mouse.x, mouse.y, mouse.radius
        )
        cursorGradient.addColorStop(0, `rgba(255, 255, 255, ${mouse.influence * 0.8})`)
        cursorGradient.addColorStop(0.5, `rgba(255, 255, 255, ${mouse.influence * 0.5})`)
        cursorGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

        offscreenCtx.fillStyle = cursorGradient
        offscreenCtx.beginPath()
        offscreenCtx.arc(mouse.x, mouse.y, mouse.radius, 0, Math.PI * 2)
        offscreenCtx.fill()
      }

      // Apply blur and draw to main canvas - MENOS BLUR
      ctx.save()
      ctx.filter = 'blur(35px) contrast(2.2) saturate(1.4) brightness(1.1)'
      ctx.drawImage(offscreenCanvas, 0, 0)
      ctx.restore()
    }

    animate()

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{
          background: '#ffffff'
        }}
      />

      {/* Title */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
        <h1
          className="text-8xl font-bold text-white mb-6 animate-fade-in"
          style={{
            textShadow: '0 8px 32px rgba(0,0,0,0.3), 0 0 60px rgba(0,0,0,0.2)',
            letterSpacing: '0.05em'
          }}
        >
          Adbize
        </h1>
        <p
          className="text-3xl text-white font-light tracking-wide"
          style={{
            textShadow: '0 4px 20px rgba(0,0,0,0.25)'
          }}
        >
          Innovación Digital en Movimiento
        </p>
      </div>
    </div>
  )
}

export default PastelFluidBackground
