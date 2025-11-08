import { useEffect, useRef } from 'react';

// Resolution of simulation
const NUM_POINTS = 70;
// Spring constant for forces applied by adjacent points (lower = more viscous)
const SPRING_CONSTANT = 0.04;
// Sprint constant for force applied to baseline (lower = slower return)
const SPRING_CONSTANT_BASELINE = 0.001;
// Damping to apply to speed changes (higher = more viscous, slower movement)
const DAMPING = 0.96;
// Mass of each point (higher = more inertia, slower movement)
const POINT_MASS = 2.5;
// Number of points to affect when interacting
const INTERACTIVE_SPREAD = Math.ceil(NUM_POINTS / 3);
// Mouse Interactive Power (lower = gentler interaction)
const MOUSE_POW = 0.002;

class Point {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
    this.vy = 0;
    this.vx = 0;
    this.mass = POINT_MASS;
  }

  get position() {
    return {
      x: this.x,
      y: this.y,
    };
  }

  moveTo(...args) {
    this.x = args[0];
    this.y = args[1];
  }
}

class Wave {
  constructor(points, p1, p2) {
    this.p1 = p1;
    this.p2 = p2;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    const vx = dx / (points - 1);
    const vy = dy / (points - 1);

    this.points = new Array(points)
      .fill(null)
      .map((p, i) => new Point(p1.x + vx * i, p1.y + vy * i));
  }
}

class FluidCanvas {
  constructor(canvas) {
    this.canvas = canvas;
    this.dpr = window.devicePixelRatio || 1;

    this.ctx = this.canvas.getContext('2d');
    this.ctx.scale(this.dpr, this.dpr);

    this.mouse = {
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
      mousedown: false,
      power: 15,
    };

    this.waves = [];
    this.tick = 0;

    this.setCanvasSize = this.setCanvasSize.bind(this);
    this.handleMousedown = this.handleMousedown.bind(this);
    this.handleMouseup = this.handleMouseup.bind(this);
    this.handleMouse = this.handleMouse.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.render = this.render.bind(this);

    this.setCanvasSize();
    this.setupListeners();
    this.constructWaves();

    // Initial gentle wave triggers for demo
    setTimeout(() => {
      // Trigger a few gentle waves to start the motion
      for (let i = 0; i < this.waves.length; i++) {
        // Only 1-2 gentle trigger points per wave
        const numPoints = 1 + Math.floor(Math.random() * 2);
        for (let j = 0; j < numPoints; j++) {
          const x = Math.random() * this.canvas.width;
          const y = this.canvas.height * (0.3 + Math.random() * 0.4);
          this.triggerWave(i, x, y);
        }
      }
    }, 200);

    this.animationId = null;
    this.render();
  }

  constructWaves() {
    this.waves = [];

    // Create multiple wave layers with vibrant multicolor gradients
    const waveConfigs = [
      {
        yPercent: 0.2,
        color: ['rgba(255, 107, 107, 0.5)', 'rgba(255, 168, 1, 0.6)', 'rgba(255, 214, 10, 0.7)'],
        speed: 0.15
      }, // Red to Orange to Yellow
      {
        yPercent: 0.32,
        color: ['rgba(72, 219, 251, 0.5)', 'rgba(88, 177, 249, 0.6)', 'rgba(118, 75, 162, 0.7)'],
        speed: -0.12
      }, // Cyan to Blue to Purple
      {
        yPercent: 0.44,
        color: ['rgba(253, 121, 168, 0.5)', 'rgba(243, 104, 224, 0.6)', 'rgba(169, 92, 232, 0.7)'],
        speed: 0.18
      }, // Pink to Magenta to Purple
      {
        yPercent: 0.56,
        color: ['rgba(46, 213, 115, 0.5)', 'rgba(0, 210, 211, 0.6)', 'rgba(52, 172, 224, 0.7)'],
        speed: -0.14
      }, // Green to Teal to Blue
      {
        yPercent: 0.68,
        color: ['rgba(255, 159, 243, 0.5)', 'rgba(189, 147, 249, 0.6)', 'rgba(116, 185, 255, 0.7)'],
        speed: 0.16
      }, // Light Pink to Lavender to Sky Blue
      {
        yPercent: 0.8,
        color: ['rgba(250, 177, 160, 0.5)', 'rgba(255, 123, 172, 0.6)', 'rgba(206, 93, 174, 0.7)'],
        speed: -0.13
      }, // Coral to Rose to Berry
      {
        yPercent: 0.92,
        color: ['rgba(162, 155, 254, 0.5)', 'rgba(105, 240, 174, 0.6)', 'rgba(57, 255, 218, 0.7)'],
        speed: 0.11
      }, // Periwinkle to Mint to Aqua
    ];

    waveConfigs.forEach((config, index) => {
      const y = this.canvas.height * config.yPercent;
      const p1 = new Point(0, y);
      const p2 = new Point(this.canvas.width, y);
      const wave = new Wave(NUM_POINTS, p1, p2);
      wave.color = config.color;
      wave.baselineY = y;
      wave.speed = config.speed;
      wave.horizontalOffset = 0;
      this.waves.push(wave);
    });
  }

  setupListeners() {
    window.addEventListener('resize', this.setCanvasSize);
    this.canvas.addEventListener('mousedown', this.handleMousedown);
    this.canvas.addEventListener('mouseup', this.handleMouseup);
    this.canvas.addEventListener('mousemove', this.handleMouse);
    this.canvas.addEventListener('touchstart', this.handleTouchStart);
    this.canvas.addEventListener('touchend', this.handleTouchEnd);
    this.canvas.addEventListener('touchmove', this.handleTouchMove);
  }

  removeListeners() {
    window.removeEventListener('resize', this.setCanvasSize);
    this.canvas.removeEventListener('mousedown', this.handleMousedown);
    this.canvas.removeEventListener('mouseup', this.handleMouseup);
    this.canvas.removeEventListener('mousemove', this.handleMouse);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
  }

  handleTouchStart(event) {
    event.preventDefault();
    this.mouse.mousedown = true;
    const touch = event.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = (touch.clientX - rect.left) * this.dpr;
    this.mouse.y = (touch.clientY - rect.top) * this.dpr;
  }

  handleTouchEnd(event) {
    event.preventDefault();
    this.mouse.mousedown = false;
  }

  handleTouchMove(event) {
    event.preventDefault();
    const touch = event.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = (touch.clientX - rect.left) * this.dpr;
    this.mouse.y = (touch.clientY - rect.top) * this.dpr;
  }

  handleMousedown(event) {
    this.mouse.mousedown = true;
  }

  handleMouseup(event) {
    this.mouse.mousedown = false;
  }

  handleMouse(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * this.dpr;
    const y = (event.clientY - rect.top) * this.dpr;
    this.mouse.x = x;
    this.mouse.y = y;
  }

  updateWavePower() {
    const max = 10;
    const mouse = this.mouse;

    if (mouse.mousedown && mouse.power > max) {
      mouse.power = max;
    } else if (mouse.mousedown) {
      mouse.power += 0.1;
    } else {
      mouse.power = 1;
    }
  }

  triggerWave(waveIndex, x, y) {
    if (!this.waves[waveIndex]) return;

    let closestPoint = {};
    let closestDistance = -1;

    const points = this.waves[waveIndex].points;
    let idx = 0;

    for (var n = 0; n < points.length; n++) {
      const p = points[n];
      const distance = Math.abs(x - p.x);

      if (closestDistance === -1) {
        closestPoint = p;
        closestDistance = distance;
        idx = n;
      } else if (distance <= closestDistance) {
        closestPoint = p;
        closestDistance = distance;
        idx = n;
      }
    }

    const baselineY = this.waves[waveIndex].baselineY;
    const dy = y - baselineY;

    const spread = INTERACTIVE_SPREAD;
    const mod = (idx - spread) % points.length;
    const start = mod < 0 ? points.length + mod : mod;
    const length = spread * 2 + 1;

    let rad = 0;
    const radInc = Math.PI / length;

    for (let n = 0; n < length; n++) {
      const i = (start + n) % points.length;
      const point = points[i];
      const pow = Math.sin(rad) * dy * MOUSE_POW * this.mouse.power;
      point.vy += pow;
      rad += radInc;
    }
  }

  setCanvasSize() {
    this.canvas.width = this.canvas.offsetWidth * this.dpr;
    this.canvas.height = this.canvas.offsetHeight * this.dpr;
    this.canvas.style.width = this.canvas.offsetWidth + 'px';
    this.canvas.style.height = this.canvas.offsetHeight + 'px';

    this.constructWaves();
  }

  drawBackground() {
    const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  updateWaveHorizontalMovement(wave) {
    // Add horizontal wave motion for viscous effect - MUCH SLOWER
    wave.horizontalOffset += wave.speed * 0.003;

    wave.points.forEach((point, index) => {
      const angleOffset = (index / wave.points.length) * Math.PI * 2;

      // Very slow, gentle sine waves for viscous movement
      const horizontalWave = Math.sin(this.tick * 0.003 + angleOffset + wave.horizontalOffset) * 1.5;
      const verticalWave = Math.cos(this.tick * 0.004 + angleOffset + wave.horizontalOffset) * 1.2;

      // Secondary slower wave for complex viscous motion
      const secondaryWave = Math.sin(this.tick * 0.002 + angleOffset * 2) * 0.8;

      // Apply very gentle continuous motion
      point.vy += (verticalWave + secondaryWave) * 0.0008;
    });
  }

  drawWave(wave) {
    this.ctx.lineCap = 'round';
    this.ctx.lineWidth = 2 * this.dpr;

    // Increased blur for stronger viscous effect
    this.ctx.filter = 'blur(8px)';

    const highestPoint = Math.min.apply(Math, wave.points.map(o => o.y));

    const gradient = this.ctx.createLinearGradient(0, highestPoint, 0, this.canvas.height);
    gradient.addColorStop(0, wave.color[0]);
    gradient.addColorStop(0.5, wave.color[1]);
    gradient.addColorStop(1, wave.color[2]);
    this.ctx.fillStyle = gradient;

    // Set blend mode for better color mixing - lighter creates more vibrant blends
    this.ctx.globalCompositeOperation = 'lighter';

    this.ctx.beginPath();
    this.ctx.moveTo(wave.points[0].x, wave.points[0].y);

    // Smoother curves with more control points
    for (let n = 0; n < wave.points.length - 1; n++) {
      const p1 = wave.points[n];
      const p2 = wave.points[n + 1];

      const cpx = (p1.x + p2.x) / 2;
      const cpy = (p1.y + p2.y) / 2;

      if (n === wave.points.length - 2) {
        this.ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
      } else {
        this.ctx.quadraticCurveTo(p1.x, p1.y, cpx, cpy);
      }
    }

    this.ctx.lineTo(this.canvas.width, this.canvas.height);
    this.ctx.lineTo(0, this.canvas.height);
    this.ctx.closePath();
    this.ctx.fill();

    // Reset filters and blend mode
    this.ctx.filter = 'none';
    this.ctx.globalCompositeOperation = 'source-over';
  }

  updateWave(wave) {
    const points = wave.points;

    for (var n = 0; n < points.length; n++) {
      const p = points[n];

      let force = 0;
      let forceFromLeft;
      let forceFromRight;

      if (n === 0) {
        let dy = points[points.length - 1].y - p.y;
        forceFromLeft = SPRING_CONSTANT * dy;
      } else {
        let dy = points[n - 1].y - p.y;
        forceFromLeft = SPRING_CONSTANT * dy;
      }

      if (n === points.length - 1) {
        let dy = points[0].y - p.y;
        forceFromRight = SPRING_CONSTANT * dy;
      } else {
        let dy = points[n + 1].y - p.y;
        forceFromRight = SPRING_CONSTANT * dy;
      }

      let dy = wave.baselineY - p.y;
      const forceToBaseline = SPRING_CONSTANT_BASELINE * dy;

      force = force + forceFromLeft;
      force = force + forceFromRight;
      force = force + forceToBaseline;

      const acceleration = force / p.mass;

      p.vy = DAMPING * p.vy + acceleration;
      p.y = p.y + p.vy;
    }
  }

  render() {
    this.drawBackground();

    // Draw waves from back to front
    this.waves.forEach(wave => {
      this.drawWave(wave);
    });

    // Trigger waves on mousedown
    if (this.mouse.mousedown) {
      const { x, y } = this.mouse;
      // Trigger all waves with mouse interaction
      this.waves.forEach((wave, index) => {
        this.triggerWave(index, x, y);
      });
    }

    // Slow, gentle ambient wave motion for viscous effect
    // Trigger waves every 90 frames (about 1.5 seconds) - MUCH SLOWER
    if (this.tick % 90 === 0) {
      // Trigger 1-2 gentle random waves
      const numTriggers = 1 + Math.floor(Math.random() * 2);

      for (let i = 0; i < numTriggers; i++) {
        const randomWave = Math.floor(Math.random() * this.waves.length);
        const randomX = Math.random() * this.canvas.width;
        const randomY = this.canvas.height * (0.3 + Math.random() * 0.4);
        this.triggerWave(randomWave, randomX, randomY);
      }
    }

    // Gentle wave triggers - creates slow viscous mixing effect
    if (this.tick % 150 === 45) {
      const wave1 = Math.floor(Math.random() * this.waves.length);
      const wave2 = (wave1 + 2) % this.waves.length;

      const x1 = this.canvas.width * (0.2 + Math.random() * 0.2);
      const x2 = this.canvas.width * (0.6 + Math.random() * 0.2);
      const y = this.canvas.height * (0.4 + Math.random() * 0.2);

      this.triggerWave(wave1, x1, y);
      this.triggerWave(wave2, x2, y);
    }

    // Subtle cross-wave interaction for slow mixing
    if (this.tick % 200 === 0) {
      // Only trigger a couple waves, not all
      const numWaves = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < numWaves; i++) {
        const waveIndex = Math.floor(Math.random() * this.waves.length);
        const wave = this.waves[waveIndex];
        const x = Math.random() * this.canvas.width;
        const y = wave.baselineY * (0.95 + Math.random() * 0.1);
        this.triggerWave(waveIndex, x, y);
      }
    }

    this.updateWavePower();

    // Update all waves with physics and horizontal movement
    this.waves.forEach(wave => {
      this.updateWave(wave);
      this.updateWaveHorizontalMovement(wave);
    });

    this.tick++;

    this.animationId = window.requestAnimationFrame(this.render);
  }

  destroy() {
    if (this.animationId) {
      window.cancelAnimationFrame(this.animationId);
    }
    this.removeListeners();
  }
}

function FluidHeroBackground() {
  const canvasRef = useRef(null);
  const fluidCanvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current) {
      fluidCanvasRef.current = new FluidCanvas(canvasRef.current);
    }

    return () => {
      if (fluidCanvasRef.current) {
        fluidCanvasRef.current.destroy();
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
      }}
    />
  );
}

export default FluidHeroBackground;
