import { useEffect, useRef } from 'react'

function AnimatedBackground() {
  const canvasRef = useRef(null)
  const orbsRef = useRef([])
  const animationRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initOrbs()
    }

    const colors = [
      { r: 255, g: 0, b: 128 },    // Hot Pink
      { r: 0, g: 150, b: 255 },    // Electric Blue
      { r: 255, g: 200, b: 0 },    // Bright Yellow
      { r: 0, g: 255, b: 200 },    // Cyan
      { r: 150, g: 0, b: 255 },    // Vivid Purple
      { r: 255, g: 100, b: 0 },    // Bright Orange
      { r: 255, g: 0, b: 255 },    // Magenta
      { r: 0, g: 255, b: 100 }     // Neon Green
    ]

    class Orb {
      constructor() {
        this.x = Math.random() * canvas.width
        this.y = Math.random() * canvas.height
        this.radius = Math.random() * 300 + 200
        this.vx = (Math.random() - 0.5) * 1
        this.vy = (Math.random() - 0.5) * 1
        this.color = colors[Math.floor(Math.random() * colors.length)]
        this.opacity = Math.random() * 0.35 + 0.5
      }

      update() {
        this.x += this.vx
        this.y += this.vy

        // Bounce off edges
        if (this.x < -this.radius || this.x > canvas.width + this.radius) {
          this.vx *= -1
        }
        if (this.y < -this.radius || this.y > canvas.height + this.radius) {
          this.vy *= -1
        }
      }

      draw() {
        const gradient = ctx.createRadialGradient(
          this.x, this.y, 0,
          this.x, this.y, this.radius
        )

        gradient.addColorStop(0, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.opacity})`)
        gradient.addColorStop(0.3, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.opacity * 0.75})`)
        gradient.addColorStop(0.6, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.opacity * 0.4})`)
        gradient.addColorStop(1, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0)`)

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const initOrbs = () => {
      orbsRef.current = []
      const numOrbs = window.innerWidth < 768 ? 6 : 10
      for (let i = 0; i < numOrbs; i++) {
        orbsRef.current.push(new Orb())
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      orbsRef.current.forEach(orb => {
        orb.update()
        orb.draw()
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ filter: 'blur(25px)', opacity: 0.9 }}
    />
  )
}

export default AnimatedBackground
