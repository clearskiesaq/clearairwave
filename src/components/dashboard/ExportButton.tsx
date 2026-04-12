import { useState } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import { API } from '@/config/api';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ExportButtonProps {
  sensorId: string;
  timeRange: string;
}

const ExportButton = ({ sensorId, timeRange }: ExportButtonProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    try {
      const url = typeof API.export === 'function'
        ? API.export(format, sensorId, timeRange)
        : `${API.export}?format=${format}&sensor_id=${sensorId}&time_range=${timeRange}`;

      const response = await fetch(url);

      if (format === 'csv') {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `clearskies_${timeRange}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `clearskies_${timeRange}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
    setIsExporting(false);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9" disabled={isExporting}>
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Export'}
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-2">
        <button
          onClick={() => handleExport('csv')}
          className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Download CSV
        </button>
        <button
          onClick={() => handleExport('json')}
          className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Download JSON
        </button>
      </PopoverContent>
    </Popover>
  );
};

export default ExportButton;
