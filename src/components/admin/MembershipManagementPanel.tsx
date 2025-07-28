import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { MembershipService, type MembershipPlan, type CustomerMembership } from '@/services/MembershipService';
import { currencyService } from '@/services/CurrencyService';
import { Users, CreditCard, Calendar, TrendingUp, UserCheck, UserX, Clock, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface MembershipStats {
  total_members: number;
  active_members: number;
  expired_members: number;
  revenue_this_month: number;
  churn_rate: number;
  average_lifetime_value: number;
}

export function MembershipManagementPanel() {
  const [activeTab, setActiveTab] = useState('overview');
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [recentMemberships, setRecentMemberships] = useState<CustomerMembership[]>([]);
  const [stats, setStats] = useState<MembershipStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load membership plans
      const plansData = await MembershipService.getActivePlans();
      setPlans(plansData);

      // Load recent memberships
      const { data: memberships, error: membershipsError } = await supabase
        .from('customer_memberships')
        .select(`
          *,
          profiles(full_name, email),
          membership_plans(name, slug)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!membershipsError && memberships) {
        setRecentMemberships(memberships);
      }

      // Calculate stats
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_membership_stats');
      
      if (!statsError && statsData) {
        setStats(statsData[0]);
      }

    } catch (error) {
      console.error('Error loading membership data:', error);
      toast.error('Failed to load membership data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMembership = async (customerId: string, planId: string) => {
    try {
      const membership = await MembershipService.createMembership(
        customerId,
        planId,
        'manual',
        'admin-created'
      );

      if (membership) {
        toast.success('Membership created successfully');
        loadData();
      } else {
        toast.error('Failed to create membership');
      }
    } catch (error) {
      console.error('Error creating membership:', error);
      toast.error('Failed to create membership');
    }
  };

  const handleUpdateMembershipStatus = async (membershipId: string, status: 'active' | 'cancelled' | 'expired' | 'paused') => {
    try {
      const success = await MembershipService.updateMembershipStatus(membershipId, status);
      
      if (success) {
        toast.success(`Membership ${status}`);
        loadData();
      } else {
        toast.error('Failed to update membership');
      }
    } catch (error) {
      console.error('Error updating membership:', error);
      toast.error('Failed to update membership');
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_members || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.active_members || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currencyService.formatAmount(stats?.revenue_this_month || 0, 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats?.churn_rate || 0).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Lifetime Value</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currencyService.formatAmount(stats?.average_lifetime_value || 0, 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">
              Per member
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Membership Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Membership Plans</CardTitle>
          <CardDescription>Current active membership plans</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {plans.map((plan) => (
              <div key={plan.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                  <div className="flex gap-4 mt-2">
                    <Badge variant="outline">
                      USD {plan.pricing.USD}/year
                    </Badge>
                    <Badge variant="outline">
                      INR {plan.pricing.INR}/year
                    </Badge>
                    <Badge variant="outline">
                      NPR {plan.pricing.NPR}/year
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPlan(plan)}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Memberships */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Memberships</CardTitle>
          <CardDescription>Latest membership activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentMemberships.map((membership) => (
              <div key={membership.id} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    {membership.status === 'active' ? (
                      <UserCheck className="h-5 w-5 text-green-600" />
                    ) : (
                      <UserX className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{membership.profiles?.full_name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">{membership.profiles?.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={membership.status === 'active' ? 'default' : 'secondary'}>
                    {membership.status}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    Expires {format(new Date(membership.expires_at), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderMembers = () => (
    <Card>
      <CardHeader>
        <CardTitle>Manage Members</CardTitle>
        <CardDescription>Search and manage customer memberships</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <CreateMembershipDialog onCreateMembership={handleCreateMembership} plans={plans} />
          </div>

          <div className="border rounded-lg">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Customer</th>
                  <th className="text-left p-4">Plan</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Expires</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentMemberships
                  .filter(m => 
                    !searchQuery || 
                    m.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    m.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((membership) => (
                    <tr key={membership.id} className="border-b">
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{membership.profiles?.full_name}</p>
                          <p className="text-sm text-muted-foreground">{membership.profiles?.email}</p>
                        </div>
                      </td>
                      <td className="p-4">{membership.membership_plans?.name}</td>
                      <td className="p-4">
                        <Badge variant={membership.status === 'active' ? 'default' : 'secondary'}>
                          {membership.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {format(new Date(membership.expires_at), 'MMM dd, yyyy')}
                      </td>
                      <td className="p-4">
                        <Select
                          value={membership.status}
                          onValueChange={(value) => handleUpdateMembershipStatus(membership.id, value as any)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="paused">Paused</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Membership Settings</CardTitle>
          <CardDescription>Configure membership plans and benefits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {plans.map((plan) => (
              <div key={plan.id} className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{plan.name}</h3>
                  <Switch defaultChecked={plan.is_active} />
                </div>
                
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label>USD Price</Label>
                    <Input type="number" defaultValue={plan.pricing?.USD || 0} />
                  </div>
                  <div>
                    <Label>INR Price</Label>
                    <Input type="number" defaultValue={plan.pricing?.INR || 0} />
                  </div>
                  <div>
                    <Label>NPR Price</Label>
                    <Input type="number" defaultValue={plan.pricing?.NPR || 0} />
                  </div>
                </div>

                <div>
                  <Label>Benefits</Label>
                  <div className="space-y-2 mt-2">
                    {plan.benefits.map((benefit, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input defaultValue={benefit} />
                        <Button variant="ghost" size="sm">Remove</Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm">Add Benefit</Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Free Storage Days</Label>
                    <Input 
                      type="number" 
                      defaultValue={plan.warehouse_benefits?.free_storage_days || 0} 
                    />
                  </div>
                  <div>
                    <Label>Discount After Free Period (%)</Label>
                    <Input 
                      type="number" 
                      defaultValue={plan.warehouse_benefits?.discount_percentage_after_free || 0} 
                    />
                  </div>
                </div>

                <Button className="w-full">Save Changes</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Membership Management</h2>
        <p className="text-muted-foreground">
          Manage iwishBag Plus memberships and benefits
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {renderOverview()}
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          {renderMembers()}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {renderSettings()}
        </TabsContent>
      </Tabs>

      {/* Plan Details Dialog */}
      {selectedPlan && (
        <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedPlan.name}</DialogTitle>
              <DialogDescription>{selectedPlan.description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Pricing</h4>
                <div className="grid gap-2 md:grid-cols-3">
                  <div className="p-3 border rounded">
                    <p className="text-sm text-muted-foreground">USD</p>
                    <p className="font-semibold">${selectedPlan.pricing.USD}/year</p>
                  </div>
                  <div className="p-3 border rounded">
                    <p className="text-sm text-muted-foreground">INR</p>
                    <p className="font-semibold">₹{selectedPlan.pricing.INR}/year</p>
                  </div>
                  <div className="p-3 border rounded">
                    <p className="text-sm text-muted-foreground">NPR</p>
                    <p className="font-semibold">NPR {selectedPlan.pricing.NPR}/year</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Benefits</h4>
                <ul className="space-y-1">
                  {selectedPlan.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <span className="text-sm">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Warehouse Benefits</h4>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Free Storage:</span> {selectedPlan.warehouse_benefits?.free_storage_days || 0} days
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Discount After Free Period:</span> {selectedPlan.warehouse_benefits?.discount_percentage_after_free || 0}%
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedPlan(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function CreateMembershipDialog({ onCreateMembership, plans }: { 
  onCreateMembership: (customerId: string, planId: string) => Promise<void>;
  plans: MembershipPlan[];
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !selectedPlanId) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      // Find customer by email
      const { data: customer, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (error || !customer) {
        toast.error('Customer not found');
        return;
      }

      await onCreateMembership(customer.id, selectedPlanId);
      setOpen(false);
      setEmail('');
      setSelectedPlanId('');
    } catch (error) {
      console.error('Error creating membership:', error);
      toast.error('Failed to create membership');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserCheck className="mr-2 h-4 w-4" />
          Create Membership
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Membership</DialogTitle>
          <DialogDescription>
            Manually create a membership for a customer
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Customer Email</Label>
            <Input
              type="email"
              placeholder="customer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label>Membership Plan</Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create Membership'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}