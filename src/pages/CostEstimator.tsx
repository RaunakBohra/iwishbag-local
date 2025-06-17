
import CostEstimator from "@/components/tools/CostEstimator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CostEstimatorPage = () => {
  return (
    <div className="container mx-auto py-12">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Cost Estimator</CardTitle>
          <p className="text-muted-foreground">Estimate your shipping and import costs.</p>
        </CardHeader>
        <CardContent>
          <CostEstimator />
        </CardContent>
      </Card>
    </div>
  );
};

export default CostEstimatorPage;
