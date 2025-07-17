import { OptimizedCostEstimator } from '@/components/shared/OptimizedCostEstimator';

const CostEstimator = () => {
  return (
    <section
      id="cost-estimator"
      className="py-10 md:py-16 bg-gradient-to-br from-gray-50 via-white to-blue-50"
    >
      <div className="container px-2 md:px-0">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-4">
              Cost Estimator
            </h2>
            <p className="text-sm md:text-base text-gray-700">
              Get a quick estimate of your total cost, including shipping and fees.
            </p>
          </div>
          <div className="backdrop-blur-xl bg-white/20 border border-white/30 shadow-2xl rounded-lg">
            <OptimizedCostEstimator variant="landing" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default CostEstimator;
