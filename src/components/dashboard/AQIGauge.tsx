import { useEffect, useState, useRef } from 'react';
import { useInView } from 'framer-motion';

interface AQIGaugeProps {
  aqi: number;
  category: string;
  color: string;
  size?: number;
}

const AQIGauge = ({ aqi, category, color, size = 180 }: AQIGaugeProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const [animatedValue, setAnimatedValue] = useState(0);

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75; // 270 degrees
  const maxAqi = 300; // visual max
  const normalizedAqi = Math.min(aqi, maxAqi);
  const offset = arcLength - (arcLength * animatedValue) / maxAqi;

  useEffect(() => {
    if (!isInView) return;
    let start: number;
    let frame: number;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / 1800, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setAnimatedValue(eased * normalizedAqi);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [isInView, normalizedAqi]);

  return (
    <div ref={ref} className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 180 180" className="w-full h-full -rotate-[135deg]">
          {/* Background track */}
          <circle
            cx="90" cy="90" r={radius}
            fill="none"
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-700"
            strokeWidth="14"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Colored arc */}
          <circle
            cx="90" cy="90" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 10px ${color}80)`,
              transition: 'stroke-dashoffset 0.05s linear',
            }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color }}>
            {Math.round(animatedValue)}
          </span>
          <span className="text-xs font-medium text-muted-foreground">AQI</span>
        </div>
      </div>
      <div
        className="mt-2 px-3 py-1 rounded-full text-sm font-medium"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {category}
      </div>
    </div>
  );
};

export default AQIGauge;
