import React, { lazy, Suspense } from 'react';
import { ChartConfig } from './chart';

// Lazy load Recharts components to reduce bundle size
const LazyLineChart = lazy(() => import('recharts').then(module => ({ default: module.LineChart })));
const LazyAreaChart = lazy(() => import('recharts').then(module => ({ default: module.AreaChart })));
const LazyBarChart = lazy(() => import('recharts').then(module => ({ default: module.BarChart })));
const LazyPieChart = lazy(() => import('recharts').then(module => ({ default: module.PieChart })));
const LazyXAxis = lazy(() => import('recharts').then(module => ({ default: module.XAxis })));
const LazyYAxis = lazy(() => import('recharts').then(module => ({ default: module.YAxis })));
const LazyCartesianGrid = lazy(() => import('recharts').then(module => ({ default: module.CartesianGrid })));
const LazyLine = lazy(() => import('recharts').then(module => ({ default: module.Line })));
const LazyArea = lazy(() => import('recharts').then(module => ({ default: module.Area })));
const LazyBar = lazy(() => import('recharts').then(module => ({ default: module.Bar })));
const LazyPie = lazy(() => import('recharts').then(module => ({ default: module.Pie })));
const LazyCell = lazy(() => import('recharts').then(module => ({ default: module.Cell })));

// Chart loading fallback
const ChartSkeleton = () => (
  <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed">
    <div className="text-center">
      <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      <p className="mt-2 text-sm text-muted-foreground">Loading chart...</p>
    </div>
  </div>
);

// HOC for lazy chart components
const withChartSuspense = <P extends object>(Component: React.ComponentType<P>) => {
  const WrappedComponent = (props: P) => (
    <Suspense fallback={<ChartSkeleton />}>
      <Component {...props} />
    </Suspense>
  );
  
  WrappedComponent.displayName = `withChartSuspense(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Lazy wrapped chart components
export const LineChart = withChartSuspense(LazyLineChart);
export const AreaChart = withChartSuspense(LazyAreaChart);
export const BarChart = withChartSuspense(LazyBarChart);
export const PieChart = withChartSuspense(LazyPieChart);
export const XAxis = withChartSuspense(LazyXAxis);
export const YAxis = withChartSuspense(LazyYAxis);
export const CartesianGrid = withChartSuspense(LazyCartesianGrid);
export const Line = withChartSuspense(LazyLine);
export const Area = withChartSuspense(LazyArea);
export const Bar = withChartSuspense(LazyBar);
export const Pie = withChartSuspense(LazyPie);
export const Cell = withChartSuspense(LazyCell);

// Export the skeleton for external use
export { ChartSkeleton };

// Props interfaces for common chart types
export interface LazyLineChartProps {
  data: any[];
  dataKey?: string;
  config: ChartConfig;
  className?: string;
}

export interface LazyBarChartProps {
  data: any[];
  dataKey?: string;
  config: ChartConfig;
  className?: string;
}

export interface LazyAreaChartProps {
  data: any[];
  dataKey?: string;
  config: ChartConfig;
  className?: string;
}

export interface LazyPieChartProps {
  data: any[];
  dataKey?: string;
  config: ChartConfig;
  className?: string;
}