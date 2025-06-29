import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { safeJsonParse } from '@/lib/utils';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Calculator,
  AlertTriangle,
  CheckCircle,
  XCircle,
  DollarSign
} from 'lucide-react';

interface PricingRulesTabProps {
  rules: any[];
  onAdd: (ruleType: string, rule: any) => void;
  onUpdate: (ruleType: string, ruleId: string, updates: any) => void;
  onDelete: (ruleType: string, ruleId: string) => void;
  isLoading: boolean;
}

interface PricingRuleForm {
  name: string;
  priority: number;
  isActive: boolean;
  conditions: {
    weightRange?: { min: number; max: number };
    priceRange?: { min: number; max: number };
    categories?: string[];
    countries?: string[];
  };
  actions: {
    markupPercentage: number;
    shippingMultiplier: number;
    handlingFee: number;
    insurancePercentage: number;
    description?: string;
  };
}

export const PricingRulesTab: React.FC<PricingRulesTabProps> = ({
  rules,
  onAdd,
  onUpdate,
  onDelete,
  isLoading
}) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [formData, setFormData] = useState<PricingRuleForm>({
    name: '',
    priority: 0,
    isActive: true,
    conditions: {},
    actions: {
      markupPercentage: 5.0,
      shippingMultiplier: 1.0,
      handlingFee: 10.0,
      insurancePercentage: 1.0,
      description: ''
    }
  });

  const handleAddRule = () => {
    const newRule = {
      ...formData,
      conditions: JSON.stringify(formData.conditions),
      actions: JSON.stringify(formData.actions),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    onAdd('pricing', newRule);
    setShowAddDialog(false);
    resetForm();
  };

  const handleEditRule = () => {
    if (!editingRule) return;

    const updatedRule = {
      ...formData,
      conditions: JSON.stringify(formData.conditions),
      actions: JSON.stringify(formData.actions),
      updated_at: new Date().toISOString()
    };

    onUpdate('pricing', editingRule.id, updatedRule);
    setEditingRule(null);
    resetForm();
  };

  const handleDeleteRule = (ruleId: string) => {
    if (confirm('Are you sure you want to delete this rule?')) {
      onDelete('pricing', ruleId);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      priority: 0,
      isActive: true,
      conditions: {},
      actions: {
        markupPercentage: 5.0,
        shippingMultiplier: 1.0,
        handlingFee: 10.0,
        insurancePercentage: 1.0,
        description: ''
      }
    });
  };

  const openEditDialog = (rule: any) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      priority: rule.priority,
      isActive: rule.is_active,
      conditions: {
        weightRange: rule.conditions?.weightRange || { min: 0, max: 100 },
        priceRange: rule.conditions?.priceRange || { min: 0, max: 10000 },
        categories: rule.conditions?.categories || [],
        countries: rule.conditions?.countries || []
      },
      actions: {
        markupPercentage: rule.actions?.markupPercentage || 5,
        shippingMultiplier: rule.actions?.shippingMultiplier || 1,
        handlingFee: rule.actions?.handlingFee || 0,
        insurancePercentage: rule.actions?.insurancePercentage || 0,
        description: rule.actions?.description || ''
      },
      description: rule.description || ''
    });
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'bg-red-100 text-red-800';
    if (priority >= 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Pricing Rules</h2>
          <p className="text-muted-foreground">
            Configure pricing, markup, and fee calculation rules
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button disabled={isLoading}>
              <Plus className="h-4 w-4 mr-2" />
              Add Pricing Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Pricing Rule</DialogTitle>
              <DialogDescription>
                Create a new rule for pricing and fee calculations
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="rule-name">Rule Name</Label>
                  <Input
                    id="rule-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., High Value Electronics Markup"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Input
                      id="priority"
                      type="number"
                      min="0"
                      max="10"
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                    />
                    <p className="text-sm text-muted-foreground">Higher priority rules are applied first</p>
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      id="is-active"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label htmlFor="is-active">Active</Label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Conditions */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Conditions</h3>
                <p className="text-sm text-muted-foreground">When this rule should be applied</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Weight Range (kg)</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Min"
                        type="number"
                        value={formData.conditions.weightRange?.min || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          conditions: {
                            ...prev.conditions,
                            weightRange: {
                              ...prev.conditions.weightRange,
                              min: parseFloat(e.target.value) || 0
                            }
                          }
                        }))}
                      />
                      <Input
                        placeholder="Max"
                        type="number"
                        value={formData.conditions.weightRange?.max || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          conditions: {
                            ...prev.conditions,
                            weightRange: {
                              ...prev.conditions.weightRange,
                              max: parseFloat(e.target.value) || 0
                            }
                          }
                        }))}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Price Range ($)</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Min"
                        type="number"
                        value={formData.conditions.priceRange?.min || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          conditions: {
                            ...prev.conditions,
                            priceRange: {
                              ...prev.conditions.priceRange,
                              min: parseFloat(e.target.value) || 0
                            }
                          }
                        }))}
                      />
                      <Input
                        placeholder="Max"
                        type="number"
                        value={formData.conditions.priceRange?.max || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          conditions: {
                            ...prev.conditions,
                            priceRange: {
                              ...prev.conditions.priceRange,
                              max: parseFloat(e.target.value) || 0
                            }
                          }
                        }))}
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label>Product Categories</Label>
                  <Textarea
                    placeholder="Enter categories separated by commas (e.g., electronics, clothing, books)"
                    value={formData.conditions.categories?.join(', ') || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      conditions: {
                        ...prev.conditions,
                        categories: e.target.value.split(',').map(cat => cat.trim()).filter(cat => cat)
                      }
                    }))}
                  />
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Pricing Actions</h3>
                <p className="text-sm text-muted-foreground">How pricing should be calculated</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="markup-percentage">Markup Percentage (%)</Label>
                    <Input
                      id="markup-percentage"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.actions.markupPercentage}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        actions: { ...prev.actions, markupPercentage: parseFloat(e.target.value) || 0 }
                      }))}
                    />
                    <p className="text-sm text-muted-foreground">Percentage markup on product price</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="shipping-multiplier">Shipping Multiplier</Label>
                    <Input
                      id="shipping-multiplier"
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={formData.actions.shippingMultiplier}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        actions: { ...prev.actions, shippingMultiplier: parseFloat(e.target.value) || 1 }
                      }))}
                    />
                    <p className="text-sm text-muted-foreground">Multiplier for shipping costs</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="handling-fee">Handling Fee ($)</Label>
                    <Input
                      id="handling-fee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.actions.handlingFee}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        actions: { ...prev.actions, handlingFee: parseFloat(e.target.value) || 0 }
                      }))}
                    />
                    <p className="text-sm text-muted-foreground">Fixed handling fee</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="insurance-percentage">Insurance Percentage (%)</Label>
                    <Input
                      id="insurance-percentage"
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={formData.actions.insurancePercentage}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        actions: { ...prev.actions, insurancePercentage: parseFloat(e.target.value) || 0 }
                      }))}
                    />
                    <p className="text-sm text-muted-foreground">Insurance as percentage of value</p>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Optional description of this pricing rule"
                    value={formData.actions.description || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      actions: { ...prev.actions, description: e.target.value }
                    }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddRule} disabled={!formData.name}>
                Add Rule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rules List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Pricing Rules ({rules.length})
          </CardTitle>
          <CardDescription>
            Rules are applied in priority order (highest first)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-8">
              <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No pricing rules configured</p>
              <p className="text-sm text-muted-foreground">
                Add rules to enable automatic pricing calculations
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {rules
                .sort((a, b) => b.priority - a.priority)
                .map((rule) => {
                  const conditions = safeJsonParse(rule.conditions) || {};
                  const actions = safeJsonParse(rule.actions) || {};
                  
                  return (
                    <div key={rule.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg">{rule.name}</h3>
                            <Badge className={getPriorityColor(rule.priority)}>
                              Priority {rule.priority}
                            </Badge>
                            {rule.is_active ? (
                              <Badge variant="default" className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <XCircle className="h-3 w-3" />
                                Inactive
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Markup:</span>
                              <span className="ml-2 text-muted-foreground">
                                {actions.markupPercentage || 0}%
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">Shipping:</span>
                              <span className="ml-2 text-muted-foreground">
                                ×{actions.shippingMultiplier || 1}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">Handling:</span>
                              <span className="ml-2 text-muted-foreground">
                                ${actions.handlingFee || 0}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">Insurance:</span>
                              <span className="ml-2 text-muted-foreground">
                                {actions.insurancePercentage || 0}%
                              </span>
                            </div>
                          </div>
                          
                          {conditions.weightRange && (
                            <div className="text-sm">
                              <span className="font-medium">Weight Range:</span>
                              <span className="ml-2 text-muted-foreground">
                                {conditions.weightRange.min} - {conditions.weightRange.max} kg
                              </span>
                            </div>
                          )}
                          
                          {conditions.priceRange && (
                            <div className="text-sm">
                              <span className="font-medium">Price Range:</span>
                              <span className="ml-2 text-muted-foreground">
                                ${conditions.priceRange.min} - ${conditions.priceRange.max}
                              </span>
                            </div>
                          )}
                          
                          {conditions.categories && conditions.categories.length > 0 && (
                            <div className="text-sm">
                              <span className="font-medium">Categories:</span>
                              <span className="ml-2 text-muted-foreground">
                                {conditions.categories.join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(rule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteRule(rule.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingRule && (
        <Dialog open={!!editingRule} onOpenChange={() => setEditingRule(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Pricing Rule</DialogTitle>
              <DialogDescription>
                Update the pricing rule configuration
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Same form as add dialog */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-rule-name">Rule Name</Label>
                  <Input
                    id="edit-rule-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-priority">Priority</Label>
                    <Input
                      id="edit-priority"
                      type="number"
                      min="0"
                      max="10"
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      id="edit-is-active"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label htmlFor="edit-is-active">Active</Label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Conditions */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Conditions</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Weight Range (kg)</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Min"
                        type="number"
                        value={formData.conditions.weightRange?.min || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          conditions: {
                            ...prev.conditions,
                            weightRange: {
                              ...prev.conditions.weightRange,
                              min: parseFloat(e.target.value) || 0
                            }
                          }
                        }))}
                      />
                      <Input
                        placeholder="Max"
                        type="number"
                        value={formData.conditions.weightRange?.max || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          conditions: {
                            ...prev.conditions,
                            weightRange: {
                              ...prev.conditions.weightRange,
                              max: parseFloat(e.target.value) || 0
                            }
                          }
                        }))}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Price Range ($)</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Min"
                        type="number"
                        value={formData.conditions.priceRange?.min || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          conditions: {
                            ...prev.conditions,
                            priceRange: {
                              ...prev.conditions.priceRange,
                              min: parseFloat(e.target.value) || 0
                            }
                          }
                        }))}
                      />
                      <Input
                        placeholder="Max"
                        type="number"
                        value={formData.conditions.priceRange?.max || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          conditions: {
                            ...prev.conditions,
                            priceRange: {
                              ...prev.conditions.priceRange,
                              max: parseFloat(e.target.value) || 0
                            }
                          }
                        }))}
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label>Product Categories</Label>
                  <Textarea
                    placeholder="Enter categories separated by commas"
                    value={formData.conditions.categories?.join(', ') || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      conditions: {
                        ...prev.conditions,
                        categories: e.target.value.split(',').map(cat => cat.trim()).filter(cat => cat)
                      }
                    }))}
                  />
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Pricing Actions</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-markup-percentage">Markup Percentage (%)</Label>
                    <Input
                      id="edit-markup-percentage"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.actions.markupPercentage}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        actions: { ...prev.actions, markupPercentage: parseFloat(e.target.value) || 0 }
                      }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-shipping-multiplier">Shipping Multiplier</Label>
                    <Input
                      id="edit-shipping-multiplier"
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={formData.actions.shippingMultiplier}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        actions: { ...prev.actions, shippingMultiplier: parseFloat(e.target.value) || 1 }
                      }))}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-handling-fee">Handling Fee ($)</Label>
                    <Input
                      id="edit-handling-fee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.actions.handlingFee}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        actions: { ...prev.actions, handlingFee: parseFloat(e.target.value) || 0 }
                      }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-insurance-percentage">Insurance Percentage (%)</Label>
                    <Input
                      id="edit-insurance-percentage"
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={formData.actions.insurancePercentage}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        actions: { ...prev.actions, insurancePercentage: parseFloat(e.target.value) || 0 }
                      }))}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    placeholder="Optional description of this pricing rule"
                    value={formData.actions.description || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      actions: { ...prev.actions, description: e.target.value }
                    }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setEditingRule(null)}>
                Cancel
              </Button>
              <Button onClick={handleEditRule} disabled={!formData.name}>
                Update Rule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}; 