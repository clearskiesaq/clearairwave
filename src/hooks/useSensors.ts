import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API } from '@/config/api';

export const useSensors = () => {
  return useQuery({
    queryKey: ['sensors'],
    queryFn: async () => {
      const res = await axios.get(API.sensors);
      return res.data;
    },
    refetchInterval: 60000, // refresh every 60s
    staleTime: 30000, // consider fresh for 30s
  });
};

export const useHourlyData = (sensorId?: string, metric?: string) => {
  return useQuery({
    queryKey: ['hourly', sensorId, metric],
    queryFn: async () => {
      const res = await axios.get(API.hourly, {
        params: { sensor_id: sensorId, metric: metric || 'pm2.5' }
      });
      return res.data;
    },
    enabled: !!sensorId,
    refetchInterval: 60000,
    staleTime: 30000,
  });
};
