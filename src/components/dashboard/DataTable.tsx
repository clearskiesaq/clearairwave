import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { API } from '@/config/api';
import { getAQICategory, formatPM25 } from '@/utils/aqiUtils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { RefreshCcw } from 'lucide-react';


const categories = [
  'Good',
  'Moderate',
  'Unhealthy for Sensitive Groups',
  'Unhealthy',
  'Very Unhealthy',
  'Hazardous',
];

const DataTable = () => {
  const [realSensors, setRealSensors] = useState<any[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({
    key: 'pm25',
    direction: 'descending',
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>(categories);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshData = async () => {
  try {
    setIsLoading(true);
    const response = await axios.get(API.refreshTable);
    setRealSensors(response.data);
  } catch (err) {
    setError(err instanceof Error ? err : new Error('Failed to refresh sensor data'));
  } finally {
    setIsLoading(false);
  }
};


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
      <div className="text-center text-red-500">
        <h2 className="text-xl font-semibold">Error loading sensor data</h2>
        <p className="mt-2">{error.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="glass-card rounded-lg p-5">
        <div className="text-center py-8 text-muted-foreground">Loading sensor data...</div>
      </div>
    );
  }

  // Filter sensors based on category and search
  const filteredSensors = realSensors.filter((sensor) => {
    const matchesCategory = selectedCategories.includes(sensor.aqiCategory?.category || '');
    const matchesSearch = sensor.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Sort sensors
  const sortedSensors = [...filteredSensors].sort((a, b) => {
    const getValue = (obj: any, key: string) => {
      // Handle nested properties (e.g., 'aqiCategory.category')
      if (key.includes('.')) {
        const parts = key.split('.');
        let value = obj;
        for (const part of parts) {
          value = value?.[part];
        }
        return value;
      }
      return obj[key];
    };
    const aValue = getValue(a, sortConfig.key);
    const bValue = getValue(b, sortConfig.key);
    if (aValue < bValue) {
      return sortConfig.direction === 'ascending' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'ascending' ? 1 : -1;
    }
    return 0;
  });

  // Request sort
  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Toggle category selection
  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  // Select all categories
  const selectAllCategories = () => {
    setSelectedCategories(categories);
  };

  // Clear all categories
  const clearAllCategories = () => {
    setSelectedCategories([]);
  };

  // Get sort direction icon
  const getSortDirectionIcon = (key: string) => {
    if (sortConfig.key !== key) return <ChevronDown className="h-4 w-4 text-muted-foreground/50" />;
    return sortConfig.direction === 'ascending' ? (
      <ChevronUp className="h-4 w-4 text-primary" />
    ) : (
      <ChevronDown className="h-4 w-4 text-primary" />
    );
  };

  return (
    <div className="glass-card rounded-lg p-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-4">
        <h3 className="text-lg font-medium">Sensor Readings</h3>
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
        
          {/* Search */}
          <div className="relative w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search sensors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-8 py-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {/* Category filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Filter className="h-4 w-4 mr-2" />
                Filter
                {selectedCategories.length < categories.length && (
                  <span className="ml-1 w-4 h-4 rounded-full bg-primary text-xs text-primary-foreground flex items-center justify-center">
                    {selectedCategories.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-3">
              <div className="space-y-3">
                <div className="text-sm font-medium">Filter by AQI Category</div>
                <div className="flex justify-between">
                  <Button variant="ghost" size="sm" onClick={selectAllCategories} className="h-8 text-xs">
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearAllCategories} className="h-8 text-xs">
                    Clear All
                  </Button>
                </div>
                <div className="space-y-2">
                  {categories.map((category) => {
                    const aqiCategoryInfo = getAQICategory(
                      category === 'Good'
                        ? 10
                        : category === 'Moderate'
                        ? 25
                        : category === 'Unhealthy for Sensitive Groups'
                        ? 45
                        : category === 'Unhealthy'
                        ? 100
                        : category === 'Very Unhealthy'
                        ? 200
                        : 300
                    );
                    return (
                      <div key={category} className="flex items-center space-x-2">
                        <Checkbox
                          id={`category-${category}`}
                          checked={selectedCategories.includes(category)}
                          onCheckedChange={() => toggleCategory(category)}
                        />
                        <Label
                          htmlFor={`category-${category}`}
                          className="flex items-center cursor-pointer text-sm"
                        >
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: aqiCategoryInfo.color }}
                          />
                          {category}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button onClick={refreshData} variant="outline" size="sm" className="h-9">
  <RefreshCcw className="h-4 w-4 mr-2" />
  Refresh
</Button>

        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="py-3 px-4 text-left font-medium text-sm text-muted-foreground">
                <button
                  className="flex items-center focus:outline-none"
                  onClick={() => requestSort('name')}
                >
                  Sensor
                  {getSortDirectionIcon('name')}
                </button>
              </th>
              <th className="py-3 px-4 text-left font-medium text-sm text-muted-foreground">
                <button
                  className="flex items-center focus:outline-none"
                  onClick={() => requestSort('pm25')}
                >
                  PM2.5
                  {getSortDirectionIcon('pm25')}
                </button>
              </th>
              <th className="py-3 px-4 text-left font-medium text-sm text-muted-foreground">
                <button
                  className="flex items-center focus:outline-none"
                  onClick={() => requestSort('aqiCategory.category')}
                >
                  AQI Category
                  {getSortDirectionIcon('aqiCategory.category')}
                </button>
              </th>
              <th className="py-3 px-4 text-left font-medium text-sm text-muted-foreground">
                <button
                  className="flex items-center focus:outline-none"
                  onClick={() => requestSort('temperature')}
                >
                  Temperature
                  {getSortDirectionIcon('temperature')}
                </button>
              </th>
              <th className="py-3 px-4 text-left font-medium text-sm text-muted-foreground">
                <button
                  className="flex items-center focus:outline-none"
                  onClick={() => requestSort('humidity')}
                >
                  Humidity
                  {getSortDirectionIcon('humidity')}
                </button>
              </th>
              <th className="py-3 px-4 text-left font-medium text-sm text-muted-foreground">
                <button
                  className="flex items-center focus:outline-none"
                  onClick={() => requestSort('lastUpdated')}
                >
                  Last Updated
                  {getSortDirectionIcon('lastUpdated')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedSensors.map((sensor) => (
              <tr key={sensor.id} className="hover:bg-secondary/40 dark:hover:bg-gray-800/40 transition-colors">
                <td className="py-3 px-4 text-sm">{sensor.name}</td>
                <td className="py-3 px-4 text-sm font-medium">{formatPM25(sensor.pm25)} µg/m³</td>
                <td className="py-3 px-4">
                  <div
                    className="inline-block text-xs font-medium px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: `${sensor.aqiCategory?.color}15`,
                      color: sensor.aqiCategory?.color,
                    }}
                  >
                    {sensor.aqiCategory?.category}
                  </div>
                </td>
                <td className="py-3 px-4 text-sm">{sensor.temperature.toFixed(1)} °C</td>
                <td className="py-3 px-4 text-sm">{sensor.humidity.toFixed(0)}%</td>
                <td className="py-3 px-4 text-sm">
                 {new Date(sensor.lastUpdated+ 'Z').toLocaleString(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
})}

                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedSensors.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No sensors match your filters. Please adjust your criteria.
          </div>
        )}
      </div>
      <div className="mt-4 text-sm text-muted-foreground">
        Showing {sortedSensors.length} of {realSensors.length} sensors
      </div>
    </div>
  );
};

export default DataTable;