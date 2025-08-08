/**
 * BulkEditingPanel - Bulk Operations for Regional Pricing
 * 
 * Features:
 * - Multi-select countries with checkboxes
 * - Continent/region-based selection
 * - Bulk rate updates with validation
 * - Percentage increases/decreases
 * - Preview and confirmation dialogs
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Users,
  Globe,
  Percent,
  DollarSign,
  CheckSquare,
  Square,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calculator,
  Save,
  X,
  ArrowUpDown
} from 'lucide-react';

import { toast } from '@/hooks/use-toast';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface CountryPricing {
  code: string;
  name: string;
  continent: string;
  currency: string;
  rate: number;
  tier: string;
  source: string;
  min_amount: number;
  max_amount?: number;
}

interface BulkOperation {
  type: 'set_rate' | 'increase_percent' | 'decrease_percent' | 'set_minimum' | 'set_maximum';
  value: number;
  selectedCountries: string[];
  affectedCount: number;
  estimatedImpact?: {
    minChange: number;
    maxChange: number;
    avgChange: number;
  };
}

interface BulkEditingPanelProps {
  countries: CountryPricing[];
  selectedCountries: string[];
  onSelectionChange: (selected: string[]) => void;
  onBulkUpdate: (operation: BulkOperation) => Promise<void>;
  isLoading?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ContinentColors = {
  'Asia': 'bg-blue-500',
  'Europe': 'bg-green-500',
  'Africa': 'bg-yellow-500',
  'North America': 'bg-purple-500',
  'South America': 'bg-red-500',
  'Oceania': 'bg-cyan-500',
  'Antarctica': 'bg-gray-500'
} as const;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const BulkEditingPanel: React.FC<BulkEditingPanelProps> = ({
  countries,
  selectedCountries,
  onSelectionChange,
  onBulkUpdate,
  isLoading = false
}) => {
  
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [operationType, setOperationType] = useState<BulkOperation['type']>('set_rate');
  const [operationValue, setOperationValue] = useState<string>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [pendingOperation, setPendingOperation] = useState<BulkOperation | null>(null);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const continentGroups = useMemo(() => {
    return countries.reduce((acc, country) => {
      const continent = country.continent || 'Other';
      if (!acc[continent]) acc[continent] = [];
      acc[continent].push(country);
      return acc;
    }, {} as Record<string, CountryPricing[]>);
  }, [countries]);

  const selectedCountryDetails = useMemo(() => {
    return countries.filter(country => selectedCountries.includes(country.code));
  }, [countries, selectedCountries]);

  const selectionStats = useMemo(() => {
    const selected = selectedCountryDetails;
    const rates = selected.map(c => c.rate);
    const continents = [...new Set(selected.map(c => c.continent))];
    
    return {
      count: selected.length,
      continents: continents.length,
      minRate: rates.length > 0 ? Math.min(...rates) : 0,
      maxRate: rates.length > 0 ? Math.max(...rates) : 0,
      avgRate: rates.length > 0 ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length : 0,
      affectedContinents: continents
    };
  }, [selectedCountryDetails]);

  // ============================================================================
  // SELECTION HANDLERS
  // ============================================================================

  const handleSelectAll = () => {
    if (selectedCountries.length === countries.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(countries.map(c => c.code));
    }
  };

  const handleSelectByContinent = (continent: string) => {
    const continentCountries = continentGroups[continent]?.map(c => c.code) || [];
    const isAllSelected = continentCountries.every(code => selectedCountries.includes(code));
    
    if (isAllSelected) {
      // Deselect all from this continent
      onSelectionChange(selectedCountries.filter(code => !continentCountries.includes(code)));
    } else {
      // Select all from this continent
      const newSelection = [...new Set([...selectedCountries, ...continentCountries])];
      onSelectionChange(newSelection);
    }
  };

  const handleCountrySelect = (countryCode: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedCountries, countryCode]);
    } else {
      onSelectionChange(selectedCountries.filter(code => code !== countryCode));
    }
  };

  // ============================================================================
  // BULK OPERATION HANDLERS
  // ============================================================================

  const calculateImpact = (type: BulkOperation['type'], value: number): BulkOperation['estimatedImpact'] => {
    const rates = selectedCountryDetails.map(c => c.rate);
    let newRates: number[] = [];

    switch (type) {
      case 'set_rate':
        newRates = rates.map(() => value);
        break;
      case 'increase_percent':
        newRates = rates.map(rate => rate * (1 + value / 100));
        break;
      case 'decrease_percent':
        newRates = rates.map(rate => rate * (1 - value / 100));
        break;
      default:
        return undefined;
    }

    const changes = rates.map((oldRate, index) => newRates[index] - oldRate);
    
    return {
      minChange: Math.min(...changes),
      maxChange: Math.max(...changes),
      avgChange: changes.reduce((sum, change) => sum + change, 0) / changes.length
    };
  };

  const handlePreviewOperation = () => {
    if (!operationValue || selectedCountries.length === 0) {
      toast({
        title: 'Invalid Operation',
        description: 'Please select countries and enter a valid value.',
        variant: 'destructive'
      });
      return;
    }

    const value = parseFloat(operationValue);
    if (isNaN(value)) {
      toast({
        title: 'Invalid Value',
        description: 'Please enter a valid number.',
        variant: 'destructive'
      });
      return;
    }

    const operation: BulkOperation = {
      type: operationType,
      value,
      selectedCountries: [...selectedCountries],
      affectedCount: selectedCountries.length,
      estimatedImpact: calculateImpact(operationType, value)
    };

    setPendingOperation(operation);
    setShowConfirmDialog(true);
  };

  const handleConfirmOperation = async () => {
    if (!pendingOperation) return;

    try {
      await onBulkUpdate(pendingOperation);
      setShowConfirmDialog(false);
      setPendingOperation(null);
      setOperationValue('');
      onSelectionChange([]); // Clear selection after successful operation
      
      toast({
        title: 'Bulk Update Completed',
        description: `Successfully updated ${pendingOperation.affectedCount} countries.`
      });
    } catch (error) {
      console.error('Bulk operation failed:', error);
      toast({
        title: 'Bulk Update Failed',
        description: 'Unable to complete bulk operation. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // ============================================================================
  // RENDER METHODS
  // ============================================================================

  const renderSelectionControls = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5" />
          Bulk Selection
        </CardTitle>
        <CardDescription>
          Select countries for bulk operations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Selection */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
          >
            {selectedCountries.length === countries.length ? (
              <>
                <Square className="w-4 h-4 mr-2" />
                Deselect All
              </>
            ) : (
              <>
                <CheckSquare className="w-4 h-4 mr-2" />
                Select All ({countries.length})
              </>
            )}
          </Button>

          {Object.entries(continentGroups).map(([continent, continentCountries]) => {
            const allSelected = continentCountries.every(c => selectedCountries.includes(c.code));
            const someSelected = continentCountries.some(c => selectedCountries.includes(c.code));
            
            return (
              <Button
                key={continent}
                variant={allSelected ? "default" : someSelected ? "secondary" : "outline"}
                size="sm"
                onClick={() => handleSelectByContinent(continent)}
                className="flex items-center gap-2"
              >
                <div className={`w-3 h-3 rounded-full ${ContinentColors[continent as keyof typeof ContinentColors] || 'bg-gray-400'}`} />
                {continent} ({continentCountries.length})
                {someSelected && !allSelected && <Badge variant="secondary" className="ml-1 text-xs">Partial</Badge>}
              </Button>
            );
          })}
        </div>

        {/* Selection Stats */}
        {selectedCountries.length > 0 && (
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center gap-4 text-sm">
                <span><strong>{selectionStats.count}</strong> countries selected</span>
                <span><strong>{selectionStats.continents}</strong> continents</span>
                <span>Rate range: <strong>{(selectionStats.minRate * 100).toFixed(2)}% - {(selectionStats.maxRate * 100).toFixed(2)}%</strong></span>
                <span>Average: <strong>{(selectionStats.avgRate * 100).toFixed(2)}%</strong></span>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const renderOperationControls = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Bulk Operation
        </CardTitle>
        <CardDescription>
          Configure and preview bulk pricing changes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Operation Type */}
        <div>
          <Label htmlFor="operation-type">Operation Type</Label>
          <Select
            value={operationType}
            onValueChange={(value: BulkOperation['type']) => setOperationType(value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="set_rate">Set Fixed Rate</SelectItem>
              <SelectItem value="increase_percent">Increase by Percentage</SelectItem>
              <SelectItem value="decrease_percent">Decrease by Percentage</SelectItem>
              <SelectItem value="set_minimum">Set Minimum Amount</SelectItem>
              <SelectItem value="set_maximum">Set Maximum Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Value Input */}
        <div>
          <Label htmlFor="operation-value">
            Value
            {operationType.includes('percent') && ' (%)'}
            {operationType.includes('amount') && ' (USD)'}
            {operationType === 'set_rate' && ' (as decimal, e.g., 0.025 for 2.5%)'}
          </Label>
          <div className="flex items-center gap-2">
            {operationType.includes('percent') && <Percent className="w-4 h-4 text-gray-500" />}
            {operationType.includes('amount') && <DollarSign className="w-4 h-4 text-gray-500" />}
            <Input
              id="operation-value"
              type="number"
              step={operationType === 'set_rate' ? "0.001" : operationType.includes('amount') ? "0.01" : "0.1"}
              value={operationValue}
              onChange={(e) => setOperationValue(e.target.value)}
              placeholder={operationType === 'set_rate' ? '0.025' : operationType.includes('percent') ? '10' : '5.00'}
            />
          </div>
        </div>

        {/* Preview Button */}
        <Button
          onClick={handlePreviewOperation}
          disabled={selectedCountries.length === 0 || !operationValue || isLoading}
          className="w-full"
        >
          <ArrowUpDown className="w-4 h-4 mr-2" />
          Preview Changes ({selectedCountries.length} countries)
        </Button>
      </CardContent>
    </Card>
  );

  const renderConfirmationDialog = () => (
    <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
            Confirm Bulk Operation
          </DialogTitle>
          <DialogDescription>
            Review the changes before applying them to your pricing structure.
          </DialogDescription>
        </DialogHeader>

        {pendingOperation && (
          <div className="space-y-4">
            {/* Operation Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Operation Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Operation Type</Label>
                    <p className="font-semibold capitalize">
                      {pendingOperation.type.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Value</Label>
                    <p className="font-semibold">
                      {pendingOperation.type.includes('percent') && `${pendingOperation.value}%`}
                      {pendingOperation.type.includes('amount') && `$${pendingOperation.value}`}
                      {pendingOperation.type === 'set_rate' && `${pendingOperation.value} (${(pendingOperation.value * 100).toFixed(2)}%)`}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Affected Countries</Label>
                    <p className="font-semibold">{pendingOperation.affectedCount}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Continents</Label>
                    <p className="font-semibold">{selectionStats.continents}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Impact Preview */}
            {pendingOperation.estimatedImpact && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Estimated Impact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <Label className="text-sm text-gray-600">Minimum Change</Label>
                      <p className={`text-lg font-bold ${pendingOperation.estimatedImpact.minChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {pendingOperation.estimatedImpact.minChange >= 0 ? '+' : ''}{(pendingOperation.estimatedImpact.minChange * 100).toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Average Change</Label>
                      <p className={`text-lg font-bold ${pendingOperation.estimatedImpact.avgChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {pendingOperation.estimatedImpact.avgChange >= 0 ? '+' : ''}{(pendingOperation.estimatedImpact.avgChange * 100).toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Maximum Change</Label>
                      <p className={`text-lg font-bold ${pendingOperation.estimatedImpact.maxChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {pendingOperation.estimatedImpact.maxChange >= 0 ? '+' : ''}{(pendingOperation.estimatedImpact.maxChange * 100).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Selected Countries Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Affected Countries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-40 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {selectedCountryDetails.slice(0, 20).map(country => (
                      <Badge key={country.code} variant="secondary" className="text-xs">
                        {country.code} - {country.name}
                      </Badge>
                    ))}
                    {selectedCountryDetails.length > 20 && (
                      <Badge variant="outline" className="text-xs">
                        +{selectedCountryDetails.length - 20} more
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleConfirmOperation} disabled={isLoading}>
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Applying...' : 'Apply Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {renderSelectionControls()}
      {renderOperationControls()}
      {renderConfirmationDialog()}
    </div>
  );
};