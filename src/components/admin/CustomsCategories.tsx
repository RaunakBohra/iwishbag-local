import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Edit } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";

type CustomsCategory = Tables<'customs_categories'>;

export const CustomsCategories = () => {
  const [editingCategory, setEditingCategory] = useState<CustomsCategory | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  // Test admin role access
  const { data: userRole, isLoading: userRoleLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      console.log('Checking user role for:', user.id);
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Error checking user role:', error);
        return null;
      }
      
      console.log('User role found:', data);
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['admin-customs-categories'],
    queryFn: async () => {
      console.log('Fetching customs categories...');
      console.log('Current user:', user?.id);
      console.log('User role:', userRole?.role);
      
      const { data, error } = await supabase
        .from('customs_categories')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching customs categories:', error);
        throw new Error(`Failed to fetch customs categories: ${error.message}`);
      }
      
      console.log('Customs categories fetched successfully:', data?.length || 0);
      return data;
    },
    retry: 2,
    retryDelay: 1000,
    enabled: !!user?.id && !!userRole,
  });

  const createMutation = useMutation({
    mutationFn: async (categoryData: Omit<CustomsCategory, 'created_at' | 'updated_at'>) => {
      console.log('Creating customs category:', categoryData);
      console.log('User role before create:', userRole?.role);
      
      const { error } = await supabase
        .from('customs_categories')
        .insert(categoryData);
      
      if (error) {
        console.error('Error creating customs category:', error);
        throw new Error(`Failed to create customs category: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customs-categories'] });
      setIsCreating(false);
      toast({ title: "Customs category created successfully" });
    },
    onError: (error) => {
      console.error('Create mutation error:', error);
      toast({ title: "Error creating customs category", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (categoryData: CustomsCategory) => {
      console.log('Updating customs category:', categoryData);
      console.log('User role before update:', userRole?.role);
      
      // Update both name and duty_percent
      const { error } = await supabase
        .from('customs_categories')
        .update({ 
          name: categoryData.name,
          duty_percent: categoryData.duty_percent,
          updated_at: new Date().toISOString()
        })
        .eq('id', categoryData.id); // Use id instead of name
      
      if (error) {
        console.error('Error updating customs category:', error);
        throw new Error(`Failed to update customs category: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customs-categories'] });
      setEditingCategory(null);
      toast({ title: "Customs category updated successfully" });
    },
    onError: (error) => {
      console.error('Update mutation error:', error);
      toast({ title: "Error updating customs category", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      console.log('Deleting customs category with ID:', categoryId);
      console.log('User role before delete:', userRole?.role);
      
      // Use id for deleting instead of name
      const { error } = await supabase
        .from('customs_categories')
        .delete()
        .eq('id', categoryId);
      
      if (error) {
        console.error('Error deleting customs category:', error);
        throw new Error(`Failed to delete customs category: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customs-categories'] });
      toast({ title: "Customs category deleted successfully" });
    },
    onError: (error) => {
      console.error('Delete mutation error:', error);
      toast({ title: "Error deleting customs category", description: error.message, variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const categoryData = {
      name: formData.get('name') as string,
      duty_percent: parseFloat(formData.get('duty_percent') as string) || 0,
    };

    if (editingCategory) {
      // For update, include all the original category data plus the updated fields
      updateMutation.mutate({
        ...editingCategory,
        name: categoryData.name,
        duty_percent: categoryData.duty_percent,
      });
    } else {
      // For create, just pass the new data
      createMutation.mutate(categoryData);
    }
  };

  if (isLoading) return <div>Loading customs categories...</div>;

  // Show loading while user role is being fetched
  if (!userRole && user?.id) {
    return <div>Loading user permissions...</div>;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Customs Categories</h2>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-red-600 mb-2">Error Loading Customs Categories</h3>
              <p className="text-muted-foreground mb-4">{error.message}</p>
              <p className="text-sm text-muted-foreground">
                User ID: {user?.id || 'Not logged in'}<br/>
                User Role: {userRole?.role || 'No role found'}<br/>
                This might be a permissions issue. Please check if you have admin access.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Customs Categories</h2>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            User Role: <span className="font-medium">{userRole?.role || 'No role'}</span>
          </div>
          <Button onClick={() => setIsCreating(true)}>Add Category</Button>
        </div>
      </div>

      {(isCreating || editingCategory) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Category Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  defaultValue={editingCategory?.name || ''} 
                  required 
                />
              </div>
              <div>
                <Label htmlFor="duty_percent">Duty Percentage (%)</Label>
                <Input 
                  id="duty_percent" 
                  name="duty_percent" 
                  type="number" 
                  step="0.01" 
                  defaultValue={editingCategory?.duty_percent || 0} 
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">{editingCategory ? 'Update' : 'Create'}</Button>
                <Button type="button" variant="outline" onClick={() => {
                  setEditingCategory(null);
                  setIsCreating(false);
                }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {categories?.map((category) => (
          <Card key={category.name}>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{category.name}</h3>
                  <p className="text-sm text-muted-foreground">Duty: {category.duty_percent}%</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingCategory(category)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(category.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
