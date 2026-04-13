
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DataCardProps {
  title: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  description?: string;
  className?: string;
  cardClassName?: string;
  iconClassName?: string;
  trend?: {
    value: number;
    isIncreasing: boolean;
  };
  onClick?: () => void;
  children?: React.ReactNode;
}

const DataCard: React.FC<DataCardProps> = ({
  title,
  value,
  icon,
  description,
  className,
  cardClassName,
  iconClassName,
  trend,
  onClick,
  children
}) => {
  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(
        'glass-card rounded-xl p-5 hover:scale-[1.01] transition-all duration-300 h-full',
        onClick && 'cursor-pointer',
        cardClassName
      )}
      onClick={onClick}
    >
      <div className={cn('flex items-start justify-between', className)}>
        <div className="space-y-1.5">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-semibold">{value}</p>
            
            {trend && (
              <span
                className={cn(
                  'text-xs font-medium',
                  trend.isIncreasing ? 'text-aqi-unhealthy' : 'text-aqi-good'
                )}
              >
                {trend.isIncreasing ? '+' : '-'}
                {Math.abs(trend.value).toFixed(1)}%
              </span>
            )}
          </div>
          
          {description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{description}</p>
          )}
        </div>
        
        {icon && (
          <div
            className={cn(
              'flex-shrink-0 p-1.5 rounded-lg bg-secondary/80',
              iconClassName
            )}
          >
            {icon}
          </div>
        )}
      </div>
      
      {children && <div className="mt-3">{children}</div>}
    </motion.div>
  );
};

export default DataCard;
