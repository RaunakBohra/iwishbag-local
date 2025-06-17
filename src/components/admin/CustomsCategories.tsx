
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

type CustomsCategory = Tables<'customs_categories'>;

export const CustomsCategories = () => {
  const [editingCategory, setEditingCategory] = useState<CustomsCategory | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: categories, isLoading } = useQuery({
    queryKey: ['admin-customs-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customs_categories')
        .select('*')
        .order('name');
      if (error) throw new Error(error.message);
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (categoryData: Omit<CustomsCategory, 'created_at' | 'updated_at'>) => {
      const { error } = await supabase
        .from('customs_categories')
        .insert(categoryData);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customs-categories'] });
      setIsCreating(false);
      toast({ title: "Customs category created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error creating customs category", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (categoryData: CustomsCategory) => {
      const { error } = await supabase
        .from('customs_categories')
        .update({ duty_percent: categoryData.duty_percent })
        .eq('name', categoryData.name);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customs-categories'] });
      setEditingCategory(null);
      toast({ title: "Customs category updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error updating customs category", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from('customs_categories')
        .delete()
        .eq('name', name);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customs-categories'] });
      toast({ title: "Customs category deleted successfully" });
    },
    onError: (error) => {
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
      updateMutation.mutate({ ...categoryData, created_at: editingCategory.created_at, updated_at: editingCategory.updated_at });
    } else {
      createMutation.mutate(categoryData);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Customs Categories</h2>
        <Button onClick={() => setIsCreating(true)}>Add Category</Button>
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
                  disabled={!!editingCategory}
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
                  <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(category.name)}>
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
