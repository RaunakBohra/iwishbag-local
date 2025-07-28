/**
 * Direct Package Test - Tests package insertion with explicit error handling
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Database, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const DirectPackageTest: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testInsert = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      // First get the address
      const { data: address, error: addressError } = await supabase
        .from('customer_addresses')
        .select('id, suite_number')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .single();

      if (addressError) {
        setResult({ error: `Address error: ${addressError.message}` });
        return;
      }

      // Test 1: Absolute minimal insert
      console.log('Test 1: Minimal insert with only required fields');
      const minimal = {
        customer_address_id: address.id,
        weight_kg: 1,
        dimensions: { length: 10, width: 10, height: 10, unit: 'cm' }
      };
      
      const { data: test1, error: error1 } = await supabase
        .from('received_packages')
        .insert(minimal)
        .select();

      if (error1) {
        console.error('Test 1 failed:', error1);
        
        // Try with explicit status
        console.log('Test 1b: Adding default status');
        const minimalWithStatus = { ...minimal, status: 'received' };
        
        const { data: test1b, error: error1b } = await supabase
          .from('received_packages')
          .insert(minimalWithStatus)
          .select();
          
        if (error1b) {
          setResult({ 
            error: 'Minimal insert failed',
            details: error1b,
            attempted: minimalWithStatus
          });
          return;
        }
        
        console.log('Test 1b succeeded:', test1b);
      } else {
        console.log('Test 1 succeeded:', test1);
      }

      // Test 2: Add more fields gradually
      console.log('Test 2: Adding sender info');
      const withSender = {
        customer_address_id: address.id,
        weight_kg: 2,
        dimensions: { length: 20, width: 15, height: 10, unit: 'cm' },
        sender_name: 'Test Sender',
        package_description: 'Test Package',
        status: 'received'
      };
      
      const { data: test2, error: error2 } = await supabase
        .from('received_packages')
        .insert(withSender)
        .select();

      if (error2) {
        setResult({ 
          error: 'Insert with sender failed',
          details: error2,
          attempted: withSender
        });
        return;
      }

      console.log('Test 2 succeeded:', test2);

      // Test 3: Full data
      console.log('Test 3: Full package data');
      const fullPackage = {
        customer_address_id: address.id,
        weight_kg: 3,
        dimensions: { length: 30, width: 20, height: 15, unit: 'cm' },
        sender_name: 'Amazon',
        sender_store: 'Amazon',
        package_description: 'Electronics',
        tracking_number: `TEST${Date.now()}`,
        carrier: 'ups',
        status: 'received',
        received_date: new Date().toISOString(),
        storage_location: 'A-1-B',
        declared_value_usd: 99.99,
        photos: null,
        condition_notes: 'Test package'
      };
      
      const { data: test3, error: error3 } = await supabase
        .from('received_packages')
        .insert(fullPackage)
        .select();

      if (error3) {
        setResult({ 
          error: 'Full insert failed',
          details: error3,
          attempted: fullPackage
        });
        return;
      }

      console.log('Test 3 succeeded:', test3);

      // Success!
      setResult({ 
        success: true,
        message: 'All tests passed! Check console for details.',
        created: (test1?.length || 0) + (test2?.length || 0) + (test3?.length || 0)
      });

    } catch (error) {
      console.error('Unexpected error:', error);
      setResult({ 
        error: 'Unexpected error',
        details: error
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-20 left-4 z-50 space-y-2">
      <Button
        onClick={testInsert}
        disabled={isLoading}
        variant="outline"
        size="sm"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Testing...
          </>
        ) : (
          <>
            <Database className="h-4 w-4 mr-2" />
            Direct Test
          </>
        )}
      </Button>
      
      {result && (
        <Alert className={`max-w-lg ${result.success ? 'border-green-500' : 'border-red-500'}`}>
          {result.success ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
          <AlertDescription className="text-xs">
            {result.success ? (
              <div>
                <p>{result.message}</p>
                <p>Created {result.created} packages</p>
              </div>
            ) : (
              <div>
                <p className="font-semibold">{result.error}</p>
                {result.details && (
                  <pre className="mt-2 text-xs overflow-x-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                )}
                {result.attempted && (
                  <details className="mt-2">
                    <summary className="cursor-pointer">Attempted data</summary>
                    <pre className="mt-1 text-xs overflow-x-auto">
                      {JSON.stringify(result.attempted, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default DirectPackageTest;