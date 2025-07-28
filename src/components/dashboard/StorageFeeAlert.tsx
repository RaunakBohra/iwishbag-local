import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  Clock,
  DollarSign,
  Info,
  Package,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { storageFeeAutomationService } from '@/services/StorageFeeAutomationService';
import { Link } from 'react-router-dom';

interface StorageFeeAlertProps {
  className?: string;
  showDetails?: boolean;
}

export const StorageFeeAlert: React.FC<StorageFeeAlertProps> = ({
  className = '',
  showDetails = true,
}) => {
  const { user } = useAuth();

  // Fetch unpaid fees
  const { data: unpaidFees, isLoading: feesLoading } = useQuery({
    queryKey: ['user-unpaid-storage-fees', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return storageFeeAutomationService.getUserUnpaidFees(user.id);
    },
    enabled: !!user?.id,
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // Fetch packages approaching fees
  const { data: approachingPackages, isLoading: packagesLoading } = useQuery({
    queryKey: ['user-packages-approaching-fees', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const allApproaching = await storageFeeAutomationService.getPackagesApproachingFees();
      return allApproaching.filter(pkg => pkg.user_id === user.id);
    },
    enabled: !!user?.id,
  });

  if (feesLoading || packagesLoading || !user) {
    return null;
  }

  const hasUnpaidFees = unpaidFees && unpaidFees.totalAmount > 0;
  const hasApproachingFees = approachingPackages && approachingPackages.length > 0;

  if (!hasUnpaidFees && !hasApproachingFees) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Unpaid Fees Alert */}
      {hasUnpaidFees && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Storage Fees Due</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              You have <strong>${unpaidFees.totalAmount.toFixed(2)}</strong> in unpaid storage fees
              for {unpaidFees.fees.length} package{unpaidFees.fees.length !== 1 ? 's' : ''}.
            </p>
            <div className="flex gap-2 mt-2">
              <Link to="/dashboard/package-forwarding">
                <Button size="sm" variant="secondary">
                  View Packages
                </Button>
              </Link>
              <Button size="sm">
                Request Quote with Fees
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Approaching Fees Warning */}
      {hasApproachingFees && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Storage Fees Starting Soon</AlertTitle>
          <AlertDescription>
            {approachingPackages.length} package{approachingPackages.length !== 1 ? 's' : ''} will
            start accruing storage fees soon.
          </AlertDescription>
        </Alert>
      )}

      {/* Detailed Information */}
      {showDetails && (hasUnpaidFees || hasApproachingFees) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Storage Fee Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Approaching Packages */}
            {approachingPackages && approachingPackages.length > 0 && (
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Packages Approaching Storage Fees
                </h4>
                <div className="space-y-3">
                  {approachingPackages.map((pkg) => {
                    const progressPercentage = Math.max(
                      0,
                      Math.min(100, ((30 - pkg.days_until_fees) / 30) * 100)
                    );

                    return (
                      <div
                        key={pkg.id}
                        className="p-3 border rounded-lg space-y-2 bg-muted/30"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-mono text-sm">{pkg.tracking_number}</p>
                            <p className="text-sm text-muted-foreground">
                              From: {pkg.sender_name || 'Unknown'}
                            </p>
                          </div>
                          <Badge
                            variant={pkg.days_until_fees <= 3 ? 'destructive' : 'secondary'}
                          >
                            {pkg.days_until_fees} days left
                          </Badge>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Free storage period</span>
                            <span>{pkg.days_in_storage} / 30 days</span>
                          </div>
                          <Progress value={progressPercentage} className="h-2" />
                        </div>

                        <p className="text-xs text-muted-foreground">
                          After free period: ${pkg.current_storage_fee || '1.00'}/day
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Unpaid Fees Details */}
            {unpaidFees && unpaidFees.fees.length > 0 && (
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Current Storage Fees
                </h4>
                <div className="space-y-2">
                  {unpaidFees.fees.slice(0, 3).map((fee) => (
                    <div
                      key={fee.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div className="flex items-center gap-3">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {fee.days_stored} days stored
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(fee.start_date), 'MMM d')} -{' '}
                            {format(new Date(fee.end_date || new Date()), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${fee.total_fee_usd}</p>
                        <p className="text-xs text-muted-foreground">
                          ${fee.daily_rate_usd}/day
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {unpaidFees.fees.length > 3 && (
                    <p className="text-sm text-muted-foreground text-center">
                      + {unpaidFees.fees.length - 3} more fees
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Information */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Storage Fee Policy:</strong> Packages receive 30 days of free storage.
                After that, a daily fee of $1.00 applies. Request shipping or consolidation to
                avoid additional fees.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
};