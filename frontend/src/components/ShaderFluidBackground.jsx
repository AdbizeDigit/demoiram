import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Global singleton to prevent multiple WebGL contexts
let globalRenderer = null;
let globalScene = null;
let globalCamera = null;
let globalGeometry = null;
let globalMaterial = null;
let globalUniforms = null;
let globalAnimationId = null;
let instanceCount = 0;

const vertexShader = `
  void main() {
    gl_Position = vec4( position, 1.0 );
  }
`;

const fragmentShader = `
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec2 u_mouse;
  uniform vec2 u_gyro;

  // Improved noise function for smoother results
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                        0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                        -0.577350269189626,  // -1.0 + 2.0 * C.x
                        0.024390243902439); // 1.0 / 41.0
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
      + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  // Fractal Brownian Motion for complex viscous patterns
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    // Optimized iterations for better performance
    for(int i = 0; i < 4; i++) {
      value += amplitude * snoise(p * frequency);
      frequency *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  // Azul/Cian Frío - #00BFFF, #ADD8E6, #40E0D0
  vec3 palette(float t) {
    vec3 a = vec3(0.2, 0.6, 0.8);   // Base hacia azul/cian
    vec3 b = vec3(0.4, 0.5, 0.6);   // Alta amplitud para colores vibrantes
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.5, 0.6, 0.7);

    return a + b * cos(6.28318 * (c * t + d));
  }

  // Naranja/Amarillo Cálido - #FFA500, #FFD700, #FF4500
  vec3 palette2(float t) {
    vec3 a = vec3(0.9, 0.6, 0.1);   // Base hacia naranja/amarillo
    vec3 b = vec3(0.5, 0.4, 0.2);   // Alta saturación
    vec3 c = vec3(1.0, 1.0, 0.5);
    vec3 d = vec3(0.0, 0.2, 0.5);

    return a + b * cos(6.28318 * (c * t + d));
  }

  // Morado/Magenta Vibrante - #8A2BE2, #FF00FF
  vec3 palette3(float t) {
    vec3 a = vec3(0.7, 0.2, 0.8);   // Base hacia morado/magenta
    vec3 b = vec3(0.5, 0.5, 0.5);   // Máxima vibración
    vec3 c = vec3(1.5, 0.5, 1.0);
    vec3 d = vec3(0.8, 0.0, 0.5);

    return a + b * cos(6.28318 * (c * t + d));
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
    vec2 mouse = (u_mouse.xy / u_resolution.xy) - 0.5;
    vec2 gyro = u_gyro;

    // Very slow time for viscous movement
    float time = u_time * 0.02;

    // Automatic gentle circular movement for viscous effect
    vec2 autoMove1 = vec2(sin(time * 0.5) * 0.3, cos(time * 0.6) * 0.3);
    vec2 autoMove2 = vec2(cos(time * 0.55) * 0.25, sin(time * 0.45) * 0.35);
    vec2 autoMove3 = vec2(sin(time * 0.48) * 0.4, cos(time * 0.52) * 0.2);

    // Create multiple layers of noise for viscous fluid motion - very slow
    vec2 p1 = uv * 2.0 + vec2(time * 0.08, time * 0.06) + autoMove1;
    vec2 p2 = uv * 1.5 - vec2(time * 0.1, -time * 0.07) + autoMove2;
    vec2 p3 = uv * 2.5 + vec2(-time * 0.06, time * 0.09) + autoMove3;

    // Enhanced mouse interaction influence (without glow)
    float mouseInfluence = length(mouse) * 0.8;
    float mouseDist = length(uv - mouse * 2.0);
    float mouseWave = sin(mouseDist * 5.0 - time * 2.0) * 0.1;

    p1 += mouse * mouseInfluence + mouseWave;
    p2 -= mouse * mouseInfluence * 0.7 - mouseWave * 0.5;
    p3 += mouse * mouseInfluence * 0.5 + mouseWave * 0.3;

    // Add gyroscope influence for mobile
    float gyroInfluence = length(gyro) * 0.5;
    p1 += gyro * gyroInfluence * 0.8;
    p2 -= gyro * gyroInfluence * 0.6;
    p3 += gyro * gyroInfluence * 0.4;

    // Generate multiple noise layers for viscous fluid effect
    float noise1 = fbm(p1);
    float noise2 = fbm(p2);
    float noise3 = fbm(p3);

    // Combine noises for complex patterns
    float combinedNoise = noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2;

    // Create distortion for liquid flow - very slow viscous movement
    vec2 distortion = vec2(
      fbm(uv * 3.0 + time * 0.05 + mouse * 0.5 + gyro * 0.3),
      fbm(uv * 3.0 - time * 0.06 + mouse * 0.3 - gyro * 0.2)
    );

    uv += distortion * 0.2;

    // Multiple color layers with very slow animation for viscous effect
    float colorValue1 = fbm(uv * 2.0 + time * 0.08 + distortion * 0.5 + mouse * 0.4);
    float colorValue2 = fbm(uv * 1.5 - time * 0.1 + distortion * 0.3 - mouse * 0.3 + gyro * 0.5);
    float colorValue3 = fbm(uv * 2.5 + time * 0.07 + distortion * 0.4 + gyro * 0.4);

    // Get colors from different palettes with slow viscous animation
    vec3 color1 = palette(colorValue1 + time * 0.1);
    vec3 color2 = palette2(colorValue2 + time * 0.08);
    vec3 color3 = palette3(colorValue3 + time * 0.12);

    // Blend colors for vibrant multicolor effect
    vec3 finalColor = color1 * 0.4 + color2 * 0.35 + color3 * 0.25;

    // Add depth with vignette
    float vignette = 1.0 - length(uv) * 0.2;
    finalColor *= vignette;

    // Vibrant look - boost saturation and brightness
    finalColor = pow(finalColor, vec3(0.85)); // Lower gamma for brighter colors
    finalColor *= 1.3; // Increase brightness

    // Boost saturation
    float luminance = dot(finalColor, vec3(0.299, 0.587, 0.114));
    finalColor = mix(vec3(luminance), finalColor, 1.4); // Increase saturation

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

function ShaderFluidBackground() {
  const containerRef = useRef(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mountedRef.current) return;

    mountedRef.current = true;
    instanceCount++;

    // Only initialize if this is the first instance
    if (instanceCount === 1 && !globalRenderer) {
      // Limit pixel ratio for better performance
      const PIXEL_RATIO = Math.min(window.devicePixelRatio || 1, 1.5);

      // Setup camera
      globalCamera = new THREE.Camera();
      globalCamera.position.z = 1;

      // Setup scene
      globalScene = new THREE.Scene();

      // Setup geometry
      globalGeometry = new THREE.PlaneGeometry(2, 2);

      // Setup uniforms
      globalUniforms = {
        u_time: { type: 'f', value: 50.0 },
        u_resolution: { type: 'v2', value: new THREE.Vector2() },
        u_mouse: { type: 'v2', value: new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2) },
        u_gyro: { type: 'v2', value: new THREE.Vector2(0.0, 0.0) },
      };

      // Setup material with shaders
      globalMaterial = new THREE.ShaderMaterial({
        uniforms: globalUniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
      });

      // Create mesh and add to scene
      const mesh = new THREE.Mesh(globalGeometry, globalMaterial);
      globalScene.add(mesh);

      // Setup renderer
      globalRenderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
      globalRenderer.setPixelRatio(PIXEL_RATIO);
      globalRenderer.setClearColor(0x000000, 0);

      // Add canvas to container and ensure it can receive events
      globalRenderer.domElement.style.display = 'block';
      globalRenderer.domElement.style.width = '100%';
      globalRenderer.domElement.style.height = '100%';
      globalRenderer.domElement.style.opacity = '1';
      globalRenderer.domElement.style.pointerEvents = 'auto';

      // Set initial size
      const handleResize = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;

        if (globalRenderer) {
          globalRenderer.setSize(width, height);
        }
        if (globalUniforms) {
          globalUniforms.u_resolution.value.x = width;
          globalUniforms.u_resolution.value.y = height;
        }
      };

      handleResize();

      // Mouse move handler - use window coordinates
      const handleMouseMove = (e) => {
        if (globalUniforms) {
          // Use client coordinates directly
          globalUniforms.u_mouse.value.x = e.clientX;
          globalUniforms.u_mouse.value.y = window.innerHeight - e.clientY; // Invert Y
        }
      };

      // Touch handlers
      const handleTouchMove = (e) => {
        if (e.touches.length > 0 && globalUniforms) {
          const touch = e.touches[0];

          globalUniforms.u_mouse.value.x = touch.clientX;
          globalUniforms.u_mouse.value.y = window.innerHeight - touch.clientY;
        }
      };

      // Gyroscope handlers for mobile
      const handleDeviceOrientation = (e) => {
        if (globalUniforms) {
          // Normalize gyroscope values to -1 to 1 range
          const beta = e.beta || 0; // -180 to 180 (front-back tilt)
          const gamma = e.gamma || 0; // -90 to 90 (left-right tilt)

          // Map to -1 to 1 range with increased sensitivity
          globalUniforms.u_gyro.value.x = (gamma / 45) * 2;
          globalUniforms.u_gyro.value.y = (beta / 90) * 2;
        }
      };

      // Request permission for iOS 13+
      const requestGyroPermission = () => {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
          DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
              if (permissionState === 'granted') {
                window.addEventListener('deviceorientation', handleDeviceOrientation);
              }
            })
            .catch(console.error);
        } else {
          // Non-iOS devices
          window.addEventListener('deviceorientation', handleDeviceOrientation);
        }
      };

      // Try to enable gyroscope
      requestGyroPermission();

      // Animation loop
      const animate = () => {
        globalAnimationId = requestAnimationFrame(animate);

        if (globalUniforms) {
          globalUniforms.u_time.value += 0.05;
        }

        if (globalRenderer && globalScene && globalCamera) {
          globalRenderer.render(globalScene, globalCamera);
        }
      };

      // Add event listeners to window to capture events even if elements are on top
      window.addEventListener('resize', handleResize);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
      window.addEventListener('touchstart', handleTouchMove, { passive: true });

      // Force initial render
      globalRenderer.render(globalScene, globalCamera);

      // Start animation
      animate();
    }

    // Attach renderer to container if it exists
    if (globalRenderer && containerRef.current && !containerRef.current.contains(globalRenderer.domElement)) {
      containerRef.current.appendChild(globalRenderer.domElement);
    }

    // Cleanup
    return () => {
      mountedRef.current = false;
      instanceCount--;

      // Only cleanup when last instance unmounts
      if (instanceCount === 0) {
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

        globalUniforms = null;
        globalCamera = null;
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
        pointerEvents: 'auto',
        touchAction: 'none',
      }}
    />
  );
}

export default ShaderFluidBackground;
