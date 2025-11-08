import { useEffect, useRef } from 'react'
import * as THREE from 'three'

function AbstractPastelBackground() {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Scene setup
    const scene = new THREE.Scene()

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.z = 30
    camera.position.y = 2

    // Renderer con sombras activadas
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    containerRef.current.appendChild(renderer.domElement)

    // Fondo color pastel sólido (rosa claro)
    scene.background = new THREE.Color(0xffd6e8)

    // Crear environment map para reflejos en bordes
    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256)
    const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget)
    scene.add(cubeCamera)

    // Iluminación con sombras para resaltar bordes líquidos
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambientLight)

    // Luz principal con sombras
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5)
    mainLight.position.set(10, 15, 10)
    mainLight.castShadow = true
    mainLight.shadow.mapSize.width = 2048
    mainLight.shadow.mapSize.height = 2048
    mainLight.shadow.camera.left = -70
    mainLight.shadow.camera.right = 70
    mainLight.shadow.camera.top = 70
    mainLight.shadow.camera.bottom = -70
    mainLight.shadow.camera.near = 0.1
    mainLight.shadow.camera.far = 50
    mainLight.shadow.bias = -0.001
    scene.add(mainLight)

    // Luces de relleno con sombras suaves para resaltar bordes
    const fillLight1 = new THREE.PointLight(0xffb3e0, 1.2, 50)
    fillLight1.position.set(-10, 10, 5)
    fillLight1.castShadow = true
    fillLight1.shadow.mapSize.width = 1024
    fillLight1.shadow.mapSize.height = 1024
    scene.add(fillLight1)

    const fillLight2 = new THREE.PointLight(0xb3d9ff, 1.0, 50)
    fillLight2.position.set(10, -5, 8)
    fillLight2.castShadow = true
    fillLight2.shadow.mapSize.width = 1024
    fillLight2.shadow.mapSize.height = 1024
    scene.add(fillLight2)

    // Luz de borde desde atrás para efecto líquido
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.8)
    rimLight.position.set(0, 0, -20)
    scene.add(rimLight)

    // Plano invisible para recibir sombras
    const planeGeometry = new THREE.PlaneGeometry(300, 300)
    const planeMaterial = new THREE.ShadowMaterial({
      opacity: 0.3
    })
    const plane = new THREE.Mesh(planeGeometry, planeMaterial)
    plane.rotation.x = -Math.PI / 2
    plane.position.y = -15
    plane.receiveShadow = true
    scene.add(plane)

    // Colores pastel vibrantes
    const colors = [
      0xffb3d9, // Rosa chicle
      0xb3e0ff, // Azul bebé
      0xc7b3ff, // Lila pastel
      0xffebb3, // Amarillo mantequilla
      0xb3ffe6, // Menta
      0xffd4b3, // Durazno
      0xffc4e8, // Rosa medio
      0xb3d9ff, // Celeste
      0xe6b3ff, // Lavanda
      0xfff4b3, // Limón pastel
      0xd9b3ff, // Violeta claro
      0xb3fff0  // Aqua pastel
    ]

    // Crear esferas con efecto líquido/gelatinoso
    const spheres = []
    const sphereCount = 80

    for (let i = 0; i < sphereCount; i++) {
      // Esferas grandes con alta resolución para bordes suaves
      const radius = 3 + Math.random() * 6
      const geometry = new THREE.SphereGeometry(radius, 128, 128)

      const colorValue = colors[i % colors.length]

      // Material físico con apariencia líquida/gelatinosa y bordes brillantes
      const material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(colorValue),
        emissive: new THREE.Color(colorValue),
        emissiveIntensity: 0.3,
        metalness: 0.1,
        roughness: 0.05,
        transmission: 0.4, // Mayor transparencia para efecto líquido en bordes
        thickness: radius * 1.2,
        clearcoat: 1.0,
        clearcoatRoughness: 0.0, // Bordes super brillantes
        ior: 1.5, // Mayor refracción en bordes
        reflectivity: 0.8,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        envMap: cubeRenderTarget.texture,
        envMapIntensity: 1.5
      })

      const mesh = new THREE.Mesh(geometry, material)

      // Posicionamiento expandido para cubrir todo el fondo
      mesh.position.set(
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 35 - 10
      )

      // Rotación inicial
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      )

      // Activar sombras
      mesh.castShadow = true
      mesh.receiveShadow = true

      scene.add(mesh)

      spheres.push({
        mesh: mesh,
        basePosition: mesh.position.clone(),
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.003,
          y: (Math.random() - 0.5) * 0.003,
          z: (Math.random() - 0.5) * 0.003
        },
        floatSpeed: 0.3 + Math.random() * 0.4,
        floatAmplitude: 0.4 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        deformSpeed: 0.5 + Math.random() * 0.5,
        deformAmount: 0.05 + Math.random() * 0.1
      })
    }

    // Mouse interaction
    const mouse = { x: 0, y: 0 }

    const handleMouseMove = (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    // Animation loop
    let animationId
    const clock = new THREE.Clock()

    const animate = () => {
      animationId = requestAnimationFrame(animate)
      const time = clock.getElapsedTime()

      // Animar esferas con deformación líquida
      spheres.forEach((sphere, index) => {
        // Rotación suave
        sphere.mesh.rotation.x += sphere.rotationSpeed.x
        sphere.mesh.rotation.y += sphere.rotationSpeed.y
        sphere.mesh.rotation.z += sphere.rotationSpeed.z

        // Flotación suave
        sphere.mesh.position.y = sphere.basePosition.y +
          Math.sin(time * sphere.floatSpeed + sphere.phase) * sphere.floatAmplitude

        // Movimiento horizontal sutil
        sphere.mesh.position.x = sphere.basePosition.x +
          Math.sin(time * 0.2 + index) * 0.2

        sphere.mesh.position.z = sphere.basePosition.z +
          Math.cos(time * 0.15 + index) * 0.15

        // Deformación líquida (escala pulsante)
        const deform = 1 + Math.sin(time * sphere.deformSpeed + sphere.phase) * sphere.deformAmount
        const deform2 = 1 + Math.cos(time * sphere.deformSpeed * 1.3 + sphere.phase) * sphere.deformAmount * 0.7
        sphere.mesh.scale.set(deform, deform2, deform)
      })

      // Mover cámara suavemente con mouse
      camera.position.x += (mouse.x * 3 - camera.position.x) * 0.02
      camera.position.y += (2 + mouse.y * 2 - camera.position.y) * 0.02

      // Rotación muy sutil de cámara
      camera.position.x += Math.sin(time * 0.08) * 0.02
      camera.position.y += Math.cos(time * 0.06) * 0.02

      camera.lookAt(0, 0, 0)

      // Animar luces para sombras dinámicas
      fillLight1.position.x = -10 + Math.sin(time * 0.3) * 3
      fillLight1.position.z = 5 + Math.cos(time * 0.3) * 3

      fillLight2.position.x = 10 + Math.sin(time * 0.25) * 2
      fillLight2.position.z = 8 + Math.cos(time * 0.25) * 2

      // Actualizar environment map cada 10 frames para reflejos en bordes
      if (Math.floor(time * 60) % 10 === 0) {
        cubeCamera.update(renderer, scene)
      }

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

      spheres.forEach(sphere => {
        sphere.mesh.geometry.dispose()
        sphere.mesh.material.dispose()
        scene.remove(sphere.mesh)
      })

      plane.geometry.dispose()
      plane.material.dispose()
      scene.remove(plane)

      cubeRenderTarget.dispose()
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
            textShadow: '0 8px 32px rgba(255, 179, 217, 0.6), 0 0 80px rgba(199, 179, 255, 0.5)',
            letterSpacing: '0.05em'
          }}
        >
          Adbize
        </h1>
        <p
          className="text-3xl text-white font-light tracking-wide"
          style={{
            textShadow: '0 4px 24px rgba(255, 179, 217, 0.5)'
          }}
        >
          Innovación Digital en Movimiento
        </p>
      </div>
    </div>
  )
}

export default AbstractPastelBackground
