import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Clock } from 'lucide-react';

interface TimeSliderProps {
  hours: string[];
  currentIndex: number;
  onChange: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

const TimeSlider = ({ hours, currentIndex, onChange, isPlaying, onTogglePlay }: TimeSliderProps) => {
  if (hours.length === 0) return null;

  const currentLabel = hours[currentIndex]
    ? new Date(hours[currentIndex] + 'Z').toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-4 left-4 right-4 z-[1000] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-xl shadow-lg p-3 px-4"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onTogglePlay}
          className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors flex-shrink-0"
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
        </button>

        <div className="flex-1 flex items-center gap-3">
          <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <input
            type="range"
            min={0}
            max={hours.length - 1}
            value={currentIndex}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="flex-1 h-1.5 accent-primary cursor-pointer"
          />
          <span className="text-xs font-medium text-muted-foreground w-20 text-right flex-shrink-0">
            {currentLabel}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default TimeSlider;
