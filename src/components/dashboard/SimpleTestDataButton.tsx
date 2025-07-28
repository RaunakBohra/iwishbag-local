/**
 * Simple Test Data Button - Minimal version for testing
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Loader2, TestTube } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const SimpleTestDataButton: React.FC = () => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);

  // Only show in development mode
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const generateSimpleTestPackage = async () => {
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
          description: 'Please get your virtual address first.',
          variant: 'destructive'
        });
        return;
      }

      // Create ONE simple test package with only required fields
      const testPackage = {
        customer_address_id: address.id,
        weight_kg: 1.5,
        dimensions: { length: 30, width: 20, height: 10, unit: 'cm' }
      };

      console.log('Inserting simple test package:', testPackage);

      const { data, error } = await supabase
        .from('received_packages')
        .insert(testPackage)
        .select();

      if (error) {
        console.error('Detailed error:', error);
        throw error;
      }

      console.log('Successfully created package:', data);

      toast({
        title: 'Success!',
        description: 'Test package created. Refreshing...',
      });

      // Reload the page
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Failed to create test package:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create test package',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={generateSimpleTestPackage}
      disabled={isGenerating}
      variant="secondary"
      size="sm"
      className="fixed bottom-16 right-4 z-50"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Creating...
        </>
      ) : (
        <>
          <TestTube className="h-4 w-4 mr-2" />
          Simple Test Package
        </>
      )}
    </Button>
  );
};

export default SimpleTestDataButton;