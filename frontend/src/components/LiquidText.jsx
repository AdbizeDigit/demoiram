import { useEffect, useRef } from 'react'

function LiquidText() {
  const canvasRef = useRef(null)
  const vertexesRef = useRef([])
  const diffPtRef = useRef([])
  const autoDiffRef = useRef(1000)
  const xxRef = useRef(150)
  const ddRef = useRef(15)
  const animationRef = useRef(null)
  const mouseXRef = useRef(null)
  const mouseYRef = useRef(null)
  const isMouseOverRef = useRef(false)
  const lastOrientationRef = useRef({ beta: 0, gamma: 0 })
  const perpetualMotionRef = useRef({ counter: 0, points: [] })

  const verNum = 250

  // Multicolor palette
  const colors = [
    '#ff6b6b', '#ee5a6f', '#c44569', // Reds/Pinks
    '#4ecdc4', '#44a08d', '#1a535c', // Teals
    '#f7b731', '#fa8231', '#eb3b5a', // Oranges
    '#a29bfe', '#6c5ce7', '#fd79a8', // Purples
    '#00b894', '#00cec9', '#0984e3', // Blues/Greens
    '#fdcb6e', '#e17055', '#d63031'  // Yellows/Reds
  ]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const container = canvas.parentElement

    // Initialize canvas size
    const resizeCanvas = () => {
      const width = container.offsetWidth
      const height = container.offsetHeight
      canvas.width = width
      canvas.height = height

      // Initialize vertexes
      vertexesRef.current = []
      for (let i = 0; i < verNum; i++) {
        vertexesRef.current[i] = new Vertex(
          (width / (verNum - 1)) * i,
          height / 2,
          height / 2
        )
      }

      // Initialize diffPt
      diffPtRef.current = new Array(verNum).fill(0)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Vertex class
    function Vertex(x, y, baseY) {
      this.baseY = baseY
      this.x = x
      this.y = y
      this.vy = 0
      this.targetY = 0
      this.friction = 0.15
      this.deceleration = 0.95
    }

    Vertex.prototype.updateY = function (diffVal) {
      this.targetY = diffVal + this.baseY
      this.vy += this.targetY - this.y
      this.y += this.vy * this.friction
      this.vy *= this.deceleration
    }

    // Update function with perpetual motion
    const update = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Perpetual motion - create random waves continuously
      perpetualMotionRef.current.counter++

      if (perpetualMotionRef.current.counter % 60 === 0) {
        // Every 60 frames, create a new wave point
        const randomPoint = Math.floor(Math.random() * (verNum - 40)) + 20
        const randomStrength = Math.random() * 300 + 200

        if (perpetualMotionRef.current.points.length < 3) {
          perpetualMotionRef.current.points.push({
            position: randomPoint,
            strength: randomStrength,
            decay: 0.85
          })
        }
      }

      // Apply perpetual motion waves
      perpetualMotionRef.current.points.forEach((point, index) => {
        if (point.strength > 10) {
          diffPtRef.current[point.position] += point.strength
          point.strength *= point.decay
        } else {
          perpetualMotionRef.current.points.splice(index, 1)
        }
      })

      autoDiffRef.current -= autoDiffRef.current * 0.9
      diffPtRef.current[xxRef.current] = autoDiffRef.current

      const dd = ddRef.current

      // Left side
      for (let i = xxRef.current - 1; i > 0; i--) {
        let d = xxRef.current - i
        if (d > dd) d = dd
        diffPtRef.current[i] -=
          (diffPtRef.current[i] - diffPtRef.current[i + 1]) * (1 - 0.01 * d)
      }

      // Right side
      for (let i = xxRef.current + 1; i < verNum; i++) {
        let d = i - xxRef.current
        if (d > dd) d = dd
        diffPtRef.current[i] -=
          (diffPtRef.current[i] - diffPtRef.current[i - 1]) * (1 - 0.01 * d)
      }

      // Update vertex Y coordinates
      for (let i = 0; i < vertexesRef.current.length; i++) {
        vertexesRef.current[i].updateY(diffPtRef.current[i])
      }

      draw()
      animationRef.current = requestAnimationFrame(update)
    }

    // Draw function with multicolor gradient
    const draw = () => {
      const height = canvas.height
      const width = canvas.width

      // Create rainbow gradient that spans the entire width
      const gradient = ctx.createLinearGradient(0, 0, width, 0)

      // Add multiple color stops for rainbow effect
      gradient.addColorStop(0, '#ff6b6b')      // Red
      gradient.addColorStop(0.15, '#f7b731')   // Orange
      gradient.addColorStop(0.3, '#fdcb6e')    // Yellow
      gradient.addColorStop(0.45, '#00b894')   // Green
      gradient.addColorStop(0.6, '#0984e3')    // Blue
      gradient.addColorStop(0.75, '#6c5ce7')   // Purple
      gradient.addColorStop(0.9, '#fd79a8')    // Pink
      gradient.addColorStop(1, '#ff6b6b')      // Red again

      // Draw multiple layers with different offsets
      const numLayers = 6

      for (let layer = numLayers - 1; layer >= 0; layer--) {
        ctx.beginPath()
        ctx.moveTo(0, height)

        // Different opacity for depth
        ctx.globalAlpha = 0.7 - (layer * 0.1)
        ctx.fillStyle = gradient

        const offset = layer * 10

        ctx.lineTo(
          vertexesRef.current[0].x + offset,
          vertexesRef.current[0].y + offset / 2
        )

        for (let i = 1; i < vertexesRef.current.length; i++) {
          ctx.lineTo(
            vertexesRef.current[i].x + offset,
            vertexesRef.current[i].y + offset / 2
          )
        }

        ctx.lineTo(width, height)
        ctx.lineTo(0, height)
        ctx.fill()
      }

      // Reset alpha
      ctx.globalAlpha = 1.0
    }

    // Mouse move handler - creates waves as cursor moves
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      mouseXRef.current = e.clientX - rect.left
      mouseYRef.current = e.clientY - rect.top

      const mouseY = mouseYRef.current
      const mouseX = mouseXRef.current

      // Only create waves if cursor is near the center vertical area
      if (
        canvas.height / 2 - mouseY < 100 &&
        canvas.height / 2 - mouseY > -100
      ) {
        // Create smaller waves continuously as mouse moves
        autoDiffRef.current = 500

        if (mouseX > 0 && mouseX < canvas.width - 2) {
          xxRef.current = 1 + Math.floor(((verNum - 2) * mouseX) / canvas.width)
          diffPtRef.current[xxRef.current] = autoDiffRef.current
        }
      }
    }

    // Mouse click handler - creates bigger waves
    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      if (
        canvas.height / 2 - mouseY < 100 &&
        canvas.height / 2 - mouseY > -100
      ) {
        autoDiffRef.current = 1500 // Bigger wave on click

        if (mouseX < canvas.width - 2) {
          xxRef.current = 1 + Math.floor(((verNum - 2) * mouseX) / canvas.width)
          diffPtRef.current[xxRef.current] = autoDiffRef.current
        }
      }
    }

    // Mouse enter/leave handlers
    const handleMouseEnter = () => {
      isMouseOverRef.current = true
    }

    const handleMouseLeave = () => {
      isMouseOverRef.current = false
      mouseXRef.current = null
      mouseYRef.current = null
    }

    // Wheel handler
    const handleWheel = (e) => {
      e.preventDefault()
      const delta = e.deltaY || e.detail || e.wheelDelta
      if (delta < 0) {
        if (ddRef.current > 8) ddRef.current--
      } else {
        if (ddRef.current < 50) ddRef.current++
      }
    }

    // Device orientation handler (for mobile tilt)
    const handleDeviceOrientation = (e) => {
      if (e.beta !== null && e.gamma !== null) {
        const beta = e.beta // Front-to-back tilt (-180 to 180)
        const gamma = e.gamma // Left-to-right tilt (-90 to 90)

        // Calculate change in orientation
        const deltaBeta = Math.abs(beta - lastOrientationRef.current.beta)
        const deltaGamma = Math.abs(gamma - lastOrientationRef.current.gamma)

        // If significant movement detected
        if (deltaBeta > 2 || deltaGamma > 2) {
          // Map gamma (-90 to 90) to position (0 to verNum)
          const normalizedGamma = ((gamma + 90) / 180) // 0 to 1
          const position = Math.floor(normalizedGamma * (verNum - 40)) + 20

          // Use beta for wave strength
          const strength = Math.min(Math.abs(beta) * 20, 800)

          xxRef.current = position
          autoDiffRef.current = strength
          diffPtRef.current[xxRef.current] = autoDiffRef.current
        }

        lastOrientationRef.current = { beta, gamma }
      }
    }

    // Device motion handler (for shake detection)
    const handleDeviceMotion = (e) => {
      if (e.accelerationIncludingGravity) {
        const { x, y, z } = e.accelerationIncludingGravity

        // Detect sudden movements/shakes
        const totalAcceleration = Math.sqrt(x * x + y * y + z * z)

        if (totalAcceleration > 20) {
          // Shake detected - create multiple waves
          for (let i = 0; i < 3; i++) {
            const randomPos = Math.floor(Math.random() * (verNum - 40)) + 20
            perpetualMotionRef.current.points.push({
              position: randomPos,
              strength: 800,
              decay: 0.88
            })
          }
        }
      }
    }

    // Request permission for iOS 13+ devices
    const requestMotionPermission = async () => {
      if (
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function'
      ) {
        try {
          const permission = await DeviceOrientationEvent.requestPermission()
          if (permission === 'granted') {
            window.addEventListener('deviceorientation', handleDeviceOrientation)
            window.addEventListener('devicemotion', handleDeviceMotion)
          }
        } catch (error) {
          console.log('Motion permission denied')
        }
      } else {
        // Non-iOS or older iOS
        window.addEventListener('deviceorientation', handleDeviceOrientation)
        window.addEventListener('devicemotion', handleDeviceMotion)
      }
    }

    // Try to enable motion sensors
    requestMotionPermission()

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseenter', handleMouseEnter)
    canvas.addEventListener('mouseleave', handleMouseLeave)
    canvas.addEventListener('click', handleClick)
    canvas.addEventListener('wheel', handleWheel, { passive: false })

    // Start animation
    update()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('deviceorientation', handleDeviceOrientation)
      window.removeEventListener('devicemotion', handleDeviceMotion)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseenter', handleMouseEnter)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
      canvas.removeEventListener('click', handleClick)
      canvas.removeEventListener('wheel', handleWheel)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
    />
  )
}

export default LiquidText
