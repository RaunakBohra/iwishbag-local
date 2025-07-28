/**
 * Consolidation Processing Panel for Admin
 * 
 * Handles the physical consolidation workflow:
 * - View pending consolidation requests
 * - Process consolidations (combine packages)
 * - Update consolidated package details
 * - Generate shipping labels
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  Archive,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Camera,
  Scale,
  Ruler,
  DollarSign,
  Clock,
  User,
  MapPin,
  Truck,
  FileText,
  Download,
  Plus,
  ArrowRight,
  CreditCard,
  ExternalLink,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import type { ConsolidationGroup, ReceivedPackage } from '@/services/PackageForwardingService';

interface ConsolidationWithDetails extends ConsolidationGroup {
  user: {
    id: string;
    email: string;
    full_name?: string;
  };
  packages: ReceivedPackage[];
  quote?: {
    id: string;
    status: string;
    final_total_usd: number;
    created_at: string;
  };
}

interface ProcessingData {
  actualWeight: number;
  dimensions: { length: number; width: number; height: number };
  photos: string[];
  processingNotes: string;
  shippingCarrier?: string;
  shippingTrackingNumber?: string;
}

export const ConsolidationProcessingPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState<ConsolidationWithDetails | null>(null);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [processingData, setProcessingData] = useState<ProcessingData>({
    actualWeight: 0,
    dimensions: { length: 0, width: 0, height: 0 },
    photos: [],
    processingNotes: '',
  });
  const [activeTab, setActiveTab] = useState<'pending' | 'processing' | 'completed'>('pending');
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showLabelDialog, setShowLabelDialog] = useState(false);
  const [selectedGroupForDetails, setSelectedGroupForDetails] = useState<ConsolidationWithDetails | null>(null);

  // Fetch consolidation groups with details
  const { data: consolidations = [], isLoading } = useQuery({
    queryKey: ['admin-consolidations', activeTab],
    queryFn: async () => {
      let statusFilter: string[];
      switch (activeTab) {
        case 'pending':
          statusFilter = ['pending'];
          break;
        case 'processing':
          statusFilter = ['processing'];
          break;
        case 'completed':
          statusFilter = ['consolidated', 'shipped', 'delivered'];
          break;
      }

      const { data, error } = await supabase
        .from('consolidation_groups')
        .select('*')
        .in('status', statusFilter)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles
      const userIds = [...new Set((data || []).map(group => group.user_id))];
      let profiles: any[] = [];
      
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);
        profiles = profileData || [];
      }

      // Fetch packages for each group and quote information
      const groupsWithPackages = await Promise.all(
        (data || []).map(async (group) => {
          const { data: packages } = await supabase
            .from('received_packages')
            .select('*')
            .in('id', group.original_package_ids || []);

          // Fetch associated quote if quote_id exists
          let quote = null;
          if (group.quote_id) {
            const { data: quoteData } = await supabase
              .from('quotes')
              .select('id, status, final_total_usd, created_at')
              .eq('id', group.quote_id)
              .single();
            quote = quoteData;
          }

          const profile = profiles?.find(p => p.id === group.user_id);

          return {
            ...group,
            user: {
              id: group.user_id,
              email: profile?.email || 'Unknown',
              full_name: profile?.full_name,
            },
            packages: packages || [],
            quote,
          };
        })
      );

      return groupsWithPackages as ConsolidationWithDetails[];
    },
  });

  // Process consolidation mutation
  const processConsolidationMutation = useMutation({
    mutationFn: async ({ groupId, data }: { groupId: string; data: ProcessingData }) => {
      // Update consolidation group
      const { error: groupError } = await supabase
        .from('consolidation_groups')
        .update({
          status: 'processing',
          consolidated_weight_kg: data.actualWeight,
          consolidated_dimensions: data.dimensions,
          consolidated_photos: data.photos.map(url => ({
            url,
            type: 'consolidated',
            uploaded_at: new Date().toISOString(),
          })),
          consolidated_by_staff_id: (await supabase.auth.getUser()).data.user?.id,
          consolidation_date: new Date().toISOString(),
        })
        .eq('id', groupId);

      if (groupError) throw groupError;

      // Update individual packages status
      const group = consolidations.find(g => g.id === groupId);
      if (group) {
        const { error: packagesError } = await supabase
          .from('received_packages')
          .update({
            status: 'consolidated',
            consolidation_group_id: groupId,
          })
          .in('id', group.original_package_ids || []);

        if (packagesError) throw packagesError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-consolidations'] });
      toast({
        title: 'Consolidation Processed',
        description: 'The consolidation has been marked as processing',
      });
      setShowProcessDialog(false);
      setSelectedGroup(null);
    },
    onError: (error) => {
      toast({
        title: 'Processing Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mark as ready to ship mutation
  const markReadyToShipMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from('consolidation_groups')
        .update({ status: 'consolidated' })
        .eq('id', groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-consolidations'] });
      toast({
        title: 'Status Updated',
        description: 'Consolidation marked as ready to ship',
      });
    },
  });

  // Generate shipping label
  const generateShippingLabel = (group: ConsolidationWithDetails) => {
    setSelectedGroupForDetails(group);
    setShowLabelDialog(true);
  };

  // Generate shipping label mutation
  const generateLabelMutation = useMutation({
    mutationFn: async ({ groupId, carrier, trackingNumber }: {
      groupId: string;
      carrier: string;
      trackingNumber: string;
    }) => {
      const { error } = await supabase
        .from('consolidation_groups')
        .update({
          status: 'shipped',
          shipping_carrier: carrier,
          shipping_tracking_number: trackingNumber,
          shipped_date: new Date().toISOString(),
        })
        .eq('id', groupId);

      if (error) throw error;

      // In a real implementation, generate actual shipping label with carrier API
      const labelData = {
        carrier,
        trackingNumber,
        customer: selectedGroupForDetails?.user.full_name || selectedGroupForDetails?.user.email,
        weight: selectedGroupForDetails?.consolidated_weight_kg,
        dimensions: selectedGroupForDetails?.consolidated_dimensions,
        timestamp: new Date().toISOString(),
      };

      // Generate downloadable label (mock implementation)
      const labelContent = `
SHIPPING LABEL - iwishBag Package Forwarding
===============================================

To: ${labelData.customer}
Carrier: ${labelData.carrier.toUpperCase()}
Tracking: ${labelData.trackingNumber}
Weight: ${labelData.weight}kg
Dimensions: ${labelData.dimensions?.length}×${labelData.dimensions?.width}×${labelData.dimensions?.height}cm

Generated: ${new Date(labelData.timestamp).toLocaleString()}

(In production, this would be a PDF with barcodes and proper formatting)
      `.trim();

      // Download as text file (in production would be PDF)
      const blob = new Blob([labelContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shipping-label-${trackingNumber}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-consolidations'] });
      toast({
        title: 'Label Generated',
        description: 'Shipping label generated and consolidation marked as shipped',
      });
      setShowLabelDialog(false);
      setSelectedGroupForDetails(null);
    },
    onError: (error) => {
      toast({
        title: 'Label Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // View details handler
  const viewGroupDetails = (group: ConsolidationWithDetails) => {
    setSelectedGroupForDetails(group);
    setShowDetailsDialog(true);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      consolidated: 'bg-green-100 text-green-800',
      shipped: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusColor = (quoteStatus: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      payment_pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      approved: 'bg-blue-100 text-blue-800',
      ordered: 'bg-indigo-100 text-indigo-800',
      shipped: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
      expired: 'bg-gray-100 text-gray-800',
    };
    return colors[quoteStatus] || 'bg-gray-100 text-gray-800';
  };

  const calculateTotalValue = (packages: ReceivedPackage[]) => {
    return packages.reduce((sum, pkg) => sum + (pkg.declared_value_usd || 0), 0);
  };

  const calculateTotalWeight = (packages: ReceivedPackage[]) => {
    return packages.reduce((sum, pkg) => sum + pkg.weight_kg, 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Consolidation Processing</h2>
          <p className="text-muted-foreground">
            Process customer consolidation requests
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            Pending ({consolidations.filter(c => c.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="processing">
            Processing ({consolidations.filter(c => c.status === 'processing').length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({consolidations.filter(c => ['consolidated', 'shipped', 'delivered'].includes(c.status)).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : consolidations.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Consolidations</h3>
                <p className="text-muted-foreground">
                  No {activeTab} consolidation requests at this time
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {consolidations.map((group) => (
                <Card key={group.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {group.group_name || 'Consolidation Request'}
                        </CardTitle>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {group.user.full_name || group.user.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {format(new Date(group.created_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getStatusColor(group.status)}>
                          {group.status}
                        </Badge>
                        {group.quote && (
                          <Badge className={getPaymentStatusColor(group.quote.status)}>
                            <CreditCard className="h-3 w-3 mr-1" />
                            {group.quote.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Package Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{group.package_count} Packages</p>
                          <p className="text-xs text-muted-foreground">To consolidate</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Scale className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {calculateTotalWeight(group.packages).toFixed(2)}kg
                          </p>
                          <p className="text-xs text-muted-foreground">Total weight</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            ${calculateTotalValue(group.packages).toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">Total value</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {group.quote 
                              ? `$${group.quote.final_total_usd?.toFixed(2) || '0.00'}` 
                              : `$${group.consolidation_fee_usd}`
                            }
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {group.quote ? 'Total quote' : 'Consolidation fee'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Package List */}
                    <div className="space-y-2 mb-4">
                      <Label>Packages to Consolidate:</Label>
                      <div className="space-y-1">
                        {group.packages.map((pkg, index) => (
                          <div key={pkg.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                            <span>
                              {index + 1}. {pkg.sender_name} - {pkg.package_description}
                            </span>
                            <span className="text-muted-foreground">
                              {pkg.weight_kg}kg • {pkg.tracking_number || 'No tracking'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Consolidation Details (if processed) */}
                    {group.consolidated_weight_kg && (
                      <Alert className="mb-4">
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-1">
                            <p>Consolidated Weight: {group.consolidated_weight_kg}kg</p>
                            {group.consolidated_dimensions && (
                              <p>
                                Dimensions: {group.consolidated_dimensions.length}×
                                {group.consolidated_dimensions.width}×
                                {group.consolidated_dimensions.height}cm
                              </p>
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Payment Status Alert (if quote exists and not paid) */}
                    {group.quote && group.quote.status !== 'paid' && (
                      <Alert className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="flex items-center justify-between">
                            <span>
                              Payment required before processing. Status: <strong>{group.quote.status}</strong>
                            </span>
                            {group.quote && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={`/dashboard/quotes/${group.quote.id}`} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  View Quote
                                </a>
                              </Button>
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                      {group.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedGroup(group);
                              setProcessingData({
                                actualWeight: calculateTotalWeight(group.packages),
                                dimensions: { length: 0, width: 0, height: 0 },
                                photos: [],
                                processingNotes: '',
                              });
                              setShowProcessDialog(true);
                            }}
                            disabled={group.quote && group.quote.status !== 'paid'}
                            title={
                              group.quote && group.quote.status !== 'paid' 
                                ? 'Payment required before processing' 
                                : undefined
                            }
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            Start Processing
                          </Button>
                        </>
                      )}
                      {group.status === 'processing' && (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => markReadyToShipMutation.mutate(group.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark Ready to Ship
                          </Button>
                        </>
                      )}
                      {group.status === 'consolidated' && (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => generateShippingLabel(group)}
                          >
                            <Truck className="h-4 w-4 mr-2" />
                            Generate Label
                          </Button>
                        </>
                      )}
                      {group.quote && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          asChild
                        >
                          <a href={`/dashboard/quotes/${group.quote.id}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View Quote
                          </a>
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => viewGroupDetails(group)}
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Processing Dialog */}
      {showProcessDialog && selectedGroup && (
        <Dialog open={showProcessDialog} onOpenChange={setShowProcessDialog}>
          <DialogContent className="max-w-2xl" aria-describedby="process-consolidation-description">
            <DialogHeader>
              <DialogTitle>Process Consolidation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4" id="process-consolidation-description">
              <p className="text-sm text-muted-foreground">Process the physical consolidation of packages.</p>
              {/* Customer Info */}
              <Alert>
                <User className="h-4 w-4" />
                <AlertDescription>
                  Processing consolidation for {selectedGroup.user.full_name || selectedGroup.user.email}
                  <br />
                  {selectedGroup.package_count} packages → 1 consolidated package
                </AlertDescription>
              </Alert>

              {/* Weight Input */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Actual Consolidated Weight (kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={processingData.actualWeight}
                    onChange={(e) => setProcessingData({
                      ...processingData,
                      actualWeight: parseFloat(e.target.value) || 0,
                    })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Original total: {calculateTotalWeight(selectedGroup.packages).toFixed(2)}kg
                  </p>
                </div>
              </div>

              {/* Dimensions */}
              <div>
                <Label>Consolidated Package Dimensions (cm)</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="number"
                    placeholder="Length"
                    value={processingData.dimensions.length || ''}
                    onChange={(e) => setProcessingData({
                      ...processingData,
                      dimensions: {
                        ...processingData.dimensions,
                        length: parseInt(e.target.value) || 0,
                      },
                    })}
                  />
                  <Input
                    type="number"
                    placeholder="Width"
                    value={processingData.dimensions.width || ''}
                    onChange={(e) => setProcessingData({
                      ...processingData,
                      dimensions: {
                        ...processingData.dimensions,
                        width: parseInt(e.target.value) || 0,
                      },
                    })}
                  />
                  <Input
                    type="number"
                    placeholder="Height"
                    value={processingData.dimensions.height || ''}
                    onChange={(e) => setProcessingData({
                      ...processingData,
                      dimensions: {
                        ...processingData.dimensions,
                        height: parseInt(e.target.value) || 0,
                      },
                    })}
                  />
                </div>
              </div>

              {/* Photos */}
              <div>
                <Label>Consolidated Package Photos</Label>
                <Input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    // In real implementation, upload photos to storage
                    const fileCount = e.target.files?.length || 0;
                    toast({
                      title: 'Photo Upload',
                      description: `${fileCount} photo(s) selected (upload integration needed)`,
                    });
                  }}
                />
              </div>

              {/* Processing Notes */}
              <div>
                <Label>Processing Notes</Label>
                <Textarea
                  value={processingData.processingNotes}
                  onChange={(e) => setProcessingData({
                    ...processingData,
                    processingNotes: e.target.value,
                  })}
                  placeholder="Any special notes about the consolidation..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowProcessDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  processConsolidationMutation.mutate({
                    groupId: selectedGroup.id,
                    data: processingData,
                  });
                }}
                disabled={processConsolidationMutation.isPending}
              >
                {processConsolidationMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Processing
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* View Details Dialog */}
      {showDetailsDialog && selectedGroupForDetails && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-4xl" aria-describedby="consolidation-details-description">
            <DialogHeader>
              <DialogTitle>Consolidation Details - {selectedGroupForDetails.group_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6" id="consolidation-details-description">
              <p className="text-sm text-muted-foreground">Detailed information about this consolidation group.</p>
              
              {/* Customer Information */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label className="text-sm font-medium">Name</Label>
                      <p className="text-sm">{selectedGroupForDetails.user.full_name || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <p className="text-sm">{selectedGroupForDetails.user.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Request Date</Label>
                      <p className="text-sm">{format(new Date(selectedGroupForDetails.created_at), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Consolidation Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label className="text-sm font-medium">Status</Label>
                      <Badge className={getStatusColor(selectedGroupForDetails.status)}>
                        {selectedGroupForDetails.status}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Package Count</Label>
                      <p className="text-sm">{selectedGroupForDetails.package_count} packages</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Consolidation Fee</Label>
                      <p className="text-sm">${selectedGroupForDetails.consolidation_fee_usd}</p>
                    </div>
                    {selectedGroupForDetails.quote && (
                      <>
                        <div>
                          <Label className="text-sm font-medium">Payment Status</Label>
                          <div className="flex items-center gap-2">
                            <Badge className={getPaymentStatusColor(selectedGroupForDetails.quote.status)}>
                              <CreditCard className="h-3 w-3 mr-1" />
                              {selectedGroupForDetails.quote.status}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Quote Total</Label>
                          <p className="text-sm">${selectedGroupForDetails.quote.final_total_usd?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Quote Actions</Label>
                          <Button 
                            variant="outline" 
                            size="sm"
                            asChild
                            className="mt-1"
                          >
                            <a href={`/dashboard/quotes/${selectedGroupForDetails.quote.id}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Open Quote Details
                            </a>
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Package Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Package Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedGroupForDetails.packages.map((pkg, index) => (
                      <div key={pkg.id} className="border rounded-lg p-3 bg-muted">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Package {index + 1}</Label>
                            <p className="font-medium">{pkg.package_description}</p>
                            <p className="text-muted-foreground">{pkg.sender_name}</p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Tracking</Label>
                            <p>{pkg.tracking_number || 'No tracking'}</p>
                            <p className="text-muted-foreground capitalize">{pkg.carrier}</p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Weight & Value</Label>
                            <p>{pkg.weight_kg}kg</p>
                            <p className="text-muted-foreground">${pkg.declared_value_usd || 0}</p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Dimensions (cm)</Label>
                            <p>{pkg.dimensions.length}×{pkg.dimensions.width}×{pkg.dimensions.height}</p>
                            <p className="text-muted-foreground">
                              {format(new Date(pkg.received_date), 'MMM d')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Consolidated Package Info (if processed) */}
              {selectedGroupForDetails.consolidated_weight_kg && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Consolidated Package</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Final Weight</Label>
                        <p className="text-lg font-semibold">{selectedGroupForDetails.consolidated_weight_kg}kg</p>
                        <p className="text-xs text-muted-foreground">
                          Original: {calculateTotalWeight(selectedGroupForDetails.packages)}kg
                        </p>
                      </div>
                      {selectedGroupForDetails.consolidated_dimensions && (
                        <div>
                          <Label className="text-sm font-medium">Final Dimensions</Label>
                          <p className="text-lg font-semibold">
                            {selectedGroupForDetails.consolidated_dimensions.length}×
                            {selectedGroupForDetails.consolidated_dimensions.width}×
                            {selectedGroupForDetails.consolidated_dimensions.height}cm
                          </p>
                        </div>
                      )}
                      <div>
                        <Label className="text-sm font-medium">Total Value</Label>
                        <p className="text-lg font-semibold">
                          ${calculateTotalValue(selectedGroupForDetails.packages).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Consolidated Photos */}
                    {selectedGroupForDetails.consolidated_photos && selectedGroupForDetails.consolidated_photos.length > 0 && (
                      <div className="mt-4">
                        <Label className="text-sm font-medium">Consolidated Package Photos</Label>
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          {selectedGroupForDetails.consolidated_photos.map((photo, index) => (
                            <img
                              key={index}
                              src={photo.url}
                              alt={`Consolidated package ${index + 1}`}
                              className="w-full h-24 object-cover rounded border"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Shipping Information */}
              {(selectedGroupForDetails.shipping_carrier || selectedGroupForDetails.shipping_tracking_number) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Shipping Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Carrier</Label>
                        <p className="text-sm capitalize">{selectedGroupForDetails.shipping_carrier}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Tracking Number</Label>
                        <p className="text-sm font-mono">{selectedGroupForDetails.shipping_tracking_number}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Generate Label Dialog */}
      {showLabelDialog && selectedGroupForDetails && (
        <Dialog open={showLabelDialog} onOpenChange={setShowLabelDialog}>
          <DialogContent aria-describedby="generate-label-description">
            <DialogHeader>
              <DialogTitle>Generate Shipping Label</DialogTitle>
            </DialogHeader>
            <div className="space-y-4" id="generate-label-description">
              <p className="text-sm text-muted-foreground">Generate shipping label and mark consolidation as shipped.</p>
              
              <Alert>
                <Package className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p><strong>Customer:</strong> {selectedGroupForDetails.user.full_name || selectedGroupForDetails.user.email}</p>
                    <p><strong>Weight:</strong> {selectedGroupForDetails.consolidated_weight_kg}kg</p>
                    {selectedGroupForDetails.consolidated_dimensions && (
                      <p><strong>Dimensions:</strong> {selectedGroupForDetails.consolidated_dimensions.length}×{selectedGroupForDetails.consolidated_dimensions.width}×{selectedGroupForDetails.consolidated_dimensions.height}cm</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Shipping Carrier</Label>
                  <Select 
                    defaultValue="ups"
                    onValueChange={(value) => {
                      setProcessingData(prev => ({ ...prev, shippingCarrier: value }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ups">UPS</SelectItem>
                      <SelectItem value="fedex">FedEx</SelectItem>
                      <SelectItem value="usps">USPS</SelectItem>
                      <SelectItem value="dhl">DHL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tracking Number</Label>
                  <Input
                    placeholder="Enter tracking number"
                    value={processingData.shippingTrackingNumber || ''}
                    onChange={(e) => setProcessingData(prev => ({
                      ...prev,
                      shippingTrackingNumber: e.target.value
                    }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLabelDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!processingData.shippingCarrier || !processingData.shippingTrackingNumber) {
                    toast({
                      title: 'Missing Information',
                      description: 'Please provide both carrier and tracking number',
                      variant: 'destructive',
                    });
                    return;
                  }
                  generateLabelMutation.mutate({
                    groupId: selectedGroupForDetails.id,
                    carrier: processingData.shippingCarrier,
                    trackingNumber: processingData.shippingTrackingNumber,
                  });
                }}
                disabled={generateLabelMutation.isPending}
              >
                {generateLabelMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Generate Label
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ConsolidationProcessingPanel;