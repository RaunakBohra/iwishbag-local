import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ExternalLink, Clock, CheckCircle, XCircle, AlertCircle, Edit3 } from 'lucide-react';

interface ManualAnalysisTask {
  id: string;
  url?: string;
  product_name?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assigned_to?: string;
  analysis_result?: any;
  notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export const ManualAnalysisTasks = () => {
  const [selectedTask, setSelectedTask] = useState<ManualAnalysisTask | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch manual analysis tasks
  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['manual-analysis-tasks'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('manual_analysis_tasks')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data as ManualAnalysisTask[];
      } catch (error) {
        console.warn('Manual analysis tasks table not available:', error);
        return [] as ManualAnalysisTask[];
      }
    }
  });

  // Update task status
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<ManualAnalysisTask> }) => {
      try {
        const { error } = await supabase
          .from('manual_analysis_tasks')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
            completed_at: updates.status === 'completed' ? new Date().toISOString() : undefined
          })
          .eq('id', taskId);

        if (error) throw error;
      } catch (error) {
        console.warn('Manual analysis tasks table not available:', error);
        throw new Error('Manual analysis tasks table not available');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual-analysis-tasks'] });
      toast({
        title: "Task Updated",
        description: "Manual analysis task has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Complete task with analysis result
  const completeTaskMutation = useMutation({
    mutationFn: async ({ taskId, analysisResult }: { taskId: string; analysisResult: any }) => {
      try {
        const { error } = await supabase
          .from('manual_analysis_tasks')
          .update({
            status: 'completed',
            analysis_result: analysisResult,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', taskId);

        if (error) throw error;
      } catch (error) {
        console.warn('Manual analysis tasks table not available:', error);
        throw new Error('Manual analysis tasks table not available');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual-analysis-tasks'] });
      setIsEditDialogOpen(false);
      setSelectedTask(null);
      toast({
        title: "Task Completed",
        description: "Manual analysis task has been completed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Completion Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'in_progress':
        return <Edit3 className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    // For manual analysis tasks, we'll use a custom mapping since these are not quote/order statuses
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      in_progress: "secondary",
      completed: "default",
      failed: "destructive"
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status.replace('_', ' ')}</span>
      </Badge>
    );
  };

  const handleEditTask = (task: ManualAnalysisTask) => {
    setSelectedTask(task);
    setIsEditDialogOpen(true);
  };

  const handleCompleteTask = (formData: any) => {
    if (!selectedTask) return;

    const analysisResult = {
      name: formData.productName,
      price: parseFloat(formData.price),
      weight: parseFloat(formData.weight),
      category: formData.category,
      currency: formData.currency,
      availability: true,
      imageUrl: formData.imageUrl,
      description: formData.description,
      brand: formData.brand,
      dimensions: formData.dimensions ? {
        length: parseFloat(formData.dimensions.length),
        width: parseFloat(formData.dimensions.width),
        height: parseFloat(formData.dimensions.height)
      } : undefined
    };

    completeTaskMutation.mutate({
      taskId: selectedTask.id,
      analysisResult
    });
  };

  const stats = {
    total: tasks?.length || 0,
    pending: tasks?.filter(t => t.status === 'pending').length || 0,
    inProgress: tasks?.filter(t => t.status === 'in_progress').length || 0,
    completed: tasks?.filter(t => t.status === 'completed').length || 0,
    failed: tasks?.filter(t => t.status === 'failed').length || 0
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Manual Analysis Tasks</CardTitle>
          <CardDescription>Loading tasks...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Show message if table is not available
  if (error && error.message.includes('not available')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Manual Analysis Tasks</CardTitle>
          <CardDescription>Manual analysis tasks feature is not available in the current database schema.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This feature requires the manual_analysis_tasks table to be created in the database.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Tasks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-sm text-muted-foreground">Failed</div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Analysis Tasks</CardTitle>
          <CardDescription>
            Products that require manual analysis and pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks?.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <div className="font-medium">
                      {task.product_name || 'Unknown Product'}
                    </div>
                    {task.notes && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {task.notes}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {task.url ? (
                      <a
                        href={task.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View Product
                      </a>
                    ) : (
                      <span className="text-muted-foreground">No URL</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(task.status)}
                  </TableCell>
                  <TableCell>
                    {new Date(task.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditTask(task)}
                      disabled={task.status === 'completed'}
                    >
                      <Edit3 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Manual Analysis</DialogTitle>
            <DialogDescription>
              Provide product details for manual analysis
            </DialogDescription>
          </DialogHeader>
          
          {selectedTask && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleCompleteTask(Object.fromEntries(formData));
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="productName">Product Name</Label>
                  <Input
                    id="productName"
                    name="productName"
                    defaultValue={selectedTask.product_name || ''}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="price">Price (USD)</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    name="weight"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select name="category" defaultValue="other">
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="electronics">Electronics</SelectItem>
                      <SelectItem value="clothing">Clothing</SelectItem>
                      <SelectItem value="home">Home & Garden</SelectItem>
                      <SelectItem value="beauty">Beauty & Health</SelectItem>
                      <SelectItem value="sports">Sports & Outdoors</SelectItem>
                      <SelectItem value="toys">Toys & Games</SelectItem>
                      <SelectItem value="books">Books & Media</SelectItem>
                      <SelectItem value="automotive">Automotive</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select name="currency" defaultValue="USD">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="JPY">JPY</SelectItem>
                      <SelectItem value="CNY">CNY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input
                    id="imageUrl"
                    name="imageUrl"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  name="brand"
                  placeholder="Product brand"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Product description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="length">Length (cm)</Label>
                  <Input
                    id="length"
                    name="dimensions.length"
                    type="number"
                    step="0.1"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="width">Width (cm)</Label>
                  <Input
                    id="width"
                    name="dimensions.width"
                    type="number"
                    step="0.1"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    name="dimensions.height"
                    type="number"
                    step="0.1"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={completeTaskMutation.isPending}
                >
                  {completeTaskMutation.isPending ? 'Completing...' : 'Complete Analysis'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}; 