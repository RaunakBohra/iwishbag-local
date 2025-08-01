import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Tag, 
  Calendar, 
  Clock,
  Percent,
  DollarSign,
  Info,
  Copy,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AvailableDiscountsProps {
  countryCode?: string;
  customerEmail?: string;
  className?: string;
}

interface ActiveCampaign {
  id: string;
  name: string;
  description?: string;
  discount_type: {
    type: 'percentage' | 'fixed_amount';
    value: number;
    conditions?: {
      min_order?: number;
      max_discount?: number;
    };
  };
  discount_code?: {
    code: string;
  };
  end_date?: string;
  auto_apply: boolean;
}

export const AvailableDiscounts: React.FC<AvailableDiscountsProps> = ({
  countryCode,
  customerEmail,
  className = ''
}) => {
  const [campaigns, setCampaigns] = useState<ActiveCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveCampaigns();
  }, [countryCode, customerEmail]);

  const fetchActiveCampaigns = async () => {
    try {
      // Fetch active campaigns
      const { data, error } = await supabase
        .from('discount_campaigns')
        .select(`
          id,
          name,
          description,
          end_date,
          auto_apply,
          discount_type:discount_types!discount_campaigns_discount_type_id_fkey(
            type,
            value,
            conditions
          ),
          discount_codes!discount_codes_campaign_id_fkey(
            code
          )
        `)
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .or(`target_audience->>countries.cs.{${countryCode}},target_audience->>countries.is.null`)
        .limit(5);

      if (error) throw error;

      // Transform data to include first discount code
      const transformedData = (data || []).map(campaign => ({
        ...campaign,
        discount_code: campaign.discount_codes?.[0]
      }));

      setCampaigns(transformedData);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast({
        title: "Copied!",
        description: `Discount code ${code} copied to clipboard`,
      });
      
      setTimeout(() => setCopiedCode(null), 3000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy discount code",
        variant: "destructive"
      });
    }
  };

  const getDiscountDisplay = (discountType: any) => {
    if (discountType.type === 'percentage') {
      return `${discountType.value}% OFF`;
    } else {
      return `$${discountType.value} OFF`;
    }
  };

  const getConditionsText = (conditions?: any) => {
    if (!conditions) return null;
    
    const parts = [];
    if (conditions.min_order) {
      parts.push(`Min order: $${conditions.min_order}`);
    }
    if (conditions.max_discount) {
      parts.push(`Max discount: $${conditions.max_discount}`);
    }
    
    return parts.length > 0 ? parts.join(' • ') : null;
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (campaigns.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Available Discounts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="font-semibold text-purple-900">{campaign.name}</h4>
                {campaign.description && (
                  <p className="text-sm text-purple-700 mt-1">{campaign.description}</p>
                )}
              </div>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                {getDiscountDisplay(campaign.discount_type)}
              </Badge>
            </div>

            {campaign.discount_code && !campaign.auto_apply && (
              <div className="flex items-center gap-2 mt-3">
                <code className="flex-1 px-3 py-2 bg-white border border-purple-300 rounded text-sm font-mono text-purple-800">
                  {campaign.discount_code.code}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyCode(campaign.discount_code!.code)}
                  className="border-purple-300 hover:bg-purple-100"
                >
                  {copiedCode === campaign.discount_code.code ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            )}

            {campaign.auto_apply && (
              <Badge variant="outline" className="mt-2 text-green-700 border-green-300">
                <CheckCircle className="h-3 w-3 mr-1" />
                Auto-applied at checkout
              </Badge>
            )}

            <div className="flex items-center gap-4 mt-3 text-xs text-purple-600">
              {getConditionsText(campaign.discount_type.conditions) && (
                <div className="flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  {getConditionsText(campaign.discount_type.conditions)}
                </div>
              )}
              {campaign.end_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Expires {new Date(campaign.end_date).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        ))}

        <p className="text-xs text-gray-500 text-center mt-4">
          Apply discount codes during quote creation
        </p>
      </CardContent>
    </Card>
  );
};