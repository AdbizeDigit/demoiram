import { useEffect, useRef } from 'react'

function LiquidBalls() {
  const canvasRef = useRef(null)
  const ballsRef = useRef([])
  const animationRef = useRef(null)
  const mouseRef = useRef({ x: null, y: null })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      initBalls()
    }

    // Colores pastel suaves
    const pastelColors = [
      { r: 255, g: 182, b: 193 },  // Rosa pastel
      { r: 173, g: 216, b: 230 },  // Azul claro pastel
      { r: 255, g: 218, b: 185 },  // Durazno pastel
      { r: 221, g: 160, b: 221 },  // Lavanda pastel
      { r: 176, g: 224, b: 230 },  // Celeste pastel
      { r: 255, g: 228, b: 196 },  // Crema pastel
      { r: 230, g: 230, b: 250 },  // Lila pastel
      { r: 152, g: 251, b: 152 },  // Verde menta pastel
      { r: 255, g: 192, b: 203 },  // Rosa claro
      { r: 176, g: 196, b: 222 }   // Azul acero claro
    ]

    class Ball {
      constructor() {
        this.x = Math.random() * canvas.width
        this.y = Math.random() * canvas.height
        this.radius = Math.random() * 40 + 30
        this.vx = (Math.random() - 0.5) * 2
        this.vy = (Math.random() - 0.5) * 2
        this.color = pastelColors[Math.floor(Math.random() * pastelColors.length)]
        this.originalVx = this.vx
        this.originalVy = this.vy
      }

      update() {
        // Movimiento hacia el mouse si está presente
        if (mouseRef.current.x !== null && mouseRef.current.y !== null) {
          const dx = mouseRef.current.x - this.x
          const dy = mouseRef.current.y - this.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 200) {
            const force = (200 - distance) / 200
            this.vx += (dx / distance) * force * 0.3
            this.vy += (dy / distance) * force * 0.3
          }
        }

        // Fricción suave
        this.vx *= 0.98
        this.vy *= 0.98

        // Mantener velocidad mínima
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy)
        if (speed < 0.5) {
          this.vx = this.originalVx
          this.vy = this.originalVy
        }

        this.x += this.vx
        this.y += this.vy

        // Rebotar en los bordes
        if (this.x < -this.radius) this.x = canvas.width + this.radius
        if (this.x > canvas.width + this.radius) this.x = -this.radius
        if (this.y < -this.radius) this.y = canvas.height + this.radius
        if (this.y > canvas.height + this.radius) this.y = -this.radius
      }

      draw() {
        const gradient = ctx.createRadialGradient(
          this.x, this.y, 0,
          this.x, this.y, this.radius
        )

        gradient.addColorStop(0, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 1)`)
        gradient.addColorStop(0.5, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.8)`)
        gradient.addColorStop(1, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0)`)

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const initBalls = () => {
      ballsRef.current = []
      const numBalls = Math.floor(canvas.width / 100) + 5
      for (let i = 0; i < numBalls; i++) {
        ballsRef.current.push(new Ball())
      }
    }

    const animate = () => {
      // Limpiar canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Aplicar efectos de blur y contrast para efecto líquido
      ctx.filter = 'blur(20px) contrast(20)'

      // Actualizar y dibujar bolas
      ballsRef.current.forEach(ball => {
        ball.update()
        ball.draw()
      })

      // Restaurar filtro
      ctx.filter = 'none'

      animationRef.current = requestAnimationFrame(animate)
    }

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x = e.clientX - rect.left
      mouseRef.current.y = e.clientY - rect.top
    }

    const handleMouseLeave = () => {
      mouseRef.current.x = null
      mouseRef.current.y = null
    }

    // Detectar orientación del dispositivo (móvil)
    const handleDeviceOrientation = (e) => {
      if (e.gamma !== null && e.beta !== null) {
        const centerX = canvas.width / 2
        const centerY = canvas.height / 2

        // Gamma: inclinación izquierda-derecha (-90 a 90)
        // Beta: inclinación adelante-atrás (-180 a 180)
        const targetX = centerX + (e.gamma / 90) * (canvas.width / 2)
        const targetY = centerY + (e.beta / 180) * (canvas.height / 2)

        mouseRef.current.x = targetX
        mouseRef.current.y = targetY
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseleave', handleMouseLeave)

    // Soporte para dispositivos móviles
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleDeviceOrientation)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
      window.removeEventListener('deviceorientation', handleDeviceOrientation)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0
      }}
    />
  )
}

export default LiquidBalls
