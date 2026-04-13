import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface LungVisualizerProps {
  aqi: number;
  pm25: number;
}

interface LungParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

const getLungColor = (aqi: number) => {
  if (aqi <= 50) return { fill: '#fecdd3', stroke: '#fb7185', glow: 'none' };
  if (aqi <= 100) return { fill: '#fed7aa', stroke: '#fb923c', glow: 'rgba(251,146,60,0.3)' };
  if (aqi <= 150) return { fill: '#fecaca', stroke: '#f87171', glow: 'rgba(248,113,113,0.4)' };
  return { fill: '#fca5a5', stroke: '#ef4444', glow: 'rgba(239,68,68,0.5)' };
};

const LungVisualizer = ({ aqi, pm25 }: LungVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<LungParticle[]>([]);
  const animFrameRef = useRef<number>(0);
  const colors = getLungColor(aqi);

  // Breathing animation speed varies with AQI
  const breatheDuration = aqi <= 50 ? 4 : aqi <= 100 ? 3.5 : 3;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 200;
    canvas.height = 240;

    // Particle count based on PM2.5
    const count = Math.min(40, Math.floor(pm25 * 1.5));
    particlesRef.current = Array.from({ length: count }, () => ({
      x: 60 + Math.random() * 80,
      y: 60 + Math.random() * 140,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 2.5 + 1,
      opacity: Math.random() * 0.6 + 0.2,
    }));

    const animate = () => {
      ctx.clearRect(0, 0, 200, 240);

      particlesRef.current.forEach((p) => {
        p.x += p.vx + (Math.random() - 0.5) * 0.3;
        p.y += p.vy + (Math.random() - 0.5) * 0.3;

        // Keep within lung area (rough bounds)
        if (p.x < 40 || p.x > 160) p.vx *= -1;
        if (p.y < 40 || p.y > 200) p.vy *= -1;
        p.x = Math.max(40, Math.min(160, p.x));
        p.y = Math.max(40, Math.min(200, p.y));

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100, 100, 100, ${p.opacity})`;
        ctx.fill();

        // Glow for bad air
        if (aqi > 100) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(239, 68, 68, ${p.opacity * 0.15})`;
          ctx.fill();
        }
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    if (count > 0) animate();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [aqi, pm25]);

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="relative flex justify-center">
        {/* SVG Lung */}
        <motion.svg
          viewBox="0 0 200 240"
          className="w-48 h-56"
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: breatheDuration, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Trachea */}
          <rect x="92" y="10" width="16" height="50" rx="8" fill={colors.fill} stroke={colors.stroke} strokeWidth="1.5" />

          {/* Left lung */}
          <path
            d="M92 55 Q92 55 75 70 Q40 100 35 140 Q30 180 55 200 Q75 215 90 200 Q100 185 100 160 L100 55 Z"
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth="1.5"
            style={{ filter: colors.glow !== 'none' ? `drop-shadow(0 0 8px ${colors.glow})` : 'none' }}
          />

          {/* Right lung */}
          <path
            d="M108 55 Q108 55 125 70 Q160 100 165 140 Q170 180 145 200 Q125 215 110 200 Q100 185 100 160 L100 55 Z"
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth="1.5"
            style={{ filter: colors.glow !== 'none' ? `drop-shadow(0 0 8px ${colors.glow})` : 'none' }}
          />

          {/* Bronchi lines */}
          <path d="M100 55 Q85 80 70 100" fill="none" stroke={colors.stroke} strokeWidth="1" opacity="0.5" />
          <path d="M100 55 Q115 80 130 100" fill="none" stroke={colors.stroke} strokeWidth="1" opacity="0.5" />
          <path d="M85 80 Q70 95 60 120" fill="none" stroke={colors.stroke} strokeWidth="1" opacity="0.3" />
          <path d="M115 80 Q130 95 140 120" fill="none" stroke={colors.stroke} strokeWidth="1" opacity="0.3" />
        </motion.svg>

        {/* Particle overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ width: '192px', height: '224px', margin: 'auto' }}
        />
      </div>
    </div>
  );
};

export default LungVisualizer;
