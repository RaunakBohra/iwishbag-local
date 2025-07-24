/**
 * Admin Overrides Manager
 * Interface for managing tax rate overrides, exemptions, and special rules
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  Tag,
  Globe,
  Package,
  User,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { format } from 'date-fns';

interface AdminOverride {
  id: string;
  override_type: 'tax_rate' | 'hsn_code' | 'weight' | 'minimum_valuation' | 'exemption';
  scope: 'route' | 'category' | 'product' | 'global';
  scope_identifier?: string;
  override_data: any;
  admin_id?: string;
  justification: string;
  expires_at?: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface OverrideFormData {
  override_type: 'tax_rate' | 'hsn_code' | 'weight' | 'minimum_valuation' | 'exemption';
  scope: 'route' | 'category' | 'product' | 'global';
  scope_identifier: string;
  justification: string;
  expires_at?: Date;
  is_active: boolean;
  override_data: {
    customs_rate?: number;
    local_tax_rate?: number;
    original_rate?: number;
    hsn_code?: string;
    weight_override?: number;
    minimum_valuation?: { amount: number; currency: string };
    exemption_reason?: string;
  };
}

export const AdminOverridesManager: React.FC = () => {
  const [overrides, setOverrides] = useState<AdminOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedScope, setSelectedScope] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOverride, setEditingOverride] = useState<AdminOverride | null>(null);
  const [showExpired, setShowExpired] = useState(false);
  const [formData, setFormData] = useState<OverrideFormData>({
    override_type: 'tax_rate',
    scope: 'route',
    scope_identifier: '',
    justification: '',
    is_active: true,
    override_data: {},
  });

  const overrideTypes = [
    { value: 'tax_rate', label: 'Tax Rate Override', icon: Tag },
    { value: 'hsn_code', label: 'HSN Code Override', icon: Package },
    { value: 'weight', label: 'Weight Override', icon: Package },
    { value: 'minimum_valuation', label: 'Minimum Valuation', icon: Tag },
    { value: 'exemption', label: 'Tax Exemption', icon: CheckCircle },
  ];

  const scopeTypes = [
    { value: 'global', label: 'Global', icon: Globe },
    { value: 'route', label: 'Specific Route', icon: Globe },
    { value: 'category', label: 'Product Category', icon: Package },
    { value: 'product', label: 'Specific Product', icon: Package },
  ];

  // Load overrides
  useEffect(() => {
    const loadOverrides = async () => {
      try {
        setLoading(true);
        // Mock data for demonstration
        const mockOverrides: AdminOverride[] = [
          {
            id: '1',
            override_type: 'tax_rate',
            scope: 'category',
            scope_identifier: 'electronics',
            override_data: {
              original_rate: 20,
              customs_rate: 15,
              local_tax_rate: 18,
              reason: 'electronics_promotion_2025',
            },
            admin_id: 'admin1',
            justification: 'Special electronics promotion for Q1 2025',
            expires_at: new Date('2025-03-31'),
            is_active: true,
            created_at: new Date('2025-01-01'),
            updated_at: new Date('2025-01-01'),
          },
          {
            id: '2',
            override_type: 'exemption',
            scope: 'route',
            scope_identifier: 'IN-NP',
            override_data: {
              exemption_reason: 'Educational materials exemption',
              applicable_hsn_codes: ['4901', '4902'],
            },
            admin_id: 'admin2',
            justification:
              'Educational materials are exempt from customs duty under bilateral agreement',
            is_active: true,
            created_at: new Date('2025-01-15'),
            updated_at: new Date('2025-01-15'),
          },
          {
            id: '3',
            override_type: 'minimum_valuation',
            scope: 'category',
            scope_identifier: 'clothing',
            override_data: {
              minimum_valuation: { amount: 10, currency: 'USD' },
              applies_to_countries: ['NP'],
            },
            admin_id: 'admin1',
            justification: 'Nepal government minimum valuation rule for textile products',
            is_active: true,
            created_at: new Date('2025-01-10'),
            updated_at: new Date('2025-01-10'),
          },
        ];
        setOverrides(mockOverrides);
      } catch (error) {
        console.error('Failed to load overrides:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOverrides();
  }, []);

  // Filter overrides
  const filteredOverrides = overrides.filter((override) => {
    const matchesSearch =
      !searchTerm ||
      override.scope_identifier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      override.justification.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === 'all' || override.override_type === selectedType;
    const matchesScope = selectedScope === 'all' || override.scope === selectedScope;

    const matchesExpired = showExpired || !override.expires_at || override.expires_at > new Date();

    return matchesSearch && matchesType && matchesScope && matchesExpired;
  });

  const handleOpenDialog = (override?: AdminOverride) => {
    if (override) {
      setEditingOverride(override);
      setFormData({
        override_type: override.override_type,
        scope: override.scope,
        scope_identifier: override.scope_identifier || '',
        justification: override.justification,
        expires_at: override.expires_at,
        is_active: override.is_active,
        override_data: override.override_data,
      });
    } else {
      setEditingOverride(null);
      setFormData({
        override_type: 'tax_rate',
        scope: 'route',
        scope_identifier: '',
        justification: '',
        is_active: true,
        override_data: {},
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      // In a real implementation, save to API
      console.log('Saving override:', formData);
      setIsDialogOpen(false);
      // Refresh the list
    } catch (error) {
      console.error('Failed to save override:', error);
    }
  };

  const handleDelete = async (overrideId: string) => {
    if (confirm('Are you sure you want to delete this override?')) {
      try {
        setOverrides((prev) => prev.filter((o) => o.id !== overrideId));
      } catch (error) {
        console.error('Failed to delete override:', error);
      }
    }
  };

  const handleToggleActive = async (overrideId: string, isActive: boolean) => {
    try {
      setOverrides((prev) =>
        prev.map((o) => (o.id === overrideId ? { ...o, is_active: isActive } : o)),
      );
    } catch (error) {
      console.error('Failed to toggle override:', error);
    }
  };

  const getStatusBadge = (override: AdminOverride) => {
    if (!override.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    if (override.expires_at && override.expires_at < new Date()) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (
      override.expires_at &&
      override.expires_at < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    ) {
      return (
        <Badge variant="outline" className="border-yellow-500 text-yellow-700">
          Expiring Soon
        </Badge>
      );
    }
    return <Badge variant="default">Active</Badge>;
  };

  const getTypeIcon = (type: string) => {
    const typeConfig = overrideTypes.find((t) => t.value === type);
    const Icon = typeConfig?.icon || Tag;
    return <Icon className="h-4 w-4" />;
  };

  const getScopeIcon = (scope: string) => {
    const scopeConfig = scopeTypes.find((s) => s.value === scope);
    const Icon = scopeConfig?.icon || Globe;
    return <Icon className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin overrides...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Overrides</h2>
          <p className="text-gray-600">Manage tax rate overrides, exemptions, and special rules</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Override
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search overrides..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Override Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {overrideTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedScope} onValueChange={setSelectedScope}>
                <SelectTrigger>
                  <SelectValue placeholder="Scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scopes</SelectItem>
                  {scopeTypes.map((scope) => (
                    <SelectItem key={scope.value} value={scope.value}>
                      {scope.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center space-x-2">
                <Switch id="show-expired" checked={showExpired} onCheckedChange={setShowExpired} />
                <Label htmlFor="show-expired" className="text-sm">
                  Show Expired
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Overrides</p>
                <p className="text-2xl font-bold">{overrides.length}</p>
              </div>
              <Tag className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold">
                  {
                    overrides.filter(
                      (o) => o.is_active && (!o.expires_at || o.expires_at > new Date()),
                    ).length
                  }
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-bold">
                  {
                    overrides.filter(
                      (o) =>
                        o.is_active &&
                        o.expires_at &&
                        o.expires_at > new Date() &&
                        o.expires_at < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    ).length
                  }
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tax Exemptions</p>
                <p className="text-2xl font-bold">
                  {overrides.filter((o) => o.override_type === 'exemption').length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overrides Table */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Overrides ({filteredOverrides.length})</CardTitle>
          <CardDescription>Click on any override to edit its details</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type & Scope</TableHead>
                <TableHead>Identifier</TableHead>
                <TableHead>Override Details</TableHead>
                <TableHead>Justification</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOverrides.map((override) => (
                <TableRow key={override.id} className="cursor-pointer hover:bg-gray-50">
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(override.override_type)}
                        <span className="font-medium text-sm">
                          {overrideTypes.find((t) => t.value === override.override_type)?.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        {getScopeIcon(override.scope)}
                        <span className="text-xs">
                          {scopeTypes.find((s) => s.value === override.scope)?.label}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {override.scope_identifier || 'Global'}
                    </code>
                  </TableCell>
                  <TableCell className="text-sm">
                    {override.override_type === 'tax_rate' && (
                      <div>
                        {override.override_data.customs_rate && (
                          <div>Customs: {override.override_data.customs_rate}%</div>
                        )}
                        {override.override_data.local_tax_rate && (
                          <div>Local Tax: {override.override_data.local_tax_rate}%</div>
                        )}
                      </div>
                    )}
                    {override.override_type === 'minimum_valuation' && (
                      <div>
                        Min: ${override.override_data.minimum_valuation?.amount}{' '}
                        {override.override_data.minimum_valuation?.currency}
                      </div>
                    )}
                    {override.override_type === 'exemption' && (
                      <div className="text-green-600">Tax Exempt</div>
                    )}
                    {override.override_type === 'weight' && (
                      <div>Weight: {override.override_data.weight_override}kg</div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-sm truncate" title={override.justification}>
                      {override.justification}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm">
                    {override.expires_at ? (
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {format(override.expires_at, 'MMM dd, yyyy')}
                      </div>
                    ) : (
                      <span className="text-gray-400">Never</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(override)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Switch
                        checked={override.is_active}
                        onCheckedChange={(checked) => handleToggleActive(override.id, checked)}
                        size="sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDialog(override)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(override.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredOverrides.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No overrides found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Override Dialog */}
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingOverride ? 'Edit Override' : 'Create New Override'}</DialogTitle>
          <DialogDescription>
            Configure tax overrides, exemptions, and special rules.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="override_type">Override Type</Label>
              <Select
                value={formData.override_type}
                onValueChange={(value: any) =>
                  setFormData((prev) => ({ ...prev, override_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {overrideTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="scope">Scope</Label>
              <Select
                value={formData.scope}
                onValueChange={(value: any) => setFormData((prev) => ({ ...prev, scope: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {scopeTypes.map((scope) => (
                    <SelectItem key={scope.value} value={scope.value}>
                      {scope.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="scope_identifier">
              Scope Identifier
              <span className="text-sm text-gray-500 ml-2">
                {formData.scope === 'route' && '(e.g., US-IN)'}
                {formData.scope === 'category' && '(e.g., electronics)'}
                {formData.scope === 'product' && '(e.g., product ID or pattern)'}
                {formData.scope === 'global' && '(leave empty for global scope)'}
              </span>
            </Label>
            <Input
              id="scope_identifier"
              value={formData.scope_identifier}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, scope_identifier: e.target.value }))
              }
              placeholder={
                formData.scope === 'route'
                  ? 'US-IN'
                  : formData.scope === 'category'
                    ? 'electronics'
                    : formData.scope === 'product'
                      ? 'product-123'
                      : 'Leave empty for global'
              }
            />
          </div>

          {/* Override Data based on type */}
          {formData.override_type === 'tax_rate' && (
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Tax Rate Override</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customs_rate">Customs Rate (%)</Label>
                  <Input
                    id="customs_rate"
                    type="number"
                    step="0.1"
                    value={formData.override_data.customs_rate || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        override_data: {
                          ...prev.override_data,
                          customs_rate: parseFloat(e.target.value) || undefined,
                        },
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="local_tax_rate">Local Tax Rate (%)</Label>
                  <Input
                    id="local_tax_rate"
                    type="number"
                    step="0.1"
                    value={formData.override_data.local_tax_rate || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        override_data: {
                          ...prev.override_data,
                          local_tax_rate: parseFloat(e.target.value) || undefined,
                        },
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {formData.override_type === 'minimum_valuation' && (
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Minimum Valuation Override</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min_val_amount">Minimum Amount</Label>
                  <Input
                    id="min_val_amount"
                    type="number"
                    step="0.01"
                    value={formData.override_data.minimum_valuation?.amount || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        override_data: {
                          ...prev.override_data,
                          minimum_valuation: {
                            ...prev.override_data.minimum_valuation,
                            amount: parseFloat(e.target.value) || 0,
                          },
                        },
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="min_val_currency">Currency</Label>
                  <Select
                    value={formData.override_data.minimum_valuation?.currency || 'USD'}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        override_data: {
                          ...prev.override_data,
                          minimum_valuation: {
                            ...prev.override_data.minimum_valuation,
                            currency: value,
                          },
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="INR">INR</SelectItem>
                      <SelectItem value="NPR">NPR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {formData.override_type === 'exemption' && (
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Tax Exemption</h4>
              <div>
                <Label htmlFor="exemption_reason">Exemption Reason</Label>
                <Textarea
                  id="exemption_reason"
                  value={formData.override_data.exemption_reason || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      override_data: {
                        ...prev.override_data,
                        exemption_reason: e.target.value,
                      },
                    }))
                  }
                  placeholder="e.g., Educational materials exemption under bilateral agreement"
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="justification">Justification</Label>
            <Textarea
              id="justification"
              value={formData.justification}
              onChange={(e) => setFormData((prev) => ({ ...prev, justification: e.target.value }))}
              placeholder="Explain why this override is necessary..."
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, is_active: checked }))
              }
            />
            <Label htmlFor="is_active">Active Override</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {editingOverride ? 'Update Override' : 'Create Override'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </div>
  );
};
