import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface MoleculeViewProps {
  pm25: number;
  pm10?: number;
  no2?: number;
  o3?: number;
  so2?: number;
}

interface Molecule {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  label: string;
  opacity: number;
}

const MOLECULE_TYPES = [
  { key: 'pm25', label: 'PM2.5', color: '#94a3b8', baseSize: 4, description: 'Fine particles' },
  { key: 'pm10', label: 'PM10', color: '#78716c', baseSize: 6, description: 'Coarse particles' },
  { key: 'no2', label: 'NO\u2082', color: '#b45309', baseSize: 3.5, description: 'Nitrogen dioxide' },
  { key: 'o3', label: 'O\u2083', color: '#0284c7', baseSize: 3, description: 'Ozone' },
  { key: 'so2', label: 'SO\u2082', color: '#ca8a04', baseSize: 3.5, description: 'Sulfur dioxide' },
];

const MoleculeView = ({ pm25, pm10 = 0, no2 = 0, o3 = 0, so2 = 0 }: MoleculeViewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const moleculesRef = useRef<Molecule[]>([]);
  const animRef = useRef<number>(0);

  const values: Record<string, number> = { pm25, pm10, no2, o3, so2 };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 400;
    const height = 220;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Create molecules proportional to concentration
    const molecules: Molecule[] = [];
    MOLECULE_TYPES.forEach((type) => {
      const val = values[type.key] || 0;
      // Scale: PM2.5 of 10 = ~8 molecules, gases are much less concentrated
      let count: number;
      if (type.key === 'pm25') count = Math.min(25, Math.max(2, Math.round(val * 0.8)));
      else if (type.key === 'pm10') count = Math.min(15, Math.max(1, Math.round(val * 0.4)));
      else count = Math.min(8, Math.max(1, Math.round(val * 50))); // gases in ppm, very small

      for (let i = 0; i < count; i++) {
        molecules.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          size: type.baseSize + Math.random() * 2,
          color: type.color,
          label: type.label,
          opacity: 0.4 + Math.random() * 0.4,
        });
      }
    });
    moleculesRef.current = molecules;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      moleculesRef.current.forEach((m) => {
        m.x += m.vx + (Math.random() - 0.5) * 0.15;
        m.y += m.vy + (Math.random() - 0.5) * 0.15;

        // Bounce off edges
        if (m.x < 0 || m.x > width) m.vx *= -1;
        if (m.y < 0 || m.y > height) m.vy *= -1;
        m.x = Math.max(0, Math.min(width, m.x));
        m.y = Math.max(0, Math.min(height, m.y));

        // Draw molecule
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
        ctx.fillStyle = m.color + Math.round(m.opacity * 255).toString(16).padStart(2, '0');
        ctx.fill();

        // Soft glow
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = m.color + '15';
        ctx.fill();
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, [pm25, pm10, no2, o3, so2]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-card rounded-xl p-5"
    >

      <div className="relative rounded-lg overflow-hidden bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '220px' }}
        />
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        {MOLECULE_TYPES.map((type) => {
          const val = values[type.key];
          if (!val && type.key !== 'pm25') return null;
          return (
            <div key={type.key} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: type.color }}
              />
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">{type.label}</div>
                <div className="text-[10px] text-muted-foreground">
                  {type.key.startsWith('pm') ? `${val.toFixed(1)} \u00b5g/m\u00b3` : `${val.toFixed(3)} ppm`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default MoleculeView;
