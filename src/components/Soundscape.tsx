import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { useSoundscape } from '@/hooks/useSoundscape';
import axios from 'axios';
import { API } from '@/config/api';

const Soundscape = () => {
  const { isPlaying, start, stop, volume, updateVolume } = useSoundscape();
  const [showSlider, setShowSlider] = useState(false);
  const [aqi, setAqi] = useState(30);

  useEffect(() => {
    const fetchAqi = async () => {
      try {
        const res = await axios.get(API.sensors);
        if (res.data.length > 0) {
          const avgAqi = Math.round(
            res.data.reduce((sum: number, s: any) => sum + (s.aqi || 0), 0) / res.data.length
          );
          setAqi(avgAqi);
        }
      } catch { /* silent */ }
    };
    fetchAqi();
  }, []);

  const toggle = () => {
    if (isPlaying) {
      stop();
    } else {
      start(aqi);
    }
  };

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2"
      onMouseEnter={() => setShowSlider(true)}
      onMouseLeave={() => setShowSlider(false)}
    >
      <AnimatePresence>
        {showSlider && isPlaying && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 mb-1"
          >
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => updateVolume(parseFloat(e.target.value))}
              className="w-24 h-1.5 accent-primary"
            />
            <div className="text-[10px] text-muted-foreground text-center mt-1">
              Volume: {Math.round(volume * 100)}%
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggle}
        className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-colors ${
          isPlaying
            ? 'bg-primary text-white'
            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
        title={isPlaying ? 'Mute soundscape' : 'Play air quality soundscape'}
      >
        {isPlaying ? (
          <Volume2 className="h-5 w-5" />
        ) : (
          <VolumeX className="h-5 w-5" />
        )}
      </motion.button>
    </div>
  );
};

export default Soundscape;
