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
        // Get all sensors
        const sensorsRes = await axios.get(API.sensors);
        const sensors = sensorsRes.data;
        if (!sensors || sensors.length === 0) { setLoading(false); return; }

        // Fetch hourly data for all sensors in parallel
        const allHourly = await Promise.all(
          sensors.map(async (s: any) => {
            try {
              const res = await axios.get(API.hourly, { params: { sensor_id: s.id, metric: 'pm2.5' } });
              return res.data;
            } catch { return []; }
          })
        );

        // Average PM2.5 per hour across all sensors
        const hourMap: Record<string, { sum: number; count: number; time: string }> = {};
        allHourly.forEach((data: any[]) => {
          if (!data) return;
          data.forEach((entry: any) => {
            const pm25 = entry['pm2.5'] ?? entry.pm25 ?? null;
            if (pm25 === null) return;
            const timeKey = entry.time;
            if (!hourMap[timeKey]) hourMap[timeKey] = { sum: 0, count: 0, time: timeKey };
            hourMap[timeKey].sum += pm25;
            hourMap[timeKey].count += 1;
          });
        });

        const hourData: HourData[] = Object.values(hourMap)
          .sort((a, b) => a.time < b.time ? -1 : 1)
          .map(({ sum, count, time: t }) => {
            const avgPm25 = sum / count;
            const date = new Date(t + 'Z');
            const { color, quality } = getHourColor(avgPm25);
            return {
              hour: date.getHours(),
              label: date.toLocaleTimeString([], { hour: 'numeric', hour12: true }),
              pm25: avgPm25,
              color,
              quality,
            };
          });

        if (hourData.length === 0) { setLoading(false); return; }

        setHours(hourData);
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

      <div className="flex gap-[2px] rounded-xl">
        {hours.map((h, i) => (
          <div
            key={i}
            className="group relative flex-1 cursor-pointer flex flex-col items-center"
            style={{ minWidth: 0 }}
          >
            <div
              className="w-full h-8 rounded-sm transition-all duration-200 group-hover:h-11 group-hover:opacity-100"
              style={{ backgroundColor: h.color, opacity: 0.75 }}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2.5 py-1.5 rounded-lg bg-gray-900 dark:bg-gray-700 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
              <span className="font-medium">{h.label}</span>: {h.pm25.toFixed(1)} µg/m³
              <span className="ml-1 opacity-75">({h.quality})</span>
            </div>
            {/* Show label every 3 hours */}
            {(h.hour % 3 === 0) ? (
              <div className="text-[9px] text-muted-foreground text-center mt-1.5 leading-none">
                {h.hour === 0 ? '12a' : h.hour === 12 ? '12p' : h.hour < 12 ? `${h.hour}a` : `${h.hour - 12}p`}
              </div>
            ) : (
              <div className="h-3 mt-1.5" />
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
