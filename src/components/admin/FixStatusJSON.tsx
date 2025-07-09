import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { StatusConfig } from '@/hooks/useStatusManagement';

export const FixStatusJSON = () => {
  const [isFixing, setIsFixing] = useState(false);
  const [result, setResult] = useState<string>('');

  const defaultQuoteStatuses: StatusConfig[] = [
    {
      id: 'pending',
      name: 'pending',
      label: 'Pending',
      description: 'Quote request is awaiting review',
      color: 'secondary',
      icon: 'Clock',
      isActive: true,
      order: 1,
      allowedTransitions: ['sent', 'rejected'],
      isTerminal: false,
      category: 'quote',
      triggersEmail: false,
      requiresAction: true,
      showsInQuotesList: true,
      showsInOrdersList: false,
      canBePaid: false,
      isDefaultQuoteStatus: true
    },
    {
      id: 'sent',
      name: 'sent',
      label: 'Sent',
      description: 'Quote has been sent to customer',
      color: 'outline',
      icon: 'FileText',
      isActive: true,
      order: 2,
      allowedTransitions: ['approved', 'rejected', 'expired'],
      autoExpireHours: 168,
      isTerminal: false,
      category: 'quote',
      triggersEmail: true,
      emailTemplate: 'quote_sent',
      requiresAction: false,
      showsInQuotesList: true,
      showsInOrdersList: false,
      canBePaid: false
    },
    {
      id: 'approved',
      name: 'approved',
      label: 'Approved',
      description: 'Customer has approved the quote',
      color: 'default',
      icon: 'CheckCircle',
      isActive: true,
      order: 3,
      allowedTransitions: ['rejected', 'paid'],
      isTerminal: false,
      category: 'quote',
      triggersEmail: true,
      emailTemplate: 'quote_approved',
      requiresAction: false,
      showsInQuotesList: true,
      showsInOrdersList: false,
      canBePaid: true
    },
    {
      id: 'rejected',
      name: 'rejected',
      label: 'Rejected',
      description: 'Quote has been rejected',
      color: 'destructive',
      icon: 'XCircle',
      isActive: true,
      order: 4,
      allowedTransitions: ['approved'],
      isTerminal: true,
      category: 'quote',
      triggersEmail: true,
      emailTemplate: 'quote_rejected',
      requiresAction: false,
      showsInQuotesList: true,
      showsInOrdersList: false,
      canBePaid: false
    },
    {
      id: 'expired',
      name: 'expired',
      label: 'Expired',
      description: 'Quote has expired',
      color: 'destructive',
      icon: 'AlertTriangle',
      isActive: true,
      order: 5,
      allowedTransitions: ['approved'],
      isTerminal: true,
      category: 'quote',
      triggersEmail: true,
      emailTemplate: 'quote_expired',
      requiresAction: false,
      showsInQuotesList: true,
      showsInOrdersList: false,
      canBePaid: false
    }
  ];

  const defaultOrderStatuses: StatusConfig[] = [
    {
      id: 'paid',
      name: 'paid',
      label: 'Paid',
      description: 'Payment has been received',
      color: 'default',
      icon: 'DollarSign',
      isActive: true,
      order: 1,
      allowedTransitions: ['ordered', 'cancelled'],
      isTerminal: false,
      category: 'order',
      triggersEmail: true,
      emailTemplate: 'payment_received',
      requiresAction: true,
      showsInQuotesList: false,
      showsInOrdersList: true,
      canBePaid: false
    },
    {
      id: 'ordered',
      name: 'ordered',
      label: 'Ordered',
      description: 'Order has been placed with merchant',
      color: 'default',
      icon: 'ShoppingCart',
      isActive: true,
      order: 2,
      allowedTransitions: ['shipped', 'cancelled'],
      isTerminal: false,
      category: 'order',
      triggersEmail: true,
      emailTemplate: 'order_placed',
      requiresAction: false,
      showsInQuotesList: false,
      showsInOrdersList: true,
      canBePaid: false
    },
    {
      id: 'shipped',
      name: 'shipped',
      label: 'Shipped',
      description: 'Order has been shipped',
      color: 'secondary',
      icon: 'Truck',
      isActive: true,
      order: 3,
      allowedTransitions: ['completed', 'cancelled'],
      isTerminal: false,
      category: 'order',
      triggersEmail: true,
      emailTemplate: 'order_shipped',
      requiresAction: false,
      showsInQuotesList: false,
      showsInOrdersList: true,
      canBePaid: false
    },
    {
      id: 'completed',
      name: 'completed',
      label: 'Completed',
      description: 'Order has been delivered',
      color: 'outline',
      icon: 'CheckCircle',
      isActive: true,
      order: 4,
      allowedTransitions: [],
      isTerminal: true,
      category: 'order',
      triggersEmail: true,
      emailTemplate: 'order_completed',
      requiresAction: false,
      showsInQuotesList: false,
      showsInOrdersList: true,
      canBePaid: false
    },
    {
      id: 'cancelled',
      name: 'cancelled',
      label: 'Cancelled',
      description: 'Quote or order has been cancelled',
      color: 'destructive',
      icon: 'XCircle',
      isActive: true,
      order: 5,
      allowedTransitions: [],
      isTerminal: true,
      category: 'order',
      triggersEmail: true,
      emailTemplate: 'order_cancelled',
      requiresAction: false,
      showsInQuotesList: true,
      showsInOrdersList: true,
      canBePaid: false
    }
  ];

  const fixStatusJSON = async () => {
    setIsFixing(true);
    setResult('');

    try {
      // Get current settings
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('setting_key', ['quote_statuses', 'order_statuses']);

      if (error) {
        setResult(`Error fetching settings: ${error.message}`);
        return;
      }

      let messages = [];

      // Check and fix each setting
      for (const setting of data || []) {
        try {
          JSON.parse(setting.setting_value);
          messages.push(`✅ ${setting.setting_key} has valid JSON`);
        } catch (e: any) {
          messages.push(`❌ ${setting.setting_key} has invalid JSON: ${e.message}`);
          
          // Try to fix common issues
          let fixedJSON = setting.setting_value;
          
          // Fix trailing commas
          fixedJSON = fixedJSON.replace(/,(\s*[\]}])/g, '$1');
          
          // Fix missing quotes around keys
          fixedJSON = fixedJSON.replace(/(\w+):/g, '"$1":');
          
          // Fix single quotes to double quotes
          fixedJSON = fixedJSON.replace(/'/g, '"');
          
          try {
            JSON.parse(fixedJSON);
            messages.push(`🔧 Fixed JSON for ${setting.setting_key}`);
            
            // Update the database with fixed JSON
            const { error: updateError } = await supabase
              .from('system_settings')
              .update({ 
                setting_value: fixedJSON,
                updated_at: new Date().toISOString()
              })
              .eq('setting_key', setting.setting_key);
              
            if (updateError) {
              messages.push(`❌ Error updating fixed JSON: ${updateError.message}`);
            } else {
              messages.push(`✅ Updated ${setting.setting_key} with fixed JSON`);
            }
          } catch (fixError: any) {
            messages.push(`❌ Could not fix JSON for ${setting.setting_key}: ${fixError.message}`);
            messages.push(`🔄 Resetting ${setting.setting_key} to defaults...`);
            
            // Reset to defaults
            const defaultStatuses = setting.setting_key === 'quote_statuses' 
              ? defaultQuoteStatuses 
              : defaultOrderStatuses;
              
            const { error: resetError } = await supabase
              .from('system_settings')
              .upsert({
                setting_key: setting.setting_key,
                setting_value: JSON.stringify(defaultStatuses),
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'setting_key'
              });
              
            if (resetError) {
              messages.push(`❌ Error resetting to defaults: ${resetError.message}`);
            } else {
              messages.push(`✅ Reset ${setting.setting_key} to defaults`);
            }
          }
        }
      }

      // If no settings exist, create them
      if (!data || data.length === 0) {
        messages.push('📝 No existing settings found, creating defaults...');
        
        const { error: quoteError } = await supabase
          .from('system_settings')
          .upsert({
            setting_key: 'quote_statuses',
            setting_value: JSON.stringify(defaultQuoteStatuses),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'setting_key'
          });

        const { error: orderError } = await supabase
          .from('system_settings')
          .upsert({
            setting_key: 'order_statuses',
            setting_value: JSON.stringify(defaultOrderStatuses),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'setting_key'
          });

        if (quoteError || orderError) {
          messages.push(`❌ Error creating defaults: ${quoteError?.message || orderError?.message}`);
        } else {
          messages.push('✅ Created default status settings');
        }
      }
      
      messages.push('');
      messages.push('🎉 Fix complete! You can now refresh the Status Management page to see if the error is resolved.');
      
      setResult(messages.join('\n'));
    } catch (error: any) {
      setResult(`Error: ${error.message}`);
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Fix Status JSON</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This tool will check and fix any invalid JSON in your status settings that may be causing the parsing error.
        </p>
        
        <Button 
          onClick={fixStatusJSON} 
          disabled={isFixing}
          className="w-full"
        >
          {isFixing ? 'Fixing...' : 'Fix Status JSON'}
        </Button>
        
        {result && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <pre className="text-sm whitespace-pre-wrap">{result}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};