import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { API } from '@/config/api';
import { Calendar } from 'lucide-react';

interface DayData {
  date: string;
  pm25: number | null;
  color: string;
  label: string;
}

const getAQIColor = (pm25: number | null): { color: string; label: string } => {
  if (pm25 === null) return { color: '#e5e7eb', label: 'No data' };
  if (pm25 <= 12) return { color: '#4ade80', label: 'Good' };
  if (pm25 <= 35.4) return { color: '#facc15', label: 'Moderate' };
  if (pm25 <= 55.4) return { color: '#fb923c', label: 'USG' };
  if (pm25 <= 150.4) return { color: '#f87171', label: 'Unhealthy' };
  return { color: '#ef4444', label: 'Hazardous' };
};

const HeatmapCalendar = ({ sensorId }: { sensorId?: string }) => {
  const [days, setDays] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(API.historical, {
          params: { sensor_id: sensorId, metric: 'pm2.5', time_range: '30d' }
        });

        const dayData: DayData[] = res.data.map((entry: any) => {
          const pm25 = entry['pm2.5'] ?? entry.pm25 ?? null;
          const { color, label } = getAQIColor(pm25);
          const date = new Date(entry.timestamp + 'Z');
          return {
            date: date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
            pm25,
            color,
            label,
          };
        });

        setDays(dayData);
      } catch { /* silent */ }
      setLoading(false);
    };
    fetchData();
  }, [sensorId]);

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-5">
        <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">
          Loading calendar...
        </div>
      </div>
    );
  }

  if (days.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-card rounded-xl p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">30-Day Air Quality</h3>
        </div>
        {hoveredDay && (
          <div className="text-xs text-muted-foreground">
            {hoveredDay.date}: {hoveredDay.pm25 !== null ? `${hoveredDay.pm25.toFixed(1)} µg/m³` : 'No data'} — {hoveredDay.label}
          </div>
        )}
      </div>

      <div className="flex gap-1 flex-wrap">
        {days.map((day, i) => (
          <div
            key={i}
            className="relative group cursor-pointer"
            onMouseEnter={() => setHoveredDay(day)}
            onMouseLeave={() => setHoveredDay(null)}
          >
            <div
              className="w-7 h-7 rounded-md transition-all duration-200 hover:scale-125 hover:ring-2 hover:ring-offset-1 hover:ring-gray-400"
              style={{ backgroundColor: day.color }}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-gray-900 text-white text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
              {day.date}
              {day.pm25 !== null && `: ${day.pm25.toFixed(1)} µg/m³`}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#4ade80]" /> Good</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#facc15]" /> Moderate</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#fb923c]" /> USG</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#f87171]" /> Unhealthy</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#e5e7eb] dark:bg-gray-700" /> No data</div>
      </div>
    </motion.div>
  );
};

export default HeatmapCalendar;
