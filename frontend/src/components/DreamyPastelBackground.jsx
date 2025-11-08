import { useEffect, useRef } from 'react'
import * as THREE from 'three'

function DreamyPastelBackground() {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xe3f5fd) // Azul cielo suave
    scene.fog = new THREE.Fog(0xe3f5fd, 10, 50)

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.set(0, 8, 20)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    containerRef.current.appendChild(renderer.domElement)

    // Iluminación suave y etérea
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
    scene.add(ambientLight)

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.6)
    mainLight.position.set(5, 10, 5)
    scene.add(mainLight)

    const fillLight = new THREE.DirectionalLight(0xccddff, 0.4)
    fillLight.position.set(-5, 5, -5)
    scene.add(fillLight)

    // Colores pastel
    const pastelColors = {
      lilac: 0xd8b4e2,      // Lila suave
      mint: 0xb4e7d8,       // Verde menta
      yellow: 0xfff4b4,     // Amarillo pálido
      pink: 0xffb4d8,       // Rosa claro
      lavender: 0xe8d4f0,   // Lavanda
      peach: 0xffd4b4       // Durazno
    }

    // Material aterciopelado/suave
    const createVelvetMaterial = (color) => {
      return new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.3,
        metalness: 0.05,
        envMapIntensity: 0.5
      })
    }

    // Crear ondas/dunas (planos ondulados)
    const waves = []
    const waveColors = [pastelColors.lilac, pastelColors.mint, pastelColors.yellow, pastelColors.lavender]

    for (let i = 0; i < 4; i++) {
      const geometry = new THREE.PlaneGeometry(50, 30, 50, 50)
      const positions = geometry.attributes.position

      // Crear ondas con ruido
      for (let j = 0; j < positions.count; j++) {
        const x = positions.getX(j)
        const y = positions.getY(j)
        const wave1 = Math.sin(x * 0.3 + i * 1.5) * 1.5
        const wave2 = Math.cos(y * 0.2 + i * 1.2) * 1.2
        const wave3 = Math.sin((x + y) * 0.15) * 0.8
        positions.setZ(j, wave1 + wave2 + wave3)
      }

      geometry.computeVertexNormals()

      const material = createVelvetMaterial(waveColors[i])
      const wave = new THREE.Mesh(geometry, material)

      wave.rotation.x = -Math.PI / 2
      wave.position.y = -3 - i * 2
      wave.position.z = -i * 3

      scene.add(wave)
      waves.push({ mesh: wave, offset: i * Math.PI / 2 })
    }

    // Crear esferas flotantes
    const spheres = []
    const sphereColors = [
      pastelColors.lilac,
      pastelColors.pink,
      pastelColors.lavender,
      pastelColors.peach,
      pastelColors.mint
    ]

    for (let i = 0; i < 20; i++) {
      const radius = 0.3 + Math.random() * 1.2
      const geometry = new THREE.SphereGeometry(radius, 32, 32)
      const material = createVelvetMaterial(sphereColors[Math.floor(Math.random() * sphereColors.length)])

      const sphere = new THREE.Mesh(geometry, material)

      sphere.position.x = (Math.random() - 0.5) * 25
      sphere.position.y = Math.random() * 15 - 3
      sphere.position.z = (Math.random() - 0.5) * 20 - 5

      scene.add(sphere)

      spheres.push({
        mesh: sphere,
        baseY: sphere.position.y,
        speed: 0.5 + Math.random() * 0.5,
        amplitude: 0.5 + Math.random() * 1,
        phase: Math.random() * Math.PI * 2,
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.01,
          y: (Math.random() - 0.5) * 0.01,
          z: (Math.random() - 0.5) * 0.01
        }
      })
    }

    // Mouse interaction
    const mouse = { x: 0, y: 0 }

    const handleMouseMove = (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    // Animation
    let animationId
    const clock = new THREE.Clock()

    const animate = () => {
      animationId = requestAnimationFrame(animate)
      const time = clock.getElapsedTime()

      // Animar ondas/dunas
      waves.forEach((wave, index) => {
        const positions = wave.mesh.geometry.attributes.position

        for (let i = 0; i < positions.count; i++) {
          const x = positions.getX(i)
          const y = positions.getY(i)

          const wave1 = Math.sin(x * 0.3 + time * 0.3 + wave.offset) * 1.5
          const wave2 = Math.cos(y * 0.2 + time * 0.2 + wave.offset) * 1.2
          const wave3 = Math.sin((x + y) * 0.15 + time * 0.15) * 0.8

          positions.setZ(i, wave1 + wave2 + wave3)
        }

        positions.needsUpdate = true
        wave.mesh.geometry.computeVertexNormals()
      })

      // Animar esferas flotantes
      spheres.forEach(sphere => {
        // Movimiento vertical suave (flotando)
        sphere.mesh.position.y = sphere.baseY + Math.sin(time * sphere.speed + sphere.phase) * sphere.amplitude

        // Rotación suave
        sphere.mesh.rotation.x += sphere.rotationSpeed.x
        sphere.mesh.rotation.y += sphere.rotationSpeed.y
        sphere.mesh.rotation.z += sphere.rotationSpeed.z

        // Movimiento horizontal sutil
        sphere.mesh.position.x += Math.sin(time * 0.2 + sphere.phase) * 0.002
      })

      // Mover cámara suavemente con mouse
      camera.position.x += (mouse.x * 2 - camera.position.x) * 0.01
      camera.position.y += (8 + mouse.y * 2 - camera.position.y) * 0.01
      camera.lookAt(0, 0, 0)

      // Rotación suave de la cámara
      const cameraAngle = time * 0.05
      camera.position.x += Math.sin(cameraAngle) * 0.01
      camera.position.z += Math.cos(cameraAngle) * 0.01

      renderer.render(scene, camera)
    }

    animate()

    // Resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    window.addEventListener('resize', handleResize, { passive: true })

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationId)

      waves.forEach(wave => {
        wave.mesh.geometry.dispose()
        wave.mesh.material.dispose()
        scene.remove(wave.mesh)
      })

      spheres.forEach(sphere => {
        sphere.mesh.geometry.dispose()
        sphere.mesh.material.dispose()
        scene.remove(sphere.mesh)
      })

      renderer.dispose()

      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />

      {/* Title */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
        <h1
          className="text-8xl font-bold text-white mb-6"
          style={{
            textShadow: '0 8px 32px rgba(216, 180, 226, 0.4), 0 0 60px rgba(180, 231, 216, 0.3)',
            letterSpacing: '0.05em'
          }}
        >
          Adbize
        </h1>
        <p
          className="text-3xl text-white/95 font-light tracking-wide"
          style={{
            textShadow: '0 4px 20px rgba(180, 231, 216, 0.3)'
          }}
        >
          Innovación Digital en Movimiento
        </p>
      </div>
    </div>
  )
}

export default DreamyPastelBackground
