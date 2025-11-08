import { useEffect, useRef } from 'react'
import * as THREE from 'three'

function RealisticWaterSimulator() {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x87ceeb)

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.set(12, 18, 25)
    camera.lookAt(0, 6, 0)

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1))
    renderer.shadowMap.enabled = false
    containerRef.current.appendChild(renderer.domElement)

    // Smaller container
    const CONTAINER = {
      width: 20,
      height: 15,
      depth: 20
    }

    const BOUNDS = {
      minX: 0, maxX: CONTAINER.width,
      minY: 0, maxY: CONTAINER.height,
      minZ: 0, maxZ: CONTAINER.depth
    }

    // Minimal lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
    scene.add(ambientLight)

    // Simple floor
    const floorGeometry = new THREE.PlaneGeometry(CONTAINER.width, CONTAINER.depth)
    const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x555555 })
    const floor = new THREE.Mesh(floorGeometry, floorMaterial)
    floor.rotation.x = -Math.PI / 2
    floor.position.set(CONTAINER.width / 2, 0, CONTAINER.depth / 2)
    scene.add(floor)

    // Simple wireframe walls
    const wallGeometry = new THREE.BoxGeometry(CONTAINER.width, CONTAINER.height, CONTAINER.depth)
    const wallEdges = new THREE.EdgesGeometry(wallGeometry)
    const wallLines = new THREE.LineSegments(
      wallEdges,
      new THREE.LineBasicMaterial({ color: 0x999999, transparent: true, opacity: 0.2 })
    )
    wallLines.position.set(CONTAINER.width / 2, CONTAINER.height / 2, CONTAINER.depth / 2)
    scene.add(wallLines)

    // Ultra-optimized physics
    const GRAVITY = -12.0
    const DAMPING = 0.97
    const PARTICLE_RADIUS = 0.35
    const INTERACTION_RADIUS = 1.5

    let particles = []

    // Ultra-light geometry
    const waterGeometry = new THREE.SphereGeometry(PARTICLE_RADIUS, 4, 4)
    const waterMaterial = new THREE.MeshBasicMaterial({
      color: 0x0099ff,
      transparent: true,
      opacity: 0.8
    })

    let instancedMesh = null
    const dummy = new THREE.Object3D()

    function initializeWater() {
      particles = []

      // ULTRA-OPTIMIZED: Very few particles
      const spacing = 1.2
      const numX = Math.floor((CONTAINER.width * 0.5) / spacing)
      const numY = Math.floor((CONTAINER.height * 0.3) / spacing)
      const numZ = Math.floor((CONTAINER.depth * 0.5) / spacing)

      for (let x = 0; x < numX; x++) {
        for (let y = 0; y < numY; y++) {
          for (let z = 0; z < numZ; z++) {
            particles.push({
              pos: new THREE.Vector3(
                x * spacing + 2,
                y * spacing + 1,
                z * spacing + 2
              ),
              vel: new THREE.Vector3(0, 0, 0)
            })
          }
        }
      }

      // Create instanced mesh
      instancedMesh = new THREE.InstancedMesh(
        waterGeometry,
        waterMaterial,
        particles.length
      )
      scene.add(instancedMesh)
    }

    initializeWater()

    // Simplified physics - no SPH, just basic particle interaction
    function updateParticles(dt) {
      // Simple gravity and collision
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        // Apply gravity
        p.vel.y += GRAVITY * dt

        // Simple neighbor interaction for cohesion
        let avgVel = new THREE.Vector3()
        let count = 0

        for (let j = 0; j < particles.length; j++) {
          if (i === j) continue
          const other = particles[j]
          const dist = p.pos.distanceTo(other.pos)

          if (dist < INTERACTION_RADIUS) {
            avgVel.add(other.vel)
            count++

            // Separation force
            if (dist < PARTICLE_RADIUS * 2) {
              const repel = new THREE.Vector3().subVectors(p.pos, other.pos).normalize()
              p.vel.add(repel.multiplyScalar(0.1))
            }
          }
        }

        // Cohesion
        if (count > 0) {
          avgVel.divideScalar(count)
          p.vel.lerp(avgVel, 0.05)
        }

        // Damping
        p.vel.multiplyScalar(DAMPING)

        // Update position
        p.pos.add(p.vel.clone().multiplyScalar(dt))

        // Boundary collisions
        if (p.pos.x < BOUNDS.minX) {
          p.pos.x = BOUNDS.minX
          p.vel.x *= -0.5
        }
        if (p.pos.x > BOUNDS.maxX) {
          p.pos.x = BOUNDS.maxX
          p.vel.x *= -0.5
        }

        if (p.pos.y < BOUNDS.minY) {
          p.pos.y = BOUNDS.minY
          p.vel.y *= -0.3
          p.vel.x *= 0.9
          p.vel.z *= 0.9
        }
        if (p.pos.y > BOUNDS.maxY) {
          p.pos.y = BOUNDS.maxY
          p.vel.y *= -0.5
        }

        if (p.pos.z < BOUNDS.minZ) {
          p.pos.z = BOUNDS.minZ
          p.vel.z *= -0.5
        }
        if (p.pos.z > BOUNDS.maxZ) {
          p.pos.z = BOUNDS.maxZ
          p.vel.z *= -0.5
        }
      }
    }

    function updateInstancedMesh() {
      for (let i = 0; i < particles.length; i++) {
        dummy.position.copy(particles[i].pos)
        dummy.updateMatrix()
        instancedMesh.setMatrixAt(i, dummy.matrix)
      }
      instancedMesh.instanceMatrix.needsUpdate = true
    }

    // Mouse interaction
    const mouse = new THREE.Vector2()
    let mouseWorldPos = new THREE.Vector3()
    let isMouseDown = false

    const handleMouseMove = (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

      // Simple mouse position estimation
      mouseWorldPos.set(
        (mouse.x + 1) * CONTAINER.width / 2,
        CONTAINER.height / 2,
        (mouse.y + 1) * CONTAINER.depth / 2
      )
    }

    const handleMouseDown = () => {
      isMouseDown = true
    }

    const handleMouseUp = () => {
      isMouseDown = false
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('mousedown', handleMouseDown, { passive: true })
    window.addEventListener('mouseup', handleMouseUp, { passive: true })

    function applyMouseForce() {
      if (!isMouseDown) return

      const forceRadius = 6.0
      const forceMagnitude = 30.0

      for (let p of particles) {
        const toMouse = new THREE.Vector3().subVectors(mouseWorldPos, p.pos)
        const dist = toMouse.length()

        if (dist < forceRadius) {
          const force = toMouse.normalize().multiplyScalar(
            forceMagnitude * (1 - dist / forceRadius) * 0.016
          )
          p.vel.add(force)
        }
      }
    }

    // Ultra-optimized animation loop
    let animationId

    const animate = () => {
      animationId = requestAnimationFrame(animate)

      // Single physics step
      updateParticles(0.016)
      applyMouseForce()
      updateInstancedMesh()

      // Rotate camera
      const time = performance.now() * 0.0001
      camera.position.x = Math.sin(time * 0.5) * 25 + CONTAINER.width / 2
      camera.position.z = Math.cos(time * 0.5) * 25 + CONTAINER.depth / 2
      camera.lookAt(CONTAINER.width / 2, CONTAINER.height / 3, CONTAINER.depth / 2)

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
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationId)

      if (instancedMesh) {
        scene.remove(instancedMesh)
        instancedMesh.geometry.dispose()
        instancedMesh.material.dispose()
      }

      waterGeometry.dispose()
      renderer.dispose()

      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 z-0 bg-gradient-to-b from-sky-200 to-sky-100">
      <div ref={containerRef} className="w-full h-full" />

      {/* Title */}
      <div className="absolute top-12 left-1/2 transform -translate-x-1/2 text-center pointer-events-none z-10">
        <h1 className="text-6xl font-bold text-white drop-shadow-2xl mb-3">
          Adbize
        </h1>
        <p className="text-xl text-white/90 drop-shadow-lg">
          Simulación Realista de Agua
        </p>
      </div>
    </div>
  )
}

export default RealisticWaterSimulator
