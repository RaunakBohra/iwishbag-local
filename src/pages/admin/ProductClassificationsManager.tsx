import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  Search, 
  Filter,
  Edit,
  Trash2,
  Package,
  Download,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Globe,
  Tag,
  Weight,
  DollarSign
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { smartManagementService, ProductClassificationForm } from '@/services/SmartManagementService';
import { ProductClassification } from '@/services/ProductIntelligenceService';

const ProductClassificationsManager: React.FC = () => {
  const [classifications, setClassifications] = useState<ProductClassification[]>([]);
  const [filteredClassifications, setFilteredClassifications] = useState<ProductClassification[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [minConfidence, setMinConfidence] = useState<number>(0);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductClassification | null>(null);

  // Form data
  const [formData, setFormData] = useState<ProductClassificationForm>({
    classification_code: '',
    country_code: '',
    product_name: '',
    category: '',
    subcategory: '',
    description: '',
    typical_weight_kg: undefined,
    customs_rate: undefined,
    minimum_valuation_usd: undefined,
    confidence_score: 0.8,
    search_keywords: [],
  });

  const [keywordInput, setKeywordInput] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [classifications, searchTerm, selectedCountry, selectedCategory, minConfidence]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [classificationsData, countriesData, categoriesData] = await Promise.all([
        smartManagementService.getProductClassifications(),
        smartManagementService.getCountryConfigs(),
        smartManagementService.getAvailableCategories()
      ]);
      
      setClassifications(classificationsData);
      setCountries(countriesData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error Loading Data",
        description: "Failed to load product classifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...classifications];

    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.classification_code.includes(searchTerm) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCountry !== 'all') {
      filtered = filtered.filter(item => item.country_code === selectedCountry);
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    if (minConfidence > 0) {
      filtered = filtered.filter(item => item.confidence_score >= minConfidence);
    }

    setFilteredClassifications(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate classification code
      const country = countries.find(c => c.country_code === formData.country_code);
      if (country) {
        const validation = smartManagementService.validateClassificationCode(
          formData.classification_code,
          formData.country_code,
          country.classification_digits
        );
        
        if (!validation.valid) {
          toast({
            title: "Validation Error",
            description: validation.message,
            variant: "destructive",
          });
          return;
        }
      }

      if (editingItem) {
        await smartManagementService.updateProductClassification(editingItem.id, formData);
        toast({
          title: "Success",
          description: "Product classification updated successfully",
        });
        setShowEditModal(false);
      } else {
        await smartManagementService.createProductClassification(formData);
        toast({
          title: "Success", 
          description: "Product classification created successfully",
        });
        setShowAddModal(false);
      }

      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Error saving classification:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save classification",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (item: ProductClassification) => {
    setEditingItem(item);
    setFormData({
      classification_code: item.classification_code,
      country_code: item.country_code,
      product_name: item.product_name,
      category: item.category,
      subcategory: item.subcategory || '',
      description: item.description || '',
      typical_weight_kg: item.typical_weight_kg,
      customs_rate: item.customs_rate,
      minimum_valuation_usd: item.minimum_valuation_usd,
      confidence_score: item.confidence_score,
      search_keywords: item.search_keywords || [],
    });
    setKeywordInput(item.search_keywords?.join(', ') || '');
    setShowEditModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this classification?')) return;
    
    try {
      await smartManagementService.deleteProductClassification(id);
      toast({
        title: "Success",
        description: "Product classification deleted successfully",
      });
      loadData();
    } catch (error) {
      console.error('Error deleting classification:', error);
      toast({
        title: "Error",
        description: "Failed to delete classification",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedItems.length} classifications?`)) return;
    
    try {
      await smartManagementService.bulkDeleteClassifications(selectedItems);
      toast({
        title: "Success",
        description: `${selectedItems.length} classifications deleted successfully`,
      });
      setSelectedItems([]);
      loadData();
    } catch (error) {
      console.error('Error bulk deleting:', error);
      toast({
        title: "Error",
        description: "Failed to delete classifications",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      classification_code: '',
      country_code: '',
      product_name: '',
      category: '',
      subcategory: '',
      description: '',
      typical_weight_kg: undefined,
      customs_rate: undefined,
      minimum_valuation_usd: undefined,
      confidence_score: 0.8,
      search_keywords: [],
    });
    setKeywordInput('');
    setEditingItem(null);
  };

  const addKeyword = () => {
    if (keywordInput.trim()) {
      const keywords = keywordInput.split(',').map(k => k.trim()).filter(k => k);
      setFormData(prev => ({
        ...prev,
        search_keywords: [...new Set([...(prev.search_keywords || []), ...keywords])]
      }));
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      search_keywords: prev.search_keywords?.filter(k => k !== keyword) || []
    }));
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredClassifications.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredClassifications.map(item => item.id));
    }
  };

  const getCountryName = (countryCode: string) => {
    const country = countries.find(c => c.country_code === countryCode);
    return country ? country.country_name : countryCode;
  };

  const getClassificationSystem = (countryCode: string) => {
    const country = countries.find(c => c.country_code === countryCode);
    return country ? country.classification_system : 'HS';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-8 w-8 text-blue-600" />
            Product Classifications Manager
          </h1>
          <p className="text-gray-600 mt-1">
            Manage HSN/HS/HTS codes and product classifications across countries
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Classification
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Classifications</p>
                <p className="text-2xl font-bold text-blue-600">{classifications.length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Countries</p>
                <p className="text-2xl font-bold text-green-600">{countries.length}</p>
              </div>
              <Globe className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-2xl font-bold text-purple-600">{categories.length}</p>
              </div>
              <Tag className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Filtered Results</p>
                <p className="text-2xl font-bold text-orange-600">{filteredClassifications.length}</p>
              </div>
              <Filter className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Product name, HSN code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="country">Country</Label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {countries.map(country => (
                    <SelectItem key={country.country_code} value={country.country_code}>
                      {country.country_code} - {country.country_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="confidence">Min Confidence</Label>
              <Input
                id="confidence"
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={minConfidence}
                onChange={(e) => setMinConfidence(parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>

            <div className="flex items-end">
              <Button 
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCountry('all');
                  setSelectedCategory('all');
                  setMinConfidence(0);
                }}
                variant="outline"
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {selectedItems.length} item(s) selected
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleBulkDelete}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
                <Button
                  onClick={() => setSelectedItems([])}
                  variant="outline"
                  size="sm"
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Classifications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Product Classifications</CardTitle>
          <CardDescription>
            {filteredClassifications.length} of {classifications.length} classifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="ml-3 text-gray-600">Loading classifications...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedItems.length === filteredClassifications.length && filteredClassifications.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Weight (kg)</TableHead>
                    <TableHead>Customs Rate</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClassifications.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={() => toggleItemSelection(item.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {item.country_code}
                          </Badge>
                          <span className="text-xs text-gray-600">
                            {getClassificationSystem(item.country_code)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {item.classification_code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          {item.subcategory && (
                            <p className="text-xs text-gray-600">{item.subcategory}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.category}</Badge>
                      </TableCell>
                      <TableCell>
                        {item.typical_weight_kg ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Weight className="h-3 w-3" />
                            {item.typical_weight_kg}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.customs_rate ? (
                          <span className="flex items-center gap-1 text-sm">
                            <DollarSign className="h-3 w-3" />
                            {item.customs_rate}%
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={item.confidence_score >= 0.8 ? "default" : "secondary"}
                          className={item.confidence_score >= 0.8 ? "bg-green-100 text-green-800" : ""}
                        >
                          {(item.confidence_score * 100).toFixed(0)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleEdit(item)}
                            variant="outline"
                            size="sm"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(item.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredClassifications.length === 0 && !loading && (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No classifications found</p>
                  <p className="text-sm text-gray-500">Try adjusting your filters or add a new classification</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={showAddModal || showEditModal} onOpenChange={(open) => {
        if (!open) {
          setShowAddModal(false);
          setShowEditModal(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Classification' : 'Add New Classification'}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update the product classification details' : 'Create a new product classification entry'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="country_code">Country *</Label>
                <Select
                  value={formData.country_code}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, country_code: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map(country => (
                      <SelectItem key={country.country_code} value={country.country_code}>
                        {country.country_code} - {country.country_name} ({country.classification_system})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="classification_code">
                  Classification Code *
                  {formData.country_code && (
                    <span className="text-xs text-gray-500 ml-1">
                      ({getClassificationSystem(formData.country_code)} format)
                    </span>
                  )}
                </Label>
                <Input
                  id="classification_code"
                  value={formData.classification_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, classification_code: e.target.value }))}
                  placeholder="e.g., 8517"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="product_name">Product Name *</Label>
              <Input
                id="product_name"
                value={formData.product_name}
                onChange={(e) => setFormData(prev => ({ ...prev, product_name: e.target.value }))}
                placeholder="e.g., Mobile Phone / Smartphone"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                    <SelectItem value="electronics">electronics</SelectItem>
                    <SelectItem value="clothing">clothing</SelectItem>
                    <SelectItem value="books">books</SelectItem>
                    <SelectItem value="home_living">home_living</SelectItem>
                    <SelectItem value="automotive">automotive</SelectItem>
                    <SelectItem value="cosmetics">cosmetics</SelectItem>
                    <SelectItem value="food">food</SelectItem>
                    <SelectItem value="jewelry">jewelry</SelectItem>
                    <SelectItem value="toys">toys</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="subcategory">Subcategory</Label>
                <Input
                  id="subcategory"
                  value={formData.subcategory}
                  onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
                  placeholder="e.g., telecommunications"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detailed description of the product classification"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="typical_weight_kg">Weight (kg)</Label>
                <Input
                  id="typical_weight_kg"
                  type="number"
                  step="0.001"
                  min="0"
                  value={formData.typical_weight_kg || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    typical_weight_kg: e.target.value ? parseFloat(e.target.value) : undefined 
                  }))}
                  placeholder="0.180"
                />
              </div>

              <div>
                <Label htmlFor="customs_rate">Customs Rate (%)</Label>
                <Input
                  id="customs_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.customs_rate || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    customs_rate: e.target.value ? parseFloat(e.target.value) : undefined 
                  }))}
                  placeholder="15.00"
                />
              </div>

              <div>
                <Label htmlFor="minimum_valuation_usd">Min Valuation (USD)</Label>
                <Input
                  id="minimum_valuation_usd"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.minimum_valuation_usd || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    minimum_valuation_usd: e.target.value ? parseFloat(e.target.value) : undefined 
                  }))}
                  placeholder="25.00"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="confidence_score">Confidence Score</Label>
              <Input
                id="confidence_score"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={formData.confidence_score}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  confidence_score: parseFloat(e.target.value) || 0.8 
                }))}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Score between 0.0 and 1.0</p>
            </div>

            <div>
              <Label>Search Keywords</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="Enter keywords separated by commas"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                />
                <Button type="button" onClick={addKeyword} variant="outline">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.search_keywords?.map((keyword, index) => (
                  <Badge key={index} variant="secondary" className="cursor-pointer">
                    {keyword}
                    <button
                      type="button"
                      onClick={() => removeKeyword(keyword)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingItem ? 'Update' : 'Create'} Classification
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductClassificationsManager;