import React from 'react';
import AQMap from '@/components/AQMap';
import { ArrowUpRight } from 'lucide-react';
import { useSensors } from '@/hooks/useSensors';

const EmbedMap = () => {
  const { isLoading, error } = useSensors();

  const dashboardOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const dashboardHref = `${dashboardOrigin}/dashboard`;

  if (error) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-white text-red-500 p-6">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Could not load the air quality map</h2>
          <p className="mt-2 text-sm opacity-80">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-white relative overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
          <div className="h-10 w-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
      )}

      <div className="absolute inset-0">
        <AQMap />
      </div>

      <a
        href={dashboardHref}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-4 right-4 z-[500] inline-flex items-center gap-2 bg-white/95 backdrop-blur-sm hover:bg-white text-primary font-medium text-sm px-4 py-2.5 rounded-full shadow-lg border border-gray-200 transition-all hover:shadow-xl hover:-translate-y-0.5"
      >
        <span>View full dashboard</span>
        <ArrowUpRight className="h-4 w-4" />
      </a>
    </div>
  );
};

export default EmbedMap;
