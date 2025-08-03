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
import { Badge } from '@/components/ui/badge';
import { Package, Calculator, Info } from 'lucide-react';

interface Dimensions {
  length: number;
  width: number;
  height: number;
  unit?: 'cm' | 'in';
}

interface VolumetricWeightModalProps {
  isOpen: boolean;
  onClose: () => void;
  dimensions?: Dimensions;
  volumetricDivisor?: number;
  quantity: number;
  actualWeightKg?: number;
  onSave: (dimensions: Dimensions, volumetricDivisor: number) => void;
  onClear: () => void;
}

const VolumetricWeightModal: React.FC<VolumetricWeightModalProps> = ({
  isOpen,
  onClose,
  dimensions,
  volumetricDivisor = 5000,
  quantity,
  actualWeightKg = 0.5,
  onSave,
  onClear,
}) => {
  const [length, setLength] = useState(dimensions?.length || 0);
  const [width, setWidth] = useState(dimensions?.width || 0);
  const [height, setHeight] = useState(dimensions?.height || 0);
  const [unit, setUnit] = useState<'cm' | 'in'>(dimensions?.unit || 'cm');
  const [divisor, setDivisor] = useState(volumetricDivisor);

  // Update state when props change (when switching between items)
  useEffect(() => {
    setLength(dimensions?.length || 0);
    setWidth(dimensions?.width || 0);
    setHeight(dimensions?.height || 0);
    setUnit(dimensions?.unit || 'cm');
    setDivisor(volumetricDivisor);
  }, [dimensions, volumetricDivisor, isOpen]);

  // Calculate preview weights
  const calculatePreview = () => {
    if (!length || !width || !height) return null;

    let l = length, w = width, h = height;
    if (unit === 'in') {
      l *= 2.54; w *= 2.54; h *= 2.54;
    }

    const volumeCm3 = l * w * h;
    const volumetricWeightPerItem = volumeCm3 / divisor;
    const totalVolumetricWeight = volumetricWeightPerItem * quantity;
    const totalActualWeight = actualWeightKg * quantity;
    const chargeableWeight = Math.max(totalActualWeight, totalVolumetricWeight);
    const isVolumetric = totalVolumetricWeight > totalActualWeight;

    return {
      volumeCm3,
      volumetricWeightPerItem,
      totalVolumetricWeight,
      totalActualWeight,
      chargeableWeight,
      isVolumetric,
    };
  };

  const preview = calculatePreview();

  const handleSave = () => {
    if (length > 0 && width > 0 && height > 0) {
      const dimensions = { length, width, height, unit };
      console.log('Saving volumetric weight data:', { dimensions, divisor });
      onSave(dimensions, divisor);
      onClose();
    } else {
      console.warn('Cannot save: invalid dimensions', { length, width, height });
    }
  };

  const handleClear = () => {
    setLength(0);
    setWidth(0);
    setHeight(0);
    setUnit('cm');
    setDivisor(5000);
    onClear();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Volumetric Weight Calculator
          </DialogTitle>
          <DialogDescription>
            Enter package dimensions to calculate volumetric weight. This is used when packages are large but light.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dimensions Input */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-medium">Length</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={length || ''}
                onChange={(e) => setLength(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Width</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={width || ''}
                onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Height</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={height || ''}
                onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Unit</Label>
              <Select value={unit} onValueChange={(value: 'cm' | 'in') => setUnit(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cm">Centimeters (cm)</SelectItem>
                  <SelectItem value="in">Inches (in)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Divisor */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <Label className="text-sm font-medium text-amber-800">
              Advanced: Volumetric Divisor
              <Badge variant="outline" className="ml-2 text-xs border-amber-300 text-amber-700">
                Expert Use
              </Badge>
            </Label>
            <Input
              type="number"
              min="1000"
              max="10000"
              step="100"
              value={divisor}
              onChange={(e) => setDivisor(parseFloat(e.target.value) || 5000)}
              className="mt-2 font-mono"
            />
            <p className="text-xs text-amber-700 mt-2">
              Common values: Air (5000), Sea (6000), Express (4500)
            </p>
          </div>

          {/* Live Preview */}
          {preview && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="h-4 w-4 text-blue-600" />
                <Label className="text-sm font-medium text-blue-800">Weight Calculation Preview</Label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <p><strong>Volume per item:</strong> {Math.round(preview.volumeCm3).toLocaleString()} cm³</p>
                  <p><strong>Volumetric per item:</strong> {preview.volumetricWeightPerItem.toFixed(3)}kg</p>
                  <p><strong>Actual weight total:</strong> {preview.totalActualWeight.toFixed(2)}kg (qty: {quantity})</p>
                </div>
                <div className="space-y-2">
                  <p><strong>Volumetric total:</strong> {preview.totalVolumetricWeight.toFixed(3)}kg (qty: {quantity})</p>
                  <p className={`font-medium ${
                    preview.isVolumetric ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    <strong>Chargeable weight:</strong> {preview.chargeableWeight.toFixed(3)}kg
                    {preview.isVolumetric && ' ⚠️ Volumetric applies'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info Section */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-gray-600" />
              <Label className="text-sm font-medium text-gray-800">When to use volumetric weight</Label>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <p>• Large but light items (pillows, clothing, empty boxes)</p>
              <p>• When package dimensions are significantly larger than weight suggests</p>
              <p>• Shipping companies use whichever is higher: actual or volumetric weight</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClear} className="text-red-600 hover:text-red-700">
            Clear Dimensions
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!length || !width || !height}>
            Save Dimensions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VolumetricWeightModal;