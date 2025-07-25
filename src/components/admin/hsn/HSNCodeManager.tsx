/**
 * HSN Code Manager
 * Interface for managing HSN master database codes, categories, and tax rates
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
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Tag,
  Weight,
  Calculator,
  Download,
  Upload,
  Filter,
} from 'lucide-react';
import { unifiedDataEngine, HSNMasterRecord } from '@/services/UnifiedDataEngine';

interface HSNFormData {
  hsn_code: string;
  description: string;
  category: string;
  subcategory: string;
  keywords: string[];
  weight_data: {
    typical_weights: {
      per_unit: {
        min: number;
        max: number;
        average: number;
      };
    };
    packaging: {
      additional_weight: number;
    };
  };
  tax_data: {
    typical_rates: {
      customs: { min: number; max: number; common: number };
      gst?: { standard: number };
      vat?: { common: number };
      sales_tax?: { standard: number };
    };
  };
  classification_data: {
    auto_classification: {
      keywords: string[];
      confidence: number;
    };
  };
}

export const HSNCodeManager: React.FC = () => {
  const [hsnCodes, setHsnCodes] = useState<HSNMasterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHSN, setEditingHSN] = useState<HSNMasterRecord | null>(null);
  const [formData, setFormData] = useState<HSNFormData>({
    hsn_code: '',
    description: '',
    category: '',
    subcategory: '',
    keywords: [],
    weight_data: {
      typical_weights: {
        per_unit: { min: 0, max: 0, average: 0 },
      },
      packaging: { additional_weight: 0 },
    },
    tax_data: {
      typical_rates: {
        customs: { min: 0, max: 0, common: 0 },
      },
    },
    classification_data: {
      auto_classification: {
        keywords: [],
        confidence: 0.8,
      },
    },
  });

  const categories = [
    'electronics',
    'clothing',
    'books',
    'home_garden',
    'sports',
    'automotive',
    'health_beauty',
    'toys_games',
    'food_beverages',
  ];

  // Load HSN codes
  useEffect(() => {
    const loadHSNCodes = async () => {
      try {
        setLoading(true);
        // In a real implementation, we'd fetch from the API
        // For now, we'll simulate loading HSN codes
        const mockHSNCodes: HSNMasterRecord[] = [
          {
            id: '1',
            hsn_code: '8517',
            description: 'Mobile phones and communication equipment',
            category: 'electronics',
            subcategory: 'communication_devices',
            keywords: ['mobile', 'phone', 'iphone', 'samsung', 'smartphone'],
            weight_data: {
              typical_weights: {
                per_unit: { min: 0.12, max: 0.25, average: 0.18 },
              },
              packaging: { additional_weight: 0.05 },
            },
            tax_data: {
              typical_rates: {
                customs: { min: 15, max: 25, common: 20 },
                gst: { standard: 18 },
                vat: { common: 13 },
              },
            },
            classification_data: {
              auto_classification: {
                keywords: ['iphone', 'samsung', 'mobile', 'smartphone'],
                confidence: 0.95,
              },
            },
            is_active: true,
          },
          {
            id: '2',
            hsn_code: '6109',
            description: 'T-shirts and similar garments',
            category: 'clothing',
            subcategory: 'tops',
            keywords: ['tshirt', 't-shirt', 'shirt', 'tee', 'polo'],
            weight_data: {
              typical_weights: {
                per_unit: { min: 0.1, max: 0.25, average: 0.15 },
              },
              packaging: { additional_weight: 0.02 },
            },
            tax_data: {
              typical_rates: {
                customs: { min: 10, max: 15, common: 12 },
                gst: { standard: 12 },
                vat: { common: 13 },
              },
            },
            classification_data: {
              auto_classification: {
                keywords: ['tshirt', 't-shirt', 'shirt', 'polo'],
                confidence: 0.85,
              },
            },
            is_active: true,
          },
        ];
        setHsnCodes(mockHSNCodes);
      } catch (error) {
        console.error('Failed to load HSN codes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHSNCodes();
  }, []);

  // Filter HSN codes based on search and category
  const filteredHSNCodes = hsnCodes.filter((hsn) => {
    const matchesSearch =
      !searchTerm ||
      hsn.hsn_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hsn.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hsn.keywords.some((keyword) => keyword.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || hsn.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleOpenDialog = (hsn?: HSNMasterRecord) => {
    if (hsn) {
      setEditingHSN(hsn);
      setFormData({
        hsn_code: hsn.hsn_code,
        description: hsn.description,
        category: hsn.category,
        subcategory: hsn.subcategory || '',
        keywords: hsn.keywords,
        weight_data: hsn.weight_data as any,
        tax_data: hsn.tax_data as any,
        classification_data: hsn.classification_data as any,
      });
    } else {
      setEditingHSN(null);
      setFormData({
        hsn_code: '',
        description: '',
        category: '',
        subcategory: '',
        keywords: [],
        weight_data: {
          typical_weights: {
            per_unit: { min: 0, max: 0, average: 0 },
          },
          packaging: { additional_weight: 0 },
        },
        tax_data: {
          typical_rates: {
            customs: { min: 0, max: 0, common: 0 },
          },
        },
        classification_data: {
          auto_classification: {
            keywords: [],
            confidence: 0.8,
          },
        },
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      // In a real implementation, save to API
      console.log('Saving HSN code:', formData);
      setIsDialogOpen(false);
      // Refresh the list
    } catch (error) {
      console.error('Failed to save HSN code:', error);
    }
  };

  const handleDelete = async (hsnId: string) => {
    if (confirm('Are you sure you want to delete this HSN code?')) {
      try {
        // In a real implementation, delete via API
        setHsnCodes((prev) => prev.filter((hsn) => hsn.id !== hsnId));
      } catch (error) {
        console.error('Failed to delete HSN code:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading HSN codes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">HSN Code Management</h2>
          <p className="text-gray-600">Manage HSN codes, categories, and tax rates</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add HSN Code
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search HSN codes, descriptions, or keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.replace('_', ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <p className="text-sm font-medium text-gray-600">Total HSN Codes</p>
                <p className="text-2xl font-bold">{hsnCodes.length}</p>
              </div>
              <Tag className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Codes</p>
                <p className="text-2xl font-bold">{hsnCodes.filter((h) => h.is_active).length}</p>
              </div>
              <Tag className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-2xl font-bold">
                  {new Set(hsnCodes.map((h) => h.category)).size}
                </p>
              </div>
              <Filter className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Confidence</p>
                <p className="text-2xl font-bold">
                  {(
                    (hsnCodes.reduce(
                      (acc, h) =>
                        acc + (h.classification_data as any)?.auto_classification?.confidence || 0,
                      0,
                    ) /
                      hsnCodes.length) *
                    100
                  ).toFixed(0)}
                  %
                </p>
              </div>
              <Calculator className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* HSN Codes Table */}
      <Card>
        <CardHeader>
          <CardTitle>HSN Codes ({filteredHSNCodes.length})</CardTitle>
          <CardDescription>Click on any HSN code to edit its details</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>HSN Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Weight Range</TableHead>
                <TableHead>Tax Rates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHSNCodes.map((hsn) => (
                <TableRow key={hsn.id} className="cursor-pointer hover:bg-gray-50">
                  <TableCell className="font-mono font-medium">{hsn.hsn_code}</TableCell>
                  <TableCell className="max-w-xs truncate">{hsn.description}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{hsn.category.replace('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {hsn.weight_data?.typical_weights?.per_unit ? (
                      <>
                        {hsn.weight_data.typical_weights.per_unit.min}kg -{' '}
                        {hsn.weight_data.typical_weights.per_unit.max}kg
                        <br />
                        <span className="text-gray-500">
                          Avg: {hsn.weight_data.typical_weights.per_unit.average}kg
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-400">No data</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {hsn.tax_data?.typical_rates ? (
                      <>
                        Customs: {(hsn.tax_data.typical_rates as any).customs?.common || 0}%
                        <br />
                        <span className="text-gray-500">
                          Local:{' '}
                          {(hsn.tax_data.typical_rates as any).gst?.standard ||
                            (hsn.tax_data.typical_rates as any).vat?.common ||
                            0}
                          %
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-400">No data</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={hsn.is_active ? 'default' : 'secondary'}>
                      {hsn.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenDialog(hsn)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(hsn.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredHSNCodes.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No HSN codes found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* HSN Code Dialog */}
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingHSN ? 'Edit HSN Code' : 'Add New HSN Code'}</DialogTitle>
          <DialogDescription>
            Configure HSN code details, tax rates, and classification data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hsn_code">HSN Code</Label>
              <Input
                id="hsn_code"
                value={formData.hsn_code}
                onChange={(e) => setFormData((prev) => ({ ...prev, hsn_code: e.target.value }))}
                placeholder="e.g., 8517"
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.replace('_', ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="e.g., Mobile phones and communication equipment"
            />
          </div>

          <div>
            <Label htmlFor="subcategory">Subcategory</Label>
            <Input
              id="subcategory"
              value={formData.subcategory}
              onChange={(e) => setFormData((prev) => ({ ...prev, subcategory: e.target.value }))}
              placeholder="e.g., communication_devices"
            />
          </div>

          <div>
            <Label htmlFor="keywords">Keywords (comma-separated)</Label>
            <Input
              id="keywords"
              value={formData.keywords.join(', ')}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  keywords: e.target.value
                    .split(',')
                    .map((k) => k.trim())
                    .filter((k) => k),
                }))
              }
              placeholder="e.g., mobile, phone, iphone, samsung"
            />
          </div>

          {/* Weight Configuration */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Weight className="h-4 w-4" />
              Weight Configuration
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="weight_min">Min Weight (kg)</Label>
                <Input
                  id="weight_min"
                  type="number"
                  step="0.001"
                  value={formData.weight_data.typical_weights.per_unit.min}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      weight_data: {
                        ...prev.weight_data,
                        typical_weights: {
                          ...prev.weight_data.typical_weights,
                          per_unit: {
                            ...prev.weight_data.typical_weights.per_unit,
                            min: parseFloat(e.target.value) || 0,
                          },
                        },
                      },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="weight_max">Max Weight (kg)</Label>
                <Input
                  id="weight_max"
                  type="number"
                  step="0.001"
                  value={formData.weight_data.typical_weights.per_unit.max}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      weight_data: {
                        ...prev.weight_data,
                        typical_weights: {
                          ...prev.weight_data.typical_weights,
                          per_unit: {
                            ...prev.weight_data.typical_weights.per_unit,
                            max: parseFloat(e.target.value) || 0,
                          },
                        },
                      },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="weight_avg">Average Weight (kg)</Label>
                <Input
                  id="weight_avg"
                  type="number"
                  step="0.001"
                  value={formData.weight_data.typical_weights.per_unit.average}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      weight_data: {
                        ...prev.weight_data,
                        typical_weights: {
                          ...prev.weight_data.typical_weights,
                          per_unit: {
                            ...prev.weight_data.typical_weights.per_unit,
                            average: parseFloat(e.target.value) || 0,
                          },
                        },
                      },
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Tax Configuration */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Tax Configuration
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="customs_rate">Customs Rate (%)</Label>
                <Input
                  id="customs_rate"
                  type="number"
                  step="0.1"
                  value={formData.tax_data.typical_rates.customs.common}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      tax_data: {
                        ...prev.tax_data,
                        typical_rates: {
                          ...prev.tax_data.typical_rates,
                          customs: {
                            ...prev.tax_data.typical_rates.customs,
                            common: parseFloat(e.target.value) || 0,
                          },
                        },
                      },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="gst_rate">GST Rate (%)</Label>
                <Input
                  id="gst_rate"
                  type="number"
                  step="0.1"
                  value={(formData.tax_data.typical_rates as any).gst?.standard || 0}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      tax_data: {
                        ...prev.tax_data,
                        typical_rates: {
                          ...prev.tax_data.typical_rates,
                          gst: { standard: parseFloat(e.target.value) || 0 },
                        },
                      },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="vat_rate">VAT Rate (%)</Label>
                <Input
                  id="vat_rate"
                  type="number"
                  step="0.1"
                  value={(formData.tax_data.typical_rates as any).vat?.common || 0}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      tax_data: {
                        ...prev.tax_data,
                        typical_rates: {
                          ...prev.tax_data.typical_rates,
                          vat: { common: parseFloat(e.target.value) || 0 },
                        },
                      },
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>{editingHSN ? 'Update HSN Code' : 'Create HSN Code'}</Button>
        </DialogFooter>
      </DialogContent>
    </div>
  );
};
