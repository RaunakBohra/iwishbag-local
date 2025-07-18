import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Edit, Plus, Search, Package, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

type CustomsCategory = Tables<'customs_categories'>;

export const CustomsCategories = () => {
  const [editingCategory, setEditingCategory] = useState<CustomsCategory | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CustomsCategory | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: isAdmin, isLoading: isAdminLoading } = useAdminRole();

  const {
    data: categories,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['customs-categories'],
    queryFn: async () => {
      if (!isAdmin) throw new Error('Not authorized');
      const { data, error } = await supabase.from('customs_categories').select('*').order('name');
      if (error) {
        console.error('Error fetching customs categories:', error);
        throw new Error(`Failed to fetch customs categories: ${error.message}`);
      }
      return data;
    },
    retry: 3,
    retryDelay: 1000,
    enabled: !!user?.id && !!isAdmin && !isAdminLoading,
  });

  const createMutation = useMutation({
    mutationFn: async (categoryData: Omit<CustomsCategory, 'created_at' | 'updated_at'>) => {
      const { error } = await supabase.from('customs_categories').insert(categoryData);

      if (error) {
        console.error('Error creating customs category:', error);
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customs-categories'] });
      setIsCreating(false);
      setEditingCategory(null);
      toast({
        title: 'Success',
        description: 'Customs category created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error creating customs category',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (categoryData: CustomsCategory) => {
      const { error } = await supabase
        .from('customs_categories')
        .update(categoryData)
        .eq('id', categoryData.id);

      if (error) {
        console.error('Error updating customs category:', error);
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customs-categories'] });
      setEditingCategory(null);
      toast({
        title: 'Success',
        description: 'Customs category updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating customs category',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase.from('customs_categories').delete().eq('id', categoryId);

      if (error) {
        console.error('Error deleting customs category:', error);
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customs-categories'] });
      toast({
        title: 'Success',
        description: 'Customs category deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error deleting customs category',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string)?.trim();
    const duty_percent = parseFloat(formData.get('duty_percent') as string) || 0;
    
    if (!name) {
      toast({
        title: 'Validation Error',
        description: 'Category name is required',
        variant: 'destructive',
      });
      return;
    }

    if (duty_percent < 0 || duty_percent > 100) {
      toast({
        title: 'Validation Error',
        description: 'Duty percentage must be between 0 and 100',
        variant: 'destructive',
      });
      return;
    }

    const categoryData = { name, duty_percent };

    if (editingCategory) {
      updateMutation.mutate({
        ...editingCategory,
        ...categoryData,
      });
    } else {
      createMutation.mutate(categoryData);
    }
  };

  const handleDelete = (category: CustomsCategory) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (categoryToDelete) {
      deleteMutation.mutate(categoryToDelete.id);
      setCategoryToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const filteredCategories = categories?.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Customs Categories</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage import duty categories and percentages
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-600">Loading customs categories...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Customs Categories</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage import duty categories and percentages
              </p>
            </div>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div>
              <h3 className="text-sm font-medium text-red-800">
                Error Loading Customs Categories
              </h3>
              <p className="mt-1 text-sm text-red-700">{error.message}</p>
              <div className="mt-3 text-xs text-red-600">
                <p>User ID: {user?.id || 'Not logged in'}</p>
                <p>User Role: {isAdmin ? 'Admin' : 'Not Admin'}</p>
                <p>This might be a permissions issue. Please check if you have admin access.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Customs Categories</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage import duty categories and percentages for international shipping
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-xs">
                {isAdmin ? 'Admin Access' : 'Limited Access'}
              </Badge>
              <Button 
                onClick={() => setIsCreating(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>
          </div>
        </div>

        {/* Search and Stats */}
        <div className="flex items-center justify-between">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
            <Input
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-80"
            />
          </div>
          <div className="text-sm text-gray-600">
            {filteredCategories.length} {filteredCategories.length === 1 ? 'category' : 'categories'}
          </div>
        </div>

        {/* Categories Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No categories found' : 'No categories yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm 
                  ? 'Try adjusting your search terms' 
                  : 'Create your first customs category to get started'
                }
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => setIsCreating(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-6 font-medium text-gray-900 text-sm">Category Name</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-900 text-sm">Duty Percentage</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-900 text-sm">Status</th>
                    <th className="text-right py-3 px-6 font-medium text-gray-900 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCategories.map((category) => (
                    <tr key={category.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-medium text-gray-900">{category.name}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-gray-700">{category.duty_percent}%</div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge 
                          variant={category.duty_percent > 0 ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {category.duty_percent > 0 ? 'Active' : 'No Duty'}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingCategory(category)}
                            className="text-gray-600 hover:text-blue-600"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(category)}
                            className="text-gray-600 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreating || !!editingCategory} onOpenChange={(open) => {
        if (!open) {
          setIsCreating(false);
          setEditingCategory(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory 
                ? 'Update the customs category details below.' 
                : 'Create a new customs category with duty percentage.'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                Category Name
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={editingCategory?.name || ''}
                placeholder="e.g., Electronics, Textiles, Books"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="duty_percent" className="text-sm font-medium text-gray-700">
                Duty Percentage (%)
              </Label>
              <Input
                id="duty_percent"
                name="duty_percent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                defaultValue={editingCategory?.duty_percent || 0}
                placeholder="0.00"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the import duty percentage (0-100)
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingCategory(null);
                  setIsCreating(false);
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {editingCategory ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {editingCategory ? 'Update Category' : 'Create Category'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the category "{categoryToDelete?.name}"? 
              This action cannot be undone and may affect existing quotes and orders.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Category'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
