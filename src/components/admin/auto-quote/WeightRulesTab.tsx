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
import { 
  Plus, 
  Edit, 
  Trash2, 
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Scale,
  Settings
} from 'lucide-react';

interface WeightRulesTabProps {
  rules: any[];
  onAdd: (ruleType: string, rule: any) => void;
  onUpdate: (ruleType: string, ruleId: string, updates: any) => void;
  onDelete: (ruleType: string, ruleId: string) => void;
  isLoading: boolean;
}

export const WeightRulesTab: React.FC<WeightRulesTabProps> = ({
  rules,
  onAdd,
  onUpdate,
  onDelete,
  isLoading
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    priority: 1,
    isActive: true,
    conditions: {
      categories: [],
      keywords: [],
      priceRange: {
        min: 0,
        max: 10000
      },
      dimensions: {
        minLength: 0,
        maxLength: 1000,
        minWidth: 0,
        maxWidth: 1000,
        minHeight: 0,
        maxHeight: 1000
      }
    },
    actions: {
      estimationMethod: 'category',
      defaultWeight: 0.5,
      weightMultiplier: 1.0,
      category: 'general',
      description: ''
    },
    description: ''
  });

  const openAddDialog = () => {
    setEditingRule(null);
    setFormData({
      name: '',
      priority: 1,
      isActive: true,
      conditions: {
        categories: [],
        keywords: [],
        priceRange: {
          min: 0,
          max: 10000
        },
        dimensions: {
          minLength: 0,
          maxLength: 1000,
          minWidth: 0,
          maxWidth: 1000,
          minHeight: 0,
          maxHeight: 1000
        }
      },
      actions: {
        estimationMethod: 'category',
        defaultWeight: 0.5,
        weightMultiplier: 1.0,
        category: 'general',
        description: ''
      },
      description: ''
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (rule: any) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      priority: rule.priority,
      isActive: rule.is_active,
      conditions: {
        categories: rule.conditions?.categories || [],
        keywords: rule.conditions?.keywords || [],
        priceRange: rule.conditions?.priceRange || {
          min: 0,
          max: 10000
        },
        dimensions: rule.conditions?.dimensions || {
          minLength: 0,
          maxLength: 1000,
          minWidth: 0,
          maxWidth: 1000,
          minHeight: 0,
          maxHeight: 1000
        }
      },
      actions: {
        estimationMethod: rule.actions?.estimationMethod || 'category',
        defaultWeight: rule.actions?.defaultWeight || 0.5,
        weightMultiplier: rule.actions?.weightMultiplier || 1.0,
        category: rule.actions?.category || 'general',
        description: rule.actions?.description || ''
      },
      description: rule.description || ''
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const ruleData = {
      name: formData.name,
      priority: formData.priority,
      is_active: formData.isActive,
      conditions: formData.conditions,
      actions: formData.actions,
      description: formData.description,
      rule_type: 'weight'
    };

    if (editingRule) {
      onUpdate('weight', editingRule.id, ruleData);
    } else {
      onAdd('weight', ruleData);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (ruleId: string) => {
    if (confirm('Are you sure you want to delete this weight rule?')) {
      onDelete('weight', ruleId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Weight Estimation Rules</h2>
          <p className="text-muted-foreground">
            Configure rules for estimating product weights when not available
          </p>
        </div>
        <Button onClick={openAddDialog} disabled={isLoading}>
          <Plus className="h-4 w-4 mr-2" />
          Add Weight Rule
        </Button>
      </div>

      {/* Rules List */}
      <div className="grid gap-4">
        {rules.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Weight Rules</h3>
                <p className="text-muted-foreground mb-4">
                  Add weight estimation rules to automatically estimate product weights.
                </p>
                <Button onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Rule
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          rules
            .sort((a, b) => b.priority - a.priority)
            .map((rule) => {
              const conditions = rule.conditions || {};
              const actions = rule.actions || {};
              
              return (
                <Card key={rule.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{rule.name}</h3>
                          <Badge variant={rule.is_active ? "default" : "secondary"}>
                            {rule.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline">Priority: {rule.priority}</Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 text-muted-foreground mb-3">
                          <Scale className="h-4 w-4" />
                          <span className="text-sm">
                            Method: {actions.estimationMethod || 'category'} • 
                            Weight: {actions.defaultWeight || 0.5}kg
                          </span>
                        </div>
                        
                        {rule.description && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {rule.description}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap gap-2">
                          {conditions.categories?.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              Categories: {conditions.categories.join(', ')}
                            </Badge>
                          )}
                          {conditions.keywords?.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              Keywords: {conditions.keywords.join(', ')}
                            </Badge>
                          )}
                          {actions.category && (
                            <Badge variant="outline" className="text-xs">
                              Category: {actions.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(rule)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(rule.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              {editingRule ? 'Edit Weight Rule' : 'Add Weight Rule'}
            </DialogTitle>
            <DialogDescription>
              Configure weight estimation rules for products
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Rule Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Electronics Weight Rule"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    min="1"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="active">Active</Label>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Optional description of this rule"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>

            <Separator />

            {/* Conditions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Conditions</h3>
              <p className="text-sm text-muted-foreground">When this rule should be applied</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                
                <div>
                  <Label>Keywords</Label>
                  <Textarea
                    placeholder="Enter keywords separated by commas (e.g., heavy, light, small)"
                    value={formData.conditions.keywords?.join(', ') || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      conditions: {
                        ...prev.conditions,
                        keywords: e.target.value.split(',').map(kw => kw.trim()).filter(kw => kw)
                      }
                    }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Price Range (Min)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.conditions.priceRange.min}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      conditions: {
                        ...prev.conditions,
                        priceRange: { ...prev.conditions.priceRange, min: parseFloat(e.target.value) || 0 }
                      }
                    }))}
                  />
                </div>
                
                <div>
                  <Label>Price Range (Max)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.conditions.priceRange.max}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      conditions: {
                        ...prev.conditions,
                        priceRange: { ...prev.conditions.priceRange, max: parseFloat(e.target.value) || 10000 }
                      }
                    }))}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Actions</h3>
              <p className="text-sm text-muted-foreground">How to estimate the weight</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estimation-method">Estimation Method</Label>
                  <Select
                    value={formData.actions.estimationMethod}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      actions: { ...prev.actions, estimationMethod: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="category">Category Default</SelectItem>
                      <SelectItem value="fixed">Fixed Weight</SelectItem>
                      <SelectItem value="calculated">Calculated</SelectItem>
                      <SelectItem value="range">Weight Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="default-weight">Default Weight (kg)</Label>
                  <Input
                    id="default-weight"
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.actions.defaultWeight}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      actions: { ...prev.actions, defaultWeight: parseFloat(e.target.value) || 0.5 }
                    }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="weight-multiplier">Weight Multiplier</Label>
                  <Input
                    id="weight-multiplier"
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.actions.weightMultiplier}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      actions: { ...prev.actions, weightMultiplier: parseFloat(e.target.value) || 1.0 }
                    }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Product Category</Label>
                  <Select
                    value={formData.actions.category}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      actions: { ...prev.actions, category: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="electronics">Electronics</SelectItem>
                      <SelectItem value="clothing">Clothing</SelectItem>
                      <SelectItem value="books">Books</SelectItem>
                      <SelectItem value="cosmetics">Cosmetics</SelectItem>
                      <SelectItem value="food">Food</SelectItem>
                      <SelectItem value="jewelry">Jewelry</SelectItem>
                      <SelectItem value="furniture">Furniture</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="action-description">Action Description</Label>
                <Textarea
                  id="action-description"
                  placeholder="Description of how this weight estimation works"
                  value={formData.actions.description}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    actions: { ...prev.actions, description: e.target.value }
                  }))}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {editingRule ? 'Update Rule' : 'Add Rule'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 