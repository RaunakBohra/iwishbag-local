import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Globe, 
  Settings,
  Edit,
  Plus,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Percent,
  Hash,
  RefreshCw,
  Eye,
  Package
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { smartManagementService, CountryConfigForm } from '@/services/SmartManagementService';
import { CountryConfig } from '@/services/ProductIntelligenceService';

const CountrySettingsManager: React.FC = () => {
  const [countries, setCountries] = useState<CountryConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCountry, setEditingCountry] = useState<CountryConfig | null>(null);
  const [classificationCounts, setClassificationCounts] = useState<Record<string, number>>({});

  const [formData, setFormData] = useState<CountryConfigForm>({
    country_code: '',
    country_name: '',
    classification_system: 'HS',
    classification_digits: 4,
    default_customs_rate: 15.00,
    default_local_tax_rate: 13.00,
    local_tax_name: 'VAT',
    enable_weight_estimation: true,
    enable_category_suggestions: true,
    enable_customs_valuation_override: true,
  });

  useEffect(() => {
    loadCountries();
  }, []);

  const loadCountries = async () => {
    try {
      setLoading(true);
      const [countriesData, statsData] = await Promise.all([
        smartManagementService.getCountryConfigs(),
        smartManagementService.getSystemStats()
      ]);
      
      setCountries(countriesData);
      setClassificationCounts(statsData.classificationsByCountry);
    } catch (error) {
      console.error('Error loading countries:', error);
      toast({
        title: "Error Loading Countries",
        description: "Failed to load country configurations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCountry) {
        await smartManagementService.updateCountryConfig(editingCountry.country_code, formData);
        toast({
          title: "Success",
          description: "Country configuration updated successfully",
        });
        setShowEditModal(false);
      } else {
        await smartManagementService.createCountryConfig(formData);
        toast({
          title: "Success",
          description: "Country configuration created successfully",
        });
        setShowAddModal(false);
      }

      resetForm();
      loadCountries();
    } catch (error: any) {
      console.error('Error saving country:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save country configuration",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (country: CountryConfig) => {
    setEditingCountry(country);
    setFormData({
      country_code: country.country_code,
      country_name: country.country_name,
      classification_system: country.classification_system as 'HSN' | 'HS' | 'HTS',
      classification_digits: country.classification_digits,
      default_customs_rate: country.default_customs_rate,
      default_local_tax_rate: country.default_local_tax_rate,
      local_tax_name: country.local_tax_name,
      enable_weight_estimation: country.enable_weight_estimation,
      enable_category_suggestions: country.enable_category_suggestions,
      enable_customs_valuation_override: country.enable_customs_valuation_override,
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      country_code: '',
      country_name: '',
      classification_system: 'HS',
      classification_digits: 4,
      default_customs_rate: 15.00,
      default_local_tax_rate: 13.00,
      local_tax_name: 'VAT',
      enable_weight_estimation: true,
      enable_category_suggestions: true,
      enable_customs_valuation_override: true,
    });
    setEditingCountry(null);
  };

  const getSystemIcon = (system: string) => {
    switch (system) {
      case 'HSN': return '🇮🇳';
      case 'HS': return '🌍';
      case 'HTS': return '🇺🇸';
      default: return '📋';
    }
  };

  const getSystemDescription = (system: string) => {
    switch (system) {
      case 'HSN': return 'Harmonized System of Nomenclature (India)';
      case 'HS': return 'Harmonized System (International)';
      case 'HTS': return 'Harmonized Tariff Schedule (USA)';
      default: return 'Unknown classification system';
    }
  };

  const viewCountryClassifications = (countryCode: string) => {
    // Navigate to classifications page with country filter
    window.location.href = `/admin/product-classifications?country=${countryCode}`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="h-8 w-8 text-green-600" />
            Country Settings Manager
          </h1>
          <p className="text-gray-600 mt-1">
            Configure countries, tax systems, and classification standards
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadCountries} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Country
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Countries</p>
                <p className="text-2xl font-bold text-green-600">{countries.length}</p>
              </div>
              <Globe className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Countries with Data</p>
                <p className="text-2xl font-bold text-blue-600">
                  {Object.keys(classificationCounts).length}
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Classification Systems</p>
                <p className="text-2xl font-bold text-purple-600">
                  {new Set(countries.map(c => c.classification_system)).size}
                </p>
              </div>
              <Settings className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Countries Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <p className="ml-3 text-gray-600">Loading countries...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {countries.map((country) => (
            <Card key={country.country_code} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {getSystemIcon(country.classification_system)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{country.country_name}</CardTitle>
                      <CardDescription className="text-sm">
                        {country.country_code} • {country.classification_system}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge 
                    variant={classificationCounts[country.country_code] > 0 ? "default" : "secondary"}
                    className={classificationCounts[country.country_code] > 0 ? "bg-green-100 text-green-800" : ""}
                  >
                    {classificationCounts[country.country_code] || 0} items
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Classification System */}
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Classification System</span>
                    <Badge variant="outline">
                      {country.classification_system} ({country.classification_digits} digits)
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {getSystemDescription(country.classification_system)}
                  </p>
                </div>

                <Separator />

                {/* Tax & Customs */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Customs Rate
                    </span>
                    <span className="font-medium">{country.default_customs_rate}%</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-1">
                      <Percent className="h-3 w-3" />
                      {country.local_tax_name}
                    </span>
                    <span className="font-medium">{country.default_local_tax_rate}%</span>
                  </div>
                </div>

                <Separator />

                {/* Features */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Features Enabled</p>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span>Weight Estimation</span>
                      {country.enable_weight_estimation ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Category Suggestions</span>
                      {country.enable_category_suggestions ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Customs Override</span>
                      {country.enable_customs_valuation_override ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleEdit(country)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  
                  {classificationCounts[country.country_code] > 0 && (
                    <Button
                      onClick={() => viewCountryClassifications(country.country_code)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Data
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showAddModal || showEditModal} onOpenChange={(open) => {
        if (!open) {
          setShowAddModal(false);
          setShowEditModal(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingCountry ? 'Edit Country Configuration' : 'Add New Country'}
            </DialogTitle>
            <DialogDescription>
              {editingCountry 
                ? 'Update the country settings and classification system' 
                : 'Configure a new country for smart product intelligence'
              }
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="country_code">Country Code *</Label>
                <Input
                  id="country_code"
                  value={formData.country_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, country_code: e.target.value.toUpperCase() }))}
                  placeholder="US"
                  maxLength={2}
                  disabled={!!editingCountry}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">2-letter ISO code</p>
              </div>

              <div>
                <Label htmlFor="country_name">Country Name *</Label>
                <Input
                  id="country_name"
                  value={formData.country_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, country_name: e.target.value }))}
                  placeholder="United States"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="classification_system">Classification System *</Label>
                <Select
                  value={formData.classification_system}
                  onValueChange={(value: 'HSN' | 'HS' | 'HTS') => 
                    setFormData(prev => ({ ...prev, classification_system: value }))
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select System" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HSN">HSN - Harmonized System of Nomenclature (India)</SelectItem>
                    <SelectItem value="HS">HS - Harmonized System (International)</SelectItem>
                    <SelectItem value="HTS">HTS - Harmonized Tariff Schedule (USA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="classification_digits">Code Digits *</Label>
                <Select
                  value={formData.classification_digits.toString()}
                  onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, classification_digits: parseInt(value) }))
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Digits" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 digits</SelectItem>
                    <SelectItem value="6">6 digits</SelectItem>
                    <SelectItem value="8">8 digits</SelectItem>
                    <SelectItem value="10">10 digits</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Tax & Customs Settings</h4>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="default_customs_rate">Default Customs Rate (%)</Label>
                  <Input
                    id="default_customs_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.default_customs_rate}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      default_customs_rate: parseFloat(e.target.value) || 0 
                    }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="default_local_tax_rate">Local Tax Rate (%)</Label>
                  <Input
                    id="default_local_tax_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.default_local_tax_rate}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      default_local_tax_rate: parseFloat(e.target.value) || 0 
                    }))}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="local_tax_name">Local Tax Name</Label>
                <Select
                  value={formData.local_tax_name}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, local_tax_name: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Tax Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VAT">VAT (Value Added Tax)</SelectItem>
                    <SelectItem value="GST">GST (Goods and Services Tax)</SelectItem>
                    <SelectItem value="Sales Tax">Sales Tax</SelectItem>
                    <SelectItem value="Import Tax">Import Tax</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Feature Settings</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enable_weight_estimation">Weight Estimation</Label>
                    <p className="text-xs text-gray-500">Enable AI-powered weight suggestions</p>
                  </div>
                  <Switch
                    id="enable_weight_estimation"
                    checked={formData.enable_weight_estimation}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, enable_weight_estimation: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enable_category_suggestions">Category Suggestions</Label>
                    <p className="text-xs text-gray-500">Enable smart category recommendations</p>
                  </div>
                  <Switch
                    id="enable_category_suggestions"
                    checked={formData.enable_category_suggestions}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, enable_category_suggestions: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enable_customs_valuation_override">Customs Valuation Override</Label>
                    <p className="text-xs text-gray-500">Allow minimum valuation adjustments</p>
                  </div>
                  <Switch
                    id="enable_customs_valuation_override"
                    checked={formData.enable_customs_valuation_override}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, enable_customs_valuation_override: checked }))
                    }
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingCountry ? 'Update' : 'Create'} Country
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CountrySettingsManager;