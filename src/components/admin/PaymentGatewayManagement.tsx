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
  Loader2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { PaymentGatewayConfig, PaymentGateway } from '@/types/payment';

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gateways?.map((gateway) => (
          <Card key={gateway.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getGatewayIcon(gateway.code)}
                  <div>
                    <CardTitle className="text-lg">{gateway.name}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {gateway.code}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={gateway.is_active}
                    onCheckedChange={() => toggleGatewayStatus(gateway)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditGateway(gateway)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge 
                  variant={gateway.is_active ? "default" : "secondary"}
                  className="text-xs"
                >
                  {gateway.is_active ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </>
                  ) : (
                    <>
                      <X className="h-3 w-3 mr-1" />
                      Inactive
                    </>
                  )}
                </Badge>
                
                <Badge 
                  variant={gateway.test_mode ? "outline" : "default"}
                  className="text-xs"
                >
                  {gateway.test_mode ? "Test Mode" : "Live Mode"}
                </Badge>
              </div>

              {/* Fee Information */}
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fee:</span>
                  <span className="font-medium">
                    {gateway.fee_percent}% + {gateway.fee_fixed}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Countries:</span>
                  <span className="font-medium">{gateway.supported_countries.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Currencies:</span>
                  <span className="font-medium">{gateway.supported_currencies.length}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewConfig(gateway)}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Config
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleTestMode(gateway)}
                  className="flex-1"
                >
                  {gateway.test_mode ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-1" />
                      Live
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-1" />
                      Test
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Gateway Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Payment Gateway</DialogTitle>
          </DialogHeader>
          
          {editingGateway && (
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
        </DialogContent>
      </Dialog>

      {/* View Config Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gateway Configuration</DialogTitle>
          </DialogHeader>
          
          {selectedGateway && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input value={selectedGateway.name} disabled />
                </div>
                <div>
                  <Label>Code</Label>
                  <Input value={selectedGateway.code} disabled />
                </div>
              </div>
              
              <div>
                <Label>Supported Countries</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedGateway.supported_countries.map((country) => (
                    <Badge key={country} variant="outline" className="text-xs">
                      {country}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <Label>Supported Currencies</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedGateway.supported_currencies.map((currency) => (
                    <Badge key={currency} variant="outline" className="text-xs">
                      {currency}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <Label>Configuration (JSON)</Label>
                <Textarea
                  value={JSON.stringify(selectedGateway.config, null, 2)}
                  rows={6}
                  disabled
                  className="font-mono text-xs"
                />
              </div>
              
              <div className="flex justify-end">
                <Button onClick={() => setShowConfigDialog(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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