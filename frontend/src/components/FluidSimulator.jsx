import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

function FluidSimulator() {
  const containerRef = useRef(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [density, setDensity] = useState(0.8)
  const [flipness, setFlipness] = useState(0.85)
  const [speed, setSpeed] = useState(1.0)
  const [particleCount, setParticleCount] = useState(0)
  const simulationRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0f0f0)

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.set(20, 15, 25)
    camera.lookAt(0, 10, 0)

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    containerRef.current.appendChild(renderer.domElement)

    // Grid dimensions (world space)
    const GRID_WIDTH = 40
    const GRID_HEIGHT = 20
    const GRID_DEPTH = 20

    // Simulation boundaries
    const BOUNDS = {
      minX: 0, maxX: GRID_WIDTH,
      minY: 0, maxY: GRID_HEIGHT,
      minZ: 0, maxZ: GRID_DEPTH
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6)
    directionalLight.position.set(10, 20, 10)
    scene.add(directionalLight)

    const pointLight1 = new THREE.PointLight(0x4080ff, 1, 100)
    pointLight1.position.set(-10, 10, 10)
    scene.add(pointLight1)

    const pointLight2 = new THREE.PointLight(0xff8040, 1, 100)
    pointLight2.position.set(30, 10, 10)
    scene.add(pointLight2)

    // Grid helper
    const gridHelper = new THREE.GridHelper(GRID_WIDTH, 20, 0xcccccc, 0xe0e0e0)
    gridHelper.position.set(GRID_WIDTH / 2, 0, GRID_DEPTH / 2)
    scene.add(gridHelper)

    // Walls (wireframe boxes)
    const wallGeometry = new THREE.BoxGeometry(GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH)
    const wallEdges = new THREE.EdgesGeometry(wallGeometry)
    const wallLines = new THREE.LineSegments(
      wallEdges,
      new THREE.LineBasicMaterial({ color: 0xaaaaaa, linewidth: 1 })
    )
    wallLines.position.set(GRID_WIDTH / 2, GRID_HEIGHT / 2, GRID_DEPTH / 2)
    scene.add(wallLines)

    // Physics constants - OPTIMIZED FOR FLUIDITY
    const GRAVITY = -15.0 // Increased for more dynamic motion
    const DAMPING = 0.98 // Reduced for less rigidity
    const PARTICLE_RADIUS = 0.2
    const MOUSE_FORCE = 40.0
    const MOUSE_RADIUS = 10.0

    // SPH constants for fluid behavior
    const SMOOTH_RADIUS = 1.2
    const STIFFNESS = 50 // Reduced for less rigidity
    const REST_DENSITY = 30
    const VISCOSITY = 0.05 // Increased viscosity for smoother flow
    const SURFACE_TENSION = 0.01

    // Mouse interaction
    const raycaster = new THREE.Raycaster()
    const mouse3D = new THREE.Vector2()
    const mouseWorldPos = new THREE.Vector3()
    let isMouseMoving = false

    // Invisible plane for mouse raycast
    const invisiblePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshBasicMaterial({ visible: false })
    )
    invisiblePlane.rotation.x = -Math.PI / 2
    invisiblePlane.position.y = GRID_HEIGHT / 2
    scene.add(invisiblePlane)

    // Particle system using InstancedMesh for performance
    let particles = []
    let instancedMesh = null
    const particleGeometry = new THREE.SphereGeometry(PARTICLE_RADIUS, 8, 8)
    const particleMaterial = new THREE.MeshPhongMaterial({
      color: 0x0033ff,
      shininess: 100,
      specular: 0xffffff
    })

    const dummy = new THREE.Object3D()
    const colorArray = []

    function createParticles(preset) {
      // Clear existing particles
      if (instancedMesh) {
        scene.remove(instancedMesh)
        instancedMesh.geometry.dispose()
        instancedMesh.material.dispose()
      }
      particles = []
      colorArray.length = 0

      // Create particles based on preset
      const boxes = preset || [
        { min: [0, 0, 0], max: [15, 20, 20] } // Dam break default
      ]

      const particleDensity = density
      const particlesPerUnit = 3 * particleDensity // Optimized count

      const tempParticles = []

      boxes.forEach(box => {
        const width = box.max[0] - box.min[0]
        const height = box.max[1] - box.min[1]
        const depth = box.max[2] - box.min[2]

        const numX = Math.floor(width * particlesPerUnit)
        const numY = Math.floor(height * particlesPerUnit)
        const numZ = Math.floor(depth * particlesPerUnit)

        for (let i = 0; i < numX; i++) {
          for (let j = 0; j < numY; j++) {
            for (let k = 0; k < numZ; k++) {
              const x = box.min[0] + (i / numX) * width + Math.random() * 0.2
              const y = box.min[1] + (j / numY) * height + Math.random() * 0.2
              const z = box.min[2] + (k / numZ) * depth + Math.random() * 0.2

              tempParticles.push({
                position: new THREE.Vector3(x, y, z),
                velocity: new THREE.Vector3(0, 0, 0),
                density: 0,
                pressure: 0
              })
            }
          }
        }
      })

      particles = tempParticles
      const particleCount = particles.length

      // Create instanced mesh
      instancedMesh = new THREE.InstancedMesh(
        particleGeometry,
        particleMaterial,
        particleCount
      )

      // Initialize colors
      for (let i = 0; i < particleCount; i++) {
        colorArray.push(new THREE.Color(0x0033ff))
      }

      scene.add(instancedMesh)
      setParticleCount(particleCount)
    }

    // SPH density and pressure calculation
    function computeDensityPressure() {
      particles.forEach(pi => {
        pi.density = 0

        particles.forEach(pj => {
          const diff = new THREE.Vector3().subVectors(pi.position, pj.position)
          const distSq = diff.lengthSq()

          if (distSq < SMOOTH_RADIUS * SMOOTH_RADIUS) {
            const dist = Math.sqrt(distSq)
            const influence = Math.max(0, SMOOTH_RADIUS - dist)
            pi.density += influence * influence
          }
        })

        pi.pressure = STIFFNESS * Math.max(0, pi.density - REST_DENSITY)
      })
    }

    // SPH force calculation
    function computeForces() {
      particles.forEach(pi => {
        const pressureForce = new THREE.Vector3()
        const viscosityForce = new THREE.Vector3()

        particles.forEach(pj => {
          if (pi === pj) return

          const diff = new THREE.Vector3().subVectors(pi.position, pj.position)
          const distSq = diff.lengthSq()

          if (distSq < SMOOTH_RADIUS * SMOOTH_RADIUS && distSq > 0.001) {
            const dist = Math.sqrt(distSq)
            const direction = diff.clone().normalize()

            // Pressure force
            const pressureContribution = (pi.pressure + pj.pressure) * 0.5 * (SMOOTH_RADIUS - dist)
            pressureForce.add(direction.multiplyScalar(pressureContribution))

            // Viscosity force
            const velocityDiff = new THREE.Vector3().subVectors(pj.velocity, pi.velocity)
            viscosityForce.add(velocityDiff.multiplyScalar(VISCOSITY * (SMOOTH_RADIUS - dist)))
          }
        })

        // Apply forces
        pi.velocity.add(pressureForce.multiplyScalar(0.005))
        pi.velocity.add(viscosityForce)
      })
    }

    // Update particle positions
    function updateParticles(deltaTime) {
      // SPH simulation
      if (particles.length < 3000) { // Only if not too many particles
        computeDensityPressure()
        computeForces()
      }

      particles.forEach((particle, i) => {
        // Gravity
        particle.velocity.y += GRAVITY * deltaTime

        // Mouse interaction
        if (isMouseMoving && mouseWorldPos) {
          const toMouse = new THREE.Vector3().subVectors(mouseWorldPos, particle.position)
          const distance = toMouse.length()

          if (distance < MOUSE_RADIUS && distance > 0.1) {
            const forceMagnitude = MOUSE_FORCE * (1 - distance / MOUSE_RADIUS)
            // Repel particles from mouse
            particle.velocity.sub(toMouse.normalize().multiplyScalar(forceMagnitude * deltaTime))
          }
        }

        // Apply damping
        particle.velocity.multiplyScalar(DAMPING)

        // Update position
        particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime))

        // Collision with boundaries
        const RESTITUTION = 0.4 // Bounciness
        const FRICTION = 0.9

        if (particle.position.x < BOUNDS.minX) {
          particle.position.x = BOUNDS.minX
          particle.velocity.x *= -RESTITUTION
          particle.velocity.y *= FRICTION
          particle.velocity.z *= FRICTION
        }
        if (particle.position.x > BOUNDS.maxX) {
          particle.position.x = BOUNDS.maxX
          particle.velocity.x *= -RESTITUTION
          particle.velocity.y *= FRICTION
          particle.velocity.z *= FRICTION
        }

        if (particle.position.y < BOUNDS.minY) {
          particle.position.y = BOUNDS.minY
          particle.velocity.y *= -RESTITUTION
          particle.velocity.x *= FRICTION
          particle.velocity.z *= FRICTION
        }
        if (particle.position.y > BOUNDS.maxY) {
          particle.position.y = BOUNDS.maxY
          particle.velocity.y *= -RESTITUTION
        }

        if (particle.position.z < BOUNDS.minZ) {
          particle.position.z = BOUNDS.minZ
          particle.velocity.z *= -RESTITUTION
          particle.velocity.y *= FRICTION
          particle.velocity.x *= FRICTION
        }
        if (particle.position.z > BOUNDS.maxZ) {
          particle.position.z = BOUNDS.maxZ
          particle.velocity.z *= -RESTITUTION
          particle.velocity.y *= FRICTION
          particle.velocity.x *= FRICTION
        }

        // Update instanced mesh
        dummy.position.copy(particle.position)
        dummy.updateMatrix()
        instancedMesh.setMatrixAt(i, dummy.matrix)

        // Color based on velocity (blue = slow, red = fast)
        const speed = particle.velocity.length()
        const normalizedSpeed = Math.min(speed * 0.05, 1.0)
        colorArray[i].setRGB(
          0.0 * (1 - normalizedSpeed) + 1.0 * normalizedSpeed,
          0.2 * (1 - normalizedSpeed) + 0.3 * normalizedSpeed,
          0.9 * (1 - normalizedSpeed) + 0.2 * normalizedSpeed
        )
        instancedMesh.setColorAt(i, colorArray[i])
      })

      if (instancedMesh) {
        instancedMesh.instanceMatrix.needsUpdate = true
        if (instancedMesh.instanceColor) {
          instancedMesh.instanceColor.needsUpdate = true
        }
      }
    }

    // Mouse move handler
    const handleMouseMove = (event) => {
      if (!isSimulating) return

      mouse3D.x = (event.clientX / window.innerWidth) * 2 - 1
      mouse3D.y = -(event.clientY / window.innerHeight) * 2 + 1

      raycaster.setFromCamera(mouse3D, camera)
      const intersects = raycaster.intersectObject(invisiblePlane)

      if (intersects.length > 0) {
        mouseWorldPos.copy(intersects[0].point)
        isMouseMoving = true
      }
    }

    const handleMouseLeave = () => {
      isMouseMoving = false
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)

    // Animation loop
    let lastTime = performance.now()
    let animationId

    const animate = () => {
      animationId = requestAnimationFrame(animate)

      const currentTime = performance.now()
      let deltaTime = Math.min((currentTime - lastTime) / 1000, 0.033)
      lastTime = currentTime

      if (isSimulating && particles.length > 0) {
        // Apply speed multiplier
        deltaTime *= speed

        // Run simulation multiple times per frame for smoother motion
        const substeps = 3
        for (let i = 0; i < substeps; i++) {
          updateParticles(deltaTime / substeps)
        }
      }

      // Rotate camera slowly
      const time = currentTime * 0.0001
      camera.position.x = Math.sin(time) * 30 + GRID_WIDTH / 2
      camera.position.z = Math.cos(time) * 30 + GRID_DEPTH / 2
      camera.lookAt(GRID_WIDTH / 2, GRID_HEIGHT / 3, GRID_DEPTH / 2)

      renderer.render(scene, camera)
    }

    animate()

    // Resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    window.addEventListener('resize', handleResize)

    // Expose simulation controls
    simulationRef.current = {
      start: (preset) => {
        createParticles(preset)
        setIsSimulating(true)
      },
      stop: () => {
        setIsSimulating(false)
      }
    }

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationId)

      if (instancedMesh) {
        scene.remove(instancedMesh)
        instancedMesh.geometry.dispose()
        instancedMesh.material.dispose()
      }

      particleGeometry.dispose()
      renderer.dispose()

      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement)
      }
    }
  }, [density, speed, flipness])

  // Presets
  const presets = [
    { name: 'Dam Break', boxes: [{ min: [0, 0, 0], max: [15, 20, 20] }] },
    {
      name: 'Block Drop',
      boxes: [
        { min: [0, 0, 0], max: [40, 7, 20] },
        { min: [12, 12, 5], max: [28, 20, 15] }
      ]
    },
    {
      name: 'Double Splash',
      boxes: [
        { min: [0, 0, 0], max: [10, 20, 15] },
        { min: [30, 0, 5], max: [40, 20, 20] }
      ]
    }
  ]

  const [currentPresetIndex, setCurrentPresetIndex] = useState(0)

  const handleStart = () => {
    if (!isSimulating) {
      simulationRef.current?.start()
    } else {
      simulationRef.current?.stop()
    }
  }

  const handlePreset = () => {
    const preset = presets[currentPresetIndex]
    simulationRef.current?.start(preset.boxes)
    setCurrentPresetIndex((currentPresetIndex + 1) % presets.length)
  }

  return (
    <div className="fixed inset-0 z-0">
      <div ref={containerRef} className="w-full h-full" />

      {/* UI Controls */}
      <div className="absolute top-8 left-8 pointer-events-none z-10">
        <button
          onClick={handleStart}
          className={`pointer-events-auto px-8 py-3 text-white font-bold rounded mb-4 transition-colors shadow-lg ${
            isSimulating
              ? 'bg-green-500 hover:bg-green-600 active:bg-green-700'
              : particleCount > 0
              ? 'bg-green-500 hover:bg-green-600 active:bg-green-700'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {isSimulating ? 'Edit' : 'Start'}
        </button>

        {!isSimulating && (
          <>
            <button
              onClick={handlePreset}
              className="pointer-events-auto block px-6 py-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold text-sm rounded mb-3 transition-colors shadow-lg"
            >
              Next: {presets[currentPresetIndex].name}
            </button>

            <div className="text-sm font-bold text-gray-700 mb-2 mt-4">Particle Density</div>
            <input
              type="range"
              min="0.3"
              max="1.5"
              step="0.1"
              value={density}
              onChange={(e) => setDensity(parseFloat(e.target.value))}
              className="pointer-events-auto w-52 mb-1"
            />
            <div className="text-xs text-gray-600 mb-3">{particleCount} particles</div>
          </>
        )}

        {isSimulating && (
          <>
            <div className="text-sm font-bold text-gray-700 mb-2 mt-2">Fluidity</div>
            <input
              type="range"
              min="0.5"
              max="0.99"
              step="0.01"
              value={flipness}
              onChange={(e) => setFlipness(parseFloat(e.target.value))}
              className="pointer-events-auto w-52 mb-4"
            />

            <div className="text-sm font-bold text-gray-700 mb-2">Speed</div>
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="pointer-events-auto w-52"
            />
          </>
        )}
      </div>

      {/* Instructions */}
      <div className="absolute bottom-8 left-8 text-xs leading-relaxed text-gray-600 pointer-events-none z-10">
        {!isSimulating ? (
          <>
            <span className="font-bold text-gray-800">Choose a preset</span> to create fluid volume <br />
            <span className="font-bold text-gray-800">Adjust density</span> to change particle count <br />
            <span className="font-bold text-gray-800">Click Start</span> to begin simulation
          </>
        ) : (
          <>
            <span className="font-bold text-gray-800">Move mouse</span> to push particles <br />
            <span className="font-bold text-gray-800">Fluidity</span> controls fluid smoothness <br />
            <span className="font-bold text-gray-800">Speed</span> controls simulation rate
          </>
        )}
      </div>

      {/* Footer */}
      <div className="absolute bottom-5 right-5 text-xs text-gray-500 pointer-events-none z-10">
        <a href="https://adbize.com" className="underline hover:text-gray-700 pointer-events-auto">Adbize</a> | Fluid Simulation
      </div>
    </div>
  )
}

export default FluidSimulator
