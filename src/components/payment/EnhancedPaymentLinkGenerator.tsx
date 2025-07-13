import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Link, 
  Loader2, 
  Copy, 
  ExternalLink, 
  Plus, 
  Trash2, 
  Settings, 
  Eye,
  Zap,
  Shield,
  Smartphone
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CustomField {
  name: string;
  type: 'text' | 'number' | 'email' | 'phone' | 'date' | 'dropdown';
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

interface EnhancedPaymentLinkGeneratorProps {
  quoteId: string;
  amount: number;
  currency: string;
  customerInfo?: {
    name: string;
    email: string;
    phone: string;
  };
  quote?: any; // Full quote object for intelligent prefilling
  onLinkCreated?: (link: any) => void;
}

export function EnhancedPaymentLinkGenerator({
  quoteId,
  amount,
  currency,
  customerInfo,
  quote,
  onLinkCreated,
}: EnhancedPaymentLinkGeneratorProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  
  // Helper function to get customer info with fallbacks
  const getCustomerInfo = () => {
    if (customerInfo) return customerInfo;
    
    // Try to extract from quote data
    const shipping = quote?.shipping_address;
    const user = quote?.user;
    const profiles = quote?.profiles; // From the profile join
    
    // Debug: Log the quote structure to understand the data better
    console.log('🔍 [EnhancedPaymentLinkGenerator] Quote structure for customer info extraction:', {
      hasShippingAddress: !!shipping,
      shippingFields: shipping ? Object.keys(shipping) : [],
      hasUser: !!user,
      userFields: user ? Object.keys(user) : [],
      hasProfiles: !!profiles,
      profileFields: profiles ? Object.keys(profiles) : [],
      customerName: quote?.customer_name,
      customerPhone: quote?.customer_phone,
      email: quote?.email
    });
    
    return {
      name: shipping?.fullName || shipping?.name || profiles?.full_name || user?.full_name || quote?.customer_name || '',
      email: shipping?.email || profiles?.email || user?.email || quote?.email || '',
      phone: shipping?.phone || profiles?.phone || user?.phone || quote?.customer_phone || ''
    };
  };

  // Helper function to generate smart description
  const generateDescription = () => {
    if (!quote) return `Payment for Order ${quoteId}`;
    
    const orderId = quote.order_display_id || quote.display_id || quoteId;
    const productName = quote.product_name;
    const dueAmount = quote.final_total - (quote.amount_paid || 0);
    const isPartialPayment = dueAmount < quote.final_total && dueAmount > 0;
    
    if (productName) {
      if (isPartialPayment) {
        return `Outstanding payment for ${productName} - Order ${orderId}`;
      }
      return `Payment for ${productName} - Order ${orderId}`;
    }
    
    if (isPartialPayment) {
      return `Outstanding balance for Order ${orderId}`;
    }
    
    return `Payment for Order ${orderId}`;
  };

  // Helper function to determine smart expiry
  const getSmartExpiryDays = () => {
    if (!quote) return '7';
    
    // If quote is approved recently, give shorter expiry
    const approvedAt = quote.approved_at;
    if (approvedAt) {
      const daysSinceApproval = Math.floor((Date.now() - new Date(approvedAt).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceApproval <= 1) return '3'; // Recently approved, urgent
      if (daysSinceApproval <= 7) return '7'; // Normal timeframe
      return '14'; // Older quotes get more time
    }
    
    // For high priority quotes, shorter expiry
    if (quote.priority === 'high') return '3';
    if (quote.priority === 'urgent') return '1';
    
    return '7';
  };

  // Helper function to suggest custom fields based on quote
  const getSuggestedCustomFields = () => {
    if (!quote) return [];
    
    const suggestions: CustomField[] = [];
    
    // If international shipping, suggest delivery preferences
    if (quote.destination_country !== quote.origin_country) {
      suggestions.push({
        name: 'delivery_preference',
        type: 'dropdown',
        label: 'Delivery Preference',
        required: false,
        options: ['Standard Delivery', 'Express Delivery', 'Hold at Customs'],
        placeholder: 'Select preference'
      });
    }
    
    // If high value order, suggest ID verification
    if (quote.final_total > 500) {
      suggestions.push({
        name: 'id_verification',
        type: 'text',
        label: 'ID Number (for high-value orders)',
        required: false,
        placeholder: 'Enter ID number for verification'
      });
    }
    
    // For certain destinations, suggest alternative contact
    if (['NP', 'BD', 'LK'].includes(quote.destination_country)) {
      suggestions.push({
        name: 'alternative_contact',
        type: 'phone',
        label: 'Alternative Contact Number',
        required: false,
        placeholder: 'Backup contact number'
      });
    }
    
    return suggestions;
  };

  // Form state with intelligent defaults
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    description: '',
    expiryDays: '7',
    template: 'default' as 'default' | 'minimal' | 'branded',
    partialPaymentAllowed: false,
    apiMethod: 'rest' as 'rest' | 'legacy',
  });

  // Update form data when component opens or quote changes
  useEffect(() => {
    if (open) {
      const customer = getCustomerInfo();
      
      // Log the final customer info for debugging
      console.log('🎯 [EnhancedPaymentLinkGenerator] Final customer info extracted:', customer);
      
      setFormData({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        description: generateDescription(),
        expiryDays: getSmartExpiryDays(),
        template: 'default',
        partialPaymentAllowed: false,
        apiMethod: 'rest',
      });
    }
  }, [open, quote, customerInfo]);

  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [createdLink, setCreatedLink] = useState<any>(null);
  const [showSuggestedFields, setShowSuggestedFields] = useState(false);
  
  // Get suggested custom fields
  const suggestedFields = getSuggestedCustomFields();
  
  // Smart amount analysis
  const getAmountInfo = () => {
    if (!quote) {
      return {
        isDueAmount: false,
        totalAmount: amount,
        paidAmount: 0,
        dueAmount: amount,
        paymentStatus: 'unknown'
      };
    }
    
    const totalAmount = quote.final_total || 0;
    const paidAmount = quote.amount_paid || 0;
    const dueAmount = totalAmount - paidAmount;
    const isDueAmount = paidAmount > 0 && dueAmount > 0;
    
    return {
      isDueAmount,
      totalAmount,
      paidAmount,
      dueAmount,
      paymentStatus: quote.payment_status || 'pending'
    };
  };
  
  const amountInfo = getAmountInfo();

  // Add custom field
  const addCustomField = () => {
    const newField: CustomField = {
      name: `field_${customFields.length + 1}`,
      type: 'text',
      label: 'Custom Field',
      required: false,
      placeholder: 'Enter value...'
    };
    setCustomFields([...customFields, newField]);
  };

  // Add suggested field
  const addSuggestedField = (field: CustomField) => {
    // Check if field already exists
    if (customFields.some(f => f.name === field.name)) {
      toast({
        title: 'Field already added',
        description: 'This field is already in your custom fields list.',
        variant: 'destructive',
      });
      return;
    }
    
    setCustomFields([...customFields, { ...field }]);
    toast({
      title: 'Field added',
      description: `${field.label} has been added to your custom fields.`,
    });
  };

  // Remove custom field
  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  // Update custom field
  const updateCustomField = (index: number, updates: Partial<CustomField>) => {
    const updated = customFields.map((field, i) => 
      i === index ? { ...field, ...updates } : field
    );
    setCustomFields(updated);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-payu-payment-link-v2', {
        body: {
          quoteId,
          amount,
          currency,
          customerInfo: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
          },
          description: formData.description,
          expiryDays: parseInt(formData.expiryDays),
          customFields,
          template: formData.template,
          partialPaymentAllowed: formData.partialPaymentAllowed,
          apiMethod: formData.apiMethod
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        setCreatedLink(data);
        onLinkCreated?.(data);
        toast({
          title: "Payment Link Created!",
          description: `${data.apiVersion === 'v2_rest' ? 'Enhanced' : 'Legacy'} payment link generated successfully.`,
        });
      } else {
        throw new Error(data?.error || 'Failed to create payment link');
      }
    } catch (error: any) {
      console.error('Payment link creation error:', error);
      toast({
        title: "Failed to create payment link",
        description: error.message || 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied!',
        description: 'Link copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the link manually',
        variant: 'destructive',
      });
    }
  };

  // Reset form
  const resetForm = () => {
    setCreatedLink(null);
    setCustomFields([]);
    const customer = getCustomerInfo();
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      description: generateDescription(),
      expiryDays: getSmartExpiryDays(),
      template: 'default',
      partialPaymentAllowed: false,
      apiMethod: 'rest',
    });
    setActiveTab('basic');
    setShowSuggestedFields(false);
  };

  const getApiMethodBadge = (method: string) => {
    if (method === 'rest') {
      return <Badge variant="default" className="bg-green-100 text-green-800"><Zap className="w-3 h-3 mr-1" />Enhanced</Badge>;
    }
    return <Badge variant="secondary"><Shield className="w-3 h-3 mr-1" />Legacy</Badge>;
  };

  const getTemplateBadge = (template: string) => {
    const badges = {
      default: <Badge variant="outline">Default</Badge>,
      minimal: <Badge variant="outline">Minimal</Badge>,
      branded: <Badge variant="outline">Branded</Badge>
    };
    return badges[template as keyof typeof badges] || badges.default;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Link className="h-4 w-4 mr-2" />
          Generate Payment Link
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Create Enhanced Payment Link</DialogTitle>
          <DialogDescription className="space-y-2">
            <div>
              Generate a payment link for {currency} {amount.toFixed(2)} with advanced features
            </div>
            {quote && (
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline" className="text-xs">
                  {quote.display_id || quote.order_display_id || `Quote ${quoteId.slice(0, 8)}`}
                </Badge>
                {amountInfo.isDueAmount && (
                  <Badge variant="secondary" className="text-xs">
                    Outstanding: {currency} {amountInfo.dueAmount.toFixed(2)} of {amountInfo.totalAmount.toFixed(2)}
                  </Badge>
                )}
                {quote.product_name && (
                  <Badge variant="outline" className="text-xs">
                    {quote.product_name.length > 30 ? `${quote.product_name.slice(0, 30)}...` : quote.product_name}
                  </Badge>
                )}
                {quote.destination_country && quote.destination_country !== quote.origin_country && (
                  <Badge variant="outline" className="text-xs">
                    Ship to: {quote.destination_country}
                  </Badge>
                )}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        {!createdLink ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
                <TabsTrigger value="custom">Custom Fields</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              <div className="max-h-[50vh] overflow-y-auto">
                {/* Basic Information Tab */}
                <TabsContent value="basic" className="space-y-4">
                  {/* Smart Prefill Info */}
                  {quote && (
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-2">
                          <Shield className="w-4 h-4 text-green-600 mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-green-900">
                              Information Auto-filled from Order
                            </p>
                            <div className="text-xs text-green-700 space-y-1">
                              <p>✓ Customer details from {quote.shipping_address ? 'shipping address' : 'user profile'}</p>
                              <p>✓ Smart description based on product: {quote.product_name || 'order details'}</p>
                              <p>✓ Expiry optimized for {quote.priority || 'normal'} priority order</p>
                              {amountInfo.isDueAmount && (
                                <p>✓ Amount set to outstanding balance (${currency} {amount.toFixed(2)} of ${amountInfo.totalAmount.toFixed(2)})</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="api-method">API Method</Label>
                      <Select
                        value={formData.apiMethod}
                        onValueChange={(value: any) => setFormData({ ...formData, apiMethod: value })}
                      >
                        <SelectTrigger id="api-method">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rest">
                            <div className="flex items-center gap-2">
                              <Zap className="w-4 h-4" />
                              Enhanced REST API (Recommended)
                            </div>
                          </SelectItem>
                          <SelectItem value="legacy">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4" />
                              Legacy Invoice API
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {formData.apiMethod === 'rest' 
                          ? 'Uses PayU\'s latest REST API with enhanced features'
                          : 'Uses traditional create_invoice API (fallback)'
                        }
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Customer Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="email">Customer Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="phone">Customer Phone</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="expiryDays">Link Expiry</Label>
                        <Select
                          value={formData.expiryDays}
                          onValueChange={(value) => setFormData({ ...formData, expiryDays: value })}
                        >
                          <SelectTrigger id="expiryDays">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 day</SelectItem>
                            <SelectItem value="3">3 days</SelectItem>
                            <SelectItem value="7">7 days</SelectItem>
                            <SelectItem value="14">14 days</SelectItem>
                            <SelectItem value="30">30 days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Payment for order..."
                        rows={2}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Advanced Options Tab */}
                <TabsContent value="advanced" className="space-y-4">
                  <div className="grid gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Payment Options</CardTitle>
                        <CardDescription>Configure payment behavior</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Allow Partial Payments</Label>
                            <p className="text-xs text-muted-foreground">
                              Let customers pay in installments
                            </p>
                          </div>
                          <Switch
                            checked={formData.partialPaymentAllowed}
                            onCheckedChange={(checked) => 
                              setFormData({ ...formData, partialPaymentAllowed: checked })
                            }
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Template Selection</CardTitle>
                        <CardDescription>Choose payment page appearance</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Select
                          value={formData.template}
                          onValueChange={(value: any) => setFormData({ ...formData, template: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Default Template</SelectItem>
                            <SelectItem value="minimal">Minimal Template</SelectItem>
                            <SelectItem value="branded">Branded Template</SelectItem>
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Custom Fields Tab */}
                <TabsContent value="custom" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Custom Form Fields</h4>
                        <p className="text-xs text-muted-foreground">
                          Add custom fields to collect additional information
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {suggestedFields.length > 0 && formData.apiMethod === 'rest' && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowSuggestedFields(!showSuggestedFields)}
                          >
                            <Settings className="w-4 h-4 mr-1" />
                            Suggestions ({suggestedFields.length})
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addCustomField}
                          disabled={formData.apiMethod === 'legacy'}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Field
                        </Button>
                      </div>
                    </div>

                    {/* Suggested Fields */}
                    {showSuggestedFields && suggestedFields.length > 0 && formData.apiMethod === 'rest' && (
                      <Card className="bg-blue-50 border-blue-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            Suggested Fields for This Order
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Based on order details, we suggest these fields to improve customer experience
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {suggestedFields.map((field, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                              <div className="space-y-1">
                                <div className="text-sm font-medium">{field.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {field.type} field • {field.required ? 'Required' : 'Optional'}
                                  {field.options && ` • ${field.options.length} options`}
                                </div>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => addSuggestedField(field)}
                                disabled={customFields.some(f => f.name === field.name)}
                              >
                                {customFields.some(f => f.name === field.name) ? 'Added' : 'Add'}
                              </Button>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {formData.apiMethod === 'legacy' && (
                      <Card className="bg-amber-50 border-amber-200">
                        <CardContent className="pt-4">
                          <p className="text-sm text-amber-800">
                            Custom fields are only available with the Enhanced REST API method.
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {customFields.length === 0 && formData.apiMethod === 'rest' && (
                      <Card className="border-dashed">
                        <CardContent className="pt-6 text-center">
                          <p className="text-sm text-muted-foreground">
                            No custom fields added yet. Click "Add Field" to get started.
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {customFields.map((field, index) => (
                      <Card key={index} className="p-4">
                        <div className="grid gap-3">
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm font-medium">Field {index + 1}</h5>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCustomField(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Field Name</Label>
                              <Input
                                value={field.name}
                                onChange={(e) => updateCustomField(index, { name: e.target.value })}
                                placeholder="field_name"
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Field Type</Label>
                              <Select
                                value={field.type}
                                onValueChange={(value: any) => updateCustomField(index, { type: value })}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">Text</SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="email">Email</SelectItem>
                                  <SelectItem value="phone">Phone</SelectItem>
                                  <SelectItem value="date">Date</SelectItem>
                                  <SelectItem value="dropdown">Dropdown</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Display Label</Label>
                              <Input
                                value={field.label}
                                onChange={(e) => updateCustomField(index, { label: e.target.value })}
                                placeholder="Field Label"
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Placeholder</Label>
                              <Input
                                value={field.placeholder || ''}
                                onChange={(e) => updateCustomField(index, { placeholder: e.target.value })}
                                placeholder="Enter placeholder..."
                                className="h-8"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={field.required}
                                onCheckedChange={(checked) => updateCustomField(index, { required: checked })}
                              />
                              <Label className="text-xs">Required</Label>
                            </div>
                          </div>

                          {field.type === 'dropdown' && (
                            <div>
                              <Label className="text-xs">Options (comma-separated)</Label>
                              <Input
                                value={field.options?.join(', ') || ''}
                                onChange={(e) => updateCustomField(index, { 
                                  options: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                                })}
                                placeholder="Option 1, Option 2, Option 3"
                                className="h-8"
                              />
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Preview Tab */}
                <TabsContent value="preview" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Payment Link Preview
                      </CardTitle>
                      <CardDescription>
                        Review your payment link configuration
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <strong>API Method:</strong> {getApiMethodBadge(formData.apiMethod)}
                        </div>
                        <div>
                          <strong>Template:</strong> {getTemplateBadge(formData.template)}
                        </div>
                        <div>
                          <strong>Amount:</strong> {currency} {amount.toFixed(2)}
                        </div>
                        <div>
                          <strong>Expires:</strong> {formData.expiryDays} days
                        </div>
                        <div>
                          <strong>Partial Payment:</strong> {formData.partialPaymentAllowed ? 'Allowed' : 'Not allowed'}
                        </div>
                        <div>
                          <strong>Custom Fields:</strong> {customFields.length} field(s)
                        </div>
                      </div>

                      {customFields.length > 0 && (
                        <div>
                          <h5 className="font-medium text-sm mb-2">Custom Fields:</h5>
                          <div className="space-y-1">
                            {customFields.map((field, index) => (
                              <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                                <span className="font-medium">{field.label}</span>
                                <span className="text-muted-foreground ml-2">
                                  ({field.type}{field.required ? ', required' : ''})
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-800 text-sm">
                          <Smartphone className="w-4 h-4" />
                          <span>Mobile-optimized payment experience</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Payment Link'
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium text-green-900">Payment Link Created!</h4>
                {getApiMethodBadge(createdLink.apiVersion?.includes('rest') ? 'rest' : 'legacy')}
                {createdLink.fallbackUsed && (
                  <Badge variant="outline" className="text-orange-600">Fallback Used</Badge>
                )}
              </div>
              <p className="text-sm text-green-700">
                {createdLink.apiVersion?.includes('rest') 
                  ? 'Enhanced payment link with advanced features created successfully.'
                  : 'Legacy payment link created successfully.'
                }
              </p>
              {createdLink.features && (
                <div className="mt-2 flex gap-2">
                  {createdLink.features.customFields && (
                    <Badge variant="outline" className="text-xs">Custom Fields</Badge>
                  )}
                  {createdLink.features.partialPayment && (
                    <Badge variant="outline" className="text-xs">Partial Payment</Badge>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Payment Link</Label>
                <div className="flex gap-2">
                  <Input value={createdLink.paymentUrl || ''} readOnly />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(createdLink.paymentUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => window.open(createdLink.paymentUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Short Link</Label>
                <div className="flex gap-2">
                  <Input value={createdLink.shortUrl || ''} readOnly />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(createdLink.shortUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Details</Label>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p>Amount: ₹{createdLink.amountInINR} INR</p>
                  {createdLink.originalCurrency !== 'INR' && (
                    <p>Original: {createdLink.originalCurrency} {createdLink.originalAmount}</p>
                  )}
                  <p>Expires: {new Date(createdLink.expiresAt).toLocaleDateString()}</p>
                  <p>Link Code: {createdLink.linkCode}</p>
                  {createdLink.exchangeRate && createdLink.exchangeRate !== 1 && (
                    <p>Exchange Rate: {createdLink.exchangeRate.toFixed(2)}</p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                Create Another
              </Button>
              <Button type="button" onClick={() => setOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}