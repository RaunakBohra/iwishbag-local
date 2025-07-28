/**
 * Minimal Package Test - Simplest possible test to debug the insert issue
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const MinimalPackageTest: React.FC = () => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const runMinimalTest = async () => {
    if (!user?.id) {
      setResult({ success: false, message: 'User not authenticated' });
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      // Step 1: Get user's virtual address
      console.log('Step 1: Getting virtual address for user:', user.id);
      const { data: address, error: addressError } = await supabase
        .from('customer_addresses')
        .select('id, suite_number')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (addressError || !address) {
        console.error('Address error:', addressError);
        setResult({ 
          success: false, 
          message: `No virtual address found. Error: ${addressError?.message || 'Address not found'}` 
        });
        return;
      }

      console.log('Found address:', address);

      // Step 2: Create minimal package data with only required fields
      const minimalPackage = {
        customer_address_id: address.id,
        weight_kg: 1.0,
        dimensions: { length: 10, width: 10, height: 10, unit: 'cm' }
      };

      console.log('Step 2: Attempting minimal insert:', JSON.stringify(minimalPackage, null, 2));

      // Step 3: Try minimal insert
      const { data: minimalData, error: minimalError } = await supabase
        .from('received_packages')
        .insert(minimalPackage)
        .select();

      if (minimalError) {
        console.error('Minimal insert failed:', minimalError);
        console.error('Error details:', {
          code: minimalError.code,
          message: minimalError.message,
          details: minimalError.details,
          hint: minimalError.hint
        });
        
        // Try with stringified dimensions
        console.log('Step 3: Retrying with stringified dimensions...');
        const stringifiedPackage = {
          ...minimalPackage,
          dimensions: JSON.stringify(minimalPackage.dimensions)
        };
        
        const { data: retryData, error: retryError } = await supabase
          .from('received_packages')
          .insert(stringifiedPackage as any)
          .select();
          
        if (retryError) {
          console.error('Stringified insert also failed:', retryError);
          setResult({ 
            success: false, 
            message: `Insert failed: ${minimalError.message}. Retry also failed: ${retryError.message}` 
          });
          return;
        }
        
        console.log('Success with stringified dimensions:', retryData);
        setResult({ 
          success: true, 
          message: 'Package created successfully (with stringified dimensions)!' 
        });
        return;
      }

      console.log('Success with minimal data:', minimalData);

      // Step 4: Now try with more fields
      const fullPackage = {
        customer_address_id: address.id,
        weight_kg: 1.5,
        dimensions: { length: 20, width: 15, height: 10, unit: 'cm' },
        sender_name: 'Test Sender',
        package_description: 'Test Package',
        tracking_number: 'TEST123456',
        carrier: 'UPS',
        status: 'pending',
        received_date: new Date().toISOString()
      };

      console.log('Step 4: Attempting full insert:', JSON.stringify(fullPackage, null, 2));

      const { data: fullData, error: fullError } = await supabase
        .from('received_packages')
        .insert(fullPackage)
        .select();

      if (fullError) {
        console.error('Full insert failed:', fullError);
        setResult({ 
          success: true, 
          message: `Minimal insert worked, but full insert failed: ${fullError.message}` 
        });
        return;
      }

      console.log('Success with full data:', fullData);
      setResult({ 
        success: true, 
        message: `All tests passed! Created ${minimalData.length + fullData.length} test packages.` 
      });

    } catch (error) {
      console.error('Unexpected error:', error);
      setResult({ 
        success: false, 
        message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 space-y-2">
      <Button
        onClick={runMinimalTest}
        disabled={isGenerating}
        variant="secondary"
        size="sm"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Testing...
          </>
        ) : (
          'Run Minimal Test'
        )}
      </Button>
      
      {result && (
        <Alert className={`max-w-md ${result.success ? 'border-green-500' : 'border-red-500'}`}>
          {result.success ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
          <AlertDescription className="text-xs">
            {result.message}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default MinimalPackageTest;