import { OptimizedCostEstimator } from '@/components/shared/OptimizedCostEstimator';

// Re-export the optimized version for backward compatibility
const CostEstimator = () => {
  return <OptimizedCostEstimator variant="tools" />;
};

export default CostEstimator;
