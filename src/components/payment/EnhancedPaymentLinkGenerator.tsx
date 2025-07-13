import React, { useState } from 'react';
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
  onLinkCreated?: (link: any) => void;
}

export function EnhancedPaymentLinkGenerator({
  quoteId,
  amount,
  currency,
  customerInfo,
  onLinkCreated,
}: EnhancedPaymentLinkGeneratorProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  
  // Form state
  const [formData, setFormData] = useState({
    name: customerInfo?.name || '',
    email: customerInfo?.email || '',
    phone: customerInfo?.phone || '',
    description: '',
    expiryDays: '7',
    template: 'default' as 'default' | 'minimal' | 'branded',
    partialPaymentAllowed: false,
    apiMethod: 'rest' as 'rest' | 'legacy',
  });

  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [createdLink, setCreatedLink] = useState<any>(null);

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
    setFormData({
      name: customerInfo?.name || '',
      email: customerInfo?.email || '',
      phone: customerInfo?.phone || '',
      description: '',
      expiryDays: '7',
      template: 'default',
      partialPaymentAllowed: false,
      apiMethod: 'rest',
    });
    setActiveTab('basic');
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
          <DialogDescription>
            Generate a payment link for {currency} {amount.toFixed(2)} with advanced features
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