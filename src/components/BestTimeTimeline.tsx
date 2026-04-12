import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { API } from '@/config/api';
import { Clock, Sun } from 'lucide-react';

interface HourData {
  hour: number;
  label: string;
  pm25: number;
  color: string;
  quality: string;
}

const getHourColor = (pm25: number): { color: string; quality: string } => {
  if (pm25 <= 12) return { color: '#4ade80', quality: 'Great' };
  if (pm25 <= 35.4) return { color: '#facc15', quality: 'OK' };
  if (pm25 <= 55.4) return { color: '#fb923c', quality: 'Caution' };
  return { color: '#f87171', quality: 'Avoid' };
};

const BestTimeTimeline = () => {
  const [hours, setHours] = useState<HourData[]>([]);
  const [bestHour, setBestHour] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHourly = async () => {
      try {
        const res = await axios.get(API.hourly);
        const data = res.data;

        if (!data || data.length === 0) {
          setLoading(false);
          return;
        }

        const hourData: HourData[] = data.map((entry: any) => {
          const time = new Date(entry.time + 'Z');
          const hour = time.getHours();
          const pm25 = entry['pm2.5'] ?? entry.pm25 ?? 0;
          const { color, quality } = getHourColor(pm25);
          return {
            hour,
            label: time.toLocaleTimeString([], { hour: 'numeric', hour12: true }),
            pm25,
            color,
            quality,
          };
        });

        setHours(hourData);

        // Find best hour
        const best = hourData.reduce((min, h) => h.pm25 < min.pm25 ? h : min, hourData[0]);
        setBestHour(best.label);
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    };
    fetchHourly();
  }, []);

  if (loading || hours.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Best Time to Go Outside</h3>
        </div>
        {bestHour && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium">
            <Sun className="h-4 w-4" />
            Best: {bestHour}
          </div>
        )}
      </div>

      <div className="flex gap-0.5 rounded-xl overflow-hidden">
        {hours.map((h, i) => (
          <div
            key={i}
            className="group relative flex-1 cursor-pointer"
            style={{ minWidth: 0 }}
          >
            <div
              className="h-10 transition-all duration-200 group-hover:h-14"
              style={{ backgroundColor: h.color, opacity: 0.8 }}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-gray-900 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {h.label}: {h.pm25.toFixed(1)} µg/m³ — {h.quality}
            </div>
            {/* Show label every 4 hours */}
            {(h.hour % 4 === 0) && (
              <div className="text-[10px] text-muted-foreground text-center mt-1 truncate">
                {h.label}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-between mt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#4ade80]" /> Great
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#facc15]" /> OK
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#fb923c]" /> Caution
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#f87171]" /> Avoid
        </div>
      </div>
    </motion.div>
  );
};

export default BestTimeTimeline;
