import { useRef, useEffect, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
}

interface ParticleCanvasProps {
  aqi?: number;
  className?: string;
}

const getAQIColor = (aqi: number): string => {
  if (aqi <= 50) return '74, 222, 128';    // green
  if (aqi <= 100) return '250, 204, 21';   // yellow
  if (aqi <= 150) return '251, 146, 60';   // orange
  if (aqi <= 200) return '248, 113, 113';  // red
  if (aqi <= 300) return '192, 132, 252';  // purple
  return '239, 68, 68';                     // dark red
};

const ParticleCanvas = ({ aqi = 30, className = '' }: ParticleCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);

  const initParticles = useCallback((width: number, height: number) => {
    // More particles for worse air quality
    const count = Math.min(80, 15 + Math.floor(aqi * 0.4));
    const color = getAQIColor(aqi);
    const particles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      // Speed increases with AQI
      const speedFactor = 0.3 + (aqi / 500) * 1.5;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * speedFactor,
        vy: (Math.random() - 0.5) * speedFactor - 0.15, // slight upward drift
        size: Math.random() * 3 + 1.5,
        opacity: Math.random() * 0.3 + 0.05,
        color,
      });
    }
    particlesRef.current = particles;
  }, [aqi]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      initParticles(rect.width, rect.height);
    };

    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      particlesRef.current.forEach((p) => {
        // Organic wobble
        p.vx += (Math.random() - 0.5) * 0.02;
        p.vy += (Math.random() - 0.5) * 0.02;

        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < -10) p.x = rect.width + 10;
        if (p.x > rect.width + 10) p.x = -10;
        if (p.y < -10) p.y = rect.height + 10;
        if (p.y > rect.height + 10) p.y = -10;

        // Draw particle with glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${p.opacity})`;
        ctx.fill();

        // Subtle glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${p.opacity * 0.2})`;
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [aqi, initParticles]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default ParticleCanvas;
