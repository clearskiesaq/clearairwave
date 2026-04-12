import { useEffect, useState, useRef } from 'react';
import { useInView } from 'framer-motion';

interface BreathabilityGaugeProps {
  score: number;
  label: string;
  description: string;
}

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#4ade80';
  if (score >= 60) return '#facc15';
  if (score >= 40) return '#fb923c';
  if (score >= 20) return '#f87171';
  return '#ef4444';
};

const BreathabilityGauge = ({ score, label, description }: BreathabilityGaugeProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const [animatedScore, setAnimatedScore] = useState(0);

  const color = getScoreColor(score);
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75; // 270 degrees
  const offset = arcLength - (arcLength * animatedScore) / 100;

  useEffect(() => {
    if (!isInView) return;
    let start: number;
    let frame: number;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / 1500, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(eased * score);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [isInView, score]);

  return (
    <div ref={ref} className="flex flex-col items-center">
      <div className="relative w-52 h-52">
        <svg viewBox="0 0 200 200" className="w-full h-full -rotate-[135deg]">
          {/* Background arc */}
          <circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-700"
            strokeWidth="12"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Animated score arc */}
          <circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 8px ${color}60)`,
              transition: 'stroke-dashoffset 0.1s ease-out',
            }}
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold" style={{ color }}>
            {Math.round(animatedScore)}
          </span>
          <span className="text-sm font-medium text-muted-foreground mt-1">{label}</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground text-center mt-2 max-w-[200px]">{description}</p>
    </div>
  );
};

export default BreathabilityGauge;
