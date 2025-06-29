import React, { useState, useEffect } from 'react';
import { useAllCountries } from '../../hooks/useAllCountries';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../integrations/supabase/client';
import { Trash2, Edit, Plus, Settings } from 'lucide-react';

interface CustomsTierFormData {
  originCountry: string;
  destinationCountry: string;
  ruleName: string;
  priceMin?: number;
  priceMax?: number;
  weightMin?: number;
  weightMax?: number;
  logicType: 'AND' | 'OR';
  customsPercentage: number;
  vatPercentage: number;
  priorityOrder: number;
  isActive: boolean;
  description?: string;
}

function CustomsTierForm({ onSubmit, onCancel, initialData }: { 
  onSubmit: (data: CustomsTierFormData) => Promise<any>, 
  onCancel: () => void, 
  initialData?: Partial<CustomsTierFormData> 
}) {
  const { data: countries = [] } = useAllCountries();
  const [formData, setFormData] = useState<CustomsTierFormData>({
    originCountry: initialData?.originCountry || '',
    destinationCountry: initialData?.destinationCountry || '',
    ruleName: initialData?.ruleName || '',
    priceMin: initialData?.priceMin,
    priceMax: initialData?.priceMax,
    weightMin: initialData?.weightMin,
    weightMax: initialData?.weightMax,
    logicType: initialData?.logicType || 'AND',
    customsPercentage: initialData?.customsPercentage || 0,
    vatPercentage: initialData?.vatPercentage || 0,
    priorityOrder: initialData?.priorityOrder || 1,
    isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
    description: initialData?.description || ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dbData = {
        origin_country: formData.originCountry,
        destination_country: formData.destinationCountry,
        rule_name: formData.ruleName,
        price_min: formData.priceMin,
        price_max: formData.priceMax,
        weight_min: formData.weightMin,
        weight_max: formData.weightMax,
        logic_type: formData.logicType,
        customs_percentage: formData.customsPercentage,
        vat_percentage: formData.vatPercentage,
        priority_order: formData.priorityOrder,
        is_active: formData.isActive,
        description: formData.description
      };

      const result = await onSubmit(dbData);
      if (result.success) {
        toast({ title: 'Success', description: 'Customs tier saved successfully' });
        onCancel();
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to save customs tier', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="originCountry">Origin Country</Label>
          <Select value={formData.originCountry} onValueChange={(value) => setFormData(prev => ({ ...prev, originCountry: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select origin country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name} ({country.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="destinationCountry">Destination Country</Label>
          <Select value={formData.destinationCountry} onValueChange={(value) => setFormData(prev => ({ ...prev, destinationCountry: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select destination country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name} ({country.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="ruleName">Rule Name</Label>
        <Input 
          id="ruleName" 
          value={formData.ruleName} 
          onChange={e => setFormData(prev => ({ ...prev, ruleName: e.target.value }))} 
          placeholder="e.g., Low Value Items, High Value Electronics" 
          required 
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="priceMin">Price Min ($)</Label>
          <Input 
            id="priceMin" 
            type="number" 
            step="0.01" 
            min="0"
            value={formData.priceMin || ''} 
            onChange={e => setFormData(prev => ({ ...prev, priceMin: parseFloat(e.target.value) || undefined }))} 
            placeholder="0" 
          />
        </div>
        <div>
          <Label htmlFor="priceMax">Price Max ($)</Label>
          <Input 
            id="priceMax" 
            type="number" 
            step="0.01" 
            min="0"
            value={formData.priceMax || ''} 
            onChange={e => setFormData(prev => ({ ...prev, priceMax: parseFloat(e.target.value) || undefined }))} 
            placeholder="Leave empty for unlimited" 
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="weightMin">Weight Min (kg)</Label>
          <Input 
            id="weightMin" 
            type="number" 
            step="0.01" 
            min="0"
            value={formData.weightMin || ''} 
            onChange={e => setFormData(prev => ({ ...prev, weightMin: parseFloat(e.target.value) || undefined }))} 
            placeholder="0" 
          />
        </div>
        <div>
          <Label htmlFor="weightMax">Weight Max (kg)</Label>
          <Input 
            id="weightMax" 
            type="number" 
            step="0.01" 
            min="0"
            value={formData.weightMax || ''} 
            onChange={e => setFormData(prev => ({ ...prev, weightMax: parseFloat(e.target.value) || undefined }))} 
            placeholder="Leave empty for unlimited" 
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="logicType">Logic Type</Label>
          <Select value={formData.logicType} onValueChange={(value: 'AND' | 'OR') => setFormData(prev => ({ ...prev, logicType: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select logic type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">AND (Both price AND weight must match)</SelectItem>
              <SelectItem value="OR">OR (Either price OR weight can match)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="priorityOrder">Priority Order</Label>
          <Input 
            id="priorityOrder" 
            type="number" 
            min="1"
            value={formData.priorityOrder} 
            onChange={e => setFormData(prev => ({ ...prev, priorityOrder: parseInt(e.target.value) || 1 }))} 
            placeholder="1" 
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="customsPercentage">Customs Percentage (%)</Label>
          <Input 
            id="customsPercentage" 
            type="number" 
            step="0.01" 
            min="0"
            max="100"
            value={formData.customsPercentage} 
            onChange={e => setFormData(prev => ({ ...prev, customsPercentage: parseFloat(e.target.value) || 0 }))} 
            required 
          />
        </div>
        <div>
          <Label htmlFor="vatPercentage">VAT Percentage (%)</Label>
          <Input 
            id="vatPercentage" 
            type="number" 
            step="0.01" 
            min="0"
            max="100"
            value={formData.vatPercentage} 
            onChange={e => setFormData(prev => ({ ...prev, vatPercentage: parseFloat(e.target.value) || 0 }))} 
            required 
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description (Optional)</Label>
        <Input 
          id="description" 
          value={formData.description} 
          onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} 
          placeholder="Brief description of this rule" 
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch 
          id="isActive" 
          checked={formData.isActive} 
          onCheckedChange={checked => setFormData(prev => ({ ...prev, isActive: checked }))} 
        />
        <Label htmlFor="isActive">Active</Label>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : (initialData ? 'Update Tier' : 'Create Tier')}
        </Button>
      </div>
    </form>
  );
}

export function CustomsTiersManager() {
  const { data: countries = [] } = useAllCountries();
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTier, setEditingTier] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchTiers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('route_customs_tiers')
        .select('*')
        .order('origin_country')
        .order('destination_country')
        .order('priority_order');

      if (error) throw error;
      setTiers(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTiers();
  }, []);

  const handleCreate = async (data: any) => {
    try {
      const { data: result, error } = await supabase
        .from('route_customs_tiers')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      
      await fetchTiers();
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingTier) return { success: false, error: 'No tier selected' };
    
    try {
      const { data: result, error } = await supabase
        .from('route_customs_tiers')
        .update(data)
        .eq('id', editingTier.id)
        .select()
        .single();

      if (error) throw error;
      
      await fetchTiers();
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('route_customs_tiers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchTiers();
      toast({ title: 'Success', description: 'Customs tier deleted successfully' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete customs tier', variant: 'destructive' });
    }
  };

  const getCountryName = (code: string) => {
    const country = countries.find(c => c.code === code);
    return country ? `${country.name} (${code})` : code;
  };

  const mapTierToFormData = (tier: any): CustomsTierFormData => ({
    originCountry: tier.origin_country,
    destinationCountry: tier.destination_country,
    ruleName: tier.rule_name,
    priceMin: tier.price_min,
    priceMax: tier.price_max,
    weightMin: tier.weight_min,
    weightMax: tier.weight_max,
    logicType: tier.logic_type,
    customsPercentage: tier.customs_percentage,
    vatPercentage: tier.vat_percentage,
    priorityOrder: tier.priority_order,
    isActive: tier.is_active,
    description: tier.description
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2">Loading customs tiers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Card>
          <CardContent>
            <p className="text-red-600">Error: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Customs Tiers</h2>
          <p className="text-gray-600">Manage tiered customs rules by route</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add New Tier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Customs Tier</DialogTitle>
              <DialogDescription>Configure tiered customs rules for a specific route.</DialogDescription>
            </DialogHeader>
            <CustomsTierForm
              onSubmit={async (data) => {
                const result = await handleCreate(data);
                if (result.success) setIsCreateDialogOpen(false);
                return result;
              }}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setEditingTier(null);
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Customs Tier</DialogTitle>
              <DialogDescription>Update tiered customs rules for this route.</DialogDescription>
            </DialogHeader>
            {editingTier && (
              <CustomsTierForm
                onSubmit={async (data) => {
                  const result = await handleUpdate(data);
                  if (result.success) setIsEditDialogOpen(false);
                  return result;
                }}
                onCancel={() => {
                  setIsEditDialogOpen(false);
                  setEditingTier(null);
                }}
                initialData={mapTierToFormData(editingTier)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {tiers.map((tier) => (
          <Card key={tier.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <span>{getCountryName(tier.origin_country)} → {getCountryName(tier.destination_country)}</span>
                    <Badge variant={tier.is_active ? 'default' : 'secondary'}>
                      {tier.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="outline">Priority {tier.priority_order}</Badge>
                  </CardTitle>
                  <CardDescription>
                    <strong>{tier.rule_name}</strong> - {tier.customs_percentage}% customs, {tier.vat_percentage}% VAT
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingTier(tier);
                      setIsEditDialogOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(tier.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Conditions:</strong>
                  <div className="mt-1 space-y-1">
                    {tier.price_min !== null && tier.price_max !== null && (
                      <div>Price: ${tier.price_min} - {tier.price_max || '∞'}</div>
                    )}
                    {tier.weight_min !== null && tier.weight_max !== null && (
                      <div>Weight: {tier.weight_min} - {tier.weight_max || '∞'} kg</div>
                    )}
                    <div className="text-blue-600 font-medium">Logic: {tier.logic_type}</div>
                  </div>
                </div>
                <div>
                  <strong>Rates:</strong>
                  <div className="mt-1 space-y-1">
                    <div>Customs: {tier.customs_percentage}%</div>
                    <div>VAT: {tier.vat_percentage}%</div>
                    {tier.description && (
                      <div className="text-gray-600 mt-2">{tier.description}</div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tiers.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No customs tiers configured yet.</p>
            <p className="text-sm text-gray-500 mt-2">Create your first customs tier to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 