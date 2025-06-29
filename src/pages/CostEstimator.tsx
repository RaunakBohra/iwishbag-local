import CostEstimator from "@/components/tools/CostEstimator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CostEstimatorPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background py-16 px-4">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 text-foreground drop-shadow-lg">Cost Estimator</h1>
        <p className="text-lg text-center text-muted-foreground mb-10 max-w-2xl mx-auto">Estimate your total cost, including international shipping, customs, and payment fees. Enter your item details below to get a transparent, instant quote.</p>
        <div className="w-full max-w-2xl mx-auto rounded-2xl border border-border bg-card/60 backdrop-blur-md shadow-2xl p-8">
          <CostEstimator />
        </div>
      </div>
    </div>
  );
};

export default CostEstimatorPage;
