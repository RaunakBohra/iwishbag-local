/**
 * Quick Test Data Button Component
 * 
 * A button that appears in development mode to quickly generate test packages
 * for the current user without going through the admin panel.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Loader2, TestTube } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const QuickTestDataButton: React.FC = () => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);

  // Only show in development mode
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const generateTestPackages = async () => {
    if (!user?.id) return;

    setIsGenerating(true);
    try {
      // First check if user has a virtual address
      const { data: address } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (!address) {
        toast({
          title: 'No Virtual Address',
          description: 'Please get your virtual address first before generating test packages.',
          variant: 'destructive'
        });
        return;
      }

      // Ensure customer preferences exist
      const { error: prefError } = await supabase
        .from('customer_preferences')
        .upsert({
          user_id: user.id,
          profile_id: user.id
        }, {
          onConflict: 'user_id'
        });

      // Generate 3 test packages
      const testPackages = [
        {
          customer_address_id: address.id,
          tracking_number: '1Z999AA1' + Math.random().toString().slice(2, 10),
          carrier: 'ups',
          sender_name: 'Amazon Fulfillment',
          sender_store: 'Amazon',
          package_description: 'iPhone 15 Pro Case and Screen Protector',
          weight_kg: 0.5,
          dimensions: JSON.stringify({ length: 20, width: 15, height: 5, unit: 'cm' }),
          declared_value_usd: 45.99,
          received_date: new Date().toISOString(),
          status: 'received',
          storage_location: 'A-12-B',
          storage_start_date: new Date().toISOString(),
          storage_fee_exempt_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          photos: JSON.stringify([
            { url: 'https://picsum.photos/400/300?random=1', type: 'package', description: 'Package exterior' },
            { url: 'https://picsum.photos/400/300?random=2', type: 'contents', description: 'Package contents' }
          ]),
          condition_notes: 'TEST PACKAGE - Development Only'
        },
        {
          customer_address_id: address.id,
          tracking_number: '79494771' + Math.random().toString().slice(2, 10),
          carrier: 'fedex',
          sender_name: 'Nike Direct',
          sender_store: 'Nike',
          package_description: 'Air Jordan 1 Retro High OG - Size 10',
          weight_kg: 1.8,
          dimensions: JSON.stringify({ length: 35, width: 25, height: 15, unit: 'cm' }),
          declared_value_usd: 180.00,
          received_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'received',
          storage_location: 'B-08-A',
          storage_start_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          storage_fee_exempt_until: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
          photos: JSON.stringify([]),
          condition_notes: 'TEST PACKAGE - Development Only'
        },
        {
          customer_address_id: address.id,
          tracking_number: '92612999' + Math.random().toString().slice(2, 10),
          carrier: 'usps',
          sender_name: 'BestBuy.com',
          sender_store: 'Best Buy',
          package_description: 'PlayStation 5 Controller',
          weight_kg: 0.8,
          dimensions: JSON.stringify({ length: 25, width: 20, height: 10, unit: 'cm' }),
          declared_value_usd: 69.99,
          received_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'received',
          storage_location: 'C-15-D',
          storage_start_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          storage_fee_exempt_until: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
          photos: JSON.stringify([]),
          condition_notes: 'TEST PACKAGE - Development Only'
        }
      ];

      // Log what we're trying to insert for debugging
      console.log('Attempting to insert packages:', testPackages);

      const { data, error } = await supabase
        .from('received_packages')
        .insert(testPackages)
        .select();

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      toast({
        title: 'Test Packages Created!',
        description: `Generated ${data.length} test packages. Refresh to see them.`,
      });

      // Reload the page to show new packages
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Error generating test packages:', error);
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
    <Button
      onClick={generateTestPackages}
      disabled={isGenerating}
      variant="outline"
      size="sm"
      className="fixed bottom-4 right-4 z-50"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <TestTube className="h-4 w-4 mr-2" />
          Generate Test Packages
        </>
      )}
    </Button>
  );
};

export default QuickTestDataButton;