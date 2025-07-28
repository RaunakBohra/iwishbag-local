import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MembershipService, type MembershipStatus, type CustomerMembership } from '@/services/MembershipService';
import { currencyService } from '@/services/CurrencyService';
import { useAuth } from '@/contexts/AuthContext';
import { Crown, Package, Percent, HeadphonesIcon, Zap, Calendar, TrendingUp, Gift } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '@/integrations/supabase/client';

interface MembershipBenefit {
  icon: React.ElementType;
  title: string;
  description: string;
  value?: string;
}

const membershipBenefits: MembershipBenefit[] = [
  {
    icon: Package,
    title: 'FREE Warehouse Storage',
    description: '90 days of free storage for all packages',
    value: '90 days'
  },
  {
    icon: Percent,
    title: 'Exclusive Discounts',
    description: '2% additional discount on all orders',
    value: '2%'
  },
  {
    icon: Gift,
    title: 'Free Insurance',
    description: 'Complimentary insurance on all shipments',
    value: 'FREE'
  },
  {
    icon: HeadphonesIcon,
    title: 'Priority Support',
    description: '24/7 dedicated customer support',
    value: '24/7'
  },
  {
    icon: Zap,
    title: 'Early Access',
    description: 'Be first to access new features and deals',
    value: 'Exclusive'
  }
];

export function MembershipDashboard() {
  const { user } = useAuth();
  const [membership, setMembership] = useState<CustomerMembership | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus>({ has_membership: false });
  const [loading, setLoading] = useState(true);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [stats, setStats] = useState({
    total_orders: 0,
    total_savings: 0,
    storage_days_saved: 0
  });

  useEffect(() => {
    if (user?.id) {
      loadMembershipData();
    }
  }, [user]);

  const loadMembershipData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Load membership status
      const status = await MembershipService.checkMembershipStatus(user.id);
      setMembershipStatus(status);

      // Load full membership data if active
      if (status.has_membership) {
        const membershipData = await MembershipService.getCustomerMembership(user.id);
        setMembership(membershipData);

        // Load usage stats
        const usageStats = await MembershipService.getMembershipUsageStats(user.id);
        setStats(usageStats);
      }
    } catch (error) {
      console.error('Error loading membership data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      // Get user's country and currency
      const { data: profile } = await supabase
        .from('profiles')
        .select('country')
        .eq('id', user?.id)
        .single();

      const country = profile?.country || 'US';
      const currency = currencyService.getCurrencyByCountry(country);
      
      // Calculate price in user's currency
      const price = await MembershipService.calculateMembershipPrice('plus', currency);

      // Create Stripe checkout session
      const { data, error } = await supabase.functions.invoke('create-membership-checkout', {
        body: {
          userId: user?.id,
          planSlug: 'plus',
          currency: currency.toLowerCase(),
          amount: price
        }
      });

      if (error) throw error;

      // Redirect to Stripe checkout
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Failed to start upgrade process');
    } finally {
      setUpgrading(false);
    }
  };

  const getDaysRemaining = () => {
    if (!membership?.expires_at) return 0;
    return Math.max(0, differenceInDays(new Date(membership.expires_at), new Date()));
  };

  const getProgressPercentage = () => {
    if (!membership) return 0;
    const totalDays = 365;
    const daysUsed = totalDays - getDaysRemaining();
    return Math.min(100, (daysUsed / totalDays) * 100);
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-48 bg-muted rounded-lg" />
      <div className="h-96 bg-muted rounded-lg" />
    </div>;
  }

  if (!membershipStatus.has_membership) {
    return (
      <div className="space-y-6">
        {/* Non-member Hero */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Crown className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-3xl">Unlock iwishBag Plus</CardTitle>
            <CardDescription className="text-lg mt-2">
              Join thousands of members enjoying exclusive benefits
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center pb-8">
            <div className="mb-8">
              <p className="text-4xl font-bold text-primary mb-2">
                {currencyService.formatAmount(
                  user?.profile?.country === 'IN' ? 4999 : 
                  user?.profile?.country === 'NP' ? 8999 : 99,
                  user?.profile?.country === 'IN' ? 'INR' : 
                  user?.profile?.country === 'NP' ? 'NPR' : 'USD'
                )}
                <span className="text-lg font-normal text-muted-foreground">/year</span>
              </p>
              <p className="text-sm text-muted-foreground">
                That's less than {
                  user?.profile?.country === 'IN' ? '₹420' : 
                  user?.profile?.country === 'NP' ? 'NPR 750' : '$9'
                } per month!
              </p>
            </div>
            <Button size="lg" className="mb-4" onClick={() => setShowUpgradeDialog(true)}>
              Become a Plus Member
            </Button>
            <p className="text-sm text-muted-foreground">
              30-day money-back guarantee
            </p>
          </CardContent>
        </Card>

        {/* Benefits Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {membershipBenefits.map((benefit, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{benefit.title}</CardTitle>
                    {benefit.value && (
                      <Badge className="mt-1" variant="secondary">
                        {benefit.value}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ROI Calculator */}
        <Card>
          <CardHeader>
            <CardTitle>See How Much You'll Save</CardTitle>
            <CardDescription>
              Plus membership pays for itself with just a few orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {user?.profile?.country === 'IN' ? '₹100' : 
                     user?.profile?.country === 'NP' ? 'NPR 180' : '$2'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Saved per {user?.profile?.country === 'IN' ? '₹5,000' : 
                               user?.profile?.country === 'NP' ? 'NPR 9,000' : '$100'} order
                  </p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">FREE</p>
                  <p className="text-sm text-muted-foreground">
                    90 days warehouse storage
                  </p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">BONUS</p>
                  <p className="text-sm text-muted-foreground">
                    Free insurance on all orders
                  </p>
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Average member saves {
                  user?.profile?.country === 'IN' ? '₹15,000' : 
                  user?.profile?.country === 'NP' ? 'NPR 27,000' : '$300'
                } per year!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active member view
  return (
    <div className="space-y-6">
      {/* Member Status Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
                <Crown className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-2xl">iwishBag Plus Member</CardTitle>
                <CardDescription className="text-base">
                  Welcome back, {user?.profile?.full_name || 'Member'}!
                </CardDescription>
              </div>
            </div>
            <Badge variant="default" className="text-lg px-4 py-2">
              ACTIVE
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Membership expires in {getDaysRemaining()} days</span>
                <span>{getProgressPercentage().toFixed(0)}% used</span>
              </div>
              <Progress value={getProgressPercentage()} className="h-2" />
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-muted-foreground">
                <Calendar className="inline h-4 w-4 mr-1" />
                Expires: {membership?.expires_at && format(new Date(membership.expires_at), 'MMMM dd, yyyy')}
              </div>
              {membership?.auto_renew && (
                <Badge variant="outline">
                  <Zap className="h-3 w-3 mr-1" />
                  Auto-renew ON
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.total_orders}</p>
            <p className="text-sm text-muted-foreground">Since joining Plus</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Total Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {currencyService.formatAmount(stats.total_savings, 'USD')}
            </p>
            <p className="text-sm text-muted-foreground">From Plus benefits</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Free Storage Days</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.storage_days_saved}</p>
            <p className="text-sm text-muted-foreground">Days saved</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Benefits */}
      <Card>
        <CardHeader>
          <CardTitle>Your Active Benefits</CardTitle>
          <CardDescription>All benefits are automatically applied to your orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {membershipBenefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{benefit.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{benefit.description}</p>
                  {benefit.value && (
                    <Badge className="mt-2" variant="secondary">
                      {benefit.value}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Membership Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Manage Membership</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button variant="outline">
              Manage Auto-Renewal
            </Button>
            <Button variant="outline">
              Update Payment Method
            </Button>
            <Button variant="outline">
              Download Invoice
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade to iwishBag Plus</DialogTitle>
            <DialogDescription>
              Join Plus and start saving on every order
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center">
              <p className="text-3xl font-bold mb-2">
                {currencyService.formatAmount(
                  user?.profile?.country === 'IN' ? 4999 : 
                  user?.profile?.country === 'NP' ? 8999 : 99,
                  user?.profile?.country === 'IN' ? 'INR' : 
                  user?.profile?.country === 'NP' ? 'NPR' : 'USD'
                )}
                <span className="text-base font-normal text-muted-foreground">/year</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Billed annually • Cancel anytime
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">What's included:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ FREE warehouse storage for 90 days</li>
                <li>✓ 2% additional discount on all orders</li>
                <li>✓ Free insurance on all shipments</li>
                <li>✓ Priority customer support</li>
                <li>✓ Early access to new features</li>
              </ul>
            </div>
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-center">
                <strong>30-Day Money-Back Guarantee</strong><br />
                Not satisfied? Get a full refund within 30 days
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Maybe Later
            </Button>
            <Button onClick={handleUpgrade} disabled={upgrading}>
              {upgrading ? 'Processing...' : 'Upgrade Now'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}