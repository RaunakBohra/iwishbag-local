/**
 * Quote Calculator V2 (Refactored)
 * Clean, focused orchestrating component using decomposed services
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// Icons
import { 
  Plus, Trash2, Calculator, Save, Eye, Package, DollarSign, 
  Info, AlertCircle, Copy, Clock, Check, X, Settings,
  Scale, Truck, CreditCard, Shield, Loader2
} from 'lucide-react';

// Services
import { 
  QuoteFormStateService, 
  createQuoteFormState, 
  QuoteFormData, 
  QuoteItem 
} from '@/services/quote-calculator/QuoteFormState';
import { 
  quoteCalculationEngine, 
  QuoteCalculationData, 
  CalculationResult 
} from '@/services/quote-calculator/QuoteCalculationEngine';
import { 
  quoteValidationService, 
  ValidationResult 
} from '@/services/quote-calculator/QuoteValidationService';
import { 
  quoteDataService, 
  SaveResult 
} from '@/services/quote-calculator/QuoteDataService';

// Existing Components (reused)
import { QuoteBreakdownV2 } from '@/components/quotes-v2/QuoteBreakdownV2';
import { QuoteDetailsAnalysis } from '@/components/quotes-v2/QuoteDetailsAnalysis';
import { QuoteSendEmailSimple } from '@/components/admin/QuoteSendEmailSimple';
import QuoteReminderControls from '@/components/admin/QuoteReminderControls';
import { QuoteFileUpload } from '@/components/quotes-v2/QuoteFileUpload';
import { QuoteExportControls } from '@/components/quotes-v2/QuoteExportControls';
import { SmartSavingsWidget } from '@/components/quotes-v2/SmartSavingsWidget';
import { AdminDiscountControls } from '@/components/quotes-v2/AdminDiscountControls';
import { ShareQuoteButtonV2 } from '@/components/admin/ShareQuoteButtonV2';

// Hooks
import { usePurchaseCountries } from '@/hooks/usePurchaseCountries';
import { useCountryUnit } from '@/hooks/useCountryUnits';

// Utils
import { formatCountryDisplay, sortCountriesByPopularity } from '@/utils/countryUtils';
import { currencyService } from '@/services/CurrencyService';

interface QuoteCalculatorV2Props {
  // Optional props for testing or customization
  initialData?: Partial<QuoteFormData>;
  readOnly?: boolean;
  onSave?: (quoteId: string) => void;
  onCancel?: () => void;
}

export default function QuoteCalculatorV2({
  initialData,
  readOnly = false,
  onSave,
  onCancel
}: QuoteCalculatorV2Props) {
  const navigate = useNavigate();
  const { id: quoteId } = useParams();
  
  // State Management Service
  const [formStateService] = useState(() => createQuoteFormState(initialData));
  const [formData, setFormData] = useState<QuoteFormData>(formStateService.getState());
  
  // Component State
  const [calculation, setCalculation] = useState<QuoteCalculationData | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  
  // Refs
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const calculationTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Hooks
  const { countries } = usePurchaseCountries();
  const { currency: originCurrency, weightUnit } = useCountryUnit(formData.originCountry);
  const currencySymbol = currencyService.getCurrencySymbolSync(originCurrency);
  
  // Subscribe to form state changes
  useEffect(() => {
    const unsubscribe = formStateService.subscribe((newState) => {
      setFormData(newState);
      
      // Trigger auto-save if dirty
      if (newState.isDirty) {
        scheduleAutoSave();
      }
      
      // Trigger calculation if needed
      if (shouldRecalculate(newState)) {
        scheduleCalculation();
      }
    });

    return unsubscribe;
  }, []);

  // Load quote data on mount
  useEffect(() => {
    if (quoteId) {
      loadQuoteData(quoteId);
    }
  }, [quoteId]);

  // Auto-save functionality
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      await performAutoSave();
    }, 2000); // 2 second delay
  }, []);

  const performAutoSave = async () => {
    try {
      await quoteDataService.autoSave(formData);
      setLastAutoSave(new Date());
      formStateService.markClean();
      logger.debug('Auto-save completed');
    } catch (error) {
      logger.warn('Auto-save failed:', error);
    }
  };

  // Calculation functionality
  const scheduleCalculation = useCallback(() => {
    if (calculationTimeoutRef.current) {
      clearTimeout(calculationTimeoutRef.current);
    }

    calculationTimeoutRef.current = setTimeout(async () => {
      await performCalculation();
    }, 500); // 500ms delay for live updates
  }, [formData]);

  const performCalculation = async () => {
    if (isCalculating) return;

    setIsCalculating(true);
    
    try {
      const result: CalculationResult = await quoteCalculationEngine.calculateQuote(formData, {
        includeDiscounts: true,
        includeInsurance: true,
        validateInputs: true,
        enableCaching: true,
        includeShippingDetails: true
      });

      if (result.success && result.data) {
        setCalculation(result.data);
        
        // Clear any previous calculation errors
        formStateService.clearValidationError('calculation');
      } else {
        setCalculation(null);
        formStateService.setValidationError('calculation', result.error || 'Calculation failed');
        
        toast({
          variant: "destructive",
          title: "Calculation Error",
          description: result.error || 'Failed to calculate quote'
        });
      }
    } catch (error) {
      logger.error('Calculation error:', error);
      setCalculation(null);
      formStateService.setValidationError('calculation', 'Calculation service error');
    } finally {
      setIsCalculating(false);
    }
  };

  // Validation functionality
  const performValidation = useCallback(async () => {
    const validationResult = quoteValidationService.validate(formData, {
      validateAll: true,
      skipWarnings: false
    });
    
    setValidation(validationResult);
    
    // Update form state with validation errors
    formStateService.clearAllValidationErrors();
    validationResult.errors.forEach(error => {
      formStateService.setValidationError(error.field, error.message);
    });

    return validationResult;
  }, [formData]);

  // Data loading functionality
  const loadQuoteData = async (id: string) => {
    setIsLoading(true);
    
    try {
      const result = await quoteDataService.loadQuote(id, {
        includeCalculation: true
      });

      if (result.success && result.data) {
        formStateService.loadFormData(result.data.formData);
        
        if (result.data.calculationData) {
          setCalculation(result.data.calculationData);
        }
        
        toast({
          title: "Quote Loaded",
          description: `Loaded quote #${id}`
        });
      } else {
        toast({
          variant: "destructive", 
          title: "Load Error",
          description: result.error || 'Failed to load quote'
        });
        navigate('/admin/quotes');
      }
    } catch (error) {
      logger.error('Quote load error:', error);
      toast({
        variant: "destructive",
        title: "Load Error", 
        description: 'Failed to load quote data'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Save functionality
  const handleSave = async (isDraft = false) => {
    setIsSaving(true);
    
    try {
      // Perform validation first
      const validationResult = await performValidation();
      
      if (!validationResult.isValid && !isDraft) {
        toast({
          variant: "destructive",
          title: "Validation Failed",
          description: `Please fix ${validationResult.errors.length} error(s) before saving`
        });
        setIsSaving(false);
        return;
      }

      // Save the quote
      const saveResult: SaveResult = await quoteDataService.saveQuote(
        formData,
        calculation || undefined,
        {
          updateExisting: !!formData.quoteId,
          includeCalculation: true
        }
      );

      if (saveResult.success) {
        formStateService.markClean();
        formStateService.updateField('quoteId', saveResult.quoteId);
        
        toast({
          title: saveResult.isUpdate ? "Quote Updated" : "Quote Saved",
          description: `Quote #${saveResult.quoteId} saved successfully`
        });

        // Call callback if provided
        if (onSave && saveResult.quoteId) {
          onSave(saveResult.quoteId);
        }

        // Navigate if creating new quote
        if (!saveResult.isUpdate && saveResult.quoteId) {
          navigate(`/admin/quote-calculator/${saveResult.quoteId}`);
        }
      } else {
        toast({
          variant: "destructive",
          title: "Save Error",
          description: saveResult.error || 'Failed to save quote'
        });
      }
    } catch (error) {
      logger.error('Save error:', error);
      toast({
        variant: "destructive",
        title: "Save Error",
        description: 'Failed to save quote'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Item management
  const handleAddItem = () => {
    formStateService.addItem();
  };

  const handleRemoveItem = (id: string) => {
    formStateService.removeItem(id);
  };

  const handleUpdateItem = <K extends keyof QuoteItem>(id: string, field: K, value: QuoteItem[K]) => {
    formStateService.updateItem(id, field, value);
  };

  const handleDuplicateItem = (id: string) => {
    formStateService.duplicateItem(id);
  };

  // Discount management
  const handleDiscountChange = (type: 'order' | 'shipping', discountType: string, value: number, code?: string) => {
    if (type === 'order') {
      formStateService.setOrderDiscount(discountType as 'percentage' | 'fixed', value, code);
    } else {
      formStateService.setShippingDiscount(discountType as 'percentage' | 'fixed' | 'free', value);
    }
  };

  // Helper functions
  const shouldRecalculate = (newState: QuoteFormData): boolean => {
    // Only recalculate if essential fields have changed and form is valid for calculation
    return newState.items.length > 0 && 
           newState.items.some(item => item.name && item.unit_price_usd > 0) &&
           newState.originCountry && 
           newState.destinationCountry;
  };

  const getTotalValue = (): number => {
    return formData.items.reduce((sum, item) => sum + (item.unit_price_usd * item.quantity), 0);
  };

  const getTotalWeight = (): number => {
    return formData.items.reduce((sum, item) => sum + ((item.weight_kg || 0) * item.quantity), 0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
      formStateService.destroy();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading quote data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Calculator className="h-8 w-8 text-teal-600" />
            Quote Calculator V2
          </h1>
          <p className="text-gray-600 mt-2">
            {formData.quoteId ? `Editing Quote #${formData.quoteId}` : 'Create New Quote'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-save indicator */}
          {formData.isDirty && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              Unsaved changes
            </div>
          )}
          
          {lastAutoSave && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Check className="w-4 h-4" />
              Auto-saved {lastAutoSave.toLocaleTimeString()}
            </div>
          )}

          {/* Action buttons */}
          <Button
            variant="outline"
            onClick={() => handleSave(true)}
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>
          
          <Button
            onClick={() => handleSave(false)}
            disabled={isSaving || !validation?.isValid}
          >
            <Eye className="w-4 h-4 mr-2" />
            {formData.quoteId ? 'Update' : 'Create'} Quote
          </Button>
        </div>
      </div>

      {/* Validation Summary */}
      {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-orange-900 mb-2">
                  {quoteValidationService.getValidationSummary(validation)}
                </h3>
                {validation.errors.length > 0 && (
                  <ul className="list-disc list-inside space-y-1 text-sm text-orange-800">
                    {validation.errors.slice(0, 5).map((error, index) => (
                      <li key={index}>{error.message}</li>
                    ))}
                    {validation.errors.length > 5 && (
                      <li>... and {validation.errors.length - 5} more errors</li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Form */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Configure origin, destination, and shipping details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Countries */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="origin-country">Origin Country</Label>
                  <Select
                    value={formData.originCountry}
                    onValueChange={(value) => formStateService.setOriginCountry(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortCountriesByPopularity(countries).map(country => (
                        <SelectItem key={country.code} value={country.code}>
                          {formatCountryDisplay(country)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="destination-country">Destination Country</Label>
                  <Select
                    value={formData.destinationCountry}
                    onValueChange={(value) => formStateService.setDestinationCountry(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortCountriesByPopularity(countries).map(country => (
                        <SelectItem key={country.code} value={country.code}>
                          {formatCountryDisplay(country)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Shipping Method */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="shipping-method">Shipping Method</Label>
                  <Select
                    value={formData.shippingMethod}
                    onValueChange={(value) => formStateService.updateField('shippingMethod', value as 'standard' | 'express' | 'economy')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="economy">Economy (7-14 days)</SelectItem>
                      <SelectItem value="standard">Standard (5-10 days)</SelectItem>
                      <SelectItem value="express">Express (2-5 days)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="customer-currency">Customer Currency</Label>
                  <Select
                    value={formData.customerCurrency}
                    onValueChange={(value) => formStateService.updateField('customerCurrency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="NPR">NPR (₨)</SelectItem>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="CAD">CAD (C$)</SelectItem>
                      <SelectItem value="AUD">AUD (A$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Insurance Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="insurance-enabled">Package Insurance</Label>
                  <p className="text-sm text-gray-500">Protect your shipment with insurance coverage</p>
                </div>
                <Switch
                  id="insurance-enabled"
                  checked={formData.insuranceEnabled}
                  onCheckedChange={(checked) => formStateService.updateField('insuranceEnabled', checked)}
                />
              </div>

            </CardContent>
          </Card>

          {/* Items Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Items ({formData.items.length})</CardTitle>
                  <CardDescription>
                    Total: {currencySymbol}{getTotalValue().toFixed(2)} • Weight: {getTotalWeight().toFixed(2)}{weightUnit}
                  </CardDescription>
                </div>
                <Button onClick={handleAddItem} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.items.map((item, index) => (
                <Card key={item.id} className="border border-gray-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-500" />
                        <h4 className="font-medium">Item {index + 1}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        {formData.items.length > 1 && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDuplicateItem(item.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item.id)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    
                    {/* Item Name & URL */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Item Name *</Label>
                        <Input
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                          placeholder="Enter item name"
                          className={validation && quoteValidationService.hasFieldError(validation, `items.${index}.name`) ? 'border-red-500' : ''}
                        />
                      </div>
                      <div>
                        <Label>Product URL</Label>
                        <Input
                          value={item.url || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'url', e.target.value)}
                          placeholder="https://..."
                          type="url"
                        />
                      </div>
                    </div>

                    {/* Price & Quantity & Weight */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Price ({currencySymbol}) *</Label>
                        <Input
                          type="number"
                          value={item.unit_price_usd}
                          onChange={(e) => handleUpdateItem(item.id, 'unit_price_usd', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className={validation && quoteValidationService.hasFieldError(validation, `items.${index}.unit_price_usd`) ? 'border-red-500' : ''}
                        />
                      </div>
                      <div>
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                          placeholder="1"
                          min="1"
                          className={validation && quoteValidationService.hasFieldError(validation, `items.${index}.quantity`) ? 'border-red-500' : ''}
                        />
                      </div>
                      <div>
                        <Label>Weight ({weightUnit})</Label>
                        <Input
                          type="number"
                          value={item.weight_kg || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'weight_kg', parseFloat(e.target.value) || undefined)}
                          placeholder="0.0"
                          min="0"
                          step="0.1"
                        />
                      </div>
                    </div>

                    {/* Category & Notes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Category</Label>
                        <Input
                          value={item.category || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'category', e.target.value)}
                          placeholder="e.g., Electronics, Clothing"
                        />
                      </div>
                      <div>
                        <Label>HSN Code</Label>
                        <Input
                          value={item.hsn_code || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'hsn_code', e.target.value)}
                          placeholder="e.g., 8517"
                        />
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <Label>Notes</Label>
                      <Textarea
                        value={item.notes || ''}
                        onChange={(e) => handleUpdateItem(item.id, 'notes', e.target.value)}
                        placeholder="Additional notes for this item..."
                        rows={2}
                      />
                    </div>

                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          {/* Discounts Section */}
          <AdminDiscountControls
            discounts={[]}
            onDiscountChange={handleDiscountChange}
            onRemoveDiscount={() => {}}
            className="w-full"
          />

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
              <CardDescription>Customer contact details and delivery address</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Customer Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Customer Name</Label>
                  <Input
                    value={formData.customerName}
                    onChange={(e) => formStateService.updateField('customerName', e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => formStateService.updateField('customerEmail', e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => formStateService.updateField('customerPhone', e.target.value)}
                    placeholder="+1234567890"
                  />
                </div>
              </div>

              {/* Admin Notes */}
              <div>
                <Label>Admin Notes</Label>
                <Textarea
                  value={formData.adminNotes}
                  onChange={(e) => formStateService.updateField('adminNotes', e.target.value)}
                  placeholder="Internal notes for this quote..."
                  rows={3}
                />
              </div>

            </CardContent>
          </Card>

        </div>

        {/* Right Column - Calculation & Actions */}
        <div className="space-y-6">
          
          {/* Smart Savings Widget */}
          <SmartSavingsWidget
            originCurrency={originCurrency}
            calculation={calculation}
            onDiscountChange={handleDiscountChange}
          />

          {/* Calculation Results */}
          {isCalculating ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-teal-600" />
                  <p className="text-sm text-gray-600">Calculating quote...</p>
                </div>
              </CardContent>
            </Card>
          ) : calculation ? (
            <>
              <QuoteBreakdownV2 quote={{ calculation_data: calculation, ...formData }} />
              <QuoteDetailsAnalysis quote={{ calculation_data: calculation, ...formData }} />
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Calculator className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">Enter item details to calculate quote</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {formData.quoteId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quote Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                
                <QuoteSendEmailSimple quoteId={formData.quoteId} />
                
                <QuoteReminderControls quoteId={formData.quoteId} />
                
                <ShareQuoteButtonV2 quoteId={formData.quoteId} />
                
                <Separator />
                
                <QuoteExportControls 
                  quote={{ id: formData.quoteId, ...formData }}
                  calculation={calculation}
                />
                
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}