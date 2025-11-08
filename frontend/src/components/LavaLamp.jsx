import { useEffect, useRef } from 'react';

// Metaball Point class
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.magnitude = x * x + y * y;
    this.computed = 0;
    this.force = 0;
  }

  add(p) {
    return new Point(this.x + p.x, this.y + p.y);
  }
}

// Ball class
class Ball {
  constructor(parent, speedMultiplier = 1) {
    const min = 0.2;
    const max = 0.5;

    this.vel = new Point(
      (Math.random() > 0.5 ? 1 : -1) * (0.15 + Math.random() * 0.3) * speedMultiplier,
      (Math.random() > 0.5 ? 1 : -1) * (0.15 + Math.random() * 0.3) * speedMultiplier
    );

    const centerX = parent.width / 2;
    const centerY = parent.height / 2;
    const radius = Math.min(parent.width, parent.height) / 1.8;
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * radius;

    this.pos = new Point(
      centerX + Math.cos(angle) * distance,
      centerY + Math.sin(angle) * distance
    );
    this.size = (parent.wh / 22) + (Math.random() * (max - min) + min) * (parent.wh / 22);
    this.width = parent.width;
    this.height = parent.height;
    this.speedMultiplier = speedMultiplier;
  }

  move() {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const maxRadius = Math.min(this.width, this.height) / 1.6;

    const dx = this.pos.x - centerX;
    const dy = this.pos.y - centerY;
    const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

    if (distanceFromCenter + this.size > maxRadius) {
      const angle = Math.atan2(dy, dx);
      this.vel.x = -Math.cos(angle) * Math.abs(this.vel.x);
      this.vel.y = -Math.sin(angle) * Math.abs(this.vel.y);

      const scale = (maxRadius - this.size) / distanceFromCenter;
      this.pos.x = centerX + dx * scale;
      this.pos.y = centerY + dy * scale;
    }

    this.pos = this.pos.add(this.vel);
  }
}

// MetaballRenderer class
class MetaballRenderer {
  constructor(canvas, numBalls, c0, c1, c2, speedMultiplier) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.step = 4;
    this.width = canvas.width;
    this.height = canvas.height;
    this.wh = Math.min(this.width, this.height);
    this.sx = Math.floor(this.width / this.step);
    this.sy = Math.floor(this.height / this.step);
    this.paint = false;
    this.gradientColors = [c0, c1, c2]; // Guardar colores originales
    this.metaFill = this.createRadialGradient(c0, c1, c2);
    this.plx = [0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    this.ply = [0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1];
    this.mscases = [0, 3, 0, 3, 1, 3, 0, 3, 2, 2, 0, 2, 1, 1, 0];
    this.ix = [1, 0, -1, 0, 0, 1, 0, -1, -1, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 1];
    this.grid = [];
    this.balls = [];
    this.iter = 0;
    this.sign = 1;

    for (let i = 0; i < (this.sx + 2) * (this.sy + 2); i++) {
      this.grid[i] = new Point(
        (i % (this.sx + 2)) * this.step,
        Math.floor(i / (this.sx + 2)) * this.step
      );
    }

    for (let k = 0; k < numBalls; k++) {
      this.balls[k] = new Ball(this, speedMultiplier);
    }
  }

  createRadialGradient(c0, c1, c2) {
    const gradient = this.ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, this.wh * 0.7
    );
    gradient.addColorStop(0, c0);
    gradient.addColorStop(0.3, c1);
    gradient.addColorStop(0.7, c2);
    gradient.addColorStop(1, this.darkenColor(c2, 0.3));
    return gradient;
  }

  darkenColor(color, factor) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    const newR = Math.floor(r * (1 - factor));
    const newG = Math.floor(g * (1 - factor));
    const newB = Math.floor(b * (1 - factor));

    return `rgb(${newR}, ${newG}, ${newB})`;
  }

  computeForce(x, y, idx) {
    let force;
    const id = idx || x + y * (this.sx + 2);

    // Verificar límites del grid
    if (!this.grid[id]) {
      return 0;
    }

    if (x === 0 || y === 0 || x === this.sx || y === this.sy) {
      force = 0.6 * this.sign;
    } else {
      force = 0;
      const cell = this.grid[id];
      let i = 0;
      let ball;
      while ((ball = this.balls[i++])) {
        force += ball.size * ball.size / (-2 * cell.x * ball.pos.x - 2 * cell.y * ball.pos.y + ball.pos.magnitude + cell.magnitude);
      }
      force *= this.sign * 0.85;
    }
    this.grid[id].force = force;
    return force;
  }

  marchingSquares(next) {
    const x = next[0];
    const y = next[1];
    const pdir = next[2];

    // Verificar límites
    if (x < 0 || x >= this.sx + 2 || y < 0 || y >= this.sy + 2) {
      return false;
    }

    const id = x + y * (this.sx + 2);

    if (!this.grid[id] || this.grid[id].computed === this.iter) {
      return false;
    }

    let dir, mscase = 0;

    for (let i = 0; i < 4; i++) {
      const nx = x + this.ix[i + 12];
      const ny = y + this.ix[i + 16];
      const idn = nx + ny * (this.sx + 2);

      // Verificar que el índice esté dentro de los límites
      if (!this.grid[idn]) {
        continue;
      }

      let force = this.grid[idn].force;
      if ((force > 0 && this.sign < 0) || (force < 0 && this.sign > 0) || !force) {
        force = this.computeForce(nx, ny, idn);
      }
      if (Math.abs(force) > 1) mscase += Math.pow(2, i);
    }

    if (mscase === 15) {
      return [x, y - 1, false];
    } else {
      if (mscase === 5) dir = (pdir === 2) ? 3 : 1;
      else if (mscase === 10) dir = (pdir === 3) ? 0 : 2;
      else {
        dir = this.mscases[mscase];
        this.grid[id].computed = this.iter;
      }

      const idx1 = (x + this.plx[4 * dir + 2]) + (y + this.ply[4 * dir + 2]) * (this.sx + 2);
      const idx2 = (x + this.plx[4 * dir + 3]) + (y + this.ply[4 * dir + 3]) * (this.sx + 2);
      const idx3 = (x + this.plx[4 * dir]) + (y + this.ply[4 * dir]) * (this.sx + 2);
      const idx4 = (x + this.plx[4 * dir + 1]) + (y + this.ply[4 * dir + 1]) * (this.sx + 2);

      // Verificar que todos los índices sean válidos
      if (!this.grid[idx1] || !this.grid[idx2] || !this.grid[idx3] || !this.grid[idx4]) {
        return false;
      }

      const ix = this.step / (
        Math.abs(Math.abs(this.grid[idx1].force) - 1) /
        Math.abs(Math.abs(this.grid[idx2].force) - 1) + 1
      );

      this.ctx.lineTo(
        this.grid[idx3].x + this.ix[dir] * ix,
        this.grid[idx4].y + this.ix[dir + 4] * ix
      );
      this.paint = true;

      return [
        x + this.ix[dir + 4],
        y + this.ix[dir + 8],
        dir
      ];
    }
  }

  renderMetaballs() {
    let i = 0;
    let ball;
    while ((ball = this.balls[i++])) ball.move();

    this.iter++;
    this.sign = -this.sign;
    this.paint = false;
    this.ctx.fillStyle = this.metaFill;
    this.ctx.beginPath();

    // Sombra externa más pronunciada
    this.ctx.shadowBlur = 30;
    this.ctx.shadowOffsetX = 5;
    this.ctx.shadowOffsetY = 5;
    this.ctx.shadowColor = "rgba(0, 0, 0, 0.4)";

    i = 0;
    while ((ball = this.balls[i++])) {
      const startX = Math.round(ball.pos.x / this.step);
      const startY = Math.round(ball.pos.y / this.step);

      // Verificar que la posición inicial esté dentro de los límites
      if (startX < 0 || startX >= this.sx + 2 || startY < 0 || startY >= this.sy + 2) {
        continue;
      }

      let next = [startX, startY, false];
      do {
        next = this.marchingSquares(next);
      } while (next);

      if (this.paint) {
        this.ctx.fill();

        // Sombra interna para efecto 3D
        this.ctx.shadowBlur = 15;
        this.ctx.shadowOffsetX = -2;
        this.ctx.shadowOffsetY = -2;
        this.ctx.shadowColor = "rgba(255, 255, 255, 0.3)";
        this.ctx.fill();

        this.ctx.closePath();
        this.ctx.beginPath();
        this.paint = false;

        // Restaurar sombra externa
        this.ctx.shadowBlur = 30;
        this.ctx.shadowOffsetX = 5;
        this.ctx.shadowOffsetY = 5;
        this.ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
      }
    }
  }

  resize() {
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.wh = Math.min(this.width, this.height);
    this.sx = Math.floor(this.width / this.step);
    this.sy = Math.floor(this.height / this.step);

    this.grid = [];
    for (let i = 0; i < (this.sx + 2) * (this.sy + 2); i++) {
      this.grid[i] = new Point(
        (i % (this.sx + 2)) * this.step,
        Math.floor(i / (this.sx + 2)) * this.step
      );
    }

    // Preserve original gradient colors
    this.metaFill = this.createRadialGradient(
      this.gradientColors[0],
      this.gradientColors[1],
      this.gradientColors[2]
    );

    this.balls.forEach(ball => {
      ball.width = this.width;
      ball.height = this.height;
    });
  }
}

function LavaLamp() {
  const canvasRefs = useRef([]);
  const lavaLampsRef = useRef([]);
  const animationRef = useRef(null);

  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    const container = canvasRefs.current[0]?.parentElement;
    if (!container) return;

    const width = container.offsetWidth;
    const height = container.offsetHeight;

    // Configure 10 layers with different colors and speeds
    const layers = [
      { numBalls: 8, colors: ["#00ffff", "#00ccff", "#66b3ff"], speed: 0.7 },
      { numBalls: 8, colors: ["#ff66ff", "#ff33cc", "#cc66ff"], speed: 1.5 },
      { numBalls: 8, colors: ["#66ff99", "#33ffaa", "#00ffcc"], speed: 1.0 },
      { numBalls: 8, colors: ["#ffff66", "#ffcc33", "#ffaa00"], speed: 0.5 },
      { numBalls: 8, colors: ["#6666ff", "#8855ff", "#aa66ff"], speed: 1.8 },
      { numBalls: 8, colors: ["#ff6666", "#ff5588", "#ff66aa"], speed: 0.8 },
      { numBalls: 8, colors: ["#40e0d0", "#20d4c4", "#5fe8d8"], speed: 1.3 },
      { numBalls: 8, colors: ["#e6b3ff", "#d699ff", "#cc80ff"], speed: 0.6 },
      { numBalls: 8, colors: ["#ffb380", "#ff9966", "#ff8c66"], speed: 1.4 },
      { numBalls: 8, colors: ["#98ff98", "#7fffd4", "#b0ffb0"], speed: 2.0 },
    ];

    // Initialize canvases and lava lamps
    canvasRefs.current.forEach((canvas, index) => {
      if (!canvas) return;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      const layer = layers[index];
      lavaLampsRef.current[index] = new MetaballRenderer(
        canvas,
        layer.numBalls,
        layer.colors[0],
        layer.colors[1],
        layer.colors[2],
        layer.speed
      );
    });

    // Animation loop
    const animate = () => {
      lavaLampsRef.current.forEach((lavaLamp, index) => {
        if (!lavaLamp) return;
        const canvas = canvasRefs.current[index];
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        lavaLamp.renderMetaballs();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      const newWidth = container.offsetWidth;
      const newHeight = container.offsetHeight;

      canvasRefs.current.forEach((canvas, index) => {
        if (!canvas) return;
        canvas.width = newWidth * dpr;
        canvas.height = newHeight * dpr;
        canvas.style.width = `${newWidth}px`;
        canvas.style.height = `${newHeight}px`;

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        if (lavaLampsRef.current[index]) {
          lavaLampsRef.current[index].resize();
        }
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #4a5cbd 0%, #5a3878 15%, #c870d6 30%, #3d8cd1 45%, #00bfd1 60%, #32b85f 75%, #d85479 90%, #d6b830 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 20s ease infinite',
      }}
    >
      <style>
        {`
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            20% { background-position: 80% 20%; }
            40% { background-position: 20% 80%; }
            60% { background-position: 100% 100%; }
            80% { background-position: 50% 0%; }
            100% { background-position: 0% 50%; }
          }
        `}
      </style>
      {[...Array(10)].map((_, index) => (
        <canvas
          key={index}
          ref={(el) => (canvasRefs.current[index] = el)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'block',
            mixBlendMode: 'lighter',
            opacity: 1.0,
            zIndex: index + 1,
          }}
        />
      ))}
    </div>
  );
}

export default LavaLamp;
