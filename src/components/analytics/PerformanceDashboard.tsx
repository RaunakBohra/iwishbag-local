/**
 * Performance Monitoring Dashboard
 * 
 * Real-time display of Core Web Vitals and performance metrics
 * Integrates with Cloudflare RUM data
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Metric {
  value: number;
  threshold: number;
  unit: string;
  trend?: 'up' | 'down' | 'stable';
}

interface PerformanceMetrics {
  lcp: Metric;
  fid: Metric;
  cls: Metric;
  ttfb: Metric;
  pageLoadTime: Metric;
  apiResponseTime: Metric;
}

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    lcp: { value: 0, threshold: 2500, unit: 'ms' },
    fid: { value: 0, threshold: 100, unit: 'ms' },
    cls: { value: 0, threshold: 0.1, unit: '' },
    ttfb: { value: 0, threshold: 800, unit: 'ms' },
    pageLoadTime: { value: 0, threshold: 3000, unit: 'ms' },
    apiResponseTime: { value: 0, threshold: 500, unit: 'ms' },
  });
  
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // Collect performance metrics
    collectMetrics();
    
    // Update metrics periodically
    const interval = setInterval(collectMetrics, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  const collectMetrics = () => {
    if ('performance' in window) {
      const perfData = window.performance.timing;
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      // Calculate metrics
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
      const ttfb = perfData.responseStart - perfData.navigationStart;
      
      // Get Web Vitals if available
      const lcpEntry = performance.getEntriesByType('largest-contentful-paint')[0] as any;
      const lcp = lcpEntry?.startTime || 0;
      
      // Update state
      setMetrics(prev => ({
        ...prev,
        lcp: { ...prev.lcp, value: Math.round(lcp) },
        ttfb: { ...prev.ttfb, value: Math.round(ttfb) },
        pageLoadTime: { ...prev.pageLoadTime, value: Math.round(pageLoadTime) },
      }));
    }
  };
  
  const getMetricStatus = (metric: Metric): 'good' | 'needs-improvement' | 'poor' => {
    const ratio = metric.value / metric.threshold;
    if (ratio <= 1) return 'good';
    if (ratio <= 1.5) return 'needs-improvement';
    return 'poor';
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50';
      case 'needs-improvement': return 'text-yellow-600 bg-yellow-50';
      case 'poor': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };
  
  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-white rounded-full shadow-lg p-3 hover:shadow-xl transition-shadow z-50"
        title="Show Performance Metrics"
      >
        <Activity className="w-6 h-6 text-teal-600" />
      </button>
    );
  }
  
  return (
    <div className="fixed bottom-4 right-4 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-xl z-50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">Performance Metrics</CardTitle>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Core Web Vitals */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Core Web Vitals</h3>
          <div className="grid grid-cols-3 gap-2">
            <MetricCard
              title="LCP"
              metric={metrics.lcp}
              description="Largest Contentful Paint"
            />
            <MetricCard
              title="FID"
              metric={metrics.fid}
              description="First Input Delay"
            />
            <MetricCard
              title="CLS"
              metric={metrics.cls}
              description="Cumulative Layout Shift"
            />
          </div>
        </div>
        
        {/* Other Metrics */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Performance</h3>
          <div className="grid grid-cols-3 gap-2">
            <MetricCard
              title="TTFB"
              metric={metrics.ttfb}
              description="Time to First Byte"
            />
            <MetricCard
              title="Load"
              metric={metrics.pageLoadTime}
              description="Page Load Time"
            />
            <MetricCard
              title="API"
              metric={metrics.apiResponseTime}
              description="Avg Response Time"
            />
          </div>
        </div>
        
        {/* Performance Tips */}
        <div className="border-t pt-3">
          <PerformanceTips metrics={metrics} />
        </div>
      </CardContent>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  metric: Metric;
  description: string;
}

function MetricCard({ title, metric, description }: MetricCardProps) {
  const status = getMetricStatus(metric);
  const statusColor = getStatusColor(status);
  
  return (
    <div className={cn('p-3 rounded-lg text-center', statusColor)}>
      <div className="text-xs font-medium opacity-75">{title}</div>
      <div className="text-xl font-bold">
        {metric.value}{metric.unit}
      </div>
      {metric.trend && (
        <div className="flex justify-center mt-1">
          {metric.trend === 'up' ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
        </div>
      )}
    </div>
  );
}

interface PerformanceTipsProps {
  metrics: PerformanceMetrics;
}

function PerformanceTips({ metrics }: PerformanceTipsProps) {
  const tips: string[] = [];
  
  // Check each metric and provide tips
  if (getMetricStatus(metrics.lcp) !== 'good') {
    tips.push('Optimize largest image/text block loading');
  }
  
  if (getMetricStatus(metrics.fid) !== 'good') {
    tips.push('Reduce JavaScript execution time');
  }
  
  if (getMetricStatus(metrics.cls) !== 'good') {
    tips.push('Set explicit dimensions for images/ads');
  }
  
  if (getMetricStatus(metrics.ttfb) !== 'good') {
    tips.push('Use Cloudflare edge caching');
  }
  
  if (tips.length === 0) {
    return (
      <div className="text-sm text-green-600">
        ✓ All metrics are performing well!
      </div>
    );
  }
  
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 text-xs font-medium text-gray-700">
        <AlertCircle className="w-3 h-3" />
        Performance Tips
      </div>
      {tips.map((tip, index) => (
        <div key={index} className="text-xs text-gray-600 pl-4">
          • {tip}
        </div>
      ))}
    </div>
  );
}

// Export for use in other components
export function usePerformanceMetrics() {
  const [metrics, setMetrics] = useState<Partial<PerformanceMetrics>>({});
  
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'largest-contentful-paint') {
          setMetrics(prev => ({
            ...prev,
            lcp: { value: entry.startTime, threshold: 2500, unit: 'ms' },
          }));
        }
      }
    });
    
    try {
      observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
    } catch (e) {
      // Not all browsers support all entry types
    }
    
    return () => observer.disconnect();
  }, []);
  
  return metrics;
}