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
  Globe,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ExternalLink,
  Code,
  Settings
} from 'lucide-react';

interface WebsiteRulesTabProps {
  rules: any[];
  onAdd: (ruleType: string, rule: any) => void;
  onUpdate: (ruleType: string, ruleId: string, updates: any) => void;
  onDelete: (ruleType: string, ruleId: string) => void;
  isLoading: boolean;
}

export const WebsiteRulesTab: React.FC<WebsiteRulesTabProps> = ({
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
    websiteDomain: '',
    priority: 1,
    isActive: true,
    selectors: {
      title: '',
      price: '',
      image: '',
      description: '',
      weight: '',
      availability: ''
    },
    settings: {
      timeout: 30,
      retryAttempts: 3,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      requiresJavaScript: false,
      customHeaders: {}
    },
    description: ''
  });

  const openAddDialog = () => {
    setEditingRule(null);
    setFormData({
      name: '',
      websiteDomain: '',
      priority: 1,
      isActive: true,
      selectors: {
        title: '',
        price: '',
        image: '',
        description: '',
        weight: '',
        availability: ''
      },
      settings: {
        timeout: 30,
        retryAttempts: 3,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        requiresJavaScript: false,
        customHeaders: {}
      },
      description: ''
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (rule: any) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      websiteDomain: rule.website_domain,
      priority: rule.priority,
      isActive: rule.is_active,
      selectors: rule.selectors || {
        title: '',
        price: '',
        image: '',
        description: '',
        weight: '',
        availability: ''
      },
      settings: rule.settings || {
        timeout: 30,
        retryAttempts: 3,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        requiresJavaScript: false,
        customHeaders: {}
      },
      description: rule.description || ''
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const ruleData = {
      name: formData.name,
      website_domain: formData.websiteDomain,
      priority: formData.priority,
      is_active: formData.isActive,
      selectors: formData.selectors,
      settings: formData.settings,
      description: formData.description,
      rule_type: 'website'
    };

    if (editingRule) {
      onUpdate('websites', editingRule.id, ruleData);
    } else {
      onAdd('websites', ruleData);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (ruleId: string) => {
    if (confirm('Are you sure you want to delete this website rule?')) {
      onDelete('websites', ruleId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Website Scraping Rules</h2>
          <p className="text-muted-foreground">
            Configure how to scrape product data from different websites
          </p>
        </div>
        <Button onClick={openAddDialog} disabled={isLoading}>
          <Plus className="h-4 w-4 mr-2" />
          Add Website Rule
        </Button>
      </div>

      {/* Rules List */}
      <div className="grid gap-4">
        {rules.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Website Rules</h3>
                <p className="text-muted-foreground mb-4">
                  Add website rules to enable automatic product scraping from e-commerce sites.
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
            .map((rule) => (
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
                        <Globe className="h-4 w-4" />
                        <span className="font-mono text-sm">{rule.website_domain}</span>
                      </div>
                      
                      {rule.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {rule.description}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap gap-2">
                        {rule.selectors?.title && (
                          <Badge variant="outline" className="text-xs">
                            Title: {rule.selectors.title}
                          </Badge>
                        )}
                        {rule.selectors?.price && (
                          <Badge variant="outline" className="text-xs">
                            Price: {rule.selectors.price}
                          </Badge>
                        )}
                        {rule.selectors?.image && (
                          <Badge variant="outline" className="text-xs">
                            Image: {rule.selectors.image}
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
            ))
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {editingRule ? 'Edit Website Rule' : 'Add Website Rule'}
            </DialogTitle>
            <DialogDescription>
              Configure scraping rules for a specific website
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
                    placeholder="e.g., Amazon US Scraping"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="domain">Website Domain</Label>
                  <Input
                    id="domain"
                    placeholder="e.g., amazon.com"
                    value={formData.websiteDomain}
                    onChange={(e) => setFormData(prev => ({ ...prev, websiteDomain: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  />
                  <Label htmlFor="active">Active</Label>
                </div>
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

            {/* CSS Selectors */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Code className="h-5 w-5" />
                CSS Selectors
              </h3>
              <p className="text-sm text-muted-foreground">
                CSS selectors to extract product information from the website
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title-selector">Product Title</Label>
                  <Input
                    id="title-selector"
                    placeholder="e.g., .product-title, h1"
                    value={formData.selectors.title}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      selectors: { ...prev.selectors, title: e.target.value }
                    }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="price-selector">Price</Label>
                  <Input
                    id="price-selector"
                    placeholder="e.g., .price, .product-price"
                    value={formData.selectors.price}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      selectors: { ...prev.selectors, price: e.target.value }
                    }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="image-selector">Product Image</Label>
                  <Input
                    id="image-selector"
                    placeholder="e.g., .product-image img"
                    value={formData.selectors.image}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      selectors: { ...prev.selectors, image: e.target.value }
                    }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="description-selector">Description</Label>
                  <Input
                    id="description-selector"
                    placeholder="e.g., .product-description"
                    value={formData.selectors.description}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      selectors: { ...prev.selectors, description: e.target.value }
                    }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="weight-selector">Weight</Label>
                  <Input
                    id="weight-selector"
                    placeholder="e.g., .product-weight"
                    value={formData.selectors.weight}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      selectors: { ...prev.selectors, weight: e.target.value }
                    }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="availability-selector">Availability</Label>
                  <Input
                    id="availability-selector"
                    placeholder="e.g., .stock-status"
                    value={formData.selectors.availability}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      selectors: { ...prev.selectors, availability: e.target.value }
                    }))}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Scraping Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Scraping Settings
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="timeout">Timeout (seconds)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    min="5"
                    max="120"
                    value={formData.settings.timeout}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, timeout: parseInt(e.target.value) || 30 }
                    }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="retry-attempts">Retry Attempts</Label>
                  <Input
                    id="retry-attempts"
                    type="number"
                    min="0"
                    max="10"
                    value={formData.settings.retryAttempts}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, retryAttempts: parseInt(e.target.value) || 3 }
                    }))}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="javascript"
                    checked={formData.settings.requiresJavaScript}
                    onCheckedChange={(checked) => setFormData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, requiresJavaScript: checked }
                    }))}
                  />
                  <Label htmlFor="javascript">Requires JavaScript</Label>
                </div>
              </div>
              
              <div>
                <Label htmlFor="user-agent">User Agent</Label>
                <Input
                  id="user-agent"
                  placeholder="Custom user agent string"
                  value={formData.settings.userAgent}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, userAgent: e.target.value }
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