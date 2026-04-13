import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowUpRight, ArrowDown, ArrowUp } from 'lucide-react';
import { API } from '@/config/api';
import { getAQICategory, formatPM25, getHealthRecommendations } from '@/utils/aqiUtils';
import {calculateStatistics} from '@/utils/dummyData'
import { cn } from '@/lib/utils';

const AQSummary = () => {
  const [realSensors, setRealSensors] = useState<any[]>([]);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch real-time sensor and hourly data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [sensorResponse, hourlyResponse] = await Promise.all([
          axios.get(API.sensors),
          axios.get(API.hourly),
        ]);
        setRealSensors(sensorResponse.data);
        setHourlyData(hourlyResponse.data);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch data'));
        setIsLoading(false);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(intervalId);
  }, []);

  if (error) {
    return (
      <section className="py-16 bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-gray-800/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center text-red-500">
            <h2 className="text-xl font-semibold">Error loading air quality summary</h2>
            <p className="mt-2">{error.message}</p>
          </div>
        </div>
      </section>
    );
  }

  if (isLoading || !realSensors || !hourlyData) {
    return (
      <section className="py-16 bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-gray-800/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="space-y-4">
            <div className="h-8 w-64 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-6 w-96 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-48 bg-gray-200 animate-pulse rounded-lg"></div>
          </div>
        </div>
      </section>
    );
  }

  const stats = calculateStatistics(realSensors);
  const currentAvgPM25 = stats.averagePM25;
  const avgAQICategory = getAQICategory(currentAvgPM25);
  const healthRecommendation = getHealthRecommendations(avgAQICategory.category);


  let current = null;
let threeHoursAgo = null;
let changePercent: string | number = '0.0';
let isImproving = false;

const pm25Values = hourlyData
  .map((entry: any) => entry["pm2.5"])
  .filter((v: any) => typeof v === "number");

if (pm25Values.length >= 4) {
  current = pm25Values[pm25Values.length - 1];
  threeHoursAgo = pm25Values[pm25Values.length - 4];

  if (threeHoursAgo !== 0) {
    const percent = ((current - threeHoursAgo) / threeHoursAgo) * 100;
    changePercent = percent.toFixed(1);
    isImproving = percent < 0;
  }
}




  return (
    <section className="py-16 bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-gray-800/50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          <div className="flex-1 space-y-6 max-w-xl">
            <h2 className="text-3xl font-semibold tracking-tight">Current Average Air Quality Status</h2>

            <div className="flex items-start gap-4">
              <div>
                <div 
                  className="text-5xl font-bold"
                  style={{ color: avgAQICategory.color }}
                >
                  {formatPM25(currentAvgPM25)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">µg/m³ (PM2.5)</div>
              </div>

              <div className="flex-1 mt-1">
                <div 
                  className={cn(
                    "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
                    `bg-opacity-15 bg-${avgAQICategory.color.replace('#', '')} text-${avgAQICategory.color.replace('#', '')}`
                  )}
                  style={{ 
                    backgroundColor: `${avgAQICategory.color}20`, 
                    color: avgAQICategory.color 
                  }}
                >
                  {avgAQICategory.category}
                </div>

                <div className="flex items-center mt-2 text-sm">
                  <span
                    className={cn(
                      "flex items-center",
                      parseFloat(String(changePercent)) === 0 ? "text-muted-foreground" :
                      isImproving ? "text-aqi-good" : "text-aqi-unhealthy"
                    )}
                  >
                    {parseFloat(String(changePercent)) === 0 ? null :
                      isImproving ? <ArrowDown className="h-4 w-4 mr-1" /> :
                      <ArrowUp className="h-4 w-4 mr-1" />
                    }
                    {changePercent}% in the last 3 hours
                  </span>
                </div>
              </div>
            </div>

            <p className="text-muted-foreground">
              {healthRecommendation}
            </p>

            <div>
              <Link 
                to="/dashboard" 
                className="inline-flex items-center text-primary font-medium hover:underline"
              >
                View detailed air quality data
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>

          <div className="flex-1">
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-medium mb-4">Air Quality Index Scale Based on PM2.5</h3>

              <div className="space-y-3">
                {[
                  { label: 'Good', range: '0-12 µg/m³', color: '#4ade80' },
                  { label: 'Moderate', range: '12.1-35.4 µg/m³', color: '#facc15' },
                  { label: 'Unhealthy for Sensitive Groups', range: '35.5-55.4 µg/m³', color: '#fb923c' },
                  { label: 'Unhealthy', range: '55.5-150.4 µg/m³', color: '#f87171' },
                  { label: 'Very Unhealthy', range: '150.5-250.4 µg/m³', color: '#c084fc' },
                  { label: 'Hazardous', range: '250.5+ µg/m³', color: '#ef4444' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded-full mr-3 flex-shrink-0" 
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex-1 flex items-center justify-between">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-sm text-muted-foreground">{item.range}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AQSummary;