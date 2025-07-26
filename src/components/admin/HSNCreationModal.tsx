import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Package, Plus, X, Tags } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { unifiedDataEngine } from '@/services/UnifiedDataEngine';

interface HSNCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (hsnData: any) => void;
  initialData?: {
    product_name?: string;
    weight?: number;
    category?: string;
    hsn_code?: string;
  };
  mode?: 'create' | 'edit';
  editingHSN?: any;
}

interface HSNFormData {
  hsn_code: string;
  description: string;
  category: string;
  subcategory?: string;
  keywords: string[];
  weight_min: string;
  weight_avg: string;
  weight_max: string;
  packaging_weight?: string;
  customs_rate?: string;
  import_duty_rate?: string;
  excise_tax_rate?: string;
  gst_rate?: string;
  vat_rate?: string;
  state_tax_rate?: string;
  local_tax_rate?: string;
  pst_rate?: string;
  service_tax_rate?: string;
  cess_rate?: string;
  minimum_valuation_usd?: string;
  requires_currency_conversion: boolean;
  is_active: boolean;
}

export const HSNCreationModal: React.FC<HSNCreationModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  initialData,
  mode = 'create',
  editingHSN,
}) => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Array<{ value: string; label: string }>>([]);
  const [showCategoryCreateModal, setShowCategoryCreateModal] = useState(false);
  const [newCategoryData, setNewCategoryData] = useState<any>(null);
  const [keywordInput, setKeywordInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<HSNFormData>({
    hsn_code: '',
    description: '',
    category: '',
    subcategory: '',
    keywords: [],
    weight_min: '',
    weight_avg: '',
    weight_max: '',
    packaging_weight: '',
    customs_rate: '',
    import_duty_rate: '',
    excise_tax_rate: '',
    gst_rate: '',
    vat_rate: '',
    state_tax_rate: '',
    local_tax_rate: '',
    pst_rate: '',
    service_tax_rate: '',
    cess_rate: '',
    minimum_valuation_usd: '',
    requires_currency_conversion: false,
    is_active: true,
  });

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Initialize form with initial data or editing data
  useEffect(() => {
    if (mode === 'edit' && editingHSN) {
      setFormData({
        hsn_code: editingHSN.hsn_code || '',
        description: editingHSN.description || '',
        category: editingHSN.category || '',
        subcategory: editingHSN.subcategory || '',
        keywords: editingHSN.keywords || [],
        weight_min: editingHSN.weight_data?.typical_weights?.per_unit?.min?.toString() || '',
        weight_avg: editingHSN.weight_data?.typical_weights?.per_unit?.average?.toString() || '',
        weight_max: editingHSN.weight_data?.typical_weights?.per_unit?.max?.toString() || '',
        packaging_weight: editingHSN.weight_data?.typical_weights?.packaging?.additional_weight?.toString() || '',
        customs_rate: editingHSN.tax_data?.typical_rates?.customs?.common?.toString() || '',
        import_duty_rate: editingHSN.tax_data?.typical_rates?.import_duty?.standard?.toString() || '',
        excise_tax_rate: editingHSN.tax_data?.typical_rates?.excise_tax?.federal?.toString() || '',
        gst_rate: editingHSN.tax_data?.typical_rates?.gst?.standard?.toString() || '',
        vat_rate: editingHSN.tax_data?.typical_rates?.vat?.common?.toString() || '',
        state_tax_rate: editingHSN.tax_data?.typical_rates?.sales_tax?.state?.toString() || '',
        local_tax_rate: editingHSN.tax_data?.typical_rates?.sales_tax?.local?.toString() || '',
        pst_rate: editingHSN.tax_data?.typical_rates?.pst?.provincial?.toString() || '',
        service_tax_rate: editingHSN.tax_data?.typical_rates?.service_tax?.standard?.toString() || '',
        cess_rate: editingHSN.tax_data?.typical_rates?.cess?.additional?.toString() || '',
        minimum_valuation_usd: editingHSN.minimum_valuation_usd?.toString() || '',
        requires_currency_conversion: editingHSN.requires_currency_conversion || false,
        is_active: editingHSN.is_active !== false,
      });
    } else if (initialData) {
      setFormData((prev) => ({
        ...prev,
        hsn_code: initialData.hsn_code || '',
        category: initialData.category || '',
        weight_avg: initialData.weight?.toString() || '',
      }));
    }
  }, [mode, editingHSN, initialData]);

  const loadCategories = async () => {
    try {
      const loadedCategories = await unifiedDataEngine.getAllCategories();
      setCategories(loadedCategories);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !formData.keywords.includes(keywordInput.trim())) {
      setFormData({
        ...formData,
        keywords: [...formData.keywords, keywordInput.trim()],
      });
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData({
      ...formData,
      keywords: formData.keywords.filter((k) => k !== keyword),
    });
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.hsn_code || !formData.description || !formData.category) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please fill in HSN code, description, and category.',
        variant: 'destructive',
      });
      return;
    }

    // Validate HSN code length
    if (formData.hsn_code.length < 6 || formData.hsn_code.length > 8) {
      toast({
        title: 'Invalid HSN Code',
        description: 'HSN code must be 6-8 digits long.',
        variant: 'destructive',
      });
      return;
    }

    // Validate HSN code is numeric
    if (!/^\d+$/.test(formData.hsn_code)) {
      toast({
        title: 'Invalid HSN Code',
        description: 'HSN code must contain only numbers.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Prepare data for database
      const hsnData = {
        hsn_code: formData.hsn_code,
        description: formData.description,
        category: formData.category,
        subcategory: formData.subcategory || null,
        keywords: formData.keywords,
        minimum_valuation_usd: formData.minimum_valuation_usd ? parseFloat(formData.minimum_valuation_usd) : null,
        requires_currency_conversion: formData.requires_currency_conversion,
        weight_data: {
          typical_weights: {
            per_unit: {
              min: formData.weight_min ? parseFloat(formData.weight_min) : null,
              max: formData.weight_max ? parseFloat(formData.weight_max) : null,
              average: formData.weight_avg ? parseFloat(formData.weight_avg) : null,
            },
            packaging: formData.packaging_weight ? {
              additional_weight: parseFloat(formData.packaging_weight)
            } : null,
          },
        },
        tax_data: {
          typical_rates: {
            customs: {
              common: formData.customs_rate ? parseFloat(formData.customs_rate) : 0,
            },
            import_duty: {
              standard: formData.import_duty_rate ? parseFloat(formData.import_duty_rate) : 0,
            },
            excise_tax: {
              federal: formData.excise_tax_rate ? parseFloat(formData.excise_tax_rate) : 0,
            },
            gst: {
              standard: formData.gst_rate ? parseFloat(formData.gst_rate) : 0,
            },
            vat: {
              common: formData.vat_rate ? parseFloat(formData.vat_rate) : 0,
            },
            sales_tax: {
              state: formData.state_tax_rate ? parseFloat(formData.state_tax_rate) : 0,
              local: formData.local_tax_rate ? parseFloat(formData.local_tax_rate) : 0,
            },
            pst: {
              provincial: formData.pst_rate ? parseFloat(formData.pst_rate) : 0,
            },
            service_tax: {
              standard: formData.service_tax_rate ? parseFloat(formData.service_tax_rate) : 0,
            },
            cess: {
              additional: formData.cess_rate ? parseFloat(formData.cess_rate) : 0,
            },
          },
        },
        classification_data: {
          keywords: formData.keywords,
          product_types: [],
        },
        is_active: formData.is_active,
      };

      if (mode === 'edit') {
        // Update existing HSN
        const { error } = await supabase
          .from('hsn_master')
          .update(hsnData)
          .eq('hsn_code', formData.hsn_code);

        if (error) throw error;

        toast({
          title: 'HSN Code Updated',
          description: `HSN ${formData.hsn_code} has been updated successfully.`,
        });
      } else {
        // Create new HSN
        const { error } = await supabase
          .from('hsn_master')
          .insert([hsnData]);

        if (error) throw error;

        toast({
          title: 'HSN Code Created',
          description: `HSN ${formData.hsn_code} has been created successfully.`,
        });
      }

      // Clear cache to ensure fresh data
      unifiedDataEngine.clearAllCache();

      if (onSuccess) {
        onSuccess(hsnData);
      }

      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving HSN:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save HSN code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      hsn_code: '',
      description: '',
      category: '',
      subcategory: '',
      keywords: [],
      weight_min: '',
      weight_avg: '',
      weight_max: '',
      packaging_weight: '',
      customs_rate: '',
      import_duty_rate: '',
      excise_tax_rate: '',
      gst_rate: '',
      vat_rate: '',
      state_tax_rate: '',
      local_tax_rate: '',
      pst_rate: '',
      service_tax_rate: '',
      cess_rate: '',
      minimum_valuation_usd: '',
      requires_currency_conversion: false,
      is_active: true,
    });
    setKeywordInput('');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {mode === 'edit' ? 'Edit HSN Code' : 'Add New HSN Code'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'edit' 
                ? 'Update HSN code information, tax rates, and weight data.'
                : 'Create a new HSN code entry with tax and weight information.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hsn_code">HSN Code</Label>
                <Input 
                  id="hsn_code"
                  value={formData.hsn_code}
                  onChange={(e) => setFormData({...formData, hsn_code: e.target.value})}
                  placeholder="e.g., 851762"
                  disabled={mode === 'edit'}
                  minLength={6}
                  maxLength={8}
                  pattern="[0-9]{6,8}"
                  title="HSN code must be 6-8 digits"
                />
              </div>
              <div>
                <Label htmlFor="hsn_category">Category</Label>
                <Select 
                  value={formData.category}
                  onValueChange={(value) => setFormData({...formData, category: value})}
                >
                  <SelectTrigger id="hsn_category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                    <div className="border-t border-gray-200 mt-1 pt-1">
                      <button
                        className="w-full px-2 py-1.5 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 rounded"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setNewCategoryData({
                            name: '',
                            description: '',
                            keywords: []
                          });
                          setShowCategoryCreateModal(true);
                        }}
                      >
                        <Plus className="w-3 h-3" />
                        Add New Category
                      </button>
                    </div>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="hsn_description">Description</Label>
              <Textarea 
                id="hsn_description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Detailed description of the HSN code"
                rows={2}
              />
            </div>
            
            {/* Weight Information */}
            <div>
              <Label className="text-base font-semibold mb-2 block">Weight Information (kg)</Label>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label htmlFor="weight_min" className="text-sm">Min Weight</Label>
                  <Input 
                    id="weight_min"
                    type="number"
                    step="0.001"
                    value={formData.weight_min}
                    onChange={(e) => setFormData({...formData, weight_min: e.target.value})}
                    placeholder="0.1"
                  />
                </div>
                <div>
                  <Label htmlFor="weight_avg" className="text-sm">Avg Weight</Label>
                  <Input 
                    id="weight_avg"
                    type="number"
                    step="0.001"
                    value={formData.weight_avg}
                    onChange={(e) => setFormData({...formData, weight_avg: e.target.value})}
                    placeholder="0.5"
                  />
                </div>
                <div>
                  <Label htmlFor="weight_max" className="text-sm">Max Weight</Label>
                  <Input 
                    id="weight_max"
                    type="number"
                    step="0.001"
                    value={formData.weight_max}
                    onChange={(e) => setFormData({...formData, weight_max: e.target.value})}
                    placeholder="1.0"
                  />
                </div>
                <div>
                  <Label htmlFor="packaging_weight" className="text-sm">Packaging</Label>
                  <Input 
                    id="packaging_weight"
                    type="number"
                    step="0.001"
                    value={formData.packaging_weight}
                    onChange={(e) => setFormData({...formData, packaging_weight: e.target.value})}
                    placeholder="0.05"
                  />
                </div>
              </div>
            </div>
            
            {/* Tax Rates */}
            <div>
              <Label className="text-base font-semibold mb-2 block">Tax Rates (%)</Label>
              <div className="space-y-4">
                {/* Core Tax Types */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Core Taxes</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="customs_rate" className="text-xs">Customs Duty</Label>
                      <Input 
                        id="customs_rate"
                        type="number"
                        step="0.1"
                        value={formData.customs_rate}
                        onChange={(e) => setFormData({...formData, customs_rate: e.target.value})}
                        placeholder="10.0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="import_duty_rate" className="text-xs">Import Duty</Label>
                      <Input 
                        id="import_duty_rate"
                        type="number"
                        step="0.1"
                        value={formData.import_duty_rate || ''}
                        onChange={(e) => setFormData({...formData, import_duty_rate: e.target.value})}
                        placeholder="5.0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="excise_tax_rate" className="text-xs">Excise Tax</Label>
                      <Input 
                        id="excise_tax_rate"
                        type="number"
                        step="0.1"
                        value={formData.excise_tax_rate || ''}
                        onChange={(e) => setFormData({...formData, excise_tax_rate: e.target.value})}
                        placeholder="3.0"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Regional Tax Types */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Regional Taxes</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="gst_rate" className="text-xs">GST (India)</Label>
                      <Input 
                        id="gst_rate"
                        type="number"
                        step="0.1"
                        value={formData.gst_rate}
                        onChange={(e) => setFormData({...formData, gst_rate: e.target.value})}
                        placeholder="18.0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="vat_rate" className="text-xs">VAT (Europe/Nepal)</Label>
                      <Input 
                        id="vat_rate"
                        type="number"
                        step="0.1"
                        value={formData.vat_rate || ''}
                        onChange={(e) => setFormData({...formData, vat_rate: e.target.value})}
                        placeholder="13.0"
                      />
                    </div>
                  </div>
                </div>
                
                {/* US Tax Types */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">US Taxes</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="state_tax_rate" className="text-xs">State Sales Tax</Label>
                      <Input 
                        id="state_tax_rate"
                        type="number"
                        step="0.1"
                        value={formData.state_tax_rate || ''}
                        onChange={(e) => setFormData({...formData, state_tax_rate: e.target.value})}
                        placeholder="6.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="local_tax_rate" className="text-xs">Local Sales Tax</Label>
                      <Input 
                        id="local_tax_rate"
                        type="number"
                        step="0.1"
                        value={formData.local_tax_rate || ''}
                        onChange={(e) => setFormData({...formData, local_tax_rate: e.target.value})}
                        placeholder="2.5"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Additional Tax Types */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Additional Taxes</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="pst_rate" className="text-xs">PST (Canada)</Label>
                      <Input 
                        id="pst_rate"
                        type="number"
                        step="0.1"
                        value={formData.pst_rate || ''}
                        onChange={(e) => setFormData({...formData, pst_rate: e.target.value})}
                        placeholder="7.0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="service_tax_rate" className="text-xs">Service Tax</Label>
                      <Input 
                        id="service_tax_rate"
                        type="number"
                        step="0.1"
                        value={formData.service_tax_rate || ''}
                        onChange={(e) => setFormData({...formData, service_tax_rate: e.target.value})}
                        placeholder="5.0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cess_rate" className="text-xs">CESS (India)</Label>
                      <Input 
                        id="cess_rate"
                        type="number"
                        step="0.1"
                        value={formData.cess_rate || ''}
                        onChange={(e) => setFormData({...formData, cess_rate: e.target.value})}
                        placeholder="1.0"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Minimum Valuation */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="minimum_valuation" className="text-xs">Minimum Valuation (USD)</Label>
                    <Input 
                      id="minimum_valuation"
                      type="number"
                      step="0.01"
                      value={formData.minimum_valuation_usd}
                      onChange={(e) => setFormData({...formData, minimum_valuation_usd: e.target.value})}
                      placeholder="100"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.requires_currency_conversion}
                        onCheckedChange={(checked) => 
                          setFormData({...formData, requires_currency_conversion: checked})
                        }
                      />
                      <Label className="text-sm">Requires currency conversion</Label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Enter tax rates as percentages. Only fill in rates applicable to your target markets. Leave others at 0.
              </div>
            </div>
            
            {/* Keywords */}
            <div>
              <Label htmlFor="keywords">Keywords</Label>
              <div className="flex gap-2 mb-2">
                <Input 
                  id="keywords"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="Add keyword and press Enter"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addKeyword();
                    }
                  }}
                />
                <Button 
                  type="button" 
                  onClick={addKeyword}
                  size="sm"
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.keywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="flex items-center gap-1">
                    {keyword}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => removeKeyword(keyword)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* Additional Options */}
            <div className="flex items-center justify-end">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => 
                    setFormData({...formData, is_active: checked})
                  }
                />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting 
                ? 'Saving...' 
                : mode === 'edit' ? 'Update HSN' : 'Create HSN'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Creation Modal */}
      <Dialog open={showCategoryCreateModal} onOpenChange={setShowCategoryCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tags className="w-5 h-5" />
              Add New Category
            </DialogTitle>
            <DialogDescription>
              Create a new product category. This will be added to the category list for future use.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="category_name">Category Name</Label>
              <Input 
                id="category_name"
                value={newCategoryData?.name || ''}
                onChange={(e) => setNewCategoryData({...newCategoryData, name: e.target.value})}
                placeholder="e.g., Automotive, Pet Supplies"
              />
            </div>
            
            <div>
              <Label htmlFor="category_description">Description (Optional)</Label>
              <Input 
                id="category_description"
                value={newCategoryData?.description || ''}
                onChange={(e) => setNewCategoryData({...newCategoryData, description: e.target.value})}
                placeholder="Brief description of this category"
              />
            </div>
            
            <div>
              <Label htmlFor="category_keywords">Keywords (Optional)</Label>
              <Input 
                id="category_keywords"
                value={newCategoryData?.keywords?.join(', ') || ''}
                onChange={(e) => {
                  const keywordsList = e.target.value.split(',').map(k => k.trim()).filter(k => k);
                  setNewCategoryData({...newCategoryData, keywords: keywordsList});
                }}
                placeholder="keyword1, keyword2, keyword3"
              />
              <p className="text-xs text-gray-500 mt-1">
                Comma-separated keywords to help classify products
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={async () => {
              if (!newCategoryData?.name?.trim()) {
                toast({
                  title: 'Category name required',
                  description: 'Please enter a name for the category.',
                  variant: 'destructive'
                });
                return;
              }
              
              // Create category value from name
              const categoryValue = newCategoryData.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
              
              // Add to categories list
              const newCategory = {
                value: categoryValue,
                label: newCategoryData.name
              };
              setCategories([...categories, newCategory]);
              
              // Auto-select the new category
              setFormData({...formData, category: categoryValue});
              
              toast({
                title: 'Category Added',
                description: `"${newCategoryData.name}" has been added to the category list.`,
                variant: 'default'
              });
              
              setShowCategoryCreateModal(false);
              setNewCategoryData(null);
            }}>
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};