import { useState, useEffect, useRef } from 'react';
import './LavaLamp.css';

function LavaLamp() {
  const [blobs, setBlobs] = useState([]);
  const animationRef = useRef(null);
  const blobsRef = useRef([]);

  useEffect(() => {
    const colors = ['yellow', 'pink', 'green', 'orange', 'blue', 'purple', 'red'];
    const blobSize = 40; // tamaño en vw (más grandes para llenar espacio)
    const blobRadius = blobSize / 2;
    const numberOfBlobs = 15;
    const generatedBlobs = [];

    // Constantes físicas (sin gravedad, sin rebotes)
    const PRESSURE_FORCE = 0.15; // fuerza de presión entre globos (aumentada)
    const WALL_PRESSURE = 0.2; // presión contra paredes (aumentada)
    const DAMPING = 0.88; // amortiguamiento general
    const CONSTRAINT_ITERATIONS = 8; // iteraciones para resolver colisiones

    // Función para verificar si dos círculos se superponen
    const checkOverlap = (x1, y1, x2, y2, minDist) => {
      const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      return distance < minDist;
    };

    // Función para generar una posición válida
    const generatePosition = (attempts = 0) => {
      if (attempts > 100) return null;

      const x = Math.random() * (100 - blobSize) + blobRadius; // dentro del contenedor
      const y = Math.random() * (100 - blobSize) + blobRadius; // dentro del contenedor

      for (let blob of generatedBlobs) {
        if (checkOverlap(x, y, blob.x, blob.y, blobSize * 0.9)) {
          return generatePosition(attempts + 1);
        }
      }

      return { x, y };
    };

    // Generar blobs que llenan el espacio
    for (let i = 0; i < numberOfBlobs; i++) {
      const position = generatePosition();

      if (position) {
        generatedBlobs.push({
          id: i,
          color: colors[i % colors.length],
          x: position.x,
          y: position.y,
          vx: 0,
          vy: 0,
          mass: 1,
          pressurePoints: [], // puntos donde hay presión
          deformation: {
            borderRadius: '50% 50% 50% 50%',
            scaleX: 1,
            scaleY: 1,
          },
        });
      }
    }

    blobsRef.current = generatedBlobs;
    setBlobs(generatedBlobs);

    // Animación con sistema de presión (sin gravedad ni rebotes)
    let time = 0;

    const animate = () => {
      time += 0.016;

      const updatedBlobs = blobsRef.current.map((blob) => {
        return {
          ...blob,
          pressurePoints: [], // resetear puntos de presión cada frame
        };
      });

      // Límites del contenedor (ajustados para que no salgan del hero)
      const leftBound = 0;
      const rightBound = 100 - blobSize;
      const topBound = 0;
      const bottomBound = 100 - blobSize;

      // Resolver colisiones con múltiples iteraciones para GARANTIZAR que no se superpongan
      for (let iteration = 0; iteration < CONSTRAINT_ITERATIONS; iteration++) {
        for (let i = 0; i < updatedBlobs.length; i++) {
          for (let j = i + 1; j < updatedBlobs.length; j++) {
            const blob1 = updatedBlobs[i];
            const blob2 = updatedBlobs[j];

            const dx = blob2.x - blob1.x;
            const dy = blob2.y - blob1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDist = blobSize;

            // Si hay superposición, separar INMEDIATAMENTE
            if (distance < minDist && distance > 0.01) {
              // Vector normal de separación
              const nx = dx / distance;
              const ny = dy / distance;

              // Calcular cuánto se están superponiendo
              const overlap = minDist - distance;
              const pressureAmount = overlap / minDist;

              // Separación posicional (constraint satisfaction)
              // Mover cada globo la mitad de la distancia de superposición
              const separationDistance = overlap * 0.5;
              blob1.x -= nx * separationDistance;
              blob1.y -= ny * separationDistance;
              blob2.x += nx * separationDistance;
              blob2.y += ny * separationDistance;

              // Solo en la primera iteración, aplicar fuerza de velocidad y registrar presión
              if (iteration === 0) {
                // Empujar con velocidad
                const pushForce = overlap * PRESSURE_FORCE;
                blob1.vx -= nx * pushForce;
                blob1.vy -= ny * pushForce;
                blob2.vx += nx * pushForce;
                blob2.vy += ny * pushForce;

                // Registrar punto de presión para deformación
                const angle1 = Math.atan2(dy, dx);
                const angle2 = Math.atan2(-dy, -dx);

                blob1.pressurePoints.push({
                  angle: angle1,
                  intensity: pressureAmount,
                });

                blob2.pressurePoints.push({
                  angle: angle2,
                  intensity: pressureAmount,
                });
              }
            }
          }
        }
      }

      // Actualizar posiciones y aplicar presión de paredes
      updatedBlobs.forEach((blob) => {
        // Aplicar amortiguamiento
        blob.vx *= DAMPING;
        blob.vy *= DAMPING;

        // Actualizar posición
        blob.x += blob.vx;
        blob.y += blob.vy;
      });

      // Aplicar constraints de paredes con iteraciones (garantizar que NO salgan)
      for (let iteration = 0; iteration < CONSTRAINT_ITERATIONS; iteration++) {
        updatedBlobs.forEach((blob) => {
          let wallPressureLeft = 0;
          let wallPressureRight = 0;
          let wallPressureTop = 0;
          let wallPressureBottom = 0;

          // Pared izquierda - FORZAR dentro del límite
          if (blob.x < leftBound + blobRadius) {
            const penetration = (leftBound + blobRadius) - blob.x;
            blob.x = leftBound + blobRadius; // FORZAR posición
            if (iteration === 0) {
              blob.vx += penetration * WALL_PRESSURE;
              wallPressureLeft = Math.min(penetration / blobRadius, 1);
              blob.pressurePoints.push({ angle: Math.PI, intensity: wallPressureLeft });
            }
          }

          // Pared derecha - FORZAR dentro del límite
          if (blob.x > rightBound) {
            const penetration = blob.x - rightBound;
            blob.x = rightBound; // FORZAR posición
            if (iteration === 0) {
              blob.vx -= penetration * WALL_PRESSURE;
              wallPressureRight = Math.min(penetration / blobRadius, 1);
              blob.pressurePoints.push({ angle: 0, intensity: wallPressureRight });
            }
          }

          // Pared superior - FORZAR dentro del límite
          if (blob.y < topBound + blobRadius) {
            const penetration = (topBound + blobRadius) - blob.y;
            blob.y = topBound + blobRadius; // FORZAR posición
            if (iteration === 0) {
              blob.vy += penetration * WALL_PRESSURE;
              wallPressureTop = Math.min(penetration / blobRadius, 1);
              blob.pressurePoints.push({ angle: Math.PI * 1.5, intensity: wallPressureTop });
            }
          }

          // Pared inferior - FORZAR dentro del límite
          if (blob.y > bottomBound) {
            const penetration = blob.y - bottomBound;
            blob.y = bottomBound; // FORZAR posición
            if (iteration === 0) {
              blob.vy -= penetration * WALL_PRESSURE;
              wallPressureBottom = Math.min(penetration / blobRadius, 1);
              blob.pressurePoints.push({ angle: Math.PI * 0.5, intensity: wallPressureBottom });
            }
          }
        });
      }

      // Calcular deformación para cada globo basada en todos los puntos de presión
      updatedBlobs.forEach((blob) => {
        let totalPressureX = 0;
        let totalPressureY = 0;

        blob.pressurePoints.forEach((point) => {
          totalPressureX += Math.cos(point.angle) * point.intensity;
          totalPressureY += Math.sin(point.angle) * point.intensity;
        });

        // Crear deformación de border-radius basada en presión
        const deformStrength = 25; // intensidad de deformación
        const baseRadius = 50;

        // Calcular deformación para cada esquina del border-radius
        const topLeft = baseRadius - totalPressureX * deformStrength - totalPressureY * deformStrength;
        const topRight = baseRadius + totalPressureX * deformStrength - totalPressureY * deformStrength;
        const bottomRight = baseRadius + totalPressureX * deformStrength + totalPressureY * deformStrength;
        const bottomLeft = baseRadius - totalPressureX * deformStrength + totalPressureY * deformStrength;

        // Añadir ondulación suave constante
        const wave = Math.sin(time * 0.5 + blob.id) * 5;

        blob.deformation = {
          borderRadius: `${Math.max(20, Math.min(80, topLeft + wave))}% ${Math.max(20, Math.min(80, topRight - wave))}% ${Math.max(20, Math.min(80, bottomRight + wave))}% ${Math.max(20, Math.min(80, bottomLeft - wave))}% / ${Math.max(20, Math.min(80, topLeft - wave))}% ${Math.max(20, Math.min(80, topRight + wave))}% ${Math.max(20, Math.min(80, bottomRight - wave))}% ${Math.max(20, Math.min(80, bottomLeft + wave))}%`,
          scaleX: 1,
          scaleY: 1,
        };
      });

      blobsRef.current = updatedBlobs;
      setBlobs([...updatedBlobs]);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="background">
      {blobs.map((blob) => (
        <div
          key={blob.id}
          className={`blob ${blob.color}`}
          style={{
            top: `${blob.y}%`,
            left: `${blob.x}%`,
            borderRadius: blob.deformation.borderRadius,
            transition: 'border-radius 0.2s ease-out',
          }}
        ></div>
      ))}
    </div>
  );
}

export default LavaLamp;
