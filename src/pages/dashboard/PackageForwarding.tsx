import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Package,
  MapPin,
  Truck,
  Clock,
  DollarSign,
  Camera,
  ArrowRight,
  Copy,
  CheckCircle,
  AlertCircle,
  Info,
  Plus,
  Eye,
  Archive,
  ShoppingCart,
  Loader2,
  PackageOpen,
  Warehouse,
  Scale,
  Ruler,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  integratedPackageForwardingService,
  type IntegratedPackageData,
} from '@/services/IntegratedPackageForwardingService';
import {
  packageForwardingService,
  type CustomerAddress,
  type ConsolidationGroup,
  type ConsolidationOption,
} from '@/services/PackageForwardingService';
import { PackagePhotoGallery } from '@/components/warehouse/PackagePhotoGallery';
import QuickTestDataButton from '@/components/dashboard/QuickTestDataButton';
import SimpleTestDataButton from '@/components/dashboard/SimpleTestDataButton';
import ShippingCalculator from '@/components/dashboard/ShippingCalculator';

interface ConsolidationDialogProps {
  packages: IntegratedPackageData[];
  onClose: () => void;
  onConsolidate: (packageIds: string[], groupName?: string) => void;
  isLoading: boolean;
}

const ConsolidationDialog: React.FC<ConsolidationDialogProps> = ({
  packages,
  onClose,
  onConsolidate,
  isLoading,
}) => {
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [options, setOptions] = useState<ConsolidationOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<ConsolidationOption | null>(null);

  // Calculate consolidation options when packages are selected
  React.useEffect(() => {
    if (selectedPackages.length > 1) {
      const selectedPkgs = packages.filter(p => selectedPackages.includes(p.id));
      // This would call the service to calculate options
      // For now, we'll create a mock option
      setOptions([
        {
          type: 'consolidated',
          packages: selectedPkgs,
          totalWeight: selectedPkgs.reduce((sum, p) => sum + p.weight_kg, 0),
          totalDimensions: { length: 40, width: 30, height: 25, unit: 'cm' },
          estimatedShippingCost: 45,
          consolidationFee: 7,
          storageFees: 0,
          totalCost: 52,
          savings: 15,
          description: `Consolidate ${selectedPkgs.length} packages into one shipment`
        }
      ]);
    } else {
      setOptions([]);
    }
  }, [selectedPackages, packages]);

  const togglePackage = (packageId: string) => {
    setSelectedPackages(prev =>
      prev.includes(packageId)
        ? prev.filter(id => id !== packageId)
        : [...prev, packageId]
    );
  };

  const handleConsolidate = () => {
    if (selectedOption) {
      onConsolidate(selectedPackages, groupName || undefined);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Package Consolidation</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 h-[60vh]">
          {/* Package Selection */}
          <div className="space-y-4">
            <h3 className="font-semibold">Select Packages to Consolidate</h3>
            <ScrollArea className="h-full">
              <div className="space-y-3">
                {packages.map(pkg => (
                  <Card
                    key={pkg.id}
                    className={`cursor-pointer transition-colors ${
                      selectedPackages.includes(pkg.id) ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => togglePackage(pkg.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{pkg.sender_store || pkg.sender_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {pkg.weight_kg}kg • {pkg.package_description}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">${pkg.declared_value_usd || 0}</p>
                          {selectedPackages.includes(pkg.id) && (
                            <CheckCircle className="h-4 w-4 text-green-500 ml-auto mt-1" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Consolidation Options */}
          <div className="space-y-4">
            <h3 className="font-semibold">Consolidation Options</h3>
            
            {selectedPackages.length < 2 ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Select at least 2 packages to see consolidation options.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="groupName">Group Name (Optional)</Label>
                  <Input
                    id="groupName"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g., Electronics Order"
                  />
                </div>

                {options.map((option, index) => (
                  <Card
                    key={index}
                    className={`cursor-pointer transition-colors ${
                      selectedOption === option ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedOption(option)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Consolidated Shipping</h4>
                          <Badge variant="outline" className="text-green-600">
                            Save ${option.savings}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Total Weight:</p>
                            <p className="font-medium">{option.totalWeight}kg</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Shipping Cost:</p>
                            <p className="font-medium">${option.estimatedShippingCost}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Consolidation Fee:</p>
                            <p className="font-medium">${option.consolidationFee}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Total Cost:</p>
                            <p className="font-medium">${option.totalCost}</p>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConsolidate}
            disabled={!selectedOption || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Archive className="h-4 w-4 mr-2" />
                Request Consolidation
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const PackageCard: React.FC<{ package: IntegratedPackageData; onViewPhotos: (pkg: IntegratedPackageData) => void }> = ({
  package: pkg,
  onViewPhotos,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'ready_to_ship': return 'bg-green-100 text-green-800';
      case 'consolidated': return 'bg-purple-100 text-purple-800';
      case 'shipped': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'issue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold">{pkg.sender_store || pkg.sender_name}</h3>
            <p className="text-sm text-muted-foreground">{pkg.package_description}</p>
          </div>
          <Badge className={getStatusColor(pkg.status)}>
            {pkg.status.replace('_', ' ')}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-muted-foreground" />
            <span>{pkg.weight_kg}kg</span>
          </div>
          <div className="flex items-center gap-2">
            <Ruler className="h-4 w-4 text-muted-foreground" />
            <span>
              {pkg.dimensions.length}×{pkg.dimensions.width}×{pkg.dimensions.height}cm
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span>${pkg.declared_value_usd || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <Warehouse className="h-4 w-4 text-muted-foreground" />
            <span>{pkg.storage_location}</span>
          </div>
        </div>

        {/* Storage and Condition Information */}
        <div className="mb-3">
          {(() => {
            const daysInStorage = Math.floor((Date.now() - new Date(pkg.received_date).getTime()) / (1000 * 60 * 60 * 24));
            const freePeriodDays = 30;
            const isAccruingFees = daysInStorage > freePeriodDays;
            
            return (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">
                    Received: {new Date(pkg.received_date).toLocaleDateString()}
                  </span>
                  <span className={`font-medium ${isAccruingFees ? 'text-orange-600' : 'text-green-600'}`}>
                    {daysInStorage} days stored
                  </span>
                </div>
                {isAccruingFees && (
                  <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                    Storage fees apply
                  </Badge>
                )}
              </div>
            );
          })()}
        </div>

        {/* Condition Notes */}
        {pkg.condition_notes && (
          <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-yellow-800">{pkg.condition_notes}</span>
            </div>
          </div>
        )}

        {/* Tracking Information */}
        {pkg.tracking_number && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Package className="h-4 w-4" />
            <span className="font-mono">{pkg.tracking_number}</span>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded capitalize">
              {pkg.carrier || 'Unknown carrier'}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Last updated: {new Date(pkg.updated_at || pkg.received_date).toLocaleDateString()}
          </div>
          
          <div className="flex gap-2">
            {pkg.photos && pkg.photos.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewPhotos(pkg)}
              >
                <Camera className="h-3 w-3 mr-1" />
                Photos ({pkg.photos.length})
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Eye className="h-3 w-3 mr-1" />
              Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const PackageForwarding: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showConsolidationDialog, setShowConsolidationDialog] = useState(false);
  const [selectedPackageForPhotos, setSelectedPackageForPhotos] = useState<IntegratedPackageData | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Fetch customer's integrated profile with virtual address
  const { data: customerProfile, isLoading: addressLoading } = useQuery({
    queryKey: ['integrated-customer-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return await integratedPackageForwardingService.getIntegratedCustomerProfile(user.id);
    },
    enabled: !!user?.id,
  });

  const virtualAddress = customerProfile?.virtual_address;

  // Fetch customer's packages with integrated data
  const { data: packages = [], isLoading: packagesLoading } = useQuery({
    queryKey: ['integrated-customer-packages', user?.id],
    queryFn: async (): Promise<IntegratedPackageData[]> => {
      if (!user?.id) return [];
      return await integratedPackageForwardingService.getCustomerPackagesIntegrated(user.id);
    },
    enabled: !!user?.id,
  });

  // Fetch consolidation groups
  const { data: consolidationGroups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['consolidation-groups', user?.id],
    queryFn: async (): Promise<ConsolidationGroup[]> => {
      if (!user?.id) return [];
      return await packageForwardingService.getConsolidationGroups(user.id);
    },
    enabled: !!user?.id,
  });

  // Assign virtual address mutation using integrated service
  const assignAddressMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      return await integratedPackageForwardingService.assignIntegratedVirtualAddress(user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrated-customer-profile'] });
      toast({
        title: 'Address Assigned',
        description: 'Your virtual warehouse address has been assigned successfully!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Assignment Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Consolidation request mutation
  const consolidationMutation = useMutation({
    mutationFn: async ({ packageIds, groupName }: { packageIds: string[]; groupName?: string }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return await packageForwardingService.processConsolidation(user.id, packageIds, groupName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrated-customer-packages'] });
      queryClient.invalidateQueries({ queryKey: ['consolidation-groups'] });
      setShowConsolidationDialog(false);
      toast({
        title: 'Consolidation Requested',
        description: 'Your consolidation request has been submitted successfully!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Consolidation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCopyAddress = async () => {
    if (virtualAddress?.full_address) {
      await navigator.clipboard.writeText(virtualAddress.full_address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
      toast({
        title: 'Address Copied',
        description: 'Your warehouse address has been copied to clipboard.',
      });
    }
  };

  const availablePackages = packages.filter(p => p.status === 'received');
  const processingPackages = packages.filter(p => ['processing', 'ready_to_ship', 'consolidated'].includes(p.status));
  const shippedPackages = packages.filter(p => ['shipped', 'delivered'].includes(p.status));

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please log in to access package forwarding.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <QuickTestDataButton />
      <SimpleTestDataButton />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Package Forwarding</h1>
          <p className="text-muted-foreground">
            Manage your US warehouse address and packages
          </p>
        </div>
      </div>

      {/* Virtual Address Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Your US Warehouse Address
          </CardTitle>
        </CardHeader>
        <CardContent>
          {addressLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading your address...</span>
            </div>
          ) : virtualAddress ? (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-sm leading-relaxed whitespace-pre-line">
                      {virtualAddress.full_address}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyAddress}
                    className="ml-4"
                  >
                    {copiedAddress ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Use this address when shopping at US stores. Make sure to include your suite number{' '}
                  <strong>{virtualAddress.suite_number}</strong> in the shipping address.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Get Your US Address</h3>
              <p className="text-muted-foreground mb-4">
                Get a virtual US warehouse address to start shopping at US stores.
              </p>
              <Button
                onClick={() => assignAddressMutation.mutate()}
                disabled={assignAddressMutation.isPending}
              >
                {assignAddressMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Get My US Address
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Packages Tabs */}
      <Tabs defaultValue="available" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="available" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Available ({availablePackages.length})
          </TabsTrigger>
          <TabsTrigger value="processing" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Processing ({processingPackages.length})
          </TabsTrigger>
          <TabsTrigger value="shipped" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Shipped ({shippedPackages.length})
          </TabsTrigger>
          <TabsTrigger value="consolidation" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Groups ({consolidationGroups.length})
          </TabsTrigger>
          <TabsTrigger value="calculator" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Calculator
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Available Packages</h2>
            {availablePackages.length > 1 && (
              <Button onClick={() => setShowConsolidationDialog(true)}>
                <Archive className="h-4 w-4 mr-2" />
                Consolidate Packages
              </Button>
            )}
          </div>

          {/* Package Statistics */}
          {availablePackages.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold">{availablePackages.length}</p>
                      <p className="text-xs text-muted-foreground">Ready to Ship</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold">
                        {availablePackages.reduce((sum, p) => sum + p.weight_kg, 0).toFixed(1)}kg
                      </p>
                      <p className="text-xs text-muted-foreground">Total Weight</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="text-2xl font-bold">
                        ${availablePackages.reduce((sum, p) => sum + (p.declared_value_usd || 0), 0).toFixed(0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Value</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-600" />
                    <div>
                      <p className="text-2xl font-bold">
                        {Math.max(...availablePackages.map(p => 
                          Math.floor((Date.now() - new Date(p.received_date).getTime()) / (1000 * 60 * 60 * 24))
                        ))}
                      </p>
                      <p className="text-xs text-muted-foreground">Oldest (days)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {packagesLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-3 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : availablePackages.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {availablePackages.map(pkg => (
                <PackageCard
                  key={pkg.id}
                  package={pkg}
                  onViewPhotos={setSelectedPackageForPhotos}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <PackageOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Packages Yet</h3>
                <p className="text-muted-foreground">
                  Start shopping at US stores using your warehouse address above.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="processing" className="space-y-4">
          <h2 className="text-xl font-semibold">Processing Packages</h2>
          
          {processingPackages.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {processingPackages.map(pkg => (
                <PackageCard
                  key={pkg.id}
                  package={pkg}
                  onViewPhotos={setSelectedPackageForPhotos}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Processing Packages</h3>
                <p className="text-muted-foreground">
                  Packages being processed will appear here.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="shipped" className="space-y-4">
          <h2 className="text-xl font-semibold">Shipped Packages</h2>
          
          {shippedPackages.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {shippedPackages.map(pkg => (
                <PackageCard
                  key={pkg.id}
                  package={pkg}
                  onViewPhotos={setSelectedPackageForPhotos}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Shipped Packages</h3>
                <p className="text-muted-foreground">
                  Packages you've shipped will appear here.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="consolidation" className="space-y-4">
          <h2 className="text-xl font-semibold">Consolidation Groups</h2>
          
          {groupsLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : consolidationGroups.length > 0 ? (
            <div className="space-y-4">
              {consolidationGroups.map(group => (
                <Card key={group.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{group.group_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {group.package_count} packages
                        </p>
                      </div>
                      <Badge variant="outline">
                        {group.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Consolidation Fee</p>
                        <p className="font-medium">${group.consolidation_fee_usd}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Storage Fees</p>
                        <p className="font-medium">${group.storage_fees_usd}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Service Fee</p>
                        <p className="font-medium">${group.service_fee_usd}</p>
                      </div>
                    </div>

                    {group.quote_id && (
                      <div className="mt-3 pt-3 border-t">
                        <Button variant="outline" size="sm">
                          <Eye className="h-3 w-3 mr-1" />
                          View Quote
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Consolidation Groups</h3>
                <p className="text-muted-foreground">
                  Create consolidation groups to save on shipping costs.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="calculator" className="space-y-4">
          <ShippingCalculator 
            packages={availablePackages}
            onCalculate={(option) => {
              toast({
                title: 'Quote Created',
                description: `Shipping quote for ${option} has been added to your quotes.`,
              });
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Consolidation Dialog */}
      {showConsolidationDialog && (
        <ConsolidationDialog
          packages={availablePackages}
          onClose={() => setShowConsolidationDialog(false)}
          onConsolidate={(packageIds, groupName) =>
            consolidationMutation.mutate({ packageIds, groupName })
          }
          isLoading={consolidationMutation.isPending}
        />
      )}

      {/* Enhanced Package Photo Gallery */}
      {selectedPackageForPhotos && (
        <PackagePhotoGallery
          photos={selectedPackageForPhotos.photos}
          packageInfo={{
            suiteNumber: virtualAddress?.suite_number,
            senderStore: selectedPackageForPhotos.sender_store,
            description: selectedPackageForPhotos.package_description
          }}
          open={true}
          onClose={() => setSelectedPackageForPhotos(null)}
        />
      )}
    </div>
  );
};