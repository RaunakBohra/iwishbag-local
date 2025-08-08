import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  AlertTriangle, 
  Scale, 
  Package, 
  Clock, 
  Shield, 
  CheckCircle,
  Info,
  ExternalLink,
  Eye,
  FileText,
  MessageCircle,
  ChevronRight,
  Lightbulb
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { WeightVarianceCalculator } from './WeightVarianceCalculator';

interface WeightPolicySectionProps {
  currentWeight: number;
  currentTotal: number;
  currency: string;
  onPolicyAccepted: (accepted: boolean) => void;
  isAccepted: boolean;
}

export const WeightPolicySection: React.FC<WeightPolicySectionProps> = ({
  currentWeight,
  currentTotal,
  currency,
  onPolicyAccepted,
  isAccepted
}) => {
  const [showFullPolicy, setShowFullPolicy] = useState(false);
  const [hasReadPolicy, setHasReadPolicy] = useState(false);

  const policyPoints = [
    {
      icon: Scale,
      title: "Weight Estimates vs Reality",
      description: "Seller websites often underestimate weight. Actual weight can be 10-30% higher due to packaging.",
      color: "text-orange-600"
    },
    {
      icon: Package,
      title: "Additional Packaging",
      description: "We use protective packaging (bubble wrap, foam) to ensure safe delivery, which adds weight.",
      color: "text-blue-600"
    },
    {
      icon: Clock,
      title: "Immediate Notification",
      description: "You'll be notified within 2 hours of goods arrival with exact weight and any additional costs.",
      color: "text-green-600"
    },
    {
      icon: Shield,
      title: "48-Hour Response Time",
      description: "You have 48 hours to approve additional costs or discuss alternatives with our team.",
      color: "text-purple-600"
    }
  ];

  const commonScenarios = [
    {
      scenario: "Electronics",
      example: "iPhone with charger + case",
      estimatedWeight: "0.5 kg",
      actualWeight: "0.7 kg",
      reason: "Retail packaging + protective foam",
      additionalCost: 15
    },
    {
      scenario: "Clothing",
      example: "2 shirts + 1 jeans",
      estimatedWeight: "1.2 kg", 
      actualWeight: "1.5 kg",
      reason: "Hangers + tissue paper + tags",
      additionalCost: 8
    },
    {
      scenario: "Books/Media",
      example: "3 hardcover books",
      estimatedWeight: "2.0 kg",
      actualWeight: "2.4 kg", 
      reason: "Extra protective cardboard",
      additionalCost: 12
    }
  ];

  const handleReadPolicy = () => {
    setHasReadPolicy(true);
    setShowFullPolicy(true);
  };

  return (
    <div className="space-y-6">
      {/* Main Policy Card */}
      <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg text-amber-900 flex items-center gap-2">
                Important: Weight & Pricing Policy
                {!hasReadPolicy && (
                  <Badge className="bg-red-100 text-red-800 text-xs">Must Read</Badge>
                )}
              </CardTitle>
              <p className="text-sm text-amber-700 mt-1">
                Understanding weight variations helps avoid billing surprises
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleReadPolicy}
              className="text-amber-700 hover:bg-amber-100"
            >
              <Eye className="w-4 h-4 mr-1" />
              {hasReadPolicy ? 'Review' : 'Read Policy'}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Quick Summary */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            {policyPoints.map((point, index) => (
              <div key={index} className="text-center p-3 bg-white/70 rounded-lg border border-amber-200">
                <point.icon className={`w-5 h-5 ${point.color} mx-auto mb-2`} />
                <div className="font-medium text-xs text-gray-900 mb-1">{point.title}</div>
                <div className="text-xs text-gray-600 leading-tight">{point.description}</div>
              </div>
            ))}
          </div>

          {/* Full Policy Details */}
          {showFullPolicy && (
            <div className="space-y-6">
              <Separator className="bg-amber-200" />
              
              {/* Detailed Policy */}
              <div className="bg-white/70 rounded-lg p-4 border border-amber-200">
                <h4 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Complete Weight & Pricing Policy
                </h4>
                <div className="prose prose-sm text-gray-700">
                  <p className="mb-3">
                    <strong>Weight Estimation:</strong> Product weights shown on seller websites are estimates. 
                    Actual weights can vary by 10-30% due to packaging materials, bundled accessories, 
                    and measurement differences.
                  </p>
                  <p className="mb-3">
                    <strong>Additional Costs:</strong> If actual weight exceeds quoted weight, additional 
                    shipping and customs charges may apply. We calculate these at cost with no markup.
                  </p>
                  <p className="mb-3">
                    <strong>Notification Process:</strong> Within 2 hours of receiving your goods, we'll 
                    send you the exact weight and any additional costs via email and SMS.
                  </p>
                  <p className="mb-3">
                    <strong>Your Options:</strong> You have 48 hours to (1) Approve additional costs, 
                    (2) Request weight optimization, or (3) Discuss alternatives with our team.
                  </p>
                  <p>
                    <strong>Dispute Resolution:</strong> If you believe the weight increase is unreasonable, 
                    our customer service team will review and help find a solution within 24 hours.
                  </p>
                </div>
              </div>

              {/* Common Scenarios */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Common Weight Increase Scenarios
                </h4>
                <div className="space-y-3">
                  {commonScenarios.map((scenario, index) => (
                    <div key={index} className="bg-white/70 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-blue-900">{scenario.scenario}</div>
                        <Badge className="bg-red-100 text-red-800 text-xs">
                          +{formatCurrency(scenario.additionalCost, currency)}
                        </Badge>
                      </div>
                      <div className="text-sm text-blue-800 mb-1">{scenario.example}</div>
                      <div className="text-xs text-blue-700 grid grid-cols-3 gap-2">
                        <div>Est: {scenario.estimatedWeight}</div>
                        <div>Actual: {scenario.actualWeight}</div>
                        <div>{scenario.reason}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Support */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-start gap-3">
                  <MessageCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-900 mb-2">Questions About Weight Policy?</h4>
                    <p className="text-sm text-green-800 mb-3">
                      Our customer service team is available 24/7 to explain the policy and help with concerns.
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                        <MessageCircle className="w-3 h-3 mr-1" />
                        Chat Now
                      </Button>
                      <Button size="sm" variant="outline" className="border-green-300 text-green-700">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View FAQ
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Policy Acceptance */}
          <div className="mt-6 pt-4 border-t border-amber-200">
            <div className="flex items-start gap-3">
              <Checkbox
                id="weight-policy-acceptance"
                checked={isAccepted}
                onCheckedChange={(checked) => onPolicyAccepted(checked as boolean)}
                className="mt-1"
              />
              <div className="flex-1">
                <label 
                  htmlFor="weight-policy-acceptance"
                  className="text-sm font-medium text-gray-900 cursor-pointer"
                >
                  I understand and accept the Weight & Pricing Policy
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  By checking this box, you acknowledge that actual weights may differ from estimates 
                  and agree to pay any additional shipping/customs costs that may arise.
                </p>
                {!hasReadPolicy && (
                  <p className="text-xs text-red-600 mt-1">
                    Please read the complete policy above before accepting.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* CTA when policy accepted */}
          {isAccepted && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 text-sm text-green-800">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="font-medium">Policy accepted!</span>
                <span>You can now proceed with quote approval.</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weight Variance Calculator */}
      <WeightVarianceCalculator
        currentWeight={currentWeight}
        currentTotal={currentTotal}
        currency={currency}
      />
    </div>
  );
};