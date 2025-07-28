/**
 * Package Test Data Generator Component
 * 
 * Admin tool to quickly generate test packages for the package forwarding system.
 * This helps with testing the integration without manually creating data.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import {
  Package,
  Plus,
  Loader2,
  CheckCircle,
  AlertCircle,
  Shuffle,
  Database,
  User,
  MapPin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Sample data for generating realistic packages
const SAMPLE_STORES = [
  { name: 'Amazon', sender: 'Amazon.com', carrier: 'UPS' },
  { name: 'Nike', sender: 'Nike.com', carrier: 'FedEx' },
  { name: 'Apple', sender: 'Apple Store', carrier: 'UPS' },
  { name: 'Best Buy', sender: 'BestBuy.com', carrier: 'UPS' },
  { name: 'Walmart', sender: 'Walmart.com', carrier: 'FedEx' },
  { name: 'Target', sender: 'Target.com', carrier: 'USPS' },
  { name: 'eBay', sender: 'eBay Seller', carrier: 'USPS' },
  { name: 'Newegg', sender: 'Newegg.com', carrier: 'UPS' },
];

const SAMPLE_ITEMS = [
  { desc: 'iPhone 15 Pro Case', weight: 0.3, value: 49.99 },
  { desc: 'Nike Air Max Shoes', weight: 1.2, value: 150.00 },
  { desc: 'MacBook Pro Charger', weight: 0.5, value: 79.00 },
  { desc: 'Gaming Headset', weight: 0.8, value: 89.99 },
  { desc: 'Yoga Mat', weight: 1.5, value: 35.00 },
  { desc: 'Coffee Maker', weight: 2.8, value: 129.99 },
  { desc: 'Book Collection (5 books)', weight: 2.0, value: 75.00 },
  { desc: 'Bluetooth Speaker', weight: 0.6, value: 59.99 },
  { desc: 'Running Shoes', weight: 0.9, value: 120.00 },
  { desc: 'Smart Watch Band', weight: 0.1, value: 24.99 },
];

export const PackageTestDataGenerator: React.FC = () => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [virtualAddress, setVirtualAddress] = useState<any>(null);
  const [generatedCount, setGeneratedCount] = useState(0);

  // Generate a random tracking number
  const generateTrackingNumber = (carrier: string): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let tracking = '';
    
    switch (carrier) {
      case 'UPS':
        tracking = '1Z' + Array.from({ length: 16 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
        break;
      case 'FedEx':
        tracking = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
        break;
      case 'USPS':
        tracking = '9261' + Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join('');
        break;
      default:
        tracking = Array.from({ length: 10 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    }
    
    return tracking;
  };

  // Generate random dimensions
  const generateDimensions = () => {
    const length = Math.floor(Math.random() * 30) + 10; // 10-40cm
    const width = Math.floor(Math.random() * 20) + 10;  // 10-30cm
    const height = Math.floor(Math.random() * 15) + 5;   // 5-20cm
    
    return {
      length,
      width,
      height,
      unit: 'cm'
    };
  };

  // Lookup user by email
  const lookupUser = async () => {
    if (!userEmail) {
      toast({
        title: 'Error',
        description: 'Please enter a user email',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Get user from profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', userEmail)
        .single();

      if (profileError || !profile) {
        toast({
          title: 'User not found',
          description: 'No user found with that email address',
          variant: 'destructive'
        });
        return;
      }

      setSelectedUserId(profile.id);

      // Check for virtual address
      const { data: address, error: addressError } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('user_id', profile.id)
        .eq('status', 'active')
        .single();

      if (address) {
        setVirtualAddress(address);
        toast({
          title: 'User found',
          description: `Found user with virtual address: ${address.suite_number}`,
        });
      } else {
        setVirtualAddress(null);
        toast({
          title: 'User found',
          description: 'User has no virtual address yet. Create one in the app first.',
          variant: 'destructive'
        });
      }

    } catch (error) {
      console.error('Error looking up user:', error);
      toast({
        title: 'Error',
        description: 'Failed to lookup user',
        variant: 'destructive'
      });
    }
  };

  // Generate test packages
  const generatePackages = async (count: number) => {
    if (!selectedUserId || !virtualAddress) {
      toast({
        title: 'Error',
        description: 'Please select a user with a virtual address first',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedCount(0);

    try {
      const packages = [];
      
      for (let i = 0; i < count; i++) {
        // Random store and item
        const store = SAMPLE_STORES[Math.floor(Math.random() * SAMPLE_STORES.length)];
        const item = SAMPLE_ITEMS[Math.floor(Math.random() * SAMPLE_ITEMS.length)];
        
        // Random dates (received within last 30 days)
        const daysAgo = Math.floor(Math.random() * 30);
        const receivedDate = new Date();
        receivedDate.setDate(receivedDate.getDate() - daysAgo);
        
        const packageData = {
          customer_address_id: virtualAddress.id,
          tracking_number: generateTrackingNumber(store.carrier),
          carrier: store.carrier,
          sender_name: store.name,
          sender_store: store.name,
          package_description: item.desc,
          weight_kg: item.weight + (Math.random() * 0.5 - 0.25), // Add some variation
          dimensions: generateDimensions(),
          declared_value_usd: item.value,
          received_date: receivedDate.toISOString(),
          status: 'pending',
          storage_location: `${String.fromCharCode(65 + Math.floor(Math.random() * 5))}-${Math.floor(Math.random() * 20) + 1}-${String.fromCharCode(65 + Math.floor(Math.random() * 5))}`,
          storage_start_date: receivedDate.toISOString(),
          storage_fee_exempt_until: new Date(receivedDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from receipt
          photos: i % 3 === 0 ? [ // Add photos to some packages
            {
              url: `https://picsum.photos/400/300?random=${i}`,
              type: 'package',
              description: 'Package exterior'
            },
            {
              url: `https://picsum.photos/400/300?random=${i + 1000}`,
              type: 'contents',
              description: 'Package contents'
            }
          ] : [],
          condition_notes: i % 2 === 0 ? 'Handle with care - Fragile' : null
        };
        
        packages.push(packageData);
      }

      // Insert all packages
      console.log('Attempting to insert packages:', JSON.stringify(packages, null, 2));
      
      const { data, error } = await supabase
        .from('received_packages')
        .insert(packages)
        .select();

      if (error) {
        console.error('Supabase insert error:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      setGeneratedCount(data.length);

      // Create storage fee records for packages older than 7 days
      const storageFees = [];
      for (const pkg of data) {
        const receivedDate = new Date(pkg.received_date);
        const daysStored = Math.floor((Date.now() - receivedDate.getTime()) / (24 * 60 * 60 * 1000));
        
        if (daysStored > 0) {
          storageFees.push({
            package_id: pkg.id,
            user_id: selectedUserId,
            start_date: pkg.received_date,
            end_date: new Date().toISOString(),
            days_stored: daysStored,
            daily_rate_usd: daysStored > 30 ? 1.00 : 0.00, // Free for first 30 days
            total_fee_usd: daysStored > 30 ? (daysStored - 30) * 1.00 : 0.00,
            is_paid: false,
            fee_type: 'storage',
            notes: daysStored <= 30 ? 'Within 30-day free storage period' : 'Storage fees apply after 30 days'
          });
        }
      }

      if (storageFees.length > 0) {
        await supabase.from('storage_fees').insert(storageFees);
      }

      toast({
        title: 'Success!',
        description: `Generated ${data.length} test packages for ${userEmail}`,
      });

    } catch (error) {
      console.error('Error generating packages:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate test packages',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Package Test Data Generator
          </CardTitle>
          <CardDescription>
            Generate test packages for the package forwarding system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User Selection */}
          <div className="space-y-4">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label htmlFor="userEmail">User Email</Label>
                <Input
                  id="userEmail"
                  type="email"
                  placeholder="user@example.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                />
              </div>
              <Button onClick={lookupUser} variant="outline">
                <User className="h-4 w-4 mr-2" />
                Lookup User
              </Button>
            </div>

            {selectedUserId && (
              <Alert className={virtualAddress ? '' : 'border-yellow-500'}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {virtualAddress ? (
                    <div className="space-y-1">
                      <p className="font-medium">User found: {userEmail}</p>
                      <p className="text-sm">Virtual Address: Suite {virtualAddress.suite_number}</p>
                    </div>
                  ) : (
                    <p>User found but has no virtual address. Please create one first.</p>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <Separator />

          {/* Package Generation */}
          {virtualAddress && (
            <div className="space-y-4">
              <h3 className="font-medium">Generate Test Packages</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button 
                  onClick={() => generatePackages(1)}
                  disabled={isGenerating}
                  variant="outline"
                >
                  <Package className="h-4 w-4 mr-2" />
                  1 Package
                </Button>
                <Button 
                  onClick={() => generatePackages(3)}
                  disabled={isGenerating}
                  variant="outline"
                >
                  <Package className="h-4 w-4 mr-2" />
                  3 Packages
                </Button>
                <Button 
                  onClick={() => generatePackages(5)}
                  disabled={isGenerating}
                  variant="outline"
                >
                  <Package className="h-4 w-4 mr-2" />
                  5 Packages
                </Button>
                <Button 
                  onClick={() => generatePackages(10)}
                  disabled={isGenerating}
                  variant="outline"
                >
                  <Package className="h-4 w-4 mr-2" />
                  10 Packages
                </Button>
              </div>

              {isGenerating && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating test packages...
                </div>
              )}

              {generatedCount > 0 && !isGenerating && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Successfully generated {generatedCount} test packages!
                    <br />
                    <span className="text-sm">
                      The user can now view them at{' '}
                      <a href="/dashboard/package-forwarding" className="underline">
                        /dashboard/package-forwarding
                      </a>
                    </span>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="space-y-2 pt-4 border-t">
            <h3 className="font-medium text-sm">Instructions:</h3>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Enter the email of the user you want to add test packages for</li>
              <li>Click "Lookup User" to find their account</li>
              <li>If they don't have a virtual address, they need to create one first</li>
              <li>Select how many test packages to generate</li>
              <li>The packages will appear in their dashboard immediately</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* What's Generated */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">What Gets Generated?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 text-sm">
            <div className="flex items-start gap-3">
              <Package className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="font-medium">Realistic Packages</p>
                <p className="text-muted-foreground">From popular stores like Amazon, Nike, Apple, etc.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="font-medium">Tracking Numbers</p>
                <p className="text-muted-foreground">Realistic tracking numbers for UPS, FedEx, USPS</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shuffle className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="font-medium">Random Variations</p>
                <p className="text-muted-foreground">Different weights, dimensions, values, and dates</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PackageTestDataGenerator;