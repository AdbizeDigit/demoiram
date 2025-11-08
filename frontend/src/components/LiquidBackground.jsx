import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Global singleton to prevent multiple WebGL contexts
let globalRenderer = null;
let globalScene = null;
let globalCamera = null;
let globalGeometry = null;
let globalMaterial = null;
let globalMesh = null;
let globalAnimationId = null;
let globalHandleResize = null;
let globalHandleMouseMove = null;
let globalStartTime = null;
let instanceCount = 0;

// Vertex shader
const vertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader with smooth liquid effect
const fragmentShader = `
  uniform float u_time;
  uniform vec2 u_mouse;
  varying vec2 vUv;
  varying vec3 vPosition;

  // Simplex-like noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for(int i = 0; i < 3; i++) {
      value += amplitude * snoise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 uv = vUv;
    float time = u_time * 0.0001; // Very slow time

    // Mouse influence - smooth
    vec2 mouseInfluence = (u_mouse - 0.5) * 0.2;
    uv += mouseInfluence;

    // Multiple layers of liquid motion
    vec2 p = uv * 2.0;

    // Layer 1 - slow drift
    float n1 = fbm(p + vec2(time * 0.3, time * 0.2));

    // Layer 2 - opposite direction
    float n2 = fbm(p + vec2(-time * 0.2, time * 0.25) + vec2(5.2, 1.3));

    // Layer 3 - circular motion
    float angle = time * 0.15;
    vec2 offset = vec2(cos(angle), sin(angle)) * 0.5;
    float n3 = fbm(p + offset);

    // Vibrant color palette
    vec3 color1 = vec3(0.6, 0.1, 1.0);  // Purple
    vec3 color2 = vec3(1.0, 0.2, 0.6);  // Pink
    vec3 color3 = vec3(0.1, 0.6, 1.0);  // Cyan
    vec3 color4 = vec3(1.0, 0.6, 0.1);  // Orange
    vec3 color5 = vec3(0.2, 1.0, 0.8);  // Turquoise

    // Smooth color mixing
    float mix1 = smoothstep(0.3, 0.7, n1);
    float mix2 = smoothstep(0.3, 0.7, n2);
    float mix3 = smoothstep(0.3, 0.7, n3);

    vec3 mixedColor1 = mix(color1, color2, mix1);
    vec3 mixedColor2 = mix(color3, color4, mix2);
    vec3 mixedColor3 = mix(color5, mixedColor1, mix3);

    vec3 finalColor = mix(mixedColor2, mixedColor3, 0.5 + 0.5 * sin(time * 0.5));

    // Smooth brightness pulsing
    float brightness = 0.9 + 0.2 * sin(time * 0.3);
    finalColor *= brightness;

    // Slight saturation boost
    finalColor = pow(finalColor, vec3(0.9));

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

function LiquidBackground() {
  const containerRef = useRef(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mountedRef.current) return;

    mountedRef.current = true;
    instanceCount++;

    // Only initialize if this is the first instance
    if (instanceCount === 1 && !globalRenderer) {
      const PIXEL_RATIO = Math.min(window.devicePixelRatio || 1, 1.5);

      // Setup renderer
      globalRenderer = new THREE.WebGLRenderer({
        antialias: true, // Enable for sharp visuals
        alpha: true,
        powerPreference: 'high-performance'
      });
      globalRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Higher quality
      globalRenderer.setClearColor(0x000000, 0);

      // Setup scene
      globalScene = new THREE.Scene();

      // Setup camera
      globalCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000);
      globalCamera.position.set(0, 0, 1);

      // Setup geometry - higher quality
      globalGeometry = new THREE.SphereGeometry(10, 64, 64);

      // Setup material with custom shader
      globalMaterial = new THREE.ShaderMaterial({
        uniforms: {
          u_time: { value: 0 },
          u_mouse: { value: new THREE.Vector2(0.5, 0.5) }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        side: THREE.BackSide
      });

      // Create mesh
      globalMesh = new THREE.Mesh(globalGeometry, globalMaterial);
      globalMesh.rotation.x = Math.PI / 4;
      globalScene.add(globalMesh);

      // Resize handler
      globalHandleResize = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;

        if (globalRenderer) {
          globalRenderer.setSize(width, height);
        }
        if (globalCamera) {
          globalCamera.aspect = width / height;
          globalCamera.updateProjectionMatrix();
        }
      };

      globalHandleResize();
      window.addEventListener('resize', globalHandleResize);

      // Mouse move handler
      globalHandleMouseMove = (e) => {
        if (globalMaterial && globalMaterial.uniforms && globalMaterial.uniforms.u_mouse) {
          const x = e.clientX / window.innerWidth;
          const y = 1.0 - (e.clientY / window.innerHeight); // Invert Y
          globalMaterial.uniforms.u_mouse.value.set(x, y);
        }
      };

      window.addEventListener('mousemove', globalHandleMouseMove);

      // Animation loop with real timestamp for perfect fluidity
      const animate = (timestamp) => {
        globalAnimationId = requestAnimationFrame(animate);

        // Use real timestamp for perfect frame timing
        if (!globalStartTime) globalStartTime = timestamp;
        const elapsed = timestamp - globalStartTime;

        if (globalMaterial && globalMaterial.uniforms && globalMaterial.uniforms.u_time) {
          globalMaterial.uniforms.u_time.value = elapsed;
        }

        if (globalMesh) {
          globalMesh.rotation.y = elapsed * 0.00005; // Smooth continuous rotation
        }

        if (globalRenderer && globalScene && globalCamera) {
          globalRenderer.render(globalScene, globalCamera);
        }
      };

      // Start animation
      requestAnimationFrame(animate);
    }

    // Attach renderer to container if it exists
    if (globalRenderer && containerRef.current && !containerRef.current.contains(globalRenderer.domElement)) {
      globalRenderer.domElement.style.width = '100%';
      globalRenderer.domElement.style.height = '100%';
      globalRenderer.domElement.style.display = 'block';
      containerRef.current.appendChild(globalRenderer.domElement);
    }

    // Cleanup
    return () => {
      mountedRef.current = false;
      instanceCount--;

      // Only cleanup when last instance unmounts
      if (instanceCount === 0) {
        if (globalHandleResize) {
          window.removeEventListener('resize', globalHandleResize);
          globalHandleResize = null;
        }

        if (globalHandleMouseMove) {
          window.removeEventListener('mousemove', globalHandleMouseMove);
          globalHandleMouseMove = null;
        }

        if (globalAnimationId) {
          cancelAnimationFrame(globalAnimationId);
          globalAnimationId = null;
        }

        if (globalGeometry) {
          globalGeometry.dispose();
          globalGeometry = null;
        }

        if (globalMaterial) {
          globalMaterial.dispose();
          globalMaterial = null;
        }

        if (globalScene) {
          globalScene.clear();
          globalScene = null;
        }

        if (globalRenderer) {
          if (globalRenderer.domElement && globalRenderer.domElement.parentNode) {
            globalRenderer.domElement.parentNode.removeChild(globalRenderer.domElement);
          }
          globalRenderer.dispose();
          globalRenderer = null;
        }

        globalMesh = null;
        globalCamera = null;
        globalTime = 0;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        pointerEvents: 'none',
      }}
    />
  );
}

export default LiquidBackground;
