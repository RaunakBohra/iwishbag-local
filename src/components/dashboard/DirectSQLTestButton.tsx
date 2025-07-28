/**
 * Direct SQL Test Button - Uses raw SQL to create test packages
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const DirectSQLTestButton: React.FC = () => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);

  // Only show in development mode
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const generateWithSQL = async () => {
    if (!user?.id) return;

    setIsGenerating(true);
    try {
      // First check if user has a virtual address
      const { data: address } = await supabase
        .from('customer_addresses')
        .select('id')
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

      // Use raw SQL to insert test packages
      const { data, error } = await supabase.rpc('sql', {
        query: `
          INSERT INTO received_packages (
            customer_address_id,
            tracking_number,
            carrier,
            sender_name,
            sender_store,
            package_description,
            weight_kg,
            dimensions,
            declared_value_usd,
            received_date,
            status,
            storage_location,
            storage_start_date,
            storage_fee_exempt_until,
            photos,
            condition_notes
          ) VALUES 
          (
            '${address.id}',
            '1Z999AA1${Math.floor(Math.random() * 10000000)}',
            'UPS',
            'Amazon Fulfillment',
            'Amazon',
            'Test Package - Electronics',
            1.5,
            '{"length": 30, "width": 20, "height": 10, "unit": "cm"}'::jsonb,
            99.99,
            NOW(),
            'pending',
            'A-12-B',
            NOW(),
            NOW() + INTERVAL '30 days',
            '[]'::jsonb,
            'TEST PACKAGE - Created via SQL'
          ),
          (
            '${address.id}',
            '794947${Math.floor(Math.random() * 10000000)}',
            'FedEx',
            'Nike Direct',
            'Nike',
            'Test Package - Shoes',
            2.0,
            '{"length": 35, "width": 25, "height": 15, "unit": "cm"}'::jsonb,
            180.00,
            NOW() - INTERVAL '3 days',
            'pending',
            'B-08-A',
            NOW() - INTERVAL '3 days',
            NOW() + INTERVAL '27 days',
            '[]'::jsonb,
            'TEST PACKAGE - Created via SQL'
          ),
          (
            '${address.id}',
            '926129${Math.floor(Math.random() * 10000000)}',
            'USPS',
            'Best Buy',
            'Best Buy',
            'Test Package - Gaming',
            0.8,
            '{"length": 25, "width": 20, "height": 10, "unit": "cm"}'::jsonb,
            69.99,
            NOW() - INTERVAL '7 days',
            'pending',
            'C-15-D',
            NOW() - INTERVAL '7 days',
            NOW() + INTERVAL '23 days',
            '[]'::jsonb,
            'TEST PACKAGE - Created via SQL'
          )
          RETURNING id;
        `
      });

      if (error) {
        console.error('SQL error:', error);
        throw error;
      }

      console.log('SQL insert successful:', data);

      toast({
        title: 'Success!',
        description: '3 test packages created via SQL. Refreshing...',
      });

      // Reload the page
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error('Failed to create test packages via SQL:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'SQL insert failed',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={generateWithSQL}
      disabled={isGenerating}
      variant="default"
      size="sm"
      className="fixed bottom-28 right-4 z-50"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          SQL Insert...
        </>
      ) : (
        <>
          <Database className="h-4 w-4 mr-2" />
          SQL Test Data
        </>
      )}
    </Button>
  );
};

export default DirectSQLTestButton;