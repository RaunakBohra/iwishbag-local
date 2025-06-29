import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Globe,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MapPin
} from 'lucide-react';

interface CountrySettingsTabProps {
  settings: any;
  onUpdate: (settings: any) => void;
  isLoading: boolean;
}

export const CountrySettingsTab: React.FC<CountrySettingsTabProps> = ({
  settings,
  onUpdate,
  isLoading
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<any>(null);
  const [formData, setFormData] = useState({
    countryCode: '',
    countryName: '',
    isEnabled: true,
    autoQuoteEnabled: true,
    confidenceThreshold: 0.7,
    maxAutoApprovalAmount: 2000,
    defaultMarkup: 5.0,
    shippingMultiplier: 1.0,
    customsDutyRate: 0,
    vatRate: 0,
    restrictions: [],
    notes: ''
  });

  // Mock country data - in real app this would come from API
  const countries = [
    { code: 'US', name: 'United States', enabled: true, autoQuote: true },
    { code: 'CA', name: 'Canada', enabled: true, autoQuote: true },
    { code: 'GB', name: 'United Kingdom', enabled: true, autoQuote: false },
    { code: 'DE', name: 'Germany', enabled: true, autoQuote: true },
    { code: 'FR', name: 'France', enabled: false, autoQuote: false },
    { code: 'AU', name: 'Australia', enabled: true, autoQuote: true },
    { code: 'JP', name: 'Japan', enabled: true, autoQuote: false },
    { code: 'IN', name: 'India', enabled: true, autoQuote: true }
  ];

  const openAddDialog = () => {
    setEditingCountry(null);
    setFormData({
      countryCode: '',
      countryName: '',
      isEnabled: true,
      autoQuoteEnabled: true,
      confidenceThreshold: 0.7,
      maxAutoApprovalAmount: 2000,
      defaultMarkup: 5.0,
      shippingMultiplier: 1.0,
      customsDutyRate: 0,
      vatRate: 0,
      restrictions: [],
      notes: ''
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (country: any) => {
    setEditingCountry(country);
    setFormData({
      countryCode: country.code,
      countryName: country.name,
      isEnabled: country.enabled,
      autoQuoteEnabled: country.autoQuote,
      confidenceThreshold: 0.7,
      maxAutoApprovalAmount: 2000,
      defaultMarkup: 5.0,
      shippingMultiplier: 1.0,
      customsDutyRate: 0,
      vatRate: 0,
      restrictions: [],
      notes: ''
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    // In real app, this would update the settings
    console.log('Saving country settings:', formData);
    setIsDialogOpen(false);
  };

  const toggleCountryStatus = (countryCode: string, field: 'enabled' | 'autoQuote') => {
    // In real app, this would update the settings
    console.log('Toggling', field, 'for country:', countryCode);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Country Settings</h2>
          <p className="text-muted-foreground">
            Configure auto quote settings for different destination countries
          </p>
        </div>
        <Button onClick={openAddDialog} disabled={isLoading}>
          <Plus className="h-4 w-4 mr-2" />
          Add Country
        </Button>
      </div>

      {/* Country List */}
      <div className="grid gap-4">
        {countries.map((country) => (
          <Card key={country.code} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{country.name}</h3>
                    <Badge variant="outline" className="font-mono">
                      {country.code}
                    </Badge>
                    <Badge variant={country.enabled ? "default" : "secondary"}>
                      {country.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                    <Badge variant={country.autoQuote ? "default" : "outline"}>
                      {country.autoQuote ? "Auto Quote" : "Manual Only"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 text-muted-foreground mb-3">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">
                      Confidence: 70% • Max Auto: $2,000 • Markup: 5%
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      VAT: 0%
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Duty: 0%
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Shipping: 1.0x
                    </Badge>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(country)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Quick Toggles */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`enabled-${country.code}`}
                    checked={country.enabled}
                    onCheckedChange={() => toggleCountryStatus(country.code, 'enabled')}
                  />
                  <Label htmlFor={`enabled-${country.code}`} className="text-sm">
                    Enable Country
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`auto-quote-${country.code}`}
                    checked={country.autoQuote}
                    onCheckedChange={() => toggleCountryStatus(country.code, 'autoQuote')}
                    disabled={!country.enabled}
                  />
                  <Label htmlFor={`auto-quote-${country.code}`} className="text-sm">
                    Auto Quote
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {editingCountry ? 'Edit Country Settings' : 'Add Country Settings'}
            </DialogTitle>
            <DialogDescription>
              Configure auto quote settings for a specific country
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country-code">Country Code</Label>
                  <Input
                    id="country-code"
                    placeholder="e.g., US, CA, GB"
                    value={formData.countryCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, countryCode: e.target.value.toUpperCase() }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="country-name">Country Name</Label>
                  <Input
                    id="country-name"
                    placeholder="e.g., United States"
                    value={formData.countryName}
                    onChange={(e) => setFormData(prev => ({ ...prev, countryName: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enabled"
                    checked={formData.isEnabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isEnabled: checked }))}
                  />
                  <Label htmlFor="enabled">Enable Country</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-quote"
                    checked={formData.autoQuoteEnabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autoQuoteEnabled: checked }))}
                    disabled={!formData.isEnabled}
                  />
                  <Label htmlFor="auto-quote">Enable Auto Quotes</Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Auto Quote Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Auto Quote Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="confidence-threshold">Confidence Threshold</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Minimum confidence score for auto approval (0.0 - 1.0)
                  </p>
                  <Input
                    id="confidence-threshold"
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.confidenceThreshold}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      confidenceThreshold: parseFloat(e.target.value) || 0.7 
                    }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="max-auto-approval">Max Auto Approval Amount</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Maximum quote amount for automatic approval ($)
                  </p>
                  <Input
                    id="max-auto-approval"
                    type="number"
                    min="0"
                    value={formData.maxAutoApprovalAmount}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      maxAutoApprovalAmount: parseFloat(e.target.value) || 2000 
                    }))}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Pricing Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Pricing Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="default-markup">Default Markup (%)</Label>
                  <Input
                    id="default-markup"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.defaultMarkup}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      defaultMarkup: parseFloat(e.target.value) || 5.0 
                    }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="shipping-multiplier">Shipping Multiplier</Label>
                  <Input
                    id="shipping-multiplier"
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.shippingMultiplier}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      shippingMultiplier: parseFloat(e.target.value) || 1.0 
                    }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customs-duty">Customs Duty Rate (%)</Label>
                  <Input
                    id="customs-duty"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.customsDutyRate}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      customsDutyRate: parseFloat(e.target.value) || 0 
                    }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="vat-rate">VAT Rate (%)</Label>
                  <Input
                    id="vat-rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.vatRate}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      vatRate: parseFloat(e.target.value) || 0 
                    }))}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Notes</h3>
              <Textarea
                placeholder="Additional notes about this country's settings..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {editingCountry ? 'Update Settings' : 'Add Country'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 