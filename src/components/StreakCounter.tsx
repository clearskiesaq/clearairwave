import { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import axios from 'axios';
import { API } from '@/config/api';
import { Flame } from 'lucide-react';

const StreakCounter = () => {
  const [streak, setStreak] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const [displayCount, setDisplayCount] = useState(0);

  useEffect(() => {
    const fetchStreak = async () => {
      try {
        const res = await axios.get(API.streak);
        setStreak(res.data.days);
        setIsActive(res.data.active);
      } catch {
        // Fallback: just show 0
        setStreak(0);
        setIsActive(false);
      }
    };
    fetchStreak();
  }, []);

  useEffect(() => {
    if (!isInView || streak === 0) return;
    let start: number;
    let frame: number;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / 1200, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayCount(Math.round(eased * streak));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [isInView, streak]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="glass-card rounded-2xl p-6 text-center"
    >
      <div className="flex items-center justify-center gap-2 mb-2">
        <Flame className="h-6 w-6 text-orange-500" />
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Clean Air Streak</span>
        <Flame className="h-6 w-6 text-orange-500" />
      </div>
      <div className="text-6xl font-bold bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
        {displayCount}
      </div>
      <p className="text-sm text-muted-foreground mt-2">
        consecutive days of Good air quality
      </p>
      {streak >= 7 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium"
        >
          {streak >= 30 ? '🏆 Incredible streak!' : streak >= 14 ? '🌟 Amazing streak!' : '✨ Great streak!'}
        </motion.div>
      )}
    </motion.div>
  );
};

export default StreakCounter;
