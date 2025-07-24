import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatedCounter } from '@/components/shared/AnimatedCounter';
import { StatNumber, StatLabel } from '@/components/ui/typography';
import { cn } from '@/lib/design-system';
import { motion } from 'framer-motion';

interface TrendData {
  value: number;
  direction: 'up' | 'down' | 'neutral';
  percentage: number;
  period: string;
}

interface EnhancedMetricCardProps {
  value: number;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  link: string;
  trend?: TrendData;
  insight?: string;
  delay?: number;
}

export const EnhancedMetricCard: React.FC<EnhancedMetricCardProps> = ({
  value,
  label,
  icon: Icon,
  color,
  bgColor,
  link,
  trend,
  insight,
  delay = 0,
}) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    
    switch (trend.direction) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    if (!trend) return 'text-gray-500';
    
    switch (trend.direction) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay / 1000 }}
    >
      <Link to={link}>
        <Card
          className={cn(
            'relative overflow-hidden group hover:shadow-lg transition-all duration-300 cursor-pointer',
            'bg-white border border-gray-200 hover:border-teal-300',
            'transform hover:-translate-y-1'
          )}
        >
          <CardContent className="relative p-6">
            {/* Background gradient overlay on hover */}
            <div
              className={cn(
                'absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300',
                bgColor
              )}
            />
            
            {/* Icon */}
            <div className="w-12 h-12 rounded-lg bg-teal-50 flex items-center justify-center mb-4 group-hover:bg-teal-100 transition-colors">
              <Icon className="w-6 h-6 text-teal-600" />
            </div>
            
            {/* Main value */}
            <StatNumber className="mb-1">
              <AnimatedCounter end={value} />
            </StatNumber>
            
            {/* Label */}
            <StatLabel className="mb-2">{label}</StatLabel>
            
            {/* Trend indicator */}
            {trend && (
              <div className="flex items-center gap-2 text-sm">
                {getTrendIcon()}
                <span className={cn('font-medium', getTrendColor())}>
                  {trend.percentage}% vs {trend.period}
                </span>
              </div>
            )}
            
            {/* Insight text */}
            {insight && (
              <div className="mt-3 p-2 bg-gray-50 rounded-md">
                <p className="text-xs text-gray-600">{insight}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
};