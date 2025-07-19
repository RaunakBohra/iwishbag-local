import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SEOAnalysis as SEOAnalysisType, SEOCheck } from '@/types/blog';
import { CheckCircle, XCircle, AlertTriangle, Target, Lightbulb } from 'lucide-react';

interface SEOAnalysisProps {
  analysis: SEOAnalysisType;
}

export const SEOAnalysis: React.FC<SEOAnalysisProps> = ({ analysis }) => {
  const scorePercentage = (analysis.score / analysis.maxScore) * 100;

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (percentage: number) => {
    if (percentage >= 80) return 'default';
    if (percentage >= 60) return 'secondary';
    return 'destructive';
  };

  const getStatusIcon = (status: SEOCheck['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadgeVariant = (status: SEOCheck['status']) => {
    switch (status) {
      case 'passed':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target size={16} />
          SEO Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-bold">SEO Score:</span>
            <Badge variant={getScoreBadgeVariant(scorePercentage)} className="text-lg px-3 py-1">
              {analysis.score}/{analysis.maxScore}
            </Badge>
          </div>
          <Progress value={scorePercentage} className="w-full h-3" />
          <p className={`text-sm font-medium ${getScoreColor(scorePercentage)}`}>
            {scorePercentage.toFixed(0)}% -{' '}
            {scorePercentage >= 80
              ? 'Excellent'
              : scorePercentage >= 60
                ? 'Good'
                : scorePercentage >= 40
                  ? 'Needs Improvement'
                  : 'Poor'}
          </p>
        </div>

        {/* Individual Checks */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-gray-700">SEO Checks</h4>
          {analysis.checks.map((check) => (
            <div key={check.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0 mt-0.5">{getStatusIcon(check.status)}</div>
              <div className="flex-grow min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h5 className="font-medium text-sm">{check.title}</h5>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(check.status)} className="text-xs">
                      {check.status}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {check.score}/{check.maxScore}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">{check.description}</p>
                {check.recommendation && (
                  <p className="text-xs text-teal-600 bg-teal-50 p-2 rounded">
                    💡 {check.recommendation}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Recommendations */}
        {analysis.recommendations.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
              <Lightbulb size={16} />
              Top Recommendations
            </h4>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc pl-4 space-y-1">
                  {analysis.recommendations.map((recommendation, index) => (
                    <li key={index} className="text-sm">
                      {recommendation}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Score Breakdown */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {analysis.checks.filter((c) => c.status === 'passed').length}
            </div>
            <div className="text-sm text-gray-600">Passed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {analysis.checks.filter((c) => c.status === 'failed').length}
            </div>
            <div className="text-sm text-gray-600">Failed</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
