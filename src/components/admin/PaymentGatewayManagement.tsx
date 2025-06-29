import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CreditCard, 
  Settings, 
  Edit, 
  Save, 
  X, 
  Plus, 
  Trash2,
  Eye,
  EyeOff,
  Globe,
  Smartphone,
  Landmark,
  Banknote,
  CheckCircle,
  AlertCircle,
  Loader2,
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Activity
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { PaymentGatewayConfig, PaymentGateway, PaymentAnalytics } from '@/types/payment';

interface PaymentGatewayFormData {
  name: string;
  code: PaymentGateway;
  is_active: boolean;
  supported_countries: string[];
  supported_currencies: string[];
  fee_percent: number;
  fee_fixed: number;
  config: Record<string, any>;
  webhook_url?: string;
  test_mode: boolean;
}

const getGatewayIcon = (code: PaymentGateway) => {
  switch (code) {
    case 'stripe':
      return <CreditCard className="h-5 w-5" />;
    case 'payu':
      return <CreditCard className="h-5 w-5" />;
    case 'esewa':
      return <Smartphone className="h-5 w-5" />;
    case 'khalti':
      return <Smartphone className="h-5 w-5" />;
    case 'fonepay':
      return <Smartphone className="h-5 w-5" />;
    case 'airwallex':
      return <Globe className="h-5 w-5" />;
    case 'bank_transfer':
      return <Landmark className="h-5 w-5" />;
    case 'cod':
      return <Banknote className="h-5 w-5" />;
    default:
      return <CreditCard className="h-5 w-5" />;
  }
};

const getGatewayColor = (code: PaymentGateway) => {
  switch (code) {
    case 'stripe':
      return 'bg-blue-100 text-blue-800';
    case 'payu':
      return 'bg-purple-100 text-purple-800';
    case 'esewa':
      return 'bg-green-100 text-green-800';
    case 'khalti':
      return 'bg-purple-100 text-purple-800';
    case 'fonepay':
      return 'bg-blue-100 text-blue-800';
    case 'airwallex':
      return 'bg-orange-100 text-orange-800';
    case 'bank_transfer':
      return 'bg-gray-100 text-gray-800';
    case 'cod':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const PaymentGatewayManagement: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingGateway, setEditingGateway] = useState<PaymentGatewayConfig | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGatewayConfig | null>(null);

  // Fetch payment gateways
  const { data: gateways, isLoading } = useQuery({
    queryKey: ['payment-gateways'],
    queryFn: async (): Promise<PaymentGatewayConfig[]> => {
      const { data, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    }
  });

  // Fetch payment analytics
  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useQuery({
    queryKey: ['payment-analytics'],
    queryFn: async (): Promise<PaymentAnalytics> => {
      try {
        const { data: transactions, error } = await supabase
          .from('payment_transactions')
          .select('*')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

        if (error) throw error;

        const totalTransactions = transactions?.length || 0;
        const totalAmount = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
        const completedTransactions = transactions?.filter(t => t.status === 'completed') || [];
        const successRate = totalTransactions > 0 ? (completedTransactions.length / totalTransactions) * 100 : 0;
        const averageAmount = totalTransactions > 0 ? totalAmount / totalTransactions : 0;

        // Calculate gateway breakdown
        const gatewayBreakdown: Record<PaymentGateway, { count: number; amount: number; success_rate: number }> = {} as any;
        
        gateways?.forEach(gateway => {
          const gatewayTransactions = transactions?.filter(t => t.gateway_code === gateway.code) || [];
          const gatewayCompleted = gatewayTransactions.filter(t => t.status === 'completed');
          const gatewayAmount = gatewayTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
          
          gatewayBreakdown[gateway.code] = {
            count: gatewayTransactions.length,
            amount: gatewayAmount,
            success_rate: gatewayTransactions.length > 0 ? (gatewayCompleted.length / gatewayTransactions.length) * 100 : 0
          };
        });

        return {
          total_transactions: totalTransactions,
          total_amount: totalAmount,
          currency: 'USD',
          success_rate: successRate,
          average_amount: averageAmount,
          gateway_breakdown: gatewayBreakdown,
          time_period: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString()
          }
        };
      } catch (error) {
        console.warn('Payment transactions table not available:', error);
        // Return empty analytics when table is not available
        return {
          total_transactions: 0,
          total_amount: 0,
          currency: 'USD',
          success_rate: 0,
          average_amount: 0,
          gateway_breakdown: {} as any,
          time_period: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString()
          }
        };
      }
    },
    enabled: !!gateways
  });

  // Update gateway mutation
  const updateGatewayMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PaymentGatewayFormData> }) => {
      const { error } = await supabase
        .from('payment_gateways')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-gateways'] });
      queryClient.invalidateQueries({ queryKey: ['payment-analytics'] });
      toast({
        title: 'Gateway Updated',
        description: 'Payment gateway configuration has been updated successfully.',
      });
      setShowEditDialog(false);
      setEditingGateway(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Toggle gateway status
  const toggleGatewayStatus = async (gateway: PaymentGatewayConfig) => {
    try {
      await updateGatewayMutation.mutateAsync({
        id: gateway.id,
        data: { is_active: !gateway.is_active }
      });
    } catch (error) {
      console.error('Error toggling gateway status:', error);
    }
  };

  // Toggle test mode
  const toggleTestMode = async (gateway: PaymentGatewayConfig) => {
    try {
      await updateGatewayMutation.mutateAsync({
        id: gateway.id,
        data: { test_mode: !gateway.test_mode }
      });
    } catch (error) {
      console.error('Error toggling test mode:', error);
    }
  };

  const handleEditGateway = (gateway: PaymentGatewayConfig) => {
    setEditingGateway(gateway);
    setShowEditDialog(true);
  };

  const handleSaveGateway = (formData: PaymentGatewayFormData) => {
    if (!editingGateway) return;

    updateGatewayMutation.mutate({
      id: editingGateway.id,
      data: formData
    });
  };

  const handleViewConfig = (gateway: PaymentGatewayConfig) => {
    setSelectedGateway(gateway);
    setShowConfigDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Payment Gateway Management</h2>
          <p className="text-muted-foreground">
            Configure and manage payment gateways for different countries and currencies.
          </p>
        </div>
      </div>

      <Tabs defaultValue="gateways" className="space-y-6">
        <TabsList>
          <TabsTrigger value="gateways" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Gateways
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gateways" className="space-y-6">
          {/* Gateway Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {gateways?.map((gateway) => (
              <Card key={gateway.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getGatewayIcon(gateway.code)}
                      <CardTitle className="text-lg">{gateway.name}</CardTitle>
                    </div>
                    <Badge 
                      variant={gateway.is_active ? "default" : "secondary"}
                      className={getGatewayColor(gateway.code)}
                    >
                      {gateway.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Fee:</span>
                      <span>{gateway.fee_percent}% + ${gateway.fee_fixed}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Countries:</span>
                      <span>{gateway.supported_countries.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Currencies:</span>
                      <span>{gateway.supported_currencies.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Mode:</span>
                      <Badge variant={gateway.test_mode ? "outline" : "default"} className="text-xs">
                        {gateway.test_mode ? 'Test' : 'Live'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditGateway(gateway)}
                      className="flex-1"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewConfig(gateway)}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleGatewayStatus(gateway)}
                    >
                      {gateway.is_active ? (
                        <AlertCircle className="h-3 w-3" />
                      ) : (
                        <CheckCircle className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {analyticsLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : analytics ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.total_transactions}</div>
                    <p className="text-xs text-muted-foreground">
                      Last 30 days
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${analytics.total_amount.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {analytics.currency}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analytics.success_rate.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Payment success
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Amount</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${analytics.average_amount.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Per transaction
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Gateway Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Gateway Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(analytics.gateway_breakdown).map(([gateway, stats]) => (
                      <div key={gateway} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getGatewayIcon(gateway as PaymentGateway)}
                          <div>
                            <p className="font-medium capitalize">{gateway.replace('_', ' ')}</p>
                            <p className="text-sm text-muted-foreground">
                              {stats.count} transactions
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${stats.amount.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">
                            {stats.success_rate.toFixed(1)}% success
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No analytics data available</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Gateway Dialog */}
      {showEditDialog && editingGateway && (
        <GatewayEditForm
          gateway={editingGateway}
          onSave={handleSaveGateway}
          onCancel={() => {
            setShowEditDialog(false);
            setEditingGateway(null);
          }}
          isSaving={updateGatewayMutation.isPending}
        />
      )}

      {/* View Config Dialog */}
      {showConfigDialog && selectedGateway && (
        <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Gateway Configuration - {selectedGateway.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Configuration (JSON)</Label>
                <Textarea
                  value={JSON.stringify(selectedGateway.config, null, 2)}
                  readOnly
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <Label>Webhook URL</Label>
                <Input value={selectedGateway.webhook_url || ''} readOnly />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// Gateway Edit Form Component
interface GatewayEditFormProps {
  gateway: PaymentGatewayConfig;
  onSave: (data: PaymentGatewayFormData) => void;
  onCancel: () => void;
  isSaving: boolean;
}

const GatewayEditForm: React.FC<GatewayEditFormProps> = ({
  gateway,
  onSave,
  onCancel,
  isSaving
}) => {
  const [formData, setFormData] = useState<PaymentGatewayFormData>({
    name: gateway.name,
    code: gateway.code,
    is_active: gateway.is_active,
    supported_countries: gateway.supported_countries,
    supported_currencies: gateway.supported_currencies,
    fee_percent: gateway.fee_percent,
    fee_fixed: gateway.fee_fixed,
    config: gateway.config,
    webhook_url: gateway.webhook_url,
    test_mode: gateway.test_mode
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Gateway Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="code">Gateway Code</Label>
          <Input
            id="code"
            value={formData.code}
            disabled
            className="bg-gray-50"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="fee_percent">Fee Percentage (%)</Label>
          <Input
            id="fee_percent"
            type="number"
            step="0.01"
            value={formData.fee_percent}
            onChange={(e) => setFormData({ ...formData, fee_percent: parseFloat(e.target.value) })}
            required
          />
        </div>
        <div>
          <Label htmlFor="fee_fixed">Fixed Fee</Label>
          <Input
            id="fee_fixed"
            type="number"
            step="0.01"
            value={formData.fee_fixed}
            onChange={(e) => setFormData({ ...formData, fee_fixed: parseFloat(e.target.value) })}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="webhook_url">Webhook URL (Optional)</Label>
        <Input
          id="webhook_url"
          value={formData.webhook_url || ''}
          onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
          placeholder="https://your-domain.com/webhooks/payment"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
          <Label htmlFor="is_active">Active</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            id="test_mode"
            checked={formData.test_mode}
            onCheckedChange={(checked) => setFormData({ ...formData, test_mode: checked })}
          />
          <Label htmlFor="test_mode">Test Mode</Label>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}; 