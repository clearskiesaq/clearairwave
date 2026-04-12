import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { API } from '@/config/api';
import { ArrowRight, Wind, Thermometer, CloudRain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPM25 } from '@/utils/aqiUtils';
import {calculateStatistics} from '@/utils/dummyData'
import DataCard from '@/components/ui/DataCard';

const HeroSection = () => {
  const [realSensors, setRealSensors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch real-time sensor data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(API.sensors);
        setRealSensors(response.data); // Set real sensor data
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch sensor data'));
        setIsLoading(false);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(intervalId);
  }, []);

  if (error) {
    return (
      <div className="py-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center text-red-500">
            <h2 className="text-xl font-semibold">Error loading hero section data</h2>
            <p className="mt-2">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !realSensors) {
    return (
      <div className="relative pb-12 pt-28 md:pb-16 md:pt-32 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none -z-10 opacity-30 bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50" />
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="md:flex md:justify-between md:gap-16 items-center">
            <div className="space-y-5 max-w-2xl">
              <span className="inline-flex items-center px-3 py-1 text-xs rounded-full bg-primary/10 text-primary font-medium">
                Real-time air quality monitoring
              </span>
              <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-tight sm:leading-tight">
                Breathe with confidence.
                <span className="text-primary block mt-1">Know your air.</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                ClearSkies Community AQ provides real-time air quality monitoring for the residents of 
                <span className="font-medium text-primary"> Licking County, Ohio</span>,
                helping them make informed decisions about outdoor activities and health protection.
              </p>

            </div>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              <Button asChild size="lg" className="rounded-full px-6 group" disabled>
                View Dashboard
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full px-6" disabled>
                Explore Map
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stats = calculateStatistics(realSensors);
  const avgAQI = Math.round(
    realSensors.reduce((sum, sensor) => sum + (sensor.aqi || 0), 0) / realSensors.length
  );

  // Count the number of sensors in each category
  const goodCount = realSensors.filter(s => s.aqiCategory?.category === 'Good').length;
  const percentage = Math.round((goodCount / realSensors.length) * 100);

  return (
    <div className="relative pb-12 pt-28 md:pb-16 md:pt-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none -z-10 opacity-30 bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="md:flex md:justify-between md:gap-16 items-center">
          <div className="md:flex-1 space-y-8">
            <div className="space-y-5 max-w-2xl">
              <span className="inline-flex items-center px-3 py-1 text-xs rounded-full bg-primary/10 text-primary font-medium">
                Real-time air quality monitoring
              </span>

              <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-tight sm:leading-tight">
                Breathe with confidence.
                <span className="text-primary block mt-1">Know your air.</span>
              </h1>

              <p className="text-lg text-muted-foreground">
                ClearSkies Community AQ provides real-time air quality monitoring for your community,
                helping you make informed decisions about outdoor activities and health protection.
              </p>
              <p className="text-sm text-muted-foreground">
  Currently serving residents of <span className="font-medium text-primary">Licking County, Ohio</span> with real-time data from community-installed sensors.
</p>

            </div>

            <div className="flex flex-wrap gap-3 sm:gap-4">
              <Button asChild size="lg" className="rounded-full px-6 group">
                <Link to="/dashboard">
                  View Dashboard
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>

              <Button asChild variant="outline" size="lg" className="rounded-full px-6">
                <Link to="/map">Explore Map</Link>
              </Button>
            </div>
          </div>

          <div className="md:flex-1 mt-12 md:mt-0 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <DataCard
              title="Average PM2.5"
              value={`${formatPM25(stats.averagePM25)} µg/m³`}
              icon={<Wind className="h-5 w-5 text-primary" />}
              description="Across all monitoring stations"
              cardClassName="animate-slide-up [animation-delay:100ms]"
            />

            <DataCard
              title="Current AQI"
              value={avgAQI}
              icon={<Thermometer className="h-5 w-5 text-primary" />}
              description="Air Quality Index (average)"
              cardClassName="animate-slide-up [animation-delay:200ms]"
            />

            <DataCard
              title="Clean Air Zones"
              value={`${percentage}%`}
              icon={<CloudRain className="h-5 w-5 text-primary" />}
              description={`${goodCount} of ${realSensors.length} sensors reporting good air conditions`}
              cardClassName="animate-slide-up [animation-delay:300ms]"
            />

            <DataCard
  title="Live Sensors"
  value={realSensors.length}
  icon={<Wind className="h-5 w-5 text-primary" />} // Or another relevant icon
  description="Monitoring stations online"
  cardClassName="animate-slide-up [animation-delay:400ms]"
/>

          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;